/* =========================================================================
   ZEBRA DASH - Kapitel 4 von Black & White (Year 6, Unit 2)
   Das Zebra galoppiert, von hinten gesehen, in die Tiefe der Savanne.
   Drei Pfade nebeneinander; man tippt auf das Wort (bzw. die Bildseite),
   wischt, oder nimmt 1 2 3 / Pfeiltasten.

   An jeder Vokabel stehen drei Akazien-Tore mit englischen Schildern quer
   ueber den Pfaden. Die Schilder warten lesbar in einer Reihe ueber dem
   Horizont und sinken mit den Toren heran; darueber die deutsche Vokabel.
   Vor den Toren ist die Strecke frei (Mindestlesezeit).
   - richtiges Tor: Schwung, Punkte, und nach jeder vierten richtigen Antwort
     in Folge waechst der Abstand zum Loewen wieder.
   - falsches Tor: der Loewe setzt zum Sprung an, das Zebra stolpert, und er
     kommt naeher (ein Herz). Der Loewe ist immer unten links zu sehen, nur
     Kopf und Schultern; je naeher, desto groesser.
   Unterwegs: Grasbueschel (Punkte), Baumstaemme (das Zebra springt drueber,
   Bonus), Dornbuesche und Termitenhuegel (stolpern, Serie weg, kein Herz).
   Ziel: Sprung ueber eine Schlucht - der Loewe bleibt bruellend zurueck -,
   dann die Herde am Wasserloch.

   Die Logik (start, update, lane, tipp, wisch) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
const W=360,GOAL=16,HEARTS=3,MINREAD=3.2,Z0=4,LW=108,ZK=0.8,FERN=70;
const ANGRIFF=1.15,SPRUNG=0.6,SCHLUCHT_T=1.3,SCHLUCHT_B=4,ZIEL_T=3.4;   // Sekunden bzw. Schluchtbreite
const LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['◀','●','▶'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const weich=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

const O={mode:'aus',intro:false,H:600,k:0,hearts:HEARTS,score:0,streak:0,best:0,dist:0,lane:1,ziel:1,lauf:0,stolpern:0,schwung:0,
 time:0,items:[],gate:null,deko:[],pops:[],parts:[],q:null,queue:[],pool:[],missed:new Map(),gras:0,jumps:0,onEnd:null,onFrage:null,
 anim:0,frageT:0,laneDown:1,gebruell:0,loeweSeite:1,angriff:0,sprung:0,spruenge:0,schlucht:0};

/* Perspektive: Horizont, Boden beim Zebra, Groesse nach Entfernung */
const HZ=()=>O.H*0.33,YZ=()=>O.H*0.9;
const sk=z=>Z0/Math.max(0.6,z);
const yAus=z=>HZ()+(YZ()-HZ())*sk(z);
const xAus=(lane,z)=>W/2+(lane-1)*LW*sk(z);
const tempo=()=>1+0.05*Math.min(O.streak,10);
const grundTempo=()=>(13+0.15*O.k)*tempo();
const speed=()=>grundTempo()*(O.stolpern>0?0.45:1)*(1+0.35*O.schwung);
const mult=()=>tempo()*(O.hearts>=3?1.2:1);
const ruheStrecke=()=>grundTempo()*MINREAD+6;

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',intro:false,H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,dist:0,lane:1,ziel:1,lauf:0,stolpern:0,schwung:0,
  time:0,items:[],gate:null,deko:[],pops:[],parts:[],missed:new Map(),gras:0,jumps:0,anim:0,gebruell:0,angriff:0,sprung:0,spruenge:0,schlucht:0,laneDown:1,
  onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 for(let d=0;d<FERN+10;d+=7)dekoAn(d);
 abschnitt(Z0+12);
}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
/* Baeume und Bueschel am Rand */
function dekoAn(d){O.deko.push({d,seite:Math.random()<0.5?-1:1,typ:Math.random()<0.35?'akazie':'busch',weit:1.9+Math.random()*1.6,n:Math.random()*99});}
function abschnitt(d0){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 const opts=mische([O.q,...falsche(O.q)]).map((w,i)=>({w,lane:i}));
 const ruhe=ruheStrecke(),action=Math.max(26,grundTempo()*2.6),G=d0+action+ruhe;
 /* Gras in Reihen, ein, zwei Hindernisse - nur im vorderen Teil */
 for(let n=0;n<2;n++){const l=Math.floor(Math.random()*3),d=d0+4+(action-14)*n/2;for(let i=0;i<3;i++)O.items.push({typ:'gras',d:d+i*2.2,lane:l});}
 if(O.k>0){const n=O.k<5?1:2;for(let i=0;i<n;i++)O.items.push({typ:Math.random()<0.5?'dornbusch':'termiten',d:d0+8+(action-14)*(i+0.5)/n,lane:Math.floor(Math.random()*3)});
  /* ein Baumstamm zum Drueberspringen, nicht auf dem Pfad eines Hindernisses */
  const frei=[0,1,2].filter(l=>!O.items.some(it=>it.typ!=='gras'&&it.lane===l&&Math.abs(it.d-(d0+action*0.5))<6));
  O.items.push({typ:'stamm',d:d0+action*0.5,lane:frei[Math.floor(Math.random()*frei.length)]??1});}
 O.gate={d:G,opts,ergebnis:null,wahl:-1};
 O.frageT=O.time;
 if(O.onFrage)O.onFrage(O.q,opts);
}
function pop(text,farbe){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(art==='blatt'?80:art==='staub'?20:0),life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt',rot:Math.random()*6,vr:(Math.random()-0.5)*10});}
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}
const zebraX=()=>xAus(O.lane,Z0);
/* Sprunghoehe 0..1 (Bogen) */
const sprungHoehe=()=>{if(O.sprung<=0)return 0;const d=O.mode==='ziel'?SPRUNG*1.4:SPRUNG;return Math.sin((1-O.sprung/d)*Math.PI)*(O.mode==='ziel'?1.3:1);};

