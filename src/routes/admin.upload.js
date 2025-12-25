const express = require('express');
const router = express.Router();
const multer = require('multer');

const auth = require('../middlewares/auth');
const companyContext = require('../middlewares/companyContext');
const licenseResolver = require('../middlewares/licenseResolver');
const uploadService = require('../services/stockUpload.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

router.post(
  '/upload',
  auth,
  companyContext,
  licenseResolver,
  upload.single('file'),
  uploadService.handleUpload
);

module.exports = router;
