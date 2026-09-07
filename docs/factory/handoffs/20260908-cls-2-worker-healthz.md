# Handoff: CLS-2 Worker that is alive

- slice: CLS-2
- date: 2026-09-08
- status: ready_for_next
- next_up: CLS-3
- agent: cloud
- ticket: AULA-API-1 / CLS-2
- pr: https://github.com/sebastianbrosche/aula-/pull/2

## What shipped

- pnpm workspaces, Biome, TypeScript strict, Vitest, GitHub Actions `ci.yml`
- Hono Worker in `apps/worker` (ADR-0001)
- D1 + Drizzle schema + migration 0000 (ADR-0002)
- `GET /healthz` `{ "ok": true }` (no D1)
- Magic link for adults (ADR-0006). Resend when configured. Demo buttons when `DEMO_LOGIN=1`
- Google OAuth routes wired. 503 until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are on the Worker
- Student card stubs always 403 `children_do_not_log_in`
- Pinheiros seed: teacher, parent, three child handles, group, feed, tomorrow/bring/last-minute
- Group create / invite / join stubs on D1
- Teacher feed create stubs (photo/video stub storage)
- Week and bring JSON, MCP read tools (`docs/api/mcp.md`)
- Dual SEO landing + public `/privacy` consent copy. Guardian `POST /v1/consent`
- Public `POST /bug-report` intake
- HTML click-through for group, feed, tomorrow, privacy/YOLO, bugs
- JSON `/v1/*` for the same surfaces
- API contract: `docs/api/contract.md`

## What did not

- No live Google login on this VM (secrets not in the environment; Builder can inject at deploy)
- No real email send unless Resend is configured
- No R2 media upload (stub keys only). Recreate bucket as EU if required (ADR-0003)
- No kid login / student cards (product out)
- No iOS or Android edits
- Did not edit README.md, BUILD.md, QUEUE.md, or docs/adr/*
- This VM has no `CLOUDFLARE_API_TOKEN`. Temporary workers.dev preview may exist; stable deploy needs wrangler on a logged-in box

## Files

- apps/worker/**
- apps/node/**
- packages/core/**
- docs/api/contract.md
- docs/api/mcp.md
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
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

Redirect URI to allowlist: `https://<worker-host>/auth/google/callback`

## Risks / follow-ups

- Claim or replace the temporary workers.dev URL; Bot Fight blocks curl
- Docs agent should mark CLS-2 done in QUEUE.md
- Recreate R2 with EU jurisdiction if the dashboard allows
- Native clients: do not build student cards

## Christmas check

- Still in: group, invite, parent join, story + photos, messages, email notify, export, erase, pt-PT and en
- Still out: student cards, skills, portfolio, points
- Google login is now routed; still needs secrets + redirect URI
- Name is aula. Children do not log in. No child's given name in fixtures.

## Next runner reads

1. docs/api/contract.md
2. docs/api/mcp.md
3. This handoff
4. BUILD.md
5. docs/factory/QUEUE.md
