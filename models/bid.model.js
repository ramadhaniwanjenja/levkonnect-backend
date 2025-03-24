module.exports = (sequelize, Sequelize) => {
  const Bid = sequelize.define('Bid', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    job_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    engineer_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    bid_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    delivery_days: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    cover_letter: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'pending',
    },
    submitted_date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  }, {
    tableName: 'bids',
    timestamps: false,
  });

  return Bid;
};