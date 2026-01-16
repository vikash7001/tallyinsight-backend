import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /companies/create
===================================================== */
router.post('/create', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { company_name } = req.body;

    /* =========================
       BASIC VALIDATION
    ========================= */
    if (!userId) {
      return res.status(401).json({ error: 'Missing user identity' });
    }

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name required' });
    }

    /* =========================
       VERIFY USER EXISTS
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (userErr || !user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    /* =========================
       CREATE COMPANY
    ========================= */
    const companyId = crypto.randomUUID();

    const { error: companyErr } = await supabaseAdmin
      .from('companies')
      .insert({
        company_id: companyId,
        company_name: company_name.trim()
      });

    if (companyErr) {
      console.error('[company create]', companyErr);
      return res.status(500).json({ error: 'Company creation failed' });
    }

    /* =========================
       LINK USER ↔ COMPANY
    ========================= */
    const { error: linkErr } = await supabaseAdmin
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: companyId
      });

    if (linkErr) {
      console.error('[user_companies insert]', linkErr);

      // rollback company
      await supabaseAdmin
        .from('companies')
        .delete()
        .eq('company_id', companyId);

      return res.status(500).json({ error: 'Company linking failed' });
    }

    /* =========================
       CREATE TRIAL SUBSCRIPTION  ✅ OPTION A
    ========================= */
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    const { error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: companyId,
        status: 'TRIAL',
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString()
      });

    if (subErr) {
      console.error('[subscription insert]', subErr);

      // rollback everything
      await supabaseAdmin.from('user_companies').delete().eq('company_id', companyId);
      await supabaseAdmin.from('companies').delete().eq('company_id', companyId);

      return res.status(500).json({ error: 'Subscription creation failed' });
    }

    /* =========================
       SUCCESS
    ========================= */
    return res.json({
      company_id: companyId,
      subscription: 'TRIAL',
      trial_end: trialEnd
    });

  } catch (err) {
    console.error('[companies/create]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
