import { formatNote } from "./engine/index.js";
import {
  formatTimestamp, identityLabel, occurrences, relatedSections, sectionOccurrences, sectionPosition, sections, sources,
} from "./song-study/arrangement.js";
import { exactLocations, groupOffsets, eighths } from "./song-study/model.js";

const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escape = (text) => String(text).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
export const musicText = (text) => escape(text.replaceAll("#", "♯").replaceAll("b", "♭"));
export const stringNames = ["Low E", "A", "D", "G", "B", "High E"];

function sourceLink(id, start) {
  const source = sources[id];
  const url = new URL(source.url);
  if (start !== undefined) url.searchParams.set("t", start + "s");
  const cue = start === undefined ? "" : " near " + formatTimestamp(start);
  return `<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${escape(source.label + cue)}</a>`;
}

function rangeText(start, end) {
  return formatTimestamp(start) + "–" + formatTimestamp(end);
}

export function overviewView(last, entries) {
  const section = sections.find(({ id }) => id === last?.sectionId);
  return `
    <div class="song-hero">
      <p class="eyebrow">Led Zeppelin · Led Zeppelin IV · Studio recording</p>
      <h1>Black Dog</h1>
      <p class="lede">Hear how the riff, the spaces around it, and the closing solo make one song. Bring each discovery to your guitar.</p>
      <ul class="source-links">${["recording", "marty", "solo"].map((id) => `<li>${sourceLink(id)}</li>`).join("")}</ul>
    </div>
    <div class="overview-layout">
      <section class="arrangement" aria-labelledby="arrangement-title">
        <h2 id="arrangement-title">The arrangement</h2>
        <p class="quiet">Times are estimated positions in the official recording. Follow the vocal, riff and band entrances to find the passage.</p>
        <ol class="section-list">
          ${sections.map((item) => {
            const { startSeconds, endSeconds } = sectionPosition(item.id);
            const current = section?.id === item.id;
            const status = current ? "Last opened" : entries[item.id]?.played ? "Played" : "";
            return `<li><a class="section-link" href="#${item.id}" ${current ? 'aria-current="location"' : ""}>
              <span class="section-position" aria-label="Approximately ${rangeText(startSeconds, endSeconds)}">${rangeText(startSeconds, endSeconds)}</span>
              <span class="section-copy"><strong class="section-name">${escape(item.title)}</strong><span class="section-summary">${escape(item.summary)}</span></span>
              <span class="section-progress">${status}</span>
            </a></li>`;
          }).join("")}
        </ol>
        <details class="occurrence-map">
          <summary>All 31 recording cues</summary>
          <ol>
            ${occurrences.map((item) => `<li><a href="#${item.id}">${formatTimestamp(item.startSeconds)} · ${escape(item.label)}</a></li>`).join("")}
          </ol>
        </details>
      </section>
      <aside class="overview-aside" aria-label="Song context">
        <section class="panel">
          <h2>${section ? escape(section.title) : "Start with the entrance"}</h2>
          <p>${section ? escape(section.variation) : "Listen for the change from guitar texture to a clear musical entrance."}</p>
          <a class="button primary" href="#${last?.anchorId ?? "SEC-01"}">${section ? "Continue studying" : "Open Intro"}</a>
        </section>
        <section class="panel">
          <h2>Ideas that return</h2>
          <ul class="related-ideas">
            <li><strong>Vocal and guitar response</strong> <a href="#SEC-02">Full</a>, <a href="#SEC-04">shortened</a>, <a href="#SEC-07">harmonized</a>, <a href="#SEC-09">shortened again</a></li>
            <li><strong>Chorus gesture</strong> <a href="#SEC-03">First appearance</a>, <a href="#SEC-08">return</a></li>
            <li><strong>Bridge figure</strong> <a href="#SEC-05">First return of the band</a>, <a href="#SEC-10">solo launch</a></li>
            <li><strong>Chordal groove</strong> <a href="#SEC-06">Under the vocal</a>, <a href="#SEC-11">beneath the solo</a></li>
          </ul>
        </section>
      </aside>
    </div>`;
}

function selectedButton(attribute, index, active, label) {
  return `<button type="button" ${attribute}="${index}" aria-pressed="${active}">${escape(label)}</button>`;
}

