/* =========================================================================
   FIGUREN fuer die Spiele in Year 6: Rodelkind, Silky die Robbe, Pinguin.
   Sled Run und Summit Climb zeichnen dieselben Figuren; jede Funktion
   bekommt den Zeichenkontext mit.
     Figuren.pinguin(ctx,x,y,k,{wave,hoch,slide,scarf,goggles,blush,hop,rot})
     Figuren.silky(ctx,x,y,k,{wave,hoch,blink})
     Figuren.kind(ctx,wave,lean)            Rodelkind, Sitz bei y = -14
     Figuren.kindKlettern(ctx,x,y,k,{reach,kick,wave})  haengt an den Haenden (x,y)
   ========================================================================= */
(function(){
'use strict';
function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
/* Pinguin: aufrecht (am Pistenrand, als Fahrer) oder baeuchlings rutschend */
function pinguin(ctx,X,Y,k,o){
  o=o||{};const hop=o.hop||0,wave=o.wave||0;
  ctx.save();ctx.translate(X,Y-hop);ctx.scale(k,k);if(o.rot)ctx.rotate(o.rot);
  if(o.slide){
    ctx.fillStyle='rgba(50,90,150,.25)';ctx.beginPath();ctx.ellipse(0,4,20,5,0,0,7);ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.ellipse(0,-4,19,10,0,0,7);ctx.fill();
    ctx.strokeStyle='#1B2233';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-14,-4);ctx.lineTo(-25,-8+wave*4);ctx.moveTo(14,-4);ctx.lineTo(25,-8-wave*4);ctx.stroke();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(0,-14,9,0,7);ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(0,-12,6,5.5,0,0,7);ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-2.4,-13.5,1.4,0,7);ctx.arc(2.4,-13.5,1.4,0,7);ctx.fill();
    ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.moveTo(-2.5,-10.5);ctx.lineTo(2.5,-10.5);ctx.lineTo(0,-7);ctx.closePath();ctx.fill();
    ctx.restore();return;
  }
  ctx.fillStyle='rgba(50,90,150,.25)';ctx.beginPath();ctx.ellipse(0,hop/k+1,15,4,0,0,7);ctx.fill();
  ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.ellipse(-6,0,6,2.6,0,0,7);ctx.ellipse(6,0,6,2.6,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.ellipse(0,-17,13,18,0,0,7);ctx.fill();
  ctx.strokeStyle='#1B2233';ctx.lineWidth=5;ctx.lineCap='round';
  if(o.hoch){ctx.beginPath();ctx.moveTo(-11,-26);ctx.lineTo(-15+wave*2,-56);ctx.moveTo(11,-26);
    if(o.einhand)ctx.lineTo(20,-8+wave*6);else ctx.lineTo(15-wave*2,-56);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(-11,-22);ctx.lineTo(-17,-10+wave*-6);ctx.moveTo(11,-22);ctx.lineTo(18,-12+wave*7);ctx.stroke();}
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(0,-13,8.5,13,0,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(0,-34,10,0,7);ctx.fill();
  const big=o.mood==='scared'?1.2:1,look=(o.look||0)*1.2;
  ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(-3.6,-34,3.6*big,4.2*big,0,0,7);ctx.ellipse(3.6,-34,3.6*big,4.2*big,0,0,7);ctx.fill();
  if(o.mood==='happy'){ctx.strokeStyle='#1B2233';ctx.lineWidth=1.6;ctx.beginPath();
    for(const ex of [-3.4,3.4]){ctx.moveTo(ex-2.2,-33);ctx.quadraticCurveTo(ex,-36.4,ex+2.2,-33);}ctx.stroke();}
  else{ctx.fillStyle='#1B2233';ctx.beginPath();const r=o.mood==='scared'?1.2:1.7;ctx.arc(-3+look,-33.5+(o.mood==='scared'?0.6:0),r,0,7);ctx.arc(3+look,-33.5+(o.mood==='scared'?0.6:0),r,0,7);ctx.fill();}
  ctx.fillStyle='#FF9A3C';ctx.beginPath();ctx.moveTo(-3.4,-30);ctx.lineTo(3.4,-30);ctx.lineTo(0,-25.5);ctx.closePath();ctx.fill();
  if(o.blush){ctx.fillStyle='rgba(255,120,140,.55)';ctx.beginPath();ctx.arc(-7,-29,2.2,0,7);ctx.arc(7,-29,2.2,0,7);ctx.fill();}
  if(o.scarf){ctx.strokeStyle='#3CCFBE';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-9,-25);ctx.lineTo(9,-25);ctx.moveTo(6,-25);ctx.quadraticCurveTo(18+wave*3,-30,26+wave*5,-22+wave*4);ctx.stroke();}
  if(o.goggles){ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(0,-38,10.5,Math.PI,0);ctx.fill();ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.arc(0,-48,3.6,0,7);ctx.fill();}
  if(o.sweat)schweiss(ctx,11,-36,o.sweat);
  ctx.restore();
}
/* Das Rodelkind in Schlitten-Koordinaten (Sitzflaeche bei y = -14) */
function kind(ctx,wave,lean){
  /* Schal, Jacke, Arme */
  ctx.strokeStyle='#3CCFBE';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(6,-46);ctx.quadraticCurveTo(26+wave*4,-52-lean*30,40+wave*6,-44+wave*5);ctx.stroke();
  ctx.fillStyle='#FF7A59';rounded(ctx,-17,-48,34,38,12);ctx.fill();
  ctx.fillStyle='#E4603F';rounded(ctx,-17,-24,34,14,7);ctx.fill();
  ctx.strokeStyle='#FF7A59';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-15,-38);ctx.lineTo(-25,-18);ctx.moveTo(15,-38);ctx.lineTo(25,-18);ctx.stroke();
  ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-25,-17,5,0,7);ctx.arc(25,-17,5,0,7);ctx.fill();
  ctx.fillStyle='#3CCFBE';rounded(ctx,-13,-50,26,8,4);ctx.fill();
  /* Helm mit Brillenband und Bommel */
  ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(0,-62,15,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.fillRect(-15,-65,30,5);
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(-5,-69,4,0,7);ctx.fill();
  ctx.fillStyle='#FF7A59';ctx.beginPath();ctx.arc(0,-78,5,0,7);ctx.fill();
}
/* SILKY - die Robbe: hellblau mit dunkleren Flecken, weisser Bauch, dunkle
   Herznase, Schnurrhaare, freundliches Laecheln. Sitzt aufrecht und winkt
   mit der rechten Flosse, die Schwanzflosse schaut seitlich heraus. */
