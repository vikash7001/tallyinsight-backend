const express = require('express');
const { saveSnapshot } = require('../services/sync.service');

const router = express.Router();

router.post('/', async (req, res) => {
  const companyId = req.company.company_id;
  const { source, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items provided' });
  }

  try {
    const snapshotId = await saveSnapshot(
      companyId,
      source || 'UNKNOWN',
      items
    );

    res.json({
      message: 'Stock synced successfully',
      snapshot_id: snapshotId,
      license: req.licenseState
    });

  } catch (err) {
    res.status(500).json({
      message: 'Sync failed',
      error: err.message
    });
  }
});

module.exports = router;
