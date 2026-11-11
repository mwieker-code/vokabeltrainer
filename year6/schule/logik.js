/* =========================================================================
   LOGIK fuer "Find your way!" - ohne Grafik, damit sie sich testen laesst.

   Aus der Karte (karte.js) entstehen:
   - ein Feinraster (20 cm) fuer Kollision und Waende,
   - ein Wegeraster (1 m) fuer die Wegsuche,
   - die Tueren der Raeume (zum Flur hin) mit Schild,
   - Wegbeschreibungen auf Englisch.
   Koordinaten bleiben Plan-Pixel (10 px = 1 m), y zeigt nach Sueden.
   Richtungen: 0 Norden, 1 Osten, 2 Sueden, 3 Westen (im Uhrzeigersinn).
   ========================================================================= */
(function(){
'use strict';
const R=2, C=10, DOOR=9, BODY=3, TOL=12;
const IN=1, STAIR=2, OUT=3;
const OUTKIND={court:1,yard:2,plaza:3,lawn:4};
const OUTNAME={1:'the courtyard',2:'the playground',3:'the main entrance',4:'the side exit'};
const DX=[0,1,0,-1], DY=[-1,0,1,0];
const istAussen=c=>c===OUT;

function bauen(K){
 let maxX=0,maxY=0;
 for(const f of K.floors){
  for(const list of [f.rooms,f.other,f.halls,f.stairs,f.outdoor])for(const r of list){
   const o=typeof r[0]==='string'?1:0;maxX=Math.max(maxX,r[o]+r[o+2]);maxY=Math.max(maxY,r[o+1]+r[o+3]);}
 }
 const W=Math.ceil((maxX+40)/R),H=Math.ceil((maxY+40)/R);
 const CW=Math.ceil(W*R/C),CH=Math.ceil(H*R/C);
 const welt={K,W,H,CW,CH,R,C,floors:[],rooms:[],byId:{}};
 K.floors.forEach((f,fi)=>{
  const n=W*H,cls=new Uint8Array(n),okind=new Uint8Array(n),stair=new Int8Array(n).fill(-1),bau=new Uint8Array(n),owner=new Int16Array(n).fill(-1);
  const fill=(x,y,w,h,fn)=>{const i0=Math.max(0,Math.round(x/R)),i1=Math.min(W,Math.round((x+w)/R)),j0=Math.max(0,Math.round(y/R)),j1=Math.min(H,Math.round((y+h)/R));
   for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++)fn(j*W+i);};
  for(const [k,x,y,w,h] of f.outdoor)fill(x,y,w,h,c=>{cls[c]=OUT;okind[c]=OUTKIND[k];});
  for(const [x,y,w,h] of f.halls)fill(x,y,w,h,c=>{cls[c]=IN;okind[c]=0;bau[c]=1;});
  f.stairs.forEach(([x,y,w,h],s)=>fill(x,y,w,h,c=>{cls[c]=STAIR;okind[c]=0;stair[c]=s;bau[c]=1;}));
  const rooms=[];
  f.rooms.forEach(([id,x,y,w,h,art])=>{const r={id,f:fi,x,y,w,h,art:art||'class'};rooms.push(r);
   const ri=welt.rooms.length;welt.rooms.push(r);welt.byId[id]=r;fill(x,y,w,h,c=>{cls[c]=0;okind[c]=0;stair[c]=-1;bau[c]=1;owner[c]=ri;});});
  for(const [x,y,w,h] of f.other)fill(x,y,w,h,c=>{cls[c]=0;okind[c]=0;stair[c]=-1;bau[c]=1;owner[c]=-2;});
  /* schmale Luecken zwischen Raum und Flur gehoeren zum Gebaeude */
  const voll=new Uint8Array(bau);
  for(let k=0;k<3;k++){const alt=new Uint8Array(voll);
   for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const c=j*W+i;if(voll[c]||cls[c])continue;
    if(alt[c-1]&&alt[c+1]||alt[c-W]&&alt[c+W])voll[c]=1;}}
  const doors=f.doors.map(([name,x,y])=>{
   const a=clsAt0(cls,W,H,x,y-3),b=clsAt0(cls,W,H,x,y+3);
   const horiz=a&&b&&istAussen(a)!==istAussen(b);
   const aussen=horiz?(istAussen(a)?{x,y:y-3}:{x,y:y+3}):(istAussen(clsAt0(cls,W,H,x-3,y))?{x:x-3,y}:{x:x+3,y});
   const kind=okind[Math.floor(aussen.y/R)*W+Math.floor(aussen.x/R)];
   return {name,x,y,horiz,kind,f:fi};});
  welt.floors.push({id:f.id,name:f.name,cls,okind,stair,bau:voll,owner,doors,rooms,src:f});
 });
 for(const F of welt.floors)F.walls=waende(welt,F);
 for(const r of welt.rooms)raumTuer(welt,r);
 for(const r of welt.rooms)if(r.door)r.opposite=gegenueber(welt,r);
 welt.nav=wegeraster(welt);
 return welt;
}
function clsAt0(cls,W,H,x,y){const i=Math.floor(x/R),j=Math.floor(y/R);if(i<0||j<0||i>=W||j>=H)return 0;return cls[j*W+i];}
function clsAt(welt,f,x,y){return clsAt0(welt.floors[f].cls,welt.W,welt.H,x,y);}
function nearDoor(welt,f,x,y,r){for(const d of welt.floors[f].doors)if(Math.hypot(d.x-x,d.y-y)<=(r||DOOR))return d;return null;}

