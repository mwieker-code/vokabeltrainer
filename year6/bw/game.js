/* =========================================================================
   BLACK & WHITE - Year 6, Vokabeln aus Unit 2.
   Eine Reise mit vier schwarz-weissen Tieren: Pinguin, Orca, Panda, Zebra.

   Dieser Teil ist der Rahmen: Menue mit Kapiteln und Reisepass, Start,
   Steuerung, Musik (musik.js), Verwandlung (morph.js), Weltkarte mit
   Reiseroute (reise.js) und Ergebnis. Die Kapitel sind eigene Spiele:
     1  Penguin Slide (pinguin.js)
     2  Orca Rush     (orca.js)
   Panda und Zebra folgen. Eine Runde laeuft vom gewaehlten Kapitel bis zum
   letzten fertigen; die Punkte werden mitgenommen.

   Die Lernfaecher der App bleiben unberuehrt; gespeichert werden nur
   Bestwerte und Stempel (vt6:bw:v1).
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,$=id=>document.getElementById(id);
const KEY='vt6:bw:v1';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KAPITEL=[
 {id:'pinguin',name:'Pinguin',spiel:()=>window.BWPinguin,titel:'Penguin Slide'},
 {id:'orca',name:'Orca',spiel:()=>window.BWOrca,titel:'Orca Rush'},
 {id:'panda',name:'Panda',status:'folgt'},
 {id:'zebra',name:'Zebra',status:'folgt'}
];
const FERTIG=KAPITEL.filter(k=>k.spiel).length;
let saved={best:{},stempel:[]};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object')saved={best:p.best,stempel:Array.isArray(p.stempel)?p.stempel.filter(s=>typeof s==='string'):[]};}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}};
const ORTE=()=>window.BWReise.ORTE;
const toene=()=>{try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}};
const M=()=>window.BWMusik||null;

const G={mode:'menu',part:null,kap:0,startKap:0,score:0,missed:new Map(),stats:{},keys:new Set()};
const S=()=>KAPITEL[G.kap].spiel();
function wortliste(id){return id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||D.parts[0]).words;}
const zeichnet=()=>{const cv=$('spiel');return !!(cv&&cv.getContext&&typeof requestAnimationFrame==='function'&&cv.getContext('2d'));};

/* ---------------- Ablauf ---------------- */
function start(id){
 Object.assign(G,{part:id,score:0,missed:new Map(),stats:{}});
 kapitel(G.startKap);
}
function kapitel(n){
 G.kap=n;G.mode='play';zeige('stage');document.body.classList.remove('morph','pausiert');
 if($('reise'))$('reise').hidden=true;
 document.body.dataset.kap=KAPITEL[n].id;
 if($('hint'))$('hint').textContent=S().hinweis;
 const cv=$('spiel');
 S().start({words:wortliste(G.part),onFrage:frage,onEnd:kapitelEnde,score:G.score,H:cv&&cv.clientWidth?cv.clientHeight/cv.clientWidth*360:560});
 const m=M();if(m)m.spiele(KAPITEL[n].id);
 stand();
 if(!laeuft&&typeof requestAnimationFrame==='function'){laeuft=true;zuletzt=0;requestAnimationFrame(schleife);}
}
function frage(q,opts){
 if($('prompt'))$('prompt').textContent=q.de;
 const box=$('choices');if(!box)return;const s=S();
 box.innerHTML=opts.slice().sort((a,b)=>a.lane-b.lane).map(o=>'<button data-lane="'+o.lane+'" lang="en" style="--farbe:'+s.LANE_COL[o.lane]+'"><i aria-hidden="true">'+s.LANE_ZEICHEN[o.lane]+'</i>'+esc(o.w.en)+'</button>').join('');
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>S().lane(+b.dataset.lane));
}
let reise=null;
function kapitelEnde(won){
 const s=S(),O=s.O;
 G.score=O.score;for(const [k,w] of O.missed)G.missed.set(k,w);
 G.stats[KAPITEL[G.kap].id]={k:O.k,best:O.best,jumps:O.jumps,extra:O.fish!=null?O.fish:O.krill};
 if(!won)return finish(false);
 const id=KAPITEL[G.kap].id;if(!saved.stempel.includes(id))saved.stempel.push(id);save();
 /* Pinguin -> Orca: erst die Verwandlung, dann die Karte */
 if(G.kap===0&&zeichnet()&&window.BWMorph){G.mode='morph';document.body.classList.add('morph');window.BWMorph.start($('spiel'),karte,{ton:toene()});}
 else karte();
}
function karte(){
 G.mode='reise';document.body.classList.add('morph');
 const von=G.kap,A=ORTE()[von],B=ORTE()[von+1],weiterGeht=von+1<FERTIG,box=$('reise');
 const stempel=()=>{
  if(!box)return;
  box.innerHTML='<div class="pass"><div class="stempel" aria-hidden="true"><b>'+esc(A.ort.toUpperCase())+'</b><span>CHAPTER '+(von+1)+' ✓</span><i>'+esc(A.tier.toUpperCase())+'</i></div>'
   +'<div class="p-text"><small>NEUER STEMPEL IM REISEPASS</small><p lang="en">'+esc(A.satz)+'</p><p class="de">'+esc(A.de)+'</p></div></div>'
   +'<button id="weiter" class="go">'+(weiterGeht?'Weiter: '+esc(B.ort)+' →':'Zum Ergebnis →')+'</button>';
  box.hidden=false;$('weiter').onclick=weiter;try{$('weiter').focus();}catch(e){}
 };
 reise=window.BWReise.start($('spiel'),von,von+1,stempel);
}
function weiter(){
 if(G.mode!=='reise')return;
 if(reise){reise.stop();reise=null;}
 if($('reise'))$('reise').hidden=true;
 if(G.kap+1<FERTIG)kapitel(G.kap+1);else finish(true);
}
function finish(won){
 if(G.mode==='over')return;
 G.mode='over';document.body.classList.remove('morph','pausiert');
 const m=M();if(m&&won)m.stop();
 const alt=saved.best[G.part]||0,rekord=G.score>alt;if(rekord){saved.best[G.part]=G.score;save();}
 const o=$('over');if(!o)return;
 const missed=[...G.missed.values()],k=KAPITEL[G.kap],st=G.stats;
 const zeilen=[];
 if(st.pinguin)zeilen.push('Pinguin: '+st.pinguin.k+'/'+window.BWPinguin.GOAL+' Tore · Serie '+st.pinguin.best+' · Sprünge '+st.pinguin.jumps+' · Fische '+st.pinguin.extra);
 if(st.orca)zeilen.push('Orca: '+st.orca.k+'/'+window.BWOrca.GOAL+' Schwärme · Serie '+st.orca.best+' · Sprünge '+st.orca.jumps+' · Krill '+st.orca.extra);
 o.innerHTML='<h1 tabindex="-1">'+(won?'Etappe geschafft!':(k.id==='pinguin'?'Bauchlandung!':'Der Orca braucht eine Pause.'))+'</h1>'
  +'<p class="lead">'+(won?'Weiter geht die Reise nach China – zum Panda (folgt).':'Kapitel '+(G.kap+1)+' ('+esc(k.titel)+') ist noch nicht geschafft.')+'</p>'
  +'<p class="result">'+G.score+' Punkte'+(rekord&&G.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
  +zeilen.map(z=>'<p class="muted">'+esc(z)+'</p>').join('')
  +'<div class="actions"><button id="again" class="go">'+(won?'Nochmal spielen':'Kapitel '+(G.kap+1)+' nochmal')+'</button><button id="toMenu">Zum Menü</button></div>'
  +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')+'</ul>':'<p class="muted">Kein einziger Fehler – stark!</p>');
 zeige('over');
 const nochmal=won?G.startKap:G.kap;
 $('again').onclick=()=>{G.startKap=nochmal;start(G.part);};$('toMenu').onclick=showMenu;
 try{o.querySelector('h1').focus();}catch(e){}
}

/* ---------------- Oberflaeche ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;}
function stand(){
 if(!$('floe'))return;const s=S(),O=s.O;
 $('floe').textContent=s.ding+' '+Math.min(O.k+1,s.GOAL)+'/'+s.GOAL;$('points').textContent=O.score+' P';
 $('hearts').textContent='♥'.repeat(Math.max(0,O.hearts))+'♡'.repeat(Math.max(0,s.HEARTS-O.hearts));
}
function musikKnopf(){
 const m=M(),an=!!(m&&m.an);
 for(const id of ['musik','musikMenu']){const b=$(id);if(!b)continue;b.hidden=!(m&&m.verfuegbar);b.setAttribute('aria-pressed',String(an));
  b.textContent=id==='musik'?(an?'♫':'♫̸'):'♫ Musik: '+(an?'an':'aus');b.setAttribute('aria-label','Musik '+(an?'aus':'an')+'schalten');}
}
function musikUmschalten(){const m=M();if(!m)return;m.setze(!m.an);if(m.an&&(G.mode==='play'))m.spiele(KAPITEL[G.kap].id);musikKnopf();}
function showMenu(){
 G.mode='menu';for(const k of KAPITEL)if(k.spiel)k.spiel().O.mode='aus';
 zeige('menu');document.body.classList.remove('morph','pausiert');
 const m=M();if(m)m.stop();
 if(reise){reise.stop();reise=null;}if($('reise'))$('reise').hidden=true;
 const kb=$('kapitel');
 if(kb){kb.innerHTML=KAPITEL.map((k,n)=>'<li><button data-kap="'+n+'"'+(k.spiel?'':' disabled')+' aria-pressed="'+(n===G.startKap)+'"><b>'+(n+1)+' · '+esc(k.name)+'</b><span>'+esc(k.titel||ORTE()[n].ort)+' · '+esc(k.status||ORTE()[n].ort)+'</span></button></li>').join('');
  kb.querySelectorAll('[data-kap]').forEach(b=>b.onclick=()=>{if(b.disabled)return;G.startKap=+b.dataset.kap;showMenu();});}
 const pass=$('pass');
 if(pass)pass.innerHTML=ORTE().map(o=>{const da=saved.stempel.includes(o.id);return '<li class="'+(da?'da':'')+'"><b>'+esc(o.ort)+'</b><span lang="en">'+(da?esc(o.satz):'– noch kein Stempel –')+'</span></li>';}).join('');
 const box=$('levels');if(box){
  const knopf=(id,name,n,all)=>'<button data-part="'+id+'"'+(all?' class="all"':'')+'><span class="l-name">'+esc(name)+'</span><span class="l-info">'+n+' Wörter'+(saved.best[id]?' · Bestwert: '+saved.best[id]+' P':'')+'</span></button>';
  box.innerHTML=D.parts.map(p=>knopf(p.id,p.name,p.words.length)).join('')+knopf('all','Ganze Unit 2',D.parts.reduce((a,p)=>a+p.words.length,0),true);
  box.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>start(b.dataset.part));
 }
 musikKnopf();
}
function pause(an){
 if(G.mode!=='play'&&G.mode!=='pause')return;
 G.mode=an?'pause':'play';S().pause(an);const m=M();if(m)m.pause(an);
 const b=$('pause');if(b){b.textContent=an?'▶':'II';b.setAttribute('aria-label',an?'Weiter':'Pause');}
 document.body.classList.toggle('pausiert',an);
}

/* ---------------- Schleife ---------------- */
let laeuft=false,zuletzt=0;
function schleife(jetzt){
 const dt=zuletzt?(jetzt-zuletzt)/1000:0;zuletzt=jetzt;
 if(G.mode==='menu'||G.mode==='over'){laeuft=false;return;}
 if(G.mode==='play'||G.mode==='pause'){
  const s=S(),k=G.keys,minus=k.has('ArrowUp')||k.has('ArrowLeft')||k.has('w')||k.has('a'),plus=k.has('ArrowDown')||k.has('ArrowRight')||k.has('s')||k.has('d');
  if(G.mode==='play'&&(minus||plus)&&s.taste)s.taste(plus-minus,Math.min(dt,0.05));
  s.update(dt);if(G.mode==='play'||G.mode==='pause')s.zeichne($('spiel'));stand();
 }
 requestAnimationFrame(schleife);
}

/* ---------------- Eingabe ---------------- */
const cv=$('spiel');
if(cv){
 let aktiv=null;
 /* Orca: der Finger zieht direkt. Pinguin: wischen oder tippen wechselt die Spur. */
 let x0=0;
 cv.addEventListener('pointerdown',e=>{if(G.mode!=='play')return;aktiv=e.pointerId;x0=e.clientX;try{cv.setPointerCapture(e.pointerId);}catch(_){}if(S().zeiger)S().zeiger(cv,e.clientX,e.clientY);e.preventDefault();});
 cv.addEventListener('pointermove',e=>{if(G.mode!=='play'||!S().zeiger)return;if(e.pointerType==='mouse'||aktiv===e.pointerId)S().zeiger(cv,e.clientX,e.clientY);});
 cv.addEventListener('pointerup',e=>{if(aktiv!==e.pointerId)return;aktiv=null;if(G.mode==='play'&&S().wisch)S().wisch(cv,x0,e.clientX);});
 cv.addEventListener('pointercancel',e=>{if(aktiv===e.pointerId)aktiv=null;});
 document.addEventListener('keydown',e=>{
  if(e.key==='m'||e.key==='M'){if(G.mode!=='menu'){musikUmschalten();e.preventDefault();}return;}
  if(G.mode!=='play'&&G.mode!=='pause')return;
  if(e.key==='p'||e.key==='P'||e.key==='Escape'){pause(G.mode==='play');e.preventDefault();return;}
  if(G.mode!=='play')return;
  const i={'1':0,'2':1,'3':2}[e.key];if(i!=null){S().lane(i);e.preventDefault();return;}
  if(S().schritt&&['ArrowLeft','ArrowRight','a','d'].includes(e.key)){S().schritt(e.key==='ArrowLeft'||e.key==='a'?-1:1);e.preventDefault();return;}
  if(S().taste&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){G.keys.add(e.key);e.preventDefault();}
  if(e.key===' '&&S().sprung){S().sprung();e.preventDefault();}
 });
 document.addEventListener('keyup',e=>G.keys.delete(e.key));
 addEventListener('blur',()=>{G.keys.clear();pause(true);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
 $('quit').onclick=showMenu;
 $('pause').onclick=()=>pause(G.mode==='play');
 if($('musik'))$('musik').onclick=musikUmschalten;
 if($('musikMenu'))$('musikMenu').onclick=musikUmschalten;
}
if(window.BWMusik)window.BWMusik._wieder=()=>{if(G.mode==='play')window.BWMusik.spiele(KAPITEL[G.kap].id);};
showMenu();
window.BWGame={G,start,finish,showMenu,weiter,pause,musikUmschalten,saved:()=>saved,KAPITEL,FERTIG};
})();
