// Load .env ONLY in local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '1d'
};
