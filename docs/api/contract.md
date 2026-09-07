# aula API contract (preview)

For Grok Build (native iOS and Android). Stubs are marked. This is the Worker JSON surface. HTML pages on the same Worker are a morning click-through only. Do not treat HTMX as the v1 client.

Base: the deployed Worker origin. All JSON under `/v1` unless noted. `GET /healthz` is unversioned.

No passwords in v1. Children do not log in. No student cards in the native apps (ADR-0014). ADR-0006 still names teacher-issued cards; the stub here always returns 403 so clients cannot build kid login by accident.

## Live now

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/healthz` | no | `{ "ok": true }` |
| GET | `/` | no | Dual SEO landing (pt-PT WhatsApp + EN ClassDojo-free) plus adult login |
| GET | `/privacy` | no | Quiet-by-default / YOLO copy. No legal endorsement claim |
| POST | `/login/demo` | no | form `role=teacher` or `role=guardian`. Preview only (`DEMO_LOGIN=1`) |
| POST | `/login` | no | form `email`. Magic link (ADR-0006) |
| GET | `/auth/verify?t=` | no | consumes the magic link, sets `aula_s` |
| GET | `/auth/google` | no | Google OAuth start. 503 until secrets are on the Worker |
| GET | `/auth/google/callback` | no | Google OAuth finish |
| POST | `/logout` | session | |
| GET | `/v1/me` | session | `{ actor }` |
| GET | `/v1/group` | session | one group: Pinheiros / 4.o B |
| POST | `/v1/group` | teacher | create stub; seeded teacher returns the existing group |
| POST | `/v1/group/invite` | teacher | `{ inviteCode }` |
| POST | `/v1/group/join` | adult | `{ inviteCode }` stub. Seed code `PIN4B1` |
| GET | `/v1/feed` | session | story + announcement + teacher stubs. Honour photo opt-out |
| POST | `/v1/feed` | teacher | `{ type, title, body }`. photo/video use stub storage, not R2 yet |
| GET | `/v1/tomorrow` | session | happening, bring, last-minute updates |
| GET | `/v1/bring` | session | `{ bring, updates[] }` |
| GET | `/v1/week` | session | `{ tomorrow, story[] }` |
| GET | `/v1/privacy` | guardian | photo opt-out, YOLO |
| POST | `/v1/privacy` | guardian | `{ photoOptOut, yolo }` |
| POST | `/v1/consent` | guardian | same as privacy save |
| POST | `/v1/bugs` | optional | `{ body }` intake. Anonymous stores `actorId = public` |
| POST | `/v1/bug-report` | optional | alias |
| POST | `/bug-report` | optional | form or JSON alias |
| POST | `/v1/auth/magic-link` | no | `{ email }` |
| GET | `/v1/auth/google` | no | `{ url }` or 503 |
| POST | `/v1/auth/student-card` | any | always `{ error: "children_do_not_log_in" }` 403 |
| POST | `/join` | any | same student-card stub |
| POST | `/v1/auth/logout` | session | |
| GET | `/mcp` | no | tool list. HTML if `Accept: text/html` |
| POST | `/mcp` | list public, call session | `{ method, params }` see `docs/api/mcp.md` |

Cookie: `aula_s`, HttpOnly, Secure on HTTPS, SameSite=Lax, 30 days. Native apps may keep that cookie from the WebView or later swap to a bearer token (not built yet).

Session is denied for `role = student`.

## Auth sketch (ADR-0006)

Adults (teacher, guardian, admin):

1. **Magic link (working).** `POST /login` or `POST /v1/auth/magic-link` with `{ email }`. Token is 32 random bytes, stored as SHA-256, 15 minutes, single use. `GET /auth/verify?t=` sets the session. When `RESEND_API_KEY` is set, the Worker emails the link via Resend. When it is not, and `DEMO_LOGIN=1`, the JSON returns `previewUrl` so morning login still works.
2. **Google OAuth (wired, needs secrets).** `GET /auth/google` and `GET /v1/auth/google`. Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the Worker (Builder injects them at deploy if this VM cannot see them). Redirect URI is `{origin}/auth/google/callback`. Only existing adult emails in the school can finish login. No new-user signup tonight. If secrets are missing the routes return 503.
3. **Seeded preview buttons.** `POST /login/demo` when `DEMO_LOGIN=1`.

Students: teacher-issued login cards are specified in ADR-0006 and are **out** of v1 product (ADR-0014). `POST /v1/auth/student-card` and `POST /join` always 403 `children_do_not_log_in`. Native clients must not build kid login.

Preview emails:

- teacher: `ana.costa@pinheiros.aula.test`
- parent: `rui.mendes@pinheiros.aula.test`

## One group (ADR-0002)

`GET /v1/group` returns school name, class name, invite code, adults, children. Children use a handle + last initial only (`Oak P.`). Roster reads write `audit_log` in the same request.

Create / invite / join are stubs on the same D1 tables:

- `POST /v1/group` `{ name }` teacher only. If the teacher already has a class, that class is returned.
- `POST /v1/group/invite` teacher only, returns `{ inviteCode }`.
- `POST /v1/group/join` `{ inviteCode }` adult. Validates the code. Seeded adults already belong to Pinheiros / 4.o B (`PIN4B1`).

## Feed

`GET /v1/feed` returns posts newest first: `{ id, type, title, body, createdAt }`. Types: `story`, `announcement`, plus teacher-created `photo` / `video` stubs.

`POST /v1/feed` teacher only. `{ type, title, body }`. `photo` and `video` return `{ storage: "stub", mediaKey: "stub/{id}" }`. Bytes are not uploaded tonight. R2 EU is ADR-0003 and comes later. Signed URLs stay 15 minutes when media is real.

A post may name a child via `child_ids` in the database. If that child's guardian turned on photo opt-out, other parents do not see that post. Teacher still sees it.

## Tomorrow / bring / last-minute / week

These answer the product headline (ADR-0017): what is school tomorrow, what to bring, any last-minute note.

`GET /v1/tomorrow` returns `{ day, happening, bring, updates[] }`. Never empty on the Pinheiros seed (garden visit, hat/water/socks, road closed).

`GET /v1/bring` is the bring + updates slice.

`GET /v1/week` returns `{ tomorrow, story[] }` for agents that ask about the week.

Write endpoints for plans are not in this slice.

## MCP (ADR-0015)

See `docs/api/mcp.md`. Tools: `aula_tomorrow`, `aula_bring`, `aula_week`, `aula_story`. Write is out of v1.

## Privacy / YOLO (ADR-0008, ADR-0017)

Public copy: `GET /privacy` and the landing. Quiet by default. No RGPD / GDPR endorsement claim.

Guardian only to record a choice: `POST /v1/privacy` or `POST /v1/consent` `{ photoOptOut, yolo }`. YOLO is off by default. Turning YOLO on writes consent rows with `source = yolo`.

## Bug report

`POST /bug-report`, `POST /v1/bugs`, `POST /v1/bug-report` accept `{ body }` (or a form field `body`). Stored in `bug_reports`. Anonymous reports use `actorId = public`.

## Role rules

Every `/v1` read except healthz, magic-link, Google start, student-card stub, MCP list, and public bug intake: unauthenticated = 401. Wrong role = 403. Teacher cannot change parent privacy. Parent cannot open `/t` or create feed posts.

## Seed

School: Pinheiros. One class `4.o B`. Teacher Ana Costa. Parent Rui Mendes. Children Oak P., River R., Cedar M. Feed and tomorrow are prefilled. Apply schema, then open `/` and use a seeded button.

## How auth will work in production

1. Adult opens `/` or the native app.
2. Prefers Google if the Worker has `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the redirect URI is allowlisted.
3. Falls back to magic link via Resend (`RESEND_API_KEY`, `RESEND_FROM`).
4. Session cookie `aula_s` for the Worker and HTMX preview. Native can keep that cookie or later exchange it.
5. Children never receive a link, a card, or a session.

## Later

- Real R2 media upload + 15 minute signed URLs
- ICS calendar
- Threads, DMs, wishes
- Bearer tokens for MCP hosts
