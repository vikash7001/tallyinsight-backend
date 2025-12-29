import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /items
router.get('/', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('items')
      .select('item_code, item_name, image_url')
      .eq('company_id', req.company_id)
      .order('item_code');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch items' });
    }

    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /items/:item_code
router.put('/:item_code', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { item_code } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'image_url required' });
    }

    const { error } = await supabaseAdmin
      .from('items')
      .update({ image_url })
      .eq('company_id', req.company_id)
      .eq('item_code', item_code);

    if (error) {
      return res.status(500).json({ error: 'Failed to update image' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
