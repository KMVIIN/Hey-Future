# Future 4.6 — Launch Tomorrow

This package combines the current launch candidate in one uploadable project.

## Included
- Lavender / Galaxy / Sky themes.
- Workflows + Approval Center moved before Search & Discover on Home.
- Search & Discover free mode now detects news/place/shopping/travel intent, rewrites and ranks public search results, refuses to silently substitute the wrong city, uses Google News RSS for current-news intent, and shows direct fallback search links instead of low-relevance content.
- Outlook e-mail, calendar/tasks, approvals, contacts, accounting, map launcher, compact Future chat, pricing, account usage, Stripe routes, Supabase auth/state and trial route.
- French launch pages: Mentions légales, CGV, Privacy, Cookies, Terms, Contact, subscription cancellation, Alerts & safety.
- Explicit electronic cancellation entry point at `/cancel-subscription`.

## Must be configured before accepting paid B2C orders
These values cannot be invented and remain environment variables:
- `LEGAL_CONTACT_EMAIL`
- `PRIVACY_CONTACT_EMAIL`
- `LEGAL_PHONE`
- `COMPANY_REGISTERED_ADDRESS` (full real address)
- `CONSUMER_MEDIATOR_NAME`
- `CONSUMER_MEDIATOR_URL`

Also confirm Stripe live-mode products/prices + webhook and the production domain.

## Known registered identity entered in the product
- Commercial name: KÄN inc.
- Status shown: Entrepreneur individuel (EI), exerçant sous le nom commercial KÄN inc.
- SIREN: 105 703 904
- SIRET: 105 703 904 00018
- APE: 4791A
- Department: Alpes-Maritimes (06), France

## Recommended launch sequence
1. Deploy to Vercel staging/production.
2. Open `/api/beta-readiness` and verify configured services.
3. Test Search: `restaurants in Nice`, `gift for mom under 50 euros`, `latest AI news`.
4. Test Future chat with a normal non-search conversation.
5. Test Outlook connect/read and an e-mail action requiring approval.
6. Stripe Test Mode: checkout -> webhook -> account plan -> billing portal -> cancellation.
7. Only then switch Stripe to Live Mode and announce paid beta.
