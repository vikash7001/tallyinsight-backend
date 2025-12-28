import { supabaseAdmin } from '../config/supabase.js';

export async function log(companyId, action, status = 'OK') {
  const { error } = await supabaseAdmin
    .from('sync_logs')
    .insert({
      company_id: companyId,
      action,
      status
    });

  if (error) {
    console.error('Sync log insert failed:', error);
  }
}
