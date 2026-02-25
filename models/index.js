const sequelize = require('../config/database');
const Author = require('./Author');
const Book = require('./Book');
const Member = require('./Member');
const LoanRecord = require('./LoanRecord');

// Associations
Author.hasMany(Book, { foreignKey: 'author_id' });
Book.belongsTo(Author, { foreignKey: 'author_id' });

Book.hasMany(LoanRecord, { foreignKey: 'book_id' });
LoanRecord.belongsTo(Book, { foreignKey: 'book_id' });

Member.hasMany(LoanRecord, { foreignKey: 'member_id' });
LoanRecord.belongsTo(Member, { foreignKey: 'member_id' });

module.exports = { sequelize, Author, Book, Member, LoanRecord };
