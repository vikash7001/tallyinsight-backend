import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/provision
  Body:
    {
      admin_id: "uuid"
    }
*/
router.post('/provision', async (req, res) => {
  try {
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({ error: 'admin_id required' });
    }

    // generate secure device token
    const deviceToken = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('devices')
      .insert({
        admin_id,
        device_token: deviceToken
      })
      .select('device_id')
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Device provisioning failed' });
    }

    return res.json({
      device_id: data.device_id,
      device_token: deviceToken
    });

  } catch (err) {
    console.error('PROVISION ERROR:', err);
    return res.status(500).json({ error: 'Provision error' });
  }
});

export default router;
