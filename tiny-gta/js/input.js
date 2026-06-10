import {state,keys,input} from './state.js';
import {initAudio,AC} from './audio.js';
import {radioSwitch} from './radio.js';
import {enterCar,exitCar,cur,player,cameraRig} from './player.js';
import {dlgPress,isNearDiego,performDiegoInteract} from './diego.js';
import {setMissionHUD} from './missions.js';
import {message} from './hud.js';
import {canPickWeapon,pickupWeapon,shootWeapon} from './weapons.js';

const gameCanvas=()=>document.getElementById('game');
const isBlocked=()=>state.paused||state.mode==='cut'||state.orientationBlocked||state.controlsLocked;

function lockPointer(){
  if(state.mobile||input.touchActive)return;
  gameCanvas()?.requestPointerLock?.();
}

function showPause(){
  document.getElementById('pauseov').style.display=state.paused?'flex':'none';
}

export function resetInput(keepTouch=false){
  input.moveX=0;input.moveY=0;input.lookX=0;input.lookY=0;
  input.run=false;input.brake=false;input.horn=false;input.shootHeld=false;
  input.moveActive=false;input.lookActive=false;input.brakeActive=false;input.hornActive=false;
  if(!keepTouch)input.touchActive=false;
}

export function updateKeyboardInput(){
  const f=(keys['KeyW']||keys['ArrowUp']?1:0)-(keys['KeyS']||keys['ArrowDown']?1:0);
  const side=(keys['KeyA']||keys['ArrowLeft']?1:0)-(keys['KeyD']||keys['ArrowRight']?1:0);
  const keyboardMoving=!!(f||side||keys['ShiftLeft']||keys['ShiftRight']);
  if(!input.moveActive||keyboardMoving){
    input.moveY=f;
    input.moveX=side;
    input.run=!!(keys['ShiftLeft']||keys['ShiftRight']);
    if(keyboardMoving)input.lastInput='keyboard';
  }
  if(!input.lookActive){
    input.lookX=0;
    input.lookY=0;
  }
  if(!input.brakeActive)input.brake=!!keys['Space'];
  if(!input.hornActive)input.horn=!!keys['KeyH'];
}

export function performShoot(){
  if(isBlocked()||state.dlgActive)return;
  shootWeapon();
}

export function performRadioSwitch(){
  if(isBlocked()||state.dlgActive)return;
  radioSwitch();
}

export function performPauseToggle(){
  if(!state.started||state.mode==='cut')return;
  state.paused=!state.paused;
  if(state.paused)resetInput(true);
  showPause();
}

export function performFullscreenToggle(){
  if(document.fullscreenElement){
    document.exitFullscreen?.();
    return;
  }
  const fs=document.documentElement.requestFullscreen?.();
  fs?.catch?.(()=>{});
}

export function performInteract(){
  if(!state.started)return;
  if(state.dlgActive){dlgPress();return;}
  if(isBlocked())return;
  if(state.mode==='foot'){
    if(canPickWeapon()){pickupWeapon();return;}
    if(isNearDiego()){performDiegoInteract();return;}
    enterCar();
  }else if(state.mode==='car'&&Math.abs(cur?.speed||0)<6){
    exitCar();
  }
}

export function startGameFromUserGesture(opts={}){
  if(state.started)return;
  const mobile=!!opts.mobile;
  if(mobile){
    state.mobile=true;
    input.touchActive=true;
    input.lastInput='touch';
    document.body.classList.add('is-mobile');
  }
  initAudio();AC?.resume?.();
  document.getElementById('title').style.display='none';
  document.getElementById('hud').style.display='block';
  state.started=true;
  cameraRig.yaw=player.heading;
  if(mobile){
    const fs=document.documentElement.requestFullscreen?.();
    fs?.catch?.(()=>{});
    const orient=screen.orientation?.lock?.('landscape');
    orient?.catch?.(()=>{});
  }else lockPointer();
  setMissionHUD();
  message(mobile?'TAKE THE PINK CAR':'TAKE THE PINK CAR - PRESS E','var(--gold)');
}

export function setupInput(){
  const canvas=gameCanvas();
  addEventListener('mousemove',e=>{
    if(document.pointerLockElement!==canvas||!state.started||state.paused||state.dlgActive)return;
    cameraRig.yaw-=e.movementX*cameraRig.sensitivity;
    cameraRig.pitch+=(cameraRig.invertY?-1:1)*e.movementY*cameraRig.sensitivity;
    cameraRig.pitch=Math.max(.18,Math.min(.82,cameraRig.pitch));
  });
  canvas?.addEventListener('click',()=>{
    if(state.mobile||input.touchActive)return;
    if(!state.started||state.dlgActive)return;
    if(document.pointerLockElement!==canvas)lockPointer();
    else performShoot();
  });

  addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))
      e.preventDefault();
    keys[e.code]=true;
    input.lastInput='keyboard';
    if(!state.started)return;
    if(state.dlgActive){
      if(e.code==='KeyE'||e.code==='Enter'||e.code==='Space')dlgPress();
      return;
    }
    if(e.code==='KeyP'){performPauseToggle();return;}
    if(e.code==='KeyF'&&e.shiftKey){performFullscreenToggle();return;}
    if(e.code==='Tab'){performRadioSwitch();return;}
    if(e.code==='KeyE'||e.code==='KeyF'){performInteract();return;}
  });

  addEventListener('keyup',e=>{keys[e.code]=false;});

  addEventListener('blur',()=>resetInput(true));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)resetInput(true);
  });

  const savedBest=JSON.parse(localStorage.getItem('tinygta_best')||'{"money":0,"deliveries":0}');
  if(savedBest.money>0||savedBest.deliveries>0)
    document.getElementById('best').textContent=
      `BEST: $${savedBest.money} ◆ ${savedBest.deliveries} DELIVERIES`;

  document.getElementById('title').addEventListener('click',()=>{
    startGameFromUserGesture({mobile:state.mobile||matchMedia('(pointer: coarse)').matches});
  });
  document.getElementById('btn-fullscreen')?.addEventListener('pointerdown',e=>{
    e.preventDefault();
    e.stopPropagation();
    performFullscreenToggle();
  });
}
