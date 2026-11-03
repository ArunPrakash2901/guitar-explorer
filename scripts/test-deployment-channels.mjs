import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexPath = resolve(projectRoot, ".preview-dist", "index.html");

function runBuild(channel, extraEnv = {}) {
  const result = spawnSync(process.execPath, ["scripts/build-preview.mjs", "--channel", channel], {
    cwd: projectRoot,
    env: {
      ...process.env,
      GE_REVISION: `${channel}-revision`,
      GE_DEPLOYMENT_LABEL: `${channel}-test`,
      GE_PREVIEW_PR: channel === "preview" ? "99" : "",
      ...extraEnv,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${channel} build failed:\n${result.stderr || result.stdout}`);
}

for (const channel of ["stable", "experimental", "preview"]) {
  runBuild(channel);
  const html = await readFile(indexPath, "utf8");
  assert.match(html, new RegExp(`name="guitar-explorer-deployment-channel" content="${channel}"`));
  assert.match(html, new RegExp(`name="guitar-explorer-deployment-label" content="${channel}-test"`));
  assert.match(html, new RegExp(`name="guitar-explorer-revision" content="${channel}-revision"`));
  assert.ok(html.includes(`src="./instrument-desk-app.js?ge-revision=${channel}-revision"`));
  assert.ok(html.includes(`href="./instrument-desk.css?ge-revision=${channel}-revision"`));
  const app = await readFile(resolve(projectRoot, ".preview-dist", "instrument-desk-app.js"), "utf8");
  assert.ok(app.includes(`from "./role-view.mjs?ge-revision=${channel}-revision"`), "entry code imports the advertised revision");
  const roleView = await readFile(resolve(projectRoot, ".preview-dist", "role-view.mjs"), "utf8");
  assert.ok(roleView.includes(`from "./role-plan.mjs?ge-revision=${channel}-revision"`), "relative transitive imports share the same revision");
}

const envFallback = spawnSync(process.execPath, ["scripts/build-preview.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    GE_REVISION: "env-revision",
    GE_DEPLOYMENT_CHANNEL: "experimental",
    GE_DEPLOYMENT_LABEL: "env-experimental",
  },
  encoding: "utf8",
});
assert.equal(envFallback.status, 0, `environment fallback build failed:\n${envFallback.stderr || envFallback.stdout}`);
let html = await readFile(indexPath, "utf8");
assert.match(html, /name="guitar-explorer-deployment-channel" content="experimental"/);
assert.match(html, /name="guitar-explorer-deployment-label" content="env-experimental"/);

const defaultFallback = spawnSync(process.execPath, ["scripts/build-preview.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    GE_REVISION: "default-revision",
    GE_DEPLOYMENT_CHANNEL: "",
    GE_DEPLOYMENT_LABEL: "",
  },
  encoding: "utf8",
});
assert.equal(defaultFallback.status, 0, `default fallback build failed:\n${defaultFallback.stderr || defaultFallback.stdout}`);
html = await readFile(indexPath, "utf8");
assert.match(html, /name="guitar-explorer-deployment-channel" content="preview"/);

const bad = spawnSync(process.execPath, ["scripts/build-preview.mjs", "--channel", "production-ish"], {
  cwd: projectRoot,
  encoding: "utf8",
});
assert.notEqual(bad.status, 0);
assert.match(`${bad.stderr}${bad.stdout}`, /Unknown deployment channel/);

console.log("deployment channel metadata checks passed");
