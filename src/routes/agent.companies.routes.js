import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/companies', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  const deviceToken = req.headers['x-device-token'];

  if (!deviceId || !deviceToken) {
    return res.status(401).json({ error: 'DEVICE_AUTH_REQUIRED' });
  }

  const { data: device, error } = await supabaseAdmin
    .from('devices')
    .select('company_id')
    .eq('device_id', deviceId)
    .eq('device_token', deviceToken)
    .eq('revoked', false)
    .single();

  if (error || !device) {
    return res.status(401).json({ error: 'INVALID_DEVICE' });
  }

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('company_id, company_name')
    .eq('company_id', device.company_id)
    .single();

  return res.json({
    companies: [company]
  });
});

export default router;
