# Product contract

> Banner (ADR-0013): the product name is **aula**. This file is the locked v1.0 contract. Christmas is the **deadline for the full six-module app**, not a smaller cut. Ship each module as soon as its gate is green. Before Christmas, one or two other schools should already be using it and reporting bugs. At Christmas the operator's school gets aula so they can leave ClassDojo before the next semester (January).
>
> Repo: sebastianbrosche/aula-. Do not create another repo. Do not rename it.
>
> Where this document is silent, pick the simplest option that passes Section 16 and record it in docs/adr/.

# aula: Build Handoff v1.0

Status: LOCKED. This document supersedes all four prior drafts (prior named spec, implementation contract, Cloudflare plan, generic plan). Where they disagree, this document wins. Where this document is silent, the agent picks the simplest option that passes the verification suite in Section 16 and records the choice in `docs/adr/`.

Audience: Claude Code (bootstrap and foundation), then the four-agent factory via Linear. A human reads this once. Agents read it every session.

---

## 0. How to use this document

1. Claude Code runs Section 18 (bootstrap) verbatim on first session.
2. Every agent session starts by reading `CLAUDE.md`, which points back here.
3. Nothing in Sections 1 to 6 changes without an ADR and a Linear issue labelled `decision`.
4. The build order in Section 17 is the only sequence. No module starts before its predecessor passes its verification gate.

---

## 1. Mission and positioning

aula is a free, MIT-licensed, privacy-first classroom platform for teachers, students and families. It takes the strongest idea from each incumbent and drops the parts that harm children:

| From | Keep | Drop |
|---|---|---|
| ClassDojo | Class story, positive recognition | Points, leaderboards, red meters, streaks |
| Seesaw | Student portfolios | Lock-in, weak export |
| Bloomz | Parent communication | Cluttered UX |
| Remind | Reliable announcements | Separate app |
| TalkingPoints | Automatic translation | Closed pipeline |

One-line: **aula is the classroom app that schools own, teachers trust, and children never feel ranked by.**

Five principles, in priority order when they conflict:

1. Child safety and dignity over engagement.
2. Data minimisation over features.
3. Teacher time over polish. Onboarding under five minutes.
4. Simplicity over flexibility. One way to do each thing.
5. Near-zero hosting cost. Runs on Cloudflare free tiers for a typical school.

Name: **aula**. Lowercase in product, "aula" in prose. Domain and handle checks happen in issue CLS-1. Do not name the product Dojo. ClassDojo may appear only as a named competitor.

---

## 2. Locked decisions (ADR summary)

Each becomes `docs/adr/000N-*.md` at bootstrap.

| # | Decision | Rejected | Reason |
|---|---|---|---|
| 1 | Hono on Cloudflare Workers, server-rendered JSX, HTMX for interactivity | Next.js, Remix, React SPA | One runtime, one deploy, no hydration, no client bundle beyond HTMX. Same shape as the operator's existing bOS codebase. |
| 2 | Cloudflare D1 with Drizzle ORM. Schema is SQLite everywhere. | Postgres, Prisma, Neon | Self-hosters run the identical schema on local SQLite. Zero migration divergence. |
| 3 | R2 for media, signed URLs only, EU jurisdiction | S3, MinIO in primary path | Zero egress. Self-host swaps the storage adapter for local disk. |
| 4 | Cloudflare Queues for email, push, translation, media jobs | BullMQ, Redis | No Redis. Self-host uses an in-process queue with the same interface. |
| 5 | HTMX polling for live updates in v1. SSE is a fast-follow. | Durable Objects, WebSockets | Polling every 15s on message and feed pages is invisible to users and removes a class of bugs. |
| 6 | Auth: magic link for adults, Google OAuth optional, teacher-issued login cards for students. No passwords in v1. | Argon2id passwords, passkeys in v1 | Argon2id has no fast Worker implementation and passwords add reset flows, breach risk and support load. Passkeys ship in v1.1 via `@simplewebauthn/server`. |
| 7 | Hetzner hosts exactly one optional box: LibreTranslate (and optional ClamAV). Nothing else leaves Cloudflare. | Full Docker stack on Hetzner | Translation is the only workload Workers cannot run. Everything else runs at the edge. |
| 8 | GDPR first. School is data controller, the instance operator is processor. | FERPA/COPPA first | Pilot is in Portugal. FERPA/COPPA mapping ships in the docs, not the code, for v1. |
| 9 | Skills carry no numeric value. No `points` column exists anywhere. | `points Int default 1` from draft 2 | A points column is a leaderboard waiting to happen. Recognition is a note, not a score. |
| 10 | Monorepo with pnpm workspaces, Biome for lint and format, Vitest with the Workers pool, Playwright for E2E | ESLint + Prettier, Jest | One tool, one config, seconds not minutes. |
| 11 | Locales at launch: `pt-PT` and `en`. Every string is a key from day one. | English-only MVP | Pilot school is Portuguese. Retrofitting i18n is the most expensive refactor in this category of app. |
| 12 | MVP is six modules. Conferences, volunteer sheets, badges, video, SMS, LMS integrations wait for post-pilot. | The 32-week super-app roadmap | The three drafts padded each other. Six modules on this stack is a 10 to 12 week build. |

