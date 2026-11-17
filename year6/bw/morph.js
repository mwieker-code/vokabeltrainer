/* Verwandlung zwischen den Tieren (bisher: Pinguin -> Orca).
   Beide Tiere werden gezeichnet, in Punkte zerlegt, und die Punkte wandern
   ueber einen Schwarz-Weiss-Wirbel in die neue Gestalt. Dazu wechselt die
   Welt: Das Eis reisst, das Meer steigt.
   BWMorph.start(canvas, fertig, {ton}) spielt die Verwandlung einmal ab. */
(function(){
'use strict';
const N=3400,DAUER=4.2,TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};
const rnd=(s=>()=>{s=(s*16807)%2147483647;return s/2147483647;})(4711);

/* ---------- die Tiere ---------- */
function zeichnePinguin(g){Figuren.pinguin(g,256,400,2.6,{wave:0.2,blush:true});}
/* ---------- der Orca: schlanke Form ueber einer gebogenen Wirbelsaeule ----------
   orcaForm(ctx, x, y, k, {rot, schlag, bogen, welle, alpha})
   Blick nach rechts. s = 0 Schnauze ... 1 Schwanzansatz, v = -1 Ruecken ... 1 Bauch.
   bogen = Koerper biegt sich wie beim Sprung, schlag = Schwimmwelle.
   Alle Kanten werden als weiche Kurven gezeichnet. */
function dicke(s){
 /* kraeftiger runder Kopf, Mitte, langer schlanker Schwanzstiel */
 const f=s<0.28?Math.pow(Math.sin(Math.PI/2*s/0.28),0.5):0.17+0.83*Math.pow(Math.cos(Math.PI/2*Math.min(1,(s-0.28)/0.72)),1.15);
 const stirn=2.2*Math.exp(-Math.pow((s-0.09)/0.07,2));
 return [Math.max(0.9,17*f+stirn),Math.max(0.7,13.5*f)];
}
function orcaForm(g,X,Y,k,o){
 o=o||{};const schlag=o.schlag||0,bogen=o.bogen||0,welle=o.welle==null?1:o.welle;
 const ruecken=s=>({x:66-128*s,y:bogen*(30*s*s*s-24*Math.sin(Math.PI*s))+Math.sin(schlag-s*2.6)*s*s*7*welle});
 const tang=s=>{const a=ruecken(Math.max(0,s-0.01)),b=ruecken(Math.min(1,s+0.01)),l=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/l,y:(b.y-a.y)/l};};
 const oben=s=>{const t=tang(s);return {x:-t.y,y:t.x};};
 const P=(s,v,aus)=>{const r=ruecken(s),n=oben(s),[ht,hb]=dicke(s),d=(v<0?-v*ht:-v*hb)+(aus||0);return [r.x+n.x*d,r.y+n.y*d];};
 /* weicher Linienzug: Kurven durch die Mittelpunkte */
 const weich=(pts,zu)=>{g.beginPath();const n=pts.length;
  if(zu){const m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],s0=m(pts[n-1],pts[0]);g.moveTo(s0[0],s0[1]);
   for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],mm=m(a,b);g.quadraticCurveTo(a[0],a[1],mm[0],mm[1]);}}
  else{g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<n-1;i++){const mm=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2];g.quadraticCurveTo(pts[i][0],pts[i][1],mm[0],mm[1]);}g.lineTo(pts[n-1][0],pts[n-1][1]);}
  g.closePath();};
 const N=40,reihe=(a,b,f)=>{const out=[];for(let i=0;i<=N;i++)out.push(f(lerp(a,b,i/N)));return out;};
 /* weiche Kurve durch Stuetzpunkte (Catmull-Rom) */
 const tab=(T,s)=>{for(let i=1;i<T.length;i++)if(s<=T[i][0]){const u=(s-T[i-1][0])/(T[i][0]-T[i-1][0]),p0=T[Math.max(0,i-2)][1],p1=T[i-1][1],p2=T[i][1],p3=T[Math.min(T.length-1,i+1)][1];
  return 0.5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);}return T[T.length-1][1];};
 /* Punkt in einem lokalen Rahmen (Ursprung, Laengsrichtung d, Normale n) */
 const rahmen=(ox,oy,d,n)=>(l,w)=>[ox+d.x*l+n.x*w,oy+d.y*l+n.y*w];
 /* o.farbe: nur Umriss in einer Farbe (Silhouette im Hintergrund) */
 const SCHWARZ=o.farbe||'#10151C',WEISS='#F7F9FB',GRAU='#B9C3CE',flach=!!o.farbe;
 g.save();g.translate(X,Y);if(o.rot)g.rotate(o.rot);g.scale(k,k);if(o.alpha!=null)g.globalAlpha*=o.alpha;
 g.lineJoin='round';
 /* Schwanzflosse: zwei runde Flunken mit Kerbe */
 {const T=ruecken(1),d0=tang(1),n0=oben(1),fa=Math.sin(schlag)*0.35*welle+bogen*0.25,ca=Math.cos(fa),sa=Math.sin(fa);
  const d={x:d0.x*ca-d0.y*sa,y:d0.x*sa+d0.y*ca},n={x:-d.y,y:d.x},F=rahmen(T.x,T.y,d,n);
  const q=[F(-6,3.5),F(6,5),F(14,10),F(24,19),F(30,22),F(28,15),F(22,6),F(19,0),F(22,-6),F(28,-15),F(30,-22),F(24,-19),F(14,-10),F(6,-5),F(-6,-3.5)];
  g.fillStyle=SCHWARZ;weich(q,true);g.fill();}
 /* Rueckenflosse: hoch, vorne gewoelbt, hinten eingebuchtet, Spitze nach hinten */
 {const pts=[P(0.27,-0.92),P(0.29,-1,8),P(0.32,-1,18),P(0.37,-1,28),P(0.43,-1,35),P(0.47,-1,37),P(0.465,-1,31),P(0.445,-1,21),P(0.44,-1,11),P(0.455,-1,3),P(0.49,-0.9)];
  g.fillStyle=SCHWARZ;weich(pts,false);g.fill();}
 /* Koerper */
 const umriss=[...reihe(0,1,s=>P(s,-1)),...reihe(1,0,s=>P(s,1))];
 g.fillStyle=SCHWARZ;weich(umriss,true);g.fill();
 if(!flach){
 g.save();weich(umriss,true);g.clip();
 /* weisser Bauch, der hinten zu einem grossen Flankenfleck aufsteigt */
 const KANTE=[[0,0.25],[0.06,0.36],[0.16,0.5],[0.28,0.6],[0.38,0.62],[0.45,0.5],[0.5,0.18],[0.55,-0.22],[0.6,-0.52],[0.66,-0.66],[0.71,-0.62],[0.74,-0.3],[0.77,0.2],[0.8,0.75],[0.84,1.4]];
 g.fillStyle=WEISS;weich([...reihe(0.004,0.84,s=>P(s,tab(KANTE,s))),...reihe(0.84,0.004,s=>P(s,1.5))],true);g.fill();
 /* grauer Unterkiefer und Kehle wie auf der Vorlage */
 g.fillStyle=GRAU;weich([...reihe(0.02,0.42,s=>P(s,0.98-0.3*Math.sin((s-0.02)/0.4*Math.PI))),...reihe(0.42,0.02,s=>P(s,1.5))],true);g.fill();
 /* Sattelfleck hinter der Rueckenflosse */
 g.fillStyle='#A7B4C2';weich([...reihe(0.44,0.6,s=>P(s,-1.1)),...reihe(0.6,0.44,s=>P(s,-1+0.36*Math.sin((s-0.44)/0.16*Math.PI)))],true);g.fill();
 /* Glanz auf dem Ruecken */
 g.fillStyle='rgba(255,255,255,.09)';weich([...reihe(0.05,0.42,s=>P(s,-0.84)),...reihe(0.42,0.05,s=>P(s,-0.84+0.24*Math.sin((s-0.05)/0.37*Math.PI)))],true);g.fill();
 g.restore();
 /* Augenfleck: laengliches Oval, hinten nach oben */
 }
 if(!flach){const a=[];for(let i=0;i<20;i++){const w=i/20*Math.PI*2;a.push(P(0.15+0.055*Math.cos(w),-0.32+0.15*Math.sin(w)-0.12*Math.cos(w)));}g.fillStyle=WEISS;weich(a,true);g.fill();}
 /* Brustflosse: rundes Paddel nach hinten unten */
 {const s0=0.2,wurzel=P(s0,0.75),t=tang(s0),n=oben(s0),dw=0.6+Math.sin(schlag+1)*0.15*welle;
  const d={x:t.x*Math.cos(dw)-n.x*Math.sin(dw),y:t.y*Math.cos(dw)-n.y*Math.sin(dw)},q={x:-d.y,y:d.x},F=rahmen(wurzel[0],wurzel[1],d,q);
  g.fillStyle=SCHWARZ;weich([F(-2,-4.5),F(5,-6.5),F(14,-6.5),F(21,-4),F(24,0),F(21,3.5),F(12,4.5),F(4,4.5),F(-2,4)],true);g.fill();}
 /* Auge und Maulspalte */
 if(!flach){const au=P(0.085,-0.02);g.fillStyle='#FFFFFF';g.beginPath();g.arc(au[0],au[1],1.5,0,TAU);g.fill();
 const m1=P(0.004,0.15),m2=P(0.05,0.28),m3=P(0.1,0.3);g.strokeStyle='rgba(16,21,28,.5)';g.lineWidth=1.1;g.lineCap='round';g.beginPath();g.moveTo(m1[0],m1[1]);g.quadraticCurveTo(m2[0],m2[1],m3[0],m3[1]);g.stroke();}
 g.restore();
}
/* Sprung-Pose fuer die Verwandlung (auch der Startpunkt fuer das Gleiten ins Spiel) */
const SPR={x:262,y:230,k:2.4,rot:-0.22,bogen:1};
function zeichneOrca(g){orcaForm(g,SPR.x,SPR.y,SPR.k,{rot:SPR.rot,bogen:SPR.bogen,welle:0});}
function bauen(zeichne){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');zeichne(g);
 const d=g.getImageData(0,0,512,512).data;let x0=512,y0=512,x1=0,y1=0;const pts=[];
 for(let y=0;y<512;y+=2)for(let x=0;x<512;x+=2){const i=(y*512+x)*4;if(d[i+3]>140){pts.push([x,y,d[i],d[i+1],d[i+2]]);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
 const cx=(x0+x1)/2,cy=(y0+y1)/2,gr=Math.max(x1-x0,y1-y0);
 const wahl=[];for(let i=0;i<N;i++){const p=pts[Math.floor(rnd()*pts.length)];
  const lum=(p[2]*0.3+p[3]*0.59+p[4]*0.11);
  wahl.push({x:(p[0]-cx)/gr,y:(p[1]-cy)/gr,r:p[2],g:p[3],b:p[4],hell:lum>140?1:0,w:Math.atan2(p[1]-cy,p[0]-cx)});}
 wahl.sort((a,b)=>(a.hell-b.hell)||(a.w-b.w));
 return {bild:c,cx,cy,gr,punkte:wahl};
}
/* erst bei Bedarf zeichnen - ohne Zeichenflaeche (Tests) passiert nichts */
function zeichnePanda(g){if(window.PandaFigur)window.PandaFigur.panda(g,256,440,3.3,{mood:'froh'});}
function zeichneZebra(g){if(window.ZebraFigur)window.ZebraFigur.seite(g,236,440,2.6,{mood:'froh'});}
let TIERE=null;const tiere=()=>TIERE||(TIERE={pinguin:bauen(zeichnePinguin),orca:bauen(zeichneOrca),panda:bauen(zeichnePanda),zebra:bauen(zeichneZebra)});
function sprite(name){try{return tiere()[name]||null;}catch(e){return null;}}

/* opt.fluss (Pinguin -> Orca ohne Schnitt):
   vorher  {update(dt), zeichne(cv), punkt()}  das alte Spiel laeuft noch kurz (Kopfsprung),
           punkt() = wo das Tier ins Wasser taucht (Bildschirm-Pixel)
   nachher {feld(), zeichne(cv,b,h), pose()}   das neue Spiel: Rahmen, Bild, Lage des Orcas
   ui()    wird aufgerufen, wenn Leiste und Knoepfe einblenden sollen */
function start(cv,fertig,opt){
const ctx=cv.getContext('2d');opt=opt||{};
const F=opt.fluss||null,VOR=F?1.25:0,GL0=4.2,GL1=5.5,ENDE=F?GL1+0.05:DAUER+0.9;
let schnapp=null,sprung=null,off=null,uiDa=false;

/* ---------- Punkte ---------- */
const P=[];for(let i=0;i<N;i++)P.push({s1:rnd(),s2:rnd(),s3:rnd(),s4:rnd()});
let von=opt.von||'pinguin',nach=opt.nach||'orca',t=-VOR,zeit=2,manuell=false,ende=false;
const W=()=>cv.clientWidth,H=()=>cv.clientHeight;
function groesse(){const d=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(W()*d);cv.height=Math.round(H()*d);ctx.setTransform(d,0,0,d,0,0);spur.width=cv.width;spur.height=cv.height;sg.setTransform(d,0,0,d,0,0);}
const spur=document.createElement('canvas'),sg=spur.getContext('2d');

/* ---------- Umgebung: Eis und Meer ---------- */
const flocken=[...Array(70)].map(()=>({x:rnd(),y:rnd(),v:0.03+rnd()*0.06,r:1+rnd()*2}));
const blasen=[...Array(46)].map(()=>({x:rnd(),y:rnd(),v:0.04+rnd()*0.08,r:2+rnd()*5}));
function eis(w,h,risse){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#8FC7EE');g.addColorStop(0.55,'#D8EEFA');g.addColorStop(0.56,'#EAF5FC');g.addColorStop(1,'#BBD9EE');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#C9E2F4';ctx.beginPath();ctx.moveTo(0,h*0.56);for(let i=0;i<=8;i++)ctx.lineTo(w*i/8,h*(0.56-(i%2?0.09:0.03)-((i*37)%5)*0.012));ctx.lineTo(w,h*0.56);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.85)';for(const f of flocken){const y=((f.y+zeit*f.v)%1)*h,x=(f.x+Math.sin(zeit*0.6+f.y*9)*0.02)*w;ctx.beginPath();ctx.arc(x,y,f.r,0,TAU);ctx.fill();}
 if(risse>0){ctx.strokeStyle='rgba(40,90,140,'+0.7*risse+')';ctx.lineWidth=2.5;const cx=w/2,cy=h*0.66;
  for(let k=0;k<9;k++){const a=k/9*TAU+0.3;ctx.beginPath();ctx.moveTo(cx,cy);let x=cx,y=cy;for(let n=1;n<=6;n++){const l=risse*Math.min(w,h)*0.11;x+=Math.cos(a+Math.sin(k*7+n)*0.5)*l;y+=Math.sin(a+Math.sin(k*7+n)*0.5)*l*0.45;ctx.lineTo(x,y);}ctx.stroke();}}
}
function meer(w,h){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#3FA7D6');g.addColorStop(0.5,'#1C6E9E');g.addColorStop(1,'#0B2F4E');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let k=0;k<6;k++){const x=w*(0.1+k*0.17)+Math.sin(zeit*0.4+k)*30;const lg=ctx.createLinearGradient(x,0,x+h*0.25,h);lg.addColorStop(0,'rgba(190,235,255,.16)');lg.addColorStop(1,'rgba(190,235,255,0)');
  ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(x-18,0);ctx.lineTo(x+18,0);ctx.lineTo(x+h*0.3+60,h);ctx.lineTo(x+h*0.3-60,h);ctx.fill();}
 ctx.restore();
 ctx.strokeStyle='rgba(220,245,255,.5)';ctx.lineWidth=1.5;for(const b of blasen){const y=(1-((b.y+zeit*b.v)%1))*h,x=(b.x+Math.sin(zeit+b.y*20)*0.01)*w;ctx.beginPath();ctx.arc(x,y,b.r,0,TAU);ctx.stroke();}
}
/* Bambuswald fuer den Panda */
function wald(w,h){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#BFE3D0');g.addColorStop(0.55,'#EEF5E0');g.addColorStop(0.56,'#9CCB7A');g.addColorStop(1,'#5E9A45');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#A9C9B6';ctx.beginPath();ctx.moveTo(0,h*0.56);for(let i=0;i<=8;i++){const x=w*i/8,hh=h*(0.18+((i*37)%5)*0.03);ctx.quadraticCurveTo(x-w/16,h*0.56-hh,x,h*0.56-hh*0.2);}ctx.lineTo(w,h*0.56);ctx.fill();
 for(let i=0;i<14;i++){const x=(i/13)*w+Math.sin(i*7)*12,dx=Math.sin(zeit*0.8+i)*4,d=6+(i%3)*3;ctx.fillStyle=i%2?'#6FA64E':'#5F9450';ctx.fillRect(x+dx-d/2,0,d,h*0.6);
  ctx.fillStyle='rgba(30,60,20,.3)';for(let y=h*0.58;y>0;y-=46)ctx.fillRect(x+dx-d/2-1,y,d+2,2.4);}
 ctx.fillStyle='rgba(140,195,100,.85)';for(const f of flocken){const y=((f.y+zeit*f.v*0.6)%1)*h,x=(f.x+Math.sin(zeit*0.9+f.y*9)*0.03)*w;ctx.beginPath();ctx.ellipse(x,y,f.r*2.2,f.r*0.9,zeit+f.x*9,0,TAU);ctx.fill();}
}
/* Savanne fuer das Zebra */
function savanne(w,h){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#F7A65C');g.addColorStop(0.5,'#FDE7B5');g.addColorStop(0.51,'#D9B26A');g.addColorStop(1,'#B98F47');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#FFF1C9';ctx.beginPath();ctx.arc(w*0.68,h*0.36,Math.min(w,h)*0.09,0,TAU);ctx.fill();
 ctx.fillStyle='#C98F6B';ctx.beginPath();ctx.moveTo(w*0.05,h*0.51);ctx.quadraticCurveTo(w*0.3,h*0.36,w*0.42,h*0.34);ctx.lineTo(w*0.52,h*0.34);ctx.quadraticCurveTo(w*0.65,h*0.38,w*0.9,h*0.51);ctx.fill();
 for(let i=0;i<5;i++){const x=w*(0.1+i*0.2)+Math.sin(i*5)*20,y=h*(0.62+0.06*(i%2)),s=Math.min(w,h)/360*(0.8+0.3*(i%2));
  ctx.fillStyle='#6B4A2E';ctx.fillRect(x-2*s,y-40*s,4*s,40*s);ctx.fillStyle='#6E9440';ctx.beginPath();ctx.ellipse(x,y-46*s,38*s,10*s,0,0,TAU);ctx.fill();}
 ctx.fillStyle='rgba(255,240,200,.6)';for(const f of flocken){const y=((f.y+zeit*f.v*0.3)%1)*h,x=(f.x+Math.sin(zeit*0.5+f.y*9)*0.02)*w;ctx.beginPath();ctx.arc(x,y,f.r*0.8,0,TAU);ctx.fill();}
}
const LANDSCHAFT={pinguin:(w,h,r)=>eis(w,h,r),panda:(w,h)=>wald(w,h),zebra:(w,h)=>savanne(w,h)};
const land=(w,h,risse)=>(LANDSCHAFT[nach==='orca'?von:nach]||LANDSCHAFT.pinguin)(w,h,risse);
const welt=(w,h)=>nach==='orca'?meer(w,h):(LANDSCHAFT[nach]||LANDSCHAFT.pinguin)(w,h,0);
function umgebung(w,h,u,risse){
 /* u: 0 = Welt des Starttiers, 1 = Welt des Zieltiers; dazwischen steigt bzw. faellt das Wasser */
 if(F&&nach==='orca')return meer(w,h);
 /* zwischen zwei Landschaften: ueberblenden */
 if(von!=='orca'&&nach!=='orca'){(LANDSCHAFT[von]||LANDSCHAFT.pinguin)(w,h,0);if(u>0){ctx.save();ctx.globalAlpha=u;LANDSCHAFT[nach](w,h,0);ctx.restore();}return;}
 const zuMeer=nach==='orca',wasser=zuMeer?u:1-u;
 if(wasser<=0)return land(w,h,risse);
 if(wasser>=1)return meer(w,h);
 land(w,h,zuMeer?1:0);
 const kante=h*(1.08-wasser*1.2);
 ctx.save();ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,kante);
 for(let x=0;x<=w;x+=12)ctx.lineTo(x,kante+Math.sin(x*0.02+zeit*5)*10+Math.sin(x*0.05-zeit*7)*5);
 ctx.lineTo(w,h);ctx.closePath();ctx.clip();meer(w,h);ctx.restore();
 ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=5;ctx.beginPath();
 for(let x=0;x<=w;x+=12){const y=kante+Math.sin(x*0.02+zeit*5)*10+Math.sin(x*0.05-zeit*7)*5;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
}

/* ---------- ein Bild ---------- */
function tierBild(name,cx,cy,gr,alpha,extra){
 if(alpha<=0)return;const T=tiere()[name],k=gr/T.gr;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);if(extra)extra();ctx.scale(k,k);ctx.drawImage(T.bild,-T.cx,-T.cy);ctx.restore();
}
function bild(){
 if(F&&t<0&&!manuell){F.vorher.zeichne(cv);return;}
 {const d=Math.min(window.devicePixelRatio||1,2);if(cv.width!==Math.round(W()*d)||cv.height!==Math.round(H()*d))groesse();ctx.setTransform(d,0,0,d,0,0);}
 if(F&&!schnapp){schnapp=document.createElement('canvas');schnapp.width=cv.width;schnapp.height=cv.height;schnapp.getContext('2d').drawImage(cv,0,0);sprung=F.vorher.punkt();}
 if(F&&t>=GL0)return gleiten();
 const w=W(),h=H(),m=Math.min(w,h);
 const cx=w/2,cy=h*0.52,gr=m*0.62;
 const tt=t<0?0:Math.min(t,DAUER);
 const laden=smooth(0,0.8,tt),aufl=smooth(0.7,1.5,tt),form=smooth(2.3,3.4,tt),an=smooth(3.3,3.75,tt);
 const zoom=1+0.12*Math.sin(Math.PI*smooth(0,3.6,tt)),beben=tt>3.3&&tt<3.8?(1-(tt-3.3)/0.5)*8:0;
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-w/2+Math.sin(zeit*60)*beben,-h/2+Math.cos(zeit*53)*beben);
 umgebung(w,h,smooth(1.9,3.3,tt),nach==='orca'?laden:0);
 if(F&&schnapp&&tt<0.95){const e=smooth(0,0.9,tt);ctx.globalAlpha=1-smooth(0.55,0.95,tt);ctx.drawImage(schnapp,0,-h*e*0.9*(F.richtung||1),w,h);ctx.globalAlpha=1;}
 /* Lichthof beim Aufladen */
 if(tt>0&&tt<3.9){const a=Math.sin(Math.PI*clamp(tt/3.9,0,1));const g=ctx.createRadialGradient(cx,cy,0,cx,cy,gr*0.95);
  g.addColorStop(0,'rgba(255,255,255,'+0.55*a+')');g.addColorStop(0.5,'rgba(190,230,255,'+0.22*a+')');g.addColorStop(1,'rgba(190,230,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 /* ruhendes Tier davor und danach */
 const wippen=Math.sin(zeit*2.2)*m*0.008;
 if(t<0)tierBild(von,cx,cy+wippen,gr,1,von==='orca'?()=>ctx.rotate(Math.sin(zeit*1.6)*0.05):null);
 else{
  if(F&&sprung){const e=smooth(0,0.7,tt);tierBild(von,lerp(sprung.x,cx,e),lerp(sprung.y+gr*0.2,cy,e),gr*lerp(0.22,1+laden*0.06,e),(1-smooth(0.75,1.05,tt))*smooth(0,0.15,tt),()=>ctx.rotate((1-e)*2.1));}
  else tierBild(von,cx,cy,gr*(1+laden*0.06),1-smooth(0.75,1.05,tt));
  tierBild(nach,cx,cy,gr*(1.1-0.1*smooth(3.2,3.9,tt)),smooth(3.15,3.6,tt),nach==='orca'?()=>ctx.rotate((1-smooth(3.2,4.2,tt))*-0.5):()=>ctx.translate(0,-(1-smooth(3.2,4.0,tt))*m*0.05));
 }
 ctx.restore();
 /* Punkte mit Leuchtspur */
 sg.save();sg.globalCompositeOperation='destination-out';sg.fillStyle='rgba(0,0,0,'+(t<0?1:0.22)+')';sg.fillRect(0,0,w,h);sg.restore();
 if(t>=0&&tt>0.7&&tt<3.75){
  const A=tiere()[von].punkte,B=tiere()[nach].punkte,sichtbar=smooth(0.7,1.0,tt)*(1-smooth(3.35,3.75,tt));
  const dreh=tt*2.6,R=gr*0.5;
  for(let i=0;i<N;i++){
   const a=A[i],b=B[i],p=P[i];
   const zoeg=p.s1*0.45;
   const ka=smooth(0.7+zoeg*0.5,1.6+zoeg*0.5,tt),kb=smooth(2.3+zoeg,3.15+zoeg*0.55,tt);
   /* Wirbel: zwei Spiralarme, einer schwarz, einer weiss */
   const rad=Math.sqrt(p.s2)*R*(0.25+0.75*(1-0.35*Math.sin(tt*3+p.s3*6))),arm=(b.hell?Math.PI:0);
   const win=arm+rad/R*4.2+dreh*(1.3-rad/R*0.5)+(p.s3-0.5)*2.5*(1-rad/R*0.45);
   const wx=cx+Math.cos(win)*rad,wy=cy+Math.sin(win)*rad*0.86;
   /* Auseinanderstieben beim Aufloesen */
   const sto=Math.sin(Math.PI*ka)*gr*0.35*(0.4+p.s4);
   const ax=cx+a.x*gr*(1+laden*0.06)+Math.cos(a.w+p.s3)*sto,ay=cy+a.y*gr*(1+laden*0.06)+Math.sin(a.w+p.s3)*sto;
   let x=lerp(ax,wx,ka),y=lerp(ay,wy,ka);
   x=lerp(x,cx+b.x*gr,kb);y=lerp(y,cy+b.y*gr,kb);
   const f=smooth(1.3,2.9,tt+zoeg*0.4),r=lerp(a.r,b.r,f),g=lerp(a.g,b.g,f),bl=lerp(a.b,b.b,f);
   const gro=(1.4+p.s4*1.9)*(1+1.6*Math.sin(Math.PI*smooth(0.9,3.3,tt))*p.s2)*m/520;
   sg.globalAlpha=sichtbar;sg.fillStyle='rgb('+(r|0)+','+(g|0)+','+(bl|0)+')';
   sg.beginPath();sg.arc(x,y,gro,0,TAU);sg.fill();
   if(i%9===0&&b.hell){sg.globalAlpha=sichtbar*0.35;sg.fillStyle='#FFFFFF';sg.beginPath();sg.arc(x,y,gro*2.6,0,TAU);sg.fill();}
  }
  sg.globalAlpha=1;
 }
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(spur,0,0);ctx.restore();
 /* Ankommen: Blitz und Druckwelle */
 if(tt>3.25&&tt<4.1){const k=(tt-3.25)/0.85;
  ctx.fillStyle='rgba(255,255,255,'+0.75*Math.pow(1-clamp((tt-3.25)/0.35,0,1),2)+')';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,'+(1-k)+')';ctx.lineWidth=10*(1-k)+1;ctx.beginPath();ctx.arc(cx,cy,gr*(0.3+k*1.1),0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(16,21,28,'+0.5*(1-k)+')';ctx.lineWidth=6*(1-k)+1;ctx.beginPath();ctx.arc(cx,cy,gr*(0.2+k*0.9),0,TAU);ctx.stroke();}
}

/* ---------- Gleiten: der Orca schwimmt in sein Spiel ---------- */
function gleiten(){
 const w=W(),h=H(),m=Math.min(w,h),cx=w/2,cy=h*0.52,gr=m*0.62,e=smooth(GL0,GL1,t),fr=F.nachher.feld();
 if(!uiDa&&t>=GL0+0.4){uiDa=true;if(F.ui)F.ui();}
 const R={x:lerp(0,fr.x,e),y:lerp(0,fr.y,e),w:lerp(w,fr.w,e),h:lerp(h,fr.h,e)},rad=lerp(0,22,e);
 ctx.clearRect(0,0,w,h);
 ctx.save();ctx.beginPath();if(ctx.roundRect)ctx.roundRect(R.x,R.y,R.w,R.h,rad);else ctx.rect(R.x,R.y,R.w,R.h);ctx.clip();
 welt(w,h);
 off=off||document.createElement('canvas');
 try{F.nachher.zeichne(off,fr.w,fr.h);}catch(err){}
 const d=Math.min(window.devicePixelRatio||1,2);ctx.setTransform(d,0,0,d,0,0);
 ctx.globalAlpha=smooth(0.05,0.75,e);ctx.drawImage(off,R.x,R.y,R.w,R.h);ctx.globalAlpha=1;
 ctx.restore();
 if(nach!=='orca'){
  /* Panda, Zebra: das Bild aus der Verwandlung wird zur Spielfigur an ihrem Platz */
  const p=F.nachher.pose(),s1=R.w/360,f=smooth(GL0,GL1-0.2,t),x1=R.x+p.x*s1,y1=R.y+p.y*s1,k1=p.k*s1,hh=(p.hoehe||80)*k1;
  tierBild(nach,lerp(cx,x1,f),lerp(cy,y1-hh*0.5,f),lerp(gr,hh*1.05,f),1-smooth(0.55,0.92,f));
  if(p.figur&&f>0.5){ctx.save();ctx.globalAlpha=smooth(0.55,0.92,f);p.figur(ctx,x1,y1,k1);ctx.restore();}
  return;
 }
 /* Orca: von der Sprung-Pose in die Schwimm-Pose */
 const T=tiere()[nach],ks=gr/T.gr,p=F.nachher.pose(),s1=R.w/360,f=smooth(GL0,GL1-0.15,t);
 const x=lerp(cx+(SPR.x-T.cx)*ks,R.x+p.x*s1,f),y=lerp(cy+(SPR.y-T.cy)*ks,R.y+p.y*s1,f);
 orcaForm(ctx,x,y,lerp(SPR.k*ks,p.k*s1,f),{rot:lerp(SPR.rot,p.rot,f),bogen:lerp(SPR.bogen,0,f),schlag:zeit*7,welle:f});
 /* Blasen hinter dem Orca */
 ctx.strokeStyle='rgba(220,245,255,'+0.6*(1-e)+')';ctx.lineWidth=1.5;
 for(let i=0;i<14;i++){const u=((zeit*0.9+i/14)%1),bx=x-(30+u*120)*lerp(ks*2,s1,f),by=y-u*40+Math.sin(i*3+zeit*4)*8;ctx.beginPath();ctx.arc(bx,by,2+((i*7)%5),0,TAU);ctx.stroke();}
}

/* ---------- Klang ---------- */
let ac=null;
function klang(spaeter){
 try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
 const t0=ac.currentTime+0.02+(spaeter||0),aus=ac.createGain();aus.gain.value=0.5;aus.connect(ac.destination);
 const buf=ac.createBuffer(1,ac.sampleRate*3.5,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=buf;f.type='bandpass';f.Q.value=2.5;
 f.frequency.setValueAtTime(180,t0);f.frequency.exponentialRampToValueAtTime(4200,t0+3.3);
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(0.5,t0+2.9);g.gain.exponentialRampToValueAtTime(0.0001,t0+3.45);
 s.connect(f);f.connect(g);g.connect(aus);s.start(t0);s.stop(t0+3.5);
 const o=ac.createOscillator(),og=ac.createGain();o.type='sine';o.frequency.setValueAtTime(110,t0);o.frequency.exponentialRampToValueAtTime(880,t0+3.3);
 og.gain.setValueAtTime(0.0001,t0);og.gain.exponentialRampToValueAtTime(0.18,t0+3.0);og.gain.exponentialRampToValueAtTime(0.0001,t0+3.4);o.connect(og);og.connect(aus);o.start(t0);o.stop(t0+3.5);
 [523.25,659.25,783.99,1046.5,1318.5].forEach((fq,i)=>{const c=ac.createOscillator(),cg=ac.createGain();c.type='triangle';c.frequency.value=fq;
  const a=t0+3.3+i*0.045;cg.gain.setValueAtTime(0.0001,a);cg.gain.exponentialRampToValueAtTime(0.16,a+0.02);cg.gain.exponentialRampToValueAtTime(0.0001,a+1.4);c.connect(cg);cg.connect(aus);c.start(a);c.stop(a+1.5);});
 const b=ac.createOscillator(),bg=ac.createGain();b.type='sine';b.frequency.setValueAtTime(160,t0+3.3);b.frequency.exponentialRampToValueAtTime(40,t0+3.8);
 bg.gain.setValueAtTime(0.6,t0+3.3);bg.gain.exponentialRampToValueAtTime(0.0001,t0+3.9);b.connect(bg);bg.connect(aus);b.start(t0+3.3);b.stop(t0+4);
}

/* ---------- Ablauf ---------- */
let zuletzt=0;
function schleife(jetzt){
 const dt=Math.min(0.05,(jetzt-zuletzt)/1000||0);zuletzt=jetzt;
 if(!manuell){
  /* waehrend des Aufladens laeuft die Welt in Zeitlupe */
  zeit+=dt*(t>=0&&t<1?0.35:1);
  if(F&&t<0)F.vorher.update(dt);
  t+=dt;if(t>=ENDE&&!ende){ende=true;removeEventListener('resize',groesse);if(fertig)fertig();return;}
 }
 bild();if(!ende)requestAnimationFrame(schleife);
}
addEventListener('resize',groesse);groesse();if(opt.ton)klang(VOR);
if(typeof requestAnimationFrame==='function')requestAnimationFrame(schleife);
/* fuer Standbilder */
return {standbild(sek){manuell=true;sg.clearRect(0,0,W(),H());for(let k=8;k>=0;k--){t=sek-k*0.016;zeit=2+Math.max(0,t);bild();}}};
}
window.BWMorph={start,sprite,orcaForm,DAUER:4.2,FLUSS:5.55+1.25};
})();
