const NS = 'http://www.w3.org/2000/svg';
const RES = ['wood','brick','wool','grain','ore'];
const RNAME = {wood:'Madeira',brick:'Tijolo',wool:'Lã',grain:'Trigo',ore:'Minério'};
const ICON = {wood:'trees',brick:'brick-wall',wool:'cloud',grain:'wheat',ore:'gem'};
const COLOR = {wood:'#2f765b',brick:'#c35c43',wool:'#87a95b',grain:'#d9a93c',ore:'#74828b',desert:'#d8bd83'};
const PCOLOR = ['#e85d3f','#397c6b','#5a67a8'];
const COST = {road:{wood:1,brick:1},settlement:{wood:1,brick:1,wool:1,grain:1},city:{grain:2,ore:3},dev:{wool:1,grain:1,ore:1}};
const NAMES = ['Você','Íris · IA','Nilo · IA'];
const $ = s => document.querySelector(s);
const board = $('#board');
const sheet = $('#sheet');
let toastTimer;

const axial = [];
for(let r=-2;r<=2;r++) for(let q=-2;q<=2;q++) if(Math.abs(q+r)<=2) axial.push({q,r});
axial.sort((a,b)=>a.r-b.r||a.q-b.q);
const CX=360,CY=325,S=70;
const pkey=(x,y)=>`${Math.round(x*10)},${Math.round(y*10)}`;
const point=(q,r)=>({x:CX+S*Math.sqrt(3)*(q+r/2),y:CY+S*1.5*r});
const corners=(cx,cy)=>Array.from({length:6},(_,i)=>{const a=(Math.PI/180)*(60*i-30);return{x:cx+S*Math.cos(a),y:cy+S*Math.sin(a)}});
const shuffle=a=>{for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const emptyRes=()=>Object.fromEntries(RES.map(r=>[r,0]));
const total=p=>RES.reduce((n,r)=>n+p.resources[r],0);

let G;
function makeBoard(){
  const terrain=shuffle(['wood','wood','wood','wood','wool','wool','wool','wool','grain','grain','grain','grain','brick','brick','brick','ore','ore','ore','desert']);
  const tokenSeq=[5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
  const tiles=axial.map((a,i)=>({...a,...point(a.q,a.r),terrain:terrain[i],number:null,vertices:[],edges:[]}));
  // Clockwise spiral from the north-west edge, matching the official letter-token method.
  const ring=tiles.filter(t=>Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(-t.q-t.r))===2).sort((a,b)=>Math.atan2(a.y-CY,a.x-CX)-Math.atan2(b.y-CY,b.x-CX));
  const inner=tiles.filter(t=>Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(-t.q-t.r))===1).sort((a,b)=>Math.atan2(a.y-CY,a.x-CX)-Math.atan2(b.y-CY,b.x-CX));
  const center=tiles.find(t=>t.q===0&&t.r===0); let ti=0;
  [...ring,...inner,center].forEach(t=>{if(t.terrain!=='desert')t.number=tokenSeq[ti++]});
  const vertices=[],edges=[],vm=new Map(),em=new Map();
  tiles.forEach((t,tid)=>{
    const cs=corners(t.x,t.y);
    cs.forEach((p,i)=>{const k=pkey(p.x,p.y);if(!vm.has(k)){vm.set(k,vertices.length);vertices.push({id:vertices.length,x:p.x,y:p.y,building:null,tiles:[],edges:[],port:null})}const vi=vm.get(k);t.vertices.push(vi);vertices[vi].tiles.push(tid)});
    for(let i=0;i<6;i++){let a=t.vertices[i],b=t.vertices[(i+1)%6];const k=a<b?`${a}-${b}`:`${b}-${a}`;if(!em.has(k)){const id=edges.length;em.set(k,id);edges.push({id,a,b,road:null,tiles:[]});vertices[a].edges.push(id);vertices[b].edges.push(id)}const ei=em.get(k);t.edges.push(ei);edges[ei].tiles.push(tid)}
  });
  const coast=edges.filter(e=>e.tiles.length===1).sort((a,b)=>{const ma={x:(vertices[a.a].x+vertices[a.b].x)/2,y:(vertices[a.a].y+vertices[a.b].y)/2},mb={x:(vertices[b.a].x+vertices[b.b].x)/2,y:(vertices[b.a].y+vertices[b.b].y)/2};return Math.atan2(ma.y-CY,ma.x-CX)-Math.atan2(mb.y-CY,mb.x-CX)});
  const ports=shuffle(['3:1','3:1','3:1','3:1','wood','brick','wool','grain','ore']);
  [0,3,6,9,12,15,18,21,24].forEach((ci,i)=>{const e=coast[ci];e.port=ports[i];vertices[e.a].port=ports[i];vertices[e.b].port=ports[i]});
  return {tiles,vertices,edges};
}

function newPlayer(id){return{id,name:NAMES[id],color:PCOLOR[id],resources:emptyRes(),roads:0,settlements:0,cities:0,dev:[],playedKnights:0,longest:0,largestArmy:false,longestRoad:false,ports:new Set()}}
function chooseStartingPlayer(){
  let contenders=[0,1,2],rounds=[];
  while(contenders.length>1){const rolls=contenders.map(pid=>({pid,total:2+Math.floor(Math.random()*6)+Math.floor(Math.random()*6)}));rounds.push(rolls);const high=Math.max(...rolls.map(x=>x.total));contenders=rolls.filter(x=>x.total===high).map(x=>x.pid)}
  return{player:contenders[0],rounds};
}
function newGame(){
  if(G){clearTimeout(G.aiActionTimer);clearTimeout(G.aiTimer)}
  const b=makeBoard(),start=chooseStartingPlayer(),clockwise=[start.player,(start.player+1)%3,(start.player+2)%3];
  G={...b,players:[0,1,2].map(newPlayer),bank:Object.fromEntries(RES.map(r=>[r,19])),devDeck:shuffle([...Array(14).fill('knight'),...Array(5).fill('vp'),...Array(2).fill('roadBuilding'),...Array(2).fill('yearPlenty'),...Array(2).fill('monopoly')]),startingPlayer:start.player,active:start.player,turn:0,phase:'setupSettlement',setupOrder:[...clockwise,...[...clockwise].reverse()],setupIndex:0,lastSetupVertex:null,rolled:false,dice:[0,0],robber:b.tiles.findIndex(t=>t.terrain==='desert'),playedDev:false,boughtThisTurn:[],freeRoads:0,winner:null,log:[],pendingAfterRobber:null,aiTradeWindowDone:false,aiTimer:null,aiActionTimer:null};
  [...start.rounds].reverse().forEach((round,i)=>log(`${i?'Desempate inicial':'Sorteio inicial'}: ${round.map(x=>`${NAMES[x.pid]} ${x.total}`).join(' · ')}`));
  log(`${NAMES[start.player]} começa a partida.`);log('A ilha foi criada. A preparação começa.');render();maybeAISetup();
}

