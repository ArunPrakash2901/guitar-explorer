# Project control plane

Guitar Explorer uses a deliberately small GitHub control layer so a new work session
can recover the project state without depending on chat history.

## Read order

1. `PROJECT_STATE.md` — what matters now, the active slice and decision gate
2. `AGENTS.md` — current repository constraints and authorization rules
3. `docs/AUTONOMY_CONTRACT.md` — what an agent may do independently and where it must stop
4. `docs/ARCHITECTURE.md` — current product and architecture boundaries
5. the active GitHub issue or pull request — exact scope for this slice
6. relevant decisions/tests only as needed

## Work item model

Use one bounded issue for one implementation/documentation slice. The issue should
state the goal, why it is the right next move, scope, non-goals, acceptance criteria,
verification and any physical-guitar gate.

Do not use an open issue merely as a long-term wishlist. Deferred work belongs in
architecture/decisions until it is explicitly promoted into the current queue.

## Repository verification

`npm run verify` is the authoritative full-repository verification command. CI should
call that command rather than re-declaring its subcommands. Narrower scripts such as
`npm test`, `npm run test:lab`, `npm run test:deployments` and `npm run preview:build`
remain useful for focused diagnosis, but they do not replace the full gate.

## Physical evidence

Learning experiences cannot be validated by unit tests alone. Use
`docs/PHYSICAL_VALIDATION_PROTOCOL.md` as the current versioned real-guitar method
when a new learner experience requires a real-guitar trial. Preserve the recorded
confirmation for Issue #15's former exercises as historical evidence.

Protocol v1 requires this order:

1. unaided attempt
2. smallest assistance only if needed
3. physical use in context
4. transfer
5. reflection and provisional disposition

Important evidence includes:

- what became easier without looking at answers
- where calculation or hesitation remained
- what was physically awkward versus conceptually unclear
- whether assistance timing helped or simply revealed the answer
- whether the idea transferred to another key, position or context

Record the experience and exact revision with the trial observations. Existing
learner records stay local until Arun chooses to share them.

A physical-validation issue may recommend keep/change/remove/promotion, but it does
not itself authorize new capability breadth.

## Pull requests

Every non-trivial PR should link a work item, state behaviour impact, verification,
physical-review requirements and whether `PROJECT_STATE.md` remains accurate.
Small maintenance PRs may explain why no issue is needed.

For learner-facing/browser work, use the PR preview when available so physical review
is performed against the exact revision under discussion. Preview setup is documented
in `docs/PR_PREVIEWS.md`.

## Authority and learner demand

GitHub master proves merged capability; a GitHub issue/PR bounds one work slice.
Figma records applicable visual/product approval. Trello is the human-readable
navigation and priority index; update its existing cards with actual outcomes.
Research artifacts inform proposals and do not authorize implementation. Add no
other planning system.

Start substantial work with the learner action and benefit. Only a demonstrated
missing deterministic fact justifies the smallest engine addition. Use existing
facts where they suffice. See [project state](../PROJECT_STATE.md) for the current
slice and [the autonomy contract](AUTONOMY_CONTRACT.md) for the review gates.

## Updating project state

Update `PROJECT_STATE.md` when any of these materially changes:

- the active implementation slice
- what is waiting on Arun
- the current decision gate
- what work is explicitly authorized next

Do not turn it into a changelog or duplicate detailed architecture. It should remain
a fast operational read.
