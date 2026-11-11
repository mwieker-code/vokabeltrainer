/* =========================================================================
   3D-DARSTELLUNG fuer "Find your way!" (three.js, liegt in vendor/).
   Baut aus der Logik-Welt (logik.js) Flure, Waende, Tueren mit
   Raumschildern, Innenhof mit Ententeich und Schulhof. Die Spielsteuerung
   (spiel.js) ruft nur init() und frame() auf.
   1 Plan-Pixel = 0,1 m. Welt: x = Osten, z = Sueden, y = oben.
   ========================================================================= */
import * as THREE from './vendor/three.module.min.js';

const S=0.1, STOCK=3.6, DECKE=3.2, T=0.16;

/* ---------- Geometrie sammeln: eine Mesh je Material ---------- */
class Bau{
 constructor(){this.p=[];this.n=[];this.u=[];}
 face(pts,uvs,nx,ny,nz){
  const [a,b,c]=pts,ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
  let P=pts,U=uvs;if(cx*nx+cy*ny+cz*nz<0){P=[pts[0],pts[3],pts[2],pts[1]];U=[uvs[0],uvs[3],uvs[2],uvs[1]];}
  for(const k of [0,1,2,0,2,3]){this.p.push(...P[k]);this.n.push(nx,ny,nz);this.u.push(...U[k]);}
 }
 box(x1,y1,z1,x2,y2,z2,s=1,ohne){
  if(x1>x2)[x1,x2]=[x2,x1];if(y1>y2)[y1,y2]=[y2,y1];if(z1>z2)[z1,z2]=[z2,z1];
  const f=(pts,n,uv)=>this.face(pts,uv,...n);
  const U=(a,b)=>[a/s,b/s];
  if(!(ohne&&ohne.ny))f([[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]],[0,-1,0],[U(x1,z1),U(x2,z1),U(x2,z2),U(x1,z2)]);
  f([[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]],[0,1,0],[U(x1,z1),U(x2,z1),U(x2,z2),U(x1,z2)]);
  f([[x1,y1,z1],[x1,y2,z1],[x1,y2,z2],[x1,y1,z2]],[-1,0,0],[U(z1,y1),U(z1,y2),U(z2,y2),U(z2,y1)]);
  f([[x2,y1,z1],[x2,y2,z1],[x2,y2,z2],[x2,y1,z2]],[1,0,0],[U(z1,y1),U(z1,y2),U(z2,y2),U(z2,y1)]);
  f([[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]],[0,0,-1],[U(x1,y1),U(x2,y1),U(x2,y2),U(x1,y2)]);
  f([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],[0,0,1],[U(x1,y1),U(x2,y1),U(x2,y2),U(x1,y2)]);
 }
 boden(x1,z1,x2,z2,y,s=1,unten){
  const pts=[[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]],uv=[[x1/s,z1/s],[x2/s,z1/s],[x2/s,z2/s],[x1/s,z2/s]];
  this.face(pts,uv,0,unten?-1:1,0);
 }
 mesh(mat){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
  g.computeBoundingSphere();
  return new THREE.Mesh(g,mat);
 }
}

