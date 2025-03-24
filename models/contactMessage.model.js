module.exports = (sequelize, DataTypes) => {
    const ContactMessage = sequelize.define('contact_message', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      user_type: {
        type: DataTypes.ENUM('general', 'client', 'engineer', 'partner'),
        allowNull: false,
        defaultValue: 'general',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      timestamps: false,
      tableName: 'contact_messages',
    });
  
    return ContactMessage;
  };