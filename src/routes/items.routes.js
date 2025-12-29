import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

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

export default router;
