import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /admin/companies
  Header: x-admin-id
*/
router.get('/companies', async (req, res) => {
  const adminId = req.headers['x-admin-id'];

  if (!adminId) {
    return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
  }

  const { data, error } = await supabaseAdmin
    .from('admin_companies')
    .select(`
      company_id,
      companies (
        company_name,
        status
      )
    `)
    .eq('admin_id', adminId)
    .eq('companies.status', 'ACTIVE');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const companies = data.map(r => ({
    company_id: r.company_id,
    company_name: r.companies.company_name
  }));

  res.json(companies);
});

export default router;
