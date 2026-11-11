/* =========================================================================
   SUMMIT CLIMB – Kletterspiel zu den Vokabeln von Year 6, Unit 2
   Oben steht das deutsche Wort, an der Wand haengen drei Griffe mit
   englischen Woertern. Wer den richtigen antippt, springt hoeher; ein
   falscher Griff broeckelt, und der Nebel holt auf. Alle fuenf Zuege wartet
   ein Lager, nach zwanzig der Gipfel.

   Das Spiel zaehlt nicht in die Lernfaecher: Unter Zeitdruck wird geraten.
   Eigener Speicher (vt6:climb:v1) nur fuer Bestwerte.

   Die Spiellogik (start, choose, update) kommt ohne Zeichenflaeche aus,
   damit die Tests sie ohne Browser durchspielen koennen.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,KEY='vt6:climb:v1';
const $=id=>document.getElementById(id);
const menu=$('menu'),stage=$('stage'),over=$('over'),canvas=$('wall'),promptEl=$('prompt'),choices=$('choices');
let ctx=null;try{ctx=canvas.getContext?canvas.getContext('2d'):null;}catch(e){ctx=null;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const ruhig=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ---------------------------------------------------------------- Masse */
const W=360;let H=560;                 // logische Groesse; H folgt dem Bildschirm
const P=150;                           // Hoehe eines Kletterzugs in der Welt
const LANES=[62,180,298];              // die drei Griffspuren
const METER=50,CAMP=5,GOAL=20;         // 50 m je Zug, Lager alle 5, Gipfel nach 20
const HEAD_START=1.9,MAX_GAP=1.9;      // Vorsprung vor dem Nebel in Zuegen

/* ---------------------------------------------------------------- Stand */
let saved={best:{},summits:{}};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&typeof p.best==='object'&&p.best&&typeof p.summits==='object'&&p.summits)saved={best:p.best,summits:p.summits};}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}

const ALL={id:'all',name:'Ganze Unit'};
const wordsOf=id=>id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||{words:[]}).words;
const pool=D.parts.flatMap(p=>p.words);

const G={mode:'menu',part:null,queue:[],k:0,goal:GOAL,q:null,tries:0,holds:[],old:[],
  climber:{x:W/2,y:0},from:null,to:null,t:0,fog:0,cam:0,score:0,streak:0,correct:0,
  missed:new Map(),requeued:new Set(),paused:false,banner:'',bannerT:0,bits:[],time:0,won:false};

