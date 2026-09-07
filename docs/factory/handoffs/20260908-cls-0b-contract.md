# Handoff: CLS-0b restore v1.0 contract

> Historical. Six-module classroom MVP and Christmas-as-deadline language below are superseded by ADR-0014 and ADR-0018.

- slice: CLS-0b (docs only)
- date: 2026-09-08
- status: ready_for_next
- next_up: CLS-2
- agent: Grok Build
- repo: sebastianbrosche/aula-

## What shipped

- Operator pasted Build Handoff v1.0. That is the product: full classroom platform, not a WhatsApp wall.
- `docs/handoff.md` is that contract, restated for **aula** (ADR-0013).
- BUILD.md, docs/plan.md, QUEUE.md, CLAUDE.md, AGENTS.md, README.md aligned to six v1 modules.
- ADRs 0001 to 0012 from Section 2. ADR-0013 remains the name lock.
- Christmas = full v1.0 deadline. Other schools pilot first. Operator school leaves ClassDojo before January.

## What did not

- No Worker
- No wrangler
- No Linear issues yet (Section 18 step 8 is CLS-2-adjacent; do not block /healthz on Linear)
- No domain (CLS-1, human)

## Files

- docs/handoff.md
- BUILD.md
- docs/plan.md
- docs/factory/QUEUE.md
- docs/factory/CURRENT.md
- CLAUDE.md
- AGENTS.md
- README.md
- docs/adr/0001 through 0013
- this handoff

## How to verify

- docs/handoff.md Section 3.1 lists six modules including skills and portfolio
- README does not pitch a WhatsApp-only wall
- CURRENT next_up is CLS-2

## Next runner

CLS-2 only: Section 18 steps 3 to 7. Hono Worker, D1, R2 EU, Queues, KV, Drizzle schema start, `/healthz` on workers.dev. Stop. Do not build auth or story in that session.
