# ADR-0001: Hono on Cloudflare Workers

- Status: accepted
- Contract: docs/handoff.md Section 2

Hono with server-rendered JSX and HTMX. Rejected: Next.js, Remix, React SPA.

One runtime, one deploy, no hydration, no client bundle beyond HTMX for any HTML the Worker serves.

## Scope note (ADR-0018)

This decision is the **server**. Hono on Workers remains the API, MCP host, and any HTML admin. It does not mean the first parent and teacher clients are HTMX web pages. Those clients are native iOS and Android, built with Claude (ADR-0018).
