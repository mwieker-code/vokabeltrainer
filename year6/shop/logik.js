/* =========================================================================
   LOGIK fuer "Shopping Trip" (Year 6) - ohne 3D und ohne Seite testbar.
   Grundriss des Supermarkts, Regalplaetze der Waren, Kollision,
   Treffer per Blickstrahl, Einkaufslisten, Budget, Wechselgeld, Kassenbon.
   Masse in Metern. x = Osten, z = Sueden, y = oben. Eingang im Sueden.
   ========================================================================= */
(function(){
'use strict';
const W=30, D=24, R=0.28, AUGE=1.45;
const ZAHL=['zero','one','two','three','four','five','six'];

/* ---------- Grundriss ---------- */
/* Regalseiten: Abteilung, Achse, Bereich, Tiefe, Blickrichtung.
   achse 'z': die Seite laeuft von a bis b entlang z, liegt zwischen x1 und x2.
   achse 'x': entlang x, zwischen z1 und z2. n = Normale zur Gangseite. */
const GONDEL=[9.5,14.5,19.5,24.5], GT=0.6, GZ1=4, GZ2=15, GH=1.95;
const SEITEN=[
 {ort:'obst',       achse:'z', a:3,  b:15, x1:0,      x2:1.3,    nx:1,  nz:0, h:1.25, art:'kisten'},
 {ort:'gemuese',    achse:'z', a:5,  b:13, x1:4,      x2:6.2,    nx:1,  nz:0, h:0.95, art:'insel'},
 {ort:'baeckerei',  achse:'z', a:GZ1,b:GZ2,x1:GONDEL[0]-GT,x2:GONDEL[0],nx:-1,nz:0,h:GH,art:'holz',gang:1},
 {ort:'getraenke',  achse:'z', a:GZ1,b:GZ2,x1:GONDEL[0],x2:GONDEL[0]+GT,nx:1,nz:0,h:GH,art:'regal',gang:2},
 {ort:'fruehstueck',achse:'z', a:GZ1,b:GZ2,x1:GONDEL[1]-GT,x2:GONDEL[1],nx:-1,nz:0,h:GH,art:'regal',gang:2},
 {ort:'snacks',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[1],x2:GONDEL[1]+GT,nx:1,nz:0,h:GH,art:'regal',gang:3},
 {ort:'kochen',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[2]-GT,x2:GONDEL[2],nx:-1,nz:0,h:GH,art:'regal',gang:3},
 {ort:'dosen',      achse:'z', a:GZ1,b:GZ2,x1:GONDEL[2],x2:GONDEL[2]+GT,nx:1,nz:0,h:GH,art:'regal',gang:4},
 {ort:'haushalt',   achse:'z', a:GZ1,b:GZ2,x1:GONDEL[3]-GT,x2:GONDEL[3],nx:-1,nz:0,h:GH,art:'regal',gang:4},
 {ort:'pflege',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[3],x2:GONDEL[3]+GT,nx:1,nz:0,h:GH,art:'regal',gang:5},
 {ort:'kuehl',      achse:'x', a:2,  b:27, z1:0,      z2:1.0,    nx:0,  nz:1, h:2.1, art:'kuehl'},
 {ort:'tiefkuehl',  achse:'z', a:3,  b:15, x1:29,     x2:30,     nx:-1, nz:0, h:2.1, art:'tiefkuehl',gang:5}
];
/* Gaenge: Schild ueber dem Gang; welche Abteilungen dort stehen, ergibt
   sich aus den Regalseiten (siehe bauen, wegen "Shuffle day"). */
const GANG_X=[(6.2+GONDEL[0]-GT)/2,(GONDEL[0]+GT+GONDEL[1]-GT)/2,(GONDEL[1]+GT+GONDEL[2]-GT)/2,(GONDEL[2]+GT+GONDEL[3]-GT)/2,(GONDEL[3]+GT+29)/2];
/* Kassen: Band von z 18 bis 21, Kundenseite im Westen. Kasse 1 ist besetzt. */
const KASSEN=[14,18.5,23].map((x,k)=>({nr:k+1,x1:x,x2:x+0.9,z1:18,z2:21,offen:k===0}));
const KASSEN_ZONE={x1:12.4,x2:14,z1:17.4,z2:21.6};
const START={x:5,z:22.3,yaw:0};
/* Mitarbeiterin mit Rollwagen (Gang 3, an der Grenze zweier Regalplaetze) und
   das Schild 'Caution: wet floor' (hinten vor dem Tiefkuehlgang) */
const PERSONAL={x:GONDEL[1]+GT+0.35,z:GZ1+2.2*2,yaw:-Math.PI/2,wx1:GONDEL[1]+GT+0.65,wx2:GONDEL[1]+GT+1.3,wz1:GZ1+2.2*2-0.3,wz2:GZ1+2.2*2+0.35};
const NASS={x:24.6,z:3.15};
const TUER={x1:3,x2:7};

/* bauen(daten, {mischen: zahl}) - mit "mischen" ist "Shuffle day": Die
   Abteilungen der acht Regalseiten werden neu verteilt, Obst und Gemuese
   tauschen vielleicht die Plaetze, die Waren stehen in neuer Reihenfolge.
   Kuehl- und Tiefkuehlregal bleiben, wo sie sind. */
function bauen(daten,opt){
 opt=opt||{};
 const seiten=SEITEN.map(s=>({...s})),rnd=opt.mischen?zufall(opt.mischen):null;
 /* Mit "mischen" gibt es auch drei Sonderangebote (SALE): Preis rund 25 % billiger,
    auf 5p gerundet; der alte Preis steht in "alt". Kuehlware ausgenommen nicht. */
 let waren=daten.WAREN;
 if(rnd){waren=waren.map(w=>({...w}));for(const w of mischen(waren.filter(x=>x.p>=80&&x.id!=='strawberries'&&x.id!=='bread'),rnd).slice(0,3)){w.alt=w.p;w.p=Math.max(5,Math.round(w.p*0.75/5)*5);}}
 const byId={};waren.forEach(w=>byId[w.id]=w);
 if(rnd){
  const regal=seiten.filter(s=>s.art==='regal'||s.art==='holz'),orte=mischen(regal.map(s=>s.ort),rnd);
  regal.forEach((s,k)=>{s.ort=orte[k];s.art=s.ort==='baeckerei'?'holz':'regal';});
  if(rnd()<0.5){const a=seiten.find(s=>s.art==='kisten'),b=seiten.find(s=>s.art==='insel');[a.ort,b.ort]=[b.ort,a.ort];}
 }
 const GAENGE=GANG_X.map((x,k)=>({nr:k+1,x,orte:seiten.filter(s=>s.gang===k+1).map(s=>s.ort)}));
 const plaetze=[];
 for(const s of seiten){
  let liste=waren.filter(w=>w.ort===s.ort);if(rnd)liste=mischen(liste,rnd);
  const n=liste.length,len=(s.b-s.a)/n;
  liste.forEach((w,k)=>{
   const a=s.a+k*len,b=a+len,m=(a+b)/2;
   const p={id:w.id,ort:s.ort,seite:s,a,b,y1:0,y2:s.h,nx:s.nx,nz:s.nz};
   if(s.achse==='z'){p.x1=s.x1;p.x2=s.x2;p.z1=a;p.z2=b;
    const fx=s.nx>0?s.x2:s.x1;p.vorne=[{x:fx+s.nx*0.75,z:m}];
    if(s.art==='insel')p.vorne.push({x:s.x1-0.75,z:m});}
   else{p.z1=s.z1;p.z2=s.z2;p.x1=a;p.x2=b;p.vorne=[{x:m,z:s.z2+0.75}];}
   plaetze.push(p);
  });
 }
 /* Hindernisse (x/z-Rechtecke) */
 const hin=[];
 const box=(x1,z1,x2,z2,art)=>hin.push({x1,z1,x2,z2,art});
 box(-1,-1,W+1,0,'wand');box(-1,D,W+1,D+1,'wand');box(-1,-1,0,D+1,'wand');box(W,-1,W+1,D+1,'wand');
 box(0,0,2,1.0,'kuehl');box(27,0,W,1.0,'kuehl');            // Ecken neben den Kuehlregalen
 for(const s of seiten){
  if(s.achse==='z')box(s.x1,s.a,s.x2,s.b,s.art);else box(s.a,s.z1,s.b,s.z2,s.art);
 }
 for(const k of KASSEN){box(k.x1,k.z1,k.x2,k.z2,'kasse');box(k.x2,k.z1+1,k.x2+1.1,k.z2,'kabine');}
 box(0.4,20.6,1.6,22.4,'koerbe');                         // Korbstapel am Eingang
 box(26.5,19.5,28.5,21.5,'aufsteller');                   // Angebots-Aufsteller
 box(0.35,17.9,1.65,20.35,'wagen');                        // Einkaufswagen am Eingang
 for(const [x,z] of [[2.3,23.1],[8.2,23.1],[29.2,23.0]])box(x-0.32,z-0.32,x+0.32,z+0.32,'pflanze');   // Pflanzen im Eingangsbereich
 box(9.0,21.4,9.7,22.2,'tafel');                           // Kreidetafel mit Angeboten
 box(PERSONAL.x-0.25,PERSONAL.z-0.25,PERSONAL.x+0.25,PERSONAL.z+0.25,'personal');   // Mitarbeiterin beim Auffuellen
 box(PERSONAL.wx1,PERSONAL.wz1,PERSONAL.wx2,PERSONAL.wz2,'rollwagen');
 box(NASS.x-0.3,NASS.z-0.3,NASS.x+0.3,NASS.z+0.3,'nass');                             // Schild 'wet floor' mit Eimer
 for(const gx of GONDEL)box(gx-GT,GZ2,gx+GT,GZ2+0.55,'aktion');   // Aktionsware vor jedem Regal
 box(0,23.6,W,D,'tuerfeld');                               // nicht hinaus
 const layout=plaetze.map(p=>p.id).join(',')+'|'+waren.filter(w=>w.alt).map(w=>w.id+':'+w.p).join(',');
 return {W,D,R,AUGE,daten,waren,byId,plaetze,hin,SEITEN:seiten,GAENGE,layout,gemischt:!!rnd,PERSONAL,NASS,angebote:waren.filter(w=>w.alt),KASSEN,KASSEN_ZONE,START,TUER,GONDEL,GT,GZ1,GZ2,GH};
}

/* ---------- Bewegung ---------- */
function frei(welt,x,z,r,leute){
 r=r===undefined?welt.R:r;
 for(const h of welt.hin)if(x>h.x1-r&&x<h.x2+r&&z>h.z1-r&&z<h.z2+r)return false;
 if(leute)for(const q of leute){if(Math.hypot(x-q.x,z-q.z)<r+0.26)return false;
  if(q.wagen){const w=wagenPunkt(q);if(Math.hypot(x-w.x,z-w.z)<r+0.38)return false;}}
 return true;
}
/* Schritt mit Gleiten an Kanten: erst x, dann z. leute: Personen, durch die
   man nicht hindurchlaeuft (wer schon drinsteht, kommt wieder heraus). */
function bewegen(welt,p,dx,dz,leute){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.1));
 const nah=leute?leute.filter(q=>Math.hypot(p.x-q.x,p.z-q.z)>=welt.R+0.26&&(!q.wagen||Math.hypot(p.x-wagenPunkt(q).x,p.z-wagenPunkt(q).z)>=welt.R+0.38)):null;
 for(let i=0;i<n;i++){
  const nx=p.x+dx/n;if(frei(welt,nx,p.z,undefined,nah))p.x=nx;
  const nz=p.z+dz/n;if(frei(welt,p.x,nz,undefined,nah))p.z=nz;
 }
 return p;
}

