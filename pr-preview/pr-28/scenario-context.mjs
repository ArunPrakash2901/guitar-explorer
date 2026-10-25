import { makeGeneratedScenarioId, scenarioIdentity } from "./scenario-identity.mjs";
import { getMelodyScenarios, getMotifScenarios } from "./scenario-catalogue.mjs";
import { getMelodyRules } from "./rule-contract.mjs";

function byId(documentRef, id) {
  return documentRef?.getElementById?.(id) ?? null;
}

function scenarioInfo(documentRef) {
  return byId(documentRef, "scenario-info")?.textContent?.trim() ?? "";
}

function parseGeneratedScenario(documentRef) {
  const info = scenarioInfo(documentRef);
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

function parseCatalogueScenario(documentRef, probe) {
  const info = scenarioInfo(documentRef);
  if (!info) return null;
  const catalogue = probe === "melody" ? getMelodyScenarios() : getMotifScenarios();
  const active = catalogue.find((scenario) => info.startsWith(`${scenario.description} · ${scenario.difficulty} · `));
  return active ? scenarioIdentity(active, "catalogue") : null;
}

export function readScenarioContext(documentRef = globalThis.document) {
  const probe = documentRef?.body?.dataset?.probe;
  if (probe !== "melody" && probe !== "motif") return null;

  const generatedSelected = probe === "melody"
    && byId(documentRef, "source-generated")?.getAttribute?.("aria-selected") === "true";

  return generatedSelected
    ? parseGeneratedScenario(documentRef)
    : parseCatalogueScenario(documentRef, probe);
}
