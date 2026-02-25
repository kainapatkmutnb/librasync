const express = require('express');
const router = express.Router();
const { Book, Member, LoanRecord } = require('../models');
const { Op } = require('sequelize');
const { validate, loanValidation } = require('../middleware/validate');

// List all loan records with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: loans } = await LoanRecord.findAndCountAll({
      include: [
        { model: Book, attributes: ['title'], include: [{ model: require('../models').Author, attributes: ['full_name'] }] },
        { model: Member, attributes: ['full_name'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('loans/index', {
      title: 'ประวัติการยืม - LibraSync',
      loans,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      errors: req.flash('errors'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    res.render('loans/index', {
      title: 'ประวัติการยืม - LibraSync',
      loans: [],
      pagination: {}
    });
  }
});

// New loan form
router.get('/new', async (req, res) => {
  try {
    const availableBooks = await Book.findAll({
      where: { status: 'Available' },
      include: [{ model: require('../models').Author, attributes: ['full_name'] }],
      order: [['title', 'ASC']]
    });
    const members = await Member.findAll({ order: [['full_name', 'ASC']] });
    
    res.render('loans/form', {
      title: 'ยืมหนังสือ - LibraSync',
      availableBooks,
      members,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/loans');
  }
});

// Create loan
router.post('/', loanValidation, validate(loanValidation), async (req, res) => {
  try {
    const book = await Book.findByPk(req.body.book_id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/loans/new');
    }
    
    if (book.status !== 'Available') {
      req.flash('error', 'หนังสือเล่มนี้ไม่พร้อมให้ยืม');
      return res.redirect('/loans/new');
    }

    // Create loan record
    await LoanRecord.create({
      book_id: req.body.book_id,
      member_id: req.body.member_id,
      borrow_date: req.body.borrow_date,
      return_date: null
    });

    // Update book status to Borrowed
    await book.update({ status: 'Borrowed' });

    req.flash('success', 'บันทึกการยืมหนังสือสำเร็จ');
    res.redirect('/loans');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/loans/new');
  }
});

// Return book
router.post('/:id/return', async (req, res) => {
  try {
    const loan = await LoanRecord.findByPk(req.params.id, {
      include: [{ model: Book }]
    });
    
    if (!loan) {
      req.flash('error', 'ไม่พบรายการยืม');
      return res.redirect('/loans');
    }
    
    if (loan.return_date) {
      req.flash('error', 'หนังสือเล่มนี้คืนแล้ว');
      return res.redirect('/loans');
    }

    // Update loan record
    await loan.update({ return_date: new Date().toISOString().split('T')[0] });

    // Update book status to Available
    await loan.Book.update({ status: 'Available' });

    req.flash('success', 'บันทึกการคืนหนังสือสำเร็จ');
    res.redirect('/loans');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกการคืน');
    res.redirect('/loans');
  }
});

module.exports = router;
