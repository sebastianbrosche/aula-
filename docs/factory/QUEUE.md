# QUEUE

Christmas slices for aula. One slice per session. See [RELAY.md](RELAY.md).

| ID | Status | Slice |
| --- | --- | --- |
| CLS-0 | done | Public repo `sebastianbrosche/aula-`, MIT, README, BUILD, factory, plan, ADR-0013. No Worker |
| CLS-1 | unused | Skipped |
| CLS-2 | next | Worker. Do not start in a CLS-0 session |
| CLS-3 | queued | Coordinator creates a group. Invite link |
| CLS-4 | queued | Parent join: email, child first name, last initial, photo consent. Children do not log in |
| CLS-5 | queued | Story + photos on the wall. Photos are not copied onto every phone |
| CLS-6 | queued | Coordinator-to-parent messages |
| CLS-7 | queued | Email notify |
| CLS-8 | queued | Export and erase |
| CLS-9 | queued | pt-PT and en copy pass |

## Rules

- Do not pull a later slice forward because it looks small.
- Do not reopen CLS-0 to scaffold Worker.
- Not-Christmas work is not a slice until Christmas is shipped.
