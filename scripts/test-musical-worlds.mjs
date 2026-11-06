import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { musicQueries, toSemitone } from "../.lab-dist/engine/index.js";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import {
  WORLD_DEFINITIONS, ARRANGEMENTS, NOTE_PALETTE, REFERENCE_PHRASE,
  initialWorldState, editGrid, positionFromKey, buildWorldScore,
} from "../lab/musical-worlds-material.mjs";

const keys=new Set(STEEL_SAMPLES.map(x=>x.stringIndex+":"+x.fret));
assert.equal(WORLD_DEFINITIONS.length,7,"Seven distinct musical experiences exist");
assert.equal(new Set(WORLD_DEFINITIONS.map(x=>x.id)).size,WORLD_DEFINITIONS.length);
assert.equal(new Set(ARRANGEMENTS.map(x=>x.id)).size,ARRANGEMENTS.length);
for(const k of NOTE_PALETTE){
  assert.ok(keys.has(k),"Recorded guitar palette must be licensed and present: "+k);
  const fact=musicQueries.getNoteAtFret({position:positionFromKey(k)});
  assert.equal(fact.ok,true,k);
  assert.ok(Number.isFinite(toSemitone(fact.data.pitch)),k);
}
assert.throws(()=>positionFromKey("outside"));
let state=initialWorldState();
const original=state.pattern;
state=editGrid(state,"pattern",6,"3:0");
assert.equal(state.pattern[6],"3:0");
assert.equal(original[6],null,"State editing must not mutate previous snapshots");
assert.throws(()=>editGrid(state,"pattern",16,"3:0"));
assert.throws(()=>editGrid(state,"pattern",3,"7:14"));
assert.equal(REFERENCE_PHRASE.length,5);
for(const world of WORLD_DEFINITIONS){
  for(const arrangement of ARRANGEMENTS){
    for(const mode of ["full","backing","solo"]){
      const s=buildWorldScore({...state,world:world.id,arrangement:arrangement.id},{mode});
      assert.equal(s.bars,4);
      assert.equal(s.tempo,arrangement.tempo);
      assert.ok(Object.isFrozen(s));
      assert.ok(s.events.length>0,"Expected audible material for "+world.id+"/"+mode);
      let previous=-1;
      for(const e of s.events){
        assert.ok(e.step>=previous,"Stable event ordering");
        previous=e.step;
        assert.ok(e.step>=0&&e.step<s.bars*16);
        assert.ok(["guitar","bass","kick","snare","hat","mute"].includes(e.instrument));
        if(e.instrument==="guitar"){
          assert.ok(keys.has(e.note),"Guitar sound must use verified recordings "+e.note);
          assert.equal(musicQueries.getNoteAtFret({position:positionFromKey(e.note)}).ok,true);
        }
        if(e.instrument==="bass")
          assert.equal(musicQueries.getNoteAtFret({position:positionFromKey(e.note)}).ok,true);
        if(mode==="backing")assert.notEqual(e.instrument,"guitar");
        if(mode==="solo")assert.ok(["guitar","mute"].includes(e.instrument));
      }
    }
  }
}
for(const context of ["G","C","D"]){
  const spec=context==="G"?{root:{letter:"G",accidental:0},chordId:"major"}:
    context==="C"?{root:{letter:"C",accidental:0},chordId:"major"}:
    {root:{letter:"D",accidental:0},chordId:"dominant7"};
  const pos=musicQueries.getNoteAtFret({position:{stringIndex:4,fret:1}});
  const result=musicQueries.analyseNotes({notes:[pos.data.pitch],context:{currentChord:spec}});
  assert.equal(result.ok,true);
  assert.ok(result.data[0].chordRelation);
}
const sourceRoot=resolve(fileURLToPath(new URL("..",import.meta.url)));
const read=path=>readFile(resolve(sourceRoot,path),"utf8");
const [page,main,server,preview,worldApp,worldAudio,style]=await Promise.all([
  read("lab/instrument-desk.html"),read("lab/instrument-desk-app.js"),
  read("scripts/serve-lab.mjs"),read("scripts/build-preview.mjs"),
  read("lab/musical-worlds-app.mjs"),read("lab/musical-worlds-audio.mjs"),
  read("lab/musical-worlds.css"),
]);
for(const id of ["worlds-view","worlds-root","nav-worlds","open-worlds","worlds-back"])assert.ok(page.includes('id="'+id+'"'));
assert.match(main,/createMusicalWorlds/);
assert.match(main,/view === "worlds"/);
for(const asset of ["musical-worlds-app.mjs","musical-worlds-audio.mjs","musical-worlds-material.mjs","musical-worlds.css"]){
  assert.ok(server.includes('"'+"/"+asset+'"'),"Server allow-list: "+asset);
  assert.ok(preview.includes('"'+asset+'"'),"Preview bundle: "+asset);
}
assert.match(worldAudio,/one native Web Audio clock/i);
assert.match(worldAudio,/STEEL_SAMPLES/);
assert.match(worldApp,/getUserMedia/);
assert.match(worldApp,/reflections/);
assert.match(style,/var\(--ge-panel\)/);
console.log("Musical Worlds: seven distinct actions, all arrangements/mixes, sample mapping, engine facts, privacy and deployment paths validated.");