---

## 3. Scope

### 3.1 MVP modules (v1.0)

1. **Classes and rosters.** Create class, invite code, add students (first name + last initial), CSV import and export, guardian linking, archive.
2. **Class story.** Teacher posts (text, photos, PDFs), pinned announcements, events with date, comments toggle per post, reactions (one heart, no counts shown to students).
3. **Skills.** Custom positive skills per class, recognition with optional note and a visibility level, history per student, whole-class celebration as an opt-in per recognition.
4. **Portfolio.** Student or teacher adds photo, text, or audio item. Teacher approval before family sees it. Family view. ZIP export.
5. **Messaging.** Teacher to guardian, one thread per (class, teacher, guardian, student). No guardian-to-guardian, no student messaging.
6. **Notifications.** In-app, email, optional web push. Per-user preference: immediate, daily digest, off. Delivered in the recipient's locale, with automatic translation when the LibreTranslate box is configured.

Plus the cross-cutting foundations: auth, RBAC, audit log, consent records, data export, admin panel (minimal), self-host build.

### 3.2 Explicitly out of v1

Conference scheduling, volunteer sign-ups, badges, peer feedback, assignments, video upload, SMS, native apps, SSO (SAML/OIDC), Clever/ClassLink, multi-school districts, analytics dashboards, Durable Objects, passkeys.

Any agent that starts one of these without a `decision` issue has violated the contract.

---

## 4. Ethical behaviour model

This is the product's moat. Enforced in schema, code and copy.

**Never exists in the codebase:** a numeric score per student, a sorted list of students by any behaviour metric, a negative recognition type, a streak counter, a class-wide behaviour meter, a "needs work" category.

**Recognition flow:** teacher picks student, skill, optional note, visibility.

| Visibility | Who sees it |
|---|---|
| `teacher` | Teacher only (a private observation) |
| `student` | Student |
| `family` | Student and linked guardians (default) |
| `class` | Whole class story, as a celebration post |

Student home shows the student's own recognitions in chronological order with the note. No totals. Guardian home shows the same for their child. Teacher's class view shows recent recognitions and a per-student list, never a grid comparing students.

Copy rule: every UI string about skills uses the language of noticing, not scoring. "Noticed: Helping Others" not "Awarded 1 point".

---

## 5. Roles and permissions

| Role | Scope |
|---|---|
| `super_admin` | Instance operator. Manages schools. Cannot read student data without an explicit, audited break-glass action. |
| `school_admin` | One school. Manages teachers, classes, exports, consent, audit log. |
| `teacher` | Own classes. |
| `guardian` | Linked students only. |
| `student` | Self and class-shared content only. |

Rule: **deny by default, verify ownership on every query.** Every data-access function takes an `actor` and a `scope` (`schoolId`, `classId`, `studentId` as applicable) and throws `Forbidden` before touching the database. No route handler calls Drizzle directly. All access goes through `packages/core/src/<module>/service.ts`, which owns the permission check.

| Operation | super_admin | school_admin | teacher | guardian | student |
|---|---|---|---|---|---|
| Create school | yes | no | no | no | no |
| Create class, manage roster | no | yes | own | no | no |
| Post to story | no | yes | own | no | no |
| Comment on story | no | no | own | joined | joined (if enabled) |
| Recognise skill | no | no | own | no | no |
| Add portfolio item | no | no | own | no | self (pending approval) |
| Approve portfolio item | no | no | own | no | no |
| Send message | no | no | to guardians of own | to teacher of child | no |
| View student record | break-glass | yes | own | own child | self |
| Export data | instance | school | own class | own child | self |
| View audit log | yes | school | no | no | no |

