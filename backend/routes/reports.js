const express = require('express');
const ExcelJS = require('exceljs');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const { requireUserOrAdmin } = require('../middleware/rbac');

const router = express.Router();

router.use(requireUserOrAdmin);

const EXCEL_FONT_FAMILY = 'Sukhumvit Set';

const normalizeDate = (value) => {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

const parseMemberId = (value) => {
  const memberId = Number.parseInt(value, 10);
  return Number.isInteger(memberId) && memberId > 0 ? memberId : '';
};

const getScopedMemberId = (req, queryMemberId) => {
  if (req.user?.role === 'admin') {
    return queryMemberId;
  }

  return req.user?.member_id || '';
};

const colorMap = {
  overdueCritical: 'FFF4CCCC',
  overdueWarning: 'FFFFF2CC',
  activeNormal: 'FFD9EAD3',
  returned: 'FFBDD7EE'
};

const setRowColor = (row, status) => {
  const color = colorMap[status];
  if (!color) {
    return;
  }

  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color }
    };
  });
};

const addLegendWorksheet = (workbook) => {
  const legend = workbook.addWorksheet('คำอธิบายสี');
  legend.columns = [
    { key: 'status', width: 28 },
    { key: 'meaning', width: 66 }
  ];

  legend.mergeCells('A1:B1');
  const titleCell = legend.getCell('A1');
  titleCell.value = 'ตัวอย่างสีและคำอธิบายสถานะ';
  titleCell.font = { name: EXCEL_FONT_FAMILY, bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14532D' }
  };
  legend.getRow(1).height = 24;

  const legendHeader = legend.getRow(2);
  legendHeader.values = ['ตัวอย่างสี', 'ความหมาย'];
  legendHeader.font = { name: EXCEL_FONT_FAMILY, bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  legendHeader.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F6D3A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      left: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      bottom: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      right: { style: 'thin', color: { argb: 'FFB8C4D6' } }
    };
  });

  const overdueCriticalRow = legend.addRow({
    status: 'ยืมเกิน 14 วัน',
    meaning: 'เกินกำหนดมาก ควรติดตามคืนด่วน'
  });
  setRowColor(overdueCriticalRow, 'overdueCritical');

  const overdueWarningRow = legend.addRow({
    status: 'ยืมเกิน 7 วัน',
    meaning: 'ใกล้ถึงกำหนดหรือเกินเล็กน้อย ควรแจ้งเตือน'
  });
  setRowColor(overdueWarningRow, 'overdueWarning');

  const activeNormalRow = legend.addRow({
    status: 'ปกติ (แอคทีฟ)',
    meaning: 'ยืมไม่เกิน 7 วัน ยังอยู่ในกำหนด'
  });
  setRowColor(activeNormalRow, 'activeNormal');

  const returnedRow = legend.addRow({
    status: 'คืนแล้ว',
    meaning: 'คืนหนังสือเรียบร้อย (ปิดรายการ)'
  });
  setRowColor(returnedRow, 'returned');

  [3, 4, 5, 6].forEach((rowNumber) => {
    const row = legend.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        left: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        bottom: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        right: { style: 'thin', color: { argb: 'FFD4DCE8' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.font = { color: { argb: 'FF102A43' } };
      cell.font = { name: EXCEL_FONT_FAMILY, color: { argb: 'FF102A43' }, size: 11 };
    });
  });
};

const sendExcel = async (res, filename, sheetName, headers, rows, statusResolver) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = [{ header: '#', key: '__rowNo', width: 7 }, ...headers].map((header) => ({
    header: header.label,
    key: header.key,
    width: header.width || 20
  }));

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length }
  };

  const headerRow = sheet.getRow(1);
  headerRow.font = { name: EXCEL_FONT_FAMILY, bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F6D3A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      left: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      bottom: { style: 'thin', color: { argb: 'FFB8C4D6' } },
      right: { style: 'thin', color: { argb: 'FFB8C4D6' } }
    };
  });

  rows.forEach((item, index) => {
    const row = sheet.addRow({
      __rowNo: index + 1,
      ...item
    });
    const status = statusResolver ? statusResolver(item) : null;
    setRowColor(row, status);

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        left: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        bottom: { style: 'thin', color: { argb: 'FFD4DCE8' } },
        right: { style: 'thin', color: { argb: 'FFD4DCE8' } }
      };

      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      cell.font = { name: EXCEL_FONT_FAMILY, size: 11, color: { argb: 'FF102A43' } };
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 20;
    }
  });

  addLegendWorksheet(workbook);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
};

