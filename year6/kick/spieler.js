/* =========================================================================
   FREE KICK TOUR – Figuren
   Eigene Figuren fuer das Fussballspiel, unabhaengig von ../figuren.js:
     Spieler.schuetze(ctx,x,y,k,wer,o)  Leo, Mia oder Flash der Fuchs, von hinten
         o: {pose:'stand'|'anlauf'|'schuss'|'jubel'|'traurig', p (0..1), t (Zeit)}
     Spieler.torwart(ctx,x,y,k,o)       von vorn
         o: {pose:'bereit'|'hecht'|'jubel'|'liegt', dir (-1|1), p (0..1), t, blick, farbe}
     Spieler.mauer(ctx,x,y,k,o)         ein Kind in der Mauer, von vorn
         o: {sprung (0..1), farbe, haut, seed}
   Fusspunkt ist (x,y); eine Figur ist bei k = 1 etwa 125 Punkte hoch.
   ========================================================================= */
(function(){
'use strict';
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function linie(ctx,x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
/* Glied mit Knie oder Ellbogen: zwei Abschnitte, der Knick zeigt zur Seite s */
function glied(ctx,x1,y1,x2,y2,knick,w,c1,c2){
  const mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1;
  const kx=mx-dy/l*knick,ky=my+dx/l*knick;
  linie(ctx,x1,y1,kx,ky,w,c1);linie(ctx,kx,ky,x2,y2,w*0.92,c2||c1);
  return [kx,ky];
}

/* ------------------------------------------------------------ Schuetzen */
const KADER={
  leo:  {name:'LEO',  nr:'9', trikot:'#E63946',dunkel:'#B4232F',schrift:'#FFFFFF',hose:'#F4F1EA',stutzen:'#E63946',haut:'#EDB98F',haar:'#4A2E1F'},
  mia:  {name:'MIA',  nr:'10',trikot:'#12B5A5',dunkel:'#0B8478',schrift:'#0E2A47',hose:'#0E2A47',stutzen:'#12B5A5',haut:'#B87A52',haar:'#1C1414'},
  flash:{name:'FLASH',nr:'7', trikot:'#7C4DFF',dunkel:'#5A2FD6',schrift:'#FFD447',hose:'#2A1B5C',stutzen:'#2A1B5C',haut:'#F08A3C',haar:'#F08A3C',fuchs:true}
};
function schuetze(ctx,X,Y,k,wer,o){
  o=o||{};const K=KADER[wer]||KADER.leo,t=o.t||0,p=o.p||0,pose=o.pose||'stand';
  ctx.save();ctx.translate(X,Y);ctx.scale(k,k);
  /* Grundhaltung */
  let hop=0,lean=0,fL=[-11,-3],fR=[11,-3],hL=[-30,-62],hR=[30,-62],ellL=6,ellR=-6,kneeL=3,kneeR=-3,kopf=0;
  if(pose==='stand'){hop=Math.abs(Math.sin(t*3.2))*2.2;hL=[-27,-60+Math.sin(t*3.2)*1.5];hR=[27,-60-Math.sin(t*3.2)*1.5];}
  else if(pose==='anlauf'){
    const s=Math.sin(p*TAU*2);hop=Math.abs(s)*5;lean=0.08;
    fL=[-9,-3-Math.max(0,s)*14];fR=[9,-3-Math.max(0,-s)*14];
    hL=[-26,-74+s*10];hR=[26,-74-s*10];ellL=-6;ellR=6;
  }else if(pose==='schuss'){
    /* p: 0 Ausholen, 0.45 Treffpunkt, 1 Durchschwingen */
    lean=lerp(0.12,-0.1,p);
    const q=p<0.45?p/0.45:1+(p-0.45)/0.55;
    const fx=q<1?lerp(18,8,q):lerp(8,2,q-1),fy=q<1?lerp(-34,-6,q*q):lerp(-6,-58,(q-1));
    fR=[fx,fy];kneeR=q<1?-10:6;fL=[-10,-3];
    hL=[-44,-86];hR=[lerp(36,20,p),lerp(-70,-92,p)];ellL=-4;ellR=8;
  }else if(pose==='jubel'){
    const j=Math.abs(Math.sin(t*7));hop=j*16;
    hL=[-30,-138-j*4];hR=[30,-138-j*4];ellL=-8;ellR=8;fL=[-13,-3-j*4];fR=[13,-3-j*4];kopf=-0.08;
  }else if(pose==='traurig'){
    hL=[-8,-124];hR=[8,-124];ellL=-16;ellR=16;lean=0;kopf=0.15;
  }
  ctx.fillStyle='rgba(10,30,15,.32)';ctx.beginPath();ctx.ellipse(0,1,30,7,0,0,TAU);ctx.fill();
  ctx.translate(0,-hop);ctx.rotate(lean);
  const huefte=-52,schulter=-98;
  /* Schwanz des Fuchses hinter den Beinen */
  if(K.fuchs){
    const w=Math.sin(t*4.5)*0.35+(pose==='jubel'?Math.sin(t*14)*0.4:0);
    ctx.save();ctx.translate(6,-58);ctx.rotate(0.5+w);
    ctx.fillStyle='#E0752A';ctx.beginPath();ctx.moveTo(-6,0);ctx.quadraticCurveTo(26,4,40,30);ctx.quadraticCurveTo(30,46,10,38);ctx.quadraticCurveTo(0,20,-6,0);ctx.fill();
    ctx.fillStyle='#FFF4E6';ctx.beginPath();ctx.moveTo(40,30);ctx.quadraticCurveTo(34,46,16,40);ctx.quadraticCurveTo(28,32,34,24);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  /* Beine */
  const bein=(hx,f,kn)=>{
    const ax=f[0],ay=f[1]-7;
    const [kx,ky]=glied(ctx,hx,huefte+2,ax,ay,kn,10,K.fuchs?'#E0752A':K.haut,K.stutzen);
    linie(ctx,kx+(ax-kx)*0.35,ky+(ay-ky)*0.35,ax,ay,10.5,K.stutzen);
    /* Schuh */
    ctx.fillStyle='#14161C';ctx.beginPath();ctx.ellipse(ax,ay+5,7,5,0,0,TAU);ctx.fill();
    ctx.fillStyle='#FFD447';ctx.fillRect(ax-5,ay+7,10,1.6);
  };
  bein(-8,fL,kneeL);bein(8,fR,kneeR);
  /* Hose */
  ctx.fillStyle=K.hose;rounded(ctx,-18,huefte-12,36,20,6);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(-1,huefte-2,2,10);
  /* Arme: von hinten liegen sie seitlich neben dem Rumpf */
  const arm=(sx,h,el)=>{
    const [ex,ey]=glied(ctx,sx,schulter+4,h[0],h[1],el,7.5,K.trikot,K.fuchs?'#E0752A':K.haut);
    linie(ctx,sx,schulter+4,sx+(ex-sx)*0.55,schulter+4+(ey-schulter-4)*0.55,9.5,K.trikot);
    ctx.fillStyle=K.fuchs?'#3A2418':K.haut;ctx.beginPath();ctx.arc(h[0],h[1],4.6,0,TAU);ctx.fill();
  };
  arm(-19,hL,ellL);arm(19,hR,ellR);
  /* Rumpf mit Name und Nummer */
  const g=ctx.createLinearGradient(-20,0,20,0);g.addColorStop(0,K.dunkel);g.addColorStop(0.35,K.trikot);g.addColorStop(0.7,K.trikot);g.addColorStop(1,K.dunkel);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-21,schulter);ctx.quadraticCurveTo(0,schulter-5,21,schulter);
  ctx.lineTo(17,huefte-8);ctx.quadraticCurveTo(0,huefte-5,-17,huefte-8);ctx.closePath();ctx.fill();
  ctx.fillStyle=K.dunkel;ctx.fillRect(-17,huefte-12,34,3);
  ctx.fillStyle=K.schrift;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='800 7px Inter,system-ui,sans-serif';ctx.fillText(K.name,0,schulter+9);
  ctx.font='900 22px Inter,system-ui,sans-serif';ctx.fillText(K.nr,0,schulter+26);
  /* Kopf von hinten */
  ctx.save();ctx.translate(0,schulter-14);ctx.rotate(kopf);
  ctx.fillStyle=K.fuchs?'#E0752A':K.haut;ctx.fillRect(-4,4,8,8);
  if(K.fuchs){
    ctx.fillStyle='#E0752A';
    for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*5,-8);ctx.lineTo(s*14,-24);ctx.lineTo(s*14,-4);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#3A2418';for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*11,-17);ctx.lineTo(s*14,-24);ctx.lineTo(s*14,-15);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#F08A3C';ctx.beginPath();ctx.arc(0,-2,13,0,TAU);ctx.fill();
    ctx.fillStyle='#FFF4E6';ctx.beginPath();ctx.ellipse(-11,4,4,6,0.4,0,TAU);ctx.ellipse(11,4,4,6,-0.4,0,TAU);ctx.fill();
  }else{
    ctx.fillStyle=K.haut;ctx.beginPath();ctx.ellipse(-13,-1,3,4.5,0,0,TAU);ctx.ellipse(13,-1,3,4.5,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(0,-2,12.5,0,TAU);ctx.fill();
    ctx.fillStyle=K.haar;
    if(wer==='mia'){
      ctx.beginPath();ctx.arc(0,-3,13,Math.PI*0.92,Math.PI*2.08);ctx.lineTo(12,4);ctx.quadraticCurveTo(0,8,-12,4);ctx.closePath();ctx.fill();
      /* Pferdeschwanz schwingt mit */
      const sw=Math.sin(t*5)*5+(pose==='anlauf'?Math.sin(p*TAU*2)*6:0)+(pose==='jubel'?Math.sin(t*14)*7:0);
      ctx.beginPath();ctx.moveTo(-4,-10);ctx.quadraticCurveTo(10+sw,-2,4+sw*1.4,26);ctx.quadraticCurveTo(-2+sw,10,-4,-10);ctx.fill();
      ctx.fillStyle='#FFD447';ctx.beginPath();ctx.arc(0,-9,3.2,0,TAU);ctx.fill();
    }else{
      ctx.beginPath();ctx.arc(0,-3,13,Math.PI*0.9,Math.PI*2.1);ctx.lineTo(11,5);ctx.quadraticCurveTo(0,9,-11,5);ctx.closePath();ctx.fill();
      for(let i=0;i<9;i++){const a=Math.PI*(0.95+i*0.14);ctx.beginPath();ctx.arc(Math.cos(a)*12,-3+Math.sin(a)*12,4.2,0,TAU);ctx.fill();}
      ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(-4,-10,3,0,TAU);ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}

/* -------------------------------------------------------------- Torwart */
function torwart(ctx,X,Y,k,o){
  o=o||{};const t=o.t||0,p=o.p||0,dir=o.dir||1,pose=o.pose||'bereit';
  const farbe=o.farbe||['#FFB020','#C98400'],haut=o.haut||'#D9A27A',blick=o.blick||0;
  ctx.save();ctx.translate(X,Y);ctx.scale(k,k);
  ctx.fillStyle='rgba(10,30,15,.3)';
  const schatten=pose==='hecht'?1+p*0.8:1;ctx.beginPath();ctx.ellipse(pose==='hecht'?dir*p*30:0,1,26*schatten,6,0,0,TAU);ctx.fill();
  let rot=0,lift=0,arme='breit',beine='breit';
  if(pose==='bereit'){lift=Math.abs(Math.sin(t*4))*1.5;}
  else if(pose==='hecht'){rot=dir*lerp(0,1.25,Math.min(1,p*1.3));lift=Math.sin(Math.min(1,p)*Math.PI)*34+p*8;arme='hoch';beine='zu';}
  else if(pose==='jubel'){lift=Math.abs(Math.sin(t*6))*12;arme='jubel';}
  else if(pose==='liegt'){rot=dir*1.45;lift=8;arme='hoch';beine='zu';}
  ctx.translate(0,-lift);
  ctx.translate(0,-62);ctx.rotate(rot);ctx.translate(0,62);
  /* Beine */
  const bein=(s)=>{const fx=beine==='zu'?s*6:s*20,hx=s*9;
    glied(ctx,hx,-50,fx,-8,beine==='zu'?0:s*-7,11,'#1C2333','#1C2333');
    linie(ctx,lerp(hx,fx,0.55),-28,fx,-8,11.5,farbe[0]);
    ctx.fillStyle='#14161C';ctx.beginPath();ctx.ellipse(fx+s*3,-3,8,5,0,0,TAU);ctx.fill();};
  bein(-1);bein(1);
  ctx.fillStyle='#1C2333';rounded(ctx,-19,-64,38,20,6);ctx.fill();
  /* Rumpf */
  const g=ctx.createLinearGradient(-22,0,22,0);g.addColorStop(0,farbe[1]);g.addColorStop(0.4,farbe[0]);g.addColorStop(1,farbe[1]);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-23,-104);ctx.quadraticCurveTo(0,-109,23,-104);ctx.lineTo(18,-60);ctx.quadraticCurveTo(0,-57,-18,-60);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.moveTo(-23,-104);ctx.lineTo(23,-78);ctx.lineTo(23,-72);ctx.lineTo(-23,-98);ctx.closePath();ctx.fill();
  ctx.fillStyle='#1C2333';ctx.font='900 16px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1',0,-80);
  /* Arme mit grossen Handschuhen */
  const hand=(s)=>{
    let h;
    if(arme==='hoch')h=[s*14,-150];
    else if(arme==='jubel')h=[s*30,-142-Math.abs(Math.sin(t*6))*4];
    else h=[s*42,-70+Math.sin(t*4+s)*3];
    glied(ctx,s*20,-100,h[0],h[1],arme==='breit'?s*8:s*-4,9,farbe[0],farbe[0]);
    ctx.fillStyle='#C6F432';ctx.beginPath();ctx.arc(h[0],h[1],8,0,TAU);ctx.fill();
    ctx.fillStyle='#1C2333';ctx.fillRect(h[0]-6,h[1]+3,12,2.4);
  };
  hand(-1);hand(1);
  /* Kopf */
  ctx.fillStyle=haut;ctx.fillRect(-4,-112,8,8);
  ctx.beginPath();ctx.arc(0,-122,13,0,TAU);ctx.fill();
  ctx.fillStyle='#2B1C14';ctx.beginPath();ctx.arc(0,-125,13.5,Math.PI*1.02,Math.PI*1.98);ctx.quadraticCurveTo(4,-131,-13,-124);ctx.fill();
  const bx=Math.max(-2,Math.min(2,blick*2));
  if(pose==='liegt'){
    ctx.strokeStyle='#1C2333';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-7,-123);ctx.lineTo(-2,-121);ctx.moveTo(7,-123);ctx.lineTo(2,-121);ctx.stroke();
    ctx.beginPath();ctx.arc(0,-112,4,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  }else{
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(-5,-122,3.6,4,0,0,TAU);ctx.ellipse(5,-122,3.6,4,0,0,TAU);ctx.fill();
    ctx.fillStyle='#1C2333';ctx.beginPath();ctx.arc(-5+bx,-121.5,2,0,TAU);ctx.arc(5+bx,-121.5,2,0,TAU);ctx.fill();
    ctx.strokeStyle='#2B1C14';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-9,-128);ctx.lineTo(-2,-127);ctx.moveTo(9,-128);ctx.lineTo(2,-127);ctx.stroke();
    ctx.strokeStyle='#7A3B2A';ctx.lineWidth=1.6;ctx.beginPath();
    if(pose==='jubel')ctx.arc(0,-116,4,0.1,Math.PI-0.1);else{ctx.moveTo(-3,-114);ctx.lineTo(3,-114);}ctx.stroke();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- Mauer */
function mauer(ctx,X,Y,k,o){
  o=o||{};const farbe=o.farbe||'#2F6FE0',haut=o.haut||'#E2B08A',sp=o.sprung||0,seed=o.seed||0;
  ctx.save();ctx.translate(X,Y);ctx.scale(k,k);
  ctx.fillStyle='rgba(10,30,15,.3)';ctx.beginPath();ctx.ellipse(0,1,18*(1-sp*0.3),5,0,0,TAU);ctx.fill();
  ctx.translate(0,-sp*26);
  for(const s of [-1,1]){linie(ctx,s*7,-46,s*8,-8,10,haut);linie(ctx,s*8,-26,s*8,-8,10.5,'#F4F1EA');
    ctx.fillStyle='#14161C';ctx.beginPath();ctx.ellipse(s*9,-3,7,4.5,0,0,TAU);ctx.fill();}
  ctx.fillStyle='#1C2333';rounded(ctx,-16,-58,32,18,5);ctx.fill();
  ctx.fillStyle=farbe;ctx.beginPath();ctx.moveTo(-19,-96);ctx.quadraticCurveTo(0,-100,19,-96);ctx.lineTo(16,-54);ctx.lineTo(-16,-54);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='900 13px Inter,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(2+Math.floor(seed*20)),0,-72);
  /* Haende schuetzend vor dem Bauch */
  linie(ctx,-17,-92,-4,-62,7,farbe);linie(ctx,17,-92,4,-62,7,farbe);
  ctx.fillStyle=haut;ctx.beginPath();ctx.arc(-3,-60,4.5,0,TAU);ctx.arc(3,-60,4.5,0,TAU);ctx.fill();
  ctx.fillRect(-4,-106,8,8);ctx.beginPath();ctx.arc(0,-114,12,0,TAU);ctx.fill();
  const haar=['#2B1C14','#6B4423','#D9A441','#1C1414'][Math.floor(seed*4)%4];
  ctx.fillStyle=haar;ctx.beginPath();ctx.arc(0,-117,12.5,Math.PI*1.05,Math.PI*1.95);ctx.quadraticCurveTo(0,-123,-12,-116);ctx.fill();
  /* zusammengekniffene Augen, Mund ein kleines o */
  ctx.strokeStyle='#1C2333';ctx.lineWidth=1.7;ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(-7,-115);ctx.lineTo(-3,-113);ctx.lineTo(-7,-111);ctx.moveTo(7,-115);ctx.lineTo(3,-113);ctx.lineTo(7,-111);ctx.stroke();
  ctx.fillStyle='#7A3B2A';ctx.beginPath();ctx.ellipse(0,-106,2.4,3,0,0,TAU);ctx.fill();
  ctx.restore();
}

window.Spieler={schuetze,torwart,mauer,KADER};
})();
