import {
  createEvidenceSession,
  evidenceFilename,
  finalizeEvidenceSession,
  recordEvidenceInteraction,
  withEvidenceScenario,
} from "./session-evidence-core.mjs?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";
import { readScenarioContext } from "./scenario-context.mjs?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";

const FIELD_IDS = {
  easierWithoutAnswers: "ge-evidence-easier",
  calculationOrHesitation: "ge-evidence-calculation",
  physicalAwkwardness: "ge-evidence-physical",
  assistanceEffect: "ge-evidence-assistance",
  transferResult: "ge-evidence-transfer",
  interpretation: "ge-evidence-interpretation",
  nextAction: "ge-evidence-next",
};

function experienceFromPath(pathname) {
  const path = pathname.toLowerCase();
  if (path.includes("product-spine")) return "harmonic-gravity-product-spine";
  if (path.includes("voice-leading")) return "parsimonious-path";
  if (path.includes("melody")) return "melody-over-harmony";
  if (path.includes("motif")) return "develop-the-idea";
  if (path.includes("practice") || path.includes("harmony")) return "harmonic-gravity-practice";
  return "chord-theory-lab";
}

function metaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || null;
}

function cleanLabel(element) {
  const explicit = element.getAttribute?.("aria-label") || element.getAttribute?.("title");
  const text = explicit || element.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 240) || null;
}

function currentReflection() {
  return Object.fromEntries(
    Object.entries(FIELD_IDS).map(([field, id]) => [field, document.getElementById(id)?.value ?? ""]),
  );
}

function currentScenario() {
  try {
    return readScenarioContext(document) ?? {};
  } catch {
    return {};
  }
}

