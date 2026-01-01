import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  // ✅ identifier is mandatory, password may be empty (bootstrap admin)
  if (!identifier) {
    return res.status(400).json({ error: 'Missing identifier' });
  }

  // 🔐 Mobile-based lookup (admin bootstrap supported)
  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, admin_id, active, password')
    .eq('mobile', identifier)
    .single();

  if (error || !user || !user.active) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  // ✅ TEMP bootstrap rule
  // If password IS SET → must match
  // If password IS NULL → allow login
  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // 🔎 Fetch companies + subscription status
  const { data: companies, error: compErr } = await supabaseAdmin
    .from('companies')
    .select(`
      company_id,
      company_name,
      subscriptions(status, expires_on)
    `)
    .eq('admin_id', user.admin_id);

  if (compErr || !companies) {
    return res.status(500).json({ error: 'Failed to load companies' });
  }

  const activeCompanies = companies.filter(
    c => c.subscriptions?.status === 'ACTIVE'
  );

  if (activeCompanies.length === 0) {
    return res.status(403).json({
      error: 'SUBSCRIPTION_EXPIRED',
      companies: companies.map(c => ({
        company_id: c.company_id,
        company_name: c.company_name,
        expired_on: c.subscriptions?.expires_on
      }))
    });
  }

  // ✅ SUCCESS
  return res.json({
    user_id: user.user_id,
    admin_id: user.admin_id
  });
});

export default router;
