/* =========================================================================
   PENGUIN RUN - Kapitel 1 von Black & White (Year 6, Unit 2)
   Ein Jump & Run in der Seitenansicht.

   Der Pinguin laeuft von selbst nach rechts ueber das Schelfeis. Tippen
   (oder Leertaste, Pfeil hoch) = springen, in der Luft noch einmal tippen =
   zweiter Sprung. Lesen und Springen passieren nie gleichzeitig:

   1. Zwischen den Vokabeln nur Action: ueber Gletscherspalten und Robben
      springen, Fische in der Luft schnappen. Wer in eine Spalte faellt,
      verliert die Serie (kein Herz).
   2. An jeder Vokabel teilt sich der Weg in drei Eisbruecken in drei
      Hoehen, jede mit einem grossen Wortschild. Die Zeit laeuft in Zeitlupe;
      wer noch nicht gewaehlt hat, wartet vor der Gabelung. Gewaehlt wird
      durch Tippen auf die Bruecke oder auf einen der Knoepfe ▲ ● ▼.
      Der Pinguin springt dann selbst hinauf. Die richtige Bruecke traegt,
      die falsche bricht ein und kostet ein Herz.

   Dazu Eis-Turbo (schneller, doppelte Punkte) und Schal (faengt eine
   falsche Bruecke ab). Jede richtige Antwort in Folge macht schneller.

   Die Logik (start, update, lane, sprung) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
const W=360,GOAL=16,HEARTS=3,PX=92,GRAV=1900,SPRUNG=-640,SPRUNG2=-540,BL=300,TURBO_GATES=3;
const LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['▲','●','▼'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

const O={mode:'aus',H:560,k:0,hearts:HEARTS,score:0,streak:0,best:0,x:0,y:0,vy:0,boden:true,sprungZahl:0,
 time:0,anim:0,stun:0,blink:0,turbo:0,shield:false,zeitlupe:1,segs:[],items:[],gate:null,pops:[],parts:[],
 q:null,queue:[],pool:[],missed:new Map(),fish:0,jumps:0,onEnd:null,onFrage:null,faellt:0};
const GY=()=>Math.round(O.H*0.7);
/* Hoehe der drei Bruecken: oben, Mitte, unten (unten = Hoehe des Eises) */
const brueckeY=i=>GY()-[150,78,0][i];
const tempo=()=>1+0.06*Math.min(O.streak,10);
const grundTempo=()=>(195+3*O.k)*tempo()*(O.turbo>0?1.4:1)*(O.stun>0?0.55:1);
const speed=()=>grundTempo()*O.zeitlupe;
const mult=()=>tempo()*(O.turbo>0?2:1);
const ABSPRUNG=70;   // so weit vor der Gabelung springt der Pinguin hinauf

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,x:0,vy:0,boden:true,sprungZahl:0,
  time:0,anim:0,stun:0,blink:0,turbo:0,shield:false,zeitlupe:1,segs:[],items:[],gate:null,pops:[],parts:[],missed:new Map(),fish:0,jumps:0,faellt:0,
  onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 O.y=GY();O.segs.push({x0:-400,x1:200});
 abschnitt(200);
}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
/* Ein Abschnitt: Action vorn, ruhiger Anlauf, dann die Gabelung mit drei Bruecken */
function abschnitt(s0){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 const L=Math.max(1000,grundTempo()*4.8),F=s0+L,opts=mische([O.q,...falsche(O.q)]);
 const action=O.k===0?0.45:0.62;          // ab hier bis zur Gabelung: frei
 /* Boden mit Spalten */
 let x=s0;const spalten=[];
 const n=O.k===0?1:O.k<4?1+(O.k%2):2;
 for(let i=0;i<n;i++){const sx=s0+180+(L*action-260)*(i+0.5)/n+(Math.random()-0.5)*40,b=62+Math.min(40,O.k*3)+Math.random()*16;spalten.push([sx,sx+b]);}
 for(const [a,b] of spalten){O.segs.push({x0:x,x1:a});x=b;
  for(let i=0;i<4;i++)O.items.push({typ:'fisch',x:a-10+i*(b-a+20)/3,y:GY()-70-Math.sin(i/3*Math.PI)*40});}
 O.segs.push({x0:x,x1:F});
 /* eine Robbe zwischen den Spalten, nie direkt davor */
 if(O.k>=1){let rx=s0+120+Math.random()*(L*action-200);if(!spalten.some(([a,b])=>rx>a-90&&rx<b+60))O.items.push({typ:'robbe',x:rx,y:GY()});}
 /* Fische am Boden und ab und zu ein Item in Sprunghoehe */
 const fx=s0+60+Math.random()*80;for(let i=0;i<4;i++)O.items.push({typ:'fisch',x:fx+i*28,y:GY()-22});
 if(O.k%4===2)O.items.push({typ:Math.random()<0.5?'turbo':'schal',x:s0+L*action*0.5,y:GY()-95});
 /* Gabelung */
 O.gate={x:F,opts:opts.map((w,i)=>({w,lane:i})),wahl:-1,gesprungen:false,ergebnis:null,bruch:0};
 O.segs.push({x0:F+BL,x1:F+BL+180});       // Landeplatz hinter den Bruecken
 if(O.onFrage)O.onFrage(O.q,O.gate.opts);
}
function pop(text,farbe){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(art==='spritzer'?140:0),life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt'});}
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}

