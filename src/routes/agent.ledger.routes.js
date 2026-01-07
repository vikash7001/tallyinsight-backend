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
          ledger_name: string,
          ledger_group: "Sundry Debtors" | "Sundry Creditors",
          closing_balance: number,
          balance_type: "DR" | "CR"
        }
      ]
    }

  Semantics:
  - Latest balance only
  - Full replace (authoritative snapshot)
  - Atomic (RPC-backed)
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

    // update last seen (non-blocking)
    await supabaseAdmin
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);

    const companyId = device.company_id;

    /* =========================
       2️⃣ VALIDATE INPUT ROWS
    ========================= */
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    for (const r of rows) {
      if (
        !r ||
        typeof r.ledger_name !== 'string' ||
        !r.ledger_name.trim() ||
        typeof r.closing_balance !== 'number' ||
        isNaN(r.closing_balance) ||
        r.closing_balance <= 0 ||
        !['DR', 'CR'].includes(r.balance_type) ||
        !['Sundry Debtors', 'Sundry Creditors'].includes(r.ledger_group)
      ) {
        return res.status(400).json({
          error: 'INVALID_LEDGER_ROW',
          row: r
        });
      }
    }

    /* =========================
       3️⃣ ATOMIC REPLACE (RPC)
    ========================= */
    const { error: rpcErr } = await supabaseAdmin.rpc(
      'replace_ledger_snapshot',
      {
        p_company_id: companyId,
        p_rows: rows.map(r => ({
          ledger_name: r.ledger_name.trim(),
          ledger_group: r.ledger_group,
          closing_balance: r.closing_balance,
          balance_type: r.balance_type
        }))
      }
    );

    if (rpcErr) {
      console.error('LEDGER RPC ERROR:', rpcErr);
      return res.status(500).json({
        error: 'LEDGER_SNAPSHOT_REPLACE_FAILED'
      });
    }

    /* =========================
       4️⃣ SUCCESS
    ========================= */
    return res.json({
      ok: true,
      company_id: companyId,
      inserted: rows.length
    });

  } catch (err) {
    console.error('AGENT LEDGER ERROR:', err);
    return res.status(500).json({
      error: 'AGENT_LEDGER_UPLOAD_FAILED'
    });
  }
});

export default router;
