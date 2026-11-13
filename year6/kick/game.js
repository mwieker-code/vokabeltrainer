/* =========================================================================
   FREE KICK TOUR – Freistoss-Tour mit den Vokabeln von Year 6, Unit 2
   Ueber dem Tor steht das deutsche Wort, im Tor haengen vier Tafeln mit
   englischen Woertern - eine in jeder Ecke. Wer vom Ball zur richtigen
   Tafel wischt, schiesst dorthin. Fuenfzehn Schuesse an drei Orten:
     Bolzplatz  nur der Torwart
     Schulhof   dazu Mauer und Wind
     Stadion    Flutlicht, groessere Mauer, mehr Wind, die Tafeln wandern
   Steuerung: Die Richtung und das Ende des Wischens bestimmen das Ziel,
   das Tempo des Wischens die Schaerfe (zu langsam: der Ball sackt ab, zu
   schnell: er steigt), ein Bogen im Wischen gibt dem Ball Effet.
   Fair bleibt es so: Nur eine falsche Tafel kostet ein Herz. Gehalten,
   Mauer, Pfosten oder daneben kosten die Serie, nie ein Herz.
   Wie bei den anderen Spielen zaehlt nichts in die Lernfaecher; gespeichert
   werden nur Bestwerte, Touren und die Wahl (vt6:kick:v1). Die Vokabeln
   kommen aus ../climb/data.js. Die Spiellogik (start, shoot, update)
   braucht keine Zeichenflaeche, damit die Tests sie ohne Browser spielen.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,KEY='vt6:kick:v1',M=window.KickMusik||null,SP=window.Spieler;
const $=id=>document.getElementById(id);
const menu=$('menu'),stage=$('stage'),over=$('over'),canvas=$('feld'),promptEl=$('prompt'),chips=$('chips');
let ctx=null;try{ctx=canvas.getContext?canvas.getContext('2d'):null;}catch(e){ctx=null;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const r10=v=>Math.round(v/10)*10;
const ruhig=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ----------------------------------------------------------------- Regeln */
const SHOTS=15,PER=5,HEARTS=3,UNLOCK=3;
const GW=3.66,GH=2.44,BR=0.11,POST=0.12,WALLZ=9.15,WALLH=1.95;
const RUNUP=0.3,KRAFT_MAX=2800;      // Anlauf (s), hoechstes Tempo der Kraftleiste
/* Zeitlupe: Der Flug wird etwas gedehnt gezeigt, aber nie laenger als 1,25 s. */
const zeitlupe=T=>clamp(T*1.35,0.55,1.25)/T;
/* Drei Orte. D: Abstand zum Tor (m), wall: Spieler in der Mauer, wind: hoechster
   Seitenwind am Tor (m), move: wie weit die Tafeln wandern (m). Der Torwart:
   read = wie oft er die Ecke ahnt, react = Reaktionszeit (s), dive = m/s. */
const ORTE=[
  {id:'bolzplatz',name:'Bolzplatz',D:14,wall:0,wind:0,  move:0,   read:0.35,react:0.34,dive:4.4,info:'Nur du und der Torwart. Wische vom Ball zum richtigen Wort!'},
  {id:'schulhof', name:'Schulhof', D:17,wall:3,wind:0.9,move:0,   read:0.45,react:0.3, dive:4.6,info:'Jetzt mit Mauer und Wind. Wische im Bogen für Kurve!'},
  {id:'stadion',  name:'Stadion',  D:20,wall:4,wind:1.3,move:0.32,read:0.5, react:0.27,dive:4.8,info:'Flutlicht! Die Wörter wandern – ziel genau.'}];
/* Normal und Profi. sweet: Wischtempo fuer einen sauberen Schuss (Einheiten/s). */
const MODI={normal:{name:'Normal',punkte:1,sweet:[600,2400],read:0,react:0,dive:1,wind:1},
            profi:{name:'Profi',punkte:1.5,sweet:[750,2000],read:0.1,react:0.04,dive:1.12,wind:1.25}};
const modus=()=>MODI[G.modus]||MODI.normal;
const ort=()=>ORTE[Math.min(ORTE.length-1,Math.floor(G.k/PER))];
const multiplier=()=>(1+0.1*Math.min(G.streak,10))*modus().punkte;
const bestKey=id=>(G.modus==='profi'?'profi:':'')+id;
/* Die vier Tafeln: 0 oben links, 1 oben rechts, 2 unten links, 3 unten rechts */
const ZONEN=['oben links','oben rechts','unten links','unten rechts'];
const ZFARBE=['#FF7A59','#3CCFBE','#FFC857','#B993FF'];
function tafel(i,zeit){
  const m=ort().move*Math.sin((zeit||0)*0.8+i*1.9),links=i%2===0,oben=i<2;
  return {x0:(links?-3.3:0.4)+m,x1:(links?-0.4:3.3)+m,y0:oben?1.36:0.14,y1:oben?2.3:1.08};
}
const mitte=(i,zeit)=>{const t=tafel(i,zeit);return {x:(t.x0+t.x1)/2,y:(t.y0+t.y1)/2};};
function tafelAn(x,y,zeit){
  for(let i=0;i<4;i++){const t=tafel(i,zeit);if(x>=t.x0-BR*0.5&&x<=t.x1+BR*0.5&&y>=t.y0-BR*0.5&&y<=t.y1+BR*0.5)return i;}
  return -1;
}

let saved={best:{},tours:{},player:'leo',modus:'normal'};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object'&&p.tours&&typeof p.tours==='object')saved={best:p.best,tours:p.tours,player:['mia','flash'].includes(p.player)?p.player:'leo',modus:p.modus==='profi'?'profi':'normal'};}catch(e){}
const totalTours=()=>Object.values(saved.tours).reduce((a,b)=>a+(Number(b)||0),0);
const unlocked=()=>totalTours()>=UNLOCK;
const player=()=>saved.player==='mia'?'mia':saved.player==='flash'&&unlocked()?'flash':'leo';
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}

const ALL={id:'all',name:'Ganze Unit'};
const wordsOf=id=>id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||{words:[]}).words;
const pool=D.parts.flatMap(p=>p.words);

const frisch=()=>({mode:'menu',part:null,queue:[],k:0,q:null,options:[],right:0,hearts:HEARTS,score:0,streak:0,goals:0,
  missed:new Map(),requeued:new Set(),t:0,time:0,aimTime:0,paused:false,shot:null,ft:0,wind:0,wallX:0,lean:0,kx:0,golden:false,
  marker:null,markerZone:-1,charge:null,drag:null,bits:[],confetti:[],sparks:[],popups:[],rings:[],shake:0,jubel:0,flash:0,won:false,
  noKeeper:false,modus:saved.modus,station:0});
const G=frisch();

/* ------------------------------------------------------------- Ablauf */
function start(partId){
  const words=wordsOf(partId);if(words.length<4)return;
  let queue=[];while(queue.length<SHOTS)queue=queue.concat(shuffle(words));
  const keep=G.noKeeper;Object.assign(G,frisch(),{part:partId,queue,noKeeper:keep});
  menu.hidden=true;over.hidden=true;stage.hidden=false;document.querySelector('main.kick')?.classList.add('spielt');
  try{window.scrollTo(0,0);}catch(e){}
  resize();next();hud();loop();
  M?.stop();M?.start();musikKnopf();M?.sfx('pfiff');
}
function distractors(q){
  const others=pool.filter(w=>w.id!==q.id&&w.en!==q.en&&w.de!==q.de);
  const out=[];
  for(const w of [...shuffle(others.filter(w=>w.pos===q.pos)),...shuffle(others.filter(w=>w.pos!==q.pos))]){
    if(!out.some(o=>o.en===w.en||o.de===w.de))out.push(w);if(out.length===3)break;}
  return out;
}
function next(){
  G.q=G.queue.shift();G.options=shuffle([G.q,...distractors(G.q)]);G.right=G.options.indexOf(G.q);
  G.shot=null;G.ft=0;G.aimTime=0;G.marker=null;G.markerZone=-1;G.charge=null;G.drag=null;
  const o=ort(),md=modus(),neu=G.k%PER===0;G.station=ORTE.indexOf(o);
  G.wind=o.wind?(Math.random()<0.5?-1:1)*o.wind*md.wind*(0.35+0.65*Math.random()):0;
  G.wallX=o.wall?(Math.random()<0.5?-1:1)*1.85*WALLZ/o.D:0;
  G.lean=Math.random()<0.45?(Math.random()<0.5?-1:1)*(0.45+Math.random()*0.35):0;G.kx=G.lean;
  G.golden=G.k>=2&&Math.random()<0.16;
  G.mode=neu?'intro':'aim';G.t=0;
  layout();
  promptEl.textContent=G.q.de;
  chips.innerHTML=G.options.map((w,i)=>'<button data-zone="'+i+'" lang="en" aria-label="'+ZONEN[i]+': '+esc(w.en)+'"><span aria-hidden="true">'+['↖','↗','↙','↘'][i]+'</span>'+esc(w.en)+'</button>').join('');
  chips.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>chip(Number(b.dataset.zone)));
  mark();hud();
  if(neu&&G.k>0)M?.sfx('pfiff');
}
function mark(){
  chips.querySelectorAll('[data-zone]').forEach(b=>{const i=Number(b.dataset.zone),R=G.shot&&G.shot.done?G.shot:null;
    b.setAttribute('aria-pressed',String(i===G.markerZone));
    b.classList.toggle('right',!!R&&i===G.right&&(R.kind==='tor'||R.kind==='falsch'));
    b.classList.toggle('wrong',!!R&&R.kind==='falsch'&&i===R.zone);});
}
function popup(text,color,big){G.popups.push({text,color:color||'#FFC857',life:big?1.8:1.3,big:!!big,age:0});}

/* Ein Schuss: Ziel (tx, ty) in der Torebene in Metern, Wischtempo u, Effet c
   (m Ausbeulung in der Flugmitte). Alles wird beim Abschuss entschieden und
   danach nur noch gezeigt. */
