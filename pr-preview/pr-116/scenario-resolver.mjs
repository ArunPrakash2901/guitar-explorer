// ScenarioV1 is a Lab contract for the two present teaching procedures, not a
// theory model. All pitches, chord names, roles and positions come from queries.
export class ScenarioError extends Error {
  constructor(path, message) { super(`${path}: ${message}`); this.name = "ScenarioError"; this.path = path; }
}
const fail = (path, message) => { throw new ScenarioError(path, message); };
function shape(value, path, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected an object");
  for (const field of Object.keys(value)) if (!fields.includes(field)) fail(`${path}.${field}`, "unsupported field");
  for (const field of fields) if (!(field in value)) fail(`${path}.${field}`, "required field is missing");
}
function integer(value, path, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(path, `expected integer ${min}–${max}`);
}
function key(value, path) {
  shape(value, path, ["tonic", "mode"]); shape(value.tonic, `${path}.tonic`, ["letter", "accidental"]);
  if (!/^[A-G]$/.test(value.tonic.letter) || value.mode !== "major") fail(path, "only spelled major keys are supported by these Labs");
  integer(value.tonic.accidental, `${path}.tonic.accidental`, -2, 2);
}
function region(value, path) {
  shape(value, path, ["strings", "minFret", "maxFret"]);
  if (!Array.isArray(value.strings) || !value.strings.length || new Set(value.strings).size !== value.strings.length) fail(`${path}.strings`, "expected unique nonempty string indices");
  value.strings.forEach((item, index) => integer(item, `${path}.strings[${index}]`, 0, 5));
  integer(value.minFret, `${path}.minFret`, 0, 15); integer(value.maxFret, `${path}.maxFret`, value.minFret, 15);
}
function role(value, path, count, strings) {
  shape(value, path, ["chordIndex", "degree", "stringIndex"]);
  integer(value.chordIndex, `${path}.chordIndex`, 0, count - 1);
  integer(value.degree, `${path}.degree`, 1, 13);
  integer(value.stringIndex, `${path}.stringIndex`, 0, 5);
  if (!strings.includes(value.stringIndex)) fail(`${path}.stringIndex`, "string is outside the chosen region");
}
function cell(value, path, count, strings) {
  shape(value, path, ["chordIndex", "lowerDegree", "upperDegree", "lowerString", "upperString"]);
  integer(value.chordIndex, `${path}.chordIndex`, 0, count - 1);
  for (const field of ["lowerDegree", "upperDegree"]) integer(value[field], `${path}.${field}`, 1, 13);
  for (const field of ["lowerString", "upperString"]) {
    integer(value[field], `${path}.${field}`, 0, 5);
    if (!strings.includes(value[field])) fail(`${path}.${field}`, "string is outside the chosen region");
  }
  if (value.lowerDegree === value.upperDegree) fail(path, "the cell needs two distinct chord roles");
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const sameNote = (a, b) => a.letter === b.letter && a.accidental === b.accidental;
const sameInterval = (a, b) => a.diatonicSteps === b.diatonicSteps && a.semitones === b.semitones;

export function resolveScenario(scenario, q) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) fail("scenario", "expected an object");
  if (!["melody", "motif"].includes(scenario.type)) fail("scenario.type", "unknown scenario type");
  shape(scenario, "scenario", ["version", "type", "id", "title", "description", "difficulty", "context", "transfer", "fretboard", "targets", scenario?.type === "melody" ? "melody" : "motif"]);
  if (scenario.version !== 1) fail("scenario.version", "unsupported contract version");
  for (const field of ["id", "title", "description"]) if (typeof scenario[field] !== "string" || !scenario[field].trim()) fail(`scenario.${field}`, "expected nonempty text");
  if (!["introductory", "developing", "transfer"].includes(scenario.difficulty)) fail("scenario.difficulty", "unknown descriptive difficulty");
  shape(scenario.context, "scenario.context", ["key", "degrees", "chordSize"]); key(scenario.context.key, "scenario.context.key");
  if (!Array.isArray(scenario.context.degrees) || scenario.context.degrees.length < 3 || scenario.context.degrees.length > 4) fail("scenario.context.degrees", "expected three or four chord degrees");
  scenario.context.degrees.forEach((degree, index) => integer(degree, `scenario.context.degrees[${index}]`, 1, 7));
  if (!["triad", "seventh"].includes(scenario.context.chordSize)) fail("scenario.context.chordSize", "unsupported chord size");
  shape(scenario.transfer, "scenario.transfer", ["key"]); key(scenario.transfer.key, "scenario.transfer.key");
  shape(scenario.fretboard, "scenario.fretboard", ["main", "transfer"]);
  region(scenario.fretboard.main, "scenario.fretboard.main"); region(scenario.fretboard.transfer, "scenario.fretboard.transfer");
  shape(scenario.targets, "scenario.targets", ["target", "arrival"]);
  for (const [name, value] of Object.entries(scenario.targets)) {
    role(value, `scenario.targets.${name}`, scenario.context.degrees.length, scenario.fretboard.main.strings);
    if (!scenario.fretboard.transfer.strings.includes(value.stringIndex)) fail(`scenario.targets.${name}.stringIndex`, "target string is absent in transfer region");
  }
  if (scenario.targets.arrival.chordIndex <= scenario.targets.target.chordIndex) fail("scenario.targets.arrival", "arrival must follow the first target");
  if (scenario.type === "melody") {
    shape(scenario.melody, "scenario.melody", ["approachScaleDegree", "phraseLead"]);
    integer(scenario.melody.approachScaleDegree, "scenario.melody.approachScaleDegree", 1, 7);
    if (!Array.isArray(scenario.melody.phraseLead) || scenario.melody.phraseLead.length !== 2) fail("scenario.melody.phraseLead", "expected two opening notes");
    scenario.melody.phraseLead.forEach((lead, i) => {
      shape(lead, `scenario.melody.phraseLead[${i}]`, ["scaleDegree", "stringIndex"]);
      integer(lead.scaleDegree, `scenario.melody.phraseLead[${i}].scaleDegree`, 1, 7);
      if (!scenario.fretboard.main.strings.includes(lead.stringIndex) || !scenario.fretboard.transfer.strings.includes(lead.stringIndex)) fail(`scenario.melody.phraseLead[${i}].stringIndex`, "phrase string is outside a region");
    });
  } else {
    shape(scenario.motif, "scenario.motif", ["source", "adaptation", "arrival", "sequence"]);
    for (const name of ["source", "adaptation", "arrival"]) {
      cell(scenario.motif[name], `scenario.motif.${name}`, scenario.context.degrees.length, scenario.fretboard.main.strings);
      for (const field of ["lowerString", "upperString"]) if (!scenario.fretboard.transfer.strings.includes(scenario.motif[name][field])) fail(`scenario.motif.${name}.${field}`, "cell string is absent in transfer region");
    }
    if (scenario.motif.source.chordIndex !== 0 || scenario.motif.adaptation.chordIndex !== scenario.targets.target.chordIndex || scenario.motif.arrival.chordIndex !== scenario.targets.arrival.chordIndex) fail("scenario.motif", "cell chord indices must follow source, target and arrival");
    shape(scenario.motif.sequence, "scenario.motif.sequence", ["lowerScaleDegree", "upperScaleDegree", "lowerString", "upperString"]);
    for (const field of ["lowerScaleDegree", "upperScaleDegree"]) integer(scenario.motif.sequence[field], `scenario.motif.sequence.${field}`, 1, 7);
    for (const field of ["lowerString", "upperString"]) if (!scenario.fretboard.main.strings.includes(scenario.motif.sequence[field])) fail(`scenario.motif.sequence.${field}`, "sequence string is outside the region");
  }

  try {
    const catalog = q.getCatalog({}).flatMap(({ chords }) => chords);
    function context(keySpec, boardRange) {
      const harmony = q.getHarmony({ key: keySpec, chordSize: scenario.context.chordSize });
      const scale = q.getScale({ tonic: keySpec.tonic, scaleId: "major" });
      const chords = scenario.context.degrees.map((degree) => {
        const entry = harmony.degrees.find((item) => item.degree === degree);
        const metadata = catalog.find((item) => item.id === entry?.chord.chordId);
        if (!entry || !metadata) fail("scenario.context.degrees", `degree ${degree} has no supported chord identity`);
        return { entry, chord: entry.chord, symbol: `${q.formatNote(entry.chord.root)}${metadata.symbol}` };
      });
      function tone(chordIndex, degree) {
        const result = chords[chordIndex]?.chord.tones.find((item) => item.degree === degree);
        if (!result) fail("scenario.targets", `degree ${degree} is absent from chord ${chordIndex}`);
        return result;
      }
      function scaleTone(degree) {
        const result = scale.tones.find((item) => item.degree === degree);
        if (!result) fail("scenario.melody", `scale degree ${degree} is absent`);
        return result;
      }
      function locate(note, stringIndex, chordIndex = 0) {
        const matches = q.findLocations({ key: keySpec, chord: chords[chordIndex].chord, stringIndices: [stringIndex],
          fretRange: { minFret: boardRange.minFret, maxFret: boardRange.maxFret }, pitchClasses: [note.pitchClass] });
        const result = matches.find((item) => sameNote(item.pitch.note, note.note));
        if (!result) fail("scenario.fretboard", `no spelled ${q.formatNote(note.note)} on string ${stringIndex} in frets ${boardRange.minFret}–${boardRange.maxFret}`);
        return result;
      }
      function at(chordIndex, stringIndex, fret) { return q.getNoteAtFret({ key: keySpec, chord: chords[chordIndex].chord, stringIndex, fret }); }
      function roleLocation(spec) { return locate(tone(spec.chordIndex, spec.degree), spec.stringIndex, spec.chordIndex); }
      const target = roleLocation(scenario.targets.target);
      const arrival = roleLocation(scenario.targets.arrival);
      const samePitch = arrival;
      const sameRoles = chords.map((_, index) => at(index, samePitch.position.stringIndex, samePitch.position.fret));
      const targetMotion = q.getInterval({ from: target.pitch, to: arrival.pitch });
      return { key: keySpec, harmony, scale, chords, boardRange, tone, scaleTone, locate, at, roleLocation,
        target, arrival, samePitch, sameRoles, targetMotion };
    }
    const main = context(scenario.context.key, scenario.fretboard.main);
    const transfer = context(scenario.transfer.key, scenario.fretboard.transfer);
    if (!sameInterval(main.targetMotion, transfer.targetMotion)) fail("scenario.transfer", "target-to-arrival interval does not transfer");
    if (scenario.type === "melody") {
      function decorate(ctx) {
        const targetTone = ctx.tone(scenario.targets.target.chordIndex, scenario.targets.target.degree);
        const targetScaleTone = ctx.scale.tones.find((item) => sameNote(item.note, targetTone.note));
        const expectedApproachDegree = targetScaleTone ? (targetScaleTone.degree === 1 ? 7 : targetScaleTone.degree - 1) : null;
        if (expectedApproachDegree !== null && scenario.melody.approachScaleDegree !== expectedApproachDegree) {
          fail("scenario.melody.approachScaleDegree", "approach must be one upward diatonic step below target");
        }
        const approach = ctx.locate(ctx.scaleTone(scenario.melody.approachScaleDegree), scenario.targets.target.stringIndex, scenario.targets.target.chordIndex);
        const phrase = scenario.melody.phraseLead.map(({ scaleDegree, stringIndex }) => ctx.locate(ctx.scaleTone(scaleDegree), stringIndex, scenario.targets.target.chordIndex));
        phrase.push(ctx.target, ctx.arrival);
        const step = q.getInterval({ from: approach.pitch, to: ctx.target.pitch });
        if (step.diatonicSteps !== 1 || step.semitones <= 0 || step.semitones > 2) fail("scenario.melody.approachScaleDegree", "approach must be one upward diatonic step below target");
        if (!(phrase[0].semitone < phrase[1].semitone && phrase[1].semitone < phrase[2].semitone)) fail("scenario.melody.phraseLead", "opening phrase must ascend into the target");
        return { ...ctx, approach, phrase };
      }
      return freeze({ spec: scenario, main: decorate(main), transfer: decorate(transfer), formatNote: q.formatNote, getInterval: q.getInterval });
    }
    function motifExamples(ctx) {
      const result = {};
      for (const name of ["source", "adaptation", "arrival"]) {
        const cellSpec = scenario.motif[name];
        const lower = ctx.locate(ctx.tone(cellSpec.chordIndex, cellSpec.lowerDegree), cellSpec.lowerString, cellSpec.chordIndex);
        const upper = ctx.locate(ctx.tone(cellSpec.chordIndex, cellSpec.upperDegree), cellSpec.upperString, cellSpec.chordIndex);
        if (upper.semitone <= lower.semitone) fail(`scenario.motif.${name}`, "upper role must rise above opening role");
        result[name] = [lower, upper, lower];
      }
      return result;
    }
    const examples = { main: motifExamples(main), transfer: motifExamples(transfer) };
    const sequenceSpec = scenario.motif.sequence;
    const sequence = [main.locate(main.scaleTone(sequenceSpec.lowerScaleDegree), sequenceSpec.lowerString),
      main.locate(main.scaleTone(sequenceSpec.upperScaleDegree), sequenceSpec.upperString)];
    sequence.push(sequence[0]);
    const sourceInterval = q.getInterval({ from: examples.main.source[0].pitch, to: examples.main.source[1].pitch });
    const sequenceInterval = q.getInterval({ from: sequence[0].pitch, to: sequence[1].pitch });
    if (!sameInterval(sourceInterval, sequenceInterval)) fail("scenario.motif.sequence", "sequence does not preserve the source interval");
    for (const name of ["source", "adaptation", "arrival"]) {
      const interval = q.getInterval({ from: examples.main[name][0].pitch, to: examples.main[name][1].pitch });
      const moved = q.getInterval({ from: examples.transfer[name][0].pitch, to: examples.transfer[name][1].pitch });
      if (!sameInterval(interval, moved)) fail(`scenario.motif.${name}`, "cell interval does not transfer");
    }
    return freeze({ spec: scenario, main, transfer, examples, sequence, sourceInterval, sequenceInterval,
      formatNote: q.formatNote, getInterval: q.getInterval });
  } catch (error) {
    if (error instanceof ScenarioError) throw error;
    throw new ScenarioError("scenario", `music query could not resolve it: ${error.message}`);
  }
}
