import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/provision
  Body:
  {
    user_id,
    admin_id,
    company_id,
    tally_company_name
  }
*/
router.post('/provision', async (req, res) => {
  try {
    const {
      user_id,
      admin_id,
      company_id,
      tally_company_name
    } = req.body;

    if (!user_id || !admin_id || !company_id || !tally_company_name) {
      return res.status(400).json({ error: 'Missing fields' });
    }

/* =========================
   1️⃣ VALIDATE COMPANY EXISTS
========================= */
const { data: company, error: compErr } = await supabaseAdmin
  .from('companies')
  .select('company_id')
  .eq('company_id', company_id)
  .single();

if (compErr || !company) {
  return res.status(403).json({ error: 'INVALID_COMPANY' });
}


    /* =========================
       2️⃣ OPTIONAL: VALIDATE SUBSCRIPTION
       (keep only if this table exists)
    ========================= */
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    if (subErr || !sub || sub.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED' });
    }

    /* =========================
       3️⃣ CREATE DEVICE (ONE TIME)
    ========================= */
    const device_token = crypto.randomBytes(32).toString('hex');

    const { data: device, error: devErr } = await supabaseAdmin
      .from('devices')
      .insert({
        admin_id,
        company_id,
        tally_company_name,
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

  } catch (err) {
    console.error('AGENT PROVISION ERROR:', err);
    return res.status(500).json({ error: 'Provision failed' });
  }
});

export default router;
