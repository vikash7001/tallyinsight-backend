import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/provision
  Called by AGENT after installer flow is complete
*/
router.post('/provision', async (req, res) => {
  try {
    const { admin_id, company_id, tally_company_name } = req.body;

    if (!admin_id || !company_id || !tally_company_name) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    /* 1️⃣ Validate company */
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('company_id, activated_at')
      .eq('company_id', company_id)
      .single();

    if (!company) {
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* 2️⃣ Validate subscription */
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    if (subscription?.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'SUBSCRIPTION_INACTIVE' });
    }

    /* 3️⃣ Existing device check */
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

    /* 4️⃣ Create device */
    const device_token = crypto.randomBytes(32).toString('hex');

    const { data: device } = await supabaseAdmin
      .from('devices')
      .insert({
        admin_id,
        company_id,
        tally_company_name,
        device_token
      })
      .select()
      .single();

    /* 5️⃣ Ensure ADMIN app_user (idempotent) */
    const { data: adminUser } = await supabaseAdmin
      .from('app_users')
      .select('user_id')
      .eq('company_id', company_id)
      .eq('role', 'ADMIN')
      .maybeSingle();

    if (!adminUser) {
      const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('mobile')
        .eq('admin_id', admin_id)
        .single();

      await supabaseAdmin.from('app_users').insert({
        company_id,
        mobile: admin.mobile,
        role: 'ADMIN',
        active: true
      });
    }

    /* 6️⃣ Activate company (safe) */
    if (!company.activated_at) {
      await supabaseAdmin
        .from('companies')
        .update({ activated_at: new Date().toISOString() })
        .eq('company_id', company_id);
    }

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
