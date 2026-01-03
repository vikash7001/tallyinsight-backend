import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /admin/companies
  Headers:
    x-admin-id
*/
router.get('/companies', async (req, res) => {
  try {
    const adminId = req.header('x-admin-id');

    if (!adminId) {
      return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
    }

    /* =========================
       1️⃣ VERIFY ADMIN
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('user_id', adminId)
      .single();

    if (adminErr || !admin || !admin.active || admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'INVALID_ADMIN' });
    }

    /* =========================
       2️⃣ FETCH ADMIN COMPANIES
    ========================= */
    const { data: links, error: linkErr } = await supabaseAdmin
      .from('app_users')
      .select('company_id')
      .eq('user_id', adminId)
      .eq('active', true);

    if (linkErr) {
      console.error('ADMIN COMPANY LINK ERROR:', linkErr);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    const companyIds = links.map(r => r.company_id);

    if (companyIds.length === 0) {
      return res.json([]);
    }

    /* =========================
       3️⃣ FETCH COMPANY DETAILS
    ========================= */
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, company_name, status')
      .in('company_id', companyIds)
      .eq('status', 'ACTIVE');

    if (compErr) {
      console.error('COMPANIES ERROR:', compErr);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    return res.json(
      companies.map(c => ({
        company_id: c.company_id,
        company_name: c.company_name
      }))
    );

  } catch (err) {
    console.error('ADMIN /companies ERROR:', err);
    return res.status(500).json({ error: 'Admin companies failed' });
  }
});

export default router;
