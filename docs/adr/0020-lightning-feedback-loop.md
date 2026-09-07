# ADR-0020: lightning iteration and idea harvesting

- Status: accepted
- Date: 2026-09-07
- Critical: yes. The loop is the product process.
- Related: ADR-0018 (speed over calendar)

## Decision

aula is **free for schools**. Schools "pay" with attention and effort. They are free product developers: they use it, they show what broke, they ask for what is missing.

How far behind a competitor you start does not matter. **Velocity of the loop** does.

## Bugs: no human triage

Every screen supports a **long-press** (or the platform equivalent) to file a bug. The reporter can attach a **voice note** describing what failed.

Bug reports **auto-file as issues** and are **handled by agents automatically**. A human does not sit on a triage pile for bugs. An agent reproduces, patches, and opens the usual review path.

A bug is: something already specified that does not work, or a crash, or a broken permission, or copy that lies.

## Feature requests: human accept

Feature requests are encouraged. They stream in from the same long-press (mark as request) and from conversation.

They go to a **human accept / reject** review queue. Developers decide.

**Agents must not auto-ship a feature request without accept.** A request is an idea, not a ticket to build. After accept, agents may implement it like any other slice.

## Why this split

Bugs are the product failing a promise. Speed there is respect.

Features change the promise. Only a human may widen scope. Otherwise the app becomes whatever the loudest voice asked at midnight, and ADR-0014 / ADR-0017 die.

## Factory consequence

- Bug issues are agent work by default. No "wait for triage" state.
- Feature issues stay in a review queue until a human marks accept or reject.
- QUEUE and Linear (or the tracker you actually use) must be able to tell a bug from a request.
- The long-press control is in the first tryable clients (ADR-0018), not a later admin tool.

## Out

- Charging schools for the app
- A human having to ticket every crash before an agent may look
- Agents merging feature work that nobody accepted
- Ranking schools or parents by how many reports they file
