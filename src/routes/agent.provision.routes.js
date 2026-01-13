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
    const { user_id, company_id, tally_company_name } = req.body;

    if (!user_id || !company_id || !tally_company_name) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    /* =========================
       1️⃣ Validate company
    ========================= */
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('company_id, activated_at')
      .eq('company_id', company_id)
      .single();

    if (!company) {
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* =========================
       2️⃣ Validate subscription
    ========================= */
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    if (subscription?.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'SUBSCRIPTION_INACTIVE' });
    }

    /* =========================
       3️⃣ Validate ownership
    ========================= */
    const { data: ownership } = await supabaseAdmin
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user_id)
      .eq('company_id', company_id)
      .maybeSingle();

    if (!ownership) {
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* =========================
       4️⃣ Existing device check
    ========================= */
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('device_id, device_token')
      .eq('company_id', company_id)
      .eq('user_id', user_id)
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
       5️⃣ Create device
    ========================= */
    const device_token = crypto.randomBytes(32).toString('hex');

    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .insert({
        user_id,
        company_id,
        tally_company_name,
        device_token
      })
      .select()
      .single();

    if (deviceErr) {
      console.error('[device insert failed]', deviceErr);
      return res.status(500).json({ error: 'DEVICE_CREATE_FAILED' });
    }

    /* =========================
       6️⃣ Activate company (safe)
    ========================= */
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