function sourcePanel(section, study, occurrence) {
  const related = relatedSections(section);
  const cues = sectionOccurrences(section.id);
  return `<aside class="listen-panel panel" aria-labelledby="listen-title">
    <h2 id="listen-title">Listen in the song</h2>
    ${study.sources.some((id) => id !== "recording") ? `<ul class="source-links">
      ${study.sources.filter((id) => id !== "recording").map((id) => `<li>${sourceLink(id)}</li>`).join("")}
    </ul>` : ""}
    <p class="notice">Links open externally. If playback is unavailable, cue the estimated time in your own copy of the Led Zeppelin IV recording.</p>
    <details>
      <summary>Source notes</summary>
      <ul class="source-notes">
        ${study.sources.map((id) => `<li><strong>${escape(sources[id].label)}.</strong> ${escape(sources[id].locator)}. ${escape(sources[id].scope)}</li>`).join("")}
        ${study.sources.includes("solo") ? "<li><strong>Owner-supplied transcription.</strong> Four-page Guitar Pro PDF with a quarter-note marking of 160, an opening 5/4 bar, and a written ending on page 4. These details describe the transcription.</li>" : ""}
      </ul>
      <p>${escape(study.context)}</p>
      ${study.uncertainty ? `<p class="notice">${escape(study.uncertainty)}</p>` : ""}
    </details>
    ${cues.length > 1 ? `<details ${occurrence ? "open" : ""}><summary>Recording cues in this section</summary>
      <ul class="recording-cues">${cues.map((item) => `<li><a href="#${item.id}" ${occurrence?.id === item.id ? 'aria-current="location"' : ""}>
        ${rangeText(item.startSeconds, item.endSeconds)} · ${escape(item.label)}</a></li>`).join("")}</ul></details>` : ""}
    ${related.length ? `<details><summary>Related appearances</summary>
      <ul>${related.map((item) => `<li><a href="#${item.id}">${escape(item.title)}</a></li>`).join("")}</ul></details>` : ""}
  </aside>`;
}

function rhythmView(example, prepared) {
  if (!example.beats) return "";
  const count = prepared.duration;
  const beats = example.beats * 2;
  const ticks = Array.from({ length: count }, (_, i) => i);
  const events = new Map();
  for (const event of prepared.events) {
    if (event.semitones.length || event.click === "accent") events.set(event.at, event);
  }
  const group = example.group;
  const description = group
    ? `<p>${group} eighth notes = ${timeLabel(eighths(group))} quarter-note beats. Group starts are offset from their barline by ${groupOffsets(group, example.beats, Math.ceil(count / group)).join(", ")} eighth notes.</p>`
    : "";
  return `<section class="rhythm-study" aria-labelledby="rhythm-title">
    <h3 id="rhythm-title">Pulse and placement</h3>
    ${description}
    <div class="rhythm-scroll" role="region" aria-label="Scrollable rhythm grid" tabindex="0">
      <table class="rhythm-grid">
        <caption>Each column is one eighth note. A dot marks an attack.</caption>
        <thead><tr><th scope="col">Count</th>${ticks.map((tick) =>
          `<th scope="col" data-tick="${tick}" class="${tick % beats === 0 ? "is-beat" : ""}">${tick % 2 ? "&amp;" : Math.floor(tick % beats / 2) + 1}</th>`).join("")}</tr></thead>
        <tbody><tr><th scope="row">Example</th>${ticks.map((tick) => {
          const event = events.get(tick);
          const accent = group ? tick % group === 0 : event?.click === "accent";
          return `<td data-tick="${tick}" class="${accent ? "is-accent" : ""}">
            ${event ? '<span aria-label="Attack">●</span>' : '<span aria-label="No attack">·</span>'}</td>`;
        }).join("")}</tr></tbody>
      </table>
    </div>
  </section>`;
}

function timeLabel(value) {
  return value.denominator === 1 ? String(value.numerator) : value.numerator + "/" + value.denominator;
}

function degree(relation) {
  const change = relation.alterationFromKey;
  return (change < 0 ? "♭" : "♯").repeat(Math.abs(change)) + relation.degree;
}

function chordName(chord) {
  return musicText(formatNote(chord.root)) + (chord.chordId === "power5" ? "5" : " " + chord.chordId);
}

function chordRole(note) {
  const relation = note.chordRelation;
  if (!relation) return "";
  if (!relation.isChordTone) return "outside chord";
  const degree = relation.matchingTones.map((tone) => tone.degree).join("/");
  return degree === "1" ? "root" : degree === "5" ? "fifth" : "chord degree " + degree;
}