/* ---------- Texturen aus Canvas ---------- */
function tex(w,h,mal,wrap=true){
 const c=document.createElement('canvas');c.width=w;c.height=h;mal(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 if(wrap){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;
}
const rnd=(n=>()=>{n=(n*16807)%2147483647;return n/2147483647;})(7);
function rauschen(g,w,h,n,farben,gr){for(let i=0;i<n;i++){g.fillStyle=farben[i%farben.length];g.fillRect(rnd()*w,rnd()*h,gr,gr);}}
const TX={
 fliesen:()=>tex(128,128,(g,w,h)=>{g.fillStyle='#D9D3C7';g.fillRect(0,0,w,h);rauschen(g,w,h,500,['rgba(0,0,0,.05)','rgba(255,255,255,.08)'],2);
  g.fillStyle='rgba(90,80,70,.35)';g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);}),
 wand:()=>tex(16,256,(g,w,h)=>{g.fillStyle='#F2ECE0';g.fillRect(0,0,w,h);
  const sockel=h*(1-1.1/STOCK);g.fillStyle='#7FA7B8';g.fillRect(0,sockel,w,h-sockel);g.fillStyle='#5E8798';g.fillRect(0,sockel,w,4);
  g.fillStyle='#8A8174';g.fillRect(0,h-7,w,7);}),
 fassade:()=>tex(16,256,(g,w,h)=>{g.fillStyle='#E7DCC8';g.fillRect(0,0,w,h);g.fillStyle='#B9A88E';g.fillRect(0,h-22,w,22);g.fillStyle='#C9BBA3';g.fillRect(0,0,w,6);}),
 gras:()=>tex(128,128,(g,w,h)=>{g.fillStyle='#6E9F57';g.fillRect(0,0,w,h);rauschen(g,w,h,1400,['#5E8F4A','#7FB065','#679850','#86B86B'],2);}),
 asphalt:()=>tex(128,128,(g,w,h)=>{g.fillStyle='#9C9A95';g.fillRect(0,0,w,h);rauschen(g,w,h,1600,['#8E8C87','#AAA8A3','#93918C'],2);}),
 pflaster:()=>tex(128,128,(g,w,h)=>{g.fillStyle='#B5ADA2';g.fillRect(0,0,w,h);g.strokeStyle='rgba(60,55,50,.35)';g.lineWidth=2;
  for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();for(let x=(y/32)%2*32;x<w;x+=64){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}}}),
 stufen:()=>tex(64,64,(g,w,h)=>{g.fillStyle='#E8C25A';g.fillRect(0,0,w,h);g.fillStyle='#B98E2C';g.fillRect(0,0,w,9);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(0,9,w,4);}),
 decke:()=>tex(64,64,(g,w,h)=>{g.fillStyle='#F4F2EC';g.fillRect(0,0,w,h);g.strokeStyle='rgba(0,0,0,.08)';g.strokeRect(0,0,w,h);}),
 sand:()=>tex(64,64,(g,w,h)=>{g.fillStyle='#D9C08A';g.fillRect(0,0,w,h);rauschen(g,w,h,600,['#CBB07A','#E6CF9C'],2);}),
};

/* ---------- Schilder (ein Atlas fuer alle) ---------- */
function atlas(eintraege){
 const SW=256,SH=128,COLS=8,rows=Math.ceil(eintraege.length/COLS);
 const c=document.createElement('canvas');c.width=SW*COLS;c.height=SH*rows;const g=c.getContext('2d');
 const pos={};
 eintraege.forEach(([key,gross,klein,farbe],k)=>{
  const x=(k%COLS)*SW,y=Math.floor(k/COLS)*SH;
  g.fillStyle='#FFFFFF';g.fillRect(x,y,SW,SH);
  g.fillStyle=farbe||'#1E2A44';g.fillRect(x+6,y+6,SW-12,SH-12);
  g.fillStyle='#FFFFFF';g.textAlign='center';g.textBaseline='middle';
  g.font='800 '+(klein?58:72)+'px Inter, system-ui, sans-serif';
  let fs=klein?58:72;while(g.measureText(gross).width>SW-30&&fs>20){fs-=4;g.font='800 '+fs+'px Inter, system-ui, sans-serif';}
  g.fillText(gross,x+SW/2,y+(klein?50:SH/2+3));
  if(klein){g.font='700 30px Inter, system-ui, sans-serif';g.fillText(klein,x+SW/2,y+97);}
  pos[key]=[x/c.width,1-(y+SH)/c.height,(x+SW)/c.width,1-y/c.height];
 });
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.generateMipmaps=true;
 return {tex:t,pos};
}

