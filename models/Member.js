const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  joined_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'Members',
  timestamps: true
});

module.exports = Member;
