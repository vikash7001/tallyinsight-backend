const pool = require('../config/db');

exports.upsertItemImage = async (req, res) => {
  try {
    const { itemCode, imageUrl } = req.body;
    const companyId = req.companyId;

    if (!itemCode || !imageUrl) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const code = String(itemCode).trim();
    const url = String(imageUrl).trim();

    if (!code) {
      return res.status(400).json({ error: 'ITEMCODE_REQUIRED' });
    }

    if (!url) {
      return res.status(400).json({ error: 'IMAGE_URL_REQUIRED' });
    }

    // Allow literal 'N/A'
    if (url !== 'N/A') {
      // Basic URL validation (locked decision)
      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: 'INVALID_IMAGE_URL' });
      }
    }

    // Ensure item exists in latest snapshot (recommended rule)
    const itemRes = await pool.query(
      `SELECT 1
       FROM stock_snapshot_items ssi
       JOIN stock_snapshots ss ON ss.id = ssi.snapshot_id
       WHERE ss.company_id = $1
         AND ss.is_archived = false
         AND ssi.item_code = $2
       LIMIT 1`,
      [companyId, code]
    );

    if (itemRes.rowCount === 0) {
      return res.status(404).json({ error: 'ITEM_NOT_FOUND_IN_STOCK' });
    }

    // Hand off to upsert logic (next step)
    // Upsert image (one per company + item)
    await pool.query(
      `INSERT INTO item_images
       (company_id, item_code, image_url, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (company_id, item_code)
       DO UPDATE SET
         image_url = EXCLUDED.image_url,
         updated_at = now()`,
      [companyId, code, url]
    );

    return res.json({
      status: 'IMAGE_UPDATED',
      item_code: code,
      image_url: url
    });

  } catch (err) {
    console.error('Item image validation error', err);
    return res.status(500).json({ error: 'IMAGE_UPSERT_FAILED' });
  }
};
