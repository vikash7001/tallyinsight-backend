import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/stock
  Headers:
    x-device-id
    x-device-token
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
  console.log('AGENT /stock HIT', {
    bodyCount: Array.isArray(req.body?.items)
      ? req.body.items.length
      : null
  });

  try {
    /* =========================
       DEVICE AUTH
    ========================= */
    const deviceId = req.header('x-device-id');
    const deviceToken = req.header('x-device-token');

    if (!deviceId || !deviceToken) {
      return res.status(401).json({ error: 'Missing device credentials' });
    }

    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .select('device_id, admin_id')
      .eq('device_id', deviceId)
      .eq('device_token', deviceToken)
      .single();

    if (deviceErr || !device) {
      return res.status(401).json({ error: 'Invalid device' });
    }

    await supabaseAdmin
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);

    /* =========================
       RESOLVE COMPANY
    ========================= */
    const { data: adminUser, error: adminErr } = await supabaseAdmin
      .from('app_users')
      .select('company_id')
      .eq('user_id', device.admin_id)
      .eq('role', 'ADMIN')
      .eq('active', true)
      .single();

    if (adminErr || !adminUser) {
      return res.status(400).json({ error: 'Admin has no active company' });
    }

    const companyId = adminUser.company_id;

    /* =========================
       VALIDATE ITEMS
    ========================= */
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
       2️⃣ CREATE SNAPSHOT (PENDING)
    ========================= */
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('stock_snapshots')
      .insert({ company_id: companyId }) // status defaults to PENDING
      .select('snapshot_id')
      .single();

    if (snapErr || !snapshot) {
      console.error(snapErr);
      return res.status(500).json({ error: 'Snapshot creation failed' });
    }

    /* =========================
       3️⃣ MAP ITEM IDS (FIXED)
    ========================= */

    // collect only GUIDs from this payload
    const tallyGuids = items.map(i => i.tally_guid);

    // fetch only required items
    const { data: dbItems, error: mapErr } = await supabaseAdmin
      .from('items')
      .select('item_id, tally_guid')
      .eq('company_id', companyId)
      .in('tally_guid', tallyGuids);

    if (mapErr || !dbItems || dbItems.length === 0) {
      await supabaseAdmin
        .from('stock_snapshots')
        .update({ status: 'FAILED' })
        .eq('snapshot_id', snapshot.snapshot_id);

      return res.status(500).json({ error: 'Item mapping failed' });
    }

    const itemMap = {};
    for (const row of dbItems) {
      itemMap[row.tally_guid] = row.item_id;
    }

    // validate mapping before insert
    for (const i of items) {
      if (!itemMap[i.tally_guid]) {
        await supabaseAdmin
          .from('stock_snapshots')
          .update({ status: 'FAILED' })
          .eq('snapshot_id', snapshot.snapshot_id);

        return res.status(500).json({
          error: `Missing item_id for tally_guid ${i.tally_guid}`
        });
      }
    }

    /* =========================
       4️⃣ INSERT SNAPSHOT ITEMS
    ========================= */
    const rows = items.map(i => ({
      snapshot_id: snapshot.snapshot_id,
      item_id: itemMap[i.tally_guid],
      stock_qty: i.quantity
    }));

    const { error: snapItemErr } = await supabaseAdmin
      .from('stock_snapshot_items')
      .insert(rows);

    if (snapItemErr) {
      console.error('SNAPSHOT ITEM INSERT ERROR:', snapItemErr);

      await supabaseAdmin
        .from('stock_snapshots')
        .update({ status: 'FAILED' })
        .eq('snapshot_id', snapshot.snapshot_id);

      return res.status(500).json({ error: 'Snapshot item insert failed' });
    }

    /* =========================
       5️⃣ MARK SNAPSHOT COMPLETE
    ========================= */
    await supabaseAdmin
      .from('stock_snapshots')
      .update({ status: 'COMPLETE' })
      .eq('snapshot_id', snapshot.snapshot_id);

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
