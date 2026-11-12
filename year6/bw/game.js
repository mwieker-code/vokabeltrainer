/* =========================================================================
   BLACK & WHITE - Year 6, Vokabeln aus Unit 2.
   Eine Reise mit vier schwarz-weissen Tieren: Pinguin, Orca, Panda, Zebra.

   Dieser Teil ist der Rahmen: Menue mit Kapiteln und Reisepass, Start,
   Steuerung, Verwandlung (morph.js), Weltkarte mit Reiseroute (reise.js)
   und Ergebnis. Die Kapitel selbst sind eigene Spiele - fertig ist:
     Kapitel 2  Orca Rush (orca.js)
   Kapitel 1 (Pinguin) wird neu gebaut, 3 und 4 folgen.

   Die Lernfaecher der App bleiben unberuehrt; gespeichert werden nur
   Bestwerte und Stempel (vt6:bw:v1).
   ========================================================================= */
(function(){
'use strict';
const D=window.CLIMB_DATA,R=window.BWOrca,$=id=>document.getElementById(id);
const KEY='vt6:bw:v1';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KAPITEL=[
 {id:'pinguin',name:'Pinguin',status:'wird neu gebaut'},
 {id:'orca',name:'Orca',spiel:true},
 {id:'panda',name:'Panda',status:'folgt'},
 {id:'zebra',name:'Zebra',status:'folgt'}
];
let saved={best:{},stempel:[]};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&p.best&&typeof p.best==='object')saved={best:p.best,stempel:Array.isArray(p.stempel)?p.stempel.filter(s=>typeof s==='string'):[]};}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}};
const ORTE=()=>window.BWReise.ORTE;
const toene=()=>{try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}};

const G={mode:'menu',part:null,intro:false,keys:new Set()};
function wortliste(id){return id==='all'?D.parts.flatMap(p=>p.words):(D.parts.find(p=>p.id===id)||D.parts[0]).words;}

/* ---------------- Ablauf ---------------- */
function start(id){
 G.part=id;zeige('stage');
 const cv=$('meer'),zeichnet=cv&&cv.getContext&&typeof requestAnimationFrame==='function'&&cv.getContext('2d');
 /* einmal je Besuch: der Pinguin taucht ab und wird zum Orca */
 if(!G.intro&&zeichnet&&window.BWMorph){
  G.intro=true;G.mode='morph';document.body.classList.add('morph');
  window.BWMorph.start(cv,los,{ton:toene()});
 }else los();
}
function los(){
 document.body.classList.remove('morph');
 G.mode='play';
 R.start({words:wortliste(G.part),onFrage:frage,onEnd:kapitelEnde,H:hoehe()});
 stand();
 if(!laeuft&&typeof requestAnimationFrame==='function'){laeuft=true;zuletzt=0;requestAnimationFrame(schleife);}
}
function hoehe(){const cv=$('meer');if(!cv||!cv.clientWidth)return 560;return cv.clientHeight/cv.clientWidth*360;}
function frage(q,opts){
 if($('prompt'))$('prompt').textContent=q.de;
 const box=$('choices');if(!box)return;
 box.innerHTML=opts.map(o=>'<button data-lane="'+o.lane+'" lang="en" style="--farbe:'+R.LANE_COL[o.lane]+'"><i aria-hidden="true">'+R.LANE_ZEICHEN[o.lane]+'</i>'+esc(o.w.en)+'</button>').join('');
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>R.lane(+b.dataset.lane));
}
let reise=null;
function kapitelEnde(won){
 if(!won)return finish(false);
 if(!saved.stempel.includes('orca'))saved.stempel.push('orca');save();
 G.mode='reise';document.body.classList.add('morph');
 const A=ORTE()[1],box=$('reise');
 const stempel=()=>{
  if(!box)return;
  box.innerHTML='<div class="pass"><div class="stempel" aria-hidden="true"><b>'+esc(A.ort.toUpperCase())+'</b><span>CHAPTER 2 ✓</span><i>'+esc(A.tier.toUpperCase())+'</i></div>'
   +'<div class="p-text"><small>NEUER STEMPEL IM REISEPASS</small><p lang="en">'+esc(A.satz)+'</p><p class="de">'+esc(A.de)+'</p></div></div>'
   +'<button id="weiter" class="go">Zum Ergebnis →</button>';
  box.hidden=false;$('weiter').onclick=weiter;try{$('weiter').focus();}catch(e){}
 };
 reise=window.BWReise.start($('meer'),1,2,stempel);
}
function weiter(){
 if(G.mode!=='reise')return;
 if(reise){reise.stop();reise=null;}
 if($('reise'))$('reise').hidden=true;
 finish(true);
}
function finish(won){
 if(G.mode==='over')return;
 G.mode='over';document.body.classList.remove('morph');
 const O=R.O,alt=saved.best[G.part]||0,rekord=O.score>alt;if(rekord){saved.best[G.part]=O.score;save();}
 const o=$('over');if(!o)return;
 const missed=[...O.missed.values()];
 o.innerHTML='<h1 tabindex="-1">'+(won?'Küste erreicht!':'Der Orca braucht eine Pause.')+'</h1>'
  +'<p class="lead">'+(won?'Der Orca hat alle '+R.GOAL+' Fischschwärme geschafft. Weiter geht die Reise nach China – zum Panda (folgt).':O.k+' von '+R.GOAL+' Schwärmen geschafft.')+'</p>'
  +'<p class="result">'+O.score+' Punkte'+(rekord&&O.score?' · <strong>neuer Bestwert!</strong>':'')+'</p>'
  +'<p class="muted">Längste Serie: '+O.best+' · Sprünge: '+O.jumps+' · Nordlichter: '+O.rings+' · Krill: '+O.krill+'</p>'
  +'<div class="actions"><button id="again" class="go">Nochmal schwimmen</button><button id="toMenu">Zum Menü</button></div>'
  +(missed.length?'<h2>Diese Wörter solltest du noch üben</h2><ul class="missed">'+missed.map(w=>'<li><span>'+esc(w.de)+'</span><strong lang="en">'+esc(w.en)+'</strong></li>').join('')+'</ul>':'<p class="muted">Kein einziger Fehler – stark!</p>');
 zeige('over');
 $('again').onclick=()=>start(G.part);$('toMenu').onclick=showMenu;
 try{o.querySelector('h1').focus();}catch(e){}
}

