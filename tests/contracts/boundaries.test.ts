import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createScanner, SyntaxKind } from "typescript/unstable/ast";
import { describe, expect, it, vi } from "vitest";

const engineRoot = fileURLToPath(new URL("../../src/engine/", import.meta.url));
const entryPoint = resolve(engineRoot, "index.ts");
type Layer = "entry" | "core" | "guitar" | "query";
const allowedDependencies: Readonly<Record<Layer, readonly Layer[]>> = {
  entry: ["core", "guitar", "query"],
  core: ["core"],
  guitar: ["core", "guitar"],
  query: ["core", "guitar", "query"],
};

function layerOf(file: string): Layer {
  if (file === entryPoint) return "entry";
  const layer = relative(engineRoot, file).split(sep)[0];
  if (layer !== "core" && layer !== "guitar" && layer !== "query") {
    throw new Error(`Unexpected Phase 1 engine module: ${file}`);
  }
  return layer;
}

/** Token scanning includes type imports, re-exports and literal dynamic imports. */
function moduleSpecifiers(text: string, filename: string): readonly string[] {
  const specifiers: string[] = [];
  const scanner = createScanner(true, undefined, text);
  const tokens: { kind: SyntaxKind; value: string }[] = [];
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    tokens.push({ kind, value: scanner.getTokenValue() });
  }
  const append = (token: (typeof tokens)[number] | undefined): void => {
    if (!token || token.kind !== SyntaxKind.StringLiteral) {
      throw new Error(`Module dependency must be a static string in ${filename}`);
    }
    specifiers.push(token.value);
  };
  for (const [index, token] of tokens.entries()) {
    const next = tokens[index + 1];
    // The grammar requires a string after `from` in imports and re-exports.
    if (token.kind === SyntaxKind.FromKeyword && next?.kind === SyntaxKind.StringLiteral) append(next);
    if (token.kind === SyntaxKind.ImportKeyword) {
      if (next?.kind === SyntaxKind.StringLiteral) append(next);
      if (next?.kind === SyntaxKind.OpenParenToken) append(tokens[index + 2]);
    }
    if (token.kind === SyntaxKind.Identifier && token.value === "require" && next?.kind === SyntaxKind.OpenParenToken) {
      append(tokens[index + 2]);
    }
  }
  return specifiers;
}

