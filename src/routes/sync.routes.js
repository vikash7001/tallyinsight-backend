import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// GET /sync/last
router.get('/last', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('stock_snapshots')
      .select('created_at')
      .eq('company_id', req.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('LAST SYNC ERROR:', error);
      return res.status(500).json({ error: 'Failed to fetch last sync' });
    }

    return res.json({
      last_sync_at: data ? data.created_at : null
    });
  } catch (err) {
    console.error('LAST SYNC SERVER ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
