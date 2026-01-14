import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/* =====================================================
   POST /admin/profile
===================================================== */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, address, gst_number } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Missing user identity' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    /* =========================
       VERIFY ADMIN (REAL TABLE)
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active')
      .eq('user_id', userId)
      .single();

    if (
      userErr ||
      !user ||
      user.active !== true ||
      user.role !== 'ADMIN'
    ) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    /* =========================
       UPSERT ADMIN PROFILE
    ========================= */
    const { error: profileErr } = await supabaseAdmin
      .from('admin_profiles')
      .upsert({
        user_id: userId,
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
