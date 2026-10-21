import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { all, accessibleText, createTestDOM, find, installRenderer, rendererSource } from "./fretboard-test-dom.mjs";

// This test exercises the renderer's own geometry, DOM and event callbacks.
// The strings are physical identities supplied in visual order, not sorted pitches.
const strings = [
  { index: 5, label: "1 · high E" }, { index: 4, label: "2 · B" },
  { index: 3, label: "3 · G" }, { index: 2, label: "4 · D" },
  { index: 1, label: "5 · A" }, { index: 0, label: "6 · low E" },
];
const dom = createTestDOM('<div id="board"></div>');
const selections = [];
const context = vm.createContext({ document: dom.document, console, selections });
installRenderer(context);
const read = (expression) => vm.runInContext(expression, context);
context.strings = strings;
const geometry = read('fretboardGeometry({strings, fretRange:{minFret:0,maxFret:12}})');
assert.deepEqual(Array.from(geometry.visibleFrets), Array.from({ length: 13 }, (_, index) => index));
assert.ok(geometry.openX < geometry.neckLeft, "Open positions sit separately behind the nut");
for (let fret = 1; fret <= 12; fret += 1) {
  assert.ok(geometry.fretCenter(fret) > geometry.fretBoundary(fret - 1));
  assert.ok(geometry.fretCenter(fret) < geometry.fretBoundary(fret));
  assert.ok(geometry.fretWidth(fret) >= 44, "Each fret retains a usable native-button target");
}
assert.ok(geometry.fretWidth(1) > geometry.fretWidth(12), "Frets become perceptually narrower towards the bridge");
assert.ok(geometry.stringY(5) < geometry.stringY(0), "Geometry honors supplied visual string order");
assert.notEqual(geometry.stringY(5), geometry.stringY(4));
const crop = read('fretboardGeometry({strings, fretRange:{minFret:8,maxFret:14}})');
assert.deepEqual(Array.from(crop.visibleFrets), [8, 9, 10, 11, 12, 13, 14]);
assert.equal(crop.openX, null, "A cropped high-fret view never invents an open-string position");

