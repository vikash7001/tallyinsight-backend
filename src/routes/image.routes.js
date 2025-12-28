import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // companyId must come from middleware (licenseGuard)
    if (!req.companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('item_images')
      .select('*')
      .eq('company_id', req.companyId);

    if (error) {
      console.error('Images fetch error:', error);
      return res.status(500).json({ error: 'Image fetch failed' });
    }

    return res.json(data ?? []);
  } catch (err) {
    console.error('Images route crash:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