function icon(name){return `<i data-lucide="${name}"></i>`}
function refreshIcons(){window.lucide?.createIcons({attrs:{'stroke-width':1.8}})}
function log(msg){G.log.unshift(msg);G.log=G.log.slice(0,60)}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),2100)}
function svg(tag,attrs={}){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e}
function legalSettlement(v,p,setup=false){if(v.building)return false;if(v.edges.some(ei=>{const e=G.edges[ei],o=e.a===v.id?e.b:e.a;return G.vertices[o].building}))return false;return setup||v.edges.some(ei=>G.edges[ei].road===p)}
function legalRoad(e,p,setupVertex=null){if(e.road!==null)return false;if(setupVertex!==null)return e.a===setupVertex||e.b===setupVertex;return [e.a,e.b].some(vi=>{const v=G.vertices[vi];if(v.building&&v.building.player===p)return true;if(v.building&&v.building.player!==p)return false;return v.edges.some(ei=>G.edges[ei].road===p)})}
function canPay(p,cost){return Object.entries(cost).every(([r,n])=>p.resources[r]>=n)}
function joinPT(items){return items.length<2?items[0]||'':`${items.slice(0,-1).join(', ')} e ${items.at(-1)}`}
function missingCost(p,cost){const missing=Object.entries(cost).filter(([r,n])=>p.resources[r]<n).map(([r,n])=>{const amount=n-p.resources[r];return `${amount} ${RNAME[r].toLowerCase()}`});return missing.length?`${missing.length===1?'Falta':'Faltam'} ${joinPT(missing)}.`:''}
function constructionReasons(p){return{
  road:p.roads>=15?'Você atingiu o limite de 15 estradas.':missingCost(p,COST.road)||(!G.edges.some(e=>legalRoad(e,0))?'Sua rede não tem uma conexão livre.':''),
  settlement:p.settlements>=5?'Você atingiu o limite de 5 assentamentos.':missingCost(p,COST.settlement)||(!G.vertices.some(v=>legalSettlement(v,0))?'Estenda uma estrada até um local livre.':''),
  city:p.cities>=4?'Você atingiu o limite de 4 cidades.':!p.settlements?'Construa um assentamento para evoluir.':missingCost(p,COST.city),
  dev:!G.devDeck.length?'O baralho de desenvolvimento acabou.':missingCost(p,COST.dev)
}}
function pay(p,cost){for(const [r,n] of Object.entries(cost)){p.resources[r]-=n;G.bank[r]+=n}}
function gain(p,r,n=1){const take=Math.min(n,G.bank[r]);p.resources[r]+=take;G.bank[r]-=take;return take}
function calcVP(p){return p.settlements+p.cities*2+(p.largestArmy?2:0)+(p.longestRoad?2:0)+p.dev.filter(d=>d.type==='vp').length}
function publicVP(p){return p.settlements+p.cities*2+(p.largestArmy?2:0)+(p.longestRoad?2:0)}
function visibleVP(p){return p.id===0||G.winner!==null?calcVP(p):publicVP(p)}

function renderBoard(){
  board.innerHTML='';
  const sea=svg('rect',{x:0,y:0,width:720,height:650,fill:'#b8d8da'});board.append(sea);
  G.tiles.forEach((t,i)=>{const poly=svg('polygon',{points:corners(t.x,t.y).map(p=>`${p.x},${p.y}`).join(' '),fill:COLOR[t.terrain],class:`hex ${G.phase==='robber'&&i!==G.robber&&G.active===0?'clickable':''}`,'data-tile':i});board.append(poly);
    // sparse terrain glyphs
    const glyph={wood:'♠',wool:'•',grain:'≋',brick:'▰',ore:'◆',desert:'·'}[t.terrain];const gt=svg('text',{x:t.x,y:t.y-28,'text-anchor':'middle',fill:'rgba(255,255,255,.38)','font-size':28,'font-weight':700});gt.textContent=glyph;board.append(gt);
    if(t.number){const c=svg('circle',{cx:t.x,cy:t.y,r:25,class:'number-disc'});board.append(c);const n=svg('text',{x:t.x,y:t.y-3,class:`number-text ${[6,8].includes(t.number)?'hot':''}`});n.textContent=t.number;board.append(n);const p=svg('text',{x:t.x,y:t.y+17,class:'pip-text'});p.textContent='•'.repeat(6-Math.abs(7-t.number));board.append(p)}
  });
  G.edges.filter(e=>e.port).forEach(e=>{const a=G.vertices[e.a],b=G.vertices[e.b],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const dx=mx-CX,dy=my-CY,len=Math.hypot(dx,dy),ox=mx+dx/len*30,oy=my+dy/len*30;board.append(svg('line',{x1:a.x,y1:a.y,x2:ox,y2:oy,class:'port-line'}));board.append(svg('line',{x1:b.x,y1:b.y,x2:ox,y2:oy,class:'port-line'}));const tx=svg('text',{x:ox+dx/len*8,y:oy+dy/len*8,class:'port-label'});tx.textContent=e.port==='3:1'?'3:1':`2:1`;board.append(tx)});
  G.edges.forEach(e=>{const a=G.vertices[e.a],b=G.vertices[e.b];if(e.road!==null)board.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'road',stroke:PCOLOR[e.road]}))});
  const edgeMode=G.active===0&&(G.phase==='setupRoad'||G.phase==='buildRoad');
  if(edgeMode)G.edges.filter(e=>legalRoad(e,0,G.phase==='setupRoad'?G.lastSetupVertex:null)).forEach(e=>{const a=G.vertices[e.a],b=G.vertices[e.b];board.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge-guide'}));board.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge-hit','data-edge':e.id}))});
  G.vertices.forEach(v=>{if(v.building){const c=PCOLOR[v.building.player];if(v.building.type==='settlement')board.append(svg('path',{d:`M${v.x-12} ${v.y+10}V${v.y-3}L${v.x} ${v.y-15}L${v.x+12} ${v.y-3}V${v.y+10}Z`,fill:c,class:'building'}));else board.append(svg('path',{d:`M${v.x-14} ${v.y+12}V${v.y-8}H${v.x-5}V${v.y-17}H${v.x+5}V${v.y-8}H${v.x+14}V${v.y+12}Z`,fill:c,class:'building'}))}});
  const vertMode=G.active===0&&(G.phase==='setupSettlement'||G.phase==='buildSettlement'||G.phase==='buildCity');
  if(vertMode)G.vertices.filter(v=>G.phase==='buildCity'?v.building?.player===0&&v.building.type==='settlement':legalSettlement(v,0,G.phase==='setupSettlement')).forEach(v=>{board.append(svg('circle',{cx:v.x,cy:v.y,r:8,class:'vertex-guide'}));board.append(svg('circle',{cx:v.x,cy:v.y,r:22,class:'vertex-hit','data-vertex':v.id}))});
  const rt=G.tiles[G.robber];board.append(svg('path',{d:`M${rt.x-11} ${rt.y+18}Q${rt.x-7} ${rt.y-5} ${rt.x} ${rt.y-19}Q${rt.x+7} ${rt.y-5} ${rt.x+11} ${rt.y+18}Z`,class:'robber'}));
}

