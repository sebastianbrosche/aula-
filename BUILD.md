# BUILD.md

Locked contract: [docs/handoff.md](docs/handoff.md). Name: **aula** (ADR-0013). Repo: [sebastianbrosche/aula-](https://github.com/sebastianbrosche/aula-).

aula is a full classroom platform: story, recognition without points, portfolios, teacher-to-family messages, notify. It is not a WhatsApp wall with the rest deferred.

## v1.0 modules (Section 3.1)

1. Classes and rosters
2. Class story
3. Skills (noticing, never points)
4. Portfolio
5. Messaging (teacher to guardian only)
6. Notifications (in-app, email, optional web push)

Foundations: auth, RBAC, audit, consent, export, erase, self-host.

## Out of v1

Conference scheduling, volunteer sheets, badges, peer feedback, assignments, video upload, SMS, native apps, SSO, Clever/ClassLink, districts, analytics dashboards, Durable Objects, passkeys.

## Christmas 15 Dec 2026

Milestone, not a different product: one pilot group running story + messaging + notify + export/erase. Skills and portfolio stay in v1.0 and are not cut.

## Stack (locked)

Hono + hono/jsx on Cloudflare Workers, HTMX, Tailwind 4, D1 + Drizzle (SQLite everywhere), R2 EU, Queues, KV. Self-host: same app on Node, SQLite, local disk.

## Next

CLS-2: foundation Worker, D1, R2, Queues, Drizzle, `/healthz`. See Section 18 steps 3 to 7. Stop at that gate.
