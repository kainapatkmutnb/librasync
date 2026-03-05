const express = require('express');
const router = express.Router();
const { Author, Book } = require('../models');
const { Op, fn, col, where } = require('sequelize');
const { validate, authorValidation } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/rbac');

// List authors with search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      full_name: {
        [Op.like]: `%${search}%`
      }
    } : {};

    const { count, rows: authors } = await Author.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['full_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('authors/index', {
      title: 'รายการผู้แต่ง - LibraSync',
      authors,
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
    res.render('authors/index', {
      title: 'รายการผู้แต่ง - LibraSync',
      authors: [],
      pagination: {},
      search: ''
    });
  }
});

// New author form
router.get('/new', requireAdmin, (req, res) => {
  res.render('authors/form', {
    title: 'เพิ่มผู้แต่ง - LibraSync',
    author: null,
    formData: req.flash('formData')[0] || {},
    errors: req.flash('errors') || []
  });
});

// Realtime duplicate check for author name
router.get('/check-duplicate', requireAdmin, async (req, res) => {
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

    const existing = await Author.findOne({
      where: { [Op.and]: conditions },
      attributes: ['id']
    });

    return res.json({ duplicate: Boolean(existing) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ duplicate: false });
  }
});

// Create author
router.post('/', requireAdmin, validate(authorValidation), async (req, res) => {
  try {
    await Author.create({
      full_name: req.body.full_name,
      biography: req.body.biography
    });
    req.flash('success', 'เพิ่มผู้แต่งสำเร็จ');
    res.redirect('/authors');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    res.redirect('/authors/new');
  }
});

// Edit author form
router.get('/:id/edit', requireAdmin, async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) {
      req.flash('error', 'ไม่พบผู้แต่ง');
      return res.redirect('/authors');
    }
    res.render('authors/form', {
      title: 'แก้ไขผู้แต่ง - LibraSync',
      author,
      formData: req.flash('formData')[0] || {},
      errors: req.flash('errors') || []
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาด');
    res.redirect('/authors');
  }
});

// Update author
router.post('/:id/update', requireAdmin, validate(authorValidation), async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) {
      req.flash('error', 'ไม่พบผู้แต่ง');
      return res.redirect('/authors');
    }
    await author.update({
      full_name: req.body.full_name,
      biography: req.body.biography
    });
    req.flash('success', 'อัพเดทผู้แต่งสำเร็จ');
    res.redirect('/authors');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    res.redirect(`/authors/${req.params.id}/edit`);
  }
});

// Delete author
router.post('/:id/delete', requireAdmin, async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) {
      req.flash('error', 'ไม่พบผู้แต่ง');
      return res.redirect('/authors');
    }
    
    // Check if author has books
    const bookCount = await Book.count({ where: { author_id: req.params.id } });
    if (bookCount > 0) {
      req.flash('error', 'ไม่สามารถลบผู้แต่งนี้ได้เนื่องจากมีหนังสืออยู่');
      return res.redirect('/authors');
    }
    
    await author.destroy();
    req.flash('success', 'ลบผู้แต่งสำเร็จ');
    res.redirect('/authors');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการลบข้อมูล');
    res.redirect('/authors');
  }
});

module.exports = router;
