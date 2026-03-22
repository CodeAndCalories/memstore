const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /v1/newsletter/subscribe
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'invalid_email', message: 'A valid email is required.' });
  }

  const normalised = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalised)) {
    return res.status(400).json({ error: 'invalid_email', message: 'A valid email is required.' });
  }

  const { error } = await supabase
    .from('subscribers')
    .insert({ email: normalised })
    .select('id')
    .single();

  if (error) {
    // Postgres unique violation — already subscribed
    if (error.code === '23505') {
      return res.status(200).json({ ok: true, message: 'Already subscribed.' });
    }
    console.error('newsletter subscribe error:', error.message);
    return res.status(500).json({ error: 'server_error', message: error.message });
  }

  res.status(201).json({ ok: true, message: 'Subscribed successfully.' });
});

module.exports = router;
