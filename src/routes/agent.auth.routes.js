import express from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /agent/login/password
router.post('/login/password', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, admin_id, active, password_hash')
    .or(`email.eq.${identifier},mobile.eq.${identifier}`)
    .single();

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  return res.json({
    user_id: user.user_id,
    admin_id: user.admin_id
  });
});

export default router;