read('globalThis.surface = createFretboard(document.getElementById("board"), {onSelect: position => selections.push(position)})');
const positions = [];
for (const stringIndex of [3, 4, 5]) {
  for (let fret = 0; fret <= 12; fret += 1) positions.push({ stringIndex, fret, selectable: true, ariaLabel: `String ${6 - stringIndex}, fret ${fret}` });
}
const hidden = { strings, activeStringIndices: [3, 4, 5], fretRange: { minFret: 0, maxFret: 12 }, positions, connections: [], label: "Select a fret" };
context.model = hidden;
read("surface.update(model)");
const board = dom.$("board");
const positionAt = (stringIndex, fret) => find(board, (item) => item.tagName === "button" && item.dataset.stringIndex === String(stringIndex) && item.dataset.fret === String(fret));
const classItems = (className) => all(board, (item) => item.classList.contains(className));
assert.equal(classItems("fb-string").length, 6, "The focused surface keeps all six physical strings recognizable");
assert.deepEqual(classItems("fb-string").map((item) => Number(item.dataset.stringIndex)), [5, 4, 3, 2, 1, 0]);
assert.equal(classItems("fb-position").length, 39);
assert.equal(positionAt(0, 5), undefined, "Inactive strings do not acquire selectable target cells");
assert.match(accessibleText(board), /Select a fret/);
assert.doesNotMatch(accessibleText(board), /F#|C → B|3rd of|destination/i);
for (const button of classItems("fb-position")) {
  assert.equal(button.tagName, "button");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.match(button.getAttribute("aria-label"), /^String [1-3], fret \d+/);
  assert.equal(button.getAttribute("title"), null);
}
assert.equal(classItems("fb-connection").length, 0, "No movement path is inferred before a session supplies one");
const click = positionAt(4, 6); click.focus(); click.click();
assert.deepEqual(JSON.parse(JSON.stringify(selections)), [{ stringIndex: 4, fret: 6 }], "Clicks return physical identity with no musical interpretation");
// Enter/Space rely on native button semantics; they must not be intercepted or invoke a second selection.
for (const key of ["Enter", " "]) assert.equal(click.dispatch("keydown", { key }).defaultPrevented, false);
assert.equal(selections.length, 1);
assert.equal(click.tagName, "button", "Native Enter/Space activation is also verified in the real-browser review");

click.dispatch("keydown", { key: "ArrowRight" });
assert.equal(dom.document.activeElement, positionAt(4, 7));
dom.document.activeElement.dispatch("keydown", { key: "ArrowLeft" });
assert.equal(dom.document.activeElement, positionAt(4, 6));
dom.document.activeElement.dispatch("keydown", { key: "ArrowUp" });
assert.equal(dom.document.activeElement, positionAt(5, 6), "Vertical keyboard movement follows visual order, independent of string numbering");
dom.document.activeElement.dispatch("keydown", { key: "ArrowDown" });
assert.equal(dom.document.activeElement, positionAt(4, 6));
dom.document.activeElement.dispatch("keydown", { key: "Home" });
assert.equal(dom.document.activeElement, positionAt(4, 0));
dom.document.activeElement.dispatch("keydown", { key: "End" });
assert.equal(dom.document.activeElement, positionAt(4, 12));

const selected = positions.map((position) => ({ ...position, selected: position.stringIndex === 4 && position.fret === 6 }));
context.model = { ...hidden, positions: selected };
positionAt(4, 6).focus(); read("surface.update(model)");
assert.equal(dom.document.activeElement, positionAt(4, 6), "Updating selection preserves focus");
assert.equal(positionAt(4, 6).getAttribute("aria-pressed"), "true");
assert.ok(positionAt(4, 6).classList.contains("is-selected"));
assert.equal(positionAt(4, 6).textContent.includes("F"), false, "A selected hidden position does not reveal its note");

context.model = {
  ...hidden,
  positions: [
    { stringIndex: 4, fret: 6, selectable: false, states: ["previous", "source"], primaryLabel: "F#", secondaryLabel: "3rd of D7", ariaLabel: "String 2, fret 6, F#, previous, third of D7" },
    { stringIndex: 4, fret: 7, selectable: true, states: ["correct", "destination"], primaryLabel: "G", secondaryLabel: "root", ariaLabel: "String 2, fret 7, G, correct, root" },
    { stringIndex: 3, fret: 7, selectable: true, states: ["common"], primaryLabel: "D", ariaLabel: "String 3, fret 7, D, common tone" },
  ],
  connections: [
    { from: { stringIndex: 4, fret: 6 }, to: { stringIndex: 4, fret: 7 }, kind: "up", label: "F# → G" },
    { from: { stringIndex: 3, fret: 7 }, to: { stringIndex: 3, fret: 7 }, kind: "stationary", label: "D stays" },
  ],
};
read("surface.update(model)");
assert.match(accessibleText(board), /F#|G/);
assert.match(positionAt(4, 6).getAttribute("aria-label"), /previous/);
assert.ok(positionAt(4, 7).classList.contains("is-correct"));
assert.ok(positionAt(3, 7).classList.contains("is-common"));
assert.equal(classItems("fb-connection").length, 2);
assert.equal(classItems("fb-stationary").length, 1, "Stationary common tones have a distinct treatment, not a zero-length arrow");
assert.equal(classItems("fb-connection").filter((item) => item.dataset.kind === "up").length, 1);
read('surface.focusPosition({stringIndex:4,fret:7})');
assert.equal(dom.document.activeElement, positionAt(4, 7));

// Session back/replay/reset supplies a fresh hidden view: stale labels, paths and state are removed.
context.model = hidden; read("surface.update(model)");
assert.deepEqual(classItems("fb-position").map((item) => `${item.dataset.stringIndex}:${item.dataset.fret}`),
  [5, 4, 3].flatMap((stringIndex) => Array.from({ length: 13 }, (_, fret) => `${stringIndex}:${fret}`)),
  "Reconciled positions retain logical visual-row/fret tab order after a sparse revealed view");
assert.equal(classItems("fb-connection").length, 0);
assert.equal(classItems("fb-stationary").length, 0);
assert.equal(classItems("is-common").length, 0);
assert.equal(classItems("is-correct").length, 0);
assert.equal(classItems("is-selected").length, 0);
assert.doesNotMatch(board.textContent, /F#|3rd of D7|D stays/);
assert.doesNotMatch(accessibleText(board), /F#|previous|common tone|correct|destination|3rd/);
context.model = { ...hidden, fretRange: { minFret: 8, maxFret: 14 }, positions: [{ stringIndex: 4, fret: 12, selectable: true, ariaLabel: "String 2, fret 12" }] };
read("surface.update(model)");
assert.equal(positionAt(4, 0), undefined);
assert.equal(positionAt(4, 6), undefined);
assert.ok(positionAt(4, 12));
read("surface.destroy()");
assert.equal(board.children.length, 0);

// Shared presentation remains free of musical truth, session policy and heavy framework dependencies.
assert.doesNotMatch(rendererSource, /^import\s/m);
assert.doesNotMatch(rendererSource, /musicQueries|CHORD_FORMULAS|pitchClass|rankCandidates|totalMovement|state\.evidence|localStorage|indexedDB|AudioContext/);
const css = await readFile(new URL("../lab/fretboard.css", import.meta.url), "utf8");
assert.match(css, /overflow-x:\s*auto/);
assert.match(css, /focus-visible/);
console.log("Fretboard UI checks passed for physical geometry, open/cropped necks, focus region, labels, selection, keyboard callbacks, connections, stationary tones and hidden-state cleanup.");