/* Mitte des Einkaufswagens, den eine Person vor sich herschiebt */
function wagenPunkt(q){return {x:q.x+Math.sin(q.yaw)*0.95,z:q.z-Math.cos(q.yaw)*0.95};}

/* ---------- Kundschaft im Laden ----------
   Laeuft auf festen Bahnen: senkrecht durch die Gaenge, waagrecht vorn und
   hinten. Bleibt manchmal stehen und schaut ins Regal. Wartet, wenn jemand
   im Weg steht. Nur Kulisse fuer die Aufgaben. */
const BAHN_X=[2.65,7.55,12,17,22,27],BAHN_Z=[2.3,9.4,16.3];
function bahnen(){
 const knoten=[],kanten=[];
 BAHN_X.forEach((x,i)=>BAHN_Z.forEach((z,j)=>knoten.push({x,z,i,j})));
 const id=(i,j)=>i*BAHN_Z.length+j;
 BAHN_X.forEach((x,i)=>BAHN_Z.forEach((z,j)=>{
  const nb=[];
  if(j>0)nb.push(id(i,j-1));if(j<BAHN_Z.length-1)nb.push(id(i,j+1));
  if(j!==1){if(i>0)nb.push(id(i-1,j));if(i<BAHN_X.length-1)nb.push(id(i+1,j));}
  kanten[id(i,j)]=nb;}));
 return {knoten,kanten};
}
function kundschaft(welt,anzahl,rnd){
 rnd=rnd||Math.random;const B=bahnen(),out=[];
 for(let k=0;k<anzahl;k++){
  const start=(k*7+3)%B.knoten.length,n=B.knoten[start];
  out.push({nr:k,look:k,x:n.x,z:n.z,yaw:0,knoten:start,ziel:B.kanten[start][0],vorher:-1,warte:1+rnd()*3,geht:false,tempo:0.75+rnd()*0.35,phase:rnd()*6,wagen:k===1});
 }
 /* ein Kind laeuft hinter einer Erwachsenen her */
 const leit=anzahl>5?5:0;
 if(anzahl>0)out.push({nr:anzahl,look:6,folgt:leit,x:out[leit].x,z:out[leit].z+0.7,yaw:0,geht:false,phase:0});
 /* eine Person steht fest am Blumenstand */
 out.push({nr:anzahl+1,look:7,x:26.05,z:20.5,yaw:Math.PI/2,fest:true,geht:false,phase:0});
 return {B,leute:out};
}
function kundschaftSchritt(welt,K,dt,spieler,rnd){
 rnd=rnd||Math.random;
 for(const q of K.leute){
  if(q.fest){q.geht=false;continue;}
  if(q.folgt!=null){const l=K.leute.find(o=>o.nr===q.folgt);if(!l)continue;
   const zx=l.x-Math.sin(l.yaw)*0.7+Math.cos(l.yaw)*0.32,zz=l.z+Math.cos(l.yaw)*0.7+Math.sin(l.yaw)*0.32,d=Math.hypot(zx-q.x,zz-q.z);
   let geht=false;
   if(d>0.02){const s=Math.min(d,1.6*dt),nx=q.x+(zx-q.x)/d*s,nz=q.z+(zz-q.z)/d*s;
    /* nicht in andere hinein (auch nicht in die eigene Begleitung) */
    const frei2=K.leute.every(o=>o===q||Math.hypot(nx-o.x,nz-o.z)>=0.5||Math.hypot(q.x-o.x,q.z-o.z)<Math.hypot(nx-o.x,nz-o.z))&&spieler.every(p=>!p||Math.hypot(nx-p.x,nz-p.z)>=0.6);
    if(frei2&&frei(welt,nx,nz,0.15)){q.x=nx;q.z=nz;q.phase+=s*5.5;geht=dt>0&&s/dt>0.2;}}
   /* "geht" nach der echten Geschwindigkeit (das Kind bleibt dicht dran, der Abstand
      sagt darum nichts); kurz nachlaufen lassen, damit die Beine nicht flackern */
   q.nachlauf=geht?0.25:Math.max(0,(q.nachlauf||0)-dt);q.geht=geht||q.nachlauf>0;q.yaw=l.yaw;q.greift=false;continue;}
  if(q.warte>0){q.warte-=dt;q.geht=false;if(q.warte<=0)q.greift=false;continue;}
  const z=K.B.knoten[q.ziel],dx=z.x-q.x,dz=z.z-q.z,d=Math.hypot(dx,dz);
  if(d<0.05){
   q.vorher=q.knoten;q.knoten=q.ziel;
   const nb=K.B.kanten[q.knoten],wahl=nb.filter(i=>i!==q.vorher);
   q.ziel=(wahl.length?wahl:nb)[Math.floor(rnd()*(wahl.length||nb.length))];
   q.greift=false;
   if(rnd()<0.35){q.warte=2+rnd()*3;
    /* im Gang: zum Regal drehen und etwas herausnehmen */
    if(z.j===1&&z.i>0){q.yaw=rnd()<0.5?Math.PI/2:-Math.PI/2;q.greift=!q.wagen;q.griffStart=q.warte;}}
   continue;
  }
  const s=Math.min(d,q.tempo*dt),nx=q.x+dx/d*s,nz=q.z+dz/d*s;
  const blockiert=spieler.some(p=>p&&Math.hypot(nx-p.x,nz-p.z)<0.75)||K.leute.some(o=>o!==q&&Math.hypot(nx-o.x,nz-o.z)<(o.folgt===q.nr?0.34:0.6)&&Math.hypot(q.x-o.x,q.z-o.z)>=Math.hypot(nx-o.x,nz-o.z));
  q.yaw=Math.atan2(dx,-dz);
  if(blockiert){q.geht=false;q.stau=(q.stau||0)+dt;
   /* zu lange im Stau: umdrehen und zurueck */
   if(q.stau>1.2+rnd()){q.stau=0;const t=q.ziel;q.ziel=q.knoten;q.knoten=t;q.vorher=-1;}
   continue;}
  q.stau=0;q.x=nx;q.z=nz;q.geht=true;q.phase+=s*4.2;
 }
}
function inKassenZone(welt,p){const k=welt.KASSEN_ZONE;return p.x>=k.x1&&p.x<=k.x2&&p.z>=k.z1&&p.z<=k.z2;}

