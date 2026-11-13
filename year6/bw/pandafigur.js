/* Panda-Figuren fuer Black & White (Kapitel 3).
   BWPanda.panda(ctx, x, y, k, o) zeichnet einen Panda; (x, y) = Mitte am Boden.
   o.pose   'sitzen' (Standard) | 'kugel' (eingerollt, rollt)
   o.baby   true = Baby-Panda (grosser Kopf, kleiner Koerper)
   o.arme   0 = Pfoten auf dem Bauch, 1 = Arme hoch (Jubel)
   o.dreh   Drehwinkel der Kugel
   o.mood   'froh' | 'staunen' | 'schwindlig'
   o.blinzeln 0..1, o.wippen (Atmen)
   Weiche Verlaeufe statt harter Kanten; funktioniert auf hellem und dunklem Grund. */
(function(){
'use strict';
const TAU=Math.PI*2;
const SCHWARZ='#1B1E24',SCHWARZ2='#2E333D',WEISS='#FFFFFF',CREME='#F3F1EC',SCHATTEN='#D9DCE2',ROSA='rgba(255,150,170,.55)';

function oval(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU);}
/* weisses Fell mit Licht von oben links */
function fell(g,x,y,rx,ry){const v=g.createRadialGradient(x-rx*0.35,y-ry*0.45,Math.min(rx,ry)*0.15,x,y,Math.max(rx,ry)*1.05);
 v.addColorStop(0,WEISS);v.addColorStop(0.6,CREME);v.addColorStop(1,SCHATTEN);return v;}
function schwarzFell(g,x,y,r){const v=g.createRadialGradient(x-r*0.35,y-r*0.4,r*0.1,x,y,r*1.1);v.addColorStop(0,'#3A404B');v.addColorStop(0.55,SCHWARZ2);v.addColorStop(1,SCHWARZ);return v;}

function gesicht(g,b,o){
 /* Kopfmitte (0,0); b = Babyfaktor fuer groessere Augen */
 const mood=o.mood||'froh',zu=Math.max(0,Math.min(1,o.blinzeln||0));
 /* Augenflecken: Tropfen, oben innen, unten aussen */
 for(const s of [-1,1]){
  g.save();g.translate(s*12*b,1);g.rotate(s*-0.55);
  const v=g.createLinearGradient(0,-11,0,12);v.addColorStop(0,SCHWARZ2);v.addColorStop(1,SCHWARZ);g.fillStyle=v;
  g.beginPath();g.moveTo(0,-11*b);g.bezierCurveTo(8*b,-11*b,9.5*b,4*b,6*b,10*b);g.bezierCurveTo(3*b,14*b,-4*b,14*b,-6.5*b,9*b);g.bezierCurveTo(-9*b,3*b,-7*b,-11*b,0,-11*b);g.fill();
  g.restore();
  /* Auge */
  const ax=s*11.5*b,ay=1.5;
  if(mood==='schwindlig'){g.strokeStyle='#FFFFFF';g.lineWidth=1.4;g.beginPath();for(let a=0;a<TAU*1.6;a+=0.3){const r=0.6+a*0.9;g.lineTo(ax+Math.cos(a*s+(o.zeit||0)*8)*r,ay+Math.sin(a*s+(o.zeit||0)*8)*r);}g.stroke();continue;}
  if(zu>0.6||mood==='lachen'){g.strokeStyle='#FFFFFF';g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.arc(ax,ay+1.5,3.4*b,Math.PI*1.1,Math.PI*1.9);g.stroke();continue;}
  const r=(mood==='staunen'?4.6:4.1)*b;
  g.fillStyle='#4A3A33';oval(g,ax,ay,r,r*(1-zu*0.9));g.fill();
  g.fillStyle='#0E0F12';oval(g,ax,ay+0.3,r*0.62,r*0.62*(1-zu*0.9));g.fill();
  g.fillStyle='#FFFFFF';oval(g,ax-r*0.32,ay-r*0.38,r*0.36,r*0.36);g.fill();oval(g,ax+r*0.35,ay+r*0.3,r*0.16,r*0.16);g.fill();
 }
 /* Schnauze: hellere Flaeche */
 g.fillStyle='rgba(255,255,255,.9)';oval(g,0,10,9.5,6.5);g.fill();
 g.strokeStyle='rgba(150,160,175,.35)';g.lineWidth=0.8;oval(g,0,10,9.5,6.5);g.stroke();
 /* Nase */
 g.fillStyle=SCHWARZ;g.beginPath();g.moveTo(-3.6,6.5);g.quadraticCurveTo(0,5,3.6,6.5);g.quadraticCurveTo(3.2,9.6,0,10.4);g.quadraticCurveTo(-3.2,9.6,-3.6,6.5);g.fill();
 g.fillStyle='rgba(255,255,255,.55)';oval(g,-1,6.6,1.3,0.7);g.fill();
 /* Mund */
 g.strokeStyle=SCHWARZ;g.lineWidth=1.2;g.lineCap='round';g.beginPath();
 if(mood==='staunen'){g.fillStyle='#7A2E3B';oval(g,0,14.2,2.4,2.8);g.fill();}
 else{g.moveTo(0,10.4);g.lineTo(0,12.2);g.moveTo(-3.6,12.6);g.quadraticCurveTo(-1.8,14.6,0,12.2);g.quadraticCurveTo(1.8,14.6,3.6,12.6);g.stroke();
  if(mood==='froh'||mood==='lachen'){g.fillStyle='#E9707F';g.beginPath();g.moveTo(-1.6,13.4);g.quadraticCurveTo(0,16.2,1.6,13.4);g.fill();}}
 /* Wangen */
 g.fillStyle=ROSA;oval(g,-19.5*b,12,4.2,2.6);g.fill();oval(g,19.5*b,12,4.2,2.6);g.fill();
}
/* Schleife fuer die Babys: zwei Schlaufen und ein Knoten */
function schleife(g,x,y,k,farbe,rot){
 g.save();g.translate(x,y);g.rotate(rot||0);g.scale(k,k);
 const v=g.createLinearGradient(0,-7,0,7);v.addColorStop(0,farbe);v.addColorStop(1,'rgba(0,0,0,.25)');
 for(const s of [-1,1]){g.fillStyle=farbe;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(s*4,-9,s*13,-8,s*12,0);g.bezierCurveTo(s*13,8,s*4,9,0,0);g.fill();
  g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(s*7,-3,3.2,1.6,s*-0.3,0,TAU);g.fill();
  g.fillStyle=farbe;g.beginPath();g.moveTo(s*1.5,2);g.lineTo(s*6,11);g.lineTo(s*3.5,11.5);g.closePath();g.fill();}
 g.fillStyle=v;g.beginPath();g.ellipse(0,0,3.4,4,0,0,TAU);g.fill();
 g.restore();
}
function kopf(g,x,y,b,o){
 const rx=29*b,ry=26*b;
 g.save();g.translate(x,y);if(o.neigen)g.rotate(o.neigen);
 /* Ohren */
 for(const s of [-1,1]){g.fillStyle=schwarzFell(g,s*21*b,-21*b,10*b);oval(g,s*21*b,-21*b,10*b,9.5*b);g.fill();g.fillStyle='#3B414C';oval(g,s*20*b,-20*b,5*b,4.6*b);g.fill();}
 g.fillStyle=fell(g,0,0,rx,ry);oval(g,0,0,rx,ry);g.fill();
 g.strokeStyle='rgba(160,170,185,.45)';g.lineWidth=1;oval(g,0,0,rx,ry);g.stroke();
 /* Fellbueschel oben */
 g.fillStyle=WEISS;g.beginPath();g.moveTo(-5,-ry+1.5);g.quadraticCurveTo(-2,-ry-5,1,-ry+1);g.quadraticCurveTo(3,-ry-3.5,6,-ry+2);g.closePath();g.fill();
 gesicht(g,b,o);
 if(o.schleife)schleife(g,15*b,-20*b,0.95*b,o.schleife,0.35);
 g.restore();
}

function sitzen(g,o){
 const b=o.baby?1.18:1,kb=o.baby?0.78:1,arme=o.arme||0,wip=Math.sin(o.wippen||0)*1.2;
 /* Schatten */
 g.fillStyle='rgba(20,30,20,.22)';oval(g,0,0,47*kb,7.5*kb);g.fill();
 /* Beine: nach vorn gestreckt, Fusssohlen sichtbar */
 for(const s of [-1,1]){
  g.fillStyle=schwarzFell(g,s*26*kb,-12*kb,15*kb);oval(g,s*26*kb,-11*kb,16.5*kb,12*kb,s*0.2);g.fill();
  g.fillStyle='#5B5F69';oval(g,s*30*kb,-8*kb,6.6*kb,7.2*kb,s*0.25);g.fill();
  g.fillStyle='#6E737E';for(let i=0;i<3;i++){oval(g,s*(25+i*4.4)*kb,-15.5*kb+Math.abs(i-1)*1.2*kb,1.9*kb,2*kb);g.fill();}
 }
 /* Koerper: birnenfoermig, unten breiter */
 const ky=-40*kb+wip,krx=41*kb,kry=32.5*kb;   // schoen rund und dick
 const bauch=()=>{g.beginPath();g.moveTo(0,ky-kry);g.bezierCurveTo(krx*0.55,ky-kry,krx*1.0,ky-kry*0.3,krx*1.02,ky+kry*0.45);g.bezierCurveTo(krx*0.95,ky+kry*0.95,krx*0.4,ky+kry*1.02,0,ky+kry*1.02);
  g.bezierCurveTo(-krx*0.4,ky+kry*1.02,-krx*0.95,ky+kry*0.95,-krx*1.02,ky+kry*0.45);g.bezierCurveTo(-krx*1.0,ky-kry*0.3,-krx*0.55,ky-kry,0,ky-kry);g.closePath();};
 g.fillStyle=fell(g,0,ky,krx,kry);bauch();g.fill();
 g.save();bauch();g.clip();
 /* schwarzes Schulterband */
 g.fillStyle=schwarzFell(g,0,ky-kry,krx);g.beginPath();g.ellipse(0,ky-kry*0.95,krx*1.1,kry*0.5,0,0,TAU);g.fill();
 g.fillStyle='rgba(255,255,255,.55)';oval(g,-7*kb,ky+8*kb,21*kb,15*kb);g.fill();
 g.restore();
 g.strokeStyle='rgba(160,170,185,.4)';g.lineWidth=1;bauch();g.stroke();
 /* Arme: weiche, dicke Wuelste von der Schulter zum Bauch (oder hoch zum Jubeln) */
 for(const s of [-1,1]){
  const sx=s*krx*0.68,sy=ky-kry*0.62;
  const ex=lerp(s*krx*0.3,s*krx*1.25,arme),ey=lerp(ky+kry*0.18,ky-kry*1.75,arme);
  const cx=lerp(s*krx*0.95,s*krx*1.25,arme),cy=lerp(ky-kry*0.1,ky-kry*0.9,arme);
  g.strokeStyle=schwarzFell(g,(sx+ex)/2,(sy+ey)/2,16*kb);g.lineCap='round';g.lineWidth=19*kb;
  g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(cx,cy,ex,ey);g.stroke();
  g.fillStyle='#5B5F69';oval(g,ex+s*-1*kb,ey+(arme>0.5?-3:3)*kb,4.4*kb,3.4*kb);g.fill();
 }
 /* Kopf */
 kopf(g,0,ky-kry-16*kb+wip*0.5,b*kb,o);
}
function lerp(a,b,t){return a+(b-a)*t;}

/* eingerollt: Kugel, das Muster dreht sich, Licht bleibt fest.
   Ohren stehen ueber den Rand, das Gesicht schaut seitlich heraus. */
function kugel(g,o){
 const kb=o.baby?0.66:1,r=35*kb,d=o.dreh||0;
 g.fillStyle='rgba(20,30,20,.22)';oval(g,0,0,r*1.05,r*0.2);g.fill();
 g.save();g.translate(0,-r);
 const pol=(a,f)=>[Math.cos(a+d)*r*f,Math.sin(a+d)*r*f];
 /* Ohren hinter der Kugel */
 for(const a of [-1.15,-0.45]){const [x,y]=pol(a,0.98);g.fillStyle=schwarzFell(g,x,y,r*0.24);oval(g,x,y,r*0.25,r*0.24);g.fill();g.fillStyle='#3B414C';oval(g,x*0.98,y*0.98,r*0.12,r*0.12);g.fill();}
 g.fillStyle=fell(g,0,0,r,r);g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
 g.save();g.beginPath();g.arc(0,0,r,0,TAU);g.clip();
 /* Ruecken: schwarzes Band gegenueber vom Gesicht */
 {const [x,y]=pol(2.9,1.05);g.fillStyle=schwarzFell(g,x,y,r);oval(g,x,y,r*0.7,r*0.95,d+2.9);g.fill();}
 /* Gesicht */
 {const [x,y]=pol(-0.8,0.3);g.save();g.translate(x,y);g.rotate(d-0.8+Math.PI/2);g.scale(0.8*kb,0.8*kb);gesicht(g,1,{mood:o.mood||'froh',blinzeln:o.blinzeln||0,zeit:o.zeit});g.restore();}
 /* Pfoten um den Bauch geschlungen, Fusssohlen sichtbar */
 for(const [a,f,rx,ry,pad] of [[0.6,0.72,0.34,0.22,false],[1.45,0.8,0.3,0.25,true],[2.0,0.86,0.26,0.22,true]]){
  const [x,y]=pol(a,f);g.fillStyle=schwarzFell(g,x,y,r*rx);oval(g,x,y,r*rx,r*ry,a+d+Math.PI/2);g.fill();
  if(pad){g.fillStyle='#5B5F69';const [px,py]=pol(a,f+0.06);oval(g,px,py,r*0.12,r*0.1,a+d);g.fill();}}
 g.restore();
 if(o.schleife){const [x,y]=pol(-0.8,0.9);schleife(g,x,y,0.9*kb*1.3,o.schleife,d-0.8+Math.PI/2);}
 /* feste Beleuchtung: Glanz oben links, Schatten unten rechts */
 const lg=g.createRadialGradient(-r*0.4,-r*0.45,r*0.05,0,0,r*1.05);lg.addColorStop(0,'rgba(255,255,255,.28)');lg.addColorStop(0.5,'rgba(255,255,255,0)');lg.addColorStop(1,'rgba(30,40,60,.26)');
 g.fillStyle=lg;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
 g.strokeStyle='rgba(160,170,185,.4)';g.lineWidth=1;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
 g.restore();
}

function panda(g,x,y,k,o){
 o=o||{};g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';
 if(o.pose==='kugel')kugel(g,o);else sitzen(g,o);
 g.restore();
}
window.PandaFigur={panda,schleife,SCHLEIFEN:['#FF6FA3','#FFB020','#5FD3C6','#9C7BFF','#FF7A59','#7DD35F']};
})();
