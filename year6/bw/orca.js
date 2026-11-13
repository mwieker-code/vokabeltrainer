/* =========================================================================
   ORCA RUSH - Kapitel 2 von Black & White (Year 6, Unit 2)

   Seitenansicht. Der Orca schwimmt von links nach rechts durchs
   Suedpolarmeer, die Welt zieht vorbei. Man lenkt ihn frei nach oben und
   unten: Finger auf das Bild legen und ziehen (oder Pfeiltasten, oder die
   drei Knoepfe fuer oben, Mitte, unten).

   Oben steht das deutsche Wort. Drei Fischschwaerme kommen entgegen, in
   drei Tiefen, jeder mit einem englischen Wort. Durch den richtigen
   schwimmen = fressen. Der falsche kostet ein Herz.

   Dazu:
   - Luft: Unter Wasser wird sie knapp. An der Oberflaeche atmet der Orca.
     Schnell nach oben ziehen = Sprung aus dem Wasser (volle Luft).
   - Nordlicht-Ringe ueber dem Wasser: im Sprung durchfliegen = Bonus.
   - Krill gibt Punkte, Quallen betaeuben (Serie weg, kein Herz).
   - Stroemung (Turbo): schneller und doppelte Punkte fuer drei Schwaerme.
   - Blase (Schild): faengt einen falschen Schwarm ab.
   - Jede richtige Antwort in Folge macht schneller. Eine Mindestlesezeit
     gilt immer.

   Die Logik (start, update, steerTo, lane) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
const W=360,GOAL=16,HEARTS=3,MINREAD=3.3,AIR_DRAIN=1/15,TURBO_GATES=3;
const LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['▲','●','▼'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

/* ---------------------------------------------------------------- Zustand */
const O={mode:'aus',H:560,k:0,hearts:HEARTS,score:0,streak:0,best:0,air:1,y:0,vy:0,ty:0,air_t:0,
 airborne:false,rot:0,tail:0,scroll:0,time:0,gate:null,old:[],items:[],pops:[],parts:[],
 turbo:0,shield:false,stun:0,anim:0,q:null,queue:[],pool:[],missed:new Map(),krill:0,jumps:0,rings:0,
 onEnd:null,onFrage:null};
