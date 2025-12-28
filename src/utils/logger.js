import { supabase } from '../config/supabase.js';

export async function log(companyId, action, status = 'OK') {
  await supabase.from('sync_logs').insert({
    company_id: companyId,
    action,
    status
  });
}
