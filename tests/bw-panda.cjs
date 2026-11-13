/* Black & White (Year 6, Unit 2). Teil 3: Kapitel 3 "Panda Roll".
   Der Panda rollt auf drei Waldwegen; quer steht je Vokabel eine Bambuswand
   mit genau einem richtigen und zwei verschiedenen falschen Toren. Vor der
   Wand gilt eine Mindestlesezeit (frei von Steinen). Richtiges Tor: Durchbruch
   und Punkte; falsches: Abprall, ein Herz, dann durch das offene richtige Tor.
   Baby-Pandas schliessen sich der Kette an (Multiplikator) und purzeln bei
   einem Fehler weg, kommen aber wieder. Nach jeder vierten Vokabel eine
   Lichtung: zurueckziehen und loslassen, im richtigen Buendel ein Baby
   (Bonus). Nach 16 Vokabeln: Karte, Stempel, Ergebnis. Ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/frage.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/pandafigur.js','year6/bw/panda.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,P=w.BWPandaRoll,O=P.O,D=w.CLIMB_DATA;
const tick=(n=1,dt=1/30)=>{for(let i=0;i<n;i++)P.update(dt);};
const richtigLane=()=>{const o=(O.gate?O.gate.opts:O.lichtung.opts).find(o=>o.w===O.q);return o.lane;};
const falschLane=()=>{const o=(O.gate?O.gate.opts:O.lichtung.opts).find(o=>o.w!==O.q);return o.lane;};
/* eine Vokabel spielen: auf der Strecke den Weg waehlen, auf der Lichtung werfen */
const vokabel=(wahl,max=40)=>{const k=O.k;let t=0;
 while(O.k===k&&O.mode==='play'&&t<max){
  const L=O.lichtung;
  if(L&&L.phase==='zielen')P.lane(wahl());
  else if(!L&&O.gate&&O.gate.offen<0&&!O.gate.erledigt){O.items=O.items.filter(i=>i.typ!=='stein');P.lane(wahl());}
  tick();t+=1/30;}
 return t;};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)P.update(0.05);};
const fake={getBoundingClientRect:()=>({left:0,top:0,width:360,height:640})};

ok(P.laneY(0)<P.laneY(1)&&P.laneY(1)<P.laneY(2),'drei Wege hintereinander');
for(let i=0;i<3;i++)ok(P.laneOf(P.laneY(i))===i,'Weg '+i+' wird erkannt');
ok(w.PandaFigur&&typeof w.PandaFigur.panda==='function'&&w.PandaFigur.SCHLEIFEN.length>=4,'Panda-Figur mit Schleifen');
ok(P.istLichtung(3)&&P.istLichtung(7)&&!P.istLichtung(4)&&[...Array(16).keys()].filter(P.istLichtung).length===4,'vier Lichtungen');

