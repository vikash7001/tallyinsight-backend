import { supabaseAdmin } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  console.log('HEADERS:', req.headers);

  const company_id = req.headers['x-company-id'];
  const user_id = req.headers['x-user-id'];

  console.log('PARSED:', { company_id, user_id });

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('*');

  console.log('DB USERS:', data, error);

  return res.status(403).json({ error: 'STOP' });
};
