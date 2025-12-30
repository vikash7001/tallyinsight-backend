import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /tdl/stock
 * Called directly from TDL
 * - Tally is the only source of truth
 * - Missing items are auto-created (minimal shell)
 * - Stock snapshot is always created
 */
router.post('/stock', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const tdlKey = req.headers['x-tdl-key'];

    /* =========================
       0️⃣ Basic header validation
    ========================= */
    if (!companyId || !tdlKey) {
      return res.status(400).json({ error: 'Missing auth headers' });
    }

    /* =========================
       🔐 Validate TDL key
    ========================= */
    const { data: company, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('tdl_key')
      .eq('company_id', companyId)
      .single();

    if (compErr || !company?.tdl_key) {
      return res.status(403).json({ error: 'Company not allowed' });
    }

    if (company.tdl_key !== tdlKey) {
      return res.status(403).json({ error: 'Invalid TDL key' });
    }

    /* =========================
       1️⃣ Validate payload
    ========================= */
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array required' });
    }

    /* =========================
       2️⃣ Create stock snapshot
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
       3️⃣ Fetch existing items
    ========================= */
    const itemCodes = items
      .map(i => i.item_code)
      .filter(Boolean);

    const { data: dbItems } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code')
      .eq('company_id', companyId)
      .in('item_code', itemCodes);

    const existingCodes = new Set((dbItems ?? []).map(i => i.item_code));

    /* =========================
       4️⃣ Auto-create missing items
       (minimal shell, no validation)
    ========================= */
    const missingItems = items.filter(
      i => i.item_code && !existingCodes.has(i.item_code)
    );

    if (missingItems.length > 0) {
      const newItems = missingItems.map(i => ({
        company_id: companyId,
        item_code: i.item_code,
        item_name: i.item_code   // placeholder; Tally is truth
      }));

      await supabaseAdmin
        .from('items')
        .insert(newItems);
    }

    /* =========================
       5️⃣ Re-fetch all item_ids
    ========================= */
    const { data: allItems } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code')
      .eq('company_id', companyId)
      .in('item_code', itemCodes);

    const itemMap = Object.fromEntries(
      (allItems ?? []).map(i => [i.item_code, i.item_id])
    );

    /* =========================
       6️⃣ Build snapshot rows
       (batch ignored, unit ignored)
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

    /* =========================
       7️⃣ Insert snapshot items
    ========================= */
    const { error: rowErr } = await supabaseAdmin
      .from('stock_snapshot_items')
      .insert(rows);

    if (rowErr) {
      return res.status(500).json({ error: 'Stock insert failed' });
    }

    await log(companyId, 'TDL_STOCK_UPLOAD');

    /* =========================
       8️⃣ Success response
    ========================= */
    return res.json({
      ok: true,
      snapshot_id: snapshot.snapshot_id,
      received: items.length,
      inserted: rows.length,
      auto_created_items: missingItems.length
    });

  } catch (err) {
    console.error('TDL stock error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
