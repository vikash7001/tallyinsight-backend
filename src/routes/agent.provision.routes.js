import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/provision

  Body:
  {
    admin_id,
    company_id,
    tally_company_name
  }

  Called ONE TIME by agent (BAT/EXE).
*/
router.post('/provision', async (req, res) => {
  try {
    const { admin_id, company_id, tally_company_name } = req.body;

    if (!admin_id || !company_id || !tally_company_name) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    /* =========================
       1️⃣ VALIDATE COMPANY
    ========================= */
    const { data: company, error: companyErr } = await supabaseAdmin
      .from('companies')
      .select('company_id')
      .eq('company_id', company_id)
      .single();

    if (companyErr || !company) {
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* =========================
       2️⃣ VALIDATE SUBSCRIPTION
    ========================= */
    const { data: subscription, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    if (subErr || !subscription || subscription.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'SUBSCRIPTION_INACTIVE' });
    }

    /* =========================
       3️⃣ CHECK EXISTING DEVICE
       (safety net – agent already enforces)
    ========================= */
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('device_id, device_token')
      .eq('company_id', company_id)
      .eq('admin_id', admin_id)
      .eq('revoked', false)
      .maybeSingle();

    if (existingDevice) {
      return res.json({
        device_id: existingDevice.device_id,
        device_token: existingDevice.device_token,
        company_id
      });
    }

    /* =========================
       4️⃣ CREATE DEVICE
    ========================= */
    const device_token = crypto.randomBytes(32).toString('hex');

    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .insert({
        admin_id,
        company_id,
        tally_company_name,
        device_token
      })
      .select()
      .single();

    if (deviceErr || !device) {
      console.error('DEVICE CREATE ERROR:', deviceErr);
      return res.status(500).json({ error: 'DEVICE_CREATE_FAILED' });
    }

    /* =========================
       5️⃣ CREATE ADMIN APP USER
       (FIRST TIME ONLY)
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('name, mobile')
      .eq('admin_id', admin_id)
      .single();

    if (adminErr || !admin) {
      return res.status(500).json({ error: 'ADMIN_NOT_FOUND' });
    }

    await supabaseAdmin
      .from('app_users')
      .insert({
        company_id,
        mobile: admin.mobile,
        role: 'ADMIN',
        active: true
      });

    /* =========================
       6️⃣ ACTIVATE COMPANY
       (implicit activation marker)
    ========================= */
    await supabaseAdmin
      .from('companies')
      .update({ activated_at: new Date().toISOString() })
      .eq('company_id', company_id);

    /* =========================
       ✅ SUCCESS
    ========================= */
    return res.json({
      device_id: device.device_id,
      device_token,
      company_id
    });

  } catch (err) {
    console.error('AGENT PROVISION ERROR:', err);
    return res.status(500).json({ error: 'PROVISION_FAILED' });
  }
});

export default router;
