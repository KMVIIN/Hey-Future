# Future 3.0 Phase 2 — Contacts Hub tests

1. Open Contacts Hub → Add contact.
   - Name: Vincent
   - Phone: +33612345678
   - Email: vincent@example.com
   - Aliases: Vince, งาน, collègue

2. Try natural commands:
   - `โทรหา Vincent`
   - `โทรหา Vince`
   - `Call Vincent`
   - `Appelle Vincent`
   - `ส่งข้อความหา Vincent ว่า ฉันจะไปสาย 10 นาที`
   - `email Vincent about tomorrow's meeting`

3. Import a `.vcf` file exported from a phone/contact app. Existing contacts with the same name or phone are merged.

4. Privacy behavior:
   - Contacts are saved only in this browser/device via localStorage in Phase 2.
   - No Google account is required.
   - PWA/Safari cannot silently read the complete iPhone/SIM address book. Direct device contacts are reserved for the native Future app.

5. Safety:
   - Future prepares `tel:`, `sms:` or `mailto:` actions. The phone/message/mail app remains the final user-controlled execution surface.
