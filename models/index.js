const dbConfig = require('../config/db.config.js');

const db = {};
db.sequelize = dbConfig.sequelize;
db.Sequelize = dbConfig.Sequelize;

db.users = require('./user.model')(db.sequelize, db.Sequelize);
db.jobs = require('./job.model')(db.sequelize, db.Sequelize);
db.bids = require('./bid.model')(db.sequelize, db.Sequelize);
db.contact_messages = require('./contactMessage.model')(db.sequelize, db.Sequelize);

console.log('Models loaded:', Object.keys(db)); // Debug: Check loaded models
console.log('contact_messages model:', db.contact_messages ? 'Loaded' : 'Not loaded'); // Debug: Check contact_messages specifically

// Associations
db.users.hasMany(db.jobs, { foreignKey: 'client_id', as: 'jobs' });
db.jobs.belongsTo(db.users, { foreignKey: 'client_id', as: 'client' });

db.jobs.hasMany(db.bids, { foreignKey: 'job_id', as: 'bids' });
db.bids.belongsTo(db.jobs, { foreignKey: 'job_id', as: 'job' });
db.users.hasMany(db.bids, { foreignKey: 'engineer_id', as: 'bids' });
db.bids.belongsTo(db.users, { foreignKey: 'engineer_id', as: 'engineer' });

db.sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synced');
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });

module.exports = db;