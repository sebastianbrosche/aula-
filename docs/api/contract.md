# aula API contract (preview)

For Grok Build (native iOS and Android). Stubs are marked. This is the Worker JSON surface. HTML pages on the same Worker are a morning click-through only. Do not treat HTMX as the v1 client.

Base: https://aula.sebastian-brosche.workers.dev (or the Worker origin you deploy). All JSON under `/v1` unless noted. `GET /healthz` is unversioned.

No passwords in v1. Children do not log in. No student cards in the native apps (ADR-0014). ADR-0006 still names teacher-issued cards; the stub here always returns 403 so clients cannot build kid login by accident.

## Live now

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/healthz` | no | `{ "ok": true, "sha": "..." }` |
| GET | `/` | no | English smart-feed landing. PIN4B1 join is above login |
| GET | `/t/morning` `/g/morning` | nested | Morning checklist: happening, bring, excursion, Summary |
| GET | `/v1/morning` | adult | same checklist as JSON |
| GET | `/privacy` | no | Quiet-by-default / YOLO copy. Signed-in adults go to `/g/privacy` or `/t/privacy` |
| GET | `/g/privacy` | guardian | Photo opt-out and YOLO switches. Persist |
| POST | `/g/privacy` | guardian | form `photoOptOut`, `yolo` |
| GET | `/t/privacy` | teacher | Read-only quiet defaults. YOLO stays off until a parent accepts |
| GET | `/bugs` | adult | Form plus open issue queue. Guest sees sign-in |
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
| POST | `/v1/group/join` | adult | `{ inviteCode }`. Seed `PIN4B1`. Wrong code 400. Already in is `{ already: true }` |
| GET | `/join` | no | Adult invite form. Not a student card |
| POST | `/join` | adult or demo parent | form `inviteCode`. HTML. Guest with `DEMO_LOGIN` joins as parent |
| GET/POST | `/v1/ask` | adult | `{ q }` template answer from feed + tomorrow. No model |
| GET/POST | `/t/ask` `/g/ask` | nested | HTML Ask Home |
| GET | `/v1/feed` | session | story + announcement + teacher posts. Honour photo opt-out |
| GET | `/v1/feed/:id` | session | full body. List rows may be truncated |
| GET | `/v1/feed/:id/media` | session | photo/video/audio bytes when uploaded. 404 if stub |
| POST | `/v1/feed` | teacher | JSON `{ type, title, body }` or multipart with `file`. Types include `voice` |
| GET | `/v1/tomorrow` | session | happening, bring, last-minute updates. Includes `excursion` when seeded |
| GET | `/v1/bring` | session | `{ bring, updates[] }` |
| GET | `/v1/week` | session | `{ tomorrow, story[], highlights[], notes[] }` |
| GET | `/t/week` `/g/week` | nested | HTML week notes plus feed highlights |
| GET | `/v1/summary` | adult | template digest of today and tomorrow. Nothing extra stored |
| GET | `/t/summary` `/g/summary` | nested | HTML Summary |
| GET | `/v1/privacy` | adult | guardian prefs or teacher quiet defaults |
| POST | `/v1/privacy` | guardian | `{ photoOptOut, yolo }` |
| POST | `/v1/consent` | guardian | same as privacy save |
| POST | `/v1/excursion` | guardian | `{ id }` one-tap. YOLO auto-approves and logs |
| POST | `/v1/excursion/reset` | teacher | garden visit back to pending so Approve can be walked again |
| POST | `/t/excursion/reset` | teacher | HTML reset from `/t/morning` |
| GET | `/v1/dm` | adult | pending and accepted threads |
| POST | `/v1/dm` | teacher | `{ guardianId }` request |
| GET | `/v1/dm/:id` | party | thread |
| POST | `/v1/dm/:id` | guardian | `{ action: accept\|decline }` |
| POST | `/v1/dm/:id/messages` | party | `{ body }` after accept |
| GET | `/t/dm` `/g/dm` | nested | HTML inbox and thread |
| POST | `/g/excursion` | guardian | HTML one-tap |
| GET | `/v1/features` | adult | open feature asks |
| POST | `/v1/features` | adult | `{ body }` |
| POST | `/v1/features/:id` | teacher | `{ action: accept\|reject }` |
| GET | `/features` | adult | HTML form plus open list |
| GET/POST | `/v1/export` | teacher | stub. `{ exported: false, connected: false, status: "not_connected" }` |
| GET/POST | `/t/export` | teacher | honest not-connected / coming-soon. Never fake success |
| GET | `/v1/payments` | guardian | stub. `{ live: false, stripe: false, status: "test_not_live" }` |
| GET | `/g/payments` | guardian | calm test/not-live card. No Stripe |
| GET | `/v1/bugs` | adult | open issue queue (`status=open`) |
| POST | `/v1/bugs` | adult | `{ body, path?, sha? }`. Students never report |
| POST | `/v1/bugs/:id` | adult | `{ action: "done" }` closes an open item |
| POST | `/v1/bug-report` | adult | alias |
| POST | `/bug-report` | adult | form or JSON alias |
| POST | `/v1/auth/magic-link` | no | `{ email }` |
| GET | `/v1/auth/google` | no | `{ url }` or 503 |
| POST | `/v1/auth/student-card` | any | always `{ error: "children_do_not_log_in" }` 403 |
| POST | `/v1/auth/logout` | session | |
| GET | `/mcp` | no | tool list. HTML if `Accept: text/html` |
| POST | `/mcp` | list public, call session | `{ method, params }` see `docs/api/mcp.md` |

Cookie: `aula_s`, HttpOnly, Secure on HTTPS, SameSite=Lax, 30 days. Native apps may keep that cookie from the WebView or later swap to a bearer token (not built yet).

Session is denied for `role = student`.

## GET /healthz sha

`GET /healthz` returns `{ "ok": true, "sha": "<git sha or unknown>" }`. HTML pages repeat that sha in a muted footer.

Resolution order: Worker env `GIT_SHA`, then `WORKERS_CI_COMMIT_SHA`, then the baked `BUILD_SHA`, else `unknown`.

Set it on deploy so Tester can see which commit is live:

```
cd apps/worker
GIT_SHA=$(git rev-parse HEAD)
pnpm exec wrangler deploy --var GIT_SHA:$GIT_SHA
```

Or put `GIT_SHA` in `wrangler.jsonc` `vars` / the dashboard. Builder should set `GIT_SHA` to the git commit it is deploying.

## Auth sketch (ADR-0006)

Adults (teacher, guardian, admin). Google is preferred for morning. Magic link is the backup so a missing OAuth redirect URI cannot block login.

1. **Google OAuth (preferred).** `GET /auth/google` and `GET /v1/auth/google`. Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the Worker. **Exact morning redirect URI to allowlist:** `https://aula.sebastian-brosche.workers.dev/auth/google/callback`. If the Google inbox already belongs to a seeded adult, the session starts immediately. If `DEMO_LOGIN=1` and the inbox is new, the Worker shows a Pinheiros teacher/parent picker. If secrets are missing, `/auth/google` is 503 HTML and `/v1/auth/google` is 503 JSON. If that URI is not allowlisted, use the magic-link backup.
2. **Magic link (backup).** `POST /login` or `POST /v1/auth/magic-link` with `{ email }`. Token is 32 random bytes, stored as SHA-256, 15 minutes, single use. `GET /auth/verify?t=` sets the session. When `RESEND_API_KEY` is set, the Worker sends the email through Resend. Prefer `RESEND_FROM` when that var is set. If `RESEND_FROM` is missing, the Worker uses `aula <login@m1.heatlagos.com>` (verified domain on the existing Resend account). A successful send returns `{ sent: true }` and never prints `previewUrl`. If Resend is unset or returns non-OK, and `DEMO_LOGIN=1`, the API returns `{ sent: false, previewUrl, reason? }`. `reason` is a short safe snippet (`<status> <truncated body>`). Pinheiros `.aula.test` inboxes are not real mailboxes, so those sends usually fail and the printed `/auth/verify` link is used. If demo login is off and there is no successful send, the API is 503 and no link is printed.
3. **Seeded preview buttons.** `POST /login/demo` when `DEMO_LOGIN=1`. Pinheiros stays mandatory either way.

