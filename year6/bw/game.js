/* =========================================================================
   BLACK & WHITE (Arbeitstitel) - Year 6, Vokabeln aus Unit 2.
   Eine Reise mit vier schwarz-weissen Tieren. Fertig ist Kapitel 1:

   PINGUIN - EISSCHOLLEN-HUEPFEN (Antarktis)
   Oben steht das deutsche Wort, auf drei Eisschollen stehen englische
   Woerter. Der Pinguin huepft auf die richtige Scholle. Eine falsche
   Scholle versinkt und kostet ein Herz. Die eigene Scholle schmilzt:
   Wer zu lange wartet, verliert ebenfalls ein Herz. Manche Schollen tragen
   einen Fisch (Bonus). Nach zwoelf Schollen ist das offene Meer erreicht -
   der Pinguin verwandelt sich in den Orca (morph.js).

   Die Spiellogik (start, choose, update) braucht keine Zeichenflaeche und
   laesst sich so testen. Die Lernfaecher der App bleiben unberuehrt.
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,$=id=>document.getElementById(id);
const KEY='vt6:bw:v1',GOAL=12,HEARTS=3,HOP=0.5,SLIDE=0.45,SINK=0.8;
const zeitFuer=k=>Math.max(6,11-0.4*k);           // Sekunden, bis die eigene Scholle schmilzt
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
let saved={best:{}};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object')saved={best:p.best};}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}};
const toene=()=>{try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}};
const ton=k=>{try{window.LearningFeedback&&window.LearningFeedback.tone(k);}catch(e){}};

const G={mode:'menu',part:null,pool:[],queue:[],q:null,floes:[],k:0,hearts:HEARTS,score:0,streak:0,fish:0,
 melt:0,time:0,anim:0,lane:-1,missed:new Map(),pops:[]};

function wortliste(id){return id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||D.parts[0]).words;}
function start(id){
 Object.assign(G,{mode:'play',part:id,pool:wortliste(id),k:0,hearts:HEARTS,score:0,streak:0,fish:0,melt:0,time:0,anim:0,lane:-1,missed:new Map(),pops:[]});
 G.queue=mische(G.pool);
 zeige('stage');next();
 if(!laeuft&&typeof requestAnimationFrame==='function'){laeuft=true;zuletzt=0;requestAnimationFrame(schleife);}
}
function next(){
 if(!G.queue.length)G.queue=mische(G.pool);
 G.q=G.queue.shift();
 const falsch=[];
 for(const w of mische(G.pool)){if(falsch.length===2)break;if(w.en===G.q.en||w.de===G.q.de)continue;if(falsch.some(o=>o.en===w.en||o.de===w.de))continue;falsch.push(w);}
 G.floes=mische([G.q,...falsch]).map(w=>({w,state:'ok',fish:false,t:0}));
 const richtig=G.floes.find(f=>f.w===G.q);richtig.fish=Math.random()<0.35;
 G.melt=0;G.lane=-1;G.mode='play';
 zeigeFrage();
}
function pop(text,farbe){G.pops.push({text,farbe:farbe||'#FFFFFF',t:0});}
function herzWeg(){
 G.hearts--;G.streak=0;
 if(G.hearts<=0){G.mode='lost';G.anim=0;}
}
function choose(i){
 if(G.mode!=='play')return false;
 const f=G.floes[i];if(!f||f.state!=='ok')return false;
 if(f.w===G.q){
  G.lane=i;G.mode='hop';G.anim=0;G.streak++;
  const bonus=Math.round((1-G.melt)*10),punkte=10+bonus+Math.min(G.streak-1,5)*2;
  G.score+=punkte;pop('+'+punkte,'#FFE08A');
  if(f.fish){G.fish++;G.score+=20;pop('Fisch! +20','#9FD3F2');}
  ton('ok');
  return true;
 }
 f.state='sink';f.t=0;G.missed.set(G.q.en,G.q);
 if(!G.queue.includes(G.q))G.queue.splice(Math.min(2,G.queue.length),0,G.q);
 pop('Falsche Scholle!','#FF9A8A');ton('no');herzWeg();
 zeigeFrage();
 return false;
}
function update(dt){
 dt=Math.min(dt,0.1);G.time+=dt;
 for(const p of G.pops)p.t+=dt;G.pops=G.pops.filter(p=>p.t<1.3);
 for(const f of G.floes)if(f.state==='sink'){f.t+=dt;if(f.t>=SINK)f.state='gone';}
 if(G.mode==='play'){
  G.melt+=dt/zeitFuer(G.k);
  if(G.melt>=1){G.melt=0;G.missed.set(G.q.en,G.q);pop('Geschmolzen!','#FF9A8A');ton('no');herzWeg();zeigeFrage();}
 }else if(G.mode==='hop'){
  G.anim+=dt;if(G.anim>=HOP){G.mode='slide';G.anim=0;}
 }else if(G.mode==='slide'){
  G.anim+=dt;
  if(G.anim>=SLIDE){G.k++;if(G.k>=GOAL)morph();else next();}
 }else if(G.mode==='lost'){
  G.anim+=dt;if(G.anim>=1.2)finish(false);
 }
 zeigeStand();
}
function morph(){
 G.mode='morph';
 const cv=$('eis');
 document.body.classList.add('morph');
 if(cv&&cv.getContext&&window.BWMorph&&typeof requestAnimationFrame==='function'&&cv.getContext('2d'))window.BWMorph.start(cv,()=>finish(true),{ton:toene()});
 else finish(true);
}
function finish(won){
 if(G.mode==='over')return;
 G.mode='over';document.body.classList.remove('morph');
 const alt=saved.best[G.part]||0,rekord=G.score>alt;if(rekord){saved.best[G.part]=G.score;save();}
 const o=$('over');if(!o)return;
 const missed=[...G.missed.values()];
 o.innerHTML='<h1 tabindex="-1">'+(won?'Kapitel 1 geschafft!':'Platsch – ins kalte Wasser.')+'</h1>'
  +(won?'<p class="lead">Der Pinguin hat das offene Meer erreicht und ist jetzt ein Orca. Kapitel 2 folgt.</p>':'<p class="lead">Der Pinguin hat '+G.k+' von '+GOAL+' Schollen geschafft.</p>')
  +'<p class="result">'+G.score+' Punkte'+(rekord&&G.score?' · <strong>neuer Bestwert!</strong>':'')+' · '+G.fish+(G.fish===1?' Fisch':' Fische')+'</p>'
  +'<div class="actions"><button id="again" class="go">Nochmal spielen</button><button id="toMenu">Anderen Abschnitt wählen</button></div>'
  +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')+'</ul>':'<p class="muted">Kein einziger Fehler – stark!</p>');
 zeige('over');
 $('again').onclick=()=>start(G.part);$('toMenu').onclick=showMenu;
 try{o.querySelector('h1').focus();}catch(e){}
}

/* ---------------- Oberflaeche ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;}
function zeigeFrage(){
 if(!$('prompt'))return;
 $('prompt').textContent=G.q.de;
 const box=$('choices');
 box.innerHTML=G.floes.map((f,i)=>'<button data-lane="'+i+'" lang="en"'+(f.state!=='ok'?' disabled':'')+'>'+esc(f.w.en)+'</button>').join('');
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(+b.dataset.lane));
}
function zeigeStand(){
 if(!$('floe'))return;
 $('floe').textContent='Scholle '+Math.min(G.k+1,GOAL)+'/'+GOAL;$('points').textContent=G.score+' P';
 $('hearts').textContent='♥'.repeat(Math.max(0,G.hearts))+'♡'.repeat(Math.max(0,HEARTS-G.hearts));
}
function showMenu(){
 G.mode='menu';zeige('menu');document.body.classList.remove('morph');
 const box=$('levels');if(!box)return;
 const knopf=(id,name,n,all)=>'<button data-part="'+id+'"'+(all?' class="all"':'')+'><span class="l-name">'+esc(name)+'</span><span class="l-info">'+n+' Wörter'+(saved.best[id]?' · Bestwert: '+saved.best[id]+' P':'')+'</span></button>';
 box.innerHTML=D.parts.map(p=>knopf(p.id,p.name,p.words.length)).join('')+knopf('all','Ganze Unit 2',D.parts.reduce((a,p)=>a+p.words.length,0),true);
 box.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>start(b.dataset.part));
}

/* ---------------- Zeichnen ---------------- */
let laeuft=false,zuletzt=0,ctx=null;
const flocken=[...Array(60)].map((_,i)=>({x:(i*0.618)%1,y:(i*0.377)%1,v:0.03+(i%7)*0.01,r:1+(i%3)}));
const lerp=(a,b,t)=>a+(b-a)*t,weich=t=>t*t*(3-2*t);
function ort(w,h){ /* Plaetze: eigene Scholle und die drei Zielschollen */
 return {ich:{x:w/2,y:h*0.83,rx:w*0.24},ziel:[0,1,2].map(i=>({x:w*(0.19+i*0.31),y:h*0.5,rx:w*0.145}))};
}
function scholle(x,y,rx,o){
 o=o||{};const ry=rx*0.34,tief=rx*0.2;
 ctx.save();ctx.globalAlpha=o.alpha==null?1:o.alpha;ctx.translate(x,y+(o.dy||0));if(o.rot)ctx.rotate(o.rot);
 ctx.fillStyle='rgba(10,40,80,.25)';ctx.beginPath();ctx.ellipse(0,tief+ry*0.5,rx*1.02,ry,0,0,7);ctx.fill();
 ctx.fillStyle='#8FC3E6';ctx.beginPath();ctx.ellipse(0,tief,rx,ry,0,0,7);ctx.fill();ctx.fillRect(-rx,0,rx*2,tief);
 const g=ctx.createLinearGradient(0,-ry,0,ry);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#DCEEFA');
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,7);ctx.fill();
 if(o.risse>0.3){ctx.strokeStyle='rgba(70,120,170,'+Math.min(1,o.risse)+')';ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(-rx*0.5,-ry*0.2);ctx.lineTo(-rx*0.1,ry*0.1);ctx.lineTo(-rx*0.2,ry*0.6);ctx.moveTo(-rx*0.1,ry*0.1);ctx.lineTo(rx*0.4,-ry*0.1);
  if(o.risse>0.65){ctx.lineTo(rx*0.6,ry*0.4);ctx.moveTo(rx*0.4,-ry*0.1);ctx.lineTo(rx*0.3,-ry*0.7);}ctx.stroke();}
 ctx.restore();
}
function fisch(x,y,r){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(G.time*8)*0.2);
 ctx.fillStyle='#5B9CC9';ctx.beginPath();ctx.moveTo(r*0.55,0);ctx.lineTo(r*1.15,-r*0.5);ctx.lineTo(r*1.05,0);ctx.lineTo(r*1.15,r*0.5);ctx.closePath();ctx.fill();
 ctx.fillStyle='#8EC6EA';ctx.beginPath();ctx.ellipse(0,0,r*0.75,r*0.42,0,0,7);ctx.fill();
 ctx.fillStyle='#E8F4FB';ctx.beginPath();ctx.ellipse(-r*0.05,r*0.14,r*0.55,r*0.18,0,0,7);ctx.fill();
 ctx.fillStyle='#1B2B3F';ctx.beginPath();ctx.arc(-r*0.5,-r*0.08,r*0.09,0,7);ctx.fill();ctx.restore();
}
function schild(x,y,text,breit,aus){
 const fs=Math.max(12,Math.min(17,breit/9));ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';
 const worte=String(text).split(' '),zeilen=[];let z='';
 for(const wo of worte){const t=z?z+' '+wo:wo;if(ctx.measureText(t).width>breit-14&&z){zeilen.push(z);z=wo;}else z=t;}zeilen.push(z);
 const zh=fs*1.2,bh=zeilen.length*zh+12,bw=Math.min(breit,Math.max(...zeilen.map(l=>ctx.measureText(l).width))+18);
 ctx.save();ctx.globalAlpha=aus?0.35:1;
 ctx.fillStyle='rgba(16,21,28,.92)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x-bw/2,y-bh,bw,bh,9);else ctx.rect(x-bw/2,y-bh,bw,bh);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.textBaseline='middle';
 zeilen.forEach((l,n)=>ctx.fillText(l,x,y-bh+6+zh*(n+0.5)));ctx.restore();
}
function zeichne(){
 const cv=$('eis');if(!cv||!cv.getContext)return;ctx=ctx||cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 /* Himmel, Eisberge, Meer */
 const hz=h*0.27;let g=ctx.createLinearGradient(0,0,0,hz);g.addColorStop(0,'#7FBDEB');g.addColorStop(1,'#DDF0FB');ctx.fillStyle=g;ctx.fillRect(0,0,w,hz);
 ctx.fillStyle='rgba(255,250,225,.9)';ctx.beginPath();ctx.arc(w*0.8,hz*0.42,hz*0.16,0,7);ctx.fill();
 ctx.fillStyle='#C6E0F3';ctx.beginPath();ctx.moveTo(0,hz);for(let i=0;i<=10;i++)ctx.lineTo(w*i/10,hz*(1-(i%2?0.42:0.12)-((i*37)%5)*0.05));ctx.lineTo(w,hz);ctx.fill();
 ctx.fillStyle='#EAF5FC';ctx.beginPath();ctx.moveTo(w*0.05,hz);ctx.lineTo(w*0.18,hz*0.5);ctx.lineTo(w*0.3,hz);ctx.moveTo(w*0.55,hz);ctx.lineTo(w*0.66,hz*0.62);ctx.lineTo(w*0.8,hz);ctx.fill();
 g=ctx.createLinearGradient(0,hz,0,h);g.addColorStop(0,'#5FB2DF');g.addColorStop(0.5,'#2479AE');g.addColorStop(1,'#0F4470');ctx.fillStyle=g;ctx.fillRect(0,hz,w,h-hz);
 ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;
 for(let k=0;k<9;k++){const y=hz+(h-hz)*((k+((G.time*0.05)%1))/9),b=w*(0.06+0.02*k);const x=(k*0.37%1)*w+Math.sin(G.time*0.7+k)*14;ctx.beginPath();ctx.moveTo(x-b,y);ctx.quadraticCurveTo(x,y-4,x+b,y);ctx.stroke();}
 /* Morph-Leiste */
 const lb=w*0.56,lx=w*0.22,ly=12,voll=(G.k+(G.mode==='slide'?weich(G.anim/SLIDE):0))/GOAL;
 ctx.fillStyle='rgba(16,21,28,.55)';ctx.beginPath();ctx.roundRect?ctx.roundRect(lx-6,ly-5,lb+12,20,10):ctx.rect(lx-6,ly-5,lb+12,20);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,10);
 g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#9FD3F2');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*Math.min(1,voll),10);
 ctx.fillStyle='#10151C';ctx.font='700 11px Inter, system-ui, sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('PINGUIN',8,ly+5);ctx.textAlign='right';ctx.fillText('ORCA',w-8,ly+5);
 /* Schollen */
 const O=ort(w,h),hop=G.mode==='hop'?weich(G.anim/HOP):G.mode==='slide'?1:0,rutsch=G.mode==='slide'?weich(G.anim/SLIDE):0;
 const kF=Math.min(w,h*0.62)/390*2.1;
 G.floes.forEach((f,i)=>{
  const z=O.ziel[i];let x=z.x,y=z.y,rx=z.rx,alpha=1,rot=0,dy=Math.sin(G.time*1.6+i*2)*3;
  if(G.mode==='slide'){if(i===G.lane){x=lerp(z.x,O.ich.x,rutsch);y=lerp(z.y,O.ich.y,rutsch);rx=lerp(z.rx,O.ich.rx,rutsch);}else{y=z.y+rutsch*h*0.55;alpha=1-rutsch;}}
  if(f.state==='gone')return;
  if(f.state==='sink'){const s=f.t/SINK;dy+=s*s*h*0.12;alpha=1-s;rot=s*0.5*(i===1?1:i-1);}
  scholle(x,y,rx,{alpha,rot,dy});
  if(f.fish&&f.state==='ok'&&!(G.mode!=='play'&&i===G.lane))fisch(x+rx*0.5,y-rx*0.3+dy,rx*0.3);
  if(G.mode==='play'||(G.mode==='hop'&&i!==G.lane)||f.state==='sink')schild(x,y-rx*0.42+dy,f.w.en,w*0.3,f.state!=='ok');
 });
 /* eigene Scholle: schmilzt und reisst */
 const eigenY=O.ich.y+(G.mode==='slide'?rutsch*h*0.4:0),eigenA=G.mode==='slide'?1-rutsch:1,schmelz=G.mode==='play'?G.melt:0;
 scholle(O.ich.x,eigenY,O.ich.rx*(1-schmelz*0.38),{alpha:eigenA,risse:schmelz,dy:Math.sin(G.time*1.3)*2});
 if(G.mode==='slide'){/* neue Schollen tauchen auf */for(const z of O.ziel)scholle(z.x,z.y-(1-rutsch)*h*0.2,z.rx,{alpha:rutsch});}
 /* Pinguin */
 let px=O.ich.x,py=O.ich.y,ps=kF,sprung=0,rot=0,mood;
 if(G.lane>=0&&(G.mode==='hop'||G.mode==='slide')){const z=O.ziel[G.lane];
  px=lerp(O.ich.x,z.x,hop);py=lerp(O.ich.y,z.y,hop);ps=lerp(kF,kF*0.62,hop);sprung=Math.sin(Math.PI*hop)*h*0.13;
  if(G.mode==='slide'){px=lerp(z.x,O.ich.x,rutsch);py=lerp(z.y,O.ich.y,rutsch);ps=lerp(kF*0.62,kF,rutsch);}}
 if(G.mode==='lost'){const s=Math.min(1,G.anim/0.9);py+=s*s*h*0.2;rot=s*1.2;}
 const zitter=G.mode==='play'&&G.melt>0.7?Math.sin(G.time*40)*2:0;
 ctx.save();ctx.globalAlpha=G.mode==='lost'?Math.max(0,1-G.anim/1.0):1;
 window.Figuren.pinguin(ctx,px+zitter,py,ps,{hop:sprung,wave:G.mode==='play'?Math.sin(G.time*3)*0.3:1,blush:true,rot,mood});
 ctx.restore();
 /* Schnee und Meldungen */
 ctx.fillStyle='rgba(255,255,255,.8)';for(const f of flocken){const y=((f.y+G.time*f.v)%1)*h,x=(f.x+Math.sin(G.time*0.6+f.y*9)*0.02)*w;ctx.beginPath();ctx.arc(x,y,f.r,0,7);ctx.fill();}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 20px Inter, system-ui, sans-serif';
 G.pops.forEach((p,n)=>{ctx.globalAlpha=Math.max(0,1-p.t/1.3);ctx.strokeStyle='rgba(16,21,28,.8)';ctx.lineWidth=4;const y=h*0.36-p.t*26-n*24;ctx.strokeText(p.text,w/2,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,w/2,y);});
 ctx.globalAlpha=1;
}
function schleife(jetzt){
 const dt=zuletzt?(jetzt-zuletzt)/1000:0;zuletzt=jetzt;
 if(G.mode==='menu'||G.mode==='over'){laeuft=false;return;}
 if(G.mode!=='morph'){update(dt);if(G.mode!=='morph'&&G.mode!=='over')zeichne();}
 requestAnimationFrame(schleife);
}

/* ---------------- Eingabe ---------------- */
const cv=$('eis');
if(cv){
 cv.addEventListener('pointerdown',e=>{if(G.mode!=='play')return;const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  if(y<0.25||y>0.68)return;choose(Math.max(0,Math.min(2,Math.floor(x*3))));e.preventDefault();});
 document.addEventListener('keydown',e=>{if(G.mode!=='play')return;const i={'1':0,'2':1,'3':2,ArrowLeft:0,ArrowUp:1,ArrowRight:2}[e.key];if(i!=null){choose(i);e.preventDefault();}});
 $('quit').onclick=showMenu;
}
showMenu();
window.BWGame={G,start,choose,update,finish,showMenu,next,GOAL,HEARTS,HOP,SLIDE,zeitFuer};
})();
