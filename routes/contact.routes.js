const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Public endpoint to submit a contact message
router.post('/', contactController.submitContactMessage);

// Admin-only endpoint to fetch all contact messages
router.get('/', [verifyToken, isAdmin], contactController.getContactMessages);

module.exports = router;