---

## 6. Architecture

### 6.1 Primary deployment (Cloudflare)

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Cloudflare Workers | Single Worker serves HTML, HTMX fragments, JSON endpoints and queue consumers. |
| Framework | Hono 4.x with `hono/jsx` | Server-rendered. No client framework. |
| Interactivity | HTMX 2.x + a 40-line vanilla JS file for file inputs and clipboard | HTMX loaded from `/static`, not a CDN. |
| Styling | Tailwind 4 with `@tailwindcss/cli` at build time | No shadcn, no Radix. Small component set in `packages/ui` as Hono JSX functions. |
| Database | D1 + Drizzle | Location hint `weur`. |
| Storage | R2, jurisdiction `eu` | Signed URLs, 15 minute expiry. Never a public bucket. |
| Cache and rate limits | KV | Session lookups cached 60s. Rate-limit counters. |
| Jobs | Queues | `aula-jobs` queue, one consumer in the same Worker. |
| Email | Resend | EU sending region. Templates in `packages/core/src/notify/templates/`. |
| Push | Web Push via `@block65/webcrypto-web-push` | VAPID keys in secrets. |
| Static assets | Workers Static Assets | HTMX, Tailwind output, avatar SVGs. |
| Translation | LibreTranslate on Hetzner (optional) | `TRANSLATE_URL` secret. When unset, translation features hide. |

### 6.2 Self-host deployment

Same code. Adapters swap via environment:

| Concern | Cloudflare | Self-host |
|---|---|---|
| DB | D1 binding | `better-sqlite3` file |
| Storage | R2 binding | Local directory, signed with HMAC |
| Queue | Queues binding | In-process queue with SQLite-backed job table |
| Server | Workers | `@hono/node-server` on Node 22 |
| Secrets | Wrangler secrets | `.env` |

`docker compose up` gives a school a working instance in one command. Compose file has one app container and one optional LibreTranslate container. No Postgres, no Redis, no MinIO.

### 6.3 What is deliberately absent

No microservices, no message broker, no GraphQL, no tRPC, no ORM migrations at runtime (migrations run in CI), no client state library, no CSS-in-JS, no component library dependency.

---

## 7. Repository layout

```
aula/
  CLAUDE.md                     agent entry point, points here
  AGENTS.md                     factory roles and Linear protocol
  README.md
  LICENSE                       MIT
  SECURITY.md
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  package.json                  pnpm workspaces
  pnpm-workspace.yaml
  biome.json
  tsconfig.base.json
  docs/
    adr/                        0001 to 0012 from Section 2
    handoff.md                  this document
    self-hosting.md
    gdpr/                       DPA template, ROPA, retention schedule
  apps/
    worker/                     the single Cloudflare Worker
      wrangler.toml
      src/
        index.tsx               Hono app, routes mounted here
        routes/
          auth.tsx
          classes.tsx
          story.tsx
          skills.tsx
          portfolio.tsx
          messages.tsx
          notifications.tsx
          admin.tsx
          media.tsx
        views/                  Hono JSX pages and fragments
        middleware/             session, locale, csrf, ratelimit
        queue.ts                consumer dispatching to core jobs
      static/
        htmx.min.js
        app.js
        app.css                 Tailwind output
    node/                       self-host entry, imports the same app
      src/index.ts
      Dockerfile
  packages/
    core/                       all business logic, runtime-agnostic
      src/
        db/
          schema.ts             Drizzle schema
          migrations/
        auth/
        classes/
        story/
        skills/
        portfolio/
        messages/
        notify/
        media/
        consent/
        audit/
        i18n/
          en.json
          pt-PT.json
        adapters/
          storage.ts            interface + R2 + local
          queue.ts              interface + Queues + local
          translate.ts          interface + LibreTranslate + noop
    ui/                         JSX components, no logic
  tests/
    unit/                       Vitest, Workers pool
    e2e/                        Playwright against wrangler dev
  scripts/
    seed.ts
    export-check.ts
  docker-compose.yml
  .github/workflows/
    ci.yml
    deploy.yml
```

---

## 8. Data schema (Drizzle, SQLite)

IDs are `text` primary keys generated with `nanoid(21)`. Timestamps are `integer` epoch milliseconds. Soft delete via `deletedAt` where GDPR erasure needs a tombstone; hard delete everywhere else.