/* ---------- Blickstrahl ---------- */
function richtung(yaw,pitch){const c=Math.cos(pitch);return [Math.sin(yaw)*c,Math.sin(pitch),-Math.cos(yaw)*c];}
/* Strahl durch einen Bildpunkt (ndc: -1..1), Kamera wie in three.js (YXZ) */
function strahl(p,ndcX,ndcY,fov,aspect){
 const t=Math.tan(fov*Math.PI/360);
 let x=ndcX*t*aspect,y=ndcY*t,z=-1;
 /* Neigung um x */
 const cp=Math.cos(p.pitch||0),sp=Math.sin(p.pitch||0);
 let y2=y*cp-z*sp,z2=y*sp+z*cp;
 /* Drehung um y um -yaw */
 const th=-p.yaw,c=Math.cos(th),s=Math.sin(th);
 const x3=x*c+z2*s,z3=-x*s+z2*c;
 const l=Math.hypot(x3,y2,z3);
 return {o:[p.x,AUGE,p.z],d:[x3/l,y2/l,z3/l]};
}
function strahlBox(o,d,b){
 let t0=0,t1=Infinity;
 const lo=[b.x1,b.y1,b.z1],hi=[b.x2,b.y2,b.z2];
 for(let k=0;k<3;k++){
  if(Math.abs(d[k])<1e-9){if(o[k]<lo[k]||o[k]>hi[k])return null;continue;}
  let a=(lo[k]-o[k])/d[k],c=(hi[k]-o[k])/d[k];if(a>c)[a,c]=[c,a];
  t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return null;
 }
 return t0;
}
/* Naechster Regalplatz entlang des Strahls (bis max Meter) */
function treffer(welt,o,d,max){
 max=max||4.5;let best=null;
 for(const p of welt.plaetze){const t=strahlBox(o,d,p);if(t!==null&&t<=max&&(!best||t<best.t))best={platz:p,t};}
 return best;
}
function blickTreffer(welt,p,max){return treffer(welt,[p.x,AUGE,p.z],richtung(p.yaw,p.pitch||0),max);}

