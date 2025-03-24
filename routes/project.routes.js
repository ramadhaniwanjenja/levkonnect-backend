// routes/project.routes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validateProject, validateMilestone } = require('../middleware/validation.middleware');

// Project routes - all require authentication
router.use(authMiddleware);

// Get all projects for the authenticated user
router.get('/', projectController.getProjects);

// Get project by ID
router.get('/:id', projectController.getProjectById);

// Create a new project (when a bid is accepted)
router.post('/', validateProject, projectController.createProject);

// Update project status
router.patch('/:id/status', projectController.updateProjectStatus);

// Create project milestone
router.post('/:project_id/milestones', validateMilestone, projectController.createMilestone);

// Update milestone status
router.patch('/:project_id/milestones/:milestone_id/status', projectController.updateMilestoneStatus);

// Send message in a project
router.post('/:project_id/messages', projectController.sendMessage);

// Add project review
router.post('/:project_id/reviews', projectController.addReview);

module.exports = router;