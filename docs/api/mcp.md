# aula MCP (read only)

ADR-0015. Agents ask the same questions as Home: what is school tomorrow, what to bring, the week, recent stories, a quiet ask. Write is out of v1.

Base: the Worker origin. Session cookie `aula_s` is required for tool calls. `tools/list` is public.

## Tools

| Name | Returns |
| --- | --- |
| `aula_tomorrow` | `{ day, happening, bring, updates[] }` |
| `aula_bring` | `{ bring, updates[] }` |
| `aula_week` | `{ tomorrow, story[], highlights[], notes[] }` |
| `aula_story` | feed posts the actor may see |
| `aula_ask` | `{ question, answer, source: "template" }` from feed + tomorrow. No model |

Visibility matches the human app. Photo opt-out still applies (`photo declined`). The opted-out parent still sees the child's handle. Other adults do not.

On the Pinheiros seed (English default):

- tomorrow happening: garden
- bring: hat
- last-minute notes: road, library bag (Thursday)
- `aula_week.notes` is those updates. `highlights` are feed previews (garden, music, boxes, assembly)
- Portuguese locale (`aula_locale=pt-PT`): jardim, chapeu, estrada, biblioteca

## HTTP sketch

`GET /mcp` lists tools (`{ tools, write: false }`). Send `Accept: text/html` for a short page.

`POST /mcp`

```
{ "method": "tools/list" }
{ "method": "tools/call", "params": { "name": "aula_tomorrow" } }
{ "method": "tools/call", "params": { "name": "aula_ask", "arguments": { "q": "What is school tomorrow?" } } }
```

Same answers as `GET /v1/tomorrow`, `GET /v1/bring`, `GET /v1/week`, `GET /v1/feed`, `GET /v1/ask`. Tools never write.

How it will work for Grok / Claude later: the adult signs in, the agent holds that session (or a later bearer token), and calls these tools. No write tools in v1. No student token.

## Not in v1

- Write (post, invite, consent changes) through MCP
- ICS calendar subscribe (ADR-0015 item 1)
- Google Home / Alexa voice (same read API, later connector)
