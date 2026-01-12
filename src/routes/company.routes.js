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
    const { company_name } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Missing admin identity' });
    }

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name required' });
    }

    /* =========================
       1️⃣ VERIFY ADMIN
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('admin_id, mobile, email')
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
      return res.status(409).json({ error: 'COMPANY_ALREADY_EXISTS' });
    }

    /* =========================
       3️⃣ PREPARE DATA
    ========================= */
    const companyId = crypto.randomUUID();

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

      await supabaseAdmin
        .from('companies')
        .delete()
        .eq('company_id', companyId);

      return res.status(500).json({ error: 'Company linking failed' });
    }

    /* =========================
       6️⃣ CREATE OWNER APP USER
    ========================= */
    const { error: appUserErr } = await supabaseAdmin
      .from('app_users')
      .insert({
        user_id: crypto.randomUUID(),
        company_id: companyId,
        mobile: admin.mobile,
        email: admin.email,
        role: 'OWNER',   // or ADMIN (must exist in enum)
        active: true
      });

    if (appUserErr) {
      console.error('[app_users insert]', appUserErr);

      await supabaseAdmin.from('admin_companies').delete().eq('company_id', companyId);
      await supabaseAdmin.from('companies').delete().eq('company_id', companyId);

      return res.status(500).json({ error: 'App user creation failed' });
    }

    /* =========================
       7️⃣ SUCCESS
    ========================= */
    return res.json({
      company_id: companyId
    });

  } catch (err) {
    console.error('[companies/create]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
