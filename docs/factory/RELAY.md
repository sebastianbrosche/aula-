# RELAY

One slice. Write a handoff. Stop.

This is how aula is built. Every session is one runner in a relay. The next runner only has git.

## Before you write code

1. Read [BUILD.md](../../BUILD.md) and [docs/plan.md](../plan.md). Christmas only.
2. Read [CURRENT.md](CURRENT.md) and [QUEUE.md](QUEUE.md).
3. Read the latest file in [handoffs/](handoffs/).
4. Confirm the product name is aula (ADR-0013).

## During the slice

- Do only the open slice (`CURRENT.md` `next_up`, or the slice named in the session prompt).
- Do not start the next slice "while you are here".
- Do not scaffold Worker unless this session is CLS-2.
- No wrangler unless the open slice says so.
- No child's name in fixtures or copy.
- User-facing strings: pt-PT and en.

## When the slice is done

1. Copy [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md) to `handoffs/YYYYMMDD-<slice-id>-<short>.md`.
2. Fill every section. Say what you did not do.
3. Set [CURRENT.md](CURRENT.md): `status: ready_for_next`, `next_up` to the following slice.
4. Mark the slice done in [QUEUE.md](QUEUE.md).
5. Stop.

## Status values

| status | meaning |
| --- | --- |
| `in_progress` | this session owns the slice |
| `ready_for_next` | slice is on main, next runner may start |
| `blocked` | cannot continue; handoff must say why |

## Do not

- Do not create another GitHub repo
- Do not rename `sebastianbrosche/aula-`
- Do not build Not-Christmas features
- Do not log children in
- Do not add points, Plus, Google login, student cards, skills, or portfolio
