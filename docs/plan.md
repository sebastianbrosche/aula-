# Launch plan

Status: accepted. Contract: [docs/handoff.md](handoff.md). Name: **aula**.

Repo: sebastianbrosche/aula-
Host: Cloudflare Workers (`workers.dev` until CLS-1 domain)

## What we are building

A ClassDojo / Seesaw / Bloomz replacement schools own. Keep story, portfolios, family messages, translation. Drop points, leaderboards, streaks, lock-in.

Pilot in Portugal. Zero budget. Cloudflare free tier.

## Calendar (today is 7 Sep 2026)

Christmas is the **ship date for the full app**, not a reduced feature list.

| When | What |
| --- | --- |
| Now through Nov | Build the six modules in order. Each gate goes live. Schools can start as soon as rosters + story + messages work. |
| Late Nov | One or two other schools on aula. They report bugs. Fixes only after that, no new modules. |
| Christmas 2026 | Full v1.0 in the operator's school. They leave ClassDojo over the break. |
| January 2027 | Next semester. They are off ClassDojo. |

## Sequence (Section 17)

| Wk | Dates (2026) | Module | Gate |
| --- | --- | --- | --- |
| 1 | 8-14 Sep | Foundation: Worker, D1, R2, Queues, Drizzle, CI, `/healthz` | CI green, health live |
| 2 | 15-21 Sep | Auth: magic link, optional Google, student login cards, CSRF | Tests 2 and 3 partial |
| 3 | 22-28 Sep | Classes, rosters, CSV, guardian invites, consent, audit | Tests 1, 3 |
| 4-5 | 29 Sep-12 Oct | Class story, media pipeline, reactions, comments | Test 5 |
| 6 | 13-19 Oct | Skills and recognition (no points column) | Test 4 |
| 7 | 20-26 Oct | Portfolio | Test 6 |
| 8 | 27 Oct-2 Nov | Messaging | Test 7 |
| 9 | 3-9 Nov | Notifications, push, digest, translation adapter | Test 8 |
| 10 | 10-16 Nov | Admin, export, erasure, self-host Docker | Tests 9, 10 |
| 11 | 17-23 Nov | a11y, performance, security, pt-PT copy | Test 11 |
| 12 | 24 Nov-25 Dec | Other schools pilot, bugs, then operator school | Teacher onboarded under 5 minutes |

## Next slice

CLS-2 foundation Worker and `/healthz`. Stop there.

## Not this plan

A WhatsApp-only wall. A Christmas edition without skills or portfolio.
