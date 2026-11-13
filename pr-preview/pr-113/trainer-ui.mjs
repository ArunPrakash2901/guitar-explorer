import { CHORD_CATALOG_METADATA, formatNote, parseNote } from "./engine/index.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { ProgressionAudio } from "./progression-audio.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { practicePlan } from "./trainer-audio.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";

const roots = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
export const noteName = (note) => formatNote(note).replaceAll("#", "♯").replaceAll("b", "♭");
export const stringNames = ["low E", "A", "D", "G", "B", "high E"];

export function chordName(chord) {
  return noteName(chord.root) + CHORD_CATALOG_METADATA.find(({ id }) => id === chord.chordId).symbol;
}

export function initChordInputs(root, quality, qualities) {
  root.replaceChildren(...roots.map((id) => new Option(noteName(parseNote(id)), id)));
  quality.replaceChildren(...qualities.map((id) =>
    new Option(CHORD_CATALOG_METADATA.find((entry) => entry.id === id).displayName, id)));
}

export function practiceTransport({ play, stop, status, highlight, pauseable = false, onFinish = () => {} }) {
  const audio = new ProgressionAudio();
  let frame = 0;
  let ticket = 0;
  let loading = false;
  let last;
  function paint(event) {
    if (last !== event) highlight(event);
    last = event;
  }
  function buttons() {
    play.textContent = audio.isPaused() ? "Resume" : audio.isPlaying() && pauseable ? "Pause" : play.dataset.label;
    play.disabled = loading;
    stop.disabled = !loading && !audio.isPlaying() && !audio.isPaused() && !audio.isActive();
  }
  function monitor() {
    if (!audio.isPlaying()) {
      paint(null);
      if (!audio.isPaused()) status.textContent = "Finished.";
      buttons();
      onFinish();
      return;
    }
    const event = audio.activePracticeEvent();
    paint(event);
    status.textContent = audio.isCountingIn() ? "Count-in…" : "Playing.";
    frame = requestAnimationFrame(monitor);
  }
  function reset(message = "") {
    ticket++;
    audio.stop();
    cancelAnimationFrame(frame);
    loading = false;
    paint(null);
    status.textContent = message;
    buttons();
  }
  async function run(action) {
    const current = ++ticket;
    loading = true;
    buttons();
    status.textContent = "Loading recordings…";
    try {
      if (await action() && current === ticket) monitor();
    } catch (error) {
      if (current === ticket) status.textContent = error.message;
    } finally {
      if (current === ticket) {
        loading = false;
        buttons();
      }
    }
  }
  stop.addEventListener("click", () => reset("Stopped."));
  window.addEventListener("pagehide", () => reset());
  buttons();
  return {
    reset,
    start(events, tempo, options) {
      reset();
      return run(() => audio.playPractice(practicePlan(events, tempo, options)));
    },
    toggle() {
      if (audio.isPaused()) return run(() => audio.resume());
      if (!audio.pause()) return false;
      cancelAnimationFrame(frame);
      status.textContent = "Paused.";
      buttons();
      return true;
    },
    get active() { return audio.isPlaying() || audio.isPaused(); },
  };
}
