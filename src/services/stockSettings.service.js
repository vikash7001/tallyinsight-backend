const pool = require('../config/db');

exports.getSettings = async (req, res) => {
  try {
    const companyId = req.companyId;

    // Try fetch
    const { rows } = await pool.query(
      `SELECT show_out_of_stock, low_stock_threshold
       FROM company_stock_settings
       WHERE company_id = $1`,
      [companyId]
    );

    // Auto-create with defaults if missing
    if (rows.length === 0) {
      const insertRes = await pool.query(
        `INSERT INTO company_stock_settings
         (company_id)
         VALUES ($1)
         RETURNING show_out_of_stock, low_stock_threshold`,
        [companyId]
      );

      return res.json(insertRes.rows[0]);
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error('Get stock settings failed', err);
    return res.status(500).json({ error: 'GET_SETTINGS_FAILED' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { show_out_of_stock, low_stock_threshold } = req.body;

    if (typeof show_out_of_stock !== 'boolean') {
      return res.status(400).json({ error: 'INVALID_SHOW_OUT_OF_STOCK' });
    }

    if (
      !Number.isInteger(low_stock_threshold) ||
      low_stock_threshold < 0
    ) {
      return res.status(400).json({ error: 'INVALID_LOW_STOCK_THRESHOLD' });
    }

    const { rows } = await pool.query(
      `INSERT INTO company_stock_settings
       (company_id, show_out_of_stock, low_stock_threshold, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (company_id)
       DO UPDATE SET
         show_out_of_stock = EXCLUDED.show_out_of_stock,
         low_stock_threshold = EXCLUDED.low_stock_threshold,
         updated_at = now()
       RETURNING show_out_of_stock, low_stock_threshold`,
      [companyId, show_out_of_stock, low_stock_threshold]
    );

    return res.json(rows[0]);

  } catch (err) {
    console.error('Update stock settings failed', err);
    return res.status(500).json({ error: 'UPDATE_SETTINGS_FAILED' });
  }
};
