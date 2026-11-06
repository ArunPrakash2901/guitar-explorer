import { musicQueries, formatPitch, toSemitone } from "/engine/index.js";
import { createFretboard } from "/fretboard-view.mjs";
import { WORLD_DEFINITIONS, ARRANGEMENTS, REFERENCE_PHRASE, CALL_PHRASE, NOTE_PALETTE,
  positionFromKey, initialWorldState, editGrid, buildWorldScore, worldReviewPrompts } from "./musical-worlds-material.mjs";
import { createWorldAudio } from "./musical-worlds-audio.mjs";

const escapeHtml=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const key=({stringIndex,fret})=>stringIndex+":"+fret;
function noteAt(noteKey){
  const result=musicQueries.getNoteAtFret({position:positionFromKey(noteKey)});
  if(!result.ok)throw new Error(result.error.message);
  return result.data;
}
const noteNames=new Map(NOTE_PALETTE.map(k=>[k,formatPitch(noteAt(k).pitch)]));
const noteLabel=value=>value==="mute"?"×":value?noteNames.get(value)??"?":"·";
const editable=id=>["band","groove","dialogue","composition"].includes(id);
function currentGrid(s){return s.world==="composition"?(s.section==="B"?"phraseB":"phraseA")
  :s.world==="dialogue"?"response":"pattern";}
function selectHtml(id,caption,entries,selected){
  return '<label for="'+id+'">'+escapeHtml(caption)+'</label><select id="'+id+'">'+entries.map(([v,label])=>
    '<option value="'+escapeHtml(v)+'"'+(v===selected?" selected":"")+'>'+escapeHtml(label)+'</option>').join("")+'</select>';
}

