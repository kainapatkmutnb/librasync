const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Author = sequelize.define('Author', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  biography: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Authors',
  timestamps: true
});

module.exports = Author;
