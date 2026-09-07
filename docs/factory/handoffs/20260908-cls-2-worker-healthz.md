# Handoff: CLS-2 Worker that is alive

- slice: CLS-2
- date: 2026-09-08
- status: ready_for_next
- next_up: CLS-3
- agent: cloud
- ticket: AULA-API-1 / CLS-2

## What shipped

- pnpm workspaces, Biome, TypeScript strict, Vitest, GitHub Actions `ci.yml`
- Hono Worker in `apps/worker` (ADR-0001)
- D1 + Drizzle schema + migration 0000 (ADR-0002)
- `GET /healthz` `{ "ok": true }`
- Magic link for adults (ADR-0006). Resend when configured. Demo buttons when `DEMO_LOGIN=1`
- Pinheiros seed: teacher, parent, three child handles, group, feed, tomorrow/bring/last-minute
- HTML click-through for group, feed, tomorrow, privacy/YOLO, bug-report stub
- JSON `/v1/*` for the same surfaces
- API contract: `docs/api/contract.md`
- Cloudflare resources created: D1 `aula`, R2 `aula-media`, KV `aula-kv`

## What did not

- No Google OAuth (follow-up; no console clicks tonight)
- No kid login / student cards
- No iOS or Android edits
- Did not edit README.md, BUILD.md, QUEUE.md, or docs/adr/*
- Did not mark QUEUE.md (docs PR may own it)
- Runtime schema apply is gated to first request so preview can boot without a separate migrate step
- R2 bucket was created without EU jurisdiction (API had no jurisdiction field). Follow-up: recreate as `eu` if required (ADR-0003)

## Files

- apps/worker/**
- apps/node/**
- packages/core/**
- docs/api/contract.md
- docs/factory/handoffs/20260908-cls-2-worker-healthz.md
- .github/workflows/ci.yml
- package.json, pnpm-workspace.yaml, biome.json, tsconfig.base.json

## How to verify

```
pnpm install
pnpm check
pnpm test
pnpm dev
curl -s http://127.0.0.1:8787/healthz
```

Expected: `{"ok":true}`

Morning login: open the Worker URL, tap Enter as teacher or Enter as parent.

Deploy (from a box with wrangler login):

```
cd apps/worker
pnpm exec wrangler d1 migrations apply aula --remote
pnpm exec wrangler deploy
```

Optional: `wrangler secret put RESEND_API_KEY`

## Risks / follow-ups

- CLS-3 can replace demo buttons with email-only once Resend is on
- Google OAuth later
- Docs agent should mark CLS-2 done in QUEUE.md
- Recreate R2 with EU jurisdiction if the dashboard allows

## Christmas check

- Still in: group, invite, parent join, story + photos, messages, email notify, export, erase, pt-PT and en
- Still out: student cards, skills, portfolio, Google login, points
- Name is aula. Children do not log in. No child's given name in fixtures.

## Next runner reads

1. docs/api/contract.md
2. This handoff
3. BUILD.md
4. docs/factory/QUEUE.md
