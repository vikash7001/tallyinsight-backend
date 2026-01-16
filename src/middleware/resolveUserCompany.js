import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

import adminHeaderAuth from '../middleware/adminHeaderAuth.js';
import { resolveUserCompany } from '../middleware/resolveUserCompany.js';

const router = express.Router();

/* =====================================================
   GET /subscriptions/status
===================================================== */
router.get(
  '/status',
  adminHeaderAuth,
  resolveUserCompany,
  async (req, res) => {
    try {
      const { company_id } = req;

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('status, trial_start, trial_end, expiry_date, grace_end')
        .eq('company_id', company_id)
        .single();

      if (error || !data) {
        return res.json({ status: 'NO_SUBSCRIPTION' });
      }

      const today = new Date();
      let effectiveStatus = 'EXPIRED';

      if (data.expiry_date && new Date(data.expiry_date) >= today) {
        effectiveStatus = 'ACTIVE';
      } else if (data.trial_end && new Date(data.trial_end) >= today) {
        effectiveStatus = 'TRIAL';
      } else if (data.grace_end && new Date(data.grace_end) >= today) {
        effectiveStatus = 'GRACE';
      }

      return res.json({
        status: effectiveStatus,
        trial_start: data.trial_start,
        trial_end: data.trial_end,
        expiry_date: data.expiry_date,
        grace_end: data.grace_end
      });

    } catch (err) {
      console.error('GET /subscriptions/status failed:', err);
      return res.status(500).json({ error: 'FAILED_TO_FETCH_SUBSCRIPTION' });
    }
  }
);

/* =====================================================
   POST /subscriptions/renew
===================================================== */
router.post(
  '/renew',
  adminHeaderAuth,
  resolveUserCompany,
  async (req, res) => {
    try {
      const { company_id } = req;
      const { months } = req.body;

      if (!months || Number(months) <= 0) {
        return res.status(400).json({ error: 'INVALID_DURATION' });
      }

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('expiry_date')
        .eq('company_id', company_id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'NO_SUBSCRIPTION' });
      }

      const now = new Date();
      const baseDate =
        data.expiry_date && new Date(data.expiry_date) > now
          ? new Date(data.expiry_date)
          : now;

      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + Number(months));

      const { error: updateErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          expiry_date: newExpiry.toISOString(),
          grace_end: null,
          status: 'ACTIVE'
        })
        .eq('company_id', company_id);

      if (updateErr) {
        throw updateErr;
      }

      return res.json({
        success: true,
        expiry_date: newExpiry
      });

    } catch (err) {
      console.error('POST /subscriptions/renew failed:', err);
      return res.status(500).json({ error: 'FAILED_TO_RENEW_SUBSCRIPTION' });
    }
  }
);

export default router;