```ts
schools        id, name, slug (unique), locale ('pt-PT'), timezone, createdAt
users          id, schoolId?, role, email? (unique), emailVerifiedAt?,
               displayName, firstName, lastInitial?, avatarSeed, locale,
               createdAt, deletedAt?
sessions       id, userId, expiresAt, createdAt, ipHash, userAgent
magic_links    id, email, tokenHash (unique), expiresAt, usedAt?
student_logins id, studentId (unique), classId, codeHash, rotatedAt
classes        id, schoolId, name, subject?, gradeLevel?, inviteCode (unique),
               commentsEnabled, archivedAt?, createdAt
class_members  id, classId, userId, role ('teacher'|'student'), status, joinedAt
               unique (classId, userId)
guardian_links id, guardianId, studentId, relationship, createdAt
               unique (guardianId, studentId)
consents       id, studentId, guardianId?, schoolId, type
               ('media_story'|'portfolio_family'|'translation'), granted,
               source ('guardian'|'school'), recordedAt, revokedAt?
skills         id, classId, name, icon, sortOrder, archivedAt?
recognitions   id, classId, studentId, skillId, teacherId, note?,
               visibility ('teacher'|'student'|'family'|'class'), createdAt
               index (classId, studentId, createdAt)
posts          id, classId, authorId, type ('story'|'announcement'|'event'),
               title?, body, eventAt?, pinned, allowComments, createdAt,
               updatedAt, deletedAt?
comments       id, postId, authorId, body, createdAt, deletedAt?
reactions      id, postId, userId, createdAt   unique (postId, userId)
media          id, ownerType ('post'|'portfolio'|'message'), ownerId,
               uploaderId, storageKey, mime, bytes, width?, height?,
               status ('pending'|'ready'|'rejected'), createdAt
portfolio_items id, studentId, classId, authorId, kind
               ('photo'|'text'|'audio'), title?, body?, mediaId?,
               status ('pending'|'approved'|'archived'), approvedBy?,
               approvedAt?, createdAt
threads        id, classId, teacherId, guardianId, studentId, lastMessageAt
               unique (classId, teacherId, guardianId, studentId)
messages       id, threadId, senderId, body, translatedBody?,
               translatedLocale?, readAt?, createdAt
notifications  id, userId, type, payload (json text), readAt?, createdAt
notify_prefs   userId (pk), email ('immediate'|'digest'|'off'),
               push ('immediate'|'off'), pushSubscription? (json text)
audit_log      id, actorId?, action, targetType, targetId, schoolId?,
               details (json text)?, ipHash?, createdAt
jobs           (self-host only) id, kind, payload, runAt, attempts, doneAt?
```

Constraints the agent must encode as Drizzle checks or service-level guards:

- `users.email` is NULL for every `role = 'student'` row. A test asserts this.
- No column anywhere stores a numeric behaviour value.
- `recognitions.visibility = 'class'` also creates a `posts` row of type `story` inside the same transaction.
- Any read of a full roster or any export writes `audit_log` in the same transaction.
- Media of `ownerType = 'portfolio'` or attached to a story post requires an active `consents` row of the matching type for that student before `status` can become `ready`.

---

## 9. Authentication

**Adults (teacher, guardian, admin):** email magic link. Token is 32 random bytes, stored as SHA-256 hash, 15 minute expiry, single use. Optional Google sign-in via `arctic`. Session cookie `aula_s`, `HttpOnly; Secure; SameSite=Lax`, 30 day rolling expiry, token hashed in `sessions`.

**Students:** no email, no password. Teacher prints or shares a login card: class invite code plus a per-student 6-character code. Teacher can rotate any code instantly. Sessions for students expire after 24 hours. A student session can only reach `/s/*` routes.

**Guardian to student linking:** teacher generates a one-time guardian invite per student (URL with 8-character code). Guardian opens it, signs in via magic link, link is created, consent screen shown immediately.

**CSRF:** HTMX requests carry `HX-Request`; state-changing routes additionally require a per-session token in the `X-CSRF` header set by `app.js`. Non-HTMX form posts include a hidden field.

**Rate limits:** magic link requests 5 per email per hour, student login attempts 10 per class code per 10 minutes, messages 60 per user per hour. KV counters.

---

## 10. Routes

Convention: HTML pages under role prefixes, HTMX fragments return partial HTML, JSON only where a client script needs it (uploads).

