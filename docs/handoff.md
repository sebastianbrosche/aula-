# Product contract

> Banner (ADR-0013): the product name is **aula**. Christmas scope is [BUILD.md](../BUILD.md) and [docs/plan.md](plan.md). The prior-named contract was not in the CLS-0 session. This file is that contract restated for aula.

aula is the free wall and inbox for a small group that lives on WhatsApp.

No points. No Plus. Children do not log in. Photos stay on the wall. They are not copied onto every phone.

One-liner: aula - a sala do grupo, fora do WhatsApp.

Languages: pt-PT and English.

Repo: `sebastianbrosche/aula-`. Do not create another. Do not rename it.

## Who

- **Coordinator**: creates the group, shares the invite, posts story and photos, writes to parents, can export, can erase the group.
- **Parent**: joins from the invite, reads the wall, receives coordinator messages and email notify, can export their join, can erase their join.
- **Child**: never an account. Never logs in. Stored as first name + last initial on the parent's join, plus photo consent.

## Christmas flows

1. Coordinator creates a group.
2. Coordinator copies an invite link and sends it however they already talk (often WhatsApp, once).
3. Parent opens the link and joins with email, child first name, last initial, and photo consent.
4. Coordinator posts a story and photos to the wall.
5. Coordinator sends a message to parents.
6. Parent gets email notify when there is something new.
7. Parent or coordinator can export.
8. Parent can erase their join. Coordinator can erase the group.

## Christmas out

Student cards. Skills. Portfolio. Google login. Points.

## Factory

Work is a relay. One slice, write a handoff, stop. See [docs/factory/RELAY.md](factory/RELAY.md).
