# Pinheiros morning walk

For Sebastian. Five minutes. Adults only. Children do not log in.

Live site: https://aula.sebastian-brosche.workers.dev

## First screen

1. Open the URL. You should see Join Pinheiros 4.o B first.
2. Invite code is `PIN4B1`. It is already filled in. Tap Join with PIN4B1.
3. Or use the demo buttons lower on the page:
   - Enter as teacher (Ana Costa)
   - Enter as parent (Rui Mendes)

## Parent morning

1. After parent login you land on `/g`.
2. Open Morning (`/g/morning`).
3. You should see tomorrow at the garden, hat / chapeu to bring, and the garden visit.
4. If the visit is waiting, tap Aceitar / Approve.
5. Open Resumo from that page if you want the short digest.

If Aceitar is gone, ask the teacher to tap Reset garden visit on `/t/morning`, then reload `/g/morning`.

## Teacher morning

1. Enter as teacher.
2. Open Morning (`/t/morning`). Same notes. You can reset the garden visit so the parent can tap Aceitar again.
3. Export and payments stay stubs. They will say not connected / not live. That is honest.

## Google and email (if you want a real inbox)

- Google redirect URI to allowlist: `https://aula.sebastian-brosche.workers.dev/auth/google/callback`
- Magic link From: `aula <login@m1.heatlagos.com>` unless `RESEND_FROM` is set on the Worker
- Pinheiros demo inboxes (`ana.costa@pinheiros.aula.test`, `rui.mendes@pinheiros.aula.test`) are not real mailboxes. Use the printed verify link if email does not arrive.

## What this is not

No points. No kid login. No ClassDojo Plus. Photos stay in the class.
