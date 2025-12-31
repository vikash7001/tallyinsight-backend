import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();
router.post('/stock', async (req, res) => {
  console.log('AGENT /stock HIT', {
    headers: req.headers,
    bodyCount: Array.isArray(req.body?.items) ? req.body.items.length : null
  });

/*
  POST /agent/stock
  Headers:
    x-company-id
    x-user-id
  Body:
    {
      items: [
        {
          tally_guid,
          item_name,
          uom,
          quantity
        }
      ]
    }
*/
router.post('/stock', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Missing headers' });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'No items received' });
    }

    /* =========================
       1️⃣ UPSERT ITEMS
    ========================= */
    for (const i of items) {
      await supabaseAdmin
        .from('items')
        .upsert(
          {
            company_id: companyId,
            tally_guid: i.tally_guid,
            item_name: i.item_name,
            uom: i.uom
          },
          { onConflict: 'company_id,tally_guid' }
        );
    }

    /* =========================
       2️⃣ CREATE SNAPSHOT
    ========================= */
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('stock_snapshots')
      .insert({ company_id: companyId })
      .select('snapshot_id')
      .single();

    if (snapErr) {
      console.error(snapErr);
      return res.status(500).json({ error: 'Snapshot failed' });
    }

    /* =========================
       3️⃣ MAP ITEM IDS
    ========================= */
    const { data: dbItems, error: mapErr } = await supabaseAdmin
      .from('items')
      .select('item_id, tally_guid')
      .eq('company_id', companyId);

    if (mapErr) {
      console.error(mapErr);
      return res.status(500).json({ error: 'Item map failed' });
    }

    const itemMap = Object.fromEntries(
      dbItems.map(i => [i.tally_guid, i.item_id])
    );

    /* =========================
       4️⃣ INSERT SNAPSHOT ITEMS
    ========================= */
    const rows = items.map(i => ({
      snapshot_id: snapshot.snapshot_id,
      item_id: itemMap[i.tally_guid],
      stock: i.quantity
    }));

    await supabaseAdmin
      .from('stock_snapshots_items')
      .insert(rows);

    return res.json({
      ok: true,
      snapshot_id: snapshot.snapshot_id,
      items: rows.length
    });

  } catch (err) {
    console.error('AGENT STOCK ERROR:', err);
    return res.status(500).json({ error: 'Agent stock failed' });
  }
});

export default router;
