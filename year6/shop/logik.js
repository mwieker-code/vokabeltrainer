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
 {ort:'baeckerei',  achse:'z', a:GZ1,b:GZ2,x1:GONDEL[0]-GT,x2:GONDEL[0],nx:-1,nz:0,h:GH,art:'holz'},
 {ort:'getraenke',  achse:'z', a:GZ1,b:GZ2,x1:GONDEL[0],x2:GONDEL[0]+GT,nx:1,nz:0,h:GH,art:'regal'},
 {ort:'fruehstueck',achse:'z', a:GZ1,b:GZ2,x1:GONDEL[1]-GT,x2:GONDEL[1],nx:-1,nz:0,h:GH,art:'regal'},
 {ort:'snacks',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[1],x2:GONDEL[1]+GT,nx:1,nz:0,h:GH,art:'regal'},
 {ort:'kochen',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[2]-GT,x2:GONDEL[2],nx:-1,nz:0,h:GH,art:'regal'},
 {ort:'dosen',      achse:'z', a:GZ1,b:GZ2,x1:GONDEL[2],x2:GONDEL[2]+GT,nx:1,nz:0,h:GH,art:'regal'},
 {ort:'haushalt',   achse:'z', a:GZ1,b:GZ2,x1:GONDEL[3]-GT,x2:GONDEL[3],nx:-1,nz:0,h:GH,art:'regal'},
 {ort:'pflege',     achse:'z', a:GZ1,b:GZ2,x1:GONDEL[3],x2:GONDEL[3]+GT,nx:1,nz:0,h:GH,art:'regal'},
 {ort:'kuehl',      achse:'x', a:2,  b:27, z1:0,      z2:1.0,    nx:0,  nz:1, h:2.1, art:'kuehl'},
 {ort:'tiefkuehl',  achse:'z', a:3,  b:15, x1:29,     x2:30,     nx:-1, nz:0, h:2.1, art:'tiefkuehl'}
];
/* Gaenge: Schild ueber dem Gang, links und rechts eine Regalseite */
const GAENGE=[
 {nr:1, x:(GONDEL[0]+GT+GONDEL[1]-GT)/2, orte:['getraenke','fruehstueck']},
 {nr:2, x:(GONDEL[1]+GT+GONDEL[2]-GT)/2, orte:['snacks','kochen']},
 {nr:3, x:(GONDEL[2]+GT+GONDEL[3]-GT)/2, orte:['dosen','haushalt']},
 {nr:4, x:(GONDEL[3]+GT+29)/2,           orte:['pflege','tiefkuehl']}
];
/* Kassen: Band von z 18 bis 21, Kundenseite im Westen. Kasse 1 ist besetzt. */
const KASSEN=[14,18.5,23].map((x,k)=>({nr:k+1,x1:x,x2:x+0.9,z1:18,z2:21,offen:k===0}));
const KASSEN_ZONE={x1:12.4,x2:14,z1:17.4,z2:21.6};
const START={x:5,z:22.3,yaw:0};
const TUER={x1:3,x2:7};

function bauen(daten){
 const waren=daten.WAREN, byId={};
 waren.forEach(w=>byId[w.id]=w);
 const plaetze=[];
 for(const s of SEITEN){
  const liste=waren.filter(w=>w.ort===s.ort),n=liste.length,len=(s.b-s.a)/n;
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
 for(const s of SEITEN){
  if(s.achse==='z')box(s.x1,s.a,s.x2,s.b,s.art);else box(s.a,s.z1,s.b,s.z2,s.art);
 }
 for(const k of KASSEN){box(k.x1,k.z1,k.x2,k.z2,'kasse');box(k.x2,k.z1+1,k.x2+1.1,k.z2,'kabine');}
 box(0.4,20.6,1.6,22.4,'koerbe');                         // Korbstapel am Eingang
 box(26.5,19.5,28.5,21.5,'aufsteller');                   // Angebots-Aufsteller
 box(0,23.6,W,D,'tuerfeld');                               // nicht hinaus
 return {W,D,R,AUGE,daten,waren,byId,plaetze,hin,SEITEN,GAENGE,KASSEN,KASSEN_ZONE,START,TUER,GONDEL,GT,GZ1,GZ2,GH};
}

/* ---------- Bewegung ---------- */
function frei(welt,x,z,r){
 r=r===undefined?welt.R:r;
 for(const h of welt.hin)if(x>h.x1-r&&x<h.x2+r&&z>h.z1-r&&z<h.z2+r)return false;
 return true;
}
/* Schritt mit Gleiten an Kanten: erst x, dann z. */
function bewegen(welt,p,dx,dz){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.1));
 for(let i=0;i<n;i++){
  const nx=p.x+dx/n;if(frei(welt,nx,p.z))p.x=nx;
  const nz=p.z+dz/n;if(frei(welt,p.x,nz))p.z=nz;
 }
 return p;
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
function wo(welt,id){
 const w=welt.byId[id],g=welt.GAENGE.find(g=>g.orte.includes(w.ort)),name=welt.daten.ORTE[w.ort].en;
 if(w.ort==='kuehl')return 'It\'s in the fridge at the back of the shop.';
 if(w.ort==='tiefkuehl')return 'It\'s in the freezer in aisle 4.';
 if(w.ort==='obst'||w.ort==='gemuese')return 'It\'s in the '+name.toLowerCase()+' section on the left.';
 if(w.ort==='baeckerei')return 'It\'s at the bakery, next to the fruit and vegetables.';
 return 'It\'s in aisle '+g.nr+' ('+name+').';
}
const ORTFARBE={obst:'#E9573F',gemuese:'#8CC152',baeckerei:'#C8863E',getraenke:'#3BAFDA',fruehstueck:'#F6BB42',snacks:'#D770AD',
 kochen:'#DA4453',dosen:'#967ADC',haushalt:'#37BC9B',pflege:'#4A89DC',kuehl:'#5DADE2',tiefkuehl:'#7FA6C9'};
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
 const w=welt.byId[id],g=welt.GAENGE.find(g=>g.orte.includes(w.ort));
 if(g)return {key:'g'+g.nr,text:'in aisle '+g.nr,ort:w.ort==='tiefkuehl'?'in the freezer in aisle '+g.nr:'in aisle '+g.nr};
 const T={kuehl:'in the fridge at the back',obst:'in the fruit section on the left',gemuese:'in the vegetable section',baeckerei:'at the bakery'};
 return {key:w.ort,text:T[w.ort],ort:T[w.ort]};
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
 wechselOptionen,bezahlt,kassenSchritte,duellAufgaben,duellPunkte,wo,ORTFARBE,bon,sterne,erreichbar,AUGE,ZAHL,
 bereich,istPlural,nachbarn,nachbarText,lageSatz,kundenFrage,lageOptionen,raetsel,rezeptStand};
})();
