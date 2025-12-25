const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const companyContext = require('../middlewares/companyContext');
const licenseResolver = require('../middlewares/licenseResolver');
const imageService = require('../services/itemImage.service');

router.post(
  '/',
  auth,
  companyContext,
  licenseResolver,
  imageService.upsertItemImage
);

module.exports = router;
