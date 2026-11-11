/* =========================================================================
   SLED RUN – Schlittenfahrt zu den Vokabeln von Year 6, Unit 2
   Der Schlitten faehrt eine Piste mit drei Spuren hinab. Oben steht das
   deutsche Wort, darunter drei Antworten - eine je Spur. Am naechsten Tor
   muss der Schlitten in der richtigen Spur sein. Unterwegs liegen Sterne
   (Punkte) und Felsen (kosten die Serie). Drei Herzen, zwanzig Tore.

   Dynamik: Jede richtige Antwort in Folge macht schneller, und schneller
   gibt mehr Punkte. Der Turbo verdoppelt drei Tore lang die Punkte, das
   Schild faengt ein falsches Tor ab. Pinguine am Pistenrand rutschen
   hinterher, jeder hebt die Punkte um ein Zehntel; ein falsches Tor kostet
   die Haelfte von ihnen. Eine Mindestlesezeit gilt immer, auch im Turbo.
   Nach drei Zieleinlaeufen faehrt auf Wunsch ein Pinguin den Schlitten.

   Wie beim Kletterspiel zaehlt nichts in die Lernfaecher; gespeichert
   werden nur Bestwerte (vt6:sled:v1). Die Vokabeln kommen aus
   ../climb/data.js, das tools/climb-daten.cjs aus der Vokabelseite erzeugt.

   Die Spiellogik (start, steer, update) braucht keine Zeichenflaeche,
   damit die Tests sie ohne Browser durchspielen koennen.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,KEY='vt6:sled:v1',M=window.SledMusik||null;
const $=id=>document.getElementById(id);
const menu=$('menu'),stage=$('stage'),over=$('over'),canvas=$('piste'),promptEl=$('prompt'),chips=$('chips');
let ctx=null;try{ctx=canvas.getContext?canvas.getContext('2d'):null;}catch(e){ctx=null;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ruhig=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ----------------------------------------------------------------- Regeln */
const GOAL=20,HEARTS=3,MAX_PENGUINS=12,UNLOCK=3;
const GAP=150;                         // Strecke zwischen zwei Toren (Welteinheiten)
const MIN_READ=3.5;                    // so viele Sekunden bleiben immer zum Lesen
const secondsFor=k=>k===0?8:Math.max(4.2,6.6-0.12*k);   // Grundzeit bis zum naechsten Tor
const tempoOf=streak=>1+0.05*Math.min(streak,8);        // Serie macht schneller, bis x1,4
const TURBO_GATES=3,TURBO_SPEED=1.45;
const gateSpeed=()=>GAP/Math.max(MIN_READ,secondsFor(G.k)/(tempoOf(G.streak)*(G.turbo>0?TURBO_SPEED:1)));
const multiplier=()=>tempoOf(G.streak)*(G.turbo>0?2:1)*(1+0.1*G.penguins);

let saved={best:{},finishes:{},rider:'kid'};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object'&&p.finishes&&typeof p.finishes==='object')saved={best:p.best,finishes:p.finishes,rider:p.rider==='penguin'?'penguin':'kid'};}catch(e){}
const totalFinishes=()=>Object.values(saved.finishes).reduce((a,b)=>a+(Number(b)||0),0);
const unlocked=()=>totalFinishes()>=UNLOCK;
const rider=()=>saved.rider==='penguin'&&unlocked()?'penguin':'kid';
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}

const ALL={id:'all',name:'Ganze Unit'};
const wordsOf=id=>id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||{words:[]}).words;
const pool=D.parts.flatMap(p=>p.words);

const G={mode:'menu',part:null,queue:[],k:0,q:null,options:[],gate:null,items:[],lane:1,x:0,
  speed:0,dist:0,hearts:HEARTS,score:0,streak:0,correct:0,stars:0,missed:new Map(),requeued:new Set(),
  t:0,result:null,paused:false,time:0,boost:0,shake:0,bits:[],won:false,finishZ:null,
  turbo:0,shield:false,penguins:0,maxPenguins:0,lost:[],popups:[],spray:[],sparks:[],trail:[],fov:1,shieldFx:0};

