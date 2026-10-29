# Melody assistant exchange v1 (experimental)

This is a user-initiated, local exchange for **Melody Over Harmony** on a PR preview. It proves the app boundary before a live CLI bridge. The browser does not call an AI service or transmit evidence. The only model proposal the app can apply is a request for its existing Hint button.

## Try the exchange

1. Open Melody Over Harmony, choose a scenario and reach a fret-selection step before checking the answer.
2. Open **Assistant exchange · local experiment** and select **Prepare current context**. Copy the JSON into `context.json` in a temporary folder on your own computer. It contains the accepted scenario and stage, visible prompt, chord symbols, region, your visible selections, build identity, and allowed action. It omits the resolved plan and answer.
3. Use the official Codex CLI signed in with ChatGPT or the official Gemini CLI signed in with your Google account. Ask for a JSON object with exactly `schema`, `version`, `sessionId`, `stateRevision`, `actionId`, and `kind`. Use proposal schema `guitar-explorer/melody-assistant-proposal`, version `1`, and copy the `sessionId` and `stateRevision` from `context.json`. Choose a new short alphanumeric action ID; `kind` can only be `request-hint`. Do not request or include a note name or fret.
4. Paste the proposal JSON into the page and select **Check and apply hint**. The app checks the current session, revision, action ID, allowed action, exact fields and input size. A valid proposal triggers one existing Hint. A failed check changes no exercise state. Prepare fresh context after any stage, scenario, selection or hint change.

The [proposal JSON Schema](../schemas/melody-assistant-proposal-v1.schema.json) can constrain Codex CLI output. From a WSL/bash temporary directory, with your locally copied `context.json` and an absolute path to the schema:

```bash
codex exec --ephemeral --sandbox read-only --skip-git-repo-check \
  --output-schema /absolute/path/to/guitar-explorer/schemas/melody-assistant-proposal-v1.schema.json \
  -o proposal.json \
  "Read the Melody context on stdin. If request-hint is allowed, return exactly one proposal matching the schema. Copy its sessionId and stateRevision, generate a fresh actionId, and set kind to request-hint. Do not include musical answers or commentary." < context.json
```

For Gemini CLI, the JSON output is a wrapper. Paste **only the JSON string in its `response` field** into the page, after inspecting it:

```bash
gemini --approval-mode=plan --output-format json \
  -p "Read the Melody context on stdin. If request-hint is allowed, return only a JSON object with schema guitar-explorer/melody-assistant-proposal, version 1, the context's sessionId and stateRevision, a fresh actionId, and kind request-hint. Include no answer or commentary." \
  < context.json > gemini-output.json
```

If `allowedActions` is empty, do not ask for a proposal. The app rejects one anyway. Both CLI calls consume the usage associated with your signed-in account; this page never uses an API key. Check the CLI's active login method before invoking it. If sign-in, quota, cancellation or the CLI fails, continue the existing guitar session normally.

## Contract and limits

- One bounded experience and one existing hint action. No arbitrary music query, answer reveal, generated exercise, stage advance or model-written lesson text is accepted.
- The context is a projection from the **accepted** scenario and active stage. It is capped at 4 KiB; proposal input is capped at 1 KiB. This session ID is a correlation value, not a browser authentication token.
- Every render/selection or hint changes the state revision. A failed generator request leaves it unchanged. Applied action IDs are held in a page-lifetime `Set` so a repeated reply cannot consume another hint.
- The model sees visible chord and task facts and may infer an answer on its own. The application accepts only a hint request and shows only its deterministic hint text. Inspect CLI output before pasting it; model text outside the page is outside the app's disclosure control.
- No local history, persistent learner model, telemetry, automatic evidence upload, paid API fallback or production channel is introduced.

Physical-guitar review is required before merging this learner-facing experiment. The existing Issue #15 trials and Issue #16 decision gate remain open. A later local companion could reuse this contract and remove the copy/paste step once its authentication, origin checks and process permissions are designed and tested.

Official CLI documentation: [Codex authentication](https://learn.chatgpt.com/docs/auth), [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [Gemini headless JSON](https://geminicli.com/docs/cli/headless/), [Gemini quota and pricing](https://geminicli.com/docs/resources/quota-and-pricing/).
