const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');
const { clearCache } = require('../middleware/auth');

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
