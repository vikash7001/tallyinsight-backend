import express from 'express';
import { supabaseAuth, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Authenticate user
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = authData.user.id;

    // 2️⃣ FETCH COMPANIES USING ADMIN CLIENT (🔥 FIX)
    const { data: rows, error } = await supabaseAdmin
      .from('admin_companies')
      .select('company_id')
      .eq('admin_id', userId);

    if (error) {
      console.error('Company query error:', error);
      return res.status(500).json({ error: 'Company lookup failed' });
    }

    const companies = (rows ?? []).map(r => r.company_id);

    return res.json({
      access_token: authData.session.access_token,
      companies
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
