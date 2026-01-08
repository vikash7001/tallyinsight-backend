import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /companies/create
===================================================== */
router.post('/create', async (req, res) => {
  try {
    const adminId = req.headers['x-user-id'];
    const { company_name, plan } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Missing admin identity' });
    }

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name required' });
    }

    if (!plan || !['trial', 'paid'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    // 1. Validate admin
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('admin_id')
      .eq('admin_id', adminId)
      .single();

    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    const companyId = crypto.randomUUID();
    const now = new Date();

    // trial dates (only if trial)
    let trialStart = null;
    let trialEnd = null;

    if (plan === 'trial') {
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial
    }

    // 2. Create company
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

    // 3. Link admin ↔ company
    await supabaseAdmin
      .from('admin_companies')
      .insert({
        admin_id: adminId,
        company_id: companyId
      });

    // 4. Create subscription row
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: companyId,
        status: plan === 'trial' ? 'trial' : 'active',
        trial_start: trialStart,
        trial_end: trialEnd,
        created_at: now
      });

    return res.json({
      company_id: companyId,
      plan,
      trial_end: trialEnd
    });

  } catch (err) {
    console.error('[companies/create]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
