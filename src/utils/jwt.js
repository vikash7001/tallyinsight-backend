const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiry } = require("../config/env");

const signToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiry
  });
};

module.exports = { signToken };

