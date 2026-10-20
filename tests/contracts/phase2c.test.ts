import { describe, expect, it } from "vitest";
import { CHORD_FORMULAS } from "../../src/engine/core/collections.js";
import { parseNote } from "../../src/engine/core/pitch.js";
import { musicQueries } from "../../src/engine/query/index.js";
import { chordCatalogFixtures } from "../fixtures/chords.js";

describe("Phase 2C public chord catalogue", () => {
  it("returns the complete deterministic JSON catalogue through schema version 1", () => {
    const request = Object.freeze({});
    const first = musicQueries.getChordCatalog(request);
    const second = musicQueries.getChordCatalog({});
    expect(first).toEqual(second);
    expect(first).toMatchObject({ schemaVersion: 1, ok: true });
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    if (!first.ok) throw new Error(first.error.message);
    const entries = first.data.flatMap(({ chords }) => chords);
    expect(request).toEqual({});
    expect(entries.map(({ id }) => id)).toEqual(chordCatalogFixtures.map(({ id }) => id));
    for (const entry of entries) expect(entry.formula).toBe(CHORD_FORMULAS[entry.id]);
  });

  it("builds every catalogue entry through the existing getChord query", () => {
    const catalog = musicQueries.getChordCatalog({});
    if (!catalog.ok) throw new Error(catalog.error.message);
    for (const entry of catalog.data.flatMap(({ chords }) => chords)) {
      const result = musicQueries.getChord({ root: parseNote("C#"), chordId: entry.id });
      expect(result).toMatchObject({ schemaVersion: 1, ok: true });
      if (!result.ok) throw new Error(result.error.message);
      expect(result.data.formula).toEqual(entry.formula);
    }
  });

  it("retains typed errors for malformed and unsupported chord requests", () => {
    const malformed = musicQueries.getChord({ root: parseNote("C"), chordId: 3 as never });
    const unsupported = musicQueries.getChord({ root: parseNote("C"), chordId: "dominant7Sharp11" as never });
    expect(malformed).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(unsupported).toMatchObject({ ok: false, error: { code: "UNSUPPORTED" } });
    expect(musicQueries.getChordCatalog(null as never)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });
});
