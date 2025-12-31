import express from 'express';
import XLSX from 'xlsx';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { pullStockFromTally, parseStockItems } from '../services/tally.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   GET /admin/items/excel
========================= */
router.get('/items/excel', async (req, res) => {
  try {
    const companyId = req.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('items')
      .select('item_code, item_name, image_url')
      .eq('company_id', companyId)
      .order('item_code');

    if (error) {
      return res.status(500).json({ error: 'DB error' });
    }

    const sheet = XLSX.utils.json_to_sheet(
      (data ?? []).map(r => ({
        item_code: r.item_code,
        item_name: r.item_name,
        image_url: r.image_url || ''
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'ITEM_IMAGES');

    const arr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const buf = Buffer.from(arr);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="item_images.xlsx"'
    );
    res.setHeader('Content-Length', buf.length);

    return res.end(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   POST /admin/items/excel
========================= */
router.post('/items/excel', upload.single('file'), async (req, res) => {
  try {
    const companyId = req.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file required' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    const metaSheet = workbook.Sheets['__META__'];
    if (!metaSheet) {
      return res.status(400).json({ error: 'Missing __META__ sheet' });
    }

    const meta = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
    const metaMap = Object.fromEntries(meta);

    if (metaMap.company_id !== companyId) {
      return res.status(400).json({ error: 'Company mismatch in Excel' });
    }

    const itemSheet = workbook.Sheets['ITEM_IMAGES'];
    if (!itemSheet) {
      return res.status(400).json({ error: 'Missing ITEM_IMAGES sheet' });
    }

    const rows = XLSX.utils.sheet_to_json(itemSheet);

    let updated = 0;
    let skipped = 0;
    const failed = [];

    for (const row of rows) {
      const itemCode = row.item_code;
      const imageUrl = row.image_url;

      if (!itemCode || !imageUrl) {
        skipped++;
        continue;
      }

      if (!/^https:\/\/.+/i.test(imageUrl)) {
        failed.push({ item_code: itemCode, reason: 'Invalid URL' });
        continue;
      }

      const { error } = await supabaseAdmin
        .from('items')
        .update({ image_url: imageUrl })
        .eq('company_id', companyId)
        .eq('item_code', itemCode);

      if (error) {
        failed.push({ item_code: itemCode, reason: 'Update failed' });
      } else {
        updated++;
      }
    }

    return res.json({
      total_rows: rows.length,
      updated,
      skipped,
      failed
    });
  } catch (err) {
    console.error('Excel upload error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   POST /admin/manual-stock-pull
   (STEP D-2: PARSE + LOG ONLY)
========================= */
router.post('/admin/manual-stock-pull', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const tdlKey = req.headers['x-tdl-key'];

    console.log('DEBUG HEADERS READ:', companyId, tdlKey);

    if (!companyId) {
      return res.status(400).json({ error: 'company_id required' });
    }

    // Resolve company name
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('company_name')
      .eq('company_id', companyId)
      .single();

    if (error || !company?.company_name) {
      return res.status(400).json({ error: 'Company not found' });
    }

    // STEP A: pull XML
    const xml = await pullStockFromTally(company.company_name);

    // STEP D-2: parse + log only
const items = parseStockItems(xml);
console.log('PARSED ITEM COUNT:', items.length);
console.log('ABOUT TO INSERT SNAPSHOT FOR', companyId);

// STEP E: UPSERT items FIRST
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
      {
        onConflict: 'company_id,tally_guid'
      }
    );
}

// STEP F: create snapshot AFTER items exist
const { data: snapshot, error: snapErr } = await supabaseAdmin
  .from('stock_snapshots')
  .insert({ company_id: companyId })
  .select('snapshot_id')
  .single();

if (snapErr) {
  return res.status(500).json({ error: 'Snapshot create failed' });
}
// STEP G: insert stock quantities for this snapshot
for (const i of items) {
  const { data: itemRow, error: itemErr } = await supabaseAdmin
    .from('items')
    .select('item_id')
    .eq('company_id', companyId)
    .eq('tally_guid', i.tally_guid)
    .single();

  if (itemErr || !itemRow) continue;

  await supabaseAdmin
    .from('stock_snapshots_items')
    .insert({
      snapshot_id: snapshot.snapshot_id,
      item_id: itemRow.item_id,
      stock: i.quantity
    });
}

return res.json({
  ok: true,
  parsed_items: items.length,
  snapshot_id: snapshot.snapshot_id
});

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'manual pull failed' });
  }
});

export default router;
