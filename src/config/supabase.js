import { createClient } from '@supabase/supabase-js';

console.log(
  'SUPABASE KEY PREFIX:',
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 12)
    : 'MISSING'
);

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);
