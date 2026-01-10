import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

import {
  STATES,
  getState,
  getStateData,
  transition
} from '../state.js';

const router = express.Router();

/*
  POST /agent/provision
  Called once per (admin + company + device)
*/
router.post('/provision', async (req, res) => {
  try {
    /* =========================
       STATE GUARD
    ========================= */
    if (getState() !== STATES.TALLY_COMPANY_SELECTED) {
      return res.status(400).json({ error: 'INVALID_STATE' });
    }

    const { admin_id, company_id, tally_company_name } = getStateData();

    if (!admin_id || !company_id || !tally_company_name) {
      return res.status(400).json({ error: 'MISSING_STATE_DATA' });
    }

    transition(STATES.CONFIRMED_MAPPING);

    /* =========================
       1️⃣ VALIDATE COMPANY
    ========================= */
    const { data: company, error: companyErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, activated_at')
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

    if (subErr || subscription?.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'SUBSCRIPTION_INACTIVE' });
    }

    /* =========================
       3️⃣ CHECK EXISTING DEVICE
    ========================= */
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('device_id, device_token')
      .eq('company_id', company_id)
      .eq('admin_id', admin_id)
      .eq('revoked', false)
      .maybeSingle();

    if (existingDevice) {
      transition(STATES.PROVISIONED);
      transition(STATES.EXIT_SUCCESS);

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
       5️⃣ ENSURE ADMIN APP USER
       (IDEMPOTENT)
    ========================= */
    const { data: adminUser } = await supabaseAdmin
      .from('app_users')
      .select('user_id')
      .eq('company_id', company_id)
      .eq('role', 'ADMIN')
      .maybeSingle();

    if (!adminUser) {
      const { data: admin, error: adminErr } = await supabaseAdmin
        .from('admins')
        .select('mobile')
        .eq('admin_id', admin_id)
        .single();

      if (adminErr || !admin) {
        return res.status(500).json({ error: 'ADMIN_NOT_FOUND' });
      }

      await supabaseAdmin.from('app_users').insert({
        company_id,
        mobile: admin.mobile,
        role: 'ADMIN',
        active: true
      });
    }

    /* =========================
       6️⃣ ACTIVATE COMPANY (SAFE)
    ========================= */
    if (!company.activated_at) {
      await supabaseAdmin
        .from('companies')
        .update({ activated_at: new Date().toISOString() })
        .eq('company_id', company_id);
    }

    /* =========================
       FINAL STATE + RESPONSE
    ========================= */
    transition(STATES.PROVISIONED);
    transition(STATES.EXIT_SUCCESS);

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
