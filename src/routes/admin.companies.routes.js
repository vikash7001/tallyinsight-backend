router.get('/companies', async (req, res) => {
  try {
    const adminId = req.header('x-admin-id');

    if (!adminId) {
      return res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
    }

    // 1️⃣ Verify ADMIN user
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('app_users')
      .select('user_id, role, active, company_name')
      .eq('user_id', adminId)
      .eq('active', true)
      .single();

    if (adminErr || !admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'INVALID_ADMIN' });
    }

    // 2️⃣ Fetch companies by NAME match
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('company_id, company_name')
      .eq('company_name', admin.company_name);

    if (compErr) {
      console.error('COMPANY FETCH ERROR:', compErr);
      return res.status(500).json({ error: 'Company fetch failed' });
    }

    // 3️⃣ ALWAYS return array
    return res.json(companies || []);

  } catch (err) {
    console.error('ADMIN /companies ERROR:', err);
    return res.status(500).json({ error: 'Admin companies failed' });
  }
});
