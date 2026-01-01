import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /agent/login/otp/verify
router.post('/login/otp/verify', async (req, res) => {
const email = req.body.email?.toLowerCase().trim();
const otp = req.body.otp;


  if (!email || !otp) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('user_id, active')
    .eq('email', email)
    .single();

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const { data: record } = await supabaseAdmin
    .from('user_otps')
    .select('otp_id')
    .eq('user_id', user.user_id)
    .eq('otp_code', otp)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!record) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  await supabaseAdmin
    .from('user_otps')
    .update({ used: true })
    .eq('otp_id', record.otp_id);

  return res.json({
    user_id: user.user_id,
    admin_id: user.admin_id
  });
});

export default router;
