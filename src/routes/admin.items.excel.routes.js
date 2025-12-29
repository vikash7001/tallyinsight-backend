import express from 'express';
import XLSX from 'xlsx';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   GET /admin/items/excel
   (already working)
========================= */
// ⬆️ KEEP YOUR EXISTING GET CODE HERE UNCHANGED


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

    // 1️⃣ Read workbook
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 2️⃣ Validate META sheet
    const metaSheet = workbook.Sheets['__META__'];
    if (!metaSheet) {
      return res.status(400).json({ error: 'Missing __META__ sheet' });
    }

    const meta = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
    const metaMap = Object.fromEntries(meta);

    if (metaMap.company_id !== companyId) {
      return res.status(400).json({ error: 'Company mismatch in Excel' });
    }

    // 3️⃣ Read ITEM_IMAGES
    const itemSheet = workbook.Sheets['ITEM_IMAGES'];
    if (!itemSheet) {
      return res.status(400).json({ error: 'Missing ITEM_IMAGES sheet' });
    }

    const rows = XLSX.utils.sheet_to_json(itemSheet);

    let updated = 0;
    let skipped = 0;
    const failed = [];

    // 4️⃣ Process rows (PARTIAL SUCCESS)
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

    // 5️⃣ Summary response
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

export default router;
