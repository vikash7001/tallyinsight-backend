import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /admin/companies
 * Returns ONLY companies linked to this admin
 */
router.get('/companies', async (req, res) => {
  try {
    // admin_id comes from header OR middleware
    const adminId = req.header('x-admin-id') || req.user_id;

    if (!adminId) {
      return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
    }

    // 1️⃣ Fetch companies linked via admin_companies
    const { data, error } = await supabaseAdmin
      .from('admin_companies')
      .select(`
        company_id,
        companies (
          company_name
        )
      `)
      .eq('admin_id', adminId);

    if (error) {
      console.error('ADMIN_COMPANIES ERROR:', error);
      return res.status(500).json({ error: 'COMPANY_FETCH_FAILED' });
    }

    // 2️⃣ Normalize response
    const companies = (data || []).map(row => ({
      company_id: row.company_id,
      company_name: row.companies.company_name
    }));

    return res.json(companies);

  } catch (err) {
    console.error('ADMIN /companies ERROR:', err);
    return res.status(500).json({ error: 'ADMIN_COMPANIES_FAILED' });
  }
});

export default router;
