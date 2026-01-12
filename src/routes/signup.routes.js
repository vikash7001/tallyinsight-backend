import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /signup/otp/request
===================================================== */
router.post('/otp/request', async (req, res) => {
  try {
    const { mobile, email } = req.body;

    if (!mobile || !email) {
      return res.status(400).json({ error: 'Mobile and email required' });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }

    // Check if admin already exists
    const { data: existing } = await supabaseAdmin
      .from('admins')
      .select('admin_id')
      .eq('mobile', mobile);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Admin already exists' });
    }

    const signupId = crypto.randomUUID();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from('signup_otps')
      .insert({
        signup_id: signupId,
        mobile,
        email,
        otp_code: otp,
        expires_at: expiresAt
      });

    if (error) {
      console.error('[signup otp insert failed]', error);
      return res.status(500).json({ error: 'OTP insert failed' });
    }

    // TEMP until SMS gateway
    console.log('[signup otp]', signupId, otp);

    return res.json({
      ok: true,
      signup_id: signupId
    });

  } catch (err) {
    console.error('[signup/otp/request]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* =====================================================
   POST /signup/otp/verify
===================================================== */
router.post('/otp/verify', async (req, res) => {
  try {
    const { signup_id, otp } = req.body;

    if (!signup_id || !otp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const { data: records } = await supabaseAdmin
      .from('signup_otps')
      .select('*')
      .eq('signup_id', signup_id)
      .eq('otp_code', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (!records || records.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const signup = records[0];

    // Create admin
    const { error: adminErr } = await supabaseAdmin
      .from('admins')
      .insert({
        admin_id: signup_id,
        mobile: signup.mobile,
        email: signup.email
      });

    if (adminErr) {
      console.error('[signup admin insert failed]', adminErr);
      return res.status(500).json({ error: 'Admin creation failed' });
    }

    // Mark OTP used
    await supabaseAdmin
      .from('signup_otps')
      .update({ used: true })
      .eq('signup_id', signup_id);

    return res.json({
      user_id: signup_id,
      role: 'admin'
    });

  } catch (err) {
    console.error('[signup/otp/verify]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
