/* Shopping Trip: gezeichnetes Titelbild (Startseite des Spiels und Spieleseite).
   window.ShopBild(canvas) malt einen Ladeneingang mit Markise und Korb. */
(function(){
'use strict';
function rund(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
window.ShopBild=function(cv){
 const g=cv.getContext&&cv.getContext('2d');if(!g)return;
 const W=cv.width,H=cv.height,s=Math.min(W/640,H/320);
 g.save();
 let v=g.createLinearGradient(0,0,0,H);v.addColorStop(0,'#8FD0F0');v.addColorStop(1,'#DDF1FA');g.fillStyle=v;g.fillRect(0,0,W,H);
 /* Wolken */
 g.fillStyle='rgba(255,255,255,.85)';for(const [x,y,r] of [[0.12,0.14,22],[0.18,0.12,30],[0.24,0.15,20],[0.78,0.1,24],[0.84,0.08,32],[0.9,0.11,22]]){g.beginPath();g.arc(W*x,H*y,r*s,0,7);g.fill();}
 /* Gehweg */
 g.fillStyle='#C9C2B5';g.fillRect(0,H*0.86,W,H*0.14);g.fillStyle='rgba(0,0,0,.06)';for(let x=0;x<W;x+=48*s)g.fillRect(x,H*0.86,2*s,H*0.14);
 /* Laden */
 const lx=W*0.08,lw=W*0.84,ly=H*0.2,lh=H*0.66;
 g.fillStyle='#0F3B2E';rund(g,lx,ly,lw,lh,14*s);g.fill();
 g.fillStyle='#FFC845';g.font='800 '+Math.round(34*s)+'px "Bricolage Grotesque", Inter, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('Hilltop Market',W/2,ly+30*s);
 /* Markise */
 const my=ly+58*s,mh=30*s,n=14,bw=lw/n;
 for(let i=0;i<n;i++){g.fillStyle=i%2?'#FFFFFF':'#2E9E4F';g.beginPath();g.moveTo(lx+i*bw,my);g.lineTo(lx+(i+1)*bw,my);g.lineTo(lx+(i+1)*bw,my+mh);g.arc(lx+(i+0.5)*bw,my+mh,bw/2,0,Math.PI);g.closePath();g.fill();}
 /* Schaufenster mit Regalen */
 const fy=my+mh+18*s,fh=ly+lh-fy-10*s,fw=lw*0.33;
 const farben=['#E9573F','#F6BB42','#8CC152','#3BAFDA','#D770AD','#967ADC','#FFFFFF','#C8863E'];
 for(const fx of [lx+12*s,lx+lw-fw-12*s]){
  g.fillStyle='#E9F5FB';rund(g,fx,fy,fw,fh,8*s);g.fill();
  for(let r=0;r<3;r++){const ry=fy+(r+1)*fh/3.3;g.fillStyle='#B9C3CC';g.fillRect(fx+6*s,ry,fw-12*s,4*s);
   for(let i=0;i<9;i++){const bx=fx+12*s+i*(fw-24*s)/9,bh=(14+((i*7+r*3)%4)*5)*s;g.fillStyle=farben[(i+r*3)%farben.length];rund(g,bx,ry-bh,(fw-24*s)/9-3*s,bh,2*s);g.fill();}}
  g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(fx+fw*0.6,fy);g.lineTo(fx+fw*0.8,fy);g.lineTo(fx+fw*0.4,fy+fh);g.lineTo(fx+fw*0.2,fy+fh);g.closePath();g.fill();
 }
 /* Tuer */
 const tw=lw*0.2,tx=W/2-tw/2;g.fillStyle='#BFE3F2';rund(g,tx,fy,tw,ly+lh-fy,6*s);g.fill();g.strokeStyle='#0B2C22';g.lineWidth=3*s;g.beginPath();g.moveTo(W/2,fy);g.lineTo(W/2,ly+lh);g.stroke();
 g.fillStyle='#E9573F';rund(g,W/2-38*s,fy+12*s,76*s,22*s,11*s);g.fill();g.fillStyle='#FFFFFF';g.font='800 '+Math.round(13*s)+'px Inter, system-ui, sans-serif';g.fillText('OPEN',W/2,fy+23*s);
 /* Korb vorne */
 const kx=W*0.7,ky=H*0.8,kw=120*s,kh=56*s;
 g.font=Math.round(34*s)+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
 for(const [e,dx,dy] of [['🥖',-30,-30],['🍎',10,-22],['🥛',38,-34],['🧀',-6,-14],['🍌',28,-10]])g.fillText(e,kx+kw/2+dx*s,ky+dy*s);
 g.fillStyle='#D93B2B';g.beginPath();g.moveTo(kx,ky);g.lineTo(kx+kw,ky);g.lineTo(kx+kw-12*s,ky+kh);g.lineTo(kx+12*s,ky+kh);g.closePath();g.fill();
 g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=3*s;for(let i=1;i<6;i++){g.beginPath();g.moveTo(kx+i*kw/6,ky+4*s);g.lineTo(kx+i*kw/6-(i-3)*2*s,ky+kh-4*s);g.stroke();}
 g.strokeStyle='#A82A1E';g.lineWidth=7*s;g.beginPath();g.arc(kx+kw/2,ky,kw*0.42,Math.PI*1.05,Math.PI*1.95);g.stroke();
 /* Preisschild */
 g.save();g.translate(W*0.2,H*0.84);g.rotate(-0.12);g.fillStyle='#FFD43B';rund(g,-44*s,-26*s,88*s,52*s,8*s);g.fill();g.fillStyle='#1D2A33';g.font='800 '+Math.round(26*s)+'px "Bricolage Grotesque", Inter, sans-serif';g.fillText('£2.50',0,2*s);g.restore();
 g.restore();
};
})();
