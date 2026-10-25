import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const statePath = resolve(projectRoot, "project-state.json");

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
}

function requireIssue(value, field) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
}

export function validateProjectState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("project state must be an object");
  if (state.$schema !== "guitar-explorer/project-state") throw new TypeError("project state schema is invalid");
  if (state.schemaVersion !== 1) throw new TypeError("project state schemaVersion must be 1");
  requireText(state.updatedAt, "updatedAt");
  requireText(state.stage, "stage");
  requireText(state.phase?.engine, "phase.engine");
  requireText(state.phase?.runtime, "phase.runtime");
  requireText(state.phase?.learningValidation, "phase.learningValidation");
  requireIssue(state.activeWork?.issue, "activeWork.issue");
  if (state.activeWork.pullRequest !== null) requireIssue(state.activeWork.pullRequest, "activeWork.pullRequest");
  requireIssue(state.evidence?.issue, "evidence.issue");
  requireText(state.evidence?.schema, "evidence.schema");
  requireIssue(state.evidence?.schemaVersion, "evidence.schemaVersion");
  requireText(state.evidence?.storageDefault, "evidence.storageDefault");
  requireIssue(state.gate?.issue, "gate.issue");
  requireText(state.gate?.status, "gate.status");
  if (state.verification?.command !== "npm run verify") throw new TypeError("verification.command must remain npm run verify");
  for (const channel of ["stable", "preview", "experimental"]) {
    requireText(state.deployments?.[channel]?.status, `deployments.${channel}.status`);
    requireText(state.deployments?.[channel]?.source, `deployments.${channel}.source`);
    requireText(state.deployments?.[channel]?.publication, `deployments.${channel}.publication`);
  }
  if (!Array.isArray(state.deferred)) throw new TypeError("deferred must be an array");
  return state;
}

export async function readProjectState() {
  return validateProjectState(JSON.parse(await readFile(statePath, "utf8")));
}

function runtimeContext(state) {
  const envPr = Number(process.env.GE_ACTIVE_PR || process.env.GE_PREVIEW_PR || "");
  return {
    ...state,
    runtime: {
      revision: process.env.GE_REVISION || process.env.GITHUB_SHA || null,
      pullRequest: Number.isInteger(envPr) && envPr > 0 ? envPr : state.activeWork.pullRequest,
      deploymentChannel: process.env.GE_DEPLOYMENT_CHANNEL || null,
      deploymentLabel: process.env.GE_DEPLOYMENT_LABEL || null
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = await readProjectState();
  if (process.argv.includes("--check")) {
    console.log("Project context valid: project-state.json");
  } else {
    process.stdout.write(`${JSON.stringify(runtimeContext(state), null, 2)}\n`);
  }
}