/* ---------- Text ---------- */
const betrag=p=>'£'+(p/100).toFixed(2);
const preis=p=>p<100?p+'p':betrag(p);
const gross=s=>s.charAt(0).toUpperCase()+s.slice(1);
function menge(w,n){return n===1?w.en:(ZAHL[n]||String(n))+' '+w.pl;}

/* ---------- Zufall ---------- */
function zufall(seed){let n=(seed>>>0)||1;return ()=>{n=(n*16807)%2147483647;return (n-1)/2147483646;};}
function mischen(a,rnd){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- Einkaufsliste ---------- */
/* n Waren aus moeglichst verschiedenen Abteilungen; mit mengen=true
   bekommen einige Waren eine Zahl (two, three). */
function liste(welt,opt,rnd){
 rnd=rnd||Math.random;const n=opt.n||5;
 const orte=mischen(Object.keys(welt.daten.ORTE),rnd),gewaehlt=[];
 let k=0;
 while(gewaehlt.length<n&&k<200){
  const ort=orte[k%orte.length];k++;
  const kand=welt.waren.filter(w=>w.ort===ort&&!gewaehlt.some(g=>g.id===w.id));
  if(!kand.length)continue;
  if(k<=orte.length||rnd()<0.5)gewaehlt.push(kand[Math.floor(rnd()*kand.length)]);
 }
 let mitZahl=0;
 return gewaehlt.map(w=>{
  let anz=1;
  if(opt.mengen&&w.menge&&mitZahl<3&&rnd()<0.75){anz=2+Math.floor(rnd()*2);mitZahl++;}
  return {id:w.id,n:anz,text:menge(w,anz)};
 });
}
function korbAnzahl(korb){return Object.values(korb).reduce((a,b)=>a+b,0);}
function korbSumme(welt,korb){return Object.entries(korb).reduce((s,[id,n])=>s+welt.byId[id].p*n,0);}
function listeStand(welt,li,korb){
 const zeilen=li.map(e=>({...e,hat:korb[e.id]||0,ok:(korb[e.id]||0)===e.n,zuviel:(korb[e.id]||0)>e.n}));
 const extra=[];
 for(const [id,n] of Object.entries(korb)){if(!n)continue;const e=li.find(x=>x.id===id);
  if(!e)extra.push({id,n});else if(n>e.n)extra.push({id,n:n-e.n});}
 return {zeilen,extra,fertig:zeilen.every(z=>z.ok)&&!extra.length,alleDa:zeilen.every(z=>z.hat>=z.n)};
}

/* ---------- Budget ---------- */
function budgetStand(welt,auftrag,korb){
 const gruppen=auftrag.gruppen.map(g=>{
  const soll=g.n||1,ids=g.aus.filter(id=>korb[id]);
  const hat=ids.reduce((a,id)=>a+korb[id],0);
  const billig=g.aus.map(id=>welt.byId[id]).sort((a,b)=>a.p-b.p)[0];
  return {...g,soll,hat,ok:hat>=soll,ids,billig};
 });
 const erlaubt=new Set(auftrag.gruppen.flatMap(g=>g.aus));
 const extra=Object.entries(korb).filter(([id,n])=>n&&!erlaubt.has(id)).map(([id,n])=>({id,n}));
 const summe=korbSumme(welt,korb),min=minimum(welt,auftrag);
 return {gruppen,extra,summe,min,budget:auftrag.budget,rest:auftrag.budget-summe,imBudget:summe<=auftrag.budget,
  fertig:gruppen.every(g=>g.ok)&&!extra.length};
}
function minimum(welt,auftrag){
 return auftrag.gruppen.reduce((s,g)=>s+(g.n||1)*Math.min(...g.aus.map(id=>welt.byId[id].p)),0);
}
/* Saetze mit Steigerung: Was war billig, was waere billiger gewesen? */
function vergleiche(welt,stand){
 const out=[];
 for(const g of stand.gruppen){
  if(!g.ids.length)continue;
  const teuerste=g.ids.map(id=>welt.byId[id]).sort((a,b)=>b.p-a.p)[0],b=g.billig;
  if(g.aus.length<2)continue;
  if(teuerste.id===b.id)out.push({gut:true,text:gross(b.en)+' ('+preis(b.p)+') is the cheapest choice.'});
  else out.push({gut:false,text:gross(b.en)+' ('+preis(b.p)+') is cheaper than '+teuerste.en+' ('+preis(teuerste.p)+').'});
 }
 return out;
}

/* ---------- Geld ---------- */
function wechselOptionen(c,rnd){
 rnd=rnd||Math.random;
 const kand=[c+10,c-10,c+100,c-100,c+50,c-50,c+1,c-1].filter(v=>v>=0&&v!==c);
 const wahl=mischen(kand,rnd).slice(0,2);
 return mischen([c,...wahl],rnd);
}
/* Bezahlt: Summe ausgewaehlter Muenzen (Indizes in GELD) */
function bezahlt(daten,auswahl){return auswahl.reduce((s,i)=>s+daten.GELD[i],0);}

/* ---------- Kasse ---------- */
function kassenSchritte(welt,summe,rnd){
 rnd=rnd||Math.random;const K=welt.daten.KASSE;
 const eins=a=>a[Math.floor(rnd()*a.length)];
 const schritt=(art,v)=>{const s={art,sagt:(v.sagt||'').replace('{SUMME}',betrag(summe)),de:v.de||'',richtig:v.ant[0],warum:v.warum,antwort:v.antwort||''};
  s.optionen=mischen(v.ant,rnd);return s;};
 return [schritt('gruss',eins(K.gruss)),schritt('tuete',eins(K.tuete)),schritt('frage',eins(K.frage)),
  schritt('zahlen',eins(K.zahlen)),{art:'geld',summe},{art:'wechsel'},schritt('bon',eins(K.bon)),schritt('tschuess',eins(K.tschuess))];
}

/* ---------- Duell ---------- */
function duellAufgaben(welt,n,rnd){
 rnd=rnd||Math.random;
 const orte=mischen(Object.keys(welt.daten.ORTE),rnd),out=[];
 for(let k=0;out.length<n&&k<400;k++){
  const ort=orte[k%orte.length],kand=welt.waren.filter(w=>w.ort===ort&&!out.includes(w));
  if(kand.length)out.push(kand[Math.floor(rnd()*kand.length)]);
 }
 return out;
}
/* Wo steht eine Ware? Ein englischer Satz fuer Hilfe und Duell. */
function seiteVon(welt,id){return welt.plaetze.find(p=>p.id===id).seite;}
function wo(welt,id){
 const s=seiteVon(welt,id),name=welt.daten.ORTE[s.ort].en;
 if(s.art==='kuehl')return 'It\'s in the fridge at the back of the shop.';
 if(s.art==='tiefkuehl')return 'It\'s in the freezer in aisle '+s.gang+'.';
 if(s.art==='kisten')return 'It\'s in the '+name.toLowerCase()+' section on the left.';
 if(s.art==='insel')return 'It\'s in the '+name.toLowerCase()+' section, near aisle 1.';
 return 'It\'s in aisle '+s.gang+' ('+name+').';
}
const ORTFARBE={obst:'#E9573F',gemuese:'#8CC152',baeckerei:'#C8863E',getraenke:'#3BAFDA',fruehstueck:'#F6BB42',snacks:'#D770AD',
 kochen:'#DA4453',dosen:'#967ADC',haushalt:'#37BC9B',pflege:'#4A89DC',kuehl:'#5DADE2',tiefkuehl:'#7FA6C9'};
/* Customer service: n Anliegen in zufaelliger Reihenfolge */
function wuensche(welt,n,rnd){const a=mischen(welt.daten.WUENSCHE,rnd||Math.random),out=[];for(let i=0;i<n;i++)out.push(a[i%a.length]);return out;}
/* Price war: Punkte fuer einen Einkauf mit Budget. Alles da und im Budget:
   100 Punkte plus 1 Punkt je 5p, die uebrig bleiben. Sonst Punkte je Gruppe. */
function preisWertung(welt,auftrag,korb){
 const st=budgetStand(welt,auftrag,korb),ok=st.gruppen.filter(g=>g.ok).length;
 const voll=st.gruppen.every(g=>g.ok)&&!st.extra.length;
 const punkte=voll&&st.imBudget?100+Math.round(st.rest/5):st.imBudget?15*ok:5*ok;
 return {...st,ok,voll,punkte};
}
function duellPunkte(sekundenUebrig,frist){return 100+Math.max(0,Math.round(50*sekundenUebrig/frist));}

/* ---------- Bon ---------- */
function bon(welt,korb){
 const zeilen=Object.entries(korb).filter(([,n])=>n>0).map(([id,n])=>{const w=welt.byId[id];return {id,n,name:gross(w.en.replace(/^an? /,'')),einzel:w.p,summe:w.p*n};});
 return {zeilen,summe:zeilen.reduce((s,z)=>s+z.summe,0)};
}
function sterne(anteil){return anteil>=0.9?3:anteil>=0.65?2:1;}

/* ---------- Where is ...? und Price detective ---------- */
/* Bereich einer Ware: Gang 1-4 (beide Regalseiten, Tiefkuehl zaehlt zu Gang 4)
   oder eine eigene Abteilung. */
function bereich(welt,id){
 const s=seiteVon(welt,id),name=welt.daten.ORTE[s.ort].en.toLowerCase();
 if(s.gang)return {key:'g'+s.gang,text:'in aisle '+s.gang,ort:s.art==='tiefkuehl'?'in the freezer in aisle '+s.gang:'in aisle '+s.gang};
 const T={kuehl:'in the fridge at the back',kisten:'in the '+name+' section on the left',insel:'in the '+name+' section'};
 return {key:s.art,text:T[s.art],ort:T[s.art]};
}
function istPlural(welt,id){return /s$/.test(welt.byId[id].schild);}
function nachbarn(welt,id){
 const p=welt.plaetze.find(q=>q.id===id),reihe=welt.plaetze.filter(q=>q.seite===p.seite).sort((a,b)=>a.a-b.a),k=reihe.indexOf(p);
 return [reihe[k-1],reihe[k+1]].filter(Boolean).map(q=>q.id);
}
function nachbarText(welt,id){
 const n=nachbarn(welt,id),name=i=>'the '+welt.byId[i].schild.toLowerCase();
 return n.length>1?'between '+name(n[0])+' and '+name(n[1]):'next to '+name(n[0]);
}
function lageSatz(welt,id){return 'It\'s '+bereich(welt,id).ort+', '+nachbarText(welt,id)+'.';}
function kundenFrage(welt,id){return 'Excuse me, where '+(istPlural(welt,id)?'are':'is')+' the '+welt.byId[id].schild.toLowerCase()+'?';}
/* Drei Antworten: richtig, falscher Ort, falsche Nachbarn */
/* Die Mitarbeiterin fragen: richtige Frage und zwei typische Fehler (is/are, Wortstellung) */
function frageFormen(welt,id,rnd){
 const ding='the '+welt.byId[id].schild.toLowerCase(),pl=istPlural(welt,id);
 const richtig='Excuse me, where '+(pl?'are ':'is ')+ding+'?';
 return {richtig,optionen:mischen([richtig,'Excuse me, where '+(pl?'is ':'are ')+ding+'?','Excuse me, where '+ding+(pl?' are?':' is?')],rnd||Math.random)};
}
function nahBeiPersonal(welt,p){const P=welt.PERSONAL,d=Math.hypot(p.x-P.x,p.z-P.z);if(d>2.4)return false;
 const f=[Math.sin(p.yaw),-Math.cos(p.yaw)],r=[(P.x-p.x)/d,(P.z-p.z)/d];return f[0]*r[0]+f[1]*r[1]>0.35;}
function lageOptionen(welt,id,rnd){
 rnd=rnd||Math.random;
 const richtig=lageSatz(welt,id),b=bereich(welt,id);
 const orte=[...new Set(welt.waren.map(w=>bereich(welt,w.id).ort))].filter(o=>o!==b.ort);
 const falschOrt='It\'s '+orte[Math.floor(rnd()*orte.length)]+', '+nachbarText(welt,id)+'.';
 const andere=welt.waren.filter(w=>w.ort!==welt.byId[id].ort);
 let falschNachbar=richtig;
 for(let k=0;k<20&&(falschNachbar===richtig||falschNachbar===falschOrt);k++)falschNachbar='It\'s '+b.ort+', '+nachbarText(welt,andere[Math.floor(rnd()*andere.length)].id)+'.';
 return {richtig,optionen:mischen([richtig,falschOrt,falschNachbar],rnd)};
}
/* Preisraetsel: genau eine Ware passt */
function raetsel(welt,rnd,ohne){
 rnd=rnd||Math.random;ohne=ohne||[];
 for(let v=0;v<400;v++){
  const t=welt.waren[Math.floor(rnd()*welt.waren.length)];if(ohne.includes(t.id))continue;
  const b=bereich(welt,t.id),gruppe=welt.waren.filter(w=>bereich(welt,w.id).key===b.key);
  if(gruppe.length<3||gruppe.some(w=>w!==t&&w.p===t.p))continue;
  const teurer=gruppe.filter(w=>w.p>t.p).sort((a,c)=>a.p-c.p),billiger=gruppe.filter(w=>w.p<t.p).sort((a,c)=>c.p-a.p);
  const name=w=>'the '+w.schild.toLowerCase();
  let text;
  if(!billiger.length)text='I\'m the cheapest thing '+b.text+'.';
  else if(!teurer.length)text='I\'m the most expensive thing '+b.text+'.';
  else{if(rnd()<0.15)continue;
   text='I\'m '+b.text+'. I\'m cheaper than '+name(teurer[0])+', but more expensive than '+name(billiger[0])+'.';}
  return {id:t.id,text:text+' What am I?'};
 }
 return null;
}
/* Recipe mission */
function rezeptStand(welt,rezept,korb){
 const ids=rezept.zutaten.map(z=>z[0]);
 const zutaten=rezept.zutaten.map(([id,wort])=>({id,wort,ok:!!korb[id]}));
 const extra=Object.entries(korb).filter(([id,n])=>n&&!ids.includes(id)).map(([id,n])=>({id,n}));
 const anteil=Math.max(0,zutaten.filter(z=>z.ok).length-0.5*extra.length)/zutaten.length;
 return {zutaten,extra,anteil,alle:zutaten.every(z=>z.ok)};
}

/* ---------- Wegnetz (fuer Tests und Karte) ---------- */
function erreichbar(welt,schritt){
 schritt=schritt||0.25;
 const cw=Math.ceil(welt.W/schritt),ch=Math.ceil(welt.D/schritt),seen=new Uint8Array(cw*ch);
 const zelle=(x,z)=>[Math.floor(x/schritt),Math.floor(z/schritt)];
 const [si,sj]=zelle(welt.START.x,welt.START.z);const q=[[si,sj]];seen[sj*cw+si]=1;
 while(q.length){const [i,j]=q.shift();
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=cw||b>=ch||seen[b*cw+a])continue;
   if(!frei(welt,(a+0.5)*schritt,(b+0.5)*schritt))continue;seen[b*cw+a]=1;q.push([a,b]);}}
 return (x,z)=>{const [i,j]=zelle(x,z);return i>=0&&j>=0&&i<cw&&j<ch&&!!seen[j*cw+i];};
}

window.ShopLogik={bauen,frei,bewegen,inKassenZone,richtung,strahl,strahlBox,treffer,blickTreffer,
 betrag,preis,gross,menge,zufall,mischen,liste,korbAnzahl,korbSumme,listeStand,budgetStand,minimum,vergleiche,
 wechselOptionen,bezahlt,kassenSchritte,duellAufgaben,duellPunkte,wuensche,preisWertung,seiteVon,wo,ORTFARBE,bon,sterne,erreichbar,AUGE,ZAHL,
 bahnen,kundschaft,kundschaftSchritt,frageFormen,nahBeiPersonal,wagenPunkt,bereich,istPlural,nachbarn,nachbarText,lageSatz,kundenFrage,lageOptionen,raetsel,rezeptStand};
})();
