import { DRUM_PARTS, getGrooveGrid } from "./progression-grooves.mjs?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";

const names = ["Kick", "Snare", "Hi-hat"];

/** Edit the current preset's single bar. The transport still owns all timing. */
export function connectGrooveEditor(panel, onChange) {
  const grid = panel.querySelector("#drum-grid");
  const fill = panel.querySelector("#drum-fill");
  const click = panel.querySelector("#metronome-click");
  const reset = panel.querySelector("#reset-drum-pattern");
  const status = panel.querySelector("#drum-edit-status");
  let preset;
  let meter;
  let groove;
  let parts = null;

  function describe() {
    status.textContent = groove === "off" ? "Select a groove to edit its drum parts."
      : parts ? "Edited groove" : "Preset groove";
    reset.disabled = !parts;
    fill.disabled = groove === "off";
  }

  function render() {
    grid.replaceChildren();
    grid.hidden = groove === "off";
    describe();
    if (grid.hidden) return;
    grid.style.setProperty("--steps", preset.steps);
    const corner = document.createElement("span");
    corner.className = "drum-grid-corner";
    corner.textContent = "Part";
    grid.append(corner);
    for (let step = 0; step < preset.steps; step++) {
      const label = document.createElement("span");
      label.textContent = step % preset.subdivisions === 0 ? String(1 + step / preset.subdivisions) : "·";
      label.setAttribute("aria-hidden", "true");
      grid.append(label);
    }
    for (const [index, voice] of DRUM_PARTS.entries()) {
      const name = document.createElement("span");
      name.className = "drum-part-name";
      name.textContent = names[index];
      grid.append(name);
      for (let step = 0; step < preset.steps; step++) {
        const button = document.createElement("button");
        const pulse = 1 + Math.floor(step / preset.subdivisions);
        const subdivision = 1 + step % preset.subdivisions;
        button.type = "button";
        button.dataset.part = voice;
        button.dataset.step = String(step);
        button.setAttribute("aria-label", names[index] + ", beat " + pulse + ", subdivision " + subdivision);
        button.setAttribute("aria-pressed", String(Boolean((parts ?? preset.parts)[index] & (1 << step))));
        if (subdivision === 1) button.classList.add("downbeat");
        grid.append(button);
      }
    }
  }

  function update(nextMeter, nextGroove) {
    if (meter === nextMeter && groove === nextGroove) return;
    meter = nextMeter;
    groove = nextGroove;
    preset = getGrooveGrid(meter, groove);
    parts = null;
    render();
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-part]");
    if (!button || groove === "off") return;
    const index = DRUM_PARTS.indexOf(button.dataset.part);
    const bit = 1 << Number(button.dataset.step);
    parts ??= [...preset.parts];
    parts[index] ^= bit;
    button.setAttribute("aria-pressed", String(Boolean(parts[index] & bit)));
    if (parts.every((part, i) => part === preset.parts[i])) parts = null;
    describe();
    onChange("Drum pattern updated.");
  });
  reset.addEventListener("click", () => {
    parts = null;
    render();
    grid.querySelector("button")?.focus();
    onChange("Drum pattern restored.");
  });
  fill.addEventListener("change", () => onChange(fill.checked ? "Phrase fills on." : "Phrase fills off."));
  click.addEventListener("change", () => onChange(click.checked ? "Metronome on." : "Metronome off."));

  return {
    update,
    read: () => ({ parts: parts && [...parts], fill: fill.checked, click: click.checked }),
    restore(nextMeter, nextGroove, settings) {
      update(nextMeter, nextGroove);
      parts = settings.parts && [...settings.parts];
      fill.checked = settings.fill;
      click.checked = settings.click;
      render();
    },
  };
}
