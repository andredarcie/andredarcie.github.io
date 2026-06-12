import {state,input,refs} from './state.js';

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

// Tiro realista em camadas: estalo agudo do disparo, corpo do estouro,
// soco grave com queda de pitch e cauda de reverberação da rua, tudo passando
// por uma saturação (tanh) — arma de verdade "clipa" o ar, não soa limpa
let shotBus=null;
export function gunshot(vol=1){
  if(!AC)return;
  if(!shotBus){
    shotBus=AC.createGain();shotBus.gain.value=.7;
    const shaper=AC.createWaveShaper();
    const curve=new Float32Array(256);
    for(let i=0;i<256;i++){const x=i/127.5-1;curve[i]=Math.tanh(2.4*x);}
    shaper.curve=curve;
    shotBus.connect(shaper);shaper.connect(master);
    // eco curto rebatendo nos prédios
    const dl=AC.createDelay(.3);dl.delayTime.value=.09;
    const dlp=AC.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=1100;
    const fb=AC.createGain();fb.gain.value=.32;
    shaper.connect(dl);dl.connect(dlp);dlp.connect(fb);fb.connect(dl);
    const wet=AC.createGain();wet.gain.value=.22;
    fb.connect(wet);wet.connect(master);
  }
  const t0=AC.currentTime;
  const noise=(dur,type,freq,Q,v,decay)=>{
    const len=Math.floor(AC.sampleRate*dur);
    const b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=AC.createBufferSource();src.buffer=b;
    const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=Q;
    const g=AC.createGain();
    g.gain.setValueAtTime(v*vol,t0);
    g.gain.exponentialRampToValueAtTime(.0008,t0+decay);
    src.connect(f).connect(g).connect(shotBus);
    src.start(t0);src.stop(t0+dur);
  };
  noise(.07,'highpass',2400+Math.random()*700,.7,1.0,.05); // estalo
  noise(.16,'bandpass',520+Math.random()*140,.8,.9,.13);   // estouro
  noise(.5,'lowpass',900,.5,.26,.42);                      // cauda
  const o=AC.createOscillator();o.type='sine';             // soco grave
  o.frequency.setValueAtTime(150+Math.random()*25,t0);
  o.frequency.exponentialRampToValueAtTime(45,t0+.16);
  const og=AC.createGain();
  og.gain.setValueAtTime(.9*vol,t0);
  og.gain.exponentialRampToValueAtTime(.001,t0+.18);
  o.connect(og).connect(shotBus);o.start(t0);o.stop(t0+.2);
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
  if(hornG)hornG.gain.value=(state.mode==='car'&&input.horn)?.07:0;
  if(screechG)screechG.gain.value=
    (state.mode==='car'&&input.brake&&Math.abs(cur?.speed||0)>7)?.12:0;
  if(heliG){
    const heli=refs.getHeli?.();
    heliG.gain.value=heli?(Math.floor(state.time*13)%2?.07:.015):0;
  }
}
