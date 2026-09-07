# BUILD.md

Name: **aula**. One school. Repo: [sebastianbrosche/aula-](https://github.com/sebastianbrosche/aula-).

Philosophy: [docs/adr/0017-low-load-ai-first.md](docs/adr/0017-low-load-ai-first.md).

You should not have to learn this app. You should not have to open it. Ask Home, Alexa, or Grok what school is tomorrow and what to bring. The feed exists so there is something true to ask about. Quiet is the default. Helping is opt-in.

## v1

- Teacher feed: photos and videos of the day. Free. Early, because it is easy
- "Tomorrow": what is happening, what to bring, last-minute changes (road blocked, leave early)
- API + MCP first, then Google Home and Alexa on the same answers
- Announcements you only react to. Threads. Mentions. DMs
- Subgroups you can mute. Visibility. Filters
- Wish pool for teachers. Opt-in
- Calendar subscribe
- Email, export, erase
- Adults only

## Out

Points, Plus, tutors, kid login, a product you have to live in.

## Christmas

This whole thing working for the class, other groups already filing bugs, then the operator's school leaves ClassDojo before January.

## Next build

A Worker that answers `/healthz`. Then login, then a group, then the feed, then the API that Home and Grok can ask.
