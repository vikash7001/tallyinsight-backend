import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /subscriptions/create
===================================================== */
router.post('/create', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const companyId = req.headers['x-company-id'];
    const { plan } = req.body;

    if (!userId || !companyId) {
      return res.status(401).json({ error: 'Missing identity' });
    }

    if (!plan || !['trial', 'paid'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    /* =========================
       VERIFY USER ↔ COMPANY LINK
    ========================= */
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('user_company')
      .select('company_id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (linkErr || !link) {
      return res.status(403).json({ error: 'Unauthorized company access' });
    }

    /* =========================
       DUPLICATE PREVENTION
       (UNCHANGED)
    ========================= */
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('company_id')
      .eq('company_id', companyId)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'SUBSCRIPTION_ALREADY_EXISTS' });
    }

    /* =========================
       PREPARE DATES
       (UNCHANGED)
    ========================= */
    let trialStart = null;
    let trialEnd = null;

    if (plan === 'trial') {
      trialStart = new Date();
      trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
    }

    /* =========================
       CREATE SUBSCRIPTION
       (UNCHANGED)
    ========================= */
    const { error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: companyId,
        status: 'ACTIVE',
        trial_start: trialStart,
        trial_end: trialEnd
      });

    if (subErr) {
      console.error('[subscription create]', subErr);
      return res.status(500).json({ error: 'Subscription creation failed' });
    }

    return res.json({
      company_id: companyId,
      plan,
      trial_end: trialEnd
    });

  } catch (err) {
    console.error('[subscriptions/create]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
