import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  GET /agent/companies
  Headers:
    x-device-id
    x-device-token
*/
router.get('/companies', async (req, res) => {
  try {
    const deviceId = req.header('x-device-id');
    const deviceToken = req.header('x-device-token');

    if (!deviceId || !deviceToken) {
      return res.status(401).json({ error: 'DEVICE_AUTH_REQUIRED' });
    }

    /* =========================
       1️⃣ AUTHENTICATE DEVICE
    ========================= */
    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .select('admin_id, revoked')
      .eq('device_id', deviceId)
      .eq('device_token', deviceToken)
      .single();

    if (deviceErr || !device) {
      return res.status(403).json({ error: 'INVALID_DEVICE' });
    }

    if (device.revoked) {
      return res.status(403).json({ error: 'DEVICE_REVOKED' });
    }

    /* =========================
       2️⃣ RESOLVE ADMIN → COMPANIES
    ========================= */
    const { data: links, error: linkErr } = await supabaseAdmin
      .from('app_users')
      .select('company_id')
      .eq('user_id', device.admin_id)
      .eq('role', 'ADMIN')
      .eq('active', true);

    if (linkErr) {
      console.error('APP_USERS ERROR:', linkErr);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    const companyIds = (links || []).map(r => r.company_id);

    if (companyIds.length === 0) {
      return res.json({ companies: [] });
    }

    /* =========================
       3️⃣ FETCH COMPANIES
    ========================= */
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, company_name')
      .in('company_id', companyIds);

    if (compErr) {
      console.error('COMPANIES ERROR:', compErr);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    return res.json({ companies });

  } catch (err) {
    console.error('AGENT /companies ERROR:', err);
    return res.status(500).json({ error: 'Agent companies failed' });
  }
});

export default router;