/* waehlen: Knopf, Taste oder Tippen auf die Bruecke */
function lane(i){
 const g=O.gate;if(O.mode!=='play'||!g||g.gesprungen)return false;
 g.wahl=clamp(i|0,0,2);sfx('wahl');return true;
}
function sprung(){
 if(O.mode!=='play')return false;
 const g=O.gate;if(g&&O.x>g.x-ABSPRUNG-40&&O.x<g.x+BL)return false;   // an der Gabelung springt er selbst
 if(O.boden){O.vy=SPRUNG;O.boden=false;O.sprungZahl=1;sfx('hops');teilchen(O.x,O.y,6,['#FFFFFF','#E6F3FB'],80);return true;}
 if(O.sprungZahl===1){O.vy=SPRUNG2;O.sprungZahl=2;sfx('hops2');teilchen(O.x,O.y-20,8,['#FFFFFF','#CFEFFF'],90);return true;}
 return false;
}
function stehtAuf(x){
 for(const s of O.segs)if(x>=s.x0-6&&x<=s.x1+6)return GY();
 return null;
}
function auswerten(){
 const g=O.gate,r=g.opts.find(o=>o.lane===g.wahl);
 if(r.w===O.q){
  g.ergebnis='richtig';O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(10*mult());O.score+=p;pop('+'+p,'#FFE08A');
  teilchen(O.x,O.y-30,22,['#FFE08A','#FFFFFF',LANE_COL[g.wahl]],170);sfx('richtig');
  if(O.turbo>0)O.turbo--;
 }else{
  O.missed.set(O.q.en,O.q);
  if(!O.queue.includes(O.q))O.queue.splice(Math.min(2,O.queue.length),0,O.q);
  if(O.shield){O.shield=false;g.ergebnis='schal';pop('Der Schal hält dich fest!','#9FD3F2');teilchen(O.x,O.y-30,20,['#E7413C','#FFFFFF'],150);sfx('schild');}
  else{g.ergebnis='falsch';O.streak=0;O.turbo=0;g.bruch=0.001;pop('Falsche Brücke!','#FF9A8A');sfx('knack');musik(M=>M.fehler());}
 }
}
function weiter(){
 /* Gabelung erledigt: naechste Vokabel */
 const g=O.gate;O.k++;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;O.gate=null;musik(M=>M.ziel());sfx('ziel');return;}
 abschnitt(g.x+BL+180);
}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.3);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.art==='spritzer'?700:60)*dt;p.vx*=0.98;p.life-=dt*1.3;}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;if(O.mode==='ziel'){O.x+=grundTempo()*dt;}
  if(O.anim>=(O.mode==='ziel'?1.6:1.4)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 if(O.stun>0)O.stun-=dt;if(O.blink>0)O.blink-=dt;
 musik(M=>{M.tempo(tempo());M.turbo(O.turbo>0);});
 const g=O.gate;
 /* Zeitlupe vor der Gabelung, solange noch nicht gewaehlt ist */
 let ziel=1;if(g&&g.wahl<0&&O.x>g.x-ABSPRUNG-260)ziel=0.16;
 O.zeitlupe+= (ziel-O.zeitlupe)*Math.min(1,dt*(ziel<1?6:4));
 /* Absturz ins Wasser: kurz warten, dann weiter auf dem naechsten Eis */
 if(O.faellt>0){
  O.faellt-=dt;O.vy+=GRAV*dt;O.y=Math.min(O.y+O.vy*dt,O.H+80);
  if(O.faellt<=0){
   if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());return;}
   const nach=O.segs.find(s=>s.x1>O.x+20&&s.x0>O.x-400&&s.x0>=O.x-30)||O.segs[O.segs.length-1];
   O.x=Math.max(nach.x0+30,O.x);O.y=GY();O.vy=0;O.boden=true;O.blink=1.2;
   if(g&&g.ergebnis&&O.x>=g.x+BL-10)weiter();
  }
  return;
 }
 let v=speed();
 /* ohne Wahl wartet der Pinguin vor der Gabelung */
 if(g&&g.wahl<0&&O.x+v*dt>g.x-ABSPRUNG){v=Math.max(0,(g.x-ABSPRUNG-O.x)/dt);}
 O.x+=v*dt;
 /* an der Gabelung springt er selbst auf die gewaehlte Bruecke */
 if(g&&g.wahl>=0&&!g.gesprungen&&O.x>=g.x-ABSPRUNG){
  g.gesprungen=true;const h=GY()-brueckeY(g.wahl)+30;
  O.vy=-Math.sqrt(2*GRAV*h);O.boden=false;O.sprungZahl=2;sfx('hops');teilchen(O.x,O.y,8,['#FFFFFF','#E6F3FB'],90);
 }
 /* Schwerkraft und Landen */
 if(!O.boden){
  const yAlt=O.y;O.vy+=GRAV*dt;O.y+=O.vy*dt;
  if(O.vy>0){
   let land=null;
   if(g&&g.gesprungen&&O.x>=g.x-10&&O.x<=g.x+BL){const by=brueckeY(g.wahl);if(yAlt<=by+2&&O.y>=by&&!(g.bruch>0.35))land=by;}
   if(land==null){const sy=stehtAuf(O.x);if(sy!=null&&yAlt<=sy+2&&O.y>=sy)land=sy;}
   if(land!=null){O.y=land;O.vy=0;O.boden=true;O.sprungZahl=0;teilchen(O.x,O.y,6,['#FFFFFF','#E6F3FB'],70);
    if(g&&g.gesprungen&&!g.ergebnis&&O.x>=g.x-10)auswerten();}
  }
 }else{
  /* am Boden: unter den Fuessen noch Eis? */
  const aufBruecke=g&&g.gesprungen&&O.x>=g.x-10&&O.x<=g.x+BL&&Math.abs(O.y-brueckeY(g.wahl))<2;
  if(aufBruecke){if(!g.ergebnis)auswerten();if(g.bruch>0){g.bruch+=dt;if(g.bruch>0.35){O.boden=false;O.vy=0;}}}
  else if(stehtAuf(O.x)==null){O.boden=false;O.vy=0;}
 }
 /* in Spalte oder Wasser gefallen */
 if(!O.boden&&O.y>GY()+40){
  teilchen(O.x,GY()+30,26,['#FFFFFF','#9FD3F2','#2479AE'],220,'spritzer');sfx('platsch');
  if(g&&g.ergebnis==='falsch'&&O.x>=g.x-20&&O.x<=g.x+BL){O.hearts--;}
  else{O.streak=0;O.turbo=0;pop('Platsch – in die Spalte!','#9FD3F2');musik(M=>M.fehler());}
  O.faellt=0.9;O.vy=200;return;
 }
 /* Gabelung geschafft, sobald wieder Eis unter den Fuessen ist */
 if(g&&g.ergebnis&&g.ergebnis!=='falsch'&&O.x>=g.x+BL+4&&O.boden)weiter();
 /* Dinge unterwegs */
 for(const it of O.items){
  if(it.weg||Math.abs(it.x-O.x)>24)continue;
  const dy=Math.abs((O.y-28)-it.y);
  if(it.typ==='fisch'&&dy<30){it.weg=true;O.fish++;const p=Math.round(3*mult());O.score+=p;teilchen(it.x,it.y,5,['#9FD3F2','#FFFFFF'],70);sfx('fisch');}
  else if(it.typ==='robbe'&&!it.getroffen&&O.y>GY()-26&&O.stun<=0){it.getroffen=true;O.stun=0.8;O.streak=0;O.blink=0.8;pop('Robbe im Weg!','#E3C8A0');teilchen(O.x,O.y-20,12,['#FFFFFF','#B9A48A'],120);sfx('robbe');}
  else if(it.typ==='turbo'&&dy<30){it.weg=true;O.turbo=TURBO_GATES;pop('Eis-Turbo! Punkte ×2','#7FE0D0');teilchen(it.x,it.y,20,['#7FE0D0','#FFFFFF'],180);sfx('item');}
  else if(it.typ==='schal'&&dy<30){it.weg=true;O.shield=true;pop('Schal angelegt!','#FF9A8A');teilchen(it.x,it.y,18,['#E7413C','#FFFFFF'],140);sfx('item');}
 }
 /* Robbe uebersprungen? */
 for(const it of O.items)if(it.typ==='robbe'&&!it.getroffen&&!it.ueber&&O.x>it.x+24){it.ueber=true;const p=Math.round(5*mult());O.score+=p;pop('Hüpfer! +'+p,'#B6FFCF');}
 O.items=O.items.filter(it=>it.x>O.x-PX-80);
 O.segs=O.segs.filter(s=>s.x1>O.x-PX-80);
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
 hops:t=>{ton(t,330,660,0.14,'triangle',0.18);},
 hops2:t=>{ton(t,500,1000,0.12,'triangle',0.16);},
 wahl:t=>{ton(t,880,880,0.08,'sine',0.14);},
 richtig:t=>{[784,988,1319].forEach((f,i)=>ton(t+i*0.05,f,f,0.2,'triangle',0.16));zisch(t,6000,9000,0.12,0.12,3);},
 knack:t=>{zisch(t,3000,500,0.4,0.5,1);ton(t,400,110,0.35,'sawtooth',0.1);},
 platsch:t=>{zisch(t,2500,300,0.45,0.5,0.7);ton(t,300,90,0.4,'sine',0.25);},
 fisch:t=>{ton(t,1046,1568,0.08,'sine',0.14);},
 robbe:t=>{ton(t,220,170,0.25,'sawtooth',0.1);ton(t+0.15,200,150,0.3,'sawtooth',0.09);},
 item:t=>{[523,784,1047].forEach((f,i)=>ton(t+i*0.05,f,f,0.25,'triangle',0.16));},
 schild:t=>{[1047,1319,1568].forEach((f,i)=>ton(t+i*0.05,f,f*1.003,0.35,'triangle',0.16));},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.15));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null,cam=0;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
