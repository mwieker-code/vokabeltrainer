/* Zebra-Figuren fuer Black & White (Kapitel 4).
   ZebraFigur.seite(ctx, x, y, k, o)   von der Seite, Blick nach rechts (Karte, Verwandlung)
   ZebraFigur.hinten(ctx, x, y, k, o)  von hinten, galoppierend (im Spiel)
   (x, y) = Mitte am Boden. o.lauf = Laufphase (Bogenmass), o.lehnen = Neigung beim Spurwechsel,
   o.stolpern 0..1, o.mood 'froh' | 'schreck'.
   Rund und freundlich wie Pinguin und Panda; Streifen werden in die Koerperteile geschnitten. */
(function(){
'use strict';
const TAU=Math.PI*2,SCHWARZ='#1B1E24',WEISS='#F8F7F2',SCHATTEN='#DCDDE2',MAUL='#3A3E47';
function oval(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU);}
function fell(g,x,y,r){const v=g.createRadialGradient(x-r*0.35,y-r*0.45,r*0.1,x,y,r*1.15);v.addColorStop(0,'#FFFFFF');v.addColorStop(0.6,WEISS);v.addColorStop(1,SCHATTEN);return v;}
/* Streifen: weiche, leicht geschwungene Baender */
function streifen(g,x0,x1,y0,y1,abst,dicke,schwung,winkel){
 const mx=(x0+x1)/2,my=(y0+y1)/2;g.save();g.translate(mx,my);g.rotate(winkel||0);g.translate(-mx,-my);g.fillStyle=SCHWARZ;
 for(let x=x0;x<=x1;x+=abst){g.beginPath();g.moveTo(x-dicke/2,y0);
  g.bezierCurveTo(x-dicke/2+schwung,y0+(y1-y0)*0.33,x-dicke/2-schwung,y0+(y1-y0)*0.66,x-dicke*0.15,y1);
  g.lineTo(x+dicke*0.15,y1);g.bezierCurveTo(x+dicke/2-schwung,y0+(y1-y0)*0.66,x+dicke/2+schwung,y0+(y1-y0)*0.33,x+dicke/2,y0);g.closePath();g.fill();}
 g.restore();
}
function bein(g,x,y,len,knick,dicke,vorn){
 /* Bein von oben (x,y) nach unten, knick = Beugung; gestreift, schwarzer Huf */
 const kx=x+knick*len*0.35,ky=y+len*0.5-Math.abs(knick)*len*0.08,fx=x+knick*len*0.1,fy=y+len-Math.abs(knick)*len*0.25;
 g.save();g.lineCap='round';g.strokeStyle=WEISS;g.lineWidth=dicke;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(kx,ky,fx,fy);g.stroke();
 g.strokeStyle=SCHWARZ;g.lineWidth=dicke*0.45;
 for(let i=1;i<6;i++){const t=i/6.4,px=(1-t)*(1-t)*x+2*(1-t)*t*kx+t*t*fx,py=(1-t)*(1-t)*y+2*(1-t)*t*ky+t*t*fy;g.beginPath();g.moveTo(px-dicke*0.48,py);g.lineTo(px+dicke*0.48,py+1);g.stroke();}
 g.fillStyle=SCHWARZ;oval(g,fx,fy,dicke*0.55,dicke*0.38);g.fill();
 g.restore();
}
function auge(g,x,y,r,mood){
 if(mood==='schreck'){g.fillStyle='#FFFFFF';oval(g,x,y,r*1.1,r*1.2);g.fill();g.fillStyle='#2A2018';oval(g,x+r*0.2,y,r*0.55,r*0.6);g.fill();return;}
 g.fillStyle='#2A2018';oval(g,x,y,r,r*1.1);g.fill();
 g.fillStyle='#FFFFFF';oval(g,x-r*0.3,y-r*0.35,r*0.38,r*0.38);g.fill();oval(g,x+r*0.35,y+r*0.35,r*0.16,r*0.16);g.fill();
 g.strokeStyle=SCHWARZ;g.lineWidth=1.2;g.lineCap='round';for(const a of [-2.3,-1.9,-1.5]){g.beginPath();g.moveTo(x+Math.cos(a)*r*1.05,y+Math.sin(a)*r*1.1);g.lineTo(x+Math.cos(a)*r*1.6,y+Math.sin(a)*r*1.7);g.stroke();}
}

/* ---------------------------------------------------------- von der Seite */
function seite(g,X,Y,k,o){
 o=o||{};const l=o.lauf||0,lauf=o.laeuft?1:0;
 g.save();g.translate(X,Y);g.scale(k,k);g.lineJoin='round';
 g.fillStyle='rgba(20,30,20,.22)';oval(g,0,0,52,7);g.fill();
 const sw=a=>Math.sin(l+a)*0.6*lauf;
 /* hintere Beine (dunkler) */
 g.save();g.globalAlpha=0.85;bein(g,-28,-52,52,sw(Math.PI),10);bein(g,26,-50,50,sw(0),9.5);g.restore();
 /* Schwanz */
 g.strokeStyle=WEISS;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(-44,-70);g.quadraticCurveTo(-56,-52+Math.sin(l*2)*3,-52,-36);g.stroke();
 g.fillStyle=SCHWARZ;oval(g,-52,-32,5,9,0.2);g.fill();
 /* Koerper */
 const koerper=()=>{g.beginPath();g.moveTo(-44,-62);g.bezierCurveTo(-50,-92,-20,-90,0,-86);g.bezierCurveTo(22,-88,40,-92,46,-72);g.bezierCurveTo(50,-52,34,-42,10,-42);g.bezierCurveTo(-14,-40,-42,-40,-44,-62);g.closePath();};
 g.fillStyle=fell(g,0,-66,46);koerper();g.fill();
 g.save();koerper();g.clip();
 streifen(g,-38,40,-96,-36,13,6,4,0);
 /* Hinterteil: Boegen */
 g.strokeStyle=SCHWARZ;g.lineWidth=5;for(let r=8;r<34;r+=10){g.beginPath();g.arc(-44,-66,r,-1.1,1.2);g.stroke();}
 g.fillStyle='rgba(255,255,255,.35)';oval(g,-8,-54,30,8);g.fill();
 g.restore();
 /* vordere Beine */
 bein(g,-24,-50,50,sw(0),10.5);bein(g,30,-48,48,sw(Math.PI),10);
 /* Hals */
 const hals=()=>{g.beginPath();g.moveTo(22,-86);g.bezierCurveTo(30,-108,40,-122,52,-128);g.lineTo(66,-112);g.bezierCurveTo(58,-100,52,-84,46,-66);g.closePath();};
 g.fillStyle=fell(g,40,-100,30);hals();g.fill();
 g.save();hals();g.clip();streifen(g,-10,100,-160,-50,10,5.5,2,0.75);g.restore();
 /* Maehne */
 g.save();g.translate(0,0);
 for(let i=0;i<9;i++){const t=i/8,x=24+t*28,y=-90-t*38;g.fillStyle=i%2?WEISS:SCHWARZ;g.beginPath();g.moveTo(x-3,y+2);g.lineTo(x-7,y-9);g.lineTo(x+3,y-6);g.closePath();g.fill();}
 g.restore();
 /* Kopf */
 const kopf=()=>{g.beginPath();g.moveTo(48,-132);g.bezierCurveTo(60,-142,76,-128,84,-108);g.bezierCurveTo(88,-98,80,-90,70,-94);g.bezierCurveTo(60,-98,50,-112,46,-122);g.closePath();};
 g.fillStyle=fell(g,62,-118,22);kopf();g.fill();
 g.save();kopf();g.clip();streifen(g,30,90,-160,-80,7.5,4,1.5,-0.55);g.fillStyle='rgba(255,255,255,.0)';
 g.fillStyle=MAUL;oval(g,80,-100,10,9,0.5);g.fill();g.restore();
 g.fillStyle='#14161A';oval(g,82,-102,1.8,2.6,0.4);g.fill();
 /* Ohren */
 for(const [x,r] of [[50,-0.25],[57,0.15]]){g.save();g.translate(x,-132);g.rotate(r);g.fillStyle=WEISS;g.beginPath();g.moveTo(-4,0);g.quadraticCurveTo(-3,-14,0,-18);g.quadraticCurveTo(4,-14,4,0);g.closePath();g.fill();
  g.fillStyle='#F2B8C6';g.beginPath();g.moveTo(-1.5,-2);g.quadraticCurveTo(-1,-11,0,-13);g.quadraticCurveTo(1.5,-11,1.6,-2);g.closePath();g.fill();g.fillStyle=SCHWARZ;oval(g,0,-17,2.2,2.2);g.fill();g.restore();}
 auge(g,64,-120,4.2,o.mood);
 g.fillStyle='rgba(255,150,170,.45)';oval(g,70,-108,4,2.6,0.4);g.fill();
 g.restore();
}

/* ---------------------------------------------------------- von hinten */
function hinten(g,X,Y,k,o){
 o=o||{};const l=o.lauf||0,auf=Math.abs(Math.sin(l))*5,neig=o.lehnen||0,st=o.stolpern||0;
 g.save();g.translate(X,Y);g.scale(k,k);g.lineJoin='round';
 g.fillStyle='rgba(60,40,10,.25)';oval(g,0,0,38,7);g.fill();
 g.translate(0,-auf);g.rotate(neig*0.18+Math.sin(st*20)*0.06*st);
 /* Vorderbeine zwischen den Hinterbeinen (weiter weg, kleiner) */
 g.save();g.globalAlpha=0.8;bein(g,-8,-64,46-4,Math.sin(l+1.6)*0.8,8);bein(g,8,-64,46-4,Math.sin(l+1.6+Math.PI)*0.8,8);g.restore();
 /* Hals und Kopf (von hinten): Hals breit am Ansatz, Kopf darueber */
 const hals=()=>{g.beginPath();g.moveTo(-20,-98);g.bezierCurveTo(-18,-118,-13,-130,-9,-136);g.lineTo(9,-136);g.bezierCurveTo(13,-130,18,-118,20,-98);g.closePath();};
 g.fillStyle=fell(g,0,-118,22);hals();g.fill();
 g.save();hals();g.clip();g.strokeStyle=SCHWARZ;g.lineWidth=4.2;g.lineCap='round';for(let y=-134;y<-96;y+=7.5){g.beginPath();g.moveTo(-22,y+5);g.quadraticCurveTo(0,y-2,22,y+5);g.stroke();}g.restore();
 g.fillStyle=fell(g,0,-142,13);oval(g,0,-140,12,11);g.fill();
 g.save();oval(g,0,-140,12,11);g.clip();g.strokeStyle=SCHWARZ;g.lineWidth=3;for(let y=-150;y<-130;y+=6){g.beginPath();g.moveTo(-13,y+3);g.quadraticCurveTo(0,y-2,13,y+3);g.stroke();}g.restore();
 for(const s of [-1,1]){g.save();g.translate(s*8,-147);g.rotate(s*0.35+Math.sin(l*2)*0.05);g.fillStyle=WEISS;g.beginPath();g.moveTo(-4,2);g.quadraticCurveTo(-3,-12,0,-17);g.quadraticCurveTo(3,-12,4,2);g.closePath();g.fill();g.fillStyle='#F2B8C6';g.beginPath();g.moveTo(-1.5,0);g.quadraticCurveTo(-1,-9,0,-12);g.quadraticCurveTo(1,-9,1.5,0);g.closePath();g.fill();g.fillStyle=SCHWARZ;oval(g,0,-15,2.2,2.2);g.fill();g.restore();}
 /* Maehne mittig den Hals hinab */
 for(let i=0;i<8;i++){const y=-150+i*7;g.fillStyle=i%2?WEISS:SCHWARZ;oval(g,0,y,3.4,4.2);g.fill();}
 /* Ruecken */
 g.fillStyle=fell(g,0,-90,32);oval(g,0,-90,30,15);g.fill();
 g.save();oval(g,0,-90,30,15);g.clip();g.fillStyle=SCHWARZ;g.fillRect(-2.5,-106,5,32);streifen(g,-30,30,-106,-74,10,4,2,0);g.restore();
 /* Hinterbeine: abwechselnd anheben */
 for(const s of [-1,1]){const ph=Math.sin(l+(s>0?Math.PI:0)),hoch=Math.max(0,ph)*14;
  bein(g,s*18,-58,58-hoch*0.6,(s>0?-1:1)*Math.max(0,ph)*0.9,13);}
 /* Hinterteil: zwei runde Keulen mit Boegen */
 const keule=s=>{oval(g,s*16,-70,22,24);};
 for(const s of [-1,1]){g.fillStyle=fell(g,s*16,-72,24);keule(s);g.fill();
  g.save();keule(s);g.clip();g.strokeStyle=SCHWARZ;g.lineWidth=4.6;g.lineCap='round';
  for(let y=-92;y<-44;y+=8.5){g.beginPath();g.moveTo(s*40,y-6);g.quadraticCurveTo(s*14,y+7,s*-2,y-2);g.stroke();}
  g.fillStyle='rgba(255,255,255,.28)';oval(g,s*10,-80,8,10);g.fill();g.restore();}
 g.strokeStyle='rgba(150,155,165,.5)';g.lineWidth=1;g.beginPath();g.moveTo(0,-88);g.lineTo(0,-50);g.stroke();
 /* Schwanz, pendelt */
 const sch=Math.sin(l*1.3)*0.5;
 g.save();g.translate(0,-84);g.rotate(sch);g.strokeStyle=WEISS;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(3,14,0,26);g.stroke();
 g.fillStyle=SCHWARZ;oval(g,0,30,4.5,8);g.fill();g.restore();
 g.restore();
}
window.ZebraFigur={seite,hinten};
})();
