/* =========================================================================
   PENGUIN SLIDE - Kapitel 1 von Black & White (Year 6, Unit 2)

   Draufsicht. Der Pinguin rutscht auf dem Bauch eine kurvige Eisrinne
   hinab, die Welt zieht von unten nach oben vorbei. Gelenkt wird mit
   Schwung: Finger auf das Bild legen und nach links oder rechts ziehen -
   der Pinguin schlittert hinterher (oder Pfeiltasten, oder die drei
   Knoepfe fuer links, Mitte, rechts).

   Oben steht das deutsche Wort. Ein Eistor mit drei Durchgaengen kommt
   entgegen, jeder mit einem englischen Wort. Durch den richtigen rutschen!
   Der falsche zerbricht und kostet ein Herz.

   Dazu:
   - Gletscherspalten quer ueber die Rinne: Davor liegt eine Schanze. Wer
     sie trifft, springt darueber (Bonus). Wer sie verfehlt, faellt kurz
     hinein - Serie weg, kein Herz.
   - Fische geben Punkte, Robben im Weg bremsen (Serie weg, kein Herz).
   - Wer gegen den Rand schlittert, wird langsamer.
   - Eiskristall (Turbo): schneller und doppelte Punkte fuer drei Tore.
   - Schal (Schild): faengt ein falsches Tor ab.
   - Jede richtige Antwort in Folge macht schneller. Eine Mindestlesezeit
     gilt immer.

   Die Logik (start, update, steerX, lane) braucht keine Zeichenflaeche.
   ========================================================================= */
