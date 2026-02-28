const { validationResult, body } = require('express-validator');
const { Op, fn, col, where } = require('sequelize');
const { Author, Book, Member } = require('../models');

const normalizeNameForCompare = (value) => String(value || '').trim().toLowerCase();

const duplicateNameValidator = (model, columnName, label) => {
  return async (value, { req }) => {
    const normalized = normalizeNameForCompare(value);
    if (!normalized) {
      return true;
    }

    const whereClause = {
      [Op.and]: [
        where(fn('lower', col(columnName)), normalized)
      ]
    };

    const currentId = Number.parseInt(req.params.id, 10);
    if (Number.isInteger(currentId) && currentId > 0) {
      whereClause[Op.and].push({ id: { [Op.ne]: currentId } });
    }

    const existingRecord = await model.findOne({ where: whereClause });
    if (existingRecord) {
      throw new Error(`${label}นี้มีอยู่ในระบบแล้ว`);
    }

    return true;
  };
};

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    
    req.flash('errors', errors.array());
    req.flash('formData', req.body);
    res.redirect(req.get('Referrer') || '/');
  };
};

// Validation rules
const bookValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('ชื่อหนังสือไม่สามารถว่างได้')
    .isLength({ min: 2, max: 200 }).withMessage('ชื่อหนังสือต้องมีความยาว 2-200 ตัวอักษร')
    .bail()
    .custom(duplicateNameValidator(Book, 'title', 'ชื่อหนังสือ')),
  body('isbn')
    .notEmpty().withMessage('ISBN ไม่สามารถว่างได้')
    .custom((value) => {
      const digitLength = String(value || '').replace(/[^0-9]/g, '').length;
      if (digitLength !== 10 && digitLength !== 13) {
        throw new Error('ISBN ต้องเป็นรูปแบบ 10 หรือ 13 หลัก');
      }
      return true;
    }),
  body('author_id')
    .notEmpty().withMessage('ต้องเลือกผู้แต่ง')
    .isInt().withMessage('รหัสผู้แต่งต้องเป็นตัวเลข'),
  body('total_copies')
    .notEmpty().withMessage('จำนวนหนังสือทั้งหมดไม่สามารถว่างได้')
    .isInt({ min: 1 }).withMessage('จำนวนหนังสือทั้งหมดต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป')
];

const memberValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('ชื่อ-นามสกุลไม่สามารถว่างได้')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร')
    .bail()
    .custom(duplicateNameValidator(Member, 'full_name', 'ชื่อสมาชิก')),
  body('email')
    .notEmpty().withMessage('อีเมลไม่สามารถว่างได้')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('phone_number')
    .notEmpty().withMessage('เบอร์โทรศัพท์ไม่สามารถว่างได้')
    .custom((value) => {
      const digitLength = String(value || '').replace(/[^0-9]/g, '').length;
      if (digitLength < 9 || digitLength > 12) {
        throw new Error('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-12 หลัก');
      }
      return true;
    }),
  body('joined_date')
    .notEmpty().withMessage('วันที่สมัครไม่สามารถว่างได้')
    .isDate().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
];

const authorValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('ชื่อ-นามสกุลไม่สามารถว่างได้')
    .isLength({ min: 2, max: 255 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-255 ตัวอักษร')
    .bail()
    .custom(duplicateNameValidator(Author, 'full_name', 'ชื่อผู้แต่ง')),
  body('biography')
    .optional()
];

const loanValidation = [
  body('book_id')
    .notEmpty().withMessage('ต้องเลือกหนังสือ')
    .isInt().withMessage('รหัสหนังสือต้องเป็นตัวเลข'),
  body('member_id')
    .notEmpty().withMessage('ต้องเลือกสมาชิก')
    .isInt().withMessage('รหัสสมาชิกต้องเป็นตัวเลข'),
  body('borrow_date')
    .notEmpty().withMessage('วันที่ยืมไม่สามารถว่างได้')
    .isDate().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
];

module.exports = { 
  validate, 
  bookValidation, 
  memberValidation, 
  authorValidation, 
  loanValidation 
};
