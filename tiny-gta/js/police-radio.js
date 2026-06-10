import {refs} from './state.js';
import {GROUND,CELL,N,nodeX} from './constants.js';

const LINES={
  gunfire:[
    'Dispatch, we have reports of shots fired. Suspect is armed. Units respond Code Three.',
    'All units, caller reports gunfire in the street. Keep distance and wait for backup.'
  ],
  ped_shot:[
    'Dispatch to all units: civilian down from gunfire. Suspect is armed and dangerous.',
    'Control, be advised: possible homicide in public view. Locate and contain the shooter.'
  ],
  vehicle_shot:[
    'Dispatch, reports of a vehicle being fired upon. Suspect is shooting at traffic.',
    'All units, suspect is discharging a firearm at a motor vehicle. Move in with caution.'
  ],
  vehicle_destroyed:[
    'All units, vehicle explosion reported. Fire and patrol units en route. Suspect nearby.',
    'Dispatch, car just detonated in the roadway. Treat this as a violent felony scene.'
  ],
  vehicle_theft:[
    'Dispatch, stolen vehicle reported. Suspect just took a car from the street.',
    'All units, grand theft auto in progress. Suspect is fleeing in a civilian vehicle.'
  ],
  police_vehicle_theft:[
    'Emergency traffic only. Suspect has stolen a marked police cruiser. Use extreme caution.',
    'All units, officer vehicle stolen. Suspect is mobile in a cruiser and considered dangerous.'
  ],
  hit_run:[
    'Dispatch, hit-and-run with a pedestrian struck. Suspect vehicle is fleeing the scene.',
    'All units, civilian hit by a vehicle. Driver failed to stop. Locate that car.'
  ],
  pursuit:[
    'Control to units, suspect is escalating. Maintain visual and coordinate the stop.',
    'Dispatch, keep air and ground units advised. Suspect is refusing lawful orders.'
  ]
};

const queue=[];
const lastByKind={};
let current=null;
let typingTimer=null;
let hideTimer=null;

function els(){
  return{
    box:document.getElementById('police-radio'),
    text:document.getElementById('police-radio-text'),
    unit:document.getElementById('police-radio-unit')
  };
}

function pickLine(kind){
  return buildDetailedLine(kind)||pickFallbackLine(kind);
}

function pickFallbackLine(kind){
  const lines=LINES[kind]||LINES.pursuit;
  return lines[Math.floor(Math.random()*lines.length)];
}

function suspect(){
  return 'a man in a blue shirt';
}

function locationText(){
  const p=refs.playerPos?.();
  if(!p)return 'in the city';
  const half=GROUND/2;
  if(Math.abs(p.x)>half||Math.abs(p.z)>half)return 'near the beachfront';
  if(Math.hypot(p.x,p.z)<48)return 'near the central plaza';
  const nearestI=Math.round((p.x+N*CELL/2)/CELL);
  const nearestJ=Math.round((p.z+N*CELL/2)/CELL);
  const nx=nodeX(Math.max(0,Math.min(N,nearestI)));
  const nz=nodeX(Math.max(0,Math.min(N,nearestJ)));
  if(Math.hypot(p.x-nx,p.z-nz)<16)return 'at a city intersection';
  return p.z<0?'on the north side of downtown':'on the south side of downtown';
}

function carDescription(){
  const cur=refs.getCur?.();
  const name=(cur?.name||'vehicle').toLowerCase();
  if(name.includes('pink'))return 'a pink car';
  if(name.includes('cruiser'))return 'a marked police cruiser';
  if(name.includes('blue'))return 'a blue car';
  if(name.includes('gold'))return 'a gold car';
  if(name.includes('pickup'))return 'a pickup truck';
  if(name.includes('sedan'))return 'a sedan';
  return 'a civilian vehicle';
}

function buildDetailedLine(kind){
  const who=suspect(),where=locationText(),car=carDescription();
  switch(kind){
    case 'gunfire':
      return `Dispatch, multiple callers report ${who} firing shots ${where}. Suspect is armed.`;
    case 'ped_shot':
      return `All units, ${who} shot a civilian ${where}. Victim is down in the street.`;
    case 'vehicle_shot':
      return `Dispatch, ${who} is firing at a vehicle ${where}. Keep responding units back.`;
    case 'vehicle_destroyed':
      return `All units, ${who} caused a vehicle explosion ${where}. Fire and patrol requested.`;
    case 'vehicle_theft':
      return `Dispatch, ${who} just stole ${car} ${where}. Suspect is mobile.`;
    case 'police_vehicle_theft':
      return `Emergency traffic only. ${who} stole a marked police cruiser ${where}.`;
    case 'hit_run':
      return `Dispatch, ${who} hit a pedestrian with a vehicle ${where} and fled the scene.`;
    case 'pursuit':
      return `Control, units are tracking ${who} ${where}. Maintain visual and coordinate.`;
    default:
      return '';
  }
}

function clearTimers(){
  if(typingTimer){clearInterval(typingTimer);typingTimer=null;}
  if(hideTimer){clearTimeout(hideTimer);hideTimer=null;}
}

function playNext(){
  const{box,text,unit}=els();
  if(!box||!text||!unit||current||!queue.length)return;
  current=queue.shift();
  clearTimers();
  let i=0;
  text.textContent='';
  unit.textContent=current.kind.replaceAll('_',' ').toUpperCase();
  box.classList.add('show','typing');
  typingTimer=setInterval(()=>{
    i+=2;
    text.textContent=current.text.slice(0,i);
    if(i>=current.text.length){
      clearInterval(typingTimer);
      typingTimer=null;
      box.classList.remove('typing');
      hideTimer=setTimeout(()=>{
        box.classList.remove('show');
        current=null;
        hideTimer=setTimeout(()=>{hideTimer=null;playNext();},180);
      },3000);
    }
  },34);
}

export function reportPoliceCrime(kind='pursuit',severity=1){
  const now=performance.now()/1000;
  const minGap=severity>=1?1.1:2.2;
  if(lastByKind[kind]&&now-lastByKind[kind]<minGap)return;
  lastByKind[kind]=now;
  queue.push({kind,text:pickLine(kind)});
  if(queue.length>5)queue.shift();
  playNext();
}

export function updatePoliceRadio(){
  playNext();
}

document.getElementById('buildver')?.insertAdjacentText('beforeend',' ◆ RADIO');
