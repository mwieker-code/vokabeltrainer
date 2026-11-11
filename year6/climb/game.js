/* =========================================================================
   SUMMIT CLIMB – Kletterspiel zu den Vokabeln von Year 6, Unit 2
   Oben steht das deutsche Wort, an der Wand haengen drei Griffe mit
   englischen Woertern. Wer den richtigen antippt, klettert hoeher; ein
   falscher Griff broeckelt, und der Nebel holt auf. Holt er einen ein,
   kostet das ein Herz. Alle fuenf Zuege wartet ein Lager mit einer
   Bonusfrage (Englisch -> Deutsch), nach zwanzig Zuegen der Gipfel.

   Am Berg: Steinschlag sperrt kurz einen Griff, Eisgriffe lassen nach dem
   Landen abrutschen, ein Adler holt sich einen falschen Griff - wer
   waehrenddessen richtig antwortet, bekommt den Adler-Bonus. Items
   schweben kurz neben der Route und gehoeren dem, der rechtzeitig richtig
   antwortet: Kristall, Edelweiss, Karabiner (faengt einen Fehler ab),
   Seil (naechster Zug doppelt hoch) und Eispickel (draengt den Nebel
   zurueck). Richtige Antworten in Folge machen schneller und bringen mehr
   Punkte.

   Das Spiel zaehlt nicht in die Lernfaecher; gespeichert werden nur
   Bestwerte und die Wahl der Figur (vt6:climb:v1).

   Die Spiellogik (start, choose, update, answerChallenge) kommt ohne
   Zeichenflaeche aus, damit die Tests sie ohne Browser durchspielen.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,F=window.Figuren,M=window.ClimbMusik||null,KEY='vt6:climb:v1';
const $=id=>document.getElementById(id);
const menu=$('menu'),stage=$('stage'),over=$('over'),canvas=$('wall'),promptEl=$('prompt'),choices=$('choices'),box=$('challenge');
let ctx=null;try{ctx=canvas.getContext?canvas.getContext('2d'):null;}catch(e){ctx=null;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ----------------------------------------------------------------- Regeln */
const W=360;let H=560;
const P=150;                           // Hoehe eines Kletterzugs in der Welt
const LANES=[62,180,298];              // die drei Griffspuren
const METER=50,CAMP=5,GOAL=20;         // 50 m je Zug, Lager alle 5, Gipfel nach 20
const HEARTS=3,MAX_HEARTS=5;
const HEAD_START=1.9,MAX_GAP=1.9;      // Vorsprung vor dem Nebel in Zuegen
const BONUS_TIME=3.2;                  // so lange schwebt ein Item neben der Route
const UNLOCK=3;
const ITEMS=[['kristall',35],['edelweiss',15],['karabiner',20],['seil',15],['pickel',15]];
const fogSpeed=()=>P/Math.max(5.5,8.5-0.2*G.k);           // Nebel: Sekunden je Zug, erst 8,5, spaeter 5,5
const multiplier=()=>1+0.1*Math.min(G.streak,10);

/* ---------------------------------------------------------------- Stand */
let saved={best:{},summits:{},rider:'kid'};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&typeof p.best==='object'&&p.best&&typeof p.summits==='object'&&p.summits)
  saved={best:p.best,summits:p.summits,rider:['silky','penguin'].includes(p.rider)?p.rider:'kid'};}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}
/* Der Pinguin ist frei, sobald es dreimal ins Ziel ging - am Gipfel oder im Schlittenrennen. */
function finishes(){
  let n=Object.values(saved.summits).reduce((a,b)=>a+(Number(b)||0),0);
  try{const s=JSON.parse(localStorage.getItem('vt6:sled:v1'));if(s&&s.finishes)n+=Object.values(s.finishes).reduce((a,b)=>a+(Number(b)||0),0);}catch(e){}
  return n;
}
const unlocked=()=>finishes()>=UNLOCK;
const rider=()=>saved.rider==='silky'?'silky':saved.rider==='penguin'&&unlocked()?'penguin':'kid';

const ALL={id:'all',name:'Ganze Unit'};
const wordsOf=id=>id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||{words:[]}).words;
const pool=D.parts.flatMap(p=>p.words);

const G={mode:'menu',part:null,queue:[],k:0,goal:GOAL,q:null,tries:0,holds:[],old:[],
  climber:{x:W/2,y:0},from:null,to:null,t:0,rows:1,fog:0,cam:0,score:0,streak:0,correct:0,hearts:HEARTS,
  missed:new Map(),requeued:new Set(),seen:[],paused:false,banner:'',bannerT:0,bits:[],sparks:[],popups:[],time:0,won:false,
  bonus:null,karabiner:false,seil:false,rock:null,eagle:null,eagles:0,challenge:null,challenges:0,hurtT:0,iceT:0,shake:0,flag:0};

