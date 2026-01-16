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
   GET /items
========================= */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('item_id, item_code, item_name, image_url')
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

/* =========================
   PUT /items/:item_code
========================= */
router.put('/:item_code', async (req, res) => {
  try {
    // WRITE protection (sync/write allowed only ACTIVE/TRIAL)
    if (!['ACTIVE', 'TRIAL'].includes(req.companyStatus.status)) {
      return res.status(403).json({
        error: 'COMPANY_SUBSCRIPTION_INACTIVE',
        status: req.companyStatus.status
      });
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
