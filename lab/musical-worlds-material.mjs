// Original, source-free musical materials for seven different musician actions.
// Musical event choices are authored here; pitch truth comes from musicQueries at playback.
export const WORLD_DEFINITIONS = Object.freeze([
  { id: "band", title: "The band's empty space", intention: "Arrange", question: "What does this band actually need from your guitar?",
    action: "Listen to the rhythm section; create a guitar part that makes room for it. Compare full band, backing-only and your part alone.",
    transfer: "Change to a contrasting arrangement while keeping the musical role you chose, rather than copying the notes." },
  { id: "groove", title: "Inside the groove", intention: "Rhythm", question: "How can silence, muted attacks and pitched notes change the pocket?",
    action: "Build a one-bar right-hand pattern. Hear it repeat over a living drum-and-bass arrangement; adjust accents and space.",
    transfer: "Play the same rhythm with your hands over a different backing and notice which placements still work." },
  { id: "missing", title: "The missing musician", intention: "Listen & reconstruct", question: "Can you hear the role of a part after it disappears?",
    action: "Hear the complete arrangement, remove its lead guitar, reconstruct a musically plausible part by ear, then uncover one authored interpretation.",
    transfer: "Make your own alternative that serves the arrangement without reproducing every note." },
  { id: "detective", title: "Harmony detective", intention: "Interpret", question: "What changes when the melody stays but the bass changes?",
    action: "Hear the same repeating pitch with two contrasting harmonies, form an interpretation, then inspect engine-derived interval and chord-membership facts.",
    transfer: "Keep the pitch and choose a third harmonic context yourself on your guitar." },
  { id: "dialogue", title: "Musical dialogue", intention: "Respond", question: "How should you answer a musical statement rather than copy it?",
    action: "Hear a one-bar call, invent its response on the guitar, and make the band alternate between the call and your authored answer.",
    transfer: "Develop a reply that contrasts rhythm without losing the connection to the original call." },
  { id: "composition", title: "A phrase becomes a piece", intention: "Compose", question: "Can two short ideas become a recognisable musical form?",
    action: "Write or play contrasting A and B phrases, arrange a four-bar return, and listen to the composition over changing accompaniment.",
    transfer: "Change the A/B form or the arrangement while keeping your central musical idea recognisable." },
  { id: "expression", title: "The same notes, four voices", intention: "Interpret & perform", question: "How much musical meaning lives in attack and timing?",
    action: "Hear one authored phrase with different placements and accents, perform your own interpretation, and compare without a correctness score.",
    transfer: "Apply an expressive intention to a different phrase, not just these particular notes." },
]);

const G2 = "0:3", C3 = "1:3", D3 = "2:0", E3 = "2:2", G3 = "3:0", A3 = "3:2";
const B3 = "4:0", C4 = "4:1", E4 = "5:0", G4 = "5:3";
export const NOTE_PALETTE = Object.freeze([G2,C3,D3,E3,G3,A3,B3,C4,E4,G4]);
export const REFERENCE_PHRASE = Object.freeze([
  { step: 0, note: G3, duration: 2 }, { step: 4, note: B3, duration: 2 },
  { step: 6, note: C4, duration: 2 }, { step: 10, note: B3, duration: 2 },
  { step: 14, note: G3, duration: 2 },
]);
export const CALL_PHRASE = Object.freeze([
  { step: 0, note: G3, duration: 2 }, { step: 3, note: B3, duration: 2 },
  { step: 7, note: C4, duration: 2 }, { step: 12, note: G3, duration: 3 },
]);
export const ARRANGEMENTS = Object.freeze([
  { id: "interlock", name: "Interlocking pocket", tempo: 102, description: "Offbeat bass accents, a steady snare and busy high-hat subdivisions.",
    roots: [G2, C3, D3, G2], bassSteps: [0,6,10,14], kicks: [0,7,10], snares: [4,12], hats: [0,2,4,6,8,10,12,14] },
  { id: "air", name: "Room to breathe", tempo: 78, description: "A spacious pulse with long rests; the guitar can lead without filling every gap.",
    roots: [G2,G2,C3,D3], bassSteps: [0,9], kicks: [0,8], snares: [12], hats: [0,4,8,12] },
  { id: "crosscurrent", name: "Cross-current", tempo: 112, description: "A shifting bass figure and displaced accents create an active arrangement.",
    roots: [C3,G2,D3,C3], bassSteps: [0,3,9,13], kicks: [0,6,11], snares: [4,12,15], hats: [0,2,5,8,10,13] },
]);

