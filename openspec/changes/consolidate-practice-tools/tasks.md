## 1. Preparation

- [ ] 1.1 Pin actual OpenSpec CLI version, initialize Codex/Gemini adapters in clean checkout, disable optional telemetry, record version and run strict spec validation.
- [ ] 1.2 Capture all branch/PR SHAs and verify ancestry or patch equivalence including #90. Record explicit keep/replace/retire decisions.
- [ ] 1.3 Review scope with owner, finish all delta specs and map each requirement to tests and manual evidence.

## 2. Recovery

- [ ] 2.1 Trial integrate pinned #116 into fresh master-based branch; inspect all conflicts, core API changes and workflow differences; record resolutions.
- [ ] 2.2 Run npm ci and npm run verify; record exit status and SHA.
- [ ] 2.3 Run npm run test:progression-browser, preview build with GE_REVISION, npm run test:progression-browser:preview with GE_EXPECTED_REVISION; record results at same SHA.
- [ ] 2.4 Inspect sample provenance and licenses, execute native packaging source checks and diagnose failed workflow verify job; keep publication separate.
- [ ] 2.5 Publish exact-head review preview, check revision marker and browser behavior; conduct physical guitar/listening and device checks; record explicit owner approval.

## 3. Closeout

- [ ] 3.1 Sync accepted deltas into canonical specs, validate and archive only after acceptance; reconcile state and issue/PR links.
- [ ] 3.2 Merge only under existing approval gates; close superseded PRs after verified inclusion, preserve unique refs; verify master and rollback path.
- [ ] 3.3 Separately build and verify personal installer assets if authorized; no release claim until actual attachments exist.
