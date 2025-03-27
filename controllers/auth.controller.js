const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
// const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email'); // Comment out for now

const User = db.users; // Fixed: Changed db.users to db.user to match user.model.js

exports.signup = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, phone_number, user_type } = req.body;

    console.log('Signup request body:', req.body);

    if (!username || !email || !password || !first_name || !last_name || !user_type) {
      return res.status(400).send({ message: 'All required fields must be provided.' });
    }

    const validUserTypes = ['client', 'engineer', 'admin'];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).send({ message: 'Invalid user_type. Must be client, engineer, or admin.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone_number: phone_number || null,
      user_type,
      is_verified: false, // Set to false to require email verification
    });

    console.log('User created:', user.toJSON());

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.verification_token = token;
    await user.save();

    // Uncomment to send the verification email
    const { sendVerificationEmail } = require('../utils/email');
    await sendVerificationEmail(email, token);

    res.status(201).send({ message: 'User registered successfully! Please check your email to verify your account.' });
  } catch (error) {
    console.error('Signup error:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send({ message: 'Username or email already in use.' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).send({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).send({ message: 'Unable to register user.', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt:', { email });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).send({ message: 'No user found with this email.' });
    }

    // Removed is_verified check to allow unverified users to log in
    if (!user.is_verified) {
       console.log('User not verified:', email);
       return res.status(403).send({ message: 'Please verify your email before logging in.' });
     }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Password mismatch for:', email);
      return res.status(401).send({ message: 'Incorrect password.' });
    }

    const token = jwt.sign({ id: user.id, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '24h' });

    console.log('Login successful for:', email, 'User type:', user.user_type);

    res.status(200).send({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error('Error in login:', error.message);
    res.status(500).send({ message: `An error occurred during login: ${error.message}` });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    // Add more detailed logging
    console.log('Raw token received:', token);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);

    // Verify token with additional options
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Specify expected algorithm
      // Optional: add other verification options
    });

    console.log('Decoded token details:', {
      id: decoded.id,
      iat: decoded.iat,
      exp: decoded.exp
    });

    // More robust user finding
    const user = await User.findByPk(decoded.id);
   
    if (!user) {
      console.log('No user found with ID:', decoded.id);
      return res.status(400).send({
        message: 'User not found.',
        details: { receivedId: decoded.id }
      });
    }

    // Verify token match
    if (user.verification_token !== token) {
      console.log('Token mismatch', {
        storedToken: user.verification_token,
        receivedToken: token
      });
      return res.status(400).send({
        message: 'Invalid verification token.'
      });
    }

    user.is_verified = true;
    user.verification_token = null;
    await user.save();

    res.status(200).send({
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Full verification error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).send({
        message: 'Invalid token signature',
        errorType: error.name
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(400).send({
        message: 'Verification token has expired',
        errorType: error.name
      });
    }

    res.status(500).send({
      message: 'Unexpected error during email verification',
      error: error.message
    });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).send({ message: 'User with this email does not exist.' });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.reset_password_token = resetToken;
    user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Uncomment to send the password reset email
    const { sendPasswordResetEmail } = require('../utils/email');
    await sendPasswordResetEmail(email, resetToken);

    res.status(200).send({ message: 'Password reset email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error.message);
    res.status(500).send({ message: 'Failed to send password reset email.', error: error.message });
  }
};

exports.verifyResetToken = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: { [db.Sequelize.Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).send({ message: 'Invalid or expired reset token.' });
    }

    res.status(200).send({ message: 'Token is valid.' });
  } catch (error) {
    console.error('Error in verifyResetToken:', error.message);
    res.status(500).send({ message: 'Failed to verify reset token.', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: { [db.Sequelize.Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).send({ message: 'Invalid or expired reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    res.status(200).send({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error in resetPassword:', error.message);
    res.status(500).send({ message: 'Failed to reset password.', error: error.message });
  }
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email, is_verified: false } });
    if (!user) {
      return res.status(404).send({ message: 'User not found or already verified.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.verification_token = token;
    await user.save();

    // await sendVerificationEmail(email, token); // Comment out email sending
    res.status(200).send({ message: 'Verification email resent. Please check your inbox.' });
  } catch (error) {
    console.error('Error in resendVerification:', error.message);
    res.status(500).send({ message: 'Failed to resend verification email.', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'user_type', 'is_verified', 'createdAt'],
    });

    console.log('Fetched users:', users.length);

    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.user_type,
      status: user.is_verified ? 'active' : 'pending',
      joinedDate: user.createdAt ? user.createdAt.toISOString() : null,
    }));

    res.status(200).send({
      message: 'Users retrieved successfully',
      users: formattedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).send({ message: 'Failed to fetch users', error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'pending', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ message: 'Invalid status value' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    user.is_verified = status === 'active';
    await user.save();

    res.status(200).send({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).send({ message: 'Failed to update user status', error: error.message });
  }
};