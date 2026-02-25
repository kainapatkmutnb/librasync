const express = require('express');
const router = express.Router();
const { Book, Author, LoanRecord } = require('../models');
const { Op } = require('sequelize');
const { validate, bookValidation } = require('../middleware/validate');

// List books with search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { title: { [Op.like]: `%${search}%` } },
        { isbn: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: [{ model: Author, attributes: ['full_name'] }],
      limit,
      offset,
      order: [['title', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('books/index', {
      title: 'รายการหนังสือ - LibraSync',
      books,
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
    res.render('books/index', {
      title: 'รายการหนังสือ - LibraSync',
      books: [],
      pagination: {},
      search: ''
    });
  }
});

// New book form
router.get('/new', async (req, res) => {
  try {
    const authors = await Author.findAll({ order: [['full_name', 'ASC']] });
    res.render('books/form', {
      title: 'เพิ่มหนังสือ - LibraSync',
      book: null,
      authors,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/books');
  }
});

// Create book
router.post('/', bookValidation, validate(bookValidation), async (req, res) => {
  try {
    await Book.create({
      title: req.body.title,
      isbn: req.body.isbn,
      author_id: req.body.author_id,
      status: req.body.status
    });
    req.flash('success', 'เพิ่มหนังสือสำเร็จ');
    res.redirect('/books');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/books/new');
  }
});

// Edit book form
router.get('/:id/edit', async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/books');
    }
    const authors = await Author.findAll({ order: [['full_name', 'ASC']] });
    res.render('books/form', {
      title: 'แก้ไขหนังสือ - LibraSync',
      book,
      authors,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/books');
  }
});

// Update book
router.post('/:id/update', bookValidation, validate(bookValidation), async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/books');
    }
    await book.update({
      title: req.body.title,
      isbn: req.body.isbn,
      author_id: req.body.author_id,
      status: req.body.status
    });
    req.flash('success', 'อัพเดทหนังสือสำเร็จ');
    res.redirect('/books');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    res.redirect(`/books/${req.params.id}/edit`);
  }
});

// Delete book
router.post('/:id/delete', async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/books');
    }
    
    // Check if book has loan records
    const loanCount = await LoanRecord.count({ where: { book_id: req.params.id } });
    if (loanCount > 0) {
      req.flash('error', 'ไม่สามารถลบหนังสือนี้ได้เนื่องจากมีประวัติการยืม');
      return res.redirect('/books');
    }
    
    await book.destroy();
    req.flash('success', 'ลบหนังสือสำเร็จ');
    res.redirect('/books');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการลบข้อมูล');
    res.redirect('/books');
  }
});

module.exports = router;