function factView(example, prepared, showFacts) {
  if (!prepared.notes.length) return "";
  const chord = prepared.chord;
  const notes = prepared.notes.map((note) => {
    const role = note.keyRelation ? " · " + degree(note.keyRelation) : "";
    const roleInChord = note.chordRelation ? " · " + chordRole(note) : "";
    const scale = note.scaleRelation ? (note.scaleRelation.inScale ? " · in scale" : " · outside scale") : "";
    return `<li><strong>${musicText(note.name)}</strong>${role}${roleInChord}${scale}</li>`;
  }).join("");
  const intervals = [...new Set(prepared.simultaneousIntervals.map((interval) => interval.name))];
  const arrows = { ascending: "↑", descending: "↓", stationary: "→" };
  const phraseNotes = prepared.events.filter((event) => event.names.length).map((event) => musicText(event.names[0]));
  const contour = phraseNotes.map((pitch, i) => i ? arrows[prepared.contour[i - 1]] + " " + pitch : pitch).join(" ");
  const gestures = prepared.events.filter((event) => event.gesture);
  return `<details class="music-facts" data-facts ${showFacts ? "open" : ""}>
    <summary>Reveal notes and relationships</summary>
    ${prepared.root ? `<p>Degrees relative to ${musicText(prepared.root)}.</p>` : ""}
    ${example.scale && prepared.root ? `<p>Scale reference · ${musicText(prepared.root)} ${example.scale === "minorPentatonic" ? "minor" : "major"} pentatonic.</p>` : ""}
    ${chord ? `<p>Original example's chord · <strong>${chordName(chord)}</strong> (${chord.tones.map((tone) => musicText(formatNote(tone.note))).join(", ")}).</p>` : ""}
    <ul class="note-relationships">${notes}</ul>
    ${gestures.length ? `<ul class="gesture-list">${gestures.map((event) => `<li><strong>${escape(event.gesture)}</strong> · ${event.names.map(musicText).join(", ")}</li>`).join("")}</ul>` : ""}
    ${prepared.harmonyChanges.length ? `<table class="harmony-facts">
      <caption>Upper note against the chord at each change</caption>
      <thead><tr><th scope="col">Eighth offset</th><th scope="col">Chord</th><th scope="col">Upper note</th><th scope="col">Role</th></tr></thead>
      <tbody>${prepared.harmonyChanges.map(({ at, chord, notes }) => {
        const upper = notes.at(-1);
        return `<tr><td>${at}</td><td>${chordName(chord)}</td><td>${musicText(upper.name)}</td><td>${chordRole(upper)}</td></tr>`;
      }).join("")}</tbody></table>` : ""}
    ${intervals.length ? `<p>Simultaneous intervals · ${escape(intervals.join(", "))}.</p>` : ""}
    ${prepared.phrase ? `<p><strong>Contour</strong> ${contour}</p>
      <p><strong>Successive intervals</strong> ${escape(prepared.intervals.map(({ label }) => label).join(" · "))}.</p>
      <p><strong>Phrase span</strong> ${timeLabel(prepared.phrase.duration)} quarter-note beats.</p>` : ""}
  </details>`;
}

export function fretDetail(note) {
  if (!note) return "Select a fret to hear its registered pitch and see alternate locations.";
  const locations = exactLocations(note.semitone)
    .filter((other) => other.position.stringIndex !== note.position.stringIndex)
    .map(({ position }) => escape(stringNames[position.stringIndex]) + " string, fret " + position.fret);
  return `<strong>${musicText(note.name)}</strong> · ${escape(stringNames[note.position.stringIndex])} string, fret ${note.position.fret}.
    ${locations.length ? "Same sounding pitch at " + locations.join("; ") + "." : "This pitch has one position on the study board."}`;
}

function fretboardView(notes, targets, min, max, showTargets) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const byPosition = new Map(notes.map((note) => [note.position.stringIndex + ":" + note.position.fret, note]));
  const strings = [...stringNames.keys()].reverse();
  const firstTarget = notes.find((note) => targets.has(note.semitone));
  const initial = firstTarget ? firstTarget.position.stringIndex + ":" + firstTarget.position.fret : "5:" + min;
  return `<p class="quiet">${showTargets ? "Highlighted frets show the example pitches. " : ""}Use arrow keys to move between frets.</p><div class="fretboard-scroll" role="region" aria-label="Scrollable guitar fretboard" tabindex="0">
    <table class="fretboard">
      <caption>Standard tuning · frets ${min}–${max}</caption>
      <thead><tr><th scope="col">String</th>${numbers.map((fret) => `<th scope="col">${fret}</th>`).join("")}</tr></thead>
      <tbody>${strings.map((string) => `<tr><th scope="row" class="string-label">${stringNames[string]}</th>
        ${numbers.map((fret) => {
          const id = string + ":" + fret;
          const note = byPosition.get(id);
          const target = targets.get(note.semitone);
          const label = target ?? note.name;
          const name = musicText(label);
          return `<td class="${target ? "is-target" : ""}"><button type="button" class="fret-note" data-fret="${id}" tabindex="${initial === id ? 0 : -1}"
            aria-label="${name}, ${stringNames[string]} string, fret ${fret}${target ? ", example note" : ""}" aria-pressed="false">${name}</button></td>`;
        }).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function sectionNav(section, startSeconds) {
  const index = sections.indexOf(section);
  const previous = sections[index - 1];
  const next = sections[index + 1];
  return `<nav class="section-nav" aria-label="Song section navigation">
    <a href="#overview">← Full arrangement</a>
    ${sourceLink("recording", startSeconds)}
    ${previous ? `<a href="#${previous.id}">Previous · ${escape(previous.title)}</a>` : ""}
    ${next ? `<a href="#${next.id}">Next · ${escape(next.title)} →</a>` : ""}
  </nav>`;
}

export function workbenchView({ section, occurrence, allStudies, entry, study, example, prepared, range, ranges, board, targets, rate, pulse, showTargets, storageAvailable, showFacts }) {
  const { startSeconds, endSeconds } = sectionPosition(section.id);
  const [min, max] = ranges[range];
  return `<article class="workbench">
    <header class="section-header">
      <p class="eyebrow">Black Dog · ${escape(identityLabel(section))}</p>
      <h1>${escape(section.title)}</h1>
      <p class="lede">${escape(section.variation)}</p>
      <p class="quiet">Estimated ${rangeText(startSeconds, endSeconds)}${occurrence ? " · " + escape(occurrence.label) + " at " + formatTimestamp(occurrence.startSeconds) : ""}</p>
      ${sectionNav(section, occurrence?.startSeconds ?? startSeconds)}
    </header>
    <div class="study-layout">
      <section class="investigation panel" aria-labelledby="mission-title">
        ${allStudies.length > 1 ? `<div class="study-tabs" role="group" aria-label="Investigations">
          ${allStudies.map((item, i) => selectedButton("data-study", i, entry.study === i, item.title)).join("")}</div>` : ""}
        <h2 id="mission-title">${escape(study.title)}</h2>
        <p class="lede">${escape(study.question)}</p>
        <p class="quiet">${escape(study.listen)}</p>
        <div class="example-controls" role="group" aria-label="Compare synthesized examples">
          ${study.examples.map((item, i) => selectedButton("data-example", i, entry.example === i, item.label)).join("")}
        </div>
        <p>${escape(example.description)}</p>
        <div class="audio-controls" role="group" aria-label="Educational audio controls">
          <button type="button" class="primary" data-action="play">Play example</button>
          <button type="button" data-action="stop" disabled>Stop</button>
          <label for="tempo">Speed</label>
          <select id="tempo"><option value="1" ${rate === 1 ? "selected" : ""}>Original example speed</option>
            <option value="0.75" ${rate === 0.75 ? "selected" : ""}>75%</option>
            <option value="0.5" ${rate === 0.5 ? "selected" : ""}>50%</option></select>
          ${example.beats ? `<label><input type="checkbox" id="with-pulse" ${pulse ? "checked" : ""}> Quarter-note pulse</label>` : ""}
        </div>
        <p id="audio-status" class="quiet" role="status">Synthesized study audio.</p>
        ${rhythmView(example, prepared)}
        ${example.technique ? `<p class="notice">${escape(example.technique)}</p>` : ""}
        ${factView(example, prepared, showFacts)}
        ${prepared.notes.length ? `
          <div class="fret-controls">
            <label for="fret-range">Fretboard</label>
            <select id="fret-range">${ranges.map(([low, high], i) => `<option value="${i}" ${range === i ? "selected" : ""}>Frets ${low}–${high}</option>`).join("")}</select>
            <button type="button" data-action="transpose" aria-pressed="${entry.transposed}">Transpose up a whole step</button>
            <button type="button" data-action="toggle-targets" aria-pressed="${showTargets}">Mark example notes</button>
          </div>
          ${entry.transposed ? '<p class="notice">The audio and marked pitches are up a whole step. The written playing directions describe the base example.</p>' : ""}
          ${fretboardView(board, targets, min, max, showTargets)}
          <p id="fret-detail" class="quiet" aria-live="polite">${fretDetail()}</p>
        ` : ""}
      </section>
      ${sourcePanel(section, study, occurrence)}
    </div>
    <section class="transfer panel" aria-labelledby="transfer-title">
      <h2 id="transfer-title">On your guitar</h2>
      <p>${escape(study.play)}</p>
      <h3>Make it yours</h3>
      <p>${escape(study.transfer)}</p>
      <div class="reflection">
        <label><input id="played-guitar" type="checkbox" ${entry.played ? "checked" : ""}> I tried this on my guitar</label>
        <label for="reflection-note">What did you hear or change?</label>
        <textarea id="reflection-note" rows="3" maxlength="1500">${escape(entry.note)}</textarea>
        <p class="quiet" id="storage-status">${storageAvailable ? "Notes and guitar attempts are saved in this browser as your own observations." : "Browser storage is unavailable. Notes and guitar attempts will stay in this tab only."}</p>
      </div>
    </section>
  </article>`;
}
