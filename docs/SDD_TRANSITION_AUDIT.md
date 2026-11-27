# SDD transition audit — 28 November 2026 (Melbourne)

Tracking: #123. Scope: recovery and governance only. This is a pinned read-side audit and proposed policy, not a tested or approved app integration.

## Snapshot

- master: 2e35d7bea378f8b0db16238a1b3cdcc2d4d981d1; tree 8d238fa9d1d29dc31b31b02f0561876e3840bb2e.
- #116: 5ea69e9d6df45285e586ed463a8d72d8416f6030; 138 commits ahead, 24 behind master, common base a1a76f4a2daadf0df80c47231877ef414c60d22d; comparison lists 187 changed files. PR #116 itself targets the arpeggio branch, not master.
- 52 branches and 33 open PRs before this audit branch. Three open pre-existing issues: #80, #82, #83. No published GitHub releases.
- Latest master commit 13 November; housekeeping succeeded 22 November. November 13 public bootstrap and personal installer workflows failed AFTER jobs started: verify jobs failed, binary build/publication skipped. Historical startup_failure is therefore not a sufficient current diagnosis. Logs returned HTTP 404 BlobNotFound; exact failure unknown. Re-run with preserved logs only after scoped recovery.
- README incorrectly describes private status as current/historical ambiguity; repo is public. PROJECT_STATE and JSON still advertise #75 despite it not being open. Historical approved evidence remains valid only for its original head. scripts/project-context.mjs checks shape, not freshness or semantic agreement.
- #116 earlier head 00581e04556260884131d3feca93b1898bb0b741 reported 637 domain tests and Chromium journeys. No fresh tests run here; later exact head and a combined master candidate need separate evidence.
- Node minimum is currently 22.17; OpenSpec upstream currently requires 22.20+. Verify pinned CLI version and upgrade developer/CI Node consistently before installing. See upstream existing-projects and setup docs: https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md.

## All pre-existing open PRs: disposition proposal

| PRs | Role | Proposed disposition |
|---|---|---|
| #86–89 | Seeded generator, voicings, workspace, recovery audio | Preserve; trace ancestry and behavior to #116; consolidate only with equivalent coverage |
| #90 | Original audio fork | Preserve unique commit; compare against #89/recovery. GitHub comparison with #116: one unique commit, 129 behind; no automatic closure |
| #91–98 | UX, rhythm, chord replacement, modes, styles, shapes, CAGED, sampler | Preserve and consolidate after exact-head ancestry and tests |
| #99–107 | Drums, UI, favorites, integration, compact toolbar, arrangements, scales, editable rhythm | Same; check browser interaction and migration |
| #108–110 | Recorded electric, library/export, final progression review | Same; check audio provenance and synchronization |
| #112/#115 | Groove expansion and styles | #115 head 8615044429dcaddc9dd105f438796048a7317c34 is confirmed ancestor of #116; check #112 individually before closure |
| #113/#114 | Triad and CAGED trainers | #114 head 72d035b994510ff9f5662f42758107c3c7a42f5e confirmed ancestor; check #113 independently |
| #116 | Combined candidate incl. #117/#118 package source | Primary recovery source; never merge directly without reconciling master and reviewing |
| #84/#85 | Exercise reset and Black Dog study | Separate, mutually divergent product track; owner decision needed. #85 comparison with #116: 2 unique commits, 135 files in fork delta; no implied song rights |
| #111 | PCM looper proof | Separate experiment; 1 unique commit, 17 files in fork delta; real hardware review required |

#89 head 837355c4b65ac50e3577e14cae342d5073129561 is confirmed ancestor of #116. Every original open PR head has now been checked against #116; see the appendix below. Ancestry is not behavioral equivalence: later commits may override earlier behavior. No PR or branch retired by this audit. Closed merged staging PRs #117/#118 do not mean master includes packaging. #119–122 are master maintenance history.

## Recovery sequence

1. Freeze feature expansion; record SHA inventory for every branch, PR, issue and existing approval. Preserve gh-pages and all unique refs. Check other non-open branches for unique commits and evidence before any deletion. No force push.
2. Complete OpenSpec init on a clean checkout with pinned CLI; inspect generated agent files for Codex/Gemini, disable optional telemetry and retain existing governance. Do not commit local credentials or tool caches. Strict-validate proposed specs.
3. Create ONE isolated recovery branch from current master, incorporate #116 via a history-preserving trial merge (not the live master), explicitly resolve conflicting docs, build workflows, package/scripts, core formulas and tests. Record each conflict resolution. Compare #90 patch and decide whether any unique behavior is needed; don't merge it just because unique.
4. Backfill a bounded candidate spec delta covering generator determinism, voicing validation, arrangement/locks, audio clock, local favorites/link migration, triads, arpeggio TAB, sampled assets and packaging. Candidate requirements are not accepted main specs. Compare source and tests at the final merged-candidate SHA, not PR title claims.
5. Run npm ci, npm run verify, browser dev/static suites at identical SHA and native packaging checks. Save exact results; never weaken gates. Restore preview with SHA marker; obtain human desktop/mobile/guitar/listening review and explicit owner approval. Record asset license and provenance, no personal evidence publication. No release implied by tests.
6. Update canonical specs in the approved integration PR, archive the delta after acceptance, merge as authorized. Close old PRs only after ancestry/patch accounting and link the replacement PR; preserve references until independently checked. Reconcile GitHub issues and Trello via links, not duplicate scope. No external Trello write authorized in this pass.
7. Only then publish approved personal EXE/APK from pinned source with actual assets verified and real-device checks; production signing/release separately authorized.

