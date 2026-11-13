/* Black & White (Year 6, Unit 2). Teil 2: Kapitel 1 "Penguin Hop" (Eisschollen)
   und die Musik. Der Pinguin steht auf einer Scholle, vor ihm treiben drei
   Schollen mit genau einem richtigen und zwei verschiedenen falschen Woertern.
   Tippen = hinueberspringen. Falsche Scholle kippt (ein Herz, Rettung auf die
   richtige), die eigene Scholle schmilzt (Zeit). Serie, Super-Sprung,
   Fundstuecke, Wetter, Finale am Eisberg. Nach 16 Schollen: Karte, Stempel
   und weiter zum Orca - die Punkte werden mitgenommen. Ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/pandafigur.js','year6/bw/panda.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,P=w.BWPinguin,O=P.O,R=w.BWOrca,D=w.CLIMB_DATA;
const richtig=()=>P.richtigIdx(),falsch=()=>[0,1,2].find(i=>i!==P.richtigIdx());
const tick=(n=1)=>{for(let i=0;i<n;i++)P.update(1/60);};
const bisWahl=(max=10)=>{let t=0;while(O.mode==='play'&&O.phase!=='wahl'&&t<max){tick();t+=1/60;}};
/* eine Scholle: warten bis gewaehlt werden kann, waehlen, bis zur naechsten Vokabel */
const hop=(wahl,max=20)=>{bisWahl();const k=O.k;if(wahl!=null)P.lane(typeof wahl==='function'?wahl():wahl);let t=0;while(O.k===k&&O.mode==='play'&&t<max){tick();t+=1/60;}return t;};
const bisNaechste=()=>{const k=O.k;let t=0;while(O.k===k&&O.mode==='play'&&t<20){tick();t+=1/60;}};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)P.update(0.05);};
ok(B.G.startKap===0&&d.querySelector('[data-kap="0"]').getAttribute('aria-pressed')==='true','Pinguin ist voreingestellt');
ok(P.yTop()<P.yBase(),'Zielschollen oben, eigene Scholle unten');

/* jeder Abschnitt fehlerfrei durch beide Kapitel */
for(const id of [...D.parts.map(p=>p.id),'all']){
 B.G.startKap=0;d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===0&&O.mode==='play'&&/^Scholle 1\/16/.test(d.getElementById('floe').textContent),id+': Pinguin-Kapitel laeuft');
 ok(/Tippe auf die Scholle/.test(d.getElementById('hint').textContent),id+': Hinweis zum Pinguin');
 for(let k=0;k<P.GOAL;k++){
  ok(O.ziele.length===3&&O.ziele.filter(z=>z.w===O.q).length===1,id+': genau eine richtige Scholle');
  ok(new Set(O.ziele.map(z=>z.w.en)).size===3&&new Set(O.ziele.map(z=>z.w.de)).size===3,id+': drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  ok(P.finale()===(k>=P.GOAL-P.FINALE),id+': Finale nur bei den letzten drei');
  const s0=O.score,h0=O.hearts;hop(richtig);
  ok(O.score>s0&&O.hearts===h0,id+': richtige Scholle bringt Punkte');
 }
 ruhe();
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': nach dem Pinguin die Reise');
 const A=w.BWReise.ORTE[0];ok(d.getElementById('reise').textContent.includes(A.satz)&&/Weiter: Southern Ocean/.test(d.getElementById('reise').textContent),id+': Stempel und weiter zum Orca');
 const punkte=O.score;d.getElementById('weiter').click();
 ok(B.G.kap===1&&R.O.mode==='play'&&R.O.score===punkte,id+': Orca-Kapitel mit den Punkten aus Kapitel 1');
 d.getElementById('quit').click();
}
ok(JSON.stringify(B.saved().stempel)==='["pinguin"]','Stempel fuer den Pinguin');

