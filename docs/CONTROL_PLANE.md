# Project control plane

Guitar Explorer uses a deliberately small GitHub control layer so a new work session
can recover the project state without depending on chat history.

## Read order

1. `PROJECT_STATE.md` — what matters now, the active slice and decision gate
2. `AGENTS.md` — agent constraints and authorization rules
3. `docs/ARCHITECTURE.md` — current product and architecture boundaries
4. the active GitHub issue or pull request — exact scope for this slice
5. relevant decisions/tests only as needed

## Work item model

Use one bounded issue for one implementation/documentation slice. The issue should
state the goal, why it is the right next move, scope, non-goals, acceptance criteria,
verification and any physical-guitar gate.

Do not use an open issue merely as a long-term wishlist. Deferred work belongs in
architecture/decisions until it is explicitly promoted into the current queue.

## Physical evidence

Learning experiences cannot be validated by unit tests alone. Use the physical
validation template to record real-guitar evidence before promoting experimental
Lab behaviour into permanent architecture.

Important evidence includes:

- what became easier without looking at answers
- where calculation or hesitation remained
- what was physically awkward versus conceptually unclear
- whether assistance timing helped or simply revealed the answer
- whether the idea transferred to another key, position or context

A physical-validation issue may recommend keep/change/remove/promotion, but it does
not itself authorize new capability breadth.

## Pull requests

Every non-trivial PR should link a work item, state behaviour impact, verification,
physical-review requirements and whether `PROJECT_STATE.md` remains accurate.
Small maintenance PRs may explain why no issue is needed.

## Updating project state

Update `PROJECT_STATE.md` when any of these materially changes:

- the active implementation slice
- what is waiting on Arun
- the current decision gate
- what work is explicitly authorized next

Do not turn it into a changelog or duplicate detailed architecture. It should remain
a fast operational read.