Students: teacher-issued login cards are specified in ADR-0006 and are **out** of v1 product (ADR-0014). `POST /v1/auth/student-card` always 403 `children_do_not_log_in`. Native clients must not build kid login. `GET/POST /join` is the adult invite path.

Preview emails:

- teacher: `ana.costa@pinheiros.aula.test`
- parent: `rui.mendes@pinheiros.aula.test`

## One group (ADR-0002)

`GET /v1/group` returns school name, class name, invite code, adults, children. Children use a handle + last initial only (`Oak P.`). Roster reads write `audit_log` in the same request.

Create / invite / join are stubs on the same D1 tables:

- `POST /v1/group` `{ name }` teacher only. If the teacher already has a class, that class is returned.
- `POST /v1/group/invite` teacher only, returns `{ inviteCode }`.
- `POST /v1/group/join` `{ inviteCode }` adult. Unknown or empty code is 400 `invalid`. Seeded adults already belong to Pinheiros / 4.o B (`PIN4B1`) and get `{ already: true }`. A new adult is attached as guardian (or teacher) on that class. HTML: landing puts PIN4B1 join first for a first-time adult. `/join` is prefilled. Teacher demo buttons stay below.

## Feed

`GET /v1/feed` returns posts newest first: `{ id, type, title, body, createdAt }`. Types: `story`, `announcement`, `photo`, `video`.

