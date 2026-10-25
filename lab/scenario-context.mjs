import { makeGeneratedScenarioId, scenarioIdentity } from "./scenario-identity.mjs";
import { getMelodyRules } from "./rule-contract.mjs";

function byId(documentRef, id) {
  return documentRef?.getElementById?.(id) ?? null;
}

function parseGeneratedScenario(documentRef) {
  const info = byId(documentRef, "scenario-info")?.textContent ?? "";
  const match = info.match(/^Generated · (.+?) · (introductory|developing|transfer) · seed (.+?)(?: ·|$)/);
  if (!match) return null;

  const [, title, difficulty, seedText] = match;
  const rule = getMelodyRules().find((item) => item.title === title);
  if (!rule) return null;

  const numericSeed = Number(seedText);
  const seed = Number.isFinite(numericSeed) && String(numericSeed) === seedText.trim()
    ? numericSeed
    : seedText.trim();

  return Object.freeze({
    scenarioId: makeGeneratedScenarioId({ family: rule.family, difficulty, seed }),
    scenarioSource: "generated",
    scenarioContractVersion: 1,
  });
}

export function readScenarioContext(documentRef = globalThis.document) {
  const probe = documentRef?.body?.dataset?.probe;
  if (probe !== "melody" && probe !== "motif") return null;

  const generatedSelected = probe === "melody"
    && byId(documentRef, "source-generated")?.getAttribute?.("aria-selected") === "true";

  if (generatedSelected) return parseGeneratedScenario(documentRef);

  const selectedId = byId(documentRef, "scenario-select")?.value?.trim();
  if (!selectedId) return null;
  return scenarioIdentity({ id: selectedId, version: 1 }, "catalogue");
}
