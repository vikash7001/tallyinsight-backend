const XLSX = require('xlsx');
const pool = require('../config/db');

exports.handleUpload = async (req, res) => {
  let client;

  try {
    // 0. File checks
    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE' });
    }

    if (!req.file.originalname.endsWith('.xlsx')) {
      return res.status(400).json({ error: 'INVALID_FILE_TYPE' });
    }

    // Read workbook
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 1. Validate sheet name
    const sheetName = 'STOCK';
    if (!workbook.SheetNames.includes(sheetName)) {
      return res.status(400).json({ error: 'INVALID_SHEET_NAME' });
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to rows
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    if (rows.length < 2) {
      return res.status(400).json({ error: 'NO_DATA_ROWS' });
    }

    // 2. Validate header
    const header = rows[0];
    const expectedHeader = ['ItemCode', 'ItemName', 'Quantity'];

    const headerMismatch =
      header.length !== expectedHeader.length ||
      !expectedHeader.every((col, i) => header[i] === col);

    if (headerMismatch) {
      return res.status(400).json({
        error: 'INVALID_HEADER',
        expected: expectedHeader
      });
    }

    // 3. Row-level validation
    const dataRows = rows.slice(1);
    const seenItemCodes = new Set();
    const parsedItems = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2;
      const [itemCodeRaw, itemNameRaw, qtyRaw] = dataRows[i];

      const itemCode = String(itemCodeRaw).trim();
      const itemName = String(itemNameRaw).trim();

      if (!itemCode) {
        return res.status(400).json({ error: 'ITEMCODE_REQUIRED', row: rowNumber });
      }

      if (!itemName) {
        return res.status(400).json({ error: 'ITEMNAME_REQUIRED', row: rowNumber });
      }

      if (seenItemCodes.has(itemCode)) {
        return res.status(400).json({
          error: 'DUPLICATE_ITEMCODE',
          itemCode,
          row: rowNumber
        });
      }

      const quantity = Number(qtyRaw);
      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({
          error: 'INVALID_QUANTITY',
          row: rowNumber
        });
      }

      seenItemCodes.add(itemCode);

      parsedItems.push({
        itemCode,
        itemName,
        quantity
      });
    }

    // 4. DB transaction
    client = await pool.connect();
    await client.query('BEGIN');

    // 4a. Archive previous snapshots
    await client.query(
      `UPDATE stock_snapshots
       SET is_archived = true
       WHERE company_id = $1 AND is_archived = false`,
      [req.companyId]
    );

    // 4b. Create new snapshot
    const snapshotRes = await client.query(
      `INSERT INTO stock_snapshots (company_id, created_at)
       VALUES ($1, now())
       RETURNING id`,
      [req.companyId]
    );

    const snapshotId = snapshotRes.rows[0].id;

    // 4c. Insert snapshot items
    const insertValues = [];
    const params = [];
    let paramIndex = 1;

    parsedItems.forEach(item => {
      insertValues.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      params.push(
        snapshotId,
        item.itemCode,
        item.itemName,
        item.quantity
      );
    });

    await client.query(
      `INSERT INTO stock_snapshot_items
       (snapshot_id, item_code, item_name, quantity)
       VALUES ${insertValues.join(',')}`,
      params
    );

    await client.query('COMMIT');

    // 5. Sync log – success
    await pool.query(
      `INSERT INTO sync_logs
       (company_id, status, message, created_at)
       VALUES ($1, 'SUCCESS', 'Stock snapshot uploaded', now())`,
      [req.companyId]
    );

    return res.json({
      status: 'SNAPSHOT_CREATED',
      snapshot_id: snapshotId,
      item_count: parsedItems.length
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('Stock upload failed', err);

    await pool.query(
      `INSERT INTO sync_logs
       (company_id, status, message, created_at)
       VALUES ($1, 'FAILED', 'Stock upload failed', now())`,
      [req.companyId]
    );

    return res.status(500).json({ error: 'STOCK_UPLOAD_FAILED' });

  } finally {
    if (client) client.release();
  }
};
