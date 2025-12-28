import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userId = data.user.id;

  const { data: companies } = await supabase
    .from('admin_companies')
    .select('company_id')
    .eq('admin_id', userId);

  res.json({
    access_token: data.session.access_token,
    companies: companies.map(c => c.company_id)
  });
});

export default router;