const ORCA_X=96;
const SURF=()=>O.H*0.24,BED=()=>O.H-26;
const laneY=i=>{const s=SURF(),b=BED();return s+(b-s)*[0.2,0.5,0.8][i];};
function laneOf(y){
 if(y<SURF()-2)return -1;
 const a=(laneY(0)+laneY(1))/2,b=(laneY(1)+laneY(2))/2;
 return y<a?0:y<b?1:2;
}
const tempo=()=>1+0.06*Math.min(O.streak,10);
const speed=()=>(128+3*O.k)*tempo()*(O.turbo>0?1.45:1)*(O.stun>0?0.55:1);
const mult=()=>tempo()*(O.turbo>0?2:1);
const gapFor=v=>Math.max(430,v*MINREAD);

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,air:1,vy:0,airborne:false,rot:0,
  scroll:0,time:0,old:[],items:[],pops:[],parts:[],turbo:0,shield:false,stun:0,anim:0,missed:new Map(),krill:0,jumps:0,rings:0,
  onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 O.y=O.ty=laneY(1);
 neuesTor(560);
}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
function schwarm(lane,x){
 const n=9,fische=[];
 for(let i=0;i<n;i++)fische.push({dx:(rnd(i*3.1+x)-0.5)*54,dy:(rnd(i*7.7+x*0.3)-0.5)*34,ph:rnd(i+x)*6,s:0.8+rnd(i*1.9)*0.4});
 return fische;
}
function neuesTor(abstand){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 const lanes=mische([0,1,2]),opts=mische([O.q,...falsche(O.q)]);
 const x=abstand||gapFor(speed());
 O.gate={x,opts:opts.map((w,i)=>({w,lane:lanes[i],fish:schwarm(lanes[i],x+i)}))};
 O.gate.opts.sort((a,b)=>a.lane-b.lane);
 /* zwischen den Schwaermen: Krill, Qualle, manchmal ein Ring oder ein Item -
    so verteilt, dass jede Tiefe am Tor erreichbar bleibt */
 if(O.k>0){
  const kl=Math.floor(Math.random()*3);
  for(let i=0;i<5;i++)O.items.push({typ:'krill',x:x*0.22+i*16,y:laneY(kl)+Math.sin(i*0.9)*10});
  if(O.k>=2){const ql=Math.floor(Math.random()*3);O.items.push({typ:'qualle',x:x*0.55,y:laneY(ql)+(Math.random()-0.5)*16,ph:Math.random()*6});}
  if(O.k%3===1)O.items.push({typ:'ring',x:x*0.42,y:SURF()-58});
  if(O.k%4===2)O.items.push({typ:Math.random()<0.5?'turbo':'blase',x:x*0.7,y:laneY(Math.floor(Math.random()*3))});
 }
 if(O.onFrage)O.onFrage(O.q,O.gate.opts);
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}
function pop(text,farbe,y){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0,y:y==null?O.y-40:y});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt'});}
}
function torAuswerten(){
 const g=O.gate,l=laneOf(O.y),treffer=g.opts.find(o=>o.lane===l);
 O.old.push({opts:g.opts,x:0,t:0,richtig:treffer&&treffer.w===O.q?treffer.lane:-1,gegessen:treffer?treffer.lane:-1});
 if(treffer&&treffer.w===O.q){
  O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(10*mult());O.score+=p;pop('+'+p,'#FFE08A');
  teilchen(ORCA_X+30,O.y,16,['#FFE08A','#FFFFFF',LANE_COL[treffer.lane]],120);
  sfx('happs');
  if(O.turbo>0)O.turbo--;
 }else{
  O.missed.set(O.q.en,O.q);
  if(!O.queue.includes(O.q))O.queue.splice(Math.min(2,O.queue.length),0,O.q);
  if(O.shield){O.shield=false;pop('Die Blase hält!','#9FD3F2');teilchen(ORCA_X,O.y,22,['#CFEFFF','#FFFFFF'],160);sfx('blase');}
  else{O.hearts--;O.streak=0;O.turbo=0;pop(l<0?'Verpasst – zu hoch!':'Falscher Schwarm!','#FF9A8A');sfx('falsch');O.anim=0;musik(M=>M.fehler());
   if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());}}
 }
 O.k++;
 if(O.mode==='lost')return;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;O.gate=null;sfx('ziel');musik(M=>M.ziel());return;}
 neuesTor();
}
function steerTo(y){O.ty=clamp(y,SURF()-70,BED()-14);}
function lane(i){steerTo(laneY(i));}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.2);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.art==='spritzer'?520:-18)*dt;p.vx*=0.98;p.life-=dt*(p.art==='blasen'?0.7:1.3);}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;O.scroll+=dt*(O.mode==='ziel'?speed():30);
  if(O.mode==='lost'){O.vy-=200*dt;O.y+=O.vy*dt*0.3;}
  if(O.anim>=(O.mode==='ziel'?1.6:1.4)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 const v=speed(),d=v*dt;O.scroll+=d;O.tail+=dt*(5+v/40);
 musik(M=>{M.tempo(tempo());M.turbo(O.turbo>0);});
 if(O.stun>0)O.stun-=dt;
 /* Bewegung: Feder zum Ziel, an der Oberflaeche der Sprung */
 const s=SURF();
 if(O.airborne){
  O.vy+=1150*dt;O.y+=O.vy*dt;O.rot=Math.atan2(O.vy,v)*0.9;
  if(O.y>s&&O.vy>0){O.airborne=false;O.air=1;O.vy*=0.35;teilchen(ORCA_X,s,26,['#FFFFFF','#CFEFFF','#9FD3F2'],230,'spritzer');sfx('platsch');O.ty=Math.max(O.ty,s+30);}
 }else{
  const k=70,da=2*Math.sqrt(k);
  O.vy+=((O.ty-O.y)*k-O.vy*da)*dt;O.vy=clamp(O.vy,-460,460);O.y+=O.vy*dt;
  if(O.y<s+2){
   if(O.vy<-170){O.airborne=true;O.vy=Math.max(-560,O.vy*1.25);O.jumps++;O.score+=5;
    teilchen(ORCA_X,s,30,['#FFFFFF','#CFEFFF','#9FD3F2'],260,'spritzer');sfx('sprung');}
   else{O.y=s+2;if(O.vy<0)O.vy=0;}
  }
  O.y=Math.min(O.y,BED()-12);
  O.rot=lerp(O.rot,clamp(O.vy/v,-0.7,0.7)*0.8,Math.min(1,dt*10));
 }
 /* Luft */
 if(!O.airborne&&O.y<s+16){if(O.air<1&&Math.random()<dt*6)teilchen(ORCA_X+18,s-4,2,['#FFFFFF'],60,'spritzer');O.air=Math.min(1,O.air+dt*0.9);}
 else if(!O.airborne){O.air-=dt*AIR_DRAIN;
  if(O.air<=0){O.air=0.45;O.hearts--;O.streak=0;pop('Luft holen!','#FF9A8A');sfx('falsch');musik(M=>M.fehler());if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());return;}}}
 /* Blasen hinter dem Orca */
 if(!O.airborne&&Math.random()<dt*(6+v/30))O.parts.push({x:ORCA_X-40,y:O.y+(Math.random()-0.5)*10,vx:-v*0.4,vy:-20-Math.random()*30,life:1,farbe:'#DFF5FF',r:1.5+Math.random()*2.5,art:'blasen'});
 /* Welt bewegt sich */
 for(const it of O.items)it.x-=d;
 for(const o of O.old){o.x-=d;o.t+=dt;}
 O.old=O.old.filter(o=>o.x>-W);
 /* Dinge einsammeln */
 for(const it of O.items){
  if(it.weg||Math.abs(it.x)>22)continue;
  const dy=Math.abs(it.y-O.y);
  if(it.typ==='krill'&&dy<20){it.weg=true;O.krill++;const p=Math.round(2*mult());O.score+=p;teilchen(ORCA_X+20,it.y,4,['#FF9DB8','#FFFFFF'],60);sfx('krill');}
  else if(it.typ==='qualle'&&dy<22&&O.stun<=0){it.weg=true;O.stun=0.9;O.streak=0;pop('Qualle – autsch!','#E3A5FF');teilchen(ORCA_X+20,it.y,14,['#E3A5FF','#FFFFFF'],120);sfx('qualle');}
  else if(it.typ==='ring'&&O.airborne&&dy<30){it.weg=true;O.rings++;const p=Math.round(30*mult());O.score+=p;pop('Nordlicht! +'+p,'#B6FFCF',it.y-20);teilchen(ORCA_X,it.y,26,['#B6FFCF','#7FE0D0','#FFFFFF'],180);sfx('ring');}
  else if(it.typ==='turbo'&&dy<24){it.weg=true;O.turbo=TURBO_GATES;pop('Strömung! Punkte ×2','#7FE0D0');teilchen(ORCA_X,O.y,20,['#7FE0D0','#FFFFFF'],180);sfx('item');}
  else if(it.typ==='blase'&&dy<24){it.weg=true;O.shield=true;pop('Schutzblase!','#CFEFFF');teilchen(ORCA_X,O.y,20,['#CFEFFF','#FFFFFF'],150);sfx('item');}
 }
 O.items=O.items.filter(it=>it.x>-60&&!(it.weg&&it.x<-10));
 /* Tor */
 if(O.gate){O.gate.x-=d;if(O.gate.x<=0)torAuswerten();}
}

