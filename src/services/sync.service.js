const db = require('../config/db');

async function saveSnapshot(companyId, source, items) {
  try {
    // 1️⃣ Create snapshot
    const snapRes = await db.query(
      `INSERT INTO stock_snapshots (company_id, source)
       VALUES ($1, $2)
       RETURNING snapshot_id`,
      [companyId, source]
    );

    const snapshotId = snapRes.rows[0].snapshot_id;

    // 2️⃣ Save items
    for (const item of items) {
      const itemRes = await db.query(
        `INSERT INTO items (company_id, item_code, item_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id, item_code)
         DO UPDATE SET item_name = EXCLUDED.item_name
         RETURNING item_id`,
        [companyId, item.item_code, item.item_name]
      );

      await db.query(
        `INSERT INTO stock_snapshot_items (snapshot_id, item_id, quantity)
         VALUES ($1, $2, $3)`,
        [snapshotId, itemRes.rows[0].item_id, item.quantity]
      );
    }

    // 3️⃣ Log success
    await db.query(
      `INSERT INTO sync_logs (company_id, status, message)
       VALUES ($1, 'SUCCESS', 'Snapshot saved')`,
      [companyId]
    );

    return snapshotId;

  } catch (err) {
    await db.query(
      `INSERT INTO sync_logs (company_id, status, message)
       VALUES ($1, 'FAILED', $2)`,
      [companyId, err.message]
    );
    throw err;
  }
}

module.exports = { saveSnapshot };
