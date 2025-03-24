const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.users;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) {
    return res.status(403).send({ message: 'No token provided!' });
  }

  jwt.verify(token, config.secret || process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Invalid token!', error: err.message });
    }
    req.user = decoded; // Store decoded user data
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.user_type === "admin") {
      next();
      return;
    }
    res.status(403).send({ message: "Require Admin Role!" });
  } catch (error) {
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