/* =========================================================================
   TOWN RACE – Logik ohne 3D (in Node/jsdom testbar)
   Die Stadt ist ein Strassenraster: NX x NZ Kreuzungen im Abstand A.
   Masse in Metern, x = Osten, z = Sueden. Richtungen: 0 N, 1 O, 2 S, 3 W.
   Blickrichtung h: 0 = Norden, PI/2 = Osten (vorwaerts = (sin h, -cos h)).
   Enthalten: Stadt bauen (gemischt), Hindernisse, Kart-Physik, Ortung im
   Strassennetz, Route, Wegbeschreibung und Navigator (richtig/falsch,
   neue Route nach Fehlern), Autopilot fuer Tests.
   ========================================================================= */
(function(){
'use strict';
const A=64,NX=6,NZ=5,STR=14,H=STR/2,GEH=3.5,ECKE=15,TIEFE=12,R_KART=1.0,INSEL=3.6,KNOTEN_R=H+1.5;
const DX=[0,1,0,-1],DZ=[-1,0,1,0];
const VMAX=16,VBOOST=23,VRUECK=-5.5,BOOST_ZEIT=1.6;
function zufall(seed){let n=Math.floor(Math.abs(seed||1))%2147483647||1;return ()=>{n=(n*16807)%2147483647;return (n-1)/2147483646;};}
const mischen=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const kid=(i,j)=>j*NX+i;
const winkel=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ZAHL=['','first','second','third','fourth'];
const ANZAHL=['no','one','two','three','four','five'];
const gross=s=>s.charAt(0).toUpperCase()+s.slice(1);

/* ---------------- Stadt bauen ---------------- */
function bauen(daten,opt){
 opt=opt||{};
 for(let v=0;v<300;v++){const w=versuch(daten,zufall((opt.seed||1)*7919+v*104729+13),opt);if(w)return w;}
 throw new Error('Stadt liess sich nicht bauen');
}
function versuch(D,r,opt){
 const knoten=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++)knoten.push({id:kid(i,j),i,j,x:i*A,z:j*A,kante:[null,null,null,null],nb:[null,null,null,null],rund:false,ampel:false,ort:null,ecken:{}});
 const kanten=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  if(i<NX-1)kanten.push({id:kanten.length,a:kid(i,j),b:kid(i+1,j),quer:false,art:'strasse',reihe:j,spalte:null});
  if(j<NZ-1)kanten.push({id:kanten.length,a:kid(i,j),b:kid(i,j+1),quer:true,art:'strasse',reihe:null,spalte:i});
 }
 const innen=e=>e.quer?(e.spalte>0&&e.spalte<NX-1):(e.reihe>0&&e.reihe<NZ-1);
 /* zwei Strassen fallen weg (Park, Sportplatz), eine wird Fussgaengerzone */
 const kand=mischen(kanten.filter(innen),r),weg=[];
 const benutzt=new Set();
 for(const e of kand){
  if(weg.length>=3)break;
  if(benutzt.has(e.a)||benutzt.has(e.b))continue;
  const bl=blockPaar(e);if(bl.some(b=>benutzt.has('b'+b)))continue;
  /* Bloecke der weggefallenen Strassen sollen sich nicht beruehren */
  e.art=weg.length<2?'weg':'zone';
  if(!zusammen(knoten,kanten)||minGrad(knoten,kanten)<2){e.art='strasse';continue;}
  weg.push(e);for(const n of [e.a,e.b])benutzt.add(n);for(const b of bl)benutzt.add('b'+b);
 }
 if(weg.length<3)return null;
 for(const e of kanten){
  const a=knoten[e.a],b=knoten[e.b],d=richtung(a,b);
  if(e.art!=='weg'){a.kante[d]=e;b.kante[(d+2)%4]=e;}
  if(e.art==='strasse'){a.nb[d]=b.id;b.nb[(d+2)%4]=a.id;}
 }
 /* Strassennamen: je Reihe und je Spalte einer */
 const namen=mischen(D.STRASSEN,r);
 const reiheName=[],spalteName=[];for(let j=0;j<NZ;j++)reiheName.push(namen[j]);for(let i=0;i<NX;i++)spalteName.push(namen[NZ+i]);
 for(const e of kanten)e.name=e.quer?spalteName[e.spalte]:reiheName[e.reihe];
 /* Bloecke und Grundstuecke */
 const bloecke=[];
 for(let bj=0;bj<NZ-1;bj++)for(let bi=0;bi<NX-1;bi++){
  bloecke.push({bi,bj,x1:bi*A+H,z1:bj*A+H,x2:(bi+1)*A-H,z2:(bj+1)*A-H,art:'normal',lots:[]});
 }
 const block=(bi,bj)=>bloecke[bj*(NX-1)+bi];
 const flaechen=[];
 weg.forEach((e,n)=>{
  if(e.art!=='weg')return;
  const a=knoten[e.a];
  const b1=e.quer?block(a.i-1,a.j):block(a.i,a.j-1),b2=e.quer?block(a.i,a.j):block(a.i,a.j);
  const f=Object.assign({},D.FLAECHEN[flaechen.length],{x1:Math.min(b1.x1,b2.x1),z1:Math.min(b1.z1,b2.z1),x2:Math.max(b1.x2,b2.x2),z2:Math.max(b1.z2,b2.z2),kante:e.id});
  b1.art=b2.art='flaeche';b1.flaeche=b2.flaeche=f.id;flaechen.push(f);
 });
 const lots=[];
 for(const b of bloecke){
  if(b.art!=='normal')continue;
  const x1=b.x1+GEH,z1=b.z1+GEH,x2=b.x2-GEH,z2=b.z2-GEH;
  const nw=knoten[kid(b.bi,b.bj)],ne=knoten[kid(b.bi+1,b.bj)],sw=knoten[kid(b.bi,b.bj+1)],se=knoten[kid(b.bi+1,b.bj+1)];
  const add=o=>{o.id=lots.length;o.block=b;lots.push(o);b.lots.push(o);return o;};
  /* Ecken: Seiten = Richtungen, in die das Haus zur Strasse schaut */
  const ecke=(k,lx1,lz1,lx2,lz2,sx,sz,seiten)=>{const o=add({x1:lx1,z1:lz1,x2:lx2,z2:lz2,ecke:true,knoten:k.id,seiten,kanten:[]});
   k.ecken[(sz<0?'n':'s')+(sx<0?'w':'e')]=o.id;return o;};
  ecke(nw,x1,z1,x1+ECKE,z1+ECKE,1,1,[0,3]);
  ecke(ne,x2-ECKE,z1,x2,z1+ECKE,-1,1,[0,1]);
  ecke(sw,x1,z2-ECKE,x1+ECKE,z2,1,-1,[2,3]);
  ecke(se,x2-ECKE,z2-ECKE,x2,z2,-1,-1,[2,1]);
  add({x1:x1+ECKE,z1:z1,x2:x2-ECKE,z2:z1+TIEFE,seiten:[0],kante:nw.kante[1].id});
  add({x1:x1+ECKE,z1:z2-TIEFE,x2:x2-ECKE,z2:z2,seiten:[2],kante:sw.kante[1].id});
  add({x1:x1,z1:z1+ECKE,x2:x1+TIEFE,z2:z2-ECKE,seiten:[3],kante:nw.kante[2].id});
  add({x1:x2-TIEFE,z1:z1+ECKE,x2:x2,z2:z2-ECKE,seiten:[1],kante:ne.kante[2].id});
 }
 /* Ecken ihrer Strasse zuordnen: Ecke an Knoten k, Seite s -> Kante, die von k weg in Richtung senkrecht laeuft */
 for(const o of lots)if(o.ecke){const k=knoten[o.knoten];const sx=(o.x1+o.x2)/2<k.x?-1:1,sz=(o.z1+o.z2)/2<k.z?-1:1;
  o.kanten=[k.kante[sx<0?3:1],k.kante[sz<0?0:2]].filter(Boolean).map(e=>e.id);}
 /* Kreisverkehre und Ampeln */
 const grad=k=>k.nb.filter(n=>n!=null).length;
 const vier=mischen(knoten.filter(k=>k.i>0&&k.i<NX-1&&k.j>0&&k.j<NZ-1&&grad(k)===4),r);
 const rund=[];for(const k of vier){if(rund.length>=2)break;if(rund.some(q=>Math.abs(q.i-k.i)+Math.abs(q.j-k.j)<2))continue;k.rund=true;rund.push(k);}
 const drei=mischen(knoten.filter(k=>!k.rund&&grad(k)>=3),r);for(const k of drei.slice(0,3))k.ampel=true;
 /* Orte verteilen: Eckorte an verschiedene Kreuzungen, Mitte-Orte an verschiedene Strassen */
 const orte={},freieEcken=mischen(lots.filter(o=>o.ecke),r),freieMitte=mischen(lots.filter(o=>!o.ecke),r);
 const knotenBelegt=new Set(),kanteBelegt=new Set();
 for(const O of mischen(D.ORTE,r)){
  let lot=null;
  if(O.platz==='ecke'){
   const passt=o=>!o.typ&&!knotenBelegt.has(o.knoten)&&o.kanten.every(e=>kanten[e].art==='strasse')&&(O.id!=='station'||knoten[o.knoten].i===0||knoten[o.knoten].i===NX-1||knoten[o.knoten].j===0||knoten[o.knoten].j===NZ-1);
   lot=freieEcken.find(passt)||freieEcken.find(o=>!o.typ&&!knotenBelegt.has(o.knoten));
   if(lot)knotenBelegt.add(lot.knoten);
  }else{
   lot=freieMitte.find(o=>!o.typ&&!kanteBelegt.has(o.kante)&&kanten[o.kante].art==='strasse');
   if(lot)kanteBelegt.add(lot.kante);
  }
  if(!lot)return null;
  lot.typ='ort';lot.ort=O.id;orte[O.id]=Object.assign({},O,{lot:lot.id});
  if(lot.ecke)knoten[lot.knoten].ort=O.id;
 }
 for(const f of flaechen)orte[f.id]=Object.assign({},f,{flaeche:true});
 /* uebrige Grundstuecke: Reihenhaeuser oder Laeden */
 const laeden=mischen(D.LAEDEN,r);let li=0;
 for(const o of lots)if(!o.typ){
  if(!o.ecke&&r()<0.45){o.typ='laden';o.schild=laeden[li++%laeden.length];}
  else o.typ='haus';
  o.stil=Math.floor(r()*6);
 }
 /* Hindernisse */
 const kisten=[];
 for(const b of bloecke)if(b.art==='normal')kisten.push({x1:b.x1,z1:b.z1,x2:b.x2,z2:b.z2,art:'block'});
 for(const f of flaechen)kisten.push({x1:f.x1,z1:f.z1,x2:f.x2,z2:f.z2,art:'flaeche'});
 const X2=(NX-1)*A,Z2=(NZ-1)*A,RAND=60;
 kisten.push({x1:-H-RAND,z1:-H-RAND,x2:-H,z2:Z2+H+RAND,art:'rand'},{x1:X2+H,z1:-H-RAND,x2:X2+H+RAND,z2:Z2+H+RAND,art:'rand'},
  {x1:-H,z1:-H-RAND,x2:X2+H,z2:-H,art:'rand'},{x1:-H,z1:Z2+H,x2:X2+H,z2:Z2+H+RAND,art:'rand'});
 const zone=weg.find(e=>e.art==='zone');
 {const a=knoten[zone.a],b=knoten[zone.b];
  if(zone.quer){kisten.push({x1:a.x-H,z1:a.z+H+0.6,x2:a.x+H,z2:a.z+H+1.2,art:'poller'},{x1:b.x-H,z1:b.z-H-1.2,x2:b.x+H,z2:b.z-H-0.6,art:'poller'});}
  else{kisten.push({x1:a.x+H+0.6,z1:a.z-H,x2:a.x+H+1.2,z2:a.z+H,art:'poller'},{x1:b.x-H-1.2,z1:b.z-H,x2:b.x-H-0.6,z2:b.z+H,art:'poller'});}}
 const kreise=rund.map(k=>({x:k.x,z:k.z,r:INSEL,art:'insel'}));
 const w={A,NX,NZ,STR,H,GEH,ECKE,TIEFE,INSEL,knoten,kanten,bloecke,lots,flaechen,orte,kisten,kreise,zone,reiheName,spalteName,daten:D,autos:[],seed:r()};
 /* geparkte Autos am Strassenrand (nicht an Kreuzungen) */
 const farben=['#C62828','#1565C0','#F9A825','#2E7D32','#ECEFF1','#37474F','#6A1B9A','#EF6C00'];
 for(const e of mischen(kanten.filter(e=>e.art==='strasse'),r).slice(0,14)){
  const a=knoten[e.a],t=0.3+r()*0.4,seite=r()<0.5?-1:1;
  const x=e.quer?a.x+seite*(H-1.15):a.x+t*A,z=e.quer?a.z+t*A:a.z+seite*(H-1.15);
  const auto={x,z,quer:e.quer,farbe:farben[Math.floor(r()*farben.length)],kante:e.id,bus:false};
  if(w.autos.some(q=>Math.hypot(q.x-x,q.z-z)<9))continue;
  w.autos.push(auto);
  const l=2.2,b=0.95;kisten.push(e.quer?{x1:x-b,z1:z-l,x2:x+b,z2:z+l,art:'auto'}:{x1:x-l,z1:z-b,x2:x+l,z2:z+b,art:'auto'});
 }
 return w;
}
/* die zwei Bloecke links und rechts einer Strasse (als Nummern) */
function blockPaar(e){const i=e.a%NX,j=Math.floor(e.a/NX);return e.quer?[j*(NX-1)+i-1,j*(NX-1)+i]:[(j-1)*(NX-1)+i,j*(NX-1)+i];}
function richtung(a,b){return b.j<a.j?0:b.i>a.i?1:b.j>a.j?2:3;}
function zusammen(knoten,kanten){
 const nb=new Map(knoten.map(k=>[k.id,[]]));for(const e of kanten)if(e.art==='strasse'){nb.get(e.a).push(e.b);nb.get(e.b).push(e.a);}
 const ges=new Set([0]),q=[0];while(q.length){const k=q.pop();for(const n of nb.get(k))if(!ges.has(n)){ges.add(n);q.push(n);}}
 return ges.size===knoten.length;
}
function minGrad(knoten,kanten){const g=new Map(knoten.map(k=>[k.id,0]));for(const e of kanten)if(e.art==='strasse'){g.set(e.a,g.get(e.a)+1);g.set(e.b,g.get(e.b)+1);}return Math.min(...g.values());}

