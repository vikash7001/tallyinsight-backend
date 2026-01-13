import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * ⚠️ IMPORTANT
 * This route MUST remain PUBLIC.
 * Do NOT attach admin auth middleware here.
 */

/**
 * POST /admin/otp/request
 * Admin-only OTP generation (no headers required)
 */
router.post('/admin/otp/request', async (req, res) => {
  try {
    const identifierRaw = req.body.identifier;

    if (!identifierRaw || typeof identifierRaw !== 'string') {
      return res.status(400).json({ error: 'Identifier required' });
    }

    const identifier = identifierRaw.trim();

    /* =========================
       FIND ADMIN USER
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, mobile, role, active')
      .eq('mobile', identifier)
      .eq('role', 'ADMIN')
      .eq('active', true)
      .single();

    if (userErr || !user) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    /* =========================
       GENERATE OTP
    ========================= */
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    /* =========================
       STORE OTP
    ========================= */
    const { error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .insert({
        user_id: user.user_id,
        otp_code: otp,
        purpose: 'agent_install',
        expires_at: expiresAt,
        used: false
      });

    if (otpErr) {
      console.error('[OTP INSERT ERROR]', otpErr);
      return res.status(500).json({ error: 'Failed to store OTP' });
    }

    // TEMP: console until SMS gateway
    console.log('[agent admin otp]', identifier, otp);

    return res.json({ ok: true });

  } catch (err) {
    console.error('[admin/otp/request]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