/* ------------------------------------------------------------- Ablauf */
function start(partId){
  const words=wordsOf(partId);if(words.length<3)return;
  let queue=[];while(queue.length<GOAL)queue=queue.concat(shuffle(words));
  Object.assign(G,{mode:'ride',part:partId,queue,k:0,q:null,options:[],gate:null,items:[],lane:1,x:0,
    speed:GAP/secondsFor(0),dist:0,hearts:HEARTS,score:0,streak:0,correct:0,stars:0,missed:new Map(),requeued:new Set(),
    t:0,result:null,paused:false,boost:0,shake:0,bits:[],won:false,finishZ:null,
    turbo:0,shield:false,penguins:0,maxPenguins:0,lost:[],popups:[],spray:[],sparks:[],trail:[],fov:1,shieldFx:0});
  menu.hidden=true;over.hidden=true;stage.hidden=false;
  resize();next();hud();loop();
  M?.stop();M?.start();musikKnopf();
}
function distractors(q){
  const others=pool.filter(w=>w.id!==q.id&&w.en!==q.en&&w.de!==q.de);
  const out=[];
  for(const w of [...shuffle(others.filter(w=>w.pos===q.pos)),...shuffle(others.filter(w=>w.pos!==q.pos))]){
    if(!out.some(o=>o.en===w.en))out.push(w);if(out.length===2)break;}
  return out;
}
function next(){
  G.q=G.queue.shift();G.options=shuffle([G.q,...distractors(G.q)]);G.result=null;G.mode='ride';
  G.gate={z:GAP,right:G.options.indexOf(G.q),labels:[null,null,null]};
  G.speed=gateSpeed();
  /* Unterwegs, jedes in seiner eigenen Reihe und alles vor dem Tor, damit
     die Spurwahl am Tor frei bleibt: Sterne, ein Power-up, Pinguine und ab
     dem vierten Tor Felsen - nie mehr als einer je Reihe. */
  const lane=()=>Math.floor(Math.random()*3);
  const starLane=lane();
  for(let n=0;n<3;n++)G.items.push({type:'star',lane:starLane,z:28+n*10});
  let power=null;
  if(G.k>=1&&G.turbo===0&&Math.random()<0.35)power='turbo';
  else if(G.k>=3&&!G.shield&&Math.random()<0.3)power='shield';
  if(power)G.items.push({type:power,lane:lane(),z:62});
  const pengs=G.k<2?1:Math.random()<0.5?2:1,pl=shuffle([0,1,2]);
  for(let n=0;n<pengs;n++)G.items.push({type:'penguin',lane:pl[n],z:78,seed:Math.random()});
  const rocks=G.k<3?0:G.k<10?1:2,rl=shuffle([0,1,2]);
  for(let n=0;n<rocks;n++)G.items.push({type:'rock',lane:rl[n],z:94+n*16});
  promptEl.textContent=G.q.de;
  chips.innerHTML=G.options.map((w,i)=>'<button data-lane="'+i+'" lang="en">'+esc(w.en)+'</button>').join('');
  chips.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>steer(Number(b.dataset.lane)));
  mark();
}
function mark(){
  chips.querySelectorAll('[data-lane]').forEach(b=>{const i=Number(b.dataset.lane);
    b.setAttribute('aria-pressed',String(i===G.lane));
    b.classList.toggle('right',!!G.result&&i===G.gate.right);
    b.classList.toggle('wrong',!!G.result&&!G.result.ok&&i===G.result.lane);});
}
function steer(lane){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  const before=G.lane;G.lane=clamp(lane,0,2);mark();
  /* Schneefontaene beim Spurwechsel - zur Seite, aus der man kommt */
  if(G.lane!==before&&!ruhig)for(let i=0;i<14;i++)G.spray.push({x:(Math.random()-.5)*20,y:0,vx:-(G.lane-before)*(60+Math.random()*120),vy:-60-Math.random()*140,r:2+Math.random()*4,life:0.7+Math.random()*0.3});
}
function popup(text,color){G.popups.push({text,color:color||'#FFC857',life:1.2});}
const move=dir=>steer(G.lane+dir);
function burst(x,colors,n){
  for(let i=0;i<n;i++)G.bits.push({x:x+(Math.random()-.5)*40,y:0,vx:(Math.random()-.5)*240,vy:-120-Math.random()*220,r:2+Math.random()*4,life:1,c:colors[i%colors.length]});
}
function passGate(){
  const ok=G.lane===G.gate.right;
  G.result={ok,lane:G.lane};G.t=0;G.mode='result';G.k++;
  if(ok){
    /* Punkte: Tempo x Turbo x Pinguine, auf Zehner gerundet */
    const pts=Math.round(100*multiplier()/10)*10;
    G.score+=pts;G.streak++;G.correct++;G.boost=0.7;
    if(G.turbo>0)G.turbo--;
    popup('+'+pts,G.turbo>0||pts>=200?'#FF9A3C':'#FFC857');
    burst(0,['#FFC857','#7FE0D0','#FF7A59','#FFFFFF'],26);
    window.LearningFeedback?.signal('ok');
  }else{
    G.streak=0;G.shake=0.5;G.turbo=0;G.missed.set(G.q.id,G.q);
    M?.fehler();
    if(G.shield){G.shield=false;G.shieldFx=1;popup('Schild hält!','#7FE0D0');}
    else G.hearts--;
    const lost=Math.ceil(G.penguins/2);loosePenguins(lost);
    if(!G.requeued.has(G.q.id)){G.requeued.add(G.q.id);G.queue.splice(Math.min(3,G.queue.length),0,G.q);}
    burst(0,['#FFFFFF','#DCEBFA','#B9D3EC'],30);
    window.LearningFeedback?.signal('no');
  }
  mark();hud();
}
function loosePenguins(n){
  for(let i=0;i<n&&G.penguins>0;i++){G.penguins--;G.lost.push({x:(Math.random()-.5)*60,y:30+i*6,vx:(Math.random()<.5?-1:1)*(80+Math.random()*120),vy:-140-Math.random()*120,rot:0,vr:(Math.random()-.5)*12,life:1.4});}
  if(n>0)popup('−'+n+' Pinguin'+(n>1?'e':''),'#A9D8FF');
}
function passItem(it){
  if(Math.abs(G.x-(it.lane-1))>=0.5)return;
  if(it.type==='star'){G.score+=10;G.stars++;it.taken=true;burst(0,['#FFC857','#FFE9A8'],6);}
  else if(it.type==='penguin'){
    it.taken=true;
    if(G.penguins<MAX_PENGUINS){G.penguins++;G.maxPenguins=Math.max(G.maxPenguins,G.penguins);popup('+1 Pinguin','#FFFFFF');}
    else{G.score+=20;popup('+20','#FFFFFF');}
  }
  else if(it.type==='turbo'){
    it.taken=true;G.turbo=TURBO_GATES;popup('TURBO ×2','#FF9A3C');
    /* sofort schneller - aber nie unter die Mindestlesezeit */
    G.speed=Math.max(G.speed,Math.min(G.speed*TURBO_SPEED,GAP/MIN_READ));
    burst(0,['#FF9A3C','#FFC857','#FF5A4F'],16);
  }
  else if(it.type==='shield'){it.taken=true;G.shield=true;popup('Schild','#7FE0D0');burst(0,['#7FE0D0','#FFFFFF'],14);}
  else{G.streak=0;G.score=Math.max(0,G.score-30);G.shake=0.35;it.hit=true;loosePenguins(Math.min(1,G.penguins));burst(0,['#FFFFFF','#DCEBFA'],18);window.LearningFeedback?.signal('no');}
  hud();
}
function update(dt){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  /* Kurz vor dem letzten Tor laeuft die Zeit langsamer - wie im Fernsehen. */
  if(!ruhig&&G.mode==='ride'&&G.k===GOAL-1&&G.gate.z<20)dt*=0.45;
  G.time+=dt;
  if(G.boost>0)G.boost-=dt;if(G.shake>0)G.shake-=dt;if(G.shieldFx>0)G.shieldFx-=dt*1.5;
  for(const b of G.bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=520*dt;b.life-=dt*1.3;}
  G.bits=G.bits.filter(b=>b.life>0);
  for(const b of G.spray){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=420*dt;b.life-=dt*1.4;}
  G.spray=G.spray.filter(b=>b.life>0);
  for(const b of G.lost){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=480*dt;b.rot+=b.vr*dt;b.life-=dt;}
  G.lost=G.lost.filter(b=>b.life>0);
  for(const p of G.popups)p.life-=dt;G.popups=G.popups.filter(p=>p.life>0);
  for(const f of G.sparks){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=60*dt;f.vx*=1-dt*0.8;f.life-=dt*0.7;}
  G.sparks=G.sparks.filter(f=>f.life>0);
  G.fov+=((G.turbo>0?1.07:1)-G.fov)*Math.min(1,dt*3);
  G.trail.unshift(G.x);if(G.trail.length>90)G.trail.length=90;
  if(M&&G.mode!=='celebrate'){M.tempo(tempoOf(G.streak)*(G.turbo>0?TURBO_SPEED:1));M.turbo(G.turbo>0);}
  G.x+=((G.lane-1)-G.x)*Math.min(1,dt*(ruhig?40:11));
  /* Nach einem falschen Tor bremst der Schlitten kurz ab. */
  const factor=G.mode==='result'&&!G.result.ok?0.45:G.boost>0?1.2:1;
  const step=G.speed*factor*dt;G.dist+=step;
  for(const it of G.items){const before=it.z;it.z-=step;if(before>0&&it.z<=0&&!it.taken&&!it.hit)passItem(it);}
  G.items=G.items.filter(it=>it.z>-14&&!it.taken);
  if(G.gate)G.gate.z-=step;
  if(G.finishZ!==null)G.finishZ-=step;
  if(G.mode==='ride'){
    if(G.gate.z<=0)passGate();
  }else if(G.mode==='result'){
    G.t+=dt;
    if(G.t>=(G.result.ok?0.5:1.5)){
      if(G.hearts<=0)return finish(false);
      if(G.k>=GOAL){G.mode='finish';G.t=0;G.finishZ=70;G.gate=null;promptEl.textContent='Ziel in Sicht!';chips.innerHTML='';}
      else next();
    }
  }else if(G.mode==='finish'){
    if(G.finishZ<=-6){G.mode='celebrate';G.t=0;promptEl.textContent='Im Ziel!';M?.ziel();}
  }else if(G.mode==='celebrate'){
    /* Feuerwerk ueber dem Ziel, dann der Abschluss */
    G.t+=dt;G.speed*=1-Math.min(1,dt*1.2);
    if(!ruhig&&Math.random()<dt*4.5)firework();
    if(G.t>=(ruhig?0.4:2.4))finish(true);
  }
}
function firework(){
  const x=40+Math.random()*(W-80),y=30+Math.random()*HOR*0.7,cols=['#FFC857','#FF7A59','#7FE0D0','#B993FF','#FFFFFF','#FF5A9E'],c=cols[Math.floor(Math.random()*cols.length)];
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2,v=60+Math.random()*50;G.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c});}
}
function finish(won){
  G.mode='over';G.won=won;
  if(!won)M?.sturz();
  const id=G.part,old=saved.best[id]||0,record=G.score>old;
  if(record)saved.best[id]=G.score;
  const before=unlocked();
  if(won)saved.finishes[id]=(saved.finishes[id]||0)+1;
  const fresh=!before&&unlocked();
  save();
  const missed=[...G.missed.values()];
  stage.hidden=true;over.hidden=false;
  over.innerHTML='<h1>'+(won?'Im Ziel!':'Sturz im Schnee.')+'</h1>'
    +'<p class="result">'+G.k+' von '+GOAL+' Toren · '+G.score+' Punkte'+(record&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
    +'<p class="penguins">'+(won?'🐧 Du hast '+G.penguins+' Pinguin'+(G.penguins===1?'':'e')+' ins Tal gebracht!':'🐧 Bis zu '+G.maxPenguins+' Pinguin'+(G.maxPenguins===1?'':'e')+' sind mitgerutscht.')+'</p>'
    +(fresh?'<p class="unlock">Neu freigeschaltet: Der Pinguin kann jetzt deinen Schlitten fahren!</p>':'')
    +'<p class="muted">'+G.correct+' Tore richtig · '+G.stars+' Sterne · Bestwert: '+(saved.best[id]||0)+' Punkte</p>'
    +'<div class="actions"><button id="again" class="go">Nochmal fahren</button><button id="toMenu">Anderen Abschnitt wählen</button></div>'
    +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')
      +'</ul><p><a class="train" href="../">Unit 2 im Vokabeltrainer üben →</a></p>':'<p class="muted">Jedes Tor richtig – stark!</p>');
  $('again').onclick=()=>start(id);$('toMenu').onclick=showMenu;
  const h=over.querySelector('h1');h.tabIndex=-1;h.focus();
  window.LearningFeedback?.tone?.('done');
}
function hud(){
  $('gates').textContent='Tor '+Math.min(G.k+1,GOAL)+'/'+GOAL;
  $('points').textContent=G.score+' P';
  $('hearts').textContent='♥'.repeat(Math.max(0,G.hearts))+'♡'.repeat(HEARTS-Math.max(0,G.hearts));
  $('hearts').setAttribute('aria-label',Math.max(0,G.hearts)+' von '+HEARTS+' Herzen');
}
function showRiders(){
  const box=$('riders');if(!box)return;
  const missing=Math.max(0,UNLOCK-totalFinishes());
  box.innerHTML='<button data-rider="kid" aria-pressed="'+(rider()==='kid')+'"><span class="r-icon" aria-hidden="true">🛷</span><span>Rodelkind</span></button>'
    +'<button data-rider="penguin" aria-pressed="'+(rider()==='penguin')+'"'+(unlocked()?'':' disabled')+'><span class="r-icon" aria-hidden="true">🐧</span><span>Pinguin'
    +(unlocked()?'':'<small>noch '+missing+'× ins Ziel</small>')+'</span></button>';
  box.querySelectorAll('[data-rider]').forEach(b=>b.onclick=()=>{if(b.disabled)return;saved.rider=b.dataset.rider;save();showRiders();});
}
function showMenu(){
  G.mode='menu';stage.hidden=true;over.hidden=true;menu.hidden=false;showRiders();M?.stop();musikKnopf();
  $('levels').innerHTML=[...D.parts,ALL].map(p=>{
    const n=wordsOf(p.id).length,best=saved.best[p.id]||0,fin=saved.finishes[p.id]||0;
    return '<button data-part="'+p.id+'"'+(p.id==='all'?' class="all"':'')+'><span class="l-name">'+esc(p.name)+'</span>'
      +'<span class="l-info">'+n+' Wörter'+(best?' · Bestwert '+best+' P':'')+(fin?' · '+fin+'× im Ziel':'')+'</span></button>';
  }).join('');
  $('levels').querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>start(b.dataset.part));
}
function pause(on){
  if(G.mode==='menu'||G.mode==='over')return;
  G.paused=on;$('pause').textContent=on?'▶':'II';$('pause').setAttribute('aria-label',on?'Weiter':'Pause');
  M?.pause(on);
}
/* Musik an/aus - im Spiel und im Menue, die Wahl bleibt gespeichert */
function musikKnopf(){
  const an=!M||M.an;
  for(const id of ['musik','musikMenu']){const b=$(id);if(!b)continue;
    b.setAttribute('aria-pressed',String(an));b.classList.toggle('aus',!an);
    if(id==='musikMenu')b.textContent=an?'♫ Musik: an':'♫ Musik: aus';
    b.hidden=!M||!M.verfuegbar;}
}
function musikUmschalten(){
  if(!M)return;M.setze(!M.an);
  if(M.an&&!stage.hidden&&G.mode!=='over'&&G.mode!=='celebrate'){M.start();if(G.paused)M.pause(true);}
  musikKnopf();
}

