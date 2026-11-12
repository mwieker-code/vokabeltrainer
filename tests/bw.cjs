/* Black & White (Year 6, Unit 2). Teil 1: Kapitel 2 "Orca Rush" (Teil 2 und
   Musik stehen in bw-pinguin.cjs). Jeder Schwarm-Satz
   hat genau ein richtiges und zwei verschiedene falsche Woerter in drei
   Tiefen. Wer in der richtigen Tiefe ist, frisst den Schwarm; die falsche
   Tiefe kostet ein Herz (oder die Schutzblase). Luft, Sprung, Krill,
   Quallen, Stroemung und Nordlicht-Ringe; eine Mindestlesezeit gilt immer.
   Nach 16 Schwaermen: Weltkarte, Stempel, Ergebnis. Das Spiel ist noch
   nicht in der App verlinkt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,R=w.BWOrca,O=R.O,D=w.CLIMB_DATA;
const richtig=()=>O.gate.opts.find(o=>o.w===O.q),falsch=()=>O.gate.opts.find(o=>o.w!==O.q);
/* bis zum naechsten Schwarm schwimmen; Luft auffuellen, damit nur die Antwort zaehlt */
const zumTor=(lane,maxT=30)=>{const k=O.k;let t=0;R.lane(lane);while(O.k===k&&O.mode==='play'&&t<maxT){O.air=1;R.update(0.05);t+=0.05;}return t;};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)R.update(0.05);};

ok(d.querySelectorAll('#levels [data-part]').length===D.parts.length+1,'Auswahl: alle Abschnitte und die ganze Unit');
ok(d.querySelectorAll('#kapitel [data-kap]:not([disabled])').length===2&&d.querySelector('[data-kap="2"]').disabled,'Pinguin und Orca spielbar, Panda folgt');
d.querySelector('[data-kap="1"]').click();ok(B.G.startKap===1&&d.querySelector('[data-kap="1"]').getAttribute('aria-pressed')==='true','Orca als Start gewaehlt');
/* drei Tiefen, sauber getrennt */
ok(R.laneY(0)<R.laneY(1)&&R.laneY(1)<R.laneY(2)&&R.laneY(0)>R.SURF(),'drei Tiefen unter der Oberflaeche');
for(let i=0;i<3;i++)ok(R.laneOf(R.laneY(i))===i,'Tiefe '+i+' wird erkannt');
ok(R.laneOf(R.SURF()-20)===-1,'ueber dem Wasser: keine Tiefe');
/* jeder Abschnitt fehlerfrei bis zur Kueste */
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===1&&O.mode==='play'&&!d.getElementById('stage').hidden&&/^Schwarm 1\/16/.test(d.getElementById('floe').textContent),id+': Orca-Kapitel laeuft');
 for(let k=0;k<R.GOAL;k++){
  const g=O.gate;
  ok(g.opts.length===3&&g.opts.filter(o=>o.w===O.q).length===1,id+': genau ein richtiger Schwarm');
  ok(new Set(g.opts.map(o=>o.lane)).size===3&&new Set(g.opts.map(o=>o.w.en)).size===3&&new Set(g.opts.map(o=>o.w.de)).size===3,id+': drei Tiefen, drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  ok(g.x/R.speed()>=R.MINREAD-0.01,id+': Mindestlesezeit');
  const s0=O.score,t=zumTor(richtig().lane);
  ok(O.score>s0&&O.hearts===R.HEARTS,id+': richtiger Schwarm bringt Punkte');
 }
 ruhe();
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': an der Kueste die Reise');
 const A=w.BWReise.ORTE[1];ok(d.getElementById('reise').textContent.includes(A.satz)&&d.getElementById('reise').textContent.includes(A.de),id+': Stempel mit englischem Satz');
 d.getElementById('weiter').click();
 ok(B.G.mode==='over'&&/Etappe geschafft/.test(d.getElementById('over').textContent)&&O.hearts===R.HEARTS&&O.k===R.GOAL&&/Orca: 16\/16/.test(d.getElementById('over').textContent),id+': Ergebnis');
 d.getElementById('toMenu').click();
}
ok(JSON.stringify(B.saved().stempel)==='["orca"]'&&d.querySelectorAll('#pass li.da').length===1,'ein Stempel, nicht doppelt');
ok(B.saved().best.all>0&&/Bestwert/.test(d.querySelector('[data-part="all"]').textContent),'Bestwert im Menue');

