import { scenarioIdentity } from "./scenario-identity.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";

// The active scenario is set only after preparation succeeds. Picker values and
// display prose are not reliable evidence of the accepted teaching material.
export function setScenarioContext(documentRef, scenario) {
  const identity = scenarioIdentity(scenario);
  const dataset = documentRef.body.dataset;
  dataset.scenarioId = identity.scenarioId;
  dataset.scenarioSource = identity.scenarioSource;
  dataset.scenarioContractVersion = String(identity.scenarioContractVersion);
  return identity;
}

export function readScenarioContext(documentRef = globalThis.document) {
  const dataset = documentRef?.body?.dataset;
  if (dataset?.probe !== "melody" && dataset?.probe !== "motif") return null;
  if (!dataset.scenarioId || !dataset.scenarioSource) return null;
  const version = Number(dataset.scenarioContractVersion);
  if (!Number.isInteger(version) || version < 1) return null;
  try {
    return scenarioIdentity({ id: dataset.scenarioId, version }, dataset.scenarioSource);
  } catch {
    return null;
  }
}
