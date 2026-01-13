import express from 'express';
import { pool } from '../db.js'; // adjust import if needed

const router = express.Router();

/**
 * POST /agent/ledger/upload
 * Device-authenticated ledger snapshot upload
 */
router.post('/ledger/upload', async (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const deviceToken = req.headers['x-device-token'];

    if (!deviceId || !deviceToken) {
      return res.status(401).json({ error: 'Missing device headers' });
    }

    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No ledger rows provided' });
    }

    /* =========================
       RESOLVE DEVICE → COMPANY
    ========================= */

    const deviceRes = await pool.query(
      `
      SELECT id, company_id
      FROM devices
      WHERE id = $1
        AND device_token = $2
        AND revoked = false
      `,
      [deviceId, deviceToken]
    );

    if (deviceRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or revoked device' });
    }

    const companyId = deviceRes.rows[0].company_id;

    /* =========================
       VALIDATE & PREPARE ROWS
    ========================= */

    const validRows = [];

    for (const row of rows) {
      const {
        ledger_name,
        ledger_group,
        closing_balance,
        balance_type
      } = row;

      if (
        !ledger_name ||
        !ledger_group ||
        closing_balance === null ||
        closing_balance === undefined ||
        !balance_type
      ) {
        console.warn('AGENT /ledger INVALID ROW:', row);
        continue;
      }

      validRows.push({
        company_id: companyId,
        ledger_name,
        ledger_group,
        closing_balance,
        balance_type
      });
    }

    if (validRows.length === 0) {
      return res
        .status(200)
        .json({ ok: true, inserted: 0, note: 'No valid rows' });
    }

    /* =========================
       SNAPSHOT INSERT
    ========================= */

    const insertValues = [];
    const params = [];

    let idx = 1;
    for (const r of validRows) {
      insertValues.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        r.company_id,
        r.ledger_name,
        r.ledger_group,
        r.closing_balance,
        r.balance_type
      );
    }

    await pool.query(
      `
      INSERT INTO ledger_balance_snapshot (
        company_id,
        ledger_name,
        ledger_group,
        closing_balance,
        balance_type
      )
      VALUES ${insertValues.join(',')}
      `,
      params
    );

    console.log(
      'AGENT /ledger/upload INSERTED',
      validRows.length,
      'rows for company',
      companyId
    );

    return res.json({
      ok: true,
      inserted: validRows.length
    });

  } catch (err) {
    console.error('AGENT /ledger/upload ERROR', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
