# AGENTS.md

Factory contract for aula. v1 product: [docs/adr/0014-comms-not-dojo.md](docs/adr/0014-comms-not-dojo.md). Stack: [docs/handoff.md](docs/handoff.md). Relay: [docs/factory/RELAY.md](docs/factory/RELAY.md).

## Product

aula is a quiet room for one school. Not ClassDojo.

- Name: **aula** (ADR-0013, ADR-0014)
- v1: announcements, threads, mentions, DMs, subgroups + mute, visibility + filters, story photos, email, export, erase
- No points. No kid login. No skills. No portfolio. No tutors.
- Locales: pt-PT and en
- Repo: `sebastianbrosche/aula-`

## Roles

- Plan agent: Linear issues, ADRs, does not write app code
- Build agent: one slice from QUEUE, then handoff
- Review agent: contract + tests
- Verify agent: Section 16 gates on staging

## How to work

1. Read CLAUDE.md, ADR-0014, CURRENT.md, QUEUE.md, latest handoff.
2. Do only `next_up`.
3. Write `docs/factory/handoffs/YYYYMMDD-<slice-id>-<short>.md`.
4. Update CURRENT.md and QUEUE.md.
5. Stop.

## Linear

Team key `CLS`. One issue per PR. States: Backlog, Ready, In Progress, In Review, Verified, Done.

## CLS-2

Foundation Worker only. No auth, no story, no waitlist in that session.
