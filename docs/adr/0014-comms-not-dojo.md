# ADR-0014: aula is quiet school comms, not a ClassDojo clone

- Status: accepted
- Date: 2026-09-08
- Supersedes for v1 scope: docs/handoff.md Sections 3, 4, 10, 17, 20 where they add skills, portfolio, student login, points-adjacent UX, tutors, calendar product, memories Plus, learning islands

## Decision

aula serves **one school**. It replaces the class WhatsApp (and the parts of ClassDojo people actually open) with a quiet room. It does not recreate ClassDojo.

ClassDojo is bloated: points, kid login, Plus photo locker, tutors, calendar upsell, learning islands. We will not ship those.

## v1 (Christmas, full app)

1. **Announcements.** Teacher (or coordinator) posts. Nobody replies. Emoji react only. Thumbs up means "I read this."
2. **Main feed that does not drown.** Replies live in **threads**, not in the main stream.
3. **Mentions.** Tag the people it is about. Slack-style handles.
4. **Direct messages.** Parent to teacher, parent to parent when they choose.
5. **Parent subgroups.** Birthday surprise, pickup pool, and so on. Invites can be **muted / declined**. Private people are not forced into spam.
6. **Visibility.** A late message for the teacher stays with the teacher. "Can someone watch my child" is visible to the group. If a post names a child via their join handle, only that child's guardians and the teacher see it. Do not parse real names from free text as a v1 magic trick; use handles, tags, and a late/teacher-only type.
7. **Filters.** Each adult sets categories they want: gatherings off, birthdays on, and so on.
8. **Story photos.** Teacher posts photos on the wall. Free. Not copied onto every phone. No Plus.
9. **Email notify, export, erase.** pt-PT and en.
10. Children do not log in.

## Explicitly out

Points, rewards, "needs work", kid login, student cards, skills as scores, portfolio product, tutors, homework islands, Memories Plus, calendar sync as a paid feature, Google login as required, multi-school districts.

## Why

The pain is WhatsApp: one message, a hundred replies, scroll forever, and "we are late" going to the whole group. The feature that beats both WhatsApp and ClassDojo is **who sees what**, plus mute.

## Christmas

Full comms app above, live, with one or two other groups filing bugs before Christmas. Operator's school leaves ClassDojo before the January semester.
