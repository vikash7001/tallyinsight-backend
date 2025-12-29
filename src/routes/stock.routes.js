import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /stock
 * Read active stock
 */
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('v_active_stock')
      .select('*')
      .eq('company_id', req.company_id)
      .range(offset, offset + limit - 1);

    await log(req.company_id, 'FETCH_STOCK');

    if (error) {
      return res.status(500).json({ error: 'Stock fetch failed' });
    }

    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /stock/upload
 * Upload a new stock snapshot
 */
router.post('/upload', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items required' });
    }

    // 1️⃣ create snapshot
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('stock_snapshots')
      .insert({ company_id: req.company_id })
      .select('snapshot_id')
      .single();

    if (snapErr) {
      return res.status(500).json({ error: 'Snapshot create failed' });
    }

    // 2️⃣ resolve item codes → item_ids
    const itemCodes = items.map(i => i.item_code);

    const { data: dbItems } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code')
      .eq('company_id', req.company_id)
      .in('item_code', itemCodes);

    const itemMap = Object.fromEntries(
      (dbItems ?? []).map(i => [i.item_code, i.item_id])
    );

    // 3️⃣ build snapshot rows
    const rows = items
      .filter(i => itemMap[i.item_code])
      .map(i => ({
        snapshot_id: snapshot.snapshot_id,
        item_id: itemMap[i.item_code],
        stock_qty: i.qty
      }));

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid items' });
    }

    const { error: rowErr } = await supabaseAdmin
      .from('stock_snapshot_items')
      .insert(rows);

    if (rowErr) {
      return res.status(500).json({ error: 'Stock insert failed' });
    }

    await log(req.company_id, 'UPLOAD_STOCK');

    return res.json({ ok: true, snapshot_id: snapshot.snapshot_id });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
