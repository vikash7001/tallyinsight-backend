import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    // 🔒 companyId must be present (from licenseGuard)
    if (!req.companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('v_active_stock')
      .select('*')
      .eq('company_id', req.companyId)
      .range(offset, offset + limit - 1);

    // log AFTER successful query attempt
    await log(req.companyId, 'FETCH_STOCK');

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