/* jeder Abschnitt fehlerfrei bis zum Nest */
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-kap="2"]').click();d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===2&&O.mode==='play'&&/^Wand 1\/16/.test(d.getElementById('floe').textContent),id+': Panda-Kapitel laeuft');
 ok(/Lichtung/.test(d.getElementById('hint').textContent),id+': Hinweis');
 for(let k=0;k<P.GOAL;k++){
  const opts=O.gate?O.gate.opts:O.lichtung.opts;
  ok(!!O.gate!==!!O.lichtung&&!!O.lichtung===P.istLichtung(k),id+': Wand oder Lichtung an der richtigen Stelle');
  ok(opts.length===3&&opts.filter(o=>o.w===O.q).length===1,id+': genau ein richtiges Wort');
  ok(new Set(opts.map(o=>o.lane)).size===3&&new Set(opts.map(o=>o.w.en)).size===3&&new Set(opts.map(o=>o.w.de)).size===3,id+': drei Wege, drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  if(O.gate){ok((O.gate.x-O.x)/P.grundTempo()>=P.MINREAD,id+': Mindestlesezeit');
   ok(!O.items.some(i=>i.typ==='stein'&&i.x>O.gate.x-P.ruheStrecke()),id+': vor der Wand keine Steine');}
  const s0=O.score,h0=O.hearts,b0=O.babys,lich=!!O.lichtung;vokabel(richtigLane);
  ok(O.score>s0&&O.hearts===h0,id+': richtige Antwort bringt Punkte');
  if(lich)ok(O.babys===b0+1,id+': auf der Lichtung ein Baby gerettet');
 }
 ruhe();
 ok(O.gerettet===4&&O.babys>=4,id+': vier Babys von den Lichtungen');
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': am Nest die Reise');
 const A=w.BWReise.ORTE[2];ok(d.getElementById('reise').textContent.includes(A.satz)&&/Zum Ergebnis/.test(d.getElementById('reise').textContent),id+': Stempel China, dann Ergebnis');
 d.getElementById('weiter').click();
 const t=d.getElementById('over').textContent;
 ok(B.G.mode==='over'&&/Etappe geschafft/.test(t)&&/Panda: 16\/16/.test(t)&&/Tanzania/.test(t)&&/Zebra/.test(t),id+': Ergebnis, weiter zum Zebra (folgt)');
 d.getElementById('toMenu').click();
}
ok(B.saved().stempel.includes('panda'),'Stempel fuer den Panda');
ok(B.saved().best.all>0&&/Bestwert/.test(d.querySelector('[data-part="all"]').textContent),'Bestwert im Menue');

