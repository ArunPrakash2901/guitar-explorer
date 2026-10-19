/* global Music */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('fretboard');
  const tooltip = document.getElementById('tooltip');

  const state = {
    mode: 'explore',
    root: 'A',
    shape: 'G',
    guidance: 'full',
    buildSelections: new Set(),
    navExercise: null,
    navAttempts: 0,
    navSelection: null,
    harmonyRoot: 'A',
    harmonyIndex: 0,
    harmonyReveal: true,
    harmonyTask: null,
    harmonySelection: null,
  };

  const GUIDANCE = [
    ['full', 'Full'],
    ['intervals', 'Intervals'],
    ['roots', 'Roots'],
    ['hidden', 'Hidden'],
    ['build', 'Build'],
  ];

  const coords = {
    x0: 82,
    x1: 1235,
    boardTop: 46,
    boardBottom: 282,
  };
  coords.stringGap = (coords.boardBottom - coords.boardTop) / 5;
  coords.nutX = coords.x0 + 2;
  coords.fretStartX = coords.x0 + 78;
  coords.fretEndX = coords.x1 - 12;
  coords.fretWidth = (coords.fretEndX - coords.fretStartX) / 15;

  function positionKey(stringIndex, fret) { return `${stringIndex}:${fret}`; }
  function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function now() { return performance.now(); }

  function svgEl(name, attrs = {}, text = '') {
    const el = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (text) el.textContent = text;
    return el;
  }

  function fretX(fret) {
    if (fret === 0) return coords.nutX - 18;
    return coords.fretStartX + (fret - 0.5) * coords.fretWidth;
  }

  function stringY(stringIndex) {
    const displayRow = 5 - stringIndex;
    return coords.boardTop + displayRow * coords.stringGap;
  }

  function showTooltip(evt, text) {
    tooltip.textContent = text;
    tooltip.style.left = `${evt.clientX}px`;
    tooltip.style.top = `${evt.clientY}px`;
    tooltip.style.opacity = '1';
  }
  function hideTooltip() { tooltip.style.opacity = '0'; }

  const EventStore = (() => {
    const dbName = 'guitar-learning-system';
    const storeName = 'attempts';
    let dbPromise;

    function open() {
      if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
      if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
              store.createIndex('timestamp', 'timestamp');
              store.createIndex('mode', 'mode');
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      return dbPromise;
    }

    async function add(event) {
      try {
        const db = await open();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).add({ ...event, timestamp: new Date().toISOString(), schemaVersion: 1 });
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        const fallback = JSON.parse(localStorage.getItem('gls-attempts') || '[]');
        fallback.push({ ...event, timestamp: new Date().toISOString(), schemaVersion: 1 });
        localStorage.setItem('gls-attempts', JSON.stringify(fallback.slice(-5000)));
      }
      updateHistoryStatus();
    }

    async function getAll() {
      try {
        const db = await open();
        return await new Promise((resolve, reject) => {
          const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        return JSON.parse(localStorage.getItem('gls-attempts') || '[]');
      }
    }

    async function count() { return (await getAll()).length; }
    return { add, getAll, count };
  })();

  async function updateHistoryStatus() {
    const count = await EventStore.count();
    document.getElementById('historyStatus').textContent = `Learning history: ${count} attempt${count === 1 ? '' : 's'} stored locally`;
  }

  function populateRootSelect(id, value, onChange) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    Music.ROOTS.forEach((root) => {
      const option = document.createElement('option');
      option.value = root;
      option.textContent = root;
      option.selected = root === value;
      el.appendChild(option);
    });
    el.addEventListener('change', () => onChange(el.value));
  }

  function setupControls() {
    populateRootSelect('rootSelect', state.root, (value) => {
      state.root = value;
      state.buildSelections.clear();
      renderAll();
    });
    populateRootSelect('harmonyRootSelect', state.harmonyRoot, (value) => {
      state.harmonyRoot = value;
      state.harmonyIndex = 0;
      state.harmonyTask = null;
      state.harmonyReveal = true;
      state.harmonySelection = null;
      renderAll();
    });

    const guidance = document.getElementById('guidanceButtons');
    GUIDANCE.forEach(([value, label]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset.guidance = value;
      btn.addEventListener('click', () => {
        state.guidance = value;
        state.buildSelections.clear();
        renderAll();
      });
      guidance.appendChild(btn);
    });

    const shapes = document.getElementById('shapeButtons');
    Object.keys(Music.CAGED_TEMPLATES).forEach((shape) => {
      const btn = document.createElement('button');
      btn.textContent = `${shape} Shape`;
      btn.dataset.shape = shape;
      btn.addEventListener('click', () => {
        state.shape = shape;
        state.buildSelections.clear();
        renderAll();
      });
      shapes.appendChild(btn);
    });

    document.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        if (state.mode === 'navigate' && !state.navExercise) newNavExercise();
        renderAll();
      });
    });

    document.getElementById('clearBuild').addEventListener('click', () => {
      state.buildSelections.clear();
      renderAll();
    });
    document.getElementById('checkBuild').addEventListener('click', checkBuild);
    document.getElementById('newExercise').addEventListener('click', newNavExercise);
    document.getElementById('exerciseType').addEventListener('change', newNavExercise);

    document.getElementById('prevChord').addEventListener('click', () => moveHarmony(-1));
    document.getElementById('nextChord').addEventListener('click', () => moveHarmony(1));
    document.getElementById('practiceChord').addEventListener('click', startHarmonyTask);
    document.getElementById('toggleHarmonyReveal').addEventListener('click', () => {
      state.harmonyReveal = !state.harmonyReveal;
      state.harmonyTask = null;
      state.harmonySelection = null;
      renderAll();
    });
    document.getElementById('exportHistory').addEventListener('click', exportHistory);
  }

  function drawBoardBase() {
    svg.innerHTML = '';
    svg.appendChild(svgEl('rect', {
      x: coords.x0, y: coords.boardTop - 10, width: coords.x1 - coords.x0,
      height: coords.boardBottom - coords.boardTop + 20, rx: 9,
      fill: '#141516', stroke: '#2b2f36', 'stroke-width': 2,
    }));

    for (let fret = 1; fret <= 15; fret += 1) {
      const x = coords.fretStartX + fret * coords.fretWidth;
      svg.appendChild(svgEl('line', { x1: x, y1: coords.boardTop - 6, x2: x, y2: coords.boardBottom + 6, stroke: '#2f333a', 'stroke-width': 2 }));
    }
    svg.appendChild(svgEl('line', { x1: coords.nutX, y1: coords.boardTop - 7, x2: coords.nutX, y2: coords.boardBottom + 7, stroke: '#9da0a3', 'stroke-width': 12, 'stroke-linecap': 'round' }));

    [3, 5, 7, 9, 12, 15].forEach((fret) => {
      const cx = coords.fretStartX + (fret - 0.5) * coords.fretWidth;
      const ys = fret === 12 ? [coords.boardTop + coords.stringGap, coords.boardBottom - coords.stringGap] : [(coords.boardTop + coords.boardBottom) / 2];
      ys.forEach((cy) => svg.appendChild(svgEl('circle', { cx, cy, r: fret === 12 ? 8 : 10, fill: '#3d3e40' })));
    });

    [5, 4, 3, 2, 1, 0].forEach((stringIndex, row) => {
      const y = coords.boardTop + row * coords.stringGap;
      svg.appendChild(svgEl('text', { x: 45, y: y + 8, fill: '#f2f2f2', 'font-size': 23, 'font-weight': 700, 'text-anchor': 'middle' }, Music.STRING_LABELS[stringIndex]));
      svg.appendChild(svgEl('line', { x1: coords.nutX, y1: y, x2: coords.fretEndX, y2: y, stroke: '#9da0a3', 'stroke-width': (stringIndex + 1) * 0.55 + 1.5, 'stroke-linecap': 'round' }));
    });

    svg.appendChild(svgEl('text', { x: coords.nutX - 18, y: 321, fill: '#9ca1a8', 'font-size': 21, 'text-anchor': 'end' }, 'Open'));
    for (let fret = 1; fret <= 15; fret += 1) {
      svg.appendChild(svgEl('text', { x: fretX(fret), y: 321, fill: '#9ca1a8', 'font-size': 21, 'text-anchor': 'middle' }, String(fret)));
    }
  }

  function drawHitTargets() {
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (let fret = 0; fret <= 15; fret += 1) {
        const hit = svgEl('circle', { cx: fretX(fret), cy: stringY(stringIndex), r: 20, fill: 'transparent', style: 'cursor:pointer' });
        hit.addEventListener('click', () => handlePositionClick(stringIndex, fret));
        hit.addEventListener('mousemove', (evt) => {
          const pc = Music.noteAt(stringIndex, fret);
          const context = state.mode === 'harmony' ? state.harmonyRoot : state.root;
          const note = Music.spellPitchClassInMajorContext(context, pc);
          showTooltip(evt, `${note} · string ${Music.stringNumber(stringIndex)} · ${fret === 0 ? 'open' : `fret ${fret}`}`);
        });
        hit.addEventListener('mouseleave', hideTooltip);
        svg.appendChild(hit);
      }
    }
  }

  function drawMarker({ stringIndex, fret, fill, primary = '', secondary = '', radius = 21, opacity = 1, stroke = '#151617', strokeWidth = 4 }) {
    const x = fretX(fret); const y = stringY(stringIndex);
    const g = svgEl('g', { 'pointer-events': 'none', opacity });
    g.appendChild(svgEl('circle', { cx: x, cy: y, r: radius, fill, stroke, 'stroke-width': strokeWidth }));
    if (secondary) {
      g.appendChild(svgEl('text', { x, y: y - 1, fill: '#fff', 'font-size': 12, 'font-weight': 800, 'text-anchor': 'middle' }, primary));
      g.appendChild(svgEl('text', { x, y: y + 12, fill: '#fff', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle' }, secondary));
    } else if (primary) {
      g.appendChild(svgEl('text', { x, y: y + 7, fill: '#fff', 'font-size': 19, 'font-weight': 850, 'text-anchor': 'middle' }, primary));
    }
    svg.appendChild(g);
  }

  function chordToneColor(info) {
    return info.className === 'root' ? '#ff4a4f' : info.className === 'third' ? '#82c5fb' : '#ffd970';
  }

  function renderExploreMarkers() {
    const voicing = Music.getCagedVoicing(state.root, state.shape);
    const rootPc = Music.PITCH_CLASS[state.root];

    if (state.guidance === 'build') {
      state.buildSelections.forEach((key) => {
        const [stringIndex, fret] = key.split(':').map(Number);
        drawMarker({ stringIndex, fret, fill: '#59616d', primary: '•', radius: 18, strokeWidth: 2 });
      });
      return;
    }
    if (state.guidance === 'hidden') return;

    voicing.forEach((fret, stringIndex) => {
      if (fret === null || fret > 15) return;
      const pc = Music.noteAt(stringIndex, fret);
      const info = Music.getChordToneInfo(state.root, pc);
      if (!info) return;
      if (state.guidance === 'roots' && pc !== rootPc) return;
      const note = Music.spellPitchClassInMajorContext(state.root, pc);
      const full = state.guidance === 'full';
      drawMarker({ stringIndex, fret, fill: chordToneColor(info), primary: full ? note : info.degree, secondary: full ? info.degree : '' });
    });
  }

  function renderNavMarkers() {
    const ex = state.navExercise;
    if (!ex) return;
    if (ex.anchor) {
      drawMarker({ stringIndex: ex.anchor.stringIndex, fret: ex.anchor.fret, fill: '#ff4a4f', primary: ex.anchorLabel || 'R' });
    }
    if (state.navSelection) {
      drawMarker({ ...state.navSelection, fill: state.navSelection.correct ? '#5fd39b' : '#ff7d81', primary: state.navSelection.correct ? '✓' : '×', radius: 18, strokeWidth: 2 });
    }
  }

  function renderHarmonyMarkers() {
    const scale = Music.spellMajorScale(state.harmonyRoot);
    const scalePcs = new Set(scale.map((n) => Music.PITCH_CLASS[n]));
    const progression = Music.getMajorProgression(state.harmonyRoot);
    const chord = progression[state.harmonyIndex];

    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (let fret = 0; fret <= 15; fret += 1) {
        const pc = Music.noteAt(stringIndex, fret);
        if (scalePcs.has(pc)) drawMarker({ stringIndex, fret, fill: '#5b6473', radius: 6, opacity: 0.36, strokeWidth: 0 });
      }
    }

    if (state.harmonyReveal && !state.harmonyTask) {
      chord.pcs.forEach((pc) => {
        const degreeIndex = chord.pcs.indexOf(pc);
        const labels = ['R', '3', '5'];
        const fills = ['#ff4a4f', '#82c5fb', '#ffd970'];
        Music.findPositionsForPitchClass(pc, 15).forEach(({ stringIndex, fret }) => {
          drawMarker({ stringIndex, fret, fill: fills[degreeIndex], primary: labels[degreeIndex], radius: 18, opacity: 0.95, strokeWidth: 3 });
        });
      });
    }

    if (state.harmonySelection) {
      drawMarker({ ...state.harmonySelection, fill: state.harmonySelection.correct ? '#5fd39b' : '#ff7d81', primary: state.harmonySelection.correct ? '✓' : '×', radius: 18, strokeWidth: 2 });
    }
  }

  function renderFretboard() {
    drawBoardBase();
    if (state.mode === 'explore') renderExploreMarkers();
    if (state.mode === 'navigate') renderNavMarkers();
    if (state.mode === 'harmony') renderHarmonyMarkers();
    drawHitTargets();
  }

  function renderHeader() {
    const title = document.getElementById('pageTitle');
    const subtitle = document.getElementById('pageSubtitle');
    const pill = document.getElementById('notesPill');
    if (state.mode === 'explore') {
      title.textContent = `${state.root} Major · ${state.shape} Shape`;
      subtitle.textContent = 'Reduce the guidance until you can reconstruct the voicing yourself.';
      pill.textContent = Music.getMajorTriad(state.root).join(' · ');
    } else if (state.mode === 'navigate') {
      title.textContent = 'Fretboard Navigation';
      subtitle.textContent = 'Use anchors and interval relationships instead of guessing from shapes.';
      pill.textContent = 'Retrieve → Navigate → Transfer';
    } else {
      title.textContent = `${state.harmonyRoot} Major · Harmonic Context`;
      subtitle.textContent = 'The key is the landscape. The active chord tones are the destinations.';
      pill.textContent = Music.spellMajorScale(state.harmonyRoot).join(' · ');
    }
  }

  function renderPanels() {
    ['explore', 'navigate', 'harmony'].forEach((mode) => {
      document.getElementById(`${mode}Panel`).classList.toggle('hidden', state.mode !== mode);
      document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.toggle('active', state.mode === mode);
    });
    document.querySelectorAll('[data-guidance]').forEach((btn) => btn.classList.toggle('active', btn.dataset.guidance === state.guidance));
    document.querySelectorAll('[data-shape]').forEach((btn) => btn.classList.toggle('active', btn.dataset.shape === state.shape));

    const actionVisible = state.guidance === 'build';
    document.getElementById('clearBuild').style.display = actionVisible ? '' : 'none';
    document.getElementById('checkBuild').style.display = actionVisible ? '' : 'none';
    const exploreTask = document.getElementById('exploreTask');
    const exploreFeedback = document.getElementById('exploreFeedback');
    const messages = {
      full: ['Study note names and interval functions together.', 'Do not stay here. Move to Intervals once the voicing makes sense.'],
      intervals: ['Name the notes yourself before hovering.', 'You get R / 3 / 5, but the note names are now your job.'],
      roots: ['Use the roots as anchors and reconstruct the 3rds and 5ths mentally.', 'Only the roots remain visible.'],
      hidden: [`Reconstruct ${state.root} major in the ${state.shape} shape without visible chord tones.`, 'When you think you have it, move to Build and place the voicing.'],
      build: [`Construct ${state.root} major using the ${state.shape} CAGED shape.`, 'Tap each string/fret in the voicing, then check the chord.'],
    };
    exploreTask.textContent = messages[state.guidance][0];
    if (!exploreFeedback.classList.contains('good') && !exploreFeedback.classList.contains('bad')) exploreFeedback.textContent = messages[state.guidance][1];
  }

  function renderHarmonyPanel() {
    const progression = Music.getMajorProgression(state.harmonyRoot);
    const holder = document.getElementById('progression');
    holder.innerHTML = '';
    progression.forEach((chord, idx) => {
      const card = document.createElement('button');
      card.className = `chord-card${idx === state.harmonyIndex ? ' active' : ''}`;
      card.innerHTML = `<div class="roman">${chord.roman}</div><div class="chord-name">${chord.root}</div><div class="chord-notes">${chord.notes.join(' · ')}</div>`;
      card.addEventListener('click', () => {
        state.harmonyIndex = idx;
        state.harmonyTask = null;
        state.harmonySelection = null;
        renderAll();
      });
      holder.appendChild(card);
    });
    const chord = progression[state.harmonyIndex];
    document.getElementById('toggleHarmonyReveal').textContent = state.harmonyReveal ? 'Hide chord tones' : 'Show chord tones';
    if (!state.harmonyTask) {
      document.getElementById('harmonyPrompt').textContent = `Current chord: ${chord.root} major (${chord.roman}) · ${chord.notes.join(' – ')}`;
      document.getElementById('harmonyFeedback').textContent = state.harmonyReveal ? 'Notice how the highlighted destinations change while the key remains fixed.' : 'Chord-tone answers are hidden. Try to reconstruct the triad before revealing it.';
      document.getElementById('harmonyFeedback').className = '';
    }
  }

  function renderAll() {
    renderHeader();
    renderPanels();
    if (state.mode === 'harmony') renderHarmonyPanel();
    renderFretboard();
  }

  function handlePositionClick(stringIndex, fret) {
    if (state.mode === 'explore' && state.guidance === 'build') {
      const key = positionKey(stringIndex, fret);
      if (state.buildSelections.has(key)) state.buildSelections.delete(key); else state.buildSelections.add(key);
      document.getElementById('exploreFeedback').className = '';
      renderAll();
      return;
    }
    if (state.mode === 'navigate') evaluateNavClick(stringIndex, fret);
    if (state.mode === 'harmony' && state.harmonyTask) evaluateHarmonyClick(stringIndex, fret);
  }

  function checkBuild() {
    if (state.guidance !== 'build') return;
    const expected = new Set();
    Music.getCagedVoicing(state.root, state.shape).forEach((fret, stringIndex) => {
      if (fret !== null && fret <= 15) expected.add(positionKey(stringIndex, fret));
    });
    const correctCount = [...state.buildSelections].filter((key) => expected.has(key)).length;
    const missing = [...expected].filter((key) => !state.buildSelections.has(key)).length;
    const extra = [...state.buildSelections].filter((key) => !expected.has(key)).length;
    const correct = missing === 0 && extra === 0;
    const feedback = document.getElementById('exploreFeedback');
    feedback.className = correct ? 'good' : 'bad';
    feedback.textContent = correct ? 'Correct. You reconstructed the entire voicing without the diagram.' : `${correctCount} correct position${correctCount === 1 ? '' : 's'}, ${missing} missing, ${extra} extra. Adjust it without revealing the answer.`;
    EventStore.add({ mode: 'explore', exercise: 'build_caged_voicing', root: state.root, shape: state.shape, correct, correctCount, missing, extra });
  }

  function candidateAnchor(rootPc) {
    const anchors = Music.findPositionsForPitchClass(rootPc, 12).filter((p) => p.fret >= 1 && p.fret <= 10);
    return choose(anchors);
  }

  function nearbyTargets(anchor, targetPc) {
    return Music.findPositionsForPitchClass(targetPc, 15).filter((p) => Math.abs(p.fret - anchor.fret) <= 5 && Math.abs(p.stringIndex - anchor.stringIndex) <= 2 && positionKey(p.stringIndex, p.fret) !== positionKey(anchor.stringIndex, anchor.fret));
  }

  function makeFindNoteExercise() {
    const targetName = choose(Music.ROOTS);
    const targetPc = Music.PITCH_CLASS[targetName];
    const stringIndex = Math.floor(Math.random() * 6);
    const validTargets = Music.findPositionsForPitchClass(targetPc, 15).filter((p) => p.stringIndex === stringIndex);
    return {
      type: 'findNote', root: targetName, targetPc, validTargets,
      prompt: `Find ${targetName} on string ${Music.stringNumber(stringIndex)} (frets 0–15).`,
      startedAt: now(), solved: false,
    };
  }

  function makeIntervalExercise(type = 'findInterval') {
    for (let i = 0; i < 30; i += 1) {
      const root = choose(Music.ROOTS);
      const rootPc = Music.PITCH_CLASS[root];
      const semitones = choose([4, 7]);
      const anchor = candidateAnchor(rootPc);
      const targetPc = Music.mod12(rootPc + semitones);
      const targets = nearbyTargets(anchor, targetPc);
      if (!targets.length) continue;
      const interval = Music.INTERVALS[semitones];
      return {
        type, root, rootPc, semitones, targetPc, anchor, anchorLabel: 'R', validTargets: targets,
        prompt: type === 'completeTriad'
          ? `Complete ${root} major from this root: find a nearby ${interval.name.toLowerCase()}.`
          : `Starting from this ${root} anchor, find a nearby ${interval.name.toLowerCase()} (within ±5 frets / ±2 strings).`,
        startedAt: now(), solved: false,
      };
    }
    return makeFindNoteExercise();
  }

  function makeTransferExercise() {
    let source = choose(Music.ROOTS); let target = choose(Music.ROOTS);
    while (target === source) target = choose(Music.ROOTS);
    const semitones = choose([4, 7]);
    const interval = Music.INTERVALS[semitones];
    const sourcePc = Music.PITCH_CLASS[source];
    const targetRootPc = Music.PITCH_CLASS[target];
    const sourceTone = Music.spellPitchClassInMajorContext(source, Music.mod12(sourcePc + semitones));
    const targetPc = Music.mod12(targetRootPc + semitones);
    const stringIndex = Math.floor(Math.random() * 6);
    const validTargets = Music.findPositionsForPitchClass(targetPc, 15).filter((p) => p.stringIndex === stringIndex);
    return {
      type: 'transfer', root: target, rootPc: targetRootPc, semitones, targetPc, validTargets,
      prompt: `In ${source} major, the ${interval.name.toLowerCase()} is ${sourceTone}. Transfer that function to ${target} major: find its ${interval.name.toLowerCase()} on string ${Music.stringNumber(stringIndex)}.`,
      startedAt: now(), solved: false,
    };
  }

  function newNavExercise() {
    const selected = document.getElementById('exerciseType').value;
    const type = selected === 'mixed' ? choose(['findNote', 'findInterval', 'completeTriad', 'transfer']) : selected;
    state.navExercise = type === 'findNote' ? makeFindNoteExercise() : type === 'transfer' ? makeTransferExercise() : makeIntervalExercise(type);
    state.navAttempts = 0;
    state.navSelection = null;
    document.getElementById('navPrompt').textContent = state.navExercise.prompt;
    const feedback = document.getElementById('navFeedback');
    feedback.textContent = 'Click the fretboard to answer. Think before you click.';
    feedback.className = '';
    document.getElementById('attemptChip').textContent = 'Attempts: 0';
    renderAll();
  }

  function isValidTarget(ex, stringIndex, fret) {
    return ex.validTargets.some((p) => p.stringIndex === stringIndex && p.fret === fret);
  }

  function evaluateNavClick(stringIndex, fret) {
    const ex = state.navExercise;
    if (!ex || ex.solved) return;
    state.navAttempts += 1;
    const pc = Music.noteAt(stringIndex, fret);
    const correct = isValidTarget(ex, stringIndex, fret);
    state.navSelection = { stringIndex, fret, correct };
    document.getElementById('attemptChip').textContent = `Attempts: ${state.navAttempts}`;
    const feedback = document.getElementById('navFeedback');
    const contextRoot = ex.root;
    const note = Music.spellPitchClassInMajorContext(contextRoot, pc);
    if (correct) {
      ex.solved = true;
      feedback.className = 'good';
      feedback.textContent = `Correct: ${note}. Notice the relationship before starting the next exercise.`;
    } else {
      feedback.className = 'bad';
      if (ex.rootPc !== undefined) {
        const interval = Music.intervalFromPitchClasses(ex.rootPc, pc);
        feedback.textContent = `You chose ${note}, which is ${interval.name.toLowerCase()} relative to ${ex.root}. Use that information and try again.`;
      } else {
        feedback.textContent = `You chose ${note} on string ${Music.stringNumber(stringIndex)}, fret ${fret}. Try again without revealing the target.`;
      }
    }
    EventStore.add({
      mode: 'navigate', exercise: ex.type, root: ex.root, semitones: ex.semitones ?? null,
      targetPitchClass: ex.targetPc, selectedPitchClass: pc, stringIndex, fret, correct,
      attempt: state.navAttempts, responseMs: Math.round(now() - ex.startedAt),
    });
    renderFretboard();
  }

  function moveHarmony(delta) {
    const progression = Music.getMajorProgression(state.harmonyRoot);
    state.harmonyIndex = (state.harmonyIndex + delta + progression.length) % progression.length;
    state.harmonyTask = null;
    state.harmonySelection = null;
    renderAll();
  }

  function startHarmonyTask() {
    const chord = Music.getMajorProgression(state.harmonyRoot)[state.harmonyIndex];
    const targetIndex = choose([0, 1, 2]);
    const degreeNames = ['root', 'major 3rd', 'perfect 5th'];
    state.harmonyTask = { chord, targetIndex, targetPc: chord.pcs[targetIndex], startedAt: now(), attempts: 0, solved: false };
    state.harmonyReveal = false;
    state.harmonySelection = null;
    document.getElementById('harmonyPrompt').textContent = `${chord.root} major (${chord.roman}) is active. Find its ${degreeNames[targetIndex]}.`;
    const feedback = document.getElementById('harmonyFeedback');
    feedback.textContent = 'The scale remains visible, but the chord-tone answer is hidden.';
    feedback.className = '';
    renderAll();
  }

  function evaluateHarmonyClick(stringIndex, fret) {
    const task = state.harmonyTask;
    if (!task || task.solved) return;
    task.attempts += 1;
    const pc = Music.noteAt(stringIndex, fret);
    const correct = pc === task.targetPc;
    state.harmonySelection = { stringIndex, fret, correct };
    const note = Music.spellPitchClassInMajorContext(state.harmonyRoot, pc);
    const feedback = document.getElementById('harmonyFeedback');
    if (correct) {
      task.solved = true;
      feedback.className = 'good';
      feedback.textContent = `Correct: ${note}. That note is a destination when ${task.chord.root} major is active.`;
    } else {
      const relation = Music.intervalFromPitchClasses(Music.PITCH_CLASS[task.chord.root], pc);
      feedback.className = 'bad';
      feedback.textContent = `You chose ${note}: ${relation.name.toLowerCase()} of ${task.chord.root}. Try again.`;
    }
    EventStore.add({
      mode: 'harmony', exercise: 'find_current_chord_tone', key: state.harmonyRoot,
      roman: task.chord.roman, chordRoot: task.chord.root, targetDegreeIndex: task.targetIndex,
      targetPitchClass: task.targetPc, selectedPitchClass: pc, stringIndex, fret, correct,
      attempt: task.attempts, responseMs: Math.round(now() - task.startedAt),
    });
    renderFretboard();
  }

  async function exportHistory() {
    const events = await EventStore.getAll();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), schemaVersion: 1, events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guitar-learning-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  setupControls();
  renderAll();
  updateHistoryStatus();
})();