```
GET  /                         landing, or redirect by role
GET  /login                    magic link form
POST /login                    send link
GET  /auth/verify?t=           consume link
GET  /auth/google, /auth/google/callback
GET  /join                     student login form (code + student code)
POST /join
POST /logout

Teacher  /t
GET  /t                        dashboard: classes, unread, pending approvals
GET  /t/classes/new  POST /t/classes
GET  /t/c/:classId             class home (story)
GET  /t/c/:classId/roster      POST add student, POST import csv, GET export csv
GET  /t/c/:classId/roster/:studentId   student page: recognitions, portfolio, guardians
POST /t/c/:classId/roster/:studentId/invite   guardian invite
POST /t/c/:classId/roster/:studentId/rotate   rotate student code
GET  /t/c/:classId/skills      POST create, POST :skillId/archive
GET  /t/c/:classId/recognise   fragment: picker
POST /t/c/:classId/recognise
POST /t/c/:classId/posts       GET :postId/edit  POST :postId  DELETE :postId
POST /t/c/:classId/posts/:postId/pin
GET  /t/c/:classId/portfolio   pending queue
POST /t/portfolio/:itemId/approve  POST .../archive
GET  /t/messages               GET /t/messages/:threadId  POST /t/messages/:threadId
GET  /t/c/:classId/settings    POST

Guardian /g
GET  /g                        children, latest story, unread
GET  /g/child/:studentId       recognitions + portfolio
GET  /g/c/:classId             story
POST /g/posts/:postId/comments   POST /g/posts/:postId/react
GET  /g/messages  GET /g/messages/:threadId  POST /g/messages/:threadId
GET  /g/consent/:studentId     POST
GET  /g/settings               notification prefs, locale, export request

Student  /s
GET  /s                        my story, my recognitions
GET  /s/portfolio              POST add item
POST /s/posts/:postId/react

Shared
GET  /media/:mediaId           302 to signed URL after ownership check
POST /media/upload             returns {mediaId, uploadUrl} after validating mime and size
GET  /invite/:code             guardian invite landing
GET  /notifications            fragment, polled every 30s
POST /notifications/:id/read
POST /push/subscribe

Admin    /a  (school_admin)   /root (super_admin)
GET  /a                        teachers, classes, consent overview
GET  /a/audit                  filterable, exportable
GET  /a/export                 school ZIP
POST /a/erase/:userId          GDPR erasure with confirmation
GET  /root/schools  POST

Health  GET /healthz
```

---

## 11. Media pipeline

1. Client requests `/media/upload` with `{mime, bytes, ownerType, ownerId}`. Server validates against allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `audio/m4a`, `audio/mp4`, `audio/webm`. Limits: images 8 MB, PDF 10 MB, audio 20 MB. Returns a presigned R2 PUT URL and a `media` row with `status = pending`.
2. Client PUTs directly to R2. `app.js` handles this and swaps in a preview via HTMX.
3. Client posts the form. Server enqueues `media.process`.
4. Job: fetch object, sniff magic bytes (reject on mismatch), for images decode and re-encode with `@cf-wasm/photon` to WebP at max 2048px plus a 400px thumbnail. Re-encoding strips all EXIF. For PDF and audio, store as-is. Check consent if required. Set `status = ready` or `rejected`.
5. Serving: `/media/:id` verifies the actor can see the owner object, then 302s to a 15 minute signed URL. PDFs serve with `Content-Disposition: attachment` and a strict CSP.
6. If `CLAMAV_URL` is set (Hetzner box), the job POSTs the object for scanning before step 4. Otherwise the allowlist plus re-encode is the control, and `docs/self-hosting.md` says so plainly.

---

## 12. Notifications

Events that notify: new post, new recognition (respecting visibility), portfolio item approved, new message, guardian invite, pending portfolio item (teacher).

Flow: service emits `notify.<event>` to the queue with `{userIds, type, payload}`. Consumer writes `notifications` rows, then per user checks `notify_prefs`: `immediate` sends email and push now, `digest` marks for the 17:00 local digest job (Cron Trigger), `off` stores in-app only.

Email content renders in the recipient's `locale`. When the translation adapter is live and the source language differs, the body is translated once and cached on the source row (`translatedBody`, `translatedLocale`). Original always shown alongside translation with a "machine translated" label.

---

## 13. Translation

Adapter interface: `translate(text, from, to) => Promise<string>`. Implementations: `libretranslate` (Hetzner, `TRANSLATE_URL` + `TRANSLATE_KEY`), `noop`. Translation triggers: messages (both directions), posts (on read, cached per locale), notification emails. Consent type `translation` gates sending a family's messages to the external box; default on for the school as controller, revocable per guardian.