export function positionFromKey(key) {
  if (typeof key !== "string" || !/^[0-5]:\d{1,2}$/.test(key)) throw new RangeError("Invalid supplied guitar position");
  const [stringIndex,fret] = key.split(":").map(Number);
  return Object.freeze({stringIndex,fret});
}
export function emptyGrid() { return Array.from({length:16},()=>null); }
export function initialWorldState() {
  return { world:"band", arrangement:"interlock", pattern:emptyGrid(),
    phraseA:[G3,null,B3,null,C4,null,B3,null,G3,null,null,null,null,null,null,null],
    phraseB:[E4,null,C4,null,B3,null,G3,null,A3,null,G3,null,null,null,null,null],
    response:[null,null,C4,null,B3,null,G3,null,null,null,A3,null,G3,null,null,null],
    section:"A", form:"AABA", feel:"natural", context:"G", selectedStep:0, revealed:false,
    reflections:{}, auditions:0 };
}
export function editGrid(state, field, step, value) {
  if (!["pattern","phraseA","phraseB","response"].includes(field) || !Number.isInteger(step) || step<0 || step>=16) throw new RangeError("Invalid musical edit");
  if (value!==null && value!=="mute" && !NOTE_PALETTE.includes(value)) throw new RangeError("Unsupported guitar position");
  return { ...state, [field]:state[field].map((x,i)=>i===step?value:x) };
}
export function arrangeWorld(id) {
  const material=ARRANGEMENTS.find(x=>x.id===id);
  if(!material) throw new RangeError("Unknown authored arrangement");
  return material;
}
function addDrums(events, material, bars) {
  for(let bar=0;bar<bars;bar++)for(const [instrument,steps] of [
    ["kick",material.kicks],["snare",material.snares],["hat",material.hats]
  ]) for(const step of steps)events.push({instrument,step:bar*16+step,velocity:instrument==="hat"?.18:.42});
}
function addBass(events, material, bars) {
  for(let bar=0;bar<bars;bar++)for(const step of material.bassSteps)events.push({
    instrument:"bass",step:bar*16+step,note:material.roots[bar%material.roots.length],
    duration:Math.max(1, material.bassSteps.length===2?5:2),velocity:.33,
  });
}
function addPhrase(events, phrase, bar, feel="natural") {
  const offsets={natural:0,laidback:.25,ahead:-.18,staccato:0};
  const offset=offsets[feel]??0;
  for(const item of phrase){
    events.push({instrument:"guitar",step:bar*16+item.step,note:item.note,
      duration:feel==="staccato"?Math.min(1,item.duration):item.duration,
      offsetSteps:item.step===0?Math.max(0,offset):offset,
      velocity:feel==="staccato"?.5:item.step%4===0?.6:.35});
  }
}
function addGrid(events, grid, bar, feel="natural") {
  const offset=feel==="laidback"?.23:feel==="ahead"?-.12:0;
  for(let i=0;i<16;i++) {
    const note=grid[i];
    if(!note) continue;
    events.push({ instrument:note==="mute"?"mute":"guitar",step:bar*16+i,
      ...(note==="mute"?{}:{note}),duration:1.5,
      offsetSteps:i===0?Math.max(0,offset):offset,velocity:i%4===0?.55:.35 });
  }
}
export function buildWorldScore(state,{mode="full"}={}) {
  const material=arrangeWorld(state.arrangement);
  const bars=4;
  const events=[];
  if(mode!=="solo") {addDrums(events,material,bars);addBass(events,material,bars);}
  if(mode!=="backing") {
    if(state.world==="band"||state.world==="groove") {
      for(let b=0;b<bars;b++) addGrid(events,state.pattern,b,state.feel);
    } else if(state.world==="composition") {
      for(const [index,part] of [...state.form].entries()) addGrid(events,part==="A"?state.phraseA:state.phraseB,index,state.feel);
    } else if(state.world==="dialogue") {
      for(let b=0;b<bars;b++) b%2===0?addPhrase(events,CALL_PHRASE,b):addGrid(events,state.response,b);
    } else if(state.world==="detective") {
      const pitch=C4;
      for(let b=0;b<bars;b++) events.push({instrument:"guitar",step:b*16+4,note:pitch,duration:5,velocity:.48});
    } else if(state.world==="missing") {
      for(let b=0;b<bars;b++)addPhrase(events,REFERENCE_PHRASE,b);
    } else if(state.world==="expression") {
      for(let b=0;b<bars;b++)addPhrase(events,REFERENCE_PHRASE,b,state.feel);
    }
  }
  if(state.world==="detective") {
    const root=state.context==="C"?C3:state.context==="D"?D3:G2;
    for(const e of events) if(e.instrument==="bass")e.note=root;
  }
  const result=events.filter(e=>e.step>=0&&e.step<bars*16)
    .sort((a,b)=>a.step-b.step||a.instrument.localeCompare(b.instrument));
  return Object.freeze({tempo:material.tempo,bars,events:Object.freeze(result.map(x=>Object.freeze(x)))});
}
export function worldReviewPrompts(state) {
  return WORLD_DEFINITIONS.find(x=>x.id===state.world) || WORLD_DEFINITIONS[0];
}
