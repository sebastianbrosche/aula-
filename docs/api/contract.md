# aula API contract (preview)

For Grok Build (native iOS and Android). Stubs are marked. This is the Worker JSON surface. HTML pages on the same Worker are a morning click-through only. Do not treat HTMX as the v1 client.

Base: the deployed Worker origin. All JSON under `/v1`. `GET /healthz` is unversioned.

No passwords in v1. Children do not log in. No student cards in the native apps (ADR-0014). ADR-0006 still names teacher-issued cards; they are out of this preview.

## Live now

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/healthz` | no | `{ "ok": true }` |
| POST | `/login/demo` | no | form `role=teacher` or `role=guardian`. Preview only (`DEMO_LOGIN=1`) |
| POST | `/login` | no | form `email`. Magic link (ADR-0006) |
| GET | `/auth/verify?t=` | no | consumes the magic link, sets `aula_s` |
| POST | `/logout` | session | |
| GET | `/v1/me` | session | `{ actor }` |
| GET | `/v1/group` | session | one group: Pinheiros / 4.o B |
| GET | `/v1/feed` | session | story + announcement. Honour photo opt-out |
| GET | `/v1/tomorrow` | session | happening, bring, last-minute updates |
| GET | `/v1/privacy` | guardian | photo opt-out, YOLO |
| POST | `/v1/privacy` | guardian | `{ photoOptOut, yolo }` |
| POST | `/v1/bugs` | adult | `{ body }` stub intake |
| POST | `/v1/auth/magic-link` | no | `{ email }` |
| POST | `/v1/auth/logout` | session | |

Cookie: `aula_s`, HttpOnly, Secure on HTTPS, SameSite=Lax, 30 days. Native apps may keep that cookie from the WebView or later swap to a bearer token (not built yet).

Session is denied for `role = student`.

## Auth sketch (ADR-0006)

Adults (teacher, guardian, admin): email magic link. Token is 32 random bytes, stored as SHA-256, 15 minutes, single use. Optional Google OAuth is a follow-up. Do not ask Sebastian to click Google Cloud Console for this preview.

Students: teacher-issued login cards are specified in ADR-0006 and are **out** of v1 product (ADR-0014). Native clients must not build kid login.

Preview emails:

- teacher: `ana.costa@pinheiros.aula.test`
- parent: `rui.mendes@pinheiros.aula.test`

If Resend is not configured, demo mode returns `previewUrl` on the magic-link response. Seeded buttons on `GET /` skip email.

## One group

`GET /v1/group` returns school name, class name, invite code, adults, children. Children use a handle + last initial only (`Oak P.`). Roster reads write `audit_log`.

## Feed

`GET /v1/feed` returns posts newest first: `{ id, type, title, body, createdAt }`. Types: `story`, `announcement`. A post may name a child via `child_ids` in the database. If that child's guardian turned on photo opt-out, other parents do not see that post. Teacher still sees it.

## Tomorrow / bring / last-minute

`GET /v1/tomorrow` returns `{ day, happening, bring, updates[] }`. Never empty on the Pinheiros seed. This is the answer for Home / Alexa / Grok later (CLS-7 / CLS-13). Write endpoints are not in this slice.

## Privacy / YOLO (ADR-0019)

Guardian only. Photo opt-out and YOLO (standing yes for photos and excursions). YOLO is off by default. Turning YOLO on writes consent rows with `source = yolo`.

## Stubs / later

- Google OAuth (`GET /v1/auth/google`)
- Student cards
- MCP tools
- Media upload + signed R2 URLs
- Threads, DMs, wishes, ICS

## Role rules

Every `/v1` read except `/healthz` and magic-link: unauthenticated = 401. Wrong role = 403. Teacher cannot change parent privacy. Parent cannot open `/t`.

## Seed

School: Pinheiros. One class. Teacher Ana Costa. Parent Rui Mendes. Children Oak P., River R., Cedar M. Feed and tomorrow are prefilled. Apply schema, then open `/` and use a seeded button.
