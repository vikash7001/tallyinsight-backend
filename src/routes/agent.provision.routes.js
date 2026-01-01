import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/provision', async (req, res) => {
  const { user_id, admin_id, company_id } = req.body;

  if (!user_id || !admin_id || !company_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // 🔐 Validate company ownership
  const { data: company, error: compErr } = await supabaseAdmin
    .from('companies')
    .select('company_id')
    .eq('company_id', company_id)
    .eq('admin_id', admin_id)
    .single();

  if (compErr || !company) {
    return res.status(403).json({ error: 'Invalid company' });
  }

  // 🔐 Validate subscription
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('company_id', company_id)
    .single();

  if (subErr || !sub || sub.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED' });
  }

  // 🔑 Create device
  const device_token = crypto.randomBytes(32).toString('hex');

  const { data: device, error: devErr } = await supabaseAdmin
    .from('devices')
    .insert({
      admin_id,
      company_id,
      device_token
    })
    .select()
    .single();

  if (devErr || !device) {
    return res.status(500).json({ error: 'Device creation failed' });
  }

  return res.json({
    device_id: device.device_id,
    device_token,
    company_id
  });
});

export default router;
