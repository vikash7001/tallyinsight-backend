import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /agent/login/otp/request
router.post('/login/otp/request', async (req, res) => {
  console.log('[agent/otp/request] raw body:', req.body);

  const identifierRaw = req.body.identifier;

  if (!identifierRaw || typeof identifierRaw !== 'string') {
    return res.status(400).json({ error: 'Identifier required' });
  }

  const identifier = identifierRaw.toLowerCase().trim();

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, email, mobile, active')
    .or(`email.eq.${identifier},mobile.eq.${identifier}`)
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

  // TEMP: stub
  console.log('[agent/otp/request] LOGIN OTP:', identifier, otp);

  return res.json({ ok: true });
});

export default router;
