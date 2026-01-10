import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/admin/otp/request
  Body:
  { identifier }
*/
router.post('/admin/otp/request', async (req, res) => {
  try {
    const identifierRaw = req.body.identifier;

    if (!identifierRaw || typeof identifierRaw !== 'string') {
      return res.status(400).json({ error: 'Identifier required' });
    }

    const identifier = identifierRaw.toLowerCase().trim();

    // 1️⃣ Find admin
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('admin_id, mobile, email')
      .or(`mobile.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    // 2️⃣ Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 3️⃣ Store OTP (user_id temporarily = admin_id)
    await supabaseAdmin.from('user_otps').insert({
      user_id: admin.admin_id,
      otp_code: otp,
      purpose: 'agent_install',
      expires_at: expiresAt
    });

    // TEMP until SMS
    console.log('[agent admin otp]', identifier, otp);

    return res.json({ ok: true });

  } catch (err) {
    console.error('[agent/admin/otp/request]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
