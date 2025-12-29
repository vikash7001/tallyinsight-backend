router.put('/:item_code', async (req, res) => {
  try {
    if (!req.company_id) {
      return res.status(400).json({ error: 'Company not selected' });
    }

    const { item_code } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'image_url required' });
    }

    const { error } = await supabaseAdmin
      .from('items')
      .update({ image_url })
      .eq('company_id', req.company_id)
      .eq('item_code', item_code);

    if (error) {
      return res.status(500).json({ error: 'Failed to update image' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});
