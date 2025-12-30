import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /tdl/stock
 * - Tally is the only source of truth
 * - Missing items are auto-created (minimal shell)
 * - Snapshot is created ONLY after items are ready
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
       1️⃣ Validate & normalize payload
    ========================= */
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ error: 'Items array required' });
    }

    const items = req.body.items
      .map(i => ({
        ...i,
        item_code: String(i.item_code || '').trim()
      }))
      .filter(i => i.item_code);

    /* =========================
       2️⃣ Fetch existing items
    ========================= */
    const itemCodes = items.map(i => i.item_code);

    const { data: dbItems } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code')
      .eq('company_id', companyId)
      .in('item_code', itemCodes);

    const existingCodes = new Set((dbItems ?? []).map(i => i.item_code));

    /* =========================
       3️⃣ Auto-create missing items (UPSERT)
    ========================= */
    const missingItems = items.filter(
      i => !existingCodes.has(i.item_code)
    );

    let createdItems = [];

    if (missingItems.length > 0) {
      const newItems = missingItems.map(i => ({
        company_id: companyId,
        item_code: i.item_code,
        item_name: i.item_code
      }));

      const { data, error } = await supabaseAdmin
        .from('items')
        .upsert(newItems, {
          onConflict: 'company_id,item_code'
        })
        .select('item_id, item_code');

      if (error) {
        return res.status(500).json({ error: 'Item auto-create failed' });
      }

      createdItems = data ?? [];
    }

    /* =========================
       4️⃣ Build item map (NO re-fetch)
    ========================= */
    const allItemRows = [
      ...(dbItems ?? []),
      ...createdItems
    ];

    const itemMap = Object.fromEntries(
      allItemRows.map(i => [i.item_code, i.item_id])
    );

    /* =========================
       5️⃣ Create stock snapshot (SAFE POSITION)
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
       6️⃣ Build snapshot rows
    ========================= */
    const rows = items.map(i => ({
      snapshot_id: snapshot.snapshot_id,
      item_id: itemMap[i.item_code],
      stock_qty: Number(i.stock_qty) || 0
    }));

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
      auto_created_items: createdItems.length
    });

  } catch (err) {
    console.error('TDL stock error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
