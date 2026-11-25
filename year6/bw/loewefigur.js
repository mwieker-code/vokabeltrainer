/* Loewe fuer Black & White (Kapitel 4, Zebra Dash).
   LoeweFigur.seite(ctx, x, y, k, o)       Blick nach rechts; (x, y) = Mitte am Boden
   LoeweFigur.verfolgung(ctx, x, y, k, o)  schraeg von hinten, laeuft nach rechts oben in die Tiefe
     o.lauf  Laufphase, o.pose 'lauf' | 'sprung' | 'bruellen' | 'stehen', o.maul 0..1 (offenes Maul),
     o.mood 'wild' = schmale Augen.
   KOPF = Lage des Kopfes (Spielkoordinaten pro k) in der Verfolgungsansicht. */
(function(){
'use strict';
const TAU=Math.PI*2;
const oval=(g,x,y,rx,ry,r)=>{g.beginPath();g.ellipse(x,y,rx,ry,r||0,0,TAU);};
const pol=(x,y,a,l)=>[x+Math.sin(a)*l,y+Math.cos(a)*l];
function kette(x,y,teile){const P=[[x,y]];for(const [l,w] of teile)P.push(pol(P[P.length-1][0],P[P.length-1][1],w,l));return P;}
function fellV(g,y0,y1,dunkel){const v=g.createLinearGradient(0,y0,0,y1);v.addColorStop(0,dunkel?'#C08236':'#E8B462');v.addColorStop(0.6,dunkel?'#A86E2C':'#D49A4A');v.addColorStop(1,dunkel?'#C99A5C':'#EFD29A');return v;}
/* Bein als weich verjuengte Form mit Pranke */
function bein(g,P,d0,d1,dunkel,krallen){
 g.save();g.lineCap='round';g.lineJoin='round';const n=P.length-1,brd=i=>d0+(d1-d0)*i/n;
 g.strokeStyle=dunkel?'#B57A34':'#D9A04F';
 for(let i=0;i<n;i++){g.lineWidth=(brd(i)+brd(i+1))/2;g.beginPath();g.moveTo(P[i][0],P[i][1]);g.lineTo(P[i+1][0],P[i+1][1]);g.stroke();}
 g.fillStyle=g.strokeStyle;for(let i=0;i<=n;i++){oval(g,P[i][0],P[i][1],brd(i)/2,brd(i)/2);g.fill();}
 const [x,y]=P[n],[px,py]=P[n-1],a=Math.atan2(y-py,x-px);
 g.translate(x,y);g.rotate(a-Math.PI/2);
 g.fillStyle=dunkel?'#C48A44':'#E6B76C';oval(g,2,1,d1*0.85,d1*0.55);g.fill();
 if(krallen){g.fillStyle='#F4EEE2';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*3.6-1.2,d1*0.4);g.quadraticCurveTo(i*4.2,d1*0.4+6,i*4.6+1.5,d1*0.4+8);g.lineTo(i*3.6+1.4,d1*0.4);g.closePath();g.fill();}}
 g.restore();
}
function hinterbein(x,y,ph,lauf,pose){
 if(pose==='sprung')return kette(x,y,[[30,-1.3],[26,-1.75],[12,-1.5]]);
 if(pose==='stehen'||pose==='bruellen')return kette(x,y,[[30,-0.3],[26,0.35],[12,0.05]]);
 const sw=Math.sin(ph)*lauf,flex=Math.max(0,Math.cos(ph))*lauf,a1=-0.35+0.85*sw;
 return kette(x,y,[[30,a1],[26,a1+0.55-1.1*flex],[12,a1+0.1-0.4*flex]]);
}
function vorderbein(x,y,ph,lauf,pose){
 if(pose==='sprung')return kette(x,y,[[30,1.25],[26,1.45],[11,1.7]]);
 if(pose==='stehen'||pose==='bruellen')return kette(x,y,[[28,0.1],[24,0.02],[10,0.3]]);
 const sw=Math.sin(ph)*lauf,flex=Math.max(0,-Math.cos(ph))*lauf,a1=0.15+0.95*sw;
 return kette(x,y,[[28,a1],[24,a1-1.5*flex],[10,a1+0.4-1.2*flex]]);
}
function maehne(g,cx,cy,r,ph,wind){
 /* volle, zottelige Maehne: Kern plus ueberlappende Buesche, hinten/unten laenger und nach hinten geweht */
 const lage=(rr,fill,n,lang)=>{
  g.fillStyle=fill;oval(g,cx,cy,rr*0.82,rr*0.9);g.fill();
  for(let i=0;i<n;i++){const a=i/n*TAU+0.3,hinten=Math.max(0,-Math.cos(a)),unten=Math.max(0,Math.sin(a)),
    len=rr*(1.0+lang*(0.28*hinten+0.22*unten)+0.08*Math.sin(i*2.7+ph*0.5)),
    bx=cx+Math.cos(a)*rr*0.6,by=cy+Math.sin(a)*rr*0.66,
    ex=cx+Math.cos(a)*len-(0.15+0.25*wind)*rr*hinten-0.1*rr*wind,ey=cy+Math.sin(a)*len*1.05+0.08*rr*hinten,
    nx=-Math.sin(a),ny=Math.cos(a),b=rr*0.42;
   g.beginPath();g.moveTo(bx+nx*b,by+ny*b);g.quadraticCurveTo(bx+nx*b*0.6+(ex-bx)*0.75,by+ny*b*0.6+(ey-by)*0.75,ex,ey);g.quadraticCurveTo(bx-nx*b*0.2+(ex-bx)*0.55,by-ny*b*0.2+(ey-by)*0.55,bx-nx*b,by-ny*b);g.closePath();g.fill();}
 };
 let v=g.createRadialGradient(cx,cy,r*0.2,cx-r*0.2,cy,r*1.4);v.addColorStop(0,'#7A3815');v.addColorStop(1,'#3E1C0A');
 lage(r,v,22,1);
 v=g.createRadialGradient(cx+r*0.2,cy-r*0.1,r*0.1,cx,cy,r*1.05);v.addColorStop(0,'#C8702F');v.addColorStop(1,'#82401A');
 lage(r*0.78,v,18,0.6);
 v=g.createRadialGradient(cx+r*0.4,cy-r*0.15,r*0.05,cx+r*0.25,cy,r*0.7);v.addColorStop(0,'#E7A45C');v.addColorStop(1,'rgba(200,112,47,0)');
 g.fillStyle=v;oval(g,cx+r*0.25,cy,r*0.6,r*0.66);g.fill();
 g.strokeStyle='rgba(50,20,6,.3)';g.lineWidth=1.3;g.lineCap='round';
 for(let i=0;i<16;i++){const a=i/16*TAU+0.1,r1=r*0.4,r2=r*(0.75+0.15*Math.sin(i*1.7));g.beginPath();g.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);g.quadraticCurveTo(cx+Math.cos(a+0.12)*r*0.6,cy+Math.sin(a+0.12)*r*0.6,cx+Math.cos(a+0.05)*r2-r*0.08,cy+Math.sin(a+0.05)*r2);g.stroke();}
}
function kopf(g,maul,mood){
 /* Kopf im Profil, Blick rechts; (0,0) = Kopfmitte */
 const m=Math.max(0,Math.min(1,maul||0));
 /* Unterkiefer */
 g.save();g.translate(14,8);g.rotate(m*0.55);
 g.fillStyle='#E9C58A';g.beginPath();g.moveTo(-14,-2);g.quadraticCurveTo(4,4,20,0);g.quadraticCurveTo(22,6,16,9);g.quadraticCurveTo(0,12,-12,6);g.closePath();g.fill();
 if(m>0.05){g.fillStyle='#FFFFFF';for(const x of [14,6]){g.beginPath();g.moveTo(x,0);g.lineTo(x+2.5,-6*m);g.lineTo(x+4.5,0);g.closePath();g.fill();}}
 g.restore();
 if(m>0.05){g.fillStyle='#6E1F28';g.beginPath();g.moveTo(-2,6);g.quadraticCurveTo(14,8+m*10,32,6+m*12);g.lineTo(32,4);g.quadraticCurveTo(14,5,-2,4);g.closePath();g.fill();
  g.fillStyle='#C2505E';oval(g,14,9+m*6,8,3*m+1);g.fill();}
 /* Schaedel und Schnauze */
 const v=g.createLinearGradient(0,-24,0,14);v.addColorStop(0,'#E6AE5C');v.addColorStop(1,'#D29447');g.fillStyle=v;
 g.beginPath();g.moveTo(-16,-14);g.bezierCurveTo(-8,-26,12,-26,20,-16);g.bezierCurveTo(26,-12,32,-10,36,-6);g.bezierCurveTo(40,-2,40,4,34,6);
 g.bezierCurveTo(24,7,10,8,-4,10);g.bezierCurveTo(-14,10,-20,0,-16,-14);g.closePath();g.fill();
 /* helle Schnauze und Kinn */
 g.fillStyle='#F4DDB0';g.beginPath();g.moveTo(14,-4);g.bezierCurveTo(22,-8,32,-6,36,-2);g.bezierCurveTo(38,4,30,7,20,7);g.bezierCurveTo(14,6,12,0,14,-4);g.fill();
 /* Nase */
 g.fillStyle='#4A2A22';g.beginPath();g.moveTo(32,-9);g.quadraticCurveTo(39,-9,39,-4);g.quadraticCurveTo(36,-2,33,-4);g.closePath();g.fill();
 g.strokeStyle='#5A3426';g.lineWidth=1.2;g.beginPath();g.moveTo(35,-3);g.quadraticCurveTo(34,2,28,4);g.stroke();
 g.fillStyle='rgba(90,52,38,.5)';for(const [x,y] of [[24,0],[27,2],[24,3]]){oval(g,x,y,0.8,0.8);g.fill();}
 /* Auge: bernstein; mood 'wild' = schmal */
 const wild=mood==='wild';
 g.fillStyle='#2A1708';oval(g,10,-12,5,wild?2.2:3.4,-0.15);g.fill();
 g.fillStyle='#F2B33A';oval(g,10.5,-12,3.8,wild?1.5:2.6,-0.15);g.fill();
 g.fillStyle='#1A0E05';oval(g,11.5,-12,1.3,wild?1.3:2.2);g.fill();
 g.fillStyle='rgba(255,255,255,.9)';oval(g,9.6,-13,0.8,0.8);g.fill();
 g.strokeStyle='#5A3214';g.lineWidth=1.6;g.lineCap='round';g.beginPath();g.moveTo(4,wild?-16:-15.5);g.quadraticCurveTo(10,wild?-14:-17,16,wild?-15:-15);g.stroke();
 /* Traenenlinie */
 g.strokeStyle='rgba(90,50,20,.5)';g.lineWidth=1.2;g.beginPath();g.moveTo(14,-10);g.quadraticCurveTo(16,-6,15,-2);g.stroke();
 /* Ohr */
 g.fillStyle='#C98A3E';g.beginPath();g.moveTo(-10,-20);g.quadraticCurveTo(-9,-32,0,-30);g.quadraticCurveTo(2,-24,-2,-19);g.closePath();g.fill();
 g.fillStyle='#4A2A18';g.beginPath();g.moveTo(-8,-22);g.quadraticCurveTo(-7,-28,-2,-27);g.quadraticCurveTo(-2,-24,-4,-21);g.closePath();g.fill();
}