/* ------------------------------------------------------------- Ablauf */
function start(partId){
  const words=wordsOf(partId);
  if(words.length<3)return;
  /* Kurze Abschnitte laufen mehrfach durch, bis der Gipfel erreicht ist. */
  let queue=[];while(queue.length<GOAL)queue=queue.concat(shuffle(words));
  Object.assign(G,{mode:'play',part:partId,queue,k:0,goal:GOAL,q:null,tries:0,holds:[],old:[],
    climber:{x:W/2,y:0},fog:-HEAD_START*P,cam:-H*0.3,score:0,streak:0,correct:0,
    missed:new Map(),requeued:new Set(),paused:false,banner:'',bannerT:0,bits:[],won:false});
  menu.hidden=true;over.hidden=true;stage.hidden=false;
  resize();next();hud();loop();
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
  G.q=G.queue.shift();G.tries=0;
  const options=shuffle([G.q,...distractors(G.q)]);
  G.holds=options.map((w,i)=>({w,lane:i,x:LANES[i],y:(G.k+1)*P+[-12,6,-4][(i+G.k)%3],state:'ok',label:null}));
  G.mode='play';
  promptEl.textContent=G.q.de;
  choices.innerHTML=G.holds.map((h,i)=>'<button data-choice="'+i+'" lang="en">'+esc(h.w.en)+'</button>').join('');
  choices.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.choice)));
}
function choose(i){
  if(G.mode!=='play'||G.paused)return;
  const h=G.holds[i];if(!h||h.state!=='ok')return;
  if(h.w===G.q){
    if(G.tries===0){G.score+=100+10*Math.min(G.streak,10);G.streak++;G.correct++;}else G.streak=0;
    G.from={x:G.climber.x,y:G.climber.y};G.to={x:h.x,y:h.y};G.t=0;G.mode='jump';h.state='taken';
    window.LearningFeedback?.signal('ok');
  }else{
    G.tries++;G.streak=0;h.state='broken';
    G.missed.set(G.q.id,G.q);
    /* Das Wort kommt drei Zuege spaeter noch einmal - aber nur einmal. */
    if(!G.requeued.has(G.q.id)){G.requeued.add(G.q.id);G.queue.splice(Math.min(3,G.queue.length),0,G.q);}
    G.fog+=0.35*P;
    for(let n=0;n<9;n++)G.bits.push({x:h.x+(Math.random()-.5)*30,y:h.y,vx:(Math.random()-.5)*90,vy:60+Math.random()*90,r:3+Math.random()*4,life:1});
    const b=choices.querySelector('[data-choice="'+i+'"]');if(b)b.disabled=true;
    G.t=0;G.mode='slip';
    window.LearningFeedback?.signal('no');
  }
  hud();
}
function speed(){return P/Math.max(5.5,8.5-0.2*G.k);}   // Nebel: Sekunden je Zug, erst 8,5, spaeter 5,5
function update(dt){
  if(G.paused||G.mode==='menu'||G.mode==='over')return;
  G.time+=dt;
  for(const b of G.bits){b.x+=b.vx*dt;b.y-=b.vy*dt;b.vy+=420*dt;b.life-=dt*1.1;}
  G.bits=G.bits.filter(b=>b.life>0);
  if(G.bannerT>0)G.bannerT-=dt;
  if(G.mode==='play'){
    G.fog=Math.max(G.fog+speed()*dt,G.climber.y-MAX_GAP*P);
    if(G.fog>=G.climber.y-50)return finish(false);
  }else if(G.mode==='slip'){
    G.t+=dt/(ruhig?0.05:0.6);if(G.t>=1)G.mode='play';
  }else if(G.mode==='jump'){
    G.t+=dt/(ruhig?0.05:0.42);
    const t=Math.min(1,G.t),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    G.climber.x=G.from.x+(G.to.x-G.from.x)*e;
    G.climber.y=G.from.y+(G.to.y-G.from.y)*e+Math.sin(t*Math.PI)*22;
    if(G.t>=1){
      G.climber={x:G.to.x,y:G.to.y};G.old.push({x:G.to.x,y:G.to.y,c:G.k%3});if(G.old.length>8)G.old.shift();
      G.k++;hud();
      if(G.k>=G.goal){G.mode='summit';G.t=0;G.banner='Gipfel!';G.bannerT=2;promptEl.textContent='Geschafft!';choices.innerHTML='';}
      else if(G.k%CAMP===0){
        G.mode='camp';G.t=0;G.banner='Lager '+(G.k/CAMP)+' · '+(G.k*METER)+' m';G.bannerT=1.6;
        G.fog=Math.min(G.fog,G.climber.y-MAX_GAP*P);          // im Lager faellt der Nebel zurueck
        window.LearningFeedback?.tone?.('done');
      }else next();
    }
  }else if(G.mode==='camp'){
    G.t+=dt/(ruhig?0.3:1.3);if(G.t>=1)next();
  }else if(G.mode==='summit'){
    G.t+=dt/(ruhig?0.3:1.6);if(G.t>=1)finish(true);
  }
  const target=G.climber.y-H*0.3;G.cam+=(target-G.cam)*Math.min(1,dt*5);
}
function finish(won){
  G.mode='over';G.won=won;
  const id=G.part,old=saved.best[id]||0,record=G.score>old;
  if(record)saved.best[id]=G.score;
  if(won)saved.summits[id]=(saved.summits[id]||0)+1;
  save();
  const missed=[...G.missed.values()];
  stage.hidden=true;over.hidden=false;
  over.innerHTML='<h1>'+(won?'Gipfel erreicht!':'Der Nebel hat dich eingeholt.')+'</h1>'
    +'<p class="result">'+(G.k*METER)+' m von '+(G.goal*METER)+' m · '+G.score+' Punkte'+(record&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
    +'<p class="muted">'+G.correct+' Wörter beim ersten Versuch richtig · Bestwert: '+(saved.best[id]||0)+' Punkte</p>'
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
}
function showMenu(){
  G.mode='menu';stage.hidden=true;over.hidden=true;menu.hidden=false;
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
  if(e.key in map){e.preventDefault();choose(map[e.key]);}
  else if(e.key===' '||e.key==='p'||e.key==='Escape'){e.preventDefault();pause(!G.paused);}
});
$('pause').onclick=()=>pause(!G.paused);
$('quit').onclick=showMenu;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
window.addEventListener('resize',resize);

