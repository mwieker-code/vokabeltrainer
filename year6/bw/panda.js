/* =========================================================================
   PANDA ROLL - Kapitel 3 von Black & White (Year 6, Unit 2)
   Der Panda rollt als Kugel durch den Bambuswald nach rechts. Es gibt drei
   Waldwege hintereinander (hinten, Mitte, vorn); man lenkt mit dem Finger
   (oder 1 2 3 / Pfeiltasten) auf einen Weg.

   Zwei Abschnitte wechseln sich ab, jeder mit genau einer Handlung:
   - Roll-Strecke: Quer ueber alle Wege steht eine Bambuswand mit drei
     Toren und Wortschildern. Durch das richtige Tor kracht der Panda mit
     Wucht hindurch; am falschen prallt er ab (ein Herz), dann oeffnet sich
     das richtige Tor. Unterwegs: Bambussprossen (Punkte), Steine (bremsen,
     kosten die Serie) und Baby-Pandas am Wegrand, die sich der Kette
     anschliessen und den Punkte-Multiplikator heben.
   - Lichtung (nach jeder vierten Vokabel): drei Bambusbuendel mit Woertern.
     Zurueckziehen, zielen, loslassen - der Panda schiesst los. Im richtigen
     Buendel sitzt ein Baby-Panda (Bonus). Daneben: ein Herz.
   Vor jeder Wand ist die Strecke frei, damit man in Ruhe lesen kann.

   Die Logik (start, update, lane, zeiger, ziehen) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
/* Lichtung: die Buendel stehen schraeg versetzt, hinten weiter rechts */
const VERSATZ=[48,0,-48];
const W=360,GOAL=16,HEARTS=3,PX=92,MINREAD=3.2,LICHTUNG_ALLE=4;
const LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['▲','●','▼'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;
const SCHLEIFEN=()=>(window.PandaFigur&&window.PandaFigur.SCHLEIFEN)||['#FF6FA3'];

const O={mode:'aus',intro:false,H:600,k:0,hearts:HEARTS,score:0,streak:0,best:0,x:0,lane:1,ziel:1,dreh:0,stun:0,abprall:0,
 hitstop:0,shake:0,time:0,items:[],gate:null,lichtung:null,kette:[],spur:[],babys:0,gerettet:0,verloren:0,bambus:0,jumps:0,
 pops:[],parts:[],q:null,queue:[],pool:[],missed:new Map(),onEnd:null,onFrage:null,anim:0,tasteCd:0,naechsteSchleife:0};

/* drei Wege in die Tiefe: hinten kleiner, vorn groesser */
const laneY=i=>O.H*[0.5,0.655,0.81][i];
const SKALA=[0.74,0.87,1];
const skala=l=>{const i=Math.floor(clamp(l,0,1.999)),f=clamp(l,0,2)-i;return lerp(SKALA[i],SKALA[Math.min(2,i+1)],f);};
const yAus=l=>{const i=Math.floor(clamp(l,0,1.999)),f=clamp(l,0,2)-i;return lerp(laneY(i),laneY(Math.min(2,i+1)),f);};
const tempo=()=>1+0.05*Math.min(O.streak,10);
const grundTempo=()=>(165+3*O.k)*tempo();
const speed=()=>{if(O.lichtung&&O.lichtung.phase!=='flug')return O.lichtung.v;return grundTempo()*(O.stun>0?0.5:1)*(O.abprall>0?0:1);};
const mult=()=>tempo()*(1+0.2*O.babys);
const PK=0.95,ROLL_R=35*PK;   // Groesse und Radius der Panda-Kugel

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',intro:false,H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,x:0,lane:1,ziel:1,dreh:0,stun:0,abprall:0,
  hitstop:0,shake:0,time:0,items:[],gate:null,lichtung:null,kette:[],spur:[],babys:0,gerettet:0,verloren:0,bambus:0,jumps:0,pops:[],parts:[],
  missed:new Map(),anim:0,tasteCd:0,naechsteSchleife:0,onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 abschnitt(120);
}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
function frage(){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 return mische([O.q,...falsche(O.q)]).map((w,i)=>({w,lane:i}));
}
const istLichtung=k=>k%LICHTUNG_ALLE===LICHTUNG_ALLE-1;
/* Lesestrecke: so weit vor der Wand ist frei */
const ruheStrecke=()=>grundTempo()*MINREAD;
function abschnitt(s0){
 const opts=frage();
 O.frageT=O.time;
 if(istLichtung(O.k)){lichtungBauen(s0,opts);if(O.onFrage)O.onFrage(O.q,opts);return;}
 const ruhe=ruheStrecke(),L=Math.max(900,ruhe+520),F=s0+L,action=L-ruhe;
 /* Bambussprossen in Reihen, ein, zwei Steine, ab und zu ein Baby am Wegrand */
 for(let n=0;n<3;n++){const l=Math.floor(Math.random()*3),x=s0+60+(action-160)*n/3;for(let i=0;i<4;i++)O.items.push({typ:'bambus',x:x+i*30,lane:l});}
 if(O.k>0){const steine=O.k<5?1:2;for(let n=0;n<steine;n++)O.items.push({typ:'stein',x:s0+140+(action-260)*(n+0.5)/steine,lane:Math.floor(Math.random()*3)});}
 if(O.k%2===0||O.verloren>0){O.items.push({typ:'baby',x:s0+action*0.55,lane:Math.floor(Math.random()*3),schleife:SCHLEIFEN()[O.naechsteSchleife++%SCHLEIFEN().length]});if(O.verloren>0)O.verloren--;}
 /* Steine nicht auf der Reihe des Babys */
 O.gate={x:F,opts,erledigt:false,ergebnis:null,offen:-1,bruch:0};
 if(O.onFrage)O.onFrage(O.q,opts);
}
function lichtungBauen(s0,opts){
 const L=320;
 O.gate=null;
 O.lichtung={x0:s0,stopp:s0+L,ziel:s0+L+190,opts:opts.map(o=>({...o,kaputt:0})),phase:'anrollen',v:grundTempo(),zug:null,wahl:-1,t:0,
  baby:SCHLEIFEN()[O.naechsteSchleife++%SCHLEIFEN().length],ergebnis:null,ersteMal:O.k===LICHTUNG_ALLE-1};
}
function pop(text,farbe,y){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0,y:y==null?yAus(O.lane)-90:y});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(art==='splitter'?120:art==='staub'?30:0),life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt',rot:Math.random()*6,vr:(Math.random()-0.5)*14});}
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}
function wortFalsch(){
 const q=O.q;O.missed.set(q.en,q);
 if(!O.queue.includes(q))O.queue.splice(Math.min(2,O.queue.length),0,q);
 O.streak=0;
}

