# Feature ask queue

Live intake is the D1 `feature_requests` table, not Linear. The Worker has no Linear API.

Adults `POST /features` or `POST /v1/features` `{ body }`. Each write inserts:

- `id`
- `role`
- `note` (`body` in the table)
- `status` = `open`
- `createdAt`

Teachers and school admins accept or reject with `POST /features/:id` or `POST /v1/features/:id` `{ action: accept|reject }`. Open items leave the list after a decision.

Read the open list as an adult:

- HTML `/features`
- JSON `GET /v1/features`

This is not the bug queue.