/* ---------------- Oberflaeche ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;}
function stand(){
 const O=R.O;if(!$('floe'))return;
 $('floe').textContent='Schwarm '+Math.min(O.k+1,R.GOAL)+'/'+R.GOAL;$('points').textContent=O.score+' P';
 $('hearts').textContent='♥'.repeat(Math.max(0,O.hearts))+'♡'.repeat(Math.max(0,R.HEARTS-O.hearts));
}
function showMenu(){
 G.mode='menu';R.O.mode='aus';zeige('menu');document.body.classList.remove('morph','pausiert');
 if(reise){reise.stop();reise=null;}if($('reise'))$('reise').hidden=true;
 const kb=$('kapitel');
 if(kb)kb.innerHTML=KAPITEL.map((k,n)=>'<li class="'+(k.spiel?'frei':'')+'"><b>'+(n+1)+' · '+esc(k.name)+'</b><span>'+esc(ORTE()[n].ort)+(k.status?' · '+esc(k.status):'')+'</span></li>').join('');
 const pass=$('pass');
 if(pass)pass.innerHTML=ORTE().map(o=>{const da=saved.stempel.includes(o.id);return '<li class="'+(da?'da':'')+'"><b>'+esc(o.ort)+'</b><span lang="en">'+(da?esc(o.satz):'– noch kein Stempel –')+'</span></li>';}).join('');
 const box=$('levels');if(!box)return;
 const knopf=(id,name,n,all)=>'<button data-part="'+id+'"'+(all?' class="all"':'')+'><span class="l-name">'+esc(name)+'</span><span class="l-info">'+n+' Wörter'+(saved.best[id]?' · Bestwert: '+saved.best[id]+' P':'')+'</span></button>';
 box.innerHTML=D.parts.map(p=>knopf(p.id,p.name,p.words.length)).join('')+knopf('all','Ganze Unit 2',D.parts.reduce((a,p)=>a+p.words.length,0),true);
 box.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>start(b.dataset.part));
}
function pause(an){
 if(G.mode!=='play'&&G.mode!=='pause')return;
 G.mode=an?'pause':'play';R.pause(an);
 const b=$('pause');if(b){b.textContent=an?'▶':'II';b.setAttribute('aria-label',an?'Weiter':'Pause');}
 document.body.classList.toggle('pausiert',an);
}

/* ---------------- Schleife ---------------- */
let laeuft=false,zuletzt=0;
function schleife(jetzt){
 const dt=zuletzt?(jetzt-zuletzt)/1000:0;zuletzt=jetzt;
 if(G.mode==='menu'||G.mode==='over'){laeuft=false;return;}
 if(G.mode==='play'||G.mode==='pause'){
  /* gehaltene Pfeiltasten lenken stufenlos */
  const hoch=G.keys.has('ArrowUp')||G.keys.has('w'),runter=G.keys.has('ArrowDown')||G.keys.has('s');
  if(G.mode==='play'&&(hoch||runter))R.steerTo(R.O.ty+(runter-hoch)*330*Math.min(dt,0.05));
  R.update(dt);if(G.mode==='play'||G.mode==='pause')R.zeichne($('meer'));stand();
 }
 requestAnimationFrame(schleife);
}

/* ---------------- Eingabe ---------------- */
const cv=$('meer');
if(cv){
 let aktiv=null;
 cv.addEventListener('pointerdown',e=>{if(G.mode!=='play')return;aktiv=e.pointerId;try{cv.setPointerCapture(e.pointerId);}catch(_){}R.steerTo(R.zeigerY(cv,e.clientY));e.preventDefault();});
 cv.addEventListener('pointermove',e=>{if(G.mode!=='play')return;if(e.pointerType==='mouse'||aktiv===e.pointerId)R.steerTo(R.zeigerY(cv,e.clientY));});
 const los=e=>{if(aktiv===e.pointerId)aktiv=null;};cv.addEventListener('pointerup',los);cv.addEventListener('pointercancel',los);
 document.addEventListener('keydown',e=>{
  if(G.mode!=='play'&&G.mode!=='pause')return;
  if(e.key==='p'||e.key==='P'||e.key==='Escape'){pause(G.mode==='play');e.preventDefault();return;}
  if(G.mode!=='play')return;
  const i={'1':0,'2':1,'3':2}[e.key];if(i!=null){R.lane(i);e.preventDefault();return;}
  if(['ArrowUp','ArrowDown','w','s'].includes(e.key)){G.keys.add(e.key);e.preventDefault();}
  if(e.key===' '){R.steerTo(R.SURF()-70);e.preventDefault();}
 });
 document.addEventListener('keyup',e=>G.keys.delete(e.key));
 addEventListener('blur',()=>{G.keys.clear();pause(true);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
 $('quit').onclick=showMenu;
 $('pause').onclick=()=>pause(G.mode==='play');
}
showMenu();
window.BWGame={G,start,finish,showMenu,weiter,pause,saved:()=>saved,KAPITEL};
})();
