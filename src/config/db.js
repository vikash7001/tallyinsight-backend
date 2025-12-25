const { Pool } = require("pg");
const dns = require("dns");

// 🔒 Force IPv4 (Render cannot reach IPv6)
dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