Hetzner box: CX22, Docker, LibreTranslate with `pt,en,uk,ar,ro,fr,de,zh` models, behind Caddy with a bearer key, Cloudflare Tunnel so no public port. This is the entire Hetzner footprint.

---

## 14. GDPR implementation

- **Roles:** school = controller, instance operator = processor. `docs/gdpr/dpa-template.md` ships in the repo. Every self-host README links it.
- **Lawful basis:** public task / legitimate interest of the school for core features; explicit guardian consent for media in the story, portfolio sharing, and external translation. Consent records store who, what, when, source.
- **Minimisation:** students have first name, last initial, avatar seed. No email, no birthday, no photo required.
- **Residency:** R2 jurisdiction `eu`, D1 location hint `weur`, Resend EU region, Hetzner Falkenstein. `docs/gdpr/residency.md` states which guarantees are contractual and which are hints, and the agent verifies against current Cloudflare docs at bootstrap (issue CLS-4).
- **Rights:** guardian and teacher can request export from settings; the job produces a ZIP (JSON + media) within minutes. School admin can erase a user: personal fields nulled, media deleted from R2, tombstone kept for referential integrity, audit entry written.
- **Retention:** class archive at year end; archived classes auto-erase student personal data after 24 months unless the school changes the setting. Messages follow the same clock. Audit log kept 5 years.
- **Records:** `docs/gdpr/ropa.md` lists processing activities. Kept current by the agent whenever a new data flow lands (CI check greps for new adapters without a ROPA line).
- **Breach:** `SECURITY.md` with a 72-hour internal process.

FERPA and COPPA: mapping document only in v1 (`docs/compliance/us.md`). No code changes needed because the model already exceeds both.

---

## 15. Engineering conventions

- TypeScript strict, `noUncheckedIndexedAccess`, zero warnings in `tsc` and Biome. CI fails on any warning.
- Every service function signature: `(ctx: Ctx, actor: Actor, input: Validated) => Promise<Result>`. `Ctx` carries db, storage, queue, translate, now, log. Nothing reaches for a global.
- Validation with `valibot` at the route edge, never inside services.
- Every route test covers: correct role succeeds, each wrong role gets 403, unauthenticated gets 302 to login.
- Migrations generated by `drizzle-kit`, committed, applied in CI with `wrangler d1 migrations apply`. Never edited after merge.
- Accessibility: WCAG 2.2 AA. Every form control labelled, focus visible, reduced motion respected, contrast checked by an axe run in Playwright.
- Performance budget: any page under 60 KB transferred, Lighthouse performance 95+ on a throttled mobile profile, checked in CI on three pages (login, teacher class, guardian home).
- Copy: all strings via `t('key')`. CI fails on any JSX text node that is not a translation call. `pt-PT` and `en` complete at every merge.
- No em dashes anywhere in UI copy or docs.
- Commits: conventional commits, one Linear issue key per commit.

---

## 16. Verification suite (gates)

Playwright E2E runs against `wrangler dev` with a seeded D1. All must pass with exit 0 before a module closes.

1. **Roster.** Teacher creates class, adds student via form and via CSV. Student row has `email = null`. Roster export writes an audit entry.
2. **Student login.** Student signs in with class code + student code, sees only `/s/*`. Rotating the code invalidates the old one within one request.
3. **Guardian link.** Teacher generates invite, guardian accepts via magic link, consent screen recorded. Guardian with no link gets 403 on any other student's page.
4. **Recognition.** Teacher recognises a skill with each visibility level. `teacher` visibility is invisible to student and guardian. `class` visibility creates a story post. No response body anywhere contains a numeric total.
5. **Story.** Post with photo. Photo `status` moves `pending` to `ready` after the job. Served URL expires. EXIF absent on the stored object. Comments hidden when disabled. Reaction shows heart, never a count, to students.
6. **Portfolio.** Student submits item, guardian cannot see it, teacher approves, guardian sees it. Item with missing media consent stays `pending`.
7. **Messaging.** Guardian messages teacher. Second guardian of the same student cannot read the thread. Student cannot reach `/g/messages`. Rate limit returns 429 on the 61st message.
8. **Notifications.** Each event produces a row, respects prefs, digest job batches. Email renders in `pt-PT` for a `pt-PT` user.
9. **GDPR.** Export ZIP contains every row referencing the user. Erasure nulls fields, removes R2 objects, keeps tombstone, writes audit.
10. **Self-host.** `docker compose up` on a clean machine, seed, run tests 1 to 9 against Node + SQLite + local storage. Identical results.
11. **Quality.** Zero warnings, Lighthouse 95+, axe zero violations, i18n completeness.

