/* Black & White (Year 6, Unit 2). Teil 2: Kapitel 1 "Penguin Run" (Jump & Run)
   und die Musik. Der Pinguin laeuft von selbst, Tippen = springen. An jeder
   Vokabel teilt sich der Weg in drei Bruecken mit genau einem richtigen und
   zwei verschiedenen falschen Woertern; vor der Gabelung laeuft die Zeit
   langsam, ohne Wahl wartet der Pinguin. Die richtige Bruecke traegt, die
   falsche bricht und kostet ein Herz (oder den Schal). Spalten und Robben
   kosten nur die Serie. Nach 16 Bruecken: Karte, Stempel und weiter zum
   Orca - die Punkte werden mitgenommen. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,P=w.BWPinguin,O=P.O,R=w.BWOrca,D=w.CLIMB_DATA;
const richtig=()=>O.gate.opts.find(o=>o.w===O.q),falsch=()=>O.gate.opts.find(o=>o.w!==O.q);
/* Autopilot fuer die Strecke: springt ueber Spalten und Robben */
const lauf=()=>{if(!O.boden)return;const vor=O.x+30,luecke=!O.segs.some(s=>vor>=s.x0&&vor<=s.x1)&&!(O.gate&&vor>O.gate.x-120);
 const robbe=O.items.some(i=>i.typ==='robbe'&&!i.getroffen&&i.x-O.x>20&&i.x-O.x<60);if(luecke||robbe)P.sprung();};
/* bis die Gabelung erledigt ist; die Bruecke wird gewaehlt, sobald die Zeitlupe beginnt */
const zurGabel=(wahl,maxT=60)=>{const k=O.k;let t=0,gewartet=false,zl=1;
 while(O.k===k&&O.mode==='play'&&t<maxT){lauf();const g=O.gate;
  if(g&&g.wahl<0&&O.x>=g.x-P.ABSPRUNG-0.5){gewartet=true;}
  if(g&&g.wahl<0&&O.zeitlupe<0.3){zl=Math.min(zl,O.zeitlupe);if(gewartet||wahl.sofort)P.lane(wahl.lane());}
  P.update(1/60);t+=1/60;}
 return {t,gewartet,zl};};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)P.update(0.05);};
const R0={lane:()=>richtig().lane,sofort:true},F0={lane:()=>falsch().lane,sofort:true};

/* Bruecken in drei Hoehen */
ok(P.brueckeY(0)<P.brueckeY(1)&&P.brueckeY(1)<P.brueckeY(2)&&P.brueckeY(2)===P.GY(),'drei Bruecken: oben, Mitte, unten');
ok(B.G.startKap===0&&d.querySelector('[data-kap="0"]').getAttribute('aria-pressed')==='true','Pinguin ist voreingestellt');

/* jeder Abschnitt fehlerfrei durch beide Kapitel */
for(const id of [...D.parts.map(p=>p.id),'all']){
 B.G.startKap=0;d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===0&&O.mode==='play'&&/^Brücke 1\/16/.test(d.getElementById('floe').textContent),id+': Pinguin-Kapitel laeuft');
 ok(/Tippen = springen/.test(d.getElementById('hint').textContent),id+': Hinweis zum Pinguin');
 for(let k=0;k<P.GOAL;k++){
  const g=O.gate;
  ok(g.opts.length===3&&g.opts.filter(o=>o.w===O.q).length===1,id+': genau eine richtige Bruecke');
  ok(new Set(g.opts.map(o=>o.lane)).size===3&&new Set(g.opts.map(o=>o.w.en)).size===3&&new Set(g.opts.map(o=>o.w.de)).size===3,id+': drei Hoehen, drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  /* zwischen Beginn und Gabelung: Hindernisse nur vorn, vor der Gabelung frei */
  const frei=O.items.filter(i=>(i.typ==='robbe')&&i.x>g.x-P.ABSPRUNG-260);ok(frei.length===0,id+': vor der Gabelung keine Robbe');
  ok(!O.segs.some((s,n)=>n>0&&s.x0>g.x-P.ABSPRUNG-300&&s.x0<g.x),id+': vor der Gabelung keine Spalte');
  const s0=O.score,h0=O.hearts,r=zurGabel(R0);
  ok(O.score>s0&&O.hearts===h0,id+': richtige Bruecke bringt Punkte');
  ok(r.zl<0.3,id+': Zeitlupe vor der Gabelung');
 }
 ruhe();
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': nach dem Pinguin die Reise');
 const A=w.BWReise.ORTE[0];ok(d.getElementById('reise').textContent.includes(A.satz)&&/Weiter: Southern Ocean/.test(d.getElementById('reise').textContent),id+': Stempel und weiter zum Orca');
 const punkte=O.score;d.getElementById('weiter').click();
 ok(B.G.kap===1&&R.O.mode==='play'&&R.O.score===punkte,id+': Orca-Kapitel mit den Punkten aus Kapitel 1');
 d.getElementById('quit').click();
}
ok(JSON.stringify(B.saved().stempel)==='["pinguin"]','Stempel fuer den Pinguin');

/* ohne Wahl wartet der Pinguin - ohne Strafe */
B.G.startKap=0;d.querySelector('[data-part="y6u2-partb"]').click();
{let t=0;while(O.mode==='play'&&t<40&&!(O.gate&&O.x>=O.gate.x-P.ABSPRUNG-0.5)){lauf();P.update(1/60);t+=1/60;}
 const x0=O.x,h0=O.hearts;for(let i=0;i<300;i++)P.update(1/60);ok(Math.abs(O.x-x0)<0.5&&O.hearts===h0&&O.mode==='play','ohne Wahl wartet der Pinguin, ohne Strafe');
 ok(P.sprung()===false,'an der Gabelung kein eigener Sprung');
 P.lane(0);ok(O.gate.wahl===0,'Wahl per Knopf/Taste');P.lane(1);ok(O.gate.wahl===1,'Wahl laesst sich noch aendern');}
