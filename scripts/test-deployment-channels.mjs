import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = resolve(projectRoot, "src");
const outputRoot = resolve(projectRoot, ".preview-dist");
const indexPath = join(outputRoot, "index.html");

function build(args, extraEnv = {}) {
  return spawnSync(process.execPath, ["scripts/build-preview.mjs", ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      GE_REVISION: "default-revision",
      GE_DEPLOYMENT_CHANNEL: "",
      GE_DEPLOYMENT_LABEL: "",
      GE_PREVIEW_PR: "",
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

function assertBuildSucceeded(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function filesUnder(directory) {
  const files = await readdir(directory, { recursive: true, withFileTypes: true });
  return files.filter((file) => file.isFile())
    .map((file) => relative(directory, join(file.parentPath, file.name)).replaceAll("\\", "/"));
}

const expectedOutput = [
  ".nojekyll",
  "index.html",
  "song-study.css",
  "song-study.mjs",
  "song-view.mjs",
  "song-audio.mjs",
  ...(await filesUnder(sourceRoot))
    .filter((file) => /^(engine|song-study)\//.test(file) && file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .map((file) => file.replace(/\.ts$/, ".js")),
].sort();

for (const channel of ["stable", "experimental", "preview"]) {
  const revision = channel + "-revision";
  const pr = channel === "preview" ? "99" : "";
  assertBuildSucceeded(build(["--channel", channel], {
    GE_REVISION: revision,
    GE_DEPLOYMENT_LABEL: channel + "-test",
    GE_PREVIEW_PR: pr,
  }));

  assert.deepEqual((await filesUnder(outputRoot)).sort(), expectedOutput);
  const html = await readFile(indexPath, "utf8");
  assert.match(html, /<h1>Black Dog<\/h1>/);
  assert.ok(html.includes(`href="./song-study.css?ge-revision=${revision}"`));
  assert.ok(html.includes(`src="./song-study.mjs?ge-revision=${revision}"`));
  assert.ok(html.includes(`name="guitar-explorer-deployment-channel" content="${channel}"`));
  assert.ok(html.includes(`name="guitar-explorer-deployment-label" content="${channel}-test"`));
  assert.ok(html.includes(`name="guitar-explorer-revision" content="${revision}"`));
  assert.ok(html.includes(`name="guitar-explorer-preview-pr" content="${pr}"`));

  const app = await readFile(join(outputRoot, "song-study.mjs"), "utf8");
  for (const modulePath of ["./song-study/arrangement.js", "./song-view.mjs", "./song-audio.mjs"]) {
    assert.ok(app.includes(`${modulePath}?ge-revision=${revision}`), `${modulePath} carries the advertised revision`);
  }
  const model = await readFile(join(outputRoot, "song-study", "model.js"), "utf8");
  assert.ok(model.includes(`"../engine/index.js?ge-revision=${revision}"`), "Song Study and the engine share a revision");
  const entry = await readFile(join(outputRoot, "engine", "index.js"), "utf8");
  const queries = await readFile(join(outputRoot, "engine", "query", "index.js"), "utf8");
  assert.ok(entry.includes(`"./query/index.js?ge-revision=${revision}"`), "entry imports carry the advertised revision");
  assert.ok(queries.includes(`"../core/pitch.js?ge-revision=${revision}"`), "transitive imports carry the advertised revision");
  assert.doesNotMatch(entry + queries, /sourceMappingURL=/);
}

const engine = await import(pathToFileURL(join(outputRoot, "engine", "index.js")).href);
const lowE = engine.musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 0 } });
assert.equal(lowE.ok, true);
assert.equal(lowE.data.name, "E2");

const { sections } = await import(pathToFileURL(join(outputRoot, "song-study", "arrangement.js")).href);
assert.equal(sections.length, 11);
assert.equal(sections[0].id, "SEC-01");
assert.equal(sections.at(-1).id, "SEC-11");
const { studies } = await import(pathToFileURL(join(outputRoot, "song-study", "studies.js")).href);
const { prepareExample } = await import(pathToFileURL(join(outputRoot, "song-study", "model.js")).href);
const example = prepareExample(studies["SEC-02"][0].examples[0]);
assert.ok(example.events.some((event) => event.semitones.length > 0), "Published examples prepare audio pitches");

assertBuildSucceeded(build([], {
  GE_REVISION: "env-revision",
  GE_DEPLOYMENT_CHANNEL: "experimental",
  GE_DEPLOYMENT_LABEL: "env-experimental",
}));
let html = await readFile(indexPath, "utf8");
assert.match(html, /name="guitar-explorer-deployment-channel" content="experimental"/);
assert.match(html, /name="guitar-explorer-deployment-label" content="env-experimental"/);

assertBuildSucceeded(build([], { GE_PREVIEW_PR: "101" }));
html = await readFile(indexPath, "utf8");
assert.match(html, /name="guitar-explorer-deployment-channel" content="preview"/);
assert.match(html, /name="guitar-explorer-deployment-label" content="pr-101"/);

const bad = build(["--channel", "production-ish"]);
assert.notEqual(bad.status, 0);
assert.match(bad.stderr + bad.stdout, /Unknown deployment channel/);

console.log("deployment provenance, preview manifest, compiled engine and arrangement checks passed");
