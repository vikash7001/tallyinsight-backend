const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiry } = require("../config/env");

const signToken = (payload) => {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiry
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  signToken,
  verifyToken
};