function downloadJson(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  link.dataset.geEvidenceIgnore = "true";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function recorderMarkup() {
  return `
    <details id="ge-evidence-recorder" class="ge-evidence-recorder">
      <summary><span>Session evidence</span><span id="ge-evidence-count" class="ge-evidence-count">0 events</span></summary>
      <div class="ge-evidence-body">
        <p class="ge-evidence-note"><strong>Local only.</strong> Nothing here is sent or saved automatically. Export the JSON only when you want to share the trial.</p>
        <p class="ge-evidence-note"><strong>Protocol v1:</strong> unaided attempt → smallest assistance only if needed → transfer → reflection. Reset evidence after choosing your scenario.</p>
        <p id="ge-evidence-build" class="ge-evidence-note"></p>
        <p id="ge-evidence-context" class="ge-evidence-note"></p>

        <label>What became easier without looking at answers?
          <textarea id="${FIELD_IDS.easierWithoutAnswers}" rows="2"></textarea>
        </label>
        <label>Where did you still calculate or hesitate?
          <textarea id="${FIELD_IDS.calculationOrHesitation}" rows="2"></textarea>
        </label>
        <label>What felt physically awkward rather than conceptually unclear?
          <textarea id="${FIELD_IDS.physicalAwkwardness}" rows="2"></textarea>
        </label>
        <label>Did hints/reveals improve understanding, or mainly expose the answer?
          <textarea id="${FIELD_IDS.assistanceEffect}" rows="2"></textarea>
        </label>
        <label>What happened when you transferred the idea?
          <textarea id="${FIELD_IDS.transferResult}" rows="2"></textarea>
        </label>
        <label>Current interpretation
          <select id="${FIELD_IDS.interpretation}">
            <option value="">Choose…</option>
            <option value="keep">Keep as-is</option>
            <option value="change">Change or simplify</option>
            <option value="remove">Remove</option>
            <option value="promotion-candidate">Promotion candidate</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </label>
        <label>Smallest useful next action
          <textarea id="${FIELD_IDS.nextAction}" rows="2"></textarea>
        </label>

        <div class="ge-evidence-actions">
          <button type="button" id="ge-evidence-export">Export JSON</button>
          <button type="button" id="ge-evidence-reset">Reset evidence</button>
        </div>
        <p id="ge-evidence-status" class="ge-evidence-status" aria-live="polite"></p>
      </div>
    </details>`;
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .ge-evidence-recorder {
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 2147483000;
      width: min(390px, calc(100vw - 24px));
      max-height: min(78vh, 720px);
      overflow: auto;
      border: 1px solid #4a5568;
      border-radius: 12px;
      background: #111827;
      color: #f3f4f6;
      box-shadow: 0 14px 36px rgba(0, 0, 0, .42);
      font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .ge-evidence-recorder summary {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      padding: 10px 12px;
      font-weight: 700;
      user-select: none;
    }
    .ge-evidence-count { color: #a5b4fc; font-weight: 600; }
    .ge-evidence-body { padding: 0 12px 12px; display: grid; gap: 10px; }
    .ge-evidence-note { margin: 0; color: #cbd5e1; font-size: 12px; }
    .ge-evidence-body label { display: grid; gap: 4px; color: #e5e7eb; }
    .ge-evidence-body textarea,
    .ge-evidence-body select {
      width: 100%;
      border: 1px solid #4b5563;
      border-radius: 8px;
      background: #0f172a;
      color: #f8fafc;
      padding: 8px;
      font: inherit;
    }
    .ge-evidence-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .ge-evidence-actions button {
      min-height: 38px;
      border: 1px solid #64748b;
      border-radius: 8px;
      background: #1e293b;
      color: #f8fafc;
      padding: 7px 10px;
      font: inherit;
      cursor: pointer;
    }
    .ge-evidence-status { min-height: 1.4em; margin: 0; color: #a7f3d0; }
    @media (max-width: 620px) {
      .ge-evidence-recorder { right: 8px; bottom: 8px; width: calc(100vw - 16px); max-height: 64vh; }
    }
  `;
  document.head.append(style);
}

let startedMonotonic = performance.now();
const baseOptions = {
  experience: experienceFromPath(window.location.pathname),
  page: window.location.pathname,
  revision: metaContent("guitar-explorer-revision"),
  previewPr: metaContent("guitar-explorer-preview-pr"),
  deploymentChannel: metaContent("guitar-explorer-deployment-channel") || "local",
  deploymentLabel: metaContent("guitar-explorer-deployment-label"),
};
let session = createEvidenceSession({ ...baseOptions, ...currentScenario() });

function refreshScenarioContext() {
  const scenario = currentScenario();
  session = withEvidenceScenario(session, scenario);
  const context = document.getElementById("ge-evidence-context");
  if (context) {
    context.textContent = session.scenarioId
      ? `Scenario: ${session.scenarioId} · ${session.scenarioSource}`
      : "Scenario: not applicable on this page";
  }
  return scenario;
}

function refreshBuildContext() {
  const build = document.getElementById("ge-evidence-build");
  if (!build) return;
  const revision = session.revision ? session.revision.slice(0, 12) : "unversioned";
  const label = session.deploymentLabel ? ` · ${session.deploymentLabel}` : "";
  build.textContent = `Build: ${session.deploymentChannel}${label} · ${revision}`;
}

function updateCount() {
  const count = document.getElementById("ge-evidence-count");
  if (count) count.textContent = `${session.interactions.length} event${session.interactions.length === 1 ? "" : "s"}`;
}

function record(kind, details = {}) {
  const scenario = refreshScenarioContext();
  session = recordEvidenceInteraction(session, {
    elapsedMs: performance.now() - startedMonotonic,
    kind,
    ...scenario,
    ...details,
  });
  updateCount();
}

function targetDetails(target) {
  return {
    targetId: target.id || null,
    name: target.getAttribute?.("name") || null,
    value: "value" in target ? target.value : null,
    label: cleanLabel(target),
  };
}

function captureClick(event) {
  const target = event.target.closest?.("button, a");
  if (!target || target.closest("#ge-evidence-recorder") || target.dataset.geEvidenceIgnore === "true") return;
  record(target.tagName === "A" ? "link-click" : "button-click", targetDetails(target));
}

function captureChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  if (target.closest("#ge-evidence-recorder")) return;
  if (target instanceof HTMLInputElement && !["radio", "checkbox"].includes(target.type)) return;
  record("control-change", targetDetails(target));
}

function resetRecorder() {
  startedMonotonic = performance.now();
  session = createEvidenceSession({ ...baseOptions, ...currentScenario() });
  for (const id of Object.values(FIELD_IDS)) {
    const field = document.getElementById(id);
    if (field) field.value = "";
  }
  updateCount();
  refreshBuildContext();
  refreshScenarioContext();
  const status = document.getElementById("ge-evidence-status");
  if (status) status.textContent = "Evidence reset for a fresh protocol trial.";
}

function exportRecorder() {
  const completed = finalizeEvidenceSession(session, {
    reflection: currentReflection(),
    scenario: currentScenario(),
  });
  downloadJson(completed, evidenceFilename(completed));
  const status = document.getElementById("ge-evidence-status");
  if (status) status.textContent = "JSON exported. Nothing was uploaded automatically.";
}

function mountRecorder() {
  injectStyles();
  document.body.insertAdjacentHTML("beforeend", recorderMarkup());
  document.getElementById("ge-evidence-export")?.addEventListener("click", exportRecorder);
  document.getElementById("ge-evidence-reset")?.addEventListener("click", resetRecorder);
  document.addEventListener("click", captureClick, true);
  document.addEventListener("change", captureChange, true);
  updateCount();
  refreshBuildContext();
  refreshScenarioContext();
}

window.guitarExplorerEvidence = Object.freeze({
  record(kind, details = {}) {
    record(kind, details);
  },
  snapshot() {
    return finalizeEvidenceSession(session, {
      reflection: currentReflection(),
      scenario: currentScenario(),
    });
  },
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountRecorder, { once: true });
} else {
  mountRecorder();
}