(function(){
'use strict';
const W=360,GOAL=16,HEARTS=3,MINREAD=3.3,TURBO_GATES=3,JUMP=0.75;
const LANE_COL=['#FF8A5B','#3CCFBE','#FFC857'],LANE_ZEICHEN=['◀','●','▶'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const mische=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;

const O={mode:'aus',H:560,k:0,hearts:HEARTS,score:0,streak:0,best:0,dist:0,x:W/2,vx:0,tx:W/2,laneZiel:-1,
 sprung:0,stun:0,bremse:0,time:0,gate:null,old:[],items:[],pops:[],parts:[],spur:[],turbo:0,shield:false,anim:0,
 q:null,queue:[],pool:[],missed:new Map(),fish:0,jumps:0,onEnd:null,onFrage:null};
const PY=()=>O.H*0.27;
/* die Rinne: Mitte und halbe Breite je Strecke */
const mitte=z=>W/2+46*Math.sin(z*0.0042)+16*Math.sin(z*0.0016+1.3);
const halb=z=>117-Math.min(20,O.k*1.3);
const laneX=(i,z)=>mitte(z)+(i-1)*halb(z)*2/3;
function laneAt(x,z){const rel=(x-mitte(z))/(halb(z)*2/3);return rel<-0.5?0:rel>0.5?2:1;}
const tempo=()=>1+0.06*Math.min(O.streak,10);
const speed=()=>(205+4*O.k)*tempo()*(O.turbo>0?1.4:1)*(O.stun>0?0.5:1)*(O.bremse>0?0.75:1);
const mult=()=>tempo()*(O.turbo>0?2:1);
const gapFor=v=>Math.max(600,v*MINREAD);

/* ---------------------------------------------------------------- Ablauf */
function start(opt){
 Object.assign(O,{mode:'play',H:opt.H||O.H,k:0,hearts:HEARTS,score:opt.score||0,streak:0,best:0,dist:0,vx:0,laneZiel:-1,
  sprung:0,stun:0,bremse:0,time:0,old:[],items:[],pops:[],parts:[],spur:[],turbo:0,shield:false,anim:0,missed:new Map(),fish:0,jumps:0,
  onEnd:opt.onEnd||null,onFrage:opt.onFrage||null,pool:opt.words,queue:mische(opt.words)});
 O.x=O.tx=mitte(0);
 neuesTor(780);
}
function falsche(q){
 const out=[];
 for(const w of mische(O.pool)){if(out.length===2)break;if(w.en===q.en||w.de===q.de)continue;if(out.some(o=>o.en===w.en||o.de===w.de))continue;out.push(w);}
 return out;
}
function neuesTor(abstand){
 if(!O.queue.length)O.queue=mische(O.pool);
 O.q=O.queue.shift();
 const opts=mische([O.q,...falsche(O.q)]);
 const z=O.dist+(abstand||gapFor(speed()));
 O.gate={z,opts:opts.map((w,i)=>({w,lane:i}))};
 /* zwischen den Toren - so verteilt, dass jeder Durchgang erreichbar bleibt */
 const von=O.dist,lang=z-von;
 if(O.k>0){
  const fl=Math.floor(Math.random()*3);
  for(let i=0;i<5;i++)O.items.push({typ:'fisch',z:von+lang*0.2+i*26,lane:fl});
  if(O.k%3===2){const rl=Math.floor(Math.random()*3),zc=von+lang*0.55;
   O.items.push({typ:'schanze',z:zc-70,lane:rl});O.items.push({typ:'spalte',z:zc});
   for(let i=0;i<3;i++)O.items.push({typ:'fisch',z:zc-26+i*26,lane:rl,hoch:true});}
  else if(O.k>=2){O.items.push({typ:'robbe',z:von+lang*0.55,lane:Math.floor(Math.random()*3)});}
  if(O.k%4===1)O.items.push({typ:Math.random()<0.5?'turbo':'schal',z:von+lang*0.8,lane:Math.floor(Math.random()*3)});
 }
 if(O.onFrage)O.onFrage(O.q,O.gate.opts);
}
function pop(text,farbe){O.pops.push({text,farbe:farbe||'#FFFFFF',t:0});}
function teilchen(x,y,n,farben,kraft,art){
 if(ruhig)n=Math.ceil(n/3);
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(0.3+Math.random())*kraft;
  O.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,farbe:farben[i%farben.length],r:1.5+Math.random()*2.5,art:art||'punkt'});}
}
function musik(f){try{if(window.BWMusik)f(window.BWMusik);}catch(e){}}
function torAuswerten(){
 const g=O.gate,l=O.sprung>0?-1:laneAt(O.x,g.z),treffer=g.opts.find(o=>o.lane===l);
 O.old.push({opts:g.opts,z:g.z,t:0,gewaehlt:l,richtig:treffer&&treffer.w===O.q});
 if(treffer&&treffer.w===O.q){
  O.streak++;O.best=Math.max(O.best,O.streak);
  const p=Math.round(10*mult());O.score+=p;pop('+'+p,'#FFE08A');
  teilchen(O.x,PY()+10,18,['#FFE08A','#FFFFFF',LANE_COL[l]],140);sfx('tor');
  if(O.turbo>0)O.turbo--;
 }else{
  O.missed.set(O.q.en,O.q);
  if(!O.queue.includes(O.q))O.queue.splice(Math.min(2,O.queue.length),0,O.q);
  if(O.shield){O.shield=false;pop('Der Schal hält!','#9FD3F2');teilchen(O.x,PY(),20,['#E7413C','#FFFFFF'],150);sfx('schild');}
  else{O.hearts--;O.streak=0;O.turbo=0;O.stun=0.5;pop(l<0?'Über das Tor gesprungen!':'Falsches Tor!','#FF9A8A');
   teilchen(O.x,PY()+12,26,['#CFEFFF','#FFFFFF','#9FD3F2'],200);sfx('falsch');musik(M=>M.fehler());
   if(O.hearts<=0){O.mode='lost';O.anim=0;musik(M=>M.ende());}}
 }
 O.k++;
 if(O.mode==='lost')return;
 if(O.k>=GOAL){O.mode='ziel';O.anim=0;O.gate=null;musik(M=>M.ziel());sfx('ziel');return;}
 neuesTor();
}
function steerX(x){O.laneZiel=-1;O.tx=clamp(x,0,W);}
function lane(i){O.laneZiel=i;}

