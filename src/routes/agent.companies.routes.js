import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/companies', async (req, res) => {
  const user_id = req.header('x-user-id');

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('admin_id')
    .eq('user_id', user_id)
    .single();

  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select(`
      company_id,
      company_name,
      subscriptions(status)
    `)
    .eq('admin_id', user.admin_id);

  return res.json({
    companies: companies.map(c => ({
      company_id: c.company_id,
      company_name: c.company_name,
      status: c.subscriptions?.status
    }))
  });
});

export default router;
