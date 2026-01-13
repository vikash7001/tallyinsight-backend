import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/provision
  Called by AGENT after installer flow is complete

  Body:
  {
    user_id,
    company_id,
    tally_company_name
  }
*/
router.post('/provision', async (req, res) => {
  try {
    /* =========================
       0️⃣ HARD DEBUG — DO NOT REMOVE
    ========================= */
    console.log('================ PROVISION START ================');
    console.log('PROVISION PAYLOAD:', req.body);
    console.log('SUPABASE URL:', supabaseAdmin?.rest?.url || 'UNKNOWN');
    console.log('=================================================');

    const { user_id, company_id, tally_company_name } = req.body;

    if (!user_id || !company_id || !tally_company_name) {
      console.log('❌ MISSING_FIELDS');
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    /* =========================
       1️⃣ Validate company
    ========================= */
    const { data: company, error: companyErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, activated_at')
      .eq('company_id', company_id)
      .single();

    console.log('COMPANY LOOKUP:', company, companyErr);

    if (companyErr || !company) {
      console.log('❌ INVALID_COMPANY (company not found)');
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* =========================
       2️⃣ Validate subscription
    ========================= */
    const { data: subscription, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    console.log('SUBSCRIPTION LOOKUP:', subscription, subErr);

    if (subErr || subscription?.status !== 'ACTIVE') {
      console.log('❌ SUBSCRIPTION_INACTIVE');
      return res.status(403).json({ error: 'SUBSCRIPTION_INACTIVE' });
    }

    /* =========================
       3️⃣ FULL OWNERSHIP DUMP
    ========================= */
    const { data: allOwnership } = await supabaseAdmin
      .from('user_companies')
      .select('*');

    console.log('ALL USER_COMPANIES:', allOwnership);

    /* =========================
       4️⃣ Validate ownership
    ========================= */
    const { data: ownership } = await supabaseAdmin
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user_id)
      .eq('company_id', company_id)
      .maybeSingle();

    console.log('OWNERSHIP MATCH:', ownership);

    if (!ownership) {
      console.log('❌ INVALID_COMPANY (ownership missing)');
      return res.status(403).json({ error: 'INVALID_COMPANY' });
    }

    /* =========================
       5️⃣ Existing device check
    ========================= */
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('device_id, device_token')
      .eq('user_id', user_id)
      .eq('company_id', company_id)
      .eq('revoked', false)
      .maybeSingle();

    console.log('EXISTING DEVICE:', existingDevice);

    if (existingDevice) {
      console.log('✅ DEVICE ALREADY EXISTS');
      return res.json({
        device_id: existingDevice.device_id,
        device_token: existingDevice.device_token,
        company_id
      });
    }

    /* =========================
       6️⃣ Create device
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

    console.log('DEVICE INSERT RESULT:', device, deviceErr);

    if (deviceErr) {
      console.log('❌ DEVICE_CREATE_FAILED');
      return res.status(500).json({ error: 'DEVICE_CREATE_FAILED' });
    }

    /* =========================
       7️⃣ Activate company (safe)
    ========================= */
    if (!company.activated_at) {
      await supabaseAdmin
        .from('companies')
        .update({ activated_at: new Date().toISOString() })
        .eq('company_id', company_id);
    }

    console.log('✅ PROVISION SUCCESS');
    console.log('================ PROVISION END ==================');

    return res.json({
      device_id: device.device_id,
      device_token,
      company_id
    });

  } catch (err) {
    console.error('❌ AGENT PROVISION ERROR:', err);
    return res.status(500).json({ error: 'PROVISION_FAILED' });
  }
});

export default router;