export function init(canvas,welt,opts={}){
 const L=window.SchulLogik,K=welt.K;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!opts.mobil,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,opts.mobil?1.5:2));
 const scene=new THREE.Scene();
 const himmel=new THREE.Color('#A9D3F0');scene.background=himmel;scene.fog=new THREE.Fog(himmel,40,170);
 const camera=new THREE.PerspectiveCamera(72,1,0.05,400);camera.rotation.order='YXZ';
 scene.add(new THREE.HemisphereLight(0xF4F8FF,0x8C8270,2.3));
 const sonne=new THREE.DirectionalLight(0xFFF4E0,1.5);sonne.position.set(40,80,25);scene.add(sonne);

 const M={
  fliesen:new THREE.MeshLambertMaterial({map:TX.fliesen()}),
  wand:new THREE.MeshLambertMaterial({map:TX.wand()}),
  fassade:new THREE.MeshLambertMaterial({map:TX.fassade()}),
  dach:new THREE.MeshLambertMaterial({color:'#6F7377'}),
  decke:new THREE.MeshLambertMaterial({map:TX.decke()}),
  stufen:new THREE.MeshLambertMaterial({map:TX.stufen()}),
  gras:new THREE.MeshLambertMaterial({map:TX.gras()}),
  hof:new THREE.MeshLambertMaterial({map:TX.gras(),color:'#E6F2D8'}),
  asphalt:new THREE.MeshLambertMaterial({map:TX.asphalt()}),
  pflaster:new THREE.MeshLambertMaterial({map:TX.pflaster()}),
  sand:new THREE.MeshLambertMaterial({map:TX.sand()}),
  glas:new THREE.MeshLambertMaterial({color:'#CFEAF6',transparent:true,opacity:0.26,depthWrite:false,side:THREE.DoubleSide}),
  fenster:new THREE.MeshLambertMaterial({color:'#4D6F8A',emissive:'#1B2E40'}),
  rahmen:new THREE.MeshLambertMaterial({color:'#4A5160'}),
  tuer:new THREE.MeshLambertMaterial({color:'#B5794A'}),
  zarge:new THREE.MeshLambertMaterial({color:'#8E949C'}),
  hecke:new THREE.MeshLambertMaterial({color:'#4E8A3D'}),
  holz:new THREE.MeshLambertMaterial({color:'#A47A4E'}),
  lampe:new THREE.MeshBasicMaterial({color:'#FFFDF2'}),
  platte:new THREE.MeshLambertMaterial({color:'#3F7F6A'}),
 };
 const B={};const b=k=>B[k]||(B[k]=new Bau());

 /* Schilder */
 const eintraege=welt.rooms.filter(r=>r.door).map(r=>[r.id,r.id,r.art==='wc'?'WC':r.art==='cafe'?'Cafeteria':'',r.art==='wc'?'#2B5C8A':r.art==='cafe'?'#9A4A2B':null]);
 eintraege.push(['@courtyard','Courtyard','',"#3D6B3A"],['@playground','Playground','','#3D6B3A'],['@main entrance','Main entrance','','#3D6B3A'],['@side exit','Exit','','#3D6B3A'],['@up','1st floor ↑','','#8A6A12'],['@down','Ground floor ↓','','#8A6A12']);
 const AT=atlas(eintraege);
 const schildBau=new Bau();
 /* Schild: Mitte (x,y,z), Blickrichtung (nx,nz), Breite, Hoehe */
 const schild=(key,x,y,z,nx,nz,w,h)=>{
  const [u1,v1,u2,v2]=AT.pos[key];const tx=-nz,tz=nx;   // rechts, wenn man auf das Schild schaut: -t
  const p=(a,c)=>[x+tx*a,y+c,z+tz*a];
  schildBau.face([p(w/2,-h/2),p(-w/2,-h/2),p(-w/2,h/2),p(w/2,h/2)],[[u1,v1],[u2,v1],[u2,v2],[u1,v2]],nx,0,nz);
 };

 const fl=(fi)=>fi*STOCK;
 welt.floors.forEach((F,fi)=>{
  const y0=fl(fi),src=F.src,yb=y0+(fi?0.02:0);
  /* Boeden, Decken, Daecher */
  for(const [x,y,w,h] of src.halls){b('fliesen').boden(x*S,y*S,(x+w)*S,(y+h)*S,yb,1.2);b('decke').boden(x*S,y*S,(x+w)*S,(y+h)*S,y0+DECKE,1.2,true);b('dach').boden(x*S,y*S,(x+w)*S,(y+h)*S,y0+STOCK+0.005);}
  for(const [x,y,w,h] of src.stairs){
   const lang=w>=h,B2=b('stufen'),Y=yb+0.006;
   const x1=x*S,z1=y*S,x2=(x+w)*S,z2=(y+h)*S,st=0.32;
   B2.face([[x1,Y,z1],[x2,Y,z1],[x2,Y,z2],[x1,Y,z2]],lang?[[0,x1/st],[0,x2/st],[1,x2/st],[1,x1/st]]:[[0,z1/st],[1,z1/st],[1,z2/st],[0,z2/st]],0,1,0);
   b('decke').boden(x1,z1,x2,z2,y0+DECKE,1.2,true);
  }
  for(const [k,x,y,w,h] of src.outdoor){const m=k==='court'?'hof':k==='yard'?'asphalt':k==='plaza'?'pflaster':'gras';b(m).boden(x*S,y*S,(x+w)*S,(y+h)*S,0.005,m==='asphalt'||m==='pflaster'?2.5:3);}
  for(const [id,x,y,w,h] of src.rooms){b('fassade').box(x*S,y0,y*S,(x+w)*S,y0+STOCK,(y+h)*S,STOCK);b('dach').boden(x*S,y*S,(x+w)*S,(y+h)*S,y0+STOCK+0.006);}
  for(const [x,y,w,h] of src.other){b('fassade').box(x*S,y0,y*S,(x+w)*S,y0+STOCK,(y+h)*S,STOCK);b('dach').boden(x*S,y*S,(x+w)*S,(y+h)*S,y0+STOCK+0.006);}
  /* Deckenlampen auf dem Wegeraster */
  const NL=welt.nav.lagen[fi];
  for(let j=0;j<welt.CH;j+=4)for(let i=(j/4)%2*2;i<welt.CW;i+=4){const c=NL.cls[j*welt.CW+i];if(c!==L.IN&&c!==L.STAIR)continue;
   const X=(i*10+5)*S,Z=(j*10+5)*S;b('lampe').boden(X-0.5,Z-0.25,X+0.5,Z+0.25,y0+DECKE-0.01,1,true);}
  /* Waende */
  for(const s of F.walls){
   const x1=s.x1*S,x2=s.x2*S,z1=s.y1*S,z2=s.y2*S,len=s.h?x2-x1:z2-z1,ht=s.t==='hedge'?1.1:STOCK;
   const stueck=(a,c,ya,yc,mat)=>{ /* a..c entlang der Wand */
    if(c-a<0.005)return;
    if(s.h)b(mat).box(x1+a,ya,z1-T/2,x1+c,yc,z1+T/2,mat==='wand'||mat==='fassade'?STOCK:1);
    else b(mat).box(x1-T/2,ya,z1+a,x1+T/2,yc,z1+c,mat==='wand'||mat==='fassade'?STOCK:1);
   };
   const ende=T/2;
   if(s.t==='hedge'){stueck(-0.2,len+0.2,y0,y0+ht,'hecke');continue;}
   if(s.t==='inner'){stueck(-ende,len+ende,y0,y0+STOCK,'wand');continue;}
   if(s.t==='facade'){stueck(-ende,len+ende,y0,y0+STOCK,'fassade');
    /* dunkle Fenster nach aussen */
    const n=Math.floor((len-0.6)/2.6);
    for(let k=0;k<n;k++){const m=(len-(n-1)*2.6)/2+k*2.6,o=s.s*(T/2+0.02);
     if(s.h)b('fenster').box(x1+m-0.75,y0+0.95,z1+o-0.015,x1+m+0.75,y0+2.45,z1+o+0.015);
     else b('fenster').box(x1+o-0.015,y0+0.95,z1+m-0.75,x1+o+0.015,y0+2.45,z1+m+0.75);}
    continue;}
   /* outer und glass: Oeffnungen mit Glas */
   const glas=s.t==='glass',unten=glas?0.35:0.95,oben=glas?3.0:2.45,raster=glas?1.5:2.6,breit=glas?1.38:1.5;
   const n=Math.max(0,Math.floor((len-0.4)/raster));
   const innen='wand';
   if(!n){stueck(-ende,len+ende,y0,y0+STOCK,innen);continue;}
   const start=(len-n*raster)/2;let pos=-ende;
   for(let k=0;k<n;k++){
    const a=start+k*raster+(raster-breit)/2,c=a+breit;
    stueck(pos,a,y0,y0+STOCK,glas?'rahmen':innen);
    stueck(a,c,y0,y0+unten,glas?'rahmen':innen);stueck(a,c,y0+oben,y0+STOCK,innen);
    if(s.h)b('glas').face([[x1+a,y0+unten,z1],[x1+c,y0+unten,z1],[x1+c,y0+oben,z1],[x1+a,y0+oben,z1]],[[0,0],[1,0],[1,1],[0,1]],0,0,1);
    else b('glas').face([[x1,y0+unten,z1+a],[x1,y0+unten,z1+c],[x1,y0+oben,z1+c],[x1,y0+oben,z1+a]],[[0,0],[1,0],[1,1],[0,1]],1,0,0);
    pos=c;
   }
   stueck(pos,len+ende,y0,y0+STOCK,glas?'rahmen':innen);
  }
  /* Aussentueren: Rahmen und Schild */
  for(const d of F.doors){
   const X=d.x*S,Z=d.y*S,w=L.DOOR*S;
   if(d.horiz){b('rahmen').box(X-w-0.08,y0,Z-0.1,X-w+0.04,y0+2.5,Z+0.1);b('rahmen').box(X+w-0.04,y0,Z-0.1,X+w+0.08,y0+2.5,Z+0.1);b('rahmen').box(X-w-0.08,y0+2.5,Z-0.1,X+w+0.08,y0+STOCK,Z+0.1);
    schild('@'+d.name,X,y0+2.95,Z-0.11,0,-1,1.4,0.42);schild('@'+d.name,X,y0+2.95,Z+0.11,0,1,1.4,0.42);
    b('zarge').boden(X-w,Z-0.6,X+w,Z+0.6,0.012);}
   else{b('rahmen').box(X-0.1,y0,Z-w-0.08,X+0.1,y0+2.5,Z-w+0.04);b('rahmen').box(X-0.1,y0,Z+w-0.04,X+0.1,y0+2.5,Z+w+0.08);b('rahmen').box(X-0.1,y0+2.5,Z-w-0.08,X+0.1,y0+STOCK,Z+w+0.08);
    schild('@'+d.name,X-0.11,y0+2.95,Z,-1,0,1.4,0.42);schild('@'+d.name,X+0.11,y0+2.95,Z,1,0,1.4,0.42);
    b('zarge').boden(X-0.6,Z-w,X+0.6,Z+w,0.012);}
  }
  /* Treppenschilder an der Treppe */
  src.stairs.forEach(([x,y,w,h])=>{
   const key=fi===0?'@up':'@down',X=(x+w/2)*S,Z=(y+h/2)*S;
   for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]])schild(key,X+nx*0.06,y0+2.75,Z+nz*0.06,nx,nz,1.1,0.4);
   b('rahmen').box(X-0.05,y0+2.95,Z-0.05,X+0.05,y0+DECKE,Z+0.05);
  });
 });

 /* Raumtueren und Schilder */
 for(const r of welt.rooms){if(!r.door)continue;
  const d=r.door,y0=fl(r.f),X=d.x*S,Z=d.y*S,nx=d.nx,nz=d.ny,tx=-nz,tz=nx,o=T/2;
  const brett=(a1,a2,yb,yt,t1,t2,mat)=>{const p1=[X+tx*a1+nx*t1,Z+tz*a1+nz*t1],p2=[X+tx*a2+nx*t2,Z+tz*a2+nz*t2];b(mat).box(p1[0],y0+yb,p1[1],p2[0],y0+yt,p2[1]);};
  brett(-0.62,0.62,0,2.2,o-0.01,o+0.025,'zarge');
  brett(-0.5,0.5,0,2.1,o+0.02,o+0.05,'tuer');
  brett(0.3,0.42,1.0,1.06,o+0.05,o+0.1,'zarge');
  schild(r.id,X+nx*(o+0.03),y0+2.45,Z+nz*(o+0.03),nx,nz,0.56,0.28);
  /* Fahnenschild quer zum Flur, von beiden Seiten lesbar */
  const a=0.95,ax=X+tx*a,az=Z+tz*a,aus=0.34;
  brett(0.93,0.97,2.42,2.86,o,o+0.62,'rahmen');
  schild(r.id,ax+tx*0.025+nx*(o+aus),y0+2.64,az+tz*0.025+nz*(o+aus),tx,tz,0.48,0.24);
  schild(r.id,ax-tx*0.025+nx*(o+aus),y0+2.64,az-tz*0.025+nz*(o+aus),-tx,-tz,0.48,0.24);
 }

 /* Gelaende */
 b('gras').boden(-20,-20,150,130,-0.02,3);
 const eg=welt.floors[0].src;
 /* Teich mit Enten */
 const [px,py,pw,ph]=eg.pond;const pcx=(px+pw/2)*S,pcz=(py+ph/2)*S,prx=pw/2*S,prz=ph/2*S;
 const teich=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshLambertMaterial({color:'#4E9CC4'}));
 teich.rotation.x=-Math.PI/2;teich.scale.set(prx,prz,1);teich.position.set(pcx,0.03,pcz);scene.add(teich);
 const rand=new THREE.Mesh(new THREE.RingGeometry(1,1.12,40),new THREE.MeshLambertMaterial({color:'#9C958A'}));
 rand.rotation.x=-Math.PI/2;rand.scale.set(prx,prz,1);rand.position.set(pcx,0.025,pcz);scene.add(rand);
 const enten=[];
 const entenMat={k:new THREE.MeshLambertMaterial({color:'#8A6A4A'}),w:new THREE.MeshLambertMaterial({color:'#F2EEE4'}),g:new THREE.MeshLambertMaterial({color:'#2F7D4A'}),o:new THREE.MeshLambertMaterial({color:'#F0A030'})};
 for(let k=0;k<3;k++){
  const e=new THREE.Group(),kg=new THREE.SphereGeometry(0.17,14,10);
  const koerper=new THREE.Mesh(kg,k===1?entenMat.w:entenMat.k);koerper.scale.set(1.35,0.75,0.9);koerper.position.y=0.08;e.add(koerper);
  const kopf=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,8),k===1?entenMat.w:entenMat.g);kopf.position.set(0.18,0.24,0);e.add(kopf);
  const schnabel=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.03,0.06),entenMat.o);schnabel.position.set(0.29,0.23,0);e.add(schnabel);
  e.userData={r:0.45+k*0.22,v:(k%2?-1:1)*(0.25+k*0.08),p:k*2.1};scene.add(e);enten.push(e);
 }
 /* Baeume */
 const stamm=new THREE.CylinderGeometry(0.16,0.22,2.6,8),krone=new THREE.IcosahedronGeometry(1.9,1);
 const sm=new THREE.MeshLambertMaterial({color:'#6B4E33'}),km=[new THREE.MeshLambertMaterial({color:'#4C8A43',flatShading:true}),new THREE.MeshLambertMaterial({color:'#5E9C4C',flatShading:true})];
 eg.trees.forEach(([x,y],k)=>{const X=x*S,Z=y*S;const s1=new THREE.Mesh(stamm,sm);s1.position.set(X,1.3,Z);scene.add(s1);
  const k1=new THREE.Mesh(krone,km[k%2]);k1.position.set(X,3.6,Z);k1.scale.setScalar(1+(k%3)*0.15);scene.add(k1);
  const k2=new THREE.Mesh(krone,km[(k+1)%2]);k2.position.set(X+0.6,4.6,Z-0.3);k2.scale.setScalar(0.65);scene.add(k2);});
 /* Schulhof: Klettergeruest, Sandkasten, Tischtennis, Baenke */
 const yard=eg.outdoor.find(o=>o[0]==='yard'&&o[4]>200);
 if(yard){const yx=yard[1]*S,yz=yard[2]*S;
  const kx=yx+9,kz=yz+20;
  for(let i=0;i<5;i++)for(const dz of [0,2.4])b('holz').box(kx+i*1.6-0.07,0,kz+dz-0.07,kx+i*1.6+0.07,2.4,kz+dz+0.07);
  for(const h of [1.2,2.3])for(const dz of [0,2.4])b('holz').box(kx-0.1,h,kz+dz-0.05,kx+6.5,h+0.1,kz+dz+0.05);
  for(let i=0;i<5;i++)b('holz').box(kx+i*1.6-0.05,2.3,kz,kx+i*1.6+0.05,2.4,kz+2.4);
  b('holz').box(kx+7.2,0,kz+0.4,kx+8.8,1.2,kz+2);b('rahmen').box(kx+6.5,1.15,kz+0.8,kx+10.5,1.25,kz+1.6);
  b('holz').box(yx+6,0,yz+30,yx+20,0.3,yz+36);b('sand').box(yx+6.2,0.3,yz+30.2,yx+19.8,0.32,yz+35.8,2);
  b('platte').box(yx+24,0.7,yz+8,yx+26.74,0.76,yz+9.53);b('zarge').box(yx+25.3,0,yz+8.5,yx+25.44,0.7,yz+9.03);b('rahmen').box(yx+25.34,0.76,yz+8,yx+25.4,0.92,yz+9.53);
  for(const [bx,bz] of [[yx+2,yz+5],[yx+30,yz+38]]){b('holz').box(bx,0.42,bz,bx+2,0.48,bz+0.45);b('rahmen').box(bx+0.1,0,bz+0.1,bx+0.2,0.42,bz+0.35);b('rahmen').box(bx+1.8,0,bz+0.1,bx+1.9,0.42,bz+0.35);}
 }
 const court=eg.outdoor.find(o=>o[0]==='court');
 if(court){const cx=court[1]*S,cz=court[2]*S;for(const [bx,bz] of [[cx+6,cz+12],[cx+30,cz+3]]){b('holz').box(bx,0.42,bz,bx+2,0.48,bz+0.45);b('rahmen').box(bx+0.1,0,bz+0.1,bx+0.2,0.42,bz+0.35);b('rahmen').box(bx+1.8,0,bz+0.1,bx+1.9,0.42,bz+0.35);}}

 for(const [k,bau] of Object.entries(B))if(bau.p.length)scene.add(bau.mesh(M[k]));
 scene.add(schildBau.mesh(new THREE.MeshBasicMaterial({map:AT.tex})));

 /* Zielmarke (nur im leichten Modus) */
 const marke=new THREE.Group();
 const pfeil=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.55,4),new THREE.MeshBasicMaterial({color:'#FFB020'}));pfeil.rotation.x=Math.PI;marke.add(pfeil);
 const ring=new THREE.Mesh(new THREE.RingGeometry(0.45,0.6,32),new THREE.MeshBasicMaterial({color:'#FFB020',transparent:true,opacity:0.7}));ring.rotation.x=-Math.PI/2;marke.add(ring);
 marke.visible=false;scene.add(marke);

 function resize(){const w=canvas.clientWidth||300,h=canvas.clientHeight||300;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 resize();
 function frame(st){
  const y0=fl(st.f)+(st.f?0.02:0);
  camera.position.set(st.x*S,y0+1.55+(st.bob||0),st.y*S);
  camera.rotation.set(st.pitch||0,-st.yaw,0,'YXZ');
  const t=st.t||0;
  enten.forEach(e=>{const u=e.userData,a=t*u.v+u.p;e.position.set(pcx+Math.cos(a)*prx*u.r,0.03+Math.sin(t*2+u.p)*0.01,pcz+Math.sin(a)*prz*u.r);e.rotation.y=-a-(u.v>0?Math.PI/2:-Math.PI/2);});
  if(st.marke){marke.visible=true;const my=fl(st.marke.f)+(st.marke.f?0.02:0);marke.position.set(st.marke.x*S,my,st.marke.y*S);pfeil.position.y=2.2+Math.sin(t*3)*0.12;ring.position.y=0.03;pfeil.rotation.y=t;}
  else marke.visible=false;
  renderer.render(scene,camera);
 }
 return {frame,resize,renderer};
}
window.SchulRender={init};
window.dispatchEvent(new Event('schulrender'));
