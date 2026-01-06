// routes/agent.ledger.routes.js

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
          ledger_name,
          ledger_group,
          closing_balance,
          balance_type
        }
      ]
    }
*/
router.post('/ledger/upload', async (req, res) => {
  console.log('AGENT /ledger/upload HIT');

  try {
    /* =========================
       DEVICE AUTH (SAME AS STOCK)
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
      return res.status(400).json({
        error: 'DEVICE_COMPANY_NOT_SET'
      });
    }

    // update last seen
    await supabaseAdmin
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);

    const companyId = device.company_id;

    /* =========================
       VALIDATE ROWS
    ========================= */
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No ledger rows received' });
    }

    /* =========================
       1️⃣ CLEAR OLD SNAPSHOT
    ========================= */
    const { error: delErr } = await supabaseAdmin
      .from('ledger_balance_snapshot')
      .delete()
      .eq('company_id', companyId);

    if (delErr) {
      return res.status(500).json({ error: 'Failed to clear old snapshot' });
    }

    /* =========================
       2️⃣ INSERT NEW SNAPSHOT
    ========================= */
    const insertRows = rows.map(r => ({
      company_id: companyId,
      ledger_name: r.ledger_name,
      ledger_group: r.ledger_group,
      closing_balance: r.closing_balance,
      balance_type: r.balance_type
    }));

    const { error: insErr } = await supabaseAdmin
      .from('ledger_balance_snapshot')
      .insert(insertRows);

    if (insErr) {
      return res.status(500).json({ error: 'Ledger snapshot insert failed' });
    }

    return res.json({
      ok: true,
      inserted: insertRows.length
    });

  } catch (err) {
    console.error('AGENT LEDGER ERROR:', err);
    return res.status(500).json({ error: 'Agent ledger failed' });
  }
});

export default router;
