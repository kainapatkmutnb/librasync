const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoanRecord = sequelize.define('LoanRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  book_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Books',
      key: 'id'
    }
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Members',
      key: 'id'
    }
  },
  borrow_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'LoanRecords',
  timestamps: true
});

module.exports = LoanRecord;
