# Future 5.2 — Responsive Search & Maps

# Future 4.6 — Your AI Secretary

Launch-candidate package for Future AI Assistance.

## Main product
- AI chat + voice/text command handling
- Tasks, calendar, reminders, notes and history
- Workflows + Approval Center
- Search & Discover with free public search fallback
- Outlook inbox/connect/send flow
- Map launcher and travel/shopping research
- Contacts, orders, WhatsApp handoff/API-ready routes
- Accounting income/expense ledger + CSV export
- Lavender / Galaxy / Sky themes
- Supabase accounts/cloud state, Stripe subscriptions and 30-day Pro trial

## Launch check
Open `/api/beta-readiness` after deployment. Read `LAUNCH-TOMORROW.md` before enabling paid public checkout.

## Local development
1. Copy `.env.example` to `.env.local` and add only the services you are testing.
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`

Never commit `.env.local`, API secrets, `node_modules` or `.next`.

