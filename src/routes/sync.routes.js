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
// GET /sync/last
router.get('/last', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('stock_snapshots')
      .select('uploaded_at')
      .eq('company_id', req.company_id)
      .order('uploaded_at', { ascending: false }) // ✅ FIX
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('LAST SYNC ERROR:', error);
      return res.status(500).json({ error: 'Failed to fetch last sync' });
    }

    return res.json({
      last_sync_at: data ? data.uploaded_at : null
    });
  } catch (err) {
    console.error('LAST SYNC SERVER ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
