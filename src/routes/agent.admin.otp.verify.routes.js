import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * ⚠️ IMPORTANT
 * This route MUST remain PUBLIC.
 * Do NOT attach admin auth middleware here.
 *
 * POST /admin/otp/verify
 * Body: { identifier, otp }
 */
router.post('/admin/otp/verify', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const mobile = identifier.trim();

    /* =========================
       FIND ADMIN USER
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('mobile', mobile)
      .eq('role', 'ADMIN')
      .eq('active', true)
      .single();

    if (userErr || !user) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    /* =========================
       VERIFY OTP
    ========================= */
    const { data: record, error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .select('otp_id')
      .eq('user_id', user.user_id)
      .eq('otp_code', otp)
      .eq('purpose', 'agent_install')
      .or('used.is.null,used.eq.false')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !record) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    /* =========================
       MARK OTP USED
    ========================= */
    const { error: updateErr } = await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('otp_id', record.otp_id);

    if (updateErr) {
      console.error('[OTP UPDATE ERROR]', updateErr);
      return res.status(500).json({ error: 'Failed to finalize OTP' });
    }

    /* =========================
       SUCCESS
    ========================= */
    return res.json({
      user_id: user.user_id
    });

  } catch (err) {
    console.error('[admin/otp/verify]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
