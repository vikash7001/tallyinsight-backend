import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /tdl/stock
 * Called directly from TDL
 */
router.post('/stock', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const tdlKey = req.headers['x-tdl-key'];

    if (!companyId || !tdlKey) {
      return res.status(400).json({ error: 'Missing auth headers' });
    }

    // 🔐 TODO (Phase 2): validate tdlKey against DB
    // For now, accept presence only (safe, internal use)

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array required' });
    }

    /* =========================
       1️⃣ Create stock snapshot
    ========================= */
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('stock_snapshots')
      .insert({ company_id: companyId })
      .select('snapshot_id')
      .single();

    if (snapErr) {
      return res.status(500).json({ error: 'Snapshot create failed' });
    }

    /* =========================
       2️⃣ Resolve item_code → item_id
    ========================= */
    const itemCodes = items.map(i => i.item_code);

    const { data: dbItems } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code')
      .eq('company_id', companyId)
      .in('item_code', itemCodes);

    const itemMap = Object.fromEntries(
      (dbItems ?? []).map(i => [i.item_code, i.item_id])
    );

    /* =========================
       3️⃣ Build snapshot rows
       (batch ignored, unit metadata only)
    ========================= */
const rows = items
  .filter(i => itemMap[i.item_code])
  .map(i => ({
    snapshot_id: snapshot.snapshot_id,
    item_id: itemMap[i.item_code],
    stock_qty: Number(i.stock_qty) || 0
  }));


    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid items found' });
    }

    const { error: rowErr } = await supabaseAdmin
      .from('stock_snapshot_items')
      .insert(rows);

    if (rowErr) {
      return res.status(500).json({ error: 'Stock insert failed' });
    }

    await log(companyId, 'TDL_STOCK_UPLOAD');

    return res.json({
      ok: true,
      snapshot_id: snapshot.snapshot_id,
      received: items.length,
      inserted: rows.length,
      skipped: items.length - rows.length
    });

  } catch (err) {
    console.error('TDL stock error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
