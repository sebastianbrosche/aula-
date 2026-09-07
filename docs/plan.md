# Launch plan

Status: accepted. v1 product: [docs/adr/0014-comms-not-dojo.md](adr/0014-comms-not-dojo.md). Stack: [docs/handoff.md](handoff.md).

Name: **aula**. One school. Quiet comms. Not ClassDojo.

## Calendar

| When | What |
| --- | --- |
| Sep-Nov | Build v1 in QUEUE order. Each gate goes live. |
| Late Nov | One or two other groups on aula, filing bugs. |
| Christmas 2026 | Full comms app in the operator's school. |
| January 2027 | Off ClassDojo for the next semester. |

## Sequence

| ID | Slice |
| --- | --- |
| CLS-2 | Worker, D1, R2, Queues, `/healthz` |
| CLS-3 | Magic link for adults. No student login |
| CLS-4 | One school, one group, invite link, parent join |
| CLS-5 | Announcements: no reply, emoji react, read thumbs-up |
| CLS-6 | Feed, mentions, threads |
| CLS-7 | Direct messages |
| CLS-8 | Parent subgroups + mute/decline invite |
| CLS-9 | Visibility + filters |
| CLS-10 | Story + photos on the wall |
| CLS-11 | Email notify |
| CLS-12 | Export and erase |
| CLS-13 | pt-PT and en copy |

## Next

CLS-2 only. Stop after `/healthz`.
