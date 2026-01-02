import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/identify
  Body: { identifier }
*/
router.post('/identify', async (req, res) => {
  try {
    // 🔍 RAW BODY LOG (most important)
    console.log('[agent/identify] raw body:', req.body);

    const identifierRaw = req.body?.identifier;

    if (!identifierRaw || typeof identifierRaw !== 'string') {
      console.error('[agent/identify] identifier missing or invalid');
      return res.status(400).json({ error: 'Identifier required' });
    }

    const identifier = identifierRaw.toLowerCase().trim();

    console.log('[agent/identify] normalized identifier:', identifier);

    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('user_id, name, role, active, email, mobile')
      .or(`email.eq.${identifier},mobile.eq.${identifier}`)
      .single();

    if (error) {
      console.error('[agent/identify] supabase error:', error);
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (!user) {
      console.error('[agent/identify] user not found');
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (!user.active) {
      console.error('[agent/identify] user inactive:', user.user_id);
      return res.status(401).json({ error: 'User inactive' });
    }

    console.log('[agent/identify] success:', {
      user_id: user.user_id,
      role: user.role
    });

    return res.json({
      user_id: user.user_id,
      name: user.name,
      role: user.role
    });

  } catch (err) {
    console.error('[agent/identify] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
