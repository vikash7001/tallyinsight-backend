import express from 'express';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login/password', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const emailIdentifier = identifier.toLowerCase();

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, admin_id, active, password_hash')
    .or(`email.eq.${emailIdentifier},mobile.eq.${identifier}`)
    .single();
console.log('IDENTIFIER:', identifier);
console.log('EMAIL NORMALIZED:', emailIdentifier);
console.log('USER ROW:', user);
console.log('SUPABASE ERROR:', error);

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  if (!user.password_hash) {
    return res.status(401).json({ error: 'Password not set' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  res.json({
    user_id: user.user_id,
    admin_id: user.admin_id
  });
});

export default router;
