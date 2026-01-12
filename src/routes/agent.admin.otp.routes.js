import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/admin/otp/request', async (req, res) => {
  try {
    const identifierRaw = req.body.identifier;

    if (!identifierRaw || typeof identifierRaw !== 'string') {
      return res.status(400).json({ error: 'Identifier required' });
    }

    const identifier = identifierRaw.toLowerCase().trim();

    // 1️⃣ Find admin (schema-correct)
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('admin_id, mobile, email')
      .or(`mobile.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (adminErr || !admin) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    // 2️⃣ Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3️⃣ Insert OTP (WITH ERROR CHECK)
    const { error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .insert({
        user_id: admin.admin_id,
        otp_code: otp,
        purpose: 'agent_install',
        expires_at: expiresAt,
        used: false   // IMPORTANT
      });

    if (otpErr) {
      console.error('[OTP INSERT ERROR]', otpErr);
      return res.status(500).json({ error: 'Failed to store OTP' });
    }

    console.log('[agent admin otp]', identifier, otp);

    return res.json({ ok: true });

  } catch (err) {
    console.error('[agent/admin/otp/request]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
