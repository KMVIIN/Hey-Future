# Phase 3 — Outlook Edition tests

## Workflow and Approval Center

1. `Check if I have any new email` → Inbox read only; no Send approval is created.
2. `Draft an email to Alex about tomorrow's meeting` → draft workflow; no actual sending.
3. `Send an email to Alex saying I will be 10 minutes late` → Approval Center must show To / From / Subject / Message before send.
4. Cancel the approval → no email is sent.
5. Approving an email without Outlook connected → must not send and should ask to connect Outlook.

## Real Outlook / Microsoft 365

1. Configure `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID=common`, and `EMAIL_SESSION_SECRET` in Vercel.
2. Add the exact production callback URI in Microsoft Entra:
   `https://YOUR-DOMAIN.vercel.app/api/email/microsoft/callback`
3. Connect Outlook from Connections.
4. Check recent email → real Inbox messages should appear.
5. Create a send workflow and inspect Approval Center.
6. Approve only after verifying recipient, sender, subject, and body.
7. Confirm the message appears in Sent Items and reaches the recipient.
8. Disconnect and verify Inbox/send endpoints return not connected.