/* --------------------------------------------------------------- Steuerung */
function lane(i){
 if(O.mode!=='play')return false;i=clamp(i|0,0,2);
 const L=O.lichtung;
 if(L){if(L.phase==='zielen'||L.phase==='anrollen'){werfen(i,1);return true;}return false;}
 O.ziel=i;return true;
}
function laneOf(y){let best=0,bd=1e9;for(let i=0;i<3;i++){const d=Math.abs(y-laneY(i));if(d<bd){bd=d;best=i;}}return best;}
/* Finger: auf der Strecke = Weg waehlen; auf der Lichtung = zurueckziehen */
function punkt(cv,cx,cy){const r=cv.getBoundingClientRect();return {x:(cx-r.left)/r.width*W,y:(cy-r.top)/r.width*W};}
function zeiger(cv,cx,cy){
 if(O.mode!=='play')return;const p=punkt(cv,cx,cy),L=O.lichtung;
 if(L){if(L.phase==='zielen'&&L.zug){L.zug.x=p.x;L.zug.y=p.y;}return;}
 O.ziel=laneOf(p.y);
}
function wisch(){/* Finger los */
 const L=O.lichtung;if(!L||L.phase!=='zielen'||!L.zug)return;
 const z=zielVonZug(L.zug);L.zug=null;
 if(z.kraft<0.3){pop('Weiter zurückziehen!','#FFE08A');return;}
 werfen(z.lane,z.kraft);
}
/* Zug -> Richtung: nach unten ziehen = nach oben (hinterer Weg) zielen */
function zielVonZug(z){
 const dx=z.x0-z.x,dy=z.y0-z.y,len=Math.hypot(dx,dy),kraft=clamp(len/110,0,1);
 if(len<4)return {lane:Math.round(O.lane),kraft:0};
 /* Ziel-y = Panda-y + Richtung, auf den naechsten Weg gerundet */
 const zy=yAus(O.lane)+dy/Math.max(12,Math.abs(dx)+12)*190;
 return {lane:laneOf(zy),kraft};
}
function taste(d,dt){
 O.tasteCd-=dt;if(O.tasteCd>0)return;O.tasteCd=0.2;
 if(O.lichtung){return;}
 O.ziel=clamp(O.ziel+(d>0?1:-1),0,2);
}
function werfen(i,kraft){
 const L=O.lichtung;if(!L)return;
 L.wahl=i;L.phase='flug';L.t=0;L.kraft=Math.max(0.6,kraft);L.x0f=O.x;L.l0=O.lane;O.jumps++;sfx('wurf');
 teilchen(PX,yAus(O.lane),14,['#E8DCC0','#FFFFFF'],120,'staub');
}