async function getMemberOptions(scopedMemberId) {
  const whereSql = scopedMemberId ? 'WHERE id = :memberId' : '';
  return sequelize.query(
    `SELECT id, full_name FROM Members ${whereSql} ORDER BY full_name ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: scopedMemberId ? { memberId: scopedMemberId } : {}
    }
  );
}

router.get('/', (req, res) => {
  res.redirect('/reports/active-loans');
});

router.get('/active-loans', async (req, res) => {
  try {
    const scopedMemberId = getScopedMemberId(req, parseMemberId(req.query.member_id));
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      member_id: scopedMemberId
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
      await sendExcel(
        res,
        'active-loans',
        'Active Loans',
        [
          { key: 'id', label: 'ID', width: 10 },
          { key: 'title', label: 'ชื่อหนังสือ', width: 32 },
          { key: 'author', label: 'ผู้แต่ง', width: 24 },
          { key: 'member', label: 'สมาชิก', width: 24 },
          { key: 'borrow_date', label: 'วันที่ยืม', width: 16 },
          { key: 'days_borrowed', label: 'จำนวนวัน', width: 14 }
        ],
        activeLoans,
        (row) => {
          const daysBorrowed = Number(row.days_borrowed || 0);
          if (daysBorrowed > 14) return 'overdueCritical';
          if (daysBorrowed > 7) return 'overdueWarning';
          return 'activeNormal';
        }
      );
      return;
    }

    const members = await getMemberOptions(filters.member_id);

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

router.get('/loan-history', async (req, res) => {
  try {
    const scopedMemberId = getScopedMemberId(req, parseMemberId(req.query.member_id));
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      returned_from: normalizeDate(req.query.returned_from),
      returned_to: normalizeDate(req.query.returned_to),
      member_id: scopedMemberId,
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
      await sendExcel(
        res,
        'loan-history',
        'Loan History',
        [
          { key: 'id', label: 'ID', width: 10 },
          { key: 'title', label: 'ชื่อหนังสือ', width: 32 },
          { key: 'author', label: 'ผู้แต่ง', width: 24 },
          { key: 'member', label: 'สมาชิก', width: 24 },
          { key: 'borrow_date', label: 'วันที่ยืม', width: 16 },
          { key: 'return_date', label: 'วันที่คืน', width: 16 },
          { key: 'days_kept', label: 'จำนวนวัน', width: 14 }
        ],
        loanHistory,
        (row) => {
          if (row.return_date) return 'returned';

          const daysKept = Number(row.days_kept || 0);
          if (daysKept > 14) return 'overdueCritical';
          if (daysKept > 7) return 'overdueWarning';
          return 'activeNormal';
        }
      );
      return;
    }

    const members = await getMemberOptions(filters.member_id);

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

router.get('/member-borrow-summary', async (req, res) => {
  try {
    const scopedMemberId = getScopedMemberId(req, parseMemberId(req.query.detail_member_id || req.query.member_id));
    const filters = {
      from: normalizeDate(req.query.from),
      to: normalizeDate(req.query.to),
      keyword: (req.query.keyword || '').trim(),
      min_borrows: Number.parseInt(req.query.min_borrows, 10) || 0,
      detail_member_id: scopedMemberId
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

    if (filters.keyword && req.user?.role === 'admin') {
      whereConditions.push('(m.full_name LIKE :keyword OR m.email LIKE :keyword)');
      replacements.keyword = `%${filters.keyword}%`;
    }

    if (filters.detail_member_id) {
      whereConditions.push('m.id = :detail_member_id');
      replacements.detail_member_id = filters.detail_member_id;
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
      await sendExcel(
        res,
        'member-borrow-summary',
        'Member Borrow Summary',
        [
          { key: 'id', label: 'ID', width: 10 },
          { key: 'full_name', label: 'ชื่อสมาชิก', width: 24 },
          { key: 'email', label: 'อีเมล', width: 28 },
          { key: 'total_borrows', label: 'ยืมทั้งหมด', width: 14 },
          { key: 'active_borrows', label: 'กำลังยืม', width: 14 },
          { key: 'last_borrow_date', label: 'ยืมล่าสุด', width: 16 }
        ],
        memberBorrowSummary,
        (row) => (Number(row.active_borrows) > 0 ? 'activeNormal' : 'returned')
      );
      return;
    }

    const members = await getMemberOptions(filters.detail_member_id);

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