export function createMusicalWorlds(container){
  if(!container)throw new TypeError("Musical worlds need a container");
  container.innerHTML="\n<div class=\"worlds-heading\">\n  <p class=\"eyebrow\">Explore · Practice · Apply</p>\n  <h1 id=\"worlds-title\" tabindex=\"-1\">Musical worlds</h1>\n  <p class=\"home-intro\">Make musical decisions, not just correct selections. All backing material is original; your guitar and your ears do the important work.</p>\n</div>\n<div class=\"worlds-layout\">\n  <aside class=\"worlds-list panel\" aria-label=\"Musical experiences\"><h2>Choose a musical situation</h2><div id=\"worlds-choices\"></div></aside>\n  <div class=\"worlds-workspace\">\n    <section class=\"panel worlds-context\">\n      <p class=\"eyebrow\" id=\"world-intention\"></p><h2 id=\"world-question\"></h2><p id=\"world-action\"></p>\n      <label for=\"world-arrangement\">Original backing arrangement</label><select id=\"world-arrangement\"></select>\n      <p class=\"quiet\" id=\"world-arrangement-note\"></p>\n      <div class=\"worlds-transport\" aria-label=\"Musical transport\">\n        <button type=\"button\" class=\"primary\" data-audio=\"full\">Hear with guitar</button>\n        <button type=\"button\" data-audio=\"backing\">Hear backing only</button>\n        <button type=\"button\" data-audio=\"solo\">Hear guitar alone</button>\n        <button type=\"button\" id=\"world-stop\">Stop</button>\n      </div>\n      <p id=\"world-status\" class=\"feedback\" role=\"status\" aria-live=\"polite\">Pick a musical situation and play.</p>\n    </section>\n    <section class=\"panel worlds-canvas\" aria-label=\"Musical workbench\">\n      <div id=\"world-settings\" class=\"worlds-settings\"></div>\n      <div id=\"world-activity\"></div><div id=\"world-editor\"></div>\n      <div id=\"world-neck-panel\"><h3>Physical guitar · sampled positions</h3>\n        <p class=\"quiet\">Select a subdivision, then choose a note on the fretboard; its string and fret remain part of your composition.</p>\n        <div id=\"world-neck\" class=\"desk-board\"></div>\n      </div>\n      <p id=\"world-transfer\" class=\"physical-prompt\"></p>\n    </section>\n    <section class=\"panel worlds-reflect\">\n      <h2>Listen to your own decision</h2>\n      <p class=\"quiet\">Your actual guitar is not monitored unless you choose to record locally; the application does not score musical taste.</p>\n      <div class=\"worlds-transport\">\n        <button type=\"button\" id=\"world-record\">Record my guitar</button>\n        <button type=\"button\" id=\"world-record-stop\" disabled>Stop recording</button>\n        <button type=\"button\" id=\"world-replay\" disabled>Replay my recording</button>\n        <a id=\"world-save-recording\" download=\"guitar-explorer-performance.webm\" hidden>Save recording</a>\n      </div>\n      <label for=\"world-reflection\">What did you choose, notice or change, and why?</label>\n      <textarea id=\"world-reflection\" rows=\"3\" placeholder=\"Describe the musical consequence in your own words.\"></textarea>\n      <div class=\"button-row\"><button type=\"button\" id=\"world-keep-reflection\">Keep reflection in this tab</button></div>\n      <p class=\"quiet\" id=\"world-record-status\" role=\"status\">Recordings stay on this device; nothing is uploaded or graded.</p>\n    </section>\n  </div>\n</div>";
  const $=selector=>container.querySelector(selector);
  const audio=createWorldAudio({queries:musicQueries,toSemitone});
  let state=initialWorldState();
  let recorder=null,stream=null,clip=null;
  const choices=$("#worlds-choices");
  for(const world of WORLD_DEFINITIONS){
    const button=document.createElement("button");
    button.type="button";button.dataset.world=world.id;
    const strong=document.createElement("strong");strong.textContent=world.title;
    const sub=document.createElement("span");sub.textContent=world.intention;
    button.append(strong,sub);choices.append(button);
  }
  for(const arrangement of ARRANGEMENTS){
    const opt=document.createElement("option");opt.value=arrangement.id;
    opt.textContent=arrangement.name+" · "+arrangement.tempo+" BPM";
    $("#world-arrangement").append(opt);
  }
  const board=createFretboard($("#world-neck"),{onSelect(position){
    const selected=key(position);
    if(!editable(state.world)||!noteNames.has(selected))return;
    state=editGrid(state,currentGrid(state),state.selectedStep,selected);
    drawEditor();
  }});
  function stopRecording(){
    if(recorder?.state==="recording")recorder.stop();
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    $("#world-record").disabled=false;$("#world-record-stop").disabled=true;
  }
  function stop(){audio.stop();stopRecording();}
  function drawNeck(){
    const active=editable(state.world);
    $("#world-neck-panel").hidden=!active;
    if(!active)return;
    const value=state[currentGrid(state)][state.selectedStep];
    board.update({
      strings:[5,4,3,2,1,0].map(index=>({index,label:"String "+(6-index)})),
      activeStringIndices:[0,1,2,3,4,5],fretRange:{minFret:0,maxFret:3},
      positions:NOTE_PALETTE.map(k=>{
        const p=positionFromKey(k);return {...p,selectable:true,selected:k===value,
          states:k===value?["source"]:[],primaryLabel:noteNames.get(k),
          ariaLabel:noteNames.get(k)+", string "+(6-p.stringIndex)+", fret "+p.fret};
      }),connections:[],label:"Recorded guitar positions, open through fret 3",
    });
  }
  function settings(){
    let html="";
    if(["band","groove","dialogue","composition","expression"].includes(state.world))
      html+=selectHtml("world-feel","Articulation / timing",[
        ["natural","Natural"],["laidback","Behind the pulse"],["ahead","Lean forward"],
        ["staccato","Short and separated"]],state.feel);
    if(state.world==="composition"){
      html+=selectHtml("world-form","Four-bar arrangement",[
        ["AABA","A · A · B · A"],["ABAB","A · B · A · B"],["ABBA","A · B · B · A"]],state.form);
      html+=selectHtml("world-section","Edit a phrase",[["A","Phrase A"],["B","Phrase B"]],state.section);
    }
    if(state.world==="detective")html+=selectHtml("world-context","Harmony underneath C4",[
      ["G","G major"],["C","C major"],["D","D dominant seventh"]],state.context);
    $("#world-settings").innerHTML=html;
  }
  function detectiveFacts(){
    const spec=state.context==="G"?{root:{letter:"G",accidental:0},chordId:"major"}:
      state.context==="C"?{root:{letter:"C",accidental:0},chordId:"major"}:
      {root:{letter:"D",accidental:0},chordId:"dominant7"};
    const result=musicQueries.analyseNotes({notes:[noteAt("4:1").pitch],context:{currentChord:spec}});
    if(!result.ok)throw new Error(result.error.message);
    const relation=result.data[0]?.chordRelation;
    return "C4 with "+state.context+": "+(relation?.interval?.label??"unknown root interval")+
      ", "+(relation?.isChordTone?"chord tone":"non-chord tone")+
      ". This describes the supplied context, not the quality of your interpretation.";
  }
  function activity(){
    let html="";
    if(state.world==="missing"){
      html='<h3>Hear the whole band, then remove its lead</h3><p>Remember the contour and rhythm, sing it, then reconstruct a useful guitar part without seeing its position sequence.</p>'+
        '<button type="button" id="world-reveal">'+(state.revealed?"Hide authored interpretation":"Reveal authored interpretation")+'</button>';
      if(state.revealed)html+='<p class="worlds-facts">'+escapeHtml(REFERENCE_PHRASE.map(item=>{
        const p=positionFromKey(item.note);
        return noteNames.get(item.note)+" · string "+(6-p.stringIndex)+", fret "+p.fret;
      }).join(" → "))+'</p>';
    }else if(state.world==="detective"){
      html='<h3>One pitch; multiple musical meanings</h3><p>Keep C4 unchanged while changing the underlying harmony. Make a prediction, listen and explain your interpretation before seeing the facts.</p>'+
        '<button type="button" id="world-reveal">'+(state.revealed?"Hide engine facts":"Reveal conditional musical facts")+'</button>';
      if(state.revealed)html+='<p class="worlds-facts">'+escapeHtml(detectiveFacts())+'</p>';
    }else if(state.world==="expression"){
      html='<h3>Interpret, then perform</h3><p>Compare the same authored notes under different timing and length treatments; then play your own interpretation and record it locally.</p>'+
        '<p class="quiet">These treatments demonstrate musical variables; they are not genre-authenticity or emotion scores.</p>';
    }else if(state.world==="dialogue"){
      html='<h3>Answer a musical statement</h3><p>Hear the original call, make a contrasting response, and listen to them alternate in the four-bar arrangement.</p>'+
        '<p class="quiet">Call: '+escapeHtml(CALL_PHRASE.map(n=>noteNames.get(n.note)).join(" – "))+'. Does your answer echo, extend or contradict it?</p>';
    }else if(state.world==="composition"){
      html='<h3>Write a small musical form</h3><p>Write distinct A and B phrases, choose their order, and listen for a recognisable return with contrasting accompaniment.</p>';
    }else if(state.world==="band"){
      html='<h3>Make room for the other musicians</h3><p>Listen to bass and drums first, then design a part that supports rather than competes with them; compare alone and in the ensemble.</p>';
    }else {
      html='<h3>Make the groove move</h3><p>Place rests, muted attacks and notes against the rhythm section. Change the balance of space and accent, then play it with your right hand.</p>';
    }
    $("#world-activity").innerHTML=html;
    $("#world-transfer").textContent="Next musical decision: "+worldReviewPrompts(state).transfer;
  }
  function drawEditor(){
    const active=editable(state.world);
    $("#world-editor").hidden=!active;
    if(!active){drawNeck();return;}
    const field=currentGrid(state);const grid=state[field];
    const title=state.world==="composition"?"Phrase "+state.section:
      state.world==="dialogue"?"Your answer":state.world==="groove"?"The right-hand groove":"Your guitar part";
    $("#world-editor").innerHTML='<h3>'+escapeHtml(title)+'</h3>'+
      '<p class="quiet">Click a subdivision then a note on the fretboard; rest and muted strokes are musical choices.</p>'+
      '<div class="worlds-steps" role="group" aria-label="'+escapeHtml(title)+'">'+
      grid.map((value,index)=>'<button type="button" class="worlds-step'+(index===state.selectedStep?" is-active":"")+
      '" data-step="'+index+'" aria-pressed="'+String(index===state.selectedStep)+'" aria-label="Subdivision '+(index+1)+': '+escapeHtml(noteLabel(value))+'">'+
      '<span class="worlds-count">'+(Math.floor(index/4)+1)+(index%4===0?"":"."+((index%4)+1))+'</span>'+
      '<strong>'+escapeHtml(noteLabel(value))+'</strong></button>').join("")+'</div>'+
      '<div class="worlds-note-actions"><span>Subdivision '+(state.selectedStep+1)+'</span>'+
      '<button type="button" data-note-action="rest">Rest</button>'+
      '<button type="button" data-note-action="mute">Muted stroke</button>'+
      '<button type="button" data-note-action="clear">Clear phrase</button></div>';
    drawNeck();
  }
  function render(){
    choices.querySelectorAll("[data-world]").forEach(button=>{
      const active=button.dataset.world===state.world;
      button.classList.toggle("is-current",active);button.setAttribute("aria-pressed",String(active));
    });
    $("#world-intention").textContent=worldReviewPrompts(state).intention;
    $("#world-question").textContent=worldReviewPrompts(state).question;
    $("#world-action").textContent=worldReviewPrompts(state).action;
    $("#world-arrangement").value=state.arrangement;
    $("#world-arrangement-note").textContent=ARRANGEMENTS.find(a=>a.id===state.arrangement).description;
    $("#world-reflection").value=state.reflections[state.world]??"";
    settings();activity();drawEditor();
  }
  choices.addEventListener("click",event=>{
    const button=event.target.closest("[data-world]");if(!button)return;
    audio.stop();state={...state,world:button.dataset.world,revealed:false,selectedStep:0};
    $("#world-status").textContent="New musical question. Begin by listening.";render();
  });
  $("#world-arrangement").addEventListener("change",event=>{
    audio.stop();state={...state,arrangement:event.target.value};
    $("#world-status").textContent="New arrangement. What changes in your musical responsibility?";render();
  });
  container.addEventListener("change",event=>{
    const id=event.target.id;
    if(id==="world-feel")state={...state,feel:event.target.value};
    else if(id==="world-form")state={...state,form:event.target.value};
    else if(id==="world-section")state={...state,section:event.target.value,selectedStep:0};
    else if(id==="world-context")state={...state,context:event.target.value,revealed:false};
    else return;
    audio.stop();render();
  });
  container.addEventListener("click",event=>{
    const cell=event.target.closest("[data-step]");
    if(cell){state={...state,selectedStep:Number(cell.dataset.step)};drawEditor();return;}
    const action=event.target.closest("[data-note-action]");
    if(action){
      const field=currentGrid(state);
      if(action.dataset.noteAction==="clear")state={...state,[field]:Array(16).fill(null)};
      else state=editGrid(state,field,state.selectedStep,action.dataset.noteAction==="mute"?"mute":null);
      drawEditor();return;
    }
    if(event.target.closest("#world-reveal")){state={...state,revealed:!state.revealed};activity();}
  });
  container.addEventListener("click",async event=>{
    const button=event.target.closest("[data-audio]");if(!button)return;
    const mode=button.dataset.audio;
    $("#world-status").textContent="Preparing "+(mode==="backing"?"the rhythm section":mode==="solo"?"the guitar part":"the full arrangement")+"…";
    try{
      const result=await audio.play(buildWorldScore(state,{mode}));
      if(result.cancelled)return;
      $("#world-status").textContent="Playback started: "+result.eventCount+" musical events. Play or listen to the consequences.";
    }catch(error){$("#world-status").textContent="Playback unavailable: "+(error?.message??"unknown error");}
  });
  $("#world-stop").addEventListener("click",()=>{
    audio.stop();$("#world-status").textContent="Stopped. Leave silence before your next decision.";
  });
  function clearClip(){
    if(clip){URL.revokeObjectURL(clip);clip=null;}
    $("#world-replay").disabled=true;$("#world-save-recording").hidden=true;
  }
  $("#world-record").addEventListener("click",async()=>{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder!=="function"){
      $("#world-record-status").textContent="Recording is not supported here.";return;
    }
    audio.stop();clearClip();
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      recorder=new MediaRecorder(stream);
      const chunks=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{
        if(chunks.length){
          const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
          clip=URL.createObjectURL(blob);
          $("#world-replay").disabled=false;
          $("#world-save-recording").href=clip;$("#world-save-recording").hidden=false;
          $("#world-record-status").textContent="Your take is ready to replay or save locally.";
        }else $("#world-record-status").textContent="No audio was captured.";
        stopRecording();
      };
      recorder.start();
      $("#world-record").disabled=true;$("#world-record-stop").disabled=false;
      $("#world-record-status").textContent="Recording locally; no automatic grade.";
    }catch(error){
      stopRecording();$("#world-record-status").textContent="Recording unavailable: "+(error?.message??"permission denied");
    }
  });
  $("#world-record-stop").addEventListener("click",stopRecording);
  $("#world-replay").addEventListener("click",()=>{
    if(clip)new Audio(clip).play().catch(()=>{$("#world-record-status").textContent="Replay failed.";});
  });
  $("#world-keep-reflection").addEventListener("click",()=>{
    state={...state,reflections:{...state.reflections,[state.world]:$("#world-reflection").value}};
    $("#world-record-status").textContent="Reflection retained in this tab only.";
  });
  render();
  return Object.freeze({stop,focus(){ $("#worlds-title").focus();},getState(){return state;}});
}
