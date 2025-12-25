const express = require('express');
const router = express.Router();

const userService = require('../services/user.service');

// 🔓 PUBLIC LOGIN ROUTE (NO MIDDLEWARE)
router.post('/login', userService.userLogin);

module.exports = router;
