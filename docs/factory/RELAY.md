# RELAY

One slice. Write a handoff. Stop.

Contract: [docs/handoff.md](../handoff.md). Plan: [docs/plan.md](../plan.md).

## Before you write code

1. Read docs/handoff.md Sections 0-6 and 17.
2. Read CURRENT.md and QUEUE.md.
3. Read the latest handoff.
4. Name is aula (ADR-0013). Six modules. No points.

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
- Do not give students an email
- Do not cut skills or portfolio out of v1.0
