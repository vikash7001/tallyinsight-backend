import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/*
  POST /agent/identify
  Body: { identifier }
*/
router.post('/identify', async (req, res) => {
  const identifier = req.body.identifier?.toLowerCase().trim();

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier required' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, name, role, active')
    .or(`email.eq.${identifier},mobile.eq.${identifier}`)
    .single();

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  return res.json({
    user_id: user.user_id,
    name: user.name,
    role: user.role
  });
});

export default router;