/* ---------------- Kollision ---------------- */
function aufloesen(w,x,z,r){
 let stoss=false;
 for(let it=0;it<3;it++){
  let bewegt=false;
  for(const k of w.kisten){
   if(x<k.x1-r||x>k.x2+r||z<k.z1-r||z>k.z2+r)continue;
   const px=Math.max(k.x1,Math.min(x,k.x2)),pz=Math.max(k.z1,Math.min(z,k.z2));
   let dx=x-px,dz=z-pz,d=Math.hypot(dx,dz);
   if(d>=r)continue;
   if(d<1e-6){/* Mittelpunkt in der Kiste: zur naechsten Kante */
    const m=[[x-k.x1,-1,0],[k.x2-x,1,0],[z-k.z1,0,-1],[k.z2-z,0,1]].sort((a,b)=>a[0]-b[0])[0];
    x+=m[1]*(m[0]+r);z+=m[2]*(m[0]+r);}
   else{x=px+dx/d*r;z=pz+dz/d*r;}
   stoss=bewegt=true;
  }
  for(const c of w.kreise){const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),min=c.r+r;if(d<min){const f=d<1e-6?1:d;x=c.x+(d<1e-6?min:dx/f*min);z=c.z+(d<1e-6?0:dz/f*min);stoss=bewegt=true;}}
  if(!bewegt)break;
 }
 return {x,z,stoss};
}
const frei=(w,x,z,r)=>{const q=aufloesen(w,x,z,r);return Math.hypot(q.x-x,q.z-z)<1e-6;};

