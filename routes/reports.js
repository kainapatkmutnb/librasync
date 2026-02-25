const express = require('express');
const router = express.Router();
const { Book, Member, LoanRecord, Author } = require('../models');
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

// Active Loans Report
router.get('/active-loans', async (req, res) => {
  try {
    // Use raw query for JULIANDAY calculation
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
      WHERE lr.return_date IS NULL
      ORDER BY lr.borrow_date ASC
    `, {
      type: QueryTypes.SELECT
    });

    res.render('reports/active-loans', {
      title: 'รายงานการยืมปัจจุบัน - LibraSync',
      activeLoans,
      printDate: new Date().toLocaleDateString('th-TH')
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดรายงาน');
    res.render('reports/active-loans', {
      title: 'รายงานการยืมปัจจุบัน - LibraSync',
      activeLoans: [],
      printDate: new Date().toLocaleDateString('th-TH')
    });
  }
});

module.exports = router;
