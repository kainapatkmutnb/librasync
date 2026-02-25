const { validationResult, body, param } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    
    req.flash('errors', errors.array());
    req.flash('formData', req.body);
    res.redirect('back');
  };
};

// Validation rules
const bookValidation = [
  body('title')
    .notEmpty().withMessage('ชื่อหนังสือไม่สามารถว่างได้')
    .isLength({ min: 2, max: 200 }).withMessage('ชื่อหนังสือต้องมีความยาว 2-200 ตัวอักษร'),
  body('isbn')
    .notEmpty().withMessage('ISBN ไม่สามารถว่างได้')
    .matches(/^[0-9-]{10,17}$/).withMessage('ISBN ต้องเป็นตัวเลขและขีด ความยาว 10-17 ตัว'),
  body('author_id')
    .notEmpty().withMessage('ต้องเลือกผู้แต่ง')
    .isInt().withMessage('รหัสผู้แต่งต้องเป็นตัวเลข'),
  body('status')
    .notEmpty().withMessage('สถานะไม่สามารถว่างได้')
    .isIn(['Available', 'Borrowed', 'Lost']).withMessage('สถานะต้องเป็น Available, Borrowed หรือ Lost')
];

const memberValidation = [
  body('full_name')
    .notEmpty().withMessage('ชื่อ-นามสกุลไม่สามารถว่างได้')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร'),
  body('email')
    .notEmpty().withMessage('อีเมลไม่สามารถว่างได้')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('phone_number')
    .notEmpty().withMessage('เบอร์โทรศัพท์ไม่สามารถว่างได้')
    .matches(/^[0-9]{9,12}$/).withMessage('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-12 หลัก'),
  body('joined_date')
    .notEmpty().withMessage('วันที่สมัครไม่สามารถว่างได้')
    .isDate().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
];

const authorValidation = [
  body('full_name')
    .notEmpty().withMessage('ชื่อ-นามสกุลไม่สามารถว่างได้')
    .isLength({ min: 2, max: 255 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-255 ตัวอักษร'),
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
