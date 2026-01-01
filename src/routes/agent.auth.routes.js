import express from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /agent/login/password
 * Login via email OR mobile + password
 */
router.post('/login/password', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  // normalize email (mobile untouched)
  const emailIdentifier = identifier.toLowerCase().trim();

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, company_id, active, password_hash')
    .or(`email.eq.${emailIdentifier},mobile.eq.${identifier}`)
    .single();

  if (error) {
    console.error('SUPABASE ERROR:', error);
  }

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  if (!user.password_hash) {
    return res.status(401).json({ error: 'Password not set' });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  // ✅ SUCCESS
  return res.json({
    user_id: user.user_id,
    company_id: user.company_id
  });
});

export default router;