function seite(g,X,Y,k,o){
 o=o||{};const ph=o.lauf||0,pose=o.pose||'lauf',lauf=pose==='lauf'?1:0,maul=o.maul||0;
 const bob=lauf?Math.sin(ph*2)*3:0,dehn=lauf?Math.sin(ph)*0.06:0;
 g.save();g.translate(X,Y);g.scale(k,k);g.lineJoin='round';
 if(pose!=='sprung'){g.fillStyle='rgba(40,25,10,.22)';oval(g,0,0,80,7);g.fill();}
 if(pose==='sprung'){g.rotate(-0.18);}
 g.translate(0,-bob);
 /* Schwanz mit Quaste */
 const sw=Math.sin(ph*1.2)*0.2;
 g.save();g.translate(-78,-88);g.rotate(sw+(pose==='sprung'?-0.3:0));g.strokeStyle='#C88C40';g.lineWidth=5;g.lineCap='round';
 g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-22,-14,-40,-6,-52,10);g.stroke();
 g.fillStyle='#5A2A10';oval(g,-54,14,6,9,0.6);g.fill();g.restore();
 /* ferne Beine */
 bein(g,hinterbein(-50,-62,ph+0.5,lauf,pose),20,9,true);bein(g,vorderbein(44,-62,ph+Math.PI+0.4,lauf,pose),16,9,true,pose==='sprung');
 /* Rumpf: lang, kraeftig, Brust tief */
 g.save();g.scale(1+dehn,1);
 const rumpf=()=>{g.beginPath();g.moveTo(-76,-82);g.bezierCurveTo(-72,-102,-46,-104,-22,-97);g.bezierCurveTo(2,-92,26,-104,46,-108);
  g.bezierCurveTo(68,-110,78,-92,74,-70);g.bezierCurveTo(72,-54,62,-46,48,-46);g.bezierCurveTo(28,-46,8,-50,-12,-54);
  g.bezierCurveTo(-26,-56,-40,-50,-54,-48);g.bezierCurveTo(-72,-48,-80,-64,-76,-82);g.closePath();};
 g.fillStyle=fellV(g,-106,-50);rumpf();g.fill();
 g.save();rumpf();g.clip();
 /* Muskeln: Schulter und Keule */
 g.fillStyle='rgba(255,230,180,.35)';oval(g,-56,-82,20,16,-0.3);g.fill();oval(g,40,-84,18,14,0.4);g.fill();
 
 g.restore();
 g.restore();
 /* nahe Beine */
 bein(g,hinterbein(-58,-64,ph,lauf,pose),22,10,false);if(pose!=='sprung')bein(g,vorderbein(48,-62,ph+Math.PI,lauf,pose),18,10,false);
 /* Keule ueber dem Hinterbein */
 g.fillStyle=fellV(g,-100,-44);oval(g,-56,-70,22,24,-0.2);g.fill();
 /* Maehne und Kopf */
 const hx=pose==='sprung'?84:80,hy=-100+(lauf?Math.sin(ph*2+0.6)*2:0)+(pose==='bruellen'?-6:0);
 maehne(g,hx-16,hy+8,30,ph*2,lauf?0.6:pose==='sprung'?1:0.2);
 g.save();g.translate(hx,hy);if(pose==='bruellen')g.rotate(-0.25);kopf(g,maul,o.mood);g.restore();
 if(pose==='sprung')bein(g,vorderbein(56,-60,0,0,pose),18,10,false,true);
 g.restore();
}
/* im Spiel: von schraeg hinten, laeuft in die Tiefe nach rechts oben */
function verfolgung(g,X,Y,k,o){
 g.save();g.translate(X,Y);g.transform(0.72,-0.2,0.05,1,0,0);seite(g,0,0,k,o);g.restore();
}
/* Kopf in der Verfolgungsansicht relativ zum Fusspunkt, je k */
const KOPF={x:0.72*80+0.05*-100,y:-0.2*80-100};
window.LoeweFigur={seite,verfolgung,KOPF};
})();
