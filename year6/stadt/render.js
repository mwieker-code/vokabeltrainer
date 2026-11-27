/* =========================================================================
   TOWN RACE – 3D-Darstellung (three.js aus ../schule/vendor/)
   Baut aus der Logik-Stadt (logik.js) eine kleine britische Stadt:
   Strassen mit Markierungen, Gehwege, Reihenhaeuser und Laeden, die Orte
   mit grossen Schildern, Kreisverkehre, Ampeln, Zebrastreifen, Park,
   Fussballplatz, Fussgaengerzone mit Marktstaenden, Leute auf den Gehwegen,
   die Go-Karts, Start und Ziel. Gleichfarbiges wird zu wenigen Meshes
   zusammengefasst. spiel.js ruft nur init() und frame() auf.
   ========================================================================= */
import * as THREE from '../schule/vendor/three.module.min.js';

const SCHRIFT='"Bricolage Grotesque", Inter, system-ui, sans-serif';
const _q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Color(),_nm=new THREE.Matrix3(),_a=new THREE.Vector3(),_b=new THREE.Vector3();
function mat(x,y,z,sx,sy,sz,rx,ry,rz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),_q.clone(),new THREE.Vector3(sx,sy,sz));}
const V={
 box:new THREE.BoxGeometry(1,1,1).toNonIndexed(),
 zyl:new THREE.CylinderGeometry(1,1,1,12,1).toNonIndexed(),
 zyl6:new THREE.CylinderGeometry(1,1,1,6,1).toNonIndexed(),
 kegel4:new THREE.ConeGeometry(1,1,4,1).toNonIndexed(),
 kegel:new THREE.ConeGeometry(1,1,10,1).toNonIndexed(),
 kugel:new THREE.IcosahedronGeometry(1,1).toNonIndexed(),
 kugel0:new THREE.IcosahedronGeometry(1,0).toNonIndexed(),
 ebene:new THREE.PlaneGeometry(1,1).toNonIndexed(),
 ring:new THREE.RingGeometry(0.92,1,40,1).toNonIndexed(),
 scheibe:new THREE.CircleGeometry(1,28).toNonIndexed(),
 rad:new THREE.CylinderGeometry(1,1,1,16,1).toNonIndexed(),
 huegel:new THREE.SphereGeometry(1,18,10).toNonIndexed()
};

/* ---------- Sammler: viele Teile, ein Mesh ---------- */
class Sammler{
 constructor(){this.p=[];this.n=[];this.c=[];this.u=[];}
 add(geo,m,farbe,rect){
  const P=geo.attributes.position,N=geo.attributes.normal,U=geo.attributes.uv;
  _nm.getNormalMatrix(m);_c.set(farbe||'#FFFFFF');
  for(let i=0;i<P.count;i++){
   _v.fromBufferAttribute(P,i).applyMatrix4(m);this.p.push(_v.x,_v.y,_v.z);
   _n.fromBufferAttribute(N,i).applyMatrix3(_nm).normalize();this.n.push(_n.x,_n.y,_n.z);
   this.c.push(_c.r,_c.g,_c.b);
   if(rect==='welt')this.u.push(_v.x,_v.z);
   else if(rect==='wand')this.u.push(_v.x+_v.z,_v.y);
   else if(rect&&U)this.u.push(rect[0]+U.getX(i)*(rect[2]-rect[0]),rect[1]+U.getY(i)*(rect[3]-rect[1]));else this.u.push(0,0);
  }
 }
 quader(x1,y1,z1,x2,y2,z2,farbe,rect){this.add(V.box,mat((x1+x2)/2,(y1+y2)/2,(z1+z2)/2,Math.abs(x2-x1)||0.001,Math.abs(y2-y1)||0.001,Math.abs(z2-z1)||0.001),farbe,rect);}
 /* Dreieck/Viereck: a unten links, b unten rechts, c oben rechts, (d oben links) von vorn gesehen */
 tri(a,b,c,farbe,uv){_a.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);_b.set(c[0]-a[0],c[1]-a[1],c[2]-a[2]);_n.crossVectors(_a,_b).normalize();_c.set(farbe||'#FFFFFF');
  const u=uv||[[0,0],[1,0],[1,1]];[a,b,c].forEach((p,i)=>{this.p.push(p[0],p[1],p[2]);this.n.push(_n.x,_n.y,_n.z);this.c.push(_c.r,_c.g,_c.b);this.u.push(u[i][0],u[i][1]);});}
 quad(a,b,c,d,farbe,uv){const r=uv||[0,0,1,1];this.tri(a,b,c,farbe,[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]]]);this.tri(a,c,d,farbe,[[r[0],r[1]],[r[2],r[3]],[r[0],r[3]]]);}
 /* senkrechte Wand von (ax,az) nach (bx,bz), Vorderseite links vom Weg a->b gesehen */
 wand(ax,az,bx,bz,y1,y2,farbe,uv){this.quad([ax,y1,az],[bx,y1,bz],[bx,y2,bz],[ax,y2,az],farbe,uv);}
 leer(){return this.p.length===0;}
 mesh(material){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
  g.computeBoundingSphere();
  return new THREE.Mesh(g,material);
 }
}
/* Seite eines Rechtecks: 0 N, 1 O, 2 S, 3 W -> Wand von a nach b */
function seitenWand(x1,z1,x2,z2,s){return s===0?[x2,z1,x1,z1]:s===2?[x1,z2,x2,z2]:s===1?[x2,z2,x2,z1]:[x1,z1,x1,z2];}

/* ---------- Atlas: viele Schilder auf einer Leinwand ---------- */
class Atlas{
 constructor(w,h){this.c=document.createElement('canvas');this.c.width=w;this.c.height=h;this.g=this.c.getContext('2d');this.x=0;this.y=0;this.zeile=0;this.auftraege=[];
  this.tex=new THREE.CanvasTexture(this.c);this.tex.colorSpace=THREE.SRGBColorSpace;this.tex.anisotropy=8;}
 add(w,h,mal){
  if(this.x+w>this.c.width){this.x=0;this.y+=this.zeile+2;this.zeile=0;}
  if(this.y+h>this.c.height)console.warn('Atlas voll');
  const x=this.x,y=this.y;this.x+=w+2;this.zeile=Math.max(this.zeile,h);
  this.auftraege.push({x,y,w,h,mal});
  const W=this.c.width,H=this.c.height;
  return [(x+0.5)/W,1-(y+h-0.5)/H,(x+w-0.5)/W,1-(y+0.5)/H];
 }
 malen(){const g=this.g;g.clearRect(0,0,this.c.width,this.c.height);
  for(const a of this.auftraege){g.save();g.beginPath();g.rect(a.x,a.y,a.w,a.h);g.clip();g.translate(a.x,a.y);a.mal(g,a.w,a.h);g.restore();}
  this.tex.needsUpdate=true;}
}
function rund(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function passend(g,text,max,gewicht,groesse,schrift){let s=groesse;g.font=gewicht+' '+s+'px '+schrift;while(g.measureText(text).width>max&&s>10){s-=2;g.font=gewicht+' '+s+'px '+schrift;}return s;}
const zufall=(n=>()=>{n=(n*16807)%2147483647;return n/2147483647;})(7);
function leinwand(w,h,mal,rep){
 const c=document.createElement('canvas');c.width=w;c.height=h;mal(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=8;return t;
}
const mischen=(a,b,t)=>{const x=new THREE.Color(a),y=new THREE.Color(b);x.lerp(y,t);return '#'+x.getHexString();};

/* ---------- Fassaden (eine Achse x ein Stockwerk je Kachel) ---------- */
const STILE=[
 {wand:'#9C4A35',fuge:'#C9B8A6',ziegel:true,tuer:'#1E3A5F',rahmen:'#F4F1EA',dach:'#4A5058'},
 {wand:'#7A4B32',fuge:'#B8A48E',ziegel:true,tuer:'#2E6B3A',rahmen:'#F4F1EA',dach:'#3E434A'},
 {wand:'#C9A86A',fuge:'#E5D8BE',ziegel:true,tuer:'#B71C1C',rahmen:'#FFFFFF',dach:'#50565E'},
 {wand:'#EDE8DE',ziegel:false,tuer:'#1D1D1D',rahmen:'#FFFFFF',dach:'#41464D'},
 {wand:'#A9C8D8',ziegel:false,tuer:'#F2C14E',rahmen:'#FFFFFF',dach:'#4A5058'},
 {wand:'#E8C9B6',ziegel:false,tuer:'#3A6EA5',rahmen:'#FFFFFF',dach:'#3E434A'}];
function wandGrund(g,W,H,st){
 g.fillStyle=st.wand;g.fillRect(0,0,W,H);
 if(st.ziegel){const bh=9,bw=26;for(let y=0,r=0;y<H;y+=bh,r++){for(let x=-(r%2)*bw/2;x<W;x+=bw){g.fillStyle=mischen(st.wand,(zufall()<0.5?'#000000':'#FFFFFF'),zufall()*0.12);g.fillRect(x+1,y+1,bw-2,bh-2);}
  g.fillStyle=st.fuge;g.globalAlpha=0.55;g.fillRect(0,y,W,1.5);g.globalAlpha=1;}}
 else{for(let i=0;i<500;i++){g.fillStyle='rgba(0,0,0,'+(zufall()*0.05)+')';g.fillRect(zufall()*W,zufall()*H,2,2);}g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,H-6,W,6);}
}
function fenster(g,x,y,w,h,st,sprossen){
 g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-4,y+h,w+8,7);
 g.fillStyle='#D9D2C3';g.fillRect(x-6,y+h,w+12,6);g.fillRect(x-6,y-8,w+12,8);   // Sims und Sturz
 g.fillStyle=st.rahmen;g.fillRect(x,y,w,h);
 const v=g.createLinearGradient(x,y,x+w,y+h);v.addColorStop(0,'#8FB3C9');v.addColorStop(0.45,'#3E5A6E');v.addColorStop(1,'#22313D');
 g.fillStyle=v;g.fillRect(x+5,y+5,w-10,h-10);
 g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(x+5,y+5);g.lineTo(x+w*0.45,y+5);g.lineTo(x+5,y+h*0.5);g.fill();
 g.fillStyle=st.rahmen;g.fillRect(x,y+h/2-3,w,6);
 if(sprossen){g.fillRect(x+w/2-2,y,4,h);g.fillRect(x,y+h/4-1.5,w,3);g.fillRect(x,y+3*h/4-1.5,w,3);}
 /* Vorhang */
 g.fillStyle='rgba(240,230,210,.55)';g.fillRect(x+5,y+5,10,h-10);g.fillRect(x+w-15,y+5,10,h-10);
}
function fassadeOben(st){return leinwand(256,180,(g,W,H)=>{wandGrund(g,W,H,st);fenster(g,W/2-46,34,92,112,st,true);},null);}
function fassadeHaus(st){return leinwand(256,180,(g,W,H)=>{wandGrund(g,W,H,st);
 /* Tuer mit Oberlicht */
 g.fillStyle='#D9D2C3';g.fillRect(28,24,72,156);g.fillStyle=st.tuer;g.fillRect(36,62,56,118);
 g.fillStyle='rgba(255,255,255,.25)';g.fillRect(42,72,20,40);g.fillRect(66,72,20,40);g.fillRect(42,122,20,46);g.fillRect(66,122,20,46);
 g.fillStyle=st.tuer;g.fillRect(44,74,16,36);g.fillRect(68,74,16,36);g.fillRect(44,124,16,42);g.fillRect(68,124,16,42);
 g.fillStyle='#3E5A6E';g.beginPath();g.arc(64,60,26,Math.PI,0);g.fill();g.fillStyle='#C9A64A';g.fillRect(80,118,5,5);
 fenster(g,128,50,100,96,st,true);},null);}
