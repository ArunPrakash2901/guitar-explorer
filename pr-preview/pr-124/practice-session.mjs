// One curated G-major lesson and its A-major transfer, not a progression or curriculum engine.
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function role(chord, degree, alteration = 0) {
  const tone = chord.entry.chord.tones.find((item) => item.degree === degree && item.alteration === alteration);
  if (!tone) throw new Error("The curated lesson requires a role absent from the queried chord");
  return tone;
}

export function createPracticePlan({ getHarmony, getCatalog, findLocations, getInterval, formatNote }) {
  const catalog = getCatalog({}).flatMap(({ chords }) => chords);

  function chordReference(harmony, degree, lessonRole) {
    const entry = harmony.degrees.find((item) => item.degree === degree);
    if (!entry) throw new Error("The harmony query omitted a required lesson degree");
    const metadata = catalog.find(({ id }) => id === entry.chord.chordId);
    if (!metadata) throw new Error("The chord catalogue omitted a required lesson quality");
    return { entry, symbol: `${formatNote(entry.chord.root)}${metadata.symbol}`, lessonRole };
  }

  function locate(key, chord, tone, stringIndex) {
    const matches = findLocations({ key, chord: chord.entry.chord, stringIndex, pitchClass: tone.pitchClass });
    const location = matches.find((item) => item.position.stringIndex === stringIndex);
    if (!location) throw new Error("The guitar query returned no location for a curated lesson note");
    return location;
  }

  function contextFor(tonic) {
    const key = { tonic: { letter: tonic, accidental: 0 }, mode: "major" };
    const triads = getHarmony({ key, chordSize: "triad" });
    const sevenths = getHarmony({ key, chordSize: "seventh" });
    // These roles describe this listening exemplar. Core supplies identity, not function.
    const chords = {
      home: chordReference(triads, 1, "home"),
      departure: chordReference(triads, 4, "departure"),
      pressure: chordReference(sevenths, 5, "pressure"),
      alternative: chordReference(triads, 6, "alternative"),
    };
    const homeTone = role(chords.home, 1);
    const pressureThird = role(chords.pressure, 3);
    const to = { tone: homeTone, plannedLocation: locate(key, chords.home, homeTone, 5) };
    const from = { tone: pressureThird, plannedLocation: locate(key, chords.pressure, pressureThird, 5) };
    const playedInterval = getInterval({ from: from.plannedLocation.pitch, to: to.plannedLocation.pitch });
    return { key, chords, sameNote: to, motion: { from, to, playedInterval } };
  }

  const context = contextFor("G");
  const transfer = contextFor("A");
  const { home, departure, pressure, alternative } = context.chords;
  const fromName = formatNote(context.motion.from.tone.note);
  const toName = formatNote(context.motion.to.tone.note);

  function warmup(id, title, prompt, instruction, chord, degree, stringIndex, anchorChord, anchorString) {
    const tone = role(chord, degree);
    const plannedLocation = locate(context.key, chord, tone, stringIndex);
    const anchor = locate(context.key, anchorChord, role(anchorChord, 1), anchorString);
    return {
      id, title, prompt, instruction, key: context.key, chord, tone, anchor, plannedLocation, stringIndex,
      fretWindow: {
        minFret: Math.max(0, plannedLocation.position.fret - 2),
        maxFret: Math.min(15, plannedLocation.position.fret + 2),
      },
      playedInterval: getInterval({ from: anchor.pitch, to: plannedLocation.pitch }),
    };
  }

  const warmups = [
    warmup("find-home", "Find the session's reference note",
      `Find ${home.symbol} on the high E string. Play it on your guitar before committing its fret.`,
      "Use the stated string and blank window. This is a short retrieval, not a speed test.",
      home, 1, 5, home, 3),
    warmup("home-third", "Wake up one familiar interval",
      `Starting from your established ${home.symbol}, sing its major third. Find and play it on the high E string before committing.`,
      "Keep the same key reference. Notice whether the sound comes before counting frets.",
      home, 3, 5, home, 5),
    warmup("departure-third", "Retrieve one tone from the same material",
      `Use ${departure.symbol} as a chord reference. Predict its major third, then find and play it on the B string.`,
      "This chord belongs to the same session material. Stop after this one tone; do not reconstruct a whole shape.",
      departure, 3, 4, departure, 4),
  ];

  const gravitySteps = [
    {
      id: "home", title: "Establish a place to stop",
      prompt: `Strum ${home.symbol} several times, leave a little silence, and listen. Could this music stop here?`,
      instruction: "Let the sound establish the reference. Describe the consequence before reaching for a theory label.",
      sequence: [[home]],
      choices: [
        { value: "settled", label: "It feels settled" },
        { value: "moving", label: "It still feels in motion" },
        { value: "unclear", label: "I cannot tell yet" },
      ],
      action: "Keep this as the listening reference",
    },
    {
      id: "contrast", title: "Compare departure and unfinished motion",
      prompt: "Play the first path, then the second. Leave silence at the end of each and compare the endings.",
      instruction: "Use comfortable chords you already know. Repeat slowly; the question is how the ending feels, not its name.",
      sequence: [[home, departure, home], [home, pressure]],
      choices: [
        { value: "settled", label: "The endings feel similarly settled" },
        { value: "moving", label: "There is a difference in motion" },
        { value: "unfinished", label: "The second feels strongly unfinished" },
        { value: "unclear", label: "I need to hear them again" },
      ],
      action: "Keep my comparison",
    },
    {
      id: "prediction", title: "Predict before the next chord",
      prompt: "Play this path and stop. Before touching another chord, what do you expect the music to do next?",
      instruction: "Leave real silence. Commit an expectation before trying an ending; this is not a scored answer.",
      sequence: [[home, pressure]],
      choices: [
        { value: "stop", label: "Stop here" },
        { value: "return", label: "Return home" },
        { value: "elsewhere", label: "Go somewhere else" },
      ],
      action: "Commit my prediction",
      afterCommit: {
        prompt: `Now play ${pressure.symbol} → ${home.symbol} and listen. Did this ending meet the expectation you just formed?`,
        instruction: "Compare the consequence with your prediction. No choice is marked correct or wrong.",
        sequence: [[pressure, home]],
      },
    },
    {
      id: "violation", title: "Try an alternative ending",
      prompt: `Re-establish the first path and stop; then try ${pressure.symbol} → ${alternative.symbol}. Does it satisfy the same expectation or redirect the motion?`,
      instruction: "Compare this with the ending you just played. Listen for what changed rather than naming a rule.",
      sequence: [[home, pressure], [pressure, alternative]],
      choices: [
        { value: "same", label: "It meets the same expectation" },
        { value: "redirected", label: "It redirects or prolongs the motion" },
        { value: "different", label: "It feels different in another way" },
        { value: "unclear", label: "I need another comparison" },
      ],
      action: "Keep my observation",
    },
    {
      id: "fixed-note", title: "Keep one physical pitch unchanged",
      prompt: `Strum each chord, then replay the same ${toName} at the displayed location. Does it feel equally stable over every chord?`,
      instruction: "Strum first, then pluck the melody note. You do not need to sustain a fretted note through a full chord change.",
      sequence: [[home, departure, pressure, home]],
      choices: [
        { value: "same", label: "The note feels much the same" },
        { value: "changed", label: "Its effect changes with the chord" },
        { value: "unclear", label: "The difference is not clear yet" },
      ],
      action: "Keep the same pitch in mind",
    },
    {
      id: "melodic-compare", title: "Change one melodic destination",
      prompt: `Play the path twice. First use ${toName} as the melody throughout. Then use ${fromName} over ${pressure.symbol} and land on ${toName} when ${home.symbol} returns. Which version makes the return sound more directed?`,
      instruction: "Strum a chord, then replay the indicated melody note. Sing the destination before playing it. Compare both passes before seeing the explanation.",
      sequence: [[home, departure, pressure, home]],
      choices: [
        { value: "first", label: "The first pass is more directed" },
        { value: "second", label: "The second pass is more directed" },
        { value: "similar", label: "They feel similarly directed" },
        { value: "unclear", label: "I need to compare again" },
      ],
      action: "Inspect the connection after comparing",
    },
    {
      id: "theory-reveal", title: "Let the labels name what you heard",
      prompt: "Now connect the listening experience to a small amount of theory. Replay any comparison whose label still feels detached from its sound.",
      instruction: "These are descriptions of the established musical context. They do not grade your hearing or require a Roman-numeral quiz.",
      action: "Connect one note relationship",
      reveal: {
        heading: "One context, connected representations",
        rows: [
          { label: home.symbol, value: `${home.entry.romanNumeral.label} · tonic / home in this lesson` },
          { label: departure.symbol, value: `${departure.entry.romanNumeral.label} · departure in this comparison` },
          { label: pressure.symbol, value: `${pressure.entry.romanNumeral.label} · strong dominant pressure in this context` },
          { label: alternative.symbol, value: `${alternative.entry.romanNumeral.label} · the alternative ending you compared` },
          { label: "Compared returns", value: `${pressure.symbol} → ${home.symbol}: ${pressure.entry.romanNumeral.label} → ${home.entry.romanNumeral.label}; ${pressure.symbol} → ${alternative.symbol}: ${pressure.entry.romanNumeral.label} → ${alternative.entry.romanNumeral.label}` },
          { label: "One melodic link", value: `${fromName} is the third of ${pressure.symbol}; ${toName} is the root of ${home.symbol}. The played ${fromName} → ${toName} movement is ${context.motion.playedInterval.label}.` },
        ],
        note: "Home, departure and pressure are curated listening interpretations for this exemplar. The engine supplies the notes, chords, intervals and Roman identities; it does not infer harmonic function.",
      },
    },
  ];

  const connection = {
    ...context.motion,
    prompt: `Replay ${pressure.symbol}, then locate and play ${fromName} → ${toName} inside the return to ${home.symbol}.`,
    instruction: `Sing the destination first. Inspect just this one link: ${fromName} is ${pressure.symbol}'s third and ${toName} is ${home.symbol}'s root. Then return to the whole-chord listening comparison.`,
  };
  const musicalize = {
    palette: [context.motion.from, context.motion.to],
    sequence: [home, departure, pressure, home],
    prompt: `Make a tiny phrase using only ${fromName} and ${toName}. Let ${home.symbol}'s return change one destination note.`,
    instruction: `Use ${fromName} over ${pressure.symbol} and choose ${toName} as ${home.symbol} returns. Leave space, sing the destination, and repeat. This is a two-note decision, not a solo or a timed test.`,
  };

  const transferFrom = formatNote(transfer.motion.from.tone.note);
  const transferTo = formatNote(transfer.motion.to.tone.note);
  const t = transfer.chords;
  transfer.steps = [
    {
      id: "transfer-compare", title: "Change the surface, keep the comparison",
      prompt: "Establish the new home chord. Compare a departure-and-return path with a path left unfinished, then try the alternative ending.",
      instruction: "Use known comfortable chords. Do not reconstruct an entire scale. Notice whether the relationships feel analogous despite the different note names.",
      sequence: [[t.home, t.departure, t.home], [t.home, t.pressure], [t.pressure, t.alternative]],
      choices: [
        { value: "analogous", label: "The relationships feel analogous" },
        { value: "different", label: "The new surface changes what I notice" },
        { value: "fingering", label: "Fingering is masking the comparison" },
        { value: "unclear", label: "The relationship is not clear yet" },
      ],
      action: "Predict in the new context",
    },
    {
      id: "transfer-predict", title: "Predict the new return",
      prompt: "Play this path, leave silence, and predict the next musical consequence before playing another chord.",
      instruction: "Make a prediction from the sound. The familiar labels will follow the playing.",
      sequence: [[t.home, t.pressure]],
      choices: [
        { value: "stop", label: "Stop here" },
        { value: "return", label: "Return home" },
        { value: "elsewhere", label: "Go somewhere else" },
      ],
      action: "Commit the transfer prediction",
      afterCommit: {
        prompt: `Play ${t.pressure.symbol} → ${t.home.symbol}, then compare ${t.pressure.symbol} → ${t.alternative.symbol}. Try ${transferFrom} → ${transferTo} as the home chord returns.`,
        instruction: "Play both endings before revealing their labels. Ask whether the directed melodic choice survived the change of key.",
        sequence: [[t.pressure, t.home], [t.pressure, t.alternative]],
      },
    },
    {
      id: "transfer-reveal", title: "Recognize the relationship under new names",
      prompt: "After playing, compare these identities with the original context. The question is whether the relationship transferred, not whether you memorized a second table.",
      instruction: "Replay the new ending if the symbols are clearer than the sound.",
      action: "Reflect on the connection",
      reveal: {
        heading: "Same relationship, new key",
        rows: [
          ...Object.values(t).map(({ symbol, entry }) => ({ label: symbol, value: entry.romanNumeral.label })),
          { label: "Melodic transfer", value: `${transferFrom} is ${t.pressure.symbol}'s third; ${transferTo} is ${t.home.symbol}'s root. The played ${transferFrom} → ${transferTo} movement is ${transfer.motion.playedInterval.label}.` },
        ],
        note: "The musical identities are engine-derived. The listening comparison remains this lesson's curated interpretation, not an automatic function or cadence diagnosis.",
      },
    },
  ];

  return freeze({
    context, transfer, warmups, gravitySteps, connection, musicalize,
    reflectionOptions: [
      { value: "home", label: "Hearing home" },
      { value: "pressure", label: "Hearing dominant pressure" },
      { value: "prediction", label: "Predicting the return" },
      { value: "alternative", label: "Noticing deceptive or redirected motion" },
      { value: "labels", label: "Connecting the sound to Roman labels" },
      { value: "destination", label: "Choosing a melodic destination" },
      { value: "location", label: "Fretboard location" },
      { value: "fingering", label: "Chord fingering got in the way" },
      { value: "none", label: "No clear breakdown" },
    ],
    immediacyOptions: [
      { value: "immediate", label: "Immediate" },
      { value: "thought", label: "Clear after a little thought" },
      { value: "calculated", label: "Mostly calculated" },
      { value: "unclear", label: "Unclear" },
    ],
  });
}
