# AGENTS.md

Factory contract for aula. Product contract: [docs/handoff.md](docs/handoff.md). Relay: [docs/factory/RELAY.md](docs/factory/RELAY.md).

## Product

aula is the classroom app that schools own, teachers trust, and children never feel ranked by.

- Name: **aula** (ADR-0013)
- Six v1 modules: rosters, story, skills, portfolio, messaging, notifications
- No points. No leaderboards. No student emails.
- Locales: pt-PT and en
- Repo: `sebastianbrosche/aula-`

## Roles

- Plan agent: Linear issues, ADRs, does not write app code
- Build agent: one slice from QUEUE, then handoff
- Review agent: contract + tests
- Verify agent: Section 16 gates on staging

## How to work

1. Read CLAUDE.md, docs/handoff.md Sections 0-6 and 17, CURRENT.md, QUEUE.md, latest handoff.
2. Do only `next_up`.
3. Write `docs/factory/handoffs/YYYYMMDD-<slice-id>-<short>.md`.
4. Update CURRENT.md and QUEUE.md.
5. Stop.

## Linear

Team key `CLS`. One issue per PR. States: Backlog, Ready, In Progress, In Review, Verified, Done.

## CLS-2

Foundation Worker only. No auth, no story, no waitlist in that session.
