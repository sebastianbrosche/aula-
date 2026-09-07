# QUEUE

Philosophy: [docs/adr/0017-low-load-ai-first.md](../adr/0017-low-load-ai-first.md).
Clients and speed: [docs/adr/0018-native-landing-speed.md](../adr/0018-native-landing-speed.md).
Privacy: [docs/adr/0019-privacy-consent-yolo.md](../adr/0019-privacy-consent-yolo.md).
Loop: [docs/adr/0020-lightning-feedback-loop.md](../adr/0020-lightning-feedback-loop.md).

Landing and native clients are early. They are not after a long web-only path.

| ID | Status | Slice |
| --- | --- | --- |
| CLS-0 | done | Repo and the product, written down |
| CLS-1 | queued (human) | Domain. Slug `aula-` stays |
| CLS-2 | next | Worker that is alive (`/healthz`) |
| CLS-3 | queued | Login for adults (API session) |
| CLS-4 | queued | One group, invite, parent join |
| CLS-5 | queued | Public landing page (recruit schools that want to try) |
| CLS-6 | queued | iOS client via Claude + emulator |
| CLS-7 | queued | Android client via Claude + emulator |
| CLS-8 | queued | Teacher feed: photos and videos |
| CLS-9 | queued | Long-press bug report + voice note; auto-file bugs; feature-request queue |
| CLS-10 | queued | Privacy switches, photo opt-out, one-tap excursion consent, YOLO mode |
| CLS-11 | queued | Announcements, react only; short messages with Read more |
| CLS-12 | queued | Threads, mentions, parent DM with accept; teacher can always message |
| CLS-13 | queued | Tomorrow / bring / last-minute update (the thing you ask Home) |
| CLS-14 | queued | Voice messages with transcription; document attachments |
| CLS-15 | queued | One-click AI summary of last few days (app + MCP) |
| CLS-16 | queued | Mute, subgroups, visibility, filters |
| CLS-17 | queued | Wish pool |
| CLS-18 | queued | ICS calendar |
| CLS-19 | queued | Read API + MCP (what is tomorrow, what to bring, what happened) |
| CLS-20 | queued | Google Home + Alexa on the same API |
| CLS-21 | queued | Email, export, erase |
| CLS-22 | queued | pt-PT and en |
| CLS-23 | queued (wave-2) | Save class media to Google Photos / Drive / iPhone |
| CLS-24 | queued (wave-2) | In-app excursion payments |

Tryable cut is CLS-2 through CLS-12. That is the couple-of-days app plus landing.

Feed is early because it is easy. Native clients and landing are early because that is what a school can try. API is early in spirit (the Worker is first) and listed again when Home needs richer tools. Home and Alexa need that API, so they are not first, but they are not a nice-to-have.

Wave-2 is immediately after first pilots. Not dropped.
