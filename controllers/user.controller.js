const db = require('../models');
const User = db.users;
const EngineerProfile = db.engineerProfiles;
const ClientProfile = db.clientProfiles;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }
    
    let profile = null;
    if (user.user_type === 'engineer') {
      profile = await EngineerProfile.findOne({ where: { user_id: userId } });
    } else if (user.user_type === 'client') {
      profile = await ClientProfile.findOne({ where: { user_id: userId } });
    }
    
    res.status(200).send({
      user,
      profile
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const userUpdates = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone_number: req.body.phone_number,
      profile_image: req.body.profile_image
    };
    
    // Filter out undefined values
    Object.keys(userUpdates).forEach(key => {
      if (userUpdates[key] === undefined) {
        delete userUpdates[key];
      }
    });
    
    await User.update(userUpdates, {
      where: { id: userId }
    });
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (user.user_type === 'engineer') {
      const engineerUpdates = {
        title: req.body.title,
        bio: req.body.bio,
        skills: req.body.skills,
        experience_years: req.body.experience_years,
        hourly_rate: req.body.hourly_rate,
        availability: req.body.availability,
        location: req.body.location
      };
      
      // Filter out undefined values
      Object.keys(engineerUpdates).forEach(key => {
        if (engineerUpdates[key] === undefined) {
          delete engineerUpdates[key];
        }
      });
      
      const [profile, created] = await EngineerProfile.findOrCreate({
        where: { user_id: userId },
        defaults: { ...engineerUpdates, user_id: userId }
      });
      
      if (!created) {
        await EngineerProfile.update(engineerUpdates, {
          where: { user_id: userId }
        });
      }
    } else if (user.user_type === 'client') {
      const clientUpdates = {
        company_name: req.body.company_name,
        company_size: req.body.company_size,
        industry: req.body.industry,
        description: req.body.description,
        website: req.body.website,
        location: req.body.location
      };
      
      // Filter out undefined values
      Object.keys(clientUpdates).forEach(key => {
        if (clientUpdates[key] === undefined) {
          delete clientUpdates[key];
        }
      });
      
      const [profile, created] = await ClientProfile.findOrCreate({
        where: { user_id: userId },
        defaults: { ...clientUpdates, user_id: userId }
      });
      
      if (!created) {
        await ClientProfile.update(clientUpdates, {
          where: { user_id: userId }
        });
      }
    }
    
    res.status(200).send({ message: "Profile updated successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }
    
    const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);
    
    if (!passwordIsValid) {
      return res.status(401).send({ message: "Current password is incorrect!" });
    }
    
    await User.update(
      { password: bcrypt.hashSync(newPassword, 8) },
      { where: { id: userId } }
    );
    
    res.status(200).send({ message: "Password changed successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get engineer profile by ID (public)
exports.getEngineerProfile = async (req, res) => {
  try {
    const engineerId = req.params.id;
    
    const user = await User.findOne({
      where: { 
        id: engineerId,
        user_type: 'engineer'
      },
      attributes: ['id', 'username', 'first_name', 'last_name', 'profile_image', 'created_at']
    });
    
    if (!user) {
      return res.status(404).send({ message: "Engineer not found." });
    }
    
    const profile = await EngineerProfile.findOne({
      where: { user_id: engineerId }
    });
    
    // Get average rating
    const rating = await db.sequelize.query(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews 
       FROM reviews 
       WHERE reviewee_id = ?`,
      {
        replacements: [engineerId],
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    res.status(200).send({
      user,
      profile,
      rating: rating[0]
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get client profile by ID (public)
exports.getClientProfile = async (req, res) => {
  try {
    const clientId = req.params.id;
    
    const user = await User.findOne({
      where: { 
        id: clientId,
        user_type: 'client'
      },
      attributes: ['id', 'username', 'first_name', 'last_name', 'profile_image', 'created_at']
    });
    
    if (!user) {
      return res.status(404).send({ message: "Client not found." });
    }
    
    const profile = await ClientProfile.findOne({
      where: { user_id: clientId }
    });
    
    // Get stats about client's projects
    const stats = await db.sequelize.query(
      `SELECT COUNT(*) as total_projects
       FROM projects 
       WHERE client_id = ?`,
      {
        replacements: [clientId],
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    res.status(200).send({
      user,
      profile,
      stats: stats[0]
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Search engineers
exports.searchEngineers = async (req, res) => {
  try {
    const { skills, location, availability, min_rate, max_rate } = req.query;
    
    let whereClause = {};
    
    if (skills) {
      whereClause.skills = { [db.Sequelize.Op.like]: `%${skills}%` };
    }
    
    if (location) {
      whereClause.location = { [db.Sequelize.Op.like]: `%${location}%` };
    }
    
    if (availability) {
      whereClause.availability = availability;
    }
    
    if (min_rate) {
      whereClause.hourly_rate = { ...whereClause.hourly_rate, [db.Sequelize.Op.gte]: min_rate };
    }
    
    if (max_rate) {
      whereClause.hourly_rate = { ...whereClause.hourly_rate, [db.Sequelize.Op.lte]: max_rate };
    }
    
    const engineerProfiles = await EngineerProfile.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_image']
      }]
    });
    
    res.status(200).send(engineerProfiles);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Admin: List all users
// Admin: List all users
exports.listAllUsers = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id); // Changed req.userId to req.user.id
    if (user.user_type !== 'admin') {
      return res.status(403).send({ message: "Requires Admin Role!" });
    }

    const { page = 1, limit = 10, user_type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (user_type) {
      whereClause.user_type = user_type;
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { 
        exclude: ['password'],
        include: ['created_at', 'updated_at']
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    console.log('Fetched users:', users.count);

    res.status(200).send({
      total: users.count,
      current_page: parseInt(page),
      per_page: parseInt(limit),
      data: users.rows,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send({ message: 'Error fetching users', error: err.message });
  }
};

// Admin: Deactivate user
exports.deactivateUser = async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findByPk(req.user.id); // Changed req.userId to req.user.id
    if (adminUser.user_type !== 'admin') {
      return res.status(403).send({ message: "Requires Admin Role!" });
    }
    
    const userId = req.params.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }
    
    // Since is_active doesn't exist, we'll use is_verified as a proxy for active status
    await User.update(
      { is_verified: false },
      { where: { id: userId } }
    );
    
    res.status(200).send({ message: "User deactivated successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};