const express = require('express');
const router = express.Router();
const { Book, Author, LoanRecord } = require('../models');
const { Op, literal, fn, col, where } = require('sequelize');
const { validate, bookValidation } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/rbac');

const parsePositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const formatIsbnByDigits = (digitsOnly) => {
  if (digitsOnly.length === 13) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 12)}-${digitsOnly.slice(12)}`;
  }

  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 1)}-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
  }

  return digitsOnly;
};

const normalizeIsbn = (input) => {
  const digitsOnly = String(input || '').replace(/[^0-9]/g, '');
  return formatIsbnByDigits(digitsOnly);
};

const generateRandomDigits = (length) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

const calculateIsbn13CheckDigit = (twelveDigits) => {
  const sum = twelveDigits
    .split('')
    .reduce((accumulator, digit, index) => {
      const multiplier = index % 2 === 0 ? 1 : 3;
      return accumulator + (Number(digit) * multiplier);
    }, 0);

  return (10 - (sum % 10)) % 10;
};

const generateIsbn13 = () => {
  const baseDigits = `978${generateRandomDigits(9)}`;
  const checkDigit = calculateIsbn13CheckDigit(baseDigits);
  return normalizeIsbn(`${baseDigits}${checkDigit}`);
};

const generateUniqueIsbn = async (maxAttempts = 50) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidateIsbn = generateIsbn13();
    const existingBookCount = await Book.count({ where: { isbn: candidateIsbn } });
    if (existingBookCount === 0) {
      return candidateIsbn;
    }
  }

  throw new Error('Unable to generate unique ISBN');
};

// List books with search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const searchDigits = search.replace(/[^0-9]/g, '');
    const authorId = Number.parseInt(req.query.author_id, 10);
    const availability = ['all', 'available', 'out-of-stock'].includes(req.query.availability)
      ? req.query.availability
      : 'all';
    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (search) {
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { isbn: { [Op.like]: `%${search}%` } },
          ...(searchDigits ? [{ isbn: { [Op.like]: `%${searchDigits}%` } }] : [])
        ]
      });
    }

    if (Number.isInteger(authorId) && authorId > 0) {
      whereConditions.push({ author_id: authorId });
    }

    whereConditions.push({ status: { [Op.ne]: 'Lost' } });

    if (availability === 'available') {
      whereConditions.push(literal('(total_copies - borrowed_copies) > 0'));
    } else if (availability === 'out-of-stock') {
      whereConditions.push(literal('(total_copies - borrowed_copies) <= 0'));
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const authors = await Author.findAll({ order: [['full_name', 'ASC']] });

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: [{ model: Author, attributes: ['full_name'] }],
      limit,
      offset,
      order: [['title', 'ASC']]
    });

    const booksWithCopies = books.map((book) => {
      const availableCopies = Math.max(0, Number(book.total_copies || 0) - Number(book.borrowed_copies || 0));
      return {
        ...book.toJSON(),
        available_copies: availableCopies
      };
    });

    const totalPages = Math.ceil(count / limit);

    res.render('books/index', {
      title: 'รายการหนังสือ - LibraSync',
      books: booksWithCopies,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      search,
      filters: {
        author_id: Number.isInteger(authorId) && authorId > 0 ? authorId : '',
        availability
      },
      authors
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    res.render('books/index', {
      title: 'รายการหนังสือ - LibraSync',
      books: [],
      pagination: {},
      search: '',
      filters: {
        author_id: '',
        availability: 'all'
      },
      authors: []
    });
  }
});

// New book form
router.get('/new', requireAdmin, async (req, res) => {
  try {
    const authors = await Author.findAll({ order: [['full_name', 'ASC']] });
    const formData = req.flash('formData')[0] || {};

    if (!formData.isbn) {
      formData.isbn = await generateUniqueIsbn();
    }

    if (!formData.total_copies) {
      formData.total_copies = 1;
    }

    res.render('books/form', {
      title: 'เพิ่มหนังสือ - LibraSync',
      book: null,
      authors,
      formData,
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/books');
  }
});

// Generate unique ISBN (AJAX)
router.get('/isbn/generate', requireAdmin, async (req, res) => {
  try {
    const isbn = await generateUniqueIsbn();
    res.json({ isbn });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถสร้าง ISBN อัตโนมัติได้' });
  }
});

// Realtime duplicate check for book title
router.get('/check-duplicate', requireAdmin, async (req, res) => {
  try {
    const value = String(req.query.value || '').trim().toLowerCase();
    const excludeId = Number.parseInt(req.query.excludeId, 10);

    if (!value) {
      return res.json({ duplicate: false });
    }

    const conditions = [where(fn('lower', col('title')), value)];

    if (Number.isInteger(excludeId) && excludeId > 0) {
      conditions.push({ id: { [Op.ne]: excludeId } });
    }

    const existing = await Book.findOne({
      where: { [Op.and]: conditions },
      attributes: ['id']
    });

    return res.json({ duplicate: Boolean(existing) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ duplicate: false });
  }
});

// Create book
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const incomingIsbn = normalizeIsbn(req.body.isbn || '');
    req.body.isbn = incomingIsbn || await generateUniqueIsbn();
    req.body.total_copies = parsePositiveInteger(req.body.total_copies, 1);
    req.body.status = 'Available';
    next();
  } catch (error) {
    console.error(error);
    req.flash('error', 'ไม่สามารถสร้าง ISBN อัตโนมัติได้ กรุณาลองอีกครั้ง');
    res.redirect('/books/new');
  }
}, validate(bookValidation), async (req, res) => {
  try {
    await Book.create({
      title: req.body.title,
      isbn: req.body.isbn,
      author_id: req.body.author_id,
      status: 'Available',
      total_copies: req.body.total_copies,
      borrowed_copies: 0
    });
    req.flash('success', 'เพิ่มหนังสือสำเร็จ');
    res.redirect('/books');
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'ISBN นี้มีอยู่ในระบบแล้ว');
      return res.redirect('/books/new');
    }
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/books/new');
  }
});

// Edit book form
router.get('/:id/edit', requireAdmin, async (req, res) => {
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
router.post('/:id/update', requireAdmin, async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/books');
    }

    req.book = book;
    req.body.isbn = normalizeIsbn(book.isbn);
    req.body.total_copies = parsePositiveInteger(req.body.total_copies, Number(book.total_copies || 1));
    req.body.status = 'Available';
    next();
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูลหนังสือ');
    res.redirect('/books');
  }
}, validate(bookValidation), async (req, res) => {
  try {
    const book = req.book;
    const totalCopies = parsePositiveInteger(req.body.total_copies, Number(book.total_copies || 1));

    if (totalCopies < Number(book.borrowed_copies || 0)) {
      req.flash('error', 'จำนวนหนังสือทั้งหมดต้องไม่น้อยกว่าจำนวนที่กำลังถูกยืม');
      return res.redirect(`/books/${req.params.id}/edit`);
    }

    const nextStatus = Number(book.borrowed_copies || 0) >= totalCopies ? 'Borrowed' : 'Available';

    await book.update({
      title: req.body.title,
      isbn: normalizeIsbn(book.isbn),
      author_id: req.body.author_id,
      status: nextStatus,
      total_copies: totalCopies
    });
    req.flash('success', 'อัพเดทหนังสือสำเร็จ');
    res.redirect('/books');
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'ISBN นี้มีอยู่ในระบบแล้ว');
      return res.redirect(`/books/${req.params.id}/edit`);
    }
    req.flash('error', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    res.redirect(`/books/${req.params.id}/edit`);
  }
});

// Delete book
router.post('/:id/delete', requireAdmin, async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      req.flash('error', 'ไม่พบหนังสือ');
      return res.redirect('/books');
    }
    
    // Check if book has loan records
    const loanCount = await LoanRecord.count({ where: { book_id: req.params.id } });
    if (loanCount > 0) {
      req.flash('error', 'ไม่สามารถลบหนังสือนี้ได้เนื่องจากมีประวัติยืม-คืน');
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
