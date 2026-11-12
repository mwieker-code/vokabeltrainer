/* Verwandlung zwischen den Tieren (bisher: Pinguin -> Orca).
   Beide Tiere werden gezeichnet, in Punkte zerlegt, und die Punkte wandern
   ueber einen Schwarz-Weiss-Wirbel in die neue Gestalt. Dazu wechselt die
   Welt: Das Eis reisst, das Meer steigt.
   BWMorph.start(canvas, fertig, {ton}) spielt die Verwandlung einmal ab. */
(function(){
'use strict';
function start(cv,fertig,opt){
const ctx=cv.getContext('2d');opt=opt||{};
const N=3400,DAUER=4.2,TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};
const rnd=(s=>()=>{s=(s*16807)%2147483647;return s/2147483647;})(4711);

/* ---------- die Tiere ---------- */
function zeichnePinguin(g){Figuren.pinguin(g,256,400,2.6,{wave:0.2,blush:true});}
function zeichneOrca(g){
 g.save();g.translate(256,256);g.rotate(-0.12);g.translate(-256,-256);
 const koerper=new Path2D('M452,262 C430,208 345,180 252,186 C170,192 112,222 74,248 L36,206 C52,240 52,266 34,304 L80,274 C132,304 222,330 302,324 C374,318 432,298 452,262 Z');
 g.fillStyle='#10151C';g.fill(koerper);
 g.fillStyle='#10151C';g.beginPath();g.moveTo(228,190);g.bezierCurveTo(236,146,254,116,274,98);g.bezierCurveTo(278,138,290,168,306,188);g.closePath();g.fill();
 g.save();g.clip(koerper);
 g.fillStyle='#F7F9FB';g.beginPath();g.moveTo(456,270);g.bezierCurveTo(410,282,330,276,276,286);g.bezierCurveTo(236,296,196,300,150,292);g.bezierCurveTo(190,330,300,340,360,326);g.bezierCurveTo(420,312,452,296,456,270);g.closePath();g.fill();
 g.fillStyle='#9AA9B8';g.beginPath();g.ellipse(206,204,34,9,-0.12,0,TAU);g.fill();
 g.restore();
 g.fillStyle='#F7F9FB';g.beginPath();g.ellipse(384,232,25,10,-0.28,0,TAU);g.fill();
 g.fillStyle='#10151C';g.beginPath();g.moveTo(350,300);g.bezierCurveTo(346,340,318,362,292,358);g.bezierCurveTo(298,334,310,312,322,298);g.closePath();g.fill();
 g.fillStyle='#FFFFFF';g.beginPath();g.arc(412,251,2.6,0,TAU);g.fill();
 g.strokeStyle='rgba(16,21,28,.55)';g.lineWidth=2;g.beginPath();g.moveTo(448,268);g.quadraticCurveTo(425,274,404,270);g.stroke();
 g.restore();
}
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
const TIERE={pinguin:bauen(zeichnePinguin),orca:bauen(zeichneOrca)};

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
 if(alpha<=0)return;const T=TIERE[name],k=gr/T.gr;
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
  const A=TIERE[von].punkte,B=TIERE[nach].punkte,sichtbar=smooth(0.7,1.0,tt)*(1-smooth(3.35,3.75,tt));
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
window.BWMorph={start,DAUER:4.2};
})();
