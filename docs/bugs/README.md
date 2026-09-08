# Open bug queue

Live intake is the D1 `bug_reports` table, not Linear. The Worker has no Linear API. Do not invent a Linear ticket.

Each adult `POST /bugs` (or auto-capture on unavailable / 500) inserts a row:

- `id`
- `path`
- `role`
- `note` (`body` in the table)
- `sha`
- `status` = `open`
- `createdAt`

Read it as an adult:

- HTML `/bugs` lists open items
- JSON `GET /v1/bugs`

Builder and Tester use that list as the pick-up queue.