/* --------------------------------------------------------------- Steuerung */
function lane(i){if(O.mode!=='play')return false;O.ziel=clamp(i|0,0,2);return true;}
function schritt(d){if(O.mode!=='play')return;O.ziel=clamp(O.ziel+(d>0?1:-1),0,2);}
function punkt(cv,cx,cy){const r=cv.getBoundingClientRect();return {x:(cx-r.left)/r.width*W,y:(cy-r.top)/r.width*W};}
/* Tippen: linke, mittlere, rechte Bildseite */
function tipp(cv,cx,cy){if(O.mode!=='play')return;O.laneDown=O.ziel;const p=punkt(cv,cx,cy);
 /* direkt auf ein Wortschild getippt? sonst die Bildseite (die Schilder stehen in denselben Spalten) */
 const r=O.gate&&!O.gate.ergebnis?reiheY(O.gate):null;
 if(r!=null&&p.y>r-10&&p.y<r+50){for(let i=0;i<3;i++){const x=W/2+(i-1)*116;if(Math.abs(p.x-x)<58){O.ziel=i;return;}}}
 O.ziel=p.x<W/3?0:p.x>W*2/3?2:1;}
/* Wischen: ein Pfad nach links oder rechts */
function wisch(cv,x0,x1){if(O.mode!=='play'||!cv)return;const r=cv.getBoundingClientRect(),dx=(x1-x0)/r.width*W;if(Math.abs(dx)<26)return;O.ziel=clamp(O.laneDown+(dx>0?1:-1),0,2);}

