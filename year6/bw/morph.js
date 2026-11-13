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
/* ---------- der Orca: schlanke Form ueber einer Wirbelsaeule ----------
   orcaForm(ctx, x, y, k, {rot, schlag, bogen, alpha})
   Blick nach rechts. s = 0 Schnauze ... 1 Schwanzansatz, v = -1 Ruecken ... 1 Bauch.
   bogen = Koerper biegt sich wie beim Sprung, schlag = Schwimmwelle. */
/* Dicke oben/unten entlang des Koerpers: runder Kopf, kraeftige Mitte, schlanker Schwanz */
function dicke(s){
 const f=s<0.36?Math.pow(Math.sin(Math.PI/2*s/0.36),0.42):0.2+0.8*Math.cos(Math.PI/2*(s-0.36)/0.64);
 return [Math.max(0.8,16.5*f),Math.max(0.6,13*f)];
}
function orcaForm(g,X,Y,k,o){
 o=o||{};const schlag=o.schlag||0,bogen=o.bogen||0,welle=o.welle==null?1:o.welle;
 const ruecken=s=>({x:68-134*s,y:bogen*64*s*s-bogen*10*s+Math.sin(schlag-s*2.6)*s*s*7*welle});
 const tang=s=>{const a=ruecken(Math.max(0,s-0.01)),b=ruecken(Math.min(1,s+0.01)),l=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/l,y:(b.y-a.y)/l};};
 /* Normale nach oben (Ruecken) */
 const oben=s=>{const t=tang(s);return {x:-t.y,y:t.x};};
 const P=(s,v,aus)=>{const r=ruecken(s),n=oben(s),[ht,hb]=dicke(s),d=(v<0?-v*ht:-v*hb)+(aus||0);return [r.x+n.x*d,r.y+n.y*d];};
 const poly=pts=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
 const N=48,reihe=(a,b,f)=>{const out=[];for(let i=0;i<=N;i++){const s=lerp(a,b,i/N);out.push(f(s));}return out;};
 /* weiche Kurve durch die Stuetzpunkte (Catmull-Rom) */
 const tab=(T,s)=>{for(let i=1;i<T.length;i++)if(s<=T[i][0]){const u=(s-T[i-1][0])/(T[i][0]-T[i-1][0]),p0=T[Math.max(0,i-2)][1],p1=T[i-1][1],p2=T[i][1],p3=T[Math.min(T.length-1,i+1)][1];
  return 0.5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);}return T[T.length-1][1];};
 const SCHWARZ='#10151C',WEISS='#F7F9FB';
 g.save();g.translate(X,Y);if(o.rot)g.rotate(o.rot);g.scale(k,k);if(o.alpha!=null)g.globalAlpha*=o.alpha;
 /* Brustflosse hinten (dunkler, halb verdeckt) */
 const flosse=(s0,laenge,dreh,farbe)=>{const a=P(s0,0.9),b=P(s0+0.08,0.9),n=oben(s0+0.04),t=tang(s0+0.04);
  const c=Math.cos(dreh),sn=Math.sin(dreh),dx=-n.x*laenge*0.6+t.x*laenge*0.8,dy=-n.y*laenge*0.6+t.y*laenge*0.8,tip=[a[0]+dx*c-dy*sn,a[1]+dx*sn+dy*c];
  g.fillStyle=farbe;g.beginPath();g.moveTo(a[0],a[1]);g.quadraticCurveTo(tip[0]-t.x*6,tip[1]-t.y*6+2,tip[0],tip[1]);g.quadraticCurveTo(b[0]+(tip[0]-b[0])*0.3,b[1]+(tip[1]-b[1])*0.6,b[0],b[1]);g.closePath();g.fill();};
 /* Schwanzflosse */
 const T=ruecken(1),d=tang(1),n=oben(1),fa=Math.sin(schlag)*0.35*welle,ca=Math.cos(fa),sa=Math.sin(fa);
 const rot2=(vx,vy)=>[vx*ca-vy*sa,vx*sa+vy*ca],pt=(l,w)=>{const [vx,vy]=rot2(d.x*l+n.x*w,d.y*l+n.y*w);return [T.x+vx,T.y+vy];};
 g.fillStyle=SCHWARZ;g.beginPath();const f0=pt(-4,0),o1=pt(31,20),o2=pt(22,5),m=pt(20,0),u2=pt(22,-5),u1=pt(31,-20);
 g.moveTo(f0[0],f0[1]);const c1=pt(10,12);g.quadraticCurveTo(c1[0],c1[1],o1[0],o1[1]);g.quadraticCurveTo(o2[0],o2[1],m[0],m[1]);g.quadraticCurveTo(u2[0],u2[1],u1[0],u1[1]);const c2=pt(10,-12);g.quadraticCurveTo(c2[0],c2[1],f0[0],f0[1]);g.fill();
 /* Rueckenflosse: hoch, leicht nach hinten gebogen */
 const fv=P(0.29,-0.9),fh=P(0.43,-0.9),spitze=P(0.5,-1,33),kv=P(0.34,-1,26),kh=P(0.45,-1,10);
 g.beginPath();g.moveTo(fv[0],fv[1]);g.quadraticCurveTo(kv[0],kv[1],spitze[0],spitze[1]);g.quadraticCurveTo(kh[0],kh[1],fh[0],fh[1]);g.closePath();g.fill();
 /* Koerper */
 const umriss=[...reihe(0,1,s=>P(s,-1)),...reihe(1,0,s=>P(s,1))];
 poly(umriss);g.fill();
 g.save();poly(umriss);g.clip();
 /* weisser Bauch mit Flankenfleck */
 const KANTE=[[0,0.15],[0.1,0.32],[0.2,0.48],[0.3,0.6],[0.4,0.68],[0.47,0.6],[0.53,0.3],[0.59,-0.05],[0.645,-0.32],[0.68,-0.42],[0.705,-0.2],[0.73,0.3],[0.76,0.85],[0.8,1.3]];
 g.fillStyle=WEISS;poly([...reihe(0.005,0.8,s=>P(s,tab(KANTE,s))),...reihe(0.8,0.005,s=>P(s,1.4))]);g.fill();
 /* Sattelfleck und Glanz */
 g.fillStyle='#A7B4C2';poly([...reihe(0.42,0.58,s=>P(s,-1.1)),...reihe(0.58,0.42,s=>P(s,-1+0.42*Math.sin((s-0.42)/0.16*Math.PI)))]);g.fill();
 g.fillStyle='rgba(255,255,255,.1)';poly([...reihe(0.06,0.4,s=>P(s,-0.82)),...reihe(0.4,0.06,s=>P(s,-0.82+0.22*Math.sin((s-0.06)/0.34*Math.PI)))]);g.fill();
 g.restore();
 /* Augenfleck */
 const auge=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;auge.push(P(0.135+0.048*Math.cos(a),-0.3+0.17*Math.sin(a)-0.14*Math.cos(a)));}
 g.fillStyle=WEISS;poly(auge);g.fill();
 /* Brustflosse vorn */
 flosse(0.17,22,Math.sin(schlag+1)*0.18*welle,SCHWARZ);
 /* Auge und Maul */
 const a=P(0.075,-0.05);g.fillStyle='#FFFFFF';g.beginPath();g.arc(a[0],a[1],1.6,0,TAU);g.fill();
 const m1=P(0.005,0.2),m2=P(0.07,0.32);g.strokeStyle='rgba(16,21,28,.45)';g.lineWidth=1.2;g.beginPath();g.moveTo(m1[0],m1[1]);g.lineTo(m2[0],m2[1]);g.stroke();
 g.restore();
}
function zeichneOrca(g){orcaForm(g,262,236,2.55,{rot:-0.2,bogen:0.7,welle:0});}
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
let TIERE=null;const tiere=()=>TIERE||(TIERE={pinguin:bauen(zeichnePinguin),orca:bauen(zeichneOrca)});
function sprite(name){try{return tiere()[name]||null;}catch(e){return null;}}

