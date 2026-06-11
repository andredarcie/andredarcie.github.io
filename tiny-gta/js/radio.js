import {AC,master} from './audio.js';
import {state} from './state.js';

export const STATIONS=[
  {name:'BOOMBEAT RADIO 98.3', tag:'FUNK PARTY',        col:'#ff2e88', id:'batidao'},
  {name:'PAGODE RADIO 104.5',  tag:'PAGODE & SAMBA',    col:'#ffd24a', id:'pagode'},
  {name:'GROOVE FM',           tag:'BLACK MUSIC',        col:'#19e3ff', id:'groove'},
  {name:'COUNTRY ROOTS 107.1', tag:'COUNTRY ROOTS',      col:'#9dff2e', id:'sertao'},
  {name:'OFF AIR',             tag:'',                   col:'#666666', id:null},
];
export let stationIdx=0;
let radioActive=false,radioSched=null,radioGain=null,radioNodes=[];
let radioHudTimer=null;

function getAC(){return AC;}
function getMaster(){return master;}

export function radioInit(){
  const _AC=getAC(),_master=getMaster();
  if(!_AC||radioGain)return;
  radioGain=_AC.createGain();radioGain.gain.value=.3;radioGain.connect(_master);
}

export function radioOff(){
  clearTimeout(radioSched);radioActive=false;
  const _AC=getAC();
  const t=_AC?_AC.currentTime+.1:0;
  for(const n of radioNodes)try{n.stop(t);}catch(e){}
  radioNodes=[];
  _radioHudHide();
}

export function radioOn(){
  radioInit();radioOff();
  const st=STATIONS[stationIdx];
  if(!st.id){_radioHudShow();return;}
  radioActive=true;
  RADIO[st.id]();
  _radioHudShow();
}

// Entrou no carro: sorteia uma estação de música (nunca a OFF AIR)
export function radioRandom(){
  stationIdx=Math.floor(Math.random()*(STATIONS.length-1));
}

export function radioSwitch(){
  stationIdx=(stationIdx+1)%STATIONS.length;
  _radioStatic();
  if(state.mode==='car')radioOn();else _radioHudShow();
}

function _radioHudShow(){
  const st=STATIONS[stationIdx];
  const el=document.getElementById('radio-hud');
  document.getElementById('radio-name').textContent=st.name;
  document.getElementById('radio-name').style.color=st.col;
  document.getElementById('radio-tag').textContent=st.tag;
  el.classList.add('show');
  clearTimeout(radioHudTimer);
  radioHudTimer=setTimeout(()=>el.classList.remove('show'),3200);
}

function _radioHudHide(){
  clearTimeout(radioHudTimer);
  document.getElementById('radio-hud').classList.remove('show');
}

