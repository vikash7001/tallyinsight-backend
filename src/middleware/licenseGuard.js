import { supabase } from '../config/supabase.js';

export async function licenseGuard(req, res, next) {
  const companyId = req.headers['x-company-id'];
  if (!companyId) return res.status(400).json({ error: 'Company not selected' });

  const { data, error } = await supabase
    .from('v_company_license_status')
    .select('status')
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    return res.status(403).json({ error: 'License not found' });
  }

  if (data.status === 'EXPIRED') {
    return res.status(403).json({ error: 'License expired' });
  }

  req.companyId = companyId;
  req.licenseStatus = data.status;
  next();
}
