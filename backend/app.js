const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

const indexRoutes = require('./routes/index');
const authorRoutes = require('./routes/authors');
const bookRoutes = require('./routes/books');
const memberRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const { sequelize } = require('./models');

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 3000);
const enableSeedOnStart = process.env.ENABLE_SEED === 'true';

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req._apiFlashes = { success: [], error: [] };
  req.flash = (type, message) => {
    if (!type) return [];

    if (message === undefined) {
      return req._apiFlashes[type] || [];
    }

    if (!req._apiFlashes[type]) {
      req._apiFlashes[type] = [];
    }

    req._apiFlashes[type].push(message);
    return req._apiFlashes[type];
  };

  next();
});

app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  const originalRedirect = res.redirect.bind(res);

  res.render = (view, data = {}) => {
    if (res.headersSent) {
      return undefined;
    }

    return res.json({
      view,
      data,
      flashes: req._apiFlashes
    });
  };

  res.redirect = (location) => {
    if (res.headersSent) {
      return undefined;
    }

    return res.json({
      redirect: location,
      flashes: req._apiFlashes
    });
  };

  res._originalRender = originalRender;
  res._originalRedirect = originalRedirect;

  next();
});

app.use('/api', indexRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
  try {
    await sequelize.sync();
    await ensureDataConstraints();
    console.log('Backend database synchronized successfully');

    if (enableSeedOnStart) {
      await seedData();
    }

    const server = app.listen(PORT, () => {
      console.log(`Backend API running on http://localhost:${PORT}/api`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
      }

      console.error('Backend failed to start:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Unable to start backend:', error);
    process.exit(1);
  }
}

async function ensureDataConstraints() {
  const migrationStatements = [
    'ALTER TABLE Books ADD COLUMN total_copies INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE Books ADD COLUMN borrowed_copies INTEGER NOT NULL DEFAULT 0;'
  ];

  for (const statement of migrationStatements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      if (!/duplicate column name/i.test(error.message)) {
        console.warn('Schema update warning:', error.message);
      }
    }
  }

  const dataFixStatements = [
    'UPDATE Books SET total_copies = 1 WHERE total_copies IS NULL OR total_copies < 1;',
    `
      UPDATE Books
      SET borrowed_copies = (
        SELECT COUNT(*)
        FROM LoanRecords lr
        WHERE lr.book_id = Books.id
          AND lr.return_date IS NULL
      );
    `,
    'UPDATE Books SET borrowed_copies = total_copies WHERE borrowed_copies > total_copies;',
    `
      UPDATE Books
      SET status = CASE
        WHEN status = 'Lost' THEN 'Lost'
        WHEN borrowed_copies >= total_copies THEN 'Borrowed'
        ELSE 'Available'
      END;
    `
  ];

  for (const statement of dataFixStatements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      console.warn('Data fix warning:', error.message);
    }
  }

  const statements = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_books_isbn_unique ON Books(isbn);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique ON Members(email);',
    'CREATE INDEX IF NOT EXISTS idx_loanrecords_book_return ON LoanRecords(book_id, return_date);',
    'CREATE INDEX IF NOT EXISTS idx_loanrecords_member_return ON LoanRecords(member_id, return_date);',
    'CREATE INDEX IF NOT EXISTS idx_loanrecords_borrow_date ON LoanRecords(borrow_date);'
  ];

  for (const statement of statements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      console.warn('Constraint/index setup warning:', error.message);
    }
  }

  await runOneTimeIsbnNormalizationMigration();
}

function formatIsbnByDigits(digitsOnly) {
  if (digitsOnly.length === 13) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 12)}-${digitsOnly.slice(12)}`;
  }

  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 1)}-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
  }

  return digitsOnly;
}

function normalizeIsbnValue(isbn) {
  const digitsOnly = String(isbn || '').replace(/[^0-9]/g, '');
  return formatIsbnByDigits(digitsOnly);
}

async function runOneTimeIsbnNormalizationMigration() {
  const migrationName = '2026-02-28-normalize-isbn-v1';

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SystemMigrations (
        name TEXT PRIMARY KEY,
        executed_at TEXT NOT NULL
      );
    `);

    const existingMigration = await sequelize.query(
      'SELECT name FROM SystemMigrations WHERE name = :migrationName LIMIT 1;',
      {
        type: QueryTypes.SELECT,
        replacements: { migrationName }
      }
    );

    if (existingMigration.length > 0) {
      return;
    }

    const books = await sequelize.query(
      'SELECT id, isbn FROM Books WHERE isbn IS NOT NULL AND TRIM(isbn) <> "";',
      { type: QueryTypes.SELECT }
    );

    for (const book of books) {
      const normalizedIsbn = normalizeIsbnValue(book.isbn);
      if (!normalizedIsbn || normalizedIsbn === book.isbn) {
        continue;
      }

      await sequelize.query(
        'UPDATE Books SET isbn = :normalizedIsbn WHERE id = :bookId;',
        {
          replacements: {
            normalizedIsbn,
            bookId: book.id
          }
        }
      );
    }

    await sequelize.query(
      'INSERT INTO SystemMigrations (name, executed_at) VALUES (:migrationName, :executedAt);',
      {
        replacements: {
          migrationName,
          executedAt: new Date().toISOString()
        }
      }
    );
  } catch (error) {
    console.warn('ISBN normalization migration warning:', error.message);
  }
}

async function seedData() {
  const { Author, Book, Member, LoanRecord } = require('./models');

  try {
    const authorCount = await Author.count();
    if (authorCount > 0) {
      return;
    }

    const authors = await Author.bulkCreate([
      {
        full_name: 'Robert C. Martin',
        biography: 'เจ้าพ่อ Clean Code นักพัฒนาซอฟต์แวร์ชื่อดัง'
      },
      {
        full_name: 'J.K. Rowling',
        biography: 'ผู้เขียน Harry Potter นักเขียนชาวอังกฤษ'
      },
      {
        full_name: 'วรรณกรรมไทย',
        biography: 'นักเขียนไทยผู้มีผลงานวรรณกรรมมากมาย'
      }
    ]);

    const books = await Book.bulkCreate([
      {
        title: 'Clean Code',
        isbn: '978-0132350884',
        author_id: authors[0].id,
        status: 'Available',
        total_copies: 3,
        borrowed_copies: 0
      },
      {
        title: 'Harry Potter and the Philosopher\'s Stone',
        isbn: '978-0747532699',
        author_id: authors[1].id,
        status: 'Borrowed',
        total_copies: 2,
        borrowed_copies: 1
      },
      {
        title: 'กุหลาบแดง',
        isbn: '978-974-690-850-8',
        author_id: authors[2].id,
        status: 'Available',
        total_copies: 1,
        borrowed_copies: 0
      }
    ]);

    const members = await Member.bulkCreate([
      {
        full_name: 'สมชาย ใจดี',
        email: 'somchai@email.com',
        phone_number: '0812345678',
        joined_date: '2024-01-15'
      },
      {
        full_name: 'สมหญิง รักเรียน',
        email: 'somying@email.com',
        phone_number: '0898765432',
        joined_date: '2024-02-01'
      }
    ]);

    await LoanRecord.create({
      book_id: books[1].id,
      member_id: members[0].id,
      borrow_date: '2025-01-28',
      return_date: null
    });
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

startServer();
