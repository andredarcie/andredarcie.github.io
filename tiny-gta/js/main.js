import * as THREE from 'three';
import {state,input,refs} from './state.js';
import {renderer,scene,camera,clouds,dlight,sunDir} from './engine.js';
import {updateAudio} from './audio.js';
import {drawMinimap,updateHUD,hideBig} from './hud.js';
import {player,cur,playerPos,nearestCar,idleCars,cameraRig,updateCar,updateFoot,updateCamera,getBusted,getWasted} from './player.js';
import {traffic,trafficPos,spawnTraffic,updateTraffic} from './traffic.js';
import {updatePeds} from './pedestrians.js';
import {updateBeach} from './world.js';
import {cops,heli,updateCops,updateHeli} from './police.js';
import {delivery,spawnDelivery,updatePickups} from './missions.js';
import {DIEGO,DIEGO_X,DIEGO_Z,updateDiego,isNearDiego} from './diego.js';
import {blinkBar} from './entities.js';
import {setupInput,updateKeyboardInput,performShoot} from './input.js';
import {setupTouchControls,updateTouchControls} from './touch-controls.js';
import {canPickWeapon,updateWeapons,isWeaponHeld} from './weapons.js';

// Populate late-binding refs so cross-module code can access these without circular imports
refs.playerPos=playerPos;
refs.getCur=()=>cur;
refs.getPlayerHeading=()=>state.mode==='car'?cur?.heading:player.heading;
refs.getRadarHeading=()=>cameraRig.yaw;
refs.traffic=traffic;
refs.cops=cops;
refs.trafficPos=trafficPos;
refs.spawnTraffic=spawnTraffic;
refs.getDelivery=()=>delivery;
refs.DIEGO=DIEGO;
refs.DIEGO_X=DIEGO_X;
refs.DIEGO_Z=DIEGO_Z;
refs.isNearDiego=isNearDiego;
refs.getBusted=getBusted;
refs.getWasted=getWasted;
refs.getHeli=()=>heli;
refs.nearestCar=nearestCar;
refs.canPickWeapon=canPickWeapon;
refs.isWeaponHeld=isWeaponHeld;

// First delivery spawned here, after refs are set (spawnDelivery needs playerPos)
spawnDelivery();

setupInput();
setupTouchControls();

const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05);
  updateKeyboardInput();
  updateTouchControls();
  if(state.paused||state.orientationBlocked){renderer.render(scene,camera);return;}
  state.time+=dt;

  for(const c of clouds){
    c.position.x+=c.userData.v*dt;
    if(c.position.x>550)c.position.x=-550;
  }
  updateBeach(state.time);

  if(!state.started){
    const a=state.time*.07;
    camera.position.set(Math.cos(a)*140,65,Math.sin(a)*140);
    camera.lookAt(0,6,0);
    updateTraffic(dt);updatePeds(dt);
    renderer.render(scene,camera);return;
  }

  if(state.mode==='cut'){
    state.cutT-=dt;
    if(state.cutT<=0){hideBig();const fn=state.cutFn;state.cutFn=null;fn&&fn();}
  }else if(state.mode==='car')updateCar(dt);
  else updateFoot(dt);

  updateTraffic(dt);
  updatePeds(dt);
  if(state.mode!=='cut')updateCops(dt);
  updateHeli(dt);
  updateDiego(dt);
  updatePickups(dt);
  updateWeapons(dt);
  if(input.shootHeld)performShoot();

  if(cur)blinkBar(cur.g);
  for(const c of idleCars)blinkBar(c.g);

  updateCamera(dt);
  updateHUD(dt);
  updateAudio();
  drawMinimap();

  const pp=playerPos();
  dlight.position.set(pp.x+sunDir.x*160,sunDir.y*160,pp.z+sunDir.z*160);
  dlight.target.position.set(pp.x,0,pp.z);

  renderer.render(scene,camera);
}
frame();