/* Wandstuecke: zwischen begehbar und gesperrt, und zwischen drinnen und draussen
   (ausser an Tueren). Gleichartige Stuecke werden zu langen Waenden verbunden. */
function waende(welt,F){
 const {W,H}=welt,{cls,okind,bau}=F,fi=welt.floors.indexOf(F),out=[];
 const get=(i,j)=>(i<0||j<0||i>=W||j>=H)?-1:j*W+i;
 const art=(a,b,mx,my)=>{
  const ca=a<0?0:cls[a],cb=b<0?0:cls[b];
  if(!ca&&!cb)return null;
  if(ca&&cb){if(istAussen(ca)===istAussen(cb))return null;
   if(nearDoor(welt,fi,mx,my))return null;
   const k=istAussen(ca)?okind[a]:okind[b];
   return {t:(k===1||k===3)?'glass':'outer',s:istAussen(ca)?1:-1};}
  const w=ca?a:b,blk=ca?b:a,s=ca?-1:1,geb=blk>=0&&bau[blk];
  if(istAussen(cls[w]))return {t:geb?'facade':'hedge',s};
  return {t:geb?'inner':'outer',s};
 };
 for(let j=0;j<=H;j++){let cur=null;
  for(let i=0;i<W;i++){const e=art(get(i,j-1),get(i,j),(i+.5)*R,j*R);
   if(e&&cur&&cur.t===e.t&&cur.s===e.s&&cur.x2===i*R)cur.x2=(i+1)*R;
   else{if(cur)out.push(cur);cur=e?{t:e.t,s:e.s,h:true,x1:i*R,x2:(i+1)*R,y1:j*R,y2:j*R}:null;}}
  if(cur)out.push(cur);}
 for(let i=0;i<=W;i++){let cur=null;
  for(let j=0;j<H;j++){const e=art(get(i-1,j),get(i,j),i*R,(j+.5)*R);
   if(e&&cur&&cur.t===e.t&&cur.s===e.s&&cur.y2===j*R)cur.y2=(j+1)*R;
   else{if(cur)out.push(cur);cur=e?{t:e.t,s:e.s,h:false,x1:i*R,x2:i*R,y1:j*R,y2:(j+1)*R}:null;}}
  if(cur)out.push(cur);}
 return out;
}