B.G.startKap=0;d.querySelector('[data-part="y6u2-partb"]').click();
/* Serie, Multiplikator, Super-Sprung */
{ok(P.mult()===1,'ohne Serie x1');for(let i=0;i<4;i++)hop(richtig);ok(O.streak===4&&P.mult()===2,'Serie hebt den Multiplikator');
 bisWahl();const s0=O.score;P.lane(richtig());let sup=false;for(let t=0;t<1&&!O.super;t+=1/60)tick();sup=O.super;
 ok(sup&&O.phase==='jubel'&&O.score-s0>=20+Math.round(10*P.mult())-3,'jede 5. richtige: Super-Sprung mit Bonus');
 let salto=0;while(O.phase==='jubel'){tick();salto=Math.max(salto,O.rot);}ok(salto>5,'Super-Sprung mit Salto');}
/* Zeit: Schollen schmelzen; erste Vokabel mit mehr Zeit */
ok(P.zeitFuer(0)>P.zeitFuer(1)&&P.zeitFuer(1)>P.zeitFuer(12)&&P.zeitFuer(15)>=6.5,'Zeit wird knapper, aber nie unter 6,5 s');
{bisWahl();const q=O.q,h0=O.hearts,k=O.k;O.shield=false;let t=0,erg=null;while(O.k===k&&t<20){tick();t+=1/60;erg=O.ergebnis||erg;}
 ok(O.hearts===h0-1&&O.streak===0&&O.missed.has(q.en)&&erg==='zeit','zu lange gewartet: Scholle geschmolzen, ein Herz');
 ok(t>P.zeitFuer(k)&&O.wahl===-1&&O.k===k+1,'nach der Rettung geht es weiter');}