/* ------------------------------------------------------------- Ablauf */
function start(partId){
  const words=wordsOf(partId);
  if(words.length<3)return;
  /* Kurze Abschnitte laufen mehrfach durch, bis der Gipfel erreicht ist. */
  let queue=[];while(queue.length<GOAL)queue=queue.concat(shuffle(words));
  Object.assign(G,{mode:'play',part:partId,queue,k:0,goal:GOAL,q:null,tries:0,holds:[],old:[],
    climber:{x:W/2,y:0},fog:-HEAD_START*P,cam:-H*0.3,score:0,streak:0,correct:0,hearts:HEARTS,
    missed:new Map(),requeued:new Set(),seen:[],paused:false,banner:'',bannerT:0,bits:[],sparks:[],popups:[],won:false,
    bonus:null,karabiner:false,seil:false,rock:null,eagle:null,eagles:0,challenge:null,challenges:0,hurtT:0,iceT:0,shake:0,flag:0});
  menu.hidden=true;over.hidden=true;stage.hidden=false;box.hidden=true;
  resize();next();hud();loop();
  M?.stop();M?.start();musikKnopf();
}
function distractors(q){
  const others=pool.filter(w=>w.id!==q.id&&w.en!==q.en&&w.de!==q.de);
  const same=shuffle(others.filter(w=>w.pos===q.pos)),rest=shuffle(others.filter(w=>w.pos!==q.pos));
  const out=[];
  for(const w of [...same,...rest]){if(!out.some(o=>o.en===w.en||o.de===w.de))out.push(w);if(out.length===2)break;}
  return out;
}
function next(){
  if(G.k>=G.goal)return finish(true);
  G.q=G.queue.shift();G.tries=0;G.seen.push(G.q);
  const options=shuffle([G.q,...distractors(G.q)]);
  const icy=G.k>=8;
  G.holds=options.map((w,i)=>({w,lane:i,x:LANES[i],y:(G.k+1)*P+[-12,6,-4][(i+G.k)%3],state:'ok',label:null,
    icy:icy&&Math.random()<0.3}));
  G.mode='play';G.rock=null;G.eagle=null;
  /* Ein Item schwebt kurz neben der Route */
  G.bonus=null;
  if(G.k>=1&&Math.random()<0.42){
    let r=Math.random()*ITEMS.reduce((a,b)=>a+b[1],0),type='kristall';
    for(const [t,w] of ITEMS){if(r<w){type=t;break;}r-=w;}
    if(type==='karabiner'&&G.karabiner)type='kristall';
    if(type==='seil'&&(G.seil||G.k>=G.goal-2))type='kristall';
    G.bonus={type,t:BONUS_TIME,x:Math.random()<0.5?36:W-36,y:G.climber.y+P*0.55,got:false};
  }
  /* Steinschlag oder Adler - nie beides */
  const r=Math.random();
  if(G.k>=3&&r<0.25)G.rock={lane:Math.floor(Math.random()*3),phase:'warn',t:0,stones:[]};
  else if(G.k>=5&&r<0.47){const wrong=G.holds.filter(h=>h.w!==G.q);G.eagle={hold:wrong[Math.floor(Math.random()*wrong.length)],t:0,side:Math.random()<0.5?-1:1,done:false};}
  promptEl.textContent=G.q.de;
  choices.innerHTML=G.holds.map((h,i)=>'<button data-choice="'+i+'" lang="en">'+esc(h.w.en)+'</button>').join('');
  choices.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.choice)));
}
function popup(text,color){G.popups.push({text,color:color||'#FFC857',life:1.3});}
const blocked=h=>G.rock&&G.rock.phase==='fall'&&G.rock.lane===h.lane;
function choose(i){
  if(G.mode!=='play'||G.paused)return;
  const h=G.holds[i];if(!h||h.state!=='ok')return;
  if(blocked(h)){
    /* Steinschlag: Der Griff ist gerade gesperrt */
    if(G.karabiner){G.karabiner=false;popup('Karabiner hält!','#FFB35C');}else{G.fog+=0.25*P;popup('Steinschlag!','#FFFFFF');}
    G.shake=0.3;M?.sfx('steinschlag');hud();return;
  }
  if(h.w===G.q){
    if(G.tries===0){
      const pts=Math.round(100*multiplier()/10)*10;
      G.score+=pts;G.streak++;G.correct++;popup('+'+pts);
    }else G.streak=0;
    if(G.eagle&&!G.eagle.done){G.score+=150;G.eagles++;popup('Adler-Bonus +150','#FFD27A');M?.sfx('adler');}
    /* Erst den Zug bestimmen, dann einsammeln: ein frisches Seil gilt fuer den naechsten Zug */
    G.rows=G.seil?2:1;if(G.seil){G.seil=false;popup('Seilsprung!','#7FE0D0');}
    if(G.bonus&&!G.bonus.got&&G.bonus.t>0)collect(G.bonus);
    const y=h.y+(G.rows-1)*P;
    G.from={x:G.climber.x,y:G.climber.y};G.to={x:h.x,y,icy:h.icy};G.t=0;G.mode='jump';h.state='taken';
    window.LearningFeedback?.signal('ok');
  }else{
    G.tries++;G.streak=0;h.state='broken';
    G.missed.set(G.q.id,G.q);
    /* Das Wort kommt drei Zuege spaeter noch einmal - aber nur einmal. */
    if(!G.requeued.has(G.q.id)){G.requeued.add(G.q.id);G.queue.splice(Math.min(3,G.queue.length),0,G.q);}
    if(G.karabiner){G.karabiner=false;popup('Karabiner hält!','#FFB35C');M?.sfx('karabinerhalt');}
    else{G.fog+=0.35*P;M?.fehler();}
    for(let n=0;n<10;n++)G.bits.push({x:h.x+(Math.random()-.5)*30,y:h.y,vx:(Math.random()-.5)*90,vy:60+Math.random()*90,r:3+Math.random()*4,life:1});
    const b=choices.querySelector('[data-choice="'+i+'"]');if(b)b.disabled=true;
    G.t=0;G.mode='slip';G.shake=0.25;
    window.LearningFeedback?.signal('no');
  }
  hud();
}
function collect(b){
  b.got=true;
  if(b.type==='kristall'){G.score+=50;popup('Kristall +50','#8FE8FF');}
  else if(b.type==='edelweiss'){G.score+=100;popup('Edelweiß +100','#FFFFFF');}
  else if(b.type==='karabiner'){G.karabiner=true;popup('Karabiner','#FFB35C');}
  else if(b.type==='seil'){G.seil=true;popup('Seil: nächster Zug doppelt','#7FE0D0');}
  else if(b.type==='pickel'){G.fog-=1.5*P;popup('Eispickel: Nebel zurück','#BFD9FF');}
  for(let n=0;n<16;n++)G.sparks.push({x:b.x,y:b.y,vx:(Math.random()-.5)*200,vy:(Math.random()-.5)*200,life:1,c:['#FFFFFF','#8FE8FF','#FFC857'][n%3]});
  M?.sfx(b.type);
}
function hurt(){
  G.hearts--;G.streak=0;G.shake=0.6;
  if(G.hearts<=0){hud();return finish(false);}
  G.mode='hurt';G.hurtT=1.3;G.fog=G.climber.y-MAX_GAP*P;
  popup('Der Nebel hat dich erwischt!','#FF8A8A');M?.aua();
  window.LearningFeedback?.signal('no');hud();
}
function update(dt){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  G.time+=dt;
  if(G.shake>0)G.shake-=dt;if(G.iceT>0)G.iceT-=dt;
  for(const b of G.bits){b.x+=b.vx*dt;b.y-=b.vy*dt;b.vy+=420*dt;b.life-=dt*1.1;}
  G.bits=G.bits.filter(b=>b.life>0);
  for(const s of G.sparks){s.x+=s.vx*dt;s.y-=s.vy*dt;s.vy-=60*dt;s.life-=dt*0.9;}
  G.sparks=G.sparks.filter(s=>s.life>0);
  for(const p of G.popups)p.life-=dt;G.popups=G.popups.filter(p=>p.life>0);
  if(G.bannerT>0)G.bannerT-=dt;
  const active=G.mode==='play'||G.mode==='slip';
  if(active){
    if(G.bonus&&!G.bonus.got){G.bonus.t-=dt;if(G.bonus.t<=0)G.bonus=null;}
    /* Steinschlag: erst die Warnung, dann fallen die Steine */
    if(G.rock){const R=G.rock;R.t+=dt;
      if(R.phase==='warn'&&R.t>=1.0){R.phase='fall';R.t=0;M?.sfx('rumpeln');}
      else if(R.phase==='fall'){if(Math.random()<dt*14)R.stones.push({y:G.cam+H+20,vy:-80,r:5+Math.random()*8,x:LANES[R.lane]+(Math.random()-.5)*40,rot:Math.random()*6});
        if(R.t>=1.6){R.phase='done';}}
      for(const s of R.stones){s.vy-=900*dt;s.y+=s.vy*dt;s.rot+=dt*6;}R.stones=R.stones.filter(s=>s.y>G.cam-40);
      if(R.phase==='done'&&!R.stones.length)G.rock=null;}
    /* Adler: kommt angeflogen, nimmt einen falschen Griff mit, fliegt davon */
    if(G.eagle){const E=G.eagle;E.t+=dt;
      if(E.t>=1.2&&E.hold.state==='ok'){E.hold.state='eagle';const b=choices.querySelector('[data-choice="'+G.holds.indexOf(E.hold)+'"]');if(b)b.disabled=true;if(E.t<1.3)M?.sfx('adler');}
      if(E.t>=3.4)E.done=true;if(E.t>=4.2)G.eagle=null;}
    G.fog=Math.max(G.fog+fogSpeed()*dt,G.climber.y-MAX_GAP*P);
    if(G.fog>=G.climber.y-50)return hurt();
    M?.gefahr(clamp(1-(G.climber.y-G.fog-50)/(MAX_GAP*P-50),0,1));
  }
  if(G.mode==='slip'){
    G.t+=dt/(ruhig?0.05:0.6);if(G.t>=1)G.mode='play';
  }else if(G.mode==='hurt'){
    G.hurtT-=dt;if(G.hurtT<=0)G.mode='play';
  }else if(G.mode==='jump'){
    const dur=ruhig?0.05:Math.max(0.28,0.44-0.016*Math.min(G.streak,10))*(G.rows>1?1.4:1);
    G.t+=dt/dur;
    const t=Math.min(1,G.t),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    G.climber.x=G.from.x+(G.to.x-G.from.x)*e;
    G.climber.y=G.from.y+(G.to.y-G.from.y)*e+Math.sin(t*Math.PI)*22;
    if(G.t>=1)land();
  }else if(G.mode==='camp'){
    G.t+=dt;if(G.challenge&&G.challenge.done&&G.t>=G.challenge.until)closeChallenge();
  }else if(G.mode==='summit'){
    G.t+=dt;G.flag=Math.min(1,G.t/1.4);
    if(!ruhig&&Math.random()<dt*4)firework();
    if(G.t>=(ruhig?0.4:3.2))finish(true);
  }
  /* Am Gipfel faehrt die Kamera auf die Spitze */
  const target=G.mode==='summit'?G.goal*P+60-H*0.42:G.climber.y-H*0.3;G.cam+=(target-G.cam)*Math.min(1,dt*(G.mode==='summit'?2.5:5));
}
function land(){
  const before=G.k;
  G.climber={x:G.to.x,y:G.to.y};G.old.push({x:G.to.x,y:G.to.y});if(G.old.length>10)G.old.shift();
  G.k=Math.min(G.goal,G.k+G.rows);G.rows=1;M?.sfx('griff');
  if(G.to.icy){G.fog+=0.3*P;G.iceT=0.6;popup('Rutschig!','#BFE6FF');M?.sfx('eis');}
  hud();
  if(G.k>=G.goal){G.mode='summit';G.t=0;G.banner='Gipfel!';G.bannerT=2.2;promptEl.textContent='Geschafft!';choices.innerHTML='';G.bonus=null;G.rock=null;G.eagle=null;M?.gipfel();return;}
  if(Math.floor(before/CAMP)<Math.floor(G.k/CAMP))return camp();
  next();
}
/* ---------------------------------------------------- Lager und Bonusfrage */
function camp(){
  G.mode='camp';G.t=0;G.bonus=null;G.rock=null;G.eagle=null;
  G.fog=Math.min(G.fog,G.climber.y-MAX_GAP*P);            // im Lager faellt der Nebel zurueck
  const n=Math.floor(G.k/CAMP);G.banner='Lager '+n+' · '+(G.k*METER)+' m';G.bannerT=1.6;
  M?.lager();
  /* Bonusfrage: ein Wort dieser Fahrt, diesmal Englisch -> Deutsch */
  const w=G.seen[Math.floor(Math.random()*G.seen.length)]||pool[0];
  const others=shuffle(pool.filter(x=>x.de!==w.de&&x.en!==w.en));
  const opts=[w];for(const o of others){if(!opts.some(p=>p.de===o.de))opts.push(o);if(opts.length===3)break;}
  G.challenge={w,options:shuffle(opts),done:false,ok:null,until:0};
  promptEl.textContent='Lager '+n+' – Bonusfrage';choices.innerHTML='';
  box.innerHTML='<p class="c-kicker">LAGER '+n+' · BONUSFRAGE</p><p class="c-q">Was heißt <strong lang="en">'+esc(w.en)+'</strong> auf Deutsch?</p>'
    +'<p class="c-hint">Richtig: ein Extra-Herz (höchstens '+MAX_HEARTS+')</p>'
    +'<div class="c-opts">'+G.challenge.options.map((o,i)=>'<button data-c="'+i+'">'+esc(o.de)+'</button>').join('')+'</div><p class="c-res" role="status"></p>';
  box.hidden=false;
  box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>answerChallenge(Number(b.dataset.c)));
  const f=box.querySelector('[data-c]');if(f)f.focus?.();
}
function answerChallenge(i){
  const C=G.challenge;if(G.mode!=='camp'||!C||C.done)return;
  C.done=true;C.ok=C.options[i]===C.w;C.until=G.t+(C.ok?1.1:1.9);
  box.querySelectorAll('[data-c]').forEach((b,j)=>{b.disabled=true;if(C.options[j]===C.w)b.classList.add('right');else if(j===i)b.classList.add('wrong');});
  const res=box.querySelector('.c-res');
  if(C.ok){G.challenges++;G.score+=50;const voll=G.hearts>=MAX_HEARTS;if(!voll)G.hearts++;res.textContent=voll?'Richtig! +50 Punkte (alle Herzen voll)':'Richtig! Ein Extra-Herz und +50 Punkte';M?.sfx('herz');window.LearningFeedback?.signal('ok');}
  else{res.textContent='Leider nicht: '+C.w.en+' heißt „'+C.w.de+'“.';window.LearningFeedback?.signal('no');}
  hud();
}
function closeChallenge(){box.hidden=true;G.challenge=null;next();}
function firework(){
  const x=40+Math.random()*(W-80),y=G.cam+H*(0.62+Math.random()*0.3),cols=['#FFC857','#FF7A59','#7FE0D0','#B993FF','#FFFFFF','#FF5A9E'],c=cols[Math.floor(Math.random()*cols.length)];
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2,v=70+Math.random()*50;G.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.1,c});}
  M?.sfx('feuerwerk');
}
function finish(won){
  G.mode='over';G.won=won;box.hidden=true;
  if(!won)M?.sturz();
  if(won)G.score+=50*G.hearts;
  const id=G.part,old=saved.best[id]||0,record=G.score>old,before=unlocked();
  if(record)saved.best[id]=G.score;
  if(won)saved.summits[id]=(saved.summits[id]||0)+1;
  save();
  const fresh=!before&&unlocked();
  const missed=[...G.missed.values()];
  stage.hidden=true;over.hidden=false;
  over.innerHTML='<h1>'+(won?'Gipfel erreicht!':'Der Nebel hat dich eingeholt.')+'</h1>'
    +'<p class="result">'+(G.k*METER)+' m von '+(G.goal*METER)+' m · '+G.score+' Punkte'+(record&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
    +(won&&G.hearts?'<p class="muted">Gipfelbonus: '+G.hearts+' Herz'+(G.hearts>1?'en':'')+' × 50 Punkte</p>':'')
    +(fresh?'<p class="unlock">Neu freigeschaltet: Der Pinguin klettert jetzt mit!</p>':'')
    +'<p class="muted">'+G.correct+' Wörter beim ersten Versuch richtig · '+G.challenges+' Bonusfragen · '+G.eagles+' Adler-Boni · Bestwert: '+(saved.best[id]||0)+' Punkte</p>'
    +'<div class="actions"><button id="again" class="go">Nochmal klettern</button><button id="toMenu">Anderen Abschnitt wählen</button></div>'
    +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')
      +'</ul><p><a class="train" href="../">Unit 2 im Vokabeltrainer üben →</a></p>':'<p class="muted">Kein einziger Fehlgriff – stark!</p>');
  $('again').onclick=()=>start(id);$('toMenu').onclick=showMenu;
  const h=over.querySelector('h1');h.tabIndex=-1;h.focus();
  window.LearningFeedback?.tone?.('done');
}
function hud(){
  $('height').textContent=(G.k*METER)+' m';
  $('points').textContent=G.score+' P';
  const hz=Math.max(0,G.hearts);
  $('hearts').textContent='♥'.repeat(hz)+(hz<HEARTS?'♡'.repeat(HEARTS-hz):'');
  $('hearts').setAttribute('aria-label',hz+' Herzen');
}
function showRiders(){
  const box2=$('riders');if(!box2)return;
  const missing=Math.max(0,UNLOCK-finishes());
  const knopf=(id,name,frei,info)=>'<button data-rider="'+id+'" aria-pressed="'+(rider()===id)+'"'+(frei?'':' disabled')+'><canvas class="r-bild" width="120" height="120" aria-hidden="true"></canvas><span>'+name+(info?'<small>'+info+'</small>':'')+'</span></button>';
  box2.innerHTML=knopf('kid','Kletterkind',true)+knopf('silky','Silky',true,'die Robbe')+knopf('penguin','Pinguin',unlocked(),unlocked()?'':'noch '+missing+'× ins Ziel');
  box2.querySelectorAll('[data-rider]').forEach(b=>{
    b.onclick=()=>{if(b.disabled)return;saved.rider=b.dataset.rider;save();showRiders();};
    vorschau(b.querySelector('canvas'),b.dataset.rider);
  });
}
function showMenu(){
  G.mode='menu';stage.hidden=true;over.hidden=true;menu.hidden=false;box.hidden=true;showRiders();M?.stop();musikKnopf();
  $('levels').innerHTML=[...D.parts,ALL].map(p=>{
    const n=wordsOf(p.id).length,best=saved.best[p.id]||0,top=saved.summits[p.id]||0;
    return '<button data-part="'+p.id+'"'+(p.id==='all'?' class="all"':'')+'><span class="l-name">'+esc(p.name)+'</span>'
      +'<span class="l-info">'+n+' Wörter'+(best?' · Bestwert '+best+' P':'')+(top?' · '+top+'× Gipfel':'')+'</span></button>';
  }).join('');
  $('levels').querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>start(b.dataset.part));
}
function pause(on){
  if(G.mode==='menu'||G.mode==='over')return;
  G.paused=on;$('pause').textContent=on?'▶':'II';$('pause').setAttribute('aria-label',on?'Weiter':'Pause');
  M?.pause(on);
}
function musikKnopf(){
  const an=!M||M.an;
  for(const id of ['musik','musikMenu']){const b=$(id);if(!b)continue;
    b.setAttribute('aria-pressed',String(an));b.classList.toggle('aus',!an);
    if(id==='musikMenu')b.textContent=an?'♫ Musik: an':'♫ Musik: aus';
    b.hidden=!M||!M.verfuegbar;}
}
function musikUmschalten(){
  if(!M)return;M.setze(!M.an);
  if(M.an&&!stage.hidden&&G.mode!=='over'&&G.mode!=='summit'){M.start();if(G.paused)M.pause(true);}
  musikKnopf();
}

