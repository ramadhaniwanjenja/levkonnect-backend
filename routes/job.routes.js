const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { verifyToken, isClient, isEngineer, isAdmin } = require('../middleware/authJwt');
const { validate, jobValidationRules } = require('../middleware/validation.middleware');

// Create a new job (client only)
router.post('/auth/jobs', [verifyToken, isClient, ...jobValidationRules.create, validate], (req, res) => {
  console.log('POST /api/jobs/auth/jobs - User:', req.user); // Debug
  jobController.createJob(req, res);
});

// Get all jobs (admin only)
router.get('/all', [verifyToken, isAdmin], (req, res) => {
  console.log('GET /api/jobs/all - User:', req.user); // Debug
  jobController.getAllJobs(req, res);
});

// Get job by ID
router.get('/:id', jobController.getJobById);

// Update job (client only)
router.put('/:id', [verifyToken, isClient, ...jobValidationRules.update, validate], jobController.updateJob);

// Delete job (client only)
router.delete('/:id', [verifyToken, isClient], jobController.deleteJob);

// Get jobs posted by current client
router.get('/client/jobs', [verifyToken, isClient], (req, res) => {
  console.log('GET /api/jobs/client/jobs - User:', req.user); // Debug
  jobController.getClientJobs(req, res);
});

// Get recommended jobs for an engineer
router.get('/engineer/recommended', [verifyToken, isEngineer], jobController.getRecommendedJobs);

// Accept a bid for a job (client only)
router.post('/:jobId/bids/:bidId/accept', [verifyToken, isClient], (req, res) => {
  console.log('POST /api/jobs/:jobId/bids/:bidId/accept - User:', req.user); // Debug
  jobController.acceptBid(req, res);
});

module.exports = router;