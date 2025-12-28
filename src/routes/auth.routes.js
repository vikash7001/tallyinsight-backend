import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Auth
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const authUserId = data.user.id;

  // 2. Fetch app user
  const { data: appUser, error: userErr } = await supabaseAdmin
    .from('app_users')
    .select('company_id, role, active')
    .eq('auth_uid', authUserId)
    .single();

  if (userErr || !appUser) {
    return res.status(403).json({ error: 'User not registered in app' });
  }

  if (!appUser.active) {
    return res.status(403).json({ error: 'User inactive' });
  }

  // 3. Success
  res.json({
    access_token: data.session.access_token,
    role: appUser.role,
    companies: [appUser.company_id]
  });
});

export default router;
