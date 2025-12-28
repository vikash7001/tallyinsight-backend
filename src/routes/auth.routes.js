import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Authenticate user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = authData.user.id;

    // 2️⃣ Fetch companies (CRITICAL FIX)
    const { data: companyRows, error: companyError } =
      await supabase
        .from('admin_companies')
        .select('company_id')
        .eq('admin_id', userId);

    if (companyError) {
      console.error('Company fetch error:', companyError);
      return res.status(500).json({ error: 'Company lookup failed' });
    }

    // 3️⃣ GUARDED mapping (NO crashes)
    const companies = (companyRows ?? []).map(r => r.company_id);

    return res.json({
      access_token: authData.session.access_token,
      companies,
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
