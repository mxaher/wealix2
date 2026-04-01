import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

// Module-level singleton — instantiated once at Worker startup, not per request
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  // Cloudflare Workers use the fetch API natively — do NOT use default Node.js http client
  httpClient: Stripe.createFetchHttpClient(),
  timeout: 8000,
  maxNetworkRetries: 2,
});

export default stripe;
