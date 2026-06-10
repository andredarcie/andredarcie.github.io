import {state,keys,refs} from './state.js';

export let AC=null,audioEngine=null,siren=null,hornG=null,master=null,screechG=null,heliG=null;

export function initAudio(){
  if(AC)return;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=.5;master.connect(AC.destination);
  const o=AC.createOscillator();o.type='sawtooth';
  const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=620;
  const g=AC.createGain();g.gain.value=0;
  o.connect(f);f.connect(g);g.connect(master);o.start();audioEngine={o,g};
  const s=AC.createOscillator();s.type='triangle';
  const sg=AC.createGain();sg.gain.value=0;
  s.connect(sg);sg.connect(master);s.start();siren={o:s,g:sg};
  hornG=AC.createGain();hornG.gain.value=0;hornG.connect(master);
  for(const fr of[392,494]){
    const h=AC.createOscillator();h.type='square';h.frequency.value=fr;
    const hg=AC.createGain();hg.gain.value=.5;h.connect(hg);hg.connect(hornG);h.start();
  }
  const nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  const nd=nb.getChannelData(0);
  for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const ns=AC.createBufferSource();ns.buffer=nb;ns.loop=true;
  const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=950;bp.Q.value=1.2;
  screechG=AC.createGain();screechG.gain.value=0;
  ns.connect(bp);bp.connect(screechG);screechG.connect(master);
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=170;
  heliG=AC.createGain();heliG.gain.value=0;
  ns.connect(lp);lp.connect(heliG);heliG.connect(master);
  ns.start();
}

export function thud(v){
  if(!AC)return;
  const len=Math.floor(AC.sampleRate*.14);
  const b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
  const src=AC.createBufferSource();src.buffer=b;
  const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=260+v*30;
  const g=AC.createGain();
  const clampVal=(x,a,b)=>Math.max(a,Math.min(b,x));
  g.gain.value=clampVal(.15+v*.04,.15,.8);
  src.connect(f).connect(g).connect(master);src.start();
}

export function blip(freqs,dur=.09,type='sine',vol=.18){
  if(!AC)return;
  freqs.forEach((fr,k)=>{
    const o=AC.createOscillator();o.type=type;o.frequency.value=fr;
    const g=AC.createGain();g.gain.value=0;
    o.connect(g).connect(master);
    const t0=AC.currentTime+k*dur;
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.015);
    g.gain.exponentialRampToValueAtTime(.001,t0+dur);
    o.start(t0);o.stop(t0+dur+.02);
  });
}

export function updateAudio(){
  if(!AC)return;
  const cur=refs.getCur?.();
  if(audioEngine){
    const sp=state.mode==='car'?Math.abs(cur?.speed||0):0;
    audioEngine.o.frequency.value=52+sp*6.5;
    audioEngine.g.gain.value=state.mode==='car'?.028+sp/32*.035:0;
  }
  if(siren){
    siren.o.frequency.value=Math.floor(state.time*2.4)%2?640:860;
    const cops=refs.cops||[];
    const tgt=cops.length?.045:0;
    siren.g.gain.value+=(tgt-siren.g.gain.value)*.1;
  }
  if(hornG)hornG.gain.value=(state.mode==='car'&&keys['KeyH'])?.07:0;
  if(screechG)screechG.gain.value=
    (state.mode==='car'&&keys['Space']&&Math.abs(cur?.speed||0)>7)?.12:0;
  if(heliG){
    const heli=refs.getHeli?.();
    heliG.gain.value=heli?(Math.floor(state.time*13)%2?.07:.015):0;
  }
}