function fassadeLaden(){return leinwand(256,180,(g,W,H)=>{
 g.fillStyle='#F4F1EA';g.fillRect(0,0,W,H);
 g.fillStyle='#2B2F33';g.fillRect(0,H-26,W,26);
 const v=g.createLinearGradient(0,30,0,H-26);v.addColorStop(0,'#4D6B7E');v.addColorStop(0.5,'#2D4250');v.addColorStop(1,'#1D2B35');
 g.fillStyle=v;g.fillRect(14,30,W-28,H-62);
 /* Auslage */
 const farben=['#E9573F','#FFC845','#3BAFDA','#8CC152','#967ADC','#F6BB42'];
 for(let i=0;i<9;i++){g.fillStyle=farben[i%farben.length];g.globalAlpha=0.85;g.fillRect(24+i*24,H-60-(i%3)*10,18,26+(i%3)*10);}g.globalAlpha=1;
 g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.moveTo(14,30);g.lineTo(110,30);g.lineTo(14,120);g.fill();
 g.fillStyle='#F4F1EA';g.fillRect(W/2-3,30,6,H-62);g.fillRect(0,0,W,30);
},null);}
function stein(farbe){return leinwand(256,256,(g,W,H)=>{g.fillStyle=farbe;g.fillRect(0,0,W,H);
 for(let y=0,r=0;y<H;y+=32,r++)for(let x=-(r%2)*32;x<W;x+=64){g.fillStyle=mischen(farbe,zufall()<0.5?'#000000':'#FFFFFF',zufall()*0.1);g.fillRect(x+1.5,y+1.5,61,29);}
},null);}

