const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/request-password-reset', authController.requestPasswordReset);
router.get('/verify-reset-token', (req, res, next) => {
  console.log('Reached /api/auth/verify-reset-token route'); // Debug
  console.log('Query token:', req.query.token); // Debug
  authController.verifyResetToken(req, res, next);
});
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification', authController.resendVerification);
router.get('/users', [verifyToken, isAdmin], authController.getAllUsers);
router.put('/users/:id/status', [verifyToken, isAdmin], authController.updateUserStatus);

module.exports = router;