import express from 'express';

const router = express.Router();

/*
  Auth routes are intentionally minimal for now.
  Header-based auth is handled in middleware/auth.js
*/

router.post('/login', (req, res) => {
  return res.status(501).json({ error: 'Login not implemented' });
});

export default router;