function shoot(inp){
  if(G.paused||G.mode!=='aim')return null;
  const R=plan(inp);
  G.shot=R;G.mode='anlauf';G.t=0;G.marker=null;G.markerZone=-1;G.charge=null;G.drag=null;mark();
  return R;
}
/* Plant einen Schuss, ohne ihn abzugeben (auch fuer die Tests). */
function plan(inp){
  const o=ort(),md=modus(),[lo,hi]=md.sweet;
  const u=clamp(Number(inp.u)||0,0,4000),c=clamp(Number(inp.c)||0,-2.4,2.4);
  let tx=clamp(Number(inp.tx)||0,-8,8),ty=Number(inp.ty)||0;
  let v=14+clamp((u-400)/1400,0,1.3)*16,kraft='gut';
  if(u>hi){ty+=(u-hi)/700;kraft='fest';}
  if(u<lo){const f=(lo-u)/lo;ty-=f*1.6;v*=1-f*0.45;kraft='schwach';}
  ty=clamp(ty,BR,8);
  const fx=tx+G.wind,fy=ty,T=o.D/v,slow=zeitlupe(T),Tv=T*slow,arc=0.3+0.75*fy+(kraft==='schwach'?0.35:0);
  const zeit=G.time+RUNUP+Tv;
  const R={tx,ty,fx,fy,u,c,T,Tv,slow,arc,kraft,wind:G.wind,D:o.D,zeit,src:inp.src||'wisch',golden:G.golden,station:G.station,done:false};
  R.at=t=>({x:tx*t+c*4*t*(1-t)+G.wind*t*t,y:Math.max(BR,BR+(fy-BR)*t+arc*4*t*(1-t)),z:o.D*t});
  /* Mauer */
  let blocked=false;
  if(o.wall){const tw=WALLZ/o.D,p=R.at(tw);blocked=Math.abs(p.x-G.wallX)<o.wall*0.25+BR&&p.y<WALLH+BR;R.tw=tw;}
  /* Torebene */
  const inGoal=Math.abs(fx)<=GW-BR&&fy<=GH-BR,frame=!inGoal&&Math.abs(fx)<GW+POST+BR&&fy<GH+POST+BR;
  const zone=inGoal?tafelAn(fx,fy,zeit):-1;
  R.zone=zone;R.knew=zone===G.right;R.blocked=blocked;
  /* Torwart: ahnt er die Ecke, fliegt er dorthin, sonst zur Seite, zu der er
     sich lehnt (oder auf gut Glueck). */
  const read=clamp(o.read+md.read,0,0.95),react=Math.max(0.12,o.react-md.react),dive=o.dive*md.dive,kx0=G.kx;
  const reads=Math.random()<read;
  const aimX=reads?fx:(G.lean?Math.sign(G.lean):(Math.random()<0.5?-1:1))*2.4;
  const reach=Math.max(0,T-react),dist=aimX-kx0,kxT=kx0+Math.sign(dist)*Math.min(Math.abs(dist),dive*reach);
  const weit=fy>1.95?0.62:0.82;
  const saved_=!G.noKeeper&&(Math.abs(fx-kxT)<weit||(Math.abs(kxT-kx0)<0.5&&Math.abs(fx-kx0)<0.55&&fy<1.4));
  R.keeper={kx0,kxT,aimX,aimY:reads?fy:1.25,react,reads,saved:saved_,caught:saved_&&Math.abs(fx-kxT)<0.4};
  if(zone>=0&&zone!==G.right)R.kind='falsch';
  else if(blocked)R.kind='mauer';
  else if(zone===G.right)R.kind=saved_?'gehalten':'tor';
  else if(frame)R.kind=fy>=GH-BR-0.02&&Math.abs(fx)<GW?'latte':'pfosten';
  else if(inGoal)R.kind='zwischen';
  else R.kind=fy>GH?'drueber':'daneben';
  R.tEvent=blocked?R.tw:R.kind==='gehalten'?(o.D-0.35)/o.D:1;
  return R;
}
function requeue(){
  if(!G.requeued.has(G.q.id)){G.requeued.add(G.q.id);G.queue.splice(Math.min(3,G.queue.length),0,G.q);}
}
const TEXT={tor:'TOR!',gehalten:'GEHALTEN!',mauer:'MAUER!',pfosten:'PFOSTEN!',latte:'LATTE!',zwischen:'ZWISCHEN DEN WÖRTERN',daneben:'DANEBEN',drueber:'DRÜBER',falsch:'FALSCHES WORT'};
function resolve(R){
  R.done=true;G.k++;G.mode='result';G.t=0;
  const md=modus(),[lo,hi]=md.sweet,secs=G.aimTime;
  R.bonus=[];
  if(R.kind==='tor'){
    let pts=r10(100*multiplier()*(R.golden?2:1));
    if(Math.abs(R.fx)>2.8&&R.fy>1.75)R.bonus.push(['Winkel',50]);
    if(ORTE[R.station].wall&&Math.abs(R.c)>=0.7)R.bonus.push(['Kurve',50]);
    if(R.src==='wisch'&&R.u>=lo+(hi-lo)*0.3&&R.u<=hi-(hi-lo)*0.3)R.bonus.push(['Perfekt',30]);
    if(secs<5)R.bonus.push(['Schnell',r10((5-secs)*12)]);
    R.bonus=R.bonus.filter(b=>b[1]>0);
    R.points=pts+R.bonus.reduce((a,b)=>a+b[1],0);
    G.score+=R.points;G.streak++;G.goals++;G.jubel=1;G.flash=1;
    popup('+'+R.points,R.golden?'#FFD447':'#FFC857');
    R.bonus.forEach(b=>popup(b[0]+' +'+b[1],'#7FE0D0'));
    if(!ruhig)konfetti(60);
    G.rings.push({x:R.fx,y:R.fy,life:1});
    M?.sfx('netz');M?.sfx('jubel');
    window.LearningFeedback?.signal('ok');
  }else if(R.kind==='falsch'){
    G.streak=0;G.hearts--;G.shake=0.5;G.missed.set(G.q.id,G.q);requeue();
    M?.fehler();M?.sfx('falsch');
    window.LearningFeedback?.signal('no');
  }else{
    G.streak=0;
    if(!R.knew)requeue();
    M?.sfx(R.kind==='gehalten'?'gehalten':R.kind==='mauer'?'mauer':R.kind==='pfosten'||R.kind==='latte'?'pfosten':'ooh');
    if(R.kind==='pfosten'||R.kind==='latte')funken(R.fx,Math.min(R.fy,GH),R.D);
  }
  mark();hud();
}
function update(dt){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  G.time+=dt;
  if(G.shake>0)G.shake-=dt;if(G.jubel>0)G.jubel-=dt*0.4;if(G.flash>0)G.flash-=dt*2.5;
  for(const b of G.bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=520*dt;b.life-=dt*1.5;}G.bits=G.bits.filter(b=>b.life>0);
  for(const b of G.confetti){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy=Math.min(b.vy+160*dt,90);b.vx*=1-dt*0.9;b.rot+=b.vr*dt;b.life-=dt*0.4;}G.confetti=G.confetti.filter(b=>b.life>0&&b.y<H+20);
  for(const f of G.sparks){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=(f.g||60)*dt;f.life-=dt*0.8;}G.sparks=G.sparks.filter(f=>f.life>0);
  for(const r of G.rings)r.life-=dt*1.2;G.rings=G.rings.filter(r=>r.life>0);
  for(const p of G.popups){p.life-=dt;p.age+=dt;}G.popups=G.popups.filter(p=>p.life>0);
  if(M)M.tempo(1+0.05*Math.min(G.streak,10));
  if(G.mode==='intro'){G.t+=dt;G.kx=G.lean;if(G.t>=(ruhig?0.8:2.4)){G.mode='aim';G.t=0;}}
  else if(G.mode==='aim'){
    G.aimTime+=dt;G.kx=G.lean+(ruhig?0:Math.sin(G.time*1.4)*0.16);
    if(G.charge)G.charge.t+=dt;
  }else if(G.mode==='anlauf'){
    G.t+=dt;
    if(G.t>=RUNUP){G.mode='flight';G.ft=0;M?.sfx('schuss');grass();}
  }else if(G.mode==='flight'||G.mode==='result'){
    G.ft+=dt;
    if(G.mode==='flight'&&G.ft/G.shot.Tv>=G.shot.tEvent)resolve(G.shot);
    else if(G.mode==='result'){
      G.t+=dt;
      if(G.t>=(G.shot.kind==='falsch'?2.4:G.shot.kind==='tor'?1.9:1.6)){
        if(G.hearts<=0)return finish(false);
        if(G.k>=SHOTS){G.mode='celebrate';G.t=0;promptEl.textContent='Tour geschafft!';chips.innerHTML='';M?.ziel();return;}
        next();
      }
    }
  }else if(G.mode==='celebrate'){
    G.t+=dt;G.jubel=1;
    if(!ruhig&&Math.random()<dt*5)feuerwerk();
    if(!ruhig&&Math.random()<dt*3)konfetti(14);
    if(G.t>=(ruhig?0.4:2.8))finish(true);
  }
}
function finish(won){
  G.mode='over';G.won=won;
  if(!won)M?.abpfiff();
  const id=G.part,key=bestKey(id),old=saved.best[key]||0,record=G.score>old;
  if(record)saved.best[key]=G.score;
  const before=unlocked();
  if(won)saved.tours[id]=(saved.tours[id]||0)+1;
  const fresh=!before&&unlocked();
  save();
  const missed=[...G.missed.values()];
  const sterne=G.goals>=12?3:G.goals>=8?2:G.goals>=4?1:0;
  stage.hidden=true;over.hidden=false;document.querySelector('main.kick')?.classList.remove('spielt');
  over.innerHTML='<h1>'+(won?'Tour geschafft!':'Abpfiff.')+'</h1>'
    +'<p class="sterne" aria-label="'+sterne+' von 3 Sternen">'+'★'.repeat(sterne)+'<span>'+'★'.repeat(3-sterne)+'</span></p>'
    +'<p class="result">'+G.goals+' Tore aus '+G.k+' Schüssen · '+G.score+' Punkte'+(record&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
    +(fresh?'<p class="unlock">Neu freigeschaltet: Flash der Fuchs spielt jetzt in deinem Team!</p>':'')
    +'<p class="muted">Bestwert'+(G.modus==='profi'?' (Profi)':'')+': '+(saved.best[key]||0)+' Punkte'+(won?'':' · Drei falsche Wörter beenden die Tour.')+'</p>'
    +'<div class="actions"><button id="again" class="go">Nochmal spielen</button><button id="toMenu">Anderen Abschnitt wählen</button></div>'
    +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')
      +'</ul><p><a class="train" href="../">Unit 2 im Vokabeltrainer üben →</a></p>':'<p class="muted">Kein einziges falsches Wort – stark!</p>');
  $('again').onclick=()=>start(id);$('toMenu').onclick=showMenu;
  const h=over.querySelector('h1');h.tabIndex=-1;h.focus();
  window.LearningFeedback?.tone?.('done');
}
function hud(){
  const n=Math.min(G.k+1,SHOTS);$('shots').textContent='⚽ '+n+'/'+SHOTS;$('shots').setAttribute('aria-label','Schuss '+n+' von '+SHOTS);
  $('points').textContent=G.score+' P';
  $('hearts').textContent='♥'.repeat(Math.max(0,G.hearts))+'♡'.repeat(HEARTS-Math.max(0,G.hearts));
  $('hearts').setAttribute('aria-label',Math.max(0,G.hearts)+' von '+HEARTS+' Herzen');
}
function showPlayers(){
  const box=$('players');if(!box)return;
  const missing=Math.max(0,UNLOCK-totalTours());
  const knopf=(id,name,frei,info)=>'<button data-player="'+id+'" aria-pressed="'+(player()===id)+'"'+(frei?'':' disabled')+'><canvas class="p-bild" width="120" height="132" aria-hidden="true"></canvas><span>'+name+(info?'<small>'+info+'</small>':'')+'</span></button>';
  box.innerHTML=knopf('leo','Leo',true,'Nr. 9')+knopf('mia','Mia',true,'Nr. 10')+knopf('flash','Flash',unlocked(),unlocked()?'der Fuchs':'noch '+missing+'× Tour');
  box.querySelectorAll('[data-player]').forEach(b=>{
    b.onclick=()=>{if(b.disabled)return;saved.player=b.dataset.player;save();showPlayers();};
    vorschau(b.querySelector('canvas'),b.dataset.player);
  });
}
function showModes(){
  const box=$('modes');if(!box)return;
  box.innerHTML=Object.entries(MODI).map(([k,m])=>'<button data-modus="'+k+'" aria-pressed="'+(saved.modus===k)+'"><span>'+m.name+'</span><small>'
    +(k==='profi'?'stärkerer Torwart, mehr Wind, Punkte ×1,5':'zum Reinkommen')+'</small></button>').join('');
  box.querySelectorAll('[data-modus]').forEach(b=>b.onclick=()=>{saved.modus=b.dataset.modus;G.modus=saved.modus;save();showMenu();});
}
function showMenu(){
  G.mode='menu';G.modus=saved.modus;document.querySelector('main.kick')?.classList.remove('spielt');stage.hidden=true;over.hidden=true;menu.hidden=false;showPlayers();showModes();M?.stop();musikKnopf();
  $('levels').innerHTML=[...D.parts,ALL].map(p=>{
    const n=wordsOf(p.id).length,best=saved.best[bestKey(p.id)]||0,fin=saved.tours[p.id]||0;
    return '<button data-part="'+p.id+'"'+(p.id==='all'?' class="all"':'')+'><span class="l-name">'+esc(p.name)+'</span>'
      +'<span class="l-info">'+n+' Wörter'+(best?' · Bestwert '+best+' P':'')+(fin?' · '+fin+'× Tour geschafft':'')+'</span></button>';
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
  if(M.an&&!stage.hidden&&G.mode!=='over'&&G.mode!=='celebrate'){M.start();if(G.paused)M.pause(true);}
  musikKnopf();
}

/* ----------------------------------------------------------- Steuerung */
/* Antwortknopf: einmal tippen zielt auf die Tafel, nochmal tippen schiesst
   einen Standardschuss in ihre Mitte - ohne Kurve und ohne Windausgleich. */
function chip(i){
  if(G.paused)return pause(false);
  if(G.mode==='intro'){G.mode='aim';G.t=0;}
  if(G.mode!=='aim')return;
  if(G.markerZone===i&&G.marker)return shoot({tx:G.marker.x,ty:G.marker.y,u:1250,c:0,src:'knopf'});
  const m=mitte(i,G.time);G.marker={x:m.x,y:m.y};G.markerZone=i;mark();M?.sfx('klick');
}
/* Wischen: in Zeichenflaeche-Einheiten erfasst, damit es auf jedem Geraet
   gleich schnell wirkt. */
function punkt(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/(r.width||W),y:(e.clientY-r.top)*H/(r.height||H),t:(e.timeStamp||performance.now())/1000};}
function auswerten(pts){
  if(pts.length<2)return null;
  const S=pts[0],E=pts[pts.length-1],dx=E.x-S.x,dy=E.y-S.y,len=Math.hypot(dx,dy);
  if(len<40||dy>-30)return null;
  /* Tempo: die letzten 0,1 s zaehlen - ein Wisch, kein langsames Ziehen */
  let i=pts.length-1;while(i>0&&E.t-pts[i-1].t<=0.1)i--;
  const A=pts[Math.max(0,i-1)],dt=Math.max(0.016,E.t-A.t),dl=Math.hypot(E.x-A.x,E.y-A.y);
  const u=dt>0.03&&dl>8?dl/dt:len/Math.max(0.016,E.t-S.t);
  /* Bogen: groesste seitliche Abweichung vom geraden Weg */
  let dev=0;for(const p of pts){const d=(dx*(p.y-S.y)-dy*(p.x-S.x))/len;if(Math.abs(d)>Math.abs(dev))dev=d;}
  const ratio=dev/len,c=Math.abs(ratio)<0.05?0:clamp(ratio*9,-2.4,2.4);
  /* Ziel: das Ende des Wischens in der Torebene. Endet er unterhalb des Tors,
     wird die Richtung bis auf Hoehe der unteren Tafeln verlaengert. */
  const o=ort(),s=sc(o.D),yLow=SY(0.6,o.D);
  let X=E.x,Y=E.y;
  if(E.y>yLow){const f=(yLow-S.y)/(E.y-S.y);X=S.x+dx*f;Y=yLow;}
  return {tx:(X-W/2)/s,ty:CH-(Y-Y0)/s,u,c,src:'wisch'};
}
canvas.addEventListener('pointerdown',e=>{
  if(G.paused)return pause(false);
  if(G.mode==='intro'){G.mode='aim';G.t=0;return;}
  if(G.mode!=='aim')return;
  G.drag=[punkt(e)];
  try{canvas.setPointerCapture(e.pointerId);}catch(err){}
});
canvas.addEventListener('pointermove',e=>{if(G.drag&&G.mode==='aim'){G.drag.push(punkt(e));if(G.drag.length>90)G.drag.splice(1,1);}});
canvas.addEventListener('pointerup',e=>{
  if(!G.drag)return;G.drag.push(punkt(e));
  const s=auswerten(G.drag);G.drag=null;
  if(s)shoot(s);else if(G.mode==='aim')G.hinweis=1.6;
});
canvas.addEventListener('pointercancel',()=>{G.drag=null;});
/* Tastatur: Pfeile zielen (links/rechts in Schritten, hoch/runter die Reihe),
   1-4 springt auf eine Tafel, Leertaste halten laedt die Kraft. */
const kraftAus=t=>0.5-0.5*Math.cos(t*Math.PI*2/1.5);
function zielen(dx,reihe){
  if(G.mode==='intro'){G.mode='aim';G.t=0;}
  if(G.mode!=='aim')return;
  if(!G.marker){const m=mitte(0,G.time);G.marker={x:m.x,y:m.y};}
  if(dx)G.marker.x=clamp(G.marker.x+dx,-3.4,3.4);
  if(reihe)G.marker.y=reihe<0?1.83:0.61;
  G.markerZone=tafelAn(G.marker.x,G.marker.y,G.time);mark();
}
document.addEventListener('keydown',e=>{
  if(stage.hidden)return;
  const k=e.key;
  if(k==='ArrowLeft'){e.preventDefault();zielen(-0.45,0);}
  else if(k==='ArrowRight'){e.preventDefault();zielen(0.45,0);}
  else if(k==='ArrowUp'){e.preventDefault();zielen(0,-1);}
  else if(k==='ArrowDown'){e.preventDefault();zielen(0,1);}
  else if(['1','2','3','4'].includes(k)){e.preventDefault();const i=Number(k)-1;if(G.mode==='intro'){G.mode='aim';G.t=0;}if(G.mode==='aim'){const m=mitte(i,G.time);G.marker={x:m.x,y:m.y};G.markerZone=i;mark();}}
  else if(k===' '||k==='Enter'){
    if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#chips,.bar'))return;
    e.preventDefault();
    if(G.paused){pause(false);return;}
    if(G.mode==='intro'){G.mode='aim';G.t=0;return;}
    if(G.mode==='aim'&&!G.charge&&!e.repeat){if(!G.marker)zielen(0,0);G.charge={t:0};}
  }
  else if(k==='p'||k==='Escape'){e.preventDefault();pause(!G.paused);}
  else if(k==='m'){e.preventDefault();musikUmschalten();}
});
document.addEventListener('keyup',e=>{
  if(stage.hidden||!(e.key===' '||e.key==='Enter')||!G.charge||G.mode!=='aim')return;
  e.preventDefault();
  const p=kraftAus(G.charge.t);G.charge=null;
  shoot({tx:G.marker.x,ty:G.marker.y,u:300+p*(KRAFT_MAX-300),c:0,src:'taste'});
});
$('pause').onclick=()=>pause(!G.paused);
if($('musik'))$('musik').onclick=musikUmschalten;
if($('musikMenu'))$('musikMenu').onclick=musikUmschalten;
$('quit').onclick=showMenu;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('resize',resize);

/* ============================================================ Zeichnen
   Kamera hinter dem Ball: Was z Meter vor dem Ball liegt, steht d = z + CZ
   vor der Kamera und wird mit F/d verkleinert. Die Kamera steht CH hoch;
   F und CH werden je Ort so gewaehlt, dass das Tor immer gleich breit ist
   und der Ball unten im Bild liegt. */
const W=360;let H=560;
const CZ=9;let F=900,CH=3,Y0=190;
const FONT='Inter,system-ui,-apple-system,"Segoe UI",sans-serif';
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const sc=z=>F/(z+CZ);
const SX=(x,z)=>W/2+x*sc(z);
const SY=(y,z)=>Y0+(CH-y)*sc(z);
function layout(){
  /* Weiter weg wirkt das Tor etwas kleiner; auf kleinen Bildschirmen auch. */
  const o=ort(),dG=o.D+CZ,breite=310*Math.sqrt(14/o.D)*clamp(H/470,0.8,1.04);F=breite*dG/(2*GW);
  const ballY=H*0.87,topY=Math.max(H*0.3,124);
  CH=clamp((ballY-topY-GH*F/dG)/(F*(1/CZ-1/dG)),1.2,5);Y0=ballY-CH*F/CZ;
}
function resize(){
  if(!ctx||stage.hidden)return;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,3);
  H=Math.max(200,Math.round(W*r.height/r.width));
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  layout();
}
function rounded(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function quad(x1,z1,x2,z2,y){ctx.beginPath();ctx.moveTo(SX(x1,z1),SY(y||0,z1));ctx.lineTo(SX(x2,z1),SY(y||0,z1));ctx.lineTo(SX(x2,z2),SY(y||0,z2));ctx.lineTo(SX(x1,z2),SY(y||0,z2));ctx.closePath();}
function fitLines(text,max,size,weight){
  ctx.font=(weight||800)+' '+size+'px '+FONT;
  const words=String(text).split(' ');let lines=[],line='';
  for(const w of words){const probe=line?line+' '+w:w;if(ctx.measureText(probe).width<=max||!line)line=probe;else{lines.push(line);line=w;}}
  if(line)lines.push(line);return lines;
}
/* Schrift so gross wie moeglich, hoechstens zwei Zeilen */
const fitCache=new Map();
function fitText(text,max,big,small,weight){
  const key=text+'|'+Math.round(max)+'|'+Math.round(big)+'|'+small+'|'+weight;
  if(fitCache.has(key))return fitCache.get(key);
  if(fitCache.size>400)fitCache.clear();
  const r=fitTextNeu(text,max,big,small,weight);fitCache.set(key,r);return r;
}
function fitTextNeu(text,max,big,small,weight){
  big=Math.round(big);
  for(let s=big;s>=small;s--){const l=fitLines(text,max,s,weight);if(l.length<=2&&l.every(x=>ctx.measureText(x).width<=max))return {size:s,lines:l};}
  const l=fitLines(text,max,small,weight);if(l.length>2){l.length=2;l[1]=l[1].replace(/.{0,2}$/,'…');}return {size:small,lines:l};
}

/* --------------------------------------------------------- Hintergruende */
function himmel(c){
  const g=ctx.createLinearGradient(0,0,0,Y0+4);c.forEach((f,i)=>g.addColorStop(i/(c.length-1),f));
  ctx.fillStyle=g;ctx.fillRect(-40,-40,W+80,Y0+44);
}
function wolken(a,farbe){
  for(let i=0;i<4;i++){const cx=((rnd(i+7)*W*1.6+G.time*(3+i*1.5))%(W+160))-80,cy=Y0*(0.12+rnd(i+70)*0.35);
    ctx.fillStyle=farbe||'rgba(255,255,255,'+a+')';ctx.beginPath();ctx.ellipse(cx,cy,30,8,0,0,7);ctx.ellipse(cx+20,cy+4,24,7,0,0,7);ctx.ellipse(cx-18,cy+4,20,6,0,0,7);ctx.fill();}
}
function sonne(x,y,r,kern,halo){
  const g=ctx.createRadialGradient(x,y,2,x,y,r*4.5);g.addColorStop(0,halo);g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r*5,y-r*5,r*10,r*10);ctx.fillStyle=kern;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
}
function baumkrone(x,z,h,seed,farbe){
  const X=SX(x,z),Yb=SY(0,z),s=sc(z),r=h*0.32*s;
  ctx.fillStyle='#4A3526';ctx.fillRect(X-r*0.12,Yb-h*0.45*s,r*0.24,h*0.45*s);
  ctx.fillStyle=farbe;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(X+(rnd(seed+i)-0.5)*r*1.1,Yb-h*s*(0.62+rnd(seed+i+9)*0.2),r*(0.7+rnd(seed+i+3)*0.4),0,7);ctx.fill();}
}
function bolzplatzHinten(){
  const o=ort();
  himmel(['#4F9BE0','#9CCBF0','#FFE2B8']);
  sonne(W*0.78,Y0*0.42,16,'#FFF6DA','rgba(255,236,190,.7)');
  wolken(0.7);
  /* Haeuser am Horizont */
  for(let i=0;i<9;i++){const x=-40+i*24,z=o.D+60,w=10+rnd(i)*8,h=6+rnd(i+3)*9,X=SX(x,z),Yb=SY(0,z),s=sc(z);
    ctx.fillStyle=['#C98B6B','#B9775C','#D4A27F'][i%3];ctx.fillRect(X,Yb-h*s,w*s,h*s);
    ctx.fillStyle='#8E4E3B';ctx.beginPath();ctx.moveTo(X-1,Yb-h*s);ctx.lineTo(X+w*s/2,Yb-(h+4)*s);ctx.lineTo(X+w*s+1,Yb-h*s);ctx.fill();
    ctx.fillStyle='rgba(255,240,200,.75)';for(let j=0;j<2;j++)ctx.fillRect(X+(2+j*4)*s,Yb-(h-2)*s,2*s,2*s);}
  for(let i=0;i<12;i++)baumkrone(-34+i*6.2+rnd(i)*3,o.D+14+rnd(i+5)*8,8+rnd(i+2)*4,i*5,i%2?'#3F7F4E':'#356E43');
  /* Maschendrahtzaun */
  const zf=o.D+5,hf=3.2;
  ctx.strokeStyle='rgba(60,70,80,.32)';ctx.lineWidth=1;
  for(let x=-30;x<30;x+=0.8){ctx.beginPath();ctx.moveTo(SX(x,zf),SY(0,zf));ctx.lineTo(SX(x+hf*0.5,zf),SY(hf,zf));ctx.moveTo(SX(x+hf*0.5,zf),SY(0,zf));ctx.lineTo(SX(x,zf),SY(hf,zf));ctx.stroke();}
  ctx.strokeStyle='#5E6A75';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(SX(-30,zf),SY(hf,zf));ctx.lineTo(SX(30,zf),SY(hf,zf));ctx.stroke();
  for(let x=-30;x<=30;x+=4){ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(SX(x,zf),SY(0,zf));ctx.lineTo(SX(x,zf),SY(hf,zf));ctx.stroke();}
}
function schulhofHinten(){
  const o=ort(),zb=o.D+13;
  himmel(['#2E3A86','#8E5BA8','#FF9E6B','#FFD19A']);
  sonne(W*0.2,Y0*0.78,18,'#FFE7B0','rgba(255,170,110,.75)');
  wolken(0,'rgba(255,190,170,.45)');
  /* Schulgebaeude aus Backstein */
  const x0=-17,x1=17,h=9.5,X0=SX(x0,zb),X1=SX(x1,zb),Yb=SY(0,zb),Yt=SY(h,zb),s=sc(zb);
  ctx.fillStyle='#B5523B';ctx.fillRect(X0,Yt,X1-X0,Yb-Yt);
  ctx.strokeStyle='rgba(90,30,20,.22)';ctx.lineWidth=0.8;
  for(let y=Yt+3;y<Yb;y+=3){ctx.beginPath();ctx.moveTo(X0,y);ctx.lineTo(X1,y);ctx.stroke();}
  ctx.fillStyle='#4A2B2B';ctx.fillRect(X0-4,Yt-5,X1-X0+8,6);
  for(let r=0;r<2;r++)for(let i=0;i<10;i++){const wx=SX(x0+1.2+i*3.3,zb),wy=SY(h-1.6-r*3.6,zb),lit=rnd(i+r*10)>0.45;
    ctx.fillStyle=lit?'#FFD98A':'#3E4F6A';ctx.fillRect(wx,wy,2.2*s,1.8*s);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(wx+1.05*s,wy,0.12*s,1.8*s);}
  /* Eingang, Schild und Uhr */
  ctx.fillStyle='#2F3A4F';ctx.fillRect(SX(-1.2,zb),SY(2.6,zb),2.4*s,2.6*s);
  ctx.fillStyle='#F4F1EA';rounded(SX(-3.2,zb),SY(3.6,zb),6.4*s,0.9*s,2);ctx.fill();
  ctx.fillStyle='#2F3A4F';ctx.font='800 '+Math.max(6,0.62*s)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SCHOOL',SX(0,zb),SY(3.15,zb));
  const cx=SX(0,zb),cy=SY(h+0.9,zb),cr=0.85*s;ctx.fillStyle='#F4F1EA';ctx.beginPath();ctx.arc(cx,cy,cr,0,7);ctx.fill();
  ctx.strokeStyle='#2F3A4F';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy-cr*0.7);ctx.moveTo(cx,cy);ctx.lineTo(cx+cr*0.5,cy+cr*0.2);ctx.stroke();
  for(let i=0;i<6;i++)baumkrone(i<3?-26+i*3:20+i*2.4,zb-2+rnd(i)*3,9+rnd(i+1)*3,i*7,'#2F6B44');
  /* Hecke */
  const zh=o.D+3.5;ctx.fillStyle='#2E6B3F';ctx.beginPath();ctx.moveTo(SX(-30,zh),SY(0,zh));
  for(let x=-30;x<=30;x+=1.5)ctx.lineTo(SX(x,zh),SY(1.1+Math.sin(x*1.7)*0.12,zh));ctx.lineTo(SX(30,zh),SY(0,zh));ctx.closePath();ctx.fill();
  fahne(11,o.D+7,7.5);
}
/* Fahne zeigt den Wind: Richtung und Staerke */
function fahne(x,z,h){
  const X=SX(x,z),Yb=SY(0,z),Yt=SY(h,z),s=sc(z),w=G.wind,st=Math.min(1,Math.abs(w)/1.3);
  ctx.strokeStyle='#D8DDE4';ctx.lineWidth=Math.max(1.2,0.1*s);ctx.beginPath();ctx.moveTo(X,Yb);ctx.lineTo(X,Yt);ctx.stroke();
  const len=1.6*s*(0.55+0.45*st),dir=w>=0?1:-1,fl=ruhig?0:G.time*(4+st*6);
  ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.moveTo(X,Yt);
  for(let i=0;i<=8;i++){const f=i/8;ctx.lineTo(X+dir*len*f,Yt+Math.sin(fl+f*5)*(1-st*0.6)*f*3+f*(1-st)*6);}
  for(let i=8;i>=0;i--){const f=i/8;ctx.lineTo(X+dir*len*f,Yt+0.9*s+Math.sin(fl+f*5+0.6)*(1-st*0.6)*f*3+f*(1-st)*6);}
  ctx.closePath();ctx.fill();
}
function stadionHinten(){
  const o=ort(),j=Math.max(0,G.jubel);
  himmel(['#060A1F','#121C46','#24306A']);
  for(let i=0;i<30;i++){ctx.fillStyle='rgba(255,255,255,'+(0.4+0.5*rnd(i+3))+')';ctx.fillRect(rnd(i)*W,rnd(i+40)*Y0*0.45,1.4,1.4);}
  /* Tribuene in drei Rängen mit Publikum */
  const zt=o.D+7;
  for(let rang=0;rang<3;rang++){
    const y0=rang*4.2,y1=y0+4.6,zz=zt+rang*5;
    ctx.fillStyle=['#1B2244','#161C3A','#111631'][rang];
    ctx.beginPath();ctx.moveTo(SX(-40,zz),SY(y0,zz));ctx.lineTo(SX(40,zz),SY(y0,zz));ctx.lineTo(SX(40,zz+4),SY(y1,zz+4));ctx.lineTo(SX(-40,zz+4),SY(y1,zz+4));ctx.closePath();ctx.fill();
    const s=sc(zz+2),cols=['#FF7A59','#FFC857','#3CCFBE','#F4F1EA','#B993FF','#E0413B'];
    for(let i=0;i<(lite?70:170);i++){const x=-38+rnd(i+rang*200)*76,yy=y0+0.6+rnd(i+rang*300)*3.2,zz2=zz+0.5+(yy-y0)/4.6*3;
      const hop=j>0?Math.abs(Math.sin(G.time*9+i))*0.45*j:Math.abs(Math.sin(G.time*1.5+i))*0.04;
      ctx.fillStyle=cols[Math.floor(rnd(i+rang*90)*cols.length)];ctx.beginPath();ctx.arc(SX(x,zz2),SY(yy+hop,zz2),Math.max(1,0.17*s),0,7);ctx.fill();}
  }
  /* Blitzlichter beim Tor */
  if(j>0.3&&!ruhig)for(let i=0;i<6;i++)if(Math.random()<0.35){const fx=Math.random()*W,fy=SY(2+Math.random()*10,zt+5);
    const g=ctx.createRadialGradient(fx,fy,0,fx,fy,9);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(fx-9,fy-9,18,18);}
  /* Flutlichtmasten */
  for(const side of [-1,1]){const x=side*26,z=o.D+12,Xb=SX(x,z),Xt=Xb,Yt=SY(24,z),s=sc(z);
    ctx.strokeStyle='#2A3358';ctx.lineWidth=Math.max(1.5,0.35*s);ctx.beginPath();ctx.moveTo(Xb,SY(0,z));ctx.lineTo(Xt,Yt);ctx.stroke();
    ctx.fillStyle='#2A3358';ctx.fillRect(Xt-2.6*s,Yt-1.6*s,5.2*s,2*s);
    if(!lite){const g=ctx.createRadialGradient(Xt,Yt,1,Xt,Yt,90);g.addColorStop(0,'rgba(255,250,225,.9)');g.addColorStop(0.15,'rgba(255,245,210,.35)');g.addColorStop(1,'rgba(255,245,210,0)');ctx.fillStyle=g;ctx.fillRect(Xt-90,Yt-90,180,180);}
    ctx.fillStyle='#FFFBEA';for(let i=0;i<4;i++)for(let k=0;k<2;k++)ctx.fillRect(Xt-2.2*s+i*1.15*s,Yt-1.3*s+k*0.8*s,0.9*s,0.6*s);
    if(!lite){ctx.fillStyle='rgba(255,250,220,.05)';ctx.beginPath();ctx.moveTo(Xt,Yt);ctx.lineTo(W/2+side*-40,H);ctx.lineTo(W/2+side*140,H);ctx.closePath();ctx.fill();}
  }
  /* Werbebande mit englischen Rufen */
  const zw=o.D+3,yB0=SY(0,zw),yB1=SY(0.9,zw);
  ctx.fillStyle='#0A0E1A';ctx.fillRect(-10,yB1,W+20,yB0-yB1);
  ctx.fillStyle='#FF7A59';ctx.fillRect(-10,yB1,W+20,1.5);
  const txt='GOAL!  ·  WELL DONE  ·  GREAT SHOT  ·  KEEP GOING  ·  YOU CAN DO IT  ·  ';
  ctx.font='900 '+Math.max(7,(yB0-yB1)*0.62)+'px '+FONT;ctx.textBaseline='middle';ctx.textAlign='left';
  const tw=ctx.measureText(txt).width,off=-(G.time*28%tw);
  ctx.fillStyle=j>0.2?(Math.floor(G.time*6)%2?'#FFC857':'#FF7A59'):'#3CCFBE';
  for(let x=off;x<W;x+=tw)ctx.fillText(txt,x,(yB0+yB1)/2+0.5);
}
function boden(){
  const o=ort(),st=G.station;
  const farben=[['#7DBA55','#5E9E40'],['#44A95E','#2F8C4A'],['#2FA04C','#1F7F3A']][st];
  const g=ctx.createLinearGradient(0,Y0,0,H);g.addColorStop(0,farben[1]);g.addColorStop(1,farben[0]);
  ctx.fillStyle=g;ctx.fillRect(-40,Y0,W+80,H-Y0+40);
  /* Maehstreifen */
  for(let z=-CZ+1,i=0;z<o.D+6;z+=2,i++){if(i%2)continue;ctx.fillStyle=st===2?'rgba(255,255,255,.07)':'rgba(255,255,255,.045)';quad(-40,z,40,Math.min(z+2,o.D+6));ctx.fill();}
  /* Bolzplatz: abgewetzte Stellen vor dem Tor und am Ball */
  if(st===0){ctx.fillStyle='rgba(150,110,70,.45)';for(const [x,z,r] of [[0,o.D-1.2,2.2],[0,0.4,1.2],[-2.5,o.D-3,1]]){ctx.beginPath();ctx.ellipse(SX(x,z),SY(0,z),r*sc(z),r*sc(z)*0.28*CH/2,0,0,7);ctx.fill();}}
  /* Linien */
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineCap='butt';
  const lin=(x1,z1,x2,z2)=>{const za=Math.max(z1,-CZ+1.5),zb=Math.max(z2,-CZ+1.5);ctx.lineWidth=Math.max(1,0.12*sc((za+zb)/2));ctx.beginPath();ctx.moveTo(SX(x1,za),SY(0,za));ctx.lineTo(SX(x2,zb),SY(0,zb));ctx.stroke();};
  lin(-30,o.D,30,o.D);
  lin(-9.16,o.D,-9.16,o.D-5.5);lin(9.16,o.D,9.16,o.D-5.5);lin(-9.16,o.D-5.5,9.16,o.D-5.5);
  lin(-20.16,o.D,-20.16,o.D-16.5);lin(20.16,o.D,20.16,o.D-16.5);if(o.D-16.5>-CZ+1.5)lin(-20.16,o.D-16.5,20.16,o.D-16.5);
  ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.ellipse(SX(0,o.D-11),SY(0,o.D-11),0.14*sc(o.D-11),0.05*sc(o.D-11),0,0,7);ctx.fill();
  /* Stadion: Lichtkegel auf dem Rasen */
  if(st===2&&!lite){const lg=ctx.createRadialGradient(W/2,SY(0,o.D*0.5),10,W/2,SY(0,o.D*0.5),W*0.8);lg.addColorStop(0,'rgba(255,255,230,.12)');lg.addColorStop(1,'rgba(255,255,230,0)');ctx.fillStyle=lg;ctx.fillRect(0,Y0,W,H-Y0);}
}

