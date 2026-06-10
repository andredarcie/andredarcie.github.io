import {N,ROAD,BLOCK,GROUND,BEACH,nodeX} from './constants.js';
import {state,refs} from './state.js';
import {isPark} from './world.js';

const $=id=>document.getElementById(id);
export const hudMoney=$('money'),hudSub=$('sub'),
  hudStars=[...document.querySelectorAll('#stars .s')],
  hudWanted=$('wantedtag'),hudSpeedo=$('speedo'),hudKmh=$('kmh'),
  hudCar=$('carname'),hudPrompt=$('prompt'),hudMsg=$('msg'),hudBig=$('bigtext');

let shownMoney=250,msgT=0;

export function message(t,col){
  hudMsg.textContent=t;hudMsg.style.color=col||'var(--cream)';
  hudMsg.style.opacity=1;msgT=2.6;
}
export function bigText(t,col){
  hudBig.textContent=t;hudBig.style.color=col;
  hudBig.style.textShadow=`4px 4px 0 #000,0 0 40px ${col}`;
  hudBig.classList.add('show');
}
export function hideBig(){hudBig.classList.remove('show');}

// Vice City-style radar: circular, rotates with the player (forward is always
// up), player arrow fixed at the center, square blips clamped to the rim
const mmCanvas=$('minimap');
export const mm=mmCanvas.getContext('2d');
const MMW=GROUND+BEACH*2;            // world span covered by the static map
const MM_C=85,MM_R=80,MM_RANGE=105;  // center px, radius px, radar reach in meters
const mmStatic=document.createElement('canvas');mmStatic.width=512;mmStatic.height=512;
{
  const x=mmStatic.getContext('2d'),s=512/MMW,M=v=>(v+MMW/2)*s;
  x.fillStyle='#d8c08a';x.fillRect(0,0,512,512);             // areia da praia
  x.fillStyle='#e8dcc4';                                      // ruas claras
  x.fillRect(M(-GROUND/2),M(-GROUND/2),GROUND*s,GROUND*s);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    x.fillStyle=isPark(i,j)?'#5d7c3e':'#8a6f4d';              // parque / quarteirão
    x.fillRect(M(nodeX(i)+ROAD/2),M(nodeX(j)+ROAD/2),BLOCK*s,BLOCK*s);
  }
}

// world offset → rotated radar screen offset, clamped to the rim
function mmBlip(wx,wz,pp,th,scale){
  const dx=(wx-pp.x)*scale,dz=(wz-pp.z)*scale;
  const c=Math.cos(th),s=Math.sin(th);
  let px=dx*c-dz*s,py=dx*s+dz*c;
  const d=Math.hypot(px,py),max=MM_R-8;
  if(d>max){px*=max/d;py*=max/d;}
  return[MM_C+px,MM_C+py];
}
function mmSquare(px,py,size,col){
  mm.fillStyle=col;mm.strokeStyle='rgba(0,0,0,.75)';mm.lineWidth=1.5;
  mm.fillRect(px-size/2,py-size/2,size,size);
  mm.strokeRect(px-size/2,py-size/2,size,size);
}

