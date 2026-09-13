# Future 4.6 — Launch Candidate

## Home priority
- Multi-step Workflows and Approval Center now appear before Search & Discover.
- Search & Discover remains paired with Outlook & Inbox.
- Map stays compact until the user opens it.
- Ask Future remains a compact vertical chat surface.

## Search correctness
- Added intent detection: news / places / shopping / travel / general.
- News uses a current-news RSS source in free mode.
- Place searches extract the requested location and strongly rank that city; Future will not silently replace Nice with another city.
- Shopping and travel queries are rewritten for better relevance.
- Wikipedia is used only for general factual queries, not as the default answer for shopping/news/place intent.
- If free providers return weak results, Future shows direct fallback searches instead of presenting unrelated information as an answer.

## AI chat
- Normal conversation now routes to `/api/chat` instead of falling back to an automatic Google search.
- Explicit commands such as “search for…”, maps, media, shopping and travel can still open the relevant action.

## France launch surfaces
- Added Mentions légales, CGV, Cookies, Contact and electronic subscription-cancellation pages.
- Added SIREN 105 703 904, SIRET 105 703 904 00018, APE 4791A, EI / KÄN inc. commercial-name wording and Alpes-Maritimes (06) context.
- Added Vercel host identification based on Vercel's current published legal/contact details.
- Added environment slots for full registered address, business phone and consumer mediator.

## Paid-beta readiness
- `/api/beta-readiness` now checks AI, Stripe, Supabase, Outlook and key legal configuration.
- Stripe, Outlook and AI still require a real end-to-end test after deployment; configuration presence alone does not prove a successful transaction.
