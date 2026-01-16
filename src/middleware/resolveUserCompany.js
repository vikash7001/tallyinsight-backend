import { supabaseAdmin } from '../config/supabase.js';

/*
  resolveUserCompany middleware

  Requirements:
    - req.user_id (set by adminHeaderAuth)
    - req.company_id (from x-company-id header)

  Enforces:
    - user MUST belong to company via user_companies
    - applies to ADMIN and normal users equally

  Attaches:
    - req.userCompany (mapping row)
*/

export async function resolveUserCompany(req, res, next) {
  try {
    const userId = req.user_id;
    const companyId = req.company_id;

    if (!userId) {
      return res.status(401).json({ error: 'USER_ID_REQUIRED' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'COMPANY_ID_REQUIRED' });
    }

    /* =========================
       Validate user exists & active
    ========================= */
    const { data: user, error: userErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (userErr || !user) {
      return res.status(403).json({ error: 'INVALID_USER' });
    }

    /* =========================
       Validate user-company mapping
    ========================= */
    const { data: mapping, error: mapErr } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (mapErr || !mapping) {
      return res.status(403).json({
        error: 'USER_NOT_IN_COMPANY'
      });
    }

    req.userCompany = mapping;
    return next();

  } catch (err) {
    console.error('RESOLVE_USER_COMPANY_ERROR:', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}
