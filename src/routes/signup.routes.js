import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* ===============================
   POST /signup/otp/request
================================ */
router.post('/otp/request', async (req, res) => {
  const { mobile, email } = req.body;

  if (!mobile || !email) {
    return res.status(400).json({ error: 'Mobile and email required' });
  }

  // Check admin already exists
  const { data: existing } = await supabaseAdmin
    .from('admins')
    .select('admin_id')
    .eq('mobile', mobile)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Admin already exists' });
  }

  const adminId = crypto.randomUUID();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await supabaseAdmin.from('user_otps').insert({
    user_id: adminId,
    otp_code: otp,
    purpose: 'signup',
    expires_at: expires
  });

  // TEMP
  console.log('[signup/otp/request]', mobile, otp);

  return res.json({ ok: true, signup_id: adminId });
});

/* ===============================
   POST /signup/otp/verify
================================ */
router.post('/otp/verify', async (req, res) => {
  const { signup_id, otp, mobile, email } = req.body;

  if (!signup_id || !otp || !mobile || !email) {
    return res.status(400).json({ error: 'Missing fields' });
  }

const { data: record, error } = await supabaseAdmin
  .from('user_otps')
  .select('otp_id')
  .eq('user_id', signup_id)
  .eq('otp_code', otp)
  .eq('purpose', 'signup')
  .or('used.is.null,used.eq.false')
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (error || !record) {
  return res.status(401).json({ error: 'Invalid or expired OTP' });
}

  await supabaseAdmin.from('admins').insert({
    admin_id: signup_id,
    mobile,
    name: email
  });

  await supabaseAdmin
    .from('user_otps')
    .update({ used: true })
    .eq('otp_id', record.otp_id);

  return res.json({
    user_id: signup_id,
    role: 'admin'
  });
});

export default router;