function render(){
  renderBoard();
  $('#score-strip').innerHTML=G.players.map((p,i)=>`<article class="player-card ${G.active===i?'active':''}" style="--player:${p.color}"><div class="player-top"><span class="player-dot"></span>${p.name}</div><div class="player-score">${visibleVP(p)} <small>PV</small></div><div class="player-meta">${total(p)} cartas · ${p.playedKnights} cavaleiros</div></article>`).join('');
  $('#resource-bar').innerHTML=RES.map(r=>`<div class="resource" style="--resource:${COLOR[r]}">${icon(ICON[r])}<b>${G.players[0].resources[r]}</b><span>${RNAME[r]}</span></div>`).join('');
  $('#turn-dot').style.background=PCOLOR[G.active];$('#turn-label').textContent=G.winner!==null?'Fim de jogo':G.phase.startsWith('setup')?'Preparação':`Turno de ${NAMES[G.active]}`;
  renderActions();$('#game-log').innerHTML=G.log.map(x=>`<div class="log-line">${x}</div>`).join('');refreshIcons();
}

function renderActions(){
  const p=G.players[0],A=$('#actions');let kicker='AGUARDE',title='As IAs estão jogando',help='O turno avança automaticamente.',buttons='';
  const btn=(label,action,ico,secondary=false,disabled=false,wide=false,reason='')=>`<button class="action-btn ${secondary?'secondary':''} ${wide?'wide':''} ${reason?'has-reason':''}" data-action="${action}" ${disabled?'disabled':''} ${reason?`aria-label="${label}. ${reason}"`:''}>${icon(ico)}<span class="action-label">${label}${reason?`<small class="action-reason">${icon('lock-keyhole')} ${reason}</small>`:''}</span></button>`;
  if(G.winner!==null){kicker='FIM DA PARTIDA';title=G.winner===0?'Você conquistou Catan!':`${NAMES[G.winner]} venceu`;help='A primeira pessoa a chegar a 10 pontos vence.';buttons=btn('Jogar novamente','restart','rotate-ccw',false,false,true)}
  else if(G.active===0){
    if(G.phase==='setupSettlement'){kicker='PREPARAÇÃO';title='Escolha uma encruzilhada';help='Mantenha uma interseção livre entre construções.'}
    else if(G.phase==='setupRoad'){kicker='PREPARAÇÃO';title='Construa uma estrada';help='Toque em uma aresta ligada ao novo assentamento.'}
    else if(G.phase==='preRoll'){kicker=`TURNO ${G.turn+1}`;title='Lance os dados';help='Você pode jogar 1 carta de desenvolvimento antes de lançar.';buttons=btn('Lançar dados','roll','dices')+btn('Cartas','dev','sparkles',true,!playableDevs(p).length)}
    else if(G.phase==='discard'){kicker='O LADRÃO';title='Descarte recursos';help='Você tem mais de 7 cartas e deve descartar metade.'}
    else if(G.phase==='robber'){kicker='O LADRÃO';title='Mova o ladrão';help='Escolha outro terreno. Você roubará 1 carta de um vizinho.'}
    else if(G.phase==='buildRoad'){kicker='CONSTRUÇÃO';title=G.freeRoads?`Posicione ${G.freeRoads} estrada${G.freeRoads>1?'s':''} grátis`:'Posicione a estrada';help='Escolha uma aresta conectada à sua rede.';buttons=G.freeRoads?'':btn('Cancelar','cancel','x',true)}
    else if(G.phase==='buildSettlement'){kicker='CONSTRUÇÃO';title='Posicione o assentamento';help='Deve ligar à sua estrada e respeitar a distância.';buttons=btn('Cancelar','cancel','x',true)}
    else if(G.phase==='buildCity'){kicker='CONSTRUÇÃO';title='Escolha um assentamento';help='Ele será melhorado para cidade.';buttons=btn('Cancelar','cancel','x',true)}
    else if(G.phase==='main'){
      kicker='NEGOCIE · CONSTRUA';title='Sua vez';help='Faça suas ações em qualquer ordem e encerre quando quiser.';
      const reasons=constructionReasons(p);
      buttons=btn('Estrada','road','route',false,!!reasons.road,false,reasons.road)+btn('Assentamento','settlement','house',false,!!reasons.settlement,false,reasons.settlement)+btn('Cidade','city','castle',false,!!reasons.city,false,reasons.city)+btn('Desenvolvimento','buyDev','badge-plus',false,!!reasons.dev,false,reasons.dev)+btn('Comerciar','trade','handshake',true)+btn('Jogar carta','dev','sparkles',true,!playableDevs(p).length)+btn('Encerrar turno','end','arrow-right',false,false,true)
    }
  }else if(G.phase==='aiTradeWindow'){kicker='NEGOCIAÇÃO';title=`${NAMES[G.active]} está negociando`;help='Você pode propor uma troca ao jogador ativo.';buttons=btn('Propor troca','trade','handshake',true)+btn('Continuar','passTrade','arrow-right')}
  else buttons=btn('Avançar agora','resumeAI','fast-forward',true,false,true);
  $('#phase-kicker').textContent=kicker;$('#phase-title').textContent=title;$('#phase-help').textContent=help;A.innerHTML=buttons;
}