/* ----------------------------------------------------------- Steuerung */
let touch=null;
canvas.addEventListener('pointerdown',e=>{
  if(G.paused)return pause(false);
  touch={x:e.clientX,start:e.clientX,moved:false};
  try{canvas.setPointerCapture(e.pointerId);}catch(err){}
});
canvas.addEventListener('pointermove',e=>{
  if(!touch)return;const dx=e.clientX-touch.x;
  if(Math.abs(dx)>=26){move(dx>0?1:-1);touch.x=e.clientX;touch.moved=true;}   // Wischen, auch mehrfach
});
canvas.addEventListener('pointerup',e=>{
  if(!touch)return;
  if(!touch.moved){const r=canvas.getBoundingClientRect();move(e.clientX<r.left+r.width/2?-1:1);}   // Tippen: links oder rechts
  touch=null;
});
canvas.addEventListener('pointercancel',()=>{touch=null;});
document.addEventListener('keydown',e=>{
  if(stage.hidden)return;
  if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();move(1);}
  else if(e.key==='1'||e.key==='2'||e.key==='3'){e.preventDefault();steer(Number(e.key)-1);}
  else if(e.key===' '||e.key==='p'||e.key==='Escape'){e.preventDefault();pause(!G.paused);}
  else if(e.key==='m'){e.preventDefault();musikUmschalten();}
});
$('pause').onclick=()=>pause(!G.paused);
if($('musik'))$('musik').onclick=musikUmschalten;
if($('musikMenu'))$('musikMenu').onclick=musikUmschalten;
$('quit').onclick=showMenu;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('resize',resize);

/* ============================================================ Zeichnen
   Die Piste ist eine einfache Zentralperspektive: Was z Einheiten voraus
   liegt, wird mit CAM/(CAM+z) verkleinert und rueckt zum Horizont. */
