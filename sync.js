// backend/sync.js
const db = require('./models');

db.sequelize.sync({ force: true }) // Force to recreate tables cleanly
  .then(() => {
    console.log('Database synced successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error syncing database:', err);
    process.exit(1);
  });