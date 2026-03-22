const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');
const { clearCache } = require('../middleware/auth');
const { Resend } = require('resend');

const PLAN_LIMITS = {
  [process.env.STRIPE_STARTER_PRICE_ID]: { plan: 'starter', ops_limit: 50000 },
  [process.env.STRIPE_PRO_PRICE_ID]:     { plan: 'pro',     ops_limit: 500000 },
};

// IMPORTANT: raw body required — add this route BEFORE express.json() in server.js
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_details?.email || session.metadata?.email;
        const priceId = session.metadata?.price_id;
        const limits = PLAN_LIMITS[priceId];
        if (!email || !limits) break;

        const { data: agent } = await supabase
          .from('agents').select('id, api_key_prefix')
          .eq('owner_email', email).single();

        if (agent) {
          await supabase.from('agents').update({
            plan: limits.plan,
            ops_limit: limits.ops_limit,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq('id', agent.id);
          clearCache(agent.api_key_prefix);
          console.log(`Upgraded ${email} to ${limits.plan}`);

          // Send upgrade confirmation email — fire and forget
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const planLabel = limits.plan === 'pro' ? 'Pro' : 'Starter';
            const opsFormatted = limits.ops_limit.toLocaleString();
            resend.emails.send({
              from: 'Memstore <hello@memstore.dev>',
              to: email,
              subject: 'Your Memstore plan has been upgraded',
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
              <span style="font-family:'Courier New',monospace;font-size:15px;font-weight:600;color:#F0EFE8">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7B6EF6;margin-right:6px"></span>
                memstore
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161624;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#F0EFE8;line-height:1.2">
                You're on the ${planLabel} plan
              </h1>
              <p style="margin:0 0 32px;font-size:15px;color:#8886A0;line-height:1.6">
                Your account has been upgraded. Everything is ready — no changes needed to your code.
              </p>

              <!-- Plan box -->
              <div style="background:#09090F;border:1px solid rgba(123,110,246,0.3);border-radius:10px;padding:20px 24px;margin-bottom:32px">
                <p style="margin:0 0 4px;font-size:12px;font-weight:500;color:#8886A0;text-transform:uppercase;letter-spacing:0.08em">Your new plan</p>
                <p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#7B6EF6">${planLabel}</p>
                <p style="margin:0 0 4px;font-size:12px;font-weight:500;color:#8886A0;text-transform:uppercase;letter-spacing:0.08em">Monthly operations</p>
                <p style="margin:0;font-size:18px;font-weight:600;color:#F0EFE8">${opsFormatted} ops / month</p>
              </div>

              <!-- API key note -->
              <div style="background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:14px 18px;margin-bottom:32px">
                <p style="margin:0;font-size:13px;color:#34D399;line-height:1.6">
                  <strong>Your API key stays the same.</strong><br>
                  No need to update your code — just keep using the key you already have.
                </p>
              </div>

              <!-- CTA -->
              <a href="https://memstore.dev/quickstart.html"
                 style="display:block;background:#7B6EF6;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-size:14px;font-weight:500;text-align:center">
                View quickstart guide &rarr;
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center">
              <p style="margin:0;font-size:12px;color:#4A4860;line-height:1.6">
                You're receiving this because you upgraded at memstore.dev.<br>
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
            }).catch(err => console.error('upgrade email send error:', err.message));
          } catch (err) {
            console.error('upgrade email init error:', err.message);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const { data: agent } = await supabase
          .from('agents').select('id, api_key_prefix')
          .eq('stripe_customer_id', invoice.customer).single();

        if (agent) {
          await supabase.from('agents').update({ ops_used: 0 }).eq('id', agent.id);
          clearCache(agent.api_key_prefix);
          console.log(`Reset monthly ops for ${invoice.customer}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;

        const { data: agent } = await supabase
          .from('agents').select('id, api_key_prefix')
          .eq('stripe_customer_id', sub.customer).single();

        if (agent) {
          await supabase.from('agents').update({
            plan: 'free', ops_limit: 1000, stripe_subscription_id: null,
          }).eq('id', agent.id);
          clearCache(agent.api_key_prefix);
          console.log(`Downgraded ${sub.customer} to free`);
        }
        break;
      }

      case 'invoice.payment_failed':
        console.warn(`Payment failed for ${event.data.object.customer} — send dunning email`);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'handler_error' });
  }

  res.json({ received: true });
});

module.exports = router;
