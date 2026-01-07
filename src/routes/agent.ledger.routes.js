import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/ledger/upload

  Headers:
    x-device-id
    x-device-token

  Body:
    {
      rows: [
        {
          ledger_name: string,
          ledger_group: "Sundry Debtors" | "Sundry Creditors",
          closing_balance: number,
          balance_type: "DR" | "CR"
        }
      ]
    }

  Semantics (v1):
  - Latest snapshot only
  - Overwrite per (company_id, ledger_group)
  - Debtors & Creditors synced independently
*/

router.post('/ledger/upload', async (req, res) => {
  console.log('AGENT /ledger/upload HIT');

  try {
    /* =========================
       1️⃣ DEVICE AUTH
    ========================= */
    const deviceId = req.header('x-device-id');
    const deviceToken = req.header('x-device-token');

    if (!deviceId || !deviceToken) {
      return res.status(401).json({ error: 'Missing device credentials' });
    }

    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .select('device_id, company_id')
      .eq('device_id', deviceId)
      .eq('device_token', deviceToken)
      .single();

    if (deviceErr || !device) {
      return res.status(401).json({ error: 'Invalid device' });
    }

    if (!device.company_id) {
      return res.status(400).json({ error: 'DEVICE_COMPANY_NOT_SET' });
    }

    // non-blocking heartbeat
    await supabaseAdmin
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);

    const companyId = device.company_id;

    /* =========================
       2️⃣ VALIDATE INPUT
    ========================= */
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    if (rows.length === 0) {
      return res.status(400).json({ error: 'NO_LEDGER_ROWS' });
    }

    const ledgerGroup = rows[0].ledger_group;

    if (!['Sundry Debtors', 'Sundry Creditors'].includes(ledgerGroup)) {
      return res.status(400).json({ error: 'INVALID_LEDGER_GROUP' });
    }

    for (const r of rows) {
      if (
        !r ||
        typeof r.ledger_name !== 'string' ||
        !r.ledger_name.trim() ||
        typeof r.closing_balance !== 'number' ||
        isNaN(r.closing_balance) ||
        r.closing_balance <= 0 ||
        !['DR', 'CR'].includes(r.balance_type) ||
        r.ledger_group !== ledgerGroup
      ) {
        return res.status(400).json({
          error: 'INVALID_LEDGER_ROW',
          row: r
        });
      }
    }

    /* =========================
       3️⃣ DELETE OLD SNAPSHOT (GROUP ONLY)
    ========================= */
    const { error: delErr } = await supabaseAdmin
      .from('ledger_balance_snapshot')
      .delete()
      .eq('company_id', companyId)
      .eq('ledger_group', ledgerGroup);

    if (delErr) {
      console.error('LEDGER DELETE ERROR:', delErr);
      return res.status(500).json({
        error: 'LEDGER_SNAPSHOT_DELETE_FAILED'
      });
    }

    /* =========================
       4️⃣ INSERT NEW SNAPSHOT
    ========================= */
    const insertRows = rows.map(r => ({
      company_id: companyId,
      ledger_name: r.ledger_name.trim(),
      ledger_group: r.ledger_group,
      closing_balance: r.closing_balance,
      balance_type: r.balance_type
    }));

    const { error: insErr } = await supabaseAdmin
      .from('ledger_balance_snapshot')
      .insert(insertRows);

    if (insErr) {
      console.error('LEDGER INSERT ERROR:', insErr);
      return res.status(500).json({
        error: 'LEDGER_SNAPSHOT_INSERT_FAILED'
      });
    }

    /* =========================
       5️⃣ SUCCESS
    ========================= */
    return res.json({
      ok: true,
      company_id: companyId,
      ledger_group: ledgerGroup,
      inserted: insertRows.length
    });

  } catch (err) {
    console.error('AGENT LEDGER ERROR:', err);
    return res.status(500).json({
      error: 'AGENT_LEDGER_UPLOAD_FAILED'
    });
  }
});

export default router;
