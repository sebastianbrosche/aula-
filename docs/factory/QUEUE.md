# QUEUE

Philosophy: [docs/adr/0017-low-load-ai-first.md](../adr/0017-low-load-ai-first.md).

| ID | Status | Slice |
| --- | --- | --- |
| CLS-0 | done | Repo and the product, written down |
| CLS-1 | queued (human) | Domain. Slug `aula-` stays |
| CLS-2 | next | Worker that is alive (`/healthz`) |
| CLS-3 | queued | Login for adults |
| CLS-4 | queued | One group, invite, parent join |
| CLS-5 | queued | Teacher feed: photos and videos |
| CLS-6 | queued | Tomorrow / bring / last-minute update (the thing you ask Home) |
| CLS-7 | queued | Read API + MCP (what is tomorrow, what to bring, what happened) |
| CLS-8 | queued | Announcements, react only |
| CLS-9 | queued | Threads, mentions, DMs |
| CLS-10 | queued | Mute, subgroups, visibility, filters |
| CLS-11 | queued | Wish pool |
| CLS-12 | queued | ICS calendar |
| CLS-13 | queued | Google Home + Alexa on the same API |
| CLS-14 | queued | Email, export, erase |
| CLS-15 | queued | pt-PT and en |

Feed is early because it is easy. API is early because it is the point. Home and Alexa need that API, so they are not first, but they are not a nice-to-have.
