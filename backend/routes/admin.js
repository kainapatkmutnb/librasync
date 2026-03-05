const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const { requireAdmin } = require('../middleware/rbac');

router.use(requireAdmin);

const createBackupBeforeReset = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '..', '..', 'backups');
  const databaseFile = path.resolve(__dirname, '..', '..', 'database.sqlite');
  const backupFileName = `database-reset-backup-${timestamp}.sqlite`;
  const backupPath = path.join(backupDir, backupFileName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(databaseFile, backupPath);
  return backupFileName;
};

router.post('/reset-data', async (req, res) => {
  const expectedCode = process.env.ADMIN_RESET_CODE || 'RESET-ALL';
  const submittedCode = String(req.body.confirmation_code || '').trim();

  if (!submittedCode) {
    req.flash('error', 'กรุณากรอกรหัสยืนยันก่อนล้างข้อมูล');
    return res.redirect('/admin/health');
  }

  if (submittedCode !== expectedCode) {
    req.flash('error', 'รหัสยืนยันไม่ถูกต้อง ไม่ได้ล้างข้อมูล');
    return res.redirect('/admin/health');
  }

  try {
    const backupFileName = createBackupBeforeReset();

    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DELETE FROM LoanRecords;', { transaction });
      await sequelize.query('DELETE FROM Books;', { transaction });
      await sequelize.query('DELETE FROM Members;', { transaction });
      await sequelize.query('DELETE FROM Authors;', { transaction });
      await sequelize.query('DELETE FROM sqlite_sequence;', { transaction });
      await sequelize.query('DROP TABLE IF EXISTS Author_backup;', { transaction });
    });
    await sequelize.query('PRAGMA foreign_keys = ON;');

    req.flash('success', `ล้างข้อมูลทั้งหมดสำเร็จ (สำรองไว้ที่ backups/${backupFileName})`);
    res.redirect('/admin/health');
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการล้างข้อมูลทั้งหมด');
    res.redirect('/admin/health');
  }
});

router.get('/health', async (req, res) => {
  try {
    const [integrity] = await sequelize.query('PRAGMA integrity_check;', {
      type: QueryTypes.SELECT
    });

    const indexes = await sequelize.query(
      `
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index'
        AND tbl_name IN ('Books', 'Members', 'LoanRecords')
      ORDER BY tbl_name, name;
      `,
      { type: QueryTypes.SELECT }
    );

    const requiredIndexes = [
      { table: 'Books', name: 'idx_books_isbn_unique', unique: true },
      { table: 'Members', name: 'idx_members_email_unique', unique: true },
      { table: 'LoanRecords', name: 'idx_loanrecords_book_return', unique: false },
      { table: 'LoanRecords', name: 'idx_loanrecords_member_return', unique: false },
      { table: 'LoanRecords', name: 'idx_loanrecords_borrow_date', unique: false }
    ];

    const indexStatus = requiredIndexes.map((requiredIndex) => {
      const found = indexes.find((index) => index.name === requiredIndex.name);
      return {
        ...requiredIndex,
        exists: Boolean(found)
      };
    });

    const duplicateIsbn = await sequelize.query(
      `
      SELECT isbn, COUNT(*) AS count
      FROM Books
      GROUP BY isbn
      HAVING COUNT(*) > 1;
      `,
      { type: QueryTypes.SELECT }
    );

    const duplicateEmails = await sequelize.query(
      `
      SELECT email, COUNT(*) AS count
      FROM Members
      GROUP BY email
      HAVING COUNT(*) > 1;
      `,
      { type: QueryTypes.SELECT }
    );

    const [activeLoanMismatch] = await sequelize.query(
      `
      SELECT COUNT(*) AS count
      FROM Books b
      WHERE (
        SELECT COUNT(*)
        FROM LoanRecords lr
        WHERE lr.book_id = b.id
          AND lr.return_date IS NULL
      )
      <> b.borrowed_copies;
      `,
      { type: QueryTypes.SELECT }
    );

    const [statusMismatch] = await sequelize.query(
      `
      SELECT COUNT(*) AS count
      FROM Books b
      WHERE b.status <> 'Lost'
      AND (
        (b.borrowed_copies >= b.total_copies AND b.status <> 'Borrowed')
        OR
        (b.borrowed_copies < b.total_copies AND b.status <> 'Available')
      );
      `,
      { type: QueryTypes.SELECT }
    );

    const [copyRangeMismatch] = await sequelize.query(
      `
      SELECT COUNT(*) AS count
      FROM Books b
      WHERE b.total_copies < 1
         OR b.borrowed_copies < 0
         OR b.borrowed_copies > b.total_copies;
      `,
      { type: QueryTypes.SELECT }
    );

    const [orphanLoanBook] = await sequelize.query(
      `
      SELECT COUNT(*) AS count
      FROM LoanRecords lr
      LEFT JOIN Books b ON b.id = lr.book_id
      WHERE b.id IS NULL;
      `,
      { type: QueryTypes.SELECT }
    );

    const [orphanLoanMember] = await sequelize.query(
      `
      SELECT COUNT(*) AS count
      FROM LoanRecords lr
      LEFT JOIN Members m ON m.id = lr.member_id
      WHERE m.id IS NULL;
      `,
      { type: QueryTypes.SELECT }
    );

    res.render('admin/health', {
      title: 'ระบบตรวจสุขภาพข้อมูล - LibraSync',
      reportTime: new Date().toLocaleString('th-TH'),
      integrityStatus: integrity ? integrity.integrity_check : 'unknown',
      indexStatus,
      duplicateIsbn,
      duplicateEmails,
      consistency: {
        activeLoanMismatch: Number(activeLoanMismatch?.count || 0),
        statusMismatch: Number(statusMismatch?.count || 0),
        copyRangeMismatch: Number(copyRangeMismatch?.count || 0),
        orphanLoanBook: Number(orphanLoanBook?.count || 0),
        orphanLoanMember: Number(orphanLoanMember?.count || 0)
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'เกิดข้อผิดพลาดในการตรวจสุขภาพระบบ');
    res.redirect('/');
  }
});

module.exports = router;