/* --------------------------------------------------------- Tor und Tafeln */
function netz(){
  const o=ort(),z0=o.D,z1=o.D+1.7,top=GH,back=1.5;
  const wackel=G.rings.length?G.rings[0].life:0;
  ctx.fillStyle='rgba(255,255,255,.06)';
  ctx.beginPath();ctx.moveTo(SX(-GW,z0),SY(top,z0));ctx.lineTo(SX(GW,z0),SY(top,z0));ctx.lineTo(SX(GW,z1),SY(back,z1));ctx.lineTo(SX(GW,z1),SY(0,z1));ctx.lineTo(SX(-GW,z1),SY(0,z1));ctx.lineTo(SX(-GW,z1),SY(back,z1));ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=0.8;
  const off=wackel*Math.sin(G.time*30)*2;
  for(let x=-GW;x<=GW+0.01;x+=0.35){ctx.beginPath();ctx.moveTo(SX(x,z0),SY(top,z0));ctx.lineTo(SX(x,z1)+off,SY(back,z1));ctx.lineTo(SX(x,z1)+off,SY(0,z1));ctx.stroke();}
  for(let y=0;y<=back+0.01;y+=0.35){ctx.beginPath();ctx.moveTo(SX(-GW,z1)+off,SY(y,z1));ctx.lineTo(SX(GW,z1)+off,SY(y,z1));ctx.stroke();}
  for(const s of [-1,1])for(let y=0;y<=top;y+=0.35){const yb=Math.min(y,back);ctx.beginPath();ctx.moveTo(SX(s*GW,z0),SY(y,z0));ctx.lineTo(SX(s*GW,z1),SY(yb,z1));ctx.stroke();}
}
function tafeln(nurText){
  const o=ort(),z=o.D+0.06,s=sc(z),R=G.shot&&G.shot.done?G.shot:null;
  for(let i=0;i<4;i++){
    const t=tafel(i,G.time),x0=SX(t.x0,z),x1=SX(t.x1,z),y0=SY(t.y1,z),y1=SY(t.y0,z),w=x1-x0,h=y1-y0;
    if(nurText&&!(o.wall&&Math.sign((t.x0+t.x1)/2)===Math.sign(G.wallX)))continue;
    let col=ZFARBE[i],alpha=0.92,glow=null,txt='#151B2B';
    if(R&&(R.kind==='tor'||R.kind==='falsch')){
      if(i===G.right){col='#35C46A';glow='#35C46A';}
      else if(R.kind==='falsch'&&i===R.zone){col='#E0413B';txt='#FFFFFF';}
      else alpha=0.35;
    }
    if(!nurText){
      ctx.globalAlpha=alpha;
      if(glow&&!lite){ctx.shadowColor=glow;ctx.shadowBlur=22;}
      ctx.fillStyle=col;rounded(x0,y0,w,h,7);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.28)';rounded(x0+2,y0+2,w-4,h*0.38,5);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.5;rounded(x0+1,y0+1,w-2,h-2,6);ctx.stroke();
      if(i===G.markerZone&&G.mode==='aim'){ctx.strokeStyle='#FFFFFF';ctx.lineWidth=3;ctx.setLineDash([5,4]);rounded(x0-3,y0-3,w+6,h+6,9);ctx.stroke();ctx.setLineDash([]);}
    }
    const f=fitText(G.options[i]?G.options[i].en:'',w-10,Math.min(16,h*0.42),9);
    ctx.globalAlpha=nurText?0.96:alpha;
    if(nurText){ctx.fillStyle='rgba(13,16,23,.78)';rounded(x0+4,y0+h/2-f.lines.length*f.size*0.62-3,w-8,f.lines.length*f.size*1.24+6,6);ctx.fill();txt='#FFFFFF';}
    ctx.fillStyle=txt;ctx.font='800 '+f.size+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
    f.lines.forEach((l,n)=>ctx.fillText(l,(x0+x1)/2,y0+h/2+(n-(f.lines.length-1)/2)*f.size*1.12+1));
    ctx.globalAlpha=1;
  }
}
function pfosten(){
  const o=ort(),z=o.D,s=sc(z),pw=Math.max(2.5,POST*s);
  const xl=SX(-GW,z),xr=SX(GW,z),yb=SY(0,z),yt=SY(GH,z);
  ctx.fillStyle='rgba(10,30,15,.25)';ctx.fillRect(xl,yb-1,xr-xl,3);
  const g=ctx.createLinearGradient(0,0,pw,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#C9CED6');
  ctx.save();ctx.fillStyle='#F7F8FA';
  ctx.fillRect(xl-pw,yt-pw,pw,yb-yt+pw);ctx.fillRect(xr,yt-pw,pw,yb-yt+pw);ctx.fillRect(xl-pw,yt-pw,xr-xl+pw*2,pw);
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(xl-pw*0.35,yt,pw*0.35,yb-yt);ctx.fillRect(xr+pw*0.65,yt,pw*0.35,yb-yt);ctx.fillRect(xl,yt-pw*0.3,xr-xl,pw*0.3);
  ctx.restore();
}
/* Die Anzeigetafel ueber dem Tor - je Ort anders gebaut */
function anzeige(){
  const o=ort(),st=G.station,yt=SY(GH,o.D)-Math.max(2.5,POST*sc(o.D));
  const bw=Math.min(W-36,300),f=(()=>{ctx.save();const r=fitText(G.q?G.q.de:'',bw-24,23,13,900);ctx.restore();return r;})();
  const bh=24+f.lines.length*f.size*1.15+8,x=(W-bw)/2,y=Math.max(44,yt-14-bh);
  if(st===0){
    ctx.fillStyle='#5E4128';ctx.fillRect(x+24,y+bh-2,5,yt-y-bh+14);ctx.fillRect(x+bw-29,y+bh-2,5,yt-y-bh+14);
    const g=ctx.createLinearGradient(0,y,0,y+bh);g.addColorStop(0,'#B07D4B');g.addColorStop(1,'#8E5F34');ctx.fillStyle=g;rounded(x,y,bw,bh,6);ctx.fill();
    ctx.strokeStyle='rgba(60,35,15,.35)';ctx.lineWidth=1;for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+4,y+bh*i/3);ctx.lineTo(x+bw-4,y+bh*i/3);ctx.stroke();}
    ctx.fillStyle='#3A2615';for(const [a,b] of [[8,8],[bw-8,8],[8,bh-8],[bw-8,bh-8]]){ctx.beginPath();ctx.arc(x+a,y+b,1.8,0,7);ctx.fill();}
  }else if(st===1){
    ctx.fillStyle='#B98A55';rounded(x-4,y-4,bw+8,bh+8,6);ctx.fill();
    ctx.fillStyle='#24493B';rounded(x,y,bw,bh,3);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(x+rnd(i)*bw,y+rnd(i+5)*bh,30,6,0.2,0,7);ctx.fill();}
    ctx.fillStyle='#F4F1EA';ctx.fillRect(x+bw-34,y+bh+1,12,3);
  }else{
    if(!lite){ctx.shadowColor='#FF7A59';ctx.shadowBlur=18;}
    ctx.fillStyle='#0A0E1A';rounded(x,y,bw,bh,8);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#FF7A59';ctx.lineWidth=2;rounded(x,y,bw,bh,8);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.035)';for(let yy=y+3;yy<y+bh;yy+=3)ctx.fillRect(x+2,yy,bw-4,1);
  }
  const lab=st===2?'#3CCFBE':st===1?'rgba(244,241,234,.7)':'#FFE3A8',word=st===2?'#FFC857':'#FFFFFF';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=lab;ctx.font='700 10px '+FONT;
  ctx.fillText('WIE HEISST DAS AUF ENGLISCH?',W/2,y+13);
  if(st===2&&!lite){ctx.shadowColor='#FFC857';ctx.shadowBlur=10;}
  ctx.fillStyle=word;ctx.font='900 '+f.size+'px '+FONT;
  f.lines.forEach((l,n)=>ctx.fillText(l,W/2,y+26+f.size*0.58+n*f.size*1.15));
  ctx.shadowBlur=0;
}

