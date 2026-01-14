import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /signup/otp/request
   (UNCHANGED)
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

    // check canonical identity table
    const { data: existingUser } = await supabaseAdmin
      .from('app_users')
      .select('user_id')
      .eq('mobile', mobile)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
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
        expires_at: expiresAt,
        used: false
      });

    if (error) {
      console.error('[signup otp insert failed]', error);
      return res.status(500).json({ error: 'OTP insert failed' });
    }

    // TEMP: log OTP until SMS gateway
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
   (MINIMAL FIX APPLIED)
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

    /* =========================
       RESOLVE USER ID (FIX)
    ========================= */
    let userId;

    // check if user already exists
    const { data: existingUser, error: findErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role')
      .eq('mobile', signup.mobile)
      .maybeSingle();

    if (findErr) {
      console.error('[signup user lookup failed]', findErr);
      return res.status(500).json({ error: 'User lookup failed' });
    }

    if (existingUser) {
      // reuse existing identity
      userId = existingUser.user_id;
    } else {
      // create identity ONCE
      userId = crypto.randomUUID();

      const { error: userErr } = await supabaseAdmin
        .from('app_users')
        .insert({
          user_id: userId,
          mobile: signup.mobile,
          email: signup.email,
          role: 'ADMIN',
          active: true
        });

      if (userErr) {
        console.error('[signup user insert failed]', userErr);
        return res.status(500).json({ error: 'User creation failed' });
      }
    }

    /* =========================
       MARK OTP USED
    ========================= */
    await supabaseAdmin
      .from('signup_otps')
      .update({ used: true })
      .eq('signup_id', signup_id);

    return res.json({
      user_id: userId,
      role: 'ADMIN'
    });

  } catch (err) {
    console.error('[signup/otp/verify]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
