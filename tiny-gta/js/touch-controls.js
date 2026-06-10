import {state,input,refs} from './state.js';
import {
  startGameFromUserGesture,performInteract,performPauseToggle,
  performRadioSwitch,performShoot,resetInput
} from './input.js';
import {getInteractAction} from './hud.js';

const DEAD=.12,CURVE=1.35,YAW_SPEED=2.4,PITCH_SPEED=1.35;

const $=id=>document.getElementById(id);

function isMobileLike(){
  return matchMedia('(pointer: coarse)').matches||innerWidth<900;
}

function isPortrait(){
  return innerHeight>innerWidth;
}

function stop(e){
  e.preventDefault();
  e.stopPropagation();
}

function norm(dx,dy,radius){
  const x=Math.max(-1,Math.min(1,dx/radius));
  const y=Math.max(-1,Math.min(1,dy/radius));
  const len=Math.hypot(x,y);
  if(len<DEAD)return{x:0,y:0,active:false};
  const amt=Math.min(1,(len-DEAD)/(1-DEAD));
  const curved=Math.pow(amt,CURVE);
  return{x:x/len*curved,y:y/len*curved,active:true};
}

function bindStick(el,onMove,onEnd){
  const knob=el?.querySelector('.stick-knob');
  let pointer=null,rect=null,radius=58;
  const move=e=>{
    if(e.pointerId!==pointer)return;
    stop(e);
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const dx=e.clientX-cx,dy=e.clientY-cy;
    radius=rect.width*.5;
    const dist=Math.hypot(dx,dy);
    const k=dist>radius?radius/dist:1;
    knob.style.transform=`translate(${dx*k}px,${dy*k}px)`;
    onMove(norm(dx,dy,radius));
  };
  el?.addEventListener('pointerdown',e=>{
    stop(e);
    pointer=e.pointerId;
    rect=el.getBoundingClientRect();
    el.setPointerCapture?.(pointer);
    el.classList.add('active');
    move(e);
  });
  const end=e=>{
    if(pointer===null||e.pointerId!==pointer)return;
    stop(e);
    const id=pointer;
    el.releasePointerCapture?.(id);
    pointer=null;
    knob.style.transform='';
    el.classList.remove('active');
    onEnd();
  };
  el?.addEventListener('pointermove',move);
  el?.addEventListener('pointerup',end);
  el?.addEventListener('pointercancel',end);
}

function bindButton(el,onDown,onUp){
  let pointer=null;
  el?.addEventListener('pointerdown',e=>{
    stop(e);
    pointer=e.pointerId;
    el.setPointerCapture?.(pointer);
    el.classList.add('active');
    onDown?.();
  });
  const end=e=>{
    if(pointer===null||e.pointerId!==pointer)return;
    stop(e);
    const id=pointer;
    el.releasePointerCapture?.(id);
    pointer=null;
    el.classList.remove('active');
    onUp?.();
  };
  el?.addEventListener('pointerup',end);
  el?.addEventListener('pointercancel',end);
}

function updateOrientationState(){
  state.orientationBlocked=state.mobile&&isPortrait();
  document.body.classList.toggle('is-portrait-blocked',state.orientationBlocked);
  if(state.orientationBlocked)resetInput(true);
}

export function updateTouchControls(){
  if(!state.mobile)return;
  updateOrientationState();
  const root=$('touch-controls');
  if(root)root.setAttribute('aria-hidden',state.started?'false':'true');
  const action=getInteractAction();
  const interact=$('btn-interact');
  if(interact){
    interact.textContent=action.label;
    interact.disabled=!action.enabled;
    interact.classList.toggle('disabled',!action.enabled);
  }
  const armed=state.started&&refs.isWeaponHeld?.()&&!state.dlgActive&&!state.paused&&!state.orientationBlocked;
  const driving=state.started&&state.mode==='car'&&!state.dlgActive&&!state.paused;
  $('btn-shoot')?.classList.toggle('show',armed);
  $('btn-brake')?.classList.toggle('show',driving);
  $('btn-radio')?.classList.toggle('show',driving);
  $('touch-controls')?.classList.toggle('in-dialog',state.dlgActive);
}

export function setupTouchControls(){
  state.mobile=isMobileLike();
  document.body.classList.toggle('is-mobile',state.mobile);
  if(!state.mobile)return;
  input.touchActive=true;
  input.lastInput='touch';
  const controls=$('controls');
  if(controls)controls.innerHTML=
    '<span><b>LEFT STICK</b></span><span>drive / walk</span>'+
    '<span><b>RIGHT STICK</b></span><span>camera / aim</span>'+
    '<span><b>FIRE</b></span><span>shoot weapon</span>'+
    '<span><b>ACTION</b></span><span>interact / enter car</span>'+
    '<span><b>BRAKE</b></span><span>handbrake in car</span>';
  const play=$('play');
  if(play)play.textContent='TAP TO PLAY';
  updateOrientationState();

  bindStick($('stick-move'),v=>{
    if(state.orientationBlocked||state.paused||state.dlgActive||state.mode==='cut')return;
    input.moveActive=v.active;
    input.moveX=v.x;
    input.moveY=-v.y;
    input.run=Math.hypot(v.x,v.y)>.88;
    input.lastInput='touch';
  },()=>{
    input.moveActive=false;
    input.moveX=0;input.moveY=0;input.run=false;
  });

  bindStick($('stick-look'),v=>{
    if(state.orientationBlocked||state.paused||state.dlgActive||state.mode==='cut')return;
    input.lookActive=v.active;
    input.lookX=v.x*YAW_SPEED;
    input.lookY=-v.y*PITCH_SPEED;
    input.lastInput='touch';
  },()=>{
    input.lookActive=false;
    input.lookX=0;input.lookY=0;
  });

  bindButton($('btn-interact'),()=>performInteract());
  bindButton($('btn-shoot'),()=>{
    input.shootHeld=true;
    performShoot();
  },()=>{input.shootHeld=false;});
  bindButton($('btn-brake'),()=>{
    input.brake=true;
    input.brakeActive=true;
  },()=>{
    input.brake=false;
    input.brakeActive=false;
  });
  bindButton($('btn-radio'),()=>performRadioSwitch());
  bindButton($('btn-pause'),()=>performPauseToggle());

  addEventListener('resize',updateOrientationState);
  addEventListener('orientationchange',updateOrientationState);
  window.visualViewport?.addEventListener?.('resize',updateOrientationState);
  addEventListener('blur',()=>resetInput(true));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)resetInput(true);
  });

  $('title')?.addEventListener('pointerdown',()=>{
    if(!state.started)startGameFromUserGesture({mobile:true});
  },{capture:true});
}
