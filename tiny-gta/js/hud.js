import {N,ROAD,BLOCK,GROUND,BEACH,nodeX,
  RURAL_X0,RURAL_X1,RURAL_HALF,MOUNT_X,MOUNT_R} from './constants.js';
import {state,input,refs} from './state.js';
import {isPark} from './world.js';
import {getTod} from './daynight.js';

const $=id=>document.getElementById(id);
export const hudMoney=$('money'),hudClock=$('clock'),hudHealth=$('health-val'),
  hudStars=[...document.querySelectorAll('#stars .s')],
  hudCar=$('carname'),hudPrompt=$('prompt'),hudMsg=$('msg'),hudBig=$('bigtext'),
  wiconFist=$('wicon-fist'),wiconPistol=$('wicon-pistol'),hudWeaponAmmo=$('weapon-ammo'),
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
  if(state.cine||state.dlgActive)return{label:'...',prompt:'',enabled:false}; // cut-scene: sem ações
  if(state.paused||state.mode==='cut'||state.orientationBlocked)return{label:'...',prompt:'',enabled:false};
  if(refs.canPickWeapon?.())return{label:'PICK',prompt:'PICK UP WEAPON',enabled:true};
  if(state.mode==='foot'){
    const sn=refs.storyNear?.();
    if(sn)return{label:'TALK',prompt:'TALK TO '+sn,enabled:true};
  }
  if(state.mode==='foot'&&refs.nearestCar?.(3.6))return{label:'CAR',prompt:'TAKE THE CAR',enabled:true};
  if(state.mode==='car'){
    const speed=Math.abs(refs.getCur?.()?.speed||0);
    return speed<6
      ?{label:'EXIT',prompt:'EXIT THE CAR',enabled:true}
      :{label:'...',prompt:'',enabled:false};
  }
  return{label:'...',prompt:'',enabled:false};
}

// Vice City-style radar: circular, fixed north-up, player arrow rotating at
// the center, square blips clamped to the rim
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

// mapa estático da zona rural + montanha (a península fica fora do canvas da cidade)
const RRW=RURAL_X1-RURAL_X0,RRD=RURAL_HALF*2;
const mmRural=document.createElement('canvas');mmRural.width=260;mmRural.height=240;
{
  const x=mmRural.getContext('2d'),sx=260/RRW,sz=240/RRD;
  const U=v=>(v-RURAL_X0)*sx,W=v=>(v+RURAL_HALF)*sz;
  x.fillStyle='#6a9a50';x.fillRect(0,0,260,240);                // pasto
  x.fillStyle='#8a6a3e';                                        // roças
  for(const[a,b,d,e]of[[202,250,14,62],[200,244,-64,-22],[262,310,30,86],[258,300,-90,-42]])
    x.fillRect(U(a),W(d),(b-a)*sx,(e-d)*sz);
  x.fillStyle='#b08a5e';                                        // estrada de terra
  x.fillRect(U(RURAL_X0),W(-3.4),(MOUNT_X-MOUNT_R+16-RURAL_X0)*sx,6.8*sz);
  // montanha em níveis de elevação
  for(const[r,col]of[[MOUNT_R,'#8d8f99'],[MOUNT_R*.62,'#a9adb8'],[MOUNT_R*.28,'#c9ccd4']]){
    x.fillStyle=col;x.beginPath();
    x.ellipse(U(MOUNT_X),W(0),r*sx,r*sz,0,0,Math.PI*2);x.fill();
  }
}

