import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import adminHeaderAuth from '../middleware/adminHeaderAuth.js';
import { resolveUserCompany } from '../middleware/resolveUserCompany.js';
import { checkCompanySubscription } from '../middleware/checkCompanySubscription.js';

const router = express.Router();

/* =========================
   Middleware (ORDER MATTERS)
========================= */
router.use(adminHeaderAuth);
router.use(resolveUserCompany);
router.use(checkCompanySubscription);

/* =========================
   GET /images
========================= */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('item_images')
      .select('*')
      .eq('company_id', req.company_id);

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
