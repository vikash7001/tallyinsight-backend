import express from 'express';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/items/excel', async (req, res) => {
  try {
    const companyId = req.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    // 1️⃣ Fetch items (same logic as /items)
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('item_code, item_name, image_url')
      .eq('company_id', companyId)
      .order('item_code');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch items' });
    }

    // 2️⃣ ITEM_IMAGES sheet
    const itemsSheet = XLSX.utils.json_to_sheet(
      (data ?? []).map(i => ({
        item_code: i.item_code,
        item_name: i.item_name,
        image_url: ''
      }))
    );

    // 3️⃣ META sheet (hidden)
    const downloadId = uuidv4();
    const metaSheet = XLSX.utils.aoa_to_sheet([
      ['download_id', downloadId],
      ['company_id', companyId],
      ['downloaded_at', new Date().toISOString()]
    ]);

    // 4️⃣ Build workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'ITEM_IMAGES');
    XLSX.utils.book_append_sheet(workbook, metaSheet, '__META__');

    // Hide meta sheet
    workbook.Workbook = {
      Sheets: [{ Hidden: 0 }, { Hidden: 1 }]
    };

    // 5️⃣ Send file
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="item_images.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.send(buffer);
  } catch (err) {
    console.error('Excel download error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