`POST /v1/feed` teacher only.

- JSON `{ type, title, body }`
- or `multipart/form-data` with the same fields plus optional `file` (max 8 MiB)

Photo or video:

- If the Worker `MEDIA` R2 binding is present and a file was sent, bytes go to `feed/{id}` and the response is `{ storage: "r2", uploaded: true, mediaKey }`.
- Otherwise the post is still saved and the response is `{ storage: "stub", uploaded: false }` with no `mediaKey`. We do not claim an upload that did not happen.

When `mediaKey` is stored, `GET /v1/feed` echoes it and `attachment.stub` is false. `GET /v1/feed/:id/media` (and `/t/feed/:id/media`, `/g/feed/:id/media`) streams the bytes to an adult who can see the post. HTML shows a thumbnail for photos and an honest open/play link for photo, video, or audio. Seeded caption-only photos stay stub. Signed 15-minute public URLs are not in this slice.

A post may name a child via `child_ids` in the database. If that child's guardian turned on photo opt-out, other adults see a visible `photo declined` label and the child's handle is redacted. The opted-out parent still sees the full caption.

Long bodies return `preview` plus `truncated: true`. HTML shows Read more.

Type `voice`: teacher compose can upload short audio and/or paste a transcript. If audio landed in R2, the feed shows a play link. If not, the transcript text is the item. Parents do not compose.

## Tomorrow / bring / last-minute / week

These answer the product headline (ADR-0017): what is school tomorrow, what to bring, any last-minute note.

`GET /v1/tomorrow` returns `{ day, happening, bring, updates[] }`. Never empty on the Pinheiros seed. English is the default body (garden, hat, road). Send `aula_locale=pt-PT` for the Portuguese jardim/chapeu/estrada copy.

`GET /v1/bring` is the bring + updates slice.

`GET /v1/week` returns `{ tomorrow, story[], highlights[], notes[] }`. Notes include the Thursday library bag and the road update. Highlights are feed previews (photo declined applies). HTML: `/t/week` and `/g/week`. Wrong nest is 403.

`GET /v1/morning` is the Pinheiros morning walk: happening, bring, excursion status, and the same notes as tomorrow. HTML `/t/morning` and `/g/morning` add a Summary link. A parent can tap the garden visit from that page. Wrong nest is 403.

`GET /v1/summary` is a one-click adult digest. It is a deterministic template from the same feed and tomorrow rows the actor can already see (`source: "template"`). Photo opt-out redaction applies. Nothing extra is stored. HTML: `/t/summary` and `/g/summary`, with a Summary button on home and feed.

`GET/POST /v1/ask` `{ q }` is the quiet Home ask. Same template spirit as Summary. No LLM. Wrong nest on `/t/ask` or `/g/ask` is 403. Unauthenticated `/v1/ask` is 401. Signed-in `/t` and `/g` show the short Ask Home box.

`GET /v1/tomorrow` also returns `excursion` when the Pinheiros garden visit ask exists. A parent taps `POST /v1/excursion` `{ id }` to approve. If YOLO is on, status is `auto` and a consent row is logged. A teacher can `POST /v1/excursion/reset` (or the button on `/t/morning`) to put the visit back to pending so Approve is walkable again. A parent cannot reset (403).

Sebastian morning walk (non-technical): `docs/morning-walk.md`.

Write endpoints for plans are not in this slice.

## Messages

`POST /v1/dm` `{ guardianId }` teacher only. If that pair already has a `pending` request, the same row is returned. If the latest pair is `accepted` or `declined`, a new pending row is minted so the parent sees Accept / Decline again. Parent responds with `POST /v1/dm/:id` `{ action: accept|decline }`. After accept, `GET /v1/dm/:id` and `POST /v1/dm/:id/messages` `{ body }` are the thread. A declined thread rejects messages with 403. Accepted threads stay messageable. HTML: `/t/dm` and `/g/dm`.

## MCP (ADR-0015)

