const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, isClient, isEngineer } = require('../middleware/authJwt');

// Client dashboard metrics
router.get('/metrics', [verifyToken, isClient], dashboardController.getDashboardMetrics);

// Engineer dashboard metrics
router.get('/engineer-metrics', [verifyToken, isEngineer], dashboardController.getEngineerDashboardMetrics);

module.exports = router;