---

## 17. Build order

Weeks are calendar estimates for the four-agent factory. Gates are the real sequence.

| Wk | Module | Gate |
|---|---|---|
| 1 | Foundation: repo, Worker, D1, R2, Queues, Drizzle, Biome, CI, deploy to `workers.dev (domain in CLS-1)`, ADRs, i18n scaffold, UI primitives | CI green, `/healthz` live on Cloudflare and in Docker |
| 2 | Auth: magic link, Google, sessions, student login, CSRF, rate limits | Tests 2 and 3 partial |
| 3 | Classes and rosters, CSV, guardian invites, consent, audit | Tests 1, 3 |
| 4 to 5 | Class story, media pipeline, reactions, comments | Test 5 |
| 6 | Skills and recognition | Test 4 |
| 7 | Portfolio | Test 6 |
| 8 | Messaging | Test 7 |
| 9 | Notifications, push, digest, translation adapter, Hetzner box | Test 8 |
| 10 | Admin, export, erasure, retention jobs, self-host Docker path | Tests 9, 10 |
| 11 | Accessibility, performance, security review, `pt-PT` copy pass with the pilot teacher | Test 11 |
| 12 | Pilot onboarding at the ready school. Fixes only. | Teacher onboarded in under 5 minutes, 80% of guardians joined within 2 weeks |

v1.0 tags when the pilot class runs two full weeks without a P1 issue.

---

## 18. Bootstrap: what Claude Code does in session one

Run in order. Do not stop to ask unless a command fails twice.

1. Repo already exists: `sebastianbrosche/aula-`. Clone it. Do not create another repo. Do not rename it.
2. Write `CLAUDE.md` (Section 19), `AGENTS.md`, copy this file to `docs/handoff.md`, write the twelve ADRs from Section 2.
3. `pnpm init`, workspaces, Biome, tsconfig, `apps/worker` with Hono + `hono/jsx`, `wrangler.toml` with D1 (`aula`), R2 (`aula-media`, jurisdiction eu), Queue (`aula-jobs`), KV (`aula-kv`), Static Assets. `apps/node` with `@hono/node-server`.
4. `packages/core` with Drizzle schema from Section 8, adapters with both implementations, i18n with `en.json` and `pt-PT.json` containing the auth and layout keys.
5. `drizzle-kit generate`, commit migration 0000.
6. GitHub Actions: `ci.yml` (install, biome, tsc, vitest, playwright on wrangler dev, lighthouse), `deploy.yml` (wrangler deploy on main).
7. `wrangler login` guidance in README; create D1, R2, KV, Queue via `wrangler` and put IDs in `wrangler.toml`. Deploy `/healthz`.
8. Linear via MCP: create team `aula` (key `CLS`), labels from Section 20, one project per build-order row, issues from Section 20 with the verification gate pasted into each project description.
9. Open PR `chore: foundation` and assign issue CLS-1 to itself.
10. Report: repo URL, staging URL, Linear project URL, and any command that needed a retry.

---

## 19. CLAUDE.md contents

```
# aula

Read docs/handoff.md before any change. It is the contract.

Stack: Hono + hono/jsx on Cloudflare Workers, HTMX, Tailwind 4, D1 + Drizzle (SQLite everywhere), R2, Queues, KV. Self-host: same app on Node with SQLite and local disk.

Rules
- Deny by default. Every service function checks the actor before the database. Routes never call Drizzle.
- No numeric behaviour values, no rankings, no negative recognition types. Ever.
- Students have no email. Ever.
- Every user-facing string is t('key') with en and pt-PT entries.
- Zero warnings. Biome + tsc strict. CI enforces.
- Every route has role tests: success, each forbidden role, unauthenticated.
- Roster reads and exports write audit_log in the same transaction.
- Media never public. Signed URLs, 15 minutes.
- No em dashes in copy or docs.
- New dependency needs an ADR line in the PR description.

Commands
pnpm dev            wrangler dev with local D1/R2
pnpm dev:node       self-host mode
pnpm test           vitest
pnpm e2e            playwright
pnpm check          biome + tsc
pnpm db:generate    drizzle-kit
pnpm db:migrate     apply locally

Linear: one issue per PR, key in every commit. Move to "In Review" when CI is green.
```

