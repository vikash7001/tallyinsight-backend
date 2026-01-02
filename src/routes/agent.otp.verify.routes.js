import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// POST /agent/login/otp/verify
router.post('/login/otp/verify', async (req, res) => {
  try {
    console.log('[agent/otp/verify] raw body:', req.body);

    const identifierRaw = req.body.identifier;
    const otp = req.body.otp;

    if (!identifierRaw || !otp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const identifier = identifierRaw.toLowerCase().trim();

    const { data: user, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('user_id, active, role, email, mobile')
      .or(`email.eq.${identifier},mobile.eq.${identifier}`)
      .single();

    if (userError || !user || !user.active) {
      console.error('[agent/otp/verify] invalid user:', identifier);
      return res.status(401).json({ error: 'Invalid user' });
    }

    const { data: record, error: otpError } = await supabaseAdmin
      .from('user_otps')
      .select('otp_id')
      .eq('user_id', user.user_id)
      .eq('otp_code', otp)
      .or('used.is.null,used.eq.false')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !record) {
      console.error('[agent/otp/verify] invalid or expired OTP');
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('otp_id', record.otp_id);

    console.log('[agent/otp/verify] success:', user.user_id);

return res.json({
  user_id: user.user_id,
  role: user.role,
  admin_token: crypto.randomUUID()
});

  } catch (err) {
    console.error('[agent/otp/verify] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
