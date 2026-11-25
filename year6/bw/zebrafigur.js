/* Zebra-Figuren fuer Black & White (Kapitel 4).
   ZebraFigur.seite(ctx, x, y, k, o)   von der Seite, Blick nach rechts (Karte, Verwandlung, Herde)
   ZebraFigur.hinten(ctx, x, y, k, o)  von hinten, galoppierend (im Spiel)
   (x, y) = Mitte am Boden. o.lauf = Laufphase (Bogenmass), o.laeuft = 1 Galopp (Seite; sonst stehend),
   o.lehnen = Neigung beim Spurwechsel, o.stolpern 0..1, o.sprung 0..1 (Hoehe beim Sprung).
   Schlanke Proportionen, Sprunggelenke, Streifen nach der Koerperform: breit und senkrecht
   am Rumpf, schraeg bis waagerecht am Hinterteil, quer an den Beinen; aufrechte Maehne. */
(function(){
'use strict';
const TAU=Math.PI*2,S='#16181D',WEISS='#F7F5EE',SCH='#C9CAD0',MAUL='#2F3238';
const oval=(g,x,y,rx,ry,r)=>{g.beginPath();g.ellipse(x,y,rx,ry,r||0,0,TAU);};
function fell(g,x,y,r){const v=g.createRadialGradient(x-r*0.3,y-r*0.5,r*0.1,x,y,r*1.2);v.addColorStop(0,'#FFFFFF');v.addColorStop(0.55,WEISS);v.addColorStop(1,SCH);return v;}
/* Bein aus Gelenkpunkten, sich verjuengend, quer gestreift, Huf */
function bein(g,P,d0,d1,huf,dunkel){
 g.save();g.lineCap='round';g.lineJoin='round';
 const n=P.length-1,brd=i=>d0+(d1-d0)*i/n;
 for(let i=0;i<n;i++){g.strokeStyle=dunkel?'#E4E3DE':WEISS;g.lineWidth=(brd(i)+brd(i+1))/2;g.beginPath();g.moveTo(P[i][0],P[i][1]);g.lineTo(P[i+1][0],P[i+1][1]);g.stroke();}
 for(let i=0;i<=n;i++){g.fillStyle=dunkel?'#E4E3DE':WEISS;oval(g,P[i][0],P[i][1],brd(i)/2,brd(i)/2);g.fill();}
 /* Streifen quer zum Bein */
 g.strokeStyle=S;g.lineCap='butt';
 for(let i=0;i<n;i++){const [x0,y0]=P[i],[x1,y1]=P[i+1],L=Math.hypot(x1-x0,y1-y0),nx=-(y1-y0)/L,ny=(x1-x0)/L,st=Math.max(2,Math.floor(L/5.5));
  for(let j=0;j<st;j++){const t=(j+0.5)/st,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,b=(brd(i)+(brd(i+1)-brd(i))*t)*0.52;g.lineWidth=Math.max(1,b*0.42);g.beginPath();g.moveTo(x-nx*b,y-ny*b);g.lineTo(x+nx*b,y+ny*b);g.stroke();}}
 const [hx,hy]=P[n],[px,py]=P[n-1],a=Math.atan2(hy-py,hx-px);
 g.translate(hx,hy);g.rotate(a-Math.PI/2);g.fillStyle=S;g.beginPath();g.moveTo(-huf*0.55,-1);g.lineTo(huf*0.55,-1);g.lineTo(huf*0.75,huf*0.75);g.lineTo(-huf*0.6,huf*0.75);g.closePath();g.fill();
 g.restore();
}
const pol=(x,y,a,l)=>[x+Math.sin(a)*l,y+Math.cos(a)*l];
/* Gelenkkette: Winkel von der Senkrechten (positiv = nach vorn) */
function kette(x,y,teile){const P=[[x,y]];let a=0;for(const [l,w] of teile){a=w;const q=pol(P[P.length-1][0],P[P.length-1][1],a,l);P.push(q);}return P;}
/* Galopp-Beine. ph = Laufphase; Winkel von der Senkrechten, + = nach vorn */
function hinterbein(x,y,ph,lauf){
 const sw=Math.sin(ph)*lauf,flex=Math.max(0,Math.cos(ph))*lauf;
 const a1=-0.28+0.6*sw,a2=a1+0.3-0.9*flex;
 return kette(x,y,[[30,a1],[28,a2],[7,a2+0.55]]);
}
function vorderbein(x,y,ph,lauf){
 const sw=Math.sin(ph)*lauf,flex=Math.max(0,-Math.cos(ph))*lauf;
 const a1=0.05+0.7*sw,a2=a1-1.7*flex;
 return kette(x,y,[[29,a1],[25,a2],[7,a2+0.5-0.3*flex]]);
}
/* spitz zulaufendes Band entlang einer Linie (w0 -> w1) */
function band(g,pts,w0,w1){
 const P=[];for(let i=0;i<pts.length-1;i++){const [a,b]=[pts[i],pts[i+1]];for(let t=0;t<1;t+=0.25)P.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}P.push(pts[pts.length-1]);
 const L=[],R=[];for(let i=0;i<P.length;i++){const p0=P[Math.max(0,i-1)],p1=P[Math.min(P.length-1,i+1)],dx=p1[0]-p0[0],dy=p1[1]-p0[1],l=Math.hypot(dx,dy)||1,t=i/(P.length-1),w=(w0+(w1-w0)*t)/2;
  L.push([P[i][0]-dy/l*w,P[i][1]+dx/l*w]);R.push([P[i][0]+dy/l*w,P[i][1]-dx/l*w]);}
 g.beginPath();g.moveTo(L[0][0],L[0][1]);for(const q of L)g.lineTo(q[0],q[1]);for(let i=R.length-1;i>=0;i--)g.lineTo(R[i][0],R[i][1]);g.closePath();g.fill();
}
function streifenBand(g,pts,b){g.lineWidth=b;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const [a,c]=[pts[i-1],pts[i]];g.quadraticCurveTo(a[0],a[1],(a[0]+c[0])/2,(a[1]+c[1])/2);}const L=pts[pts.length-1];g.lineTo(L[0],L[1]);g.stroke();}

/* ------------------------------------------------ von der Seite, Blick rechts */
function seite(g,X,Y,k,o){
 o=o||{};const ph=o.lauf||0,lauf=o.laeuft?1:0,bob=Math.sin(ph*2)*2.5*lauf;
 g.save();g.translate(X,Y);g.scale(k,k);g.lineJoin='round';
 g.fillStyle='rgba(30,25,15,.2)';oval(g,0,0,58,6);g.fill();
 g.translate(0,-bob);
 /* ferne Beine */
 bein(g,hinterbein(-38,-64,ph+0.6,lauf),13,6,8,true);bein(g,vorderbein(38,-62,ph+0.5,lauf),11,6,8,true);
 /* Schweif */
 const sw=Math.sin(ph)*0.25*lauf;
 g.save();g.translate(-58,-92);g.rotate(0.3+sw+0.6*lauf);g.strokeStyle=WEISS;g.lineWidth=4.5;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-4,16,-2,30);g.stroke();
 g.strokeStyle=S;g.lineWidth=2;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-3,6+i*6);g.lineTo(2,6+i*6);g.stroke();}
 g.fillStyle=S;g.beginPath();g.moveTo(-5,28);g.quadraticCurveTo(-8,44,0,50);g.quadraticCurveTo(6,42,3,28);g.closePath();g.fill();g.restore();
 /* nahe Beine (oben vom Rumpf verdeckt) */
 bein(g,hinterbein(-42,-66,ph,lauf),15,6.5,8.5);bein(g,vorderbein(42,-62,ph-0.15,lauf),12,6.5,8.5);
 /* Rumpf */
 const rumpf=()=>{g.beginPath();g.moveTo(-58,-92);
  g.bezierCurveTo(-52,-104,-34,-106,-20,-100);g.bezierCurveTo(-4,-94,18,-96,34,-104);g.bezierCurveTo(46,-108,60,-100,60,-86);
  g.bezierCurveTo(60,-72,54,-60,42,-56);g.bezierCurveTo(26,-52,4,-54,-14,-60);g.bezierCurveTo(-22,-62,-26,-64,-30,-62);
  g.bezierCurveTo(-34,-56,-44,-52,-52,-58);g.bezierCurveTo(-62,-66,-64,-82,-58,-92);g.closePath();};
 g.fillStyle=fell(g,0,-82,56);rumpf();g.fill();
 g.save();rumpf();g.clip();g.strokeStyle=S;g.lineCap='round';
 /* Rumpf: breite senkrechte Baender, unten schmaler und nach vorn gebogen; am Hinterteil schraeg bis waagerecht */
 g.fillStyle=S;
 const BR=[6.5,6,7,5.5,6.5,6,5,5.5];
 for(let i=0;i<8;i++){const x=50-i*9.6,sch=i*1.8;band(g,[[x+2,-112],[x-sch*0.3,-94],[x-sch*0.7+1,-76],[x-sch+4,-56]],BR[i],2.2);}
 for(let i=0;i<6;i++){const y=-104+i*8.4;band(g,[[-26-i*1.6,y-5],[-38,y-1],[-52,y+2],[-68,y+1+i*1.5]],1.6,6.2-i*0.3);}
 /* Bauchlinie hell */
 g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.moveTo(-14,-56);g.quadraticCurveTo(14,-50,44,-55);g.lineTo(40,-60);g.quadraticCurveTo(14,-56,-12,-62);g.closePath();g.fill();
 g.strokeStyle=S;g.lineWidth=3.2;g.beginPath();g.moveTo(-56,-96);g.quadraticCurveTo(-30,-106,-6,-97);g.quadraticCurveTo(18,-96,40,-106);g.stroke();
 g.restore();
 /* Hals: kraeftig, Maehne auf dem Kamm */
 const nk=Math.sin(ph*2)*0.04*lauf;
 g.save();g.translate(44,-98);g.rotate(nk);
 const kamm=t=>{const u=1-t;return [u*u*u*-14+3*u*u*t*-6+3*u*t*t*8+t*t*t*22,u*u*u*0+3*u*u*t*-28+3*u*t*t*-48+t*t*t*-60];};
 const hals=()=>{g.beginPath();g.moveTo(-14,0);g.bezierCurveTo(-6,-28,8,-48,22,-60);g.lineTo(38,-46);g.bezierCurveTo(30,-30,26,-10,20,12);g.closePath();};
 g.fillStyle=fell(g,12,-24,34);hals();g.fill();
 g.save();hals();g.clip();g.fillStyle=S;
 for(let i=0;i<8;i++){const t=0.02+i*0.13,[x,y]=kamm(t);band(g,[[x-2,y-2],[x+12,y+6],[x+24,y+14+t*2],[x+34,y+20]],7.5-t*3,3.2);}
 g.restore();
 /* Maehne: aufrechte Buerste entlang des Kamms, schwarz-weiss gebaendert */
 const M=[],N=22;for(let i=0;i<=N;i++){const t=i/N,[x,y]=kamm(t),[x2,y2]=kamm(Math.min(1,t+0.01)),a=Math.atan2(y2-y,x2-x)-Math.PI/2,h=7+Math.sin(t*Math.PI)*2.5+Math.sin(ph*2+i*0.7)*0.6*lauf;M.push({x,y,a,h});}
 g.fillStyle='#ECEAE3';g.beginPath();M.forEach((m,i)=>{const X=m.x+Math.cos(m.a)*m.h,Y=m.y+Math.sin(m.a)*m.h;i?g.lineTo(X,Y):g.moveTo(X,Y);});for(let i=N;i>=0;i--)g.lineTo(M[i].x+Math.cos(M[i].a)*-2,M[i].y+Math.sin(M[i].a)*-2);g.closePath();g.fill();
 g.fillStyle=S;for(let i=0;i<N;i+=2){const m=M[i],n=M[i+1];g.beginPath();g.moveTo(m.x-Math.cos(m.a)*2,m.y-Math.sin(m.a)*2);g.lineTo(m.x+Math.cos(m.a)*m.h,m.y+Math.sin(m.a)*m.h);g.lineTo(n.x+Math.cos(n.a)*n.h,n.y+Math.sin(n.a)*n.h);g.lineTo(n.x-Math.cos(n.a)*2,n.y-Math.sin(n.a)*2);g.closePath();g.fill();}
 g.strokeStyle=S;g.lineWidth=1.6;g.beginPath();M.forEach((m,i)=>{const X=m.x+Math.cos(m.a)*m.h,Y=m.y+Math.sin(m.a)*m.h;i?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();
 /* Kopf */
 g.save();g.translate(28,-54);g.rotate(1.05);
 const kopf=()=>{g.beginPath();g.moveTo(-10,-10);g.bezierCurveTo(-2,-16,16,-14,30,-10);g.bezierCurveTo(42,-7,52,-6,55,1);g.bezierCurveTo(57,9,49,13,40,12);g.bezierCurveTo(26,11,10,14,-4,12);g.bezierCurveTo(-14,10,-16,-4,-10,-10);g.closePath();};
 g.fillStyle=fell(g,14,-2,30);kopf();g.fill();
 g.save();kopf();g.clip();g.fillStyle=S;
 for(let i=0;i<7;i++){const x=-8+i*6;band(g,[[x,-18],[x+1.5,-2],[x-1,16]],3.2,2.4);}
 for(let i=0;i<4;i++)band(g,[[30,-10+i*4.4],[38,-8+i*4.6]],2,1);
 const mv=g.createLinearGradient(34,0,56,0);mv.addColorStop(0,'rgba(47,50,56,0)');mv.addColorStop(0.45,MAUL);mv.addColorStop(1,'#1E2024');g.fillStyle=mv;g.fillRect(32,-16,30,32);
 g.restore();
 g.fillStyle='#0E0F12';oval(g,51,-1,1.8,2.6,0.3);g.fill();
 g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=1;g.beginPath();g.moveTo(44,9);g.lineTo(54,7);g.stroke();
 g.fillStyle='#1A120C';oval(g,8,-5,3,2.6,0.2);g.fill();g.fillStyle='#FFFFFF';oval(g,7,-6,0.9,0.9);g.fill();
 g.strokeStyle=S;g.lineWidth=1.2;g.beginPath();g.moveTo(4,-8);g.quadraticCurveTo(8,-10,12,-8);g.stroke();
 g.restore();
 /* Ohren: gross, rund */
 for(const [x,y,r,d] of [[22,-60,-0.45,1],[27,-61,-0.15,0]]){g.save();g.translate(x,y);g.rotate(r);g.fillStyle=d?'#E6E5E0':WEISS;g.beginPath();g.moveTo(-5,0);g.bezierCurveTo(-7,-11,-2,-19,0,-20);g.bezierCurveTo(3,-18,7,-11,5,0);g.closePath();g.fill();
  g.fillStyle=S;g.beginPath();g.moveTo(-2.4,-15);g.quadraticCurveTo(0,-21,2.6,-15);g.quadraticCurveTo(0,-16.5,-2.4,-15);g.fill();g.strokeStyle=S;g.lineWidth=1.4;g.beginPath();g.moveTo(-4.5,-2);g.lineTo(4.5,-2);g.stroke();g.restore();}
 g.restore();
 g.restore();
}

/* ------------------------------------------------ von hinten (Spiel) */
function hinten(g,X,Y,k,o){
 o=o||{};const l=o.lauf||0,neig=o.lehnen||0,st=o.stolpern||0,sp=o.sprung||0;
 const auf=Math.abs(Math.sin(l))*4+sp*40;
 g.save();g.translate(X,Y);g.scale(k,k);g.lineJoin='round';
 g.fillStyle='rgba(60,40,10,'+(0.25*(1-sp*0.6))+')';oval(g,0,0,34*(1-sp*0.3),6);g.fill();
 g.translate(0,-auf);g.rotate(neig*0.16+Math.sin(st*20)*0.06*st);
 /* Kopf und Hals (weit weg, oben) */
 const nick=Math.sin(l*2)*2;
 const hals=()=>{g.beginPath();g.moveTo(-15,-112);g.bezierCurveTo(-13,-128,-10,-142,-8,-150+nick);g.lineTo(8,-150+nick);g.bezierCurveTo(10,-142,13,-128,15,-112);g.closePath();};
 g.fillStyle=fell(g,0,-132,20);hals();g.fill();
 g.save();hals();g.clip();g.strokeStyle=S;g.lineCap='round';for(let y=-150;y<-110;y+=6.5){g.lineWidth=3.4;g.beginPath();g.moveTo(-17,y+6);g.quadraticCurveTo(0,y-1,17,y+6);g.stroke();}g.restore();
 /* Hinterkopf */
 g.fillStyle=fell(g,0,-156+nick,10);oval(g,0,-155+nick,9.5,9);g.fill();
 g.save();oval(g,0,-155+nick,9.5,9);g.clip();g.strokeStyle=S;g.lineWidth=2.4;for(let y=-164;y<-146;y+=5){g.beginPath();g.moveTo(-10,y+3);g.quadraticCurveTo(0,y-1,10,y+3);g.stroke();}g.restore();
 /* grosse runde Ohren */
 for(const s of [-1,1]){g.save();g.translate(s*7,-161+nick);g.rotate(s*0.5+Math.sin(l*2)*0.04);g.fillStyle=WEISS;g.beginPath();g.moveTo(-5,1);g.bezierCurveTo(-7,-9,-3,-17,0,-18);g.bezierCurveTo(3,-17,7,-9,5,1);g.closePath();g.fill();
  g.strokeStyle=S;g.lineWidth=1.6;g.beginPath();g.moveTo(-4.4,-1);g.lineTo(4.4,-1);g.stroke();g.fillStyle=S;g.beginPath();g.moveTo(-2.4,-14);g.quadraticCurveTo(0,-19,2.4,-14);g.closePath();g.fill();g.restore();}
 /* Maehne: aufrechte Buerste, mittig */
 for(let i=0;i<9;i++){const y=-158+nick+i*5.6,f=Math.sin(l*2+i*0.6)*0.6;g.fillStyle=S;g.beginPath();g.ellipse(f,y,2.6,3.6,0,0,TAU);g.fill();if(i%2){g.fillStyle=WEISS;g.beginPath();g.ellipse(f,y,1.4,2.2,0,0,TAU);g.fill();}}
 /* Vorderbeine (weiter weg, zwischen den Hinterbeinen) */
 for(const s of [-1,1]){const ph=Math.sin(l+1.9+(s>0?0.5:0)),hoch=Math.max(0,ph);
  bein(g,[[s*7,-80],[s*7.5,-50+hoch*8],[s*7,-20+hoch*14-sp*10]],9,6,7,true);}
 /* Ruecken: lang in die Tiefe, Aalstrich */
 const ruecken=()=>{g.beginPath();g.moveTo(-17,-110);g.bezierCurveTo(-24,-104,-30,-96,-30,-88);g.lineTo(30,-88);g.bezierCurveTo(30,-96,24,-104,17,-110);g.bezierCurveTo(8,-115,-8,-115,-17,-110);g.closePath();};
 g.fillStyle=fell(g,0,-100,30);ruecken();g.fill();
 g.save();ruecken();g.clip();g.strokeStyle=S;g.lineCap='round';
 for(let i=0;i<5;i++){const y=-112+i*5.5;for(const s of [-1,1]){streifenBand(g,[[s*1.5,y-1],[s*14,y+2.5],[s*32,y+9]],2.6+i*0.35);}}
 g.lineWidth=3.2;g.beginPath();g.moveTo(0,-116);g.lineTo(0,-86);g.stroke();g.restore();
 /* Hinterbeine: Unterschenkel kraeftig, Sprunggelenk, schlanker Lauf; im Galopp fast gemeinsam */
 for(const s of [-1,1]){const ph=l+(s>0?0.55:0),zu=Math.max(0,Math.sin(ph)),aus=Math.max(0,-Math.sin(ph));
  const hy=-30+zu*10-sp*14,fy=-3-zu*16-sp*22-aus*2;
  bein(g,[[s*15,-66],[s*15.5,-48+zu*3],[s*(14.5+zu*1.5),hy],[s*(13.5+zu*2.5),(hy+fy)/2],[s*(13+zu*3),fy]],16,6,8);
  g.fillStyle='rgba(0,0,0,.12)';oval(g,s*14.5,hy,4.5,3);g.fill();}
 /* Hinterteil: herzfoermig, zwei Keulen */
 const keule=s=>{g.beginPath();g.moveTo(0,-90);g.bezierCurveTo(s*10,-98,s*30,-96,s*31,-80);g.bezierCurveTo(s*32,-64,s*24,-50,s*12,-48);g.bezierCurveTo(s*6,-48,0,-54,0,-62);g.closePath();};
 for(const s of [-1,1]){g.fillStyle=fell(g,s*14,-80,26);keule(s);g.fill();
  g.save();keule(s);g.clip();g.strokeStyle=S;g.lineCap='round';
  /* Baender: oben quer, nach aussen nach unten schwingend */
  g.strokeStyle=S;g.lineCap='round';
  for(let i=0;i<7;i++){const y=-96+i*7.6;streifenBand(g,[[s*1,y+2],[s*12,y-1+i*0.4],[s*24,y+3+i*1.5],[s*36,y+12+i*2.4]],3.1+(i%3)*0.5);}
  g.restore();}
 g.strokeStyle='rgba(120,120,130,.45)';g.lineWidth=1;g.beginPath();g.moveTo(0,-88);g.lineTo(0,-52);g.stroke();
 /* Schweif: weht hoch beim Galopp */
 const sch=Math.sin(l*1.3)*0.35,hoch=0.5+0.4*Math.abs(Math.sin(l))+sp;
 g.save();g.translate(0,-90);g.rotate(sch);g.strokeStyle=WEISS;g.lineWidth=4;g.lineCap='round';
 const ty=26-hoch*12;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(4,ty*0.4,1,ty);g.stroke();
 g.strokeStyle=S;g.lineWidth=1.8;for(let i=1;i<4;i++){g.beginPath();g.moveTo(-2,ty*i/4);g.lineTo(3,ty*i/4);g.stroke();}
 g.fillStyle=S;g.beginPath();g.moveTo(-3,ty);g.quadraticCurveTo(-6,ty+12,0,ty+18);g.quadraticCurveTo(6,ty+12,4,ty);g.closePath();g.fill();
 g.restore();
 g.restore();
}
window.ZebraFigur={seite,hinten};
})();
