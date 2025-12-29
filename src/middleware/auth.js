import { supabase } from '../config/supabase.js';

export const requireUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const supabase_user_id = data.user.id;

  // map Supabase auth user → app_users
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select('user_id, company_id, active')
    .eq('user_id', supabase_user_id)
    .single();

  if (userError || !appUser || !appUser.active) {
    return res.status(403).json({ error: 'User not registered or inactive' });
  }

  req.user_id = appUser.user_id;
  req.company_id = appUser.company_id;

  next();
};
