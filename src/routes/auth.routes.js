const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { jwtSecret, jwtExpiry } = require('../config/env');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email } = req.body;

  const result = await db.query(
    `SELECT a.admin_id, ac.company_id
     FROM admins a
     JOIN admin_companies ac ON a.admin_id = ac.admin_id
     WHERE a.email = $1`,
    [email]
  );

  if (!result.rows.length) {
    return res.status(401).json({ message: 'Invalid login' });
  }

  const payload = result.rows[0];
  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiry });

  res.json({ token });
});

module.exports = router;
