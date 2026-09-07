# ADR-0018: native clients, landing page, speed over calendar

- Status: accepted
- Date: 2026-09-07
- Supersedes: Christmas 2026 / January ClassDojo exit as the operating deadline (ADR-0014 "Christmas" section, BUILD.md, docs/plan.md, docs/handoff.md banner)
- Related: ADR-0014 (product shape), ADR-0017 (philosophy)

## Decision

Ship something people can try, then learn from real schools. Do not wait on a school-year calendar.

The operating goal is:

1. A tryable app within a couple of days
2. A public landing page
3. Recruit schools that want to try it
4. Iterate from real use

Christmas 2026 and "leave ClassDojo before the January semester" were an earlier target. They are historical. They are not the primary deadline in active docs.

## First user-facing clients

The first clients parents and teachers use are **native iOS and Android apps**, built with Claude. Claude has iOS and Android emulators. That is how the first clients are written and checked.

The **server of truth** stays the Cloudflare Worker: Hono, API, MCP, D1, R2, Queues, KV. Same deny-by-default rules. Same visibility. Self-host remains the same app on Node with SQLite and local disk.

Do not pretend an HTMX-only web app is the v1 client. HTMX on the Worker may exist later for operator or admin pages. It is not the parent or teacher product for first pilots.

## Landing

A public landing page ships early, next to the first tryable clients. Its job is to explain aula in a few lines and let a school say they want to try. It is not a long web product.

## Build order consequence

QUEUE puts landing and native clients early, right after a living Worker, adult login, and one group. It does not put them after a long web-only path.

A couple-of-days tryable cut is: server alive, adults can join one group, landing is up, iOS and Android can be opened, feed and quiet comms start, privacy and bug-report are in. Deeper API, Home/Alexa, wishes, and ICS follow. Wave-2 after first pilots is listed in ADR-0019 (media save, excursion payments).

## Why

A calendar date you have not shipped toward is not a plan. A school that can tap a real app will tell you what is wrong. Velocity of that loop (ADR-0020) matters more than starting behind a competitor.

## Out

- Treating Christmas or January as the current success metric
- Building a full HTMX web classroom as v1
- Renaming the repo or splitting a second app repo for mobile
