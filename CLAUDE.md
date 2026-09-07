# aula

Read [docs/adr/0014-comms-not-dojo.md](docs/adr/0014-comms-not-dojo.md) for v1 product. Read [docs/handoff.md](docs/handoff.md) for stack and GDPR. ADR-0014 wins on scope.

Stack: Hono + hono/jsx on Cloudflare Workers, HTMX, Tailwind 4, D1 + Drizzle (SQLite everywhere), R2, Queues, KV. Self-host: same app on Node with SQLite and local disk.

Name is **aula**. Repo is `sebastianbrosche/aula-`. Do not create another. Do not rename it.

Rules
- Deny by default. Every service function checks the actor before the database. Routes never call Drizzle.
- No numeric behaviour values, no rankings, no negative recognition types. Ever.
- Children do not log in. No kid login, no student cards, no points.
- No child's real or invented given name in fixtures. Child handle + last initial only.
- Every user-facing string is t('key') with en and pt-PT entries.
- Zero warnings. Biome + tsc strict. CI enforces.
- Every route has role tests: success, each forbidden role, unauthenticated.
- Roster reads and exports write audit_log in the same transaction.
- Media never public. Signed URLs, 15 minutes.
- No em dashes in copy or docs.
- No child's real or invented given name in fixtures. First name + last initial only.
- New dependency needs an ADR line in the PR description.
- One slice. Write a handoff. Stop.

Commands
pnpm dev            wrangler dev with local D1/R2
pnpm dev:node       self-host mode
pnpm test           vitest
pnpm e2e            playwright
pnpm check          biome + tsc
pnpm db:generate    drizzle-kit
pnpm db:migrate     apply locally

Linear: one issue per PR, key in every commit. Move to "In Review" when CI is green.

CLS-2 is foundation (Section 18 steps 3 to 7) and `/healthz` only.