/* falsche Bruecke kostet ein Herz, das Wort kommt wieder */
{const q=O.q;P.lane(falsch().lane);let t=0;const k=O.k;while(O.k===k&&t<20){P.update(1/60);t+=1/60;}
 ok(O.hearts===P.HEARTS-1&&O.streak===0&&O.missed.has(q.en),'falsche Bruecke bricht und kostet ein Herz');
 ok(O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');ok(O.boden&&O.mode==='play','danach geht es auf dem Eis weiter');}
/* der Schal haelt */
O.shield=true;{const h0=O.hearts;zurGabel(F0);ok(O.hearts===h0&&!O.shield,'der Schal faengt eine falsche Bruecke ab');}
/* Tempo */
const v0=P.grundTempo();O.streak=8;ok(P.grundTempo()>v0&&P.mult()>1,'Serie macht schneller');
O.turbo=2;ok(P.mult()>=2,'Turbo: doppelte Punkte');O.turbo=0;O.streak=0;
/* Springen */
{let t=0;while(!(O.boden&&O.gate&&O.x<O.gate.x-P.ABSPRUNG-500)&&t<20){lauf();if(O.gate&&O.gate.wahl<0&&O.zeitlupe<0.3)P.lane(richtig().lane);P.update(1/60);t+=1/60;}}
O.items.length=0;O.segs.push({x0:O.x-50,x1:O.x+2000});
ok(P.sprung()===true&&!O.boden&&O.vy<0,'Tippen = Sprung');ok(P.sprung()===true&&O.sprungZahl===2,'in der Luft: zweiter Sprung');ok(P.sprung()===false,'kein dritter Sprung');
{let t=0;while(!O.boden&&t<3){P.update(1/60);t+=1/60;}ok(O.boden&&Math.abs(O.y-P.GY())<1,'Landung auf dem Eis');}
/* Spalte: hineinfallen kostet die Serie, kein Herz */
{O.items.length=0;O.segs=[{x0:O.x-200,x1:O.x+10},{x0:O.x+200,x1:O.x+3000}];O.streak=5;const h0=O.hearts;let t=0;while(O.faellt<=0&&t<3){P.update(1/60);t+=1/60;}
 ok(O.faellt>0,'ohne Sprung in die Spalte');while(O.faellt>0&&t<6){P.update(1/60);t+=1/60;}
 ok(O.streak===0&&O.hearts===h0&&O.boden&&O.x>=O.segs[O.segs.length-1].x0,'Serie weg, kein Herz, weiter hinter der Spalte');}
/* Robbe und Fische */
{O.segs=[{x0:O.x-200,x1:O.x+3000}];O.items=[{typ:'robbe',x:O.x+40,y:P.GY()}];O.streak=3;const h0=O.hearts;let t=0;while(t<0.6){P.update(1/60);t+=1/60;}
 ok(O.stun>0&&O.streak===0&&O.hearts===h0,'Robbe bremst, kostet aber kein Herz');
 O.stun=0;O.items=[{typ:'robbe',x:O.x+60,y:P.GY()}];const s0=O.score;let gesprungen=false;t=0;while(t<1.2){if(!gesprungen&&O.items[0].x-O.x<40){P.sprung();gesprungen=true;}P.update(1/60);t+=1/60;}
 ok(O.stun<=0&&O.score>s0,'ueber die Robbe gesprungen: Bonus');
 const f0=O.fish;O.items=[{typ:'fisch',x:O.x+20,y:O.y-22}];for(let i=0;i<20;i++)P.update(1/60);ok(O.fish===f0+1,'Fisch eingesammelt');
 O.items=[{typ:'turbo',x:O.x+20,y:O.y-22}];for(let i=0;i<20;i++)P.update(1/60);ok(O.turbo===3,'Eis-Turbo eingesammelt');
 O.items=[{typ:'schal',x:O.x+20,y:O.y-22}];for(let i=0;i<20;i++)P.update(1/60);ok(O.shield,'Schal angelegt');}
/* verlieren */
d.getElementById('quit').click();B.G.startKap=0;d.querySelector('[data-part="y6u2-parta"]').click();
{let n=0;while(O.mode==='play'&&n++<10)zurGabel(F0);}
ruhe();ok(B.G.mode==='over'&&/Bauchlandung/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Herzen ist Schluss');
d.getElementById('again').click();ok(B.G.kap===0&&O.mode==='play'&&O.hearts===P.HEARTS&&O.k===0,'Kapitel 1 nochmal');
/* Steuerung */
{let t=0;while(O.mode==='play'&&t<40&&!(O.gate&&O.zeitlupe<0.3)){lauf();P.update(1/60);t+=1/60;}}
d.querySelector('#choices [data-lane="2"]').click();ok(O.gate.wahl===2,'Knopf waehlt die Bruecke');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.gate.wahl===0,'Zifferntaste waehlt die Bruecke');
const fake={getBoundingClientRect:()=>({left:0,top:0,width:360,height:600})};
P.tipp(fake,300,P.brueckeY(1)-34);ok(O.gate.wahl===1,'Tippen auf ein Schild waehlt die Bruecke');
B.pause(true);const x0=O.x;P.update(0.5);ok(O.x===x0,'Pause haelt an');B.pause(false);

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
