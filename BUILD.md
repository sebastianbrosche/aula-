# BUILD.md

Christmas brief for aula. This file and [docs/plan.md](docs/plan.md) are the Christmas scope.

Repository: [sebastianbrosche/aula-](https://github.com/sebastianbrosche/aula-). Do not create another repo. Do not rename this one.

## Product

- Name: **aula**. Never use discarded working names in code, copy, or new docs.
- Pitch: free wall and inbox for a small group that lives on WhatsApp. No points. No Plus. Children do not log in.
- One-liner: aula - a sala do grupo, fora do WhatsApp.
- Photos stay on the wall. They are not copied onto every phone.
- Languages: pt-PT and English.

## Christmas product (ship this)

- Coordinator creates a group
- Invite link
- Parent joins with email + child first name + last initial + photo consent
- Children do not log in
- Story + photos
- Coordinator-to-parent messages
- Email notify
- Export
- Erase
- pt-PT and en

## Not Christmas (do not build)

- Student cards
- Skills
- Portfolio
- Google login
- Points

## Relay

- One slice per session
- Write a handoff
- Stop
- Do not start the next slice in the same session
- CLS-0 is this repo and these docs
- CLS-2 is Worker. Do not scaffold Worker in CLS-0. No wrangler in CLS-0.

## Factory files

| Path | Role |
| --- | --- |
| `CLAUDE.md` | Agent entry for Claude |
| `AGENTS.md` | Agent contract for every runner |
| `docs/plan.md` | Christmas plan and slices |
| `docs/handoff.md` | Product contract (banner: name is aula) |
| `docs/adr/0013-rename-aula.md` | Name is aula |
| `docs/factory/RELAY.md` | Relay rules |
| `docs/factory/CURRENT.md` | Live status |
| `docs/factory/QUEUE.md` | Slice queue |
| `docs/factory/HANDOFF-TEMPLATE.md` | Handoff shape |
| `docs/factory/handoffs/` | Written handoffs |

## CLS-0 done when

- These files are on `main`
- `docs/factory/CURRENT.md` is `ready_for_next` with `next_up: CLS-2`
- Handoff `docs/factory/handoffs/20260908-cls-0-repo.md` exists
- No Worker, no wrangler, no app scaffold