/* ------------------------------------------------------------- Auswertung */
function wand(){
 const g=O.gate,l=Math.round(O.lane),opt=g.opts.find(o=>o.lane===l),y=laneY(l);
 if(g.offen>=0){g.erledigt=true;return;}  /* nach dem Abprallen: durch das offene Tor */
 if(opt.w===O.q){
  g.erledigt=true;g.ergebnis='richtig';g.bruch=l;O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(10*mult());O.score+=p;pop('+'+p,'#FFE08A');
  O.hitstop=0.11;O.shake=ruhig?0:9;
  teilchen(PX+30,y-30*SKALA[l],34,['#8BC34A','#C5E1A5','#6D9F3A','#FFFFFF'],260,'splitter');sfx('rumms');
 }else{
  g.ergebnis='falsch';wortFalsch();O.hearts--;O.abprall=0.75;O.stun=1.1;O.shake=ruhig?0:5;
  pop('Falsches Tor!','#FF9A8A');sfx('abprall');musik(M=>M.fehler());
  teilchen(PX+24,y-24,16,['#FFFFFF','#FFE08A'],140);
  babyVerlieren();
  if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());return;}
  /* das richtige Tor oeffnet sich, der Panda rollt hindurch */
  const r=g.opts.find(o=>o.w===O.q).lane;g.offen=r;g.offenZeit=O.time;O.ziel=r;
 }
}
function babyVerlieren(){
 if(O.babys<=0)return;
 O.babys--;O.verloren++;const b=O.kette.pop();
 pop('Baby purzelt weg!','#FFD6E5',laneY(0)-40);
 teilchen(PX-40,yAus(O.lane)-10,10,['#FFFFFF','#FFD6E5'],100);
 return b;
}
function weiter(){
 O.k++;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;O.gate=null;O.lichtung=null;musik(M=>M.ziel());sfx('ziel');return;}
 abschnitt(O.x+120);
}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.4);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.art==='splitter'?520:p.art==='staub'?-20:60)*dt;p.vx*=0.98;p.rot+=p.vr*dt;p.life-=dt*(p.art==='staub'?1.6:1.1);}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.shake>0)O.shake=Math.max(0,O.shake-dt*30);
 if(O.mode==='abgang'){/* der Panda rollt mit Schwung davon - Uebergang zum Zebra */
  O.anim+=dt;O.abX=(O.abX||0)+(200+O.anim*500)*dt;O.dreh+=dt*14;O.lane+=(1-O.lane)*Math.min(1,dt*5);return;}
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;
  if(O.mode==='ziel'){const v=grundTempo()*Math.max(0,1-O.anim/1.4);O.x+=v*dt;O.dreh+=v*dt/ROLL_R;spurMerken();}
  if(O.anim>=(O.mode==='ziel'?2:1.4)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 musik(M=>{M.tempo(tempo());M.turbo(O.babys>=3);});
 /* Treffer-Moment: kurz einfrieren, damit der Rumms wirkt */
 if(O.hitstop>0){O.hitstop-=dt;return;}
 if(O.stun>0)O.stun-=dt;
 const L=O.lichtung;
 if(L){lichtungUpdate(L,dt);return;}
 /* Weg wechseln (nach dem Abprallen fuehrt der Weg durch das offene Tor) */
 if(O.gate&&O.gate.offen>=0)O.ziel=O.gate.offen;
 O.lane+=(O.ziel-O.lane)*Math.min(1,dt*11);
 if(O.abprall>0){
  /* zurueckprallen, dann wieder anrollen */
  const t=1-O.abprall/0.75;O.abprall-=dt;O.x-=Math.max(0,1-t*2.2)*220*dt;O.dreh-=Math.max(0,1-t*2.2)*220*dt/ROLL_R;
  if(O.abprall<=0)O.abprall=0;
  spurMerken();return;
 }
 const v=speed();O.x+=v*dt;O.dreh+=v*dt/ROLL_R;
 if(Math.random()<dt*8)teilchen(PX-ROLL_R*0.6,yAus(O.lane),1,['rgba(220,200,160,.8)'],30,'staub');
 spurMerken();
 /* Dinge unterwegs */
 const l=Math.round(O.lane),nah=Math.abs(O.lane-l)<0.35;
 for(const it of O.items){
  if(it.weg||Math.abs(it.x-O.x)>20||!nah||it.lane!==l)continue;
  if(it.typ==='bambus'){it.weg=true;O.bambus++;const p=Math.round(2*mult());O.score+=p;teilchen(PX+10,laneY(l)-20,5,['#8BC34A','#FFFFFF'],70);sfx('bambus');}
  else if(it.typ==='stein'&&O.stun<=0){it.weg=true;O.stun=0.7;O.streak=0;O.shake=ruhig?0:4;pop('Stein im Weg!','#D7CCC8');teilchen(PX+18,laneY(l)-10,14,['#9E9E9E','#D7CCC8'],130);sfx('stein');}
  else if(it.typ==='baby'){it.weg=true;O.babys++;O.kette.push({schleife:it.schleife,dazu:O.time});pop('Baby-Panda dabei! ×'+mult().toFixed(1).replace('.',','),'#FFD6E5');teilchen(PX,laneY(l)-30,18,['#FFFFFF','#FFD6E5',it.schleife],140);sfx('baby');}
 }
 O.items=O.items.filter(it=>it.x>O.x-PX-80);
 /* Wand */
 const g=O.gate;
 if(g&&!g.erledigt&&O.x>=g.x-ROLL_R){wand();if(O.mode!=='play')return;}
 if(g&&g.erledigt&&O.x>=g.x+60){O.gate=null;weiter();}
}
function spurMerken(){O.spur.unshift(O.lane);if(O.spur.length>80)O.spur.length=80;}
function lichtungUpdate(L,dt){
 L.t+=dt;
 if(L.phase==='anrollen'){
  /* sanft bis zum Abwurfpunkt rollen und stehen bleiben */
  const rest=L.stopp-O.x;L.v=Math.max(0,Math.min(grundTempo(),rest*2.4));
  O.x+=L.v*dt;O.dreh+=L.v*dt/ROLL_R;O.lane+=(1-O.lane)*Math.min(1,dt*6);O.ziel=1;spurMerken();
  if(rest<2){O.x=L.stopp;L.v=0;L.phase='zielen';L.t=0;}
 }else if(L.phase==='flug'){
  const dauer=0.5,t=Math.min(1,L.t/dauer),e=1-Math.pow(1-t,2);
  const ziel=L.ziel+VERSATZ[L.wahl]-40;O.x=lerp(L.x0f,ziel,e);O.lane=lerp(L.l0,L.wahl,e);O.dreh+=dt*22*L.kraft;spurMerken();
  if(t>=1)treffen(L);
 }else if(L.phase==='treffer'){
  if(L.t>(L.ergebnis==='richtig'?1.0:1.1)){
   /* weiter auf dem Weg; die uebrigen Buendel fallen um */
   for(const o of L.opts)if(o.kaputt<1){o.kaputt=1;teilchen(sx(L.ziel)+VERSATZ[o.lane],laneY(o.lane)-30*SKALA[o.lane],14,['#8BC34A','#C5E1A5','#6D9F3A'],160,'splitter');}
   O.lichtung=null;O.ziel=Math.round(O.lane);weiter();
  }else if(L.ergebnis!=='richtig'){const t=L.t/0.5;if(t<1){O.x-=(1-t)*160*dt;O.dreh-=(1-t)*160*dt/ROLL_R;}}
 }
}
function treffen(L){
 const opt=L.opts.find(o=>o.lane===L.wahl),y=laneY(L.wahl);
 L.phase='treffer';L.t=0;
 if(opt.w===O.q){
  L.ergebnis='richtig';opt.kaputt=1;O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(15*mult());O.score+=p;O.babys++;O.gerettet++;O.kette.push({schleife:L.baby,dazu:O.time});
  pop('Volltreffer! +'+p+' · Baby gerettet!','#FFE08A');
  O.hitstop=0.14;O.shake=ruhig?0:11;
  teilchen(PX+40,y-30,46,['#8BC34A','#C5E1A5','#6D9F3A','#FFFFFF','#FFD6E5'],300,'splitter');sfx('rumms');sfx('baby');
 }else{
  L.ergebnis='falsch';wortFalsch();O.hearts--;O.stun=1.1;O.shake=ruhig?0:5;opt.kaputt=0.3;
  pop('Daneben! Das Baby wartet.','#FF9A8A');sfx('abprall');musik(M=>M.fehler());
  L.baby=null;O.naechsteSchleife--;
  if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());}
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
 rumms:t=>{ton(t,120,38,0.45,'sine',0.6);zisch(t,1800,300,0.35,0.5,0.8);[0,0.03,0.07].forEach(d=>zisch(t+d,4200,2200,0.08,0.18,4));},
 abprall:t=>{ton(t,260,520,0.12,'triangle',0.2);ton(t+0.1,520,260,0.25,'triangle',0.16);zisch(t,900,400,0.15,0.2,1);},
 bambus:t=>{ton(t,880,1320,0.07,'triangle',0.12);},
 stein:t=>{ton(t,160,70,0.2,'square',0.12);zisch(t,1200,300,0.15,0.25,1);},
 baby:t=>{[1046,1318,1568].forEach((f,i)=>ton(t+i*0.07,f,f*1.06,0.12,'sine',0.14));},
 wurf:t=>{zisch(t,400,3000,0.3,0.3,0.7);ton(t,200,500,0.25,'triangle',0.12);},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.15));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null,cam=0;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
