import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /stock/active
router.get('/active', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('v_active_stock')
      .select('item_id, stock_qty')
      .eq('company_id', req.company_id);

    if (error) {
      console.error('ACTIVE STOCK ERROR:', error);
      return res.status(500).json({ error: 'Failed to fetch active stock' });
    }

    return res.json(data ?? []);
  } catch (err) {
    console.error('ACTIVE STOCK SERVER ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