/* ---------------------------------------------------------------- Klang */
let ac=null,bus=null;
function toeneAn(){try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}}
function audio(){
 if(!toeneAn())return null;
 try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A();bus=ac.createGain();bus.gain.value=0.5;bus.connect(ac.destination);}
  if(ac.state==='suspended')ac.resume();return ac;}catch(e){return null;}
}
function ton(t,f1,f2,dauer,typ,laut){const o=ac.createOscillator(),g=ac.createGain();o.type=typ||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dauer*0.9);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);o.connect(g);g.connect(bus);o.start(t);o.stop(t+dauer+0.03);}
let rausch=null;
function zisch(t,f1,f2,dauer,laut,q){
 if(!rausch){rausch=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=rausch.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=rausch;f.type='bandpass';f.Q.value=q||1;
 f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+dauer);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+dauer*0.2);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+dauer+0.03);}
const KLANG={
 happs:t=>{ton(t,220,90,0.14,'sine',0.5);zisch(t,1500,500,0.1,0.25,2);ton(t+0.05,660,990,0.12,'triangle',0.18);ton(t+0.1,990,1320,0.14,'triangle',0.14);},
 falsch:t=>{ton(t,330,150,0.3,'sawtooth',0.12);ton(t+0.12,247,110,0.35,'sawtooth',0.1);},
 sprung:t=>{zisch(t,400,3000,0.35,0.45,0.8);ton(t,180,520,0.3,'sine',0.2);},
 platsch:t=>{zisch(t,2500,300,0.45,0.55,0.7);ton(t,140,60,0.25,'sine',0.35);},
 krill:t=>{ton(t,1568,1760,0.06,'sine',0.12);},
 qualle:t=>{ton(t,880,220,0.3,'square',0.08);zisch(t,4000,2000,0.2,0.15,4);},
 ring:t=>{[784,988,1175,1568].forEach((f,i)=>ton(t+i*0.06,f,f*1.01,0.3,'triangle',0.16));},
 item:t=>{[523,784,1047].forEach((f,i)=>ton(t+i*0.05,f,f,0.25,'triangle',0.16));},
 blase:t=>{for(let i=0;i<5;i++)ton(t+i*0.04,400+i*180,700+i*200,0.08,'sine',0.15);},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.17));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
