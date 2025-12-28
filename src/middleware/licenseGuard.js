import { supabaseAdmin } from '../config/supabase.js';

export async function licenseGuard(req, res, next) {
  try {
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { data, error } = await supabaseAdmin
      .from('v_company_license_status')
      .select('status')
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      console.error('License lookup failed:', error);
      return res.status(403).json({ error: 'License not found' });
    }

    if (data.status === 'EXPIRED') {
      return res.status(403).json({ error: 'License expired' });
    }

    // Attach context
    req.companyId = Number(companyId);
    req.licenseStatus = data.status;

    next();
  } catch (err) {
    console.error('License guard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
