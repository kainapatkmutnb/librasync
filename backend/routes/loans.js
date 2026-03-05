const express = require('express');
const router = express.Router();
const { Book, Member, LoanRecord, Author, sequelize } = require('../models');
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
        { model: Book, attributes: ['title'], include: [{ model: Author, attributes: ['full_name'] }] },
        { model: Member, attributes: ['full_name'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('loans/index', {
      title: 'ประวัติยืม-คืน - LibraSync',
      loans,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    res.render('loans/index', {
      title: 'ประวัติยืม-คืน - LibraSync',
      loans: [],
      pagination: {}
    });
  }
});

// New loan form
router.get('/new', async (req, res) => {
  try {
    const books = await Book.findAll({
      where: { status: { [Op.in]: ['Available', 'Borrowed'] } },
      include: [{ model: Author, attributes: ['full_name'] }],
      order: [['title', 'ASC']]
    });

    const availableBooks = books
      .map((book) => {
        const availableCopies = Math.max(0, Number(book.total_copies || 0) - Number(book.borrowed_copies || 0));
        return {
          ...book.toJSON(),
          available_copies: availableCopies
        };
      })
      .filter((book) => book.available_copies > 0);

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
router.post('/', validate(loanValidation), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const [book, member] = await Promise.all([
      Book.findByPk(req.body.book_id, { transaction }),
      Member.findByPk(req.body.member_id, { transaction })
    ]);

    if (!book) {
      await transaction.rollback();
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/loans/new');
    }

    if (!member) {
      await transaction.rollback();
      req.flash('error', 'ไม่พบสมาชิก');
      return res.redirect('/loans/new');
    }

    const availableCopies = Number(book.total_copies || 0) - Number(book.borrowed_copies || 0);

    if (book.status === 'Lost' || availableCopies <= 0) {
      await transaction.rollback();
      req.flash('error', 'หนังสือเล่มนี้ไม่พร้อมให้ยืม');
      return res.redirect('/loans/new');
    }

    await LoanRecord.create({
      book_id: req.body.book_id,
      member_id: req.body.member_id,
      borrow_date: req.body.borrow_date,
      return_date: null
    }, { transaction });

    const nextBorrowedCopies = Number(book.borrowed_copies || 0) + 1;
    const nextStatus = nextBorrowedCopies >= Number(book.total_copies || 0) ? 'Borrowed' : 'Available';

    await book.update({
      borrowed_copies: nextBorrowedCopies,
      status: nextStatus
    }, { transaction });

    await transaction.commit();

    req.flash('success', 'บันทึกการยืมหนังสือสำเร็จ');
    res.redirect('/loans');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/loans/new');
  }
});

// Return book
router.post('/:id/return', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const loan = await LoanRecord.findByPk(req.params.id, {
      include: [{ model: Book }],
      transaction
    });
    
    if (!loan) {
      await transaction.rollback();
      req.flash('error', 'ไม่พบรายการยืม');
      return res.redirect('/loans');
    }
    
    if (loan.return_date) {
      await transaction.rollback();
      req.flash('error', 'หนังสือเล่มนี้คืนแล้ว');
      return res.redirect('/loans');
    }

    if (!loan.Book) {
      await transaction.rollback();
      req.flash('error', 'ไม่พบหนังสือในรายการยืม');
      return res.redirect('/loans');
    }

    await loan.update({ return_date: new Date().toISOString().split('T')[0] }, { transaction });

    const nextBorrowedCopies = Math.max(0, Number(loan.Book.borrowed_copies || 0) - 1);
    const nextStatus = nextBorrowedCopies >= Number(loan.Book.total_copies || 0) ? 'Borrowed' : 'Available';

    await loan.Book.update({
      borrowed_copies: nextBorrowedCopies,
      status: nextStatus
    }, { transaction });

    await transaction.commit();

    req.flash('success', 'บันทึกการคืนหนังสือสำเร็จ');
    res.redirect('/loans');
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกการคืน');
    res.redirect('/loans');
  }
});

module.exports = router;