/* ------------------------------------------------------------- Auswertung */
function tor(){
 const g=O.gate,l=Math.round(O.lane),opt=g.opts.find(o=>o.lane===l);g.wahl=l;
 if(opt.w===O.q){
  g.ergebnis='richtig';O.streak++;O.best=Math.max(O.best,O.streak);O.schwung=1;
  const p=Math.round(10*mult());O.score+=p;pop('+'+p+' · Schwung!','#FFE08A');
  teilchen(zebraX(),YZ()-120,26,['#8BC34A','#C5E1A5','#FFE08A','#FFFFFF'],220,'blatt');sfx('richtig');
  if(O.streak%4===0&&O.hearts<HEARTS){O.hearts++;pop('Abstand zum Löwen gewachsen!','#B6FFCF');sfx('abstand');}
 }else{
  g.ergebnis='falsch';const q=O.q;O.missed.set(q.en,q);if(!O.queue.includes(q))O.queue.splice(Math.min(2,O.queue.length),0,q);
  O.streak=0;O.hearts--;O.stolpern=1;O.gebruell=1.4;O.angriff=ANGRIFF;pop('Falsches Tor – der Löwe holt auf!','#FF9A8A');sfx('stolpern');sfx('bruell');musik(M=>M.fehler());
  teilchen(zebraX(),YZ()-6,20,['#D9B26A','#F2DFB0'],140,'staub');
  if(O.hearts<=0){O.mode='lost';O.anim=0;O.angriff=0;musik(M=>M.ende());}
 }
}
function weiter(){
 O.k++;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;O.gate=null;O.schlucht=O.dist+Z0+7;O.ueberSchlucht=false;O.items=[];musik(M=>M.ziel());sfx('ziel');return;}
 abschnitt(O.dist+Z0+10);
}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.4);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.art==='blatt'?240:p.art==='staub'?-10:60)*dt;p.vx*=0.98;p.rot+=p.vr*dt;p.life-=dt*(p.art==='staub'?1.5:1);}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.gebruell>0)O.gebruell-=dt;
 if(O.angriff>0)O.angriff=Math.max(0,O.angriff-dt);
 /* der Loewe laeuft auf der anderen Seite, wenn das Zebra links ist (verdeckt es sonst) */
 {const z=O.lane<0.6?-1:1;O.loeweSeite+=(z-O.loeweSeite)*Math.min(1,dt*4);}
 if(O.sprung>0)O.sprung=Math.max(0,O.sprung-dt);
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;const v=O.mode==='ziel'?grundTempo()*(O.anim<SCHLUCHT_T?0.75:Math.max(0.15,1-(O.anim-SCHLUCHT_T)/1.8)):grundTempo()*Math.max(0,0.5-O.anim);
  O.dist+=v*dt;O.lauf+=dt*v*0.75;O.lane+=(1-O.lane)*Math.min(1,dt*3);
  if(O.mode==='ziel'){const z=O.schlucht-O.dist;if(z<Z0+1.2&&z>Z0-SCHLUCHT_B&&O.sprung<=0&&!O.ueberSchlucht){O.sprung=SPRUNG*1.4;O.ueberSchlucht=true;sfx('sprung');sfx('bruell');O.gebruell=1.2;}}
  if(O.anim>=(O.mode==='ziel'?ZIEL_T:1.6)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 musik(M=>{M.tempo(tempo());M.turbo(O.streak>=5);});
 if(O.stolpern>0)O.stolpern=Math.max(0,O.stolpern-dt);
 if(O.schwung>0)O.schwung=Math.max(0,O.schwung-dt*1.4);
 O.lane+=(O.ziel-O.lane)*Math.min(1,dt*9);
 const v=speed();O.dist+=v*dt;O.lauf+=dt*v*0.75;
 if(Math.random()<dt*10)teilchen(zebraX()+(Math.random()-0.5)*30,YZ()-2,1,['rgba(217,178,106,.8)'],30,'staub');
 /* Dinge auf dem Pfad */
 const l=Math.round(O.lane),nah=Math.abs(O.lane-l)<0.35;
 for(const it of O.items){
  if(it.weg)continue;const z=it.d-O.dist;if(z>Z0+0.6||z<Z0-1.2)continue;
  if(!nah||it.lane!==l)continue;
  if(it.typ==='gras'){it.weg=true;O.gras++;const p=Math.round(2*mult());O.score+=p;teilchen(zebraX(),YZ()-30,5,['#8BC34A','#FFFFFF'],70);sfx('gras');}
  else if(it.typ==='stamm'){if(!it.gesprungen){it.gesprungen=true;O.sprung=SPRUNG;O.spruenge++;O.jumps++;const p=Math.round(3*mult());O.score+=p;pop('Sprung! +'+p,'#FFE08A');teilchen(zebraX(),YZ()-4,12,['#D9B26A','#F2DFB0'],110,'staub');sfx('sprung');}}
  else if(O.stolpern<=0&&O.sprung<=0){it.weg=true;O.stolpern=0.8;O.streak=0;pop(it.typ==='dornbusch'?'Autsch, Dornen!':'Termitenhügel!','#E8D5B0');teilchen(zebraX(),YZ()-10,16,it.typ==='dornbusch'?['#6E8F3A','#C8453A','#D7CCC8']:['#B0703A','#D7CCC8'],130,'staub');sfx('stein');}
 }
 O.items=O.items.filter(it=>it.d-O.dist>-2);
 /* Deko am Rand nachschieben */
 O.deko=O.deko.filter(d=>d.d-O.dist>0.8);
 while(!O.deko.length||O.deko[O.deko.length-1].d-O.dist<FERN)dekoAn((O.deko.length?O.deko[O.deko.length-1].d:O.dist)+5+Math.random()*6);
 /* Tore */
 const g=O.gate;
 if(g&&!g.ergebnis&&g.d-O.dist<=Z0){tor();if(O.mode!=='play')return;}
 if(g&&g.ergebnis&&g.d-O.dist<Z0-2.5){O.gate=null;weiter();}
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
 richtig:t=>{[659,880,1175].forEach((f,i)=>ton(t+i*0.05,f,f,0.2,'triangle',0.16));zisch(t,2000,6000,0.25,0.15,0.8);},
 stolpern:t=>{ton(t,300,120,0.25,'triangle',0.2);zisch(t,1200,300,0.3,0.3,1);},
 bruell:t=>{zisch(t,300,90,0.9,0.35,0.6);ton(t,95,60,0.8,'sawtooth',0.12);ton(t+0.05,140,70,0.7,'sawtooth',0.08);},
 sprung:t=>{zisch(t,500,2600,0.25,0.2,0.8);ton(t,330,660,0.18,'triangle',0.12);},
 abstand:t=>{[523,784,1047].forEach((f,i)=>ton(t+i*0.06,f,f,0.25,'triangle',0.15));},
 gras:t=>{ton(t,700,1100,0.07,'triangle',0.1);},
 stein:t=>{ton(t,160,70,0.2,'square',0.12);zisch(t,1200,300,0.15,0.25,1);},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.15));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
