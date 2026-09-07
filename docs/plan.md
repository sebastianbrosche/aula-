# Launch plan

Philosophy: [docs/adr/0017-low-load-ai-first.md](adr/0017-low-load-ai-first.md).
Clients and speed: [docs/adr/0018-native-landing-speed.md](adr/0018-native-landing-speed.md).
Privacy: [docs/adr/0019-privacy-consent-yolo.md](adr/0019-privacy-consent-yolo.md).
Loop: [docs/adr/0020-lightning-feedback-loop.md](adr/0020-lightning-feedback-loop.md).
Shape: [docs/adr/0014-comms-not-dojo.md](adr/0014-comms-not-dojo.md).

Number one: ask Home or Grok. Do not open the app.
Feed of photos and videos: early, because it is easy, and the assistant needs something true.
Quiet by default. Wishes and extra help are opt-in. Privacy switches on nearly everything.

## Goal

Ship a tryable native app within a couple of days. Put a landing site up. Recruit schools that want to try. Iterate from real use.

Schools get aula free. They pay with attention and effort (ADR-0020).

Christmas 2026 / January ClassDojo exit: **superseded** (ADR-0018). Historical only.

## First clients

iOS and Android, built with Claude. Landing page beside them. Worker API + MCP stay the server of truth. HTMX web is not the v1 client.

## Waves

- **Tryable cut:** Worker, adult login, one group, landing, iOS, Android, feed, privacy/consent/YOLO, long-press bugs, quiet comms (announce, short messages, teacher reach).
- **Next:** tomorrow/bring, voice + attachments, AI summary, mute/filters, wishes, ICS, read API + MCP, Home/Alexa, email/export/erase, pt-PT and en.
- **Wave-2 after first pilots:** Google Photos / Drive / iPhone save, in-app excursion payments.

Build order is in [docs/factory/QUEUE.md](factory/QUEUE.md). First working code: a Worker that is alive.
