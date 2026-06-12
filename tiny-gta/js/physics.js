import {clamp,BOUND,RURAL_X1,RURAL_HALF} from './constants.js';
import {solids} from './world.js';
import {state} from './state.js';
import {blip} from './audio.js';
import {message} from './hud.js';

// bound: NPCs param no calção da praia (BOUND); jogador pode nadar até SWIM_BOUND
export function collideStatics(p,r,bound=BOUND){
  let hit=false;
  for(const b of solids){
    if(b.h!==undefined&&p.y>b.h)continue; // avião passa por cima dos prédios
    const cx=clamp(p.x,b.x0,b.x1),cz=clamp(p.z,b.z0,b.z1);
    const dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
    if(d2<r*r){
      if(d2<1e-6){
        const pl=p.x-b.x0,pr=b.x1-p.x,pt=p.z-b.z0,pb=b.z1-p.z,m=Math.min(pl,pr,pt,pb);
        if(m===pl)p.x=b.x0-r;else if(m===pr)p.x=b.x1+r;
        else if(m===pt)p.z=b.z0-r;else p.z=b.z1+r;
      }else{
        const d=Math.sqrt(d2);p.x=cx+dx/d*r;p.z=cz+dz/d*r;
      }
      hit=true;
    }
  }
  // Jogador (bound>BOUND) pode seguir a península rural para +x até a montanha
  const ext=Math.max(0,bound-BOUND);
  const maxX=ext>0&&Math.abs(p.z)<RURAL_HALF+ext?RURAL_X1+ext:bound;
  if(p.x<-bound){p.x=-bound;hit=true} if(p.x>maxX){p.x=maxX;hit=true}
  if(p.z<-bound){p.z=-bound;hit=true} if(p.z>bound){p.z=bound;hit=true}
  return hit;
}

export function addWanted(n,why,crime='pursuit'){
  const before=Math.floor(state.wanted);
  state.wanted=clamp(state.wanted+n,0,5);state.lastCrime=state.time;
  if(Math.floor(state.wanted)>before){
    blip([880,660,880],0.08,'square',.14);
    message(why||('WANTED ★'+Math.floor(state.wanted)),'var(--pink)');
  }
}