function himmel(H){
 const hz=HZ(),g=ctx.createLinearGradient(0,0,0,hz);g.addColorStop(0,'#F7A65C');g.addColorStop(0.55,'#FBCB82');g.addColorStop(1,'#FDE7B5');ctx.fillStyle=g;ctx.fillRect(0,0,W,hz+2);
 /* grosse Sonne */
 const sx=W*0.68,sy=hz*0.62,sg=ctx.createRadialGradient(sx,sy,10,sx,sy,90);sg.addColorStop(0,'rgba(255,240,200,1)');sg.addColorStop(0.3,'rgba(255,214,140,.85)');sg.addColorStop(1,'rgba(255,214,140,0)');
 ctx.fillStyle=sg;ctx.fillRect(0,0,W,hz);ctx.fillStyle='#FFF1C9';ctx.beginPath();ctx.arc(sx,sy,30,0,7);ctx.fill();
 /* Kilimandscharo */
 ctx.fillStyle='#C98F6B';ctx.beginPath();ctx.moveTo(30,hz+2);ctx.quadraticCurveTo(110,hz-62,150,hz-70);ctx.lineTo(186,hz-70);ctx.quadraticCurveTo(230,hz-60,320,hz+2);ctx.fill();
 ctx.fillStyle='#FFF6EA';ctx.beginPath();ctx.moveTo(140,hz-66);ctx.quadraticCurveTo(150,hz-71,168,hz-71);ctx.lineTo(192,hz-69);ctx.quadraticCurveTo(200,hz-60,190,hz-58);ctx.lineTo(178,hz-63);ctx.lineTo(166,hz-56);ctx.lineTo(152,hz-60);ctx.closePath();ctx.fill();
 /* ferne Akazien am Horizont */
 ctx.fillStyle='#8A6A4A';for(let i=0;i<7;i++){const x=((rnd(i)*W+W)-O.dist*0.15*(i%2?1:-1)%W+W*2)%W,s=0.5+rnd(i+4)*0.5;ctx.fillRect(x-1,hz-12*s,2,12*s);ctx.beginPath();ctx.ellipse(x,hz-12*s,14*s,4*s,0,0,7);ctx.fill();}
 /* Voegel */
 ctx.strokeStyle='rgba(90,60,40,.7)';ctx.lineWidth=1.4;for(let i=0;i<3;i++){const x=(40+i*30+O.time*12)%(W+40)-20,y=hz*0.35+i*8,f=Math.sin(O.time*6+i)*3;ctx.beginPath();ctx.moveTo(x-6,y-f);ctx.quadraticCurveTo(x-3,y-3,x,y);ctx.quadraticCurveTo(x+3,y-3,x+6,y-f);ctx.stroke();}
}
function boden(H){
 const hz=HZ(),g=ctx.createLinearGradient(0,hz,0,H);g.addColorStop(0,'#D9B26A');g.addColorStop(1,'#B98F47');ctx.fillStyle=g;ctx.fillRect(0,hz,W,H-hz);
 /* Streifen quer, die heranziehen: Tempo */
 for(let n=0;n<16;n++){const d0=Math.floor(O.dist/6)*6+n*6,z1=d0-O.dist,z2=z1+3;if(z1<0.7)continue;const y1=yAus(z1),y2=yAus(z2);ctx.fillStyle='rgba(255,236,180,.12)';ctx.fillRect(0,y2,W,y1-y2);}
 /* drei Pfade */
 for(let i=0;i<3;i++){const zN=0.9,zF=FERN;ctx.fillStyle='rgba(232,208,150,.75)';ctx.beginPath();
  ctx.moveTo(xAus(i,zF)-LW*0.36*sk(zF),yAus(zF));ctx.lineTo(xAus(i,zF)+LW*0.36*sk(zF),yAus(zF));ctx.lineTo(xAus(i,zN)+LW*0.36*sk(zN),yAus(zN));ctx.lineTo(xAus(i,zN)-LW*0.36*sk(zN),yAus(zN));ctx.closePath();ctx.fill();}
 /* Grasstriche am Boden */
 ctx.strokeStyle='rgba(120,140,60,.5)';ctx.lineWidth=1.2;
 for(let n=0;n<40;n++){const d=Math.floor(O.dist/2)*2+n*2+rnd(n+Math.floor(O.dist/2))*2,z=d-O.dist;if(z<0.9)continue;const s=sk(z),x=W/2+(rnd(Math.floor(d)*3.1)-0.5)*W*1.8*s*1.4,y=yAus(z);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2*s*3,y-6*s*3);ctx.moveTo(x,y);ctx.lineTo(x+2*s*3,y-7*s*3);ctx.stroke();}
}
function akazie(x,y,s,n){
 ctx.fillStyle='#6B4A2E';ctx.beginPath();ctx.moveTo(x-3*s,y);ctx.lineTo(x-1.5*s,y-40*s);ctx.lineTo(x+1.5*s,y-40*s);ctx.lineTo(x+3*s,y);ctx.fill();
 ctx.strokeStyle='#6B4A2E';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(x,y-30*s);ctx.lineTo(x-12*s,y-46*s);ctx.moveTo(x,y-34*s);ctx.lineTo(x+14*s,y-48*s);ctx.stroke();
 const g=ctx.createLinearGradient(0,y-62*s,0,y-40*s);g.addColorStop(0,'#7FA34A');g.addColorStop(1,'#56762F');ctx.fillStyle=g;
 ctx.beginPath();ctx.ellipse(x,y-50*s,36*s,10*s,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x-14*s,y-55*s,18*s,7*s,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+16*s,y-54*s,16*s,6*s,0,0,7);ctx.fill();
}
function busch(x,y,s){ctx.fillStyle='#7C8F3E';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.ellipse(x+i*8*s,y-6*s-Math.abs(i)*-2*s,10*s,8*s,0,0,7);ctx.fill();}}
function dekoZeichnen(d){const z=d.d-O.dist;if(z<0.8||z>FERN)return;const s=sk(z),x=W/2+d.seite*LW*d.weit*s*1.0,y=yAus(z);
 ctx.globalAlpha=Math.min(1,(FERN-z)/10);if(d.typ==='akazie')akazie(x,y,s*1.6,d.n);else busch(x,y,s*1.4);ctx.globalAlpha=1;}
