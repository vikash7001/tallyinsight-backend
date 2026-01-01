router.post('/provision', async (req, res) => {
  const { user_id, admin_id, company_id } = req.body;

  if (!user_id || !admin_id || !company_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // validate ownership
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('company_id')
    .eq('company_id', company_id)
    .eq('admin_id', admin_id)
    .single();

  if (!company) {
    return res.status(403).json({ error: 'Invalid company' });
  }

  // validate subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('company_id', company_id)
    .single();

  if (!sub || sub.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED' });
  }

  // create device
  const device_token = crypto.randomBytes(32).toString('hex');

  const { data: device } = await supabaseAdmin
    .from('devices')
    .insert({
      admin_id,
      company_id,
      device_token
    })
    .select()
    .single();

  return res.json({
    device_id: device.device_id,
    device_token,
    company_id
  });
});
