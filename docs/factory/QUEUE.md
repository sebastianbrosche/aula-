# QUEUE

Source: docs/handoff.md Section 20. One slice per session.

| ID | Status | Slice |
| --- | --- | --- |
| CLS-0 | done | Public repo, MIT, docs. No Worker |
| CLS-1 | queued (human) | Domain and handles for aula. EUIPO note in ADR-0013. Slug `aula-` stays |
| CLS-2 | next | Foundation: Worker, D1, R2, Queues, Drizzle, CI, `/healthz` (Section 18 steps 3-7) |
| CLS-3 | queued | ADRs 0001 to 0012 committed (can land with CLS-2) |
| CLS-4 | queued | Verify Cloudflare EU residency docs |
| CLS-5 | queued | UI primitives |
| CLS-6 | queued | i18n scaffold |
| CLS-7 | queued | Magic link auth |
| CLS-8 | queued | Google OAuth (optional) |
| CLS-9 | queued | Student login cards |
| CLS-10 | queued | Sessions, CSRF, rate limits |
| CLS-11 | queued | Classes CRUD, invite codes |
| CLS-12 | queued | Roster, CSV, audit |
| CLS-13 | queued | Guardian invites |
| CLS-14 | queued | Consent |
| CLS-15 | queued | Media pipeline |
| CLS-16 | queued | Story posts |
| CLS-17 | queued | Comments and reactions |
| CLS-18 | queued | Skills CRUD |
| CLS-19 | queued | Recognition, no points |
| CLS-20 | queued | Student and guardian recognition views |
| CLS-21 | queued | Portfolio items |
| CLS-22 | queued | Portfolio ZIP |
| CLS-23 | queued | Threads and messages |
| CLS-24 | queued | Message rate limits |
| CLS-25 | queued | Notification pipeline |
| CLS-26 | queued | Web push |
| CLS-27 | queued | Daily digest |
| CLS-28 | queued | Translation adapter |
| CLS-29 | queued | School admin and audit |
| CLS-30 | queued | Data export |
| CLS-31 | queued | Erasure and retention |
| CLS-32 | queued | Self-host Docker |
| CLS-33 | queued | Accessibility |
| CLS-34 | queued | Performance budget |
| CLS-35 | queued | Security review |
| CLS-36 | queued | pt-PT copy with pilot teacher |
| CLS-37 | queued | Pilot runbook |

Do not skip to story or a waitlist before CLS-2 passes `/healthz`.
