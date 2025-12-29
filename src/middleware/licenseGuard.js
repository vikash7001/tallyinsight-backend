import { supabaseAdmin } from '../config/supabase.js';

export async function licenseGuard(req, res, next) {
  try {
    // Sanitize header (ReqBin adds ": ")
    const rawCompanyId = req.headers['x-company-id'];
    const company_id = rawCompanyId?.replace(/^:\s*/, '');

    if (!company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('company_id', company_id)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: 'License not found' });
    }

    if (data.status === 'EXPIRED') {
      return res.status(403).json({ error: 'License expired' });
    }

    // Attach context (KEEP UUID AS STRING)
    req.company_id = company_id;
    req.licenseStatus = data.status;

    next();
  } catch (err) {
    console.error('License guard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