const sx=x=>x-cam;
const wiederhole=(breite,faktor)=>(-(cam*faktor)%breite+breite)%breite;
function himmel(H,gy){
 let g=ctx.createLinearGradient(0,0,0,gy);g.addColorStop(0,'#4F8FD0');g.addColorStop(0.65,'#A9D3F0');g.addColorStop(1,'#E4F3FC');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(!ruhig){ctx.save();ctx.globalAlpha=0.3;for(let k=0;k<2;k++){ctx.beginPath();const y0=gy*(0.16+k*0.1);ctx.moveTo(0,y0);
  for(let x=0;x<=W;x+=12)ctx.lineTo(x,y0+Math.sin(x*0.02+O.time*0.5+k*2)*7+Math.sin(x*0.006-O.time*0.25)*9);
  ctx.lineTo(W,y0+18);ctx.lineTo(0,y0+18);ctx.closePath();const a=ctx.createLinearGradient(0,y0-10,0,y0+20);a.addColorStop(0,'rgba(150,255,200,0)');a.addColorStop(0.5,k?'rgba(170,140,255,.8)':'rgba(120,255,190,.8)');a.addColorStop(1,'rgba(150,255,200,0)');ctx.fillStyle=a;ctx.fill();}ctx.restore();}
 ctx.fillStyle='rgba(255,248,220,.95)';ctx.beginPath();ctx.arc(W*0.78,gy*0.32,22,0,7);ctx.fill();
 /* ferne und nahe Berge */
 for(const [f,farbe,hoch,breite] of [[0.08,'#C9DFF0',0.55,560],[0.22,'#DCEBF6',0.38,420]]){const o=wiederhole(breite,f);
  for(const p of [o-breite,o]){ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(p,gy);
   for(let i=0;i<=8;i++){const x=p+breite*i/8,h=(rnd(i*3.3+breite)*0.6+0.4)*gy*hoch*(i%2?1:0.55);ctx.lineTo(x,gy-h);}ctx.lineTo(p+breite,gy);ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.75)';for(let i=1;i<8;i+=2){const x=p+breite*i/8,h=(rnd(i*3.3+breite)*0.6+0.4)*gy*hoch;ctx.beginPath();ctx.moveTo(x-14,gy-h+22);ctx.lineTo(x,gy-h);ctx.lineTo(x+14,gy-h+22);ctx.fill();}}}
}
function meer(H,gy){
 const g=ctx.createLinearGradient(0,gy+10,0,H);g.addColorStop(0,'#3FA7D6');g.addColorStop(1,'#0B3A5E');ctx.fillStyle=g;ctx.fillRect(0,gy+18,W,H-gy);
 ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=W;x+=8){const y=gy+20+Math.sin((x+cam)*0.05+O.time*3)*2.5;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
}
function eisstueck(x0,x1,gy,H){
 const a=sx(x0),b=sx(x1);if(b<-20||a>W+20)return;
 const g=ctx.createLinearGradient(0,gy,0,H);g.addColorStop(0,'#BFE3F7');g.addColorStop(0.35,'#7FBDE3');g.addColorStop(1,'#2F6E9C');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(a,gy);ctx.lineTo(b,gy);ctx.lineTo(b-6,H);ctx.lineTo(a+6,H);ctx.closePath();ctx.fill();
 ctx.fillStyle='#FFFFFF';rund(a-2,gy-6,b-a+4,12,6);ctx.fill();
 /* Risse und Glanz */
 ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.5;
 for(let x=Math.ceil(x0/70)*70;x<x1-20;x+=70){const s=sx(x),r=rnd(x);ctx.beginPath();ctx.moveTo(s,gy+14);ctx.lineTo(s+8*r,gy+40+30*r);ctx.stroke();}
 /* Eiszapfen an den Kanten */
 ctx.fillStyle='#E6F4FC';for(const [e,d] of [[a,1],[b,-1]]){ctx.beginPath();ctx.moveTo(e,gy+4);ctx.lineTo(e+d*4,gy+26);ctx.lineTo(e+d*8,gy+4);ctx.fill();}
}
function wortschild(x,y,opt,hervor){
 const bw=150,bh=48,farbe=LANE_COL[opt.lane];
 ctx.fillStyle='#6B4E33';ctx.fillRect(x+12,y+bh-4,5,30);
 ctx.save();if(hervor&&!ruhig){ctx.shadowColor=farbe;ctx.shadowBlur=18;}
 ctx.fillStyle='rgba(16,21,28,.94)';rund(x,y,bw,bh,10);ctx.fill();ctx.restore();
 ctx.fillStyle=farbe;rund(x,y,26,bh,10);ctx.fill();ctx.fillRect(x+16,y,10,bh);
 ctx.fillStyle='#10151C';ctx.font='800 13px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(LANE_ZEICHEN[opt.lane],x+13,y+bh/2+1);
 ctx.fillStyle='#FFFFFF';ctx.textAlign='left';
 let fs=17;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';const maxB=bw-36,worte=opt.w.en.split(' ');let zeilen;
 for(;;){zeilen=[];let z='';for(const w of worte){const t=z?z+' '+w:w;if(ctx.measureText(t).width>maxB&&z){zeilen.push(z);z=w;}else z=t;}zeilen.push(z);
  if((zeilen.length<=2&&zeilen.every(l=>ctx.measureText(l).width<=maxB))||fs<=11)break;fs--;ctx.font='700 '+fs+'px Inter, system-ui, sans-serif';}
 zeilen.slice(0,2).forEach((l,n,a)=>ctx.fillText(l,x+32,y+bh/2+1+(n-(a.length-1)/2)*fs*1.15));
}
function gabelung(g,H,gy){
 const a=sx(g.x),b=sx(g.x+BL);if(b<-40||a>W+420)return;
 for(let i=0;i<3;i++){
  const y=brueckeY(i),gewaehlt=g.wahl===i;let dy=0,alpha=1;
  if(gewaehlt&&g.bruch>0){dy=Math.max(0,g.bruch-0.3)*600;alpha=Math.max(0,1-Math.max(0,g.bruch-0.3)*2);}
  ctx.globalAlpha=alpha;
  /* Pfeiler */
  if(i<2){ctx.fillStyle='rgba(127,189,227,.85)';for(const p of [a+30,b-30])ctx.fillRect(p-5,y+12,10,gy-y+10);}
  /* Brett aus Eis */
  const gr=ctx.createLinearGradient(0,y-6,0,y+14);gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#8CC8EC');ctx.fillStyle=gr;
  rund(a,y-6+dy,b-a,18,8);ctx.fill();
  ctx.fillStyle=LANE_COL[i];ctx.fillRect(a+6,y+8+dy,b-a-12,3);
  if(gewaehlt&&g.bruch>0){ctx.strokeStyle='#2F6E9C';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx(O.x)-20,y-4+dy);ctx.lineTo(sx(O.x)-6,y+6+dy);ctx.lineTo(sx(O.x)+10,y-2+dy);ctx.lineTo(sx(O.x)+22,y+10+dy);ctx.stroke();}
  ctx.fillStyle='#E6F4FC';for(let x=a+14;x<b-10;x+=22){ctx.beginPath();ctx.moveTo(x,y+12+dy);ctx.lineTo(x+3,y+22+dy+(x%3)*3);ctx.lineTo(x+6,y+12+dy);ctx.fill();}
  ctx.globalAlpha=1;
 }
 /* Wortschilder am Anfang der Bruecken */
 if(!g.ergebnis)for(const opt of g.opts){const y=brueckeY(opt.lane);wortschild(clamp(a+8,PX+40,W-158),y-58,opt,g.wahl===opt.lane||O.zeitlupe<0.6);}
}
function itemZeichnen(it){
 const x=sx(it.x),y=it.y;if(it.weg||x<-40||x>W+40)return;
 if(it.typ==='fisch'){ctx.save();ctx.translate(x,y+Math.sin(O.time*5+it.x)*2);ctx.rotate(Math.sin(O.time*8+it.x)*0.2);
  ctx.fillStyle='#5B9CC9';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(14,-6);ctx.lineTo(14,6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#8EC6EA';ctx.beginPath();ctx.ellipse(0,0,10,5.5,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.ellipse(-1,1.5,7,1.8,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2B3F';ctx.beginPath();ctx.arc(-6,-1,1.3,0,7);ctx.fill();ctx.restore();}
 else if(it.typ==='robbe'){ctx.save();ctx.translate(x,y);const hop=it.getroffen?0:Math.sin(O.time*2+it.x)*1.5;
  ctx.fillStyle='rgba(40,70,110,.25)';ctx.beginPath();ctx.ellipse(0,0,32,6,0,0,7);ctx.fill();
  ctx.fillStyle='#8C9AA8';ctx.beginPath();ctx.ellipse(0,-12+hop,30,13,0,0,7);ctx.fill();ctx.fillStyle='#A9B6C2';ctx.beginPath();ctx.ellipse(-2,-7+hop,20,6,0,0,7);ctx.fill();
  ctx.fillStyle='#7D8B99';ctx.beginPath();ctx.arc(24,-20+hop,11,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-26,-10);ctx.lineTo(-40,-20);ctx.lineTo(-38,-2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#10151C';ctx.beginPath();ctx.arc(28,-23+hop,1.8,0,7);ctx.fill();ctx.beginPath();ctx.arc(34,-19+hop,2,0,7);ctx.fill();
  if(!it.getroffen&&Math.sin(O.time*1.5+it.x)>0.5){ctx.fillStyle='#FFFFFF';ctx.font='700 11px Inter, system-ui, sans-serif';ctx.textAlign='left';ctx.fillText('zzz',18,-38);}ctx.restore();}
 else{const col=it.typ==='turbo'?'#7FE0D0':'#E7413C',yy=y+Math.sin(O.time*4+it.x)*3;
  ctx.save();if(!ruhig){ctx.shadowColor=col;ctx.shadowBlur=14;}ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,yy,14,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2.2;
  if(it.typ==='turbo'){ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+O.time*2;ctx.moveTo(x,yy);ctx.lineTo(x+Math.cos(a)*9,yy+Math.sin(a)*9);}ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(x-8,yy-3);ctx.quadraticCurveTo(x,yy+4,x+8,yy-3);ctx.moveTo(x+3,yy);ctx.lineTo(x+5,yy+8);ctx.stroke();}}
}
function hud(H){
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#9FD3F2');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='#10151C';ctx.textAlign='left';ctx.fillText('PINGUIN',6,ly+4);ctx.textAlign='right';ctx.fillText('MEER',W-6,ly+4);
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,30,66,18,9);ctx.fill();
 ctx.fillStyle=O.turbo>0?'#7FE0D0':'#FFE08A';ctx.textAlign='center';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(1).replace('.',','),W-41,39.5);
}
function zeichne(cv){
 if(!cv||!cv.getContext)return;ctx=ctx||cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=cv.clientWidth,ch=cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const sk=cw/W,H=ch/sk;
 if(Math.abs(H-O.H)>1){const alt=GY();O.H=H;const neu=GY();if(O.boden||O.faellt<=0)O.y+=neu-alt;}
 ctx.setTransform(dpr*sk,0,0,dpr*sk,0,0);ctx.globalAlpha=1;
 cam=O.x-PX;const gy=GY();
 himmel(H,gy);meer(H,gy);
 for(const s of O.segs)eisstueck(s.x0,s.x1,gy,H);
 if(O.gate)gabelung(O.gate,H,gy);
 for(const it of O.items)itemZeichnen(it);
 /* Pinguin */
 const lauf=O.boden&&O.mode==='play'?Math.abs(Math.sin(O.time*14))*4*Math.min(1,speed()/120):0,luft=!O.boden;
 if(!(O.blink>0&&Math.floor(O.time*14)%2===0)){
  if(O.boden){ctx.fillStyle='rgba(40,70,110,.25)';ctx.beginPath();ctx.ellipse(PX,O.y,16,4,0,0,7);ctx.fill();}
  const rot=luft?clamp(O.vy/1600,-0.35,0.35):Math.sin(O.time*14)*0.08;
  window.Figuren&&window.Figuren.pinguin(ctx,PX,O.y,1.3,{hop:lauf,wave:luft?1:Math.sin(O.time*14)*0.5,hoch:luft&&O.vy<0,blush:true,rot,mood:O.stun>0?'scared':(O.gate&&O.gate.ergebnis==='richtig'?'happy':'focus'),scarf:O.shield});
  if(O.shield){ctx.fillStyle='#E7413C';ctx.fillRect(PX-12,O.y-40,24,5);ctx.fillRect(PX+6,O.y-38,5,14);}
 }
 if(O.turbo>0&&!ruhig){ctx.strokeStyle='rgba(127,224,208,.65)';ctx.lineWidth=2;for(let i=0;i<4;i++){const y=O.y-12-i*12;ctx.beginPath();ctx.moveTo(PX-20,y);ctx.lineTo(PX-50-((O.time*400+i*30)%40),y);ctx.stroke();}}
 for(const p of O.parts){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.farbe;ctx.beginPath();ctx.arc(sx(p.x)+(p.x>1e5?0:0),p.y,p.r,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 /* Zeitlupe: Hinweis und dunkler Rand */
 if(O.zeitlupe<0.95&&O.gate&&O.gate.wahl<0){const a=1-O.zeitlupe;
  const v=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.75);v.addColorStop(0,'rgba(16,21,28,0)');v.addColorStop(1,'rgba(16,21,28,'+0.45*a+')');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=a;ctx.fillStyle='rgba(16,21,28,.85)';rund(W/2-130,56,260,30,15);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.font='700 14px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('Tippe auf die richtige Brücke!',W/2,71.5);ctx.globalAlpha=1;}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 18px Inter, system-ui, sans-serif';
 O.pops.forEach((p,n)=>{const a=Math.max(0,1-p.t/1.3),y=gy-150-n*24-p.t*26;ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.85)';ctx.lineWidth=4;ctx.strokeText(p.text,PX+60,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,PX+60,y);});
 ctx.globalAlpha=1;
 hud(H);
 if(O.mode==='ziel'){ctx.fillStyle='rgba(255,255,255,'+Math.min(0.85,O.anim*0.6)+')';ctx.fillRect(0,0,W,H);}
}
/* Tippen: auf eine Bruecke (oder ihr Schild) = waehlen, sonst = springen */
function tipp(cv,clientX,clientY){
 const r=cv.getBoundingClientRect(),gx=(clientX-r.left)/r.width*W,gyp=(clientY-r.top)/r.width*W,g=O.gate;
 if(g&&!g.gesprungen&&(O.zeitlupe<0.9||sx(g.x)<W)&&gx>PX+30){
  let best=-1,bd=60;for(let i=0;i<3;i++){const d=Math.min(Math.abs(gyp-brueckeY(i)),Math.abs(gyp-(brueckeY(i)-34)));if(d<bd){bd=d;best=i;}}
  if(best>=0){lane(best);return;}
 }
 sprung();
}

window.BWPinguin={O,start,update,zeichne,lane,sprung,tipp,brueckeY,GY,GOAL,HEARTS,BL,ABSPRUNG,speed,grundTempo,mult,LANE_COL,LANE_ZEICHEN,
 ding:'Brücke',hinweis:'Tippen = springen · an der Gabelung auf die richtige Brücke tippen | Tastatur: Leertaste oder ↑ = springen, 1 2 3 = Brücke · P = Pause',
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
