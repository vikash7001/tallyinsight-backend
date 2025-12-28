import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Authenticate
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const adminId = data.user.id;

  // 2. Fetch company from admin_companies
  const { data: rows, error: compErr } = await supabaseAdmin
    .from('admin_companies')
    .select('company_id')
    .eq('admin_id', adminId);

  if (compErr || !rows || rows.length === 0) {
    return res.status(403).json({ error: 'No company assigned' });
  }

  // 3. Success
  res.json({
    access_token: data.session.access_token,
    companies: rows.map(r => r.company_id)
  });
});

export default router;