/* ---------------- Kart ---------------- */
function kart(x,z,h){return {x,z,h,v:0,lenk:0,boost:0,ladung:0,stoss:0,rad:0,drift:0};}
/* inp: gas 0..1, bremse 0..1, lenk -1..1 (+ = rechts), boost (true = jetzt zuenden) */
function fahren(w,k,inp,dt,andere){
 k.lenk+=((inp.lenk||0)-k.lenk)*Math.min(1,dt*9);
 if(inp.boost&&k.ladung>0&&k.boost<=0){k.ladung--;k.boost=BOOST_ZEIT;k.geboostet=(k.geboostet||0)+1;}
 if(k.boost>0)k.boost=Math.max(0,k.boost-dt);
 const vmax=k.boost>0?VBOOST:VMAX*(inp.tempo||1),gas=inp.gas||0,br=inp.bremse||0;
 let a=0;
 if(k.boost>0)a=16;
 else if(gas>0)a=k.v<0?20*gas:(k.v<vmax?gas*(4+8*(1-k.v/vmax)):0);
 if(br>0)a-=k.v>0.4?22*br:7*br;
 if(!gas&&!br&&k.boost<=0){const roll=2.5+0.015*k.v*k.v;if(Math.abs(k.v)<roll*dt)k.v=0;else a-=Math.sign(k.v)*roll;}
 k.v+=a*dt;
 if(k.v>vmax&&k.boost<=0)k.v=Math.max(vmax,k.v-10*dt);
 k.v=Math.max(VRUECK,Math.min(k.v,VBOOST));
 const sp=Math.abs(k.v),greif=Math.min(1,sp/4)*(1-Math.min(0.42,Math.max(0,(sp-8)/24)));
 k.h=winkel(k.h+k.lenk*2.35*greif*(k.v<0?-1:1)*dt);
 const fx=Math.sin(k.h),fz=-Math.cos(k.h);
 const sx=k.x+fx*k.v*dt,sz=k.z+fz*k.v*dt;
 let q=aufloesen(w,sx,sz,R_KART);
 for(const o of andere||[]){if(o===k)continue;const dx=q.x-o.x,dz=q.z-o.z,d=Math.hypot(dx,dz),min=2*R_KART+0.1;
  if(d<min&&d>1e-6){const p=(min-d)/2;q.x+=dx/d*p;q.z+=dz/d*p;o.x-=dx/d*p;o.z-=dz/d*p;q.stoss=true;}}
 if(q.stoss)q=aufloesen(w,q.x,q.z,R_KART);
 const mx=q.x-k.x,mz=q.z-k.z,soll=Math.abs(k.v*dt);
 k.stoss=0;
 if(soll>1e-6){
  const vor=(mx*fx+mz*fz)/dt;
  if(Math.hypot(mx,mz)<soll*0.6&&sp>3){k.stoss=sp;k.v=vor*0.35;}
  else k.v=Math.sign(k.v)*Math.min(Math.abs(k.v),Math.abs(vor)+0.01);
 }
 k.x=q.x;k.z=q.z;k.rad+=k.v*dt/0.28;
 return k;
}

