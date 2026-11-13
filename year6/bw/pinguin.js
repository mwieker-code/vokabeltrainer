/* =========================================================================
   PENGUIN HOP - Kapitel 1 von Black & White (Year 6, Unit 2)
   Eisschollen-Hüpfen. Es gibt nur eine einzige Handlung: auf eine Scholle
   tippen.

   Der Pinguin steht auf seiner Eisscholle. Vor ihm treiben drei Schollen,
   jede mit einem Wortschild. Tippen auf die richtige Scholle = der Pinguin
   springt hinueber. Die falsche Scholle kippt, der Pinguin platscht ins
   Wasser (ein Herz weg) und wird auf die richtige Scholle gerettet - so sieht
   man die Loesung. Die eigene Scholle schmilzt langsam (Zeitbalken); wer zu
   lange wartet, geht ebenfalls baden.

   Extras:
   - Serie: ab 3 richtigen in Folge leuchten die Schollen und die Spruenge
     werden hoeher; jede 5. richtige ist ein Super-Sprung (Salto, Fontaene,
     Bonus). Der Punkte-Multiplikator steigt mit der Serie.
   - Fundstuecke auf Schollen: Fische, goldener Fisch, Schal (faengt einen
     Fehler ab). Man bekommt sie nur, wenn die Scholle die richtige ist.
   - Wetter: Sonne, dann Schneetreiben, am Ende Nacht mit Polarlicht.
   - Die Schollen treiben sanft hin und her.
   - Finale: die letzten drei Woerter fuehren einen Eisberg hinauf.

   Die Logik (start, update, lane, tipp) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
const W=360,GOAL=16,HEARTS=3,FINALE=3;
const COLX=[64,180,296],LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['1','2','3'];
const D={ankunft:0.6,sprung:0.55,jubel:0.3,superJubel:0.9,kipp:0.5,wasser:0.9,rettung:0.6,weiter:0.7};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

const O={mode:'aus',H:560,k:0,hearts:HEARTS,score:0,streak:0,best:0,q:null,queue:[],pool:[],missed:new Map(),fish:0,jumps:0,gold:0,
 phase:'ankunft',pt:0,anim:0,zeit:0,zeitMax:1,ziele:[],basis:{x:COLX[1]},alt:null,wahl:-1,vorwahl:-1,ergebnis:null,kipp:-1,super:false,
 px:COLX[1],py:0,rot:0,spr:null,shield:false,time:0,wasser:0,pops:[],parts:[],onEnd:null,onFrage:null,tick:0};
const yBase=()=>Math.round(O.H*0.8),yTop=()=>Math.round(Math.max(170,O.H*0.5)),DY=()=>yBase()-yTop();
const tempo=()=>1+0.05*Math.min(O.streak,10);
const mult=()=>1+0.25*Math.min(O.streak,8);
const drift=()=>Math.min(10,4+O.k*0.5);
const zielX=i=>COLX[i]+Math.sin(O.time*0.8)*drift()+Math.sin(O.time*1.7+i*2.1)*2;
const zielY=i=>yTop()+Math.sin(O.time*2.2+i*1.3)*2.5;
const zeitFuer=k=>k===0?14:Math.max(6.5,11-k*0.3);
const finale=()=>O.k>=GOAL-FINALE;
const leuchtet=()=>O.streak>=3;
/* Wetter: 0..1 Schnee, 0..1 Nacht */
const wetter=()=>({schnee:clamp((O.k-4)/3,0,1),nacht:clamp((O.k-10)/3,0,1)});
const richtigIdx=()=>O.ziele.findIndex(z=>z.w===O.q);
/* Schlussbild auf dem Eisberg (auch waehrend der Pinguin abtaucht) */
const amZiel=()=>O.mode==='ziel'||O.mode==='tauchen'||(O.mode==='aus'&&O.k>=GOAL);

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,missed:new Map(),fish:0,jumps:0,gold:0,
  anim:0,weg:false,basis:{x:COLX[1]},alt:null,vorwahl:-1,super:false,px:COLX[1],rot:0,spr:null,shield:false,time:0,wasser:0,pops:[],parts:[],tick:0,
  onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 O.py=yBase();
 neueFrage();phase('ankunft');
}
function phase(p){O.phase=p;O.pt=0;}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
function neueFrage(){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 O.ziele=mische([O.q,...falsche(O.q)]).map((w,i)=>({w,lane:i,item:null}));
 /* Fundstuecke: liegen auf irgendeiner Scholle - nur die richtige bringt sie */
 const irgendeine=()=>O.ziele[Math.floor(Math.random()*3)];
 if(O.k%6===3&&!O.shield)irgendeine().item='schal';
 else if(O.k%5===4)irgendeine().item='gold';
 else if(O.k>0&&Math.random()<0.7)irgendeine().item='fische';
 O.wahl=-1;O.ergebnis=null;O.kipp=-1;O.super=false;O.tick=0;
 O.zeitMax=zeitFuer(O.k);O.zeit=O.zeitMax;
 if(O.onFrage)O.onFrage(O.q,O.ziele.map(z=>({w:z.w,lane:z.lane})));
}
function pop(text,farbe){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(art==='spritzer'?160:art==='fontaene'?420:0),life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt'});}
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}

