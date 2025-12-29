import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    // company_id is set by licenseGuard
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('v_active_stock')
      .select('*')
      .eq('company_id', req.company_id)
      .range(offset, offset + limit - 1);

    // log AFTER successful query attempt
    await log(req.company_id, 'FETCH_STOCK');

    if (error) {
      console.error('Stock fetch error:', error);
      return res.status(500).json({ error: 'Stock fetch failed' });
    }

    return res.json(data ?? []);
  } catch (err) {
    console.error('Stock route crash:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