/* ---------------- Ortung im Strassennetz ---------------- */
function ort(w,x,z){
 const i=Math.round(x/A),j=Math.round(z/A);
 if(i>=0&&i<NX&&j>=0&&j<NZ&&Math.abs(x-i*A)<=KNOTEN_R&&Math.abs(z-j*A)<=KNOTEN_R)return {knoten:kid(i,j)};
 if(j>=0&&j<NZ&&Math.abs(z-j*A)<=KNOTEN_R){const i0=Math.floor(x/A);if(i0>=0&&i0<NX-1){const e=w.knoten[kid(i0,j)].kante[1];if(e)return {kante:e.id,t:(x-i0*A)/A};}}
 if(i>=0&&i<NX&&Math.abs(x-i*A)<=KNOTEN_R){const j0=Math.floor(z/A);if(j0>=0&&j0<NZ-1){const e=w.knoten[kid(i,j0)].kante[2];if(e)return {kante:e.id,t:(z-j0*A)/A};}}
 return {};
}
const andere=(e,k)=>e.a===k?e.b:e.a;
const kanteZw=(w,a,b)=>{const A_=w.knoten[a],B=w.knoten[b];const d=richtung(A_,B);return A_.kante[d];};

/* ---------------- Wege suchen ----------------
   Zustand = (Knoten, kam von). Keine Wende an Kreuzungen (ausser Sackgasse).
   start: {von,nach} = der Kart faehrt gerade von 'von' nach 'nach'. */