export function init(canvas,welt,opts={}){
 const L=window.StadtLogik,D=welt.daten,A=L.A,H=L.H,GEH=L.GEH;
 const schoen=opts.schoen!==false;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!opts.mobil,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,opts.mobil?(schoen?1.5:1):(schoen?2:1.25)));
 const scene=new THREE.Scene();
 const HORIZONT='#DCEBF2';
 scene.background=new THREE.Color(HORIZONT);
 scene.fog=new THREE.Fog(HORIZONT,90,330);
 const camera=new THREE.PerspectiveCamera(70,1,0.1,900);
 scene.add(new THREE.HemisphereLight(0xEAF4FF,0x8A7F6A,1.55));
 const sonne=new THREE.DirectionalLight(0xFFF1DC,1.35);sonne.position.set(-80,160,60);scene.add(sonne);
 const lam=o=>new THREE.MeshLambertMaterial(o);
 const farbig=lam({vertexColors:true});
 const S=new Sammler();             // alles Einfarbige
 const X2=(L.NX-1)*A,Z2=(L.NZ-1)*A;
 const rand=(()=>{let n=Math.floor((welt.seed||0.5)*1e6)+3;return ()=>{n=(n*16807)%2147483647;return n/2147483647;};})();

 /* ===== Himmel, Huegel, Wolken ===== */
 {const g=new THREE.SphereGeometry(800,24,12);const f=[];const P=g.attributes.position;
  for(let i=0;i<P.count;i++){const y=P.getY(i)/800;_c.set(HORIZONT).lerp(new THREE.Color('#5FA8D8'),Math.max(0,Math.min(1,y*2.2)));f.push(_c.r,_c.g,_c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(f,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));m.renderOrder=-1;scene.add(m);
  const HU=new Sammler();const cx=X2/2,cz=Z2/2;
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2+rand()*0.1,r=390+rand()*90,h=16+rand()*26,b=60+rand()*60;
   HU.add(V.huegel,mat(cx+Math.sin(a)*r,-4,cz-Math.cos(a)*r,b,h,b),mischen('#7DA866','#5E8F55',rand()));}
  scene.add(HU.mesh(farbig));
  const W=new Sammler();for(let i=0;i<14;i++){const a=rand()*Math.PI*2,r=200+rand()*260,x=cx+Math.sin(a)*r,z=cz-Math.cos(a)*r,y=90+rand()*50;
   for(let j=0;j<4;j++)W.add(V.kugel,mat(x+(j-1.5)*9+rand()*4,y+rand()*3,z+rand()*5,9+rand()*6,4+rand()*2,7+rand()*4),'#FFFFFF');}
  scene.add(W.mesh(new THREE.MeshBasicMaterial({vertexColors:true,fog:false,transparent:true,opacity:0.92})));}

 /* ===== Boden: Gras, Asphalt, Gehwege ===== */
 const grasTex=leinwand(256,256,(g,W,H)=>{g.fillStyle='#7BAE5E';g.fillRect(0,0,W,H);for(let i=0;i<2600;i++){g.fillStyle=zufall()<0.5?'rgba(40,80,20,.18)':'rgba(200,230,140,.16)';g.fillRect(zufall()*W,zufall()*H,2,3);}},[1/6,1/6]);
 const asphaltTex=leinwand(256,256,(g,W,H)=>{g.fillStyle='#55595F';g.fillRect(0,0,W,H);for(let i=0;i<5000;i++){const s=zufall();g.fillStyle=s<0.5?'rgba(0,0,0,.16)':'rgba(255,255,255,.08)';g.fillRect(zufall()*W,zufall()*H,1.5,1.5);}
  for(let i=0;i<6;i++){g.fillStyle='rgba(0,0,0,.05)';g.beginPath();g.ellipse(zufall()*W,zufall()*H,30+zufall()*40,12+zufall()*20,zufall()*3,0,7);g.fill();}},[1/9,1/9]);
 const pflasterTex=leinwand(256,256,(g,W,H)=>{g.fillStyle='#BDBAB2';g.fillRect(0,0,W,H);const n=4;for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillStyle=mischen('#C9C6BE','#A9A69F',zufall()*0.6);g.fillRect(x*W/n+2,y*H/n+2,W/n-4,H/n-4);}},[1/2.4,1/2.4]);
 const zoneTex=leinwand(256,256,(g,W,H)=>{g.fillStyle='#B98C6E';g.fillRect(0,0,W,H);for(let y=0;y<H;y+=16)for(let x=-((y/16)%2)*16;x<W;x+=32){g.fillStyle=mischen('#C69A7A','#9E6E52',zufall()*0.7);g.fillRect(x+1,y+1,30,14);}},[1/4,1/4]);
 {const g=new Sammler(),gp=new THREE.PlaneGeometry(1,1,24,24).toNonIndexed();g.add(gp,mat(X2/2,-0.05,Z2/2,1400,1400,1,-Math.PI/2,0,0),'#FFFFFF','welt');scene.add(g.mesh(lam({map:grasTex,vertexColors:true})));
  /* Asphalt in Stuecken: Kreuzungen und Strassen (grosse Dreiecke flackern auf manchen Geraeten) */
  const a=new Sammler(),fl=(x1,z1,x2,z2)=>a.add(V.ebene,mat((x1+x2)/2,0,(z1+z2)/2,x2-x1,z2-z1,1,-Math.PI/2,0,0),'#FFFFFF','welt');
  for(const k of welt.knoten)fl(k.x-H-0.5,k.z-H-0.5,k.x+H+0.5,k.z+H+0.5);
  for(const e of welt.kanten){const p=welt.knoten[e.a],q=welt.knoten[e.b];const n=4;
   for(let i=0;i<n;i++){const t1=H+(A-2*H)*i/n,t2=H+(A-2*H)*(i+1)/n;
    if(e.quer)fl(p.x-H-0.5,p.z+t1,p.x+H+0.5,p.z+t2);else fl(p.x+t1,p.z-H-0.5,p.x+t2,p.z+H+0.5);}}
  scene.add(a.mesh(lam({map:asphaltTex,vertexColors:true})));}
 const GW=new Sammler(),ZO=new Sammler(),GR=new Sammler();
 const KANTE=0.15;
 function sockel(x1,z1,x2,z2,ziel,farbe){ziel.quader(x1,0,z1,x2,KANTE,z2,farbe||'#FFFFFF','welt');S.quader(x1-0.05,0,z1-0.05,x2+0.05,KANTE-0.01,z2+0.05,'#9A978F');}
 for(const b of welt.bloecke)if(b.art==='normal'){
  sockel(b.x1,b.z1,b.x2,b.z2,GW);
  /* Gaerten im Innenhof */
  GR.quader(b.x1+GEH+L.TIEFE,KANTE,b.z1+GEH+L.TIEFE,b.x2-GEH-L.TIEFE,KANTE+0.02,b.z2-GEH-L.TIEFE,'#FFFFFF');
 }
 /* Rand der Stadt: Gehweg und Wiese */
 {const R=12;sockel(-H-R,-H-R,-H,Z2+H+R,GW);sockel(X2+H,-H-R,X2+H+R,Z2+H+R,GW);sockel(-H,-H-R,X2+H,-H,GW);sockel(-H,Z2+H,X2+H,Z2+H+R,GW);}

 /* ===== Markierungen ===== */
 const MK=new Sammler();
 const strich=(x,z,l,b,quer,farbe)=>MK.add(V.ebene,mat(x,0.025,z,quer?b:l,quer?l:b,1,-Math.PI/2,0,0),farbe||'#F4F4F0');
 for(const e of welt.kanten){
  if(e.art!=='strasse')continue;
  const a=welt.knoten[e.a],b=welt.knoten[e.b];
  for(let t=H+3;t<A-H-3;t+=6){const x=e.quer?a.x:a.x+t+1.5,z=e.quer?a.z+t+1.5:a.z;strich(x,z,3,0.15,e.quer);}
  /* Haltelinien an beiden Enden (gestrichelt: Vorfahrt achten) */
  for(const [k,s] of [[a,1],[b,-1]]){
   for(let q=0.3;q<H-0.3;q+=0.9){const off=s*(H+0.4),lat=(e.quer?-1:1)*(q+0.3)*s;
    const x=e.quer?k.x+lat:k.x+off,z=e.quer?k.z+off:k.z+lat;strich(x,z,0.55,0.3,!e.quer);}
  }
  /* Randlinie */
  for(const s of [-1,1]){const x=e.quer?a.x+s*(H-0.4):a.x+A/2,z=e.quer?a.z+A/2:a.z+s*(H-0.4);strich(x,z,A-STRx2(),0.1,e.quer);}
 }
 function STRx2(){return 2*H+0.6;}
 /* Zebrastreifen mit Blinklichtern */
 const BLINK=new Sammler();
 {const kand=welt.kanten.filter(e=>e.art==='strasse');let n=0;
  for(const e of kand){if(n>=5)break;if(rand()<0.6)continue;
   const a=welt.knoten[e.a],b=welt.knoten[e.b];if(a.rund||b.rund)continue;n++;
   const t=H+5;for(let q=-H+0.6;q<H-0.4;q+=1.0){const x=e.quer?a.x+q+0.3:a.x+t,z=e.quer?a.z+t:a.z+q+0.3;MK.add(V.ebene,mat(x,0.026,z,e.quer?0.55:2.6,e.quer?2.6:0.55,1,-Math.PI/2,0,0),'#F4F4F0');}
   for(const s of [-1,1]){const x=e.quer?a.x+s*(H+0.8):a.x+t,z=e.quer?a.z+t:a.z+s*(H+0.8);
    for(let y=0;y<2.6;y+=0.3)S.add(V.zyl,mat(x,KANTE+y+0.15,z,0.07,0.3,0.07),(y/0.3)%2<1?'#111111':'#F4F4F0');
    BLINK.add(V.kugel,mat(x,KANTE+2.85,z,0.22,0.22,0.22),'#FFFFFF');}
  }}
 scene.add(MK.mesh(new THREE.MeshLambertMaterial({vertexColors:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})));
 const blinkMat=new THREE.MeshBasicMaterial({color:'#FFB020'});
 if(!BLINK.leer())scene.add(BLINK.mesh(blinkMat));

 /* ===== Fussgaengerzone ===== */
 {const e=welt.zone,a=welt.knoten[e.a],b=welt.knoten[e.b];
  const x1=e.quer?a.x-H:a.x+H,x2=e.quer?a.x+H:b.x-H,z1=e.quer?a.z+H:a.z-H,z2=e.quer?b.z-H:a.z+H;
  ZO.quader(x1,0,z1,x2,0.06,z2,'#FFFFFF','welt');
  /* Poller */
  for(const k of welt.kisten.filter(k=>k.art==='poller')){const lang=e.quer?k.x2-k.x1:k.z2-k.z1;
   for(let q=0.6;q<lang;q+=1.4){const x=e.quer?k.x1+q:(k.x1+k.x2)/2,z=e.quer?(k.z1+k.z2)/2:k.z1+q;
    S.add(V.zyl,mat(x,0.5,z,0.13,1.0,0.13),'#1E1E1E');S.add(V.kugel,mat(x,1.02,z,0.15,0.1,0.15),'#C9A64A');}}
  /* Marktstaende */
  const n=4;for(let i=0;i<n;i++){const t=(i+0.5)/n,cx=e.quer?a.x+(i%2?2.6:-2.6):x1+(x2-x1)*t,cz=e.quer?z1+(z2-z1)*t:a.z+(i%2?2.6:-2.6);
   const f=['#D93B2B','#2E7D32','#1565C0','#F9A825'][i];stand(cx,cz,e.quer,f);}
  for(let i=0;i<3;i++){const t=0.2+i*0.3,cx=e.quer?a.x:x1+(x2-x1)*t,cz=e.quer?z1+(z2-z1)*t:a.z;baum(cx,cz,0.8);}
  if(e.quer){bank(a.x+H-0.8,z1+8,Math.PI/2);bank(a.x-H+0.8,z2-8,-Math.PI/2);}else{bank(x1+8,a.z+H-0.8,Math.PI);bank(x2-8,a.z-H+0.8,0);}
 }
 function stand(x,z,quer,farbe){
  const w=3.2,t=2.0;const sx=quer?t:w,sz=quer?w:t;
  S.quader(x-sx/2,0.06,z-sz/2,x+sx/2,0.95,z+sz/2,'#8D6E4F');
  S.quader(x-sx/2,0.95,z-sz/2,x+sx/2,1.02,z+sz/2,'#A1887F');
  const obst=['#E53935','#FB8C00','#FDD835','#7CB342','#8E24AA'];
  for(let i=0;i<10;i++)S.add(V.kugel0,mat(x+(zufall()-0.5)*sx*0.8,1.1,z+(zufall()-0.5)*sz*0.8,0.13,0.11,0.13),obst[i%5]);
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])S.quader(x+dx*sx/2-0.04,0.06,z+dz*sz/2-0.04,x+dx*sx/2+0.04,2.3,z+dz*sz/2+0.04,'#5D4037');
  /* gestreiftes Dach */
  const streifen=8;for(let i=0;i<streifen;i++){const f=i%2?'#FFFFFF':farbe;
   if(quer)S.quader(x-sx/2-0.2,2.3,z-sz/2+i*sz/streifen,x+sx/2+0.2,2.42,z-sz/2+(i+1)*sz/streifen,f);
   else S.quader(x-sx/2+i*sx/streifen,2.3,z-sz/2-0.2,x-sx/2+(i+1)*sx/streifen,2.42,z+sz/2+0.2,f);}
 }

 /* ===== Fassaden-Materialien ===== */
 const FO=STILE.map(()=>new Sammler()),FE=STILE.map(()=>new Sammler()),FL=new Sammler(),ST=new Sammler(),STD=new Sammler();
 const texO=STILE.map(fassadeOben),texE=STILE.map(fassadeHaus),texL=fassadeLaden(),texStein=stein('#B9B2A4'),texSteinD=stein('#8F8B85');
 const STOCK=3.1;
 /* Wand mit Kacheln (ganze Achsen) */
 function kachelWand(ziel,ax,az,bx,bz,y1,y2,breite,farbe){const len=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(len/breite));ziel.wand(ax,az,bx,bz,y1,y2,farbe||'#FFFFFF',[0,0,n,(y2-y1)/STOCK]);}
 function block(ziel,x1,z1,x2,z2,y1,y2,breite,farbe,seiten){for(const s of (seiten||[0,1,2,3])){const w=seitenWand(x1,z1,x2,z2,s);kachelWand(ziel,w[0],w[1],w[2],w[3],y1,y2,breite,farbe);}}
 /* Satteldach: First entlang x (ex) oder z */
 function dach(x1,z1,x2,z2,y,h,ex,farbe,giebel){
  const u=0.35;
  if(ex){const zm=(z1+z2)/2;
   S.quad([x2+u,y,z1-u],[x1-u,y,z1-u],[x1-u,y+h,zm],[x2+u,y+h,zm],farbe);
   S.quad([x1-u,y,z2+u],[x2+u,y,z2+u],[x2+u,y+h,zm],[x1-u,y+h,zm],farbe);
   S.tri([x1,y,z1],[x1,y,z2],[x1,y+h,zm],giebel);S.tri([x2,y,z2],[x2,y,z1],[x2,y+h,zm],giebel);}
  else{const xm=(x1+x2)/2;
   S.quad([x1-u,y,z1-u],[x1-u,y,z2+u],[xm,y+h,z2+u],[xm,y+h,z1-u],farbe);
   S.quad([x2+u,y,z2+u],[x2+u,y,z1-u],[xm,y+h,z1-u],[xm,y+h,z2+u],farbe);
   S.tri([x2,y,z1],[x1,y,z1],[xm,y+h,z1],giebel);S.tri([x1,y,z2],[x2,y,z2],[xm,y+h,z2],giebel);}
 }
 function flachdach(x1,z1,x2,z2,y,farbe){S.quader(x1-0.15,y,z1-0.15,x2+0.15,y+0.5,z2+0.15,farbe||'#D9D2C3');S.quader(x1+0.3,y+0.5,z1+0.3,x2-0.3,y+0.55,z2-0.3,'#6B6F73');}
 function kamin(x,z,y){S.quader(x-0.45,y,z-0.3,x+0.45,y+1.3,z+0.3,'#8A4A35');for(const d of [-0.2,0.2])S.add(V.zyl,mat(x+d,y+1.5,z,0.1,0.4,0.1),'#B5651D');}

 /* ===== Schilder (Atlas) ===== */
 const AG=new Atlas(4096,2048);
 const SCH=new Sammler();
 const schildCache={};
 function schild(text,farbe,fg,w,h,icon){const k=text+'|'+farbe+'|'+(fg||'')+'|'+w+'|'+(icon||'');if(schildCache[k])return schildCache[k];
  return schildCache[k]=AG.add(w||512,h||128,(g,W,H)=>{g.fillStyle=farbe;g.fillRect(0,0,W,H);
   g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=6;rund(g,7,7,W-14,H-14,10);g.stroke();
   g.fillStyle=fg||'#FFFFFF';g.textAlign='center';g.textBaseline='middle';
   const s=passend(g,text,W-(icon?H+40:40),'800',H*0.56,SCHRIFT);g.font='800 '+s+'px '+SCHRIFT;
   const tx=icon?W/2+H*0.3:W/2;g.fillText(text,tx,H/2+3);
   if(icon){g.font=(H*0.5)+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';g.fillText(icon,H*0.55,H/2+3);}});}
 /* Strassenschild: weiss, schwarze Schrift, schwarzer Rand */
 const strSchild=name=>schildCache['S|'+name]||(schildCache['S|'+name]=AG.add(384,96,(g,W,H)=>{g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H);g.strokeStyle='#111';g.lineWidth=7;rund(g,6,6,W-12,H-12,8);g.stroke();
  g.fillStyle='#111';g.textAlign='center';g.textBaseline='middle';const s=passend(g,name.toUpperCase(),W-40,'800',52,'Inter, system-ui, sans-serif');g.font='800 '+s+'px Inter, system-ui, sans-serif';g.fillText(name.toUpperCase(),W/2,H/2+2);}));
 /* Flaeche mit Schild (vorn und hinten) */
 function tafel(rect,x,y,z,w,h,ry,beidseitig){SCH.add(V.ebene,mat(x,y,z,w,h,1,0,ry,0),'#FFFFFF',rect);if(beidseitig)SCH.add(V.ebene,mat(x,y,z,w,h,1,0,ry+Math.PI,0),'#FFFFFF',rect);}
 const DREH=[Math.PI,Math.PI/2,0,-Math.PI/2];   // Ebene (+z vorn) zeigt nach Seite s
 const NORM=[[0,-1],[1,0],[0,1],[-1,0]];
 /* Mitte einer Seite eines Rechtecks */
 const seitenMitte=(o,s)=>s===0?[(o.x1+o.x2)/2,o.z1]:s===2?[(o.x1+o.x2)/2,o.z2]:s===1?[o.x2,(o.z1+o.z2)/2]:[o.x1,(o.z1+o.z2)/2];
 const seitenLaenge=(o,s)=>s===0||s===2?o.x2-o.x1:o.z2-o.z1;

 /* ===== Haeuser ===== */
 function reihenhaus(o){
  const st=STILE[o.stil%STILE.length],s=o.seiten[0],laengsX=s===0||s===2;
  const tief=Math.min(9,(laengsX?o.z2-o.z1:o.x2-o.x1));
  let x1=o.x1,z1=o.z1,x2=o.x2,z2=o.z2;
  if(s===0)z2=z1+tief;if(s===2)z1=z2-tief;if(s===3)x2=x1+tief;if(s===1)x1=x2-tief;
  const stock=o.typ==='laden'?2:(o.stil%3===0?3:2),hoehe=stock*STOCK;
  const len=laengsX?x2-x1:z2-z1,n=Math.max(2,Math.round(len/4.4)),bay=len/n;
  /* Erdgeschoss */
  const w=seitenWand(x1,z1,x2,z2,s);
  if(o.typ==='laden'){kachelWand(FL,w[0],w[1],w[2],w[3],0,STOCK,bay*1.0,mischen('#FFFFFF',['#2E7D32','#1565C0','#B71C1C','#37474F','#6A1B9A'][o.stil%5],0.55));}
  else kachelWand(FE[o.stil%STILE.length],w[0],w[1],w[2],w[3],0,STOCK,bay);
  block(FO[o.stil%STILE.length],x1,z1,x2,z2,STOCK,hoehe,bay,null,[0,1,2,3]);
  block(FO[o.stil%STILE.length],x1,z1,x2,z2,0,STOCK,bay,null,[0,1,2,3].filter(q=>q!==s));
  dach(x1,z1,x2,z2,hoehe,2.6,laengsX,st.dach,st.wand);
  for(let i=1;i<n;i++){const t=i/n;const kx=laengsX?x1+len*t:(x1+x2)/2,kz=laengsX?(z1+z2)/2:z1+len*t;kamin(kx,kz,hoehe+1.6);}
  if(o.typ==='laden'){const [mx,mz]=seitenMitte({x1,z1,x2,z2},s),[nx,nz]=NORM[s];
   tafel(schild(o.schild,['#1F3A4D','#3E2723','#0F3B2E','#4A148C','#263238'][o.stil%5]),mx+nx*0.08,STOCK+0.45,mz+nz*0.08,Math.min(len-0.6,6),1.1,DREH[s]);}
 }
 function eckhaus(o){
  const st=STILE[o.stil%STILE.length],m=0.0,x1=o.x1,z1=o.z1,x2=o.x2,z2=o.z2;
  const stock=3,hoehe=stock*STOCK;
  for(const s of [0,1,2,3]){const w=seitenWand(x1,z1,x2,z2,s);
   if(o.seiten.includes(s)&&o.stil%2===0)kachelWand(FL,w[0],w[1],w[2],w[3],0,STOCK,4.8,mischen('#FFFFFF','#37474F',0.4));
   else kachelWand(o.seiten.includes(s)?FE[o.stil%STILE.length]:FO[o.stil%STILE.length],w[0],w[1],w[2],w[3],0,STOCK,4.6);}
  block(FO[o.stil%STILE.length],x1,z1,x2,z2,STOCK,hoehe,4.6);
  dach(x1,z1,x2,z2,hoehe,3.2,o.stil%2===0,st.dach,st.wand);
  if(o.stil%2===0)kamin(x1+3,(z1+z2)/2,hoehe+2.2);else kamin((x1+x2)/2,z1+3,hoehe+2.2);
 }

 /* ===== Orte ===== */
 const ortFarbe=id=>(welt.orte[id]&&welt.orte[id].farbe)||'#333';
 /* grosses Schild an allen Strassenseiten + Ausleger an der Ecke */
 function ortSchilder(o,O,y,breite){
  for(const s of o.seiten){const [mx,mz]=seitenMitte(o,s),[nx,nz]=NORM[s];
   tafel(schild(O.schild,O.farbe,'#FFFFFF',640,128),mx+nx*0.12,y,mz+nz*0.12,Math.min(seitenLaenge(o,s)-1.2,breite||9),1.8,DREH[s]);}
  /* Ausleger quer zur Strasse, gut sichtbar beim Heranfahren */
  for(const s of o.seiten){const [nx,nz]=NORM[s],k=o.ecke?welt.knoten[o.knoten]:null;let ax,az;
   if(s===0||s===2){az=s===0?o.z1:o.z2;ax=k?(Math.abs(o.x1-k.x)<Math.abs(o.x2-k.x)?o.x1+0.9:o.x2-0.9):(o.x1+o.x2)/2;}
   else{ax=s===1?o.x2:o.x1;az=k?(Math.abs(o.z1-k.z)<Math.abs(o.z2-k.z)?o.z1+0.9:o.z2-0.9):(o.z1+o.z2)/2;}
   const ry=DREH[s]+Math.PI/2,px=ax+nx*1.25,pz=az+nz*1.25;
   S.quader(ax+nx*0.05-0.05,4.6,az+nz*0.05-0.05,px+nx*1.3+0.05,4.7,pz+nz*1.3+0.05,'#2B2B2B');
   tafel(schild(O.kurz||O.schild,O.farbe,'#FFFFFF',512,128),px+nx*0.65,3.95,pz+nz*0.65,2.6,0.75,ry,true);
  }
 }
 function ortBauen(o){
  const O=welt.orte[o.ort],f=O.farbe;
  const x1=o.x1,z1=o.z1,x2=o.x2,z2=o.z2,cx=(x1+x2)/2,cz=(z1+z2)/2;
  const front=o.seiten[0];
  if(O.modell==='laden'||O.modell==='markt'){
   const st=STILE[(o.stil||o.id)%STILE.length],hoehe=O.modell==='markt'?5.2:2*STOCK;
   for(const s of [0,1,2,3]){const w=seitenWand(x1,z1,x2,z2,s);
    if(o.seiten.includes(s))kachelWand(FL,w[0],w[1],w[2],w[3],0,STOCK,O.modell==='markt'?3.6:4.4,mischen('#FFFFFF',f,0.35));
    else kachelWand(FO[(o.id)%STILE.length],w[0],w[1],w[2],w[3],0,STOCK,4.4);}
   if(O.modell==='markt'){block(S,x1,z1,x2,z2,STOCK,hoehe,10,'#E8E4DA');flachdach(x1,z1,x2,z2,hoehe);
    /* Einkaufswagen-Unterstand */
    const [mx,mz]=seitenMitte(o,front),[nx,nz]=NORM[front];for(let i=0;i<4;i++)wagenSymbol(mx+nx*1.6+(nz?(i-1.5)*0.7:0),mz+nz*1.6+(nx?(i-1.5)*0.7:0));}
   else{block(FO[(o.id)%STILE.length],x1,z1,x2,z2,STOCK,hoehe,4.4);dach(x1,z1,x2,z2,hoehe,2.8,front===0||front===2,st.dach,st.wand);}
   if(O.markise)for(const s of o.seiten){const w=seitenWand(x1,z1,x2,z2,s),[nx,nz]=NORM[s],len=seitenLaenge(o,s),n=Math.round(len/0.7);
    for(let i=0;i<n;i++){const t1=i/n,t2=(i+1)/n,ax=w[0]+(w[2]-w[0])*t1,az=w[1]+(w[3]-w[1])*t1,bx=w[0]+(w[2]-w[0])*t2,bz=w[1]+(w[3]-w[1])*t2;
     S.quad([ax+nx*1.6,2.45,az+nz*1.6],[bx+nx*1.6,2.45,bz+nz*1.6],[bx,3.05,bz],[ax,3.05,az],O.markise[i%2]);}}
   ortSchilder(o,O,STOCK+0.5,O.modell==='markt'?12:8);
   if(O.id==='post'){const [mx,mz]=seitenMitte(o,front),[nx,nz]=NORM[front];postkasten(mx+nx*2.4+(nz?2:0),mz+nz*2.4+(nx?2:0));}
   if(O.id==='cafe'){const [mx,mz]=seitenMitte(o,front),[nx,nz]=NORM[front];for(const d of [-2.2,2.2]){const tx=mx+nx*2.2+(nz?d:0),tz=mz+nz*2.2+(nx?d:0);S.add(V.zyl,mat(tx,KANTE+0.75,tz,0.45,0.05,0.45),'#FFFFFF');S.add(V.zyl,mat(tx,KANTE+0.38,tz,0.05,0.75,0.05),'#333');S.add(V.kegel,mat(tx,KANTE+2.3,tz,1.1,0.5,1.1),O.farbe);S.add(V.zyl,mat(tx,KANTE+1.4,tz,0.04,1.9,0.04),'#DDD');}}
   return;
  }
  if(O.modell==='kirche'){
   /* Kirchhof mit Mauer */
   GR.quader(x1,KANTE,z1,x2,KANTE+0.03,z2,'#FFFFFF');
   for(const s of [0,1,2,3]){const w=seitenWand(x1,z1,x2,z2,s);ST.quader(Math.min(w[0],w[2])-0.2,KANTE,Math.min(w[1],w[3])-0.2,Math.max(w[0],w[2])+0.2,KANTE+0.8,Math.max(w[1],w[3])+0.2,'#FFFFFF','wand');}
   const lx=front===0||front===2;const nx1=lx?x1+2:x1+3.5,nx2=lx?x2-5:x2-3.5,nz1=lx?z1+3.5:z1+2,nz2=lx?z2-3.5:z2-5;
   block(ST,nx1,nz1,nx2,nz2,0,6.5,1,'#FFFFFF');
   dach(nx1,nz1,nx2,nz2,6.5,4.2,lx,'#4A4F55','#B9B2A4');
   /* Spitzbogenfenster */
   for(const s of [0,1,2,3]){const w=seitenWand(nx1,nz1,nx2,nz2,s),[nx,nz]=NORM[s],len=Math.hypot(w[2]-w[0],w[3]-w[1]),n=Math.max(1,Math.floor(len/3));
    for(let i=0;i<n;i++){const t=(i+0.5)/n,px=w[0]+(w[2]-w[0])*t+nx*0.05,pz=w[1]+(w[3]-w[1])*t+nz*0.05;
     S.add(V.ebene,mat(px,3.4,pz,1.0,2.8,1,0,DREH[s],0),'#33506E');S.add(V.kegel4,mat(px,5.0,pz,0.7,0.8,0.05,0,DREH[s]+Math.PI/4,0),'#33506E');}}
   /* Turm mit Spitze und Uhr */
   const tx=lx?x2-3.2:cx,tz=lx?cz:z2-3.2;
   ST.quader(tx-2.2,0,tz-2.2,tx+2.2,15,tz+2.2,'#FFFFFF','wand');
   S.quader(tx-2.4,15,tz-2.4,tx+2.4,15.6,tz+2.4,'#9C958A');
   S.add(V.kegel4,mat(tx,21.5,tz,3.1,12,3.1,0,Math.PI/4,0),'#4A4F55');
   S.add(V.zyl,mat(tx,28,tz,0.06,1.4,0.06),'#C9A64A');S.quader(tx-0.4,28.1,tz-0.05,tx+0.4,28.25,tz+0.05,'#C9A64A');
   for(const s of [0,1,2,3]){const [nx,nz]=NORM[s];S.add(V.scheibe,mat(tx+nx*2.23,12,tz+nz*2.23,0.95,0.95,1,0,DREH[s],0),'#F4F1EA');
    S.quader(tx+nx*2.25-0.05,11.95,tz+nz*2.25-0.05,tx+nx*2.25+0.05+(nz?0.55:0),12.05,tz+nz*2.25+0.05+(nx?0.55:0),'#111');
    S.quader(tx+nx*2.25-0.05,12,tz+nz*2.25-0.05,tx+nx*2.25+0.05,12.75,tz+nz*2.25+0.05,'#111');}
   /* Grabsteine */
   for(let i=0;i<10;i++){const gx=x1+1.2+zufall()*(x2-x1-2.4),gz=z1+1.2+zufall()*(z2-z1-2.4);if(gx>nx1-0.8&&gx<nx2+0.8&&gz>nz1-0.8&&gz<nz2+0.8)continue;if(Math.abs(gx-tx)<3&&Math.abs(gz-tz)<3)continue;
    S.quader(gx-0.3,KANTE,gz-0.08,gx+0.3,KANTE+0.8,gz+0.08,'#9E9A92');}
   baum(x1+1.8,z1+1.8,0.9);
   /* Schilder: Tafel am Zaun */
   for(const s of o.seiten){const [mx,mz]=seitenMitte(o,s),[nx,nz]=NORM[s];
    S.quader(mx+nx*0.4-0.08,KANTE,mz+nz*0.4-0.08,mx+nx*0.4+0.08,2.4,mz+nz*0.4+0.08,'#3E2723');
    tafel(schild(O.schild,'#1F3A4D','#FFFFFF',640,128,'⛪'),mx+nx*0.52,2.4,mz+nz*0.52,4.8,1.0,DREH[s],true);}
   return;
  }
  if(O.modell==='bahnhof'){
   block(FO[0],x1,z1,x2,z2,0,2*STOCK,4.4);dach(x1,z1,x2,z2,2*STOCK,2.8,front===0||front===2,'#3E434A','#9C4A35');
   /* Uhrturm */
   ST.quader(cx-1.6,2*STOCK,cz-1.6,cx+1.6,13,cz+1.6,'#FFFFFF','wand');S.add(V.kegel4,mat(cx,14.5,cz,2.4,3,2.4,0,Math.PI/4,0),'#3E434A');
   for(const s of o.seiten){const [nx,nz]=NORM[s];S.add(V.scheibe,mat(cx+nx*1.63,11,cz+nz*1.63,0.9,0.9,1,0,DREH[s],0),'#F4F1EA');S.quader(cx+nx*1.66-0.04,10.95,cz+nz*1.66-0.04,cx+nx*1.66+0.04,11.6,cz+nz*1.66+0.04,'#111');}
   /* Vordach */
   for(const s of o.seiten){const w=seitenWand(x1,z1,x2,z2,s),[nx,nz]=NORM[s];
    S.quad([w[0]+nx*3,3.6,w[1]+nz*3],[w[2]+nx*3,3.6,w[3]+nz*3],[w[2],4.2,w[3]],[w[0],4.2,w[1]],'#2C3E50');
    for(let t=0.1;t<=0.9;t+=0.4)S.add(V.zyl,mat(w[0]+(w[2]-w[0])*t+nx*2.8,KANTE+1.8,w[1]+(w[3]-w[1])*t+nz*2.8,0.08,3.6,0.08),'#2C3E50');}
   ortSchilder(o,O,STOCK+1.5,10);return;
  }
  if(O.modell==='bank'){
   block(ST,x1+1.5,z1+1.5,x2-1.5,z2-1.5,0,3*STOCK,1,'#FFFFFF');flachdach(x1+1.5,z1+1.5,x2-1.5,z2-1.5,3*STOCK,'#D7CFC0');
   for(const s of o.seiten){const w=seitenWand(x1+1.5,z1+1.5,x2-1.5,z2-1.5,s),[nx,nz]=NORM[s];
    for(let i=0;i<4;i++){const t=0.2+i*0.2,px=w[0]+(w[2]-w[0])*t+nx*1.1,pz=w[1]+(w[3]-w[1])*t+nz*1.1;S.add(V.zyl,mat(px,KANTE+3.4,pz,0.36,6.8,0.36),'#EDE6D8');}
    /* Giebel */
    const ax=w[0]+(w[2]-w[0])*0.1+nx*1.4,az=w[1]+(w[3]-w[1])*0.1+nz*1.4,bx=w[0]+(w[2]-w[0])*0.9+nx*1.4,bz=w[1]+(w[3]-w[1])*0.9+nz*1.4;
    S.quader(Math.min(ax,bx)-0.3,6.9,Math.min(az,bz)-0.3,Math.max(ax,bx)+0.3,7.6,Math.max(az,bz)+0.3,'#E2DACB');
    S.tri([ax,7.6,az],[bx,7.6,bz],[(ax+bx)/2,9.2,(az+bz)/2],'#E2DACB');
    S.quader(Math.min(ax,bx),KANTE,Math.min(az,bz),Math.max(ax,bx),KANTE+0.35,Math.max(az,bz),'#CFC7B8');}
   ortSchilder(o,O,6.0,8);return;
  }
  if(O.modell==='tanke'){
   S.quader(x1,KANTE,z1,x2,KANTE+0.02,z2,'#9E9E9E');
   const sx1=x1+2,sx2=x2-2,sz1=z1+2,sz2=z2-2;
   for(const [px,pz] of [[sx1,sz1],[sx2,sz1],[sx1,sz2],[sx2,sz2]])S.add(V.box,mat(px,2.4,pz,0.35,4.6,0.35),'#ECEFF1');
   S.quader(sx1-0.6,4.6,sz1-0.6,sx2+0.6,5.4,sz2+0.6,'#FFFFFF');S.quader(sx1-0.62,4.7,sz1-0.62,sx2+0.62,5.2,sz2+0.62,f);
   for(const d of [-2.5,2.5]){S.quader(cx+d-0.4,KANTE,cz-0.6,cx+d+0.4,1.8,cz+0.6,'#ECEFF1');S.quader(cx+d-0.42,1.1,cz-0.62,cx+d+0.42,1.5,cz+0.62,f);}
   ortSchilder(o,O,5.0,10);return;
  }
  /* grosses Gebaeude: Bibliothek, Polizei, Schule, Schwimmbad, Hotel, Museum, Kino, Feuerwache */
  const stock=O.modell==='kino'?2:3,hoehe=stock*STOCK;
  const stil=O.id==='pool'?4:O.id==='school'?0:O.id==='hotel'?3:O.id==='police'?2:1;
  for(const s of [0,1,2,3]){const w=seitenWand(x1,z1,x2,z2,s);
   if(o.seiten.includes(s)&&O.modell!=='feuer')kachelWand(FL,w[0],w[1],w[2],w[3],0,STOCK,3.8,mischen('#FFFFFF',f,0.35));
   else kachelWand(FO[stil],w[0],w[1],w[2],w[3],0,STOCK,4.2);}
  block(FO[stil],x1,z1,x2,z2,STOCK,hoehe,4.2);flachdach(x1,z1,x2,z2,hoehe,'#D9D2C3');
  if(O.modell==='feuer')for(const s of o.seiten){const w=seitenWand(x1,z1,x2,z2,s),[nx,nz]=NORM[s];for(const t of [0.3,0.7]){const px=w[0]+(w[2]-w[0])*t+nx*0.06,pz=w[1]+(w[3]-w[1])*t+nz*0.06;S.add(V.ebene,mat(px,1.7,pz,3.6,3.2,1,0,DREH[s],0),'#C62828');for(let y=0.6;y<3.2;y+=0.5)S.add(V.ebene,mat(px+nx*0.01,y,pz+nz*0.01,3.6,0.05,1,0,DREH[s],0),'#8E1B1B');}}
  if(O.modell==='kino'){for(const s of o.seiten){const w=seitenWand(x1,z1,x2,z2,s),[nx,nz]=NORM[s];
   const ax=w[0]+(w[2]-w[0])*0.15,az=w[1]+(w[3]-w[1])*0.15,bx=w[0]+(w[2]-w[0])*0.85,bz=w[1]+(w[3]-w[1])*0.85;
   S.quad([ax+nx*2.2,3.4,az+nz*2.2],[bx+nx*2.2,3.4,bz+nz*2.2],[bx,3.6,bz],[ax,3.6,az],'#B0182A');
   for(let t=0;t<=1;t+=0.08)GL.add(V.kugel0,mat(ax+(bx-ax)*t+nx*2.25,3.32,az+(bz-az)*t+nz*2.25,0.09,0.09,0.09),'#FFE9A8');}}
  if(O.id==='police'){const [mx,mz]=seitenMitte(o,front),[nx,nz]=NORM[front];GL.add(V.box,mat(mx+nx*0.5,3.6,mz+nz*0.5,0.45,0.6,0.45),'#4F7BFF');}
  if(O.id==='hotel')for(const s of o.seiten){const w=seitenWand(x1,z1,x2,z2,s),[nx,nz]=NORM[s];for(const t of [0.25,0.5,0.75]){const px=w[0]+(w[2]-w[0])*t+nx*0.3,pz=w[1]+(w[3]-w[1])*t+nz*0.3;S.quader(px-0.04,hoehe-0.5,pz-0.04,px+nx*1.6+0.04,hoehe-0.42,pz+nz*1.6+0.04,'#BDBDBD');S.add(V.ebene,mat(px+nx*1.2,hoehe-1.1,pz+nz*1.2,0.05,1.0,1,0,DREH[s]+Math.PI/2,0),['#C62828','#FFFFFF','#1565C0'][Math.round(t*4)%3]);}}
  if(O.id==='school'){const [mx,mz]=seitenMitte(o,front);S.add(V.zyl,mat(mx,hoehe+1.2,mz,0.6,0.4,0.6),'#C9A64A');}
  ortSchilder(o,O,STOCK+0.55,10);
 }
 function wagenSymbol(x,z){S.quader(x-0.25,KANTE+0.35,z-0.35,x+0.25,KANTE+0.85,z+0.35,'#9EA7AD');S.quader(x-0.27,KANTE+0.85,z-0.37,x+0.27,KANTE+0.9,z+0.37,'#2E9E4F');}
 function postkasten(x,z){S.add(V.zyl,mat(x,KANTE+0.75,z,0.32,1.5,0.32),'#D7261E');S.add(V.kugel,mat(x,KANTE+1.5,z,0.34,0.2,0.34),'#D7261E');S.quader(x-0.2,KANTE+1.12,z-0.33,x+0.2,KANTE+1.18,z+0.33,'#111');}
 function telefon(x,z,ry){const g=mat(x,KANTE,z,1,1,1,0,ry,0);const t=(a,b)=>S.add(V.box,g.clone().multiply(mat(a[0],a[1],a[2],b[0],b[1],b[2])),'#D7261E');
  t([0,1.25,0],[1.0,2.5,1.0]);S.add(V.box,g.clone().multiply(mat(0,2.65,0,1.05,0.3,1.05)),'#C0201A');S.add(V.ebene,g.clone().multiply(mat(0,1.5,0.51,0.75,1.6,1)),'#2D4250');}
 function bank(x,z,ry){const g=mat(x,KANTE,z,1,1,1,0,ry,0);const t=(a,b,f)=>S.add(V.box,g.clone().multiply(mat(a[0],a[1],a[2],b[0],b[1],b[2])),f);
  t([0,0.45,0],[1.6,0.07,0.45],'#7B5233');t([0,0.75,-0.2],[1.6,0.35,0.06],'#7B5233');for(const d of [-0.7,0.7])t([d,0.22,0],[0.06,0.45,0.42],'#2B2B2B');}
 function baum(x,z,gr){gr=gr||1;S.add(V.zyl,mat(x,KANTE+1.4*gr,z,0.18*gr,2.8*gr,0.18*gr),'#6D4C3D');
  const gruen=['#4E8A3E','#5E9A48','#3F7A35','#6BA552'];for(let i=0;i<4;i++)S.add(V.kugel,mat(x+(zufall()-0.5)*1.4*gr,KANTE+(3.4+zufall()*1.2)*gr,z+(zufall()-0.5)*1.4*gr,(1.5+zufall()*0.5)*gr,(1.3+zufall()*0.4)*gr,(1.5+zufall()*0.5)*gr),gruen[i]);}
 function laterne(x,z,nx,nz){S.add(V.zyl,mat(x,KANTE+2.6,z,0.07,5.2,0.07),'#2F3A40');S.quader(x-0.05,KANTE+5.1,z-0.05,x+nx*0.9+0.05,KANTE+5.2,z+nz*0.9+0.05,'#2F3A40');S.add(V.box,mat(x+nx*0.95,KANTE+5.05,z+nz*0.95,0.45,0.16,0.3),'#2F3A40');}
 function auto(a){const g=mat(a.x,0,a.z,1,1,1,0,a.quer?0:Math.PI/2,0);const t=(p,s,f,geo)=>S.add(geo||V.box,g.clone().multiply(mat(p[0],p[1],p[2],s[0],s[1],s[2])),f);
  t([0,0.62,0],[1.75,0.62,4.1],a.farbe);t([0,1.2,0.25],[1.55,0.6,2.2],a.farbe);t([0,1.2,0.25],[1.58,0.42,2.0],'#2D4250');
  t([0,1.2,-0.92],[1.5,0.45,0.05],'#2D4250');t([0,1.2,1.42],[1.5,0.45,0.05],'#2D4250');
  for(const [dx,dz] of [[-0.82,-1.3],[0.82,-1.3],[-0.82,1.3],[0.82,1.3]])S.add(V.rad,g.clone().multiply(mat(dx,0.34,dz,0.34,0.22,0.34,0,0,Math.PI/2)),'#1A1A1A');
  t([0,0.55,-2.06],[1.6,0.2,0.05],'#E0E0E0');t([0,0.55,2.06],[1.6,0.2,0.05],'#E0E0E0');
  for(const d of [-0.6,0.6]){t([d,0.75,-2.07],[0.3,0.14,0.03],'#FFF59D');t([d,0.75,2.07],[0.3,0.14,0.03],'#E53935');}
  SCHATTEN.add(V.ebene,mat(a.x,0.02,a.z,a.quer?2.4:4.8,a.quer?4.8:2.4,1,-Math.PI/2,0,0),'#FFFFFF',[0,0,1,1]);}
 const GL=new Sammler();       // Leuchtendes (unbeleuchtetes Material)
 const SCHATTEN=new Sammler();
 for(const o of welt.lots){
  if(o.typ==='ort')ortBauen(o);
  else if(o.ecke)eckhaus(o);
  else reihenhaus(o);
 }
 /* ===== Flaechen: Park und Fussballplatz ===== */
 for(const f of welt.flaechen){
  sockel(f.x1,f.z1,f.x2,f.z2,GR);
  const cx=(f.x1+f.x2)/2,cz=(f.z1+f.z2)/2,w=f.x2-f.x1,d=f.z2-f.z1;
  /* Gelaender */
  const zaun=(ax,az,bx,bz)=>{const len=Math.hypot(bx-ax,bz-az),n=Math.ceil(len/1.2);for(let i=0;i<=n;i++){const t=i/n;S.add(V.box,mat(ax+(bx-ax)*t,KANTE+0.6,az+(bz-az)*t,0.06,1.2,0.06),'#1E2B24');}
   S.quader(Math.min(ax,bx)-0.03,KANTE+1.1,Math.min(az,bz)-0.03,Math.max(ax,bx)+0.03,KANTE+1.16,Math.max(az,bz)+0.03,'#1E2B24');S.quader(Math.min(ax,bx)-0.03,KANTE+0.3,Math.min(az,bz)-0.03,Math.max(ax,bx)+0.03,KANTE+0.36,Math.max(az,bz)+0.03,'#1E2B24');};
  const i=1.2;zaun(f.x1+i,f.z1+i,f.x2-i,f.z1+i);zaun(f.x1+i,f.z2-i,f.x2-i,f.z2-i);zaun(f.x1+i,f.z1+i,f.x1+i,f.z2-i);zaun(f.x2-i,f.z1+i,f.x2-i,f.z2-i);
  if(f.modell==='park'){
   S.add(V.scheibe,mat(cx,KANTE+0.04,cz,Math.min(w,d)*0.18,Math.min(w,d)*0.12,1,-Math.PI/2,0,0),'#4F8FBF');
   for(let k=0;k<26;k++){const x=f.x1+4+zufall()*(w-8),z=f.z1+4+zufall()*(d-8);if(Math.hypot((x-cx)/(w*0.22),(z-cz)/(d*0.16))<1.2)continue;baum(x,z,0.9+zufall()*0.5);}
   for(let k=0;k<6;k++)bank(cx+(k-2.5)*6,cz+Math.min(w,d)*0.2,Math.PI);
   /* Wege */
   S.quader(f.x1+1,KANTE+0.03,cz-1,f.x2-1,KANTE+0.05,cz+1,'#D8C7A2');S.quader(cx-1,KANTE+0.03,f.z1+1,cx+1,KANTE+0.05,f.z2-1,'#D8C7A2');
   /* Spielplatz */
   const sx=f.x1+8,sz=f.z1+8;S.quader(sx-2,KANTE+0.02,sz-2,sx+4,KANTE+0.06,sz+4,'#E8D9B0');
   S.add(V.box,mat(sx,KANTE+1.2,sz,0.1,2.4,0.1),'#E53935');S.add(V.box,mat(sx+2.4,KANTE+1.2,sz,0.1,2.4,0.1),'#E53935');S.add(V.box,mat(sx+1.2,KANTE+2.4,sz,2.5,0.1,0.1),'#E53935');
   S.quader(sx+0.6,KANTE+0.5,sz-0.2,sx+1.0,KANTE+0.56,sz+0.2,'#1565C0');S.quader(sx+1.5,KANTE+0.5,sz-0.2,sx+1.9,KANTE+0.56,sz+0.2,'#F9A825');
  }else{
   const pw=Math.min(w,d)*0.8,pl=Math.max(w,d)*0.78,lx=w>d;
   S.quader(cx-(lx?pl:pw)/2,KANTE+0.03,cz-(lx?pw:pl)/2,cx+(lx?pl:pw)/2,KANTE+0.04,cz+(lx?pw:pl)/2,'#5FA04A');
   for(let k=0;k<10;k++){const t=k/10;if(lx)S.quader(cx-pl/2+t*pl,KANTE+0.041,cz-pw/2,cx-pl/2+(t+0.05)*pl,KANTE+0.045,cz+pw/2,'#6DB056');else S.quader(cx-pw/2,KANTE+0.041,cz-pl/2+t*pl,cx+pw/2,KANTE+0.045,cz-pl/2+(t+0.05)*pl,'#6DB056');}
   const linie=(x1,z1,x2,z2)=>MK.add(V.box,mat((x1+x2)/2,KANTE+0.05,(z1+z2)/2,Math.abs(x2-x1)+0.15,0.01,Math.abs(z2-z1)+0.15),'#FFFFFF');
   const hx=(lx?pl:pw)/2,hz=(lx?pw:pl)/2;linie(cx-hx,cz-hz,cx+hx,cz-hz);linie(cx-hx,cz+hz,cx+hx,cz+hz);linie(cx-hx,cz-hz,cx-hx,cz+hz);linie(cx+hx,cz-hz,cx+hx,cz+hz);
   if(lx)linie(cx,cz-hz,cx,cz+hz);else linie(cx-hx,cz,cx+hx,cz);
   for(const s of [-1,1]){const gx=lx?cx+s*hx:cx,gz=lx?cz:cz+s*hz;const qx=lx?0:3.6,qz=lx?3.6:0;
    S.quader(gx-qx/2-0.06,KANTE,gz-qz/2-0.06,gx-qx/2+0.06,KANTE+2.4,gz-qz/2+0.06,'#FFFFFF');S.quader(gx+qx/2-0.06,KANTE,gz+qz/2-0.06,gx+qx/2+0.06,KANTE+2.4,gz+qz/2+0.06,'#FFFFFF');
    S.quader(gx-qx/2-0.06,KANTE+2.34,gz-qz/2-0.06,gx+qx/2+0.06,KANTE+2.46,gz+qz/2+0.06,'#FFFFFF');}
   S.add(V.kugel,mat(cx+3,KANTE+0.25,cz-2,0.22,0.22,0.22),'#FFFFFF');
  }
  /* Schild am Eingang an jeder Seite */
  for(const s of [0,1,2,3]){const m=[cx,cz];const [nx,nz]=NORM[s];const px=s===1?f.x2:s===3?f.x1:cx,pz=s===0?f.z1:s===2?f.z2:cz;
   S.quader(px-nx*0.6-0.07,KANTE,pz-nz*0.6-0.07,px-nx*0.6+0.07,2.6,pz-nz*0.6+0.07,'#1E2B24');
   tafel(schild(f.schild,f.modell==='park'?'#2E7D32':'#1565C0','#FFFFFF',640,128,f.modell==='park'?'🌳':'⚽'),px-nx*0.5,2.6,pz-nz*0.5,5,1.0,DREH[s],true);}
 }
 /* ===== Kreisverkehre ===== */
 for(const k of welt.knoten.filter(k=>k.rund)){
  S.add(V.zyl,mat(k.x,0.1,k.z,L.INSEL,0.2,L.INSEL),'#E8E8E8');
  GR.add(V.zyl,mat(k.x,0.22,k.z,L.INSEL-0.35,0.06,L.INSEL-0.35),'#FFFFFF');
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;S.add(V.kugel0,mat(k.x+Math.sin(a)*(L.INSEL-0.8),0.35,k.z-Math.cos(a)*(L.INSEL-0.8),0.28,0.2,0.28),['#E53935','#FDD835','#AB47BC','#FB8C00'][i%4]);}
  baum(k.x,k.z,0.8);
  MK.add(V.ring,mat(k.x,0.03,k.z,L.INSEL+0.6,L.INSEL+0.6,1,-Math.PI/2,0,0),'#F4F4F0');
  /* blaues Schild "Kreisverkehr" an jeder Zufahrt */
  const rs=AG.add(128,128,(g,W,H)=>{g.fillStyle='#1E5AA8';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.strokeStyle='#FFFFFF';g.lineWidth=10;g.beginPath();g.arc(64,64,28,0.3,Math.PI*2-0.6);g.stroke();
   g.fillStyle='#FFFFFF';g.beginPath();g.moveTo(92,44);g.lineTo(104,70);g.lineTo(78,62);g.fill();});
  for(let d=0;d<4;d++){if(k.nb[d]==null)continue;const [nx,nz]=NORM[d];const lx=NORM[(d+3)%4][0],lz=NORM[(d+3)%4][1];
   const px=k.x+nx*(H+2.2)+(-lx)*(H+0.9),pz=k.z+nz*(H+2.2)+(-lz)*(H+0.9);
   S.add(V.zyl,mat(px,KANTE+1.1,pz,0.05,2.2,0.05),'#8A8F93');tafel(rs,px,2.3,pz,0.9,0.9,DREH[d],false);}
 }
 /* ===== Ampeln ===== */
 const LICHT={};['ns','ew'].forEach(a=>['r','y','g'].forEach(f=>{LICHT[a+f]=new Sammler();}));
 for(const k of welt.knoten.filter(k=>k.ampel)){
  for(let d=0;d<4;d++){if(k.nb[d]==null)continue;
   /* Mast an der linken Ecke der Zufahrt aus Richtung d (Verkehr kommt von d, faehrt nach d+2) */
   const [nx,nz]=NORM[d],[lx,lz]=NORM[(d+1)%4];
   const px=k.x+nx*(H+1.0)+lx*(H+0.9),pz=k.z+nz*(H+1.0)+lz*(H+0.9);
   S.add(V.zyl,mat(px,KANTE+1.7,pz,0.08,3.4,0.08),'#2F3A40');
   S.add(V.box,mat(px,KANTE+3.4,pz,0.42,1.25,0.42,0,DREH[d],0),'#1F2326');
   const ax=d%2===0?'ns':'ew';
   ['r','y','g'].forEach((f,i)=>LICHT[ax+f].add(V.scheibe,mat(px+nx*0.22,KANTE+3.8-i*0.38,pz+nz*0.22,0.14,0.14,1,0,DREH[d],0),'#FFFFFF'));
  }
 }
 const LM={};const LF={r:'#FF3B30',y:'#FFB020',g:'#30D158'};
 for(const k in LICHT){if(LICHT[k].leer())continue;LM[k]=new THREE.MeshBasicMaterial({color:'#333'});scene.add(LICHT[k].mesh(LM[k]));}
 /* ===== Strassenmoebel: Strassenschilder, Laternen, Baeume, Bushaltestellen ===== */
 for(const k of welt.knoten){
  /* Namensschilder: je Strasse an einer Ecke */
  const quad=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const strassen=[];if(k.kante[1]||k.kante[3])strassen.push({name:(k.kante[1]||k.kante[3]).name,quer:false});if(k.kante[0]||k.kante[2])strassen.push({name:(k.kante[0]||k.kante[2]).name,quer:true});
  strassen.forEach((st,i)=>{
   const q=quad[(k.id+i*2)%4],ex=k.x+q[0]*(H+0.6),ez=k.z+q[1]*(H+0.6);
   if(Math.abs(ex)>(L.NX-1)*A+H||Math.abs(ez)>(L.NZ-1)*A+H)return;
   if(!welt.kisten.some(b=>b.art==='block'||b.art==='flaeche'?ex>=b.x1-0.1&&ex<=b.x2+0.1&&ez>=b.z1-0.1&&ez<=b.z2+0.1:false))return;
   const rect=strSchild(st.name);
   for(const s of [-1,1])S.add(V.zyl,mat(ex+(st.quer?0:s*0.85),KANTE+0.5,ez+(st.quer?s*0.85:0),0.04,1.0,0.04),'#333');
   tafel(rect,ex,KANTE+1.25,ez,2.1,0.52,st.quer?Math.PI/2:0,true);
  });
 }
 for(const e of welt.kanten){if(e.art!=='strasse')continue;const a=welt.knoten[e.a];
  for(const s of [-1,1]){
   for(const t of [0.32,0.68]){const tt=s<0?t:1-t;const x=e.quer?a.x+s*(H+0.5):a.x+tt*A,z=e.quer?a.z+tt*A:a.z+s*(H+0.5);
    if(welt.autos.some(c=>Math.hypot(c.x-x,c.z-z)<1.5))continue;
    laterne(x,z,e.quer?-s:0,e.quer?0:-s);}
   if(rand()<0.45){const t=0.5,x=e.quer?a.x+s*(H+1.0):a.x+t*A,z=e.quer?a.z+t*A:a.z+s*(H+1.0);baum(x,z,0.75);}
  }}
 /* Bushaltestellen, Telefonzellen, Briefkaesten, Baenke */
 {const kand=welt.kanten.filter(e=>e.art==='strasse');let bus=0;
  for(const e of kand){const a=welt.knoten[e.a];const s=rand()<0.5?-1:1;const t=0.18+rand()*0.06;
   const x=e.quer?a.x+s*(H+1.6):a.x+t*A,z=e.quer?a.z+t*A:a.z+s*(H+1.6);
   const r=rand();
   if(r<0.12&&bus<5){bus++;const g=mat(x,KANTE,z,1,1,1,0,e.quer?(s>0?-Math.PI/2:Math.PI/2):(s>0?Math.PI:0),0);
    const t2=(p,sz,f)=>S.add(V.box,g.clone().multiply(mat(p[0],p[1],p[2],sz[0],sz[1],sz[2])),f);
    t2([0,2.4,0.6],[3.2,0.1,1.4],'#2F3A40');t2([-1.55,1.2,0.6],[0.08,2.4,1.3],'#9FC3D4');t2([0,1.2,1.25],[3.1,2.4,0.06],'#9FC3D4');t2([0,0.5,1.0],[2.4,0.08,0.4],'#7B5233');
    S.add(V.zyl,mat(x+(e.quer?0:1.9),KANTE+1.3,z+(e.quer?1.9:0),0.05,2.6,0.05),'#555');
    tafel(schild('BUS STOP','#D7261E','#FFFFFF',320,128,'🚌'),x+(e.quer?0:1.9),KANTE+2.7,z+(e.quer?1.9:0),1.3,0.5,e.quer?Math.PI/2:0,true);}
   else if(r<0.2)telefon(x,z,e.quer?(s>0?-Math.PI/2:Math.PI/2):(s>0?Math.PI:0));
   else if(r<0.3)postkasten(x,z);
   else if(r<0.4)bank(x,z,e.quer?(s>0?-Math.PI/2:Math.PI/2):(s>0?Math.PI:0));
  }}
 for(const a of welt.autos)auto(a);

 /* ===== Start und Ziel ===== */
 const ZIEL=new THREE.Group();scene.add(ZIEL);
 const START=new THREE.Group();scene.add(START);
 const schach=leinwand(128,32,(g,W,H)=>{for(let y=0;y<2;y++)for(let x=0;x<8;x++){g.fillStyle=(x+y)%2?'#111':'#FFF';g.fillRect(x*16,y*16,16,16);}},null);
 function bogen(gruppe,text,farbe){
  const b=new Sammler(),m=new THREE.MeshLambertMaterial({vertexColors:true});
  for(const s of [-1,1])b.quader(s*(H+0.4)-0.18,0,-0.18,s*(H+0.4)+0.18,5.6,0.18,'#ECEFF1');
  b.quader(-H-0.6,4.6,-0.25,H+0.6,6.2,0.25,farbe);gruppe.add(b.mesh(m));
  const t=leinwand(1024,128,(g,W,H)=>{g.fillStyle=farbe;g.fillRect(0,0,W,H);for(let x=0;x<W;x+=32){g.fillStyle=(x/32)%2?'#111':'#FFF';g.fillRect(x,0,32,16);g.fillRect(x+(((x/32)%2)?-32:32),H-16,32,16);}
   g.fillStyle='#FFFFFF';g.font='900 72px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2+4);},null);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  for(const r of [0,Math.PI]){const p=new THREE.Mesh(new THREE.PlaneGeometry(2*H+1.0,1.5),new THREE.MeshBasicMaterial({map:t}));p.position.set(0,5.4,r?-0.27:0.27);p.rotation.y=r;gruppe.add(p);}
  const linie=new THREE.Mesh(new THREE.PlaneGeometry(2*H,1.2),new THREE.MeshLambertMaterial({map:schach.clone(),polygonOffset:true,polygonOffsetFactor:-3}));
  linie.material.map.wrapS=THREE.RepeatWrapping;linie.material.map.repeat.set(H/4,1);linie.material.map.needsUpdate=true;
  linie.rotation.x=-Math.PI/2;linie.position.y=0.03;gruppe.add(linie);
 }
 bogen(ZIEL,'FINISH','#E9573F');bogen(START,'START','#2E9E4F');
 /* Startampel */
 const startLichter=[];
 for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.CircleGeometry(0.32,20),new THREE.MeshBasicMaterial({color:'#331111'}));m.position.set((i-1)*0.9,3.95,0.27);START.add(m);
  const m2=m.clone();m2.material=m.material;m2.position.z=-0.27;m2.rotation.y=Math.PI;START.add(m2);startLichter.push(m.material);}
 {const b=new THREE.Mesh(new THREE.BoxGeometry(3.0,0.95,0.5),new THREE.MeshLambertMaterial({color:'#1F2326'}));b.position.set(0,3.95,0);START.add(b);}
 function setzeTor(gruppe,x,z,quer){gruppe.position.set(x,0,z);gruppe.rotation.y=quer?0:Math.PI/2;gruppe.visible=true;}
 function strecke(st){
  if(!st){ZIEL.visible=START.visible=false;return;}
  const zk=welt.kanten[st.ziel.kante];setzeTor(ZIEL,st.ziel.x,st.ziel.z,zk.quer);
  const a=welt.knoten[st.start.von],b=welt.knoten[st.start.nach],t=0.3+5/A;
  setzeTor(START,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,a.i===b.i);
 }
 ZIEL.visible=START.visible=false;

 /* ===== Hinweispfeil ===== */
 const PFEIL=new THREE.Group();
 {const s=new THREE.Shape();s.moveTo(-0.6,-1.4);s.lineTo(0.6,-1.4);s.lineTo(0.6,0.2);s.lineTo(1.4,0.2);s.lineTo(0,1.6);s.lineTo(-1.4,0.2);s.lineTo(-0.6,0.2);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:0.3,bevelEnabled:false});g.translate(0,0,-0.15);
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:'#FFC845',emissive:'#7A5300'}));m.rotation.x=-Math.PI/2;m.scale.setScalar(1.6);PFEIL.add(m);}
 PFEIL.visible=false;scene.add(PFEIL);

 /* ===== Materialien und Meshes ===== */
 const wandMat=t=>lam({map:t,vertexColors:true});
 STILE.forEach((st,i)=>{if(!FO[i].leer())scene.add(FO[i].mesh(wandMat(texO[i])));if(!FE[i].leer())scene.add(FE[i].mesh(wandMat(texE[i])));});
 if(!FL.leer())scene.add(FL.mesh(wandMat(texL)));
 texStein.repeat.set(1/3,1/3);if(!ST.leer())scene.add(ST.mesh(lam({map:texStein,vertexColors:true})));
 scene.add(GW.mesh(lam({map:pflasterTex,vertexColors:true})));
 scene.add(ZO.mesh(lam({map:zoneTex,vertexColors:true})));
 scene.add(GR.mesh(lam({map:grasTex,vertexColors:true})));
 scene.add(S.mesh(farbig));
 AG.malen();
 const schildMat=new THREE.MeshBasicMaterial({map:AG.tex,color:'#F2F2F2',side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1});
 scene.add(SCH.mesh(schildMat));
 if(!GL.leer())scene.add(GL.mesh(new THREE.MeshBasicMaterial({vertexColors:true})));
 const schattenBild=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const v=g.createRadialGradient(64,64,4,64,64,62);v.addColorStop(0,'rgba(0,0,0,.85)');v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);return t;})();
 const schattenMat=new THREE.MeshBasicMaterial({map:schattenBild,color:'#1E1A14',transparent:true,opacity:0.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
 if(!SCHATTEN.leer())scene.add(SCHATTEN.mesh(schattenMat));

 /* ===== Go-Karts ===== */
 const phong=c=>new THREE.MeshPhongMaterial({color:c,shininess:60,specular:0x333333});
 const GB=new THREE.BoxGeometry(1,1,1),GZ=new THREE.CylinderGeometry(1,1,1,16),GS=new THREE.SphereGeometry(1,18,12),GK=new THREE.CapsuleGeometry(1,1,4,10);
 function teil(el,geo,m,x,y,z,sx,sy,sz,rx,ry,rz){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx||0,ry||0,rz||0);el.add(o);return o;}
 function kart(farbe,nr){
  const g=new THREE.Group(),k=new THREE.Group();g.add(k);
  const mF=phong(farbe),mS=phong('#1D1F22'),mG=phong('#8A9096'),mW=phong('#FFFFFF'),mR=new THREE.MeshLambertMaterial({color:'#151515'});
  /* vorwaerts = -z */
  teil(k,GB,mS,0,0.22,0,1.25,0.08,2.3);
  teil(k,GB,mF,0,0.38,-0.95,1.0,0.22,0.6);                       // Nase
  teil(k,GB,mF,0,0.33,-1.32,1.45,0.14,0.22);                     // Frontspoiler
  for(const s of [-1,1])teil(k,GB,mF,s*0.62,0.36,0.1,0.22,0.26,1.3);   // Seitenkaesten
  teil(k,GB,mS,0,0.5,0.25,0.62,0.12,0.6);                          // Sitz
  teil(k,GB,mS,0,0.82,0.55,0.62,0.6,0.12);
  teil(k,GB,mG,0.25,0.5,0.95,0.5,0.4,0.45);                        // Motor
  teil(k,GZ,mG,0.45,0.62,1.25,0.07,0.4,0.07,Math.PI/2.4);          // Auspuff
  teil(k,GB,mF,0,0.42,1.25,1.5,0.12,0.18);                         // Heckstossstange
  /* Nummer */
  const nt=leinwand(128,128,(g2,W,H)=>{g2.fillStyle='#FFFFFF';g2.beginPath();g2.arc(64,64,60,0,7);g2.fill();g2.fillStyle='#111';g2.font='900 84px '+SCHRIFT;g2.textAlign='center';g2.textBaseline='middle';g2.fillText(String(nr),64,70);},null);
  const np=new THREE.Mesh(new THREE.CircleGeometry(0.22,20),new THREE.MeshBasicMaterial({map:nt}));np.position.set(0,0.5,-1.0);np.rotation.x=-Math.PI/2+0.35;k.add(np);
  /* Raeder */
  const raeder=[],lenk=[];
  for(const [x,z,v] of [[-0.72,-0.82,1],[0.72,-0.82,1],[-0.74,0.85,0],[0.74,0.85,0]]){
   const h=new THREE.Group();h.position.set(x,0.27,z);g.add(h);
   const r=new THREE.Group();h.add(r);teil(r,GZ,mR,0,0,0,0.27,v?0.2:0.28,0.27,0,0,Math.PI/2);teil(r,GZ,mG,x>0?0.11:-0.11,0,0,0.13,0.04,0.13,0,0,Math.PI/2);
   raeder.push(r);if(v)lenk.push(h);}
  /* Lenkrad */
  const lr=new THREE.Group();lr.position.set(0,0.72,-0.35);lr.rotation.x=-0.9;k.add(lr);teil(lr,new THREE.TorusGeometry(0.17,0.03,6,16),mS,0,0,0,1,1,1);
  /* Fahrer: Anzug in Teamfarbe, Helm mit Visier */
  const f=new THREE.Group();f.position.set(0,0.55,0.25);k.add(f);
  teil(f,GK,mF,0,0.38,0,0.2,0.18,0.15);
  const helm=new THREE.Group();helm.position.set(0,0.82,-0.02);f.add(helm);
  teil(helm,GS,mF,0,0,0,0.2,0.21,0.22);teil(helm,GS,mS,0,0.01,-0.1,0.16,0.09,0.14);teil(helm,GB,mW,0,0.13,0,0.05,0.12,0.42);
  for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*0.2,0.55,0);a.rotation.set(-1.0,0,s*0.2);f.add(a);teil(a,GK,mF,0,-0.17,0,0.06,0.13,0.06);
   teil(f,GK,mS,s*0.13,0.05,-0.45,0.07,0.25,0.07,Math.PI/2.2);}
  /* Wimpel */
  teil(k,GZ,mS,-0.55,1.25,0.95,0.015,1.6,0.015);
  const flagge=teil(k,GB,mF,-0.55,1.85,1.15,0.02,0.32,0.42);
  /* Boost-Flamme */
  const flamme=teil(k,new THREE.ConeGeometry(0.16,0.9,10),new THREE.MeshBasicMaterial({color:'#FFB020',transparent:true,opacity:0.9}),0.45,0.7,1.85,1,1,1,-Math.PI/2.4);flamme.visible=false;
  /* Schatten */
  const sch=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.9),schattenMat);sch.rotation.x=-Math.PI/2;sch.position.y=0.02;g.add(sch);
  /* Marke ueber dem Kart (fuer das andere Team gut zu sehen) */
  const marke=teil(g,new THREE.ConeGeometry(0.35,0.6,4),new THREE.MeshBasicMaterial({color:farbe}),0,3.0,0,1,1,1,Math.PI);
  g.userData={k,raeder,lenk,helm,flamme,flagge,marke};
  scene.add(g);return g;
 }
 const KART=[kart('#E9573F',1),kart('#1F78B4',2)];
 KART.forEach(k=>k.visible=false);
 function kartSetzen(m,s,t){
  const u=m.userData;m.visible=true;m.position.set(s.x,0,s.z);m.rotation.y=-s.h;
  u.raeder.forEach(r=>r.rotation.x=-(s.rad||0));
  u.lenk.forEach(h=>h.rotation.y=-(s.lenk||0)*0.45);
  u.k.rotation.z=-(s.lenk||0)*Math.min(1,Math.abs(s.v||0)/14)*0.06;
  u.k.rotation.x=(s.stoss?0.05:0)+Math.sin(t*30)*0.004*Math.min(1,Math.abs(s.v||0)/5);
  u.k.position.y=Math.abs(Math.sin(t*22))*0.012*Math.min(1,Math.abs(s.v||0)/6);
  u.helm.rotation.y=(s.lenk||0)*0.25;
  u.flamme.visible=(s.boost||0)>0;if(u.flamme.visible){u.flamme.scale.set(1,0.8+Math.random()*0.6,1);}
  u.flagge.rotation.y=Math.sin(t*9+(s.x||0))*0.25;
  u.marke.position.y=3.0+Math.sin(t*3)*0.12;u.marke.rotation.y=t*1.5;
 }

 /* ===== Leute auf den Gehwegen ===== */
 const farbMat={},mm=c=>farbMat[c]||(farbMat[c]=new THREE.MeshLambertMaterial({color:c}));
 function mensch(o){
  const g=new THREE.Group(),k=new THREE.Group();g.add(k);if(o.kind)k.scale.setScalar(0.72);
  const beine=[];for(const sx of [-1,1]){const b=new THREE.Group();b.position.set(sx*0.09,0.88,0);k.add(b);beine.push(b);teil(b,GK,mm(o.hose),0,-0.42,0,0.075,0.24,0.075);teil(b,GB,mm('#2B2B2B'),0,-0.85,0.05,0.1,0.07,0.22);}
  teil(k,GK,mm(o.jacke||o.hemd),0,1.2,0,0.19,0.17,0.13);
  teil(k,GS,mm(o.haut),0,1.66,0,0.13,0.14,0.13);
  teil(k,new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI*0.55),mm(o.haar),0,1.68,-0.01,0.14,0.15,0.145,-0.3);
  const arme=[];for(const sx of [-1,1]){const a=new THREE.Group();a.position.set(sx*0.24,1.42,0);k.add(a);arme.push(a);teil(a,GK,mm(o.jacke||o.hemd),0,-0.3,0,0.055,0.2,0.055);teil(a,GS,mm(o.haut),0,-0.62,0,0.045,0.05,0.04);}
  if(o.tasche)teil(arme[1],GB,mm(o.tasche),0,-0.72,0.05,0.22,0.26,0.08);
  const sch=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),schattenMat);sch.rotation.x=-Math.PI/2;sch.position.y=0.02;g.add(sch);
  g.userData={k,beine,arme};return g;
 }
 const AUSSEHEN=[
  {haut:'#F1C7A5',haar:'#CFCAC2',hemd:'#F2E6D8',jacke:'#8E5BA8',hose:'#5E4A7A',tasche:'#C62828'},
  {haut:'#B07A50',haar:'#1E1A18',hemd:'#DCE7F2',jacke:'#2F5D8A',hose:'#2C3E50'},
  {haut:'#F5D0B0',haar:'#D9A441',hemd:'#F06292',hose:'#5C6BC0',kind:true},
  {haut:'#E8B996',haar:'#A8A8A8',hemd:'#F4F1E8',jacke:'#6B8E23',hose:'#5D4037'},
  {haut:'#8D5A3B',haar:'#151515',hemd:'#FFB300',hose:'#1565C0',kind:true},
  {haut:'#6B4226',haar:'#1A1A1A',hemd:'#E64A19',hose:'#3E2723',tasche:'#F9A825'},
  {haut:'#E9BFA0',haar:'#7B4A2E',hemd:'#26A69A',hose:'#37474F'},
  {haut:'#C68B5E',haar:'#2B1B12',hemd:'#3949AB',jacke:'#C62828',hose:'#212121',tasche:'#6D4C41'}];
 const leute=[];
 {const bl=welt.bloecke.filter(b=>b.art==='normal');const n=schoen?16:7;
  for(let i=0;i<n;i++){const b=bl[Math.floor(rand()*bl.length)],m=mensch(AUSSEHEN[i%AUSSEHEN.length]);scene.add(m);
   const x1=b.x1+GEH*0.45,z1=b.z1+GEH*0.45,x2=b.x2-GEH*0.45,z2=b.z2-GEH*0.45;
   leute.push({m,x1,z1,x2,z2,u:2*(x2-x1)+2*(z2-z1),s:rand()*400,v:(1.0+rand()*0.5)*(rand()<0.5?-1:1),ph:rand()*6});}}
 function leuteSchritt(dt,t){
  for(const p of leute){p.s=(p.s+p.v*dt+p.u*10)%p.u;let s=p.s,x,z,h;const w=p.x2-p.x1,d=p.z2-p.z1;
   if(s<w){x=p.x1+s;z=p.z1;h=Math.PI/2;}else if((s-=w)<d){x=p.x2;z=p.z1+s;h=Math.PI;}else if((s-=d)<w){x=p.x2-s;z=p.z2;h=-Math.PI/2;}else{s-=w;x=p.x1;z=p.z2-s;h=0;}
   if(p.v<0)h+=Math.PI;
   p.m.position.set(x,KANTE,z);p.m.rotation.y=-h+Math.PI;
   p.ph+=Math.abs(p.v)*dt*4.2;const u=p.m.userData,sw=Math.sin(p.ph);
   u.beine[0].rotation.x=sw*0.5;u.beine[1].rotation.x=-sw*0.5;u.arme[0].rotation.x=-sw*0.4;u.arme[1].rotation.x=sw*0.4;u.k.position.y=Math.abs(Math.cos(p.ph))*0.03;}
 }

 /* ===== Zeichnen ===== */
 let zuletzt=0;
 function resize(){const w=canvas.clientWidth||300,h=canvas.clientHeight||300;renderer.setSize(w,h,false);}
 function kamera(v,aspect){
  camera.position.set(v.cam[0],v.cam[1],v.cam[2]);camera.lookAt(v.ziel[0],v.ziel[1],v.ziel[2]);
  const fov=v.fov||70;if(camera.aspect!==aspect||Math.abs(camera.fov-fov)>0.01){camera.aspect=aspect;camera.fov=fov;camera.updateProjectionMatrix();}
 }
 function frame(st){
  const t=st.t||0,dt=Math.min(0.1,Math.max(0,t-zuletzt));zuletzt=t;
  const w=canvas.clientWidth||300,h=canvas.clientHeight||300;
  leuteSchritt(dt,t);
  /* Ampeln: Nord-Sued und Ost-West wechseln sich ab */
  const zyk=t%16,ns=zyk<6?'g':zyk<8?'y':zyk<14?'r':'r',ew=zyk<6?'r':zyk<8?'r':zyk<14?'g':'y';
  for(const a of ['ns','ew'])for(const f of ['r','y','g']){const m=LM[a+f];if(m)m.color.set((a==='ns'?ns:ew)===f?LF[f]:'#2A2A2A');}
  blinkMat.color.set(Math.sin(t*4)>0?'#FFB020':'#6A4A10');
  /* Start-Ampel */
  const cd=st.countdown;startLichter.forEach((m,i)=>m.color.set(cd==null?'#331111':cd<=0?'#30D158':(3-cd)>=i?'#FF3B30':'#331111'));
  KART.forEach((m,i)=>{const s=st.karts&&st.karts[i];if(!s){m.visible=false;return;}kartSetzen(m,s,t);});
  if(st.pfeil){PFEIL.visible=true;PFEIL.position.set(st.pfeil.x,3.2+Math.sin(t*4)*0.3,st.pfeil.z);PFEIL.rotation.y=-st.pfeil.h;}else PFEIL.visible=false;
  const views=st.views||[];
  if(views.length>1){
   renderer.setScissorTest(true);
   views.forEach((v,i)=>{KART.forEach((m,j)=>{m.userData.marke.visible=j!==i;});kamera(v,(w/2)/h);renderer.setViewport(i*w/2,0,w/2,h);renderer.setScissor(i*w/2,0,w/2,h);renderer.render(scene,camera);});
   renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);return;
  }
  KART.forEach(m=>{m.userData.marke.visible=false;});
  if(views[0]){kamera(views[0],w/h);renderer.render(scene,camera);}
 }
 function weg(){scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const m=o.material;(Array.isArray(m)?m:m?[m]:[]).forEach(x=>{if(x.map)x.map.dispose();x.dispose();});});renderer.dispose();}
 return {frame,resize,strecke,renderer,weg,atlas:{genutzt:AG.y+AG.zeile,hoehe:AG.c.height}};
}
window.StadtRender={init};
window.dispatchEvent(new Event('stadtrender'));