/* ---------------------------------------------------- Figuren und Ball */
const KFARBE=[['#9AA3AE','#6F7884'],['#FF9A3C','#D9741C'],['#C6F432','#8DB81A']];
function keeperLage(){
  const R=G.shot,o=ort();
  if(!R||G.mode==='anlauf'||G.mode==='aim'||G.mode==='intro')return {x:G.kx,pose:'bereit',p:0,dir:Math.sign(G.lean)||1};
  const k=R.keeper,ft=G.ft,flug=Math.max(0,ft)/R.slow,dir=Math.sign(k.aimX-k.kx0)||1;
  const p=clamp((flug-k.react)/Math.max(0.15,R.T-k.react),0,1.4);
  const x=lerp(k.kx0,k.kxT,clamp(p,0,1));
  if(G.mode==='result'&&G.t>0.5){
    if(R.kind==='gehalten')return {x,pose:G.t>0.9?'jubel':'hecht',p:1,dir};
    if(R.kind==='tor')return {x,pose:'liegt',p:1,dir};
  }
  return {x,pose:p>0?'hecht':'bereit',p:Math.min(1,p),dir};
}
function torwartZeichnen(){
  const o=ort(),z=o.D-0.35,L=keeperLage(),s=sc(z),k=s*1.9/138;
  const R=G.shot,ball=R&&G.mode!=='aim'&&G.mode!=='intro'?ballLage():null;
  SP.torwart(ctx,SX(L.x,z),SY(0,z),k,{pose:L.pose,p:L.p,dir:L.dir,t:G.time,farbe:KFARBE[G.station],blick:ball?clamp((ball.x-L.x)/2,-1,1):clamp(-L.x/2,-1,1)});
}
function mauerZeichnen(){
  const o=ort();if(!o.wall)return;
  const s=sc(WALLZ),k=s*1.6/125,R=G.shot;
  let sp=0;
  if(R&&(G.mode==='flight'||G.mode==='result')){const t=G.ft/R.Tv,d=t-(R.tw||0.5);sp=d>-0.35&&d<0.2?Math.sin((d+0.35)/0.55*Math.PI):0;}
  const farbe=G.station===1?'#2F6FE0':'#E0413B';
  for(let i=0;i<o.wall;i++){const x=G.wallX+(i-(o.wall-1)/2)*0.5;
    SP.mauer(ctx,SX(x,WALLZ),SY(0,WALLZ),k,{sprung:Math.max(0,sp)*(0.8+0.4*rnd(i)),farbe,haut:['#E2B08A','#B87A52','#F0C8A0','#8D5A3B'][i%4],seed:rnd(i+G.k*3)});}
}
/* Wo der Ball gerade ist (Meter) - im Flug, abgeprallt oder im Netz */
function ballLage(){
  const R=G.shot;if(!R||G.mode==='aim'||G.mode==='intro'||G.mode==='anlauf')return {x:0,y:BR,z:0,spin:0,alpha:1};
  const t=G.ft/R.Tv;
  if(t<=R.tEvent)return Object.assign(R.at(t),{spin:t*R.D*3,alpha:1});
  const e=R.at(R.tEvent),a=(t-R.tEvent)*R.Tv,v=R.D/R.T;
  const fall=(y0,vy)=>Math.max(BR,y0+vy*a-4.9*a*a);
  if(R.kind==='tor'||R.kind==='falsch'&&!R.blocked&&!R.keeper.saved){
    const into=Math.min(1.35,a*v*0.6/(1+a*6));return {x:e.x+(R.c*0.3)*a,y:fall(e.y,-0.5),z:R.D+into,spin:R.D*3,alpha:1};
  }
  if(R.kind==='mauer'||R.blocked)return {x:e.x+(e.x-G.wallX)*a*2.5,y:fall(e.y,2.5),z:Math.max(0.5,e.z-a*6),spin:R.D*3-a*8,alpha:1};
  if(R.kind==='gehalten'||(R.kind==='falsch'&&R.keeper.saved)){
    const L=keeperLage();
    if(R.keeper.caught)return {x:L.x+L.dir*0.35*Math.min(1,a*3),y:Math.max(BR,e.y*(1-Math.min(1,a*1.5))+0.3),z:R.D-0.5,spin:R.D*3,alpha:1};
    return {x:e.x+L.dir*a*4,y:fall(e.y,3),z:e.z-a*3,spin:R.D*3+a*10,alpha:1};
  }
  if(R.kind==='pfosten'||R.kind==='latte')return {x:e.x-Math.sign(e.x||1)*a*(R.kind==='pfosten'?4:1),y:fall(e.y,R.kind==='latte'?3.5:1.5),z:R.D-a*5,spin:R.D*3-a*8,alpha:1};
  /* daneben, drueber, zwischen den Woertern (geht ins Tor, zaehlt aber nicht) */
  if(R.kind==='zwischen')return {x:e.x,y:fall(e.y,-0.5),z:R.D+Math.min(1.3,a*4),spin:R.D*3,alpha:1};
  return {x:e.x+(e.x-0)*a*0.3,y:fall(e.y,1),z:R.D+a*v*0.5,spin:R.D*3,alpha:clamp(1-a*0.8,0,1)};
}
function ballZeichnen(b){
  const s=sc(b.z),r=Math.max(2.2,BR*s*1.35),X=SX(b.x,b.z),Yg=SY(0,b.z),Y=SY(b.y,b.z)-(r-BR*s);
  ctx.globalAlpha=b.alpha;
  ctx.fillStyle='rgba(10,30,15,'+(0.35*clamp(1-b.y/6,0.2,1))+')';ctx.beginPath();ctx.ellipse(X,Yg,r*1.1,r*0.32,0,0,7);ctx.fill();
  const gold=G.golden||(G.shot&&G.shot.golden);
  if(gold&&!lite){ctx.shadowColor='#FFD447';ctx.shadowBlur=16;}
  const g=ctx.createRadialGradient(X-r*0.35,Y-r*0.4,r*0.15,X,Y,r);
  if(gold){g.addColorStop(0,'#FFF6C8');g.addColorStop(0.6,'#FFC83A');g.addColorStop(1,'#B9861A');}
  else{g.addColorStop(0,'#FFFFFF');g.addColorStop(0.7,'#EDEFF2');g.addColorStop(1,'#B8BEC8');}
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(X,Y,r,0,7);ctx.fill();ctx.shadowBlur=0;
  if(r>3){
    ctx.save();ctx.beginPath();ctx.arc(X,Y,r,0,7);ctx.clip();
    ctx.fillStyle=gold?'rgba(120,80,10,.65)':'#20242C';
    const rot=b.spin||0;
    for(let i=0;i<5;i++){const a=rot+i*Math.PI*2/5,cx=X+Math.cos(a)*r*0.72,cy=Y+Math.sin(a)*r*0.72*0.9;
      ctx.beginPath();for(let k=0;k<5;k++){const aa=a+k*Math.PI*2/5;ctx.lineTo(cx+Math.cos(aa)*r*0.24,cy+Math.sin(aa)*r*0.24);}ctx.closePath();ctx.fill();}
    ctx.beginPath();for(let k=0;k<5;k++){const aa=rot*0.5+k*Math.PI*2/5;ctx.lineTo(X+Math.cos(aa)*r*0.3,Y+Math.sin(aa)*r*0.3);}ctx.closePath();ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
/* Der Schuetze steht links hinter dem Ball. Seine Groesse richtet sich nach
   dem Bild, nicht nach der Kamera - sonst verdeckte er die unteren Tafeln. */
function schuetzeZeichnen(){
  let pose='stand',p=0,f=0;
  if(G.mode==='anlauf'){p=clamp(G.t/RUNUP,0,1);if(p<0.7){pose='anlauf';f=p/0.7;p=f;}else{pose='schuss';f=1;p=(p-0.7)/0.3*0.45;}}
  else if(G.mode==='flight'){pose='schuss';f=1;p=clamp(0.45+G.ft/0.35*0.55,0.45,1);}
  else if(G.mode==='result'){const R=G.shot;f=1;
    if(G.t<0.25){pose='schuss';p=1;}else pose=R.kind==='tor'?'jubel':R.kind==='falsch'||R.kind==='gehalten'||R.kind==='pfosten'||R.kind==='latte'?'traurig':'stand';}
  else if(G.mode==='celebrate'){pose='jubel';f=1;}
  const bx=SX(0,0),by=SY(0,0),h=clamp(H*0.24,84,124);
  const X=lerp(bx-W*0.2,bx-h*0.2,f),Y=lerp(by+H*0.045,by+4,f),k=h/125*lerp(1,0.94,f);
  SP.schuetze(ctx,X,Y,k,player(),{pose,p,t:G.time});
}
/* --------------------------------------------------------------- Effekte */
function grass(){if(ruhig)return;for(let i=0;i<14;i++)G.bits.push({x:SX(0,0)+(Math.random()-.5)*16,y:SY(0,0),vx:(Math.random()-.5)*140,vy:-80-Math.random()*120,r:1.5+Math.random()*2,life:1,c:i%3?'#5E9E40':'#3E7A2C'});}
function konfetti(n){const cols=['#FF7A59','#FFC857','#3CCFBE','#B993FF','#F4F1EA','#35C46A'];
  for(let i=0;i<n;i++)G.confetti.push({x:Math.random()*W,y:-10-Math.random()*60,vx:(Math.random()-.5)*80,vy:20+Math.random()*60,w:4+Math.random()*4,h:2+Math.random()*3,rot:Math.random()*6,vr:(Math.random()-.5)*12,c:cols[i%cols.length],life:1.8});}
function funken(x,y,z){const X=SX(x,z),Y=SY(y,z);for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*90;G.sparks.push({x:X,y:Y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0.7,c:i%2?'#FFFFFF':'#FFE08A',g:200});}}
function feuerwerk(){
  const x=40+Math.random()*(W-80),y=20+Math.random()*Y0*0.6,cols=['#FFC857','#FF7A59','#7FE0D0','#B993FF','#FFFFFF','#FF5A9E'],c=cols[Math.floor(Math.random()*cols.length)];
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2,v=50+Math.random()*45;G.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c});}
}
function partikel(){
  for(const b of G.bits){ctx.globalAlpha=clamp(b.life,0,1);ctx.fillStyle=b.c;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();}
  for(const f of G.sparks){ctx.globalAlpha=clamp(f.life,0,1);ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,1.4+f.life*1.4,0,7);ctx.fill();}
  for(const c of G.confetti){ctx.globalAlpha=clamp(c.life,0,1);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);ctx.fillStyle=c.c;ctx.fillRect(-c.w/2,-c.h/2*Math.abs(Math.cos(c.rot*1.3)),c.w,c.h*Math.abs(Math.cos(c.rot*1.3))+0.5);ctx.restore();}
  ctx.globalAlpha=1;
  const o=ort();
  for(const r of G.rings){const X=SX(r.x,o.D+0.3),Y=SY(r.y,o.D+0.3),k=1-r.life;ctx.strokeStyle='rgba(255,255,255,'+(r.life*0.8)+')';ctx.lineWidth=2;
    for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(X,Y,6+k*(28+i*14),4+k*(16+i*8),0,0,7);ctx.stroke();}}
}
/* Wischspur, Zielkreuz und Kraftanzeige */
function steuerHilfen(){
  if(G.drag&&G.drag.length>1){
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [w,c] of [[10,'rgba(255,255,255,.18)'],[4,'rgba(255,255,255,.85)']]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();G.drag.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
    const e=G.drag[G.drag.length-1];ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(e.x,e.y,5,0,7);ctx.fill();
  }
  const o=ort();
  if(G.marker&&G.mode==='aim'){const X=SX(G.marker.x,o.D),Y=SY(G.marker.y,o.D),pu=1+Math.sin(G.time*6)*0.12;
    ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(X,Y,9*pu,0,7);ctx.moveTo(X-15,Y);ctx.lineTo(X-5,Y);ctx.moveTo(X+5,Y);ctx.lineTo(X+15,Y);ctx.moveTo(X,Y-15);ctx.lineTo(X,Y-5);ctx.moveTo(X,Y+5);ctx.lineTo(X,Y+15);ctx.stroke();}
  if(G.charge){
    const p=kraftAus(G.charge.t),[lo,hi]=modus().sweet,bx=SX(0,0)+28,by=SY(0,0)-80,bh=70;
    ctx.fillStyle='rgba(13,16,23,.75)';rounded(bx-4,by-4,20,bh+8,8);ctx.fill();
    const a=(lo-300)/(KRAFT_MAX-300),b=Math.min(1,(hi-300)/(KRAFT_MAX-300));ctx.fillStyle='rgba(53,196,106,.45)';ctx.fillRect(bx,by+bh*(1-b),12,bh*(b-a));
    ctx.fillStyle=p>=a&&p<=b?'#35C46A':'#FF7A59';ctx.fillRect(bx,by+bh*(1-p),12,bh*p);
    ctx.fillStyle='#FFFFFF';ctx.fillRect(bx-3,by+bh*(1-p)-1,18,2);
  }
  /* Erste Hilfe: eine Geisterhand zeigt das Wischen */
  if(G.mode==='aim'&&!G.drag&&!G.marker&&G.k===0&&G.aimTime>1.4&&totalTours()===0&&!ruhig){
    const ph=(G.aimTime-1.4)%2.2/1.6;if(ph<=1){
      const sx=SX(0,0),sy=SY(0,0),ex=W/2+Math.sin(G.k+1)*60,ey=SY(1.2,o.D),q=1-Math.pow(1-ph,3);
      const x=lerp(sx,ex,q)+Math.sin(q*Math.PI)*-24,y=lerp(sy,ey,q);
      ctx.globalAlpha=Math.sin(ph*Math.PI)*0.9;ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,16+ph*6,0,7);ctx.stroke();ctx.globalAlpha=1;}
    banner('Wische vom Ball zum richtigen Wort',(SY(0,0)+SY(0,o.D))/2+6,13);
  }
  if(G.hinweis>0){G.hinweis-=1/60;banner('Wische vom Ball nach oben zum Tor',(SY(0,0)+SY(0,o.D))/2+6,13);}
}
function banner(text,y,size){
  ctx.font='700 '+size+'px '+FONT;const w=ctx.measureText(text).width+24;
  ctx.fillStyle='rgba(13,16,23,.78)';rounded((W-w)/2,y-size,w,size*2,size);ctx.fill();
  ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,W/2,y);
}
/* Anzeige oben links: Ort, Wind, Serie, Goldball, Profi */
function status(){
  if(G.mode==='celebrate')return;
  const pills=[],o=ort();
  pills.push({w:Math.max(80,o.name.length*7.6+30),draw:(x,y)=>{ctx.fillStyle='#7FE0D0';ctx.font='800 11px '+FONT;ctx.fillText((G.station+1)+' · '+o.name.toUpperCase(),x+10,y+14);}});
  if(G.wind){const n=Math.max(1,Math.min(3,Math.ceil(Math.abs(G.wind)/0.5))),pf=(G.wind<0?'←':'→').repeat(n);
    pills.push({w:58+n*8,draw:(x,y)=>{ctx.fillStyle='#A9B4C8';ctx.font='700 10px '+FONT;ctx.fillText('WIND',x+10,y+14);ctx.fillStyle='#FFFFFF';ctx.font='900 13px '+FONT;ctx.fillText(pf,x+44,y+14);}});}
  pills.push({w:50,draw:(x,y)=>{ctx.fillStyle='#FFFFFF';ctx.font='800 13px '+FONT;ctx.fillText('×'+multiplier().toFixed(1).replace('.',','),x+10,y+14);}});
  if(G.golden&&G.mode!=='result')pills.push({w:84,bg:'rgba(255,200,58,.95)',draw:(x,y)=>{ctx.fillStyle='#2A1C00';ctx.font='900 11px '+FONT;ctx.fillText('GOLDBALL ×2',x+9,y+14);}});
  if(G.modus==='profi')pills.push({w:52,bg:'rgba(185,147,255,.92)',draw:(x,y)=>{ctx.fillStyle='#1A0B33';ctx.font='900 11px '+FONT;ctx.fillText('PROFI',x+10,y+14);}});
  ctx.textBaseline='middle';ctx.textAlign='left';
  let x=8,y=8;
  for(const p of pills){if(x+p.w>W-8){x=8;y+=33;}ctx.fillStyle=p.bg||'rgba(13,16,23,.7)';rounded(x,y,p.w,28,14);ctx.fill();p.draw(x,y);x+=p.w+6;}
}
function ergebnis(){
  const R=G.shot;if(!R||G.mode!=='result')return;
  const a=clamp(G.t*5,0,1),pop=1+Math.max(0,0.35-G.t)*1.4,y=lerp(SY(0,ort().D),SY(0,0),0.34);
  const gross=R.kind==='tor'||R.kind==='gehalten'||R.kind==='mauer'||R.kind==='pfosten'||R.kind==='latte';
  const col=R.kind==='tor'?'#FFC857':R.kind==='falsch'?'#FF6B6B':'#F4F1EA';
  ctx.save();ctx.translate(W/2,y);ctx.scale(pop,pop);ctx.globalAlpha=a;
  ctx.font='900 '+(gross?44:24)+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=7;ctx.strokeStyle='rgba(13,16,23,.85)';ctx.lineJoin='round';ctx.strokeText(TEXT[R.kind],0,0);
  ctx.fillStyle=col;ctx.fillText(TEXT[R.kind],0,0);
  ctx.restore();ctx.globalAlpha=1;
  if(R.kind==='falsch'){
    ctx.fillStyle='rgba(224,65,59,'+(0.18*(1-G.t/2.4))+')';ctx.fillRect(0,0,W,H);
    const by=y+30;ctx.fillStyle='rgba(13,16,23,.86)';rounded(30,by,W-60,58,16);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#A9B4C8';ctx.font='600 12px '+FONT;ctx.fillText('Richtig wäre:',W/2,by+17);
    const f=fitText(G.q.en,W-90,18,12,800);ctx.fillStyle='#7FE0D0';ctx.font='800 '+f.size+'px '+FONT;ctx.fillText(f.lines.join(' ').length>40?f.lines[0]+'…':f.lines.join(' '),W/2,by+39);
  }else if(R.kind!=='tor'){
    const sub={gehalten:'Richtiges Wort – der Torwart war schneller.',mauer:R.knew?'Richtiges Wort – schieß mit Kurve um die Mauer!':'Die Mauer stand im Weg.',
      pfosten:'Knapp! Ziel etwas weiter nach innen.',latte:'Knapp! Etwas flacher oder sanfter wischen.',zwischen:'Ziele mitten auf eine Tafel.',
      daneben:R.kraft==='fest'?'Zu fest – wische etwas ruhiger.':'Ziele auf eine Tafel im Tor.',drueber:R.kraft==='fest'?'Zu fest – wische etwas ruhiger.':'Ziele etwas tiefer.'}[R.kind];
    if(sub)banner(sub,y+36,12);
  }
  /* Kraftanzeige des Schusses */
  if(R.src==='wisch'&&G.t<1.4&&R.kind!=='falsch'){const t=R.kraft==='gut'?'':R.kraft==='fest'?'Zu fest':'Zu schwach';if(t)banner(t,y+66,11);}
}
function intro(){
  if(G.mode!=='intro')return;
  const o=ort(),a=clamp(Math.min(G.t*4,(2.4-G.t)*4),0,1);
  ctx.globalAlpha=a;ctx.fillStyle='rgba(8,12,22,.62)';ctx.fillRect(0,0,W,H);
  const y=H*0.46;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#7FE0D0';ctx.font='800 13px '+FONT;ctx.fillText('STATION '+(G.station+1)+' VON 3',W/2,y-44);
  ctx.fillStyle='#FFFFFF';ctx.font='900 40px '+FONT;ctx.fillText(o.name,W/2,y-8);
  const l=fitLines(o.info,W-70,14,600);ctx.fillStyle='#E6EAF2';ctx.font='600 14px '+FONT;l.forEach((t,i)=>ctx.fillText(t,W/2,y+30+i*19));
  ctx.fillStyle='#A9B4C8';ctx.font='500 12px '+FONT;ctx.fillText('Tippen zum Start',W/2,y+30+l.length*19+18);
  ctx.globalAlpha=1;
}
function draw(){
  if(!ctx)return;
  ctx.save();
  if(G.shake>0&&!ruhig)ctx.translate((Math.random()-.5)*12*G.shake,(Math.random()-.5)*12*G.shake);
  [bolzplatzHinten,schulhofHinten,stadionHinten][G.station]();
  boden();
  if(G.q){
    netz();tafeln(false);
    /* von hinten nach vorn: Torwart, Pfosten, Mauer, Ball, Schuetze */
    const b=ballLage(),o=ort();
    const things=[{z:o.D-0.35,f:torwartZeichnen},{z:o.D,f:pfosten},{z:WALLZ,f:mauerZeichnen},{z:-0.7,f:schuetzeZeichnen},{z:b.z,f:()=>ballZeichnen(b)}];
    if(b.z>o.D)things.push({z:o.D+0.01,f:()=>{}});
    things.sort((p,q)=>q.z-p.z);
    for(const t of things)t.f();
    if(o.wall)tafeln(true);
    anzeige();
  }
  partikel();
  if(G.flash>0&&!ruhig){ctx.fillStyle='rgba(255,255,255,'+(G.flash*0.25)+')';ctx.fillRect(0,0,W,H);}
  ctx.restore();
  steuerHilfen();
  status();
  ctx.textAlign='center';ctx.textBaseline='middle';
  const py=lerp(SY(0,ort().D),SY(0,0),0.62);
  G.popups.forEach((q,i)=>{const a=clamp(q.life,0,1),y=py-(1.3-q.life)*26+i*22;
    ctx.globalAlpha=a;ctx.font='900 '+(i===0?22:15)+'px '+FONT;ctx.lineWidth=5;ctx.strokeStyle='rgba(13,16,23,.75)';ctx.strokeText(q.text,W*0.76,y);ctx.fillStyle=q.color;ctx.fillText(q.text,W*0.76,y);});
  ctx.globalAlpha=1;
  ergebnis();
  intro();
  if(G.mode==='celebrate'){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 34px '+FONT;ctx.lineWidth=7;ctx.strokeStyle='rgba(13,16,23,.85)';
    const y=lerp(SY(0,ort().D),SY(0,0),0.34);ctx.strokeText('TOUR GESCHAFFT!',W/2,y);ctx.fillStyle='#FFC857';ctx.fillText('TOUR GESCHAFFT!',W/2,y);}
  if(G.paused){
    ctx.fillStyle='rgba(13,16,23,.72)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 26px '+FONT;ctx.fillText('Pause',W/2,H/2-12);ctx.font='500 14px '+FONT;ctx.fillText('Tippen zum Weiterspielen',W/2,H/2+18);
  }
}
/* Vorschaubild im Spieler-Knopf: dieselbe Zeichnung wie im Spiel */
function vorschau(cv,wer){
  let c2=null;try{c2=cv&&cv.getContext?cv.getContext('2d'):null;}catch(e){c2=null;}
  if(!c2||!SP)return;
  c2.setTransform(1,0,0,1,0,0);c2.clearRect(0,0,120,132);
  SP.schuetze(c2,60,126,0.86,wer,{pose:'jubel',t:0.35});
}
/* Sparstufe: Laeuft das Spiel zu langsam, faellt Beiwerk weg. */
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

window.KickGame={G,start,shoot,plan,update,finish,showMenu,pause,chip,auswerten,tafel,mitte,tafelAn,ort,ORTE,MODI,modus,multiplier,player,unlocked,
  SHOTS,PER,HEARTS,UNLOCK,GW,GH,WALLZ,RUNUP,KRAFT_MAX,layout,SX,SY};
showMenu();
})();