See `docs/api/mcp.md`. Tools: `aula_tomorrow`, `aula_bring`, `aula_week`, `aula_story`, `aula_ask`. Read only. `write: false`. Same Pinheiros answers as the HTTP reads (garden, hat, road, library bag). Photo declined applies on story and week. `aula_ask` is the quiet Home template. Write is out of v1.

## Privacy / YOLO (ADR-0008, ADR-0017)

Public copy: `GET /privacy` and the landing. Quiet by default. No RGPD / GDPR endorsement claim. Landing and nav link here.

Signed-in guardian: `/g/privacy` shows the current photo opt-out and YOLO switches and saves through `savePrivacy`. `GET/POST /v1/privacy` and `POST /v1/consent` `{ photoOptOut, yolo }` are guardian write. YOLO is off by default. Turning YOLO on writes consent rows with `source = yolo`.

Signed-in teacher: `/t/privacy` and `GET /v1/privacy` show the quiet class defaults (`editable: false`). Public share and YOLO stay off. A teacher cannot accept YOLO for a parent. `POST /v1/privacy` stays 403 for teachers.

## Bug report

Adults only. `POST /bugs`, `POST /bug-report`, `POST /v1/bugs`, `POST /v1/bug-report` accept `{ body, path?, sha? }` (or form fields). Each write inserts an **open issue** in D1 `bug_reports`: `id`, `path`, `role`, `note`, `sha`, `status=open`, `createdAt`. HTML POST still shows thanks, then the new id. `GET /bugs` (signed in) lists every open item. `GET /v1/bugs` is the same queue as JSON. An adult can mark one done with `POST /bugs/:id` or `POST /v1/bugs/:id` `{ action: "done" }`. Done items leave the open list. This is not Linear. The Worker has no Linear API. See `docs/bugs/README.md`. Students never report. Unauthenticated is 401.

If a JSON or HTML handler throws `AppError` `unavailable` or status 500+, the Worker writes the same open issue (path, role, note, sha) when an adult is signed in. That write never blocks the user response. 401 and 403 do not record.

Chrome: press and hold `Report a bug` (touch or pointer) to open `/bugs?from=<current path>`. A short click still opens `/bugs`.

## Feature asks

Adults only. `POST /features` and `POST /v1/features` `{ body }` insert an open row in D1 `feature_requests`. Signed-in `/features` and `GET /v1/features` list open items. Teacher or school_admin `POST /features/:id` or `POST /v1/features/:id` `{ action: accept|reject }`. A parent cannot decide (403). This is not Linear. See `docs/features/README.md`. Pinheiros seed includes one open ask about the Thursday library bag.

## Export stub

Teacher only. `GET/POST /t/export` and `GET/POST /v1/export` say Google Photos and Drive are not connected. `exported` is always false. Coming soon. Nothing is sent. A parent is 403. Do not treat HTTP 200 as a successful export.

## Payments stub

Guardian only. `/g` shows a calm payments card. `/g/payments` and `GET /v1/payments` say test, not live, no Stripe. Nothing can be charged. A teacher is 403. No Stripe keys and no Stripe SDK.

## Role rules

Every `/v1` read except healthz, magic-link, Google start, student-card stub, and MCP list: unauthenticated = 401. Wrong role = 403. Teacher cannot change parent privacy. Parent cannot open `/t` or `/t/*` or create feed posts. Teacher cannot open `/g` or `/g/*`.

## Seed

School: Pinheiros. One class `4.o B`. Invite `PIN4B1`. Teacher Ana Costa. Parent Rui Mendes. Children Cedar M., Oak P., River R. Feed includes the garden story, a music circle story, a text-only garden-box photo caption, and Friday assembly. Tomorrow stays garden / hat / road, plus a Thursday library bag note. Default locale is English. Apply schema, then open `/` and use a seeded button.

## How auth will work in production

1. Adult opens `/` or the native app.
2. Prefers Google (`GET /auth/google`) when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are on the Worker and this redirect URI is allowlisted: `https://aula.sebastian-brosche.workers.dev/auth/google/callback`.
3. Falls back to magic link via Resend (`RESEND_API_KEY`, optional `RESEND_FROM`) if Google is missing or the redirect URI is not allowlisted.
4. Session cookie `aula_s` for the Worker and HTMX preview. Native can keep that cookie or later exchange it.
5. Children never receive a link, a card, or a session.
6. Pinheiros seed stays: teacher Ana Costa, parent Rui Mendes, children Oak P., River R., Cedar M., non-empty feed and tomorrow.

## Later

- 15 minute signed R2 read URLs
- ICS calendar
- Wishes and richer threads
- Bearer tokens for MCP hosts
