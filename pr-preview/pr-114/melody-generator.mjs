// Deterministic rule-based generator for ScenarioV1 Melody scenarios.
// Generates candidate ScenarioV1 specifications and compiles them via the pure Scenario Resolver.
import { getMelodyRuleById, getMelodyRules } from "./rule-contract.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { resolveScenario, ScenarioError } from "./scenario-resolver.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { makeGeneratedScenarioId } from "./scenario-identity.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";

export class GenerationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GenerationError";
    this.details = details;
    this.ruleId = details.ruleId;
    this.difficulty = details.difficulty;
    this.seed = details.seed;
    this.attempts = details.attempts ?? details.attemptCount;
    this.attemptCount = this.attempts;
    this.bestScore = details.bestScoreReached ?? details.bestScore;
    this.bestScoreReached = this.bestScore;
    this.lastFailure = details.lastFailure;
  }
}

export const MIN_PEDAGOGICAL_SCORE = 5;
// Version 2 replaces random-comparator sorting. Version-1 seeds may resolve
// differently; Rule V1 and ScenarioV1 themselves retain their existing versions.
export const GENERATOR_VERSION = 2;

// Deterministic Mulberry32 32-bit PRNG
export function createPrng(seedInput) {
  let seed = 0;
  if (typeof seedInput === "number") {
    seed = (seedInput >>> 0) || 1;
  } else if (typeof seedInput === "string") {
    for (let i = 0; i < seedInput.length; i += 1) {
      seed = (Math.imul(31, seed) + seedInput.charCodeAt(i)) >>> 0;
    }
    if (seed === 0) seed = 1;
  } else {
    seed = 1;
  }
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Descending Fisher-Yates: exactly one PRNG draw for each i = n-1 through 1.
// Keep the declared input order and swap with floor(draw * (i + 1)); never use
// a random sort comparator, whose draw schedule varies between JS engines.
function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const formatKeyName = (k) => `${k.letter}${k.accidental === 1 ? "#" : k.accidental === -1 ? "♭" : ""}`;
const sameNote = (a, b) => a.letter === b.letter && a.accidental === b.accidental;

function calculateDiatonicScaleDegree(chordRootDegree, toneDegree) {
  return ((chordRootDegree - 1 + (toneDegree - 1)) % 7) + 1;
}

function scoreCandidate(resolved) {
  let score = 0;
  const motion = Math.abs(resolved.main.targetMotion.semitones);
  if (motion === 1 || motion === 2) score += 3;
  else if (motion === 3 || motion === 4) score += 1;
  else score -= 1;

  const targetDeg = resolved.spec.targets.target.degree;
  if (targetDeg === 3 || targetDeg === 7) score += 3;
  else if (targetDeg === 1 || targetDeg === 5) score += 1;

  const arrivalDeg = resolved.spec.targets.arrival.degree;
  if (arrivalDeg === 1 || arrivalDeg === 3) score += 2;

  const span = resolved.spec.fretboard.main.maxFret - resolved.spec.fretboard.main.minFret;
  if (span >= 6 && span <= 9) score += 2;

  return score;
}

export function getScenarioFingerprint(input) {
  if (!input) return "";
  const scenario = input.scenario || input.spec || input;
  const resolved = input.resolved || (input.spec ? input : null);
  const provenance = input.provenance || null;

  const family = provenance?.family || provenance?.ruleId || scenario?.id?.split?.("-")?.[1] || "melody";

  const mainTonic = scenario?.context?.key?.tonic;
  const keyStr = mainTonic ? `${formatKeyName(mainTonic)} ${scenario.context.key.mode}` : "";

  const chordsStr = resolved?.main?.chords
    ? resolved.main.chords.map((c) => c.symbol).join(" > ")
    : (scenario?.context?.degrees ? `${scenario.context.degrees.join("-")}:${scenario.context.chordSize}` : "");

  const tgt = scenario?.targets?.target;
  const arr = scenario?.targets?.arrival;
  const motion = resolved?.main?.targetMotion;
  const motionStr = motion ? `(${motion.diatonicSteps}steps,${motion.semitones}st)` : "";
  const relStr = (tgt && arr)
    ? `c${tgt.chordIndex}d${tgt.degree}s${tgt.stringIndex}->c${arr.chordIndex}d${arr.degree}s${arr.stringIndex}${motionStr}`
    : "";

  const targetPos = resolved?.main?.target?.position;
  const targetPosStr = targetPos ? `s${targetPos.stringIndex}f${targetPos.fret}` : "";

  const reg = scenario?.fretboard?.main;
  const regStr = reg ? `s[${reg.strings.join(",")}]f${reg.minFret}-${reg.maxFret}` : "";

  const transTonic = scenario?.transfer?.key?.tonic;
  const transKeyStr = transTonic ? `${formatKeyName(transTonic)} ${scenario.transfer.key.mode}` : "";

  return `family:${family}|key:${keyStr}|prog:${chordsStr}|rel:${relStr}|targetPos:${targetPosStr}|region:${regStr}|transferKey:${transKeyStr}`;
}

export function generateMelodyScenario({ ruleId, difficulty = "introductory", seed = 1, queries, attemptBudget = 30, minScore = MIN_PEDAGOGICAL_SCORE } = {}) {
  if (!queries) throw new Error("queries parameter is required for scenario generation");
  const rule = ruleId === "surprise" || !ruleId
    ? getMelodyRules()[Math.floor(createPrng(seed)() * getMelodyRules().length)]
    : getMelodyRuleById(ruleId);

  if (!rule) throw new GenerationError(`Unknown rule: ${ruleId}`, { ruleId });
  if (!["introductory", "developing", "transfer"].includes(difficulty)) {
    throw new GenerationError(`Unknown difficulty: ${difficulty}`, { difficulty });
  }

  const random = createPrng(seed);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];

  const keyPool = rule.keyPools[difficulty] || rule.keyPools.introductory;
  if (!keyPool || !keyPool.length) {
    throw new GenerationError(`No keys available for difficulty ${difficulty}`, { ruleId: rule.id, difficulty });
  }

  const failures = [];
  let bestCandidate = null;
  let bestResolved = null;
  let bestScore = -Infinity;
  let successfulAttempts = 0;

  for (let attempt = 1; attempt <= attemptBudget; attempt += 1) {
    const mainTonic = pick(keyPool);
    const mainKey = { tonic: mainTonic, mode: "major" };
    const template = pick(rule.progressionTemplates);

    let targetDegree = 3;
    let arrivalDegree = 1;
    if (rule.targetRole) {
      targetDegree = rule.targetRole.targetDegree;
      arrivalDegree = rule.targetRole.arrivalDegree;
    } else if (rule.targetPairs) {
      const pair = pick(rule.targetPairs);
      targetDegree = pair.targetDegree;
      arrivalDegree = pair.arrivalDegree;
    }

    let mainHarmony;
    try {
      mainHarmony = queries.getHarmony({ key: mainKey, chordSize: template.chordSize });
    } catch (err) {
      failures.push({ attempt, error: `main harmony: ${err.message}` });
      continue;
    }

    const targetEntry = mainHarmony.degrees.find((d) => d.degree === template.degrees[template.targetChordIndex]);
    if (!targetEntry) {
      failures.push({ attempt, error: "target chord entry not found" });
      continue;
    }
    const targetTone = targetEntry.chord.tones.find((t) => t.degree === targetDegree);
    if (!targetTone) {
      failures.push({ attempt, error: `target tone degree ${targetDegree} absent from chord` });
      continue;
    }

    const targetScaleDegree = calculateDiatonicScaleDegree(template.degrees[template.targetChordIndex], targetDegree);
    const approachScaleDegree = targetScaleDegree === 1 ? 7 : targetScaleDegree - 1;
    const lead0Degree = approachScaleDegree === 1 ? 7 : approachScaleDegree - 1;

    const targetStringIndex = 5;
    const targetLocs = queries.findLocations({
      key: mainKey,
      chord: targetEntry.chord,
      stringIndices: [targetStringIndex],
      fretRange: { minFret: 0, maxFret: 14 },
      pitchClasses: [targetTone.pitchClass],
    }).filter((l) => sameNote(l.pitch.note, targetTone.note));

    if (!targetLocs.length) {
      failures.push({ attempt, error: `target note ${targetTone.note.letter} absent on string ${targetStringIndex}` });
      continue;
    }

    const chosenTarget = (difficulty === "introductory" ? targetLocs.find((l) => l.position.fret <= 9) : null) || targetLocs[0];
    const F = chosenTarget.position.fret;

    let minFret = Math.max(0, F - 4);
    let maxFret = Math.min(15, minFret + 7);
    if (F < minFret || F > maxFret) continue;

    const arrivalEntry = mainHarmony.degrees.find((d) => d.degree === template.degrees[template.arrivalChordIndex]);
    if (!arrivalEntry) continue;
    const arrivalTone = arrivalEntry.chord.tones.find((t) => t.degree === arrivalDegree);
    if (!arrivalTone) continue;

    const arrivalLocs = queries.findLocations({
      key: mainKey,
      chord: arrivalEntry.chord,
      stringIndices: [targetStringIndex],
      fretRange: { minFret, maxFret },
      pitchClasses: [arrivalTone.pitchClass],
    }).filter((l) => sameNote(l.pitch.note, arrivalTone.note));

    if (!arrivalLocs.length) {
      failures.push({ attempt, error: `arrival note absent in frets ${minFret}–${maxFret}` });
      continue;
    }

    let scale;
    try {
      scale = queries.getScale({ tonic: mainTonic, scaleId: "major" });
    } catch (err) {
      failures.push({ attempt, error: `scale query: ${err.message}` });
      continue;
    }

    const appTone = scale.tones.find((t) => t.degree === approachScaleDegree);
    const lead0Tone = scale.tones.find((t) => t.degree === lead0Degree);
    if (!appTone || !lead0Tone) continue;

    const appLocs = queries.findLocations({
      key: mainKey,
      chord: targetEntry.chord,
      stringIndices: [targetStringIndex],
      fretRange: { minFret, maxFret },
      pitchClasses: [appTone.pitchClass],
    }).filter((l) => sameNote(l.pitch.note, appTone.note));

    if (!appLocs.length) {
      failures.push({ attempt, error: `approach note absent in frets ${minFret}–${maxFret}` });
      continue;
    }
    const appLoc = appLocs[0];

    let lead0String = null;
    for (const testStr of [targetStringIndex - 1, targetStringIndex]) {
      const l0 = queries.findLocations({
        key: mainKey,
        chord: targetEntry.chord,
        stringIndices: [testStr],
        fretRange: { minFret, maxFret },
        pitchClasses: [lead0Tone.pitchClass],
      }).filter((l) => sameNote(l.pitch.note, lead0Tone.note) && l.semitone < appLoc.semitone);
      if (l0.length) {
        lead0String = testStr;
        break;
      }
    }
    if (lead0String === null) {
      failures.push({ attempt, error: "cannot find ascending lead note 0" });
      continue;
    }

    const altKeys = keyPool.filter((k) => k.letter !== mainTonic.letter);
    const candidateAltKeys = shuffled(altKeys, random);
    let transTonic = null;
    let transMinFret = 0;
    let transMaxFret = 8;

    for (const tk of candidateAltKeys) {
      let transHarmony;
      try {
        transHarmony = queries.getHarmony({ key: { tonic: tk, mode: "major" }, chordSize: template.chordSize });
      } catch {
        continue;
      }

      const transTargetEntry = transHarmony.degrees.find((d) => d.degree === template.degrees[template.targetChordIndex]);
      if (!transTargetEntry) continue;
      const transTargetTone = transTargetEntry.chord.tones.find((t) => t.degree === targetDegree);
      if (!transTargetTone) continue;

      const transTargetLocs = queries.findLocations({
        key: { tonic: tk, mode: "major" },
        chord: transTargetEntry.chord,
        stringIndices: [targetStringIndex],
        fretRange: { minFret: 0, maxFret: 14 },
        pitchClasses: [transTargetTone.pitchClass],
      }).filter((l) => sameNote(l.pitch.note, transTargetTone.note));
      if (!transTargetLocs.length) continue;

      const chosenTransTarget = (difficulty === "introductory" ? transTargetLocs.find((l) => l.position.fret <= 9) : null) || transTargetLocs[0];
      const TF = chosenTransTarget.position.fret;
      transMinFret = Math.max(0, TF - 4);
      transMaxFret = Math.min(15, transMinFret + 7);

      transTonic = tk;
      break;
    }

    if (!transTonic) {
      failures.push({ attempt, error: "no valid transfer key found" });
      continue;
    }

    const strings = lead0String === targetStringIndex - 1 ? [targetStringIndex - 1, targetStringIndex] : [targetStringIndex];

    const candidate = {
      version: 1,
      type: "melody",
      id: makeGeneratedScenarioId({ family: rule.family, difficulty, seed }),
      title: `${rule.title} (${formatKeyName(mainTonic)} major)`,
      description: `Generated · ${rule.title} · ${difficulty} · seed ${seed}`,
      difficulty,
      context: {
        key: mainKey,
        degrees: [...template.degrees],
        chordSize: template.chordSize,
      },
      transfer: {
        key: { tonic: transTonic, mode: "major" },
      },
      fretboard: {
        main: { strings, minFret, maxFret },
        transfer: { strings, minFret: transMinFret, maxFret: transMaxFret },
      },
      targets: {
        target: { chordIndex: template.targetChordIndex, degree: targetDegree, stringIndex: targetStringIndex },
        arrival: { chordIndex: template.arrivalChordIndex, degree: arrivalDegree, stringIndex: targetStringIndex },
      },
      melody: {
        approachScaleDegree,
        phraseLead: [
          { scaleDegree: lead0Degree, stringIndex: lead0String },
          { scaleDegree: approachScaleDegree, stringIndex: targetStringIndex },
        ],
      },
    };

    try {
      const resolved = resolveScenario(candidate, queries);
      const score = scoreCandidate(resolved);
      successfulAttempts += 1;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
        bestResolved = resolved;
      }
      if (score >= minScore) {
        const fingerprint = getScenarioFingerprint({
          scenario: bestCandidate,
          resolved: bestResolved,
          provenance: { ruleId: rule.id, family: rule.family, difficulty, seed },
        });
        return {
          scenario: bestCandidate,
          resolved: bestResolved,
          provenance: {
            source: "generated",
            ruleId: rule.id,
            family: rule.family,
            difficulty,
            seed,
            attempts: attempt,
            score: bestScore,
            fingerprint,
            generatorVersion: GENERATOR_VERSION,
          },
        };
      }
    } catch (err) {
      failures.push({ attempt, error: err instanceof ScenarioError ? err.message : String(err) });
    }
  }

  const lastFailure = failures[failures.length - 1];
  const lastErrorMsg = lastFailure?.error || (bestCandidate ? `Candidate scored ${bestScore}, below required floor ${minScore}` : "No candidate resolved");
  throw new GenerationError(
    `Failed to generate scenario meeting pedagogical score floor (${minScore}) for rule ${rule.id} (seed ${seed}) after ${attemptBudget} attempts. Best score reached: ${bestScore === -Infinity ? "none" : bestScore}. Last failure: ${lastErrorMsg}`,
    {
      ruleId: rule.id,
      difficulty,
      seed,
      attempts: attemptBudget,
      attemptCount: attemptBudget,
      bestScoreReached: bestScore === -Infinity ? null : bestScore,
      bestScore: bestScore === -Infinity ? null : bestScore,
      lastFailure: lastErrorMsg,
      failures: failures.slice(-3),
    }
  );
}

