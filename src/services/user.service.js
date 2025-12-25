const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');

exports.userLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'MISSING_CREDENTIALS' });

  const userRes = await pool.query(
    `SELECT user_id, password_hash, company_id, is_active
     FROM app_users
     WHERE username = $1`,
    [username]
  );

  if (userRes.rowCount === 0)
    return res.status(401).json({ error: 'INVALID_LOGIN' });

  const user = userRes.rows[0];

  if (!user.is_active)
    return res.status(403).json({ error: 'USER_INACTIVE' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.status(401).json({ error: 'INVALID_LOGIN' });

  const token = signToken({
    user_id: user.user_id,
    company_id: user.company_id,
    type: 'user'
  });

  res.json({
    token,
    company_id: user.company_id
  });
};

// createUser unchanged
