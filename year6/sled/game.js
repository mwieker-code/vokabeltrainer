/* =========================================================================
   SLED RUN – Schlittenfahrt zu den Vokabeln von Year 6, Unit 2
   Der Schlitten faehrt eine Piste mit drei Spuren hinab. Oben steht das
   deutsche Wort, darunter drei Antworten - eine je Spur. Am naechsten Tor
   muss der Schlitten in der richtigen Spur sein. Unterwegs liegen Sterne
   (Punkte) und Felsen (kosten die Serie). Drei Herzen, zwanzig Tore.

   Wie beim Kletterspiel zaehlt nichts in die Lernfaecher; gespeichert
   werden nur Bestwerte (vt6:sled:v1). Die Vokabeln kommen aus
   ../climb/data.js, das tools/climb-daten.cjs aus der Vokabelseite erzeugt.

   Die Spiellogik (start, steer, update) braucht keine Zeichenflaeche,
   damit die Tests sie ohne Browser durchspielen koennen.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,KEY='vt6:sled:v1';
const $=id=>document.getElementById(id);
const menu=$('menu'),stage=$('stage'),over=$('over'),canvas=$('piste'),promptEl=$('prompt'),chips=$('chips');
let ctx=null;try{ctx=canvas.getContext?canvas.getContext('2d'):null;}catch(e){ctx=null;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ruhig=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ----------------------------------------------------------------- Regeln */
const GOAL=20,HEARTS=3;
const GAP=150;                         // Strecke zwischen zwei Toren (Welteinheiten)
const secondsFor=k=>k===0?8:Math.max(4.2,6.6-0.12*k);   // Zeit bis zum naechsten Tor

let saved={best:{},finishes:{}};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object'&&p.finishes&&typeof p.finishes==='object')saved={best:p.best,finishes:p.finishes};}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}

const ALL={id:'all',name:'Ganze Unit'};
const wordsOf=id=>id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||{words:[]}).words;
const pool=D.parts.flatMap(p=>p.words);

const G={mode:'menu',part:null,queue:[],k:0,q:null,options:[],gate:null,items:[],lane:1,x:0,
  speed:0,dist:0,hearts:HEARTS,score:0,streak:0,correct:0,stars:0,missed:new Map(),requeued:new Set(),
  t:0,result:null,paused:false,time:0,boost:0,shake:0,bits:[],won:false,finishZ:null};