const wiederhole=(breite,faktor)=>(-(O.scroll*faktor)%breite+breite)%breite;
function himmel(H,s){
 let g=ctx.createLinearGradient(0,0,0,s);g.addColorStop(0,'#5E9ED6');g.addColorStop(0.7,'#B8DDF4');g.addColorStop(1,'#EAF6FC');ctx.fillStyle=g;ctx.fillRect(0,0,W,s);
 /* Nordlicht */
 if(!ruhig){ctx.save();ctx.globalAlpha=0.35;for(let k=0;k<3;k++){ctx.beginPath();const y0=s*(0.18+k*0.1);ctx.moveTo(0,y0);
  for(let x=0;x<=W;x+=12)ctx.lineTo(x,y0+Math.sin(x*0.02+O.time*0.6+k*2)*8+Math.sin(x*0.007-O.time*0.3)*10);
  ctx.lineTo(W,y0+20);ctx.lineTo(0,y0+20);ctx.closePath();const a=ctx.createLinearGradient(0,y0-10,0,y0+22);a.addColorStop(0,'rgba(150,255,200,0)');a.addColorStop(0.5,k===1?'rgba(170,140,255,.8)':'rgba(120,255,190,.8)');a.addColorStop(1,'rgba(150,255,200,0)');ctx.fillStyle=a;ctx.fill();}ctx.restore();}
 ctx.fillStyle='rgba(255,248,220,.95)';ctx.beginPath();ctx.arc(W*0.6,s*0.5,s*0.11,0,7);ctx.fill();
 /* Eisberge am Horizont (langsam) */
 const off=wiederhole(520,0.06);
 for(const o of [off-520,off]){ctx.fillStyle='#D3E8F6';ctx.beginPath();ctx.moveTo(o,s);
  [[40,0.55],[90,0.3],[140,0.62],[210,0.2],[260,0.5],[330,0.68],[380,0.35],[450,0.58],[520,0]].forEach(([x,hh])=>ctx.lineTo(o+x,s-s*0.42*hh));ctx.lineTo(o+520,s);ctx.fill();
  ctx.fillStyle='#F4FAFE';ctx.beginPath();ctx.moveTo(o+120,s);ctx.lineTo(o+140,s-s*0.26);ctx.lineTo(o+175,s);ctx.moveTo(o+305,s);ctx.lineTo(o+330,s-s*0.29);ctx.lineTo(o+360,s);ctx.fill();}
}
function wasser(H,s){
 let g=ctx.createLinearGradient(0,s,0,H);g.addColorStop(0,'#3FA7D6');g.addColorStop(0.45,'#1C6E9E');g.addColorStop(1,'#08243D');ctx.fillStyle=g;ctx.fillRect(0,s,W,H-s);
 /* Lichtstrahlen */
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let k=0;k<5;k++){const x=((k*97-O.scroll*0.15)%(W+120)+W+120)%(W+120)-60,b=18+((k*31)%20),l=ctx.createLinearGradient(0,s,0,H*0.9);
  l.addColorStop(0,'rgba(200,240,255,'+(0.13+0.05*Math.sin(O.time+k))+')');l.addColorStop(1,'rgba(200,240,255,0)');ctx.fillStyle=l;
  ctx.beginPath();ctx.moveTo(x-b/2,s);ctx.lineTo(x+b/2,s);ctx.lineTo(x+b/2+H*0.35,H*0.9);ctx.lineTo(x-b/2+H*0.25,H*0.9);ctx.fill();}
 /* Kaustik unter der Oberflaeche */
 ctx.strokeStyle='rgba(220,248,255,.18)';ctx.lineWidth=1.5;
 for(let r=0;r<3;r++){ctx.beginPath();const y=s+10+r*9;for(let x=0;x<=W;x+=8){const yy=y+Math.sin((x+O.scroll*0.9)*0.06+O.time*2+r)*2.5;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
 ctx.restore();
 /* ferne Wale (Silhouetten, halbe Geschwindigkeit) */
 ctx.fillStyle='rgba(8,36,61,.35)';
 const wo=wiederhole(900,0.35);
 for(const o of [wo-900,wo]){silhouette(o+250,s+(H-s)*0.62,0.9);silhouette(o+690,s+(H-s)*0.4,0.6);}
}
function silhouette(x,y,k){ctx.save();ctx.translate(x,y+Math.sin(O.time*0.8+x)*3);ctx.scale(k,k);ctx.beginPath();ctx.moveTo(60,0);ctx.bezierCurveTo(50,-16,0,-20,-30,-10);ctx.lineTo(-60,-22);ctx.lineTo(-52,0);ctx.lineTo(-60,22);ctx.lineTo(-30,10);ctx.bezierCurveTo(0,20,50,16,60,0);ctx.fill();ctx.beginPath();ctx.moveTo(-2,-16);ctx.lineTo(8,-38);ctx.lineTo(14,-15);ctx.fill();ctx.restore();}
function grund(H){
 const b=H-26;
 ctx.fillStyle='#071E33';ctx.beginPath();ctx.moveTo(0,H);const o=wiederhole(240,1);
 for(let x=-240;x<=W+240;x+=24){const xx=x+o,yy=b+6-Math.abs(Math.sin((x-o+O.scroll)*0.013))*0+((Math.floor((x-o+O.scroll)/24)%5+5)%5)*3;ctx.lineTo(xx,yy);}
 ctx.lineTo(W,H);ctx.closePath();ctx.fill();
 /* Felsen und Tang */
 const r=wiederhole(300,1);
 for(const p of [r-300,r]){
  ctx.fillStyle='#0B2C46';ctx.beginPath();ctx.ellipse(p+60,b+8,30,16,0,Math.PI,0);ctx.fill();ctx.beginPath();ctx.ellipse(p+215,b+6,22,12,0,Math.PI,0);ctx.fill();
  ctx.strokeStyle='#1E6B5A';ctx.lineWidth=4;ctx.lineCap='round';
  for(const [x,hh,ph] of [[30,58,0],[44,40,1],[150,70,2],[168,48,3],[250,52,4],[262,36,5]]){
   ctx.beginPath();ctx.moveTo(p+x,b+8);ctx.quadraticCurveTo(p+x+Math.sin(O.time*1.4+ph)*12,b-hh*0.5,p+x+Math.sin(O.time*1.1+ph*2)*9,b-hh);ctx.stroke();}
 }
}
function schnee(H,s){
 ctx.fillStyle='rgba(225,245,255,.5)';
 for(let i=0;i<42;i++){const f=0.5+rnd(i)*0.9,x=((rnd(i*3.3)*W*1.5-O.scroll*f)%(W*1.5)+W*1.5)%(W*1.5)-W*0.25,y=s+((rnd(i*7.1)*(H-s)+O.time*8*f)%(H-s));
  ctx.globalAlpha=0.3+0.4*rnd(i*5);ctx.fillRect(x,y,f*2,f*2);}
 ctx.globalAlpha=1;
}
function oberflaeche(s){
 ctx.save();ctx.beginPath();ctx.moveTo(0,s);
 for(let x=0;x<=W;x+=6)ctx.lineTo(x,s+Math.sin((x+O.scroll)*0.05+O.time*3)*2.2+Math.sin((x+O.scroll*1.3)*0.11-O.time*4)*1.2);
 ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.5;ctx.stroke();ctx.restore();
 /* treibende Eisschollen (Deko) */
 const o=wiederhole(640,1);
 for(const p of [o-640,o]){for(const [x,b] of [[80,46],[400,70]]){const xx=p+x;
  ctx.fillStyle='#BFE0F2';ctx.beginPath();ctx.moveTo(xx-b/2,s+2);ctx.lineTo(xx+b/2,s+2);ctx.lineTo(xx+b/2-6,s+9);ctx.lineTo(xx-b/2+5,s+9);ctx.fill();
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.moveTo(xx-b/2,s+2);ctx.lineTo(xx-b/2+6,s-6);ctx.lineTo(xx+b/2-8,s-7);ctx.lineTo(xx+b/2,s+2);ctx.fill();}}
}
function fischlein(x,y,k,farbe,ph,flucht){
 ctx.save();ctx.translate(x,y);ctx.scale(-k,k);ctx.rotate(Math.sin(O.time*10+ph)*0.15+(flucht||0));
 ctx.fillStyle=farbe;ctx.beginPath();ctx.ellipse(0,0,7,3.6,0,0,7);ctx.fill();
 ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(11,-4);ctx.lineTo(11,4);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.ellipse(-1,1.2,4.5,1.3,0,0,7);ctx.fill();
 ctx.fillStyle='#10151C';ctx.beginPath();ctx.arc(-4.2,-0.8,0.9,0,7);ctx.fill();ctx.restore();
}
function schwarmZeichnen(opt,x,alt){
 const yc=laneY(opt.lane),farbe=LANE_COL[opt.lane];
 if(!alt){ctx.save();ctx.globalAlpha=0.16;const g=ctx.createRadialGradient(x,yc,4,x,yc,46);g.addColorStop(0,farbe);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,yc,46,0,7);ctx.fill();ctx.restore();}
 for(const f of opt.fish){
  let fx=x+f.dx+Math.sin(O.time*2+f.ph)*4,fy=yc+f.dy+Math.cos(O.time*2.3+f.ph)*3,a=1,flucht=0;
  if(alt){const t=alt.t;if(alt.gegessen===opt.lane&&alt.richtig===opt.lane){const u=Math.min(1,t*4);fx=lerp(fx,ORCA_X+28+alt.x,u);fy=lerp(fy,O.y,u);a=1-u;}
   else{fx+=f.dx*t*3;fy+=f.dy*t*3;a=Math.max(0,1-t*1.2);flucht=f.dy*0.04*t;}}
  if(a<=0)continue;ctx.globalAlpha=a;fischlein(fx,fy,f.s*1.15,farbe,f.ph,flucht);
 }
 ctx.globalAlpha=1;
}
function etikett(opt,x){
 const yc=laneY(opt.lane),farbe=LANE_COL[opt.lane];
 ctx.font='700 14px Inter, system-ui, sans-serif';
 const text=opt.w.en,tw=Math.min(190,ctx.measureText(text).width),bw=tw+30,bh=26;
 const lx=clamp(x,ORCA_X+bw/2+28,W-bw/2-6),ly=yc-34;
 ctx.fillStyle='rgba(16,21,28,.9)';rund(lx-bw/2,ly-bh/2,bw,bh,13);ctx.fill();
 ctx.fillStyle=farbe;ctx.beginPath();ctx.arc(lx-bw/2+13,ly,8,0,7);ctx.fill();
 ctx.fillStyle='#10151C';ctx.font='800 9px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(LANE_ZEICHEN[opt.lane],lx-bw/2+13,ly+0.5);
 ctx.fillStyle='#FFFFFF';ctx.font='700 14px Inter, system-ui, sans-serif';ctx.textAlign='left';
 let t=text;while(ctx.measureText(t).width>tw&&t.length>3)t=t.slice(0,-2);if(t!==text)t=t.slice(0,-1)+'…';
 ctx.fillText(t,lx-bw/2+25,ly+0.5);
 /* Pfeil zum Schwarm, solange das Schild am Rand wartet */
 if(lx<x-4){ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(lx+bw/2+2,ly-5);ctx.lineTo(lx+bw/2+8,ly);ctx.lineTo(lx+bw/2+2,ly+5);ctx.fill();}
}
function itemZeichnen(it){
 if(it.weg)return;const x=ORCA_X+it.x,y=it.y;if(x<-40||x>W+40)return;
 if(it.typ==='krill'){ctx.fillStyle='#FF9DB8';ctx.beginPath();ctx.arc(x,y+Math.sin(O.time*4+it.x)*2,2.6,0,7);ctx.fill();ctx.fillStyle='rgba(255,157,184,.25)';ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fill();}
 else if(it.typ==='qualle'){const p=Math.sin(O.time*3+it.ph),yy=y+p*5;
  ctx.save();ctx.globalAlpha=0.9;const g=ctx.createRadialGradient(x,yy-4,2,x,yy,18);g.addColorStop(0,'#F6D6FF');g.addColorStop(1,'rgba(200,120,255,.35)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,yy,16+p*1.5,12-p*1.5,0,Math.PI,0);ctx.fill();
  ctx.strokeStyle='rgba(230,170,255,.8)';ctx.lineWidth=1.6;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x+i*5,yy);ctx.quadraticCurveTo(x+i*5+Math.sin(O.time*4+i)*5,yy+12,x+i*4,yy+24+p*3);ctx.stroke();}ctx.restore();}
 else if(it.typ==='ring'){ctx.save();ctx.lineWidth=5;const g=ctx.createLinearGradient(x,y-26,x,y+26);g.addColorStop(0,'#B6FFCF');g.addColorStop(1,'#9B8CFF');ctx.strokeStyle=g;
  if(!ruhig){ctx.shadowColor='#B6FFCF';ctx.shadowBlur=14;}ctx.beginPath();ctx.ellipse(x,y,10,24,0,0,7);ctx.stroke();ctx.restore();}
 else{const col=it.typ==='turbo'?'#7FE0D0':'#CFEFFF',r=13,yy=y+Math.sin(O.time*3+it.x)*3;
  ctx.save();if(!ruhig){ctx.shadowColor=col;ctx.shadowBlur=16;}ctx.fillStyle=it.typ==='turbo'?'rgba(127,224,208,.85)':'rgba(207,239,255,.35)';ctx.beginPath();ctx.arc(x,yy,r,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2;
  if(it.typ==='turbo'){ctx.beginPath();for(let a=0;a<4.4;a+=0.3){const rr=2+a*2;ctx.lineTo(x+Math.cos(a*2+O.time*6)*rr,yy+Math.sin(a*2+O.time*6)*rr);}ctx.stroke();}
  else{ctx.beginPath();ctx.arc(x,yy,r-2,0,7);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(x-4,yy-5,3,0,7);ctx.fill();}}
}
/* der Orca, nach rechts schwimmend, Schwanzschlag auf und ab */
function orca(x,y,k,rot,schlag){
 /* Form aus morph.js (BWMorph.orcaForm), damit Spiel, Karte und Verwandlung denselben Orca zeigen */
 if(!window.BWMorph||!window.BWMorph.orcaForm)return;
 const blink=O.stun>0&&Math.floor(O.time*16)%2===0;
 window.BWMorph.orcaForm(ctx,x,y,k,{rot,schlag,alpha:blink?0.55:1});
}
function hud(H){
 /* Strecke zur Kueste */
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.55)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#7FE0D0');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='#10151C';ctx.textAlign='left';ctx.fillText('ORCA',8,ly+4);ctx.textAlign='right';ctx.fillText('KÜSTE',W-8,ly+4);
 /* Luft */
 const ax=8,ay=30,warn=O.air<0.3&&Math.floor(O.time*4)%2===0;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(ax,ay,102,18,9);ctx.fill();
 ctx.fillStyle=warn?'#FF7A59':O.air<0.3?'#FFB020':'#9FD3F2';rund(ax+4,ay+4,Math.max(6,64*O.air),10,5);ctx.fill();
 ctx.fillStyle='#FFFFFF';ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textAlign='left';ctx.fillText('LUFT',ax+72,ay+9.5);
 /* Tempo */
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,ay,66,18,9);ctx.fill();
 ctx.fillStyle=O.turbo>0?'#7FE0D0':'#FFE08A';ctx.textAlign='center';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(1).replace('.',','),W-41,ay+9.5);
 if(O.shield){ctx.fillStyle='rgba(207,239,255,.9)';ctx.beginPath();ctx.arc(W-90,ay+9,7,0,7);ctx.fill();}
}
function zeichne(cv){
 if(!cv||!cv.getContext)return;ctx=ctx||cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=cv.clientWidth,ch=cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const sk=cw/W,H=ch/sk;
 if(Math.abs(H-O.H)>1){const alt=O.H;O.H=H;const f=(y)=>SURF()+(y-alt*0.24)*(BED()-SURF())/(alt-26-alt*0.24);O.y=f(O.y);O.ty=f(O.ty);for(const it of O.items)it.y=f(it.y);}
 ctx.setTransform(dpr*sk,0,0,dpr*sk,0,0);
 const s=SURF();
 himmel(H,s);wasser(H,s);schnee(H,s);grund(H);
 /* Tempo-Linien */
 const v=speed();if(v>170&&!ruhig){ctx.strokeStyle='rgba(255,255,255,'+Math.min(0.35,(v-170)/300)+')';ctx.lineWidth=1.2;
  for(let i=0;i<10;i++){const y=s+20+rnd(i*9)*(H-s-60),x=((rnd(i*4)*W*2-O.scroll*2.2)%(W*2)+W*2)%(W*2)-W*0.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40+rnd(i)*40,y);ctx.stroke();}}
 /* Tiefen-Markierung rechts */
 for(let i=0;i<3;i++){ctx.fillStyle=LANE_COL[i];ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(W-4,laneY(i),3,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 for(const it of O.items)itemZeichnen(it);
 for(const o of O.old)for(const opt of o.opts)schwarmZeichnen(opt,ORCA_X+o.x,o);
 if(O.gate)for(const opt of O.gate.opts)schwarmZeichnen(opt,ORCA_X+O.gate.x);
 oberflaeche(s);
 /* Teilchen hinter dem Orca */
 for(const p of O.parts)if(p.art==='blasen'){ctx.globalAlpha=Math.max(0,p.life)*0.8;ctx.strokeStyle=p.farbe;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke();}
 ctx.globalAlpha=1;
 const lostA=O.mode==='lost'?Math.max(0,1-O.anim/1.2):1;
 ctx.globalAlpha=lostA;
 if(O.shield){ctx.save();ctx.globalAlpha=0.35*lostA;ctx.strokeStyle='#CFEFFF';ctx.lineWidth=2;ctx.fillStyle='rgba(207,239,255,.12)';ctx.beginPath();ctx.ellipse(ORCA_X+4,O.y-6,64,40,O.rot,0,7);ctx.fill();ctx.stroke();ctx.restore();}
 if(O.turbo>0&&!ruhig){ctx.save();ctx.globalAlpha=0.5;ctx.strokeStyle='#7FE0D0';ctx.lineWidth=2;for(let i=0;i<4;i++){const y=O.y-14+i*9;ctx.beginPath();ctx.moveTo(ORCA_X-60-i*8,y);ctx.lineTo(ORCA_X-100-((O.time*300+i*30)%60),y);ctx.stroke();}ctx.restore();}
 const xr=ORCA_X+(O.mode==='ziel'?O.anim*O.anim*180:0);
 orca(xr,O.y,0.7,O.rot,O.tail);
 ctx.globalAlpha=1;
 for(const p of O.parts)if(p.art!=='blasen'){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.farbe;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 if(O.gate&&O.mode==='play')for(const opt of O.gate.opts)etikett(opt,ORCA_X+O.gate.x);
 /* Meldungen */
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 18px Inter, system-ui, sans-serif';
 O.pops.forEach(p=>{const a=Math.max(0,1-p.t/1.2),y=clamp(p.y,64,H-30)-p.t*30;ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.8)';ctx.lineWidth=4;ctx.strokeText(p.text,ORCA_X+70,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,ORCA_X+70,y);});
 ctx.globalAlpha=1;
 hud(H);
 if(O.mode==='ziel'){ctx.fillStyle='rgba(255,255,255,'+Math.min(0.85,O.anim*0.6)+')';ctx.fillRect(0,0,W,H);}
}
/* Zeiger -> Tiefe in Spielkoordinaten */
function zeigerY(cv,clientY){const r=cv.getBoundingClientRect();return (clientY-r.top)/r.width*W;}

function zeiger(cv,clientX,clientY){steerTo(zeigerY(cv,clientY));}
function taste(richtung,dt){steerTo(O.ty+richtung*330*dt);}
window.BWOrca={O,start,update,zeichne,steerTo,lane,laneY,laneOf,SURF,BED,zeigerY,zeiger,taste,GOAL,HEARTS,MINREAD,ORCA_X,speed,gapFor,mult,LANE_COL,LANE_ZEICHEN,
 ding:'Schwarm',hinweis:'Ziehen = lenken · schnell nach oben = Sprung | Tastatur: ↑ ↓ oder 1 2 3 · Leertaste = Sprung · P = Pause',
 sprung(){steerTo(SURF()-70);},
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