function placeSettlement(vi,pid,setup=false){const v=G.vertices[vi];v.building={player:pid,type:'settlement'};const p=G.players[pid];p.settlements++;if(v.port)p.ports.add(v.port);if(setup&&G.setupIndex>=3)v.tiles.forEach(ti=>{const t=G.tiles[ti];if(t.terrain!=='desert')gain(p,t.terrain)});updateAwards();}
function placeRoad(ei,pid){G.edges[ei].road=pid;G.players[pid].roads++;updateAwards()}
function handleVertex(vi){if(G.active!==0||G.winner!==null)return;const v=G.vertices[vi];if(G.phase==='setupSettlement'&&legalSettlement(v,0,true)){placeSettlement(vi,0,true);G.lastSetupVertex=vi;G.phase='setupRoad';log('Você fundou um assentamento.');render()}
  else if(G.phase==='buildSettlement'&&legalSettlement(v,0,false)){pay(G.players[0],COST.settlement);placeSettlement(vi,0);G.phase='main';log('Você construiu um assentamento.');checkWin(0);render()}
  else if(G.phase==='buildCity'&&v.building?.player===0&&v.building.type==='settlement'){pay(G.players[0],COST.city);v.building.type='city';G.players[0].settlements--;G.players[0].cities++;G.phase='main';log('Você melhorou um assentamento para cidade.');checkWin(0);render()}}
function handleEdge(ei){if(G.active!==0)return;const e=G.edges[ei];if(G.phase==='setupRoad'&&legalRoad(e,0,G.lastSetupVertex)){placeRoad(ei,0);finishSetupPair();}
  else if(G.phase==='buildRoad'&&legalRoad(e,0)){if(G.freeRoads>0){G.freeRoads--;placeRoad(ei,0);log('Você colocou uma estrada grátis.');if(G.freeRoads>0&&G.players[0].roads<15&&G.edges.some(x=>legalRoad(x,0))){render();return}G.freeRoads=0;G.phase=G.devReturnPhase||'main';G.devReturnPhase=null}else{pay(G.players[0],COST.road);placeRoad(ei,0);log('Você construiu uma estrada.');G.phase='main'}checkWin(0);render()}}
function finishSetupPair(){log(`${NAMES[G.active]} concluiu uma posição inicial.`);G.setupIndex++;if(G.setupIndex>=G.setupOrder.length){G.active=G.startingPlayer;G.phase='preRoll';G.turn=0;log(`Preparação concluída. ${NAMES[G.active]} faz o primeiro turno.`);render();if(G.active!==0)queueAI(aiTurn,450);return}G.active=G.setupOrder[G.setupIndex];G.phase='setupSettlement';G.lastSetupVertex=null;render();maybeAISetup()}
function vertexValue(v,pid){let s=0,types=new Set();v.tiles.forEach(ti=>{const t=G.tiles[ti];if(t.number){s+=6-Math.abs(7-t.number);types.add(t.terrain)}});s+=types.size*1.8;if(v.port)s+=1.6;const p=G.players[pid];RES.forEach(r=>{if(p.resources[r]===0&&types.has(r))s+=1});return s+Math.random()*2}
function maybeAISetup(){if(G.active===0||!G.phase.startsWith('setup'))return;queueAI(()=>{const pid=G.active;if(G.phase==='setupSettlement'){const opts=G.vertices.filter(v=>legalSettlement(v,pid,true)).sort((a,b)=>vertexValue(b,pid)-vertexValue(a,pid));const v=opts[0];placeSettlement(v.id,pid,true);G.lastSetupVertex=v.id;G.phase='setupRoad';render();queueAI(maybeAISetup,260)}else{const opts=G.edges.filter(e=>legalRoad(e,pid,G.lastSetupVertex));const e=opts.sort((a,b)=>{const oa=a.a===G.lastSetupVertex?a.b:a.a,ob=b.a===G.lastSetupVertex?b.b:b.a;return vertexValue(G.vertices[ob],pid)-vertexValue(G.vertices[oa],pid)})[0];placeRoad(e.id,pid);finishSetupPair()}},350)}

function rollDice(){G.dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];G.rolled=true;$('#die-a').textContent=G.dice[0];$('#die-b').textContent=G.dice[1];$('#dice').classList.remove('hidden');const sum=G.dice[0]+G.dice[1];log(`${NAMES[G.active]} lançou ${sum}.`);if(sum===7){startSeven()}else{produce(sum);afterRoll()}render()}
function produce(n){const claims=Object.fromEntries(RES.map(r=>[r,[0,0,0]]));G.tiles.forEach((t,ti)=>{if(t.number!==n||ti===G.robber||t.terrain==='desert')return;t.vertices.forEach(vi=>{const b=G.vertices[vi].building;if(b)claims[t.terrain][b.player]+=b.type==='city'?2:1})});RES.forEach(r=>{const need=claims[r].reduce((a,b)=>a+b,0);if(!need)return;if(G.bank[r]<need&&claims[r].filter(Boolean).length>1){log(`O banco não tinha ${RNAME[r].toLowerCase()} suficiente; ninguém recebeu.`);return}claims[r].forEach((n,pid)=>{if(n)gain(G.players[pid],r,n)})});log(`Os terrenos de número ${n} produziram recursos.`)}
function startSeven(){G.pendingAfterRobber=()=>afterRoll();const human=G.players[0];G.players.slice(1).forEach(p=>{if(total(p)>7)autoDiscard(p,Math.floor(total(p)/2))});if(total(human)>7){G.phase='discard';render();openDiscard(Math.floor(total(human)/2))}else beginRobber()}
function autoDiscard(p,n){for(let i=0;i<n;i++){const r=RES.filter(x=>p.resources[x]).sort((a,b)=>p.resources[b]-p.resources[a])[0];p.resources[r]--;G.bank[r]++}log(`${p.name} descartou ${n} recursos.`)}
function openDiscard(n){const chosen=emptyRes();openSheet('LADRÃO','Descarte metade',()=>{const body=RES.map(r=>tradeRow(r,chosen,'discard')).join('')+`<div class="sheet-actions"><button type="button" class="action-btn wide" id="confirm-discard" disabled>Descartar ${n}</button></div>`;$('#sheet-body').innerHTML=body;$('#sheet-body').onclick=e=>{const b=e.target.closest('[data-step]');if(!b)return;const r=b.dataset.res,d=+b.dataset.step;if(chosen[r]+d>=0&&chosen[r]+d<=G.players[0].resources[r])chosen[r]+=d;updateSteppers(chosen);$('#confirm-discard').disabled=RES.reduce((s,r)=>s+chosen[r],0)!==n};$('#confirm-discard').onclick=()=>{RES.forEach(r=>{G.players[0].resources[r]-=chosen[r];G.bank[r]+=chosen[r]});sheet.close();log(`Você descartou ${n} recursos.`);beginRobber()}})}
function beginRobber(){if(G.active===0){G.phase='robber';render()}else{aiMoveRobber(G.active);G.pendingAfterRobber?.();G.pendingAfterRobber=null}}
function moveRobber(ti){if(ti===G.robber)return;G.robber=ti;const victims=[...new Set(G.tiles[ti].vertices.map(vi=>G.vertices[vi].building?.player).filter(pid=>pid!==undefined&&pid!==G.active&&total(G.players[pid])>0))];if(G.active===0&&victims.length>1){openSheet('LADRÃO','Escolha quem roubar',()=>{$('#sheet-body').innerHTML=`<div class="choice-grid">${victims.map(pid=>`<button type="button" class="choice" data-victim="${pid}"><b>${NAMES[pid]}</b><small>${total(G.players[pid])} cartas</small></button>`).join('')}</div>`;$('#sheet-body').onclick=e=>{const b=e.target.closest('[data-victim]');if(b){steal(0,+b.dataset.victim);sheet.close();finishRobber()}}})}else{if(victims.length)steal(G.active,victims[Math.floor(Math.random()*victims.length)]);finishRobber()}}
function finishRobber(){log(`${NAMES[G.active]} moveu o ladrão.`);const cb=G.pendingAfterRobber;G.pendingAfterRobber=null;cb?.();render()}
function steal(thief,victim){const bag=RES.flatMap(r=>Array(G.players[victim].resources[r]).fill(r));if(!bag.length)return;const r=bag[Math.floor(Math.random()*bag.length)];G.players[victim].resources[r]--;G.players[thief].resources[r]++;log(`${NAMES[thief]} roubou 1 carta de ${NAMES[victim]}.`)}
function aiMoveRobber(pid){const choices=G.tiles.map((t,i)=>({i,score:t.vertices.reduce((s,vi)=>{const b=G.vertices[vi].building;if(!b)return s;return s+(b.player===pid?-4:(b.type==='city'?5:3))},0)+Math.random()})).filter(x=>x.i!==G.robber).sort((a,b)=>b.score-a.score);G.robber=choices[0].i;const victims=[...new Set(G.tiles[G.robber].vertices.map(vi=>G.vertices[vi].building?.player).filter(x=>x!==undefined&&x!==pid&&total(G.players[x])>0))];if(victims.length)steal(pid,victims.sort((a,b)=>total(G.players[b])-total(G.players[a]))[0]);log(`${NAMES[pid]} moveu o ladrão.`)}
function afterRoll(){if(G.active===0){G.phase='main'}else aiMain(G.active)}

