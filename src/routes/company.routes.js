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

    /* =========================
       1️⃣ VERIFY ADMIN
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('admin_id')
      .eq('admin_id', adminId)
      .single();

    if (adminErr || !admin) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    /* =========================
       2️⃣ DUPLICATE PREVENTION
    ========================= */
    const { data: existingLinks, error: linkErr } = await supabaseAdmin
      .from('admin_companies')
      .select('company_id')
      .eq('admin_id', adminId);

    if (linkErr) {
      console.error('[company create link check]', linkErr);
      return res.status(500).json({ error: 'Company check failed' });
    }

    if (existingLinks && existingLinks.length > 0) {
      return res.status(409).json({
        error: 'COMPANY_ALREADY_EXISTS'
      });
    }

    /* =========================
       3️⃣ PREPARE DATA
    ========================= */
    const companyId = crypto.randomUUID();
    const now = new Date();

    let trialStart = null;
    let trialEnd = null;

    if (plan === 'trial') {
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14);
    }

    /* =========================
       4️⃣ CREATE COMPANY
    ========================= */
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
       5️⃣ LINK ADMIN ↔ COMPANY
    ========================= */
    const { error: linkInsertErr } = await supabaseAdmin
      .from('admin_companies')
      .insert({
        admin_id: adminId,
        company_id: companyId
      });

    if (linkInsertErr) {
      console.error('[admin_companies insert]', linkInsertErr);
      return res.status(500).json({ error: 'Company linking failed' });
    }

    /* =========================
       6️⃣ CREATE SUBSCRIPTION
    ========================= */
    const { error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: companyId,
        status: 'ACTIVE', // ✅ valid enum
        trial_start: plan === 'trial' ? trialStart : null,
        trial_end: plan === 'trial' ? trialEnd : null
      });

    if (subErr) {
      console.error('[subscription create]', subErr);

      // rollback to avoid half-created company
      await supabaseAdmin
        .from('admin_companies')
        .delete()
        .eq('company_id', companyId);

      await supabaseAdmin
        .from('companies')
        .delete()
        .eq('company_id', companyId);

      return res.status(500).json({ error: 'Subscription creation failed' });
    }

    /* =========================
       7️⃣ SUCCESS
    ========================= */
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
