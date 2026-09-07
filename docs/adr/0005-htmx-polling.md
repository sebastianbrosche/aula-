# ADR-0005: HTMX polling in v1

- Status: accepted

Poll every 15s on any HTMX message and feed pages. SSE is a fast-follow. Rejected for v1: Durable Objects, WebSockets.

Native iOS and Android clients (ADR-0018) use the API. They are not HTMX pages. This ADR applies to Worker-rendered HTML only.
