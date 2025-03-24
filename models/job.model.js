module.exports = (sequelize, Sequelize) => {
  const Job = sequelize.define('job', {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    category: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    budget: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    duration: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    requiredSkills: {
      type: Sequelize.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('requiredSkills');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('requiredSkills', JSON.stringify(value));
      },
    },
    deadline: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    client_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'open',
    },
  }, {
    tableName: 'jobs', // Explicitly set table name
    timestamps: true,
    underscored: true, // Map createdAt to created_at
  });

  return Job;
};