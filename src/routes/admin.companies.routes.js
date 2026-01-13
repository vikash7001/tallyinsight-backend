import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /admin/companies
  Headers:
    x-user-id = app_users.user_id
*/
router.get('/companies', async (req, res) => {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'USER_AUTH_REQUIRED' });
    }

    /* =========================
       1️⃣ Verify user exists & active
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (userErr || !user) {
      return res.status(403).json({ error: 'INVALID_USER' });
    }

    /* =========================
       2️⃣ Fetch companies via user_companies
    ========================= */
    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select(`
        company_id,
        companies (
          company_id,
          company_name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('USER_COMPANIES ERROR:', error);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    /* =========================
       3️⃣ Normalize response
    ========================= */
    const companies = (data || [])
      .map(row => row.companies)
      .filter(Boolean);

    return res.json(companies);

  } catch (err) {
    console.error('GET /admin/companies ERROR:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
