// middleware/verifySignUp.js
const db = require("../models");
const User = db.users;

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    // Username
    let user = await User.findOne({
      where: {
        username: req.body.username
      }
    });

    if (user) {
      return res.status(400).send({
        message: "Failed! Username is already in use!"
      });
    }

    // Email
    user = await User.findOne({
      where: {
        email: req.body.email
      }
    });

    if (user) {
      return res.status(400).send({
        message: "Failed! Email is already in use!"
      });
    }

    next();
  } catch (error) {
    console.error("Error in checkDuplicateUsernameOrEmail:", error); // Log the error
    res.status(500).send({
      message: "Unable to validate username or email!",
      error: error.message // Include the error message in the response
    });
  }
};

module.exports = {
  checkDuplicateUsernameOrEmail
};