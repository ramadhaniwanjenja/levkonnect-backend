const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.users;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader); // Debug
  const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) {
    console.log('No token provided'); // Debug
    return res.status(403).send({ message: 'No token provided!' });
  }

  jwt.verify(token, config.secret || process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Token verification failed:', err.message); // Debug
      return res.status(401).send({ message: 'Invalid token!', error: err.message });
    }
    console.log('Token verified, decoded user:', decoded); // Debug
    req.user = decoded; // Store decoded user data
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    console.log('Checking if user is admin, req.user:', req.user); // Debug
    if (req.user && req.user.user_type === "admin") {
      console.log('User is admin, proceeding'); // Debug
      next();
      return;
    }
    console.log('User is not admin'); // Debug
    res.status(403).send({ message: "Require Admin Role!" });
  } catch (error) {
    console.log('Error in isAdmin:', error.message); // Debug
    res.status(500).send({ message: "Unable to validate user role!" });
  }
};

const isClient = async (req, res, next) => {
  try {
    if (req.user && req.user.user_type === "client") {
      next();
      return;
    }
    res.status(403).send({ message: "Require Client Role!" });
  } catch (error) {
    res.status(500).send({ message: "Unable to validate user role!" });
  }
};

const isEngineer = async (req, res, next) => {
  try {
    if (req.user && req.user.user_type === "engineer") {
      next();
      return;
    }
    res.status(403).send({ message: "Require Engineer Role!" });
  } catch (error) {
    res.status(500).send({ message: "Unable to validate user role!" });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isClient,
  isEngineer
};