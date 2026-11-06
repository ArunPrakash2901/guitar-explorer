import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs";
import { positionFromKey } from "./musical-worlds-material.mjs";

// One native Web Audio clock for all arranged voices. Guitar notes use the
// project's verified CC0 attacks; synthesized bass/percussion are distinct
// original accompaniment, never a substitute for a missing guitar sample.
export function createWorldAudio({ queries, toSemitone,
  AudioContextCtor=globalThis.AudioContext??globalThis.webkitAudioContext,
  fetchAsset=globalThis.fetch?.bind(globalThis) }={}) {
  const manifest=new Map(STEEL_SAMPLES.map(s=>[s.stringIndex+":"+s.fret,s]));
  const cache=new Map();
  let context=null,noise=null,generation=0;
  let voices=[];
  const ready=async()=>{
    if(typeof AudioContextCtor!=="function")throw new Error("Web Audio is unavailable");
    context??=new AudioContextCtor();
    if(context.state==="suspended")await context.resume();
    return context;
  };
  const pitch=(key,octaveShift=0)=>{
    const r=queries.getNoteAtFret({position:positionFromKey(key)});
    if(!r.ok)throw new Error(r.error.message);
    return 440*Math.pow(2,(toSemitone(r.data.pitch)-69+octaveShift*12)/12);
  };
  async function sample(key) {
    const entry=manifest.get(key);
    if(!entry)throw new RangeError("No recorded acoustic guitar for "+key);
    if(!cache.has(key)){
      const load=(async()=>{
        if(typeof fetchAsset!=="function")throw new Error("Recording fetch unavailable");
        const response=await fetchAsset(new URL("./samples/steel/"+entry.file,import.meta.url));
        if(!response.ok)throw new Error("Recorded guitar could not load");
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength!==entry.bytes)throw new Error("Recorded guitar provenance size mismatch");
        return (await ready()).decodeAudioData(bytes);
      })().catch(e=>{cache.delete(key);throw e});
      cache.set(key,load);
    }
    return cache.get(key);
  }
  function track(source){voices.push(source);source.onended=()=>{voices=voices.filter(v=>v!==source);try{source.disconnect()}catch{}}}
  function envelope(gain,t,duration,peak){
    gain.gain.setValueAtTime(0,t);
    gain.gain.linearRampToValueAtTime(peak,t+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  }
  function noiseBuffer() {
    if(noise)return noise;
    noise=context.createBuffer(1,Math.floor(context.sampleRate*.32),context.sampleRate);
    const data=noise.getChannelData(0);let x=429496729;
    for(let i=0;i<data.length;i++){x=(1664525*x+1013904223)>>>0;data[i]=x/2147483648-1;}
    return noise;
  }
  function drum(e,t){
    const duration=e.instrument==="hat"?.1:.24;
    const gain=context.createGain();
    const level=e.velocity??.2;
    gain.connect(context.destination);
    envelope(gain,t,duration,level);
    if(e.instrument==="kick"){
      const osc=context.createOscillator();osc.type="sine";
      osc.frequency.setValueAtTime(130,t);osc.frequency.exponentialRampToValueAtTime(48,t+duration);
      osc.connect(gain);osc.start(t);osc.stop(t+duration);track(osc);
    }else{
      const src=context.createBufferSource();src.buffer=noiseBuffer();
      const filter=context.createBiquadFilter();filter.type="highpass";
      filter.frequency.value=e.instrument==="hat"?5800:950;
      src.connect(filter);filter.connect(gain);src.start(t);src.stop(t+duration);track(src);
    }
  }
  function bass(e,t,secondsPerStep){
    const gain=context.createGain();gain.connect(context.destination);
    const dur=Math.max(.07,(e.duration??2)*secondsPerStep);
    envelope(gain,t,dur,e.velocity??.33);
    const osc=context.createOscillator();osc.type="triangle";osc.frequency.value=pitch(e.note,-1);
    osc.connect(gain);osc.start(t);osc.stop(t+dur);track(osc);
  }
  function muted(e,t) {
    const src=context.createBufferSource();src.buffer=noiseBuffer();
    const filt=context.createBiquadFilter();filt.type="highpass";filt.frequency.value=2500;
    const gain=context.createGain();gain.gain.setValueAtTime(.12,t);
    gain.gain.exponentialRampToValueAtTime(.0001,t+.055);
    src.connect(filt);filt.connect(gain);gain.connect(context.destination);
    src.start(t);src.stop(t+.06);track(src);
  }
  function guitar(e,t,stepSeconds,buffers){
    const src=context.createBufferSource();src.buffer=buffers.get(e.note);
    const gain=context.createGain();gain.connect(context.destination);
    const dur=Math.min(src.buffer.duration,Math.max(.12,(e.duration??2)*stepSeconds+.25));
    envelope(gain,t,dur,e.velocity??.48);
    src.connect(gain);src.start(t);src.stop(t+dur);track(src);
  }
  function stop(){
    generation+=1;
    const active=voices;voices=[];
    for(const src of active){try{src.stop()}catch{}try{src.disconnect()}catch{}}
  }
  async function play(score){
    if(!score||!Number.isFinite(score.tempo)||score.tempo<40||score.tempo>220||
       !Number.isInteger(score.bars)||score.bars<1||score.bars>16||!Array.isArray(score.events))throw new TypeError("Invalid authored score");
    const ticket=++generation;
    await ready();
    const keys=[...new Set(score.events.filter(e=>e.instrument==="guitar").map(e=>e.note))];
    const buffers=new Map(await Promise.all(keys.map(async key=>[key,await sample(key)])));
    if(ticket!==generation)return {cancelled:true};
    for(const src of voices){try{src.stop()}catch{}try{src.disconnect()}catch{}}
    voices=[];
    const secondsPerStep=60/score.tempo/4;
    const origin=context.currentTime+.08;
    for(const e of score.events) {
      if(!Number.isInteger(e.step)||e.step<0||e.step>=score.bars*16)throw new RangeError("Score step is out of range");
      const t=origin+(e.step+(e.offsetSteps??0))*secondsPerStep;
      const at=Math.max(context.currentTime+.01,t);
      if(["kick","snare","hat"].includes(e.instrument))drum(e,at);
      else if(e.instrument==="bass")bass(e,at,secondsPerStep);
      else if(e.instrument==="mute")muted(e,at);
      else if(e.instrument==="guitar")guitar(e,at,secondsPerStep,buffers);
      else throw new RangeError("Unknown score instrument");
    }
    return {cancelled:false,durationSeconds:score.bars*16*secondsPerStep,eventCount:score.events.length};
  }
  return Object.freeze({play,stop});
}