/* waehlen: Tippen auf die Scholle, Knopf oder Taste 1 2 3 */
function lane(i){
 if(O.mode!=='play')return false;i=clamp(i|0,0,2);
 if(O.phase==='wahl'){springe(i);return true;}
 if(O.phase==='weiter'||O.phase==='ankunft'){O.vorwahl=i;sfx('wahl');return true;}
 return false;
}
function springe(i){
 O.wahl=i;O.vorwahl=-1;O.jumps++;O.spr={x0:O.px,y0:O.py,h:leuchtet()?100:72};phase('sprung');sfx('hops');
 teilchen(O.px,O.py,8,['#FFFFFF','#CFEFFF'],90);
}
/* gibt es nicht mehr - Leertaste bleibt ohne Wirkung */
function sprung(){return false;}
function sammle(z){
 if(z.item==='fische'){O.fish+=3;const p=Math.round(9*mult());O.score+=p;pop('3 Fische! +'+p,'#9FD3F2');teilchen(O.px,O.py-10,10,['#9FD3F2','#FFFFFF'],90);sfx('fisch');}
 else if(z.item==='gold'){O.gold++;O.fish++;O.score+=25;pop('Goldfisch! +25','#FFD54A');teilchen(O.px,O.py-20,24,['#FFD54A','#FFF3B0','#FFFFFF'],170);sfx('item');}
 else if(z.item==='schal'){O.shield=true;pop('Schal angelegt!','#FF9A8A');teilchen(O.px,O.py-20,18,['#E7413C','#FFFFFF'],140);sfx('item');}
 z.item=null;
}
function auswerten(){
 const z=O.ziele[O.wahl];
 if(z.w===O.q){
  O.ergebnis='richtig';O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(10*mult());O.score+=p;pop('+'+p,'#FFE08A');
  teilchen(O.px,O.py-10,22,['#FFE08A','#FFFFFF',LANE_COL[O.wahl]],170);sfx('richtig');
  if(z.item)sammle(z);
  O.super=O.streak%5===0;
  if(O.super){O.score+=20;pop('Super-Sprung! +20','#B6FFCF');teilchen(O.px,O.py,40,['#FFFFFF','#9FD3F2','#2479AE'],160,'fontaene');sfx('super');}
  phase('jubel');
 }else fehler('falsch');
}
function fehler(art){
 const q=O.q;O.missed.set(q.en,q);
 if(!O.queue.includes(q))O.queue.splice(Math.min(2,O.queue.length),0,q);
 if(O.shield){
  O.shield=false;O.ergebnis='schal';pop('Der Schal rettet dich!','#9FD3F2');sfx('schild');
  teilchen(O.px,O.py-20,20,['#E7413C','#FFFFFF'],150);O.spr={x0:O.px,y0:O.py,h:70};phase('rettung');return;
 }
 O.ergebnis=art;O.streak=0;O.kipp=art==='falsch'?O.wahl:-1;
 pop(art==='falsch'?'Falsche Scholle!':'Die Scholle ist geschmolzen!','#FF9A8A');sfx(art==='falsch'?'knack':'schmelz');musik(M=>M.fehler());
 phase('kipp');
}
function weiter(){
 /* Scholle erreicht: naechste Vokabel, alles rueckt nach unten */
 const rest=[0,1,2].filter(i=>i!==O.wahl&&i!==O.kipp).map(i=>zielX(i));
 O.alt={x:O.px,y0:O.py,basis:O.basis.x,rest,ledge:finale()};
 O.k++;O.rot=0;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;musik(M=>M.ziel());sfx('ziel');
  for(let i=0;i<4;i++)teilchen(60+i*80,yTop()-60-i%2*30,18,['#FFE08A','#FFFFFF','#9FD3F2','#FF9A8A'],180);return;}
 neueFrage();phase('weiter');
}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.3);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.art==='spritzer'||p.art==='fontaene'?700:60)*dt;p.vx*=0.98;p.life-=dt*1.2;}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.mode==='tauchen'){
  /* Kopfsprung vom Eisberg ins Meer - der Uebergang zum Orca */
  O.anim+=dt;const t=Math.min(1,O.anim/0.95),e=t*t;
  O.px=lerp(O.tx0,O.tx0+110,t);O.py=lerp(O.ty0,yBase()+40,e)-Math.sin(t*Math.PI)*70;O.rot=t*2.1;
  if(t>=1&&!O.weg){O.weg=true;sfx('platsch');teilchen(O.px,yBase()+10,40,['#FFFFFF','#9FD3F2','#2479AE'],230,'spritzer');}
  return;
 }
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;
  if(O.mode==='ziel'){O.px=lerp(O.px,W/2,Math.min(1,dt*6));O.py=yTop()-Math.abs(Math.sin(O.anim*7))*14;if(Math.random()<dt*4)teilchen(40+Math.random()*280,yTop()-120+Math.random()*60,10,['#FFE08A','#FFFFFF','#9FD3F2'],140);}
  if(O.anim>=(O.mode==='ziel'?1.8:1.4)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 musik(M=>{M.tempo(tempo());M.turbo(leuchtet());});
 O.pt+=dt;O.wasser+=dt*6;
 const p=O.phase;
 if(p==='ankunft'){O.px=O.basis.x;O.py=yBase();if(O.pt>=D.ankunft){phase('wahl');if(O.vorwahl>=0)springe(O.vorwahl);}}
 else if(p==='wahl'){
  O.px=O.basis.x;O.py=yBase();O.zeit-=dt;
  const s=Math.ceil(O.zeit);if(O.zeit<3&&s!==O.tick){O.tick=s;sfx('tick');}
  if(O.zeit<=0){O.zeit=0;fehler('zeit');}
 }
 else if(p==='sprung'||p==='rettung'){
  const ziel=p==='sprung'?O.wahl:richtigIdx(),t=Math.min(1,O.pt/(p==='sprung'?D.sprung:D.rettung)),e=ease(t);
  O.px=lerp(O.spr.x0,zielX(ziel),e);O.py=lerp(O.spr.y0,zielY(ziel),e)-Math.sin(t*Math.PI)*O.spr.h;
  if(t>=1){O.px=zielX(ziel);O.py=zielY(ziel);
   if(p==='sprung')auswerten();else{O.wahl=ziel;teilchen(O.px,O.py,10,['#FFFFFF','#B6FFCF'],90);weiter();}}
 }
 else if(p==='jubel'){
  const dur=O.super?D.superJubel:D.jubel,t=Math.min(1,O.pt/dur);
  O.px=zielX(O.wahl);O.py=zielY(O.wahl)-(O.super?Math.sin(t*Math.PI)*90:Math.sin(t*Math.PI)*8);O.rot=O.super?ease(t)*Math.PI*2:0;
  if(t>=1){O.rot=0;weiter();}
 }
 else if(p==='kipp'){
  const t=Math.min(1,O.pt/D.kipp);
  if(O.kipp>=0){O.px=zielX(O.kipp)+t*t*18;O.py=zielY(O.kipp)+t*t*16;}else{O.px=O.basis.x;O.py=yBase()+t*t*16;}
  O.rot=t*0.6;
  if(t>=1){O.hearts--;O.rot=0;O.py+=26;phase('wasser');sfx('platsch');teilchen(O.px,O.py-20,30,['#FFFFFF','#9FD3F2','#2479AE'],200,'spritzer');}
 }
 else if(p==='wasser'){
  O.py+=Math.sin(O.time*6)*0.3;
  if(O.pt>=D.wasser){
   if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());return;}
   O.spr={x0:O.px,y0:O.py,h:80};phase('rettung');sfx('hops');teilchen(O.px,O.py-20,16,['#FFFFFF','#9FD3F2'],140,'spritzer');
  }
 }
 else if(p==='weiter'){
  const t=Math.min(1,O.pt/D.weiter),e=ease(t),a=O.alt;
  O.px=a.x;O.py=lerp(a.y0,yBase(),e);O.wasser+=DY()*dt/D.weiter*0.12;
  if(t>=1){O.basis={x:a.x};O.alt=null;phase('wahl');O.py=yBase();if(O.vorwahl>=0)springe(O.vorwahl);}
 }
}

