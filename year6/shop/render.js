/* =========================================================================
   3D-DARSTELLUNG fuer "Shopping Trip" (three.js aus ../schule/vendor/).
   Baut aus der Logik-Welt (logik.js) den Supermarkt "Hilltop Market":
   Regale mit Waren, Obst- und Gemuesekisten, Kuehl- und Tiefkuehlregale,
   Kassen mit Kassiererin, Schaufenster zur Strasse. Alles Gleichfarbige
   wird zu wenigen grossen Meshes zusammengefasst (schnell auf Tafel und
   Handy). Die Spielsteuerung (spiel.js) ruft nur init() und frame() auf.
   Masse in Metern, x = Osten, z = Sueden, y = oben.
   ========================================================================= */
import * as THREE from '../schule/vendor/three.module.min.js';

const DECKE=3.6, AUGE=1.45;
const EMOJI='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SCHRIFT='"Bricolage Grotesque", Inter, system-ui, sans-serif';
const TEXT='Inter, system-ui, sans-serif';

/* ---------- Vorlagen (ohne Index, Mitte im Ursprung) ---------- */
const V={
 box:new THREE.BoxGeometry(1,1,1).toNonIndexed(),
 zyl:new THREE.CylinderGeometry(1,1,1,12,1).toNonIndexed(),
 zyl6:new THREE.CylinderGeometry(1,1,1,6,1).toNonIndexed(),
 kegel:new THREE.CylinderGeometry(0.35,1,1,10,1).toNonIndexed(),
 becher:new THREE.CylinderGeometry(1,0.8,1,10,1).toNonIndexed(),
 spitz:new THREE.ConeGeometry(1,1,7).toNonIndexed(),
 kugel:new THREE.IcosahedronGeometry(1,1).toNonIndexed(),
 kugel0:new THREE.IcosahedronGeometry(1,0).toNonIndexed(),
 ring:new THREE.TorusGeometry(1,0.42,6,12).toNonIndexed(),
 bogen:new THREE.TorusGeometry(1,0.3,5,8,Math.PI).toNonIndexed(),
 ebene:new THREE.PlaneGeometry(1,1).toNonIndexed(),
 flasche:new THREE.LatheGeometry([[0,0],[0.92,0],[1,0.04],[1,0.6],[0.93,0.7],[0.5,0.84],[0.4,0.88],[0.4,1],[0,1]].map(([x,y])=>new THREE.Vector2(x,y)),12).toNonIndexed(),
 milch:new THREE.LatheGeometry([[0,0],[0.9,0],[1,0.05],[1,0.55],[0.86,0.7],[0.45,0.84],[0.45,0.96],[0,0.96]].map(([x,y])=>new THREE.Vector2(x,y)),12).toNonIndexed(),
 keil:new THREE.CylinderGeometry(1,1,1,3,1).toNonIndexed()
};
const _q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Color(),_nm=new THREE.Matrix3();
function mat(x,y,z,sx,sy,sz,rx,ry,rz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),_q.clone(),new THREE.Vector3(sx,sy,sz));}

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
   if(rect&&U)this.u.push(rect[0]+U.getX(i)*(rect[2]-rect[0]),rect[1]+U.getY(i)*(rect[3]-rect[1]));else this.u.push(0,0);
  }
 }
 /* Quader in Weltkoordinaten (x1..x2 usw.) */
 quader(x1,y1,z1,x2,y2,z2,farbe){this.add(V.box,mat((x1+x2)/2,(y1+y2)/2,(z1+z2)/2,Math.abs(x2-x1),Math.abs(y2-y1),Math.abs(z2-z1)),farbe);}
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

/* ---------- Atlas: viele kleine Bilder auf einer Leinwand ---------- */
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
const hell=hex=>{_c.set(hex);return 0.2126*_c.r+0.7152*_c.g+0.0722*_c.b>0.45;};

