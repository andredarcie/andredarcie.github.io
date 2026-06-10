const radioBox=document.getElementById('police-radio');
const radioText=document.getElementById('police-radio-text');
const radioUnit=document.getElementById('police-radio-unit');

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
let visibleText='';
let charTimer=0;
let holdTimer=0;

function pickLine(kind){
  const lines=LINES[kind]||LINES.pursuit;
  return lines[Math.floor(Math.random()*lines.length)];
}

export function reportPoliceCrime(kind='pursuit',severity=1){
  const now=performance.now()/1000;
  const minGap=severity>=1?1.2:5;
  if(lastByKind[kind]&&now-lastByKind[kind]<minGap)return;
  lastByKind[kind]=now;
  const text=pickLine(kind);
  if(current?.text===text||queue.some(q=>q.text===text))return;
  queue.push({kind,text});
  if(queue.length>4)queue.shift();
}

export function updatePoliceRadio(dt){
  if(!radioBox||!radioText||!radioUnit)return;
  if(!current&&queue.length){
    current=queue.shift();
    visibleText='';
    charTimer=0;
    holdTimer=0;
    radioText.textContent='';
    radioUnit.textContent=current.kind.replaceAll('_',' ').toUpperCase();
    radioBox.classList.add('show','typing');
  }
  if(!current){
    radioBox.classList.remove('show','typing');
    return;
  }
  if(visibleText.length<current.text.length){
    charTimer+=dt*34;
    const count=Math.min(current.text.length,Math.floor(charTimer));
    visibleText=current.text.slice(0,count);
    radioText.textContent=visibleText;
    return;
  }
  radioBox.classList.remove('typing');
  holdTimer+=dt;
  if(holdTimer>2.8){
    current=null;
    if(!queue.length)radioBox.classList.remove('show');
  }
}

document.getElementById('buildver')?.insertAdjacentText('beforeend',' ◆ RADIO');