// world offset → radar screen offset (north-up), clamped to the rim
function mmBlip(wx,wz,pp,scale){
  let px=(wx-pp.x)*scale,py=(wz-pp.z)*scale;
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
  // a seta segue para onde o jogador/veículo está virado, não a câmera
  const h=refs.getPlayerHeading?.()??cur?.heading??0;
  const th=h-Math.PI,scale=MM_R/MM_RANGE;

  mm.clearRect(0,0,170,170);
  mm.save();
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R,0,Math.PI*2);mm.clip();
  mm.fillStyle='#2e8a96';mm.fillRect(0,0,170,170);           // mar ao fundo

  mm.save();
  mm.translate(MM_C,MM_C);mm.scale(scale,scale);
  mm.translate(-pp.x,-pp.z);
  mm.drawImage(mmStatic,-MMW/2,-MMW/2,MMW,MMW);
  mm.drawImage(mmRural,RURAL_X0,-RURAL_HALF,RRW,RRD);
  // territórios das gangues (círculos coloridos que encolhem conforme você mata)
  const gangsArr=refs.gangs;
  if(gangsArr)for(const g of gangsArr){
    mm.fillStyle=g.cssA;
    mm.beginPath();mm.arc(g.x,g.z,g.r,0,Math.PI*2);mm.fill();
    mm.strokeStyle=g.css;mm.lineWidth=2/scale;mm.stroke();
  }
  mm.restore();

  // blips quadrados (presos na borda quando longe)
  const cops=refs.cops||[];
  for(const c of cops){
    const[px,py]=mmBlip(c.g.position.x,c.g.position.z,pp,scale);
    mmSquare(px,py,6,'#3e7bff');
  }
  const delivery=refs.getDelivery?.();
  if(delivery){
    const[px,py]=mmBlip(delivery.x,delivery.z,pp,scale);
    mmSquare(px,py,8,'#ffd24a');
  }
  // Missão da história: blip no NPC atual (letra) ou no item quando ativa;
  // o piscar de retorno já vem resolvido de storyBlips()
  for(const b of refs.storyBlips?.()||[]){
    const[px,py]=mmBlip(b.x,b.z,pp,scale);
    if(b.letter){
      mmSquare(px,py,9,b.col);
      mm.fillStyle='#14091f';mm.font='bold 7px monospace';
      mm.textAlign='center';mm.textBaseline='middle';
      mm.fillText(b.letter,px,py+.5);
    }else mmSquare(px,py,8,b.col);
  }

  // seta do jogador no centro, girando com a direção (mapa fixo no norte)
  mm.save();
  mm.translate(MM_C,MM_C);mm.rotate(-th);
  mm.fillStyle='#fff';mm.strokeStyle='#000';mm.lineWidth=1.4;
  mm.beginPath();
  mm.moveTo(0,-7);mm.lineTo(-5,5.5);mm.lineTo(0,2.8);mm.lineTo(5,5.5);
  mm.closePath();mm.fill();mm.stroke();
  mm.restore();
  mm.restore();

  // aro do radar
  mm.strokeStyle='rgba(5,3,8,.96)';mm.lineWidth=6;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-2,0,Math.PI*2);mm.stroke();
  mm.strokeStyle='#efa1d8';mm.lineWidth=3;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-4,0,Math.PI*2);mm.stroke();
  mm.strokeStyle='rgba(255,255,255,.42)';mm.lineWidth=1;
  mm.beginPath();mm.arc(MM_C,MM_C,MM_R-5.8,0,Math.PI*2);mm.stroke();

  // marcador de norte no topo do aro
  const ny=MM_C-MM_R+2;
  mm.fillStyle='#08050a';
  mm.beginPath();mm.arc(MM_C,ny,7,0,Math.PI*2);mm.fill();
  mm.strokeStyle='#fff';mm.lineWidth=1.4;mm.stroke();
  mm.fillStyle='#fff';mm.font='bold 9px monospace';
  mm.textAlign='center';mm.textBaseline='middle';
  mm.fillText('N',MM_C,ny+.5);
}

export function updateHUD(dt){
  shownMoney+=(state.money-shownMoney)*Math.min(1,8*dt);
  if(Math.abs(shownMoney-state.money)<1)shownMoney=state.money;
  hudMoney.textContent='$'+String(Math.max(0,Math.round(shownMoney))).padStart(8,'0');
  const min=Math.floor(getTod()*1440);              // relógio segue o ciclo de dia/noite
  hudClock.textContent=String(Math.floor(min/60)).padStart(2,'0')
    +':'+String(min%60).padStart(2,'0');
  hudHealth.textContent=Math.max(0,Math.round(state.health));
  const w=Math.floor(state.wanted);
  hudStars.forEach((s,i)=>s.classList.toggle('on',i<w));
  if(state.hasGun){
    const ammo=state.ammo||0,max=state.maxAmmo||0;
    wiconFist.style.display='none';wiconPistol.style.display='block';
    hudWeaponAmmo.style.display='block';
    hudAmmoNow.textContent=ammo;
    hudAmmoMax.textContent='/'+max;
    hudWeaponAmmo.classList.toggle('low',ammo<=Math.max(6,Math.ceil(max*.15)));
  }else{
    wiconFist.style.display='block';wiconPistol.style.display='none';
    hudWeaponAmmo.style.display='none';
  }
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