/* ------------------------------------------------------------- Ablauf */
function start(partId){
  const words=wordsOf(partId);if(words.length<3)return;
  let queue=[];while(queue.length<GOAL)queue=queue.concat(shuffle(words));
  Object.assign(G,{mode:'ride',part:partId,queue,k:0,q:null,options:[],gate:null,items:[],lane:1,x:0,
    speed:GAP/secondsFor(0),dist:0,hearts:HEARTS,score:0,streak:0,correct:0,stars:0,missed:new Map(),requeued:new Set(),
    t:0,result:null,paused:false,boost:0,shake:0,bits:[],won:false,finishZ:null});
  menu.hidden=true;over.hidden=true;stage.hidden=false;
  resize();next();hud();loop();
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
  G.speed=GAP/secondsFor(G.k);
  /* Unterwegs: eine Sternenreihe und, ab dem vierten Tor, Felsen. Alles
     liegt vor dem Tor, damit die Spurwahl am Tor frei bleibt. */
  const starLane=Math.floor(Math.random()*3);
  for(let n=0;n<3;n++)G.items.push({type:'star',lane:starLane,z:38+n*11});
  const rocks=G.k<3?0:G.k<10?1:2,used=new Set();
  for(let n=0;n<rocks;n++){let lane;do{lane=Math.floor(Math.random()*3);}while(used.has(lane));used.add(lane);
    G.items.push({type:'rock',lane,z:78+n*22});}
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
  G.lane=clamp(lane,0,2);mark();
}
const move=dir=>steer(G.lane+dir);
function burst(x,colors,n){
  for(let i=0;i<n;i++)G.bits.push({x:x+(Math.random()-.5)*40,y:0,vx:(Math.random()-.5)*240,vy:-120-Math.random()*220,r:2+Math.random()*4,life:1,c:colors[i%colors.length]});
}
function passGate(){
  const ok=G.lane===G.gate.right;
  G.result={ok,lane:G.lane};G.t=0;G.mode='result';G.k++;
  if(ok){
    G.score+=100+10*Math.min(G.streak,10);G.streak++;G.correct++;G.boost=0.7;
    burst(0,['#FFC857','#7FE0D0','#FF7A59','#FFFFFF'],26);
    window.LearningFeedback?.signal('ok');
  }else{
    G.hearts--;G.streak=0;G.shake=0.5;G.missed.set(G.q.id,G.q);
    if(!G.requeued.has(G.q.id)){G.requeued.add(G.q.id);G.queue.splice(Math.min(3,G.queue.length),0,G.q);}
    burst(0,['#FFFFFF','#DCEBFA','#B9D3EC'],30);
    window.LearningFeedback?.signal('no');
  }
  mark();hud();
}
function passItem(it){
  if(Math.abs(G.x-(it.lane-1))>=0.5)return;
  if(it.type==='star'){G.score+=10;G.stars++;it.taken=true;burst(0,['#FFC857','#FFE9A8'],6);}
  else{G.streak=0;G.score=Math.max(0,G.score-30);G.shake=0.35;it.hit=true;burst(0,['#FFFFFF','#DCEBFA'],18);window.LearningFeedback?.signal('no');}
  hud();
}
function update(dt){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  G.time+=dt;
  if(G.boost>0)G.boost-=dt;if(G.shake>0)G.shake-=dt;
  for(const b of G.bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=520*dt;b.life-=dt*1.3;}
  G.bits=G.bits.filter(b=>b.life>0);
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
    if(G.finishZ<=-6)finish(true);
  }
}
function finish(won){
  G.mode='over';G.won=won;
  const id=G.part,old=saved.best[id]||0,record=G.score>old;
  if(record)saved.best[id]=G.score;
  if(won)saved.finishes[id]=(saved.finishes[id]||0)+1;
  save();
  const missed=[...G.missed.values()];
  stage.hidden=true;over.hidden=false;
  over.innerHTML='<h1>'+(won?'Im Ziel!':'Sturz im Schnee.')+'</h1>'
    +'<p class="result">'+G.k+' von '+GOAL+' Toren · '+G.score+' Punkte'+(record&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
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
function showMenu(){
  G.mode='menu';stage.hidden=true;over.hidden=true;menu.hidden=false;
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
});
$('pause').onclick=()=>pause(!G.paused);
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
  ctx.fillStyle=g;ctx.fillRect(0,0,W,HOR+6);
  if(p>0.45){ctx.fillStyle='rgba(255,255,255,'+((p-0.45)*1.4)+')';
    for(let i=0;i<26;i++){const tw=0.5+0.5*Math.sin(G.time*2+i*3);ctx.globalAlpha=(p-0.45)*1.5*tw;ctx.fillRect(rnd(i)*W,rnd(i+40)*HOR*0.6,1.6,1.6);}ctx.globalAlpha=1;}
  const sx=W*0.72-curve*14,sunY=HOR*(0.34+0.5*p);
  const halo=ctx.createRadialGradient(sx,sunY,4,sx,sunY,90);halo.addColorStop(0,'rgba(255,240,200,.85)');halo.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle=halo;ctx.fillRect(sx-90,sunY-90,180,180);
  ctx.fillStyle=mixc([255,250,225],[255,214,150],p);ctx.beginPath();ctx.arc(sx,sunY,20,0,7);ctx.fill();
  for(let i=0;i<4;i++){const cx=((rnd(i+7)*W*1.6+G.time*(4+i*2))%(W+160))-80,cy=HOR*(0.14+rnd(i+70)*0.4);
    ctx.fillStyle='rgba(255,255,255,'+(0.55-0.3*p)+')';
    ctx.beginPath();ctx.ellipse(cx,cy,34,9,0,0,7);ctx.ellipse(cx+22,cy+4,26,8,0,0,7);ctx.ellipse(cx-20,cy+5,22,7,0,0,7);ctx.fill();}
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
  ctx.fillStyle=g;ctx.fillRect(0,HOR,W,H-HOR);
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
  ctx.globalAlpha=0.9;ctx.fillStyle=haze;ctx.fillRect(0,HOR-2,W,48);ctx.globalAlpha=1;
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
    if(glow){ctx.shadowColor=glow;ctx.shadowBlur=24*s;}
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
    ctx.shadowColor='#FFC857';ctx.shadowBlur=14*s;ctx.fillStyle='#FFC857';ctx.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;ctx.lineTo(X+Math.cos(a)*rr*(0.35+0.65*Math.abs(spin)),cy+Math.sin(a)*rr);}
    ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(X-r*0.2,cy-r*0.25,r*0.16,0,7);ctx.fill();
  }else{
    const r=30*s;
    ctx.fillStyle='rgba(60,100,160,.28)';ctx.beginPath();ctx.ellipse(X+r*0.2,Y,r*1.1,r*0.28,0,0,7);ctx.fill();
    ctx.fillStyle='#6E7A90';ctx.beginPath();ctx.moveTo(X-r,Y);ctx.lineTo(X-r*0.72,Y-r*0.86);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r,Y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4E586C';ctx.beginPath();ctx.moveTo(X+r*0.1,Y);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r,Y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.moveTo(X-r*0.72,Y-r*0.86);ctx.lineTo(X-r*0.1,Y-r*1.22);ctx.lineTo(X+r*0.66,Y-r*0.9);ctx.lineTo(X+r*0.3,Y-r*0.7);ctx.lineTo(X-r*0.05,Y-r*0.86);ctx.lineTo(X-r*0.4,Y-r*0.62);ctx.closePath();ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawSled(){
  const X=W/2+G.x*LW,Y=GY,lean=clamp(((G.lane-1)-G.x)*0.55,-0.42,0.42),fast=G.speed/30;
  const bob=ruhig?0:Math.sin(G.time*17)*1.3*fast,hit=G.mode==='result'&&G.result&&!G.result.ok?Math.sin(G.t*30)*(1.5-G.t)*4:0;
  /* Schneefahnen hinter den Kufen */
  if(!ruhig)for(let i=0;i<10;i++){const a=(G.time*3+i/10)%1,side=i%2?1:-1;
    ctx.fillStyle='rgba(255,255,255,'+(0.8*(1-a))+')';ctx.beginPath();ctx.arc(X+side*(20+a*34)-lean*20,Y+6+a*30-Math.sin(a*Math.PI)*16,3+a*7,0,7);ctx.fill();}
  ctx.fillStyle='rgba(50,90,150,.3)';ctx.beginPath();ctx.ellipse(X,Y+12,48,10,0,0,7);ctx.fill();
  ctx.save();ctx.translate(X+hit,Y+bob);ctx.rotate(lean);ctx.scale(1.22,1.22);
  ctx.lineCap='round';ctx.lineJoin='round';
  /* Kufen und Sitz */
  ctx.strokeStyle='#B5362F';ctx.lineWidth=5;
  for(const sx of [-22,22]){ctx.beginPath();ctx.moveTo(sx,10);ctx.lineTo(sx,-8);ctx.quadraticCurveTo(sx,-22,sx*0.72,-24);ctx.stroke();}
  ctx.fillStyle='#C98A4B';rounded(-26,-14,52,16,5);ctx.fill();
  ctx.fillStyle='#A66E36';for(let i=-1;i<=1;i++)ctx.fillRect(i*17-1,-14,2,16);
  /* Schal, Jacke, Arme */
  const wave=ruhig?0:Math.sin(G.time*11);
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
  for(const b of G.bits){ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle=b.c;ctx.beginPath();ctx.arc(X+b.x,Y-30+b.y,b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;
}
function drawWeather(){
  if(ruhig)return;
  for(let i=0;i<46;i++){const depth=0.4+rnd(i)*0.6,x=((rnd(i+100)*W+G.time*(14+i%5*5)-curve*40*depth)%W+W)%W,y=(rnd(i+200)*H+G.time*(60+G.speed*2)*depth)%H;
    ctx.fillStyle='rgba(255,255,255,'+(0.35+0.5*depth)+')';ctx.beginPath();ctx.arc(x,y,1+depth*1.8,0,7);ctx.fill();}
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
  drawSky(p);drawGround(p);
  /* Alles auf der Piste von hinten nach vorn */
  const things=[];
  for(let i=0;i<30;i++){const z=((rnd(i+1)*ZFAR-G.dist)%ZFAR+ZFAR)%ZFAR-10,side=i%2?1:-1;things.push({z,f:()=>tree(side*(2.25+rnd(i+31)*2.4),z,i)});}
  for(let i=0;i<10;i++){const z=((i*19-G.dist)%ZFAR+ZFAR)%ZFAR-10;things.push({z,f:()=>{pole(-1,z,i);pole(1,z,i+1);}});}
  for(const it of G.items)if(it.z<ZFAR)things.push({z:it.z,f:()=>drawItem(it)});
  if(G.gate)things.push({z:G.gate.z,f:()=>drawGate(G.gate.z,false)});
  if(G.finishZ!==null)things.push({z:G.finishZ,f:()=>drawGate(G.finishZ,true)});
  things.sort((a,b)=>b.z-a.z);
  for(const t of things)if(t.z>0)t.f();
  drawSled();
  for(const t of things)if(t.z<=0)t.f();
  drawWeather();
  ctx.restore();
  if(G.mode==='result'&&G.result&&!G.result.ok){
    ctx.fillStyle='rgba(224,65,59,'+(0.22*(1-G.t/1.5))+')';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(13,16,23,.84)';rounded(30,H*0.12,W-60,62,18);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#A9B4C8';ctx.font='600 12px '+FONT;ctx.fillText('Richtig wäre:',W/2,H*0.12+19);
    ctx.fillStyle='#7FE0D0';ctx.font='800 18px '+FONT;ctx.fillText(G.q.en.length>30?G.q.en.slice(0,29)+'…':G.q.en,W/2,H*0.12+42);
  }
  if(G.streak>=3&&G.mode!=='finish'){ctx.fillStyle='rgba(13,16,23,.7)';rounded(W-96,10,86,28,14);ctx.fill();ctx.fillStyle='#FFC857';ctx.font='800 14px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Serie ×'+G.streak,W-53,24);}
  if(G.paused){
    ctx.fillStyle='rgba(13,16,23,.72)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 26px '+FONT;ctx.fillText('Pause',W/2,H/2-12);ctx.font='500 14px '+FONT;ctx.fillText('Tippen zum Weiterfahren',W/2,H/2+18);
  }
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

window.SledGame={G,start,steer,move,update,finish,showMenu,pause,GOAL,HEARTS,GAP};
showMenu();
})();