function playableDevs(p){return p.dev.filter((d,i)=>d.type!=='vp'&&!d.new&&!G.playedDev).map(d=>d.type)}
function buyDev(pid){const p=G.players[pid];if(!G.devDeck.length||!canPay(p,COST.dev))return false;pay(p,COST.dev);const type=G.devDeck.pop();p.dev.push({type,new:true});G.boughtThisTurn.push(type);log(`${p.name} comprou uma carta de desenvolvimento.`);checkWin(pid);return true}
function playDev(type,pid=0){const p=G.players[pid],idx=p.dev.findIndex(d=>d.type===type&&!d.new);if(idx<0||G.playedDev)return false;p.dev.splice(idx,1);G.playedDev=true;if(type==='knight'){p.playedKnights++;updateAwards();G.pendingAfterRobber=()=>{if(checkWin(pid)){render();return}if(G.active===0){G.phase=G.rolled?'main':'preRoll';render()}else aiContinue(pid)};beginRobber()}
  else if(type==='roadBuilding'){G.freeRoads=Math.min(2,15-p.roads);if(pid===0){G.devReturnPhase=G.rolled?'main':'preRoll';if(G.freeRoads&&G.edges.some(x=>legalRoad(x,0)))G.phase='buildRoad';else{G.freeRoads=0;G.phase=G.devReturnPhase;G.devReturnPhase=null}render()}else aiFreeRoads(pid)}
  else if(type==='yearPlenty'){if(pid===0)chooseYearPlenty(2);else{for(let i=0;i<2;i++)gain(p,aiNeededResource(p));aiContinue(pid)}}
  else if(type==='monopoly'){if(pid===0)chooseResource('MONOPÓLIO','Escolha um recurso',r=>resolveMonopoly(0,r));else{const r=RES.sort((a,b)=>G.players.filter((_,i)=>i!==pid).reduce((s,x)=>s+x.resources[b]-x.resources[a],0))[0];resolveMonopoly(pid,r);aiContinue(pid)}}log(`${p.name} jogou ${devName(type)}.`);return true}
function resolveMonopoly(pid,r){let n=0;G.players.forEach((p,i)=>{if(i!==pid){n+=p.resources[r];G.players[pid].resources[r]+=p.resources[r];p.resources[r]=0}});log(`${NAMES[pid]} monopolizou ${n} ${RNAME[r].toLowerCase()}.`);if(pid===0){G.phase=G.rolled?'main':'preRoll';render()}}
function chooseYearPlenty(left){chooseResource('INVENÇÃO',`Escolha ${left===2?'o primeiro':'o segundo'} recurso`,r=>{gain(G.players[0],r);if(left>1)chooseYearPlenty(1);else{G.phase=G.rolled?'main':'preRoll';render()}})}
function devName(t){return{knight:'um Cavaleiro',roadBuilding:'Construção de Estradas',yearPlenty:'Invenção',monopoly:'Monopólio',vp:'Ponto de Vitória'}[t]}

function longestFor(pid){const owned=G.edges.filter(e=>e.road===pid);let best=0;function dfs(vi,used){best=Math.max(best,used.size);const blocked=G.vertices[vi].building&&G.vertices[vi].building.player!==pid;if(blocked&&used.size)return;for(const ei of G.vertices[vi].edges){if(G.edges[ei].road!==pid||used.has(ei))continue;const e=G.edges[ei],next=e.a===vi?e.b:e.a;used.add(ei);dfs(next,used);used.delete(ei)}}owned.forEach(e=>{dfs(e.a,new Set());dfs(e.b,new Set())});return best}
function updateAwards(){G.players.forEach((p,i)=>p.longest=longestFor(i));const current=G.players.findIndex(p=>p.longestRoad);const max=Math.max(...G.players.map(p=>p.longest));let candidates=G.players.map((p,i)=>p.longest===max&&max>=5?i:-1).filter(i=>i>=0);let holder=current>=0&&G.players[current].longest===max?current:(candidates.length===1?candidates[0]:-1);G.players.forEach((p,i)=>p.longestRoad=i===holder);
  const acurrent=G.players.findIndex(p=>p.largestArmy);const amax=Math.max(...G.players.map(p=>p.playedKnights));candidates=G.players.map((p,i)=>p.playedKnights===amax&&amax>=3?i:-1).filter(i=>i>=0);holder=acurrent>=0&&G.players[acurrent].playedKnights===amax?acurrent:(candidates.length===1?candidates[0]:-1);G.players.forEach((p,i)=>p.largestArmy=i===holder)}
