# Agent autonomy contract

This document defines when an implementation agent may act without asking Arun and
when it must stop for explicit approval. It is an execution boundary, not product
strategy and not a substitute for `PROJECT_STATE.md`, `AGENTS.md`, architecture or
the active issue.

## Default rule

Within a clearly authorized issue, act independently on the smallest safe path to
meet the acceptance criteria. Do not ask for confirmation for routine implementation,
verification or reversible maintenance work that is already inside scope.

If scope, product intent or learner impact is materially ambiguous, stop expansion
and surface the decision instead of guessing.

## May act without asking

When the work is inside the active authorized issue, an agent may:

- inspect repository files, history, issues, pull requests, CI and tests
- create implementation branches, commits, issues and pull requests
- implement code, tests and documentation required by the accepted scope
- repair CI/test failures caused by its own changes
- perform small behaviour-preserving refactors needed to complete the work safely
- remove accidental scratch files or generated artefacts that are clearly not part of
  the product
- improve comments, developer instructions and test coverage when they clarify the
  implemented behaviour rather than broaden scope
- update `PROJECT_STATE.md` when a merged/closed work item mechanically changes the
  recorded active state
- create non-production PR previews and other explicitly authorized development
  tooling
- merge a PR it created when all of the following are true:
  - the issue explicitly authorizes the work
  - acceptance criteria are satisfied
  - required CI is green
  - there are no unresolved review concerns
  - the PR does not change musical truth, product direction or learner-facing
    pedagogy
  - rollback is straightforward

## Must stop for Arun

An agent must not independently decide or execute any of the following unless Arun
has explicitly authorized it in the current work item or conversation:

- choose a new product direction or redefine the north star
- add a new musical/theory capability such as CAGED, new harmony breadth, audio or a
  learning/mastery engine
- promote an experimental Lab behaviour into permanent architecture when physical
  evidence or a decision gate is required
- materially change learner-facing pedagogy, sequencing, answer withholding or the
  meaning of an exercise
- change public music/query contracts unless the active issue explicitly requires it
- merge a learner-facing behavioural change that still requires physical-guitar
  validation
- delete or rewrite historical decisions, prior evidence or user-authored learning
  records for tidiness
- make a private repository, private data or private evidence public
- connect, purchase or materially change a paid/external service
- publish to production or change a production domain/deployment target
- add telemetry, accounts, persistence, learner scoring, adaptation or automated
  inference about mastery/ability
- weaken tests, validation or architectural boundaries merely to make a change pass

## Destructive and external actions

Prefer reversible operations. Branch/PR work is preferred over direct destructive
changes to `master`.

Do not mutate records outside this repository unless the user explicitly requests
that external action. Preview deployment may write generated static output to the
repository's dedicated preview branch because Issue #18 explicitly authorizes it;
that does not authorize production deployment.

## Physical-guitar evidence

Automated correctness cannot substitute for learner evidence. When the active issue
or PR marks physical review as required, the agent may prepare the test and explain
what to observe, but must not infer that the experience succeeded without Arun's
trial.

Evidence should remain descriptive. Do not convert hesitation, timing, attempts or
self-report into a mastery label unless a later explicitly authorized learning model
defines that interpretation.

## Conflict rule

Use this precedence when instructions disagree:

1. Arun's explicit current request
2. the active authorized issue / PR scope
3. `PROJECT_STATE.md`
4. `AGENTS.md` and this autonomy contract
5. `docs/ARCHITECTURE.md` and decisions
6. historical documents

If a lower-level source would broaden work beyond a higher-level source, do not
follow the broader instruction.
