# Future 4.5 — Paid Beta readiness gate

Do not charge real customers until all four gates pass in production.

## Gate 1 — Search
Test in FR, EN and TH while signed out: `restaurants in Nice`, `gift for mom under 50 euros`, `latest AI news`. A pass means useful public results render inside Future. Free search must not require OPENAI_API_KEY. Paid search should be tested again while signed in to a paid/test plan with OPENAI_API_KEY configured.

## Gate 2 — Future AI chat
With OPENAI_API_KEY configured, ask one timeless question and one current question. Pass: both answer inside Future; the current query may use web research; errors do not expose the API key. Check `/api/beta-readiness` only reports presence/missing configuration, never secret values.

## Gate 3 — Stripe subscription
Use Stripe TEST mode first. Confirm Personal, Pro and Business checkout sessions open; complete a test-card checkout; verify the webhook updates the Supabase subscription; verify Account shows the new plan; open Billing Portal; cancel and confirm the webhook returns the account to Free at the intended lifecycle point. Do not switch to live mode until this entire cycle passes.

## Gate 4 — Outlook / Calendar / Approval
Connect the existing Microsoft OAuth integration. Read inbox. Draft an email. Confirm it is NOT sent before approval. Approve and send a test email to an address you control. For Calendar, create/edit/delete local items and reload to verify persistence/sync behavior. For booking/payment workflows, approval must never be represented as a completed booking/payment unless a real provider confirms success.

## Release decision
`GET /api/beta-readiness` must show all required production configuration present. This is a configuration gate only, not proof that Stripe/OpenAI/Microsoft are operational. The manual tests above are mandatory before taking money.
