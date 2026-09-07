# AGENTS.md

Contract for every agent that touches aula.

## Product

aula is the free wall and inbox for a small group that lives on WhatsApp.

- Name: **aula** (ADR-0013)
- One-liner: aula - a sala do grupo, fora do WhatsApp.
- No points. No Plus.
- Children do not log in.
- Photos stay on the wall. They are not copied onto every phone.
- Languages: pt-PT and English.
- Repo: `sebastianbrosche/aula-`. Do not create another. Do not rename it.

## Christmas (in)

Coordinator creates a group, invite link, parent joins with email + child first name + last initial + photo consent, story + photos, coordinator-to-parent messages, email notify, export, erase.

## Christmas (out)

Student cards, skills, portfolio, Google login, points.

## How to work

1. Read [BUILD.md](BUILD.md), [docs/plan.md](docs/plan.md), [docs/factory/RELAY.md](docs/factory/RELAY.md), [docs/factory/CURRENT.md](docs/factory/CURRENT.md), [docs/factory/QUEUE.md](docs/factory/QUEUE.md), latest handoff.
2. Do one slice. The slice is `CURRENT.md` `next_up` unless the session prompt names a different open slice.
3. Write `docs/factory/handoffs/YYYYMMDD-<slice-id>-<short>.md` from [docs/factory/HANDOFF-TEMPLATE.md](docs/factory/HANDOFF-TEMPLATE.md).
4. Update `CURRENT.md` and `QUEUE.md`.
5. Stop. Do not start the next slice in this session.

## Copy and names

- Product name is aula. Never a discarded working name.
- Never a child's real or invented given name in fixtures, screenshots, copy, or docs. Use "first name" and "last initial".
- No em dashes in new writing.
- User-facing strings exist in pt-PT and en.

## CLS-0 / CLS-2

- CLS-0: public repo, MIT, these docs. No Worker. No wrangler.
- CLS-2: Worker. Only when this session is CLS-2.
