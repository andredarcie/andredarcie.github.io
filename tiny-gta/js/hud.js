import {N,ROAD,BLOCK,GROUND,BEACH,nodeX} from './constants.js';
import {state,input,refs} from './state.js';
import {isPark} from './world.js';

const $=id=>document.getElementById(id);
export const hudMoney=$('money'),hudSub=$('sub'),
  hudStars=[...document.querySelectorAll('#stars .s')],
  hudWanted=$('wantedtag'),hudSpeedo=$('speedo'),hudKmh=$('kmh'),
  hudCar=$('carname'),hudPrompt=$('prompt'),hudMsg=$('msg'),hudBig=$('bigtext'),
  hudWeapon=$('weaponhud'),hudWeaponAmmo=$('weapon-ammo'),
  hudAmmoNow=$('ammo-now'),hudAmmoMax=$('ammo-max'),hudCrosshair=$('crosshair');

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

export function getInteractAction(){
  if(state.dlgActive)return{label:'OK',prompt:'CONTINUE',enabled:true};
  if(state.paused||state.mode==='cut'||state.orientationBlocked)return{label:'...',prompt:'',enabled:false};
  if(refs.canPickWeapon?.())return{label:'PICK',prompt:'PICK UP WEAPON',enabled:true};
  if(state.mode==='foot'&&refs.isNearDiego?.())return{label:'TALK',prompt:'TALK TO DIEGO PENHA',enabled:true};
  if(state.mode==='foot'&&refs.nearestCar?.(3.6))return{label:'CAR',prompt:'TAKE THE CAR',enabled:true};
  if(state.mode==='car'){
    const speed=Math.abs(refs.getCur?.()?.speed||0);
    return speed<6
      ?{label:'EXIT',prompt:'EXIT THE CAR',enabled:true}
      :{label:'...',prompt:'',enabled:false};
  }
  return{label:'...',prompt:'',enabled:false};
}

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
  if(state.hasGun){
    const ammo=state.ammo||0,max=state.maxAmmo||0;
    hudWeapon.style.display='block';
    hudAmmoNow.textContent=ammo;
    hudAmmoMax.textContent='/'+max;
    hudWeaponAmmo.classList.toggle('low',ammo<=Math.max(6,Math.ceil(max*.15)));
  }else hudWeapon.style.display='none';
  const aiming=state.started&&refs.isWeaponHeld?.()&&!state.paused&&!state.dlgActive&&!state.orientationBlocked;
  hudCrosshair.classList.toggle('show',aiming);
  hudCrosshair.classList.toggle('target',aiming&&state.crosshairTarget);
  hudCrosshair.classList.toggle('shoot',state.crosshairKick>.01);
  if(state.crosshairKick>0)state.crosshairKick=Math.max(0,state.crosshairKick-dt*7);
  if(msgT>0){msgT-=dt;if(msgT<=0)hudMsg.style.opacity=0;}
  const action=getInteractAction();
  if(action.enabled&&!input.touchActive){
    hudPrompt.innerHTML=`<b>E</b> - ${action.prompt}`;hudPrompt.style.display='block';
  }else hudPrompt.style.display='none';
}
