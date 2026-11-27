/* Town Race: gezeichnetes Titelbild (Startseite des Spiels und Spieleseite).
   window.StadtBild(canvas) malt eine Strassenecke mit Haeusern, Post,
   Strassenschild, zwei Go-Karts und einer Sprechblase des Navigators. */
(function(){
'use strict';
function rund(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const SCHRIFT='"Bricolage Grotesque", Inter, system-ui, sans-serif';
function kart(g,x,y,s,farbe,nr){
 g.save();g.translate(x,y);g.scale(s,s);
 g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,30,62,9,0,0,7);g.fill();
 g.fillStyle='#1D1F22';for(const dx of [-42,38]){g.beginPath();g.arc(dx,20,13,0,7);g.fill();g.fillStyle='#8A9096';g.beginPath();g.arc(dx,20,5,0,7);g.fill();g.fillStyle='#1D1F22';}
 g.fillStyle=farbe;rund(g,-58,2,116,18,8);g.fill();
 g.beginPath();g.moveTo(-60,10);g.lineTo(-30,-4);g.lineTo(10,-4);g.lineTo(18,6);g.closePath();g.fill();
 g.fillStyle='#FFFFFF';g.beginPath();g.arc(-36,9,8,0,7);g.fill();g.fillStyle='#111';g.font='900 11px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText(String(nr),-36,10);
 /* Fahrer */
 g.fillStyle=farbe;rund(g,0,-28,22,30,9);g.fill();
 g.beginPath();g.arc(11,-38,14,0,7);g.fill();
 g.fillStyle='#1D1F22';rund(g,0,-44,18,9,4);g.fill();
 g.fillStyle='#FFFFFF';g.fillRect(9,-52,4,14);
 g.fillStyle='#1D1F22';g.beginPath();g.moveTo(40,2);g.lineTo(46,-30);g.lineTo(49,-30);g.lineTo(44,2);g.fill();
 g.fillStyle=farbe;g.beginPath();g.moveTo(48,-30);g.lineTo(70,-24);g.lineTo(48,-18);g.fill();
 g.restore();
}
function haus(g,x,y,w,h,wand,tuer,dach){
 g.fillStyle=wand;g.fillRect(x,y,w,h);
 g.fillStyle=dach;g.beginPath();g.moveTo(x-6,y);g.lineTo(x+w/2,y-h*0.32);g.lineTo(x+w+6,y);g.closePath();g.fill();
 g.fillStyle='#8A4A35';g.fillRect(x+w*0.7,y-h*0.32,w*0.12,h*0.22);
 for(const fy of [y+h*0.14,y+h*0.52]){g.fillStyle='#F4F1EA';g.fillRect(x+w*0.56,fy,w*0.3,h*0.26);g.fillStyle='#3E5A6E';g.fillRect(x+w*0.59,fy+3,w*0.24,h*0.26-6);}
 g.fillStyle='#F4F1EA';g.fillRect(x+w*0.14,y+h*0.14,w*0.3,h*0.26);g.fillStyle='#3E5A6E';g.fillRect(x+w*0.17,y+h*0.14+3,w*0.24,h*0.26-6);
 g.fillStyle=tuer;g.fillRect(x+w*0.16,y+h*0.56,w*0.24,h*0.44);
}
window.StadtBild=function(cv){
 const g=cv.getContext&&cv.getContext('2d');if(!g)return;
 const W=cv.width,H=cv.height,s=Math.min(W/640,H/320);
 g.save();
 let v=g.createLinearGradient(0,0,0,H);v.addColorStop(0,'#5FA8D8');v.addColorStop(1,'#DCEBF2');g.fillStyle=v;g.fillRect(0,0,W,H);
 g.fillStyle='rgba(255,255,255,.85)';for(const [x,y,r] of [[0.1,0.12,20],[0.16,0.1,28],[0.22,0.13,18],[0.7,0.08,22],[0.76,0.06,30],[0.82,0.09,20]]){g.beginPath();g.arc(W*x,H*y,r*s,0,7);g.fill();}
 /* Huegel */
 g.fillStyle='#7DA866';g.beginPath();g.moveTo(0,H*0.5);g.quadraticCurveTo(W*0.25,H*0.32,W*0.5,H*0.48);g.quadraticCurveTo(W*0.75,H*0.34,W,H*0.47);g.lineTo(W,H*0.6);g.lineTo(0,H*0.6);g.fill();
 /* Haeuser */
 const by=H*0.62,hh=110*s;
 const hw=78*s;
 haus(g,W*0.02,by-hh,hw,hh,'#9C4A35','#1E3A5F','#4A5058');
 haus(g,W*0.02+hw,by-hh,hw,hh,'#C9A86A','#B71C1C','#50565E');
 /* Post */
 const px=W*0.02+2*hw+6*s,pw=150*s;
 g.fillStyle='#EDE8DE';g.fillRect(px,by-hh*1.15,pw,hh*1.15);
 g.fillStyle='#D7261E';rund(g,px+8*s,by-hh*0.62,pw-16*s,26*s,5*s);g.fill();
 g.fillStyle='#FFFFFF';g.font='800 '+Math.round(17*s)+'px '+SCHRIFT;g.textAlign='center';g.textBaseline='middle';g.fillText('POST OFFICE',px+pw/2,by-hh*0.62+14*s);
 g.fillStyle='#2D4250';g.fillRect(px+12*s,by-hh*0.32,pw-24*s,hh*0.32);
 g.fillStyle='#D7261E';rund(g,px+pw+8*s,by-44*s,18*s,44*s,8*s);g.fill();
 /* Kirche rechts */
 const kx=W*0.74;g.fillStyle='#B9B2A4';g.fillRect(kx,by-hh*1.0,110*s,hh);g.fillRect(kx+70*s,by-hh*1.6,34*s,hh*1.6);
 g.fillStyle='#4A4F55';g.beginPath();g.moveTo(kx+66*s,by-hh*1.6);g.lineTo(kx+87*s,by-hh*2.3);g.lineTo(kx+108*s,by-hh*1.6);g.fill();
 g.fillStyle='#F4F1EA';g.beginPath();g.arc(kx+87*s,by-hh*1.3,9*s,0,7);g.fill();
 g.fillStyle='#33506E';for(const dx of [12,38])g.fillRect(kx+dx*s,by-hh*0.7,12*s,30*s);
 /* Strasse */
 g.fillStyle='#BDBAB2';g.fillRect(0,by,W,H*0.05);g.fillStyle='#55595F';g.fillRect(0,by+H*0.05,W,H-by);
 g.fillStyle='#F4F4F0';for(let x=10*s;x<W;x+=60*s)g.fillRect(x,by+H*0.2,32*s,4*s);
 /* Strassenschild */
 const sx=W*0.6;g.fillStyle='#333';g.fillRect(sx,by-40*s,3*s,40*s);g.fillRect(sx+70*s,by-40*s,3*s,40*s);
 g.fillStyle='#FFFFFF';rund(g,sx-8*s,by-62*s,92*s,24*s,4*s);g.fill();g.strokeStyle='#111';g.lineWidth=2.5*s;rund(g,sx-6*s,by-60*s,88*s,20*s,3*s);g.stroke();
 g.fillStyle='#111';g.font='800 '+Math.round(11*s)+'px Inter, system-ui, sans-serif';g.fillText('CHURCH ROAD',sx+38*s,by-49*s);
 /* Karts */
 kart(g,W*0.3,H*0.83,1.05*s,'#E9573F',1);
 kart(g,W*0.62,H*0.9,1.0*s,'#1F78B4',2);
 /* Sprechblase */
 const bx=W*0.36,bY=H*0.08,bw=230*s,bh=48*s;
 g.fillStyle='#FFFFFF';rund(g,bx,bY,bw,bh,14*s);g.fill();
 g.beginPath();g.moveTo(bx+30*s,bY+bh);g.lineTo(bx+20*s,bY+bh+16*s);g.lineTo(bx+50*s,bY+bh);g.fill();
 g.fillStyle='#0F3B2E';g.font='800 '+Math.round(15*s)+'px '+SCHRIFT;g.textAlign='center';g.fillText('🔊 Turn left at the post office!',bx+bw/2,bY+bh/2+1);
 g.restore();
};
document.addEventListener('DOMContentLoaded',()=>{const c=document.getElementById('heldBild');if(c)window.StadtBild(c);});
if(document.readyState!=='loading'){const c=document.getElementById('heldBild');if(c)window.StadtBild(c);}
})();