const sx=x=>PX+(x-O.x);
const wiederhole=(breite,faktor)=>(-(O.x*faktor)%breite+breite)%breite;
function himmel(H){
 const g=ctx.createLinearGradient(0,0,0,laneY(0));g.addColorStop(0,'#BFE3D0');g.addColorStop(0.6,'#E9F3DE');g.addColorStop(1,'#F6EFD9');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(255,246,214,.9)';ctx.beginPath();ctx.arc(W*0.78,H*0.12,22,0,7);ctx.fill();
 /* Karstberge im Nebel */
 for(const [f,farbe,hoch,breite,y0] of [[0.04,'#A9C9B6',0.3,520,0.42],[0.1,'#8FB9A0',0.22,400,0.46]]){const o=wiederhole(breite,f);
  for(const p of [o-breite,o,o+breite]){ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(p,H*y0+20);
   for(let i=0;i<=6;i++){const x=p+breite*i/6,h=(0.45+0.55*rnd(i*7.7+breite))*H*hoch;ctx.quadraticCurveTo(x-breite/12,H*y0-h,x,H*y0-h*0.2);}
   ctx.lineTo(p+breite,H*y0+20);ctx.fill();}}
 const nebel=ctx.createLinearGradient(0,H*0.32,0,H*0.47);nebel.addColorStop(0,'rgba(246,239,217,0)');nebel.addColorStop(1,'rgba(246,239,217,.85)');ctx.fillStyle=nebel;ctx.fillRect(0,H*0.3,W,H*0.18);
}
function stange(x,y0,y1,dicke,farbe,glanz){
 ctx.fillStyle=farbe;ctx.fillRect(x-dicke/2,y1,dicke,y0-y1);
 ctx.fillStyle=glanz;ctx.fillRect(x-dicke/2+dicke*0.18,y1,dicke*0.22,y0-y1);
 ctx.fillStyle='rgba(30,60,20,.35)';for(let y=y0-28;y>y1;y-=34){ctx.fillRect(x-dicke/2-1,y,dicke+2,2.4);}
}
function blatt(x,y,l,w,rot,farbe){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(l*0.5,-w,l,0);ctx.quadraticCurveTo(l*0.5,w,0,0);ctx.fill();ctx.restore();}
function wald(H){
 /* hinterer Bambuswald (Parallaxe) */
 const y0=laneY(0)-14;
 for(const [f,abst,farbe,glanz,hoch,d] of [[0.25,26,'#7FAE6B','#9CC487',0.55,6],[0.45,38,'#5F9450','#86B86F',0.62,8]]){
  const o=wiederhole(abst*12,f);
  for(let i=-1;i<14;i++){const n=i+Math.floor(O.x*f/(abst*12))*12,x=o+i*abst-abst+rnd(n)*10;
   const top=y0-H*hoch*(0.7+0.3*rnd(n+3));stange(x,y0+4,top,d,farbe,glanz);
   for(let b=0;b<3;b++)blatt(x,top+20+b*40+rnd(n+b)*20,16+rnd(n*2+b)*8,4,(b%2?-1:1)*(0.5+rnd(n+b*5)*0.5),glanz);}
 }
}
function boden(H){
 /* Waldboden mit drei Wegen */
 const g=ctx.createLinearGradient(0,laneY(0)-20,0,H);g.addColorStop(0,'#8DBF6A');g.addColorStop(1,'#5E9A45');ctx.fillStyle=g;ctx.fillRect(0,laneY(0)-20,W,H);
 for(let i=0;i<3;i++){const y=laneY(i),h=26*SKALA[i];
  const wg=ctx.createLinearGradient(0,y-h,0,y+h*0.6);wg.addColorStop(0,'#E3CFA0');wg.addColorStop(1,'#C9AE78');ctx.fillStyle=wg;
  ctx.beginPath();ctx.moveTo(0,y-h*0.6);for(let x=0;x<=W;x+=20){ctx.lineTo(x,y-h*0.6+Math.sin((x+O.x)*0.02+i)*2);}ctx.lineTo(W,y+h*0.5);ctx.lineTo(0,y+h*0.5);ctx.closePath();ctx.fill();
  /* Steinchen */
  ctx.fillStyle='rgba(120,95,60,.35)';const o=wiederhole(60,1);for(let x=o-60;x<W+60;x+=60){const r=rnd(Math.floor((x+O.x)/60)+i*31);ctx.beginPath();ctx.ellipse(x+r*40,y+(r-0.5)*h*0.6,2+r*2,1.2+r,0,0,7);ctx.fill();}
  /* Grasbueschel am Rand */
  ctx.fillStyle='#4E8A3A';const o2=wiederhole(46,1);for(let x=o2-46;x<W+46;x+=46){const r=rnd(Math.floor((x+O.x)/46)+i*17);for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(x+r*20+k*3,y+h*0.55);ctx.lineTo(x+r*20+k*3-2+k,y+h*0.55-6-r*5);ctx.lineTo(x+r*20+k*3+2,y+h*0.55);ctx.fill();}}
 }
}
function wortschild(cx,y,opt,zustand,alpha,sk){
 const bw=122*sk,bh=40*sk,x=clamp(cx-bw/2,4,W-bw-4),farbe=zustand==='richtig'?'#5BD68A':zustand==='falsch'?'#FF6B5E':LANE_COL[opt.lane];
 ctx.save();ctx.globalAlpha=alpha==null?1:alpha;
 ctx.fillStyle=zustand==='richtig'?'rgba(18,70,40,.95)':zustand==='falsch'?'rgba(90,24,20,.95)':'rgba(16,21,28,.92)';rund(x,y,bw,bh,9*sk);ctx.fill();
 ctx.fillStyle=farbe;rund(x,y,24*sk,bh,9*sk);ctx.fill();ctx.fillRect(x+14*sk,y,10*sk,bh);
 ctx.fillStyle='#10151C';ctx.font='800 '+Math.round(12*sk)+'px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText(zustand==='richtig'?'✓':zustand==='falsch'?'✗':LANE_ZEICHEN[opt.lane],x+12*sk,y+bh/2+1);
 ctx.fillStyle='#FFFFFF';ctx.textAlign='left';
 let fs=Math.round(16*sk);ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';const maxB=bw-32*sk,worte=opt.w.en.split(' ');let zeilen;
 for(;;){zeilen=[];let s='';for(const w of worte){const t=s?s+' '+w:w;if(ctx.measureText(t).width>maxB&&s){zeilen.push(s);s=w;}else s=t;}zeilen.push(s);
  if((zeilen.length<=2&&zeilen.every(l=>ctx.measureText(l).width<=maxB))||fs<=9)break;fs--;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';}
 zeilen.slice(0,2).forEach((l,n,a)=>ctx.fillText(l,x+30*sk,y+bh/2+1+(n-(a.length-1)/2)*fs*1.12));
 ctx.restore();
}
/* Bambuswand: drei Tore, dazwischen dichte Stangen */
function wandZeichnen(g,i){
 const x=sx(g.x),y=laneY(i),sk=SKALA[i],h=112*sk,b=74*sk;if(x<-80||x>W+80)return;
 const kaputt=g.bruch===i,offen=g.offen===i;
 /* Zaun zwischen den Toren (bis zum naechsten Weg) */
 ctx.fillStyle='#6E9E4E';
 if(i<2){const y2=laneY(i+1);for(let k=0;k<4;k++){const yy=lerp(y,y2,(k+1)/5);stange(x+2*sk,yy+4,yy-h*1.02,10*sk,'#5F8F43','#86B86F');}}
 if(kaputt){
  /* zersplittert: Stuempfe */
  for(const dx of [-b/2,b/2])stange(x+dx,y+2,y-h*0.35,8*sk,'#7DB35A','#A5D17F');
  return;
 }
 const auf=offen?Math.min(1,(O.time-(g.offenZeit||O.time))*3):0;
 for(const dx of [-b/2,b/2])stange(x+dx,y+2,y-h,12*sk,'#7DB35A','#A5D17F');
 /* Querstangen bzw. Gitter */
 ctx.save();ctx.globalAlpha=1-auf;
 for(let k=0;k<5;k++){const xx=x-b/2+b*(k+0.5)/5;stange(xx,y,y-h*0.94,8*sk,'#8BC34A','#B5DC8E');}
 ctx.fillStyle='#5D7F3B';ctx.fillRect(x-b/2-6*sk,y-h*0.86,b+12*sk,7*sk);ctx.fillRect(x-b/2-6*sk,y-h*0.2,b+12*sk,7*sk);
 ctx.restore();
}
function schilderZeichnen(g){
 /* Schilder schweben ueber den Toren; ist die Wand noch weit weg, warten sie am rechten Rand */
 const vorn=O.x>g.x-ruheStrecke()-40;if(!vorn)return;
 const a=Math.min(1,(O.x-(g.x-ruheStrecke()-40))/60);
 for(const opt of g.opts){const i=opt.lane,sk=SKALA[i],x=Math.min(sx(g.x),W-66*sk),y=laneY(i)-76*sk;
  let zust='normal',al=a;
  if(g.ergebnis==='richtig'){if(g.bruch===i)zust='richtig';else al*=0.25;}
  else if(g.ergebnis==='falsch'){if(opt.w===O.q)zust='richtig';else if(i===Math.round(O.lane))zust='falsch';else al*=0.3;}
  else if(i===O.ziel&&!ruhig)zust='hell';
  if(g.erledigt&&g.ergebnis==='richtig'&&O.x>g.x+10)al*=Math.max(0,1-(O.x-g.x-10)/40);
  wortschild(x,y,opt,zust,al,sk);}
}
function buendel(o,cx){
 const i=o.lane,y=laneY(i),sk=SKALA[i];
 if(o.kaputt>=1)return;
 const wack=o.kaputt>0?Math.sin(O.time*40)*3*sk:0;
 ctx.save();ctx.translate(cx+wack,y);
 ctx.fillStyle='rgba(30,50,20,.25)';ctx.beginPath();ctx.ellipse(0,0,36*sk,7*sk,0,0,7);ctx.fill();
 for(let k=-3;k<=3;k++){const x=k*8.5*sk,h=(92+Math.abs(k)*-5+rnd(k+i*9)*10)*sk;stange(x,0,-h,7*sk,k%2?'#7DB35A':'#6FA64E','#A5D17F');blatt(x,-h+6,14*sk,4*sk,k*0.3-0.6,'#9CCB7A');}
 ctx.fillStyle='#B5652F';ctx.fillRect(-31*sk,-22*sk,62*sk,7*sk);ctx.fillStyle='#8E4B20';ctx.fillRect(-31*sk,-17*sk,62*sk,2*sk);
 ctx.restore();
}
function lichtungZeichnen(L,H){
 /* helle Lichtung */
 const lx=sx(L.stopp+110);
 const gl=ctx.createRadialGradient(lx,laneY(1),20,lx,laneY(1),260);gl.addColorStop(0,'rgba(255,248,210,.55)');gl.addColorStop(1,'rgba(255,248,210,0)');ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
 for(let n=0;n<16;n++){const x=sx(L.stopp-60+rnd(n)*380),y=laneY(0)-6+rnd(n+3)*(laneY(2)-laneY(0)+20);ctx.fillStyle=['#FFFFFF','#FFD6E5','#FFE08A'][n%3];ctx.beginPath();ctx.arc(x,y,2.2,0,7);ctx.fill();}
}
function lichtungVorn(L){
 /* Buendel und Schilder, von hinten nach vorn */
 for(const o of L.opts.slice().sort((a,b)=>a.lane-b.lane)){
  const bx=sx(L.ziel)+VERSATZ[o.lane];
  if(L.ergebnis==='richtig'&&o.kaputt>=1&&o.w===O.q&&L.t<1){/* Baby purzelt heraus */
   const t=L.t,y=laneY(o.lane)-Math.sin(Math.min(1,t*1.6)*Math.PI)*70;if(window.PandaFigur)window.PandaFigur.panda(ctx,bx-t*60,y,0.45*SKALA[o.lane],{baby:true,arme:1,mood:'lachen',schleife:O.kette.length?O.kette[O.kette.length-1].schleife:'#FF6FA3'});}
 }
 const sichtbar=L.phase!=='anrollen'||O.x>L.stopp-ruheStrecke();
 if(sichtbar)for(const o of L.opts){const sk=SKALA[o.lane];let zust='normal',a=1;
  if(L.ergebnis){if(o.w===O.q)zust='richtig';else if(o.lane===L.wahl)zust='falsch';else a=0.3;}
  else if(L.phase==='zielen'&&L.zug&&zielVonZug(L.zug).lane===o.lane)zust='hell';
  if(L.ergebnis==='richtig'&&L.t>0.7)a*=Math.max(0,1-(L.t-0.7)*3);
  const bx=sx(L.ziel)+VERSATZ[o.lane];wortschild(Math.min(bx,W-66*sk),laneY(o.lane)-74*sk,o,zust,a,sk);}
}
function zielhilfe(L){
 if(L.phase!=='zielen')return;
 const py=yAus(O.lane)-ROLL_R*skala(O.lane);
 if(!L.zug){
  /* Hinweis: Finger zieht zurueck */
  const t=(O.time*0.9)%1,hx=PX+20-t*50,hy=py+10+t*18;
  ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI);ctx.fillStyle='#FFFFFF';ctx.strokeStyle='rgba(16,21,28,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx,hy,9,0,7);ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='rgba(16,21,28,.85)';rund(W/2-140,58,280,30,15);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.font='700 13px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('Zurückziehen, zielen und loslassen!',W/2,73.5);
  return;
 }
 const z=zielVonZug(L.zug),ty=laneY(z.lane)-30*SKALA[z.lane],tx=sx(L.ziel)+VERSATZ[z.lane];
 /* Gummiband */
 ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(PX,py);ctx.lineTo(PX-(L.zug.x0-L.zug.x)*-1*0.6,py-(L.zug.y0-L.zug.y)*-1*0.6);ctx.stroke();
 /* Flugbahn */
 ctx.setLineDash([6,7]);ctx.strokeStyle=z.kraft>=0.3?LANE_COL[z.lane]:'rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(PX+10,py);ctx.quadraticCurveTo((PX+tx)/2,Math.min(py,ty)-30,tx-20,ty);ctx.stroke();ctx.setLineDash([]);
 /* Kraftring */
 ctx.strokeStyle='rgba(16,21,28,.5)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(PX,py,ROLL_R+8,0,7);ctx.stroke();
 ctx.strokeStyle=z.kraft>=0.3?'#FFE08A':'#FFFFFF';ctx.beginPath();ctx.arc(PX,py,ROLL_R+8,-Math.PI/2,-Math.PI/2+z.kraft*Math.PI*2);ctx.stroke();
}
function itemZeichnen(it){
 const x=sx(it.x),i=it.lane,y=laneY(i),sk=SKALA[i];if(it.weg||x<-40||x>W+40)return;
 if(it.typ==='bambus'){ctx.save();ctx.translate(x,y);const w=Math.sin(O.time*3+it.x)*0.1;ctx.rotate(w);
  ctx.fillStyle='#7DB35A';rund(-3.5*sk,-22*sk,7*sk,22*sk,3*sk);ctx.fill();ctx.fillStyle='#A5D17F';ctx.fillRect(-1.5*sk,-20*sk,2*sk,18*sk);
  blatt(0,-20*sk,12*sk,4*sk,-0.9,'#8BC34A');blatt(0,-14*sk,11*sk,3.5*sk,-2.3,'#8BC34A');ctx.restore();}
 else if(it.typ==='stein'){ctx.fillStyle='rgba(30,40,20,.25)';ctx.beginPath();ctx.ellipse(x,y+2,22*sk,5*sk,0,0,7);ctx.fill();
  const g=ctx.createRadialGradient(x-6*sk,y-18*sk,2,x,y-10*sk,26*sk);g.addColorStop(0,'#C9C2B8');g.addColorStop(1,'#7C746A');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(x-20*sk,y);ctx.quadraticCurveTo(x-22*sk,y-20*sk,x-4*sk,y-24*sk);ctx.quadraticCurveTo(x+18*sk,y-24*sk,x+20*sk,y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7FAE5E';ctx.beginPath();ctx.ellipse(x-4*sk,y-22*sk,9*sk,3*sk,-0.2,0,7);ctx.fill();}
 else if(it.typ==='baby'&&window.PandaFigur){window.PandaFigur.panda(ctx,x,y,0.5*sk,{baby:true,arme:Math.sin(O.time*4+it.x)>0?1:0.2,mood:'froh',schleife:it.schleife,wippen:O.time*3});
  ctx.fillStyle='rgba(16,21,28,.75)';rund(x-22,y-74*sk,44,16,8);ctx.fill();ctx.fillStyle='#FFD6E5';ctx.font='800 10px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Hilfe!',x,y-74*sk+8.5);}
}
function pandaZeichnen(){
 if(!window.PandaFigur||O.intro)return;
 const l=O.lane,sk=skala(l),y=yAus(l);
 /* Kette der Babys hinter der Mama */
 O.kette.forEach((b,n)=>{const l2=O.spur[Math.min(O.spur.length-1,6+n*6)]??l,sk2=skala(l2),hop=Math.abs(Math.sin(O.time*9+n))*3;
  window.PandaFigur.panda(ctx,PX-(42+n*30)*sk2,yAus(l2)-hop,0.95*sk2,{pose:'kugel',baby:true,dreh:O.dreh*1.4+n,schleife:b.schleife,mood:'froh'});});
 const mood=O.stun>0?'schwindlig':(O.gate&&O.gate.ergebnis==='richtig'&&O.x<O.gate.x+60)||(O.lichtung&&O.lichtung.ergebnis==='richtig')?'lachen':'froh';
 const quetsch=O.hitstop>0?1.12:1;
 ctx.save();ctx.translate(PX+(O.mode==='abgang'?O.abX:0),y-(O.mode==='abgang'?Math.abs(Math.sin(O.anim*7))*30:0));ctx.scale(quetsch,2-quetsch);
 window.PandaFigur.panda(ctx,0,0,PK*sk,{pose:'kugel',dreh:O.dreh,mood,zeit:O.time});
 ctx.restore();
 if(O.stun>0){for(let i=0;i<3;i++){const a=O.time*6+i*2.1;ctx.fillStyle='#FFE08A';stern(PX+Math.cos(a)*22*sk,y-ROLL_R*2*sk-6+Math.sin(a)*6,4.5);}}
}
function stern(x,y,r){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*0.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
function hud(H){
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#A5D17F');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 for(let n=1;n<=GOAL/LICHTUNG_ALLE;n++){ctx.fillStyle='#FFE08A';ctx.beginPath();ctx.arc(lx+lb*(n*LICHTUNG_ALLE-0.5)/GOAL,ly+4,2.6,0,7);ctx.fill();}
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='rgba(16,21,28,.6)';rund(2,ly-5,lx-12,18,9);ctx.fill();rund(lx+lb+10,ly-5,W-lx-lb-12,18,9);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.fillText('PANDA',(lx-10)/2+2,ly+4);ctx.fillText('NEST',(W+lx+lb+10)/2-1,ly+4);
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,30,66,18,9);ctx.fill();
 ctx.fillStyle=O.babys>0?'#FFD6E5':'#FFFFFF';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(1).replace('.',','),W-41,39.5);
 /* Babys als kleine Koepfe */
 ctx.fillStyle='rgba(16,21,28,.6)';rund(8,30,30+Math.max(1,O.babys)*16,18,9);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.textAlign='left';ctx.fillText('🐼',13,40);
 O.kette.forEach((b,n)=>{ctx.fillStyle=b.schleife;ctx.beginPath();ctx.arc(36+n*16,39,5,0,7);ctx.fill();});
}
function zeichne(cv,breite,hoehe){
 if(!cv||!cv.getContext)return;ctx=cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=breite||cv.clientWidth,ch=hoehe||cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const sk=cw/W,H=ch/sk;
 if(Math.abs(H-O.H)>1)O.H=H;
 ctx.setTransform(dpr*sk,0,0,dpr*sk,0,0);ctx.globalAlpha=1;
 if(O.shake>0){ctx.translate((Math.random()-0.5)*O.shake,(Math.random()-0.5)*O.shake);}
 himmel(H);wald(H);boden(H);
 const L=O.lichtung;if(L)lichtungZeichnen(L,H);
 if(O.mode==='ziel'||(O.mode==='aus'&&O.k>=GOAL)){/* Nest am Ende: es kommt dem Panda entgegen */
  const nx=lerp(PX+280,PX,ease(Math.min(1,O.anim/1.4))),ny=yAus(O.lane)+4;
  ctx.fillStyle='#7A5A32';ctx.beginPath();ctx.ellipse(nx,ny,78,20,0,0,7);ctx.fill();ctx.strokeStyle='#B08A55';ctx.lineWidth=3.5;
  for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(nx,ny-4,74-i*4,17-i,0.04*i,Math.PI*0.95,Math.PI*2.05);ctx.stroke();}
  for(let i=0;i<6;i++)blatt(nx-60+i*24,ny-10,18,5,-0.6+i*0.25,'#8BC34A');
 }
 /* von hinten nach vorn: Weg 0, 1, 2 - Dinge, Wand, Panda */
 const pl=Math.round(O.lane);
 for(let i=0;i<3;i++){
  for(const it of O.items)if(it.lane===i)itemZeichnen(it);
  if(O.gate)wandZeichnen(O.gate,i);
  if(L){const o=L.opts.find(o=>o.lane===i);if(o)buendel(o,sx(L.ziel)+VERSATZ[i]);}
  if(i===pl)pandaZeichnen();
 }
 if(L)lichtungVorn(L);
 if(O.gate)schilderZeichnen(O.gate);
 /* Teilchen */
 for(const p of O.parts){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.farbe;
  if(p.art==='splitter'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.r*2,-p.r*0.5,p.r*4,p.r);ctx.restore();}
  else{ctx.beginPath();ctx.arc(p.x,p.y,p.art==='staub'?p.r*2*(1.4-p.life):p.r,0,7);ctx.fill();}}
 ctx.globalAlpha=1;
 if(L)zielhilfe(L);
 /* Meldungen */
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 16px Inter, system-ui, sans-serif';
 O.pops.forEach((p,n)=>{const a=Math.max(0,1-p.t/1.4),y=Math.max(70,p.y-n*22-p.t*24);ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.85)';ctx.lineWidth=4;ctx.strokeText(p.text,W/2,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,W/2,y);});
 ctx.globalAlpha=1;
 if(O.hitstop>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(0.35,O.hitstop*3)+')';ctx.fillRect(0,0,W,H);}
 /* deutsche Vokabel als Karte ueber der Wand bzw. den Buendeln */
 if(window.BWFrage&&(O.mode==='play'||O.mode==='pause')&&!O.intro&&(O.gate||L)){
  const cx=O.gate?Math.min(sx(O.gate.x),W-66*SKALA[0]):sx(L.ziel)+VERSATZ[0],vorbei=(O.gate&&O.gate.ergebnis==='richtig')||(L&&L.ergebnis);
  window.BWFrage.karte(ctx,{text:O.q.de,cx,unten:laneY(0)-64,W,H,t:O.time-(O.frageT||0),alpha:vorbei?0.25:1});}
 hud(H);

}
/* Tippen: auf der Strecke = Weg waehlen; auf der Lichtung beginnt das Ziehen */
function tipp(cv,cx,cy){
 const L=O.lichtung;
 if(L){if(O.mode==='play'&&L.phase==='zielen'){const p=punkt(cv,cx,cy);L.zug={x0:p.x,y0:p.y,x:p.x,y:p.y};}return;}
 zeiger(cv,cx,cy);
}
/* Lage der Panda-Kugel (fuer den Uebergang aus morph.js) */
const pose=()=>({x:PX,y:yAus(O.lane),k:PK*skala(O.lane),rot:0,dreh:O.dreh,hoehe:75,figur:(c,x,y,k)=>window.PandaFigur&&window.PandaFigur.panda(c,x,y,k,{pose:'kugel',dreh:O.dreh,mood:'froh'})});
function abgang(){Object.assign(O,{mode:'abgang',anim:0,abX:0,gate:null,lichtung:null,pops:[],kette:[]});O.items=[];}
const abgangPunkt=cv=>{const k=cv.clientWidth/W;return {x:Math.min(W-30,PX+O.abX)*k,y:(yAus(O.lane)-35)*k};};

window.BWPandaRoll={O,start,abgang,abgangPunkt,ABGANG_RICHTUNG:1,update,zeichne,lane,zeiger,wisch,taste,tipp,pose,werfen,zielVonZug,laneY,laneOf,yAus,GOAL,HEARTS,MINREAD,PX,LICHTUNG_ALLE,
 speed,grundTempo,ruheStrecke,mult,istLichtung,LANE_COL,LANE_ZEICHEN,ding:'Wand',
 hinweis:'Ziehen = Weg wählen · durch das richtige Tor krachen | Lichtung: zurückziehen und loslassen | Tastatur: 1 2 3 · P = Pause',
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