function update(dt){
 dt=Math.min(dt,0.05);O.time+=dt;
 for(const p of O.pops)p.t+=dt;O.pops=O.pops.filter(p=>p.t<1.2);
 for(const p of O.parts){p.x+=p.vx*dt;p.y+=p.vy*dt-(O.mode==='play'?speed()*dt:0);p.vx*=0.96;p.vy*=0.96;p.life-=dt*1.4;}
 O.parts=O.parts.filter(p=>p.life>0);
 if(O.mode==='aus'||O.mode==='pause')return;
 if(O.mode==='lost'||O.mode==='ziel'){
  O.anim+=dt;O.dist+=dt*(O.mode==='ziel'?speed():40);
  if(O.anim>=(O.mode==='ziel'?1.6:1.4)){const won=O.mode==='ziel';O.mode='aus';if(O.onEnd)O.onEnd(won);}
  return;
 }
 const v=speed(),d=v*dt;O.dist+=d;
 if(O.stun>0)O.stun-=dt;if(O.bremse>0)O.bremse-=dt;
 musik(M=>{M.tempo(tempo());M.turbo(O.turbo>0);});
 /* Lenken mit Schwung: der Pinguin schlittert dem Ziel hinterher */
 if(O.laneZiel>=0)O.tx=laneX(O.laneZiel,O.dist+120);
 if(O.sprung>0){O.sprung-=dt;if(O.sprung<=0){teilchen(O.x,PY()+6,16,['#FFFFFF','#CFEFFF'],120);sfx('landen');}}
 else{const k=24,da=5.2;O.vx+=((O.tx-O.x)*k-O.vx*da)*dt;}
 O.vx=clamp(O.vx,-420,420);O.x+=O.vx*dt;
 /* Rand der Rinne */
 const m=mitte(O.dist),h=halb(O.dist)-16;
 if(Math.abs(O.x-m)>h){const s=Math.sign(O.x-m);O.x=m+s*h;
  if(Math.abs(O.vx)>40&&O.sprung<=0){O.bremse=0.5;teilchen(O.x+s*8,PY(),10,['#FFFFFF','#E6F3FB'],110);if(Math.random()<0.3)sfx('rand');}
  O.vx*=-0.25;}
 /* Spur im Schnee und Schneespray bei scharfen Kurven */
 if(O.sprung<=0){O.spur.push({x:O.x,z:O.dist});if(Math.abs(O.vx)>150&&Math.random()<dt*20)teilchen(O.x-Math.sign(O.vx)*10,PY()+14,2,['#FFFFFF','#E6F3FB'],70);}
 O.spur=O.spur.filter(s=>O.dist-s.z<PY()+30);
 /* Dinge auf der Strecke */
 for(const it of O.items){
  if(it.weg||it.z>O.dist+8||it.z<O.dist-14)continue;
  const ix=it.typ==='spalte'?null:laneX(it.lane,it.z),nah=ix!=null&&Math.abs(ix-O.x)<(it.typ==='robbe'?36:it.typ==='schanze'?40:24);
  if(it.typ==='fisch'&&nah&&(!it.hoch||O.sprung>0)){it.weg=true;O.fish++;const p=Math.round((it.hoch?6:3)*mult());O.score+=p;teilchen(ix,PY(),4,['#9FD3F2','#FFFFFF'],60);sfx('fisch');}
  else if(it.typ==='schanze'&&nah&&O.sprung<=0){it.weg=true;O.sprung=JUMP;O.jumps++;const p=Math.round(15*mult());O.score+=p;pop('Sprung! +'+p,'#B6FFCF');teilchen(O.x,PY()+10,18,['#FFFFFF','#CFEFFF'],160);sfx('sprung');}
  else if(it.typ==='spalte'&&it.z<=O.dist&&!it.weg){it.weg=true;if(O.sprung<=0){O.stun=0.9;O.streak=0;O.turbo=0;pop('Platsch – in die Spalte!','#9FD3F2');teilchen(O.x,PY(),22,['#2479AE','#9FD3F2','#FFFFFF'],150);sfx('platsch');musik(M=>M.fehler());}}
  else if(it.typ==='robbe'&&nah&&O.sprung<=0&&O.stun<=0){it.weg=true;O.stun=0.8;O.streak=0;pop('Robbe im Weg!','#E3C8A0');teilchen(O.x,PY()+10,12,['#FFFFFF','#B9A48A'],120);sfx('robbe');}
  else if(it.typ==='turbo'&&nah){it.weg=true;O.turbo=TURBO_GATES;pop('Eis-Turbo! Punkte ×2','#7FE0D0');teilchen(O.x,PY(),20,['#7FE0D0','#FFFFFF'],180);sfx('item');}
  else if(it.typ==='schal'&&nah){it.weg=true;O.shield=true;pop('Schal angelegt!','#FF9A8A');teilchen(O.x,PY(),18,['#E7413C','#FFFFFF'],140);sfx('item');}
 }
 O.items=O.items.filter(it=>it.z>O.dist-PY()-60);
 for(const o of O.old)o.t+=dt;O.old=O.old.filter(o=>o.z>O.dist-PY()-80);
 if(O.gate&&O.dist>=O.gate.z)torAuswerten();
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
 tor:t=>{[784,988,1319].forEach((f,i)=>ton(t+i*0.05,f,f,0.18,'triangle',0.16));zisch(t,6000,9000,0.12,0.12,3);},
 falsch:t=>{zisch(t,3000,600,0.35,0.45,1);ton(t,400,120,0.3,'sawtooth',0.1);},
 sprung:t=>{zisch(t,800,4000,0.3,0.3,1);ton(t,300,900,0.3,'triangle',0.15);},
 landen:t=>{zisch(t,2500,500,0.2,0.3,0.8);ton(t,160,70,0.15,'sine',0.25);},
 platsch:t=>{zisch(t,2500,300,0.45,0.5,0.7);ton(t,300,90,0.4,'sine',0.25);},
 fisch:t=>{ton(t,1046,1568,0.08,'sine',0.14);},
 robbe:t=>{ton(t,220,170,0.25,'sawtooth',0.1);ton(t+0.15,200,150,0.3,'sawtooth',0.09);},
 rand:t=>{zisch(t,4000,1500,0.15,0.15,1);},
 item:t=>{[523,784,1047].forEach((f,i)=>ton(t+i*0.05,f,f,0.25,'triangle',0.16));},
 schild:t=>{[1047,1319,1568].forEach((f,i)=>ton(t+i*0.05,f,f*1.003,0.35,'triangle',0.16));},
 ziel:t=>{[523,659,784,1047,1319].forEach((f,i)=>ton(t+i*0.09,f,f,0.6,'triangle',0.15));}
};
function sfx(n){if(!audio()||!KLANG[n])return;try{KLANG[n](ac.currentTime+0.01);}catch(e){}}

