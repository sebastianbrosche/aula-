# AGENTS.md

v1 philosophy: [docs/adr/0017-low-load-ai-first.md](docs/adr/0017-low-load-ai-first.md).
Clients and speed: [docs/adr/0018-native-landing-speed.md](docs/adr/0018-native-landing-speed.md).
Privacy: [docs/adr/0019-privacy-consent-yolo.md](docs/adr/0019-privacy-consent-yolo.md).
Loop: [docs/adr/0020-lightning-feedback-loop.md](docs/adr/0020-lightning-feedback-loop.md).

aula is for one class. Number one is ask Home / Alexa / Grok, do not open the app. Feed is easy. Quiet by default. Helping is opt-in. First clients are native iOS and Android plus a public landing page.

Name: **aula**. Repo: `sebastianbrosche/aula-`.

One slice from QUEUE. Write a handoff. Stop. Next is CLS-2: Worker `/healthz` only.
