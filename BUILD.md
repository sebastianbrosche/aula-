# BUILD.md

Locked for v1: [docs/adr/0014-comms-not-dojo.md](docs/adr/0014-comms-not-dojo.md). Name: **aula**. Repo: [sebastianbrosche/aula-](https://github.com/sebastianbrosche/aula-).

The long [docs/handoff.md](docs/handoff.md) is the original engineering contract (stack, GDPR, deny-by-default). **v1 product scope is ADR-0014**, not the six ClassDojo modules.

aula is a quiet room for **one school**. It is not ClassDojo. It is not a points app. It is not a WhatsApp dump.

## Why it exists

WhatsApp: someone writes, a hundred people reply, you scroll forever. "We are late" goes to everyone. ClassDojo: story is useful, then points, kid login, Plus, tutors, islands.

## v1 (this is the Christmas app)

- Announcement channel: no replies, emoji react, thumbs up = I read it
- Main feed + **threads** so tangents stay off the stream
- **Mentions** / handles (who it is about)
- Direct messages
- Parent **subgroups** (birthday, surprise). Mute or decline invites
- **Visibility**: late-to-teacher stays with the teacher; "can someone watch my child" is for the group; a handle for a child is only that family + teacher
- **Filters**: gatherings off, birthdays on, how much spam you want
- Teacher **story + photos** on the wall, free, not on every phone
- Email notify, export, erase
- Adults only. Children do not log in
- pt-PT and en

## Out

Points, rewards, kid login, skills, portfolio, tutors, calendar Plus, memories paywall, learning islands, Google as required, multi-school.

## Christmas

Deadline for this full comms app, not a cut. Other groups try it and file bugs first. Operator school leaves ClassDojo before January.

## Stack

Hono + hono/jsx, HTMX, Tailwind 4, D1 + Drizzle, R2 EU, Queues, KV. One Worker.

## Next

CLS-2: Worker + `/healthz` only.
