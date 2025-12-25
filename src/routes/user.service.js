const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'MISSING_CREDENTIALS' });

  const adminRes = await pool.query(
    `SELECT id, password_hash FROM admins WHERE email = $1`,
    [email]
  );

  if (adminRes.rowCount === 0)
    return res.status(401).json({ error: 'INVALID_LOGIN' });

  const admin = adminRes.rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok)
    return res.status(401).json({ error: 'INVALID_LOGIN' });

  const companiesRes = await pool.query(
    `SELECT c.id, c.name
     FROM admin_companies ac
     JOIN companies c ON c.id = ac.company_id
     WHERE ac.admin_id = $1`,
    [admin.id]
  );

  const token = signToken({
    admin_id: admin.id,
    type: 'ADMIN'
  });

  res.json({
    token,
    companies: companiesRes.rows
  });
};
