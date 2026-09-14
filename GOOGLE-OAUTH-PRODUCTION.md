# Gmail Production / Google OAuth verification

Future uses only these Gmail scopes in `lib/email.ts`:

- `https://www.googleapis.com/auth/gmail.readonly` — read/summarize inbox.
- `https://www.googleapis.com/auth/gmail.send` — send only after Future Approval Center approval.
- `openid profile email` — identify the connected Google account.

Do not replace these with the broad `https://mail.google.com/` scope.

## Production callback

`https://hey-future.vercel.app/api/email/google/callback`

## Google Auth Platform checklist

1. Branding: production app name Future — Your AI Secretary; support/contact email; public homepage.
2. Authorized domain: `hey-future.vercel.app` (or the final owned custom domain when available).
3. Audience: choose the external/public audience required for customer Gmail accounts and move out of Testing when ready.
4. Data Access: request only the scopes above.
5. Verification Center: submit verification if Google requires it for the requested Gmail scopes.
6. Privacy Policy: use the public `/privacy` page and ensure it clearly describes Google/Gmail data access, use, storage, sharing, retention/deletion, and Google's Limited Use requirements before submission.
7. Demo video: show the complete flow on the production domain: Connect Gmail → Google consent → read/summarize inbox → prepare email → Approval Center → approve → send → disconnect/revoke access.
8. Keep `GOOGLE_CLIENT_SECRET` server-only. Never put it in `NEXT_PUBLIC_*`, source code, screenshots, or support messages.

## Verification description

Future is an AI secretary. Gmail access is used only when the user explicitly connects a Google account. `gmail.readonly` is used to retrieve recent messages so Future can display and summarize them for that user. `gmail.send` is used to send an email only after the user reviews and explicitly approves the send action in Future's Approval Center. Future does not use Gmail data for advertising.

## Before submitting

- Test the callback and refresh-token flow on production.
- Confirm `/privacy`, `/contact`, and the homepage are publicly reachable and consistent with the OAuth consent screen.
- Confirm disconnect/revoke behavior and deletion/retention wording.
- Capture a verification demo using a non-sensitive test mailbox.
