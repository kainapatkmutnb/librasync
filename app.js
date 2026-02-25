const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

// Import routes
const indexRoutes = require('./routes/index');
const authorRoutes = require('./routes/authors');
const bookRoutes = require('./routes/books');
const memberRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const reportRoutes = require('./routes/reports');

// Import models for syncing
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'librasync-secret-key-2025',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Flash messages
app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);
app.use('/members', memberRoutes);
app.use('/loans', loanRoutes);
app.use('/reports', reportRoutes);

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - ไม่พบหน้า',
    message: 'ขออภัย ไม่พบหน้าที่คุณต้องการ',
    error: { status: 404 }
  });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 - เกิดข้อผิดพลาด',
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Sync database and start server
async function startServer() {
  try {
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
    
    // Seed initial data if needed
    await seedData();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`LibraSync server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

// Seed initial data
async function seedData() {
  const { Author, Book, Member, LoanRecord } = require('./models');
  
  try {
    // Check if data already exists
    const authorCount = await Author.count();
    if (authorCount > 0) {
      console.log('Data already seeded, skipping...');
      return;
    }
    
    // Create authors
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
    console.log('Authors seeded');
    
    // Create books
    const books = await Book.bulkCreate([
      {
        title: 'Clean Code',
        isbn: '978-0132350884',
        author_id: authors[0].id,
        status: 'Available'
      },
      {
        title: 'Harry Potter and the Philosopher\'s Stone',
        isbn: '978-0747532699',
        author_id: authors[1].id,
        status: 'Borrowed'
      },
      {
        title: 'กุหลาบแดง',
        isbn: '978-974-690-850-8',
        author_id: authors[2].id,
        status: 'Available'
      }
    ]);
    console.log('Books seeded');
    
    // Create members
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
    console.log('Members seeded');
    
    // Create loan record
    await LoanRecord.create({
      book_id: books[1].id,
      member_id: members[0].id,
      borrow_date: '2025-01-28',
      return_date: null
    });
    console.log('Loan records seeded');
    
    console.log('All data seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Start the server
startServer();
