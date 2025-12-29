import { supabaseAdmin } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  const company_id = req.headers['x-company-id'];
  const user_id = req.headers['x-user-id'];

  if (!company_id || !user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabaseAdmin
    .rpc('check_app_user', {
      p_user_id: user_id,
      p_company_id: company_id
    });

  if (error || !data) {
    return res.status(403).json({ error: 'User not allowed' });
  }

  req.user_id = user_id;
  req.company_id = company_id;
  next();
};
