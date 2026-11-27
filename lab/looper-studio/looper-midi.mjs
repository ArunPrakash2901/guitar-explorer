const controllers = new Map([
  [1, "Modulation"], [7, "Volume"], [10, "Pan"], [11, "Expression"],
  [64, "Sustain"], [120, "All sound off"], [121, "Reset controllers"], [123, "All notes off"],
]);

export function decodeMidi(bytes, timestamp) {
  if (bytes?.length !== 3 || !Number.isFinite(timestamp) || timestamp < 0 ||
      !Array.from(bytes).every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return null;
  const [status, first, second] = bytes;
  if (first > 127 || second > 127) return null;
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  if (command === 0x80 || command === 0x90) {
    const type = command === 0x90 && second > 0 ? "note-on" : "note-off";
    return { type, channel, timestamp, note: first, velocity: second };
  }
  if (command === 0xb0) {
    return { type: "control", channel, timestamp, controller: first, value: second, name: controllers.get(first) ?? "CC " + first };
  }
  if (command === 0xe0) {
    return { type: "pitch-bend", channel, timestamp, value: first + second * 128 - 8192 };
  }
  return null;
}

export function isAkaiInput({ manufacturer, name }) {
  return /\bakai\b|\bmpk\s*mini\b/i.test([manufacturer, name].join(" "));
}

export class HeldMidiNotes {
  notes = new Set();

  observe(event) {
    if (event.type === "note-on") this.notes.add((event.channel - 1) * 128 + event.note);
    if (event.type === "note-off") this.notes.delete((event.channel - 1) * 128 + event.note);
    if (event.type === "control" && [120, 123].includes(event.controller)) {
      for (const note of this.notes) {
        if (Math.floor(note / 128) + 1 === event.channel) this.notes.delete(note);
      }
    }
  }

  releaseAll() {
    const count = this.notes.size;
    this.notes.clear();
    return count;
  }
}
