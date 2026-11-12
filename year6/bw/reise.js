/* =========================================================================
   REISE zwischen den Kapiteln: eine stilisierte Weltkarte in Schwarz-Weiss.
   Die Kamera faehrt vom letzten Ort heraus, das Tier zieht eine gepunktete
   Linie zum naechsten Ort, dort erscheint das Ortsschild.
   Die Umrisse sind bewusst grob (keine Navigationskarte).
   BWReise.start(canvas, von, nach, angekommen) - Index in ORTE.
   ========================================================================= */
(function(){
'use strict';
const ORTE=[
 {id:'pinguin',tier:'Penguin',ort:'Antarctica',lon:28,lat:-71,
  satz:'Penguins live on the ice of Antarctica.',de:'Pinguine leben auf dem Eis der Antarktis.'},
 {id:'orca',tier:'Orca',ort:'Southern Ocean',lon:78,lat:-52,
  satz:'Orcas hunt in the cold Southern Ocean.',de:'Orcas jagen im kalten Südpolarmeer.'},
 {id:'panda',tier:'Giant panda',ort:'China, Asia',lon:104,lat:31,
  satz:'Giant pandas live in the bamboo forests of China.',de:'Große Pandas leben in den Bambuswäldern Chinas.'},
 {id:'zebra',tier:'Zebra',ort:'Tanzania, Africa',lon:35,lat:-3,
  satz:'Zebras run across the savannah in Africa.',de:'Zebras laufen durch die Savanne in Afrika.'}
];
/* grobe Umrisse: [Laenge, Breite] */
const LAND=[
 /* Europa und Asien */
 [[-10,36],[-9,43],[-2,48],[5,53],[8,57],[5,62],[15,70],[40,68],[70,73],[105,77],[140,72],[170,68],[178,64],[160,58],[142,50],[135,35],[122,30],[120,22],[108,18],[105,9],[100,13],[95,17],[90,22],[80,8],[73,20],[66,25],[57,26],[50,30],[43,13],[35,28],[36,36],[27,37],[22,38],[15,38],[12,44],[3,43],[-5,36]],
 /* Afrika */
 [[-17,15],[-10,5],[8,4],[10,-5],[13,-17],[18,-34],[27,-34],[35,-24],[40,-15],[40,-3],[51,11],[43,12],[35,28],[32,31],[10,37],[-6,35],[-17,21]],
 /* Australien */
 [[114,-22],[122,-18],[131,-12],[142,-11],[146,-19],[153,-27],[150,-37],[140,-38],[131,-32],[115,-34]],
 /* Antarktis */
 [[-40,-76],[-20,-73],[10,-70],[40,-68],[80,-67],[120,-66],[160,-70],[180,-76],[180,-90],[-40,-90]],
 /* Madagaskar, Grossbritannien, Japan, Indonesien (angedeutet) */
 [[44,-13],[50,-15],[47,-25],[44,-22]],[[-5,50],[1,52],[-3,58],[-6,55]],[[131,32],[141,36],[142,44],[139,38],[133,35]],
 [[96,4],[105,-5],[115,-8],[118,2],[110,2],[104,-2]]
];
const NAMEN=[['EUROPE',18,50],['ASIA',85,52],['AFRICA',20,12],['AUSTRALIA',133,-25],['ANTARCTICA',70,-80],['INDIAN OCEAN',75,-18],['SOUTHERN OCEAN',20,-55]];
const L0=-28,L1=162,B0=-88,B1=66;
const weich=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},lerp=(a,b,t)=>a+(b-a)*t;

function start(cv,von,nach,angekommen){
 const ctx=cv&&cv.getContext?cv.getContext('2d'):null;
 if(!ctx||typeof requestAnimationFrame!=='function'){if(angekommen)angekommen();return {stop(){}};}
 let t=0,zuletzt=0,aus=false,gemeldet=false;
 const A=ORTE[von],B=ORTE[nach];
 const spriteName=(window.BWMorph&&window.BWMorph.sprite&&window.BWMorph.sprite(B.id))?B.id:A.id;
 function bild(){
  const dpr=Math.min(window.devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=Math.min(w/(L1-L0),h*0.62/(B1-B0)),mx=w/2,my=h*0.4;
  const P=(lon,lat)=>[mx+(lon-(L0+L1)/2)*s,my-(lat-(B0+B1)/2)*s];
  const pa=P(A.lon,A.lat),pb=P(B.lon,B.lat);
  /* Kamera: heraus aus dem alten Ort, am Ende etwas hinein zum neuen */
  const raus=weich(t/1.3),rein=weich((t-3.5)/1.2);
  const zoom=lerp(lerp(2.6,1,raus),1.5,rein),fx=lerp(lerp(pa[0],mx,raus),pb[0],rein*0.75),fy=lerp(lerp(pa[1],my,raus),pb[1],rein*0.75);
  ctx.fillStyle='#10151C';ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(w/2,h*0.4);ctx.scale(zoom,zoom);ctx.translate(-fx,-fy);
  /* Gradnetz */
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1/zoom;
  for(let lon=-20;lon<=160;lon+=20){const a=P(lon,B0),b=P(lon,B1);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  for(let lat=-80;lat<=60;lat+=20){const a=P(L0,lat),b=P(L1,lat);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  const aeq=P(L0,0),aeq2=P(L1,0);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.setLineDash([4/zoom,6/zoom]);ctx.beginPath();ctx.moveTo(aeq[0],aeq[1]);ctx.lineTo(aeq2[0],aeq2[1]);ctx.stroke();ctx.setLineDash([]);
  /* Land */
  ctx.fillStyle='#F7F9FB';ctx.strokeStyle='#9FD3F2';ctx.lineWidth=1.2/zoom;ctx.lineJoin='round';
  for(const poly of LAND){ctx.beginPath();poly.forEach(([lo,la],i)=>{const p=P(lo,la);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.max(8,9/Math.sqrt(zoom))+'px Inter, system-ui, sans-serif';
  for(const [n,lo,la] of NAMEN){const p=P(lo,la),see=/OCEAN/.test(n);ctx.fillStyle=see?'rgba(159,211,242,.6)':'rgba(16,21,28,.55)';ctx.fillText(n,p[0],p[1]);}
  /* ganze Route: Vergangenes fest, Kommendes blass */
  for(let k=0;k<ORTE.length-1;k++){const p=P(ORTE[k].lon,ORTE[k].lat),q=P(ORTE[k+1].lon,ORTE[k+1].lat);
   if(k===von)continue;
   ctx.strokeStyle=k<von?'rgba(159,211,242,.9)':'rgba(255,255,255,.22)';ctx.lineWidth=2/zoom;ctx.setLineDash(k<von?[]:[2/zoom,6/zoom]);
   ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.quadraticCurveTo((p[0]+q[0])/2+(q[1]-p[1])*0.18,(p[1]+q[1])/2-(q[0]-p[0])*0.18,q[0],q[1]);ctx.stroke();}
  ctx.setLineDash([]);
  /* aktuelle Strecke waechst */
  const f=weich((t-1.2)/2.3),cx=(pa[0]+pb[0])/2+(pb[1]-pa[1])*0.18,cy=(pa[1]+pb[1])/2-(pb[0]-pa[0])*0.18;
  const Q=u=>[(1-u)*(1-u)*pa[0]+2*(1-u)*u*cx+u*u*pb[0],(1-u)*(1-u)*pa[1]+2*(1-u)*u*cy+u*u*pb[1]];
  ctx.strokeStyle='#FFB020';ctx.lineWidth=3/zoom;ctx.setLineDash([6/zoom,5/zoom]);ctx.lineCap='round';ctx.beginPath();
  for(let u=0;u<=f+0.0001;u+=0.02){const p=Q(Math.min(u,f));u?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();ctx.setLineDash([]);
  /* Orte */
  ORTE.forEach((o,k)=>{const p=P(o.lon,o.lat),da=k<=von||(k===nach&&f>=1),puls=k===nach&&f>=1?1+0.25*Math.sin(t*5):1;
   ctx.fillStyle=da?'#FFB020':'#10151C';ctx.strokeStyle=da?'#10151C':'rgba(255,255,255,.6)';ctx.lineWidth=2/zoom;
   ctx.beginPath();ctx.arc(p[0],p[1],5*puls/Math.sqrt(zoom)+1,0,7);ctx.fill();ctx.stroke();});
  /* das Tier reist mit */
  const pt=Q(f),sp=window.BWMorph&&window.BWMorph.sprite?window.BWMorph.sprite(spriteName):null,gr=34/Math.sqrt(zoom);
  if(sp){const k=gr/sp.gr;ctx.save();ctx.translate(pt[0],pt[1]-gr*0.55+Math.sin(t*6)*2/zoom);ctx.fillStyle='rgba(16,21,28,.85)';ctx.beginPath();ctx.arc(0,0,gr*0.62,0,7);ctx.fill();ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2/zoom;ctx.stroke();ctx.scale(k*0.92,k*0.92);ctx.drawImage(sp.bild,-sp.cx,-sp.cy);ctx.restore();}
  else{ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(pt[0],pt[1]-8,6,0,7);ctx.fill();}
  ctx.restore();
  /* Ortsschild */
  const an=weich((t-3.4)/0.5);
  if(an>0){ctx.globalAlpha=an;const dg=ctx.createLinearGradient(0,0,0,h*0.2);dg.addColorStop(0,'rgba(16,21,28,.95)');dg.addColorStop(0.75,'rgba(16,21,28,.85)');dg.addColorStop(1,'rgba(16,21,28,0)');ctx.fillStyle=dg;ctx.fillRect(0,0,w,h*0.2);ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font='600 12px ui-monospace, Menlo, monospace';ctx.fillStyle='#9FD3F2';ctx.fillText('NEXT STOP',w/2,h*0.075-(1-an)*10);
   ctx.font='800 '+Math.min(34,w/11)+'px Inter, system-ui, sans-serif';ctx.fillStyle='#FFFFFF';ctx.fillText(B.ort,w/2,h*0.125-(1-an)*10);ctx.globalAlpha=1;}
 }
 function schleife(jetzt){
  if(aus)return;const dt=zuletzt?Math.min(0.05,(jetzt-zuletzt)/1000):0;zuletzt=jetzt;t+=dt;bild();
  if(t>=4.3&&!gemeldet){gemeldet=true;if(angekommen)angekommen();}
  requestAnimationFrame(schleife);
 }
 requestAnimationFrame(schleife);
 return {stop(){aus=true;},standbild(sek){aus=true;t=sek;bild();}};
}
window.BWReise={start,ORTE};
})();