function route(w,start,ziel,verboten,erlaubeWende){
 const key=(k,v)=>k*64+v,dist=new Map(),vor=new Map(),todo=[];
 const push=(k,v,d,p)=>{const s=key(k,v);if(dist.has(s)&&dist.get(s)<=d)return;dist.set(s,d);vor.set(s,p);todo.push([d,k,v]);};
 const rest=start.rest==null?A:start.rest;
 push(start.nach,start.von,rest,'S');
 if(erlaubeWende)push(start.von,start.nach,(A-rest)+30,'W');
 let best=null;
 while(todo.length){
  todo.sort((a,b)=>a[0]-b[0]);const [d,k,v]=todo.shift();
  if(dist.get(key(k,v))<d)continue;
  if(k===ziel&&v!==verboten){best=key(k,v);break;}
  const K=w.knoten[k],moegl=K.nb.filter(n=>n!=null&&n!==v);
  for(const n of (moegl.length?moegl:K.nb.filter(n=>n!=null)))push(n,k,d+A,key(k,v));
 }
 if(best==null)return null;
 const pfad=[];let s=best,wende=false;
 while(true){const k=Math.floor(s/64),v=s%64,p=vor.get(s);pfad.unshift(k);
  if(p==='S'||p==='W'){pfad.unshift(v);wende=p==='W';break;}s=p;}
 /* pfad: [hinter mir, vor mir, ..., ziel] in der neuen Fahrtrichtung */
 return {pfad,wende};
}

/* ---------------- Rennstrecke ----------------
   Zufaellige Fahrt ohne Wiederholung von Kreuzungen, mit 'kurven' Abbiegungen;
   das Ziel liegt vor einem Ort an der letzten Strasse. */
function strecke(w,kurven,seed){
 const r=zufall(seed||1);
 const strassen=w.kanten.filter(e=>e.art==='strasse');
 for(let v=0;v<500;v++){
  const e0=strassen[Math.floor(r()*strassen.length)],rueck=r()<0.5;
  const s0=rueck?e0.b:e0.a,s1=rueck?e0.a:e0.b;
  const pfad=[s0,s1],besucht=new Set(pfad);let n=0,ok=true;
  while(true){
   const k=w.knoten[pfad[pfad.length-1]],von=w.knoten[pfad[pfad.length-2]],din=richtung(von,k);
   const moegl=[0,1,2,3].filter(d=>k.nb[d]!=null&&!besucht.has(k.nb[d]));
   if(!moegl.length){ok=false;break;}
   if(n>=kurven){
    /* Ziel suchen: Ort an der Strasse k -> naechster */
    const ziele=moegl.map(d=>({d,e:k.kante[d],o:zielOrt(w,k.kante[d])})).filter(x=>x.o);
    const gerade=ziele.find(x=>x.d===din);
    if(gerade||ziele.length){const z=gerade||ziele[0];if(z.d!==din)n++;pfad.push(k.nb[z.d]);return fertig(w,pfad,z.o,n);}
    if(pfad.length>40){ok=false;break;}
   }
   /* lieber abbiegen, wenn noch Kurven fehlen; geradeaus hoechstens dreimal hintereinander */
   let gerad=0;for(let i=pfad.length-1;i>=2;i--){if(richtung(w.knoten[pfad[i-2]],w.knoten[pfad[i-1]])===richtung(w.knoten[pfad[i-1]],w.knoten[pfad[i]]))gerad++;else break;}
   const kurve=moegl.filter(d=>d!==din),geradeaus=moegl.includes(din);
   let d;
   if(n<kurven&&kurve.length&&(!geradeaus||r()<0.62||gerad>=2))d=kurve[Math.floor(r()*kurve.length)];
   else if(geradeaus)d=din;else d=moegl[Math.floor(r()*moegl.length)];
   if(d!==din)n++;
   pfad.push(k.nb[d]);besucht.add(k.nb[d]);
  }
 }
 return null;
}
/* Ort an einer Strasse (Mitte bevorzugt), als Ziel */
function zielOrt(w,e){
 if(!e||e.art!=='strasse')return null;
 const l=w.lots.filter(o=>o.typ==='ort'&&(o.kante===e.id||(o.ecke&&o.kanten.includes(e.id))));
 return l.sort((a,b)=>(a.ecke?1:0)-(b.ecke?1:0))[0]||null;
}
function fertig(w,pfad,lot,kurven){
 const a=w.knoten[pfad[pfad.length-2]],b=w.knoten[pfad[pfad.length-1]],e=kanteZw(w,a.id,b.id);
 const cx=(lot.x1+lot.x2)/2,cz=(lot.z1+lot.z2)/2;
 let t=e.quer?(cz-a.z)/(b.z-a.z):(cx-a.x)/(b.x-a.x);t=Math.max(0.3,Math.min(0.7,t));
 const ziel={kante:e.id,von:a.id,nach:b.id,t,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,ort:lot.ort,lot:lot.id};
 return {pfad,ziel,kurven,start:{von:pfad[0],nach:pfad[1]}};
}

/* ---------------- Wegbeschreibung ----------------
   pfad = [hinter mir, vor mir, ..., ]; beschreibt den naechsten Abschnitt bis
   zur naechsten Abbiegung (oder bis zum Ziel). */
