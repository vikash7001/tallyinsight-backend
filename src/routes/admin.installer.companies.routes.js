import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /admin/installer/companies
  Headers:
    x-admin-id
*/
router.get('/installer/companies', async (req, res) => {
  try {
    const adminId = req.header('x-admin-id');

    if (!adminId) {
      return res.status(401).json([]);
    }

    /* =========================
       1️⃣ VERIFY ADMIN
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('user_id', adminId)
      .eq('role', 'ADMIN')
      .eq('active', true)
      .single();

    if (adminErr || !admin) {
      return res.json([]);
    }

    /* =========================
       2️⃣ RESOLVE ADMIN → COMPANY IDS
    ========================= */
    const { data: links, error: linkErr } = await supabaseAdmin
      .from('app_users')
      .select('company_id')
      .eq('user_id', adminId)
      .eq('role', 'ADMIN')
      .eq('active', true);

    if (linkErr) {
      console.error('ADMIN COMPANY LINK ERROR:', linkErr);
      return res.json([]);
    }

    const companyIds = (links || [])
      .map(r => r.company_id)
      .filter(Boolean);

    if (companyIds.length === 0) {
      return res.json([]);
    }

    /* =========================
       3️⃣ FETCH COMPANIES
    ========================= */
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, company_name')
      .in('company_id', companyIds);

    if (compErr) {
      console.error('COMPANIES FETCH ERROR:', compErr);
      return res.json([]);
    }

    // ✅ ALWAYS ARRAY
    return res.json(companies || []);

  } catch (err) {
    console.error('INSTALLER /admin/installer/companies ERROR:', err);
    return res.json([]);
  }
});

export default router;
