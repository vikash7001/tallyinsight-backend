import { supabaseAdmin } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  // Read headers (ReqBin adds ": " sometimes)
  const rawCompanyId = req.headers['x-company-id'];
  const rawUserId = req.headers['x-user-id'];

  // Sanitize values
  const company_id = rawCompanyId?.replace(/^:\s*/, '');
  const user_id = rawUserId?.replace(/^:\s*/, '');

  if (!company_id || !user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, company_id, active')
    .eq('user_id', user_id)
    .eq('company_id', company_id)
    .single();

  if (error || !data || !data.active) {
    return res.status(403).json({ error: 'User not allowed' });
  }

  // Attach verified identity
  req.user_id = data.user_id;
  req.company_id = data.company_id;

  next();
};
