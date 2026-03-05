const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.FRONTEND_PORT || 5173);
const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api';
const proxySecret = process.env.AUTH_PROXY_SECRET || 'dev-proxy-secret-change-me';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionSecret = process.env.SESSION_SECRET || 'dev-only-change-me';

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.authUser || null;
  next();
});

const buildApiUrl = (originalUrl) => {
  const cleanPath = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const appendFlashesToCurrentResponse = (res, flashes = {}) => {
  const success = Array.isArray(flashes.success) ? flashes.success : [];
  const error = Array.isArray(flashes.error) ? flashes.error : [];

  if (success.length > 0) {
    res.locals.success = [...(res.locals.success || []), ...success];
  }

  if (error.length > 0) {
    res.locals.error = [...(res.locals.error || []), ...error];
  }
};

const persistFlashesToNextRequest = (req, flashes = {}) => {
  const success = Array.isArray(flashes.success) ? flashes.success : [];
  const error = Array.isArray(flashes.error) ? flashes.error : [];

  success.forEach((message) => req.flash('success', message));
  error.forEach((message) => req.flash('error', message));
};

const syncAuthSession = (req, authSession) => {
  if (!authSession || typeof authSession !== 'object') {
    return;
  }

  if (authSession.action === 'set' && authSession.user) {
    req.session.authUser = authSession.user;
    return;
  }

  if (authSession.action === 'clear') {
    delete req.session.authUser;
  }
};

app.all('*', async (req, res) => {
  try {
    const apiUrl = buildApiUrl(req.originalUrl);
    const method = req.method.toUpperCase();
    const canHaveBody = !['GET', 'HEAD'].includes(method);
    const encodedAuthUserHeader = encodeURIComponent(JSON.stringify(req.session.authUser || null));

    const response = await fetch(apiUrl, {
      method,
      headers: {
        ...(canHaveBody ? { 'Content-Type': 'application/json' } : {}),
        'x-proxy-secret': proxySecret,
        'x-auth-user': encodedAuthUserHeader
      },
      body: canHaveBody ? JSON.stringify(req.body || {}) : undefined
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/csv')) {
      const csvBody = await response.text();
      const disposition = response.headers.get('content-disposition');
      if (disposition) {
        res.setHeader('Content-Disposition', disposition);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(response.status).send(csvBody);
    }

    if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      const excelBuffer = Buffer.from(await response.arrayBuffer());
      const disposition = response.headers.get('content-disposition');

      if (disposition) {
        res.setHeader('Content-Disposition', disposition);
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.status(response.status).send(excelBuffer);
    }

    if (contentType.includes('application/json')) {
      const payload = await response.json();
      syncAuthSession(req, payload.authSession);

      if (payload && payload.redirect) {
        persistFlashesToNextRequest(req, payload.flashes);
        return res.redirect(payload.redirect);
      }

      if (payload && payload.view) {
        appendFlashesToCurrentResponse(res, payload.flashes);
        return res.status(response.status).render(payload.view, payload.data || {});
      }

      return res.status(response.status).json(payload);
    }

    const rawBody = await response.text();
    return res.status(response.status).send(rawBody);
  } catch (error) {
    console.error(error);
    return res.status(500).render('error', {
      title: '500 - เกิดข้อผิดพลาด',
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Backend API',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Frontend server is running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }

  console.error('Frontend failed to start:', error);
  process.exit(1);
});