export function generateDistinctMelodyScenario({
  ruleId,
  difficulty = "introductory",
  currentSeed = 1,
  currentFingerprint = "",
  queries,
  maxRetries = 30,
  attemptBudget = 30,
  minScore = MIN_PEDAGOGICAL_SCORE,
} = {}) {
  let nextSeed = typeof currentSeed === "number" ? currentSeed : (Number.parseInt(currentSeed, 10) || 1);
  const failures = [];

  for (let step = 1; step <= maxRetries; step += 1) {
    nextSeed += 1;
    try {
      const candidate = generateMelodyScenario({
        ruleId,
        difficulty,
        seed: nextSeed,
        queries,
        attemptBudget,
        minScore,
      });
      const fp = candidate.provenance?.fingerprint || getScenarioFingerprint(candidate);
      if (fp !== currentFingerprint) {
        return candidate;
      }
      failures.push({ seed: nextSeed, reason: "Identical surface fingerprint" });
    } catch (err) {
      failures.push({ seed: nextSeed, reason: err.message });
    }
  }

  throw new GenerationError(
    `Failed to generate distinct scenario surface after ${maxRetries} seeds from seed ${currentSeed}.`,
    {
      ruleId,
      difficulty,
      seed: currentSeed,
      attempts: maxRetries,
      attemptCount: maxRetries,
      bestScoreReached: null,
      lastFailure: failures[failures.length - 1]?.reason || "No distinct surface found",
      failures: failures.slice(-3),
    }
  );
}
