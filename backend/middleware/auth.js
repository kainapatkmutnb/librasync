const parseAuthUserHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(headerValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const id = Number.parseInt(parsed.id, 10);
    const memberId = Number.parseInt(parsed.member_id, 10);
    const role = parsed.role === 'admin' ? 'admin' : 'user';

    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(memberId) || memberId <= 0) {
      return null;
    }

    return {
      id,
      member_id: memberId,
      username: String(parsed.username || ''),
      full_name: String(parsed.full_name || ''),
      role
    };
  } catch {
    return null;
  }
};

const attachCurrentUser = (req, res, next) => {
  const authUser = parseAuthUserHeader(req.headers['x-auth-user']);
  req.user = authUser;
  res.locals.currentUser = authUser;
  next();
};

const requireLogin = (req, res, next) => {
  if (!req.user) {
    req.flash('error', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
    return res.redirect('/auth/login');
  }

  return next();
};

const requireProxyTrust = (req, res, next) => {
  const expectedSecret = process.env.AUTH_PROXY_SECRET || 'dev-proxy-secret-change-me';
  const providedSecret = req.headers['x-proxy-secret'];

  if (providedSecret !== expectedSecret) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  return next();
};

module.exports = {
  attachCurrentUser,
  requireLogin,
  requireProxyTrust
};