function drehung(dIn,dOut){return (dOut-dIn+4)%4;}  // 0 gerade, 1 rechts, 2 zurueck, 3 links
function hash(a,b){let h=(a*73856093)^(b*19349663);h=(h^(h>>>13))>>>0;return h;}
function ortName(w,id){return w.orte[id]?w.orte[id].en:id;}
function seiteVon(dir,dx,dz){/* links/rechts eines Punktes bei Fahrtrichtung dir */const lx=DX[(dir+3)%4],lz=DZ[(dir+3)%4];return dx*lx+dz*lz>0?'left':'right';}
/* Orte an einer Kante (fuer "past …") */
function orteAnKante(w,e){return w.lots.filter(o=>o.typ==='ort'&&(o.kante===e.id||(o.ecke&&o.kanten.includes(e.id)))).map(o=>o.ort);}
function flaecheAnKante(w,e){const f=w.flaechen.find(f=>{const k1=w.knoten[e.a],k2=w.knoten[e.b];
 if(e.quer)return Math.abs(f.x1-H-k1.x)<1||Math.abs(f.x2+H-k1.x)<1?Math.min(k1.z,k2.z)>=f.z1-H-1&&Math.max(k1.z,k2.z)<=f.z2+H+1:false;
 return Math.abs(f.z1-H-k1.z)<1||Math.abs(f.z2+H-k1.z)<1?Math.min(k1.x,k2.x)>=f.x1-H-1&&Math.max(k1.x,k2.x)<=f.x2+H+1:false;});return f?f.id:null;}
function abschnitt(w,pfad,ziel,opt){
 opt=opt||{};
 const K=i=>w.knoten[pfad[i]];
 if(pfad.length<2)return null;
 const dirs=[];for(let i=1;i<pfad.length;i++)dirs.push(richtung(K(i-1),K(i)));
 /* Ende des Abschnitts: erste Kreuzung (ab Index 1), an der nicht geradeaus gefahren wird */
 let ende=-1;
 for(let i=1;i<pfad.length-1;i++){if(drehung(dirs[i-1],dirs[i])!==0){ende=i;break;}}
 const zumZiel=ende<0;
 const bis=zumZiel?pfad.length-1:ende;   // Index der Kreuzung am Ende (bei Ziel: letzte Kreuzung vor dem Ziel = bis-1)
 const zwischen=[];for(let i=1;i<(zumZiel?pfad.length-1:ende);i++)zwischen.push(i);
 const s=[];
 const seed=hash(pfad[bis],pfad[bis-1]);
 /* Gerade Strecke */
 if(zwischen.length){
  const kr=zwischen.find(i=>K(i).rund);
  const nicht=new Set([zumZiel?ziel.ort:K(ende).ort]);
  const ortVorbei=(()=>{for(const i of zwischen){if(K(i).ort&&!nicht.has(K(i).ort))return K(i).ort;}
   for(let i=1;i<(zumZiel?pfad.length-2:ende);i++){const e=kanteZw(w,pfad[i],pfad[i+1]);const o=orteAnKante(w,e).find(id=>!nicht.has(id));if(o)return o;const f=flaecheAnKante(w,e);if(f)return f;}return null;})();
  const n=zwischen.length,v=seed%3;
  if(kr!=null&&n===1)s.push('Go straight on at the roundabout.');
  else if(ortVorbei&&v!==2)s.push('Go straight on past '+ortName(w,ortVorbei)+'.');
  else if(n===1){const k=K(zwischen[0]),d=dirs[0],quer=k.kante[(d+1)%4]||k.kante[(d+3)%4];
   const voll=k.kante[(d+1)%4]&&k.kante[(d+3)%4]&&k.kante[(d+1)%4].art==='strasse'&&k.kante[(d+3)%4].art==='strasse';
   s.push(!quer?'Go straight on.':voll?'Go straight on and cross '+quer.name+'.':'Go straight on past '+quer.name+'.');}
  else if(n===2)s.push(v===0?'Go straight on for about two hundred metres.':"Go straight on. Don't turn at the next two corners.");
  else s.push('Go straight on for about '+(n===3?'two hundred and fifty':'three hundred')+' metres.');
  if(kr!=null&&n>1)s.push('Go straight on at the roundabout, too.');
 }
 const dann=s.length?'Then ':'';
 if(!zumZiel){
  const k=K(ende),dIn=dirs[ende-1],dOut=dirs[ende],t=drehung(dIn,dOut),lr=t===1?'right':'left';
  const kannGerade=k.nb[dIn]!=null||(k.kante[dIn]&&k.kante[dIn].art==='zone');
  const varianten=[];
  if(k.rund)varianten.push(dann+(dann?'at':'At')+' the roundabout, turn '+lr+'.');
  else{
   if(!k.kante[dIn])varianten.push(dann+(dann?'at':'At')+' the end of the road, turn '+lr+'.');
   if(k.ort){const lot=w.lots[w.orte[k.ort].lot],dx=(lot.x1+lot.x2)/2-k.x,dz=(lot.z1+lot.z2)/2-k.z;
    const nah=dx*DX[dIn]+dz*DZ[dIn]<0;
    varianten.push(dann+(dann?'turn':'Turn')+' '+lr+' at '+ortName(w,k.ort)+'.');
    if(nah)varianten.push(dann+(dann?'turn':'Turn')+' '+lr+' just after '+ortName(w,k.ort)+'.');}
   if(k.ampel)varianten.push(dann+(dann?'turn':'Turn')+' '+lr+' at the traffic lights.');
   varianten.push(dann+(dann?'turn':'Turn')+' '+lr+' into '+k.kante[dOut].name+'.');
   /* zaehlen: "the second road on the left" */
   let n=0,sauber=!zwischen.some(i=>K(i).rund);for(let i=1;i<=ende;i++){const e=K(i).kante[t===1?(dirs[i-1]+1)%4:(dirs[i-1]+3)%4];if(e){if(e.art!=='strasse')sauber=false;n++;}}
   if(sauber&&n>=1&&n<=3&&zwischen.length&&!opt.ohneZaehlen)varianten.push((dann?'Then take':'Take')+' the '+ZAHL[n]+' road on the '+lr+'.');
  }
  if(!kannGerade&&!k.rund&&k.kante[dIn]==null){/* schon enthalten */}
  /* Wahl: Landmarke bevorzugt */
  const wahl=varianten.length>1&&k.ort&&!k.rund&&seed%5<3?varianten.find(v=>v.includes(ortName(w,k.ort))):varianten[seed%varianten.length];
  s.push(wahl);
  return {text:s.join(' '),ende:pfad[ende],endeIndex:ende,drehung:t,ziel:false};
 }
 /* Ziel */
 const e=w.kanten[ziel.kante],a=w.knoten[pfad[pfad.length-2]],b=w.knoten[pfad[pfad.length-1]],d=richtung(a,b);
 const lot=w.lots[ziel.lot],lr=seiteVon(d,(lot.x1+lot.x2)/2-ziel.x,(lot.z1+lot.z2)/2-ziel.z);
 const gegen=gegenueber(w,e,lot);
 const name=ortName(w,ziel.ort);
 const v=seed%3;
 if(v===0||!gegen)s.push(gross(name)+' is on your '+lr+'. Stop there – that\'s the finish!');
 else s.push('Stop at '+name+'. It\'s on your '+lr+', opposite '+ortName(w,gegen)+'.');
 if(!zwischen.length&&s.length===1)s.unshift('Go straight on.');
 return {text:s.join(' '),ende:null,ziel:true};
}
/* Ort auf der anderen Strassenseite */
function gegenueber(w,e,lot){
 const cx=(lot.x1+lot.x2)/2,cz=(lot.z1+lot.z2)/2;
 for(const o of w.lots){if(o===lot||o.typ!=='ort')continue;if(!(o.kante===e.id||(o.ecke&&o.kanten.includes(e.id))))continue;
  const ox=(o.x1+o.x2)/2,oz=(o.z1+o.z2)/2;
  if(e.quer?(Math.sign(ox-w.knoten[e.a].x)!==Math.sign(cx-w.knoten[e.a].x)&&Math.abs(oz-cz)<12):(Math.sign(oz-w.knoten[e.a].z)!==Math.sign(cz-w.knoten[e.a].z)&&Math.abs(ox-cx)<12))return o.ort;}
 const f=flaecheAnKante(w,e);if(f){const F=w.orte[f];const fx=(F.x1+F.x2)/2,fz=(F.z1+F.z2)/2;if(e.quer?Math.sign(fx-w.knoten[e.a].x)!==Math.sign(cx-w.knoten[e.a].x):Math.sign(fz-w.knoten[e.a].z)!==Math.sign(cz-w.knoten[e.a].z))return f;}
 return null;
}