describe("pure public engine boundary", () => {
  it("keeps the complete public import graph local and follows domain dependency direction", () => {
    const visited = new Set<string>();
    function visit(file: string): void {
      if (visited.has(file)) return;
      visited.add(file);
      for (const specifier of moduleSpecifiers(readFileSync(file, "utf8"), file)) {
        // Rejects React, packages and node builtins, including type-only imports.
        expect(specifier, `${relative(engineRoot, file)} imports ${specifier}`).toMatch(/^\.{1,2}\//);
        expect(specifier, "Node-compatible source specifiers use .js").toMatch(/\.js$/);
        const target = resolve(dirname(file), specifier.replace(/\.js$/, ".ts"));
        const localPath = relative(engineRoot, target);
        expect(localPath === ".." || localPath.startsWith(`..${sep}`) || isAbsolute(localPath),
          `Engine dependency escapes the pure engine: ${specifier}`).toBe(false);
        expect(existsSync(target), `Missing engine dependency ${target}`).toBe(true);
        expect(allowedDependencies[layerOf(file)],
          `${layerOf(file)} cannot depend on ${layerOf(target)}`).toContain(layerOf(target));
        visit(target);
      }
    }
    visit(entryPoint);
    expect([...visited].some((file) => layerOf(file) === "core")).toBe(true);
    expect([...visited].some((file) => layerOf(file) === "guitar")).toBe(true);
    expect([...visited].some((file) => layerOf(file) === "query")).toBe(true);
  });

  it("imports and executes public music queries with browser access trapped", async () => {
    const browserGlobals = ["window", "document", "AudioContext", "webkitAudioContext", "indexedDB", "localStorage", "sessionStorage"];
    const original = new Map(browserGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    try {
      for (const name of browserGlobals) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error(`Pure engine accessed browser global ${name}`); },
        });
      }
      vi.resetModules();
      const engine = await import("../../src/engine/index.js");
      expect(engine.getScale({ tonic: engine.parseNote("C#"), scaleId: "major" }).ok).toBe(true);
      expect(engine.getKeyProfile({ tonic: engine.parseNote("C#"), mode: "major" }).ok).toBe(true);
      expect(engine.getDiatonicHarmony({ key: { tonic: engine.parseNote("F#"), mode: "major" }, chordSize: "seventh" }).ok).toBe(true);
      expect(engine.getInterval({ from: engine.parsePitch("C4"), to: engine.parsePitch("F#4") }).ok).toBe(true);
      expect(engine.getNoteAtFret({ position: { stringIndex: 0, fret: 0 } }).ok).toBe(true);
      expect(engine.analyseNotes({ notes: [engine.parsePitch("E4")], context: {} }).ok).toBe(true);
      const phrase = { duration: { numerator: 1, denominator: 1 }, events: [{
        pitch: engine.parsePitch("C4"), onset: { numerator: 0, denominator: 1 }, duration: { numerator: 1, denominator: 1 },
      }] };
      expect(engine.getPhrase(phrase).ok).toBe(true);
      expect(engine.getPhraseIntervals({ phrase }).ok).toBe(true);
      expect(engine.getPhraseContour({ phrase }).ok).toBe(true);
      expect(engine.transposePhraseQuery({ phrase, interval: { diatonicSteps: 1, semitones: 2 } }).ok).toBe(true);
      expect(engine.extractPhraseFragmentQuery({ phrase, range: { onset: { numerator: 0, denominator: 1 }, duration: { numerator: 1, denominator: 2 } } }).ok).toBe(true);
      expect(engine.comparePhraseIntervals({ left: phrase, right: phrase }).ok).toBe(true);
      expect(engine.comparePhraseContour({ left: phrase, right: phrase }).ok).toBe(true);
      expect(engine.comparePhraseRhythm({ left: phrase, right: phrase }).ok).toBe(true);
      expect(engine.addMusicalTime({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }))
        .toEqual({ numerator: 1, denominator: 1 });
    } finally {
      for (const name of browserGlobals) {
        const descriptor = original.get(name);
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    }
  });

  it("exports the implemented musical queries without later-slice placeholders", async () => {
    const queries = await import("../../src/engine/query/index.js");
    expect(Object.keys(queries).sort()).toEqual([
      "analyseNotes", "getChord", "getChordCatalog", "getDiatonicHarmony", "getFifthsNeighbors", "getFretboardLocations", "getInterval",
      "getKeyProfile", "getKeySignature", "getNoteAtFret", "getRelativeKey", "getScale",
      "invertInterval", "musicQueries", "transposeNoteQuery", "transposePitchQuery",
      "getPhrase", "getPhraseIntervals", "getPhraseContour", "transposePhraseQuery", "extractPhraseFragmentQuery",
      "comparePhraseIntervals", "comparePhraseContour", "comparePhraseRhythm",
    ].sort());
    expect(Object.keys(queries.musicQueries).sort()).toEqual([
      "analyseNotes", "getChord", "getChordCatalog", "getDiatonicHarmony", "getFifthsNeighbors", "getFretboardLocations", "getInterval",
      "getKeyProfile", "getKeySignature", "getNoteAtFret", "getRelativeKey", "getScale",
      "invertInterval", "transposeNote", "transposePitch",
      "getPhrase", "getPhraseIntervals", "getPhraseContour", "transposePhrase", "extractPhraseFragment",
      "comparePhraseIntervals", "comparePhraseContour", "comparePhraseRhythm",
    ].sort());
    expect(Object.values(queries.musicQueries).every((query) => typeof query === "function")).toBe(true);
  });
});