const W=360;let H=520,HOR=170,GY=420;
const CAM=24,LW=92,ZFAR=190;
const FONT='Inter,system-ui,-apple-system,"Segoe UI",sans-serif';
const LANE=['#FF7A59','#3CCFBE','#FFC857'];
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const sc=z=>CAM/(CAM+Math.max(z,-CAM*0.62));
let curve=0;
const bend=s=>curve*(1-s)*(1-s)*120;
const PX=(x,z)=>{const s=sc(z);return W/2+bend(s)+x*LW*s;};
const PY=z=>HOR+(GY-HOR)*sc(z);
const mixc=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';
function resize(){
  if(!ctx||stage.hidden)return;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,3);
  H=Math.round(W*r.height/r.width);HOR=Math.round(H*0.33);GY=Math.round(H*0.80);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  if(G.gate)G.gate.labels=[null,null,null];
}
function rounded(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawSky(p){
  /* Vom hellen Nachmittag ins Alpengluehen: p ist der Weg bis ins Ziel. */
  const g=ctx.createLinearGradient(0,0,0,HOR+6);
  g.addColorStop(0,mixc([64,150,232],[38,36,98],p));
  g.addColorStop(.6,mixc([150,205,246],[190,84,122],p));
  g.addColorStop(1,mixc([226,243,255],[255,170,110],p));
  ctx.fillStyle=g;ctx.fillRect(-70,-70,W+140,HOR+76);
  if(p>0.45){ctx.fillStyle='rgba(255,255,255,'+((p-0.45)*1.4)+')';
    for(let i=0;i<26;i++){const tw=0.5+0.5*Math.sin(G.time*2+i*3);ctx.globalAlpha=(p-0.45)*1.5*tw;ctx.fillRect(rnd(i)*W,rnd(i+40)*HOR*0.6,1.6,1.6);}ctx.globalAlpha=1;}
  const sx=W*0.72-curve*14,sunY=HOR*(0.34+0.5*p);
  const halo=ctx.createRadialGradient(sx,sunY,4,sx,sunY,90);halo.addColorStop(0,'rgba(255,240,200,.85)');halo.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle=halo;ctx.fillRect(sx-90,sunY-90,180,180);
  ctx.fillStyle=mixc([255,250,225],[255,214,150],p);ctx.beginPath();ctx.arc(sx,sunY,20,0,7);ctx.fill();
  for(let i=0;i<4;i++){const cx=((rnd(i+7)*W*1.6+G.time*(4+i*2))%(W+160))-80,cy=HOR*(0.14+rnd(i+70)*0.4);
    ctx.fillStyle='rgba(255,255,255,'+(0.55-0.3*p)+')';
    ctx.beginPath();ctx.ellipse(cx,cy,34,9,0,0,7);ctx.ellipse(cx+22,cy+4,26,8,0,0,7);ctx.ellipse(cx-20,cy+5,22,7,0,0,7);ctx.fill();}
  /* Nordlicht in der zweiten Haelfte: drei wehende Baender */
  if(p>0.35&&!lite){
    const a=clamp((p-0.35)*2.2,0,1);
    for(let b=0;b<3;b++){
      const c=b===1?'150,110,255':b===2?'90,220,255':'70,255,170',y0=HOR*(0.06+b*0.09);
      const g2=ctx.createLinearGradient(0,y0-10,0,y0+80);
      g2.addColorStop(0,'rgba('+c+',0)');g2.addColorStop(.45,'rgba('+c+','+(0.34*a)+')');g2.addColorStop(1,'rgba('+c+',0)');
      ctx.fillStyle=g2;ctx.beginPath();
      for(let x=-70;x<=W+70;x+=18)ctx.lineTo(x,y0+Math.sin(x*0.018+G.time*0.55+b*2)*16+Math.sin(x*0.006-G.time*0.25)*12);
      for(let x=W+70;x>=-70;x-=18)ctx.lineTo(x,y0+64+b*8+Math.sin(x*0.022+G.time*0.5+b*2+0.8)*12);
      ctx.closePath();ctx.fill();
    }
  }
  /* Drei Bergketten mit Schneekappen, leicht gegen die Kurve verschoben */
  const layers=[{h:0.62,c:[[150,178,220],[98,74,128]],off:8,seed:3},{h:0.44,c:[[112,146,200],[72,56,108]],off:16,seed:11},{h:0.26,c:[[80,118,178],[48,44,88]],off:26,seed:23}];
  for(const L of layers){
    const pts=[];for(let i=-2;i<=14;i++){const x=i*32-curve*L.off;pts.push([x,HOR-HOR*L.h*(0.45+0.55*rnd(i+L.seed))*(i%2?1:0.62)]);}
    ctx.fillStyle=mixc(L.c[0],L.c[1],p);ctx.beginPath();ctx.moveTo(-70,HOR+4);for(const q of pts)ctx.lineTo(q[0],q[1]);ctx.lineTo(W+70,HOR+4);ctx.closePath();ctx.fill();
    ctx.fillStyle=mixc([255,255,255],[255,196,170],p);ctx.globalAlpha=0.85;
    for(let i=1;i<pts.length-1;i+=2){const [x,y]=pts[i],[lx,ly]=pts[i-1],[rx,ry]=pts[i+1],t=0.3;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(lx-x)*t,y+(ly-y)*t);ctx.lineTo(x+(lx-x)*t*0.4,y+(ly-y)*t*0.75);ctx.lineTo(x+(rx-x)*t*0.5,y+(ry-y)*t*1.1);ctx.lineTo(x+(rx-x)*t,y+(ry-y)*t);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;
  }
}
function drawGround(p){
  const g=ctx.createLinearGradient(0,HOR,0,H);
  g.addColorStop(0,mixc([196,222,246],[214,150,160],p));g.addColorStop(1,mixc([232,243,253],[236,214,226],p));
  ctx.fillStyle=g;ctx.fillRect(-70,HOR,W+140,H-HOR+80);
  /* Piste: aus Abschnitten, damit sie der Kurve folgt */
  const zs=[];for(let i=0;i<=26;i++){const s=0.112+(2.6-0.112)*Math.pow(i/26,2.2);zs.push(CAM/s-CAM);}
  const edge=1.62;
  ctx.fillStyle=mixc([250,253,255],[255,240,236],p);ctx.beginPath();
  zs.forEach((z,i)=>{const x=PX(-edge,z),y=PY(z);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  for(let i=zs.length-1;i>=0;i--)ctx.lineTo(PX(edge,zs[i]),PY(zs[i]));
  ctx.closePath();ctx.fill();
  /* Querbaender und Spurlinien wandern mit der Fahrt */
  const B=9,off=G.dist%(2*B);
  for(let z=-2*B-off;z<ZFAR;z+=2*B){
    const a=Math.max(z,-12),b=Math.min(z+B,ZFAR);if(b<=a)continue;
    ctx.fillStyle='rgba(120,170,225,'+(0.11*Math.min(1,sc(a)*2))+')';
    ctx.beginPath();ctx.moveTo(PX(-edge,a),PY(a));ctx.lineTo(PX(edge,a),PY(a));ctx.lineTo(PX(edge,b),PY(b));ctx.lineTo(PX(-edge,b),PY(b));ctx.closePath();ctx.fill();
    for(const lx of [-0.5,0.5]){const w=0.035;ctx.fillStyle='rgba(70,130,200,.38)';
      ctx.beginPath();ctx.moveTo(PX(lx-w,a),PY(a));ctx.lineTo(PX(lx+w,a),PY(a));ctx.lineTo(PX(lx+w,b),PY(b));ctx.lineTo(PX(lx-w,b),PY(b));ctx.closePath();ctx.fill();}
  }
  /* Pistenrand mit weichem Schatten */
  for(const side of [-1,1]){ctx.strokeStyle='rgba(90,140,200,.35)';ctx.lineWidth=2;ctx.beginPath();
    zs.forEach((z,i)=>{const x=PX(side*edge,z),y=PY(z);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  const haze=ctx.createLinearGradient(0,HOR-2,0,HOR+46);haze.addColorStop(0,mixc([226,243,255],[255,176,128],p));haze.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalAlpha=0.9;ctx.fillStyle=haze;ctx.fillRect(-70,HOR-2,W+140,48);ctx.globalAlpha=1;
}
function tree(x,z,seed){
  const s=sc(z),X=PX(x,z),Y=PY(z),h=(96+rnd(seed)*60)*s,w=h*0.46;
  ctx.globalAlpha=clamp((s-0.115)*9,0,1);
  ctx.fillStyle='rgba(60,100,160,.22)';ctx.beginPath();ctx.ellipse(X+w*0.25,Y,w*0.7,h*0.07,0,0,7);ctx.fill();
  ctx.fillStyle='#5A4636';ctx.fillRect(X-w*0.07,Y-h*0.16,w*0.14,h*0.18);
  for(let i=0;i<3;i++){const by=Y-h*(0.12+i*0.25),ty=by-h*0.42,hw=w*(0.5-i*0.11);
    ctx.fillStyle=i%2?'#1F6B57':'#195546';ctx.beginPath();ctx.moveTo(X-hw,by);ctx.lineTo(X,ty);ctx.lineTo(X+hw,by);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.moveTo(X,ty);ctx.lineTo(X-hw*0.5,ty+(by-ty)*0.5);ctx.lineTo(X-hw*0.16,ty+(by-ty)*0.4);ctx.lineTo(X+hw*0.1,ty+(by-ty)*0.56);ctx.lineTo(X+hw*0.42,ty+(by-ty)*0.42);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;
}
function pole(side,z,n){
  const s=sc(z),X=PX(side*1.72,z),Y=PY(z),h=44*s;
  ctx.globalAlpha=clamp((s-0.115)*9,0,1);
  ctx.strokeStyle='#33415C';ctx.lineWidth=Math.max(1,3*s);ctx.beginPath();ctx.moveTo(X,Y);ctx.lineTo(X,Y-h);ctx.stroke();
  ctx.fillStyle=n%2?'#FF5A4F':'#2F7BE0';ctx.beginPath();ctx.moveTo(X,Y-h);ctx.lineTo(X+side*-16*s,Y-h+6*s+Math.sin(G.time*8+n)*2*s);ctx.lineTo(X,Y-h+13*s);ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;
}
function fitLabel(text,max,size){
  ctx.font='800 '+size+'px '+FONT;
  const words=text.split(' ');let lines=[],line='';
  for(const w of words){const probe=line?line+' '+w:w;if(ctx.measureText(probe).width<=max||!line)line=probe;else{lines.push(line);line=w;}}
  if(line)lines.push(line);
  if(lines.length>2){lines=lines.slice(0,2);lines[1]=lines[1].replace(/.{0,2}$/,'…');}
  return lines;
}
function drawGate(z,finish){
  if(z>ZFAR||z<-CAM*0.6)return;
  const s=sc(z),Y=PY(z),xl=PX(-1.7,z),xr=PX(1.7,z),hp=168*s,beam=20*s;
  /* Hinter dem Schlitten verblasst das Tor, damit es ihn nicht verdeckt. */
  ctx.globalAlpha=clamp((s-0.115)*9,0,1)*clamp(1+z/7,0,1);if(ctx.globalAlpha<=0){ctx.globalAlpha=1;return;}
  ctx.fillStyle='rgba(60,100,160,.22)';ctx.fillRect(xl,Y-3*s,xr-xl,6*s);
  for(const x of [xl,xr]){ctx.fillStyle='#33415C';ctx.fillRect(x-5*s,Y-hp,10*s,hp);ctx.fillStyle='#FF7A59';for(let i=0;i<4;i++)ctx.fillRect(x-5*s,Y-hp+(i*2+0.5)*hp/8,10*s,hp/8*0.9);}
  if(finish){
    const n=14,cw=(xr-xl)/n,ch=beam*0.9;
    for(let r=0;r<2;r++)for(let i=0;i<n;i++){ctx.fillStyle=(i+r)%2?'#151B2B':'#FFFFFF';ctx.fillRect(xl+i*cw,Y-hp+r*ch,cw+0.5,ch+0.5);}
    if(s>0.3){ctx.fillStyle='#151B2B';rounded(W/2+bend(s)-58*s,Y-hp+ch*2+6*s,116*s,34*s,8*s);ctx.fill();
      ctx.fillStyle='#FFC857';ctx.font='900 '+(20*s)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FINISH',W/2+bend(s),Y-hp+ch*2+24*s);}
    ctx.globalAlpha=1;return;
  }
  ctx.fillStyle='#1B2233';rounded(xl-6*s,Y-hp-beam*0.4,xr-xl+12*s,beam,6*s);ctx.fill();
  for(let i=0;i<3;i++){
    const cx=PX(i-1,z),bw=86*s,bh=58*s,by=Y-hp+beam*0.6;
    let col=LANE[i],glow=null;
    if(G.result){if(i===G.gate.right){col='#35C46A';glow='#35C46A';}else if(!G.result.ok&&i===G.result.lane){col='#E0413B';}}
    if(glow){ctx.shadowColor=glow;ctx.shadowBlur=lite?0:24*s;}
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(cx-bw/2,by);ctx.lineTo(cx+bw/2,by);ctx.lineTo(cx+bw/2,by+bh);ctx.lineTo(cx,by+bh+10*s);ctx.lineTo(cx-bw/2,by+bh);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(cx-bw/2,by,bw,5*s);
    if(s>0.36&&G.options[i]){
      const size=Math.max(6,13*s);
      const key=Math.round(size);if(!G.gate.labels[i]||G.gate.labels[i].key!==key)G.gate.labels[i]={key,lines:fitLabel(G.options[i].en,bw-8*s,size)};
      const lines=G.gate.labels[i].lines;
      ctx.fillStyle='#151B2B';ctx.font='800 '+size+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
      lines.forEach((l,n)=>ctx.fillText(l,cx,by+bh/2+(n-(lines.length-1)/2)*size*1.15+2*s));
    }
  }
  ctx.globalAlpha=1;
}
function drawItem(it){
  const s=sc(it.z),X=PX(it.lane-1,it.z),Y=PY(it.z);
  ctx.globalAlpha=clamp((s-0.115)*9,0,1);
  if(it.type==='star'){
    const r=15*s,cy=Y-22*s+Math.sin(G.time*5+it.z)*3*s,spin=Math.cos(G.time*4+it.lane);
    ctx.fillStyle='rgba(60,100,160,.2)';ctx.beginPath();ctx.ellipse(X,Y,r*0.8,r*0.22,0,0,7);ctx.fill();
    ctx.shadowColor='#FFC857';ctx.shadowBlur=lite?0:14*s;ctx.fillStyle='#FFC857';ctx.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;ctx.lineTo(X+Math.cos(a)*rr*(0.35+0.65*Math.abs(spin)),cy+Math.sin(a)*rr);}
    ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(X-r*0.2,cy-r*0.25,r*0.16,0,7);ctx.fill();
  }else if(it.type==='penguin'){
    drawPenguin(X,Y,0.95*s,{wave:Math.sin(G.time*9+it.seed*6),hop:Math.abs(Math.sin(G.time*5+it.seed*9))*6*s});
  }else if(it.type==='turbo'||it.type==='shield'){
    const r=19*s,cy=Y-30*s+Math.sin(G.time*4+it.z)*4*s,col=it.type==='turbo'?'#FF8A3C':'#3CCFBE';
    ctx.fillStyle='rgba(60,100,160,.2)';ctx.beginPath();ctx.ellipse(X,Y,r*0.9,r*0.25,0,0,7);ctx.fill();
    if(!lite){ctx.shadowColor=col;ctx.shadowBlur=22*s;}
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(X,cy,r,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.4*s;ctx.beginPath();ctx.arc(X,cy,r*0.82,G.time*3,G.time*3+4.2);ctx.stroke();
    ctx.fillStyle='#FFFFFF';
    if(it.type==='turbo'){ /* Rakete */
      ctx.beginPath();ctx.moveTo(X,cy-r*0.62);ctx.quadraticCurveTo(X+r*0.34,cy-r*0.2,X+r*0.24,cy+r*0.36);ctx.lineTo(X-r*0.24,cy+r*0.36);ctx.quadraticCurveTo(X-r*0.34,cy-r*0.2,X,cy-r*0.62);ctx.fill();
      ctx.fillStyle='#FFC857';ctx.beginPath();ctx.moveTo(X-r*0.16,cy+r*0.4);ctx.lineTo(X,cy+r*(0.72+0.1*Math.sin(G.time*30)));ctx.lineTo(X+r*0.16,cy+r*0.4);ctx.fill();
    }else{ /* Schild */
      ctx.beginPath();ctx.moveTo(X,cy-r*0.58);ctx.lineTo(X+r*0.44,cy-r*0.38);ctx.quadraticCurveTo(X+r*0.4,cy+r*0.32,X,cy+r*0.6);ctx.quadraticCurveTo(X-r*0.4,cy+r*0.32,X-r*0.44,cy-r*0.38);ctx.closePath();ctx.fill();
      ctx.fillStyle=col;ctx.fillRect(X-r*0.05,cy-r*0.36,r*0.1,r*0.7);ctx.fillRect(X-r*0.26,cy-r*0.08,r*0.52,r*0.1);
    }
  }else{
    const r=30*s;
    ctx.fillStyle='rgba(60,100,160,.28)';ctx.beginPath();ctx.ellipse(X+r*0.2,Y,r*1.1,r*0.28,0,0,7);ctx.fill();
    ctx.fillStyle='#6E7A90';ctx.beginPath();ctx.moveTo(X-r,Y);ctx.lineTo(X-r*0.72,Y-r*0.86);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r,Y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4E586C';ctx.beginPath();ctx.moveTo(X+r*0.1,Y);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r,Y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.moveTo(X-r*0.72,Y-r*0.86);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r*0.3,Y-r*0.7);ctx.lineTo(X-r*0.05,Y-r*0.86);ctx.lineTo(X-r*0.4,Y-r*0.62);ctx.closePath();ctx.fill();
  }
  ctx.globalAlpha=1;
}
/* Pinguin: aufrecht (am Pistenrand, als Fahrer) oder baeuchlings rutschend */
function drawPenguin(X,Y,k,o){
  o=o||{};const hop=o.hop||0,wave=o.wave||0;
  ctx.save();ctx.translate(X,Y-hop);ctx.scale(k,k);if(o.rot)ctx.rotate(o.rot);
  if(o.slide){
    ctx.fillStyle='rgba(50,90,150,.25)';ctx.beginPath();ctx.ellipse(0,4,20,5,0,0,7);ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.ellipse(0,-4,19,10,0,0,7);ctx.fill();
    ctx.strokeStyle='#1B2233';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-14,-4);ctx.lineTo(-25,-8+wave*4);ctx.moveTo(14,-4);ctx.lineTo(25,-8-wave*4);ctx.stroke();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(0,-14,9,0,7);ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(0,-12,6,5.5,0,0,7);ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-2.4,-13.5,1.4,0,7);ctx.arc(2.4,-13.5,1.4,0,7);ctx.fill();
    ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.moveTo(-2.5,-10.5);ctx.lineTo(2.5,-10.5);ctx.lineTo(0,-7);ctx.closePath();ctx.fill();
    ctx.restore();return;
  }
  ctx.fillStyle='rgba(50,90,150,.25)';ctx.beginPath();ctx.ellipse(0,hop/k+1,15,4,0,0,7);ctx.fill();
  ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.ellipse(-6,0,6,2.6,0,0,7);ctx.ellipse(6,0,6,2.6,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.ellipse(0,-17,13,18,0,0,7);ctx.fill();
  ctx.strokeStyle='#1B2233';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-11,-22);ctx.lineTo(-17,-10+wave*-6);ctx.moveTo(11,-22);ctx.lineTo(18,-12+wave*7);ctx.stroke();
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(0,-13,8.5,13,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(0,-34,10,0,7);ctx.fill();
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(-3.6,-34,3.6,4.2,0,0,7);ctx.ellipse(3.6,-34,3.6,4.2,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-3,-33.5,1.7,0,7);ctx.arc(3,-33.5,1.7,0,7);ctx.fill();
  ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.moveTo(-3.4,-30);ctx.lineTo(3.4,-30);ctx.lineTo(0,-25.5);ctx.closePath();ctx.fill();
  if(o.blush){ctx.fillStyle='rgba(255,120,140,.55)';ctx.beginPath();ctx.arc(-7,-29,2.2,0,7);ctx.arc(7,-29,2.2,0,7);ctx.fill();}
  if(o.scarf){ctx.strokeStyle='#3CCFBE';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-9,-25);ctx.lineTo(9,-25);ctx.moveTo(6,-25);ctx.quadraticCurveTo(18+wave*3,-30,26+wave*5,-22+wave*4);ctx.stroke();}
  if(o.goggles){ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(0,-38,10.5,Math.PI,0);ctx.fill();ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.arc(0,-48,3.6,0,7);ctx.fill();}
  ctx.restore();
}
/* Die Pinguin-Kette rutscht in Schlangenlinie hinterher - sie folgt der
   Spur, die der Schlitten vor ein paar Augenblicken gefahren ist. */
function drawChain(){
  for(let i=G.penguins-1;i>=0;i--){
    const lag=Math.min(G.trail.length-1,6+i*5),x=(G.trail[lag]??G.x),side=i%2?1:-1;
    const X=W/2+x*LW+side*(16+Math.min(i,6)*2),Y=GY+30+Math.floor(i/2)*15,k=0.62-Math.min(i,10)*0.012;
    if(Y>H+20)continue;
    drawPenguin(X,Y,k,{slide:true,wave:Math.sin(G.time*10+i)});
  }
  for(const b of G.lost){ctx.globalAlpha=clamp(b.life,0,1);drawPenguin(W/2+G.x*LW+b.x,GY+b.y,0.6,{slide:true,rot:b.rot,wave:1});}
  ctx.globalAlpha=1;
}
function drawSled(){
  const X=W/2+G.x*LW,Y=GY,lean=clamp(((G.lane-1)-G.x)*0.55,-0.42,0.42),fast=G.speed/30;
  const bob=ruhig?0:Math.sin(G.time*17)*1.3*fast,hit=G.mode==='result'&&G.result&&!G.result.ok?Math.sin(G.t*30)*(1.5-G.t)*4:0;
  /* Schneefahnen hinter den Kufen */
  if(!ruhig)for(let i=0;i<10;i++){const a=(G.time*3+i/10)%1,side=i%2?1:-1;
    ctx.fillStyle='rgba(255,255,255,'+(0.8*(1-a))+')';ctx.beginPath();ctx.arc(X+side*(20+a*34)-lean*20,Y+6+a*30-Math.sin(a*Math.PI)*16,3+a*7,0,7);ctx.fill();}
  for(const b of G.spray){ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(X+b.x,Y+4+b.y,b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;
  ctx.fillStyle='rgba(50,90,150,.3)';ctx.beginPath();ctx.ellipse(X,Y+12,48,10,0,0,7);ctx.fill();
  /* Turbo: Flammen hinter dem Schlitten */
  if(G.turbo>0&&!ruhig){
    for(const sx of [-16,16]){const f=1+0.25*Math.sin(G.time*40+sx);
      const gf=ctx.createLinearGradient(0,Y+6,0,Y+46*f);gf.addColorStop(0,'rgba(255,240,170,.95)');gf.addColorStop(.4,'rgba(255,150,60,.85)');gf.addColorStop(1,'rgba(255,80,60,0)');
      ctx.fillStyle=gf;ctx.beginPath();ctx.moveTo(X+sx-9,Y+6);ctx.quadraticCurveTo(X+sx,Y+52*f,X+sx+9,Y+6);ctx.closePath();ctx.fill();}
  }
  ctx.save();ctx.translate(X+hit,Y+bob);ctx.rotate(lean);ctx.scale(1.22,1.22);
  ctx.lineCap='round';ctx.lineJoin='round';
  /* Kufen und Sitz */
  ctx.strokeStyle='#B5362F';ctx.lineWidth=5;
  for(const sx of [-22,22]){ctx.beginPath();ctx.moveTo(sx,10);ctx.lineTo(sx,-8);ctx.quadraticCurveTo(sx,-22,sx*0.72,-24);ctx.stroke();}
  ctx.fillStyle='#C98A4B';rounded(-26,-14,52,16,5);ctx.fill();
  ctx.fillStyle='#A66E36';for(let i=-1;i<=1;i++)ctx.fillRect(i*17-1,-14,2,16);
  const wave=ruhig?0:Math.sin(G.time*11);
  if(rider()==='penguin'){
    drawPenguin(0,-8,1.05,{wave,scarf:true,goggles:true,blush:true});
    ctx.restore();drawShieldAndBits(X,Y);return;
  }
  /* Schal, Jacke, Arme */
  ctx.strokeStyle='#3CCFBE';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(6,-46);ctx.quadraticCurveTo(26+wave*4,-52-lean*30,40+wave*6,-44+wave*5);ctx.stroke();
  ctx.fillStyle='#FF7A59';rounded(-17,-48,34,38,12);ctx.fill();
  ctx.fillStyle='#E4603F';rounded(-17,-24,34,14,7);ctx.fill();
  ctx.strokeStyle='#FF7A59';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-15,-38);ctx.lineTo(-25,-18);ctx.moveTo(15,-38);ctx.lineTo(25,-18);ctx.stroke();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-25,-17,5,0,7);ctx.arc(25,-17,5,0,7);ctx.fill();
  ctx.fillStyle='#3CCFBE';rounded(-13,-50,26,8,4);ctx.fill();
  /* Helm mit Brillenband und Bommel */
  ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(0,-62,15,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.fillRect(-15,-65,30,5);
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(-5,-69,4,0,7);ctx.fill();
  ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.arc(0,-78,5,0,7);ctx.fill();
  ctx.restore();
  drawShieldAndBits(X,Y);
}
function drawShieldAndBits(X,Y){
  if(G.shield||G.shieldFx>0){
    const a=G.shield?0.55+0.15*Math.sin(G.time*5):G.shieldFx,r=G.shield?66:66+(1-G.shieldFx)*50;
    ctx.globalAlpha=clamp(a,0,1);
    const gs=ctx.createRadialGradient(X,Y-44,r*0.55,X,Y-44,r);gs.addColorStop(0,'rgba(127,224,208,0)');gs.addColorStop(.85,'rgba(127,224,208,.35)');gs.addColorStop(1,'rgba(200,255,245,.9)');
    ctx.fillStyle=gs;ctx.beginPath();ctx.arc(X,Y-44,r,0,7);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(X,Y-44,r-4,-2.4+G.time,-1.4+G.time);ctx.stroke();
    ctx.globalAlpha=1;
  }
  for(const b of G.bits){ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle=b.c;ctx.beginPath();ctx.arc(X+b.x,Y-30+b.y,b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;
}
function drawWeather(){
  if(ruhig)return;
  for(let i=0;i<(lite?18:46);i++){const depth=0.4+rnd(i)*0.6,x=((rnd(i+100)*W+G.time*(14+i%5*5)-curve*40*depth)%W+W)%W,y=(rnd(i+200)*H+G.time*(60+G.speed*2)*depth)%H;
    ctx.fillStyle='rgba(255,255,255,'+(0.35+0.5*depth)+')';ctx.beginPath();ctx.arc(x,y,1+depth*1.8,0,7);ctx.fill();}
  /* Turbo: Geschwindigkeitslinien vom Horizont nach aussen */
  if(G.turbo>0){ctx.lineCap='round';
    for(let i=0;i<(lite?10:22);i++){const a=rnd(i)*Math.PI*2,ph=(G.time*2.4+rnd(i+50))%1,r1=60+ph*260,r2=r1+30+ph*70;
      ctx.strokeStyle='rgba(255,'+(200+Math.round(rnd(i+3)*55))+',170,'+(0.55*(1-ph))+')';ctx.lineWidth=1.5+ph*2.5;
      ctx.beginPath();ctx.moveTo(W/2+Math.cos(a)*r1,HOR+20+Math.sin(a)*r1*0.9);ctx.lineTo(W/2+Math.cos(a)*r2,HOR+20+Math.sin(a)*r2*0.9);ctx.stroke();}
    const v=ctx.createRadialGradient(W/2,H*0.55,H*0.35,W/2,H*0.55,H*0.8);v.addColorStop(0,'rgba(255,120,40,0)');v.addColorStop(1,'rgba(255,120,40,.28)');
    ctx.fillStyle=v;ctx.fillRect(0,0,W,H);}
  if(G.boost>0){ctx.strokeStyle='rgba(255,255,255,'+(G.boost*0.9)+')';ctx.lineWidth=2;
    for(let i=0;i<14;i++){const a=rnd(i+G.k*3)*Math.PI*2,r1=120+rnd(i+9)*60,r2=r1+50+G.boost*60;
      ctx.beginPath();ctx.moveTo(W/2+Math.cos(a)*r1,HOR+Math.sin(a)*r1*1.3);ctx.lineTo(W/2+Math.cos(a)*r2,HOR+Math.sin(a)*r2*1.3);ctx.stroke();}}
}
function draw(){
  if(!ctx)return;
  const p=clamp((G.k+(G.gate?1-G.gate.z/GAP:1)-1)/GOAL,0,1);
  curve=ruhig?0:Math.sin(G.dist*0.011)*0.85+Math.sin(G.dist*0.027)*0.35;
  ctx.save();
  if(G.shake>0&&!ruhig)ctx.translate((Math.random()-.5)*14*G.shake,(Math.random()-.5)*14*G.shake);
  /* Kamera: neigt sich in die Kurve und zoomt im Turbo leicht heran */
  if(!ruhig){const cx=W/2,cy=H*0.62;ctx.translate(cx,cy);ctx.rotate(-curve*0.05);ctx.scale(G.fov,G.fov);ctx.translate(-cx,-cy);}
  drawSky(p);
  for(const f of G.sparks){ctx.globalAlpha=clamp(f.life,0,1);ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,1.6+f.life*1.6,0,7);ctx.fill();}
  ctx.globalAlpha=1;
  drawGround(p);
  /* Alles auf der Piste von hinten nach vorn */
  const things=[];
  for(let i=0;i<(lite?14:30);i++){const z=((rnd(i+1)*ZFAR-G.dist)%ZFAR+ZFAR)%ZFAR-10,side=i%2?1:-1;things.push({z,f:()=>tree(side*(2.25+rnd(i+31)*2.4),z,i)});}
  for(let i=0;i<10;i++){const z=((i*19-G.dist)%ZFAR+ZFAR)%ZFAR-10;things.push({z,f:()=>{pole(-1,z,i);pole(1,z,i+1);}});}
  for(const it of G.items)if(it.z<ZFAR)things.push({z:it.z,f:()=>drawItem(it)});
  if(G.gate)things.push({z:G.gate.z,f:()=>drawGate(G.gate.z,false)});
  if(G.finishZ!==null)things.push({z:G.finishZ,f:()=>drawGate(G.finishZ,true)});
  things.sort((a,b)=>b.z-a.z);
  for(const t of things)if(t.z>0)t.f();
  drawSled();
  drawChain();
  for(const t of things)if(t.z<=0)t.f();
  drawWeather();
  ctx.restore();
  /* Punkte steigen ueber dem Schlitten auf */
  ctx.textAlign='center';ctx.textBaseline='middle';
  G.popups.forEach((q,i)=>{const a=clamp(q.life,0,1),y=GY-120-(1.2-q.life)*60-(G.popups.length-1-i)*28;
    ctx.globalAlpha=a;ctx.font='900 '+(q.text.length>8?18:24)+'px '+FONT;ctx.lineWidth=5;ctx.strokeStyle='rgba(13,16,23,.75)';ctx.strokeText(q.text,W/2+G.x*LW,y);ctx.fillStyle=q.color;ctx.fillText(q.text,W/2+G.x*LW,y);});
  ctx.globalAlpha=1;
  drawStatus();
  if(G.mode==='result'&&G.result&&!G.result.ok){
    ctx.fillStyle='rgba(224,65,59,'+(0.22*(1-G.t/1.5))+')';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(13,16,23,.84)';rounded(30,H*0.12,W-60,62,18);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#A9B4C8';ctx.font='600 12px '+FONT;ctx.fillText('Richtig wäre:',W/2,H*0.12+19);
    ctx.fillStyle='#7FE0D0';ctx.font='800 18px '+FONT;ctx.fillText(G.q.en.length>30?G.q.en.slice(0,29)+'…':G.q.en,W/2,H*0.12+42);
  }
  if(G.paused){
    ctx.fillStyle='rgba(13,16,23,.72)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 26px '+FONT;ctx.fillText('Pause',W/2,H/2-12);ctx.font='500 14px '+FONT;ctx.fillText('Tippen zum Weiterfahren',W/2,H/2+18);
  }
}
/* Anzeige oben links: Tempo, Turbo, Schild, Pinguine */
function drawStatus(){
  if(G.mode==='celebrate')return;
  ctx.textBaseline='middle';ctx.textAlign='left';
  const tempo=tempoOf(G.streak)*(G.turbo>0?TURBO_SPEED:1),pills=[];
  pills.push({w:112,draw:(x,y)=>{
    ctx.fillStyle='#A9B4C8';ctx.font='700 10px '+FONT;ctx.fillText('TEMPO',x+10,y+14);
    ctx.fillStyle='rgba(255,255,255,.18)';rounded(x+52,y+9,50,10,5);ctx.fill();
    const f=clamp((tempo-1)/1.03,0,1);ctx.fillStyle=G.turbo>0?'#FF8A3C':f>0.3?'#FFC857':'#7FE0D0';rounded(x+52,y+9,Math.max(8,50*f),10,5);ctx.fill();}});
  pills.push({w:58,draw:(x,y)=>{ctx.fillStyle='#FFFFFF';ctx.font='800 13px '+FONT;ctx.fillText('×'+multiplier().toFixed(1).replace('.',','),x+10,y+14);}});
  if(G.turbo>0)pills.push({w:76,bg:'rgba(255,122,40,.92)',draw:(x,y)=>{ctx.fillStyle='#1B0A00';ctx.font='900 12px '+FONT;ctx.fillText('TURBO '+G.turbo,x+10,y+14);}});
  if(G.shield)pills.push({w:34,bg:'rgba(60,207,190,.92)',draw:(x,y)=>{ctx.fillStyle='#06201C';ctx.font='900 14px '+FONT;ctx.fillText('⛨',x+10,y+14);}});
  if(G.penguins>0)pills.push({w:58,draw:(x,y)=>{drawPenguin(x+16,y+24,0.4,{});ctx.fillStyle='#FFFFFF';ctx.font='800 13px '+FONT;ctx.fillText('×'+G.penguins,x+28,y+14);}});
  let x=8,y=8;
  for(const p of pills){if(x+p.w>W-8){x=8;y+=34;}ctx.fillStyle=p.bg||'rgba(13,16,23,.68)';rounded(x,y,p.w,28,14);ctx.fill();p.draw(x,y);x+=p.w+6;}
}
/* Sparstufe: Laeuft das Spiel auf einem Geraet zu langsam, faellt Beiwerk
   weg (weniger Baeume und Flocken, kein Nordlicht, kein Leuchten). */
let lite=false,slowFor=0;
let running=false,last=0;
function loop(){
  if(running||!window.requestAnimationFrame)return;
  running=true;last=0;
  const frame=now=>{
    if(G.mode==='menu'||G.mode==='over'){running=false;return;}
    const raw=last?(now-last)/1000:0,dt=Math.min(0.05,raw);last=now;
    if(!lite&&raw>0){slowFor=raw>1/36?slowFor+raw:Math.max(0,slowFor-raw*0.5);if(slowFor>2.5)lite=true;}
    update(dt);draw();requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

window.SledGame={G,start,steer,move,update,finish,showMenu,pause,GOAL,HEARTS,GAP,MIN_READ,TURBO_GATES,MAX_PENGUINS,UNLOCK,tempoOf,multiplier,gateSpeed,rider,unlocked};
showMenu();
})();
