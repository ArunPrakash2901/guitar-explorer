(function (global) {
  const PITCH_CLASS = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
    F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
    'A#': 10, Bb: 10, B: 11, 'B#': 0, Cb: 11, 'E#': 5, Fb: 4,
  };

  const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const OPEN_STRING_PCS = [4, 9, 2, 7, 11, 4]; // low E -> high E
  const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'E'];

  const CAGED_TEMPLATES = {
    C: { baseRoot: 'C', frets: [null, 3, 2, 0, 1, 0] },
    A: { baseRoot: 'A', frets: [null, 0, 2, 2, 2, 0] },
    G: { baseRoot: 'G', frets: [3, 2, 0, 0, 0, 3] },
    E: { baseRoot: 'E', frets: [0, 2, 2, 1, 0, 0] },
    D: { baseRoot: 'D', frets: [null, null, 0, 2, 3, 2] },
  };

  const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const INTERVALS = {
    0: { short: 'R', name: 'Root / Unison' },
    1: { short: 'b2', name: 'Minor 2nd' },
    2: { short: '2', name: 'Major 2nd' },
    3: { short: 'b3', name: 'Minor 3rd' },
    4: { short: '3', name: 'Major 3rd' },
    5: { short: '4', name: 'Perfect 4th' },
    6: { short: 'b5', name: 'Tritone / diminished 5th' },
    7: { short: '5', name: 'Perfect 5th' },
    8: { short: 'b6', name: 'Minor 6th' },
    9: { short: '6', name: 'Major 6th' },
    10: { short: 'b7', name: 'Minor 7th' },
    11: { short: '7', name: 'Major 7th' },
  };

  function mod12(n) { return ((n % 12) + 12) % 12; }

  function accidentalFor(delta) {
    if (delta === 0) return '';
    if (delta === 1) return '#';
    if (delta === 2) return '##';
    if (delta === -1) return 'b';
    if (delta === -2) return 'bb';
    throw new Error(`Unsupported accidental delta: ${delta}`);
  }

  function parseRoot(root) {
    const m = /^([A-G])([#b]?)$/.exec(root);
    if (!m) throw new Error(`Unsupported root: ${root}`);
    return { letter: m[1], accidental: m[2] };
  }

  function spellScale(root, semitoneSteps = MAJOR_SCALE_STEPS) {
    const { letter } = parseRoot(root);
    const start = LETTERS.indexOf(letter);
    const rootPc = PITCH_CLASS[root];
    return semitoneSteps.map((step, i) => {
      const targetLetter = LETTERS[(start + i) % 7];
      const targetPc = mod12(rootPc + step);
      let delta = mod12(targetPc - NATURAL_PC[targetLetter]);
      if (delta > 6) delta -= 12;
      return `${targetLetter}${accidentalFor(delta)}`;
    });
  }

  function spellMajorScale(root) {
    return spellScale(root, MAJOR_SCALE_STEPS);
  }

  function getMajorTriad(root) {
    const scale = spellMajorScale(root);
    return [scale[0], scale[2], scale[4]];
  }

  function getMajorTriadPCs(root) {
    const rootPc = PITCH_CLASS[root];
    return [rootPc, mod12(rootPc + 4), mod12(rootPc + 7)];
  }

  function getInterval(fromNote, toNote) {
    const semitones = mod12(PITCH_CLASS[toNote] - PITCH_CLASS[fromNote]);
    return { semitones, ...INTERVALS[semitones] };
  }

  function intervalFromPitchClasses(fromPc, toPc) {
    const semitones = mod12(toPc - fromPc);
    return { semitones, ...INTERVALS[semitones] };
  }

  function noteAt(stringIndex, fret) {
    if (stringIndex < 0 || stringIndex > 5) throw new Error('stringIndex must be 0..5');
    if (fret < 0) throw new Error('fret must be >= 0');
    return mod12(OPEN_STRING_PCS[stringIndex] + fret);
  }

  function getCagedVoicing(root, shape) {
    const template = CAGED_TEMPLATES[shape];
    if (!template) throw new Error(`Unknown CAGED shape: ${shape}`);
    const shift = mod12(PITCH_CLASS[root] - PITCH_CLASS[template.baseRoot]);
    return template.frets.map((fret) => (fret === null ? null : fret + shift));
  }

  function getChordToneInfo(root, pitchClass) {
    const rootPc = PITCH_CLASS[root];
    const semitones = mod12(pitchClass - rootPc);
    if (semitones === 0) return { degree: 'R', label: 'Root', className: 'root' };
    if (semitones === 4) return { degree: '3', label: 'Major 3rd', className: 'third' };
    if (semitones === 7) return { degree: '5', label: 'Perfect 5th', className: 'fifth' };
    return null;
  }

  function spellPitchClassInMajorContext(root, pitchClass) {
    const scale = spellMajorScale(root);
    const scalePcs = scale.map((n) => PITCH_CLASS[n]);
    const scaleIndex = scalePcs.indexOf(pitchClass);
    if (scaleIndex >= 0) return scale[scaleIndex];

    const triad = getMajorTriad(root);
    const triadPcs = triad.map((n) => PITCH_CLASS[n]);
    const triadIndex = triadPcs.indexOf(pitchClass);
    if (triadIndex >= 0) return triad[triadIndex];

    return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][pitchClass];
  }

  function findPositionsForPitchClass(pitchClass, maxFret = 15) {
    const positions = [];
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (let fret = 0; fret <= maxFret; fret += 1) {
        if (noteAt(stringIndex, fret) === pitchClass) positions.push({ stringIndex, fret });
      }
    }
    return positions;
  }

  function getMajorProgression(root, degrees = [1, 4, 5, 1]) {
    const scale = spellMajorScale(root);
    const roman = { 1: 'I', 2: 'ii', 3: 'iii', 4: 'IV', 5: 'V', 6: 'vi', 7: 'vii°' };
    return degrees.map((degree) => {
      const rootIndex = degree - 1;
      const chordRoot = scale[rootIndex];
      const third = scale[(rootIndex + 2) % 7];
      const fifth = scale[(rootIndex + 4) % 7];
      return {
        degree,
        roman: roman[degree],
        root: chordRoot,
        notes: [chordRoot, third, fifth],
        pcs: [PITCH_CLASS[chordRoot], PITCH_CLASS[third], PITCH_CLASS[fifth]],
      };
    });
  }

  function stringNumber(stringIndex) {
    return 6 - stringIndex;
  }

  const Music = {
    PITCH_CLASS,
    ROOTS,
    OPEN_STRING_PCS,
    STRING_LABELS,
    CAGED_TEMPLATES,
    INTERVALS,
    mod12,
    spellMajorScale,
    getMajorTriad,
    getMajorTriadPCs,
    getInterval,
    intervalFromPitchClasses,
    noteAt,
    getCagedVoicing,
    getChordToneInfo,
    spellPitchClassInMajorContext,
    findPositionsForPitchClass,
    getMajorProgression,
    stringNumber,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Music;
  else global.Music = Music;
}(typeof globalThis !== 'undefined' ? globalThis : this));
