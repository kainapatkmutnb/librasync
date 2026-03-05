const express = require('express');
const router = express.Router();
const { Book, Member, LoanRecord, Author } = require('../models');
const { sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

const parseMemberId = (value) => {
  const memberId = Number.parseInt(value, 10);
  return Number.isInteger(memberId) && memberId > 0 ? memberId : null;
};

const parseTrendDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
};

// Dashboard
router.get('/', async (req, res) => {
  try {
    const selectedMemberId = parseMemberId(req.query.member_id);
    const trendDays = parseTrendDays(req.query.trend_days);
    const today = new Date().toISOString().split('T')[0];

    // Stats
    const totalBooks = Number(await Book.sum('total_copies')) || 0;
    const borrowedBooks = Number(await Book.sum('borrowed_copies')) || 0;
    const availableBooks = Math.max(0, totalBooks - borrowedBooks);
    const totalMembers = await Member.count();
    const activeLoans = await LoanRecord.count({
      where: {
        [Op.or]: [
          { return_date: null },
          { return_date: { [Op.gt]: today } }
        ]
      }
    });

    const [borrowedToday, returnedToday] = await Promise.all([
      LoanRecord.count({ where: { borrow_date: today } }),
      LoanRecord.count({ where: { return_date: today } })
    ]);
    
    // Overdue loans (more than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueToDate = sevenDaysAgo.toISOString().split('T')[0];
    const overdueLoans = await LoanRecord.count({
      where: {
        [Op.or]: [
          { return_date: null },
          { return_date: { [Op.gt]: today } }
        ],
        borrow_date: {
          [Op.lt]: sevenDaysAgo.toISOString().split('T')[0]
        }
      }
    });

    const [lowStockBooks, highRiskMembers] = await Promise.all([
      Book.count({
        where: sequelize.where(
          sequelize.literal('(total_copies - borrowed_copies)'),
          { [Op.lte]: 1 }
        )
      }),
      sequelize.query(
        `
          SELECT COUNT(*) as total
          FROM (
            SELECT member_id
            FROM LoanRecords
            WHERE return_date IS NULL OR date(return_date) > date('now', 'localtime')
            GROUP BY member_id
            HAVING COUNT(*) >= 3
          ) t
        `,
        { type: QueryTypes.SELECT }
      ).then((rows) => Number(rows[0]?.total || 0))
    ]);

    // Recent activities (last 10 loan records)
    const recentActivities = await LoanRecord.findAll({
      include: [
        { model: Book, attributes: ['title'] },
        { model: Member, attributes: ['full_name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const getTrend = async (days) => sequelize.query(
      `
        WITH RECURSIVE dates(day) AS (
          SELECT date('now', 'localtime', '-${days - 1} day')
          UNION ALL
          SELECT date(day, '+1 day')
          FROM dates
          WHERE day < date('now', 'localtime')
        )
        SELECT
          day,
          COALESCE((SELECT COUNT(*) FROM LoanRecords WHERE date(borrow_date) = day), 0) AS borrow_count,
          COALESCE((SELECT COUNT(*) FROM LoanRecords WHERE return_date IS NOT NULL AND date(return_date) = day), 0) AS return_count
        FROM dates
        ORDER BY day ASC
      `,
      { type: QueryTypes.SELECT }
    );

    const [trend7, trendSelected] = await Promise.all([
      getTrend(7),
      getTrend(trendDays)
    ]);

    const topBooks = await sequelize.query(
      `
        SELECT
          b.id,
          b.title,
          a.full_name AS author,
          COUNT(lr.id) AS total_borrows,
          SUM(CASE WHEN lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime') THEN 1 ELSE 0 END) AS active_borrows
        FROM LoanRecords lr
        JOIN Books b ON lr.book_id = b.id
        JOIN Authors a ON b.author_id = a.id
        GROUP BY b.id, b.title, a.full_name
        ORDER BY total_borrows DESC, b.title ASC
        LIMIT 10
      `,
      { type: QueryTypes.SELECT }
    );

    const topMembers = await sequelize.query(
      `
        SELECT
          m.id,
          m.full_name,
          m.email,
          COUNT(lr.id) AS total_borrows,
          SUM(CASE WHEN lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime') THEN 1 ELSE 0 END) AS active_borrows,
          MAX(lr.borrow_date) AS last_borrow_date
        FROM Members m
        LEFT JOIN LoanRecords lr ON m.id = lr.member_id
        GROUP BY m.id, m.full_name, m.email
        HAVING COUNT(lr.id) > 0
        ORDER BY total_borrows DESC, m.full_name ASC
        LIMIT 10
      `,
      { type: QueryTypes.SELECT }
    );

    const memberOptions = await Member.findAll({
      attributes: ['id', 'full_name', 'email'],
      order: [['full_name', 'ASC']]
    });

    let selectedMember = null;
    let selectedMemberItems = [];

    if (selectedMemberId) {
      selectedMember = await Member.findByPk(selectedMemberId, {
        attributes: ['id', 'full_name', 'email']
      });

      if (selectedMember) {
        selectedMemberItems = await sequelize.query(
          `
            SELECT
              b.title,
              a.full_name AS author,
              COUNT(lr.id) AS total_borrows,
              SUM(CASE WHEN lr.return_date IS NULL OR date(lr.return_date) > date('now', 'localtime') THEN 1 ELSE 0 END) AS active_borrows,
              MAX(lr.borrow_date) AS last_borrow_date,
              MAX(CASE WHEN lr.return_date IS NOT NULL AND date(lr.return_date) <= date('now', 'localtime') THEN lr.return_date END) AS last_return_date
            FROM LoanRecords lr
            JOIN Books b ON lr.book_id = b.id
            JOIN Authors a ON b.author_id = a.id
            WHERE lr.member_id = :selectedMemberId
            GROUP BY b.title, a.full_name
            ORDER BY last_borrow_date DESC, b.title ASC
          `,
          {
            type: QueryTypes.SELECT,
            replacements: { selectedMemberId }
          }
        );
      }
    }

    const maxTrend7 = Math.max(1, ...trend7.map((item) => Math.max(Number(item.borrow_count || 0), Number(item.return_count || 0))));
    const maxTrendSelected = Math.max(1, ...trendSelected.map((item) => Math.max(Number(item.borrow_count || 0), Number(item.return_count || 0))));

    const trendSwitchBase = selectedMemberId ? `/?member_id=${selectedMemberId}&trend_days=` : '/?trend_days=';

    const dashboardLinks = {
      overdue: `/reports/active-loans?to=${overdueToDate}`,
      lowStock: '/books?availability=out-of-stock',
      highRisk: '/reports/member-borrow-summary?min_borrows=3',
      trend7: `${trendSwitchBase}7`,
      trend30: `${trendSwitchBase}30`,
      trend90: `${trendSwitchBase}90`
    };

    res.render('dashboard', {
      title: 'แดชบอร์ด - LibraSync',
      stats: {
        totalBooks,
        borrowedBooks,
        availableBooks,
        totalMembers,
        activeLoans,
        borrowedToday,
        returnedToday,
        overdueLoans,
        lowStockBooks,
        highRiskMembers
      },
      trends: {
        trend7,
        trendSelected,
        trendDays,
        maxTrend7,
        maxTrendSelected
      },
      topBooks,
      topMembers,
      recentActivities,
      memberOptions,
      selectedMember,
      selectedMemberItems,
      selectedMemberId,
      dashboardLinks
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด');
    res.render('dashboard', {
      title: 'แดชบอร์ด - LibraSync',
      stats: {},
      trends: { trend7: [], trendSelected: [], trendDays: 30, maxTrend7: 1, maxTrendSelected: 1 },
      topBooks: [],
      topMembers: [],
      recentActivities: [],
      memberOptions: [],
      selectedMember: null,
      selectedMemberItems: [],
      selectedMemberId: null,
      dashboardLinks: {
        overdue: '/reports/active-loans',
        lowStock: '/books?availability=out-of-stock',
        highRisk: '/reports/member-borrow-summary',
        trend7: '/?trend_days=7',
        trend30: '/?trend_days=30',
        trend90: '/?trend_days=90'
      }
    });
  }
});

module.exports = router;