/* ----------------------------------------------------------- Steuerung */
canvas.addEventListener('pointerdown',e=>{
  if(G.paused)return pause(false);
  const r=canvas.getBoundingClientRect();if(!r.width)return;
  const x=(e.clientX-r.left)/r.width*W;
  choose(x<W/3?0:x<2*W/3?1:2);
});
document.addEventListener('keydown',e=>{
  if(stage.hidden)return;
  const map={ArrowLeft:0,'1':0,a:0,ArrowUp:1,ArrowDown:1,'2':1,s:1,ArrowRight:2,'3':2,d:2};
  if(G.mode==='camp'&&['1','2','3'].includes(e.key)){e.preventDefault();answerChallenge(Number(e.key)-1);return;}
  if(e.key in map){e.preventDefault();choose(map[e.key]);}
  else if(e.key===' '||e.key==='p'||e.key==='Escape'){e.preventDefault();pause(!G.paused);}
  else if(e.key==='m'){e.preventDefault();musikUmschalten();}
});
$('pause').onclick=()=>pause(!G.paused);
$('quit').onclick=showMenu;
if($('musik'))$('musik').onclick=musikUmschalten;
if($('musikMenu'))$('musikMenu').onclick=musikUmschalten;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('resize',resize);

/* ============================================================ Zeichnen */
const FONT='Inter,system-ui,-apple-system,"Segoe UI",sans-serif';
const HOLD=['#FF7A59','#3CCFBE','#FFC857'];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgb=(c,a)=>'rgba('+c.map(Math.round).join(',')+','+(a===undefined?1:a)+')';
/* Himmel ueber den Tag: Morgen, Mittag, Abendrot, Nacht am Gipfel */
const SKY=[[[122,186,240],[255,224,190]],[[64,150,232],[200,232,255]],[[70,60,130],[255,150,100]],[[12,16,40],[70,50,110]]];
function skyAt(p){const x=p*3,i=Math.min(2,Math.floor(x)),t=x-i;return [mix(SKY[i][0],SKY[i+1][0],t),mix(SKY[i][1],SKY[i+1][1],t)];}
function resize(){
  if(!ctx||stage.hidden)return;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,3);
  H=Math.round(W*r.height/r.width);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  for(const h of G.holds)h.label=null;
}
const sy=y=>H-(y-G.cam);
function rounded(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function wrap(text,max,force){
  const words=text.split(' '),lines=[];let line='';
  for(const w of words){
    if(!force&&ctx.measureText(w).width>max)return null;
    const probe=line?line+' '+w:w;
    if(ctx.measureText(probe).width<=max||!line)line=probe;else{lines.push(line);line=w;}
  }
  if(line)lines.push(line);return lines;
}
function fit(text,max){
  for(const size of [15,14,13,12,11,10]){ctx.font='700 '+size+'px '+FONT;const lines=wrap(text,max);if(lines&&lines.length<=3)return{size,lines};}
  ctx.font='700 10px '+FONT;return{size:10,lines:wrap(text,max,true).slice(0,4)};
}
const progress=()=>clamp(G.climber.y/(G.goal*P),0,1);
const wallL=y=>26+12*Math.sin(y*0.012)+8*Math.sin(y*0.037+1);
const wallR=y=>W-26-12*Math.sin(y*0.015+2)-8*Math.sin(y*0.029);
function drawSky(p){
  const [top,bot]=skyAt(p);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,rgb(top));g.addColorStop(1,rgb(bot));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  /* Sterne und Nordlicht am Abend */
  if(p>0.62){const a=clamp((p-0.62)*3,0,1);
    for(let i=0;i<40;i++){const tw=0.5+0.5*Math.sin(G.time*2+i*3);ctx.globalAlpha=a*tw;ctx.fillStyle='#FFFFFF';ctx.fillRect(rnd(i)*W,rnd(i+40)*H*0.7,1.6,1.6);}
    for(let b=0;b<3;b++){const c=b===1?'150,110,255':b===2?'90,220,255':'70,255,170',y0=H*(0.08+b*0.07);
      const g2=ctx.createLinearGradient(0,y0-10,0,y0+90);g2.addColorStop(0,'rgba('+c+',0)');g2.addColorStop(.45,'rgba('+c+','+(0.3*a)+')');g2.addColorStop(1,'rgba('+c+',0)');
      ctx.globalAlpha=1;ctx.fillStyle=g2;ctx.beginPath();
      for(let x=-20;x<=W+20;x+=18)ctx.lineTo(x,y0+Math.sin(x*0.018+G.time*0.5+b*2)*16);
      for(let x=W+20;x>=-20;x-=18)ctx.lineTo(x,y0+70+b*8+Math.sin(x*0.022+G.time*0.45+b*2+0.8)*12);
      ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;}
  /* Sonne wandert ueber den Himmel und geht unter */
  if(p<0.85){const sx=W*(0.2+0.6*p),sY=H*(0.18+0.55*Math.pow(p,1.6));
    const halo=ctx.createRadialGradient(sx,sY,4,sx,sY,80);halo.addColorStop(0,'rgba(255,240,200,.8)');halo.addColorStop(1,'rgba(255,240,200,0)');
    ctx.fillStyle=halo;ctx.fillRect(sx-80,sY-80,160,160);ctx.fillStyle=rgb(mix([255,250,225],[255,170,110],p));ctx.beginPath();ctx.arc(sx,sY,17,0,7);ctx.fill();}
  /* Ferne Gipfel: sinken langsam, je hoeher man kommt */
  const layers=[{f:0.06,base:0.62,h:0.34,c:[[178,200,232],[90,70,130]],seed:3},{f:0.14,base:0.76,h:0.36,c:[[130,160,210],[60,48,98]],seed:11}];
  for(const L of layers){
    const off=G.cam*L.f,yb=H*L.base+off;
    if(yb-H*L.h>H)continue;
    ctx.fillStyle=rgb(mix(L.c[0],L.c[1],p));ctx.beginPath();ctx.moveTo(-10,H+10);
    const pts=[];for(let i=-1;i<=13;i++){const x=i*32,y=yb-H*L.h*(0.4+0.6*rnd(i+L.seed))*(i%2?1:0.6);pts.push([x,y]);ctx.lineTo(x,y);}
    ctx.lineTo(W+10,H+10);ctx.closePath();ctx.fill();
    ctx.fillStyle=rgb(mix([255,255,255],[255,200,180],p),0.85);
    for(let i=1;i<pts.length-1;i+=2){const [x,y]=pts[i],[lx,ly]=pts[i-1],[rx,ry]=pts[i+1],t=0.28;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(lx-x)*t,y+(ly-y)*t);ctx.lineTo(x+(lx-x)*t*0.4,y+(ly-y)*t*0.8);ctx.lineTo(x+(rx-x)*t*0.5,y+(ry-y)*t*1.1);ctx.lineTo(x+(rx-x)*t,y+(ry-y)*t);ctx.closePath();ctx.fill();}
  }
  /* Wolken ziehen vorbei */
  for(let i=0;i<5;i++){const cx=((rnd(i+7)*W*1.6+G.time*(5+i*2))%(W+160))-80,cy=H*(0.12+rnd(i+70)*0.5)+G.cam*0.1%H;
    ctx.fillStyle='rgba(255,255,255,'+(0.5-0.3*p)+')';ctx.beginPath();ctx.ellipse(cx,cy%H,36,9,0,0,7);ctx.ellipse(cx+22,cy%H+4,26,8,0,0,7);ctx.ellipse(cx-20,cy%H+5,22,7,0,0,7);ctx.fill();}
}
function drawValley(p){
  /* Das Tal unter dem Basecamp: Wiese, See, Dorf mit Lichtern */
  const top=sy(-40);if(top>H+10)return;
  const g=ctx.createLinearGradient(0,top,0,top+200);g.addColorStop(0,'#7FAE7A');g.addColorStop(1,'#4F7D55');
  ctx.fillStyle=g;ctx.fillRect(0,top,W,H-top+10);
  ctx.fillStyle='#8FC7E8';ctx.beginPath();ctx.ellipse(W*0.68,top+70,88,22,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(W*0.6,top+64,40,2);ctx.fillRect(W*0.7,top+74,30,2);
  for(let i=0;i<7;i++){const hx=20+i*26+(i%2)*8,hy=top+40+(i%3)*14;
    ctx.fillStyle='#F2E6D0';ctx.fillRect(hx,hy,18,13);ctx.fillStyle=i%2?'#B5432F':'#8E3B2A';ctx.beginPath();ctx.moveTo(hx-3,hy);ctx.lineTo(hx+9,hy-9);ctx.lineTo(hx+21,hy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#FFD27A';ctx.fillRect(hx+6,hy+4,5,5);}
  for(let i=0;i<9;i++){const tx=rnd(i+300)*W,ty=top+20+rnd(i+310)*120;ctx.fillStyle='#2F5E45';ctx.beginPath();ctx.moveTo(tx-8,ty);ctx.lineTo(tx,ty-22);ctx.lineTo(tx+8,ty);ctx.closePath();ctx.fill();}
}
function drawWall(p){
  const top=G.goal*P+60,bottomY=-40;
  const from=Math.max(bottomY,G.cam-20),to=Math.min(top,G.cam+H+20);
  if(to<=from)return;
  /* Felsflaeche mit gezackten Raendern */
  const rock=mix([112,104,98],[92,96,118],p),lit=mix([150,140,130],[176,182,206],p);
  const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,rgb(mix(rock,[40,40,50],0.25)));g.addColorStop(0.45,rgb(lit));g.addColorStop(1,rgb(mix(rock,[30,30,40],0.4)));
  ctx.fillStyle=g;ctx.beginPath();
  for(let y=from;y<=to;y+=12)ctx.lineTo(wallL(y),sy(y));
  for(let y=to;y>=from;y-=12)ctx.lineTo(wallR(y),sy(y));
  ctx.closePath();ctx.fill();
  /* Gipfelspitze */
  const ty=sy(top);if(ty>-60){ctx.fillStyle=rgb(lit);ctx.beginPath();ctx.moveTo(wallL(top),ty);ctx.lineTo(W*0.52,ty-46);ctx.lineTo(wallR(top),ty);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.moveTo(W*0.36,ty-22);ctx.lineTo(W*0.52,ty-46);ctx.lineTo(W*0.68,ty-22);ctx.lineTo(W*0.55,ty-28);ctx.lineTo(W*0.46,ty-20);ctx.closePath();ctx.fill();}
  /* Felsplatten mit Licht und Schatten, Risse, Schnee - je Band gleich, damit nichts flimmert */
  const first=Math.floor(from/46),last=Math.floor(to/46);
  for(let row=first;row<=last;row++){
    const y=row*46;if(y>top-10||y<bottomY)continue;
    for(let j=0;j<3;j++){
      const a=rnd(row*3+j),b=rnd(row*3+j+500),c=rnd(row*3+j+900);
      const x0=wallL(y)+8+(a*0.85)*(wallR(y)-wallL(y)-60),w=36+b*60,h=24+c*22,Y=sy(y+h);
      /* Felsplatte: helle Oberseite, dunkle Flanke, Schattenkante */
      ctx.fillStyle='rgba(255,255,255,'+(0.13+0.08*c)+')';ctx.beginPath();ctx.moveTo(x0,Y+h);ctx.lineTo(x0+w*0.2,Y);ctx.lineTo(x0+w,Y+h*0.2);ctx.lineTo(x0+w*0.85,Y+h*0.9);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(0,0,0,'+(0.2+0.12*b)+')';ctx.beginPath();ctx.moveTo(x0+w*0.85,Y+h*0.9);ctx.lineTo(x0+w,Y+h*0.2);ctx.lineTo(x0+w*1.06,Y+h);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(20,18,24,.28)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x0,Y+h);ctx.lineTo(x0+w*1.06,Y+h);ctx.stroke();
    }
    const a=rnd(row),bb=rnd(row+77),Y=sy(y);
    /* Gesteinsschichten: leicht gewellte, dunklere Baender */
    if(row%3===0){ctx.strokeStyle='rgba(60,40,30,.16)';ctx.lineWidth=5;ctx.beginPath();
      for(let x=wallL(y);x<=wallR(y);x+=20)ctx.lineTo(x,Y+Math.sin(x*0.03+row)*4);ctx.stroke();}
    /* Unten Grasbueschel und kleine Kiefern an den Raendern */
    if(y<5*P){const gx=rnd(row+2000)<0.5?wallL(y)+6:wallR(y)-6;
      ctx.fillStyle='#5E8A4E';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(gx-6+i*4,Y);ctx.lineTo(gx-4+i*4,Y-8-rnd(row+i)*6);ctx.lineTo(gx-2+i*4,Y);ctx.closePath();ctx.fill();}
      if(rnd(row+2100)<0.35){ctx.fillStyle='#2F5E45';ctx.beginPath();ctx.moveTo(gx-9,Y-4);ctx.lineTo(gx,Y-30);ctx.lineTo(gx+9,Y-4);ctx.closePath();ctx.fill();}}
    ctx.strokeStyle='rgba(20,18,24,.35)';ctx.lineWidth=1.6;ctx.beginPath();
    ctx.moveTo(wallL(y)+a*(W-80)+20,Y);ctx.lineTo(wallL(y)+a*(W-80)+34+bb*14,Y-16);ctx.lineTo(wallL(y)+a*(W-80)+28+bb*30,Y-34);ctx.stroke();
    /* Schnee nimmt nach oben zu, Eis glaenzt im oberen Teil */
    const snow=clamp(y/(G.goal*P)*1.3-0.15,0,0.9);
    if(rnd(row+1300)<snow){ctx.fillStyle='rgba(248,250,255,.9)';const sx=wallL(y)+rnd(row+1400)*(wallR(y)-wallL(y)-60)+20;
      ctx.beginPath();ctx.ellipse(sx,Y-8,22+bb*24,5+a*4,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(sx+10,Y-11,12,4,0,0,7);ctx.fill();}
    if(y>8*P&&rnd(row+1700)<0.4){ctx.fillStyle='rgba(170,220,255,.22)';const ix=wallL(y)+rnd(row+1800)*(W-120)+20;
      ctx.beginPath();ctx.moveTo(ix,Y);ctx.lineTo(ix+60,Y-6);ctx.lineTo(ix+50,Y-40);ctx.lineTo(ix+6,Y-30);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ix+14,Y-10);ctx.lineTo(ix+34,Y-30);ctx.stroke();}
  }
  /* Basecamp und Lager als Felsbaender mit Zelt */
  for(let camp=0;camp*CAMP<G.goal;camp++){
    const y=camp*CAMP*P-84,Y=sy(y);if(Y<-60||Y>H+60)continue;
    ctx.fillStyle='rgba(0,0,0,.3)';rounded(wallL(y)-4,Y,wallR(y)-wallL(y)+8,12,6);ctx.fill();
    ctx.fillStyle='rgba(244,241,234,.95)';rounded(wallL(y)-4,Y-4,wallR(y)-wallL(y)+8,8,4);ctx.fill();
    const tx=camp%2?W-80:40;
    ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.moveTo(tx,Y-4);ctx.lineTo(tx+20,Y-34);ctx.lineTo(tx+40,Y-4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.moveTo(tx+14,Y-4);ctx.lineTo(tx+20,Y-18);ctx.lineTo(tx+26,Y-4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#FFC857';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tx+20,Y-34);ctx.lineTo(tx+20,Y-46);ctx.stroke();
    ctx.fillStyle='#FFC857';ctx.beginPath();ctx.moveTo(tx+20,Y-46);ctx.lineTo(tx+32,Y-42+Math.sin(G.time*5)*2);ctx.lineTo(tx+20,Y-38);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(244,241,234,.9)';ctx.font='800 10px '+FONT;ctx.textAlign=camp%2?'right':'left';ctx.textBaseline='alphabetic';
    ctx.fillText(camp?'LAGER '+camp+' · '+(camp*CAMP*METER)+' m':'BASECAMP',camp%2?tx-8:tx+48,Y-12);
  }
  /* Gipfelfahne: wird oben gehisst */
  if(ty>-90&&ty<H+40){
    const fx=W*0.52,fy=ty-46,hoch=G.k>=G.goal?G.flag:0,wave=Math.sin(G.time*5)*3;
    ctx.strokeStyle='#F4F1EA';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-58);ctx.stroke();
    const top2=fy-18-40*hoch;
    ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.moveTo(fx,top2);ctx.lineTo(fx+32,top2+8+wave);ctx.lineTo(fx,top2+16);ctx.closePath();ctx.fill();
  }
}
/* Sicherungen und Seil: von der letzten Sicherung zum Gurt */
function drawRope(hx,hy){
  for(const o of G.old){const Y=sy(o.y)+8;ctx.fillStyle='#C9CED8';ctx.beginPath();ctx.arc(o.x,Y,3.2,0,7);ctx.fill();ctx.strokeStyle='#FFB35C';ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,Y+5,4,0.3,Math.PI*2-0.3);ctx.stroke();}
  const a=G.old.length?G.old[G.old.length-1]:{x:W/2,y:-60};
  const ax=a.x,ay=sy(a.y)+12;
  ctx.strokeStyle='rgba(127,224,208,.95)';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(hx,hy);
  ctx.quadraticCurveTo((hx+ax)/2-8,Math.max(hy,ay)+26,ax,ay);ctx.stroke();
}
function itemIcon(type,x,y,s){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  if(type==='kristall'){ctx.fillStyle='#8FE8FF';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,-3);ctx.lineTo(0,13);ctx.lineTo(-10,-3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#D8FAFF';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(4,-3);ctx.lineTo(0,13);ctx.lineTo(-10,-3);ctx.closePath();ctx.fill();}
  else if(type==='edelweiss'){ctx.fillStyle='#FFFFFF';for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);ctx.beginPath();ctx.ellipse(0,-8,3.6,8,0,0,7);ctx.fill();ctx.restore();}
    ctx.fillStyle='#E8D78A';ctx.beginPath();ctx.arc(0,0,4.6,0,7);ctx.fill();ctx.fillStyle='#C9B25A';ctx.beginPath();ctx.arc(-1.5,-1,1.2,0,7);ctx.arc(1.5,1,1.2,0,7);ctx.fill();}
  else if(type==='karabiner'){ctx.strokeStyle='#FFB35C';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,7,11,0,0,7);ctx.stroke();ctx.strokeStyle='#C9CED8';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(7,-6);ctx.lineTo(7,6);ctx.stroke();}
  else if(type==='seil'){ctx.strokeStyle='#7FE0D0';ctx.lineWidth=3.4;for(const r of [10,6.5,3]){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();}ctx.beginPath();ctx.moveTo(10,0);ctx.quadraticCurveTo(14,8,8,14);ctx.stroke();}
  else if(type==='pickel'){ctx.strokeStyle='#8A5A34';ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(-6,12);ctx.lineTo(6,-10);ctx.stroke();
    ctx.fillStyle='#C9CED8';ctx.beginPath();ctx.moveTo(-6,-12);ctx.lineTo(13,-8);ctx.lineTo(11,-5);ctx.lineTo(-3,-7);ctx.closePath();ctx.fill();}
  ctx.restore();
}
function drawBonus(){
  const b=G.bonus;if(!b||b.got)return;
  const Y=sy(b.y)+Math.sin(G.time*3)*4,f=clamp(b.t/BONUS_TIME,0,1);
  const glow=ctx.createRadialGradient(b.x,Y,2,b.x,Y,30);glow.addColorStop(0,'rgba(255,255,255,.55)');glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(b.x-30,Y-30,60,60);
  ctx.fillStyle='rgba(13,16,23,.55)';ctx.beginPath();ctx.arc(b.x,Y,20,0,7);ctx.fill();
  ctx.strokeStyle=f>0.35?'#FFC857':'#FF6B6B';ctx.lineWidth=3.4;ctx.beginPath();ctx.arc(b.x,Y,20,-Math.PI/2,-Math.PI/2+Math.PI*2*f);ctx.stroke();
  itemIcon(b.type,b.x,Y,1);
}
function drawHolds(){
  if(G.mode==='camp'||G.mode==='summit')return;
  for(const h of G.holds){
    if(h.state==='taken'||h.state==='broken')continue;
    const eagleT=G.eagle&&G.eagle.hold===h&&h.state==='eagle';
    if(eagleT)continue;
    const Y=sy(h.y),dim=blocked(h);
    if(!h.label)h.label=fit(h.w.en,100);
    const lines=h.label.lines,lh=h.label.size+3,ph=lines.length*lh+14,py=Y+18;
    ctx.globalAlpha=dim?0.5:1;
    /* Griff: Felsnase mit Farbband */
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(h.x,Y+5,24,12,0,0,7);ctx.fill();
    ctx.fillStyle=h.icy?'#CFE9FF':'#8D857D';ctx.beginPath();ctx.moveTo(h.x-24,Y+2);ctx.quadraticCurveTo(h.x-18,Y-13,h.x,Y-14);ctx.quadraticCurveTo(h.x+20,Y-13,h.x+24,Y+2);ctx.quadraticCurveTo(h.x,Y+9,h.x-24,Y+2);ctx.fill();
    ctx.fillStyle=HOLD[h.lane];ctx.fillRect(h.x-22,Y-4,44,5);
    ctx.fillStyle='rgba(255,255,255,'+(h.icy?0.8:0.3)+')';ctx.beginPath();ctx.ellipse(h.x-7,Y-8,8,3,-0.2,0,7);ctx.fill();
    if(h.icy){ctx.fillStyle='rgba(220,245,255,.9)';for(const dx of [-14,-2,10])
      {ctx.beginPath();ctx.moveTo(h.x+dx,Y+3);ctx.lineTo(h.x+dx+3,Y+11);ctx.lineTo(h.x+dx+6,Y+3);ctx.closePath();ctx.fill();}}
    /* Schild mit dem Wort */
    ctx.fillStyle='rgba(0,0,0,.35)';rounded(h.x-55,py+3,110,ph,12);ctx.fill();
    ctx.fillStyle='#F4F1EA';rounded(h.x-55,py,110,ph,12);ctx.fill();
    ctx.fillStyle=HOLD[h.lane];rounded(h.x-55,py,110,5,3);ctx.fill();
    ctx.fillStyle='#151B2B';ctx.font='700 '+h.label.size+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((l,n)=>ctx.fillText(l,h.x,py+9+lh/2+n*lh));
    if(h.icy){ctx.fillStyle='#4E8FC9';ctx.font='800 9px '+FONT;ctx.fillText('EIS',h.x+40,py+12);}
    ctx.globalAlpha=1;
  }
  for(const b of G.bits){ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle='#8A93A6';ctx.beginPath();ctx.arc(b.x,sy(b.y),b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;
}
function drawRock(){
  const R=G.rock;if(!R)return;
  const x=LANES[R.lane];
  if(R.phase==='warn'){
    const a=0.25+0.2*Math.sin(G.time*18);
    const gw=ctx.createLinearGradient(0,0,0,H);gw.addColorStop(0,'rgba(255,80,60,'+a+')');gw.addColorStop(1,'rgba(255,80,60,0)');
    ctx.fillStyle=gw;ctx.fillRect(x-48,0,96,H);
    ctx.fillStyle='#FF5A4F';ctx.beginPath();ctx.moveTo(x,14);ctx.lineTo(x+14,38);ctx.lineTo(x-14,38);ctx.closePath();ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.font='900 16px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x,30);
  }else{
    ctx.fillStyle='rgba(120,110,100,.18)';ctx.fillRect(x-46,0,92,H);
    for(const s of R.stones){const Y=sy(s.y);ctx.save();ctx.translate(s.x,Y);ctx.rotate(s.rot);
      ctx.fillStyle='#6E6A66';ctx.beginPath();ctx.moveTo(-s.r,0);ctx.lineTo(-s.r*0.4,-s.r);ctx.lineTo(s.r*0.8,-s.r*0.6);ctx.lineTo(s.r,s.r*0.4);ctx.lineTo(0,s.r);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.moveTo(-s.r*0.4,-s.r);ctx.lineTo(s.r*0.8,-s.r*0.6);ctx.lineTo(0,-s.r*0.2);ctx.closePath();ctx.fill();ctx.restore();}
  }
}
function drawEagle(){
  const E=G.eagle;if(!E)return;
  const h=E.hold,tx=h.x,ty=sy(h.y)-6;
  let x,y;
  if(E.t<1.2){const t=E.t/1.2;x=tx+E.side*(1-t)*(W*0.8);y=ty-(1-t)*(1-t)*140;}
  else{const t=(E.t-1.2)/2.2;x=tx-E.side*t*W*0.9;y=ty-t*t*260-Math.sin(t*3)*12;}
  const flap=Math.sin(G.time*14)*0.6,s=1;
  ctx.save();ctx.translate(x,y);ctx.scale(-E.side*s,s);
  if(E.t>=1.2&&E.t<4.2){ctx.fillStyle='#8D857D';ctx.beginPath();ctx.ellipse(0,18,16,8,0,0,7);ctx.fill();ctx.fillStyle='#F4F1EA';rounded(-30,24,60,14,6);ctx.fill();}
  ctx.fillStyle='#5B3A22';
  ctx.beginPath();ctx.moveTo(-4,-2);ctx.quadraticCurveTo(-30,-26-flap*20,-52,-8-flap*30);ctx.quadraticCurveTo(-30,-6,-6,6);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(4,-2);ctx.quadraticCurveTo(30,-26-flap*20,52,-8-flap*30);ctx.quadraticCurveTo(30,-6,6,6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7A4E2C';ctx.beginPath();ctx.ellipse(0,2,9,14,0,0,7);ctx.fill();
  ctx.fillStyle='#C99A4B';ctx.beginPath();ctx.arc(0,-12,7,0,7);ctx.fill();
  ctx.fillStyle='#FFC857';ctx.beginPath();ctx.moveTo(-2,-11);ctx.lineTo(6,-8);ctx.lineTo(-1,-6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(2,-14,1.4,0,7);ctx.fill();
  ctx.fillStyle='#5B3A22';ctx.beginPath();ctx.moveTo(-6,14);ctx.lineTo(0,24);ctx.lineTo(6,14);ctx.closePath();ctx.fill();
  ctx.restore();
  if(!E.done){ctx.fillStyle='rgba(13,16,23,.72)';rounded(W/2-70,8,140,26,13);ctx.fill();ctx.fillStyle='#FFD27A';ctx.font='800 12px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Adler! Jetzt richtig = +150',W/2,21);}
}
function drawClimber(){
  let x=G.climber.x,y=sy(G.climber.y);
  if(G.mode==='slip'&&!ruhig){const t=G.t;x+=Math.sin(t*26)*5*(1-t);y+=Math.sin(t*Math.PI)*12;}
  if(G.iceT>0&&!ruhig)y+=Math.sin((0.6-G.iceT)/0.6*Math.PI)*18;
  if(G.mode==='hurt'&&!ruhig)x+=Math.sin(G.time*40)*4;
  const jumping=G.mode==='jump',reach=jumping?Math.sin(clamp(G.t,0,1)*Math.PI):0;
  const kick=G.mode==='slip'||G.mode==='hurt'?Math.sin(G.time*20):jumping?Math.sin(G.t*Math.PI*2)*0.6:Math.sin(G.time*2)*0.15;
  const wer=rider(),wave=ruhig?0:Math.sin(G.time*3)*1.2;
  /* Hueftposition fuer das Seil */
  const hipY=y+(wer==='kid'?62:wer==='silky'?44:38);
  if(G.mode!=='summit')drawRope(x,hipY);
  /* Der Griff, an dem die Figur gerade haengt */
  if(G.mode!=='summit'&&G.mode!=='jump'){const gy=sy(G.climber.y);
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(G.climber.x,gy+5,22,10,0,0,7);ctx.fill();
    ctx.fillStyle='#8D857D';ctx.beginPath();ctx.moveTo(G.climber.x-22,gy+3);ctx.quadraticCurveTo(G.climber.x-16,gy-10,G.climber.x,gy-11);ctx.quadraticCurveTo(G.climber.x+18,gy-10,G.climber.x+22,gy+3);ctx.quadraticCurveTo(G.climber.x,gy+9,G.climber.x-22,gy+3);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(G.climber.x-6,gy-6,7,2.6,-0.2,0,7);ctx.fill();}
  if(G.mode==='summit'){
    /* Am Gipfel: auf der Spitze stehen und jubeln */
    const ty=sy(G.goal*P+60),gy=ty-34;x=W*0.40;
    if(wer==='silky')F.silky(ctx,x,gy,0.85,{wave:Math.sin(G.time*6),blink:G.time});
    else if(wer==='penguin')F.pinguin(ctx,x,gy,1.0,{wave:Math.sin(G.time*8),scarf:true,goggles:true,blush:true});
    else F.kindKlettern(ctx,x,gy-70,1,{reach:0,kick:0,wave:Math.sin(G.time*8)*4});
    return;
  }
  if(wer==='silky')F.silky(ctx,x,y+56+reach*-6,0.82,{hoch:true,wave,blink:G.time});
  else if(wer==='penguin')F.pinguin(ctx,x,y+50+reach*-6,0.9,{hoch:true,wave,scarf:true,goggles:true});
  else F.kindKlettern(ctx,x,y,1,{reach,kick,wave});
}
function drawFog(){
  const Y=sy(G.fog);if(Y>H+120)return;
  const near=clamp(1-(G.climber.y-G.fog-50)/(MAX_GAP*P-50),0,1);
  /* Wabernde Nebelwand aus mehreren Schichten */
  for(let l=0;l<3;l++){
    const off=l*18,a=[0.28,0.5,0.92][l];
    ctx.fillStyle='rgba('+(226-l*6)+','+(232-l*4)+','+(242-l*2)+','+a+')';ctx.beginPath();ctx.moveTo(-10,H+10);ctx.lineTo(-10,Y-60+off);
    for(let x=-10;x<=W+10;x+=16)ctx.lineTo(x,Y-60+off+Math.sin(x*(0.03+l*0.012)+G.time*(1.1-l*0.25)+l)*(12-l*2)+Math.sin(x*0.011-G.time*0.6)*8);
    ctx.lineTo(W+10,H+10);ctx.closePath();ctx.fill();
  }
  if(!ruhig)for(let i=0;i<9;i++){const px=((rnd(i)*W+G.time*(10+i*3))%(W+80))-40,py=Y-38+Math.sin(G.time+i)*10;
    ctx.fillStyle='rgba(240,244,250,.55)';ctx.beginPath();ctx.arc(px,py,14+rnd(i+9)*12,0,7);ctx.fill();}
  /* Ganz nah: dunkler Rand und Wetterleuchten */
  if(near>0.6){ctx.fillStyle='rgba(60,70,95,'+(near-0.6)*0.6+')';ctx.fillRect(0,Y-20,W,H-Y+30);
    if(!ruhig&&Math.sin(G.time*5.3)>0.97){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(0,0,W,H);}}
}
function drawStatus(){
  if(G.mode==='summit'||G.mode==='camp')return;
  ctx.textBaseline='middle';ctx.textAlign='left';
  const pills=[];
  pills.push({w:58,draw:(x,y)=>{ctx.fillStyle='#FFFFFF';ctx.font='800 13px '+FONT;ctx.fillText('×'+multiplier().toFixed(1).replace('.',','),x+10,y+14);}});
  if(G.streak>=3)pills.push({w:84,bg:'rgba(255,200,87,.92)',draw:(x,y)=>{ctx.fillStyle='#2A1A00';ctx.font='900 12px '+FONT;ctx.fillText('Serie '+G.streak,x+10,y+14);}});
  if(G.karabiner)pills.push({w:36,bg:'rgba(255,179,92,.95)',draw:(x,y)=>itemIcon('karabiner',x+18,y+14,0.85)});
  if(G.seil)pills.push({w:36,bg:'rgba(127,224,208,.95)',draw:(x,y)=>itemIcon('seil',x+18,y+14,0.8)});
  let x=8;const y=8;for(const p of pills){ctx.fillStyle=p.bg||'rgba(13,16,23,.68)';rounded(x,y,p.w,28,14);ctx.fill();p.draw(x,y);x+=p.w+6;}
  /* Nebelabstand am rechten Rand */
  const near=clamp(1-(G.climber.y-G.fog-50)/(MAX_GAP*P-50),0,1),gx=W-18,gy=46,gh=120;
  ctx.fillStyle='rgba(13,16,23,.6)';rounded(gx-6,gy-6,20,gh+12,10);ctx.fill();
  const gc=ctx.createLinearGradient(0,gy+gh,0,gy);gc.addColorStop(0,'#FF5A4F');gc.addColorStop(0.5,'#FFC857');gc.addColorStop(1,'#7FE0D0');
  ctx.fillStyle='rgba(255,255,255,.15)';rounded(gx,gy,8,gh,4);ctx.fill();
  const fh=gh*(1-near);ctx.fillStyle=gc;rounded(gx,gy+gh-fh,8,Math.max(6,fh),4);ctx.fill();
  ctx.fillStyle='#FFFFFF';ctx.font='700 8px '+FONT;ctx.textAlign='center';ctx.fillText('NEBEL',gx+4,gy+gh+16);
}
function draw(){
  if(!ctx)return;
  const p=progress();
  ctx.save();
  if(G.shake>0&&!ruhig)ctx.translate((Math.random()-.5)*12*G.shake,(Math.random()-.5)*12*G.shake);
  drawSky(p);drawValley(p);drawWall(p);
  drawRock();drawBonus();drawHolds();drawClimber();drawEagle();
  for(const s of G.sparks){ctx.globalAlpha=clamp(s.life,0,1);ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(s.x,sy(s.y),1.8+s.life*1.4,0,7);ctx.fill();}
  ctx.globalAlpha=1;
  drawFog();
  ctx.restore();
  ctx.textAlign='center';ctx.textBaseline='middle';
  G.popups.forEach((q,i)=>{const a=clamp(q.life,0,1),y=sy(G.climber.y)-30-(1.3-q.life)*50-(G.popups.length-1-i)*26;
    ctx.globalAlpha=a;ctx.font='900 '+(q.text.length>12?15:22)+'px '+FONT;ctx.lineWidth=5;ctx.strokeStyle='rgba(13,16,23,.75)';ctx.strokeText(q.text,W/2,y);ctx.fillStyle=q.color;ctx.fillText(q.text,W/2,y);});
  ctx.globalAlpha=1;
  drawStatus();
  if(G.mode==='hurt'){ctx.fillStyle='rgba(255,60,60,'+(0.25*G.hurtT/1.3)+')';ctx.fillRect(0,0,W,H);}
  if(G.bannerT>0){
    ctx.globalAlpha=Math.min(1,G.bannerT*2);ctx.fillStyle='rgba(13,16,23,.82)';rounded(40,H*0.2,W-80,56,18);ctx.fill();
    ctx.fillStyle='#F4F1EA';ctx.font='800 22px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(G.banner,W/2,H*0.2+29);ctx.globalAlpha=1;
  }
  if(G.paused){
    ctx.fillStyle='rgba(13,16,23,.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 26px '+FONT;ctx.fillText('Pause',W/2,H/2-12);ctx.font='500 14px '+FONT;ctx.fillText('Tippen zum Weiterklettern',W/2,H/2+18);
  }
}
/* Vorschaubild im Figuren-Knopf */
function vorschau(cv,wer){
  let c2=null;try{c2=cv&&cv.getContext?cv.getContext('2d'):null;}catch(e){c2=null;}
  if(!c2)return;
  c2.clearRect(0,0,120,120);
  if(wer==='silky')F.silky(c2,58,112,1.15,{hoch:true,wave:0.4});
  else if(wer==='penguin')F.pinguin(c2,60,112,1.5,{hoch:true,scarf:true,goggles:true,blush:true});
  else F.kindKlettern(c2,60,14,1.3,{reach:0,kick:0.2});
}
let running=false,last=0;
function loop(){
  if(running||!window.requestAnimationFrame)return;
  running=true;last=0;
  const frame=now=>{
    if(G.mode==='menu'||G.mode==='over'){running=false;return;}
    const dt=last?Math.min(0.05,(now-last)/1000):0;last=now;
    update(dt);draw();requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

window.ClimbGame={G,start,choose,update,finish,showMenu,pause,answerChallenge,_next:next,P,GOAL,CAMP,METER,HEARTS,MAX_HEARTS,BONUS_TIME,MAX_GAP,rider,unlocked,multiplier};
showMenu();
})();
