import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /companies/mine
  Purpose:
    - Website login flow
    - Admin dashboard
    - User company selection

  Headers:
    x-user-id = app_users.user_id
*/
router.get('/mine', async (req, res) => {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({ error: 'USER_AUTH_REQUIRED' });
    }

    /* =========================
       1️⃣ Validate user
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
       2️⃣ Fetch companies via mapping
    ========================= */
    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select(`
        companies (
          company_id,
          company_name,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('COMPANY_MINE_ERROR:', error);
      return res.status(500).json({ error: 'COMPANY_FETCH_FAILED' });
    }

    /* =========================
       3️⃣ Normalize response
       (frontend expects ARRAY)
    ========================= */
    const companies = (data || [])
      .map(row => row.companies)
      .filter(Boolean);

    return res.json(companies);

  } catch (err) {
    console.error('GET /companies/mine ERROR:', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

export default router;
