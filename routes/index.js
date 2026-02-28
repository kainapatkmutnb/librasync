const express = require('express');
const router = express.Router();
const { Book, Member, LoanRecord, Author } = require('../models');
const { Op } = require('sequelize');

// Dashboard
router.get('/', async (req, res) => {
  try {
    // Stats
    const totalBooks = Number(await Book.sum('total_copies')) || 0;
    const borrowedBooks = Number(await Book.sum('borrowed_copies')) || 0;
    const availableBooks = Math.max(0, totalBooks - borrowedBooks);
    const totalMembers = await Member.count();
    const activeLoans = await LoanRecord.count({ where: { return_date: null } });
    
    // Overdue loans (more than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueLoans = await LoanRecord.count({
      where: {
        return_date: null,
        borrow_date: {
          [Op.lt]: sevenDaysAgo.toISOString().split('T')[0]
        }
      }
    });

    // Recent activities (last 5 loan records)
    const recentActivities = await LoanRecord.findAll({
      include: [
        { model: Book, attributes: ['title'] },
        { model: Member, attributes: ['full_name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.render('dashboard', {
      title: 'แดชบอร์ด - LibraSync',
      stats: {
        totalBooks,
        availableBooks,
        totalMembers,
        activeLoans,
        overdueLoans
      },
      recentActivities
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด');
    res.render('dashboard', {
      title: 'แดชบอร์ด - LibraSync',
      stats: {},
      recentActivities: []
    });
  }
});

module.exports = router;
