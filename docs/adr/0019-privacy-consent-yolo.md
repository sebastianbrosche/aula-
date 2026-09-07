# ADR-0019: privacy switches, consent, and low-attention UX

- Status: accepted
- Date: 2026-09-07
- Related: ADR-0008 (GDPR), ADR-0014 (comms shape), ADR-0015 (calendar and MCP), ADR-0017 (quiet default)

## Decision

aula is quiet and opt-in. Nearly every surface has a privacy switch. Consent is one tap when it must be asked. Low-attention parents can choose a standing yes (YOLO mode) so the app stops bothering them. None of this is a paywall.

These are product rules, not a later nice-to-have.

## Privacy

- **Switches for nearly everything.** Visibility and notification choices are first-class. Default is the least noise and the smallest audience that still does the job (ADR-0017).
- **Parent-to-parent DM** starts as a message request. The other parent must accept before a thread opens. Until then there is no conversation.
- **Head teacher and class teacher can always message** every adult in their school or class. They do not wait on a request. That is how the school reaches people.
- **Photo opt-out.** A parent can say their child does not appear in class photos. The story feed must honour that. It is not buried.
- **Document attachments** exist for special needs notes and recent events (a letter, a plan, a short update). Same deny-by-default and the same privacy switches. Not a public folder.

## Consent

- **One-tap excursion consent.** Ask once, answer in one tap. Do not send a form novel.
- **YOLO mode (optional).** A parent can turn on a standing accept for future excursions and for photo consent. The point is that low-attention parents are not pinged every week. YOLO is explicit, off by default, and revocable. Each auto-accept still writes a consent record (who, what, when, source = yolo). GDPR (ADR-0008) is not waived.
- Default without YOLO remains: ask per excursion, and photo consent is a clear choice, including opt-out of appearing in class photos.

## Message and media UX

- **Short messages with Read more.** No endless scroll to find the sweater. The first screen is the point. Detail is behind Read more.
- **Voice messages** with automatic transcription. Same visibility as text. Transcript is stored so an assistant can answer later.
- **One-click AI summary of the last few days.** In the app, and through MCP / the assistant (same visibility as ADR-0015). This is how you stay current without living in the feed.

## Wave-2 (not dropped)

If the couple-of-days tryable cut cannot hold these, they ship in the wave immediately after first pilots. They are product intent. Do not delete them from the plan.

1. **Save class media** to Google Photos, Google Drive, and the iPhone photo library. Free. Not a Plus locker inside aula.
2. **In-app excursion payments.** Pay the trip in the app so WhatsApp and cash envelopes are not the payment system.

## Why

Parents who want peace must be able to have it. Parents who want to help must not be blocked. Teachers must reach everyone. Photos are the nicest thing and also the sharpest privacy edge. YOLO is how we refuse to punish people for not opening the app.

## Out

- Silent YOLO (must be a chosen setting)
- Parent DMs that land without accept
- Forcing a child into class photos after opt-out
- Endless feed as the only way to catch up
- Charging for photo save or calling it Memories Plus
