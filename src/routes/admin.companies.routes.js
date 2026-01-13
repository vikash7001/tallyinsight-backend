import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /admin/companies
  Headers:
    x-admin-id = app_users.user_id
*/
router.get('/companies', async (req, res) => {
  try {
    const userId = req.header('x-admin-id');

    if (!userId) {
      return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
    }

    // 1️⃣ Verify user exists & is ADMIN
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (userErr || !user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'INVALID_ADMIN' });
    }

    // 2️⃣ Fetch companies via admin_companies (single source of truth)
    const { data, error } = await supabaseAdmin
      .from('admin_companies')
      .select(`
        company_id,
        companies!admin_companies_company_id_fkey (
          company_id,
          company_name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('ADMIN_COMPANIES ERROR:', error);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    // 3️⃣ Normalize response
    const companies = (data || [])
      .map(row => row.companies)
      .filter(Boolean);

    return res.json(companies);

  } catch (err) {
    console.error('ADMIN /companies ERROR:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
