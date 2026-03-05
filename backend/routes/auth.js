const express = require('express');
const bcrypt = require('bcrypt');
const { validate, registerValidation, loginValidation } = require('../middleware/validate');
const { sequelize, Member, UserAccount } = require('../models');

const router = express.Router();

const toPublicUser = (userAccount, member) => ({
  id: userAccount.id,
  username: userAccount.username,
  role: userAccount.role,
  member_id: member.id,
  full_name: member.full_name
});

const normalizePhoneNumber = (input) => {
  const digits = String(input || '').replace(/\D/g, '').slice(0, 10);

  if (digits.length < 10) {
    return input;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }

  return res.render('auth/login', {
    title: 'เข้าสู่ระบบ - LibraSync',
    errors: req.flash('errors') || [],
    formData: req.flash('formData')[0] || {}
  });
});

router.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }

  return res.render('members/form', {
    title: 'สมัครสมาชิก - LibraSync',
    member: null,
    account: null,
    formData: req.flash('formData')[0] || {},
    errors: req.flash('errors') || [],
    formMode: 'register',
    submitAction: '/auth/register',
    cancelPath: '/auth/login'
  });
});

router.post('/register', (req, res, next) => {
  req.body.phone_number = normalizePhoneNumber(req.body.phone_number);
  req.body.register_date = req.body.register_date || new Date().toISOString().split('T')[0];
  next();
}, validate(registerValidation), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const member = await Member.create({
      full_name: req.body.full_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      joined_date: req.body.register_date
    }, { transaction });

    const password_hash = await bcrypt.hash(req.body.password, 10);

    const userAccount = await UserAccount.create({
      member_id: member.id,
      username: req.body.username,
      password_hash,
      role: 'user'
    }, { transaction });

    await transaction.commit();

    req._authSession = {
      action: 'set',
      user: toPublicUser(userAccount, member)
    };

    req.flash('success', 'สมัครสมาชิกสำเร็จ เข้าสู่ระบบเรียบร้อยแล้ว');
    return res.redirect('/');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'ชื่อผู้ใช้หรืออีเมลถูกใช้งานแล้ว');
      return res.redirect('/auth/register');
    }

    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    return res.redirect('/auth/register');
  }
});

router.post('/login', validate(loginValidation), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const userAccount = await UserAccount.findOne({ where: { username } });
    if (!userAccount) {
      req.flash('error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return res.redirect('/auth/login');
    }

    const passwordMatched = await bcrypt.compare(password, userAccount.password_hash);
    if (!passwordMatched) {
      req.flash('error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return res.redirect('/auth/login');
    }

    const member = await Member.findByPk(userAccount.member_id);
    if (!member) {
      req.flash('error', 'ไม่พบบัญชีสมาชิกที่เชื่อมโยง');
      return res.redirect('/auth/login');
    }

    req._authSession = {
      action: 'set',
      user: toPublicUser(userAccount, member)
    };

    req.flash('success', 'เข้าสู่ระบบสำเร็จ');
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    return res.redirect('/auth/login');
  }
});

router.post('/logout', (req, res) => {
  req._authSession = { action: 'clear' };
  req.flash('success', 'ออกจากระบบเรียบร้อยแล้ว');
  return res.redirect('/auth/login');
});

module.exports = router;