/* Tuer eines Raums: die Seite mit dem laengsten Stueck Flur davor */
function raumTuer(welt,r){
 const F=welt.floors[r.f],best={len:0};
 const seiten=[[0,-1],[1,0],[0,1],[-1,0]];
 for(const [nx,ny] of seiten){
  const horiz=ny!==0,len=horiz?r.w:r.h;let lauf=null;
  const fertig=()=>{if(lauf&&lauf.n>best.len){const mitte=(lauf.a+lauf.b)/2;Object.assign(best,{len:lauf.n,nx,ny,t:mitte,d:lauf.d});}lauf=null;};
  for(let t=1;t<len;t+=R){
   const bx=horiz?r.x+t:(nx>0?r.x+r.w:r.x),by=horiz?(ny>0?r.y+r.h:r.y):r.y+t;
   let d=-1;for(let k=0;k<=TOL;k+=1){const c=clsAt(welt,r.f,bx+nx*(k+.5),by+ny*(k+.5));if(c===IN||c===STAIR){d=k;break;}if(c===OUT)break;}
   if(d>=0){if(!lauf)lauf={a:t,b:t,n:0,d:d};lauf.b=t;lauf.n+=R;lauf.d=Math.min(lauf.d,d);}else fertig();
  }
  fertig();
 }
 if(!best.len)return;
 const {nx,ny,t,d}=best,horiz=ny!==0;
 const x=horiz?r.x+t:(nx>0?r.x+r.w:r.x)+nx*d, y=horiz?(ny>0?r.y+r.h:r.y)+ny*d:r.y+t;
 r.door={f:r.f,x,y,nx,ny,width:Math.min(10,best.len-2),sx:x+nx*10,sy:y+ny*10};
 /* Standpunkt muss frei sein - sonst naeher an die Tuer */
 for(let k=10;k>=3;k--){const px=x+nx*k,py=y+ny*k;if(frei(welt,r.f,px,py,clsAt(welt,r.f,px,py))){r.door.sx=px;r.door.sy=py;break;}}
}
function gegenueber(welt,r){
 let best=null,bd=1e9;
 for(const o of welt.rooms){if(o===r||!o.door||o.f!==r.f)continue;
  const a=r.door,b=o.door;if(a.nx!==-b.nx||a.ny!==-b.ny)continue;
  const quer=a.nx?(b.x-a.x)*a.nx:(b.y-a.y)*a.ny,laengs=a.nx?Math.abs(b.y-a.y):Math.abs(b.x-a.x);
  if(quer>0&&quer<=40&&laengs<=12&&laengs+quer<bd){bd=laengs+quer;best=o.id;}}
 return best;
}

/* ---------------- Bewegung ---------------- */
function frei(welt,f,x,y,vonCls){
 const pts=[[0,0],[BODY,0],[-BODY,0],[0,BODY],[0,-BODY],[BODY*.7,BODY*.7],[-BODY*.7,BODY*.7],[BODY*.7,-BODY*.7],[-BODY*.7,-BODY*.7]];
 for(const [dx,dy] of pts){const c=clsAt(welt,f,x+dx,y+dy);if(!c)return false;
  if(vonCls&&istAussen(c)!==istAussen(vonCls)&&!nearDoor(welt,f,x+dx,y+dy))return false;}
 return true;
}
function bewegen(welt,p,dx,dy){
 const c0=clsAt(welt,p.f,p.x,p.y)||IN;
 if(frei(welt,p.f,p.x+dx,p.y+dy,c0)){p.x+=dx;p.y+=dy;return true;}
 if(dx&&frei(welt,p.f,p.x+dx,p.y,c0)){p.x+=dx;return true;}
 if(dy&&frei(welt,p.f,p.x,p.y+dy,c0)){p.y+=dy;return true;}
 return false;
}
function treppeBei(welt,p){const F=welt.floors[p.f],i=Math.floor(p.x/R),j=Math.floor(p.y/R);if(i<0||j<0||i>=welt.W||j>=welt.H)return -1;return F.stair[j*welt.W+i];}
function treppeNehmen(welt,p){
 const s=treppeBei(welt,p);if(s<0||welt.floors.length<2)return false;
 const nf=p.f===0?1:0,[x,y,w,h]=welt.floors[nf].src.stairs[s];
 let nx=Math.min(x+w-BODY-1,Math.max(x+BODY+1,p.x)),ny=Math.min(y+h-BODY-1,Math.max(y+BODY+1,p.y));
 if(!frei(welt,nf,nx,ny)){nx=x+w/2;ny=y+h/2;}
 p.f=nf;p.x=nx;p.y=ny;return true;
}

