const express = require('express');
const router = express.Router();
const authJwt = require("../middleware/authJwt");
const controller = require("../controllers/user.controller");

// Current user profile
router.get(
  "/profile",
  [authJwt.verifyToken],
  controller.getCurrentUser
);

// Update user profile
router.put(
  "/profile",
  [authJwt.verifyToken],
  controller.updateProfile
);

// Change password
router.post(
  "/change-password",
  [authJwt.verifyToken],
  controller.changePassword
);

// Get engineer profile by ID (public)
router.get(
  "/engineers/:id",
  controller.getEngineerProfile
);

// Get client profile by ID (public)
router.get(
  "/clients/:id",
  controller.getClientProfile
);

// Search engineers
router.get(
  "/engineers",
  controller.searchEngineers
);

// Admin routes
router.get(
  "/admin/users",
  [authJwt.verifyToken],
  controller.listAllUsers
);

router.put(
  "/admin/users/:id/deactivate",
  [authJwt.verifyToken],
  controller.deactivateUser
);

module.exports = router;