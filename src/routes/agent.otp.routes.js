import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /agent/login/otp/request
router.post('/login/otp/request', async (req, res) => {
const email = req.body.email?.toLowerCase().trim();


  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, active')
    .eq('email', email)
    .single();

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await supabaseAdmin.from('user_otps').insert({
    user_id: user.user_id,
    otp_code: otp,
    purpose: 'login',
    expires_at: expires
  });

  // TODO: send email (stub for now)
  console.log('LOGIN OTP:', email, otp);

  return res.json({ ok: true });
});

export default router;