---

## 20. Linear structure

Team: `aula` (`CLS`). Workflow states: Backlog, Ready, In Progress, In Review, Verified, Done. "Verified" means the module's gate test passed on staging.

Labels: `area:auth`, `area:classes`, `area:story`, `area:skills`, `area:portfolio`, `area:messages`, `area:notify`, `area:media`, `area:gdpr`, `area:admin`, `area:selfhost`, `area:infra`, `type:decision`, `type:bug`, `agent:plan`, `agent:build`, `agent:review`, `agent:verify`, `pilot`.

Projects: one per build-order row (Foundation, Auth, Rosters, Story, Skills, Portfolio, Messaging, Notifications, Admin and GDPR, Hardening, Pilot).

Initial issues:

- CLS-1 Register domain and handles for aula; confirm no conflicting EU trademark (search EUIPO, note result in ADR-0013). Repo slug `aula-` stays.
- CLS-2 Foundation scaffold per Section 18 steps 3 to 7
- CLS-3 ADRs 0001 to 0012 committed
- CLS-4 Verify Cloudflare EU residency guarantees for D1, R2, Queues against current docs; update docs/gdpr/residency.md
- CLS-5 UI primitives in packages/ui: layout, button, input, card, avatar, empty state, toast
- CLS-6 i18n scaffold and CI completeness check
- CLS-7 Magic link auth
- CLS-8 Google OAuth
- CLS-9 Student login cards and rotation
- CLS-10 Sessions, CSRF, rate limits
- CLS-11 Classes CRUD, invite codes
- CLS-12 Roster add, CSV import and export with audit
- CLS-13 Guardian invites and linking
- CLS-14 Consent screen and records
- CLS-15 Media upload and processing job
- CLS-16 Story posts, pin, events
- CLS-17 Comments and reactions
- CLS-18 Skills CRUD
- CLS-19 Recognition flow and visibility
- CLS-20 Student and guardian recognition views
- CLS-21 Portfolio items and approval queue
- CLS-22 Portfolio ZIP export
- CLS-23 Threads and messages
- CLS-24 Message rate limits and read state
- CLS-25 Notification pipeline and prefs
- CLS-26 Web push
- CLS-27 Daily digest cron
- CLS-28 Translation adapter and Hetzner LibreTranslate box
- CLS-29 School admin panel and audit view
- CLS-30 Data export job
- CLS-31 Erasure and retention jobs
- CLS-32 Self-host Node entry, Docker Compose, docs/self-hosting.md
- CLS-33 Accessibility pass with axe in CI
- CLS-34 Performance budget and Lighthouse in CI
- CLS-35 Security review checklist (OWASP ASVS L2 subset)
- CLS-36 pt-PT copy review with pilot teacher
- CLS-37 Pilot onboarding runbook and feedback capture

Each issue description contains: acceptance criteria copied from the relevant gate test, the files it will touch, and the label set. The plan agent writes those on creation.

---

## 21. Seed data

`scripts/seed.ts` creates: one school (Escola Básica Exemplo, `pt-PT`), one teacher (`teacher@aula.test`), one class (`4.º B`, invite `SAL4B1`), three students (first name + last initial only) with login codes printed to stdout, one guardian (`guardian@aula.test`) linked to the first student with all consents granted, five skills (Ajudar os outros, Persistência, Curiosidade, Trabalho em equipa, Gentileza), two posts, one recognition per visibility level, one pending portfolio item, one thread with two messages. Deterministic IDs so E2E tests reference them by constant.

---

## 22. Success metrics for v1.0

| Metric | Target |
|---|---|
| Teacher onboarding, first post published | under 5 minutes |
| Guardian join rate in pilot class | over 80% in 14 days |
| Lighthouse mobile performance | 95+ |
| Accessibility | WCAG 2.2 AA, axe zero violations |
| Page weight | under 60 KB transferred |
| Test coverage | every route with role tests, every gate green |
| Monthly hosting cost for a 20-class school | EUR 0 on Cloudflare, EUR 4 Hetzner if translation enabled |

---

## 23. Open items

None blocking. Two non-blocking:

- ADR-0013 (name clearance) depends on CLS-1 findings.
- Passkeys and SSE live updates are v1.1 and already have adapter seams.

End of contract.
