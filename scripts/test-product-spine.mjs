import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { accessibleText, createTestDOM, find, installRenderer } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import * as practice from "../lab/practice-session.mjs";

const html = await readFile(new URL("../lab/product-spine.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/product-spine-app.js", import.meta.url), "utf8");

assert.match(html, /id="desk-panel"/);
assert.match(html, /id="focus-panel"/);
assert.match(html, /PLAY[^<]*<\/span>[\s\S]*NOTICE[\s\S]*UNDERSTAND[\s\S]*TRANSFER/);
assert.match(html, /href="\/melody\.html"/);
assert.match(html, /href="\/voice-leading\.html"/);
assert.doesNotMatch(html, /F# is the third|G# is the third|\bV7\b/);
assert.doesNotMatch(app, /localStorage|indexedDB|AudioContext|setInterval|fetch\(/);

function createPage() {
  const { document, root } = createTestDOM(html);
  document.body = find(root, (element) => element.tagName === "body");
  const context = vm.createContext({ ...engine, ...practice, document, console });
  installRenderer(context);
  const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
  vm.runInContext(executable, context, { filename: "product-spine-app.js" });
  const read = (expression) => vm.runInContext(expression, context);
  const $ = (id) => document.getElementById(id);
  const choose = (containerId, value) => {
    const button = find($(containerId), (element) => element.dataset.value === value);
    assert.ok(button, `${value} is available in ${containerId}`);
    button.click();
  };
  return { document, root, read, $, choose, text: () => accessibleText(root) };
}

const page = createPage();
assert.equal(page.read("state.mode"), "desk");
assert.equal(page.read("state.stage"), "play");
assert.equal(page.$("desk-panel").hidden, false);
assert.equal(page.$("focus-panel").hidden, true);
assert.equal(page.$("intent-explore").getAttribute("aria-pressed"), "true");
assert.match(page.text(), /Hear the pull back home/);
assert.doesNotMatch(page.text(), /F# is the third of D7|G# is the third of E7/);

// Entering Practice creates temporary PLAY Focus. Returning to the desk preserves the stage.
page.$("primary-action").click();
assert.equal(page.read("state.mode"), "practice");
assert.equal(page.read("state.stage"), "play");
assert.equal(page.$("intent-nav").hidden, true);
assert.equal(page.$("return-desk").hidden, false);
assert.match(page.text(), /G → D7 → silence/);
assert.doesNotMatch(page.text(), /F# is the third|G# is the third/);
page.$("return-desk").click();
assert.equal(page.read("state.mode"), "desk");
assert.equal(page.read("state.stage"), "play");
assert.match(page.$("primary-action").textContent, /Resume/);
page.$("primary-action").click();

// NOTICE separates selecting an expectation from committing it; compare-again retains the selection.
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "notice");
assert.equal(page.$("primary-action").disabled, true);
page.choose("response-options", "return");
assert.equal(page.read("state.mainSelection"), "return");
assert.equal(page.read("state.mainPrediction"), null);
assert.equal(page.$("primary-action").disabled, false);
page.$("secondary-action").click();
assert.equal(page.read("state.stage"), "play");
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "notice");
assert.equal(page.read("state.mainSelection"), "return");
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "compare");
assert.equal(page.read("state.mainPrediction"), "return");
assert.match(page.text(), /D7 → G/);
assert.doesNotMatch(page.text(), /F# is the third of D7|One fret up/);

// UNDERSTAND reveals only after the learner confirms the physical comparison.
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "understand");
assert.equal(page.read("state.mainCompared"), true);
assert.match(page.text(), /F# is the third of D7/);
assert.match(page.text(), /G is the root of G/);
assert.match(page.text(), /One fret up/);

// The same material becomes a tiny phrase action rather than another identification question.
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "phrase");
assert.equal(page.$("primary-action").disabled, true);
page.choose("phrase-options", "answer");
assert.equal(page.read("state.phraseChoice"), "answer");
assert.match(page.text(), /F# → G · direct answer/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-setup");
assert.match(page.text(), /G major[\s\S]*A major/);

// Transfer requires a fresh PLAY and NOTICE cycle; the A-major answer remains hidden until comparison.
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-play");
assert.match(page.text(), /A → E7 → silence/);
assert.doesNotMatch(page.text(), /G# is the third of E7/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-notice");
page.choose("response-options", "return");
assert.equal(page.read("state.transferPrediction"), null);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-compare");
assert.equal(page.read("state.transferPrediction"), "return");
assert.match(page.text(), /E7 → A/);
assert.doesNotMatch(page.text(), /G# is the third of E7|One fret up/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-understand");
assert.equal(page.read("state.transferCompared"), true);
assert.match(page.text(), /G# is the third of E7/);
assert.match(page.text(), /A is the root of A/);
assert.match(page.text(), /G# → A/);

// Reflection is descriptive only and completion returns to Explore without destroying the completed context.
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "reflect");
assert.equal(page.$("primary-action").disabled, true);
page.choose("reflection-options", "clearer");
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "complete");
assert.match(page.text(), /no mastery claim/i);
page.$("primary-action").click();
assert.equal(page.read("state.mode"), "desk");
assert.equal(page.read("state.stage"), "complete");
assert.match(page.$("primary-action").textContent, /Resume/);

console.log("Product Spine v1 checks passed through Desk, PLAY Focus, NOTICE, UNDERSTAND, tiny phrase, TRANSFER and reflection.");
