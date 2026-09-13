# Future 4.0 — Fast Launch Checklist

This package is the commercial SaaS launch foundation for Future.

## 1. Supabase (Accounts + Database)
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/launch-schema.sql` once.
3. In Project Settings > API copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key -> `SUPABASE_SERVICE_ROLE_KEY` (server only)
4. In Authentication > URL Configuration set Site URL to your Vercel production URL.
5. Add redirect URL: `https://YOUR-DOMAIN/auth/callback`.
6. For fastest testing you may disable email confirmation. Before public launch, enabling email confirmation is recommended.

## 2. OpenAI (Real AI Chat + Web Research)
Add to Vercel Environment Variables:
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`

Optional internal cost estimates:
- `OPENAI_INPUT_USD_PER_1M=0.20`
- `OPENAI_OUTPUT_USD_PER_1M=1.20`
- `OPENAI_WEB_SEARCH_USD_EACH=0.01`

The app records AI usage per customer in `usage_events`. Update the three cost estimate variables whenever provider pricing changes.

## 3. Stripe (Subscriptions)
Create three recurring monthly products/prices in Stripe:
- Personal — €9.99/month
- Pro — €19.99/month
- Business — €39.99/month

Copy the three Price IDs into:
- `STRIPE_PRICE_PERSONAL`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`

Also add:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL=https://YOUR-DOMAIN`

Create a Stripe webhook endpoint:
`https://YOUR-DOMAIN/api/billing/webhook`

Subscribe to:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## 4. Admin Dashboard
Set:
`ADMIN_EMAILS=your-email@example.com`

Multiple admins can be comma-separated.
Admin dashboard: `/admin`
Customer account/usage: `/account`
Pricing: `/pricing`

## 5. Existing Outlook connection
Keep your existing Microsoft environment variables exactly as they are:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID=common`
- `EMAIL_SESSION_SECRET`

Do not change the registered Microsoft callback URI:
`https://YOUR-DOMAIN/api/email/microsoft/callback`

## 6. WhatsApp
Business automation uses the Meta WhatsApp Business Platform variables:
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`

Personal WhatsApp remains a user handoff/open-chat flow; automated inbox access is not provided for ordinary personal WhatsApp accounts.

## 7. Vercel
Upload this source to the existing GitHub repository and let Vercel redeploy.
Do NOT upload:
- `node_modules`
- `.next`
- `.env.local`

Add all secrets through Vercel Project > Settings > Environment Variables.
After adding/changing environment variables, redeploy Production.

## 8. Launch smoke test
Before taking payments, test in this order:
1. Create a new customer account.
2. Ask: `What is the capital of France?` -> Future should answer directly in chat.
3. Ask a current question -> Future should research and answer inside Future.
4. Open `/account` -> usage should increase.
5. Purchase Personal plan using Stripe test mode.
6. Confirm `/account` changes to Personal after webhook processing.
7. Open `/admin` as the admin email -> customer, MRR and AI cost should appear.
8. Test Outlook connection and Approval Center.
9. Test Tasks, Calendar, History, Orders and cloud sync on a second browser/device.
10. Only after all tests pass, switch Stripe from Test mode to Live mode and replace test keys/price IDs with live ones.

## Important launch notes
- Never expose `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or Microsoft client secret in browser code.
- The Admin margin shown is an operational estimate: subscription list price minus estimated AI usage. It does not yet subtract VAT, Stripe fees, hosting, support, refunds, WhatsApp charges, maps, or other third-party costs.
- Free plan limits are intentionally small. Paid plan limits can be changed in `lib/plans.ts` without redesigning the app.