/* ---------------- Navigator ----------------
   nav.pfad beginnt mit dem Knoten hinter dem Kart: [von, nach, ...]. */
function navigator(w,str){
 return {pfad:str.pfad.slice(),ziel:str.ziel,fehler:0,richtig:0,wenden:0,log:[],gerade:{von:str.start.von,nach:str.start.nach},im:null,ansage:null,fertig:false,wendeUhr:0};
}
/* aktuelle Ansage (Text) fuer den naechsten Abschnitt */
function ansage(w,nav,opt){const a=abschnitt(w,nav.pfad,nav.ziel,opt);nav.ansage=a;return a;}
/* Ein Schritt: Lage des Karts auswerten. Liefert Ereignisse. */
function navSchritt(w,nav,k,dt){
 const ev=[];
 if(nav.fertig)return ev;
 const o=ort(w,k.x,k.z);
 if(o.knoten!=null){if(nav.im!==o.knoten){nav.im=o.knoten;}}
 else if(o.kante!=null){
  const e=w.kanten[o.kante];
  if(nav.im!=null){
   /* gerade eine Kreuzung verlassen */
   const von=nav.im,nach=andere(e,von);nav.im=null;
   if(e.a===von||e.b===von)wechsel(w,nav,von,nach,ev);
  }else{
   /* Wenden auf der Strasse? */
   const a=w.knoten[nav.gerade.von],b=w.knoten[nav.gerade.nach];
   if(a&&b&&(e.a===a.id||e.b===a.id)&&(e.a===b.id||e.b===b.id)){
    const ex=b.x-a.x,ez=b.z-a.z,l=Math.hypot(ex,ez),fx=Math.sin(k.h)*(k.v>=0?1:-1),fz=-Math.cos(k.h)*(k.v>=0?1:-1);
    const dot=(fx*ex+fz*ez)/l;
    if(dot<-0.55&&Math.abs(k.v)>1.5){nav.wendeUhr+=dt;if(nav.wendeUhr>0.35){nav.wendeUhr=0;nav.wenden++;wechsel(w,nav,b.id,a.id,ev,true);}}
    else nav.wendeUhr=0;
   }
  }
  /* Ziel erreicht? */
  const z=nav.ziel;
  if(o.kante===z.kante){const zx=z.x,zz=z.z,d=w.kanten[z.kante].quer?Math.abs(k.z-zz):Math.abs(k.x-zx);if(d<2.2){nav.fertig=true;ev.push({art:'ziel'});}}
 }
 return ev;
}
function wechsel(w,nav,von,nach,ev,gewendet){
 const P=nav.pfad;
 nav.gerade={von,nach};
 if(P[0]===von&&P[1]===nach){if(gewendet)ev.push({art:'gewendet'});return;}
 if(P[1]===von&&P[2]===nach){
  const dIn=richtung(w.knoten[P[0]],w.knoten[P[1]]),dOut=richtung(w.knoten[P[1]],w.knoten[P[2]]),t=drehung(dIn,dOut);
  const warEnde=nav.ansage&&nav.ansage.ende===von;
  P.shift();
  if(t!==0){nav.richtig++;nav.log.push({ok:true,knoten:von,text:nav.ansage?nav.ansage.text:''});ev.push({art:'richtig',knoten:von});}
  if(warEnde||t!==0||!nav.ansage)ev.push({art:'ansage',neu:true});
  else ev.push({art:'ansage',neu:false});
  return;
 }
 /* falsch: neue Route zurueck auf die alte Strecke */
 if(!gewendet){nav.fehler++;nav.log.push({ok:false,knoten:von,text:nav.ansage?nav.ansage.text:''});}
 let zielK=P[1]===von?P[2]:P[1],idx=P.indexOf(zielK),danach=P[idx+1],anhang=P.slice(idx+1);
 if(zielK==null){/* am Ziel vorbeigefahren: zur Zielstrasse zurueck */
  zielK=nav.ziel.nach;danach=nav.ziel.von;anhang=[nav.ziel.von];
  if(von===nav.ziel.nach&&nach!==nav.ziel.von){zielK=nav.ziel.von;danach=nav.ziel.nach;anhang=[nav.ziel.nach];}}
 const r=route(w,{von,nach,rest:A},zielK,danach,!gewendet);
 if(!r){ev.push({art:'falsch',wende:false});return;}
 nav.pfad=r.pfad.concat(anhang);
 ev.push({art:gewendet?'neu':'falsch',wende:!!r.wende});
 ev.push({art:'ansage',neu:true,wende:!!r.wende});
}