/* ---------------- Wegsuche (1-m-Raster, Abbiegen kostet) ---------------- */
function wegeraster(welt){
 const {CW,CH}=welt,n=CW*CH,lagen=welt.floors.map(F=>{
  const cls=new Uint8Array(n),stair=new Int8Array(n).fill(-1),fi=welt.floors.indexOf(F);
  for(let j=0;j<CH;j++)for(let i=0;i<CW;i++){const x=i*C+C/2,y=j*C+C/2,c=clsAt(welt,fi,x,y);
   if(c&&frei(welt,fi,x,y,c)){cls[j*CW+i]=c;stair[j*CW+i]=c===STAIR?treppeBei(welt,{f:fi,x,y}):-1;}}
  const rand=new Uint8Array(n);
  for(let j=0;j<CH;j++)for(let i=0;i<CW;i++){const c=j*CW+i;if(!cls[c])continue;
   for(let d=0;d<4;d++){const a=i+DX[d],b=j+DY[d];if(a<0||b<0||a>=CW||b>=CH||!cls[b*CW+a]){rand[c]=1;break;}}}
  return {cls,stair,rand};});
 return {lagen};
}
function zelle(welt,f,x,y){
 const {CW,CH}=welt,L=welt.nav.lagen[f],c0=clsAt(welt,f,x,y);
 const i0=Math.floor(x/C),j0=Math.floor(y/C);let best=-1,bd=1e9;
 for(let j=j0-3;j<=j0+3;j++)for(let i=i0-3;i<=i0+3;i++){if(i<0||j<0||i>=CW||j>=CH)continue;const c=L.cls[j*CW+i];if(!c)continue;
  if(c0&&istAussen(c)!==istAussen(c0))continue;
  const dd=Math.hypot(i*C+C/2-x,j*C+C/2-y);if(dd<bd){bd=dd;best=j*CW+i;}}
 return best;
}
function weg(welt,start,ziel){
 /* start {f,x,y,dir}, ziel {f,x,y} -> [{f,i,j}] */
 const {CW,CH}=welt,N=CW*CH,lagen=welt.nav.lagen;
 const s=zelle(welt,start.f,start.x,start.y),z=zelle(welt,ziel.f,ziel.x,ziel.y);
 if(s<0||z<0)return null;
 const S=lagen.length*N*4,dist=new Float64Array(S).fill(Infinity),prev=new Int32Array(S).fill(-1);
 const heap=[],push=(k,v)=>{heap.push([v,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
 const key=(f,c,d)=>((f*N+c)<<2)|d;
 const k0=key(start.f,s,start.dir|0);dist[k0]=0;push(k0,0);
 let ende=-1;
 while(heap.length){
  const [v,k]=pop();if(v>dist[k])continue;
  const d=k&3,fc=k>>2,f=Math.floor(fc/N),c=fc%N,i=c%CW,j=(c-i)/CW,L=lagen[f];
  if(f===ziel.f&&c===z){ende=k;break;}
  for(let nd=0;nd<4;nd++){
   const a=i+DX[nd],b=j+DY[nd];if(a<0||b<0||a>=CW||b>=CH)continue;const nc=b*CW+a;
   if(!L.cls[nc])continue;
   if(istAussen(L.cls[nc])!==istAussen(L.cls[c])&&!nearDoor(welt,f,(i+a+1)*C/2,(j+b+1)*C/2,DOOR+2))continue;
   const turn=nd===d?0:((nd+2)%4===d?8:2.5);
   const nv=v+1+(L.rand[nc]?0.25:0)+(istAussen(L.cls[nc])?0.35:0)+turn,nk=key(f,nc,nd);
   if(nv<dist[nk]){dist[nk]=nv;prev[nk]=k;push(nk,nv);}
  }
  if(L.stair[c]>=0)for(let nf=0;nf<lagen.length;nf++){if(nf===f||lagen[nf].stair[c]!==L.stair[c])continue;
   const nk=key(nf,c,d),nv=v+12;if(nv<dist[nk]){dist[nk]=nv;prev[nk]=k;push(nk,nv);}}
 }
 if(ende<0)return null;
 const out=[];for(let k=ende;k>=0;k=prev[k]){const fc=k>>2,f=Math.floor(fc/N),c=fc%N;out.push({f,i:c%CW,j:Math.floor(c/CW),c});}
 out.reverse();
 return out;
}
function laenge(pfad){let n=0;for(let k=1;k<pfad.length;k++)if(pfad[k].f===pfad[k-1].f)n++;return n;}

/* ---------------- Wegbeschreibung ---------------- */
function richtungVon(dx,dy){return dy<0?0:dx>0?1:dy>0?2:3;}
function raumName(r){return r.art==='wc'?'the toilets ('+r.id+')':r.art==='cafe'?'the cafeteria ('+r.id+')':'room '+r.id;}
function etage(f){return f===0?'ground floor':'first floor';}
function beschreibung(welt,start,raum){
 const ziel={f:raum.f,x:raum.door.sx,y:raum.door.sy};
 const pfad=weg(welt,start,ziel);if(!pfad)return null;
 const {CW}=welt,lagen=welt.nav.lagen;
 /* Teilstuecke: gehen / Tuer / Treppe */
 const teile=[];let lauf=null;
 const zu=()=>{if(lauf)teile.push(lauf);lauf=null;};
 for(let k=1;k<pfad.length;k++){
  const a=pfad[k-1],b=pfad[k];
  if(a.f!==b.f){zu();teile.push({typ:'treppe',hoch:b.f>a.f,f:b.f});continue;}
  const dir=richtungVon(b.i-a.i,b.j-a.j),ca=lagen[a.f].cls[a.c],cb=lagen[b.f].cls[b.c];
  if(istAussen(ca)!==istAussen(cb)){zu();
   const t=nearDoor(welt,a.f,(a.i+b.i+1)*C/2,(a.j+b.j+1)*C/2,DOOR+2);
   teile.push({typ:'tuer',raus:istAussen(cb),tuer:t,dir});lauf={typ:'gehen',dir,len:1,f:b.f,ende:b,aussen:istAussen(cb)};continue;}
  if(lauf&&lauf.dir===dir){lauf.len++;lauf.ende=b;}
  else{zu();lauf={typ:'gehen',dir,len:1,f:b.f,ende:b,aussen:istAussen(cb)};}
 }
 zu();
 /* kleine Versaetze (1-2 m quer) zwischen gleich gerichteten Stuecken glaetten */
 for(let k=1;k<teile.length-1;k++){
  const a=teile[k-1],m=teile[k],b=teile[k+1];
  if(a.typ==='gehen'&&m.typ==='gehen'&&b.typ==='gehen'&&m.len<=3&&a.dir===b.dir){
   a.len+=b.len;a.ende=b.ende;teile.splice(k,2);k=Math.max(0,k-2);}
 }
 for(let k=1;k<teile.length;k++){const a=teile[k-1],b=teile[k];
  if(a.typ==='gehen'&&b.typ==='gehen'&&a.dir===b.dir){a.len+=b.len;a.ende=b.ende;teile.splice(k,1);k--;}}
 /* letzter kurzer Schritt direkt auf die Tuer zu zaehlt nicht als Abbiegen */
 const zuTuer=richtungVon(-raum.door.nx,-raum.door.ny);
 const letzt=teile[teile.length-1];
 if(letzt&&letzt.typ==='gehen'&&letzt.len<=2&&letzt.dir===zuTuer&&teile.length>1&&teile[teile.length-2].typ==='gehen')teile.pop();
 /* Saetze */
 const saetze=[];let blick=start.dir|0;
 const dreh=(von,nach)=>['','Turn right','Turn around','Turn left'][(nach-von+4)%4];
 const meter=n=>'about '+Math.max(5,Math.round(n/5)*5)+' metres';
 const sackgasse=(t)=>{const e=t.ende,L=lagen[t.f],a=e.i+DX[t.dir],b=e.j+DY[t.dir];return a<0||b<0||a>=CW||!L.cls[b*CW+a];};
 let nachTreppe='';
 for(let k=0;k<teile.length;k++){
  const t=teile[k];
  if(t.typ==='treppe'){
   const tr=t.hoch?'go up the stairs to the first floor':'go down the stairs to the ground floor';
   /* kurzer Schritt in das Treppenhaus: mit dem Abbiegen zusammenfassen */
   const vor=saetze[saetze.length-1];
   if(vor&&/^Turn (left|right|around)\.$/.test(vor))saetze[saetze.length-1]=vor.slice(0,-1)+' and '+tr+'.';
   else saetze.push(tr.charAt(0).toUpperCase()+tr.slice(1)+'.');
   nachTreppe=t.hoch?'At the top of the stairs, ':'At the bottom of the stairs, ';
   /* Schritte im Treppenhaus selbst zaehlen nicht */
   while(teile[k+1]&&teile[k+1].typ==='gehen'&&teile[k+1].len<=2&&k+2<teile.length)k++;
   continue;}
  if(t.typ==='tuer'){nachTreppe='';
   const name=t.tuer?t.tuer.name:'';
   let s;
   if(t.raus)s=name==='main entrance'?'Go out through the main entrance.':name==='side exit'?'Go out through the side exit.':name==='playground'?'Go out into the playground.':'Go through the door into the courtyard.';
   else s=name==='main entrance'?'Go in through the main entrance.':'Go through the door into the building.';
   const d=dreh(blick,t.dir);if(d)s=d+'. '+s;
   saetze.push(s);blick=t.dir;continue;}
  const d=dreh(blick,t.dir),letztes=k===teile.length-1,naechste=teile[k+1];
  const ende=!letztes&&naechste&&naechste.typ==='gehen'&&!t.aussen&&sackgasse(t)&&t.len>=4;
  let geh='';
  if(ende)geh='go to the end of the corridor';
  else if(t.len>=4)geh='go straight on for '+meter(t.len);
  let satz='';
  if(d&&geh)satz=d+' and '+geh+'.';
  else if(d)satz=d+'.';
  else if(geh)satz=geh.charAt(0).toUpperCase()+geh.slice(1)+'.';
  if(satz&&nachTreppe)satz=nachTreppe+satz.charAt(0).toLowerCase()+satz.slice(1);
  if(satz){saetze.push(satz);nachTreppe='';}
  blick=t.dir;
 }
 const rel=(zuTuer-blick+4)%4;
 const ist=raum.art==='wc'?'are':'is',wo=ist+' '+['in front of you','on your right','behind you','on your left'][rel];
 const name=raumName(raum);
 saetze.push(name.charAt(0).toUpperCase()+name.slice(1)+' '+wo+'.');
 if(raum.opposite&&rel!==0)saetze.push('It is opposite '+raumName(welt.byId[raum.opposite])+'.');
 if(!saetze.length)saetze.push('You are already there.');
 return {pfad,teile,saetze,laenge:laenge(pfad),ziel,raum,titel:'Find '+name+'.',etage:etage(raum.f)};
}

window.SchulLogik={bauen,frei,bewegen,treppeBei,treppeNehmen,weg,laenge,beschreibung,clsAt,nearDoor,raumName,etage,richtungVon,
 R,C,DOOR,BODY,IN,STAIR,OUT,OUTNAME};
})();
