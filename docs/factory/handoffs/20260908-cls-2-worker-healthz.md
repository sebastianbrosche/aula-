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
- `GET /healthz` `{ "ok": true, "sha" }` (no D1). SHA from `GIT_SHA`, then `WORKERS_CI_COMMIT_SHA`, then baked `BUILD_SHA`
- Magic link for adults (ADR-0006). Real Resend send when `RESEND_API_KEY` is set. `RESEND_FROM` if present; else `aula <login@m1.heatlagos.com>`. Printed `previewUrl` only when Resend is unset or send fails, and only if `DEMO_LOGIN=1`. Demo failure also returns a short `reason` (status + truncated body).
- Google OAuth routes wired. Morning redirect URI: `https://aula.sebastian-brosche.workers.dev/auth/google/callback`. 503 until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are on the Worker
- Student card stubs always 403 `children_do_not_log_in`
- Pinheiros seed: teacher Ana Costa, parent Rui Mendes, children Cedar/Oak/River, group 4.o B / PIN4B1, feed (including music story + garden photo caption), tomorrow/bring/last-minute plus Thursday library bag
- Group create / invite / join stubs on D1
- Teacher feed create: real R2 put when `MEDIA` is bound and a file is sent; otherwise `{ storage: "stub", uploaded: false }` with no `mediaKey`
- Week and bring JSON, MCP read tools (`docs/api/mcp.md`) aligned with Pinheiros seed (jardim, chapeu, estrada)
- Dual SEO landing + public `/privacy` consent copy. Guardian switches persist via `savePrivacy`. Teacher `/t/privacy` is read-only quiet defaults
- Adult `POST /bugs` intake stores who, role, path, note, timestamp, sha. Press-and-hold from chrome prefills `from=`
- Teacher DM request, parent accept/decline, simple thread after accept (`/t/dm`, `/g/dm`, `/v1/dm`)
- Photo opt-out redacts that child's handle for other adults with `foto recusada` / `photo declined`. The opted-out parent still sees the name
- Tomorrow garden visit one-tap (`POST /v1/excursion`). YOLO auto-approves and writes a consent row
- Long feed posts truncate with Ler mais / Read more. Photo and video rows show an attachment stub
- Adult one-click Resumo / Summary from existing feed and tomorrow notes. Template only. Nothing extra stored
- JSON `/v1/*` for the same surfaces
- API contract: `docs/api/contract.md`

## What did not

- No live Google login on this VM (secrets not in the environment; Builder can inject at deploy)
- Signed 15-minute R2 read URLs are not in this slice. Recreate bucket as EU if required (ADR-0003)
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

Expected: `{"ok":true,"sha":"..."}`

Morning login: open the Worker URL, tap Enter as teacher or Enter as parent.

Deploy (from a box with wrangler login):

```
cd apps/worker
pnpm exec wrangler d1 migrations apply aula --remote
GIT_SHA=$(git rev-parse HEAD)
pnpm exec wrangler deploy --var GIT_SHA:$GIT_SHA
pnpm exec wrangler secret put RESEND_API_KEY
# optional: pnpm exec wrangler secret put RESEND_FROM
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

Redirect URI to allowlist: `https://aula.sebastian-brosche.workers.dev/auth/google/callback`

Default Resend from when `RESEND_FROM` is unset: `aula <login@m1.heatlagos.com>`

## Risks / follow-ups

- Claim or replace the temporary workers.dev URL; Bot Fight blocks curl
- Docs agent should mark CLS-2 done in QUEUE.md
- Recreate R2 with EU jurisdiction if the dashboard allows
- Native clients: do not build student cards
- Override `RESEND_FROM` only if the default `aula <login@m1.heatlagos.com>` should not be used

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