function itemZeichnen(it){
 const z=it.d-O.dist;if(it.weg||z<0.8||z>FERN)return;const s=sk(z),x=xAus(it.lane,z),y=yAus(z);
 if(it.typ==='gras'){ctx.strokeStyle='#C6D86A';ctx.lineWidth=2.4*s;ctx.lineCap='round';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x+i*3*s,y);ctx.quadraticCurveTo(x+i*5*s,y-10*s,x+i*8*s,y-18*s-Math.abs(i)*-2*s);ctx.stroke();}
  ctx.fillStyle='#FFE08A';ctx.beginPath();ctx.arc(x,y-20*s,2.6*s,0,7);ctx.fill();}
 else if(it.typ==='stamm')stamm(x,y,s*0.95);
 else if(it.typ==='dornbusch')dornbusch(x,y,s*0.95);
 else termiten(x,y,s*0.95);
}
const oval=(x,y,rx,ry,r)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,r||0,0,Math.PI*2);};
/* umgestuerzter Baumstamm quer ueber dem Pfad: das Zebra springt drueber */
function stamm(x,y,s){
 const b=46*s,h=13*s;
 ctx.fillStyle='rgba(60,40,10,.25)';oval(x,y+1*s,b*1.05,4*s);ctx.fill();
 const v=ctx.createLinearGradient(0,y-h*2,0,y);v.addColorStop(0,'#9C6B40');v.addColorStop(0.45,'#7A4E2A');v.addColorStop(1,'#4E321B');
 ctx.fillStyle=v;ctx.beginPath();ctx.moveTo(x-b,y-h*1.9);ctx.lineTo(x+b,y-h*1.9);ctx.quadraticCurveTo(x+b+h*0.5,y-h,x+b,y);ctx.lineTo(x-b,y);ctx.quadraticCurveTo(x-b-h*0.5,y-h,x-b,y-h*1.9);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(40,24,10,.5)';ctx.lineWidth=1.2*s;ctx.lineCap='round';
 for(let i=0;i<7;i++){const xx=x-b*0.8+i*b*0.27;ctx.beginPath();ctx.moveTo(xx,y-h*1.7);ctx.quadraticCurveTo(xx+3*s,y-h,xx-1*s,y-h*0.25);ctx.stroke();}
 ctx.strokeStyle='rgba(255,220,170,.25)';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(x-b*0.9,y-h*1.6);ctx.lineTo(x+b*0.9,y-h*1.6);ctx.stroke();
 ctx.fillStyle='#E2B97E';oval(x+b,y-h*0.95,h*0.55,h*0.95);ctx.fill();
 ctx.strokeStyle='rgba(120,80,40,.6)';ctx.lineWidth=0.9*s;for(const r of [0.3,0.55,0.8]){oval(x+b,y-h*0.95,h*0.55*r,h*0.95*r);ctx.stroke();}
 ctx.strokeStyle='#5E3D22';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(x-b*0.4,y-h*1.8);ctx.lineTo(x-b*0.55,y-h*3.1);ctx.stroke();
 ctx.fillStyle='#6E8F3A';oval(x-b*0.58,y-h*3.3,7*s,4*s,-0.3);ctx.fill();oval(x-b*0.45,y-h*3.4,5*s,3*s,0.4);ctx.fill();
}
/* Dornenbusch: ausweichen */
function dornbusch(x,y,s){
 ctx.fillStyle='rgba(60,40,10,.25)';oval(x,y+1*s,26*s,4*s);ctx.fill();
 ctx.strokeStyle='#4A3520';ctx.lineWidth=2*s;ctx.lineCap='round';
 for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(x+i*2*s,y);ctx.quadraticCurveTo(x+i*7*s,y-14*s,x+i*9*s,y-26*s+Math.abs(i)*3*s);ctx.stroke();}
 const v=ctx.createLinearGradient(0,y-34*s,0,y);v.addColorStop(0,'#7C9A3E');v.addColorStop(1,'#4C6826');ctx.fillStyle=v;
 for(const [dx,dy,r] of [[-14,-14,11],[0,-22,13],[14,-15,11],[-7,-7,9],[8,-7,9]]){oval(x+dx*s,y+dy*s,r*s,r*0.8*s);ctx.fill();}
 ctx.strokeStyle='#F4ECD8';ctx.lineWidth=1.1*s;
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=(14+((i*7)%5))*s,px=x+Math.cos(a)*r*1.1,py=y-15*s+Math.sin(a)*r*0.75;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(a)*5*s,py+Math.sin(a)*5*s);ctx.stroke();}
 ctx.fillStyle='#C8453A';for(const [dx,dy] of [[-10,-18],[6,-26],[12,-10],[-2,-10]]){oval(x+dx*s,y+dy*s,1.8*s,1.8*s);ctx.fill();}
}
/* Termitenhuegel: ausweichen */
function termiten(x,y,s){
 ctx.fillStyle='rgba(60,40,10,.25)';oval(x,y+1*s,22*s,4*s);ctx.fill();
 const v=ctx.createLinearGradient(x-20*s,0,x+20*s,0);v.addColorStop(0,'#C27A45');v.addColorStop(0.6,'#A9622F');v.addColorStop(1,'#7E4620');ctx.fillStyle=v;
 ctx.beginPath();ctx.moveTo(x-20*s,y);ctx.quadraticCurveTo(x-17*s,y-20*s,x-10*s,y-30*s);ctx.quadraticCurveTo(x-8*s,y-52*s,x-3*s,y-60*s);ctx.quadraticCurveTo(x+1*s,y-52*s,x+2*s,y-40*s);
 ctx.quadraticCurveTo(x+6*s,y-46*s,x+9*s,y-44*s);ctx.quadraticCurveTo(x+12*s,y-28*s,x+16*s,y-16*s);ctx.quadraticCurveTo(x+20*s,y-8*s,x+21*s,y);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(80,40,15,.4)';ctx.lineWidth=1*s;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x-14*s+i*6*s,y-4*s);ctx.lineTo(x-12*s+i*5*s,y-20*s-i*3*s);ctx.stroke();}
 ctx.fillStyle='rgba(255,230,190,.25)';ctx.fillRect(x-6*s,y-50*s,2.5*s,36*s);
}
/* Akazien-Tor ueber einem Pfad */
function torZeichnen(g,i){
 const z=g.d-O.dist;if(z<0.8||z>FERN)return;const s=sk(z),x=xAus(i,z),y=yAus(z),b=LW*0.42*s,h=150*s;
 const durch=g.ergebnis&&g.wahl===i;
 ctx.fillStyle='#6B4A2E';for(const dx of [-b,b]){ctx.beginPath();ctx.moveTo(x+dx-4*s,y);ctx.lineTo(x+dx-2.5*s,y-h*0.78);ctx.lineTo(x+dx+2.5*s,y-h*0.78);ctx.lineTo(x+dx+4*s,y);ctx.fill();}
 const gr=ctx.createLinearGradient(0,y-h,0,y-h*0.72);gr.addColorStop(0,'#86AE4F');gr.addColorStop(1,'#56762F');ctx.fillStyle=gr;
 ctx.beginPath();ctx.ellipse(x,y-h*0.84,b*1.55,h*0.1,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x-b*0.6,y-h*0.9,b*0.8,h*0.07,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+b*0.7,y-h*0.89,b*0.7,h*0.065,0,0,7);ctx.fill();
 /* farbige Fahne der Spur */
 ctx.fillStyle=g.ergebnis?(g.opts.find(o=>o.lane===i).w===O.q?'#5BD68A':(durch?'#FF6B5E':LANE_COL[i])):LANE_COL[i];
 ctx.beginPath();ctx.moveTo(x-6*s,y-h*0.76);ctx.lineTo(x+6*s,y-h*0.76);ctx.lineTo(x+6*s,y-h*0.6);ctx.lineTo(x,y-h*0.55);ctx.lineTo(x-6*s,y-h*0.6);ctx.closePath();ctx.fill();
 /* Dornenbuesche zwischen den Toren */
 if(i<2){const xm=(xAus(i,z)+xAus(i+1,z))/2;busch(xm,y,s*1.5);busch(xm,y-6*s,s*1.2);}
}
function wortschild(cx,y,opt,zust,alpha){
 const bw=106,bh=40,x=clamp(cx-bw/2,4,W-bw-4),farbe=zust==='richtig'?'#5BD68A':zust==='falsch'?'#FF6B5E':LANE_COL[opt.lane];
 ctx.save();ctx.globalAlpha=alpha==null?1:alpha;
 if(zust==='hell'&&!ruhig){ctx.shadowColor=farbe;ctx.shadowBlur=14;}
 ctx.fillStyle=zust==='richtig'?'rgba(18,70,40,.95)':zust==='falsch'?'rgba(90,24,20,.95)':'rgba(16,21,28,.92)';rund(x,y,bw,bh,10);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle=farbe;rund(x,y,bw,6,3);ctx.fill();
 ctx.fillStyle=farbe;ctx.beginPath();ctx.arc(x+4,y+4,9,0,7);ctx.fill();
 ctx.fillStyle='#10151C';ctx.font='800 9px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(zust==='richtig'?'✓':zust==='falsch'?'✗':LANE_ZEICHEN[opt.lane],x+4,y+4.5);
 ctx.fillStyle='#FFFFFF';let fs=15;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';const maxB=bw-12,worte=opt.w.en.split(' ');let zeilen;
 for(;;){zeilen=[];let s='';for(const w of worte){const t=s?s+' '+w:w;if(ctx.measureText(t).width>maxB&&s){zeilen.push(s);s=w;}else s=t;}zeilen.push(s);
  if((zeilen.length<=2&&zeilen.every(l=>ctx.measureText(l).width<=maxB))||fs<=9)break;fs--;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';}
 zeilen.slice(0,2).forEach((l,n,a)=>ctx.fillText(l,x+bw/2,y+bh/2+3+(n-(a.length-1)/2)*fs*1.1));
 ctx.restore();
}
/* Reihe der Schilder: wartet ueber dem Horizont und sinkt mit den Toren heran */
function reiheY(g){const z=g.d-O.dist;return Math.max(HZ()-48,yAus(z)-150*sk(z)-50);}
function schilder(g){
 const z=g.d-O.dist;if(z>ruheStrecke()+Z0+4)return null;
 const a=Math.min(1,(ruheStrecke()+Z0+4-z)/8),y=reiheY(g);
 for(const opt of g.opts){const i=opt.lane;let zust='normal',al=a;
  if(g.ergebnis){if(opt.w===O.q)zust='richtig';else if(i===g.wahl)zust='falsch';else al*=0.3;al*=Math.max(0,1-(Z0-z)/2.5);}
  else if(i===O.ziel)zust='hell';
  wortschild(W/2+(i-1)*116,y,opt,zust,al);}
 return y;
}
/* Der Loewe: unten links, nur Kopf und Schultern im Bild; je naeher, desto groesser.
   Bei einem Fehler springt er das Zebra an (verfehlt knapp), am Ende bleibt er an der Schlucht zurueck. */
function loewe(H){
 const F=window.LoeweFigur;if(!F)return;
 const n=O.mode==='lost'?1:clamp((HEARTS-O.hearts)/HEARTS,0,1);
 if(O.angriff>0&&O.mode==='play'){angriffZeichnen(H,1-O.angriff/ANGRIFF);return;}
 if(O.mode==='lost'){angriffZeichnen(H,Math.min(0.55,O.anim*0.8),true);return;}
 const ziel=O.mode==='ziel'||(O.mode==='aus'&&O.k>=GOAL);
 /* im Ziel: bleibt stehen und wird kleiner, waehrend das Zebra davonzieht */
 const weg=ziel?Math.min(1,O.anim/1.6):0,k=(0.64+0.34*n)*(1-0.3*weg),bob=ziel?0:Math.abs(Math.sin(O.time*9))*4*k;
 const hx=52+40*n-30*weg,hy=H-50-64*n+bob+40*weg;
 const X=hx-F.KOPF.x*k,Y=hy-F.KOPF.y*k;
 const maul=O.gebruell>0?Math.min(1,O.gebruell*1.5):n>0.5?0.35:0;
 const sd=O.loeweSeite;ctx.save();ctx.globalAlpha=Math.min(1,Math.abs(sd)*1.3);if(sd<0){ctx.translate(W,0);ctx.scale(-1,1);}
 F.verfolgung(ctx,X,Y,k,ziel?{pose:'bruellen',maul:Math.min(1,0.4+O.gebruell),mood:'wild'}:{lauf:O.time*9,maul,mood:n>0?'wild':''});
 if(O.gebruell>0&&!ruhig)bruellWellen(hx+20*k,hy-10*k,O.gebruell);
 ctx.restore();
}
function bruellWellen(x,y,g){ctx.save();ctx.globalAlpha=Math.min(1,g);ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2.5;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x,y,24+i*14+(1.4-g)*34,-1.3,0.1);ctx.stroke();}ctx.restore();}
/* Sprungangriff: t 0..1; aus der Ecke hoch, knapp am Zebra vorbei, wieder zurueck */
function angriffZeichnen(H,t,fang){
 const F=window.LoeweFigur,sp=O.loeweSeite<0,zx=sp?W-zebraX():zebraX(),zy=YZ();
 ctx.save();if(sp){ctx.translate(W,0);ctx.scale(-1,1);}
 const bogen=Math.sin(Math.min(1,t/0.9)*Math.PI),x=lerp(-70,zx-64,fang?Math.min(1,t*2):bogen),y=lerp(H+30,zy-70,fang?Math.min(1,t*2):bogen);
 ctx.save();ctx.translate(x,y);ctx.rotate(lerp(-0.45,0.1,t));F.seite(ctx,0,0,0.8,{pose:'sprung',maul:0.9,mood:'wild'});ctx.restore();
 /* Krallenspur neben dem Zebra */
 if(t>0.38&&!fang){const a=Math.max(0,1-(t-0.38)*1.6);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#FFFFFF';ctx.lineWidth=4;ctx.lineCap='round';
  for(let i=0;i<3;i++){const x0=zx+22+i*12,y0=zy-120;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(x0+14,y0+26,x0+6,y0+52);ctx.stroke();}ctx.restore();}
 /* Staub */
 ctx.fillStyle='rgba(230,200,140,'+(0.5*(1-t))+')';for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(30+Math.sin(i*3)*70,H-24-Math.cos(i*2)*26,12+(i%4)*6+t*20,0,7);ctx.fill();}
 if(!ruhig)bruellWellen(x+60,y-80,1.4-t);
 ctx.restore();
}
/* Schlucht quer ueber alle Pfade (nur im Ziel) */
function schluchtZeichnen(){
 if(!O.schlucht)return;const z1=O.schlucht-O.dist,z2=z1+SCHLUCHT_B;if(z2<0.8)return;
 const y1=yAus(Math.max(0.8,z1)),y2=yAus(z2);
 const v=ctx.createLinearGradient(0,y2,0,y1);v.addColorStop(0,'#2E1A0E');v.addColorStop(1,'#120804');ctx.fillStyle=v;ctx.fillRect(0,y2,W,y1-y2);
 /* Felskanten */
 ctx.fillStyle='#A7773F';ctx.fillRect(0,y1-2,W,Math.max(2,4*sk(Math.max(0.8,z1))));
 ctx.fillStyle='#C99A5C';ctx.fillRect(0,y2-1,W,Math.max(1.5,3*sk(z2)));
 ctx.fillStyle='rgba(255,230,180,.25)';for(let i=0;i<8;i++){const x=(i*53+17)%W;ctx.fillRect(x,y2+2,2,(y1-y2)*0.4);}
}
function hud(H){
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#FFC857');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='rgba(16,21,28,.6)';rund(2,ly-5,lx-12,18,9);ctx.fill();rund(lx+lb+10,ly-5,W-lx-lb-12,18,9);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.fillText('ZEBRA',(lx-10)/2+2,ly+4);ctx.fillText('HERDE',(W+lx+lb+10)/2-1,ly+4);
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,30,66,18,9);ctx.fill();
 ctx.fillStyle=O.streak>=5?'#FFE08A':'#FFFFFF';ctx.textAlign='center';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(1).replace('.',','),W-41,39.5);
}
function zielZeichnen(H){
 /* Wasserloch mit Herde */
 const t=clamp((O.anim-SCHLUCHT_T+0.3)/1.6,0,1),y=lerp(HZ()+10,HZ()+70,t),s=lerp(0.4,1,t);if(t<=0)return;
 ctx.fillStyle='#5DB7E0';ctx.beginPath();ctx.ellipse(W/2,y+18*s,150*s,22*s,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.ellipse(W/2-30*s,y+14*s,60*s,5*s,0,0,7);ctx.fill();
 if(window.ZebraFigur)for(let i=0;i<5;i++){const x=W/2+(i-2)*62*s;window.ZebraFigur.seite(ctx,x,y+6*s,0.36*s,{lauf:O.time*2+i,laeuft:0});}
}
function zeichne(cv,breite,hoehe){
 if(!cv||!cv.getContext)return;ctx=cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=breite||cv.clientWidth,ch=hoehe||cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const k=cw/W,H=ch/k;if(Math.abs(H-O.H)>1)O.H=H;
 ctx.setTransform(dpr*k,0,0,dpr*k,0,0);ctx.globalAlpha=1;
 if((O.gebruell>1||O.angriff>ANGRIFF*0.5)&&!ruhig)ctx.translate((Math.random()-0.5)*5,(Math.random()-0.5)*5);
 himmel(H);boden(H);
 if(O.mode==='ziel'||(O.mode==='aus'&&O.k>=GOAL)){zielZeichnen(H);schluchtZeichnen();}
 /* von fern nach nah */
 const liste=[...O.deko.map(d=>({z:d.d-O.dist,f:()=>dekoZeichnen(d)})),...O.items.map(it=>({z:it.d-O.dist,f:()=>itemZeichnen(it)}))];
 if(O.gate){const g=O.gate;for(let i=0;i<3;i++)liste.push({z:g.d-O.dist,f:()=>torZeichnen(g,i)});}
 liste.sort((a,b)=>b.z-a.z);
 for(const e of liste)if(e.z>Z0-0.3)e.f();
 /* Zebra */
 if(window.ZebraFigur&&!O.intro)window.ZebraFigur.hinten(ctx,zebraX(),YZ(),ZK,{lauf:O.lauf,lehnen:clamp((O.ziel-O.lane)*1.5,-1,1),stolpern:O.stolpern,sprung:sprungHoehe()});
 for(const e of liste)if(e.z<=Z0-0.3)e.f();
 /* Teilchen */
 for(const p of O.parts){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.farbe;
  if(p.art==='blatt'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.beginPath();ctx.ellipse(0,0,p.r*2,p.r*0.8,0,0,7);ctx.fill();ctx.restore();}
  else{ctx.beginPath();ctx.arc(p.x,p.y,p.art==='staub'?p.r*2.2*(1.5-p.life):p.r,0,7);ctx.fill();}}
 ctx.globalAlpha=1;
 /* Tempo-Linien bei Schwung */
 if(O.schwung>0.05&&!ruhig){ctx.strokeStyle='rgba(255,255,255,'+0.5*O.schwung+')';ctx.lineWidth=2;for(let i=0;i<10;i++){const a=rnd(i)*Math.PI*2,r1=60+((O.time*400+i*40)%120);ctx.beginPath();ctx.moveTo(W/2+Math.cos(a)*r1,HZ()+40+Math.sin(a)*r1*0.6);ctx.lineTo(W/2+Math.cos(a)*(r1+30),HZ()+40+Math.sin(a)*(r1+30)*0.6);ctx.stroke();}}
 loewe(H);
 /* Schilder und deutsche Vokabel */
 let reihe=null;if(O.gate&&(O.mode==='play'||O.mode==='pause')&&!O.intro)reihe=schilder(O.gate);
 if(window.BWFrage&&O.gate&&(O.mode==='play'||O.mode==='pause')&&!O.intro)window.BWFrage.karte(ctx,{text:O.q.de,cx:W/2,unten:(reihe==null?HZ()-48:reihe)-8,W,H,t:O.time-O.frageT,alpha:O.gate.ergebnis?0.3:1});
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 16px Inter, system-ui, sans-serif';
 O.pops.forEach((p,n)=>{const a=Math.max(0,1-p.t/1.4),y=YZ()-150-n*22-p.t*24;ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.85)';ctx.lineWidth=4;ctx.strokeText(p.text,W/2,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,W/2,y);});
 ctx.globalAlpha=1;
 hud(H);
}
const pose=()=>({x:zebraX(),y:YZ(),k:ZK,rot:0,hoehe:170,figur:(c,x,y,k)=>window.ZebraFigur&&window.ZebraFigur.hinten(c,x,y,k,{lauf:O.lauf})});

window.BWZebra={O,start,update,zeichne,lane,schritt,tipp,wisch,pose,reiheY,ANGRIFF,SPRUNG,ZIEL_T,sprungHoehe,xAus,yAus,sk,HZ,YZ,Z0,GOAL,HEARTS,MINREAD,speed,grundTempo,ruheStrecke,mult,LANE_COL,LANE_ZEICHEN,
 ding:'Tor',hinweis:'Tippe auf das richtige Wort (oder wische) · durch das richtige Tor galoppieren – der Löwe ist dir auf den Fersen! | Tastatur: ← → oder 1 2 3 · P = Pause',
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