/* ---------------- Autopilot (Tests) ---------------- */
function autopilot(w,nav,k){
 const P=nav.pfad;
 let zx,zz;
 if(nav.gerade.von!==P[0]||nav.gerade.nach!==P[1]){/* wenden */
  const b=w.knoten[P[1]],c=P[2]!=null?w.knoten[P[2]]:null;
  if(c&&Math.hypot(b.x-k.x,b.z-k.z)<9){zx=c.x;zz=c.z;}else if(!c&&P.length===2){zx=nav.ziel.x;zz=nav.ziel.z;}else{zx=b.x;zz=b.z;}
 }else if(P.length===2){zx=nav.ziel.x;zz=nav.ziel.z;}
 else{
  const a=w.knoten[P[0]],b=w.knoten[P[1]],c=w.knoten[P[2]];
  const dIn=richtung(a,b),dOut=richtung(b,c);
  /* linke Fahrspur */
  const lx=DX[(dIn+3)%4]*2.2,lz=DZ[(dIn+3)%4]*2.2;
  const db=Math.hypot(b.x-k.x,b.z-k.z);
  if(b.rund&&db<16){/* im Uhrzeigersinn um die Insel */
   const ang=Math.atan2(k.x-b.x,-(k.z-b.z)),soll=dOut*Math.PI/2;
   let diff=winkel(soll-ang);if(diff<0.15&&diff>-0.15){zx=c.x;zz=c.z;}
   else{const n=ang+Math.min(0.9,Math.max(0.35,diff>0?diff:diff+2*Math.PI));zx=b.x+Math.sin(n)*(INSEL+3.4);zz=b.z-Math.cos(n)*(INSEL+3.4);}
  }else if(db>9){zx=b.x+lx;zz=b.z+lz;}
  else{zx=c.x+DX[(dOut+3)%4]*2.2;zz=c.z+DZ[(dOut+3)%4]*2.2;}
 }
 const soll=Math.atan2(zx-k.x,-(zz-k.z)),diff=winkel(soll-k.h);
 const bremsen=Math.abs(diff)>0.7&&k.v>7;
 return {lenk:Math.max(-1,Math.min(1,diff*2.2)),gas:bremsen?0:(Math.abs(diff)>1.2?0.5:1),bremse:bremsen?0.8:0};
}

/* ---------------- Sonstiges ---------------- */
function sterne(nav){return nav.fehler===0?3:nav.fehler<=2?2:1;}
const zeitText=s=>{const m=Math.floor(s/60),x=s-m*60;return m+':'+(x<10?'0':'')+x.toFixed(1);};
/* Startaufstellung: zwei Karts nebeneinander auf der linken Spur */
function startplaetze(w,str,anzahl){
 const a=w.knoten[str.start.von],b=w.knoten[str.start.nach],d=richtung(a,b),h=d*Math.PI/2;
 const t=0.3,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,lx=DX[(d+3)%4],lz=DZ[(d+3)%4];
 const off=anzahl>1?[3.6,1.0]:[2.2];
 return off.map(o=>({x:x+lx*o,z:z+lz*o,h}));
}

window.StadtLogik={A,NX,NZ,STR,H,GEH,ECKE,TIEFE,INSEL,R_KART,VMAX,VBOOST,DX,DZ,zufall,mischen,bauen,aufloesen,frei,kart,fahren,ort,route,strecke,abschnitt,ansage,
 navigator,navSchritt,autopilot,sterne,zeitText,startplaetze,richtung,drehung,kanteZw,winkel,orteAnKante,gegenueber,seiteVon};
})();
