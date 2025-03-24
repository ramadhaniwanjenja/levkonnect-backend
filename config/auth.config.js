// Configuration file for authentication settings

module.exports = {
  secret: process.env.JWT_SECRET || "4feffc443536d71ff07da9b7a68721ac067c85bbe6b94f6d9424469dc49f2238",
  // Token expiration time (24 hours)
  jwtExpiration: 86400
};