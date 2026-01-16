import { supabaseAdmin } from '../config/supabase.js';

/*
  checkCompanySubscription middleware

  Requires:
    - req.company_id (set by adminHeaderAuth / resolveUserCompany)

  Attaches:
    req.companyStatus = {
      status: 'ACTIVE' | 'TRIAL' | 'GRACE' | 'EXPIRED' | 'NO_SUBSCRIPTION',
      subscription: row | null
    }

  Rules (LOCKED):
    ACTIVE  → sync + full access
    TRIAL   → sync + full access
    GRACE   → view only (no sync / no writes)
    EXPIRED → blocked
    NO_SUBSCRIPTION → blocked
*/

export async function checkCompanySubscription(req, res, next) {
  try {
    const companyId = req.company_id;

    if (!companyId) {
      return res.status(400).json({ error: 'COMPANY_ID_REQUIRED' });
    }

    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('SUBSCRIPTION_LOOKUP_ERROR:', error);
      return res.status(500).json({ error: 'SUBSCRIPTION_LOOKUP_FAILED' });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let status = 'NO_SUBSCRIPTION';

    if (sub) {
      if (sub.expiry_date && today <= sub.expiry_date) {
        status = 'ACTIVE';
      } else if (sub.trial_end && today <= sub.trial_end) {
        status = 'TRIAL';
      } else if (sub.grace_end && today <= sub.grace_end) {
        status = 'GRACE';
      } else {
        status = 'EXPIRED';
      }
    }

    req.companyStatus = {
      status,
      subscription: sub || null
    };

    return next();

  } catch (err) {
    console.error('CHECK_COMPANY_SUBSCRIPTION_ERROR:', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
