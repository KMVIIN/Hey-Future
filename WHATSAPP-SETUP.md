# Future 3.3 — WhatsApp setup

Future supports two different WhatsApp experiences:

1. Personal WhatsApp quick-send
   - Opens an existing personal WhatsApp/WhatsApp Web chat using the official `wa.me` deep link.
   - Future does not read or sync a personal WhatsApp inbox.

2. WhatsApp Business Platform
   - Official API path for business messaging, customer-service workflows and webhook-based incoming messages.
   - Add these Vercel environment variables:
     - `WHATSAPP_ACCESS_TOKEN`
     - `WHATSAPP_PHONE_NUMBER_ID`
     - `WHATSAPP_VERIFY_TOKEN`
     - optional `WHATSAPP_GRAPH_VERSION`
   - `/api/whatsapp/send` requires `approved: true` before it sends a text message.

For incoming Business messages, create a Meta webhook pointing to a Future webhook route in the next phase. This package exposes status and approved sending but does not yet store inbound WhatsApp conversations.