/* ---------------------------------------------------------------- Zeichnen */
let ctx=null;
function rund(x,y,b,h,r){r=Math.min(r,b/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+b,y,x+b,y+h,r);ctx.arcTo(x+b,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+b,y,r);ctx.closePath();}
const sy=z=>PY()+(z-O.dist);
function gelaende(H){
 /* Schneefeld neben der Rinne */
 const bg=ctx.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#CFE2F1');bg.addColorStop(0.5,'#E9F3FA');bg.addColorStop(1,'#CFE2F1');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(110,150,190,.16)';
 for(let i=0;i<26;i++){const z=Math.floor((O.dist-PY())/90)*90+i*90,y=sy(z),x=rnd(Math.floor(z/90))*W;ctx.beginPath();ctx.ellipse(x,y,30+rnd(z)*30,8,0,0,7);ctx.fill();}
 /* Eisbrocken und Zuschauer am Rand */
 for(let i=0;i<14;i++){const z=Math.floor((O.dist-PY())/140)*140+i*140,y=sy(z),seed=Math.floor(z/140),links=rnd(seed*3)<0.5,m=mitte(z),hb=halb(z);
  const x=links?m-hb-26-rnd(seed)*30:m+hb+26+rnd(seed)*30;if(x<-30||x>W+30)continue;
  if(rnd(seed*7)<0.45){ctx.fillStyle='rgba(60,90,130,.18)';ctx.beginPath();ctx.ellipse(x+3,y+12,10,4,0,0,7);ctx.fill();
   window.Figuren&&window.Figuren.pinguin(ctx,x,y+10,0.55,{wave:Math.sin(O.time*6+seed)*(O.streak>2?1:0.3),hop:O.streak>4?Math.abs(Math.sin(O.time*8+seed))*3:0,blush:true});}
  else{ctx.fillStyle='#CFE4F3';ctx.beginPath();ctx.moveTo(x-14,y+8);ctx.lineTo(x-6,y-10);ctx.lineTo(x+10,y-6);ctx.lineTo(x+14,y+8);ctx.closePath();ctx.fill();ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.moveTo(x-6,y-10);ctx.lineTo(x+10,y-6);ctx.lineTo(x+2,y);ctx.closePath();ctx.fill();}}
}
function rinne(H){
 /* Rinne als Band aus Streifen */
 const schritt=10,z0=O.dist-PY()-20,z1=O.dist+(H-PY())+20;
 const L=[],R=[];for(let z=z0;z<=z1;z+=schritt){const y=sy(z),m=mitte(z),h=halb(z);L.push([m-h,y]);R.push([m+h,y]);}
 /* Schneewall (Schatten aussen) */
 ctx.fillStyle='rgba(120,160,200,.35)';ctx.beginPath();L.forEach(([x,y],i)=>i?ctx.lineTo(x-12,y):ctx.moveTo(x-12,y));for(let i=R.length-1;i>=0;i--)ctx.lineTo(R[i][0]+12,R[i][1]);ctx.fill();
 const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#7EC0E8');g.addColorStop(0.5,'#C4E6F8');g.addColorStop(1,'#7EC0E8');ctx.fillStyle=g;
 ctx.beginPath();L.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));for(let i=R.length-1;i>=0;i--)ctx.lineTo(R[i][0],R[i][1]);ctx.fill();
 /* Eis-Kratzer, die mitlaufen */
 ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.4;
 for(let i=0;i<22;i++){const z=Math.floor(z0/60)*60+i*60,y=sy(z),m=mitte(z),h=halb(z),x=m+(rnd(z*0.37)-0.5)*h*1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(mitte(z+30)-m),y+30);ctx.stroke();}
 /* Wall-Kanten */
 ctx.lineJoin='round';
 for(const [S,d] of [[L,1],[R,-1]]){ctx.strokeStyle='rgba(40,100,150,.35)';ctx.lineWidth=3;ctx.beginPath();S.forEach(([x,y],i)=>i?ctx.lineTo(x+d*4,y):ctx.moveTo(x+d*4,y));ctx.stroke();
  ctx.strokeStyle='#FFFFFF';ctx.lineWidth=6;ctx.beginPath();S.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 /* Slalomstangen am Rand: zeigen das Tempo */
 for(let i=0;i<16;i++){const z=Math.floor((O.dist-PY())/110)*110+i*110,y=sy(z);if(y<-30||y>O.H+30)continue;const m=mitte(z),h=halb(z),n=Math.floor(z/110);
  for(const sd of [-1,1]){const x=m+sd*(h+9);ctx.fillStyle='rgba(40,70,110,.25)';ctx.beginPath();ctx.ellipse(x+3,y+3,4,2,0,0,7);ctx.fill();ctx.fillStyle=(n+(sd>0?1:0))%2?'#E7413C':'#2B6CB0';ctx.beginPath();ctx.moveTo(x,y-14);ctx.lineTo(x+sd*-11,y-10);ctx.lineTo(x,y-6);ctx.closePath();ctx.fill();ctx.fillStyle='#3A3F4A';ctx.fillRect(x-1,y-15,2,16);}}
 /* Spurlinien (blass) zwischen den Durchgaengen */
 ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.setLineDash([8,12]);
 for(const f of [-1/3,1/3]){ctx.beginPath();L.forEach(([x,y],i)=>{const xx=x+(R[i][0]-x)*(0.5+f);i?ctx.lineTo(xx,y):ctx.moveTo(xx,y);});ctx.stroke();}
 ctx.setLineDash([]);
}
function spurZeichnen(){
 if(O.spur.length<2)return;ctx.strokeStyle='rgba(60,130,185,.45)';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();
 O.spur.forEach((s,i)=>{const y=sy(s.z);i?ctx.lineTo(s.x,y):ctx.moveTo(s.x,y);});ctx.lineTo(O.x,PY());ctx.stroke();
}
function itemZeichnen(it){
 if(it.weg&&it.typ!=='spalte')return;const y=sy(it.z);if(y<-40||y>O.H+40)return;
 if(it.typ==='spalte'){const m=mitte(it.z),h=halb(it.z);ctx.fillStyle='#1B4F7A';ctx.beginPath();ctx.moveTo(m-h,y-6);
  for(let i=0;i<=12;i++){const x=m-h+i*h/6;ctx.lineTo(x,y-6+(i%2?-4:3));}ctx.lineTo(m+h,y+8);for(let i=12;i>=0;i--){const x=m-h+i*h/6;ctx.lineTo(x,y+8+(i%2?4:-2));}ctx.closePath();ctx.fill();
  ctx.fillStyle='#0D2C47';ctx.fillRect(m-h,y-1,h*2,4);return;}
 const x=laneX(it.lane,it.z);
 if(it.typ==='fisch'){const hh=it.hoch?-14:0;ctx.save();ctx.translate(x,y+hh);ctx.rotate(Math.sin(O.time*6+it.z)*0.3+Math.PI/2);
  if(it.hoch){ctx.globalAlpha=0.9;}
  ctx.fillStyle='#5B9CC9';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(13,-5);ctx.lineTo(13,5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#8EC6EA';ctx.beginPath();ctx.ellipse(0,0,9,5,0,0,7);ctx.fill();ctx.fillStyle='#1B2B3F';ctx.beginPath();ctx.arc(-5,-1,1.2,0,7);ctx.fill();ctx.restore();
  if(it.hoch){ctx.fillStyle='rgba(60,90,130,.2)';ctx.beginPath();ctx.ellipse(x,y+4,8,3,0,0,7);ctx.fill();}}
 else if(it.typ==='schanze'){ctx.fillStyle='rgba(60,90,130,.25)';ctx.beginPath();ctx.ellipse(x,y+14,30,6,0,0,7);ctx.fill();
  const g=ctx.createLinearGradient(0,y-16,0,y+12);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#9FCBE8');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(x-28,y+12);ctx.lineTo(x-22,y-16);ctx.lineTo(x+22,y-16);ctx.lineTo(x+28,y+12);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFB020';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*12-5,y+4);ctx.lineTo(x+i*12,y-6);ctx.lineTo(x+i*12+5,y+4);ctx.fill();}}
 else if(it.typ==='robbe'){ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(60,90,130,.25)';ctx.beginPath();ctx.ellipse(2,6,30,9,0,0,7);ctx.fill();
  ctx.fillStyle='#8C9AA8';ctx.beginPath();ctx.ellipse(0,0,28,11,0.05,0,7);ctx.fill();ctx.fillStyle='#A9B6C2';ctx.beginPath();ctx.ellipse(-4,-3,20,6,0,0,7);ctx.fill();
  ctx.fillStyle='#7D8B99';ctx.beginPath();ctx.arc(-24,-2,9,0,7);ctx.fill();ctx.fillStyle='#10151C';ctx.beginPath();ctx.arc(-28,-5,1.6,0,7);ctx.arc(-24,-6,1.6,0,7);ctx.fill();
  ctx.fillStyle='#7D8B99';ctx.beginPath();ctx.moveTo(26,0);ctx.lineTo(36,-7);ctx.lineTo(36,7);ctx.closePath();ctx.fill();
  if(Math.sin(O.time*2+it.z)>0.7){ctx.fillStyle='#FFFFFF';ctx.font='700 10px Inter, system-ui, sans-serif';ctx.fillText('zzz',-30,-16);}ctx.restore();}
 else{const col=it.typ==='turbo'?'#7FE0D0':'#E7413C',yy=y+Math.sin(O.time*4+it.z)*2;
  ctx.save();if(!ruhig){ctx.shadowColor=col;ctx.shadowBlur=14;}ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,yy,13,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2.2;
  if(it.typ==='turbo'){ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+O.time*2;ctx.moveTo(x,yy);ctx.lineTo(x+Math.cos(a)*9,yy+Math.sin(a)*9);}ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(x-8,yy-3);ctx.quadraticCurveTo(x,yy+4,x+8,yy-3);ctx.moveTo(x+3,yy);ctx.lineTo(x+5,yy+8);ctx.stroke();}}
}
function torZeichnen(g,alt){
 const y=sy(g.z);if(y<-60||y>O.H+60)return;const m=mitte(g.z),h=halb(g.z),b=h*2/3;
 for(let i=0;i<3;i++){const x0=m-h+i*b,o=g.opts.find(o=>o.lane===i);
  let a=0.22;if(alt){a=alt.gewaehlt===i?(alt.richtig?0.45*(1-Math.min(1,alt.t*2)):0):0.12*(1-Math.min(1,alt.t*2));}
  ctx.fillStyle=LANE_COL[i];ctx.globalAlpha=a*1.6;ctx.fillRect(x0+6,y-6,b-12,12);ctx.globalAlpha=1;}
 /* Eispfeiler */
 for(let i=0;i<=3;i++){const x=m-h+i*b;let dy=0,a=1;
  if(alt&&!alt.richtig&&(i===alt.gewaehlt||i===alt.gewaehlt+1)){dy=alt.t*40;a=Math.max(0,1-alt.t*1.6);}
  ctx.globalAlpha=a;ctx.fillStyle='rgba(60,90,130,.25)';ctx.beginPath();ctx.ellipse(x+3,y+10+dy,11,5,0,0,7);ctx.fill();
  const gr=ctx.createLinearGradient(x-10,0,x+10,0);gr.addColorStop(0,'#9FD3F2');gr.addColorStop(0.5,'#FFFFFF');gr.addColorStop(1,'#7FB8DE');ctx.fillStyle=gr;
  rund(x-10,y-24+dy,20,34,6);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;}
 /* Querbalken mit Farbe je Durchgang */
 if(!alt||alt.richtig){ctx.globalAlpha=alt?Math.max(0,1-alt.t*2):1;for(let i=0;i<3;i++){const x0=m-h+i*b;ctx.fillStyle=LANE_COL[i];rund(x0+9,y-24,b-18,10,5);ctx.fill();}ctx.globalAlpha=1;}
}
function etikett(opt,g,H){
 const x0=laneX(opt.lane,g.z),y=sy(g.z),farbe=LANE_COL[opt.lane];
 ctx.font='700 13px Inter, system-ui, sans-serif';
 const text=opt.w.en,tw=Math.min(150,ctx.measureText(text).width),bw=tw+26,bh=24,stufe=opt.lane===1?30:0;
 const ly=clamp(y-44-stufe,PY()+70,H-bh/2-8-stufe),lx=clamp(x0,bw/2+4,W-bw/2-4);
 ctx.fillStyle='rgba(16,21,28,.92)';rund(lx-bw/2,ly-bh/2,bw,bh,12);ctx.fill();
 ctx.fillStyle=farbe;ctx.beginPath();ctx.arc(lx-bw/2+12,ly,7,0,7);ctx.fill();
 ctx.fillStyle='#10151C';ctx.font='800 8px Inter, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(LANE_ZEICHEN[opt.lane],lx-bw/2+12,ly+0.5);
 ctx.fillStyle='#FFFFFF';ctx.font='700 13px Inter, system-ui, sans-serif';ctx.textAlign='left';
 let t=text;while(ctx.measureText(t).width>tw&&t.length>3)t=t.slice(0,-2);if(t!==text)t=t.slice(0,-1)+'…';
 ctx.fillText(t,lx-bw/2+22,ly+0.5);
 if(ly<y-45-stufe){ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(lx-5,ly+bh/2+1);ctx.lineTo(lx,ly+bh/2+7);ctx.lineTo(lx+5,ly+bh/2+1);ctx.fill();}
}
/* der Pinguin von oben, auf dem Bauch, Kopf voraus nach unten */
function pinguin(x,y,k,neigung,flossen){
 ctx.save();ctx.translate(x,y);ctx.rotate(neigung);ctx.scale(k,k);
 const blink=O.stun>0&&Math.floor(O.time*16)%2===0;if(blink)ctx.globalAlpha=0.55;
 /* Fuesse hinten */
 ctx.fillStyle='#F2A33A';for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(s*6,-22,4,6,s*0.3,0,7);ctx.fill();}
 /* Flossen */
 ctx.fillStyle='#1B2233';for(const s of [-1,1]){ctx.save();ctx.translate(s*12,-2);ctx.rotate(s*(0.9+flossen*0.35));ctx.beginPath();ctx.ellipse(0,9,4.5,12,0,0,7);ctx.fill();ctx.restore();}
 /* Koerper */
 ctx.fillStyle='#1B2233';ctx.beginPath();ctx.ellipse(0,-4,13,19,0,0,7);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.ellipse(-4,-8,4,11,0,0,7);ctx.fill();
 /* Kopf */
 ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(0,15,10,0,7);ctx.fill();
 ctx.fillStyle='#FFFFFF';for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(s*6.5,15,3.2,4.5,0,0,7);ctx.fill();}
 ctx.fillStyle='#1B2233';for(const s of [-1,1]){ctx.beginPath();ctx.arc(s*6.8,16.5,1.4,0,7);ctx.fill();}
 ctx.fillStyle='#F2A33A';ctx.beginPath();ctx.moveTo(-3,23);ctx.lineTo(0,29);ctx.lineTo(3,23);ctx.closePath();ctx.fill();
 /* Schal */
 if(O.shield){ctx.fillStyle='#E7413C';ctx.fillRect(-10,6,20,4);ctx.beginPath();ctx.moveTo(6,8);ctx.lineTo(14+Math.sin(O.time*14)*2,-6);ctx.lineTo(9,-7);ctx.closePath();ctx.fill();}
 ctx.restore();
}
function hud(H){
 const lb=W*0.5,lx=W*0.25,ly=10,voll=O.k/GOAL;
 ctx.fillStyle='rgba(16,21,28,.6)';rund(lx-6,ly-5,lb+12,18,9);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(lx,ly,lb,8);
 const g=ctx.createLinearGradient(lx,0,lx+lb,0);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#9FD3F2');ctx.fillStyle=g;ctx.fillRect(lx,ly,lb*voll,8);
 ctx.font='700 10px Inter, system-ui, sans-serif';ctx.textBaseline='middle';ctx.fillStyle='#10151C';ctx.textAlign='left';ctx.fillText('PINGUIN',4,ly+4);ctx.textAlign='right';ctx.fillText('MEER',W-6,ly+4);
 ctx.fillStyle='rgba(16,21,28,.6)';rund(W-74,30,66,18,9);ctx.fill();
 ctx.fillStyle=O.turbo>0?'#7FE0D0':'#FFE08A';ctx.textAlign='center';ctx.font='800 11px Inter, system-ui, sans-serif';ctx.fillText('×'+mult().toFixed(1).replace('.',','),W-41,39.5);
}
function zeichne(cv){
 if(!cv||!cv.getContext)return;ctx=ctx||cv.getContext('2d');if(!ctx)return;
 const dpr=Math.min(window.devicePixelRatio||1,2),cw=cv.clientWidth,ch=cv.clientHeight;
 if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
 const sk=cw/W,H=ch/sk;O.H=H;
 ctx.setTransform(dpr*sk,0,0,dpr*sk,0,0);ctx.globalAlpha=1;
 gelaende(H);rinne(H);spurZeichnen();
 for(const it of O.items)itemZeichnen(it);
 for(const o of O.old)torZeichnen(o,o);
 if(O.gate)torZeichnen(O.gate);
 /* Wind bei hohem Tempo */
 const v=speed();if(v>270&&!ruhig){ctx.strokeStyle='rgba(120,170,210,'+Math.min(0.4,(v-270)/300)+')';ctx.lineWidth=1.3;
  for(let i=0;i<12;i++){const x=rnd(i*5)*W,y=((rnd(i*3)*H*2-O.dist*1.8)%(H*1.2)+H*1.2)%(H*1.2)-H*0.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+30+rnd(i)*30);ctx.stroke();}}
 /* Pinguin mit Schatten; im Sprung hoeher und groesser */
 const hoch=O.sprung>0?Math.sin(Math.PI*(1-O.sprung/JUMP)):0,lost=O.mode==='lost'?Math.min(1,O.anim/1.0):0;
 const py=PY()+(O.mode==='ziel'?O.anim*O.anim*260:0);
 ctx.fillStyle='rgba(60,90,130,'+(0.3-hoch*0.15)+')';ctx.beginPath();ctx.ellipse(O.x+hoch*16,py+6+hoch*24,19-hoch*3,11-hoch*2,0,0,7);ctx.fill();
 if(O.turbo>0&&!ruhig){ctx.strokeStyle='rgba(127,224,208,.6)';ctx.lineWidth=2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(O.x+i*8,py-28);ctx.lineTo(O.x+i*8,py-60-((O.time*400+i*30)%40));ctx.stroke();}}
 ctx.globalAlpha=1-lost;
 pinguin(O.x,py-hoch*22,1.45+hoch*0.45+lost*0.4,clamp(-O.vx/700,-0.45,0.45)+lost*3,O.sprung>0?1:Math.sin(O.time*8)*0.3);
 ctx.globalAlpha=1;
 for(const p of O.parts){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.farbe;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 /* Schnee faellt */
 ctx.fillStyle='rgba(255,255,255,.9)';
 for(let i=0;i<40;i++){const x=((rnd(i)*W+Math.sin(O.time*0.8+i)*12)%W+W)%W,y=((rnd(i*2.3)*H-O.dist*0.25*(0.6+rnd(i*4))+O.time*20)%H+H)%H;ctx.globalAlpha=0.5+0.5*rnd(i*9);ctx.beginPath();ctx.arc(x,y,1+rnd(i*7)*1.6,0,7);ctx.fill();}
 ctx.globalAlpha=1;
 if(O.gate&&O.mode==='play')for(const opt of O.gate.opts)etikett(opt,O.gate,H);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 18px Inter, system-ui, sans-serif';
 O.pops.forEach((p,n)=>{const a=Math.max(0,1-p.t/1.2),y=Math.max(62,PY()-52-n*22-p.t*24);ctx.globalAlpha=a;ctx.strokeStyle='rgba(16,21,28,.85)';ctx.lineWidth=4;ctx.strokeText(p.text,W/2,y);ctx.fillStyle=p.farbe;ctx.fillText(p.text,W/2,y);});
 ctx.globalAlpha=1;
 hud(H);
 if(O.mode==='ziel'){ctx.fillStyle='rgba(255,255,255,'+Math.min(0.85,O.anim*0.6)+')';ctx.fillRect(0,0,W,H);}
}
function zeiger(cv,clientX,clientY){const r=cv.getBoundingClientRect();steerX((clientX-r.left)/r.width*W);}
function taste(richtung,dt){steerX(O.tx+richtung*300*dt);}

window.BWPinguin={O,start,update,zeichne,steerX,lane,laneX,laneAt,mitte,halb,zeiger,taste,GOAL,HEARTS,MINREAD,JUMP,speed,gapFor,mult,PY,LANE_COL,LANE_ZEICHEN,
 ding:'Tor',hinweis:'Ziehen = lenken, der Pinguin schlittert hinterher | Tastatur: ← → oder 1 2 3 · P = Pause',
 pause(an){if(an&&O.mode==='play')O.mode='pause';else if(!an&&O.mode==='pause')O.mode='play';}};
})();