export function drawMinimap(){
  const pp=refs.playerPos?.();if(!pp)return;
  const cur=refs.getCur?.();
  const h=refs.getRadarHeading?.()??cur?.heading??refs.getPlayerHeading?.()??0;
  const th=h-Math.PI,scale=MM_R/MM_RANGE;

  mm.clearRect(0,0,170,170);
  mm.save();
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R,0,Math.PI*2);mm.clip();
  mm.fillStyle='#2e8a96';mm.fillRect(0,0,170,170);           // mar ao fundo

  mm.save();
  mm.translate(MM_C,MM_C);mm.rotate(th);mm.scale(scale,scale);
  mm.translate(-pp.x,-pp.z);
  mm.drawImage(mmStatic,-MMW/2,-MMW/2,MMW,MMW);
  mm.restore();

  // blips quadrados (não giram com o mapa, presos na borda quando longe)
  const cops=refs.cops||[];
  for(const c of cops){
    const[px,py]=mmBlip(c.g.position.x,c.g.position.z,pp,th,scale);
    mmSquare(px,py,6,'#3e7bff');
  }
  const delivery=refs.getDelivery?.();
  if(delivery){
    const[px,py]=mmBlip(delivery.x,delivery.z,pp,th,scale);
    mmSquare(px,py,8,'#ffd24a');
  }
  const DIEGO=refs.DIEGO;
  if(DIEGO&&DIEGO.state!=='done'){
    const blink=DIEGO.state==='returning'?Math.floor(state.time*4)%2===0:true;
    if(blink){
      const[px,py]=mmBlip(refs.DIEGO_X,refs.DIEGO_Z,pp,th,scale);
      mmSquare(px,py,9,DIEGO.state==='returning'?'#ff2e88':'#ffd24a');
      mm.fillStyle='#14091f';mm.font='bold 7px monospace';
      mm.textAlign='center';mm.textBaseline='middle';
      mm.fillText('D',px,py+.5);
    }
  }

  // seta do jogador fixa no centro, sempre apontando pra cima
  mm.fillStyle='#fff';mm.strokeStyle='#000';mm.lineWidth=1.4;
  mm.beginPath();
  mm.moveTo(MM_C,MM_C-7);mm.lineTo(MM_C-5,MM_C+5.5);
  mm.lineTo(MM_C,MM_C+2.8);mm.lineTo(MM_C+5,MM_C+5.5);
  mm.closePath();mm.fill();mm.stroke();
  mm.restore();

  // aro do radar
  mm.strokeStyle='rgba(5,3,8,.96)';mm.lineWidth=6;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-2,0,Math.PI*2);mm.stroke();
  mm.strokeStyle='#efa1d8';mm.lineWidth=3;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-4,0,Math.PI*2);mm.stroke();
  mm.strokeStyle='rgba(255,255,255,.42)';mm.lineWidth=1;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-5.8,0,Math.PI*2);mm.stroke();
}

export function updateHUD(dt){
  shownMoney+=(state.money-shownMoney)*Math.min(1,8*dt);
  if(Math.abs(shownMoney-state.money)<1)shownMoney=state.money;
  hudMoney.textContent='$'+Math.round(shownMoney);
  hudSub.textContent='DELIVERIES: '+state.deliveries;
  const w=Math.floor(state.wanted);
  hudStars.forEach((s,i)=>s.classList.toggle('on',i<w));
  hudWanted.style.visibility=w>0?'visible':'hidden';
  const cur=refs.getCur?.();
  if(state.mode==='car'&&cur)hudKmh.textContent=Math.abs(Math.round(cur.speed*3.6));
  if(msgT>0){msgT-=dt;if(msgT<=0)hudMsg.style.opacity=0;}
  const pp=refs.playerPos?.();
  const DIEGO=refs.DIEGO;
  const DIEGO_X=refs.DIEGO_X||0,DIEGO_Z=refs.DIEGO_Z||0;
  const _nearDiego=pp&&state.mode==='foot'&&!state.dlgActive
    &&DIEGO&&DIEGO.state!=='active'&&DIEGO.state!=='done'
    &&Math.hypot(pp.x-DIEGO_X,pp.z-DIEGO_Z)<3.5;
  const _nearDiegoReturn=pp&&state.mode==='foot'&&!state.dlgActive
    &&DIEGO&&DIEGO.state==='returning'
    &&Math.hypot(pp.x-DIEGO_X,pp.z-DIEGO_Z)<3.5;
  if(_nearDiego||_nearDiegoReturn){
    hudPrompt.innerHTML='<b>E</b> - TALK TO DIEGO PENHA';hudPrompt.style.display='block';
  }else if(refs.canPickWeapon?.()){
    hudPrompt.innerHTML='<b>E</b> - PICK UP WEAPON';hudPrompt.style.display='block';
  }else if(state.mode==='foot'&&refs.nearestCar?.(3.6)){
    hudPrompt.innerHTML='<b>E</b> - TAKE THE CAR';hudPrompt.style.display='block';
  }else hudPrompt.style.display='none';
}
