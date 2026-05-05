require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { generateIIPP } = require('./services/documentGenerator');

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null;

const PORT = process.env.PORT || 3000;
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'roofsafe-dev-secret';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'store.json');

function initialStore() {
  return {
    nextContractorId: 1,
    nextDeliveryId: 1,
    contractors: [],
    deliveries: [],
    stripeEvents: [],
  };
}

function readStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(initialStore(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

function withoutPassword(contractor) {
  const copy = { ...contractor };
  delete copy.password_hash;
  return copy;
}

app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook is not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler failed', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/signup/register', async (req, res) => {
  const required = ['email', 'password', 'company_name', 'address', 'city_state_zip', 'phone', 'iipp_admin'];
  const missing = required.filter((field) => !String(req.body[field] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'Please complete all required fields.' });
  if (String(req.body.password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const store = readStore();
  const email = String(req.body.email).trim().toLowerCase();
  const existing = store.contractors.find((c) => c.email === email);
  if (existing) {
    if (existing.status === 'pending') return res.json({ contractor_id: existing.id, status: existing.status });
    return res.status(409).json({ error: 'An account already exists for this email. Please log in.' });
  }

  const now = new Date().toISOString();
  const contractor = {
    id: store.nextContractorId++,
    email,
    password_hash: await bcrypt.hash(String(req.body.password), 10),
    company_name: String(req.body.company_name).trim(),
    dba: String(req.body.dba || '').trim(),
    address: String(req.body.address).trim(),
    city_state_zip: String(req.body.city_state_zip).trim(),
    phone: String(req.body.phone).trim(),
    cslb_license: String(req.body.cslb_license || '').trim(),
    iipp_admin: String(req.body.iipp_admin).trim(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_checkout_session_id: null,
    stripe_price_id: null,
    subscription_plan: 'roofsafe_pro',
    subscription_current_period_end: null,
    subscription_cancel_at_period_end: false,
    payment_status: 'unpaid',
    last_stripe_event_id: null,
    activation_date: null,
    status: 'pending',
    iipp_filename: null,
    created_at: now,
    updated_at: now,
  };
  store.contractors.push(contractor);
  writeStore(store);
  res.status(201).json({ contractor_id: contractor.id, status: contractor.status });
});

app.post('/api/payment/create-checkout', async (req, res) => {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === Number(req.body.contractor_id));
  if (!contractor) return res.status(404).json({ error: 'Contractor not found.' });
  if (contractor.status === 'active') return res.status(409).json({ error: 'This subscription is already active.' });

  if (!stripe) {
    activateContractor(store, contractor, {
      paymentStatus: 'test_mode',
      subscriptionId: 'local_test_subscription',
      customerId: 'local_test_customer',
      checkoutSessionId: 'local_test_checkout',
      eventId: `local_${Date.now()}`,
    });
    writeStore(store);
    return res.json({ url: `/success.html?contractor_id=${contractor.id}&session_id=local_test_checkout` });
  }

  if (!process.env.STRIPE_ACTIVATION_PRICE_ID || !process.env.STRIPE_MONTHLY_PRICE_ID) {
    return res.status(503).json({ error: 'Stripe price IDs are not configured.' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: contractor.email,
    client_reference_id: String(contractor.id),
    line_items: [
      { price: process.env.STRIPE_ACTIVATION_PRICE_ID, quantity: 1 },
      { price: process.env.STRIPE_MONTHLY_PRICE_ID, quantity: 1 },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: { contractor_id: String(contractor.id), plan: 'roofsafe_pro' },
    },
    metadata: { contractor_id: String(contractor.id), plan: 'roofsafe_pro' },
    success_url: `${APP_URL}/success.html?contractor_id=${contractor.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/signup.html?cancelled=true&step=2&contractor_id=${contractor.id}`,
  });

  contractor.stripe_checkout_session_id = session.id;
  contractor.payment_status = session.payment_status || 'checkout_started';
  contractor.updated_at = new Date().toISOString();
  writeStore(store);
  res.json({ url: session.url });
});

app.get('/api/payment/verify/:contractorId', (req, res) => {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === Number(req.params.contractorId));
  if (!contractor) return res.status(404).json({ error: 'Contractor not found.' });
  res.json(withoutPassword(contractor));
});

app.post('/api/auth/login', async (req, res) => {
  const store = readStore();
  const email = String(req.body.email || '').trim().toLowerCase();
  const contractor = store.contractors.find((c) => c.email === email);
  if (!contractor || !(await bcrypt.compare(String(req.body.password || ''), contractor.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  res.json({
    token: jwt.sign({ id: contractor.id, email: contractor.email, role: 'contractor' }, JWT_SECRET, { expiresIn: '30d' }),
  });
});

app.get('/api/contractor/me', authMiddleware, (req, res) => {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === req.user.id);
  if (!contractor) return res.status(404).json({ error: 'Contractor not found.' });
  const stats = buildStats(store, contractor.id);
  const deliveries = store.deliveries.filter((d) => d.contractor_id === contractor.id);
  res.json({ ...withoutPassword(contractor), stats, deliveries });
});

app.get('/api/contractor/iipp/download', authMiddleware, (req, res) => {
  const store = readStore();
  const contractor = store.contractors.find((c) => c.id === req.user.id);
  if (!contractor?.iipp_filename) return res.status(404).json({ error: 'IIPP is not ready yet.' });
  res.download(path.join(__dirname, 'uploads', contractor.iipp_filename));
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function handleStripeEvent(event) {
  const store = readStore();
  if (store.stripeEvents.includes(event.id)) return;
  store.stripeEvents.push(event.id);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const contractor = store.contractors.find((c) => c.id === Number(session.client_reference_id || session.metadata?.contractor_id));
    if (contractor) {
      const subscriptionId = asId(session.subscription);
      let subscription = null;
      if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId);
      activateContractor(store, contractor, {
        paymentStatus: session.payment_status || 'paid',
        subscriptionId,
        customerId: asId(session.customer),
        checkoutSessionId: session.id,
        currentPeriodEnd: stripeDate(subscription?.current_period_end),
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        eventId: event.id,
      });
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const contractor = store.contractors.find((c) => c.stripe_subscription_id === subscription.id || c.id === Number(subscription.metadata?.contractor_id));
    if (contractor) {
      contractor.status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status;
      contractor.payment_status = subscription.status;
      contractor.stripe_subscription_id = subscription.id;
      contractor.stripe_customer_id = asId(subscription.customer);
      contractor.stripe_price_id = subscription.items?.data?.[0]?.price?.id || null;
      contractor.subscription_current_period_end = stripeDate(subscription.current_period_end);
      contractor.subscription_cancel_at_period_end = Boolean(subscription.cancel_at_period_end);
      contractor.last_stripe_event_id = event.id;
      contractor.updated_at = new Date().toISOString();
    }
  }

  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const contractor = store.contractors.find((c) => c.stripe_subscription_id === asId(invoice.subscription));
    if (contractor) {
      contractor.payment_status = invoice.status === 'paid' ? 'paid' : 'payment_failed';
      contractor.last_stripe_event_id = event.id;
      contractor.updated_at = new Date().toISOString();
    }
  }

  writeStore(store);
}

function activateContractor(store, contractor, details) {
  const now = new Date().toISOString();
  contractor.status = 'active';
  contractor.payment_status = details.paymentStatus;
  contractor.stripe_customer_id = details.customerId;
  contractor.stripe_subscription_id = details.subscriptionId;
  contractor.stripe_checkout_session_id = details.checkoutSessionId;
  contractor.stripe_price_id = process.env.STRIPE_MONTHLY_PRICE_ID || 'local_monthly_price';
  contractor.subscription_current_period_end = details.currentPeriodEnd || addDays(14).toISOString();
  contractor.subscription_cancel_at_period_end = Boolean(details.cancelAtPeriodEnd);
  contractor.activation_date = contractor.activation_date || now;
  contractor.iipp_filename = contractor.iipp_filename || generateIIPP(contractor);
  contractor.last_stripe_event_id = details.eventId;
  contractor.updated_at = now;
}

function buildStats(store, contractorId) {
  const topicsReceived = store.deliveries.filter((d) => d.contractor_id === contractorId && d.status === 'sent').length;
  return {
    topics_received: topicsReceived,
    total_topics: 30,
    next_delivery_date: addDays(14).toISOString(),
  };
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function asId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function stripeDate(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

app.listen(PORT, () => {
  console.log(`RoofSafe Pro running at ${APP_URL}`);
});
