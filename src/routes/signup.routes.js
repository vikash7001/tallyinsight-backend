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
    const { data: existing, error: existsErr } = await supabaseAdmin
      .from('admins')
      .select('admin_id')
      .eq('mobile', mobile)
      .maybeSingle();

    if (existsErr) {
      console.error('[signup exists check]', existsErr);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (existing) {
      return res.status(409).json({ error: 'Admin already exists' });
    }

    const signupId = crypto.randomUUID();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: insertErr } = await supabaseAdmin
      .from('user_otps')
      .insert({
        user_id: signupId,      // ✅ UUID
        otp_code: otp,
        purpose: 'signup',
        expires_at: expiresAt
      });

    if (insertErr) {
      console.error('[signup otp insert failed]', insertErr);
      return res.status(500).json({ error: 'OTP insert failed' });
    }

    // TEMP (remove after SMS integration)
    console.log('[signup otp]', signupId, otp);

    return res.json({
      ok: true,
      signup_id: signupId
    });

  } catch (err) {
    console.error('[signup/otp/request] unexpected', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* =====================================================
   POST /signup/otp/verify
===================================================== */
router.post('/otp/verify', async (req, res) => {
  try {
    const { signup_id, otp, mobile, email } = req.body;

    if (!signup_id || !otp || !mobile || !email) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const { data: records, error: fetchErr } = await supabaseAdmin
      .from('user_otps')
      .select('otp_id')
      .eq('user_id', signup_id)
      .eq('otp_code', otp)
      .eq('purpose', 'signup')
      .is('used', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr || !records || records.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const otpId = records[0].otp_id;

    // Create admin
    const { error: adminErr } = await supabaseAdmin
      .from('admins')
      .insert({
        admin_id: signup_id,
        mobile,
        name: email
      });

    if (adminErr) {
      console.error('[signup admin insert failed]', adminErr);
      return res.status(500).json({ error: 'Admin creation failed' });
    }

    // Mark OTP used
    await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('otp_id', otpId);

    return res.json({
      user_id: signup_id,
      role: 'admin'
    });

  } catch (err) {
    console.error('[signup/otp/verify] unexpected', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
