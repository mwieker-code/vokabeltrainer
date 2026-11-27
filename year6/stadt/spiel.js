/* =========================================================================
   TOWN RACE – Spielsteuerung: Menue, Rennen, Navigator-Ansagen, Eingabe
   (Tastatur, Controller, Touch), Splitscreen, Kamera, Ergebnis mit Karte.
   3D kommt aus render.js (Modul); ohne 3D (Tests) laeuft alles andere.
   ========================================================================= */
(function(){
'use strict';
const L=window.StadtLogik,DAT=window.STADT_DATEN;
const KEY='vt6:stadt:v1',FARBE=['#E9573F','#1F78B4'],KURVEN={kurz:5,mittel:8,lang:11};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const musik=(f,...a)=>{try{const m=window.StadtMusik;if(m&&m[f])return m[f](...a);}catch(e){}};
const sfx=n=>musik('sfx',n);
const uhr=()=>(typeof performance!=='undefined'?performance.now():Date.now())/1000;
let welt=null,seed=1;
const G={zustand:'menu',modus:null,spieler:[],strecke:null,t:0,countdown:null,laeuft:false,pause:false,einst:{},fertigZeit:null};

/* ---------------- Speicher ---------------- */
function laden(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return {};}}
function sichern(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}

/* ---------------- Sprache ---------------- */
let stimme=null;
function stimmeWaehlen(){try{const v=speechSynthesis.getVoices();stimme=v.find(x=>/en[-_]GB/i.test(x.lang)&&/Daniel|Serena|Kate|Google UK/i.test(x.name))||v.find(x=>/en[-_]GB/i.test(x.lang))||v.find(x=>/^en/i.test(x.lang))||null;}catch(e){}}
try{stimmeWaehlen();speechSynthesis.onvoiceschanged=stimmeWaehlen;}catch(e){}
function sprich(text,i,vorne){
 if(G.einst.ansage==='lesen')return;
 try{if(!window.speechSynthesis)return;
  if(vorne||G.spieler.length<2)speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';if(stimme)u.voice=stimme;u.rate=0.95;
  const k=i!=null?document.querySelector('#halb'+i+' .karte'):null;
  u.onstart=()=>{if(k)k.classList.add('spricht');};u.onend=u.onerror=()=>{if(k)k.classList.remove('spricht');};
  speechSynthesis.speak(u);}catch(e){}
}

/* ---------------- Einstellungen ---------------- */
const wert=n=>{const e=document.querySelector('input[name="'+n+'"]:checked');return e?e.value:null;};
function einstellungen(){
 const e={spieler:Number(wert('spieler')||1),laenge:wert('laenge')||'mittel',ansage:wert('ansage')||'beides',
  mischen:!!($('mischen')&&$('mischen').checked),autogas:!!($('autogas')&&$('autogas').checked),tafel:!!($('tafel')&&$('tafel').checked),
  musik:!$('musikAn')||$('musikAn').checked,schoen:!$('schoen')||$('schoen').checked,
  teams:[($('team1')&&$('team1').value.trim())||'Team Red',($('team2')&&$('team2').value.trim())||'Team Blue']};
 const d=laden();d.einst=e;sichern(d);return e;
}
function einstellungenLaden(){
 const e=(laden().einst)||{};
 const setze=(n,v)=>{const x=document.querySelector('input[name="'+n+'"][value="'+v+'"]');if(x)x.checked=true;};
 if(e.spieler)setze('spieler',e.spieler);if(e.laenge)setze('laenge',e.laenge);if(e.ansage)setze('ansage',e.ansage);
 for(const [id,k] of [['mischen','mischen'],['autogas','autogas'],['tafel','tafel'],['musikAn','musik'],['schoen','schoen']])if($(id)&&typeof e[k]==='boolean')$(id).checked=e[k];
 if(e.teams){if($('team1'))$('team1').value=e.teams[0];if($('team2'))$('team2').value=e.teams[1];}
 if($('autogas')&&typeof e.autogas!=='boolean'&&beruehrung)$('autogas').checked=true;
}
function bestwerte(){
 const d=laden(),b=d.best||{};
 const el=document.querySelector('[data-best="rennen"]');
 if(el){const t=['kurz','mittel','lang'].filter(k=>b[k]).map(k=>({kurz:'Short',mittel:'Medium',lang:'Long'}[k])+' '+L.zeitText(b[k])+' '+'★'.repeat((d.sterne||{})[k]||0)).join(' · ');el.textContent=t?'Best: '+t:'';}
}

/* ---------------- Start ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;document.body.classList.toggle('im-spiel',id==='stage');}
function start(modus,opt){
 opt=opt||{};
 G.einst=einstellungen();G.modus=modus;
 const neueStadt=!opt.gleich&&(G.einst.mischen||!welt);
 if(neueStadt||opt.seed){seed=opt.seed||(G.einst.mischen?Math.floor(Math.random()*1e6)+1:1);welt=L.bauen(DAT,{seed});weltNeu=true;}
 const n=modus==='frei'?1:Math.min(2,G.einst.spieler);
 if(modus==='rennen'){
  if(!opt.gleich||!G.strecke)G.strecke=L.strecke(welt,KURVEN[G.einst.laenge]||8,opt.streckeSeed||Math.floor(Math.random()*1e6)+1);
 }else G.strecke=null;
 const plaetze=G.strecke?L.startplaetze(welt,G.strecke,n):freiStart(n);
 G.spieler=plaetze.map((p,i)=>({i,name:n>1?G.einst.teams[i]:(G.einst.teams[0]==='Team Red'?'You':G.einst.teams[0]),kart:L.kart(p.x,p.z,p.h),
  nav:G.strecke?L.navigator(welt,G.strecke):null,zeit:null,cam:null,meldUhr:null,spur:[],hilfe:0,pfeilBis:0,stossUhr:0,pollerUhr:0,text:'',wende:false}));
 G.t=0;G.countdown=modus==='rennen'?3.2:null;G.laeuft=modus!=='rennen';G.pause=false;G.fertigZeit=null;G.renn=0;
 document.body.classList.toggle('split',n>1);document.body.classList.toggle('tafel',G.einst.tafel);document.body.classList.toggle('beruehrung',beruehrung||G.einst.tafel);
 document.body.classList.toggle('nur-hoeren',G.einst.ansage==='hoeren');
 document.body.classList.toggle('frei-modus',modus==='frei');
 for(let i=0;i<2;i++){const h=$('halb'+i);if(!h)continue;h.hidden=i>=n;
  h.querySelector('.k-team').textContent=n>1?G.spieler[i]?.name||'':'';h.style.setProperty('--team',FARBE[i]);
  h.querySelector('.meldung').hidden=true;h.querySelector('.ziel-banner').hidden=true;
  h.querySelector('.karte').hidden=modus==='frei';h.querySelector('.status').hidden=modus==='frei';}
 if($('frei'))$('frei').hidden=modus!=='frei';
 if($('karteKnopf'))$('karteKnopf').hidden=modus!=='frei';
 ['pause','woerter','grosskarte'].forEach(id=>{if($(id))$(id).hidden=true;});
 zeige('stage');
 if(G.strecke)G.spieler.forEach(s=>{const a=L.ansage(welt,s.nav);s.text='Start! '+a.text;karteText(s);});
 if(modus==='rennen'){countdownAnzeige();const s0=G.spieler[0];setTimeout(()=>{if(G.spieler[0]===s0)sprich(s0.text,null,true);},500);}else{if($('countdown'))$('countdown').hidden=true;}
 if(G.einst.musik)musik('start');else musik('stop');musik('leise',false);
 starte3d();
 tonHinweis();
}
let weltNeu=true;
function freiStart(n){const e=welt.kanten.find(k=>k.art==='strasse'&&!k.quer&&k.reihe===Math.floor(L.NZ/2));const a=welt.knoten[e.a];return [{x:a.x+20,z:a.z-2.2,h:Math.PI/2}].slice(0,n);}
function menu(){
 G.zustand='menu';G.laeuft=false;musik('stop');musik('motorAus');try{speechSynthesis.cancel();}catch(e){}
 zeige('menu');bestwerte();document.body.classList.remove('split');
}

/* ---------------- Anzeige ---------------- */
function karteText(s){
 const h=$('halb'+s.i);if(!h)return;
 const t=h.querySelector('.k-text');if(!t)return;
 t.textContent=G.einst.ansage==='hoeren'?'🎧 Listen! (△ / Y / R = again)':s.text;
 const k=h.querySelector('.karte');k.classList.remove('neu');void k.offsetWidth;k.classList.add('neu');
 k.classList.toggle('wende',!!s.wende);
}
function melde(s,text,art,ms){
 const h=$('halb'+s.i);if(!h)return;const m=h.querySelector('.meldung');if(!m)return;
 m.textContent=text;m.className='meldung '+(art||'');m.hidden=false;clearTimeout(s.meldUhr);s.meldUhr=setTimeout(()=>{m.hidden=true;},ms||1800);
}
function statusAnzeige(){
 for(const s of G.spieler){const h=$('halb'+s.i);if(!h)continue;
  const z=s.zeit!=null?s.zeit:Math.max(0,G.renn);
  h.querySelector('.s-zeit').textContent=L.zeitText(z);
  if(s.nav)h.querySelector('.s-fehler').textContent='✗ '+s.nav.fehler;
  h.querySelector('.s-turbo').textContent='⚡'.repeat(s.kart.ladung)||'⚡ 0';
  h.querySelector('.s-turbo').classList.toggle('leer',!s.kart.ladung);}
}
function countdownAnzeige(){
 const c=$('countdown');if(!c)return;
 if(G.countdown==null){c.hidden=true;return;}
 const n=Math.ceil(G.countdown-0.2);
 c.hidden=false;c.textContent=n>=1?String(n):'GO!';c.classList.toggle('go',n<1);
}

/* ---------------- Navigator ---------------- */
function navEreignisse(s,ev){
 for(const e of ev){
  if(e.art==='richtig'){s.kart.ladung=Math.min(3,s.kart.ladung+1);sfx('richtig');melde(s,'✔ Good! +⚡','gut');}
  if(e.art==='falsch'){sfx('falsch');melde(s,'✗ Wrong way!','schlecht',2400);}
  if(e.art==='gewendet'){sfx('wende');s.wende=false;s.text=s.text.replace(/^Turn around\. /,'');karteText(s);melde(s,'✔ Good!','gut');}
  if(e.art==='ansage'){
   const a=L.ansage(welt,s.nav);s.wende=!!e.wende;
   s.text=(e.wende?'Turn around. ':'')+a.text;
   if(e.neu){karteText(s);sprich((ev.some(x=>x.art==='falsch')?'Oops! Wrong way. ':'')+s.text,s.i);}
   else{const t=$('halb'+s.i)?.querySelector('.k-text');if(t&&G.einst.ansage!=='hoeren')t.textContent=s.text;}
  }
  if(e.art==='ziel')imZiel(s);
 }
}
function wiederholen(i){const s=G.spieler[i];if(!s||!G.strecke||s.zeit!=null)return;sprich(s.text,s.i,true);karteText(s);}
/* Hinweis: Pfeil an der naechsten Abbiegung (kostet einen Stern) */
function hilfe(i){
 const s=G.spieler[i];if(!s||!s.nav||s.zeit!=null||!G.laeuft)return false;
 const P=s.nav.pfad,a=L.ansage(welt,s.nav);
 let ziel=null;
 if(s.nav.gerade.von!==P[0]||s.nav.gerade.nach!==P[1]){const k=welt.knoten[s.nav.gerade.nach];ziel={x:k.x,z:k.z,h:L.richtung(welt.knoten[s.nav.gerade.nach],welt.knoten[s.nav.gerade.von])*Math.PI/2};}
 else if(a.ende!=null){const idx=P.indexOf(a.ende),k=welt.knoten[a.ende],n=welt.knoten[P[idx+1]];ziel={x:k.x,z:k.z,h:L.richtung(k,n)*Math.PI/2};}
 else ziel={x:G.strecke.ziel.x,z:G.strecke.ziel.z,h:L.richtung(welt.knoten[s.nav.ziel.von],welt.knoten[s.nav.ziel.nach])*Math.PI/2};
 s.pfeil=ziel;s.pfeilBis=G.t+5;s.hilfe++;melde(s,'Follow the yellow arrow (help: −1 ★)','info',2600);return true;
}
function imZiel(s){
 s.zeit=G.renn;s.kart.v*=0.5;sfx('ziel');
 const h=$('halb'+s.i);
 const erster=G.spieler.filter(x=>x.zeit!=null).length===1;
 if(h){const b=h.querySelector('.ziel-banner');b.hidden=false;b.innerHTML='<b>'+(G.spieler.length>1&&erster?'🏆 '+esc(s.name)+' wins!':'🏁 Finish!')+'</b><span>'+L.zeitText(s.zeit)+'</span>';}
 if(G.spieler.every(x=>x.zeit!=null)){G.fertigZeit=G.t;}
 else if(G.spieler.length>1&&erster){G.fertigZeit=null;G.wartenBis=G.t+45;}
}

/* ---------------- Ergebnis ---------------- */
function ergebnis(){
 G.laeuft=false;G.zustand='ende';musik('leise',true);musik('motorAus');try{speechSynthesis.cancel();}catch(e){}
 const d=laden();d.best=d.best||{};d.sterne=d.sterne||{};d.rennen=(d.rennen||0)+1;
 const lg=G.einst.laenge,teile=[];let neuBest=false;
 const sortiert=G.spieler.slice().sort((a,b)=>(a.zeit==null?1e9:a.zeit)-(b.zeit==null?1e9:b.zeit));
 for(const s of G.spieler){
  const st=s.zeit==null?0:Math.max(1,L.sterne(s.nav)-(s.hilfe?1:0));
  if(s.zeit!=null&&(!d.best[lg]||s.zeit<d.best[lg])){d.best[lg]=Math.round(s.zeit*10)/10;neuBest=true;}
  d.sterne[lg]=Math.max(d.sterne[lg]||0,st);
  teile.push('<div class="e-karte" style="--team:'+FARBE[s.i]+'"><p class="e-name">'+(G.spieler.length>1&&sortiert[0]===s&&s.zeit!=null?'🏆 ':'')+esc(s.name)+'</p>'
   +'<p class="e-sterne" aria-label="'+st+' stars">'+'★'.repeat(st)+'☆'.repeat(3-st)+'</p>'
   +'<p class="e-zeit">'+(s.zeit!=null?L.zeitText(s.zeit):'did not finish')+'</p>'
   +'<p>'+s.nav.richtig+' right turns · '+s.nav.fehler+' wrong '+(s.nav.fehler===1?'turn':'turns')+(s.hilfe?' · help: '+s.hilfe:'')+'</p></div>');
 }
 sichern(d);
 $('overTitel').textContent=G.spieler.length>1&&sortiert[0].zeit!=null?sortiert[0].name+' wins!':neuBest?'New best time!':'Finish!';
 $('ergebnis').innerHTML='<div class="e-raster">'+teile.join('')+'</div><p class="e-ziel">The finish was at <b lang="en">'+esc(welt.orte[G.strecke.ziel.ort].en)+'</b>.</p>';
 /* Protokoll: alle Abbiegungen */
 $('protokoll').innerHTML=G.spieler.map(s=>'<div class="p-spalte" style="--team:'+FARBE[s.i]+'"><h3>'+(G.spieler.length>1?esc(s.name)+': ':'')+'your directions</h3><ol lang="en">'
  +s.nav.log.map(x=>'<li class="'+(x.ok?'ok':'nein')+'">'+(x.ok?'✔ ':'✗ ')+esc(x.text.replace(/^Start! /,''))+'</li>').join('')+'</ol></div>').join('');
 document.body.classList.toggle('zwei',G.spieler.length>1);
 zeige('over');
 karteZeichnen($('ergebnisKarte'),{route:G.strecke.pfad,spuren:G.spieler.map(s=>s.spur),ziel:G.strecke.ziel});
 try{$('overTitel').focus();}catch(e){}
}

/* ---------------- Karte (2D) ---------------- */
function karteZeichnen(cv,o){
 if(!cv||!cv.getContext)return;const g=cv.getContext('2d');if(!g)return;
 o=o||{};const W=cv.width,H=cv.height,X2=(L.NX-1)*L.A,Z2=(L.NZ-1)*L.A,rand=24;
 const sk=Math.min((W-2*rand)/(X2+2*L.H),(H-2*rand)/(Z2+2*L.H)),ox=(W-(X2)*sk)/2,oz=(H-(Z2)*sk)/2;
 const px=x=>ox+x*sk,pz=z=>oz+z*sk;
 g.fillStyle='#7BAE5E';g.fillRect(0,0,W,H);
 g.fillStyle='#55595F';g.fillRect(px(-L.H),pz(-L.H),(X2+2*L.H)*sk,(Z2+2*L.H)*sk);
 for(const b of welt.bloecke)if(b.art==='normal'){g.fillStyle='#C9C6BE';g.fillRect(px(b.x1),pz(b.z1),(b.x2-b.x1)*sk,(b.z2-b.z1)*sk);
  for(const l of b.lots){g.fillStyle=l.typ==='ort'?'#F4E3B5':'#B9A79A';g.fillRect(px(l.x1)+1,pz(l.z1)+1,(l.x2-l.x1)*sk-2,(l.z2-l.z1)*sk-2);}}
 for(const f of welt.flaechen){g.fillStyle=f.modell==='park'?'#4E8A3E':'#5FA04A';g.fillRect(px(f.x1),pz(f.z1),(f.x2-f.x1)*sk,(f.z2-f.z1)*sk);}
 {const e=welt.zone,a=welt.knoten[e.a],b=welt.knoten[e.b];g.fillStyle='#B98C6E';
  if(e.quer)g.fillRect(px(a.x-L.H),pz(a.z+L.H),2*L.H*sk,(b.z-a.z-2*L.H)*sk);else g.fillRect(px(a.x+L.H),pz(a.z-L.H),(b.x-a.x-2*L.H)*sk,2*L.H*sk);}
 for(const k of welt.knoten)if(k.rund){g.fillStyle='#7BAE5E';g.beginPath();g.arc(px(k.x),pz(k.z),L.INSEL*sk,0,7);g.fill();}
 /* Namen der Orte */
 if(o.namen!==false){g.textAlign='center';g.textBaseline='middle';
  for(const l of welt.lots)if(l.typ==='ort'){const O=welt.orte[l.ort];const fs=Math.max(9,Math.round(sk*4.2));g.font='700 '+fs+'px Inter, system-ui, sans-serif';
   const t=(O.kurz||O.schild).replace("ST MARY'S ",'');const cx=px((l.x1+l.x2)/2),cz=pz((l.z1+l.z2)/2);
   g.fillStyle=O.farbe;const w=g.measureText(t).width+8;g.fillRect(cx-w/2,cz-fs*0.7,w,fs*1.4);g.fillStyle='#FFFFFF';g.fillText(t,cx,cz+1);}
  for(const f of welt.flaechen){g.font='800 '+Math.max(10,Math.round(sk*5))+'px Inter, system-ui, sans-serif';g.fillStyle='#FFFFFF';g.fillText(f.schild,px((f.x1+f.x2)/2),pz((f.z1+f.z2)/2));}
  /* Strassennamen */
  g.font='italic 600 '+Math.max(9,Math.round(sk*3.6))+'px Inter, system-ui, sans-serif';g.fillStyle='#FFFFFF';
  for(let j=0;j<L.NZ;j++){g.save();g.translate(px(L.A*0.5),pz(j*L.A));g.fillText(welt.reiheName[j],0,1);g.restore();}
  for(let i=0;i<L.NX;i++){g.save();g.translate(px(i*L.A),pz(L.A*1.5));g.rotate(-Math.PI/2);g.fillText(welt.spalteName[i],0,1);g.restore();}
 }
 /* Route und Spuren */
 if(o.route){g.setLineDash([10,8]);g.strokeStyle='#FFC845';g.lineWidth=5;g.beginPath();o.route.forEach((n,i)=>{const k=welt.knoten[n];if(i===0)g.moveTo(px(k.x),pz(k.z));else g.lineTo(px(k.x),pz(k.z));});
  if(o.ziel)g.lineTo(px(o.ziel.x),pz(o.ziel.z));g.stroke();g.setLineDash([]);}
 (o.spuren||[]).forEach((sp,i)=>{if(!sp.length)return;g.strokeStyle=FARBE[i];g.lineWidth=3.5;g.beginPath();sp.forEach((p,j)=>{if(j===0)g.moveTo(px(p[0]),pz(p[1]));else g.lineTo(px(p[0]),pz(p[1]));});g.stroke();});
 if(o.ziel){g.font='26px "Apple Color Emoji","Segoe UI Emoji",sans-serif';g.textAlign='center';g.fillText('🏁',px(o.ziel.x),pz(o.ziel.z)-6);}
 if(o.route){const k=welt.knoten[o.route[0]];g.fillStyle='#2E9E4F';g.beginPath();g.arc(px(k.x),pz(k.z),7,0,7);g.fill();}
 /* eigener Standort */
 (o.karts||[]).forEach((k,i)=>{g.save();g.translate(px(k.x),pz(k.z));g.rotate(k.h);g.fillStyle=FARBE[i];g.strokeStyle='#FFFFFF';g.lineWidth=2;
  g.beginPath();g.moveTo(0,-11);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();});
}

/* ---------------- Eingabe ---------------- */
const beruehrung=typeof window!=='undefined'&&('ontouchstart' in window||(navigator.maxTouchPoints||0)>0);
const tasten=new Set();
const touch=[{},{}];
const KN={A:0,B:1,X:2,Y:3,LB:4,RB:5,SELECT:8,START:9,HOCH:12,RUNTER:13,LINKS:14,RECHTS:15};
let padQuelle=()=>{try{return navigator.getGamepads?[...navigator.getGamepads()]:[];}catch(e){return [];}};
const PAD={alt:new Map(),stand:[],fokus:null,bereich:undefined,anzahl:-1};
const tot=v=>Math.abs(v||0)<0.15?0:(v-Math.sign(v)*0.15)/0.85;
function padLesen(){
 const roh=(padQuelle()||[]).filter(p=>p&&p.connected!==false&&p.buttons&&p.buttons.length);
 PAD.stand=roh.map(p=>{const halt=new Set();p.buttons.forEach((b,i)=>{if(b&&(b.pressed||b.value>0.5))halt.add(i);});
  const alt=PAD.alt.get(p.index)||new Set(),neu=new Set([...halt].filter(i=>!alt.has(i)));PAD.alt.set(p.index,halt);
  const a=p.axes||[],w=i=>{const b=p.buttons[i];return b?Math.max(b.value||0,b.pressed?1:0):0;};
  return {index:p.index,lx:tot(a[0]),ly:tot(a[1]),l2:w(6),r2:w(7),halt,neu};});
 return PAD.stand;
}
/* Eingabe fuer Spieler i */
function eingabe(i){
 const n=G.spieler.length,p=PAD.stand,c=n>1?p[i]:(p.length?p[0]:null);
 const k=t=>tasten.has(t);
 let lenk=0,gas=0,bremse=0,boost=false;
 const links=n>1?(i?k('arrowleft'):k('a')):(k('a')||k('arrowleft')),rechts=n>1?(i?k('arrowright'):k('d')):(k('d')||k('arrowright'));
 const vor=n>1?(i?k('arrowup'):k('w')):(k('w')||k('arrowup')),zur=n>1?(i?k('arrowdown'):k('s')):(k('s')||k('arrowdown'));
 if(links)lenk-=1;if(rechts)lenk+=1;if(vor)gas=1;if(zur)bremse=1;
 const T=touch[i]||{};if(T.links)lenk-=1;if(T.rechts)lenk+=1;if(T.gas)gas=1;if(T.bremse)bremse=1;
 const alle=n>1?(c?[c]:[]):p;
 for(const q of alle){lenk+=q.lx;if(q.halt.has(KN.LINKS))lenk-=1;if(q.halt.has(KN.RECHTS))lenk+=1;gas=Math.max(gas,q.r2,q.halt.has(KN.A)?1:0);bremse=Math.max(bremse,q.l2,q.halt.has(KN.B)?1:0);
  if(q.neu.has(KN.X)||q.neu.has(KN.RB))boost=true;}
 if(G.einst.autogas&&!bremse)gas=Math.max(gas,0.85);
 return {lenk:Math.max(-1,Math.min(1,lenk)),gas,bremse,boost:boost||!!T.boostJetzt};
}
const DIALOGE=['pause','woerter','grosskarte'];
function padBereich(){
 if($('stage')&&!$('stage').hidden){for(const id of DIALOGE){const e=$(id);if(e&&!e.hidden)return e;}return null;}
 if($('over')&&!$('over').hidden)return $('over');
 if($('menu')&&!$('menu').hidden)return $('menu');
 return null;
}
const sichtbar=e=>!!e&&!e.disabled&&!e.closest('[hidden]');
function padZiele(b){return b?[...b.querySelectorAll('button,input,select,summary,a[href]')].filter(sichtbar):[];}
function padFokus(e){document.querySelectorAll('.pad-fokus').forEach(x=>x.classList.remove('pad-fokus'));PAD.fokus=e||null;if(e){e.classList.add('pad-fokus');try{e.focus({preventScroll:true});}catch(_){}try{e.scrollIntoView&&e.scrollIntoView({block:'nearest'});}catch(_){}}}
function padSchritt(liste,d){if(!liste.length)return;let i=liste.indexOf(PAD.fokus);if(i<0)i=d>0?-1:liste.length;padFokus(liste[(i+d+liste.length)%liste.length]);}
function padAnzeige(n){
 if(n===PAD.anzahl)return;PAD.anzahl=n;
 const el=$('padStatus');if(el){el.textContent=n?'🎮 '+n+(n===1?' controller connected':' controllers connected')+(n>=2?' – two teams can race in split screen.':'.'):'🎮 No controller found. Connect a controller (Bluetooth or cable) and press a button.';el.classList.toggle('an',n>0);}
}
function padTick(){
 const P=padLesen();padAnzeige(P.length);
 if(!P.length)return;
 const neu=new Set();P.forEach(p=>p.neu.forEach(x=>neu.add(x)));
 if(neu.size)musik('wecken');
 const b=padBereich();
 if(b!==PAD.bereich){PAD.bereich=b;padFokus(b&&b.id!=='menu'&&b.id!=='over'||b&&neu.size?padZiele(b).find(e=>e.matches('.primaer'))||padZiele(b)[0]:null);if(b)return;}
 if(b){
  const z=padZiele(b);
  if(PAD.fokus&&(!b.contains(PAD.fokus)||!sichtbar(PAD.fokus)))padFokus(null);
  const hoch=neu.has(KN.HOCH)||neu.has(KN.LINKS)||neu.has(KN.LB),runter=neu.has(KN.RUNTER)||neu.has(KN.RECHTS)||neu.has(KN.RB);
  if((hoch||runter)&&!PAD.fokus){padFokus(z.find(e=>e.matches('.primaer'))||z[0]);return;}
  if(hoch)padSchritt(z,-1);if(runter)padSchritt(z,1);
  if(neu.has(KN.A)){if(PAD.fokus)PAD.fokus.click();else padFokus(z.find(e=>e.matches('.primaer'))||z[0]);}
  if(neu.has(KN.B)){if(b.id==='pause')fortsetzen();else if(b.id==='woerter'||b.id==='grosskarte')b.hidden=true;}
  if(neu.has(KN.START)&&b.id==='pause')fortsetzen();
  return;
 }
 /* im Spiel */
 const n=G.spieler.length;
 P.forEach((p,j)=>{const i=n>1?j:0;if(i>=n)return;
  if(p.neu.has(KN.Y))wiederholen(i);
  if(p.neu.has(KN.SELECT))hilfe(i);
  if(p.neu.has(KN.LB))sfx('hupe');
  if(p.neu.has(KN.START))pausieren();
 });
}
function padSchleife(){try{padTick();}catch(e){}requestAnimationFrame(padSchleife);}

/* ---------------- Kamera ---------------- */
function kamera(s,dt){
 const k=s.kart,c=s.cam||(s.cam={yaw:k.h,x:k.x,z:k.z,fov:70});
 let ziel=k.h;if(k.v<-1)ziel=k.h;   // rueckwaerts: Kamera bleibt hinten
 c.yaw+=L.winkel(ziel-c.yaw)*Math.min(1,dt*(3.5+Math.abs(k.v)*0.18));
 const dist=6.2+Math.max(0,k.v)*0.07,fx=Math.sin(c.yaw),fz=-Math.cos(c.yaw);
 let d=dist;for(let t=1;t<=dist;t+=0.5){if(!L.frei(welt,k.x-fx*t,k.z-fz*t,0.4)){d=Math.max(1.6,t-0.6);break;}}
 const fov=68+Math.max(0,k.v)*0.55+(k.boost>0?8:0);c.fov+=(fov-c.fov)*Math.min(1,dt*3);
 return {cam:[k.x-fx*d,2.3+d*0.12,k.z-fz*d],ziel:[k.x+fx*5,1.1,k.z+fz*5],fov:c.fov};
}

/* ---------------- Schleife ---------------- */
function update(dt,eing){
 if(G.zustand!=='spiel'&&G.zustand!=='laden')return;
 if(G.pause)return;
 G.t+=dt;
 if(G.countdown!=null){
  const alt=Math.ceil(G.countdown-0.2);G.countdown-=dt;const n=Math.ceil(G.countdown-0.2);
  if(n!==alt){if(n>=1)sfx('piep');else{sfx('los');G.laeuft=true;}}
  if(G.countdown<=-0.8)G.countdown=null;
  countdownAnzeige();
 }
 if(G.laeuft)G.renn+=dt;
 const karts=G.spieler.map(s=>s.kart);
 for(const s of G.spieler){
  let inp=eing?eing(s.i):G.auto&&s.nav?L.autopilot(welt,s.nav,s.kart):eingabe(s.i);
  if(!G.laeuft||s.zeit!=null){inp={lenk:inp.lenk,gas:0,bremse:s.zeit!=null?0.4:0,boost:false};}
  if(touch[s.i])touch[s.i].boostJetzt=false;
  const vorher=s.kart.ladung;
  /* in kleinen Schritten rechnen: genaue Kollision auch bei schneller Fahrt */
  const n=Math.max(1,Math.ceil(dt/0.017));
  for(let j=0;j<n;j++){L.fahren(welt,s.kart,j?Object.assign({},inp,{boost:false}):inp,dt/n,karts);
   if(s.nav&&G.laeuft&&s.zeit==null)navEreignisse(s,L.navSchritt(welt,s.nav,s.kart,dt/n));}
  if(s.kart.ladung<vorher){sfx('boost');melde(s,'⚡ Turbo!','info',900);}
  if(s.kart.stoss>4&&G.t>s.stossUhr){sfx('stoss');s.stossUhr=G.t+0.4;
   if(G.t>s.pollerUhr&&welt.kisten.some(b=>b.art==='poller'&&s.kart.x>b.x1-2.5&&s.kart.x<b.x2+2.5&&s.kart.z>b.z1-2.5&&s.kart.z<b.z2+2.5)){s.pollerUhr=G.t+6;melde(s,"You can't drive through the pedestrian zone!",'schlecht',2600);sprich("You can't drive through the pedestrian zone.",s.i);}}
  if(G.laeuft&&s.zeit==null&&(!s.spur.length||G.t-s.spurT>0.25)){s.spur.push([s.kart.x,s.kart.z]);s.spurT=G.t;}
  if(s.pfeil&&G.t>s.pfeilBis)s.pfeil=null;
  musik('motor',s.i,s.kart.v,inp.gas);
 }
 if(G.modus==='rennen'){
  if(G.fertigZeit!=null&&G.t-G.fertigZeit>2.5)return ergebnis();
  if(G.wartenBis&&G.t>G.wartenBis&&G.spieler.some(s=>s.zeit==null)){G.wartenBis=null;G.fertigZeit=G.t-1.5;}
 }
 statusAnzeige();
 if(G.modus==='frei')freiAnzeige();
}
let freiUhr=0;
function freiAnzeige(){
 if(G.t-freiUhr<0.25)return;freiUhr=G.t;
 const k=G.spieler[0].kart,o=L.ort(welt,k.x,k.z);let t='';
 if(o.kante!=null){const e=welt.kanten[o.kante];t='📍 '+e.name;const orte=L.orteAnKante(welt,e);if(orte.length)t+=' · '+orte.slice(0,2).map(id=>welt.orte[id].en).join(', ');}
 else if(o.knoten!=null){const n=welt.knoten[o.knoten];const s=[...new Set(n.kante.filter(Boolean).map(e=>e.name))];t='📍 '+(s.length>1?'the corner of '+s.join(' and '):s[0]||'');if(n.ort)t+=' · '+welt.orte[n.ort].en;if(n.rund)t='📍 the roundabout';}
 if($('freiOrt'))$('freiOrt').textContent=t;
 karteZeichnen($('mini'),{namen:false,karts:[k]});
}
let R=null,zuletzt=0,schleifeLaeuft=false;
function starte3d(){
 G.zustand='laden';
 const fertig=()=>{if($('laden'))$('laden').hidden=true;G.zustand='spiel';};
 if(!window.StadtRender){if($('laden'))$('laden').hidden=false;
  /* ohne 3D (z. B. in Tests) trotzdem spielbar */
  fertig();return;}
 try{
  if(R&&weltNeu){R.weg();R=null;}
  if(!R){const c=$('welt');R=window.StadtRender.init(c,welt,{schoen:G.einst.schoen,mobil:beruehrung});weltNeu=false;}
  R.strecke(G.strecke);R.resize();
 }catch(e){console.error(e);}
 fertig();
 if(!schleifeLaeuft){schleifeLaeuft=true;zuletzt=uhr();requestAnimationFrame(schleife);}
}
window.addEventListener('stadtrender',()=>{if(G.zustand!=='menu'&&G.zustand!=='ende')starte3d();});
function schleife(){
 const jetzt=uhr(),dt=Math.min(0.05,Math.max(0,jetzt-zuletzt));zuletzt=jetzt;
 if(G.zustand==='spiel'){
  try{update(dt);}catch(e){console.error(e);}
  if(R){const views=G.spieler.map(s=>kamera(s,dt));
   const pfeil=(G.spieler.find(s=>s.pfeil)||{}).pfeil||null;
   try{R.frame({t:G.t,karts:G.spieler.map(s=>s.kart),views,countdown:G.countdown==null?null:G.countdown-0.2,pfeil});}catch(e){console.error(e);}}
 }
 requestAnimationFrame(schleife);
}

/* ---------------- Pause ---------------- */
function pausieren(){if(G.zustand!=='spiel'||G.pause)return;G.pause=true;musik('leise',true);musik('motorAus');try{speechSynthesis.pause();}catch(e){}$('pause').hidden=false;}
function fortsetzen(){G.pause=false;musik('leise',false);try{speechSynthesis.resume();}catch(e){}['pause','woerter','grosskarte'].forEach(id=>{if($(id))$(id).hidden=true;});zuletzt=uhr();}
function woerterZeigen(){const t=$('woerterListe');if(t)t.innerHTML=DAT.WOERTER.map(([en,de])=>'<tr><td lang="en">'+esc(en)+'</td><td lang="de">'+esc(de)+'</td></tr>').join('');$('woerter').hidden=false;}
function grosseKarte(){$('grosskarte').hidden=false;karteZeichnen($('karteBild'),{karts:G.spieler.map(s=>s.kart)});}

/* ---------------- Ton-Hinweis ---------------- */
function tonHinweis(){const b=$('tonAus');if(!b)return;setTimeout(()=>{b.hidden=!(window.StadtMusik&&window.StadtMusik.blockiert);},1200);}

/* ---------------- Binden ---------------- */
function binden(){
 document.querySelectorAll('[data-modus]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.modus)));
 const klick=(id,f)=>{const e=$(id);if(e)e.addEventListener('click',f);};
 klick('pauseKnopf',pausieren);klick('weiter',fortsetzen);klick('nochmal',()=>{fortsetzen();start(G.modus,{gleich:true});});
 klick('zumMenu',()=>{fortsetzen();menu();});klick('woerterKnopf',woerterZeigen);klick('woerterZu',()=>{$('woerter').hidden=true;});
 klick('karteKnopf',grosseKarte);klick('karteZu',()=>{$('grosskarte').hidden=true;});
 klick('gleich',()=>start('rennen',{gleich:true}));klick('neu',()=>start('rennen'));klick('overMenu',menu);
 klick('tonAus',()=>{musik('wecken');if(G.einst.musik)musik('start');$('tonAus').hidden=true;});
 document.querySelectorAll('[data-hoer]').forEach(b=>b.addEventListener('click',()=>wiederholen(Number(b.dataset.hoer))));
 if($('musikAn'))$('musikAn').addEventListener('change',()=>musik('setze',$('musikAn').checked));
 /* Touch-Knoepfe */
 for(let i=0;i<2;i++){const h=$('halb'+i);if(!h)continue;
  h.querySelectorAll('[data-t]').forEach(b=>{const t=b.dataset.t;
   const an=e=>{e.preventDefault();musik('wecken');if(t==='turbo')touch[i].boostJetzt=true;else touch[i][t]=true;b.classList.add('an');};
   const aus=e=>{if(t!=='turbo')touch[i][t]=false;b.classList.remove('an');};
   b.addEventListener('pointerdown',an);b.addEventListener('pointerup',aus);b.addEventListener('pointercancel',aus);b.addEventListener('pointerleave',aus);});}
 const SPIELTASTEN=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','q','r','enter','backspace','h','m','escape','p'];
 window.addEventListener('keydown',e=>{
  musik('wecken');
  if(e.target&&/input|select|textarea/i.test(e.target.tagName))return;
  const k=e.key.toLowerCase();
  if(G.zustand!=='spiel'){return;}
  if(!$('pause').hidden||!$('woerter').hidden||!$('grosskarte').hidden){if(k==='escape'){fortsetzen();e.preventDefault();}return;}
  if(SPIELTASTEN.includes(k))e.preventDefault();
  tasten.add(k);
  const zwei=G.spieler.length>1;
  if(!e.repeat){
   if(k===' '||(zwei&&k==='e')||(!zwei&&k==='e'))touch[0].boostJetzt=true;
   if(zwei&&k==='enter')touch[1].boostJetzt=true;
   if(k==='r'||(k==='q'))wiederholen(0);
   if(zwei&&k==='backspace')wiederholen(1);
   if(k==='h')hilfe(0);
   if(k==='escape'||k==='p')pausieren();
   if(k==='m'&&G.modus==='frei')grosseKarte();
  }
 });
 window.addEventListener('keyup',e=>{tasten.delete(e.key.toLowerCase());});
 window.addEventListener('blur',()=>tasten.clear());
 window.addEventListener('resize',()=>{if(R)R.resize();});
 for(const ev of ['pointerdown','touchstart','mousedown'])window.addEventListener(ev,()=>musik('wecken'),{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.zustand==='spiel')pausieren();});
}
einstellungenLaden();bestwerte();binden();padAnzeige(0);
if(typeof requestAnimationFrame!=='undefined')requestAnimationFrame(padSchleife);
try{window.addEventListener('gamepadconnected',()=>padAnzeige(padLesen().length));}catch(e){}

window.StadtSpiel={get R(){return R;},G,get welt(){return welt;},start,menu,update,eingabe,ergebnis,wiederholen,hilfe,pausieren,fortsetzen,karteZeichnen,padTick,PAD,KN,
 padQuelle:f=>{padQuelle=f;},tasten,touch,navEreignisse};
})();
