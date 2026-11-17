/* Black & White: die deutsche Vokabel als Karte direkt im Spielbild.
   Eine neue Vokabel erscheint zuerst gross in der Bildmitte und fliegt dann
   ueber die drei englischen Ziele, wo sie stehen bleibt. So liest man Frage
   und Antworten mit einem Blick. Mit "weniger Bewegung" steht sie sofort dort.
   BWFrage.karte(ctx, {text, cx, unten, W, H, t, alpha})
     cx, unten  Mitte und Unterkante am Zielort (Spielkoordinaten)
     t          Sekunden seit der neuen Vokabel
   Die Karte im DOM (#prompt) bleibt fuer Screenreader erhalten. */
(function(){
'use strict';
const ruhig=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const weich=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};
function rund(g,x,y,b,h,r){r=Math.min(r,b/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+b,y,x+b,y+h,r);g.arcTo(x+b,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+b,y,r);g.closePath();}
/* Text in hoechstens zwei Zeilen; die Schrift wird kleiner, bis er passt */
function zeilen(g,text,maxB){
 let fs=20,z;
 for(;;){g.font='800 '+fs+'px Inter, system-ui, sans-serif';z=[];let s='';
  for(const w of text.split(' ')){const t=s?s+' '+w:w;if(g.measureText(t).width>maxB&&s){z.push(s);s=w;}else s=t;}z.push(s);
  if((z.length<=2&&z.every(l=>g.measureText(l).width<=maxB))||fs<=12)break;fs--;}
 return {z:z.slice(0,2),fs};
}
const DAUER=1.55;
function karte(g,o){
 if(!o||!o.text)return;const W=o.W,H=o.H,t=o.t==null?9:o.t;let a=o.alpha==null?1:o.alpha;if(a<=0.01)return;
 const maxB=Math.min(W-40,280),{z,fs}=zeilen(g,o.text,maxB);
 let tw=0;for(const l of z)tw=Math.max(tw,g.measureText(l).width);
 const b=Math.max(150,Math.min(W-12,tw+34)),h=28+z.length*fs*1.15;
 let cx=clamp(o.cx,b/2+6,W-b/2-6),cy=o.unten-h/2,sk=1;
 if(!ruhig&&t<DAUER){
  /* gross in der Mitte, dann zum Zielort */
  const ein=weich(0,0.28,t),flug=weich(1.0,DAUER,t);
  cx=lerp(W/2,cx,flug);cy=lerp(H*0.36,cy,flug);sk=lerp(1.4,1,flug)*(0.75+0.25*ein);a*=ein;
  if(flug<1){g.save();g.globalAlpha=0.35*(1-flug)*ein;g.fillStyle='#10151C';g.fillRect(0,0,W,H);g.restore();}
 }
 g.save();g.globalAlpha=a;g.translate(cx,cy);g.scale(sk,sk);
 g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=14;g.shadowOffsetY=4;
 g.fillStyle='#FFFFFF';rund(g,-b/2,-h/2,b,h,14);g.fill();
 g.shadowColor='transparent';
 /* Zeiger nach unten zu den Zielen */
 g.beginPath();g.moveTo(-9,h/2-1);g.lineTo(9,h/2-1);g.lineTo(0,h/2+9);g.closePath();g.fill();
 g.fillStyle='#5B667C';g.font='700 9px ui-monospace, Menlo, monospace';g.textAlign='center';g.textBaseline='middle';
 g.fillText('AUF ENGLISCH?',0,-h/2+11);
 g.fillStyle='#10151C';g.font='800 '+fs+'px Inter, system-ui, sans-serif';
 z.forEach((l,n)=>g.fillText(l,0,-h/2+22+fs*0.62+n*fs*1.15));
 g.restore();
}
window.BWFrage={karte,DAUER};
})();