/* ---------- Texturen ---------- */
function leinwand(w,h,mal,rep){
 const c=document.createElement('canvas');c.width=w;c.height=h;mal(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=8;return t;
}
const zufall=(n=>()=>{n=(n*16807)%2147483647;return n/2147483647;})(11);

export function init(canvas,welt,opts={}){
 const L=window.ShopLogik,DAT=welt.daten,FARBE=L.ORTFARBE;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!opts.mobil,powerPreference:'high-performance'});
 const schoen=opts.schoen!==false;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,opts.mobil?(schoen?1.5:1):(schoen?2:1.25)));
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#BFE3F5');
 const camera=new THREE.PerspectiveCamera(70,1,0.1,120);camera.rotation.order='YXZ';
 scene.fog=new THREE.Fog('#E9E3D8',26,80);
 scene.add(new THREE.HemisphereLight(0xFFF6E6,0xB7A487,1.85));
 const sonne=new THREE.DirectionalLight(0xFFF0DA,1.05);sonne.position.set(-6,20,10);scene.add(sonne);
 const fuell=new THREE.DirectionalLight(0xDCE6FF,0.35);fuell.position.set(12,9,-10);scene.add(fuell);
 const glanz=(o)=>schoen?new THREE.MeshPhongMaterial(Object.assign({shininess:28,specular:0x1c1c1c},o)):new THREE.MeshLambertMaterial(o);
 const matFarbe=glanz({vertexColors:true});
 const S=new Sammler();           // alles Farbige
 const LEUCHT=new Sammler();      // Deckenlampen, Kuehlregal-Licht
 const GLAS=new Sammler();        // Scheiben
 const ET=new Sammler();          // Etiketten der Waren (Atlas)
 const SCH=new Sammler();         // Schilder (Atlas, unbeleuchtet)
 const TAG_L=new Sammler(),TAG_P=new Sammler();   // Preisschilder mit Namen / nur Preis

 /* ===== Atlanten ===== */
 const AE=new Atlas(2048,1024),AS=new Atlas(2048,2048),AG=new Atlas(2048,2048);
 const etikett={};
 for(const w of welt.waren){
  etikett[w.id]=AE.add(120,150,(g,W,H)=>{
   g.fillStyle=w.farbe;g.fillRect(0,0,W,H);
   g.fillStyle=w.akzent;g.fillRect(0,H*0.74,W,H*0.26);
   g.fillStyle=w.akzent;g.beginPath();g.arc(W/2,H*0.4,W*0.36,0,7);g.fill();
   g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(W/2,H*0.4,W*0.31,0,7);g.fill();
   g.font=Math.round(W*0.42)+'px '+EMOJI;g.textAlign='center';g.textBaseline='middle';g.fillText(w.emo,W/2,H*0.42);
   g.fillStyle=hell(w.akzent)?'#1D2A33':'#FFFFFF';g.font='800 '+Math.round(H*0.11)+'px '+SCHRIFT;g.fillText('★ ★ ★',W/2,H*0.87);
  });
 }
 /* Preisschilder: gelb mit Name und Preis, Profi nur Preis */
 const tagL={},tagP={};
 for(const w of welt.waren){
  const preis=L.preis(w.p);
  tagL[w.id]=AS.add(240,104,(g,W,H)=>{
   g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H);g.fillStyle='#FFD43B';g.fillRect(0,0,W,H*0.42);
   g.fillStyle='#1D2A33';g.textAlign='left';g.textBaseline='middle';passend(g,w.schild,W-20,'800',34,SCHRIFT);g.fillText(w.schild,10,H*0.22);
   g.textAlign='right';g.font='800 48px '+SCHRIFT;g.fillText(preis,W-10,H*0.71);
   if(w.menge){g.textAlign='left';g.font='600 20px '+TEXT;g.fillStyle='#55606A';g.fillText('each',10,H*0.76);}
  });
  tagP[w.id]=AS.add(240,104,(g,W,H)=>{
   g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H);g.fillStyle='#FFD43B';g.fillRect(0,0,W,H*0.42);
   g.fillStyle='#1D2A33';g.textAlign='left';g.textBaseline='middle';g.font='800 30px '+SCHRIFT;g.fillText('? ? ?',10,H*0.22);
   g.textAlign='right';g.font='800 48px '+SCHRIFT;g.fillText(preis,W-10,H*0.71);
   if(w.menge){g.textAlign='left';g.font='600 20px '+TEXT;g.fillStyle='#55606A';g.fillText('each',10,H*0.76);}
  });
 }
 /* Grosse Schilder */
 const schild=(text,farbe,klein,w=512,h=128)=>AG.add(w,h,(g,W,H)=>{
  g.fillStyle=farbe;rund(g,0,0,W,H,18);g.fill();
  g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,H*0.82,W,H*0.18);
  g.fillStyle=hell(farbe)?'#1D2A33':'#FFFFFF';g.textAlign='center';g.textBaseline='middle';
  passend(g,text,W-40,'800',klein?50:66,SCHRIFT);g.fillText(text,W/2,klein?H*0.36:H*0.47);
  if(klein){passend(g,klein,W-40,'600',30,TEXT);g.fillText(klein,W/2,H*0.72);}
 });
 const gangSchild={};
 for(const a of welt.GAENGE){
  const t=a.orte.map(o=>DAT.ORTE[o].en).join(' · ');
  gangSchild[a.nr]=AG.add(640,170,(g,W,H)=>{
   g.fillStyle='#0F3B2E';rund(g,0,0,W,H,22);g.fill();
   g.fillStyle='#FFC845';g.beginPath();g.arc(H/2,H/2,H*0.36,0,7);g.fill();
   g.fillStyle='#0F3B2E';g.font='800 86px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText(String(a.nr),H/2,H/2+4);
   g.fillStyle='#FFFFFF';g.textAlign='left';g.font='700 28px '+TEXT;g.fillText('AISLE '+a.nr,H+10,H*0.3);
   passend(g,t,W-H-30,'800',44,SCHRIFT);g.fillText(t,H+10,H*0.64);
  });
 }
 const ortSchild={};for(const [k,o] of Object.entries(DAT.ORTE))ortSchild[k]=schild(o.en,FARBE[k]);
 const logo=AG.add(1024,220,(g,W,H)=>{
  g.fillStyle='#0F3B2E';rund(g,0,0,W,H,30);g.fill();
  g.fillStyle='#FFC845';g.beginPath();g.moveTo(60,H*0.7);g.lineTo(120,H*0.25);g.lineTo(165,H*0.55);g.lineTo(195,H*0.4);g.lineTo(240,H*0.7);g.closePath();g.fill();
  g.fillStyle='#FFFFFF';g.font='800 104px '+SCHRIFT;g.textAlign='left';g.textBaseline='middle';g.fillText(DAT.laden,270,H*0.5);
 });
 const willkommen=schild('Welcome!','#E9573F','Fresh food every day');
 const kasseSchild=[1,2,3].map(n=>schild('Checkout '+n,n===1?'#2E9E4F':'#9AA3AB',n===1?'Open':'Closed',360,128));
 const angebot=schild('Fresh flowers','#D770AD','Bunch £3.50',420,128);
 const poster=[schild('Eat more fruit!','#8CC152','5 a day 🍎',420,150),schild('Special offer','#E9573F','2 for £1',420,150),schild('Bake at home','#C8863E','Fresh bread daily',420,150)];
 AE.malen();AS.malen();AG.malen();
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{AE.malen();AS.malen();AG.malen();});

 /* ===== Raum ===== */
 const W=welt.W,D=welt.D;
 /* Boden: helle Fliesen */
 const boden=new THREE.Mesh(new THREE.PlaneGeometry(W,D),(schoen?(o=>new THREE.MeshPhongMaterial(Object.assign({shininess:70,specular:0x3a3a3a},o))):(o=>new THREE.MeshLambertMaterial(o)))({map:leinwand(256,256,(g,w,h)=>{
  g.fillStyle='#ECE6DA';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=['rgba(0,0,0,.05)','rgba(255,255,255,.12)','rgba(160,140,110,.08)'][i%3];g.fillRect(zufall()*w,zufall()*h,2,2);}
  g.strokeStyle='rgba(120,105,85,.35)';g.lineWidth=3;g.strokeRect(0,0,w,h);g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
 },[W/1.2,D/1.2])}));
 boden.rotation.x=-Math.PI/2;boden.position.set(W/2,0,D/2);scene.add(boden);
 /* Laufband-Streifen: Hauptgang vorn und hinten etwas dunkler */
 S.quader(1.4,0.002,15.6,29,0.004,17.2,'#D9D0BF');S.quader(1.4,0.002,1.4,28.8,0.004,3.2,'#D9D0BF');
 /* Decke */
 const decke=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshBasicMaterial({color:'#E4E1DA'}));
 decke.rotation.x=Math.PI/2;decke.position.set(W/2,DECKE,D/2);scene.add(decke);
 for(let x=3;x<W;x+=4.5)for(let z=2;z<D-1;z+=3){LEUCHT.quader(x-0.9,DECKE-0.03,z-0.3,x+0.9,DECKE-0.01,z+0.3,'#FFFFFF');S.quader(x-0.95,DECKE-0.025,z-0.35,x+0.95,DECKE-0.005,z+0.35,'#C9CDD2');}
 /* Waende mit Farbband */
 const wand=(x1,z1,x2,z2,band)=>{S.quader(x1,0,z1,x2,DECKE,z2,'#F6F1E7');if(band){const dx=x2-x1>z2-z1;
  if(dx)S.quader(x1,2.35,z1+(z1<1?0.0:-0.01),x2,3.0,z2+(z1<1?0.01:0),band);else S.quader(x1+(x1<1?0:-0.01),2.35,z1,x2+(x1<1?0.01:0),3.0,z2,band);}
  S.quader(Math.min(x1,x2),0,Math.min(z1,z2),Math.max(x1,x2),0.12,Math.max(z1,z2),'#5B6670');};
 wand(-0.2,-0.2,0,D,'#8CC152');        // Westen: Obst und Gemuese
 wand(0,-0.2,W,0,'#5DADE2');           // Norden: Kuehlregale
 wand(W,-0.2,W+0.2,D,'#7FA6C9');       // Osten: Tiefkuehl
 /* Suedfront: Schaufenster mit Rahmen, Eingangstueren */
 const front=D;
 S.quader(0,0,front-0.05,W,0.5,front+0.1,'#4E5A64');S.quader(0,2.8,front-0.05,W,DECKE,front+0.1,'#0F3B2E');
 for(let x=0;x<=W+0.01;x+=2){if(x>welt.TUER.x1+0.01&&x<welt.TUER.x2-0.01)continue;S.quader(x-0.05,0.5,front-0.05,x+0.05,2.8,front+0.1,'#2C3A44');}
 for(let x=0;x<W;x+=2){if(x+2>welt.TUER.x1&&x<welt.TUER.x2)continue;GLAS.add(V.ebene,mat(x+1,1.65,front+0.02,2,2.3,1),'#CFEAF6');}
 /* Tuerrahmen */
 S.quader(welt.TUER.x1-0.12,0,front-0.12,welt.TUER.x1,2.8,front+0.12,'#2C3A44');S.quader(welt.TUER.x2,0,front-0.12,welt.TUER.x2+0.12,2.8,front+0.12,'#2C3A44');
 S.quader(welt.TUER.x1-0.12,2.55,front-0.12,welt.TUER.x2+0.12,2.8,front+0.12,'#2C3A44');
 S.quader(welt.TUER.x1,0.002,front-1.4,welt.TUER.x2,0.012,front-0.1,'#3F4A52');   // Fussmatte
 /* Schiebetueren (eigene Meshes, bewegen sich) */
 const tuerMat=new THREE.MeshLambertMaterial({color:'#D6EEF8',transparent:true,opacity:0.35,depthWrite:false,side:THREE.DoubleSide});
 const tuerRahmen=new THREE.MeshLambertMaterial({color:'#2C3A44'});
 const tueren=[0,1].map(k=>{const grp=new THREE.Group();const breite=(welt.TUER.x2-welt.TUER.x1)/2;
  const glas=new THREE.Mesh(new THREE.PlaneGeometry(breite,2.5),tuerMat);glas.position.y=1.25;grp.add(glas);
  for(const [sx,sy,px,py] of [[breite,0.06,0,0.03],[breite,0.06,0,2.47],[0.06,2.5,-breite/2,1.25],[0.06,2.5,breite/2,1.25]]){const r=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,0.05),tuerRahmen);r.position.set(px,py,0);grp.add(r);}
  grp.userData.zu=welt.TUER.x1+breite/2+k*breite;grp.userData.auf=k?welt.TUER.x2+breite/2-0.1:welt.TUER.x1-breite/2+0.1;
  grp.position.set(grp.userData.zu,0,front-0.02);scene.add(grp);return grp;});
 /* Logo innen ueber der Tuer und aussen */
 const schildFlaeche=(rect,x,y,z,w,h,ry,ziel=SCH)=>ziel.add(V.ebene,mat(x,y,z,w,h,1,0,ry||0,0),'#FFFFFF',rect);
 schildFlaeche(logo,(welt.TUER.x1+welt.TUER.x2)/2+6,3.2,front-0.07,3.4,0.73,Math.PI);
 schildFlaeche(willkommen,(welt.TUER.x1+welt.TUER.x2)/2,3.15,front-0.08,1.6,0.4,Math.PI);
 schildFlaeche(logo,W/2,3.2,front+0.13,4.6,1.0,0);
 /* Aussen: Gehweg, Strasse, Haeuser gegenueber */
 S.quader(-10,-0.05,D,W+10,0,D+4,'#B9B4AA');S.quader(-10,-0.06,D+4,W+10,-0.01,D+11,'#5E636A');
 for(let x=-8;x<W+10;x+=4)S.quader(x,-0.005,D+7.4,x+2,0.0,D+7.6,'#F2F2F2');
 const haus=['#E7B49A','#C9D7E3','#F2D98D','#B8D8B0','#E8C7D8','#D9C2A7'];
 for(let k=0;k<8;k++){const x=-6+k*5.4,h=6+(k%3)*1.5,f=haus[k%haus.length];S.quader(x,0,D+11,x+5,h,D+16,f);S.quader(x-0.1,h,D+10.8,x+5.1,h+0.3,D+16,'#6E6259');
  for(let r=0;r<2;r++)for(let c=0;c<3;c++)S.quader(x+0.6+c*1.5,1.6+r*2.4,D+10.98,x+1.4+c*1.5,2.8+r*2.4,D+11,'#4D6F8A');
  S.quader(x+2.1,0,D+10.98,x+2.9,2.1,D+11,'#7B4B2A');}
 for(let k=0;k<5;k++){const x=-2+k*8;S.add(V.zyl,mat(x,1.2,D+3,0.12,2.4,0.12),'#6B4E33');S.add(V.kugel,mat(x,3,D+3,1.3,1.4,1.3),k%2?'#5E9C4C':'#4C8A43');}

 /* ===== Waren-Formen =====
    Jede Form baut eine Ware in lokalen Koordinaten (Front = +z, Boden y=0).
    Rueckgabe: Groesse fuer die Aufstellung. */
 const F={
  flasche:{w:0.085,h:0.3,d:0.085,bau(M,w,r){teil(V.flasche,M,0,0,0,0.042,0.29,0.042,w.farbe);teil(V.zyl,M,0,0.296,0,0.018,0.022,0.018,w.akzent);etik(M,0,0.11,0.0435,0.064,0.09,r);}},
  milch:{w:0.13,h:0.25,d:0.11,bau(M,w,r){teil(V.milch,M,0,0,0,0.055,0.25,0.055,'#F4F4EF');teil(V.zyl,M,0,0.244,0,0.026,0.024,0.026,w.akzent);teil(V.ring,M,0.058,0.15,0,0.03,0.046,0.03,'#F4F4EF');etik(M,0,0.09,0.0565,0.07,0.1,r);}},
  dose:{w:0.07,h:0.125,d:0.07,bau(M,w,r){teil(V.zyl,M,0,0.06,0,0.033,0.12,0.033,w.farbe);teil(V.zyl,M,0,0.122,0,0.031,0.006,0.031,'#C9CED3');etik(M,0,0.06,0.034,0.05,0.08,r);}},
  konserve:{w:0.082,h:0.115,d:0.082,bau(M,w,r){teil(V.zyl,M,0,0.057,0,0.038,0.11,0.038,'#B9C0C7');teil(V.zyl,M,0,0.057,0,0.0385,0.085,0.0385,w.farbe);etik(M,0,0.057,0.039,0.06,0.075,r);}},
  flachdose:{w:0.085,h:0.045,d:0.085,stapel:3,bau(M,w,r){teil(V.zyl,M,0,0.022,0,0.04,0.044,0.04,'#B9C0C7');teil(V.zyl,M,0,0.022,0,0.0405,0.03,0.0405,w.farbe);etik(M,0,0.022,0.041,0.06,0.028,r);}},
  karton:{w:0.075,h:0.23,d:0.075,bau(M,w,r){teil(V.box,M,0,0.1,0,0.072,0.2,0.072,w.farbe);teil(V.box,M,0,0.212,0,0.072,0.03,0.05,w.farbe,Math.PI/4);teil(V.zyl,M,0.015,0.23,0.015,0.012,0.015,0.012,w.akzent);etik(M,0,0.1,0.0365,0.068,0.14,r);}},
  muesli:{w:0.19,h:0.28,d:0.065,bau(M,w,r){teil(V.box,M,0,0.14,0,0.19,0.28,0.065,w.farbe);etik(M,0,0.14,0.0335,0.18,0.26,r);}},
  teebox:{w:0.13,h:0.085,d:0.08,stapel:2,bau(M,w,r){teil(V.box,M,0,0.042,0,0.13,0.084,0.08,w.farbe);etik(M,0,0.042,0.0405,0.12,0.078,r);}},
  glas:{w:0.085,h:0.125,d:0.085,stapel:2,bau(M,w,r){teil(V.zyl,M,0,0.05,0,0.04,0.1,0.04,w.farbe);teil(V.zyl,M,0,0.11,0,0.042,0.024,0.042,w.akzent);etik(M,0,0.05,0.041,0.06,0.06,r);}},
  tuete:{w:0.16,h:0.23,d:0.07,bau(M,w,r){teil(V.kugel,M,0,0.11,0,0.078,0.11,0.032,w.farbe);teil(V.box,M,0,0.218,0,0.15,0.016,0.02,w.akzent);teil(V.box,M,0,0.005,0,0.15,0.012,0.03,w.akzent);etik(M,0,0.11,0.031,0.1,0.13,r);}},
  keksrolle:{w:0.21,h:0.065,d:0.065,stapel:3,bau(M,w,r){teil(V.zyl,M,0,0.032,0,0.032,0.2,0.032,w.farbe,0,0,Math.PI/2);teil(V.zyl,M,0.1,0.032,0,0.033,0.01,0.033,w.akzent,0,0,Math.PI/2);teil(V.zyl,M,-0.1,0.032,0,0.033,0.01,0.033,w.akzent,0,0,Math.PI/2);etik(M,0,0.032,0.0335,0.12,0.05,r);}},
  tafel:{w:0.09,h:0.16,d:0.016,bau(M,w,r){teil(V.box,M,0,0.08,0,0.09,0.16,0.016,w.farbe);etik(M,0,0.08,0.0085,0.085,0.13,r);}},
  nudeln:{w:0.075,h:0.28,d:0.04,bau(M,w,r){teil(V.box,M,0,0.14,0,0.075,0.28,0.04,w.farbe);etik(M,0,0.15,0.0205,0.07,0.16,r);}},
  sack:{w:0.13,h:0.19,d:0.065,bau(M,w,r){teil(V.box,M,0,0.09,0,0.13,0.18,0.06,w.farbe);teil(V.box,M,0,0.185,0,0.12,0.012,0.03,w.akzent);etik(M,0,0.09,0.031,0.11,0.13,r);}},
  ketchup:{w:0.075,h:0.22,d:0.075,bau(M,w,r){teil(V.zyl,M,0,0.08,0,0.035,0.16,0.035,w.farbe);teil(V.kegel,M,0,0.175,0,0.035,0.03,0.035,w.farbe);teil(V.zyl,M,0,0.205,0,0.014,0.03,0.014,w.akzent);etik(M,0,0.08,0.036,0.055,0.09,r);}},
  mehl:{w:0.11,h:0.18,d:0.075,bau(M,w,r){teil(V.box,M,0,0.09,0,0.11,0.18,0.075,w.farbe);etik(M,0,0.09,0.0385,0.1,0.15,r);}},
  klopapier:{w:0.23,h:0.23,d:0.12,bau(M,w,r){teil(V.box,M,0,0.115,0,0.23,0.23,0.115,'#F4F7FA');for(const x of [-0.057,0.057])teil(V.zyl,M,x,0.231,0,0.05,0.004,0.05,'#E3E8EE');etik(M,0,0.12,0.058,0.2,0.14,r);}},
  spueli:{w:0.075,h:0.25,d:0.045,bau(M,w,r){teil(V.box,M,0,0.1,0,0.07,0.2,0.04,w.farbe);teil(V.kegel,M,0,0.215,0,0.025,0.03,0.018,w.farbe);teil(V.zyl,M,0,0.24,0,0.01,0.025,0.01,w.akzent);etik(M,0,0.1,0.0205,0.06,0.12,r);}},
  karte:{w:0.12,h:0.19,d:0.035,bau(M,w,r){teil(V.box,M,0,0.095,0,0.12,0.19,0.03,w.farbe);etik(M,0,0.09,0.0155,0.11,0.15,r);}},
  tube:{w:0.05,h:0.19,d:0.045,bau(M,w,r){teil(V.box,M,0,0.095,0,0.05,0.19,0.044,w.farbe);etik(M,0,0.1,0.0225,0.046,0.15,r);}},
  seife:{w:0.095,h:0.06,d:0.055,stapel:3,bau(M,w,r){teil(V.box,M,0,0.03,0,0.095,0.06,0.055,w.farbe);etik(M,0,0.03,0.028,0.085,0.05,r);}},
  shampoo:{w:0.09,h:0.23,d:0.06,bau(M,w,r){teil(V.zyl,M,0,0.095,0,0.043,0.19,0.028,w.farbe);teil(V.zyl,M,0,0.205,0,0.022,0.035,0.016,w.akzent);etik(M,0,0.095,0.029,0.06,0.11,r);}},
  butter:{w:0.12,h:0.05,d:0.075,stapel:3,bau(M,w,r){teil(V.box,M,0,0.025,0,0.12,0.05,0.075,w.farbe);etik(M,0,0.025,0.038,0.11,0.044,r);}},
  kaese:{w:0.14,h:0.1,d:0.09,stapel:2,bau(M,w){teil(V.keil,M,0,0.035,0,0.07,0.085,0.07,w.farbe,Math.PI/2,0,Math.PI);for(const [x,y] of [[-0.02,0.045],[0.022,0.03],[0.003,0.012],[-0.035,0.015]])teil(V.kugel0,M,x,y,0.043,0.009,0.009,0.004,w.akzent);}},
  becher:{w:0.08,h:0.08,d:0.08,stapel:2,bau(M,w,r){teil(V.becher,M,0,0.035,0,0.036,0.07,0.036,w.farbe);teil(V.zyl,M,0,0.072,0,0.038,0.006,0.038,w.akzent);etik(M,0,0.035,0.037,0.05,0.04,r);}},
  eier:{w:0.16,h:0.13,d:0.12,bau(M,w,r){teil(V.box,M,0,0.018,0.01,0.15,0.035,0.1,w.farbe);for(let i=0;i<3;i++)for(let j=0;j<2;j++)teil(V.kugel,M,-0.045+i*0.045,0.046,-0.012+j*0.044,0.02,0.027,0.02,(i+j)%2?'#F3E6D3':'#D9B48F');teil(V.box,M,0,0.085,-0.045,0.15,0.1,0.008,w.farbe,-0.2);etik(M,0,0.09,-0.039,0.13,0.07,r);}},
  flach:{w:0.15,h:0.035,d:0.11,stapel:4,bau(M,w,r){teil(V.box,M,0,0.017,0,0.15,0.034,0.11,w.farbe);etik(M,0,0.017,0.0555,0.14,0.03,r);}},
  eisbox:{w:0.17,h:0.115,d:0.12,stapel:2,bau(M,w,r){teil(V.box,M,0,0.05,0,0.17,0.1,0.12,w.farbe);teil(V.box,M,0,0.105,0,0.175,0.014,0.125,w.akzent);etik(M,0,0.05,0.0605,0.15,0.08,r);}},
  pizza:{w:0.26,h:0.26,d:0.04,bau(M,w,r){teil(V.box,M,0,0.13,0,0.26,0.26,0.035,w.farbe);etik(M,0,0.13,0.018,0.24,0.24,r);}},
  /* Backwaren ohne Verpackung */
  brot:{w:0.25,h:0.13,d:0.13,stapel:2,bau(M,w){teil(V.box,M,0,0.035,0,0.24,0.07,0.12,w.farbe);teil(V.zyl,M,0,0.07,0,0.06,0.24,0.06,w.farbe,0,0,Math.PI/2);for(let i=0;i<3;i++)teil(V.box,M,-0.06+i*0.06,0.125,0,0.012,0.008,0.1,w.akzent,0,0.6);}},
  broetchen:{w:0.1,h:0.06,d:0.1,stapel:3,bau(M,w){teil(V.kugel,M,0,0.03,0,0.05,0.032,0.045,w.farbe);teil(V.box,M,0,0.058,0,0.05,0.006,0.008,w.akzent);}},
  kuchen:{w:0.23,h:0.12,d:0.23,bau(M,w){teil(V.zyl,M,0,0.04,0,0.105,0.08,0.105,'#B9783F');teil(V.zyl,M,0,0.085,0,0.107,0.018,0.107,w.farbe);for(let i=0;i<6;i++){const a=i*Math.PI/3;teil(V.kugel0,M,Math.cos(a)*0.07,0.1,Math.sin(a)*0.07,0.012,0.012,0.012,w.akzent);}teil(V.zyl,M,0,0.115,0,0.004,0.04,0.004,'#FFFFFF');}},
  donut:{w:0.11,h:0.04,d:0.11,stapel:3,bau(M,w){teil(V.ring,M,0,0.018,0,0.04,0.04,0.04,w.farbe,Math.PI/2);teil(V.ring,M,0,0.026,0,0.04,0.04,0.025,w.akzent,Math.PI/2);}},
  croissant:{w:0.14,h:0.05,d:0.08,stapel:3,bau(M,w){teil(V.bogen,M,0,0.02,0.02,0.06,0.06,0.07,w.farbe,Math.PI/2);}},
  /* Obst und Gemuese (fuer Kisten) */
  kugel:{r:0.042,bau(M,w,_,k){teil(V.kugel,M,0,0,0,0.042,0.04,0.042,k%3?w.farbe:w.akzent);if(w.id==='apple'||w.id==='tomatoes'){teil(V.zyl,M,0,0.042,0,0.004,0.018,0.004,w.id==='apple'?'#6B4E33':'#3E8E41');if(k%3===0)teil(V.kugel0,M,0.013,0.047,0,0.015,0.004,0.008,'#5E9C3A');}}},
  zitrone:{r:0.035,bau(M,w){teil(V.kugel,M,0,0,0,0.045,0.034,0.034,w.farbe);}},
  kartoffel:{r:0.042,bau(M,w,_,k){teil(V.kugel0,M,0,0,0,0.05,0.035,0.04,k%2?w.farbe:w.akzent,0,k);}},
  banane:{r:0.08,bau(M,w,_,k){for(let i=0;i<4;i++)teil(V.bogen,M,0,0.005+i*0.012,-0.02+i*0.012,0.1,0.06,0.04,w.farbe,Math.PI/2,k*0.7+i*0.25,0);teil(V.box,M,0.0,0.03,-0.07,0.02,0.02,0.03,w.akzent,0,k*0.7);}},
  traube:{r:0.07,bau(M,w){for(let i=0;i<9;i++){const a=i*2.4,rr=0.02+0.008*(i%3);teil(V.kugel0,M,Math.cos(a)*rr,0.015+(i%3)*0.018,Math.sin(a)*rr*1.6,0.018,0.018,0.018,i%2?w.farbe:w.akzent);}}},
  schale:{r:0.07,bau(M,w){teil(V.box,M,0,0.02,0,0.12,0.04,0.1,'#58B368');for(let i=0;i<6;i++)teil(V.kugel0,M,-0.035+(i%3)*0.035,0.045,-0.02+Math.floor(i/3)*0.04,0.02,0.022,0.02,w.farbe);}},
  karotte:{r:0.06,bau(M,w,_,k){for(let i=0;i<3;i++){teil(V.spitz,M,-0.03+i*0.03,0.02,0,0.016,0.16,0.016,w.farbe,Math.PI/2,k*0.4);teil(V.spitz,M,-0.03+i*0.03,0.02,-0.09,0.012,0.05,0.012,w.akzent,-Math.PI/2,k*0.4);}}},
  gurke:{r:0.06,bau(M,w,_,k){teil(V.zyl,M,0,0.022,0,0.022,0.26,0.022,k%2?w.farbe:w.akzent,Math.PI/2,k*0.5);}},
  salat:{r:0.075,bau(M,w){teil(V.kugel,M,0,0.03,0,0.075,0.055,0.075,w.farbe);teil(V.kugel,M,0,0.05,0,0.05,0.04,0.05,w.akzent);}}
 };
 let BASIS=null;
 function teil(geo,M,x,y,z,sx,sy,sz,farbe,rx,ry,rz){S.add(geo,BASIS.clone().multiply(mat(x,y,z,sx,sy,sz,rx,ry,rz)),farbe);}
 function etik(M,x,y,z,w,h,rect){if(rect&&w>0)ET.add(V.ebene,BASIS.clone().multiply(mat(x,y,z,w,h,1)),'#FFFFFF',rect);}
 function ware(w,x,y,z,ry,k){const f=F[w.form];BASIS=mat(x,y,z,1,1,1,0,ry,0);f.bau(BASIS,w,etikett[w.id],k||0);}
 const blick=(nx,nz)=>Math.atan2(nx,nz);   // +z auf (nx,nz) drehen

 /* Preisschild an Stelle (x,y,z), schaut nach (nx,nz) */
 function preisschild(w,x,y,z,nx,nz,b=0.3,h=0.13){
  const ry=blick(nx,nz);TAG_L.add(V.ebene,mat(x,y,z,b,h,1,0,ry,0),'#FFFFFF',tagL[w.id]);TAG_P.add(V.ebene,mat(x,y,z,b,h,1,0,ry,0),'#FFFFFF',tagP[w.id]);
 }

 /* Waren entlang einer Regalseite auf mehreren Boeden aufstellen */
 function reihe(p,w,boeden,tiefe,frontXZ,maxZahl){
  const f=F[w.form],n=[p.nx,p.nz],ry=blick(p.nx,p.nz);
  const len=p.b-p.a-0.14,zahl=Math.max(1,Math.min(maxZahl||14,Math.floor(len/(f.w+0.025))));
  const ab=len/zahl;
  for(const y of boeden){
   for(let i=0;i<zahl;i++){
    const t=p.a+0.07+ab*(i+0.5);
    for(let s=0;s<(f.stapel||1);s++){
     const yy=y+s*(f.h+0.004);
     /* vorne: echte Ware */
     const X=p.seite.achse==='z'?frontXZ-n[0]*(f.d/2+0.03):t,Z=p.seite.achse==='z'?t:frontXZ-n[1]*(f.d/2+0.03);
     ware(w,X,yy,Z,ry,i);
     /* dahinter: schlichte Kloetze in der Warenfarbe, damit das Regal voll wirkt */
     if(tiefe>0.3){const X2=p.seite.achse==='z'?X-n[0]*(f.d+0.02):X,Z2=p.seite.achse==='z'?Z:Z-n[1]*(f.d+0.02);
      S.add(V.box,mat(X2,yy+f.h*0.45,Z2,f.w*0.95,f.h*0.9,f.d,0,ry,0),w.farbe);}
    }
   }
  }
 }

 /* ===== Gondeln (Regale in der Mitte) ===== */
 const BOEDEN=[0.12,0.55,0.98,1.41];
 for(const gx of welt.GONDEL){
  const holz=gx===welt.GONDEL[0];
  const x1=gx-welt.GT,x2=gx+welt.GT,z1=welt.GZ1,z2=welt.GZ2,H=welt.GH;
  S.quader(x1+0.03,0,z1,x2-0.03,0.12,z2,'#46515B');                                  // Sockel
  S.quader(gx-0.03,0.12,z1,gx+0.03,H,z2,'#F3F4F5');                                   // Rueckwand
  for(const y of BOEDEN.slice(1)){
   S.quader(x1+0.02,y-0.03,z1,x2-0.02,y,z2,holz?'#C9A27A':'#DADDE0');
   S.quader(x1,y-0.075,z1,x1+0.02,y,z2,'#33404A');S.quader(x2-0.02,y-0.075,z1,x2,y,z2,'#33404A');   // Preisleiste
  }
  S.quader(x1+0.02,H-0.02,z1,x2-0.02,H,z2,'#E6E8EA');
  /* Kopfenden */
  for(const zz of [z1,z2]){const s=zz===z1?-1:1;S.quader(x1,0,zz,x2,H+0.05,zz+s*0.05,'#0F3B2E');}
  /* Seitenblenden oben in der Abteilungsfarbe */
  for(const s of welt.SEITEN.filter(s=>s.achse==='z'&&(s.x1===x1||s.x2===x2)&&s.a===z1)){
   const fx=s.nx>0?x2:x1;S.quader(Math.min(fx,fx+s.nx*0.02),H,z1,Math.max(fx,fx+s.nx*0.02),H+0.32,z2,FARBE[s.ort]);
   for(const zm of [z1+2.75,z2-2.75])schildFlaeche(ortSchild[s.ort],fx+s.nx*0.045,H+0.16,zm,1.1,0.28,blick(s.nx,0));
  }
  if(holz)S.quader(gx-0.05,0.12,z1,gx-0.03,H,z2,'#B8874F');
 }
 /* Gangschilder, von beiden Seiten lesbar */
 for(const a of welt.GAENGE){
  S.quader(a.x-0.01,2.9,9.5-0.01,a.x+0.01,DECKE,9.5+0.01,'#6E7880');
  for(const s of [-1,1])schildFlaeche(gangSchild[a.nr],a.x,2.62,9.5+s*0.035,1.9,0.5,s>0?0:Math.PI);
  S.quader(a.x-0.97,2.35,9.5-0.012,a.x+0.97,2.88,9.5+0.012,'#0F3B2E');
 }

 /* ===== Waren platzieren ===== */
 for(const p of welt.plaetze){
  const w=welt.byId[p.id],s=p.seite,mitte=(p.a+p.b)/2;
  if(s.art==='regal'||s.art==='holz'){
   const front=s.nx>0?s.x2:s.x1;
   reihe(p,w,BOEDEN,welt.GT,front,14);
   preisschild(w,front+s.nx*0.012,BOEDEN[2]-0.045,mitte,s.nx,0);
  }else if(s.art==='kuehl'||s.art==='tiefkuehl'){
   const tief=s.art==='kuehl'?BOEDEN.map(y=>y+0.03):[0.15,0.58,1.01,1.44];
   const front=s.achse==='x'?s.z2-0.12:(s.nx<0?s.x1+0.12:s.x2-0.12);
   reihe(p,w,tief,0.6,front,12);
   if(s.achse==='x')preisschild(w,mitte,tief[2]-0.045,front+0.012,0,1);
   else preisschild(w,front+s.nx*0.012,tief[2]-0.045,mitte,s.nx,0);
  }else if(s.art==='kisten'||s.art==='insel'){
   kisten(p,w);
  }
 }

 /* Obst- und Gemuesekisten: Holzkisten, gefuellt */
 function kisten(p,w){
  const s=p.seite,f=F[w.form],mitte=(p.a+p.b)/2,breit=p.b-p.a-0.2;
  const stufen=s.art==='kisten'?[[s.x2-0.55,s.x2,0.55],[s.x1+0.1,s.x2-0.55,0.95]]:[[s.x1,(s.x1+s.x2)/2,0.8],[(s.x1+s.x2)/2,s.x2,0.8]];
  for(const [xa,xb,y] of stufen){
   S.quader(xa+0.02,0,p.a+0.1,xb-0.02,y-0.12,p.b-0.1,'#8A6A47');                    // Unterbau
   S.quader(xa+0.02,y-0.12,p.a+0.1,xb-0.02,y-0.1,p.b-0.1,'#A47A4E');
   for(const [za,zb] of [[p.a+0.1,p.a+0.13],[p.b-0.13,p.b-0.1]])S.quader(xa+0.02,y-0.1,za,xb-0.02,y+0.02,zb,'#C08A55');
   for(const xx of [xa+0.02,xb-0.05])S.quader(xx,y-0.1,p.a+0.1,xx+0.03,y+0.02,p.b-0.1,'#C08A55');
   const nx=Math.max(1,Math.floor((xb-xa-0.12)/(f.r*2.1))),nz=Math.max(1,Math.floor((breit-0.06)/(f.r*2.1)));
   for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const X=xa+0.07+(i+0.5)*(xb-xa-0.14)/nx,Z=p.a+0.13+(j+0.5)*(breit-0.06)/nz;
    BASIS=mat(X,y-0.06+f.r*0.5+((i+j)%2)*0.012,Z,1,1,1,0,(i*7+j*3)%6,0);f.bau(BASIS,w,null,i+j);
   }
  }
  /* Preisschild am Stab */
  if(s.art==='kisten'){S.quader(s.x2-0.02,0.4,mitte-0.01,s.x2,0.72,mitte+0.01,'#6E7880');preisschild(w,s.x2+0.012,0.72,mitte,1,0);}
  else{for(const sx of [-1,1]){const xx=sx<0?s.x1:s.x2;preisschild(w,xx+sx*0.012,0.6,mitte,sx,0,0.28,0.12);}}
 }
 /* Obst-Wand: Schild und Markise */
 schildFlaeche(schild('Fresh Fruit & Veg','#2E7D32','Local and seasonal',720,150),0.04,2.68,9,3.2,0.66,Math.PI/2);
 for(let z=3;z<15;z+=1)S.add(V.box,mat(1.15,2.15,z+0.5,0.5,0.04,1.0,0,0,-0.35),z%2?'#2E9E4F':'#F4F1E6');
 /* Gemuese-Insel: Dach mit Schild */
 for(const [x,z] of [[4.05,5.05],[6.15,5.05],[4.05,12.95],[6.15,12.95]])S.quader(x-0.04,0,z-0.04,x+0.04,2.2,z+0.04,'#5B4636');
 S.quader(3.95,2.2,4.95,6.25,2.28,13.05,'#2E7D32');
 for(const s of [-1,1])schildFlaeche(ortSchild.gemuese,5.1,2.45,s>0?13.09:4.91,1.4,0.35,s>0?0:Math.PI);
 S.quader(4.4,2.28,4.94,5.8,2.62,4.95,'#2E7D32');S.quader(4.4,2.28,13.05,5.8,2.62,13.06,'#2E7D32');

 /* ===== Kuehlregale (Norden) ===== */
 {const s=welt.SEITEN.find(s=>s.ort==='kuehl');
  S.quader(s.a,0,0,s.b,0.12,s.z2,'#46515B');S.quader(s.a,0.12,0,s.b,2.1,0.08,'#E9F3FA');
  LEUCHT.quader(s.a,2.02,0.1,s.b,2.05,s.z2-0.1,'#FFFFFF');
  for(const y of BOEDEN.slice(1).map(y=>y+0.03))S.quader(s.a,y-0.02,0.08,s.b,y,s.z2-0.12,'#C4CCD3');
  S.quader(s.a,2.1,0,s.b,2.45,s.z2,'#5DADE2');S.quader(s.a,2.1,s.z2-0.01,s.b,2.45,s.z2+0.01,'#3B8BC0');
  for(let x=s.a+3;x<s.b-1;x+=6)schildFlaeche(ortSchild.kuehl,x,2.28,s.z2+0.04,1.25,0.31,0);
  for(let x=s.a;x<=s.b+0.01;x+=1.25){S.quader(x-0.025,0.12,s.z2-0.06,x+0.025,2.1,s.z2,'#AEB7BF');if(x<s.b-0.5){GLAS.add(V.ebene,mat(x+0.625,1.11,s.z2-0.03,1.2,1.98,1),'#E4F4FC');S.quader(x+1.1,0.85,s.z2,x+1.13,1.45,s.z2+0.04,'#7A858F');}}
  for(const x of [s.a-0.02,s.b])S.quader(x,0,0,x+0.02,2.45,s.z2,'#AEB7BF');
  /* Eckschraenke */
  S.quader(0.05,0,0.05,1.95,1.0,0.95,'#C9D2D9');S.quader(27.05,0,0.05,29.95,1.0,0.95,'#C9D2D9');
 }
 /* ===== Tiefkuehlregale (Osten) ===== */
 {const s=welt.SEITEN.find(s=>s.ort==='tiefkuehl');
  S.quader(s.x1,0,s.a,W,0.12,s.b,'#46515B');S.quader(W-0.08,0.12,s.a,W,2.1,s.b,'#E1EEF8');
  LEUCHT.quader(s.x1+0.1,2.02,s.a,W-0.1,2.05,s.b,'#EAF6FF');
  for(const y of [0.15,0.58,1.01,1.44])S.quader(s.x1+0.12,y-0.02,s.a,W-0.08,y,s.b,'#C4CCD3');
  S.quader(s.x1,2.1,s.a,W,2.45,s.b,'#7FA6C9');
  for(let z=s.a+2;z<s.b;z+=4)schildFlaeche(ortSchild.tiefkuehl,s.x1-0.04,2.28,z,1.25,0.31,-Math.PI/2);
  for(let z=s.a;z<=s.b+0.01;z+=1.2){S.quader(s.x1,0.12,z-0.025,s.x1+0.06,2.1,z+0.025,'#AEB7BF');if(z<s.b-0.5){GLAS.add(V.ebene,mat(s.x1+0.03,1.11,z+0.6,1.15,1.98,1,0,Math.PI/2,0),'#D5ECFA');S.quader(s.x1-0.04,0.85,z+1.05,s.x1,1.45,z+1.08,'#7A858F');}}
  for(const z of [s.a-0.02,s.b])S.quader(s.x1,0,z,W,2.45,z+0.02,'#AEB7BF');
  S.quader(28.9,0,15.2,29.95,1.0,23.3,'#E6EAEE');S.quader(28.9,1.0,15.2,29.95,1.03,23.3,'#9AA3AB');
 }

 /* ===== Kassen ===== */
 for(const k of welt.KASSEN){
  S.quader(k.x1,0,k.z1,k.x2,0.85,k.z2,'#3A4750');S.quader(k.x1-0.02,0.85,k.z1,k.x2+0.02,0.9,k.z2,'#D5DADF');
  S.quader(k.x1+0.12,0.9,k.z1+0.1,k.x2-0.12,0.92,k.z2-1.0,'#1E2328');                // Band
  GLAS.add(V.ebene,mat(k.x1+0.45,0.921,k.z2-0.7,0.3,0.3,1,-Math.PI/2,0,0),'#9AD3F5');    // Scanner
  S.quader(k.x2,0,k.z1+1,k.x2+1.1,0.75,k.z1+1.05,'#3A4750');                         // Kabinenwand
  S.add(V.zyl,mat(k.x2+0.55,0.25,k.z2-0.6,0.05,0.5,0.05),'#555F68');S.add(V.zyl,mat(k.x2+0.55,0.52,k.z2-0.6,0.22,0.06,0.22),'#2E3A44');
  S.quader(k.x2-0.05,0.9,k.z2-0.45,k.x2+0.1,1.25,k.z2-0.3,'#2C3A44');S.quader(k.x2-0.06,1.05,k.z2-0.45,k.x2-0.05,1.23,k.z2-0.3,'#7CC4F0');
  /* Saeule mit Nummer und Licht */
  S.add(V.zyl,mat(k.x1+0.1,1.5,k.z1+0.1,0.025,1.2,0.025),'#6E7880');
  S.add(V.kugel,mat(k.x1+0.1,2.13,k.z1+0.1,0.07,0.07,0.07),k.offen?'#36C26A':'#E04B4B');
  schildFlaeche(kasseSchild[k.nr-1],k.x1+0.45,2.55,k.z1-0.035,1.0,0.36,Math.PI);
  schildFlaeche(kasseSchild[k.nr-1],k.x1+0.45,2.55,k.z1+0.035,1.0,0.36,0);
  S.quader(k.x1-0.05,2.3,k.z1-0.01,k.x2+0.05,2.8,k.z1+0.01,'#2C3A44');
  /* Quengelware: kleines Regal am Band */
  S.quader(k.x1-0.35,0,k.z1+0.1,k.x1-0.02,1.1,k.z1+0.9,'#3A4750');
  for(let i=0;i<3;i++)for(let j=0;j<4;j++)S.quader(k.x1-0.33,0.45+i*0.22,k.z1+0.14+j*0.19,k.x1-0.27,0.6+i*0.22,k.z1+0.29+j*0.19,['#E9573F','#F6BB42','#3BAFDA','#D770AD'][(i+j)%4]);
 }
 /* Korbstapel und Blumenstand */
 for(let i=0;i<6;i++){const y=i*0.11;S.quader(0.55,y,20.8,1.45,y+0.1,21.4,'#D93B2B');S.quader(0.55,y,21.7,1.45,y+0.1,22.3,'#D93B2B');}
 S.quader(0.5,0,20.7,1.5,0.02,22.4,'#7A858F');
 {const x=26.5,z=19.5;S.quader(x,0,z,x+2,0.25,z+2,'#8A6A47');S.quader(x+0.2,0.25,z+0.2,x+1.8,0.65,z+1.8,'#A47A4E');
  const bl=['#E9573F','#F6BB42','#D770AD','#FFFFFF','#967ADC'];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){const X=x+0.4+i*0.4,Z=z+0.4+j*0.4;S.add(V.zyl,mat(X,0.82,Z,0.13,0.34,0.13),'#4A5A66');
   for(let b=0;b<5;b++)S.add(V.kugel0,mat(X+Math.cos(b*1.3)*0.08,1.1+(b%2)*0.06,Z+Math.sin(b*1.3)*0.08,0.06,0.05,0.06),bl[(i+j+b)%5]);
   S.add(V.kugel0,mat(X,1.02,Z,0.13,0.08,0.13),'#4C8A43');}
  S.add(V.zyl,mat(x+1,1.6,z+1,0.02,1.2,0.02),'#6E7880');schildFlaeche(angebot,x+1,2.15,z+1.01,1.0,0.3,0);schildFlaeche(angebot,x+1,2.15,z+0.99,1.0,0.3,Math.PI);}
 /* Plakate an den Waenden */
 schildFlaeche(poster[0],0.04,1.85,17.2,1.2,0.43,Math.PI/2);
 schildFlaeche(poster[1],29.96,1.85,18.4,1.2,0.43,-Math.PI/2);
 schildFlaeche(poster[2],7.7,3.0,0.04,1.2,0.43,0);
 /* Backwaren: Schild ueber der Holzseite */
 for(const s of [-1,1])schildFlaeche(ortSchild.baeckerei,7.9,2.62,9.5+s*0.035,1.3,0.33,s>0?0:Math.PI);
 S.add(V.zyl,mat(7.9,3.1,9.5,0.01,1.0,0.01),'#6E7880');


 /* ===== Einkaufswagen am Eingang ===== */
 function wagen(x,z,ry){
  const T=mat(x,0,z,1,1,1,0,ry,0),dr='#C9CED3';
  const wb=(cx,cy,cz,sx,sy,sz,f,rx)=>S.add(V.box,T.clone().multiply(mat(cx,cy,cz,sx,sy,sz,rx||0,0,0)),f||dr);
  const d=0.012,B2=0.26,z1=-0.4,z2=0.45,y1=0.45,y2=0.9;
  for(const y of [y1,y2,0.67])for(const sx of [-1,1])wb(sx*B2,y,(z1+z2)/2,d,d,z2-z1);
  for(const y of [y1,y2])for(const zz of [z1,z2])wb(0,y,zz,2*B2,d,d);
  for(let zz=z1;zz<=z2+0.01;zz+=0.1)for(const sx of [-1,1])wb(sx*B2,(y1+y2)/2,zz,d,y2-y1,d);
  for(let xx=-B2;xx<=B2+0.01;xx+=0.087){wb(xx,(y1+y2)/2,z2,d,y2-y1,d);wb(xx,y1,(z1+z2)/2,d,d,z2-z1);}
  wb(0,1.0,z1-0.12,0.58,0.04,0.04,'#D93B2B');for(const sx of [-1,1]){wb(sx*0.26,0.95,z1-0.06,0.014,0.014,0.15,dr,0.65);wb(sx*0.26,1.0,z1-0.12,0.03,0.05,0.05,'#D93B2B');}
  for(const sx of [-1,1]){wb(sx*0.2,0.12,0.02,0.025,0.025,0.86);wb(sx*0.2,0.28,z1+0.02,0.02,0.32,0.02);wb(sx*0.2,0.28,z2-0.02,0.02,0.32,0.02);}
  for(const sx of [-1,1])wb(sx*0.2,0.22,0.02,d,d,0.8);for(let xx=-0.2;xx<=0.21;xx+=0.1)wb(xx,0.22,0.02,d,d,0.8);
  for(const sx of [-1,1])for(const zz of [z1+0.04,z2-0.04])S.add(V.zyl,T.clone().multiply(mat(sx*0.2,0.05,zz,0.05,0.035,0.05,0,0,Math.PI/2)),'#22272B');
 }
 for(const zz of [18.55,18.95,19.35])wagen(1.0,zz,Math.PI);

 /* ===== Aktionsware vor den Regalen ===== */
 const angebotSchild=schild('Special offer','#E9573F','Great prices!',420,150);
 for(const gx of welt.GONDEL){
  const x1=gx-welt.GT,x2=gx+welt.GT,z1=welt.GZ2,s1=welt.SEITEN.find(q=>q.achse==='z'&&q.x1===gx),f=FARBE[s1?s1.ort:'snacks'];
  S.quader(x1+0.05,0,z1+0.03,x2-0.05,0.12,z1+0.52,'#B88A55');
  for(let l=0;l<3;l++)for(let i=0;i<4;i++){const bx=x1+0.1+i*0.25,by=0.12+l*0.22;S.quader(bx,by,z1+0.08,bx+0.23,by+0.21,z1+0.47,(i+l)%2?f:'#F7F2E8');
   S.quader(bx+0.04,by+0.06,z1+0.471,bx+0.19,by+0.15,z1+0.475,(i+l)%2?'#F7F2E8':f);}
  S.add(V.zyl,mat(gx,0.95,z1+0.3,0.012,0.6,0.012),'#6E7880');
  schildFlaeche(angebotSchild,gx,1.32,z1+0.32,0.8,0.29,0);
 }

 /* ===== Bodenmarkierungen ===== */
 const bodenNr={};
 for(const a2 of welt.GAENGE)bodenNr[a2.nr]=AG.add(128,128,(g,w,h)=>{g.fillStyle='#FFC845';g.beginPath();g.arc(w/2,h/2,w*0.46,0,7);g.fill();g.strokeStyle='#0F3B2E';g.lineWidth=7;g.beginPath();g.arc(w/2,h/2,w*0.38,0,7);g.stroke();
  g.fillStyle='#0F3B2E';g.font='800 64px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText(String(a2.nr),w/2,h/2+3);});
 const pfeil=AG.add(384,128,(g,w,h)=>{g.fillStyle='#FFC845';g.beginPath();g.moveTo(10,h*0.3);g.lineTo(w-90,h*0.3);g.lineTo(w-90,h*0.08);g.lineTo(w-8,h*0.5);g.lineTo(w-90,h*0.92);g.lineTo(w-90,h*0.7);g.lineTo(10,h*0.7);g.closePath();g.fill();
  g.fillStyle='#0F3B2E';g.font='800 40px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText('CHECKOUT',w/2-40,h/2+2);});
 const BODEN=new Sammler();
 for(const a2 of welt.GAENGE)BODEN.add(V.ebene,mat(a2.x,0.012,15.95,0.8,0.8,1,-Math.PI/2,0,0),'#FFFFFF',bodenNr[a2.nr]);
 BODEN.add(V.ebene,mat(9.6,0.012,17.0,1.8,0.6,1,-Math.PI/2,0,0),'#FFFFFF',pfeil);

 /* ===== Haengelampen ueber Obst und Backwaren ===== */
 for(const [x,z] of [[2.65,5],[2.65,9],[2.65,13],[7.55,6],[7.55,12]]){
  S.add(V.zyl,mat(x,3.15,z,0.006,0.9,0.006),'#2B2B2B');
  S.add(V.kegel,mat(x,2.62,z,0.24,0.2,0.24),'#1F5B3F');
  LEUCHT.add(V.kugel,mat(x,2.53,z,0.075,0.06,0.075),'#FFF2C9');
 }

 /* ===== Wanduhr mit echter Uhrzeit ===== */
 const zifferblatt=AG.add(256,256,(g,w,h)=>{g.fillStyle='#0F3B2E';g.beginPath();g.arc(w/2,h/2,w/2-2,0,7);g.fill();g.fillStyle='#FFFFFF';g.beginPath();g.arc(w/2,h/2,w/2-16,0,7);g.fill();
  g.fillStyle='#1D2A33';for(let i=0;i<12;i++){g.save();g.translate(w/2,h/2);g.rotate(i*Math.PI/6);g.fillRect(-3,-(w/2-26),6,i%3?14:24);g.restore();}
  g.font='700 20px '+SCHRIFT;g.textAlign='center';g.fillStyle='#2E9E4F';g.fillText('Hilltop',w/2,h*0.68);});
 schildFlaeche(zifferblatt,23.5,3.05,0.03,0.6,0.6,0);
 const uhr=new THREE.Group();uhr.position.set(23.5,3.05,0.045);scene.add(uhr);
 const zeiger=[[0.16,0.022],[0.23,0.014]].map(([l,b])=>{const g2=new THREE.BoxGeometry(b,l,0.006);g2.translate(0,l/2-0.02,0);const m=new THREE.Mesh(g2,new THREE.MeshBasicMaterial({color:'#1D2A33'}));uhr.add(m);return m;});

 /* ===== Weiche Schatten am Boden ===== */
 const schattenBild=(rund)=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  if(rund){const v=g.createRadialGradient(64,64,4,64,64,62);v.addColorStop(0,'rgba(0,0,0,.9)');v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(0,0,128,128);}
  else{g.shadowColor='rgba(0,0,0,1)';g.shadowBlur=20;g.shadowOffsetX=1000;g.fillStyle='#000';g.fillRect(-1000+26,26,76,76);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
 const SCHATTEN=new Sammler();
 for(const h of welt.hin){if(h.art==='wand'||h.art==='tuerfeld')continue;const pad=h.art==='kasse'||h.art==='kabine'?0.18:0.32;
  SCHATTEN.add(V.ebene,mat((h.x1+h.x2)/2,0.008,(h.z1+h.z2)/2,h.x2-h.x1+2*pad,h.z2-h.z1+2*pad,1,-Math.PI/2,0,0),'#FFFFFF',[0,0,1,1]);}
 const schattenMat=new THREE.MeshBasicMaterial({map:schattenBild(false),color:'#2A2218',transparent:true,opacity:0.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 scene.add(SCHATTEN.mesh(schattenMat));
 const rundSchatten=new THREE.MeshBasicMaterial({map:schattenBild(true),color:'#2A2218',transparent:true,opacity:0.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
 /* Spiegelung der Deckenlampen im glatten Boden */
 if(schoen){const SP=new Sammler();for(let x=3;x<W;x+=4.5)for(let z=2;z<D-1;z+=3)SP.add(V.ebene,mat(x,0.006,z,2.4,1.1,1,-Math.PI/2,0,0),'#FFFFFF',[0,0,1,1]);
  const sp=SP.mesh(new THREE.MeshBasicMaterial({map:schattenBild(false),color:'#FFFFFF',transparent:true,opacity:0.16,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1}));
  sp.material.map=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.shadowColor='#fff';g.shadowBlur=24;g.shadowOffsetX=1000;g.fillStyle='#fff';g.fillRect(-1000+30,30,68,68);const t=new THREE.CanvasTexture(c);return t;})();
  scene.add(sp);}

 /* ===== Menschen =====
    Rundliche Figuren aus Kapseln und Kugeln, Gesicht vorn (+z), Fuesse auf y=0.
    bewege() laesst Arme und Beine schwingen. */
 const farbMat={},mm=c=>farbMat[c]||(farbMat[c]=schoen?new THREE.MeshPhongMaterial({color:c,shininess:20,specular:0x111111}):new THREE.MeshLambertMaterial({color:c}));
 const GK=new THREE.CapsuleGeometry(1,1,4,12),GS=new THREE.SphereGeometry(1,20,14),GB=new THREE.BoxGeometry(1,1,1),GZ=new THREE.CylinderGeometry(1,1,1,14),GT2=new THREE.TorusGeometry(1,0.16,6,16);
 const GHalb=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*0.55),GSchatten=new THREE.PlaneGeometry(1,1);
 function stueck(el,geo,f,x,y,z,sx,sy,sz,rx,ry,rz){const m=new THREE.Mesh(geo,mm(f));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx||0,ry||0,rz||0);el.add(m);return m;}
 const kapsel=(el,f,x,y,z,r,h,tz)=>stueck(el,GK,f,x,y,z,r,h/3,r*(tz||1));
 function mensch(o){
  const g=new THREE.Group(),k=new THREE.Group();g.add(k);
  if(o.kind)k.scale.setScalar(0.74);
  const haut=o.haut,haar=o.haar||'#3B2A20',hemd=o.hemd,hose=o.hose||'#34495E',schuh=o.schuh||'#2B2B2B';
  const beine=[-1,1].map(sx=>{const b=new THREE.Group();b.position.set(sx*0.085,0.86,0);k.add(b);
   kapsel(b,hose,0,-0.4,0,0.074,0.8);stueck(b,GB,schuh,0,-0.825,0.045,0.11,0.07,0.23);return b;});
  kapsel(k,hose,0,0.93,0,0.15,0.26,0.8).scale.x*=1.12;
  kapsel(k,hemd,0,1.21,0,0.17,0.6,0.78).scale.x*=1.1;
  stueck(k,GZ,haut,0,1.52,0,0.05,0.1,0.05);
  const kopf=new THREE.Group();kopf.position.set(0,1.67,0);k.add(kopf);
  stueck(kopf,GS,haut,0,0,0,0.13,0.14,0.13);
  for(const sx of [-1,1]){stueck(kopf,GS,'#FFFFFF',sx*0.046,0.015,0.112,0.024,0.027,0.012);stueck(kopf,GS,'#1D2A33',sx*0.046,0.012,0.122,0.013,0.016,0.008);
   stueck(kopf,GB,haar,sx*0.047,0.055,0.118,0.04,0.009,0.01,0,0,sx*-0.12);stueck(kopf,GS,haut,sx*0.13,0,0,0.025,0.035,0.02);}
  stueck(kopf,GS,haut,0,-0.02,0.13,0.018,0.022,0.016);
  stueck(kopf,GT2,'#A0413A',0,-0.055,0.112,0.032,0.024,0.03,0,0,Math.PI).geometry=new THREE.TorusGeometry(1,0.18,6,14,Math.PI);
  /* Haare */
  const fr=o.frisur||'kurz';
  if(fr!=='glatze'&&fr!=='kappe')stueck(kopf,GHalb,haar,0,0.015,-0.01,0.142,0.15,0.146,-0.32);
  if(fr==='glatze')stueck(kopf,GHalb,haar,0,-0.01,-0.03,0.138,0.08,0.13,-1.6);
  if(fr==='dutt')stueck(kopf,GS,haar,0,0.1,-0.11,0.065,0.06,0.065);
  if(fr==='zopf'){stueck(kopf,GS,haar,0,0.02,-0.15,0.05,0.05,0.05);kapsel(kopf,haar,0,-0.1,-0.16,0.04,0.24);}
  if(fr==='lang')stueck(kopf,GB,haar,0,-0.1,-0.07,0.27,0.3,0.1);
  if(fr==='kappe'){stueck(kopf,GHalb,o.kappe||hemd,0,0.02,0,0.142,0.13,0.142);stueck(kopf,GB,o.kappe||hemd,0,0.045,0.15,0.2,0.016,0.13);}
  if(o.bart)stueck(kopf,GHalb,haar,0,-0.04,0.03,0.12,0.1,0.11,Math.PI);
  if(o.brille){for(const sx of [-1,1])stueck(kopf,GT2,'#2B2B2B',sx*0.046,0.015,0.132,0.03,0.03,0.03);stueck(kopf,GB,'#2B2B2B',0,0.015,0.135,0.03,0.006,0.006);}
  /* Arme */
  const arme=[-1,1].map(sx=>{const a=new THREE.Group();a.position.set(sx*0.215,1.43,0);a.rotation.z=sx*0.08;k.add(a);
   kapsel(a,hemd,0,-0.16,0,0.058,0.34);kapsel(a,o.langarm?hemd:haut,0,-0.44,0,0.05,0.3);stueck(a,GS,haut,0,-0.62,0.01,0.052,0.06,0.052);return a;});
  if(o.korb){const kb=new THREE.Group();kb.position.set(0,-0.68,0.08);arme[1].add(kb);stueck(kb,GB,'#D93B2B',0,-0.08,0.05,0.26,0.14,0.2);stueck(kb,GT2,'#A82A1E',0,0.0,0.05,0.12,0.12,0.12,0,Math.PI/2);}
  if(o.schuerze){stueck(k,GB,o.schuerze,0,1.12,0.135,0.3,0.42,0.02);stueck(k,GB,'#FFFFFF',0.08,1.3,0.148,0.07,0.03,0.005);}
  const sch=new THREE.Mesh(GSchatten,rundSchatten);sch.rotation.x=-Math.PI/2;sch.position.y=0.007;sch.scale.setScalar(o.kind?0.55:0.7);g.add(sch);
  g.userData={k,beine,arme,kopf,amt:0};
  return g;
 }
 function bewege(m,phase,ziel,dt){
  const u=m.userData;u.amt+=(ziel-u.amt)*Math.min(1,dt*8);const a=u.amt,s1=Math.sin(phase);
  u.beine[0].rotation.x=s1*0.55*a;u.beine[1].rotation.x=-s1*0.55*a;
  u.arme[0].rotation.x=-s1*0.45*a;if(!u.winkt)u.arme[1].rotation.x=s1*0.45*a;
  u.k.position.y=Math.abs(Math.cos(phase))*0.03*a;
 }
 /* Kassiererin */
 const kassiererin=mensch({haut:'#E8B48A',haar:'#5A3825',frisur:'zopf',hemd:'#2E9E4F',schuerze:'#FFC845',hose:'#2C3A44'});
 {const k=welt.KASSEN[0];kassiererin.position.set(k.x2+0.55,0,k.z2-0.6);kassiererin.rotation.y=-Math.PI/2;scene.add(kassiererin);}
 /* Kundschaft */
 const AUSSEHEN=[
  {haut:'#F1C7A5',haar:'#CFCAC2',frisur:'dutt',hemd:'#8E5BA8',hose:'#4A4E69',brille:true,langarm:true,korb:true},
  {haut:'#B07A50',haar:'#1E1A18',frisur:'kurz',hemd:'#3B82C4',hose:'#2C3E50',bart:true},
  {haut:'#F5D0B0',haar:'#D9A441',frisur:'zopf',hemd:'#F06292',hose:'#5C6BC0',kind:true},
  {haut:'#E8B996',haar:'#A8A8A8',frisur:'glatze',hemd:'#6B8E23',hose:'#5D4037',brille:true,langarm:true,korb:true},
  {haut:'#8D5A3B',haar:'#151515',frisur:'kurz',hemd:'#FFB300',hose:'#1565C0',kind:true},
  {haut:'#6B4226',haar:'#1A1A1A',frisur:'lang',hemd:'#E64A19',hose:'#263238',korb:true},
  {haut:'#E9BFA0',haar:'#7B4A2E',frisur:'zopf',hemd:'#26A69A',hose:'#37474F',korb:true}];
 const kunden=[];
 function kundenFigur(i){while(kunden.length<=i){const m=mensch(AUSSEHEN[kunden.length%AUSSEHEN.length]);scene.add(m);kunden.push(m);}return kunden[i];}

 AG.malen();
 /* ===== Meshes erzeugen ===== */
 scene.add(S.mesh(matFarbe));
 scene.add(LEUCHT.mesh(new THREE.MeshBasicMaterial({vertexColors:true})));
 scene.add(ET.mesh(glanz({map:AE.tex,shininess:45,specular:0x333333})));
 scene.add(SCH.mesh(new THREE.MeshBasicMaterial({map:AG.tex,alphaTest:0.5})));
 scene.add(BODEN.mesh(new THREE.MeshBasicMaterial({map:AG.tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4})));
 const tagLeicht=TAG_L.mesh(new THREE.MeshBasicMaterial({map:AS.tex})),tagProfi=TAG_P.mesh(new THREE.MeshBasicMaterial({map:AS.tex}));
 scene.add(tagLeicht);scene.add(tagProfi);
 const glas=GLAS.mesh(new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.22,depthWrite:false,side:THREE.DoubleSide}));glas.renderOrder=2;scene.add(glas);
 function setProfi(b){tagLeicht.visible=!b;tagProfi.visible=!!b;}
 setProfi(!!opts.profi);

 /* Markierung des angesehenen Regalplatzes */
 const marke=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:'#FFC845',transparent:true,opacity:0.95}));
 const markeFlaeche=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#FFC845',transparent:true,opacity:0.08,depthWrite:false}));
 marke.visible=markeFlaeche.visible=false;scene.add(marke);scene.add(markeFlaeche);

 function resize(){const w=canvas.clientWidth||300,h=canvas.clientHeight||300;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 resize();
 /* Spielfiguren der Teams (nur im geteilten Bildschirm sichtbar) */
 const figuren=['#E9573F','#1F78B4'].map((farbe,i)=>{const m=mensch({haut:i?'#C68B5E':'#F0C8A8',haar:'#3B2A20',frisur:'kappe',kappe:farbe,hemd:farbe,korb:true});m.visible=false;scene.add(m);m.userData.alt=null;return m;});
 function markieren(h,t){
  if(h){marke.visible=markeFlaeche.visible=true;
   const pad=0.02,sx=h.x2-h.x1+pad,sy=h.y2-h.y1+pad,sz=h.z2-h.z1+pad;
   marke.position.set((h.x1+h.x2)/2,(h.y1+h.y2)/2,(h.z1+h.z2)/2);marke.scale.set(sx,sy,sz);
   markeFlaeche.position.copy(marke.position);markeFlaeche.scale.copy(marke.scale);
   markeFlaeche.material.opacity=0.07+Math.sin(t*4)*0.03;}
  else marke.visible=markeFlaeche.visible=false;
 }
 let tAlt=0;
 function welt3d(st,t){
  const dt=Math.max(0,Math.min(0.1,t-tAlt));tAlt=t;
  /* Tueren oeffnen sich, wenn jemand nah ist */
  const leute=st.views||[st];
  const nah=leute.some(v=>Math.hypot(v.x-(welt.TUER.x1+welt.TUER.x2)/2,v.z-welt.D)<3.6);
  for(const tg of tueren){const ziel=nah?tg.userData.auf:tg.userData.zu;tg.position.x+=(ziel-tg.position.x)*0.12;}
  /* Kassiererin winkt, wenn jemand in der Naehe ist */
  const k=welt.KASSEN[0],dk=Math.min(...leute.map(v=>Math.hypot(v.x-k.x1,v.z-(k.z1+k.z2)/2))),ku=kassiererin.userData;
  ku.winkt=dk<5;ku.arme[1].rotation.z=ku.winkt?2.4+Math.sin(t*7)*0.35:0.08;
  ku.kopf.rotation.y=Math.sin(t*0.7)*0.2;bewege(kassiererin,0,0,dt);
  /* Uhr */
  const jetzt=new Date(),min=jetzt.getMinutes()+jetzt.getSeconds()/60,std=(jetzt.getHours()%12)+min/60;
  zeiger[0].rotation.z=-std/12*Math.PI*2;zeiger[1].rotation.z=-min/60*Math.PI*2;
  /* Kundschaft */
  const kl=st.leute||[];
  kl.forEach((q,i)=>{const m=kundenFigur(i);m.visible=true;m.position.set(q.x,0,q.z);
   const ziel=Math.PI-q.yaw;let d=ziel-m.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));m.rotation.y+=d*Math.min(1,dt*6);
   bewege(m,q.phase||0,q.geht?1:0,dt);});
  for(let i=kl.length;i<kunden.length;i++)kunden[i].visible=false;
 }
 function kamera(v,aspect){
  camera.position.set(v.x,AUGE+(v.bob||0),v.z);camera.rotation.set(v.pitch||0,-v.yaw,0,'YXZ');
  if(camera.aspect!==aspect){camera.aspect=aspect;camera.updateProjectionMatrix();}
 }
 function frame(st){
  const t=st.t||0,w=canvas.clientWidth||300,h=canvas.clientHeight||300;
  welt3d(st,t);
  if(st.views){
   /* Teamfiguren laufen, wenn sich ihr Team bewegt */
   figuren.forEach((f,j)=>{const o=st.views[j];if(!o)return;const u=f.userData,alt=u.alt||{x:o.x,z:o.z};
    const weg=Math.hypot(o.x-alt.x,o.z-alt.z);u.phase=(u.phase||0)+weg*4.2;u.alt={x:o.x,z:o.z};
    f.position.set(o.x,0,o.z);f.rotation.y=Math.PI-o.yaw;bewege(f,u.phase,weg>0.004?1:0,0.016);});
   /* Geteilter Bildschirm: links Team 1, rechts Team 2 */
   renderer.setScissorTest(true);
   st.views.forEach((v,i)=>{
    figuren.forEach((f,j)=>{const o=st.views[j];f.visible=j!==i&&!!o;});
    kamera(v,(w/2)/h);markieren(v.hover,t);
    renderer.setViewport(i*w/2,0,w/2,h);renderer.setScissor(i*w/2,0,w/2,h);
    renderer.render(scene,camera);
   });
   renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
   return;
  }
  figuren.forEach(f=>f.visible=false);
  kamera(st,w/h);markieren(st.hover,t);
  renderer.render(scene,camera);
 }
 return {frame,resize,setProfi,renderer};
}
window.ShopRender={init};
window.dispatchEvent(new Event('shoprender'));
