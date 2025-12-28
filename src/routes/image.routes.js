import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { data } = await supabase
    .from('item_images')
    .select('*')
    .eq('company_id', req.companyId);

  res.json(data);
});

export default router;
