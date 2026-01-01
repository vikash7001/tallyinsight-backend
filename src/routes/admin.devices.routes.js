import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /admin/devices/:device_id/revoke
  Headers:
    x-user-id
    x-company-id
*/
router.post('/devices/:device_id/revoke', async (req, res) => {
  try {
    const { device_id } = req.params;
    const adminId = req.user_id; // set by adminHeaderAuth

    if (!device_id) {
      return res.status(400).json({ error: 'device_id required' });
    }

    // revoke device (ownership check can be added later)
    const { error } = await supabaseAdmin
      .from('devices')
      .update({ revoked: true })
      .eq('device_id', device_id);

    if (error) {
      console.error('DEVICE REVOKE ERROR:', error);
      return res.status(500).json({ error: 'Device revoke failed' });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error('ADMIN DEVICE REVOKE ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