## Evidence and gaps

Directly inspected AGENTS, docs/AUTONOMY_CONTRACT, README, PROJECT_STATE, project-state.json, scripts/project-context.mjs, package scripts, architecture excerpts, open PR metadata, selected compare results, workflow/job metadata, master core/guitar/time/phrase/harmony test excerpts and candidate progression/trainer tests/workspace/review guide. Not a complete source-line audit, all-branch patch-equivalence pass (ancestry for all original open PRs and non-PR refs is now classified), full clone, build, CI rerun, actual hardware trial, public history/license audit or CLI execution. No claim of current preview availability. Existing tool has no usable historical job logs. Read full source and run tests before final acceptance.

## Appendix — complete original PR ancestry and remaining branch triage

All 33 original open PR heads compared against pinned #116. Ahead counts below mean commits unique to the compared PR head, not to the whole repository. For the 28 ancestor PRs, ahead is zero; the number shown is how many commits behind #116 each head was. Record exact refs from the original snapshot before any close or delete operation.

| PR | Status vs #116 | Ahead | Behind |
|---|---|---:|---:|
| #84 | diverged | 1 | 138 |
| #85 | diverged | 2 | 138 |
| #86 | ancestor | 0 | 135 |
| #87 | ancestor | 0 | 130 |
| #88 | ancestor | 0 | 129 |
| #89 | ancestor | 0 | 120 |
| #90 | diverged | 1 | 129 |
| #91 | ancestor | 0 | 107 |
| #92 | ancestor | 0 | 97 |
| #93 | ancestor | 0 | 92 |
| #94 | ancestor | 0 | 85 |
| #95 | ancestor | 0 | 84 |
| #96 | ancestor | 0 | 83 |
| #97 | ancestor | 0 | 82 |
| #98 | ancestor | 0 | 81 |
| #99 | ancestor | 0 | 80 |
| #100 | ancestor | 0 | 79 |
| #101 | ancestor | 0 | 78 |
| #102 | ancestor | 0 | 76 |
| #103 | ancestor | 0 | 72 |
| #104 | ancestor | 0 | 57 |
| #105 | ancestor | 0 | 56 |
| #106 | ancestor | 0 | 55 |
| #107 | ancestor | 0 | 54 |
| #108 | ancestor | 0 | 53 |
| #109 | ancestor | 0 | 52 |
| #110 | ancestor | 0 | 51 |
| #111 | diverged | 1 | 138 |
| #112 | ancestor | 0 | 46 |
| #113 | ancestor | 0 | 50 |
| #114 | ancestor | 0 | 49 |
| #115 | ancestor | 0 | 45 |
| #116 | identical | 0 | 0 |

**Outcome:** 28 ancestor PRs can be considered for consolidation only after acceptance of the combined candidate. Four divergent PRs (#84, #85, #90, #111) cannot be retired on ancestry grounds. #116 is the reference candidate. No PR was closed.

Remaining 19 refs (not heads of those 33 open PRs):

| Branch | Classification | Proposed action |
|---|---|---|
| master | Canonical integrated baseline | Keep |
| gh-pages | Deployment branch | Keep; not a source integration target |
| chore/weekly-repository-housekeeping | Ancestor of master (6 behind) | Cleanup candidate after refs/evidence check |
| ci/bootstrap-public-previews-and-releases | Ancestor of master (1 behind) | Same |
| ci/manual-personal-installer-release | Ancestor of master (11 behind) | Same |
| docs/installer-release-status-reconciliation | Ancestor of master (17 behind) | Same |
| feat/pwa-installable-release | Ancestor of #116 (11 behind) | Keep until candidate accepted |
| feat/personal-windows-android-installers | Ancestor of #116 (13 behind) | Same |
| codex/product-spine-melody-preparation | 1 commit unique vs master | Preserve and inspect |
| feat/guitar-performance-v0 | 6 unique vs master | Preserve historical reference |
| feat/interesting-material-v0 | 12 unique vs master | Preserve historical reference |
| feat/looper-v0 | 13 unique vs master | Preserve historical reference |
| feat/melody-assistant-exchange | 1 unique vs master, 1 vs #116 | Preserve |
| feat/musical-worlds-expansive-practice | 4 unique vs master and #116 | Preserve |
| feat/practice-depth-v0 | 3 unique vs master and #116 | Preserve |
| feat/product-surface-consolidation-v0 | 18 unique vs master | Preserve historical reference |
| feat/sampled-acoustic-audition-v0 | 8 unique vs master | Preserve historical reference |
| scaffold/chord-tone-markers-20261111 | 5 unique vs master and #116 | Preserve |
| ui/harmonic-gravity-focus-refinement | 2 unique vs master | Preserve |

Four master-ancestor refs are low-risk cleanup candidates, not deletion authorization. Eleven historical refs have commits not in master; some may be represented by equivalent patches or staging commits. Do not delete them based on names, age, or closed PR status. The new SDD audit branch is not counted in the historical 52.
