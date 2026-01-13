import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /admin/companies
 *
 * Rules:
 * - Admin identity comes from middleware (req.user_id)
 * - Do NOT re-validate role differently from OTP
 * - Do NOT rely on company_name matching
 */
router.get('/companies', async (req, res) => {
  try {
    // 🔑 Admin identity injected by adminHeaderAuth
    const adminId = req.user_id || req.header('x-admin-id');

    if (!adminId) {
      return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
    }

    /* =========================
       VERIFY ADMIN (MATCH OTP LOGIC)
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('user_id', adminId)
      .eq('active', true)
      .single();

    if (adminErr || !admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'INVALID_ADMIN' });
    }

    /* =========================
       FETCH कंपनies OWNED / MAPPED TO ADMIN
       (TEMP: return all companies if mapping table not ready)
    ========================= */
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, company_name')
      .order('company_name', { ascending: true });

    if (compErr) {
      console.error('COMPANY FETCH ERROR:', compErr);
      return res.status(500).json({ error: 'COMPANY_FETCH_FAILED' });
    }

    return res.json(companies || []);

  } catch (err) {
    console.error('ADMIN /companies ERROR:', err);
    return res.status(500).json({ error: 'ADMIN_COMPANIES_FAILED' });
  }
});

export default router;
