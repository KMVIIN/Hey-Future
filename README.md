# Future 3.0 Phase 3 — Outlook Edition

Future is moving from a rule-based assistant toward an agentic AI secretary while keeping sensitive actions under user control.

## What is included

- Eclipse-style Future dashboard and mobile-first PWA UI.
- Natural-language assistant with the existing free fallback when no OpenAI API key is configured.
- Multi-step workflows and an Approval Center.
- Future Contacts Hub with manual contacts and `.vcf` import.
- Real Outlook / Microsoft 365 OAuth connection through Microsoft Graph.
- Recent Inbox reading from the connected Microsoft account.
- Real email sending only after the user approves a visible To / From / Subject / Message review.
- Browser reminders, voice input, voice replies, web actions, shopping/travel research starters, and existing Day 2.x features.

## Outlook OAuth setup

See `OUTLOOK-SETUP.md`.

Required Vercel environment variables:

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID=common`
- `EMAIL_SESSION_SECRET`

Optional:

- `OPENAI_API_KEY` for the AI planner. Without it Future falls back to the local/free planner.

The Microsoft OAuth flow requests delegated `User.Read`, `Mail.Read`, and `Mail.Send` permissions plus OIDC scopes needed for sign-in and refresh tokens. Tokens are encrypted before being stored in an HttpOnly Secure cookie for this MVP.

## Important safety behavior

Checking or summarizing email never creates a send action. Sending is a separate workflow step and must appear in Approval Center with the recipient, sender, subject, and full message before execution. The server endpoint also requires an explicit approval flag.

## Before public launch

For a multi-user subscription product, move tokens and user state from browser/cookie MVP storage into a secure database-backed account system, add encryption-at-rest and key rotation, revocation, audit logs, privacy/delete controls, and production OAuth verification/consent requirements.
