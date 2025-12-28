import express from 'express';
import { supabase } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);

  const { data, error } = await supabase
    .from('v_active_stock')
    .select('*')
    .eq('company_id', req.companyId)
    .range(offset, offset + limit - 1);

  await log(req.companyId, 'FETCH_STOCK');

  if (error) return res.status(500).json({ error: 'Stock fetch failed' });
  res.json(data);
});

export default router;
