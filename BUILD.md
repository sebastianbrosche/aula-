# BUILD.md

Name: **aula**. One school. Repo: [sebastianbrosche/aula-](https://github.com/sebastianbrosche/aula-).

Philosophy: [docs/adr/0017-low-load-ai-first.md](docs/adr/0017-low-load-ai-first.md).
Clients and speed: [docs/adr/0018-native-landing-speed.md](docs/adr/0018-native-landing-speed.md).
Privacy and consent: [docs/adr/0019-privacy-consent-yolo.md](docs/adr/0019-privacy-consent-yolo.md).
Loop: [docs/adr/0020-lightning-feedback-loop.md](docs/adr/0020-lightning-feedback-loop.md).
Product shape: [docs/adr/0014-comms-not-dojo.md](docs/adr/0014-comms-not-dojo.md).

You should not have to learn this app. You should not have to open it. Ask Home, Alexa, or Grok what school is tomorrow and what to bring. The feed exists so there is something true to ask about. Quiet is the default. Helping is opt-in.

## Operating goal

A tryable app within a couple of days. A public landing page. Schools that want to try. Then iterate from real use.

Christmas 2026 and leaving ClassDojo before January were an earlier calendar target. **Superseded (ADR-0018).** Do not plan or report against that date.

## v1

- Native **iOS and Android** clients, built with Claude (emulators included). First thing a parent or teacher opens
- Public **landing** to recruit trying schools
- Cloudflare **Hono API + MCP** as the server of truth
- Teacher feed: photos and videos of the day. Free. Early, because it is easy
- Privacy switches, photo opt-out, parent DM accept, one-tap excursion consent, optional YOLO mode
- Short messages with Read more. Voice notes with transcription. Document attachments for special needs / recent events
- Long-press bug report (voice note allowed). Bugs auto-file and agents fix them. Feature requests wait for a human accept
- "Tomorrow": what is happening, what to bring, last-minute changes
- Announcements you only react to. Threads. Mentions. Teacher can always message everyone
- Subgroups you can mute. Visibility. Filters
- Wish pool for teachers. Opt-in
- Calendar subscribe
- One-click AI summary of the last few days (app and MCP)
- Email, export, erase
- Adults only

## Wave-2 (right after first pilots, not dropped)

- Save class media to Google Photos, Google Drive, iPhone
- In-app excursion payments

## Out

Points, Plus, tutors, kid login, a product you have to live in. Agents shipping unaccepted feature requests. HTMX-only web as the v1 client.

## Next build

A Worker that answers `/healthz`. Then login, then a group, then the landing and the iOS/Android clients, then the feed and the bug-report loop.
