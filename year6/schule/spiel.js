/* =========================================================================
   SPIEL "Find your way!" - Aufgaben, Steuerung, Minikarte.
   Laeuft auch ohne 3D (Tests): Die Darstellung kommt aus render.js und
   meldet sich mit dem Ereignis "schulrender".
   ========================================================================= */
(function(){
'use strict';
const L=window.SchulLogik,welt=L.bauen(window.SCHUL_KARTE);
const KEY='vt6:schule:v1',RUNDE=5,TEMPO=34,DREH=2.1,ZIEL=22;
const START={f:0,x:340,y:470,yaw:Math.PI};
const $=id=>document.getElementById(id);
const G={modus:null,zustand:'menu',p:{...START,pitch:0},aufgabe:null,nr:0,ergebnisse:[],t:0,gelaufen:0,schritt:0,treppe:-1,erledigt:[]};
const eingabe={keys:new Set(),stick:{x:0,y:0},look:{x:0,y:0}};

/* ---------------- Speicher ---------------- */
function laden(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return {};}}
function sichern(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}

/* ---------------- Hilfen ---------------- */
const richtung=yaw=>((Math.round(yaw/(Math.PI/2))%4)+4)%4;
const yawVon=dir=>dir*Math.PI/2;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ziele=()=>welt.rooms.filter(r=>r.door);
function sterne(a){
 const v=a.gelaufen/Math.max(1,a.b.laenge);
 let s=v<=1.35?3:v<=2?2:1;if(a.hilfe)s=1;return s;
}

/* ---------------- Aufgaben ---------------- */
function neueAufgabe(){
 const p=G.p,dir=richtung(p.yaw);p.yaw=yawVon(dir);p.pitch=0;
 const start={f:p.f,x:p.x,y:p.y,dir};
 const alle=ziele().filter(r=>!G.erledigt.includes(r.id));
 /* erst Erdgeschoss, ab der dritten Aufgabe auch der erste Stock */
 let pool=alle.filter(r=>G.nr<2?r.f===0:true);
 if(G.nr>=2&&G.nr%2===0)pool=pool.filter(r=>r.f!==p.f).length?pool.filter(r=>r.f!==p.f):pool;
 let best=null;
 for(let v=0;v<30&&pool.length;v++){
  const r=pool[Math.floor(Math.random()*pool.length)];
  if(r.art!=='class'&&Math.random()<0.6)continue;
  const b=L.beschreibung(welt,start,r);
  if(!b)continue;
  if(b.laenge>=14&&b.laenge<=130){best={r,b};break;}
  if(!best||Math.abs(b.laenge-50)<Math.abs(best.b.laenge-50))best={r,b};
 }
 if(!best)return false;
 G.aufgabe={raum:best.r,b:best.b,gelaufen:0,hilfe:false,start:G.t};
 G.zustand='spiel';
 zeigeAufgabe();
 return true;
}
function zielErreicht(){
 const a=G.aufgabe,d=a.raum.door;
 return G.p.f===d.f&&Math.hypot(G.p.x-d.x,G.p.y-d.y)<=ZIEL;
}
function geschafft(){
 const a=G.aufgabe,s=sterne(a);
 G.ergebnisse.push({id:a.raum.id,sterne:s,m:Math.round(a.gelaufen),opt:a.b.laenge});
 G.erledigt.push(a.raum.id);
 G.zustand='geschafft';
 try{window.LearningFeedback&&window.LearningFeedback.tone('ok');}catch(e){}
 const box=$('geschafft');
 if(box){
  const letzte=G.ergebnisse.length>=RUNDE;
  box.innerHTML='<p class="g-gut" lang="en">Well done!</p><p lang="en">You found '+esc(L.raumName(a.raum))+'.</p>'
   +'<p class="g-sterne" aria-label="'+s+' von 3 Sternen">'+'★'.repeat(s)+'<span>'+'★'.repeat(3-s)+'</span></p>'
   +'<p class="g-info">Gelaufen: '+Math.round(a.gelaufen)+' m · kürzester Weg: '+a.b.laenge+' m'+(a.hilfe?' · Weg angezeigt':'')+'</p>'
   +'<button id="weiter" class="primaer">'+(letzte?'Ergebnis ansehen':'Nächste Aufgabe →')+'</button>';
  box.hidden=false;
  const w=$('weiter');w.onclick=weiter;setTimeout(()=>{try{w.focus();}catch(e){}},50);
 }
}
function weiter(){
 const box=$('geschafft');if(box)box.hidden=true;
 if(G.ergebnisse.length>=RUNDE)return ende();
 /* mit dem Ruecken zur Tuer starten */
 const d=G.aufgabe.raum.door;
 G.p.f=d.f;G.p.x=d.sx;G.p.y=d.sy;G.p.yaw=yawVon(L.richtungVon(d.nx,d.ny));G.p.pitch=0;
 G.nr++;
 neueAufgabe();
}
function ende(){
 G.zustand='ende';
 const summe=G.ergebnisse.reduce((a,e)=>a+e.sterne,0),d=laden();
 d.best=d.best||{};const alt=d.best[G.modus]||0;if(summe>alt)d.best[G.modus]=summe;d.runden=(d.runden||0)+1;sichern(d);
 const o=$('over');
 if(o){
  o.innerHTML='<h1 tabindex="-1">'+(summe>=12?'Super!':summe>=8?'Gut gemacht!':'Geschafft!')+'</h1>'
   +'<p class="g-sterne gross">'+summe+' / '+(RUNDE*3)+' ★</p>'
   +(summe>alt&&alt?'<p class="neu">Neuer Rekord!</p>':'')
   +'<ul class="liste">'+G.ergebnisse.map(e=>'<li><b>'+esc(e.id)+'</b><span>'+'★'.repeat(e.sterne)+'<i>'+'★'.repeat(3-e.sterne)+'</i></span><small>'+e.m+' m / '+e.opt+' m</small></li>').join('')+'</ul>'
   +'<p><button id="nochmal" class="primaer">Noch eine Runde</button> <button id="zumMenu">Zum Menü</button></p>';
  zeige('over');
  $('nochmal').onclick=()=>start(G.modus);$('zumMenu').onclick=menu;
  o.querySelector('h1').focus();
 }
}

/* ---------------- Bewegung ---------------- */
function update(dt,inp){
 inp=inp||eingabe;dt=Math.min(dt,0.05);G.t+=dt;
 if(G.zustand!=='spiel'&&G.zustand!=='frei')return;
 const p=G.p,k=inp.keys||new Set();
 let vor=(k.has('w')||k.has('arrowup')?1:0)-(k.has('s')||k.has('arrowdown')?1:0)-(inp.stick?inp.stick.y:0);
 let seit=(k.has('d')?1:0)-(k.has('a')?1:0)+(inp.stick?inp.stick.x:0);
 const dreh=(k.has('arrowright')||k.has('e')?1:0)-(k.has('arrowleft')||k.has('q')?1:0);
 p.yaw+=dreh*DREH*dt;
 if(inp.look){p.yaw+=inp.look.x;p.pitch=Math.max(-1.1,Math.min(1.1,p.pitch-inp.look.y));inp.look.x=0;inp.look.y=0;}
 const m=Math.hypot(vor,seit);if(m>1){vor/=m;seit/=m;}
 if(m>0.02){
  const fx=Math.sin(p.yaw),fy=-Math.cos(p.yaw),rx=Math.cos(p.yaw),ry=Math.sin(p.yaw);
  let dx=(fx*vor+rx*seit)*TEMPO*dt,dy=(fy*vor+ry*seit)*TEMPO*dt;
  const n=Math.ceil(Math.hypot(dx,dy)/1.5)||1;
  for(let i=0;i<n;i++){const x0=p.x,y0=p.y;L.bewegen(welt,p,dx/n,dy/n);const s=Math.hypot(p.x-x0,p.y-y0)/10;G.gelaufen+=s;G.schritt+=s;if(G.aufgabe)G.aufgabe.gelaufen+=s;}
 }
 G.treppe=L.treppeBei(welt,p);
 if(G.zustand==='spiel'&&G.aufgabe&&zielErreicht())geschafft();
}
function treppe(){
 if(G.treppe<0)return false;
 const ok=L.treppeNehmen(welt,G.p);
 if(ok){G.treppe=L.treppeBei(welt,G.p);const b=document.querySelector('#stage .blende');if(b){b.classList.remove('an');void b.offsetWidth;b.classList.add('an');}}
 return ok;
}

/* ---------------- Minikarte ---------------- */
const FARBE={halle:'#E9E2D3',treppe:'#E8C25A',raum:'#B79B74',raumWc:'#8FB3CF',raumCafe:'#D7A06E',anders:'#5B6170',court:'#7FB065',yard:'#A8A49C',plaza:'#B5ADA2',lawn:'#7FB065'};
const plaene=[];
function plan(fi){
 if(plaene[fi])return plaene[fi];
 if(typeof document==='undefined')return null;
 const F=welt.floors[fi],src=F.src,k=0.5,c=document.createElement('canvas');
 c.width=Math.ceil(welt.W*welt.R*k);c.height=Math.ceil(welt.H*welt.R*k);
 const g=c.getContext&&c.getContext('2d');if(!g)return null;
 g.fillStyle='#2C3A2E';g.fillRect(0,0,c.width,c.height);
 const r=(x,y,w,h,f)=>{g.fillStyle=f;g.fillRect(x*k,y*k,w*k,h*k);};
 for(const [t,x,y,w,h] of src.outdoor)r(x,y,w,h,FARBE[t]);
 if(fi===0&&src.pond){const [x,y,w,h]=src.pond;g.fillStyle='#4E9CC4';g.beginPath();g.ellipse((x+w/2)*k,(y+h/2)*k,w/2*k,h/2*k,0,0,7);g.fill();}
 for(const q of src.other)r(...q,FARBE.anders);
 for(const q of src.halls)r(...q,FARBE.halle);
 for(const q of src.stairs)r(...q,FARBE.treppe);
 for(const [id,x,y,w,h,art] of src.rooms){r(x,y,w,h,art==='wc'?FARBE.raumWc:art==='cafe'?FARBE.raumCafe:FARBE.raum);g.strokeStyle='#5E4B33';g.lineWidth=1;g.strokeRect(x*k+.5,y*k+.5,w*k-1,h*k-1);}
 g.fillStyle='#1E2A44';g.textAlign='center';g.textBaseline='middle';
 for(const [id,x,y,w,h] of src.rooms){g.font='700 '+(w<30||h<30?8:11)+'px Inter, system-ui, sans-serif';g.fillText(id,(x+w/2)*k,(y+h/2)*k);}
 for(const q of src.stairs){g.font='700 12px sans-serif';g.fillText('⇅',(q[0]+q[2]/2)*k,(q[1]+q[3]/2)*k);}
 return plaene[fi]={c,k};
}
function zeichneKarte(cv,gross){
 if(!cv||!cv.getContext)return;const g=cv.getContext('2d');if(!g)return;
 const dpr=window.devicePixelRatio||1,W=cv.clientWidth||140,H=cv.clientHeight||140;
 if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 const P=plan(G.p.f);if(!P)return;
 const p=G.p;let sk,ox,oy;
 if(gross){/* nur das Schulgelaende, nicht der leere Rand */
  const X0=30,Y0=110,X1=1260,Y1=1060;sk=Math.min(W/(X1-X0),H/(Y1-Y0))*0.98;ox=(W-(X1-X0)*sk)/2-X0*sk;oy=(H-(Y1-Y0)*sk)/2-Y0*sk;}
 else{sk=0.32;ox=W/2-p.x*sk;oy=H/2-p.y*sk;}
 g.fillStyle='#22301F';g.fillRect(0,0,W,H);
 g.imageSmoothingEnabled=true;
 g.drawImage(P.c,ox,oy,P.c.width/P.k*sk,P.c.height/P.k*sk);
 const zu=(x,y)=>[ox+x*sk,oy+y*sk];
 /* Route (nach "Weg zeigen") */
 const a=G.aufgabe;
 if(a&&a.hilfe&&G.zustand==='spiel'){
  g.strokeStyle='#FF7A59';g.lineWidth=3;g.setLineDash([5,4]);g.beginPath();let auf=false;
  for(const c of a.b.pfad){if(c.f!==p.f){auf=false;continue;}const [X,Y]=zu(c.i*10+5,c.j*10+5);if(!auf){g.moveTo(X,Y);auf=true;}else g.lineTo(X,Y);}
  g.stroke();g.setLineDash([]);
 }
 /* Ziel */
 if(a&&G.zustand==='spiel'&&(G.modus==='karte'||a.hilfe)){
  const d=a.raum.door;
  if(d.f===p.f){let [X,Y]=zu(d.x,d.y);const rand=8;const aussen=X<rand||Y<rand||X>W-rand||Y>H-rand;
   X=Math.max(rand,Math.min(W-rand,X));Y=Math.max(rand,Math.min(H-rand,Y));
   g.fillStyle='#FFB020';g.strokeStyle='#1E2A44';g.lineWidth=2;g.beginPath();g.arc(X,Y,aussen?5:7,0,7);g.fill();g.stroke();}
  else{g.fillStyle='rgba(30,42,68,.85)';g.fillRect(4,H-24,W-8,20);g.fillStyle='#FFB020';g.font='700 11px Inter, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
   g.fillText(d.f>p.f?'Ziel: 1st floor ↑':'Ziel: ground floor ↓',W/2,H-14);}
 }
 /* Spieler */
 const [X,Y]=zu(p.x,p.y);g.save();g.translate(X,Y);g.rotate(p.yaw);
 g.fillStyle='rgba(255,122,89,.25)';g.beginPath();g.moveTo(0,0);g.arc(0,0,gross?22:30,-Math.PI/2-0.6,-Math.PI/2+0.6);g.closePath();g.fill();
 g.fillStyle='#FF7A59';g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(0,-8);g.lineTo(6,6);g.lineTo(0,3);g.lineTo(-6,6);g.closePath();g.fill();g.stroke();g.restore();
}

/* ---------------- Oberflaeche ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;document.body.classList.toggle('im-spiel',id==='stage');}
function zeigeAufgabe(){
 const a=G.aufgabe,box=$('auftrag');if(!box||!a)return;
 $('aNr').textContent=(G.nr+1)+'/'+RUNDE;
 $('aTitel').textContent=a.b.titel;
 $('aEtage').textContent='('+a.b.etage+')';
 $('aSchritte').innerHTML=a.b.saetze.map(s=>'<li>'+esc(s)+'</li>').join('');
 $('zeigen').disabled=false;$('zeigen').textContent='Weg zeigen';
 box.classList.remove('zu');
}
function zeigeHilfe(){
 const a=G.aufgabe;if(!a||a.hilfe)return;a.hilfe=true;
 $('zeigen').disabled=true;$('zeigen').textContent='Weg auf der Karte';
}
function vorlesen(){
 const a=G.aufgabe,sp=window.speechSynthesis;if(!a||!sp||typeof SpeechSynthesisUtterance==='undefined')return false;
 sp.cancel();const u=new SpeechSynthesisUtterance(a.b.titel+' '+a.b.saetze.join(' '));
 u.lang='en-GB';u.rate=0.88;const v=sp.getVoices().find(v=>/^en-GB/i.test(v.lang))||sp.getVoices().find(v=>/^en/i.test(v.lang));if(v)u.voice=v;
 sp.speak(u);return true;
}
function menu(){
 G.zustand='menu';zeige('menu');
 const d=laden(),b=d.best||{};
 for(const m of ['karte','profi']){const el=document.querySelector('[data-best="'+m+'"]');if(el)el.textContent=b[m]?'Rekord: '+b[m]+' / '+(RUNDE*3)+' ★':'';}
}
function start(modus){
 G.modus=modus;G.nr=0;G.ergebnisse=[];G.erledigt=[];G.gelaufen=0;
 Object.assign(G.p,START,{pitch:0});G.aufgabe=null;
 zeige('stage');
 const box=$('geschafft');if(box)box.hidden=true;
 document.body.classList.toggle('erkunden',modus==='frei');
 if(modus==='frei'){G.zustand='frei';}
 else neueAufgabe();
 starte3d();
}

/* ---------------- 3D und Schleife ---------------- */
let R=null,laeuft=false,zuletzt=0;
const beruehrung=typeof window!=='undefined'&&('ontouchstart' in window||(navigator.maxTouchPoints||0)>0);
function starte3d(){
 if(R||!window.SchulRender)return;
 try{R=window.SchulRender.init($('welt'),welt,{mobil:beruehrung});const l=$('laden');if(l)l.hidden=true;}
 catch(e){const l=$('laden');if(l){l.hidden=false;l.textContent='3D lässt sich auf diesem Gerät nicht starten.';}return;}
 if(!laeuft&&typeof requestAnimationFrame==='function'){laeuft=true;zuletzt=performance.now();requestAnimationFrame(schleife);}
}
window.addEventListener('schulrender',()=>{if(G.zustand!=='menu')starte3d();});
function schleife(jetzt){
 const dt=(jetzt-zuletzt)/1000;zuletzt=jetzt;
 if(G.zustand!=='menu'&&G.zustand!=='ende'){
  update(dt);
  const btn=$('treppe');if(btn){const an=G.treppe>=0&&G.zustand!=='geschafft';btn.hidden=!an;if(an)btn.textContent=G.p.f===0?'⬆ Go upstairs':'⬇ Go downstairs';}
  const et=$('etage');if(et)et.textContent=G.p.f===0?'Ground floor':'First floor';
  if(R)R.frame({f:G.p.f,x:G.p.x,y:G.p.y,yaw:G.p.yaw,pitch:G.p.pitch,t:G.t,bob:Math.sin(G.schritt*5.5)*0.035,
   marke:G.modus==='karte'&&G.aufgabe&&G.zustand==='spiel'?{f:G.aufgabe.raum.door.f,x:G.aufgabe.raum.door.sx,y:G.aufgabe.raum.door.sy}:null});
  zeichneKarte($('karte'));
  if(!$('grosskarte').hidden)zeichneKarte($('grosskarte').querySelector('canvas'),true);
 }
 requestAnimationFrame(schleife);
}

/* ---------------- Eingabe ---------------- */
function binden(){
 const stage=$('stage'),cv=$('welt');if(!stage||!cv)return;
 const tasten=['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'];
 addEventListener('keydown',e=>{if(G.zustand==='menu')return;const k=e.key.toLowerCase();
  if(tasten.includes(k)){eingabe.keys.add(k);e.preventDefault();}
  if((k==='enter'||k===' ')&&G.treppe>=0&&G.zustand!=='geschafft'&&document.activeElement===document.body){treppe();e.preventDefault();}
  if(k==='m'){$('grosskarte').hidden=!$('grosskarte').hidden;}});
 addEventListener('keyup',e=>eingabe.keys.delete(e.key.toLowerCase()));
 addEventListener('blur',()=>eingabe.keys.clear());
 const zeiger=new Map(),knauf=$('stick');
 cv.addEventListener('pointerdown',e=>{
  const links=e.pointerType!=='mouse'&&e.clientX<innerWidth*0.45;
  zeiger.set(e.pointerId,{rolle:links?'stick':'blick',x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY});
  if(links&&knauf){knauf.hidden=false;knauf.style.left=e.clientX+'px';knauf.style.top=e.clientY+'px';knauf.firstElementChild.style.transform='';}
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
 });
 cv.addEventListener('pointermove',e=>{const z=zeiger.get(e.pointerId);if(!z)return;
  if(z.rolle==='stick'){const dx=e.clientX-z.x0,dy=e.clientY-z.y0,m=Math.hypot(dx,dy),r=48,f=m>r?r/m:1;
   eingabe.stick.x=dx*f/r;eingabe.stick.y=dy*f/r;if(knauf)knauf.firstElementChild.style.transform='translate('+dx*f+'px,'+dy*f+'px)';}
  else{const sk=e.pointerType==='mouse'?0.0045:0.0065;eingabe.look.x+=(e.clientX-z.x)*sk;eingabe.look.y+=(e.clientY-z.y)*sk;}
  z.x=e.clientX;z.y=e.clientY;});
 const los=e=>{const z=zeiger.get(e.pointerId);if(!z)return;zeiger.delete(e.pointerId);
  if(z.rolle==='stick'){eingabe.stick.x=0;eingabe.stick.y=0;if(knauf)knauf.hidden=true;}};
 cv.addEventListener('pointerup',los);cv.addEventListener('pointercancel',los);
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 $('treppe').onclick=()=>treppe();
 $('quit').onclick=()=>{if(window.speechSynthesis)speechSynthesis.cancel();menu();};
 $('vorlesen').onclick=vorlesen;
 $('zeigen').onclick=zeigeHilfe;
 $('woerterKnopf').onclick=()=>{const w=$('woerter');w.hidden=!w.hidden;$('woerterKnopf').setAttribute('aria-expanded',String(!w.hidden));};
 $('falten').onclick=()=>{const b=$('auftrag');b.classList.toggle('zu');$('falten').textContent=b.classList.contains('zu')?'▾':'▴';$('falten').setAttribute('aria-label',b.classList.contains('zu')?'Aufgabe aufklappen':'Aufgabe zuklappen');};
 $('karte').onclick=()=>{$('grosskarte').hidden=false;};
 $('grosskarte').onclick=()=>{$('grosskarte').hidden=true;};
 addEventListener('resize',()=>{if(R)R.resize();});
 document.querySelectorAll('[data-modus]').forEach(b=>b.onclick=()=>start(b.dataset.modus));
}
/* Die Skripte stehen am Ende der Seite: Die Elemente sind schon da. */
binden();menu();

window.SchulSpiel={G,welt,start,update,treppe,neueAufgabe,weiter,zeigeHilfe,vorlesen,menu,sterne,zielErreicht,eingabe,RUNDE,ZIEL,START};
})();
