const MATERIALS = Object.freeze([
  Object.freeze({
    id: "JF-CAND-012",
    filename: "jf-cand-012.json",
    title: "Can’t Stop",
    subtitle: "2002 · riff research fragment",
    question: "The studio source supports D3, but not one unique place to play it. How do the two candidate locations feel on your guitar?",
    interactive: true,
  }),
  Object.freeze({
    id: "JF-CAND-004",
    filename: "jf-cand-004.json",
    title: "Under the Bridge",
    subtitle: "1991 · intro research fragment",
    question: "How do the studio, live and later demonstration realizations differ without pretending one proves the studio fingering?",
    interactive: false,
  }),
  Object.freeze({
    id: "JF-CAND-011",
    filename: "jf-cand-011.json",
    title: "The Past Recedes",
    subtitle: "2005 · acoustic opening research fragment",
    question: "What can the visible video voicing teach you while keeping the studio fingering explicitly unknown?",
    interactive: false,
  }),
]);

export const INTERESTING_MATERIALS = MATERIALS;

export function materialSpec(id) {
  return MATERIALS.find((item) => item.id === id) ?? null;
}

function fixtureUrl(filename) {
  return new URL(`./research/style/${filename}`, import.meta.url);
}

export async function loadInterestingMaterials({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  return Promise.all(MATERIALS.map(async (spec) => {
    const response = await fetchImpl(fixtureUrl(spec.filename));
    if (!response?.ok) throw new Error(`Could not load research material ${spec.id}`);
    const fragment = await response.json();
    if (fragment?.schemaVersion !== 1 || fragment?.id !== spec.id) {
      throw new Error(`Research material ${spec.id} does not match the merged v1 fixture`);
    }
    return Object.freeze({ spec, fragment });
  }));
}

export function evidenceBoundary(fragment) {
  if (!fragment || !Array.isArray(fragment.observations)) throw new TypeError("Research fragment is required");
  return Object.freeze({
    supported: Object.freeze(fragment.observations.filter((item) => item.status !== "unknown" && item.status !== "contested")),
    unknown: Object.freeze(fragment.observations.filter((item) => item.status === "unknown")),
    contested: Object.freeze(fragment.observations.filter((item) => item.status === "contested")),
    alternatives: Object.freeze([...(fragment.alternatives ?? [])]),
    interpretations: Object.freeze([...(fragment.interpretations ?? [])]),
    sources: Object.freeze([...(fragment.sources ?? [])]),
    realizations: Object.freeze([...(fragment.realizations ?? [])]),
  });
}

function observation(fragment, id, kind) {
  const value = fragment.observations.find((item) => item.id === id);
  if (!value || value.kind !== kind) throw new TypeError(`Expected ${kind} observation ${id}`);
  return value;
}

export function cantStopPractice(fragment) {
  if (fragment?.id !== "JF-CAND-012") throw new TypeError("Can’t Stop research fragment is required");
  const studioPitch = observation(fragment, "cs-studio-d", "sounding_pitch");
  const studioPosition = observation(fragment, "cs-studio-unknown", "physical_position");
  const openD = observation(fragment, "cs-open-d", "physical_position");
  const aFive = observation(fragment, "cs-a5", "physical_position");
  const mutedStroke = observation(fragment, "cs-muted-stroke", "string_stroke");
  const alternative = fragment.alternatives.find((item) => item.id === "cs-d-position");

  if (studioPitch.value.pitch !== "D3") throw new TypeError("Expected the reported studio pitch D3");
  if (studioPosition.status !== "unknown" || studioPosition.value.stringIndex !== null || studioPosition.value.fret !== null) {
    throw new TypeError("Studio position must remain unknown");
  }
  if (!alternative || alternative.status !== "unresolved") throw new TypeError("D3 position alternatives must remain unresolved");

  return Object.freeze({
    studioPitch,
    studioPosition,
    candidates: Object.freeze([openD, aFive]),
    mutedStroke,
    alternative,
  });
}