function checkWin(pid){updateAwards();if(G.active===pid&&calcVP(G.players[pid])>=10){G.winner=pid;G.phase='gameover';log(`${NAMES[pid]} venceu com ${calcVP(G.players[pid])} pontos!`);openWinner(pid);return true}return false}

function queueAI(fn,delay=0){
  clearTimeout(G.aiActionTimer);const game=G,pid=G.active;
  G.aiActionTimer=setTimeout(()=>{if(G!==game||G.winner!==null||G.active!==pid)return;G.aiActionTimer=null;try{fn()}catch(error){console.error('Falha no turno da IA:',error);log(`${NAMES[pid]} encontrou um problema; o turno foi retomado.`);render();queueAI(()=>recoverAI(pid),250)}},delay)
}
function recoverAI(pid){if(G.active!==pid||G.winner!==null)return;if(G.phase.startsWith('setup'))maybeAISetup();else if(G.phase==='preRoll')aiTurn();else if(G.phase==='aiTradeWindow')finishAITradeWindow(pid);else if(G.phase==='main')aiMain(pid);else endTurn()}
function resumeAI(){if(G.active===0||G.winner!==null)return;clearTimeout(G.aiTimer);G.aiTimer=null;clearTimeout(G.aiActionTimer);G.aiActionTimer=null;recoverAI(G.active)}
function endTurn(){clearTimeout(G.aiActionTimer);G.aiActionTimer=null;G.players[G.active].dev.forEach(d=>d.new=false);G.active=(G.active+1)%3;if(G.active===G.startingPlayer)G.turn++;G.rolled=false;G.playedDev=false;G.boughtThisTurn=[];G.aiTradeWindowDone=false;G.phase='preRoll';$('#dice').classList.add('hidden');if(checkWin(G.active)){render();return}render();if(G.active!==0)queueAI(aiTurn,450)}
function aiTurn(){if(G.winner!==null)return;const pid=G.active,p=G.players[pid];const knight=p.dev.find(d=>d.type==='knight'&&!d.new);if(knight&&Math.random()<.28){playDev('knight',pid)}else rollDice()}
function aiContinue(pid){if(!G.rolled)rollDice();else aiMain(pid)}
function tradeDescription(bundle){return RES.filter(r=>bundle[r]).map(r=>`${bundle[r]} ${RNAME[r].toLowerCase()}`).join(' + ')}
function finishAITradeWindow(pid){if(G.active!==pid||G.winner!==null)return;clearTimeout(G.aiTimer);G.aiTimer=null;G.phase='main';render();aiMain(pid)}
function openAIOffer(pid){
  const ai=G.players[pid],human=G.players[0],target=ai.settlements<5?COST.settlement:COST.city;
  const want=RES.filter(r=>human.resources[r]>0&&ai.resources[r]<(target[r]||0)).sort((a,b)=>human.resources[b]-human.resources[a])[0];
  const give=RES.filter(r=>r!==want&&ai.resources[r]>0).sort((a,b)=>(ai.resources[b]-(target[b]||0))-(ai.resources[a]-(target[a]||0)))[0];
  if(!want||!give)return false;
  openSheet('PROPOSTA DA IA',`${ai.name} quer trocar`,()=>{
    $('#sheet-body').innerHTML=`<div class="choice-grid"><div class="choice"><small>VOCÊ ENTREGA</small><b>${icon(ICON[want])} 1 ${RNAME[want]}</b></div><div class="choice"><small>VOCÊ RECEBE</small><b>${icon(ICON[give])} 1 ${RNAME[give]}</b></div></div><div class="sheet-actions"><button type="button" class="action-btn secondary" id="decline-ai">Recusar</button><button type="button" class="action-btn" id="accept-ai">Aceitar</button></div>`;
    let resolved=false;const returnToWindow=()=>{G.phase='aiTradeWindow';render();G.aiTimer=setTimeout(()=>finishAITradeWindow(pid),3500)};
    sheet.addEventListener('close',()=>{if(!resolved&&G.active===pid&&G.winner===null)returnToWindow()},{once:true});
    $('#accept-ai').onclick=()=>{resolved=true;human.resources[want]--;ai.resources[want]++;ai.resources[give]--;human.resources[give]++;log(`Troca pública: você entregou 1 ${RNAME[want].toLowerCase()} e ${ai.name} entregou 1 ${RNAME[give].toLowerCase()}.`);sheet.close();finishAITradeWindow(pid)};
    $('#decline-ai').onclick=()=>{resolved=true;log(`Você recusou a proposta de ${ai.name}.`);sheet.close();returnToWindow()};refreshIcons();
  });return true;
}
function startAITradeWindow(pid){G.aiTradeWindowDone=true;G.phase='aiTradeWindow';render();if(!openAIOffer(pid))G.aiTimer=setTimeout(()=>finishAITradeWindow(pid),3500)}
function aiMain(pid){if(!G.aiTradeWindowDone){startAITradeWindow(pid);return}const p=G.players[pid];queueAI(()=>{
    // Bank trades to complete high-value builds.
    for(let k=0;k<3;k++){const target=p.settlements<5?COST.settlement:COST.city;const missing=RES.find(r=>(target[r]||0)>p.resources[r]&&G.bank[r]>0);if(!missing)break;const give=RES.find(r=>p.resources[r]>=tradeRate(p,r)&&r!==missing);if(!give)break;const rate=tradeRate(p,give);p.resources[give]-=rate;G.bank[give]+=rate;gain(p,missing);log(`Troca pública: ${p.name} entregou ${rate} ${RNAME[give].toLowerCase()} e recebeu 1 ${RNAME[missing].toLowerCase()} do banco.`)}
    let acted=true,guard=0;while(acted&&guard++<8){acted=false;
      if(p.cities<4&&canPay(p,COST.city)){const vs=G.vertices.filter(v=>v.building?.player===pid&&v.building.type==='settlement');if(vs.length){pay(p,COST.city);vs.sort((a,b)=>vertexValue(b,pid)-vertexValue(a,pid))[0].building.type='city';p.settlements--;p.cities++;acted=true;continue}}
      if(p.settlements<5&&canPay(p,COST.settlement)){const vs=G.vertices.filter(v=>legalSettlement(v,pid)).sort((a,b)=>vertexValue(b,pid)-vertexValue(a,pid));if(vs.length){pay(p,COST.settlement);placeSettlement(vs[0].id,pid);acted=true;continue}}
      if(p.roads<15&&canPay(p,COST.road)){const es=G.edges.filter(e=>legalRoad(e,pid));if(es.length){pay(p,COST.road);placeRoad(es[Math.floor(Math.random()*Math.min(4,es.length))].id,pid);acted=true;continue}}
      if(G.devDeck.length&&canPay(p,COST.dev)){buyDev(pid);acted=true;continue}
    }
    if(checkWin(pid)){render();return}const playable=p.dev.filter(d=>!d.new&&d.type!=='vp');if(!G.playedDev&&playable.length&&Math.random()<.35){playDev(playable[0].type,pid);return}render();queueAI(endTurn,520)
  },650)}