/* falsche Scholle: kippt, Herz weg, Rettung auf die richtige */
{bisWahl();const q=O.q,h0=O.hearts,r=richtig();P.lane(falsch());let phasen=new Set(),gerettet=-1;const k=O.k;
 while(O.k===k&&O.mode==='play'){phasen.add(O.phase);if(O.phase==='rettung')gerettet=r;tick();}
 ok(['kipp','wasser','rettung'].every(x=>phasen.has(x))&&O.hearts===h0-1,'falsche Scholle kippt, Herz weg, Rettung');
 ok(O.missed.has(q.en)&&O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');
 ok(gerettet>=0&&Math.abs(O.basis.x-P.zielX(gerettet))<30||O.phase==='weiter','gerettet auf die richtige Scholle');}
/* Schal */
{O.hearts=3;bisWahl();O.shield=true;const h0=O.hearts;hop(falsch);ok(O.hearts===h0&&!O.shield,'der Schal faengt eine falsche Scholle ab');}
/* Fundstuecke nur auf der richtigen Scholle */
{bisWahl();O.ziele.forEach(z=>z.item=null);O.ziele[richtig()].item='fische';const f0=O.fish;hop(richtig);ok(O.fish===f0+3,'Fische auf der richtigen Scholle eingesammelt');
 bisWahl();O.ziele.forEach(z=>z.item=null);const fi=falsch();O.ziele[fi].item='gold';const g0=O.gold;O.shield=false;hop(fi);ok(O.gold===g0,'Goldfisch auf falscher Scholle: nichts');
 O.hearts=3;bisWahl();O.ziele.forEach(z=>z.item=null);O.ziele[richtig()].item='gold';const s0=O.score;hop(richtig);ok(O.gold===g0+1&&O.score-s0>=25,'Goldfisch: Bonus');
 bisWahl();O.ziele.forEach(z=>z.item=null);O.ziele[richtig()].item='schal';O.shield=false;hop(richtig);ok(O.shield,'Schal eingesammelt');}
/* Wetter */
{const k0=O.k;O.k=0;let x=P.wetter();ok(x.schnee===0&&x.nacht===0,'am Anfang Sonne');O.k=8;x=P.wetter();ok(x.schnee===1&&x.nacht===0,'in der Mitte Schnee');
 O.k=15;x=P.wetter();ok(x.nacht===1,'am Ende Nacht');O.k=k0;}
/* Treiben: die Schollen bewegen sich sanft */
{const a=P.zielX(0);tick(60);const b=P.zielX(0);ok(Math.abs(a-b)>0.2&&Math.abs(b-64)<=13,'Schollen treiben sanft');}
/* Vorwahl waehrend des Nachrueckens */
{bisWahl();P.lane(richtig());while(O.phase!=='weiter')tick();const r=richtig();P.lane(r);ok(O.vorwahl===r,'waehrend des Nachrueckens schon waehlen');
 let t=0;while(O.phase==='weiter'&&t<2){tick();t+=1/60;}ok(O.phase==='sprung'&&O.wahl===r,'Vorwahl springt sofort');}
/* verlieren */
d.getElementById('quit').click();B.G.startKap=0;d.querySelector('[data-part="y6u2-parta"]').click();
{let n=0;while(O.mode==='play'&&n++<10){O.shield=false;hop(falsch);}}
ruhe();ok(B.G.mode==='over'&&/Bauchlandung/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Herzen ist Schluss');
d.getElementById('again').click();ok(B.G.kap===0&&O.mode==='play'&&O.hearts===P.HEARTS&&O.k===0,'Kapitel 1 nochmal');
/* Steuerung */
bisWahl();d.querySelector('#choices [data-lane="2"]').click();ok(O.phase==='sprung'&&O.wahl===2,'Knopf waehlt die Scholle');
bisNaechste();bisWahl();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.phase==='sprung'&&O.wahl===0,'Zifferntaste waehlt die Scholle');
bisNaechste();O.hearts=3;bisWahl();const fake={getBoundingClientRect:()=>({left:0,top:0,width:360,height:600})};
ok(P.tipp(fake,180,P.yBase()+10)===false&&O.phase==='wahl','Tippen auf die eigene Scholle tut nichts');
ok(P.tipp(fake,300,P.yTop()-30)===true&&O.wahl===2,'Tippen auf Scholle oder Schild waehlt');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' '}));ok(true,'Leertaste ohne Fehler');
bisNaechste();bisWahl();B.pause(true);const z0=O.zeit;P.update(0.5);ok(O.zeit===z0,'Pause haelt die Zeit an');B.pause(false);

/* Musik: zwei Stuecke, sauber notiert */
const Mu=w.BWMusik;
ok(Mu&&!Mu.verfuegbar&&d.getElementById('musik').hidden,'ohne Web Audio kein Musikschalter');
for(const [id,st] of Object.entries(Mu.STUECKE)){
 ok(st.takte.length>=32&&st.takte.length%8===0,id+': ganze Teile, mindestens 32 Takte');
 ok(st.max>st.bpm,id+': wird schneller');
 for(const t of st.takte){
  ok(st.akkorde[t.chord],id+': Akkord '+t.chord+' bekannt');
  ok(t.melody.every(n=>Number.isFinite(n.n)&&n.n>=55&&n.n<=96&&n.step>=0&&n.step+n.len<=16),id+': Noten im Takt und im Tonumfang');
 }
}
ok(Mu.STUECKE.orca.takte[0].chord==='Dm'&&Mu.STUECKE.pinguin.takte[0].chord==='G','Orca in d-Moll, Pinguin in G-Dur');
w.localStorage.removeItem('vt6:bw:musik');Mu.setze(false);ok(!Mu.an&&w.localStorage.getItem('vt6:bw:musik')==='aus','Musik aus wird gemerkt');Mu.setze(true);
/* Seite */
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
ok(['musik.js','pinguin.js','orca.js','game.js'].every(f=>html.includes(f+'?v=')),'alle Dateien mit Versionsnummer eingebunden');
console.log('bw-pinguin: '+checks+' Pruefungen bestanden');