/* ---------------------------------------------------------------- Klang */
let ac=null,bus=null,rausch=null;
function toeneAn(){try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}}
function audio(){
 if(!toeneAn())return null;
 try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A();bus=ac.createGain();bus.gain.value=0.5;bus.connect(ac.destination);}
  if(ac.state==='suspended')ac.resume();return ac;}catch(e){return null;}
}
function ton(t,f1,f2,dauer,typ,laut){const o=ac.createOscillator(),g=ac.createGain();o.type=typ||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dauer*0.9);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);o.connect(g);g.connect(bus);o.start(t);o.stop(t+dauer+0.03);}
function zisch(t,f1,f2,dauer,laut,q){
 if(!rausch){rausch=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=rausch.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=rausch;f.type='bandpass';f.Q.value=q||1;
 f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+dauer);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+dauer*0.2);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+dauer+0.03);}
const KLANG={
 hops:t=>{ton(t,330,700,0.16,'triangle',0.18);},
 wahl:t=>{ton(t,880,880,0.08,'sine',0.14);},
 tick:t=>{ton(t,1400,1400,0.05,'square',0.06);},
 richtig:t=>{[784,988,1319].forEach((f,i)=>ton(t+i*0.05,f,f,0.2,'triangle',0.16));zisch(t,6000,9000,0.12,0.12,3);},
 super:t=>{[523,659,784,1047,1319,1568].forEach((f,i)=>ton(t+i*0.05,f,f,0.3,'triangle',0.14));zisch(t,1500,6000,0.5,0.25,0.8);},
 knack:t=>{zisch(t,3000,500,0.4,0.5,1);ton(t,400,110,0.35,'sawtooth',0.1);},
 schmelz:t=>{zisch(t,1200,300,0.5,0.35,1.5);ton(t,500,180,0.45,'sine',0.12);},
 platsch:t=>{zisch(t,2500,300,0.45,0.5,0.7);ton(t,300,90,0.4,'sine',0.25);},
 fisch:t=>{[1046,1318,1568].forEach((f,i)=>ton(t+i*0.06,f,f*1.3,0.08,'sine',0.14));},
 item:t=>{[523,784,1047].forEach((f,i)=>ton(t+i*0.05,f,f,0.25,'triangle',0.16));},
 schild:t=>{[1047,1319,1568].forEach((f,i)=>ton(t+i*0.05,f,f*1.003,0.35,'triangle',0.16));},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.15));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function mix(a,b,t){const A=hex(a),B=hex(b);return 'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],t))).join(',')+')';}
