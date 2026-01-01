import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  // 🔐 reuse existing auth logic (example)
  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, admin_id, active')
    .or(`email.eq.${identifier},mobile.eq.${identifier}`)
    .eq('password', password) // assume already hashed/verified in real code
    .single();

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  // 🔎 fetch company + subscription status
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select(`
      company_id,
      company_name,
      subscriptions(status, expires_on)
    `)
    .eq('admin_id', user.admin_id);

  const activeCompanies = companies?.filter(
    c => c.subscriptions?.status === 'ACTIVE'
  );

  if (!activeCompanies || activeCompanies.length === 0) {
    return res.status(403).json({
      error: 'SUBSCRIPTION_EXPIRED',
      companies: companies?.map(c => ({
        company_id: c.company_id,
        company_name: c.company_name,
        expired_on: c.subscriptions?.expires_on
      }))
    });
  }

  return res.json({
    user_id: user.user_id,
    admin_id: user.admin_id
  });
});

export default router;