function aiFreeRoads(pid){const p=G.players[pid];for(let k=0;k<2&&p.roads<15;k++){const es=G.edges.filter(e=>legalRoad(e,pid));if(es.length)placeRoad(es[Math.floor(Math.random()*es.length)].id,pid)}G.freeRoads=0;aiContinue(pid)}
function aiNeededResource(p){const target=p.settlements<4?COST.settlement:COST.city;return RES.sort((a,b)=>((target[b]||0)-p.resources[b])-((target[a]||0)-p.resources[a]))[0]}
function tradeRate(p,r){return p.ports.has(r)?2:p.ports.has('3:1')?3:4}

function openSheet(kicker,title,ready){$('#sheet-kicker').textContent=kicker;$('#sheet-title').textContent=title;$('#sheet-body').innerHTML='';sheet.showModal();ready()}
function tradeRow(r,obj,prefix){return `<div class="trade-row"><span>${icon(ICON[r])} ${RNAME[r]}</span><div class="stepper"><button type="button" data-step="-1" data-res="${r}">−</button><b data-count="${r}">${obj[r]}</b><button type="button" data-step="1" data-res="${r}">+</button></div></div>`}
function updateSteppers(obj,prefix=''){RES.forEach(r=>{const e=$(`[data-count="${prefix}${r}"]`);if(e)e.textContent=obj[r]})}
function chooseResource(kicker,title,cb){openSheet(kicker,title,()=>{$('#sheet-body').innerHTML=`<div class="choice-grid">${RES.map(r=>`<button type="button" class="choice" data-resource="${r}">${icon(ICON[r])}<b>${RNAME[r]}</b><small>Banco: ${G.bank[r]}</small></button>`).join('')}</div>`;$('#sheet-body').onclick=e=>{const b=e.target.closest('[data-resource]');if(b&&G.bank[b.dataset.resource]){sheet.close();cb(b.dataset.resource)}};refreshIcons()})}
function openDev(){const p=G.players[0];openSheet('DESENVOLVIMENTO','Suas cartas',()=>{const playable=p.dev.filter(d=>d.type!=='vp');const counts={};p.dev.forEach(d=>counts[d.type]=(counts[d.type]||0)+1);$('#sheet-body').innerHTML=`<div class="choice-grid">${['knight','roadBuilding','yearPlenty','monopoly'].filter(t=>counts[t]).map(t=>`<button type="button" class="choice" data-dev="${t}" ${!playable.some(d=>d.type===t&&!d.new)||G.playedDev?'disabled':''}><b>${devName(t)}</b><small>${counts[t]} carta(s) · ${t==='knight'?'mova o ladrão':t==='roadBuilding'?'2 estradas grátis':t==='yearPlenty'?'pegue 2 recursos':'tome um recurso de todos'}</small></button>`).join('')||'<p>Nenhuma carta jogável.</p>'}</div>${counts.vp?`<p class="badge">${icon('trophy')} ${counts.vp} ponto(s) de vitória secreto(s)</p>`:''}`;$('#sheet-body').onclick=e=>{const b=e.target.closest('[data-dev]');if(b&&!b.disabled){sheet.close();playDev(b.dataset.dev)}};refreshIcons()})}
function openTrade(targetPid=null){const give=emptyRes(),want=emptyRes();if(targetPid!==null){clearTimeout(G.aiTimer);G.aiTimer=null}openSheet('COMÉRCIO',targetPid===null?'Monte sua proposta':`Proposta para ${NAMES[targetPid]}`,()=>{const rows=RES.map(r=>`<div class="trade-row"><span>${icon(ICON[r])} ${RNAME[r]}</span><div><small>VOCÊ DÁ</small><div class="stepper"><button type="button" data-side="give" data-step="-1" data-res="${r}">−</button><b data-count="give${r}">0</b><button type="button" data-side="give" data-step="1" data-res="${r}">+</button></div></div><div><small>VOCÊ PEDE</small><div class="stepper"><button type="button" data-side="want" data-step="-1" data-res="${r}">−</button><b data-count="want${r}">0</b><button type="button" data-side="want" data-step="1" data-res="${r}">+</button></div></div></div>`).join('');$('#sheet-body').innerHTML=rows+`<div class="sheet-actions">${targetPid===null?'<button type="button" class="action-btn secondary" id="bank-trade">Trocar com banco</button>':''}<button type="button" class="action-btn" id="ai-trade">Propor ${targetPid===null?'às IAs':''}</button></div>`;$('#sheet-body').onclick=e=>{const b=e.target.closest('[data-step]');if(!b)return;const obj=b.dataset.side==='give'?give:want,r=b.dataset.res,d=+b.dataset.step;const max=b.dataset.side==='give'?G.players[0].resources[r]:19;if(obj[r]+d>=0&&obj[r]+d<=max)obj[r]+=d;updateSteppers(give,'give');updateSteppers(want,'want')};if($('#bank-trade'))$('#bank-trade').onclick=()=>doBankTrade(give,want);$('#ai-trade').onclick=()=>doAITrade(give,want,targetPid);if(targetPid!==null)sheet.addEventListener('close',()=>{if(G.phase==='aiTradeWindow'&&G.active===targetPid)finishAITradeWindow(targetPid)},{once:true});refreshIcons()})}
function doBankTrade(give,want){const gs=RES.filter(r=>give[r]),ws=RES.filter(r=>want[r]);if(gs.length!==1||ws.length!==1||RES.reduce((s,r)=>s+want[r],0)!==1)return toast('No banco, peça exatamente 1 recurso.');const gr=gs[0],wr=ws[0];if(gr===wr)return toast('A troca deve envolver recursos diferentes.');const rate=tradeRate(G.players[0],gr);if(give[gr]!==rate)return toast(`Sua taxa para ${RNAME[gr]} é ${rate}:1.`);if(!G.bank[wr])return toast('O banco não possui esse recurso.');G.players[0].resources[gr]-=rate;G.bank[gr]+=rate;gain(G.players[0],wr);sheet.close();log(`Você trocou ${rate} ${RNAME[gr].toLowerCase()} por 1 ${RNAME[wr].toLowerCase()} no banco.`);render()}
function doAITrade(give,want,targetPid=null){if(!RES.some(r=>give[r])||!RES.some(r=>want[r])||RES.some(r=>give[r]&&want[r]))return toast('Inclua recursos diferentes nos dois lados.');if(RES.some(r=>give[r]>G.players[0].resources[r]))return toast('Você não possui todos os recursos oferecidos.');const value=o=>RES.reduce((s,r)=>s+o[r]*({wood:1.05,brick:1.05,wool:.9,grain:1.2,ore:1.25}[r]),0),candidates=targetPid===null?G.players.slice(1):[G.players[targetPid]];const ai=candidates.find(p=>RES.every(r=>p.resources[r]>=want[r])&&value(give)>=value(want)*.9);if(!ai)return toast(`${targetPid===null?'As IAs recusaram':NAMES[targetPid]+' recusou'} a proposta.`);RES.forEach(r=>{G.players[0].resources[r]-=give[r];ai.resources[r]+=give[r];ai.resources[r]-=want[r];G.players[0].resources[r]+=want[r]});log(`Troca pública: você entregou ${tradeDescription(give)} e ${ai.name} entregou ${tradeDescription(want)}.`);sheet.close();render()}
function openRules(){openSheet('GUIA RÁPIDO','Como jogar',()=>{$('#sheet-body').innerHTML=`<div class="rules-copy"><p>Esta partida usa o jogo-base oficial para 3 participantes: você e duas IAs. Todos lançam os dados; o maior resultado define quem começa. Vença ao alcançar <b>10 pontos no seu próprio turno</b>.</p><h3>Turno</h3><ol><li>Jogue no máximo 1 carta de desenvolvimento, se quiser.</li><li>Lance 2 dados. O número produz recursos para assentamentos (1) e cidades (2).</li><li>Comercie e construa em qualquer ordem. Encerre o turno quando quiser.</li></ol><h3>Custos</h3><p><span class="badge">Estrada: madeira + tijolo</span><span class="badge">Assentamento: madeira + tijolo + lã + trigo</span><span class="badge">Cidade: 2 trigo + 3 minério</span><span class="badge">Desenvolvimento: lã + trigo + minério</span></p><h3>Ladrão</h3><p>Ao sair 7, quem tiver mais de 7 recursos descarta metade (arredondada para baixo). Mova o ladrão para outro terreno: ele bloqueia a produção e permite roubar 1 carta aleatória de um vizinho.</p><h3>Pontos e limites</h3><p>Assentamento vale 1; cidade vale 2. Maior Estrada (ao menos 5, sem empates novos) e Maior Exército (ao menos 3 cavaleiros jogados) valem 2 cada. Pontos de Vitória das IAs permanecem secretos até o fim. Cada cor dispõe de 15 estradas, 5 assentamentos e 4 cidades.</p><h3>Comércio</h3><p>Negocie recursos com as IAs ou troque com o banco a 4:1. Portos melhoram a taxa para 3:1 ou 2:1. Trocas são públicas; não é permitido doar, trocar um recurso pelo mesmo tipo nem negociar promessas futuras.</p><p><b>Atalho:</b> pressione F para alternar tela cheia.</p></div>`})}
function openWinner(pid){setTimeout(()=>openSheet('PARTIDA ENCERRADA',pid===0?'A ilha é sua!':`${NAMES[pid]} venceu`,()=>{$('#sheet-body').innerHTML=`<div class="winner"><div class="winner-icon">${pid===0?'🏆':'⛵'}</div><h2>${calcVP(G.players[pid])} pontos</h2><p>${pid===0?'Você conectou a melhor rede da ilha.':'Tente variar os números iniciais e priorizar trigo e minério.'}</p><button type="button" class="action-btn wide" id="play-again">Jogar novamente</button></div>`;$('#play-again').onclick=()=>{sheet.close();newGame()}}),400)}