/* Fehler, Schild, Tempo */
d.querySelector('[data-part="y6u2-partb"]').click();
const q=O.q;zumTor(falsch().lane);ok(O.hearts===R.HEARTS-1&&O.streak===0&&O.missed.has(q.en),'falscher Schwarm kostet ein Herz');
ok(O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');
O.shield=true;zumTor(falsch().lane);ok(O.hearts===R.HEARTS-1&&!O.shield,'die Blase faengt einen Fehler ab');
const v0=R.speed();O.streak=8;ok(R.speed()>v0&&R.mult()>1,'Serie macht schneller und bringt mehr Punkte');
O.turbo=2;ok(R.mult()>=2&&R.gapFor(R.speed())/R.speed()>=R.MINREAD-0.01,'Stroemung: doppelte Punkte, Lesezeit bleibt');
O.turbo=0;O.streak=0;
/* Luft - der naechste Schwarm bleibt dafuer weit weg */
O.gate.x=1e6;O.hearts=R.HEARTS;
R.lane(2);for(let i=0;i<30;i++)R.update(0.05);const a0=O.air;for(let i=0;i<20;i++)R.update(0.05);ok(O.air<a0,'unter Wasser wird die Luft knapp');
O.air=0.0005;const h0=O.hearts;R.update(0.05);ok(O.hearts===h0-1&&O.air>0.3,'ohne Luft ein Herz weniger');
/* an der Oberflaeche atmen (langsam hoch, kein Sprung) */
O.air=0.3;O.y=R.SURF()+10;O.vy=0;O.ty=R.SURF()+4;for(let i=0;i<10;i++)R.update(0.05);ok(O.air>0.6&&!O.airborne,'an der Oberflaeche wird geatmet');
/* Sprung */
O.y=R.SURF()+40;O.vy=-400;R.steerTo(R.SURF()-70);let sprung=false;for(let i=0;i<10&&!sprung;i++){R.update(0.02);sprung=O.airborne;}
ok(sprung&&O.jumps>=1,'schnell nach oben = Sprung');
O.air=0.2;let n=0;while(O.airborne&&n++<200)R.update(0.02);ok(!O.airborne&&O.air===1,'nach dem Sprung volle Luft');
/* Ring, Krill, Qualle, Items */
O.items.length=0;O.airborne=true;O.y=R.SURF()-58;O.vy=-10;O.items.push({typ:'ring',x:0,y:R.SURF()-58});let s0=O.score;R.update(0.01);ok(O.rings===1&&O.score>=s0+30,'Nordlicht im Sprung');
n=0;while(O.airborne&&n++<200)R.update(0.02);
O.items.length=0;O.y=O.ty=R.laneY(1);O.vy=0;O.items.push({typ:'krill',x:0,y:O.y});s0=O.score;R.update(0.01);ok(O.krill>=1&&O.score>s0,'Krill gibt Punkte');
O.streak=4;O.items.push({typ:'qualle',x:0,y:O.y});R.update(0.01);ok(O.stun>0&&O.streak===0&&O.hearts===h0-1,'Qualle betaeubt, kostet aber kein Herz');
const vStun=R.speed();O.stun=0;ok(R.speed()>vStun,'betaeubt ist der Orca langsamer');
O.items.push({typ:'turbo',x:0,y:O.y});R.update(0.01);ok(O.turbo===3,'Stroemung eingesammelt');
O.items.push({typ:'blase',x:0,y:O.y});R.update(0.01);ok(O.shield,'Blase eingesammelt');
O.items.push({typ:'krill',x:0,y:R.laneY(2)});const kr=O.krill;R.update(0.01);ok(O.krill===kr,'Krill in anderer Tiefe wird nicht eingesammelt');
/* zu hoch am Schwarm */
O.shield=false;const h1=O.hearts;O.gate.x=1;O.airborne=true;O.y=R.SURF()-40;O.vy=-50;R.update(0.05);ok(O.hearts===h1-1,'ueber dem Wasser am Schwarm vorbei: Fehler');
/* verlieren */
n=0;while(O.mode==='play'&&n++<20){O.airborne=false;O.y=O.ty=R.laneY(falsch().lane);O.vy=0;O.gate.x=1;R.update(0.05);}
ruhe();ok(B.G.mode==='over'&&/braucht eine Pause/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Herzen ist Schluss, mit Uebungsliste');
d.getElementById('again').click();ok(O.mode==='play'&&O.hearts===R.HEARTS&&O.k===0&&O.score===0,'Nochmal schwimmen');
/* Steuerung */
d.querySelector('#choices [data-lane="2"]').click();ok(O.ty===R.laneY(2),'Knopf steuert die Tiefe');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.ty===R.laneY(0),'Zifferntaste steuert die Tiefe');
R.steerTo(-999);ok(O.ty>=R.SURF()-70,'Ziel nicht ueber den Himmel hinaus');R.steerTo(99999);ok(O.ty<=R.BED(),'Ziel nicht unter den Grund');
B.pause(true);const x0=O.gate.x;R.update(0.5);ok(O.gate.x===x0&&d.body.classList.contains('pausiert'),'Pause haelt an');B.pause(false);R.update(0.05);ok(O.gate.x<x0,'und weiter');
/* noch versteckt */
ok(!fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="bw/"'),'noch keine Kachel in Year 6');
ok(/data-eigenes-design/.test(fs.readFileSync(path.join(dir,'index.html'),'utf8')),'eigenes Design');
console.log('bw: '+checks+' Pruefungen bestanden');
