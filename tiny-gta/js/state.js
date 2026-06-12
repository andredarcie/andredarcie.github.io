export const state={
  started:false,paused:false,mode:'foot',money:250,wanted:0,health:100,lastCrime:-99,
  deliveries:0,taxiFares:0,taxiEarnings:0,bustT:0,cutT:0,cutFn:null,shake:0,time:0,comboN:0,lastHit:-99,dlgActive:false,cine:false,
  hasGun:false,weaponHeld:false,ammo:0,maxAmmo:0,
  crosshairKick:0,crosshairTarget:false,
  mobile:false,orientationBlocked:false,controlsLocked:false,
  inClub:false,
  onRoof:null // registro da porta do prédio em cujo telhado o jogador está
};

export const input={
  moveX:0,moveY:0,lookX:0,lookY:0,
  run:false,brake:false,horn:false,shootHeld:false,
  touchActive:false,moveActive:false,lookActive:false,
  brakeActive:false,hornActive:false,lastInput:'keyboard'
};

export let best={money:0,deliveries:0};
try{best=JSON.parse(localStorage.getItem('tinygta_best'))||best;}catch(e){}

export function saveBest(){
  let ch=false;
  if(state.money>best.money){best.money=state.money;ch=true;}
  if(state.deliveries>best.deliveries){best.deliveries=state.deliveries;ch=true;}
  if(ch)try{localStorage.setItem('tinygta_best',JSON.stringify(best));}catch(e){}
}

export const keys={};
export const carNames=['TUNED BUG','COMPANY SEDAN','RUSTY PICKUP','SLOW TURBO','BLUE SHARK','GRANDPA COUPE','BUDGET ROCKET','GOLDEN BOAT'];
export const carColors=[0xc23b4e,0x3b7ac2,0xcf9a3a,0x5b5f6b,0x7a4f9e,0x3aa06b,0xd96fae,0xc4c8cf];

// Late-binding cross-module refs populated by main.js after all modules initialize.
// Used only where direct imports would create circular dependencies.
export const refs={};
