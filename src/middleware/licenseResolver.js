const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT status FROM company_license_cache WHERE company_id = $1`,
      [req.companyId]
    );

    const status = rows[0]?.status || 'EXPIRED';
    req.licenseStatus = status;

    if (status === 'EXPIRED') {
      return res.status(403).json({ error: 'LICENSE_EXPIRED' });
    }

    next();
  } catch (err) {
    console.error('License resolver error', err);
    return res.status(500).json({ error: 'LICENSE_CHECK_FAILED' });
  }
};