function silky(ctx,X,Y,k,o){
  o=o||{};const wave=o.wave||0,ink='#355C8C',base='#9DBEE6',dark='#7FA3D3',spot='#4E7DB9';
  ctx.save();ctx.translate(X,Y);ctx.scale(k,k);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.lineWidth=1.4;ctx.strokeStyle=ink;
  /* Schwanzflosse links unten */
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-14,-4);ctx.quadraticCurveTo(-30,-2,-40,-10);ctx.quadraticCurveTo(-34,-2,-42,4);ctx.quadraticCurveTo(-28,6,-12,2);ctx.closePath();ctx.fill();ctx.stroke();
  /* Koerper: unten breit, nach oben schmal */
  const body=()=>{ctx.beginPath();ctx.moveTo(-22,0);ctx.bezierCurveTo(-26,-24,-18,-44,-12,-52);ctx.lineTo(12,-52);ctx.bezierCurveTo(18,-44,26,-24,22,0);ctx.quadraticCurveTo(0,6,-22,0);ctx.closePath();};
  const g=ctx.createLinearGradient(-24,0,24,0);g.addColorStop(0,'#B8D2F0');g.addColorStop(.55,base);g.addColorStop(1,dark);
  ctx.fillStyle=g;body();ctx.fill();
  /* Bauch */
  ctx.save();body();ctx.clip();
  ctx.fillStyle='#EEF4FB';ctx.beginPath();ctx.ellipse(-2,-16,13,24,0,0,7);ctx.fill();
  /* Flecken auf Flanken und Ruecken */
  ctx.fillStyle=spot;
  for(const [x,y,rx,ry,r] of [[15,-12,3.4,2.2,.4],[18,-24,2.6,1.8,-.3],[13,-34,3,2,.2],[19,-6,2.2,1.5,0],[-17,-26,2.4,1.6,.5],[-19,-12,2,1.4,-.2],[10,-44,2.2,1.5,0],[16,-38,1.6,1.1,0]]){ctx.beginPath();ctx.ellipse(x,y,rx,ry,r,0,7);ctx.fill();}
  ctx.restore();
  body();ctx.stroke();
  /* Kopf */
  const hy=-62;
  ctx.fillStyle=base;ctx.beginPath();ctx.ellipse(0,hy,16,15,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(-5,hy-6,7,5,-.4,0,7);ctx.fill();
  ctx.fillStyle=spot;for(const [x,y,r] of [[9,hy-9,2],[12,hy-3,1.4],[-11,hy-8,1.5],[5,hy-13,1.3]]){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
  ctx.beginPath();ctx.ellipse(0,hy,16,15,0,0,7);ctx.stroke();
  /* Schnauze */
  ctx.fillStyle='#DCE9F8';ctx.beginPath();ctx.ellipse(0,hy+5,10,7,0,0,7);ctx.fill();
  /* Augen mit Glanzpunkt und Brauen; ab und zu blinzelt Silky */
  const blink=o.blink!==undefined&&(o.blink%3.2)<0.13;
  ctx.fillStyle='#1E2C44';
  for(const ex of [-6,6]){
    const lk=(o.look||0)*1.1;
    if(o.mood==='happy'){ctx.beginPath();ctx.moveTo(ex-2.8,hy-2);ctx.quadraticCurveTo(ex,hy-6,ex+2.8,hy-2);ctx.stroke();}
    else if(blink){ctx.beginPath();ctx.moveTo(ex-2.6,hy-3);ctx.quadraticCurveTo(ex,hy-1,ex+2.6,hy-3);ctx.stroke();}
    else if(o.mood==='scared'){ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(ex,hy-3,3.1,3.6,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#1E2C44';ctx.beginPath();ctx.arc(ex+lk,hy-2.4,1.3,0,7);ctx.fill();}
    else{ctx.beginPath();ctx.ellipse(ex+lk,hy-3,2.4,2.9,0,0,7);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(ex-0.8+lk,hy-4,0.9,0,7);ctx.fill();ctx.fillStyle='#1E2C44';}
    const br=o.mood==='scared'?-2.5:0;
    ctx.beginPath();ctx.moveTo(ex-3,hy-8+br);ctx.quadraticCurveTo(ex,hy-10+br,ex+3,hy-8.5+br*0.5);ctx.stroke();
  }
  /* Herznase */
  ctx.fillStyle='#2A4672';ctx.beginPath();ctx.moveTo(0,hy+5.5);ctx.bezierCurveTo(-6,hy+2,-4,hy-1,0,hy+1.2);ctx.bezierCurveTo(4,hy-1,6,hy+2,0,hy+5.5);ctx.fill();
  if(o.mood==='scared'){
    /* Erschrocken: kleiner runder Mund */
    ctx.fillStyle='#B8456A';ctx.beginPath();ctx.ellipse(0,hy+9.5,2.4,3,0,0,7);ctx.fill();ctx.stroke();
  }else{
    /* Offenes Laecheln */
    const w2=o.mood==='happy'?5.5:4.5,d2=o.mood==='happy'?16:14;
    ctx.fillStyle='#E0607E';ctx.beginPath();ctx.moveTo(-w2,hy+7);ctx.quadraticCurveTo(0,hy+d2,w2,hy+7);ctx.quadraticCurveTo(0,hy+8.5,-w2,hy+7);ctx.fill();
    ctx.fillStyle='#F4A3B6';ctx.beginPath();ctx.ellipse(0,hy+10.6+(d2-14)*0.4,2.2,1.3,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(-w2,hy+7);ctx.quadraticCurveTo(0,hy+d2,w2,hy+7);ctx.stroke();
  }
  /* Wangen */
  ctx.fillStyle='rgba(120,160,215,.55)';ctx.beginPath();ctx.ellipse(-11,hy+3,2.6,1.8,0,0,7);ctx.ellipse(11,hy+3,2.6,1.8,0,0,7);ctx.fill();
  /* Schnurrhaare und Brauenhaare */
  ctx.lineWidth=0.9;ctx.strokeStyle='#22385C';
  for(const s2 of [-1,1]){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s2*7,hy+4+i*1.6);ctx.quadraticCurveTo(s2*15,hy+1+i*2.6,s2*(22+i),hy-1+i*4.2);ctx.stroke();}
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(s2*(4+i*3),hy-11);ctx.lineTo(s2*(6+i*5),hy-18+i);ctx.stroke();}}
  ctx.lineWidth=1.4;ctx.strokeStyle=ink;
  const flosse=(x,y,rot,spiegel)=>{
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);if(spiegel)ctx.scale(-1,1);
    ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(-6,18,2,26);ctx.quadraticCurveTo(9,22,6,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=spot;ctx.beginPath();ctx.moveTo(1,20);ctx.lineTo(3,24);ctx.moveTo(4,19);ctx.lineTo(6,22);ctx.stroke();ctx.strokeStyle=ink;
    ctx.restore();};
  if(o.hoch){
    /* Beide Flossen nach oben - Silky haelt sich am Griff fest */
    flosse(-14,-42,Math.PI-0.18+wave*0.08,true);
    if(o.einhand)flosse(15,-36,-0.6+wave*0.5,false);else flosse(14,-42,Math.PI+0.18-wave*0.08,false);
  }else{
    /* Linke Flosse ruht auf dem Bauch */
    ctx.fillStyle=base;ctx.beginPath();ctx.ellipse(-12,-26,6,12,0.55,0,7);ctx.fill();ctx.stroke();
    ctx.strokeStyle=spot;ctx.beginPath();ctx.moveTo(-8,-18);ctx.lineTo(-6,-16);ctx.moveTo(-10,-17);ctx.lineTo(-8.5,-14.5);ctx.stroke();ctx.strokeStyle=ink;
    /* Rechte Flosse winkt */
    flosse(15,-40,-1.15+wave*0.35,false);
  }
  if(o.sweat)schweiss(ctx,16,-70,o.sweat);
  ctx.restore();
}
/* Schweisstropfen, wenn es brenzlig wird (t laeuft mit der Zeit) */
function schweiss(ctx,x,y,t){
  const f=(t*1.6)%1;ctx.globalAlpha=1-f;ctx.fillStyle='#9FD8FF';
  ctx.beginPath();ctx.moveTo(x,y+f*10-4);ctx.quadraticCurveTo(x+3.4,y+f*10+2,x,y+f*10+4);ctx.quadraticCurveTo(x-3.4,y+f*10+2,x,y+f*10-4);ctx.fill();ctx.globalAlpha=1;
}
/* Das Kletterkind. (X,Y) ist die Mitte zwischen den Haenden.
   o.lh / o.rh   Handpositionen relativ dazu (Standard: am selben Griff)
   o.tilt        Pendeln des Koerpers um die Haende (Bogenmass)
   o.stretch     >1 streckt den Koerper beim Hochziehen, <1 staucht ihn
   o.kick        Beine strampeln, o.push Beine stossen sich ab
   o.mood        'focus' | 'happy' | 'scared', o.look Blick seitwaerts, o.sweat
   o.einhand     haengt nur an der linken Hand */
function kindKlettern(ctx,X,Y,k,o){
  o=o||{};const reach=o.reach||0,kick=o.kick||0,push=o.push||0,tilt=o.tilt||0,st=o.stretch||1;
  const lh=o.lh||{x:-9,y:0},rh=o.einhand?{x:16,y:46}:(o.rh||{x:9,y:0});
  ctx.save();ctx.translate(X,Y);ctx.scale(k,k);ctx.lineCap='round';ctx.lineJoin='round';
  const hc={x:(lh.x+(o.einhand?lh.x+18:rh.x))/2,y:o.einhand?lh.y:(lh.y+rh.y)/2};
  const sh=(28-reach*6)*st;            /* Schulterhoehe unter den Haenden */
  const rot=(px,py)=>({x:hc.x+px*Math.cos(tilt)-py*Math.sin(tilt),y:hc.y+px*Math.sin(tilt)+py*Math.cos(tilt)});
  const sL=rot(-10,sh+6),sR=rot(10,sh+6);
  /* Koerper im gekippten Rahmen */
  ctx.save();ctx.translate(hc.x,hc.y);ctx.rotate(tilt);
  ctx.strokeStyle='#1B2233';ctx.lineWidth=8;
  const lk=kick*6,lp=push*8;
  ctx.beginPath();ctx.moveTo(-6,sh+34);ctx.lineTo(-10-lk,sh+52+kick*2-lp);ctx.lineTo(-8-kick*10,sh+60-lp*1.4);
  ctx.moveTo(6,sh+34);ctx.lineTo(10+lk,sh+50-kick*4-lp*0.6);ctx.lineTo(9+kick*8,sh+58-lp);ctx.stroke();
  ctx.fillStyle='#3A2A22';ctx.beginPath();ctx.ellipse(-9-kick*10,sh+61-lp*1.4,6,3.5,0,0,7);ctx.ellipse(10+kick*8,sh+59-lp,6,3.5,0,0,7);ctx.fill();
  ctx.fillStyle='#3CCFBE';rounded(ctx,-13,sh+4,26,30,8);ctx.fill();
  ctx.restore();
  /* Arme von den Schultern zu den Haenden, mit Ellbogen, wenn sie nah sind */
  ctx.strokeStyle='#FF7A59';ctx.lineWidth=8;
  for(const [s2,h2,side] of [[sL,lh,-1],[sR,rh,1]]){
    const dx=h2.x-s2.x,dy=h2.y-s2.y,len=Math.hypot(dx,dy),bend=Math.max(0,34-len)*0.7;
    const mx=(s2.x+h2.x)/2+side*bend,my=(s2.y+h2.y)/2;
    ctx.beginPath();ctx.moveTo(s2.x,s2.y);ctx.quadraticCurveTo(mx,my,h2.x,h2.y);ctx.stroke();
  }
  ctx.fillStyle='#F2C9A5';ctx.beginPath();ctx.arc(lh.x,lh.y+1,4.6,0,7);ctx.arc(rh.x,rh.y+1,4.6,0,7);ctx.fill();
  /* Jacke mit Gurt und Kopf */
  ctx.save();ctx.translate(hc.x,hc.y);ctx.rotate(tilt);
  ctx.fillStyle='#FF7A59';rounded(ctx,-14,sh,28,36,10);ctx.fill();
  ctx.fillStyle='#E4603F';rounded(ctx,-14,sh+20,28,10,5);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.fillRect(-14,sh+26,28,4);ctx.fillStyle='#FFC857';ctx.fillRect(-3,sh+25,6,6);
  const hy=sh-8,look=(o.look||0)*1.6;
  ctx.fillStyle='#F2C9A5';ctx.beginPath();ctx.arc(0,hy,10,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,140,120,.4)';ctx.beginPath();ctx.arc(-6,hy+3,2.2,0,7);ctx.arc(6,hy+3,2.2,0,7);ctx.fill();
  ctx.fillStyle='#1B2233';ctx.strokeStyle='#1B2233';ctx.lineWidth=1.5;
  if(o.mood==='happy'){ctx.beginPath();ctx.moveTo(-5.2,hy-0.4);ctx.quadraticCurveTo(-3.4,hy-3,-1.6,hy-0.4);ctx.moveTo(1.6,hy-0.4);ctx.quadraticCurveTo(3.4,hy-3,5.2,hy-0.4);ctx.stroke();
    ctx.fillStyle='#B5552F';ctx.beginPath();ctx.moveTo(-3.6,hy+3);ctx.quadraticCurveTo(0,hy+8,3.6,hy+3);ctx.closePath();ctx.fill();}
  else if(o.mood==='scared'){ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(-3.4,hy-0.5,2.4,0,7);ctx.arc(3.4,hy-0.5,2.4,0,7);ctx.fill();
    ctx.fillStyle='#1B2233';ctx.beginPath();ctx.arc(-3.4+look*0.5,hy,1.1,0,7);ctx.arc(3.4+look*0.5,hy,1.1,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(0,hy+4.6,1.6,2.1,0,0,7);ctx.fill();}
  else{ctx.beginPath();ctx.arc(-3.4+look,hy,1.4,0,7);ctx.arc(3.4+look,hy,1.4,0,7);ctx.fill();
    ctx.strokeStyle='#B5552F';ctx.beginPath();ctx.moveTo(-2.4,hy+4.2);ctx.lineTo(2.4,hy+4);ctx.stroke();}
  ctx.fillStyle='#FFC857';ctx.beginPath();ctx.arc(0,hy-3,11,Math.PI,0);ctx.fill();
  ctx.fillStyle='#E9A92F';ctx.fillRect(-11,hy-4,22,3);
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(-4,hy-9,2.6,0,7);ctx.fill();
  if(o.sweat)schweiss(ctx,11,hy-6,o.sweat);
  ctx.restore();
  ctx.restore();
}
window.Figuren={pinguin,silky,kind,kindKlettern};
})();
