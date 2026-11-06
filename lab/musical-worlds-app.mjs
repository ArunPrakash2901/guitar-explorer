import { musicQueries, formatPitch, formatNote, toSemitone } from "/engine/index.js";
import { createFretboard } from "/fretboard-view.mjs";
import { stringName } from "/practice-plan.mjs";
import {
  WORLD_DEFINITIONS, ARRANGEMENTS, NOTE_PALETTE, ANCHORS, FEELS,
  positionFromKey, initialWorldState, currentGrid, editGrid, shapeGridCell, emptyGrid,
  arrangeWorld, buildWorldScore, worldRoleFacts, worldReviewPrompts,
} from "./musical-worlds-material.mjs";
import { createWorldAudio } from "./musical-worlds-audio.mjs";
import { createWorldTake } from "./musical-worlds-takes.mjs";

const PLAYBACK = Object.freeze({
  band: [["backing","Play with the band"],["full","Hear my part with the band"],["solo","Hear my part alone"]],
  groove: [["backing","Play over the groove"],["full","Hear my rhythm with the band"],["solo","Hear my rhythm alone"]],
  missing: [["original","Hear the original lead"],["backing","Play in the gap"],["full","Hear my reconstruction"]],
  detective: [["full","Hear the note with chords"],["backing","Play over the chords"]],
  dialogue: [["call","Play call and reply live"],["full","Hear my written reply"],["solo","Hear my reply alone"]],
  composition: [["full","Hear the piece"],["backing","Play my part with backing"],["solo","Hear A and B alone"]],
  expression: [["plain","Hear the plain phrase"],["full","Hear this interpretation"],["backing","Play my interpretation"]],
});
const EDITOR_LABELS = Object.freeze({
  band: "Shape your guitar part", groove: "Shape your right-hand pattern", missing: "Sketch your reconstruction",
  dialogue: "Write a reply", composition: "Shape phrases A and B",
});
const BEAT_NAMES = ["", "e", "&", "a"];
const beatName = step => Math.floor(step / 4) + 1 + BEAT_NAMES[step % 4];
const escapeHtml = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;
function noteAt(noteKey) {
  const result = musicQueries.getNoteAtFret({ position: positionFromKey(noteKey) });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
function selectHtml(id, caption, entries, selected) {
  return `<div class="worlds-option"><label for="${id}">${escapeHtml(caption)}</label><select id="${id}">${entries.map(([v, label]) =>
    `<option value="${escapeHtml(v)}"${v === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></div>`;
}

export function createMusicalWorlds(container) {
  if (!container) throw new TypeError("Musical Worlds needs a container");
  const noteNames = new Map(NOTE_PALETTE.map(k => [k, formatPitch(noteAt(k).pitch)]));
  const pitchLocation = noteKey => {
    const { stringIndex, fret } = positionFromKey(noteKey);
    return noteNames.get(noteKey) + " · " + stringName(stringIndex) + " string, " + (fret === 0 ? "open" : "fret " + fret);
  };
  const noteLabel = item => !item ? "Rest" : item.note === "mute" ? "Muted stroke" : noteNames.get(item.note);
  const phraseLocations = line => line.map(item => beatName(item.step) + ": " + pitchLocation(item.note)).join(" → ");

  container.innerHTML = `
    <div class="worlds-heading">
      <p class="eyebrow">Listen · Play · Make</p>
      <h1 id="worlds-title" tabindex="-1">Musical Worlds</h1>
      <p class="home-intro">Play with the band, answer a phrase or shape a piece. Start with the sound and use your guitar.</p>
    </div>
    <div class="worlds-layout">
      <aside class="worlds-list panel" aria-label="Musical experiences">
        <h2>Choose a world</h2>
        <div id="worlds-choices"></div>
      </aside>
      <div class="worlds-picker">${selectHtml("worlds-select", "Choose a world",
        WORLD_DEFINITIONS.map(w => [w.id, w.title]), "band")}</div>
      <div class="worlds-workspace">
        <section class="panel worlds-context" aria-labelledby="world-question">
          <p class="eyebrow" id="world-intention"></p>
          <h2 id="world-question"></h2>
          <p id="world-action"></p>
          <div class="worlds-options">
            ${selectHtml("world-arrangement", "Backing", ARRANGEMENTS.map(a => [a.id, a.name + " · " + a.tempo + " BPM"]), "interlock")}
            <div id="world-settings"></div>
          </div>
          <p class="quiet" id="world-arrangement-note"></p>
          <ol class="worlds-bars" id="world-bars" aria-label="Four-bar musical form"></ol>
          <p class="worlds-position" id="world-position">Ready · four bars</p>
          <div class="worlds-transport" aria-label="Playback">
            <div id="world-mixes"></div>
            <button type="button" id="world-stop" disabled>Stop</button>
            <label class="worlds-repeat" for="world-repeat"><input type="checkbox" id="world-repeat" checked> Repeat</label>
          </div>
          <div class="worlds-output">
            <span>Sound output</span><meter id="world-level" min="0" max="1" value="0" aria-label="Sound output"></meter>
          </div>
          <p id="world-status" class="feedback" role="status">Choose a playback button when your guitar is ready.</p>
        </section>
        <section class="panel worlds-canvas" aria-label="Play and explore">
          <div id="world-activity"></div>
          <details id="world-editor-panel" class="worlds-details">
            <summary id="world-editor-label">Shape your part</summary>
            <div id="world-compose-settings" class="worlds-options"></div>
            <div id="world-editor"></div>
            <div id="world-neck-panel">
              <h3>Choose a fret</h3>
              <p class="quiet">Select a subdivision, then choose a note on this fretboard.</p>
              <div id="world-neck" class="desk-board"></div>
            </div>
          </details>
          <p id="world-transfer" class="physical-prompt"></p>
        </section>
        <details class="panel worlds-reflect worlds-details">
          <summary>Record a take or leave a note</summary>
          <p class="quiet">Recording is optional. Your take stays in this tab unless you save it to your device.</p>
          <div class="worlds-transport">
            <button type="button" id="world-record">Record a short take</button>
            <button type="button" id="world-record-stop" disabled>Stop recording</button>
            <button type="button" id="world-replay" disabled>Replay my take</button>
            <a id="world-save-recording" hidden>Save take</a>
          </div>
          <p class="quiet" id="world-record-status" role="status"></p>
          <label for="world-reflection">What changed when you played it differently?</label>
          <textarea id="world-reflection" rows="2" placeholder="An observation you want to remember in this tab"></textarea>
        </details>
      </div>
    </div>`;

  const $ = selector => container.querySelector(selector);
  const audio = createWorldAudio({ queries: musicQueries, toSemitone });
  const take = createWorldTake({ onChange: drawTake });
  let state = initialWorldState(), running, request = 0, frame = 0, peak = 0, lastBar = -1;
  const previousEdits = new Map();
  const choices = $("#worlds-choices");
  for (const world of WORLD_DEFINITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.world = world.id;
    const strong = document.createElement("strong");
    strong.textContent = world.title;
    const sub = document.createElement("span");
    sub.textContent = world.intention;
    button.append(strong, sub);
    choices.append(button);
  }

  const board = createFretboard($("#world-neck"), {
    onSelect(position) {
      const field = currentGrid(state), note = key(position);
      if (field && noteNames.has(note)) changePart(editGrid(state, field, state.selectedStep, note));
    },
  });
  function drawTake({ supported, phase, clip, message, replaying }) {
    $("#world-record").disabled = !supported || phase !== "idle";
    $("#world-record-stop").disabled = !["pending", "recording"].includes(phase);
    $("#world-record-stop").textContent = phase === "pending" ? "Cancel recording" : "Stop recording";
    $("#world-replay").disabled = !clip || phase !== "idle";
    $("#world-replay").textContent = replaying ? "Stop replay" : "Replay my take";
    $("#world-save-recording").hidden = !clip;
    if (clip) {
      $("#world-save-recording").href = clip.url;
      $("#world-save-recording").download = clip.name;
    }
    $("#world-record-status").textContent = message;
  }
  function hasPart() {
    const fields = state.world === "composition" ? ["phraseA", "phraseB"] : [currentGrid(state)];
    return fields.some(field => state[field]?.some(Boolean));
  }
  function updateMixes() {
    const needsDraft = Boolean(currentGrid(state));
    $("#world-mixes").innerHTML = PLAYBACK[state.world].map(([mode, text], index) => `<button type="button" data-audio="${mode}"
      ${index === 0 ? ' class="primary"' : ""}${needsDraft && ["full","solo"].includes(mode) && !hasPart() ? " disabled" : ""}>${text}</button>`).join("");
    const audition = $("#world-hear-edit");
    if (audition) audition.disabled = !hasPart();
  }
  function drawTimeline(labels = buildWorldScore(state, { mode: "backing" }).labels) {
    $("#world-bars").innerHTML = labels.map((label, index) => `<li><span>Bar ${index + 1}</span><strong>${escapeHtml(label)}</strong></li>`).join("");
    lastBar = -1;
  }
  function clearPlayhead() {
    $("#world-bars").querySelector('[aria-current="step"]')?.removeAttribute("aria-current");
    $("#world-editor").querySelector(".is-playing")?.classList.remove("is-playing");
    lastBar = -1;
    peak = 0;
    $("#world-level").value = 0;
    $("#world-position").textContent = "Ready · four bars";
    $("#world-stop").disabled = true;
  }
  function stopSound(message) {
    request += 1;
    cancelAnimationFrame(frame);
    running = undefined;
    audio.stop();
    take.stopReplay();
    clearPlayhead();
    if (message) $("#world-status").textContent = message;
  }
  function stop() {
    stopSound("Stopped. Play again when you’re ready.");
    take.stop();
  }
  function paintPlayhead() {
    if (!running) return;
    const position = audio.position();
    if (position.phase === "ended" || position.phase === "interrupted") {
      running = undefined;
      clearPlayhead();
      $("#world-status").textContent = position.phase === "ended"
        ? "Four bars finished. Play again or try a change." : "The browser paused the sound. Press Play to retry.";
      return;
    }
    peak = Math.max(position.level, peak * .92);
    $("#world-level").value = peak;
    if (position.phase === "count-in") {
      $("#world-position").textContent = "Count in · " + position.beat + " of 4";
    } else if (position.phase === "playing") {
      const { bar, step, cycle } = position;
      if (!running.started) {
        running.started = true;
        if (running.mode === "backing" || running.mode === "call") {
          $("#world-status").textContent = "Play your part. Follow the highlighted bar.";
        }
      }
      if (bar !== lastBar) {
        $("#world-bars").querySelector('[aria-current="step"]')?.removeAttribute("aria-current");
        $("#world-bars").children[bar]?.setAttribute("aria-current", "step");
        lastBar = bar;
      }
      $("#world-position").textContent = "Bar " + (bar + 1) + " · " + running.labels[bar] + " · beat " + (Math.floor(step / 4) + 1)
        + (state.repeat ? " · pass " + (cycle + 1) : "");
      const old = $("#world-editor").querySelector(".is-playing");
      const followsPart = state.world === "composition" ? running.labels[bar].startsWith(state.section + " ·")
        : state.world === "dialogue" ? bar % 2 === 1
        : state.world === "missing" ? bar % 2 === 0 : true;
      const next = followsPart ? $("#world-editor").querySelector('[data-step="' + step + '"]') : null;
      if (old !== next) {
        old?.classList.remove("is-playing");
        next?.classList.add("is-playing");
      }
      if (!state.canReveal && ((state.world === "missing" && running.mode === "original" && (bar > 0 || cycle > 0))
        || (state.world === "detective" && ["full","backing"].includes(running.mode) &&
          (cycle > 0 || (state.context === "progression" ? bar > 2 || (bar === 2 && step >= 8) : bar > 0))))) {
        state = { ...state, canReveal: true };
        updateReveal();
      }
    }
    frame = requestAnimationFrame(paintPlayhead);
  }
  async function play(mode) {
    stopSound();
    const ticket = ++request;
    $("#world-stop").disabled = false;
    $("#world-status").textContent = "Getting the band ready…";
    try {
      const score = buildWorldScore(state, { mode });
      const playAlong = mode === "backing" || mode === "call";
      const result = await audio.play(score, { repeat: state.repeat, countIn: playAlong });
      if (ticket !== request || result.cancelled) return;
      running = { mode, labels: score.labels };
      drawTimeline(score.labels);
      $("#world-status").textContent = playAlong ? "Listen for the count-in, then play your part."
        : "Listen to this take. Stop or switch playback whenever you’re ready.";
      paintPlayhead();
    } catch (error) {
      if (ticket !== request) return;
      stopSound("Couldn’t play the sound. " + (error?.message || "") + " Try the playback button again.");
    }
  }
  function drawNeck() {
    const field = currentGrid(state);
    if (!field) return;
    const value = state[field][state.selectedStep]?.note;
    board.update({
      strings: [5,4,3,2,1,0].map(index => ({ index, label: stringName(index) })),
      activeStringIndices: [0,1,2,3,4,5], fretRange: { minFret: 0, maxFret: 3 },
      positions: NOTE_PALETTE.map(k => {
        const p = positionFromKey(k);
        return { ...p, selectable: true, selected: k === value, states: k === value ? ["source"] : [],
          primaryLabel: noteNames.get(k), ariaLabel: pitchLocation(k) };
      }),
      connections: [], label: "Guitar positions, open through fret 3",
    });
  }
  function drawSettings() {
    $("#world-settings").innerHTML = state.world === "detective"
      ? selectHtml("world-anchor", "Keep this pitch", ANCHORS.map(k => [k, noteNames.get(k)]), state.anchor)
        + selectHtml("world-context", "Chords", [["progression","G → C → D7 → G"],["G","Hold G"],["C","Hold C"],["D7","Hold D7"]], state.context)
      : state.world === "expression" ? selectHtml("world-feel", "Interpretation", FEELS, state.feel) : "";
    $("#world-compose-settings").innerHTML = state.world === "composition"
      ? selectHtml("world-form", "Four-bar form", [["AABA","A · A · B · A"],["ABAB","A · B · A · B"],["ABBA","A · B · B · A"]], state.form)
        + selectHtml("world-section", "Edit phrase", [["A","A"],["B","B"]], state.section)
      : "";
  }
  function updateReveal() {
    const button = $("#world-reveal");
    if (!button) return;
    const missing = state.world === "missing";
    const available = state.canReveal;
    button.disabled = !available;
    button.textContent = state.revealed ? "Hide explanation" : missing ? "See the original lead" : "See what changed";
    button.setAttribute("aria-expanded", String(state.revealed));
    $("#world-reveal-hint").textContent = available ? "" : missing
      ? "Hear the original or try a reconstruction first."
      : "Hear the comparison or play over the chords first.";
    const facts = $("#world-facts");
    facts.hidden = !state.revealed;
    if (!state.revealed) { facts.replaceChildren(); return; }
    if (missing) facts.textContent = phraseLocations(arrangeWorld(state.arrangement).reference);
    else {
      const contexts = worldRoleFacts(musicQueries, state.anchor).filter(c => state.context === "progression" || c.symbol === state.context);
      facts.innerHTML = contexts.map(({ symbol, chord, relation }) => {
        const role = relation.matchingTones.some(tone => tone.degree === 1) ? "the root"
          : "a " + relation.interval.name.toLowerCase() + " above " + formatNote(chord.root) + "; "
            + (relation.isChordTone ? "a chord tone" : "outside the chord");
        return `<p><strong>${escapeHtml(symbol)}</strong> · ${escapeHtml(noteNames.get(state.anchor))} is
          ${escapeHtml(role)}. Chord notes: ${escapeHtml(chord.tones.map(tone => formatNote(tone.note)).join(", "))}.</p>`;
      }).join("")
        + "<p class=\"quiet\">These are note relationships. Listen for how you want the phrase to move.</p>";
    }
  }
  function drawActivity() {
    const material = arrangeWorld(state.arrangement);
    let html;
    switch (state.world) {
      case "missing":
        html = '<h3>Fill the empty bars</h3><p>Try your version in bars 1 and 3. Leave bars 2 and 4 for the band.</p>' +
          '<button type="button" id="world-reveal" aria-controls="world-facts"></button><span class="quiet worlds-reveal-hint" id="world-reveal-hint"></span><div id="world-facts" class="worlds-facts" hidden></div>';
        break;
      case "detective":
        html = `<h3>One finger, different chords</h3><p><strong>${escapeHtml(pitchLocation(state.anchor))}</strong>.
          Repeat the note as the chords pass. On the last G, try the neighbouring note and hear where you want to end.</p>
          <button type="button" id="world-reveal" aria-controls="world-facts"></button><span class="quiet worlds-reveal-hint" id="world-reveal-hint"></span><div id="world-facts" class="worlds-facts" hidden></div>`;
        break;
      case "expression":
        html = `<h3>Play the same phrase two ways</h3><p>Keep your frets. Try a light attack and let the last note ring, then try the same rhythm with a shorter touch.</p>
          <details class="worlds-details"><summary>Find the phrase on your guitar</summary><p>${escapeHtml(phraseLocations(material.reference))}</p></details>`;
        break;
      case "dialogue":
        html = "<h3>Two bars are yours</h3><p>Follow the highlighted bar: the guitar calls in bars 1 and 3. Play your own reply in bars 2 and 4.</p>";
        break;
      case "composition":
        html = "<h3>Hear what the return does</h3><p>Play along with the labelled A and B bars. Change the order and listen for how the same ending lands over a different chord.</p>";
        break;
      case "groove":
        html = "<h3>Try it with your picking hand</h3><p>Play the pattern on the open G string. Release the pressure or touch the string lightly for the muted strokes. Keep the gaps when you move the accent.</p>";
        break;
      default:
        html = "<h3>Play a part the band has room for</h3><p>Try open B and open G. Answer once after a bass note and listen through the silence. Hear the written part or shape it below.</p>";
    }
    $("#world-activity").innerHTML = html;
    updateReveal();
    $("#world-transfer").textContent = "Try next: " + worldReviewPrompts(state).transfer;
  }
  function drawEditor(focus = false) {
    const field = currentGrid(state);
    $("#world-editor-panel").hidden = !field;
    if (!field) { $("#world-editor").replaceChildren(); return; }
    $("#world-editor-label").textContent = EDITOR_LABELS[state.world];
    const grid = state[field], selected = grid[state.selectedStep];
    const label = state.world === "composition" ? "Phrase " + state.section : EDITOR_LABELS[state.world];
    $("#world-editor").innerHTML = `<p class="quiet">Choose a subdivision, then a fret or stroke. Arrow keys move between subdivisions.</p>
      <div class="worlds-steps" role="group" aria-label="${escapeHtml(label)}">
        ${grid.map((value, index) => `<button type="button" class="worlds-step" data-step="${index}" tabindex="${index === state.selectedStep ? 0 : -1}"
          aria-pressed="${index === state.selectedStep}" aria-label="${escapeHtml("Beat " + beatName(index) + ": " + noteLabel(value)
            + (value?.accent ? ", accented" : "") + (value?.held && value.note !== "mute" ? ", held" : ""))}">
          <span class="worlds-count">${beatName(index)}</span><strong>${!value ? "·" : value.note === "mute" ? "×" : escapeHtml(noteNames.get(value.note))}</strong>
          <span class="worlds-mark" aria-hidden="true">${value?.accent ? ">" : value?.held && value.note !== "mute" ? "—" : "&nbsp;"}</span>
        </button>`).join("")}
      </div>
      <p class="quiet">Beat ${beatName(state.selectedStep)} · ${escapeHtml(noteLabel(selected))}</p>
      <div class="worlds-note-actions">
        <button type="button" data-note-action="rest">Rest</button>
        <button type="button" data-note-action="mute">Muted stroke</button>
        <button type="button" data-note-action="accent" aria-pressed="${Boolean(selected?.accent)}"${!selected ? " disabled" : ""}>Accent</button>
        <button type="button" data-note-action="held" aria-pressed="${Boolean(selected?.held && selected.note !== "mute")}"${!selected || selected.note === "mute" ? " disabled" : ""}>Let ring</button>
        <button type="button" data-note-action="undo"${!previousEdits.has(field) ? " disabled" : ""}>Undo edit</button>
        <button type="button" data-note-action="clear"${!grid.some(Boolean) ? " disabled" : ""}>Clear phrase</button>
        <button type="button" id="world-hear-edit" data-audio="full"${!hasPart() ? " disabled" : ""}>Hear my edit</button>
      </div>`;
    drawNeck();
    if (focus) $("#world-editor").querySelector('[data-step="' + state.selectedStep + '"]').focus({ preventScroll: true });
  }
  function changePart(next, focusAction) {
    if (state === next) return;
    const field = currentGrid(state);
    previousEdits.set(field, state[field]);
    state = next;
    if (state.world === "missing" && hasPart()) state = { ...state, canReveal: true };
    drawEditor();
    updateMixes();
    updateReveal();
    if (focusAction) {
      const button = $("#world-editor").querySelector('[data-note-action="' + focusAction + '"]');
      if (button?.disabled) $("#world-editor").querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      else button?.focus({ preventScroll: true });
    }
    $("#world-status").textContent = "Part changed. Hear your edit to compare.";
  }
  function render() {
    for (const button of choices.querySelectorAll("[data-world]")) {
      const active = button.dataset.world === state.world;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-current", active);
    }
    $("#worlds-select").value = state.world;
    const prompts = worldReviewPrompts(state);
    $("#world-intention").textContent = prompts.intention;
    $("#world-question").textContent = prompts.question;
    $("#world-action").textContent = prompts.action;
    $("#world-arrangement").value = state.arrangement;
    $("#world-arrangement-note").textContent = arrangeWorld(state.arrangement).description;
    $("#world-reflection").value = state.reflections[state.world] ?? "";
    drawSettings();
    drawActivity();
    drawEditor();
    updateMixes();
    drawTimeline();
  }
  function chooseWorld(world) {
    if (world === state.world || !WORLD_DEFINITIONS.some(item => item.id === world)) return;
    stop();
    state = { ...state, world, revealed: false, canReveal: false, selectedStep: 0 };
    $("#world-editor-panel").open = false;
    render();
    $("#world-status").textContent = "Ready. Start with the sound.";
  }

  choices.addEventListener("click", event => {
    const button = event.target.closest("[data-world]");
    if (button) chooseWorld(button.dataset.world);
  });
  container.addEventListener("change", event => {
    const { id, value } = event.target;
    if (id === "worlds-select") { chooseWorld(value); return; }
    if (id === "world-repeat") {
      state = { ...state, repeat: event.target.checked };
      if (!$("#world-stop").disabled) stopSound("Repeat is " + (state.repeat ? "on" : "off") + ". Play again to start.");
      return;
    }
    if (id === "world-section") {
      state = { ...state, section: value, selectedStep: 0 };
      drawEditor();
      return;
    }
    const field = { "world-arrangement":"arrangement", "world-form":"form", "world-feel":"feel",
      "world-context":"context", "world-anchor":"anchor" }[id];
    if (!field) return;
    stopSound("Ready. Play to hear the change.");
    state = { ...state, [field]: value, canReveal: false, revealed: false };
    render();
    $("#" + id)?.focus({ preventScroll: true });
  });
  container.addEventListener("keydown", event => {
    const cell = event.target.closest("[data-step]");
    if (!cell) return;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[event.key];
    if (delta === undefined && !["Home","End"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "Home" ? 0 : event.key === "End" ? 15 : (Number(cell.dataset.step) + delta + 16) % 16;
    state = { ...state, selectedStep: step };
    drawEditor(true);
  });
  container.addEventListener("click", event => {
    const mix = event.target.closest("[data-audio]");
    if (mix) { void play(mix.dataset.audio); return; }
    const cell = event.target.closest("[data-step]");
    if (cell) {
      state = { ...state, selectedStep: Number(cell.dataset.step) };
      drawEditor(true);
      return;
    }
    const action = event.target.closest("[data-note-action]");
    if (action) {
      const field = currentGrid(state), choice = action.dataset.noteAction;
      if (choice === "undo") {
        if (!previousEdits.has(field)) return;
        state = { ...state, [field]: previousEdits.get(field) };
        previousEdits.delete(field);
        drawEditor(true); updateMixes(); updateReveal();
        $("#world-status").textContent = "Previous part restored. Hear it again.";
      } else if (choice === "clear") changePart({ ...state, [field]: emptyGrid() }, choice);
      else if (["accent","held"].includes(choice)) changePart(shapeGridCell(state, field, state.selectedStep, choice), choice);
      else changePart(editGrid(state, field, state.selectedStep, choice === "mute" ? "mute" : null), choice);
    } else if (event.target.closest("#world-reveal")) {
      state = { ...state, revealed: !state.revealed };
      updateReveal();
    }
  });
  $("#world-stop").addEventListener("click", () => {
    stopSound("Stopped. Play again when you’re ready.");
    $("#world-mixes").querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  });
  $("#world-record").addEventListener("click", () => void take.start());
  $("#world-record-stop").addEventListener("click", take.stop);
  $("#world-replay").addEventListener("click", () => {
    if (take.snapshot().replaying) { take.stopReplay(); return; }
    stopSound("Backing stopped for your take.");
    void take.play();
  });
  $("#world-reflection").addEventListener("input", event => {
    state = { ...state, reflections: { ...state.reflections, [state.world]: event.target.value } };
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  render();
  drawTake(take.snapshot());
  return Object.freeze({ stop, focus() { $("#worlds-title").focus({ preventScroll: true }); }, getState() { return state; } });
}
