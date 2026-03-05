const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    req.flash('error', 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
    return res.redirect('/');
  }

  return next();
};

const requireUserOrAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'user'].includes(req.user.role)) {
    req.flash('error', 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
    return res.redirect('/auth/login');
  }

  return next();
};

module.exports = {
  requireAdmin,
  requireUserOrAdmin
};
