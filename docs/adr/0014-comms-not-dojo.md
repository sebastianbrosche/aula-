# ADR-0014: aula is quiet school comms, not a ClassDojo clone

- Status: accepted
- Date: 2026-09-08
- Supersedes for v1 scope: docs/handoff.md Sections 3, 4, 10, 17, 20 where they add skills, portfolio, student login, points-adjacent UX, tutors, calendar product, memories Plus, learning islands

## Decision

aula serves **one school**. It replaces the class WhatsApp (and the parts of ClassDojo people actually open) with a quiet room. It does not recreate ClassDojo.

ClassDojo is bloated: points, kid login, Plus photo locker, tutors, calendar upsell, learning islands. We will not ship those.

## v1 (quiet comms)

Timing and clients: ADR-0018. Privacy, consent, YOLO, and message UX: ADR-0019. Feedback loop: ADR-0020. This ADR is still the product shape.

1. **Announcements.** Teacher (or coordinator) posts. Nobody replies. Emoji react only. Thumbs up means "I read this."
2. **Main feed that does not drown.** Replies live in **threads**, not in the main stream.
3. **Mentions.** Tag the people it is about. Slack-style handles.
4. **Direct messages.** Parent to teacher, parent to parent when they choose. Parent-to-parent starts as an accept request (ADR-0019). Head and class teacher can always message everyone.
5. **Parent subgroups.** Birthday surprise, pickup pool, and so on. Invites can be **muted / declined**. Private people are not forced into spam.
6. **Visibility.** A late message for the teacher stays with the teacher. "Can someone watch my child" is visible to the group. If a post names a child via their join handle, only that child's guardians and the teacher see it. Do not parse real names from free text as a v1 magic trick; use handles, tags, and a late/teacher-only type.
7. **Filters.** Each adult sets categories they want: gatherings off, birthdays on, and so on.
8. **Story photos (the nicest thing).** Teacher posts what the children did. Parents open the wall, show the photos at home, and talk about the day. Free. No Plus. This is not a Memories upsell. Photo opt-out and optional save-out (Google Photos / Drive / iPhone) are ADR-0019.
9. **Calendar feed.** Birthdays, announcements with a date, school events. Subscribe with an `.ics` URL (Google Calendar, Apple, others). No Google login required. No paid "sync to calendar".
10. **Wish pool.** Parents send suggestions. Teacher taps them when planning. Tags: easy, repeat, needs-coordination. No votes. ADR-0016.
11. **AI connector.** Read-only HTTP API + MCP. Parent: week summary, birthdays. Teacher: recent wishes, for the drive in. Same visibility.
12. **Email notify, export, erase.** pt-PT and en.
13. Children do not log in.

## Explicitly out

Points, rewards, "needs work", kid login, student cards, skills as scores, portfolio product, tutors, homework islands, Memories Plus, Google login as the account, multi-school districts. Calendar exists as a free ICS feed, not as a ClassDojo Calendar tab.

## Why

Two jobs, equal: (1) see what the children did, with photos; (2) stop WhatsApp drowning everyone. Stay updated from Calendar and from an AI agent without living in the app. Teachers plan from a wish pool, including on the drive in.

## Christmas (superseded)

**Superseded by ADR-0018.** Christmas 2026 and leaving ClassDojo before the January semester were an earlier calendar target. They are historical. The operating goal is a tryable native app, a landing page, schools that want to try, then iterate from real use.
