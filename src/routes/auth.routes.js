import express from 'express';
import { supabaseAuth, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Authenticate user (AUTH client)
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password
      });

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authUserId = authData.user.id; // UUID

    // 2️⃣ Fetch app-level user (ADMIN client)
    const { data: appUser, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('company_id, role, active')
      .eq('user_id', authUserId)   // 🔥 FIXED HERE
      .single();

    if (userErr || !appUser) {
      return res.status(403).json({ error: 'User not registered in app' });
    }

    if (!appUser.active) {
      return res.status(403).json({ error: 'User inactive' });
    }

    // 3️⃣ Success
    return res.json({
      access_token: authData.session.access_token,
      role: appUser.role,
      companies: [appUser.company_id]
    });

  } catch (err) {
    console.error('Login route error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
