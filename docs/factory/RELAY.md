# RELAY

One slice. Write a handoff. Stop.

Contract for v1 product: [docs/adr/0014-comms-not-dojo.md](../adr/0014-comms-not-dojo.md). Philosophy: [docs/adr/0017-low-load-ai-first.md](../adr/0017-low-load-ai-first.md). Clients and speed: [docs/adr/0018-native-landing-speed.md](../adr/0018-native-landing-speed.md). Privacy: [docs/adr/0019-privacy-consent-yolo.md](../adr/0019-privacy-consent-yolo.md). Loop: [docs/adr/0020-lightning-feedback-loop.md](../adr/0020-lightning-feedback-loop.md). Stack: [docs/handoff.md](../handoff.md) (engineering only; banner lists supersessions). Plan: [docs/plan.md](../plan.md).

## Before you write code

1. Read docs/handoff.md Sections 0-6 and 17.
2. Read CURRENT.md and QUEUE.md.
3. Read the latest handoff.
4. Name is aula (ADR-0013). v1 is comms (ADR-0014). First clients are native (ADR-0018). No points. No kid login.

## During the slice

- Do only `next_up`.
- CLS-2 is Worker `/healthz` only. No auth, no story, no waitlist.
- No child's given name in fixtures.
- User-facing strings: t('key'), pt-PT and en.

## When done

1. Write handoffs/YYYYMMDD-<slice-id>-<short>.md
2. CURRENT.md: ready_for_next, next_up set
3. Mark QUEUE.md
4. Stop

## Do not

- Do not create another GitHub repo
- Do not rename sebastianbrosche/aula-
- Do not add a points column
- Do not give children a login
- Do not build skills, portfolio, tutors, or Plus
