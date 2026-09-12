# Phase 1 quick tests

Use these after deployment.

### Free fallback (no API key)
- `Play La vie en rose on YouTube` → existing immediate YouTube action.
- `Find a birthday gift for my mom under 50 euros` → multi-step workflow with a Google research link.
- `Find flights from Paris to Bangkok next month and prepare the booking` → travel research + booking step waiting for approval.
- `Draft an email to Alex about the project and send it` → draft + email-send approval.
- `Remind me tomorrow at 10 to call Alex` → existing reminder flow, not a workflow.

### Approval safety
- Click Approve on booking/payment/email-send → status changes to approved, but Phase 1 explicitly does not execute the external action.
- Click Decline → approval disappears and no external action is taken.

### Branding
- PWA icon is the eclipse orb.
- Share preview uses `og-future.png` with Future branding.
