# Future 3.0 Phase 3 — Outlook / Microsoft 365 setup

This edition replaces Gmail OAuth with Microsoft identity platform + Microsoft Graph.
It supports Outlook.com / Hotmail / Live accounts and Microsoft 365 work or school accounts when the app registration allows them.

## 1. Create the Microsoft app registration

1. Open Microsoft Entra admin center.
2. Go to **App registrations** → **New registration**.
3. Name it `Future AI Secretary`.
4. For Supported account types, choose the option that allows both organizational directories and personal Microsoft accounts if you want Outlook.com/Hotmail plus Microsoft 365 users.
5. Add a **Web** redirect URI:

`https://YOUR-DOMAIN.vercel.app/api/email/microsoft/callback`

For local testing also add:

`http://localhost:3000/api/email/microsoft/callback`

## 2. Add delegated Microsoft Graph permissions

Add these delegated permissions:

- `User.Read`
- `Mail.Read`
- `Mail.Send`

The OAuth request also asks for `openid`, `profile`, `email`, and `offline_access` so Future can identify the signed-in mailbox and refresh access when needed.

## 3. Create a client secret

In **Certificates & secrets** create a new client secret. Copy its **Value** immediately.

## 4. Add Vercel environment variables

In Vercel → Project → Settings → Environment Variables add:

- `MICROSOFT_CLIENT_ID` = Application (client) ID
- `MICROSOFT_CLIENT_SECRET` = secret Value
- `MICROSOFT_TENANT_ID` = `common`
- `EMAIL_SESSION_SECRET` = a long random secret

Redeploy after saving variables.

## 5. Connect inside Future

Open Future → Connections → **Connect Outlook**. Sign in to Microsoft and approve the requested permissions.

Future can then:

- show recent Inbox messages,
- use the connected mailbox address in Approval Center,
- send a new message through Microsoft Graph only after the user explicitly approves it.

## Safety rule

The `/api/email/send` endpoint rejects requests unless `approved: true` is present, and the UI shows recipient, sender, subject, and message before sending.

## Production note

This MVP stores the encrypted Microsoft token session in an HttpOnly Secure cookie. Before launching a public subscription product, move tokens and account sessions into a database-backed encrypted user account system with token revocation, rotation, audit logging, and privacy controls.