function _radioStatic(){
  const _AC=getAC(),_master=getMaster();
  if(!_AC)return;
  const len=Math.floor(_AC.sampleRate*.12),buf=_AC.createBuffer(1,len,_AC.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const s=_AC.createBufferSource();s.buffer=buf;
  const f=_AC.createBiquadFilter();f.type='bandpass';f.frequency.value=3200;f.Q.value=.6;
  const g=_AC.createGain();g.gain.value=.22;
  s.connect(f).connect(g).connect(_master);s.start();
}

// Synthesis helpers
function _rk(t,freq=52,vol=.9){
  const _AC=getAC();
  const o=_AC.createOscillator(),g=_AC.createGain();
  o.frequency.setValueAtTime(freq*3,t);
  o.frequency.exponentialRampToValueAtTime(freq,t+.07);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.32);
  o.connect(g).connect(radioGain);o.start(t);o.stop(t+.36);radioNodes.push(o);
}
function _rs(t,vol=.45){
  const _AC=getAC();
  const len=Math.floor(_AC.sampleRate*.13),buf=_AC.createBuffer(1,len,_AC.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.5);
  const s=_AC.createBufferSource();s.buffer=buf;
  const f=_AC.createBiquadFilter();f.type='bandpass';f.frequency.value=1600;f.Q.value=.75;
  const g=_AC.createGain();g.gain.value=vol;
  s.connect(f).connect(g).connect(radioGain);s.start(t);radioNodes.push(s);
}
function _rh(t,vol=.1,dur=.038){
  const _AC=getAC();
  const len=Math.floor(_AC.sampleRate*dur),buf=_AC.createBuffer(1,len,_AC.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const s=_AC.createBufferSource();s.buffer=buf;
  const f=_AC.createBiquadFilter();f.type='highpass';f.frequency.value=9000;
  const g=_AC.createGain();g.gain.value=vol;
  s.connect(f).connect(g).connect(radioGain);s.start(t);radioNodes.push(s);
}
function _rb(t,freq,dur,vol=.42){
  const _AC=getAC();
  const o=_AC.createOscillator();o.type='sawtooth';
  const f=_AC.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
  const g=_AC.createGain();o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(f).connect(g).connect(radioGain);o.start(t);o.stop(t+dur+.01);radioNodes.push(o);
}
function _rn(t,freq,dur,vol=.1,type='triangle'){
  const _AC=getAC();
  const o=_AC.createOscillator();o.type=type;o.frequency.value=freq;
  const g=_AC.createGain();
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(radioGain);o.start(t);o.stop(t+dur+.01);radioNodes.push(o);
}
function _rc(t,freqs,dur,vol=.07,type='triangle'){freqs.forEach(f=>_rn(t,f,dur,vol,type));}
function _rjit(ms=.005){return(Math.random()-.5)*ms;}

const RADIO={
  batidao(){
    const bpm=140,q=60/bpm,s=q/4,now=getAC().currentTime+.06,BARS=8,S=BARS*16;
    const roots=[110,87.3,130.8,98, 110,146.8,164.8,110];
    const bA=[1,0,0,1,0,1,0,0, 1,0,1,0,0,1,0,0];
    const bB=[1,0,1,0,0,0,1,0, 1,0,0,1,0,0,1,1];
    const kA=[1,0,0,1,0,0,1,0, 1,0,1,0,0,0,1,0];
    const kB=[1,0,0,0,1,0,1,0, 1,0,0,0,1,0,1,0];
    const mA=[220,0,0,196,0,0,220,0, 0,165,0,0,220,0,0,0];
    const mB=[330,0,294,0,0,330,0,0, 294,0,0,262,0,330,294,0];
    for(let i=0;i<S;i++){
      const bar=i>>4,step=i&15,t=now+i*s+_rjit(.004);
      const isB=bar>=4,root=roots[bar],isLast=bar===BARS-1;
      const isFill=isLast&&step>=12;
      _rh(t,step%2===0?.11:.07,(step===3||step===11)?.09:.034);
      if((isB?kB:kA)[step])_rk(t+_rjit(.003),50,step===0?1.0:.86);
      if(step===4||step===12)_rs(t+_rjit(.004),isFill?.65:.5);
      if(isFill&&step>12)_rs(t+s*.5+_rjit(.003),.28);
      if((isB?bB:bA)[step]){
        const freq=step<8?root:root*(step%4===0?1.333:1.125);
        _rb(t,freq,s*1.7,.46);
      }
      const mel=isB?mB:mA;
      if(mel[step%16]){
        const oct=bar%2===0?1:(isB?1.5:1.25);
        _rn(t,mel[step%16]*oct,q*.6,.08,'square');
      }
      if((bar===3||bar===7)&&step===14)_rn(t,110,q*.25,.1,'square');
    }
    if(radioActive)radioSched=setTimeout(()=>RADIO.batidao(),(S*s-.18)*1000);
  },

  pagode(){
    const bpm=95,q=60/bpm,s=q/4,now=getAC().currentTime+.06,BARS=8,S=BARS*16;
    const roots=[146.8,116.5,87.3,130.8, 146.8,110,98,110];
    const cavV=[
      [293.7,349.2,440,587.3],[233,293.7,349.2,466.2],[174.6,220,261.6,349.2],[130.8,164.8,196,261.6],
      [293.7,349.2,440,587.3],[110,138.6,165,220],[196,233,293.7,392],[110,138.6,165,220],
    ];
    const tamA=[1,0,0,1,1,0,1,0, 0,1,0,1,1,0,0,1];
    const tamB=[0,1,0,1,0,1,0,0, 1,0,0,1,0,1,1,0];
    const bassA=[1,0,1,0,0,0,1,0, 1,0,0,1,0,0,1,0];
    const bassB=[1,0,0,1,0,1,0,0, 1,0,1,0,0,0,1,1];
    for(let i=0;i<S;i++){
      const bar=i>>4,step=i&15,t=now+i*s+_rjit(.006);
      const isB=bar>=4,root=roots[bar],isLast=bar===BARS-1;
      const cv=cavV[bar];
      if((isB?tamB:tamA)[step])_rh(t,step%4===0?.14:.09,(isB?tamB:tamA)[step]&&step%4===0?.1:.05);
      if(step===0)_rk(t,62,.75);
      if(step===8&&bar%2===0)_rk(t,58,.6);
      if(step===10&&isB)_rk(t,55,.45);
      if(isLast&&step===14)_rk(t,60,.8);
      if(step===8)_rs(t,.38);
      if(isLast&&[12,14].includes(step))_rs(t,.28);
      if((isB?bassB:bassA)[step])_rb(t,root,s*2,.44);
      if(step===7||step===15)_rb(t,root*1.125,s*.7,.28);
      const cavBeats=isB?[2,5,10,13]:[2,6,10,14];
      if(cavBeats.includes(step))_rc(t,cv,s*.75,.076+(bar%2===0?.01:0),'triangle');
      if(isB&&(step===3||step===11))_rc(t,cv.map(f=>f*1.5),s*.35,.04,'triangle');
      if(bar===3&&step===12)_rn(t,cv[3],q*.3,.08,'triangle');
      if(bar===7&&step===12)_rn(t,cv[3]*2,q*.25,.07,'triangle');
    }
    if(radioActive)radioSched=setTimeout(()=>RADIO.pagode(),(S*s-.18)*1000);
  },

  groove(){
    const bpm=105,q=60/bpm,s=q/4,now=getAC().currentTime+.06,BARS=8,S=BARS*16;
    const roots=[110,87.3,130.8,98, 110,146.8,98,110];
    const chords=[
      [220,261.6,330,440],[174.6,220,261.6,349.2],[130.8,164.8,196,261.6],[98,123.5,146.8,196],
      [220,261.6,330,440],[146.8,174.6,220,293.7],[98,123.5,146.8,196],[220,261.6,330,440],
    ];
    const kA=[1,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0];
    const kB=[1,0,0,0,0,0,1,0, 1,0,0,0,0,0,1,0];
    const bassA=[1,0,0,1,0,1,0,0, 1,0,0,0,1,0,1,0];
    const bassB=[1,0,1,0,0,0,1,0, 0,1,0,0,1,0,0,1];
    const bassNotes=roots.map(r=>[r,r*1.125,r*1.25,r*1.5]);
    for(let i=0;i<S;i++){
      const bar=i>>4,step=i&15,t=now+i*s+_rjit(.005);
      const isB=bar>=4,root=roots[bar],isLast=bar===BARS-1;
      const ch=chords[bar],bn=bassNotes[bar];
      const swing=step%2===0?.003:-.001;
      _rh(t+swing,.09+(step%4===2?.03:0),(step%8===4)?.07:.034);
      if((isB?kB:kA)[step])_rk(t+_rjit(.003),55,step===0?1.0:.85);
      if(step===4||step===12)_rs(t+_rjit(.003),.46);
      if(step===6&&isB)_rs(t,.13);
      if(step===14)_rs(t,isLast?.58:.15);
      if(step===2&&bar%2===0)_rs(t,.11);
      if((isB?bassB:bassA)[step]){
        const ni=step<8?0:(step%4===2?2:1);
        _rb(t,bn[ni],step%8===7?s*.5:s*1.5,.44);
      }
      if((step===7||step===15)&&Math.random()<.5)_rb(t,root*1.06,s*.4,.28);
      if(!isB){
        if(step===2||step===10)_rc(t,ch,s*.8,.07,'sawtooth');
      }else{
        if(step===2||step===6||step===10)_rc(t,ch,s*.65,.08,'sawtooth');
        if(step===13)_rc(t,chords[(bar+1)%BARS],s*.4,.055,'sawtooth');
      }
      if(!isB){
        if(step===0)_rn(t,root*4,q*.6,.09,'sawtooth');
        if(bar%2===1&&step===8)_rn(t,root*5,q*.4,.07,'sawtooth');
      }else{
        if(step===0)_rn(t,root*4,q*.45,.09,'sawtooth');
        if(step===4)_rn(t,root*3.56,q*.3,.07,'sawtooth');
        if(step===8)_rn(t,root*3,q*.5,.09,'sawtooth');
        if(step===12&&bar%2===0)_rn(t,root*4.5,q*.25,.07,'sawtooth');
      }
    }
    if(radioActive)radioSched=setTimeout(()=>RADIO.groove(),(S*s-.18)*1000);
  },

  sertao(){
    const bpm=100,q=60/bpm,s=q/4,now=getAC().currentTime+.06,BARS=8,S=BARS*16;
    const roots=[98,146.8,164.8,130.8, 98,130.8,146.8,98];
    const phrases=[
      [392,0,330,0,392,0,440,330, 392,0,330,0,294,330,392,0],
      [523,0,494,0,440,0,523,494, 440,0,392,0,440,494,523,0],
      [392,330,294,0,330,0,294,0, 330,0,392,0,440,0,392,0],
      [440,0,392,0,330,0,294,330, 294,0,330,0,392,440,392,0],
    ];
    const bassA=[1,0,1,0,0,0,1,0, 1,0,1,0,0,0,1,0];
    const bassB=[1,0,0,1,0,0,1,0, 1,0,0,0,1,0,1,0];
    for(let i=0;i<S;i++){
      const bar=i>>4,step=i&15,t=now+i*s+_rjit(.005);
      const isB=bar>=4,root=roots[bar],isLast=bar===BARS-1;
      if(step%4===0)_rh(t,.11,.065);
      else if(step%4===2)_rh(t,.07,.04);
      else _rh(t,.04,.025);
      if(step===0)_rk(t,60,.72);
      if(step===8)_rk(t,56,.65);
      if(isB&&step===5)_rk(t,52,.45);
      if(isLast&&step===14)_rk(t,60,.85);
      if(step===4||step===12)_rs(t,.36);
      if(isLast&&step>=12&&step%2===0)_rs(t,.24);
      if((isB?bassB:bassA)[step])_rb(t,root,s*1.9,.38);
      if(step===7)_rb(t,root*1.125,s*.6,.25);
      if(step===15&&!isLast)_rb(t,roots[bar+1]*.75,s*.55,.22);
      const phraseIdx=Math.floor(bar/2)%4;
      const mel=phrases[phraseIdx];
      if(mel[step]){
        _rn(t,mel[step],q*.62,.09,'square');
        _rn(t,mel[step]*1.5,q*.55,.045,'square');
        if(Math.random()<.45)_rn(t+q*.11,mel[step],q*.4,.05,'square');
      }
      if(step===0||step===8)_rc(t,[root,root*1.25,root*1.5],q*.85,.065,'square');
      if((bar===3||bar===7)&&step===12)_rn(t,mel[0]||392,q*.2,.1,'square');
    }
    if(radioActive)radioSched=setTimeout(()=>RADIO.sertao(),(S*s-.18)*1000);
  },
};
