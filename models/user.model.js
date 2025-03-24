module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define('user', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING,
    },
    last_name: {
      type: Sequelize.STRING,
    },
    phone_number: {
      type: Sequelize.STRING,
    },
    user_type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    profile_image: {
      type: Sequelize.STRING,
    },
    is_verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    verification_token: {
      type: Sequelize.STRING,
    },
    reset_password_token: {
      type: Sequelize.STRING,
    },
    reset_password_expires: {
      type: Sequelize.DATE,
    },
  }, {
    tableName: 'users',
    timestamps: true, // Enable timestamps
    underscored: true, // Map camelCase to snake_case (e.g., createdAt -> created_at)
  });

  return User;
};