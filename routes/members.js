const express = require('express');
const router = express.Router();
const { Member, LoanRecord } = require('../models');
const { Op } = require('sequelize');
const { validate, memberValidation } = require('../middleware/validate');

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
      search,
      errors: req.flash('errors'),
      success: req.flash('success')
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
    formData: req.flash('formData')[0] || {},
    errors: req.flash('errors') || []
  });
});

// Create member
router.post('/', memberValidation, validate(memberValidation), async (req, res) => {
  try {
    await Member.create({
      full_name: req.body.full_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      joined_date: req.body.joined_date
    });
    req.flash('success', 'เพิ่มสมาชิกสำเร็จ');
    res.redirect('/members');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/members/new');
  }
});

// Edit member form
router.get('/:id/edit', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/members');
    }
    res.render('members/form', {
      title: 'แก้ไขสมาชิก - LibraSync',
      member,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/members');
  }
});

// Update member
router.post('/:id/update', memberValidation, validate(memberValidation), async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/members');
    }
    await member.update({
      full_name: req.body.full_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      joined_date: req.body.joined_date
    });
    req.flash('success', 'อัพเดทสมาชิกสำเร็จ');
    res.redirect('/members');
  } catch (error) {
    console.error(error);
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
      req.flash('error', 'ไม่สามารถลบสมาชิกนี้ได้เนื่องจากมีประวัติการยืม');
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
