const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const supabase = require('../config/supabase');

// POST /v1/agents — create a new agent + API key
router.post('/', async (req, res) => {
  const { name, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email_required', message: 'email is required.' });
  }

  // Generate API key: am_live_<random>
  const rawKey = `am_live_${uuidv4().replace(/-/g, '')}`;
  const prefix = rawKey.slice(0, 16); // "am_live_" (8) + first 8 UUID hex chars = unique
  const hashedKey = await bcrypt.hash(rawKey, 10);

  const { data, error } = await supabase
    .from('agents')
    .insert({
      api_key: hashedKey,
      api_key_prefix: prefix,
      name: name || 'My Agent',
      owner_email: email,
      plan: 'free',
      ops_limit: 1000,
    })
    .select('id, name, owner_email, plan, ops_limit, created_at')
    .single();

  if (error) {
    console.error('create agent error:', error.message);
    return res.status(500).json({ error: 'server_error', message: error.message });
  }

  // Send welcome email — fire and forget, don't block the response
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
    from: 'Memstore <hello@memstore.dev>',
    to: email,
    subject: 'Your Memstore API Key',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#09090F;font-family:'DM Sans',Arial,sans-serif;color:#F0EFE8">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090F;padding:48px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

          <!-- Logo -->
          <tr>
            <td style="padding:0 0 32px 0">
              <span style="font-family:'Courier New',monospace;font-size:15px;font-weight:600;color:#F0EFE8;display:inline-flex;align-items:center;gap:8px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7B6EF6;margin-right:6px"></span>
                memstore
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161624;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#F0EFE8;line-height:1.2">
                Welcome to Memstore
              </h1>
              <p style="margin:0 0 32px;font-size:15px;color:#8886A0;line-height:1.6">
                Your API key is ready. Your agents can now remember everything.
              </p>

              <!-- API Key box -->
              <p style="margin:0 0 8px;font-size:12px;font-weight:500;color:#8886A0;text-transform:uppercase;letter-spacing:0.08em">
                Your API Key
              </p>
              <div style="background:#09090F;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px 20px;margin-bottom:12px">
                <code style="font-family:'Courier New',monospace;font-size:14px;color:#7B6EF6;word-break:break-all">${rawKey}</code>
              </div>

              <!-- Warning -->
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:14px 18px;margin-bottom:32px;display:flex;align-items:flex-start;gap:10px">
                <span style="font-size:16px;line-height:1.4">⚠️</span>
                <p style="margin:0;font-size:13px;color:#F59E0B;line-height:1.6">
                  <strong>Save this key — it won't be shown again.</strong><br>
                  We only store a hashed version. If you lose it, you'll need to generate a new one.
                </p>
              </div>

              <!-- Quick start -->
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#F0EFE8">
                Quick start
              </p>
              <div style="background:#09090F;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px;margin-bottom:32px">
                <pre style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#8886A0;line-height:1.75;overflow-x:auto">curl -X POST https://memstore.dev/v1/memory/remember \\
  -H "Authorization: Bearer ${rawKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "User prefers dark mode."}'</pre>
              </div>

              <!-- CTAs -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-right:8px">
                    <a href="https://memstore.dev/guide.html"
                       style="display:block;background:#7B6EF6;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-size:14px;font-weight:500;text-align:center">
                      Read the guide &rarr;
                    </a>
                  </td>
                  <td style="padding-left:8px">
                    <a href="https://memstore.dev"
                       style="display:block;background:transparent;color:#F0EFE8;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;text-align:center;border:1px solid rgba(255,255,255,0.1)">
                      View docs
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center">
              <p style="margin:0;font-size:12px;color:#4A4860;line-height:1.6">
                You're receiving this because you signed up at memstore.dev.<br>
                <a href="https://memstore.dev" style="color:#4A4860">memstore.dev</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    }).catch(err => console.error('resend send error:', err.message));
  } catch (err) {
    console.error('resend init error:', err.message);
  }

  // Return raw key ONCE — never stored again
  res.status(201).json({
    agent_id: data.id,
    api_key: rawKey, // shown only once
    name: data.name,
    plan: data.plan,
    ops_limit: data.ops_limit,
    message: 'Save your API key — it will not be shown again.',
  });
});

module.exports = router;
