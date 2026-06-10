import {state,keys} from './state.js';
import {initAudio,AC} from './audio.js';
import {radioSwitch} from './radio.js';
import {enterCar,exitCar,cur,player} from './player.js';
import {dlgPress,DIEGO_X,DIEGO_Z,DIEGO} from './diego.js';
import {setMissionHUD} from './missions.js';
import {message} from './hud.js';

export function setupInput(){
  addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))
      e.preventDefault();
    keys[e.code]=true;
    if(!state.started)return;
    if(state.dlgActive){
      if(e.code==='KeyE'||e.code==='Enter'||e.code==='Space')dlgPress();
      return;
    }
    if(e.code==='KeyP'){
      state.paused=!state.paused;
      document.getElementById('pauseov').style.display=state.paused?'flex':'none';
    }
    if(e.code==='Tab'){radioSwitch();return;}
    if(state.paused||state.mode==='cut')return;
    if(e.code==='KeyE'||e.code==='KeyF'){
      if(state.mode==='foot'){
        const nearD=Math.hypot(player.g.position.x-DIEGO_X,player.g.position.z-DIEGO_Z)<3.5;
        if(nearD&&DIEGO.state!=='active'){}else enterCar();
      }else if(state.mode==='car'&&Math.abs(cur?.speed||0)<6){
        exitCar();
      }
    }
  });

  addEventListener('keyup',e=>keys[e.code]=false);

  const savedBest=JSON.parse(localStorage.getItem('tinygta_best')||'{"money":0,"deliveries":0}');
  if(savedBest.money>0||savedBest.deliveries>0)
    document.getElementById('best').textContent=
      `BEST: $${savedBest.money} ◆ ${savedBest.deliveries} DELIVERIES`;

  document.getElementById('title').addEventListener('click',()=>{
    initAudio();AC?.resume?.();
    document.getElementById('title').style.display='none';
    document.getElementById('hud').style.display='block';
    state.started=true;
    setMissionHUD();
    message('TAKE THE PINK CAR - PRESS E','var(--gold)');
  });
}
