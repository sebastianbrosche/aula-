# Launch plan

Status: accepted. Contract: [docs/handoff.md](handoff.md). Name: **aula**.

Repo: sebastianbrosche/aula-
Host: Cloudflare Workers (`workers.dev` until CLS-1 domain)

## What we are building

A ClassDojo / Seesaw / Bloomz replacement schools own. Keep story, portfolios, family messages, translation. Drop points, leaderboards, streaks, lock-in.

Customer: a teacher (coordinator) and families. Pilot in Portugal. Zero budget. Cloudflare free tier.

## Sequence (Section 17)

| Wk | Module | Gate |
| --- | --- | --- |
| 1 | Foundation: Worker, D1, R2, Queues, Drizzle, CI, `/healthz` | CI green, health live |
| 2 | Auth: magic link, optional Google, student login cards, CSRF | Tests 2 and 3 partial |
| 3 | Classes, rosters, CSV, guardian invites, consent, audit | Tests 1, 3 |
| 4-5 | Class story, media pipeline, reactions, comments | Test 5 |
| 6 | Skills and recognition (no points column) | Test 4 |
| 7 | Portfolio | Test 6 |
| 8 | Messaging | Test 7 |
| 9 | Notifications, push, digest, translation adapter | Test 8 |
| 10 | Admin, export, erasure, self-host Docker | Tests 9, 10 |
| 11 | a11y, performance, security, pt-PT copy | Test 11 |
| 12 | Pilot. Fixes only. Target 15 Dec 2026 | Teacher onboarded under 5 minutes |

## Next slice

CLS-2 foundation Worker and `/healthz`. Stop there. Do not start auth, rosters, or a waitlist instead of the Worker.

## Not this plan

A WhatsApp-only wall. That was a CLS-0 cut. It is withdrawn.