board.addEventListener('click',e=>{const v=e.target.closest('[data-vertex]'),ed=e.target.closest('[data-edge]'),t=e.target.closest('[data-tile]');if(v)handleVertex(+v.dataset.vertex);else if(ed)handleEdge(+ed.dataset.edge);else if(t&&G.phase==='robber'&&G.active===0)moveRobber(+t.dataset.tile)});
$('#actions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,p=G.players[0];if(a==='roll')rollDice();else if(a==='road')G.phase='buildRoad';else if(a==='settlement')G.phase='buildSettlement';else if(a==='city')G.phase='buildCity';else if(a==='cancel'){G.phase='main';G.freeRoads=0}else if(a==='buyDev'){buyDev(0)}else if(a==='dev')openDev();else if(a==='trade')openTrade(G.phase==='aiTradeWindow'?G.active:null);else if(a==='passTrade')finishAITradeWindow(G.active);else if(a==='resumeAI')resumeAI();else if(a==='end')endTurn();else if(a==='restart')newGame();render()});
$('#rules-btn').onclick=openRules;$('#new-game').onclick=()=>{if(confirm('Começar uma nova ilha?'))newGame()};$('#log-toggle').onclick=()=>$('#game-log').classList.toggle('open');
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}});
window.render_game_to_text=()=>{const reasons=G.active===0&&G.phase==='main'?constructionReasons(G.players[0]):{};return JSON.stringify({coordinateSystem:'SVG 720x650; origem no canto superior esquerdo; x →, y ↓',phase:G.phase,turn:G.turn+1,startingPlayer:NAMES[G.startingPlayer],activePlayer:NAMES[G.active],dice:G.dice,robberTile:G.robber,players:G.players.map(p=>({name:p.name,vp:visibleVP(p),resources:p.id===0?p.resources:total(p),roads:p.roads,settlements:p.settlements,cities:p.cities,knights:p.playedKnights,longest:p.longest})),buildAvailability:Object.fromEntries(Object.entries(reasons).map(([build,reason])=>[build,{available:!reason,reason}])),legal:{vertices:G.active===0?G.vertices.filter(v=>(G.phase==='setupSettlement'&&legalSettlement(v,0,true))||(G.phase==='buildSettlement'&&legalSettlement(v,0))||(G.phase==='buildCity'&&v.building?.player===0&&v.building.type==='settlement')).map(v=>v.id):[],edges:G.active===0?G.edges.filter(e=>(G.phase==='setupRoad'&&legalRoad(e,0,G.lastSetupVertex))||(G.phase==='buildRoad'&&legalRoad(e,0))).map(e=>e.id):[],robberTiles:G.active===0&&G.phase==='robber'?G.tiles.map((_,i)=>i).filter(i=>i!==G.robber):[]},winner:G.winner===null?null:NAMES[G.winner]})};
window.advanceTime=()=>render();
newGame();
setInterval(()=>{if(!G||G.active===0||G.winner!==null||G.aiActionTimer||G.aiTimer)return;if(G.phase==='aiTradeWindow'&&sheet.open)return;queueAI(()=>recoverAI(G.active),0)},2000);
