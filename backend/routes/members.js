const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Member, LoanRecord, UserAccount, sequelize } = require('../models');
const { Op, fn, col, where } = require('sequelize');
const { validate, memberCreateValidation, memberUpdateValidation } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/rbac');

router.use(requireAdmin);

const normalizePhoneNumber = (input) => {
  const digits = String(input || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length < 10) {
    return input;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// List members with search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause,
      include: [{ model: UserAccount, attributes: ['username', 'role'] }],
      limit,
      offset,
      order: [['full_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('members/index', {
      title: 'รายการสมาชิก - LibraSync',
      members,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      search
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    res.render('members/index', {
      title: 'รายการสมาชิก - LibraSync',
      members: [],
      pagination: {},
      search: ''
    });
  }
});

// New member form
router.get('/new', (req, res) => {
  res.render('members/form', {
    title: 'เพิ่มสมาชิก - LibraSync',
    member: null,
    account: null,
    formData: req.flash('formData')[0] || {},
    errors: req.flash('errors') || [],
    formMode: 'admin'
  });
});

// Realtime duplicate check for member name
router.get('/check-duplicate', async (req, res) => {
  try {
    const value = String(req.query.value || '').trim().toLowerCase();
    const excludeId = Number.parseInt(req.query.excludeId, 10);

    if (!value) {
      return res.json({ duplicate: false });
    }

    const conditions = [where(fn('lower', col('full_name')), value)];

    if (Number.isInteger(excludeId) && excludeId > 0) {
      conditions.push({ id: { [Op.ne]: excludeId } });
    }

    const existing = await Member.findOne({
      where: { [Op.and]: conditions },
      attributes: ['id']
    });

    return res.json({ duplicate: Boolean(existing) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ duplicate: false });
  }
});

// Create member
router.post('/', (req, res, next) => {
  req.body.phone_number = normalizePhoneNumber(req.body.phone_number);
  req.body.register_date = req.body.register_date || new Date().toISOString().split('T')[0];
  next();
}, validate(memberCreateValidation), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const member = await Member.create({
      full_name: req.body.full_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      joined_date: req.body.register_date
    }, { transaction });

    const password_hash = await bcrypt.hash(req.body.password, 10);

    await UserAccount.create({
      member_id: member.id,
      username: req.body.username,
      password_hash,
      role: 'user'
    }, { transaction });

    await transaction.commit();

    req.flash('success', 'เพิ่มสมาชิกสำเร็จ');
    res.redirect('/members');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
      return res.redirect('/members/new');
    }
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/members/new');
  }
});

// Edit member form
router.get('/:id/edit', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [{ model: UserAccount, attributes: ['username', 'role'] }]
    });
    if (!member) {
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/members');
    }

    res.render('members/form', {
      title: 'แก้ไขสมาชิก - LibraSync',
      member,
      account: member.UserAccount || null,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || [],
      formMode: 'admin'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/members');
  }
});

// Update member
router.post('/:id/update', (req, res, next) => {
  req.body.phone_number = normalizePhoneNumber(req.body.phone_number);
  req.body.register_date = req.body.register_date || new Date().toISOString().split('T')[0];
  next();
}, validate(memberUpdateValidation), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const member = await Member.findByPk(req.params.id, {
      include: [{ model: UserAccount }],
      transaction
    });

    if (!member) {
      await transaction.rollback();
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/members');
    }

    await member.update({
      full_name: req.body.full_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      joined_date: req.body.register_date
    }, { transaction });

    if (!member.UserAccount) {
      const password_hash = await bcrypt.hash(req.body.password || '1234', 10);
      await UserAccount.create({
        member_id: member.id,
        username: req.body.username,
        password_hash,
        role: 'user'
      }, { transaction });
    } else {
      const accountUpdates = {
        username: req.body.username,
        role: 'user'
      };

      if (req.body.password) {
        accountUpdates.password_hash = await bcrypt.hash(req.body.password, 10);
      }

      await member.UserAccount.update(accountUpdates, { transaction });
    }

    await transaction.commit();

    req.flash('success', 'อัพเดทสมาชิกสำเร็จ');
    res.redirect('/members');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
      return res.redirect(`/members/${req.params.id}/edit`);
    }
    req.flash('error', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    res.redirect(`/members/${req.params.id}/edit`);
  }
});

// Delete member
router.post('/:id/delete', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/members');
    }
    
    // Check if member has loan records
    const loanCount = await LoanRecord.count({ where: { member_id: req.params.id } });
    if (loanCount > 0) {
      req.flash('error', 'ไม่สามารถลบสมาชิกนี้ได้เนื่องจากมีประวัติยืม-คืน');
      return res.redirect('/members');
    }
    
    await member.destroy();
    req.flash('success', 'ลบสมาชิกสำเร็จ');
    res.redirect('/members');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการลบข้อมูล');
    res.redirect('/members');
  }
});

module.exports = router;
