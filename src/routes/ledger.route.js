import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /ledger/upload
 * Upload ledger closing balance snapshot (Debtors / Creditors)
 */
router.post('/upload', async (req, res) => {
console.log('[ledger/upload] company_id =', req.company_id);

  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Rows required' });
    }

    // 1️⃣ delete existing snapshot for company
    const { error: delErr } = await supabaseAdmin
      .from('ledger_balance_snapshot')
      .delete()
      .eq('company_id', req.company_id);

    if (delErr) {
      return res.status(500).json({ error: 'Failed to clear old snapshot' });
    }

    // 2️⃣ insert new snapshot rows
    const insertRows = rows.map(r => ({
      company_id: req.company_id,
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

    await log(req.company_id, 'UPLOAD_LEDGER_SNAPSHOT');

    return res.json({
      ok: true,
      inserted: insertRows.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
