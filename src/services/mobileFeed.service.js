const pool = require('../config/db');

exports.getFeed = async (req, res) => {
  try {
    const companyId = req.companyId;

    // 1. Get stock settings (auto-create if missing)
    const settingsRes = await pool.query(
      `INSERT INTO company_stock_settings (company_id)
       VALUES ($1)
       ON CONFLICT (company_id) DO NOTHING
       RETURNING show_out_of_stock, low_stock_threshold`,
      [companyId]
    );

    let showOutOfStock;
    let lowStockThreshold;

    if (settingsRes.rowCount > 0) {
      ({ show_out_of_stock: showOutOfStock, low_stock_threshold: lowStockThreshold } =
        settingsRes.rows[0]);
    } else {
      const existing = await pool.query(
        `SELECT show_out_of_stock, low_stock_threshold
         FROM company_stock_settings
         WHERE company_id = $1`,
        [companyId]
      );
      ({ show_out_of_stock: showOutOfStock, low_stock_threshold: lowStockThreshold } =
        existing.rows[0]);
    }

    // 2. Fetch feed from latest active snapshot
    const { rows } = await pool.query(
      `
      SELECT
        ssi.item_code,
        ssi.item_name,
        ssi.quantity,
        ii.image_url,
        CASE
          WHEN ssi.quantity = 0 THEN 'OUT'
          WHEN ssi.quantity <= $2 THEN 'LOW'
          ELSE 'AVAILABLE'
        END AS stock_status
      FROM stock_snapshot_items ssi
      JOIN stock_snapshots ss
        ON ss.id = ssi.snapshot_id
       AND ss.company_id = $1
       AND ss.is_archived = false
      JOIN item_images ii
        ON ii.company_id = ss.company_id
       AND ii.item_code = ssi.item_code
      WHERE ii.image_url <> 'N/A'
        AND (
          $3 = true
          OR ssi.quantity > 0
        )
      ORDER BY ssi.item_name
      `,
      [companyId, lowStockThreshold, showOutOfStock]
    );

    return res.json({
      count: rows.length,
      items: rows
    });

  } catch (err) {
    console.error('Mobile feed failed', err);
    return res.status(500).json({ error: 'MOBILE_FEED_FAILED' });
  }
};
