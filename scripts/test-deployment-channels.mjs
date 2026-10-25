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
}

const bad = spawnSync(process.execPath, ["scripts/build-preview.mjs", "--channel", "production-ish"], {
  cwd: projectRoot,
  encoding: "utf8",
});
assert.notEqual(bad.status, 0);
assert.match(`${bad.stderr}${bad.stdout}`, /Unknown deployment channel/);

console.log("deployment channel metadata checks passed");
