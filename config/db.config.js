// config/db.config.js
require('dotenv').config();

const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'sql12768080',
  process.env.DB_USER || 'sql12768080',
  process.env.DB_PASSWORD || 'JzMq7C9sMT',
  {
    host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require('../models/user.model')(sequelize, Sequelize);
db.Job = require('../models/job.model')(sequelize, Sequelize);

// Define associations
db.User.hasMany(db.Job, { foreignKey: 'client_id', as: 'jobs' });
db.Job.belongsTo(db.User, { foreignKey: 'client_id', as: 'client' });

module.exports = db;