/* ------------------------------------------------------------ Zeichnen */
const FONT='Inter,system-ui,-apple-system,"Segoe UI",sans-serif';
const HOLD=['#FF7A59','#5FD3C4','#FFC857'];
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
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
function rounded(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
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
function drawWall(){
  const top=G.goal*P+70,progress=Math.max(0,Math.min(1,G.climber.y/(G.goal*P)));
  /* Himmel ueber dem Gipfel */
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1B2A4A');sky.addColorStop(.6,'#C2547A');sky.addColorStop(1,'#FFB36B');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const topY=sy(top);
  if(topY>-40){ctx.fillStyle='#FFE9B8';ctx.beginPath();ctx.arc(W*0.74,topY-70,26,0,7);ctx.fill();}
  /* Fels: unten kuehl und dunkel, oben im Alpengluehen */
  const mix=(a,b)=>Math.round(a+(b-a)*progress);
  const rock=ctx.createLinearGradient(0,0,W,0);
  rock.addColorStop(0,'rgb('+mix(24,74)+','+mix(34,48)+','+mix(52,72)+')');
  rock.addColorStop(.5,'rgb('+mix(38,112)+','+mix(52,70)+','+mix(74,88)+')');
  rock.addColorStop(1,'rgb('+mix(20,60)+','+mix(28,38)+','+mix(44,60)+')');
  ctx.fillStyle=rock;
  ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,Math.max(-10,topY+18));
  for(let x=0;x<=W;x+=30)ctx.lineTo(x,Math.max(-10,topY+(rnd(x)*26-8)));
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  /* Risse, Baender und Schneeflecken - je Reihe gleich, damit nichts flimmert */
  const first=Math.floor(G.cam/50)-1,last=Math.floor((G.cam+H)/50)+1;
  for(let row=first;row<=last;row++){
    const y=row*50;if(y>top-30)continue;
    const a=rnd(row),b=rnd(row+500),c=rnd(row+900),Y=sy(y);
    ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=1.5;ctx.beginPath();
    ctx.moveTo(a*W,Y);ctx.lineTo(a*W+18+b*26,Y-14-c*18);ctx.lineTo(a*W+30+b*40,Y-8-c*34);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.05)';rounded(b*W-40,Y-20,70+c*60,9,4);ctx.fill();
    if(c<0.12+progress*0.5){ctx.fillStyle='rgba(244,241,234,'+(0.07+progress*0.3)+')';ctx.beginPath();ctx.ellipse(c*7*W%W,Y-30,18+a*20,4+b*3,0,0,7);ctx.fill();}
  }
  /* Basislager und Lager */
  for(let camp=0;camp*CAMP<G.goal;camp++){
    const y=camp*CAMP*P-84,Y=sy(y);if(Y<-60||Y>H+60)continue;
    ctx.fillStyle='rgba(0,0,0,.3)';rounded(8,Y,W-16,10,5);ctx.fill();
    ctx.fillStyle='rgba(244,241,234,.9)';rounded(8,Y-3,W-16,6,3);ctx.fill();
    const tx=camp%2?W-70:34;
    ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.moveTo(tx,Y-3);ctx.lineTo(tx+18,Y-30);ctx.lineTo(tx+36,Y-3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.moveTo(tx+13,Y-3);ctx.lineTo(tx+18,Y-16);ctx.lineTo(tx+23,Y-3);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(244,241,234,.85)';ctx.font='700 10px '+FONT;ctx.textAlign=camp%2?'right':'left';
    ctx.fillText(camp?'LAGER '+camp:'BASECAMP',camp%2?tx-8:tx+44,Y-10);
  }
  /* Gipfelfahne */
  if(topY>-80&&topY<H+20){
    const fx=W/2+60,fy=topY+6,wave=Math.sin(G.time*5)*3;
    ctx.strokeStyle='#F4F1EA';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-52);ctx.stroke();
    ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.moveTo(fx,fy-52);ctx.lineTo(fx+30,fy-44+wave);ctx.lineTo(fx,fy-34);ctx.closePath();ctx.fill();
  }
}
function drawHolds(){
  for(const o of G.old){const Y=sy(o.y);ctx.fillStyle=HOLD[o.c];ctx.globalAlpha=.55;ctx.beginPath();ctx.ellipse(o.x,Y,13,8,0,0,7);ctx.fill();ctx.globalAlpha=1;}
  if(G.mode==='camp'||G.mode==='summit')return;
  for(const h of G.holds){
    if(h.state!=='ok')continue;
    const Y=sy(h.y);
    if(!h.label)h.label=fit(h.w.en,100);
    const lines=h.label.lines,lh=h.label.size+3,ph=lines.length*lh+14,py=Y+16;
    ctx.fillStyle='rgba(0,0,0,.35)';rounded(h.x-55,py+3,110,ph,12);ctx.fill();
    ctx.fillStyle='#F4F1EA';rounded(h.x-55,py,110,ph,12);ctx.fill();
    ctx.fillStyle='#151B2B';ctx.font='700 '+h.label.size+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((l,n)=>ctx.fillText(l,h.x,py+7+lh/2+n*lh));
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(h.x,Y+4,22,12,0,0,7);ctx.fill();
    ctx.fillStyle=HOLD[h.lane];ctx.beginPath();ctx.ellipse(h.x,Y,22,12,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(h.x-6,Y-4,9,4,0,0,7);ctx.fill();
  }
  for(const b of G.bits){ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle='#8A93A6';ctx.beginPath();ctx.arc(b.x,sy(b.y),b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;
}
function drawClimber(){
  let x=G.climber.x,y=sy(G.climber.y);
  if(G.mode==='slip'&&!ruhig){const t=G.t;x+=Math.sin(t*26)*5*(1-t);y+=Math.sin(t*Math.PI)*-12;}
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(127,224,208,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+56);ctx.quadraticCurveTo(x-10,y+130,x+4,H+10);ctx.stroke();
  const swing=G.mode==='jump'?Math.sin(G.t*Math.PI)*8:Math.sin(G.time*2)*1.5;
  ctx.strokeStyle='#1B2233';ctx.lineWidth=7;                                     // Beine
  ctx.beginPath();ctx.moveTo(x-5,y+60);ctx.lineTo(x-12-swing,y+80);ctx.moveTo(x+5,y+60);ctx.lineTo(x+12+swing,y+78);ctx.stroke();
  ctx.strokeStyle='#FF7A59';ctx.lineWidth=7;                                     // Arme
  ctx.beginPath();ctx.moveTo(x-9,y+38);ctx.lineTo(x-7,y+2);ctx.moveTo(x+9,y+38);ctx.lineTo(x+7,y+2);ctx.stroke();
  ctx.fillStyle='#FF7A59';rounded(x-11,y+34,22,28,8);ctx.fill();                 // Jacke
  ctx.fillStyle='#7FE0D0';rounded(x-8,y+40,16,16,5);ctx.fill();                  // Rucksack
  ctx.fillStyle='#F2C9A5';ctx.beginPath();ctx.arc(x,y+26,9,0,7);ctx.fill();      // Kopf
  ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(x,y+24,10,Math.PI,0);ctx.fill();// Helm
}
function drawFog(){
  const Y=sy(G.fog);if(Y>H+110)return;
  ctx.fillStyle='rgba(232,238,245,.32)';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,Y-70);
  for(let x=0;x<=W;x+=20)ctx.lineTo(x,Y-70+Math.sin(x*0.05+G.time*1.3)*12);
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  const g=ctx.createLinearGradient(0,Y-14,0,Y+70);g.addColorStop(0,'rgba(232,238,245,0)');g.addColorStop(.45,'rgba(232,238,245,.86)');g.addColorStop(1,'rgba(240,244,249,.98)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,Y-14);
  for(let x=0;x<=W;x+=20)ctx.lineTo(x,Y-14+Math.sin(x*0.04-G.time*0.9)*8);
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
}
function draw(){
  if(!ctx)return;
  drawWall();drawHolds();drawClimber();drawFog();
  /* Warnung, wenn der Nebel nah ist */
  const gap=(G.climber.y-G.fog)/P;
  if(G.mode==='play'&&gap<0.85){ctx.fillStyle='rgba(255,90,70,'+(0.10+0.08*Math.sin(G.time*8))+')';ctx.fillRect(0,0,W,H);}
  if(G.bannerT>0){
    ctx.globalAlpha=Math.min(1,G.bannerT*2);ctx.fillStyle='rgba(13,16,23,.82)';rounded(40,H*0.2,W-80,56,18);ctx.fill();
    ctx.fillStyle='#F4F1EA';ctx.font='800 22px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(G.banner,W/2,H*0.2+29);ctx.globalAlpha=1;
  }
  if(G.paused){
    ctx.fillStyle='rgba(13,16,23,.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#F4F1EA';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 26px '+FONT;ctx.fillText('Pause',W/2,H/2-12);ctx.font='500 14px '+FONT;ctx.fillText('Tippen zum Weiterklettern',W/2,H/2+18);
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

window.ClimbGame={G,start,choose,update,finish,showMenu,pause,P,GOAL,CAMP,METER};
showMenu();
})();