function mix3(a,b,c,s,n){const A=hex(a),B=hex(b),C=hex(c);return 'rgb('+A.map((v,i)=>Math.round(lerp(lerp(v,B[i],s),C[i],n))).join(',')+')';}
const horizont=()=>Math.max(60,yTop()-150);

function himmel(H,hz){
 const w=wetter();
 const g=ctx.createLinearGradient(0,0,0,hz);
 g.addColorStop(0,mix3('#4F8FD0','#6F8499','#070B1E',w.schnee,w.nacht));
 g.addColorStop(0.65,mix3('#A9D3F0','#A7B5C4','#16214A',w.schnee,w.nacht));
 g.addColorStop(1,mix3('#E4F3FC','#D6DEE6','#2C3B6B',w.schnee,w.nacht));
 ctx.fillStyle=g;ctx.fillRect(0,0,W,hz+2);
 /* Sonne bzw. Mond und Sterne */
 if(w.nacht<1){ctx.globalAlpha=(1-w.nacht)*(1-w.schnee*0.7);ctx.fillStyle='rgba(255,248,220,.95)';ctx.beginPath();ctx.arc(W*0.8,hz*0.42,20,0,7);ctx.fill();ctx.globalAlpha=1;}
 if(w.nacht>0){ctx.fillStyle='#FFFFFF';for(let i=0;i<40;i++){ctx.globalAlpha=w.nacht*(0.4+0.6*Math.abs(Math.sin(O.time*1.5+i)));ctx.fillRect(rnd(i)*W,rnd(i+40)*hz*0.9,1.6,1.6);}
  ctx.globalAlpha=w.nacht;ctx.fillStyle='#F4F1DE';ctx.beginPath();ctx.arc(W*0.2,hz*0.35,13,0,7);ctx.fill();ctx.fillStyle=mix('#16214A','#070B1E',0.5);ctx.beginPath();ctx.arc(W*0.2+6,hz*0.35-3,11,0,7);ctx.fill();ctx.globalAlpha=1;
  /* Polarlicht */
  if(!ruhig||true){ctx.save();ctx.globalAlpha=0.55*w.nacht;for(let k=0;k<3;k++){ctx.beginPath();const y0=hz*(0.12+k*0.13);ctx.moveTo(0,y0);
   for(let x=0;x<=W;x+=10)ctx.lineTo(x,y0+Math.sin(x*0.02+O.time*(ruhig?0:0.6)+k*2)*9+Math.sin(x*0.007-O.time*(ruhig?0:0.3))*12);
   ctx.lineTo(W,y0+30);ctx.lineTo(0,y0+30);ctx.closePath();const a=ctx.createLinearGradient(0,y0-12,0,y0+30);a.addColorStop(0,'rgba(120,255,190,0)');
   a.addColorStop(0.45,['rgba(120,255,190,.9)','rgba(170,140,255,.8)','rgba(110,220,255,.8)'][k]);a.addColorStop(1,'rgba(120,255,190,0)');ctx.fillStyle=a;ctx.fill();}ctx.restore();}}
 /* ferne Eisberge am Horizont */
 const berg=mix3('#F4FAFE','#C9D3DC','#3A4C78',w.schnee,w.nacht),schatten=mix3('#BFDDF0','#9EADBB','#26355E',w.schnee,w.nacht);
 for(let i=0;i<5;i++){const x=((rnd(i+7)*W+O.time*3*(i%2?1:-1))%(W+80)+W+80)%(W+80)-40,b=40+rnd(i)*50,h=12+rnd(i+3)*26;
  ctx.fillStyle=berg;ctx.beginPath();ctx.moveTo(x-b/2,hz+1);ctx.lineTo(x-b*0.2,hz-h);ctx.lineTo(x+b*0.1,hz-h*0.8);ctx.lineTo(x+b/2,hz+1);ctx.fill();
  ctx.fillStyle=schatten;ctx.beginPath();ctx.moveTo(x+b*0.1,hz-h*0.8);ctx.lineTo(x+b/2,hz+1);ctx.lineTo(x,hz+1);ctx.fill();}
 /* Finale: grosser Eisberg waechst hinter den Schollen empor */
 if(finale()||amZiel()){const f=amZiel()?1:clamp((O.k-(GOAL-FINALE)+1)/FINALE,0,1),top=lerp(hz-30,hz-170,f);
  const gb=ctx.createLinearGradient(0,top,0,hz+40);gb.addColorStop(0,mix('#FFFFFF','#8FA3D6',w.nacht));gb.addColorStop(1,mix('#9FCBE8','#2C3B6B',w.nacht));
  ctx.fillStyle=gb;ctx.beginPath();ctx.moveTo(30,hz+40);ctx.lineTo(90,top+60);ctx.lineTo(150,top+10);ctx.lineTo(180,top);ctx.lineTo(215,top+18);ctx.lineTo(270,top+70);ctx.lineTo(330,hz+40);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(150,top+10);ctx.lineTo(180,top);ctx.lineTo(168,top+60);ctx.lineTo(120,top+90);ctx.closePath();ctx.fill();}
}
function meer(H,hz){
 const w=wetter();
 const g=ctx.createLinearGradient(0,hz,0,H);
 g.addColorStop(0,mix3('#5DB7E0','#5E8CA8','#1D3E66',w.schnee,w.nacht));g.addColorStop(1,mix3('#0B3A5E','#14324A','#040B18',w.schnee,w.nacht));
 ctx.fillStyle=g;ctx.fillRect(0,hz,W,H-hz);
 /* Wellenlinien mit Perspektive, sie ziehen langsam heran */
 ctx.strokeStyle='rgba(255,255,255,'+(0.28-0.12*w.nacht)+')';ctx.lineWidth=1.5;
 const n=14,off=(O.wasser*0.02)%1;
 for(let i=0;i<n;i++){const f=(i+off)/n,y=hz+(H-hz)*f*f,amp=1+f*4;ctx.beginPath();
  for(let x=0;x<=W;x+=10){const yy=y+Math.sin(x*0.04*(1.4-f)+O.time*2+i)*amp;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.globalAlpha=0.3+f*0.7;ctx.stroke();}
 ctx.globalAlpha=1;
}
/* eine Eisscholle; s = Groesse, opt: schmelz 0..1, kipp 0..1, glow, ledge, alpha, seed */
function scholle(x,y,s,opt){
 opt=opt||{};const rx=50*s,ry=16*s,w=wetter();
 ctx.save();ctx.globalAlpha=opt.alpha==null?1:opt.alpha;ctx.translate(x,y);
 if(opt.kipp){ctx.rotate(opt.kipp*0.55);ctx.translate(0,opt.kipp*opt.kipp*18);}
 if(opt.ledge){const gl=ctx.createLinearGradient(0,0,0,O.H-y);gl.addColorStop(0,mix('#CFEAF8','#7F93C9',w.nacht));gl.addColorStop(1,mix('#3E86B8','#1B2850',w.nacht));
  ctx.fillStyle=gl;ctx.beginPath();ctx.moveTo(-rx,4);ctx.lineTo(-rx-8,O.H-y+20);ctx.lineTo(rx+8,O.H-y+20);ctx.lineTo(rx,4);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.5;for(let i=0;i<4;i++){const xx=-rx+12+i*rx*0.6;ctx.beginPath();ctx.moveTo(xx,14);ctx.lineTo(xx+6,60+i*10);ctx.stroke();}}
 else{ctx.fillStyle='rgba(8,35,60,.3)';ctx.beginPath();ctx.ellipse(0,9,rx+5,ry+5,0,0,7);ctx.fill();}
 /* unregelmaessiger Rand */
 const form=(dy,f)=>{ctx.beginPath();for(let i=0;i<=16;i++){const a=i/16*Math.PI*2,r=0.9+0.12*rnd(i%16+(opt.seed||0)*17);
  const px=Math.cos(a)*rx*r*f,py=Math.sin(a)*ry*r*f+dy;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();};
 ctx.fillStyle=mix('#6FB2DC','#3B4F86',w.nacht);form(7,1);ctx.fill();
 ctx.save();if(opt.glow&&!ruhig){ctx.shadowColor=opt.glow;ctx.shadowBlur=20;}
 const gt=ctx.createLinearGradient(0,-ry,0,ry);gt.addColorStop(0,'#FFFFFF');gt.addColorStop(1,mix('#CBE8F8','#9DB0DD',w.nacht));
 ctx.fillStyle=gt;form(0,1);ctx.fill();ctx.restore();
 if(opt.glow){ctx.strokeStyle=opt.glow;ctx.lineWidth=2.5;form(0,1);ctx.stroke();}
 /* Schnee obenauf und Schmelzrisse */
 ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(-rx*0.3,-ry*0.25,rx*0.25,ry*0.22,0,0,7);ctx.fill();
 if(opt.schmelz>0.35){ctx.strokeStyle='rgba(47,110,156,'+(opt.schmelz-0.2)+')';ctx.lineWidth=1.6;ctx.beginPath();
  ctx.moveTo(-rx*0.7,-2);ctx.lineTo(-rx*0.3,3);ctx.lineTo(-rx*0.05,-3);ctx.lineTo(rx*0.3,4);ctx.lineTo(rx*0.65,-1);
  if(opt.schmelz>0.65){ctx.moveTo(-rx*0.05,-3);ctx.lineTo(rx*0.05,-ry*0.8);ctx.moveTo(rx*0.3,4);ctx.lineTo(rx*0.2,ry*0.8);}ctx.stroke();}
 ctx.restore();
}
function fischform(x,y,gross,farbe){
 ctx.save();ctx.translate(x,y);ctx.scale(gross,gross);
 ctx.fillStyle=farbe||'#5B9CC9';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(14,-6);ctx.lineTo(14,6);ctx.closePath();ctx.fill();
 ctx.fillStyle=farbe?'#FFE58A':'#8EC6EA';ctx.beginPath();ctx.ellipse(0,0,10,5.5,0,0,7);ctx.fill();
 ctx.fillStyle='#1B2B3F';ctx.beginPath();ctx.arc(-6,-1,1.3,0,7);ctx.fill();ctx.restore();
}
function fund(item,x,y){
 if(!item)return;const b=Math.sin(O.time*4+x)*1.5;
 if(item==='fische'){fischform(x+18,y-4+b,0.8);fischform(x+26,y+3+b,0.8);fischform(x+10,y+4+b,0.8);}
 else if(item==='gold'){ctx.save();if(!ruhig){ctx.shadowColor='#FFD54A';ctx.shadowBlur=14;}fischform(x+18,y-2+b,1.25,'#F2B705');ctx.restore();
  ctx.fillStyle='#FFFFFF';const f=Math.abs(Math.sin(O.time*5));ctx.globalAlpha=f;ctx.fillRect(x+26,y-14,2,6);ctx.fillRect(x+24,y-12,6,2);ctx.globalAlpha=1;}
 else if(item==='schal'){ctx.save();ctx.translate(x+18,y-2+b);ctx.fillStyle='#E7413C';rund(-12,-4,24,8,4);ctx.fill();ctx.fillRect(4,0,6,14);
  ctx.fillStyle='#FFFFFF';ctx.fillRect(-6,-4,3,8);ctx.fillRect(2,-4,3,8);ctx.fillRect(4,8,6,2);ctx.restore();}
}
function wortschild(cx,y,z,zustand,alpha){
 const bw=100,bh=46,x=clamp(cx-bw/2,4,W-bw-4),farbe=zustand==='richtig'?'#5BD68A':zustand==='falsch'?'#FF6B5E':LANE_COL[z.lane];
 ctx.save();ctx.globalAlpha=alpha==null?1:alpha;
 if(zustand==='hell'&&!ruhig){ctx.shadowColor=farbe;ctx.shadowBlur=16;}
 ctx.fillStyle=zustand==='richtig'?'rgba(18,70,40,.95)':zustand==='falsch'?'rgba(90,24,20,.95)':'rgba(16,21,28,.92)';rund(x,y,bw,bh,10);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle=farbe;rund(x,y,bw,6,3);ctx.fill();
 /* Zeiger zur Scholle */
 ctx.fillStyle=zustand==='richtig'?'rgba(18,70,40,.95)':zustand==='falsch'?'rgba(90,24,20,.95)':'rgba(16,21,28,.92)';ctx.beginPath();ctx.moveTo(cx-7,y+bh-1);ctx.lineTo(cx+7,y+bh-1);ctx.lineTo(cx,y+bh+8);ctx.fill();
 ctx.fillStyle=farbe;ctx.beginPath();ctx.arc(x+4,y+4,9,0,7);ctx.fill();
 ctx.fillStyle='#10151C';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText(zustand==='richtig'?'✓':zustand==='falsch'?'✗':LANE_ZEICHEN[z.lane],x+4,y+4.5);
 ctx.fillStyle='#FFFFFF';
 let fs=16;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';const maxB=bw-12,worte=z.w.en.split(' ');let zeilen;
 for(;;){zeilen=[];let s='';for(const w of worte){const t=s?s+' '+w:w;if(ctx.measureText(t).width>maxB&&s){zeilen.push(s);s=w;}else s=t;}zeilen.push(s);
  if((zeilen.length<=2&&zeilen.every(l=>ctx.measureText(l).width<=maxB))||fs<=10)break;fs--;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';}
 zeilen.slice(0,2).forEach((l,n,a)=>ctx.fillText(l,x+bw/2,y+bh/2+3+(n-(a.length-1)/2)*fs*1.12));
 ctx.restore();
}
function zeitbalken(x,y){
 const f=clamp(O.zeit/O.zeitMax,0,1),b=84,bx=clamp(x-b/2,6,W-b-6),by=y+30;
 ctx.fillStyle='rgba(16,21,28,.55)';rund(bx-3,by-3,b+6,12,6);ctx.fill();
 ctx.fillStyle=f>0.5?'#7FE0D0':f>0.25?'#FFC857':'#FF6B5E';rund(bx,by,Math.max(6,b*f),6,3);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.font='700 9px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 if(f<0.35&&Math.floor(O.time*4)%2===0)ctx.fillText('Die Scholle schmilzt!',x,by+16);
}
function pinguinZeichnen(){
 if(!window.Figuren)return;
 const imWasser=O.phase==='wasser'&&O.mode==='play'||O.mode==='lost';
 const luft=O.phase==='sprung'||O.phase==='rettung'||(O.phase==='jubel'&&O.super);
 const mood=imWasser||O.phase==='kipp'?'scared':(O.phase==='jubel'||amZiel()?'happy':'focus');
 if(imWasser){
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,O.py-30);ctx.clip();
  window.Figuren.pinguin(ctx,O.px,O.py,1.15,{wave:Math.sin(O.time*12),hoch:true,blush:true,mood,scarf:O.shield});ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;for(let i=0;i<2;i++){const r=(O.time*30+i*14)%28+10;ctx.globalAlpha=1-r/38;ctx.beginPath();ctx.ellipse(O.px,O.py-30,r,r*0.3,0,0,7);ctx.stroke();}ctx.globalAlpha=1;
  return;
 }
 if(!luft){ctx.fillStyle='rgba(20,50,80,.25)';ctx.beginPath();ctx.ellipse(O.px,O.py+1,15,4,0,0,7);ctx.fill();}
 if(luft&&leuchtet()&&!ruhig){ctx.fillStyle='rgba(255,224,138,.8)';for(let i=0;i<5;i++){const a=O.time*12+i;ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(O.px+Math.cos(a)*16,O.py-24+Math.sin(a)*16,2,0,7);ctx.fill();}ctx.globalAlpha=1;}
 const wipp=O.phase==='wahl'?Math.sin(O.time*3)*1.2:0;
 window.Figuren.pinguin(ctx,O.px,O.py,1.15,{hop:Math.max(0,wipp),wave:luft?1:Math.sin(O.time*2)*0.3,hoch:luft&&O.phase!=='jubel'||amZiel(),blush:true,rot:O.rot,mood,scarf:O.shield});
}
function schneefall(H){
 const s=wetter().schnee;if(s<=0)return;const n=Math.round((ruhig?20:70)*s);
 ctx.fillStyle='#FFFFFF';
 for(let i=0;i<n;i++){const sp=30+rnd(i+3)*50,x=((rnd(i)*W+Math.sin(O.time*0.8+i)*14-O.time*12)%W+W)%W,y=((rnd(i+2)*H+O.time*sp)%H+H)%H;
  ctx.globalAlpha=0.5+0.5*rnd(i+5);ctx.beginPath();ctx.arc(x,y,1+rnd(i+9)*1.8,0,7);ctx.fill();}
 ctx.globalAlpha=1;
}
function hud(H){
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#9FD3F2');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 ctx.fillStyle='#FFFFFF';ctx.fillRect(lx+lb*(1-FINALE/GOAL),ly-2,2,12);
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='rgba(16,21,28,.6)';rund(2,ly-5,lx-12,18,9);ctx.fill();rund(lx+lb+10,ly-5,W-lx-lb-12,18,9);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.fillText('PINGUIN',(lx-10)/2+2,ly+4);ctx.fillText('EISBERG',(W+lx+lb+10)/2-1,ly+4);
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,30,66,18,9);ctx.fill();
 ctx.fillStyle=leuchtet()?'#FFE08A':'#FFFFFF';ctx.textAlign='center';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(2).replace(/0$/,'').replace('.',','),W-41,39.5);
 if(O.streak>=2){ctx.fillStyle='rgba(16,21,28,.6)';rund(8,30,92,18,9);ctx.fill();ctx.fillStyle=leuchtet()?'#FFE08A':'#FFFFFF';ctx.textAlign='left';ctx.fillText('Serie '+O.streak+(O.streak%5===4?' · Super!':''),16,39.5);}
}
function zeichne(cv,breite,hoehe){
 if(!cv||!cv.getContext)return;ctx=cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=breite||cv.clientWidth,ch=hoehe||cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const sk=cw/W,H=ch/sk;
 if(Math.abs(H-O.H)>1){O.H=H;if(O.phase==='wahl'||O.phase==='ankunft')O.py=yBase();}
 ctx.setTransform(dpr*sk,0,0,dpr*sk,0,0);ctx.globalAlpha=1;
 const hz=horizont(),yb=yBase(),fin=finale(),p=O.phase,spielt=O.mode==='play'||O.mode==='pause';
 himmel(H,hz);meer(H,hz);
 const glow=leuchtet()?'#FFE08A':null;
 /* Uebergang: alles rueckt eine Reihe nach unten */
 if(p==='weiter'&&O.alt&&spielt){
  const e=ease(Math.min(1,O.pt/D.weiter)),a=O.alt,off=DY()*e;
  scholle(a.basis,yb+off,1.08,{alpha:1-e,ledge:a.ledge,seed:O.k+5});
  for(const x of a.rest)scholle(x,yTop()+off,1,{alpha:1-e*0.8,ledge:a.ledge,seed:x});
  O.ziele.forEach((z,i)=>{const y=zielY(i)-DY()*(1-e);scholle(zielX(i),y,1,{alpha:e,glow,ledge:fin,seed:O.k*3+i});fund(z.item,zielX(i),y);});
  scholle(a.x,lerp(a.y0,yb,e),lerp(1,1.08,e),{ledge:a.ledge&&fin,seed:O.k+4});
  O.ziele.forEach((z,i)=>wortschild(zielX(i),zielY(i)-DY()*(1-e)-66,z,'normal',e));
 }else if(amZiel()){
  scholle(W/2,yTop(),1.2,{ledge:true,seed:99});
 }else if(O.mode!=='aus'||O.ziele.length){
  /* Zielschollen */
  O.ziele.forEach((z,i)=>{
   const kipp=p==='kipp'&&O.kipp===i?Math.min(1,O.pt/D.kipp):(O.kipp===i&&(p==='wasser'||p==='rettung'||O.mode==='lost')?1:0);
   const weg=kipp>=1;const richtig=z.w===O.q,zeigeLoesung=O.ergebnis&&O.ergebnis!=='richtig';
   if(!weg)scholle(zielX(i),zielY(i),1,{kipp,glow:zeigeLoesung&&richtig?'#5BD68A':glow,ledge:fin,seed:O.k*3+i});
   if(!weg&&!(kipp>0))fund(z.item,zielX(i),zielY(i));
  });
  /* eigene Scholle, schmilzt */
  const f=p==='wahl'?1-O.zeit/O.zeitMax:0,zeit=O.ergebnis==='zeit';
  const kb=zeit&&p==='kipp'?Math.min(1,O.pt/D.kipp):0;
  if(!(zeit&&(p==='wasser'||p==='rettung'||O.mode==='lost'))){
   const wack=f>0.75&&!ruhig?Math.sin(O.time*40)*1.4:0;
   scholle(O.basis.x+wack,yb,1.08*(1-0.35*f)*(1-kb*0.5),{schmelz:f,ledge:fin&&O.k>GOAL-FINALE,alpha:1-kb*0.7,seed:O.k+4});
  }
  /* Schilder */
  O.ziele.forEach((z,i)=>{
   if(O.kipp===i&&(p==='wasser'||p==='rettung'))return;
   let zust='normal',a=1;const richtig=z.w===O.q;
   if(p==='ankunft')a=Math.min(1,O.pt/D.ankunft);
   if(O.ergebnis==='richtig'){if(i!==O.wahl)a=0.25;else zust='richtig';}
   else if(O.ergebnis){zust=richtig?'richtig':(i===O.kipp?'falsch':'normal');if(zust==='normal')a=0.3;}
   else if(p==='sprung'){if(i===O.wahl)zust='hell';else a=0.55;}
   else if(O.vorwahl===i)zust='hell';
   /* steht der Pinguin auf der Scholle (oder springt hin), rueckt ihr Schild nach oben */
   const drauf=(i===O.wahl&&(p==='sprung'||p==='jubel'||p==='kipp'))||(p==='rettung'&&richtig);
   let hoch=0;if(drauf){const t=Math.min(1,O.pt/(p==='jubel'&&O.super?D.superJubel:D[p]));
    hoch=p==='sprung'||p==='rettung'?ease(t)*42+Math.sin(t*Math.PI)*O.spr.h:42+(p==='jubel'&&O.super?Math.sin(t*Math.PI)*90:0);}
   wortschild(zielX(i),zielY(i)-66-hoch,z,zust,a);
  });
  if(p==='wahl'&&spielt)zeitbalken(O.basis.x,yb);
 }
 if(!O.weg)pinguinZeichnen();
 if(O.weg){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2.5;for(let i=0;i<3;i++){const r=(O.anim*60+i*18)%60+8;ctx.globalAlpha=Math.max(0,1-r/68);ctx.beginPath();ctx.ellipse(O.px,yBase()+14,r,r*0.3,0,0,7);ctx.stroke();}ctx.globalAlpha=1;}
 if(amZiel()){ctx.strokeStyle='#5D4632';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2+34,yTop());ctx.lineTo(W/2+34,yTop()-70);ctx.stroke();
  ctx.fillStyle='#E7413C';ctx.beginPath();ctx.moveTo(W/2+35,yTop()-70);ctx.lineTo(W/2+35+30+Math.sin(O.time*8)*3,yTop()-60);ctx.lineTo(W/2+35,yTop()-50);ctx.fill();}
 for(const q of O.parts){ctx.globalAlpha=Math.max(0,q.life);ctx.fillStyle=q.farbe;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 schneefall(H);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 18px Inter, system-ui, sans-serif';
 O.pops.forEach((q,n)=>{const a=Math.max(0,1-q.t/1.3),y=yTop()-150-n*24-q.t*26;ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.85)';ctx.lineWidth=4;ctx.strokeText(q.text,W/2,y);ctx.fillStyle=q.farbe;ctx.fillText(q.text,W/2,y);});
 ctx.globalAlpha=1;
 if(fin&&p==='ankunft'||(fin&&O.k===GOAL-FINALE&&p==='weiter')){ctx.globalAlpha=0.9;ctx.fillStyle='rgba(16,21,28,.8)';rund(W/2-110,56,220,28,14);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.font='800 13px Inter, system-ui, sans-serif';ctx.fillText('Finale: rauf auf den Eisberg!',W/2,70.5);ctx.globalAlpha=1;}
 hud(H);
}
/* Tippen: die naechstgelegene Scholle im oberen Bereich */
function tipp(cv,clientX,clientY){
 const r=cv.getBoundingClientRect(),gx=(clientX-r.left)/r.width*W,gy=(clientY-r.top)/r.width*W;
 if(gy>yBase()-40||gy<yTop()-130)return false;
 let best=0,bd=1e9;for(let i=0;i<3;i++){const d=Math.abs(gx-zielX(i));if(d<bd){bd=d;best=i;}}
 return lane(best);
}

/* nach Karte und Stempel: der Pinguin springt vom Eisberg (morph.js uebernimmt danach) */
function tauchen(){O.mode='tauchen';O.anim=0;O.weg=false;O.tx0=W/2;O.ty0=yTop();O.rot=0;O.pops=[];}
window.BWPinguin={O,start,tauchen,update,zeichne,lane,sprung,tipp,zielX,zielY,yBase,yTop,wetter,finale,zeitFuer,richtigIdx,GOAL,HEARTS,FINALE,D,mult,LANE_COL,LANE_ZEICHEN,
 ding:'Scholle',hinweis:'Tippe auf die Scholle mit dem richtigen Wort – bevor deine Scholle schmilzt! | Tastatur: 1 2 3 · P = Pause',
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
