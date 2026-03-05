const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isbn: {
    type: DataTypes.STRING(13),
    allowNull: false,
    unique: true
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Authors',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Available', 'Borrowed', 'Lost'),
    defaultValue: 'Available'
  },
  total_copies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  borrowed_copies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'Books',
  timestamps: true
});

module.exports = Book;
