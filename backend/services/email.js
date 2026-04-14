'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a one-time 80% ops usage alert to an agent.
 *
 * @param {object} opts
 * @param {string} opts.email
 * @param {string} opts.name
 * @param {number} opts.ops_used
 * @param {number} opts.ops_limit
 * @param {string} opts.plan
 */
async function sendUsageAlert({ email, name, ops_used, ops_limit, plan }) {
  const pct = Math.round((ops_used / ops_limit) * 100);
  const remaining = ops_limit - ops_used;

  const upgradeUrl = 'https://memstore.dev/pricing';
  const displayName = name || 'there';

  try {
    await resend.emails.send({
      from: 'Memstore <hello@memstore.dev>',
      to: email,
      subject: "You've used 80% of your Memstore ops",
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
          <tr>
            <td style="padding:0 24px 32px">
              <p style="font-size:22px;font-weight:600;margin:0 0 8px;color:#F0EFE8">
                You've used ${pct}% of your monthly ops
              </p>
              <p style="font-size:15px;color:#A09F98;margin:0 0 24px;line-height:1.6">
                Hi ${displayName}, your Memstore agent has used <strong style="color:#F0EFE8">${ops_used.toLocaleString()} of ${ops_limit.toLocaleString()} ops</strong> this month.
                You have <strong style="color:#F0EFE8">${remaining.toLocaleString()} ops remaining</strong> on the <strong style="color:#F0EFE8">${plan}</strong> plan.
              </p>
              <p style="font-size:15px;color:#A09F98;margin:0 0 32px;line-height:1.6">
                Once you hit the limit, memory calls will be paused until the next billing cycle.
                Upgrade now to keep your agents running uninterrupted.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#5B5BD6">
                    <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:8px">
                      Upgrade your plan →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 0;border-top:1px solid #1E1E2E">
              <p style="font-size:13px;color:#6B6B7B;margin:0;line-height:1.6">
                You're receiving this because you have a Memstore account.
                <a href="https://memstore.dev" style="color:#5B5BD6;text-decoration:none">memstore.dev</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    // Log but never throw — a failed alert email must not break the request
    console.error('sendUsageAlert failed:', err.message);
  }
}

module.exports = { sendUsageAlert };
