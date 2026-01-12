import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /admin/profile
   Save admin personal/business details
===================================================== */
router.post('/', async (req, res) => {

  try {
    const adminId = req.headers['x-user-id'];
    const { name, address, gst_number } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Missing admin identity' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    /* =========================
       VERIFY ADMIN EXISTS
    ========================= */
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('admin_id')
      .eq('admin_id', adminId)
      .single();

    if (adminErr || !admin) {
      return res.status(401).json({ error: 'Invalid admin' });
    }

    /* =========================
       UPSERT PROFILE
    ========================= */
    const { error: profileErr } = await supabaseAdmin
      .from('admin_profiles')
      .upsert({
        admin_id: adminId,
        name: name.trim(),
        address: address || null,
        gst_number: gst_number || null
      });

    if (profileErr) {
      console.error('[admin profile upsert]', profileErr);
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error('[admin/profile]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
