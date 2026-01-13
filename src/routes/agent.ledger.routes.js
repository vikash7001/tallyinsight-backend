import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

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

    const deviceRes = await pool.query(
      `
      SELECT company_id
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
        closing_balance == null ||
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
      return res.json({ ok: true, inserted: 0 });
    }

    const values = [];
    const params = [];
    let i = 1;

    for (const r of validRows) {
      values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
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
      VALUES ${values.join(',')}
      `,
      params
    );

    console.log('AGENT /ledger/upload INSERTED', validRows.length);

    res.json({ ok: true, inserted: validRows.length });

  } catch (err) {
    console.error('AGENT /ledger/upload ERROR', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