function start(cv,fertig,opt){
const ctx=cv.getContext('2d');opt=opt||{};

/* ---------- Punkte ---------- */
const P=[];for(let i=0;i<N;i++)P.push({s1:rnd(),s2:rnd(),s3:rnd(),s4:rnd()});
let von='pinguin',nach='orca',t=0,zeit=2,manuell=false,ende=false;
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
function umgebung(w,h,u,risse){
 /* u: 0 = Welt des Starttiers, 1 = Welt des Zieltiers; dazwischen steigt bzw. faellt das Wasser */
 const zuMeer=nach==='orca',wasser=zuMeer?u:1-u;
 if(wasser<=0)return eis(w,h,risse);
 if(wasser>=1)return meer(w,h);
 eis(w,h,zuMeer?1:0);
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
 const w=W(),h=H(),m=Math.min(w,h);
 const cx=w/2,cy=h*0.52,gr=m*0.62;
 const tt=t<0?0:Math.min(t,DAUER);
 const laden=smooth(0,0.8,tt),aufl=smooth(0.7,1.5,tt),form=smooth(2.3,3.4,tt),an=smooth(3.3,3.75,tt);
 const zoom=1+0.12*Math.sin(Math.PI*smooth(0,3.6,tt)),beben=tt>3.3&&tt<3.8?(1-(tt-3.3)/0.5)*8:0;
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-w/2+Math.sin(zeit*60)*beben,-h/2+Math.cos(zeit*53)*beben);
 umgebung(w,h,smooth(1.9,3.3,tt),nach==='orca'?laden:0);
 /* Lichthof beim Aufladen */
 if(tt>0&&tt<3.9){const a=Math.sin(Math.PI*clamp(tt/3.9,0,1));const g=ctx.createRadialGradient(cx,cy,0,cx,cy,gr*0.95);
  g.addColorStop(0,'rgba(255,255,255,'+0.55*a+')');g.addColorStop(0.5,'rgba(190,230,255,'+0.22*a+')');g.addColorStop(1,'rgba(190,230,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 /* ruhendes Tier davor und danach */
 const wippen=Math.sin(zeit*2.2)*m*0.008;
 if(t<0)tierBild(von,cx,cy+wippen,gr,1,von==='orca'?()=>ctx.rotate(Math.sin(zeit*1.6)*0.05):null);
 else{
  tierBild(von,cx,cy,gr*(1+laden*0.06),1-smooth(0.75,1.05,tt));
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

/* ---------- Klang ---------- */
let ac=null;
function klang(){
 try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){return;}
 const t0=ac.currentTime+0.02,aus=ac.createGain();aus.gain.value=0.5;aus.connect(ac.destination);
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
  t+=dt;if(t>=DAUER+0.9&&!ende){ende=true;removeEventListener('resize',groesse);if(fertig)fertig();return;}
 }
 bild();if(!ende)requestAnimationFrame(schleife);
}
addEventListener('resize',groesse);groesse();if(opt.ton)klang();
if(typeof requestAnimationFrame==='function')requestAnimationFrame(schleife);
/* fuer Standbilder */
return {standbild(sek){manuell=true;sg.clearRect(0,0,W(),H());for(let k=8;k>=0;k--){t=sek-k*0.016;zeit=2+Math.max(0,t);bild();}}};
}
window.BWMorph={start,sprite,orcaForm,DAUER:4.2};
})();
