const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error.message);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/email-verified?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your LevKonnect Account',
    html: `
      <h2>Welcome to LevKonnect!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email} with token ${token}, Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending verification email:', error.message);
    throw new Error('Failed to send verification email');
  }
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/password-recovery?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - LevKonnect',
    html: `
      <h2>Reset Your LevKonnect Password</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email} with token ${token}, Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };