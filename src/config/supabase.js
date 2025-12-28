import { createClient } from '@supabase/supabase-js';

// 🔐 AUTH client (used only for sign-in)
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

// 🛠 ADMIN client (used for DB queries)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);
