const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

const toCsv = (rows, headers) => {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
  };

  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','));
  });

  return lines.join('\n');
};

const sendCsv = (res, filename, rows, headers) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${toCsv(rows, headers)}`);
};

const normalizeDate = (value) => {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

const parseMemberId = (value) => {
  const memberId = Number.parseInt(value, 10);
  return Number.isInteger(memberId) && memberId > 0 ? memberId : '';
};

async function getMemberOptions() {
  return sequelize.query(
    `SELECT id, full_name FROM Members ORDER BY full_name ASC`,
    { type: QueryTypes.SELECT }
  );
}

// Reports home
router.get('/', (req, res) => {
  res.redirect('/reports/active-loans');
});

// Active Loans Report
router.get('/active-loans', async (req, res) => {
  try {
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      member_id: parseMemberId(req.query.member_id)
    };

    const replacements = {};
    const whereConditions = ["(lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime'))"];

    if (filters.from) {
      whereConditions.push('lr.borrow_date >= :from');
      replacements.from = filters.from;
    }

    if (filters.to) {
      whereConditions.push('lr.borrow_date <= :to');
      replacements.to = filters.to;
    }

    if (filters.member_id) {
      whereConditions.push('m.id = :member_id');
      replacements.member_id = filters.member_id;
    }

    const whereSql = whereConditions.join(' AND ');

    const activeLoans = await sequelize.query(`
      SELECT 
        lr.id, 
        b.title, 
        a.full_name as author, 
        m.full_name as member, 
        lr.borrow_date,
        CAST((julianday('now') - julianday(lr.borrow_date)) AS INTEGER) as days_borrowed
      FROM LoanRecords lr
      JOIN Books b ON lr.book_id = b.id
      JOIN Authors a ON b.author_id = a.id
      JOIN Members m ON lr.member_id = m.id
      WHERE ${whereSql}
      ORDER BY lr.borrow_date ASC
    `, {
      type: QueryTypes.SELECT,
      replacements
    });

    if (req.query.format === 'csv') {
      return sendCsv(
        res,
        'active-loans.csv',
        activeLoans,
        ['id', 'title', 'author', 'member', 'borrow_date', 'days_borrowed']
      );
    }

    const members = await getMemberOptions();

    res.render('reports/active-loans', {
      title: 'รายงานการยืมปัจจุบัน - LibraSync',
      activeLoans,
      printDate: new Date().toLocaleDateString('th-TH'),
      members,
      filters
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดรายงาน');
    res.render('reports/active-loans', {
      title: 'รายงานการยืมปัจจุบัน - LibraSync',
      activeLoans: [],
      printDate: new Date().toLocaleDateString('th-TH'),
      members: [],
      filters: { from: '', to: '', member_id: '' }
    });
  }
});

// Full Loan History Report
router.get('/loan-history', async (req, res) => {
  try {
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      returned_from: normalizeDate(req.query.returned_from),
      returned_to: normalizeDate(req.query.returned_to),
      member_id: parseMemberId(req.query.member_id),
      status: ['all', 'active', 'returned'].includes(req.query.status) ? req.query.status : 'all'
    };

    const hasBorrowRange = Boolean(filters.from || filters.to);
    const hasReturnedRange = Boolean(filters.returned_from || filters.returned_to);

    const replacements = {};
    const whereConditions = ['1=1'];

    if (filters.from) {
      whereConditions.push('lr.borrow_date >= :from');
      replacements.from = filters.from;
    }

    if (filters.to) {
      whereConditions.push('lr.borrow_date <= :to');
      replacements.to = filters.to;
    }

    if (filters.member_id) {
      whereConditions.push('m.id = :member_id');
      replacements.member_id = filters.member_id;
    }

    if (filters.returned_from) {
      whereConditions.push("lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime')");
      whereConditions.push('lr.return_date >= :returned_from');
      replacements.returned_from = filters.returned_from;
    }

    if (filters.returned_to) {
      whereConditions.push("lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime')");
      whereConditions.push('lr.return_date <= :returned_to');
      replacements.returned_to = filters.returned_to;
    }

    if (hasBorrowRange) {
      whereConditions.push('lr.return_date IS NULL');
    } else if (filters.status === 'active') {
      whereConditions.push("(lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime'))");
    } else if (filters.status === 'returned' || hasReturnedRange) {
      whereConditions.push("lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime')");
    }

    const whereSql = whereConditions.join(' AND ');

    const loanHistory = await sequelize.query(`
      SELECT
        lr.id,
        b.title,
        a.full_name as author,
        m.full_name as member,
        lr.borrow_date,
        CASE
          WHEN lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime')
            THEN lr.return_date
          ELSE NULL
        END as return_date,
        CASE
          WHEN lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime')
            THEN CAST((julianday(lr.return_date) - julianday(lr.borrow_date)) AS INTEGER)
          ELSE CAST((julianday('now') - julianday(lr.borrow_date)) AS INTEGER)
        END as days_kept
      FROM LoanRecords lr
      JOIN Books b ON lr.book_id = b.id
      JOIN Authors a ON b.author_id = a.id
      JOIN Members m ON lr.member_id = m.id
      WHERE ${whereSql}
      ORDER BY lr.borrow_date DESC, lr.id DESC
    `, {
      type: QueryTypes.SELECT,
      replacements
    });

    if (req.query.format === 'csv') {
      return sendCsv(
        res,
        'loan-history.csv',
        loanHistory,
        ['id', 'title', 'author', 'member', 'borrow_date', 'return_date', 'days_kept']
      );
    }

    const members = await getMemberOptions();

    res.render('reports/loan-history', {
      title: 'รายงานประวัติยืม-คืนทั้งหมด - LibraSync',
      loanHistory,
      printDate: new Date().toLocaleDateString('th-TH'),
      members,
      filters
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดรายงาน');
    res.render('reports/loan-history', {
      title: 'รายงานประวัติยืม-คืนทั้งหมด - LibraSync',
      loanHistory: [],
      printDate: new Date().toLocaleDateString('th-TH'),
      members: [],
      filters: { from: '', to: '', returned_from: '', returned_to: '', member_id: '', status: 'all' }
    });
  }
});

// Member Borrow Count Report
router.get('/member-borrow-summary', async (req, res) => {
  try {
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      keyword: (req.query.keyword || '').trim(),
      min_borrows: Number.parseInt(req.query.min_borrows, 10) || 0,
      detail_member_id: parseMemberId(req.query.detail_member_id)
    };

    const replacements = { min_borrows: Math.max(0, filters.min_borrows) };
    const joinConditions = [];
    const whereConditions = ['1=1'];

    if (filters.from) {
      joinConditions.push('lr.borrow_date >= :from');
      replacements.from = filters.from;
    }

    if (filters.to) {
      joinConditions.push('lr.borrow_date <= :to');
      replacements.to = filters.to;
    }

    if (filters.keyword) {
      whereConditions.push('(m.full_name LIKE :keyword OR m.email LIKE :keyword)');
      replacements.keyword = `%${filters.keyword}%`;
    }

    const joinSql = joinConditions.length > 0 ? ` AND ${joinConditions.join(' AND ')}` : '';
    const whereSql = whereConditions.join(' AND ');

    const memberBorrowSummary = await sequelize.query(`
      SELECT
        m.id,
        m.full_name,
        m.email,
        COUNT(lr.id) as total_borrows,
        SUM(CASE WHEN (lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime')) AND lr.id IS NOT NULL THEN 1 ELSE 0 END) as active_borrows,
        MAX(lr.borrow_date) as last_borrow_date
      FROM Members m
      LEFT JOIN LoanRecords lr ON m.id = lr.member_id${joinSql}
      WHERE ${whereSql}
      GROUP BY m.id, m.full_name, m.email
      HAVING COUNT(lr.id) >= :min_borrows
      ORDER BY total_borrows DESC, m.full_name ASC
    `, {
      type: QueryTypes.SELECT,
      replacements
    });

    let detailMemberBooks = [];
    let detailMember = null;

    if (filters.detail_member_id) {
      const detailReplacements = {
        detail_member_id: filters.detail_member_id
      };

      const detailWhere = ['lr.member_id = :detail_member_id'];

      if (filters.from) {
        detailWhere.push('lr.borrow_date >= :from');
        detailReplacements.from = filters.from;
      }

      if (filters.to) {
        detailWhere.push('lr.borrow_date <= :to');
        detailReplacements.to = filters.to;
      }

      detailMemberBooks = await sequelize.query(`
        SELECT
          b.id as book_id,
          b.title,
          a.full_name as author,
          COUNT(lr.id) as total_borrows,
          SUM(CASE WHEN (lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime')) THEN 1 ELSE 0 END) as active_borrows,
          MIN(lr.borrow_date) as first_borrow_date,
          MAX(lr.borrow_date) as last_borrow_date,
          MAX(CASE WHEN lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime') THEN lr.return_date END) as last_return_date
        FROM LoanRecords lr
        JOIN Books b ON lr.book_id = b.id
        JOIN Authors a ON b.author_id = a.id
        WHERE ${detailWhere.join(' AND ')}
        GROUP BY b.id, b.title, a.full_name
        ORDER BY last_borrow_date DESC, b.title ASC
      `, {
        type: QueryTypes.SELECT,
        replacements: detailReplacements
      });

      detailMember = await sequelize.query(
        `SELECT id, full_name, email FROM Members WHERE id = :detail_member_id LIMIT 1`,
        {
          type: QueryTypes.SELECT,
          replacements: { detail_member_id: filters.detail_member_id }
        }
      ).then((rows) => rows[0] || null);
    }

    if (req.query.format === 'csv') {
      return sendCsv(
        res,
        'member-borrow-summary.csv',
        memberBorrowSummary,
        ['id', 'full_name', 'email', 'total_borrows', 'active_borrows', 'last_borrow_date']
      );
    }

    const members = await getMemberOptions();

    res.render('reports/member-borrow-summary', {
      title: 'รายงานสมาชิกยืมกี่ครั้ง - LibraSync',
      memberBorrowSummary,
      printDate: new Date().toLocaleDateString('th-TH'),
      filters,
      members,
      detailMember,
      detailMemberBooks
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดรายงาน');
    res.render('reports/member-borrow-summary', {
      title: 'รายงานสมาชิกยืมกี่ครั้ง - LibraSync',
      memberBorrowSummary: [],
      printDate: new Date().toLocaleDateString('th-TH'),
      filters: { from: '', to: '', keyword: '', min_borrows: 0, detail_member_id: '' },
      members: [],
      detailMember: null,
      detailMemberBooks: []
    });
  }
});

module.exports = router;