/* falsches Tor: Abprall, Herz, offenes richtiges Tor, Baby purzelt weg */
d.querySelector('[data-kap="2"]').click();d.querySelector('[data-part="y6u2-partb"]').click();
{O.babys=1;O.kette=[{schleife:'#FF6FA3'}];const q=O.q,r=richtigLane();let offen=false,abprall=false,minB=9,maxV=0;const k=O.k;
 while(O.k===k&&O.mode==='play'){O.items=O.items.filter(i=>i.typ!=='stein'&&!(i.typ==='baby'&&O.gate&&!O.gate.ergebnis));if(O.gate&&O.gate.offen<0&&!O.gate.ergebnis)P.lane(falschLane());if(O.gate&&O.gate.offen>=0)offen=true;if(O.abprall>0)abprall=true;minB=Math.min(minB,O.babys);maxV=Math.max(maxV,O.verloren);tick();}
 ok(abprall&&offen&&O.hearts===P.HEARTS-1&&O.streak===0&&O.missed.has(q.en),'falsches Tor: Abprall, ein Herz, das richtige Tor oeffnet');
 ok(O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');
 ok(minB===0&&maxV===1,'ein Baby purzelt weg');
 let wieder=false;for(let t=0;t<30*30&&!wieder;t++){wieder=O.items.some(i=>i.typ==='baby');tick();}ok(wieder,'das Baby wartet weiter vorn');}
/* Baby einsammeln: Multiplikator steigt */
{O.hearts=3;const m0=P.mult();O.items.push({typ:'baby',x:O.x+5,lane:Math.round(O.lane),schleife:'#5FD3C6'});tick(3);ok(O.babys>=1&&P.mult()>m0&&O.kette.length===O.babys,'Baby in der Kette, mehr Punkte');}
/* Bambus und Stein */
{const s0=O.score;O.items.push({typ:'bambus',x:O.x+3,lane:Math.round(O.lane)});tick(3);ok(O.bambus>0&&O.score>s0,'Bambus gibt Punkte');
 O.streak=4;const h0=O.hearts;O.items.push({typ:'stein',x:O.x+3,lane:Math.round(O.lane)});tick(3);ok(O.stun>0&&O.streak===0&&O.hearts===h0,'Stein bremst, kostet kein Herz');
 O.items.push({typ:'bambus',x:O.x+3,lane:(Math.round(O.lane)+1)%3});const b=O.bambus;tick(3);ok(O.bambus===b,'Bambus auf anderem Weg bleibt liegen');}
/* Lichtung: Ziehen und Loslassen */
{let n=0;while(!O.lichtung&&O.mode==='play'&&n++<20)vokabel(richtigLane);
 let t=0;while(O.lichtung.phase!=='zielen'&&t<20){tick();t+=1/30;}
 ok(O.lichtung.phase==='zielen'&&P.speed()===0,'auf der Lichtung steht der Panda');
 const py=P.laneY(1),r=richtigLane();
 P.tipp(fake,P.PX,py);P.zeiger(fake,P.PX-8,py+2);P.wisch();ok(O.lichtung.phase==='zielen','zu wenig gezogen: nichts passiert');
 /* nach unten ziehen = nach hinten zielen */
 P.tipp(fake,P.PX,py);P.zeiger(fake,P.PX-90,py+70);ok(P.zielVonZug(O.lichtung.zug).lane===0,'nach unten gezogen: Ziel hinterer Weg');
 P.zeiger(fake,P.PX-90,py-70);ok(P.zielVonZug(O.lichtung.zug).lane===2,'nach oben gezogen: Ziel vorderer Weg');
 const ry=P.laneY(1)-(P.laneY(r)-P.laneY(1));P.zeiger(fake,P.PX-100,py-(P.laneY(r)-py)*0.55);
 const ziel=P.zielVonZug(O.lichtung.zug).lane;P.wisch();ok(O.lichtung.phase==='flug'&&O.lichtung.wahl===ziel,'loslassen: der Panda schiesst los');
 const b0=O.babys,h0=O.hearts,k=O.k;t=0;while(O.k===k&&t<10){tick();t+=1/30;}
 ok(ziel===r?O.babys===b0+1:(O.hearts===h0-1&&O.babys===b0),'Treffer: Baby; daneben: ein Herz, kein Baby');}
/* daneben auf der Lichtung */
{O.hearts=3;let n=0;while(!O.lichtung&&O.mode==='play'&&n++<20)vokabel(richtigLane);
 const b0=O.babys,g0=O.gerettet;vokabel(falschLane);ok(O.hearts===2&&O.babys===b0&&O.gerettet===g0,'Lichtung daneben: ein Herz, das Baby bleibt Bonus');}
/* verlieren */
{let n=0;while(O.mode==='play'&&n++<10)vokabel(falschLane);}
ruhe();ok(B.G.mode==='over'&&/Nickerchen/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Herzen ist Schluss');
d.getElementById('again').click();ok(B.G.kap===2&&O.mode==='play'&&O.hearts===P.HEARTS&&O.k===0,'Kapitel 3 nochmal');
/* Steuerung */
d.querySelector('#choices [data-lane="2"]').click();ok(O.ziel===2,'Knopf waehlt den Weg');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.ziel===0,'Zifferntaste waehlt den Weg');
P.zeiger(fake,200,P.laneY(1)+5);ok(O.ziel===1,'Finger waehlt den Weg');
P.taste(1,0.3);ok(O.ziel===2,'Pfeiltaste: ein Weg weiter');
B.pause(true);const x0=O.x;P.update(0.5);ok(O.x===x0,'Pause haelt an');B.pause(false);P.update(0.05);ok(O.x>x0,'und weiter');
/* Musik */
const Mu=w.BWMusik.STUECKE.panda;ok(Mu&&Mu.takte.length>=32&&Mu.takte[0].chord==='F'&&Mu.max>Mu.bpm,'eigenes Panda-Stueck in F-Dur');
ok(Mu.takte.every(t=>t.melody.every(n=>n.n>=55&&n.n<=96&&n.step+n.len<=16)),'Panda-Noten im Takt');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');ok(['pandafigur.js','panda.js'].every(f=>html.includes(f+'?v=')),'Dateien eingebunden');
console.log('bw-panda: '+checks+' Pruefungen bestanden');
