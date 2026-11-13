/* Black & White (Year 6, Unit 2). Teil 4: Kapitel 4 "Zebra Dash" und das
   Ende der Reise. Das Zebra galoppiert auf drei Pfaden; je Vokabel drei
   Akazien-Tore mit genau einem richtigen und zwei verschiedenen falschen
   Woertern, davor freie Strecke (Mindestlesezeit). Falsches Tor: der Loewe
   kommt naeher (ein Herz); vier richtige in Folge: wieder mehr Abstand.
   Wischen und Tippen wechseln den Pfad. Nach 16 Toren: Stempel ohne
   Reiseweg, dann das Ergebnis der ganzen Reise. Die deutsche Vokabel
   steht als Karte im Spielbild (frage.js). Ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/frage.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/pandafigur.js','year6/bw/panda.js','year6/bw/zebrafigur.js','year6/bw/zebra.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,Z=w.BWZebra,O=Z.O,D=w.CLIMB_DATA;
const tick=(n=1,dt=1/30)=>{for(let i=0;i<n;i++)Z.update(dt);};
const richtig=()=>O.gate.opts.find(o=>o.w===O.q).lane,falsch=()=>O.gate.opts.find(o=>o.w!==O.q).lane;
const tor=(wahl,max=40)=>{const k=O.k;let t=0;while(O.k===k&&O.mode==='play'&&t<max){O.items=O.items.filter(i=>i.typ==='gras');if(O.gate&&!O.gate.ergebnis)Z.lane(wahl());tick();t+=1/30;}return t;};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)Z.update(0.05);};
const fake={getBoundingClientRect:()=>({left:0,top:0,width:360,height:640})};

ok(w.ZebraFigur&&typeof w.ZebraFigur.hinten==='function'&&typeof w.ZebraFigur.seite==='function','Zebra-Figuren');
ok(w.BWFrage&&typeof w.BWFrage.karte==='function','Vokabel-Karte im Spielbild');
ok(Z.xAus(0,Z.Z0)<Z.xAus(1,Z.Z0)&&Z.xAus(1,Z.Z0)<Z.xAus(2,Z.Z0)&&Z.yAus(40)<Z.yAus(Z.Z0)&&Z.yAus(200)>Z.HZ(),'drei Pfade in die Tiefe');

for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-kap="3"]').click();d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===3&&O.mode==='play'&&/^Tor 1\/16/.test(d.getElementById('floe').textContent),id+': Zebra-Kapitel laeuft');
 ok(/Wischen/.test(d.getElementById('hint').textContent),id+': Hinweis');
 for(let k=0;k<Z.GOAL;k++){
  const g=O.gate;
  ok(g.opts.length===3&&g.opts.filter(o=>o.w===O.q).length===1,id+': genau ein richtiges Tor');
  ok(new Set(g.opts.map(o=>o.lane)).size===3&&new Set(g.opts.map(o=>o.w.en)).size===3&&new Set(g.opts.map(o=>o.w.de)).size===3,id+': drei Pfade, drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage (auch fuer Screenreader) und Knoepfe');
  ok((g.d-O.dist-Z.Z0)/Z.grundTempo()>=Z.MINREAD,id+': Mindestlesezeit');
  ok(!O.items.some(i=>i.typ!=='gras'&&i.d>g.d-Z.ruheStrecke()),id+': vor den Toren keine Hindernisse');
  const s0=O.score,h0=O.hearts;tor(richtig);
  ok(O.score>s0&&O.hearts===h0,id+': richtiges Tor bringt Punkte');
 }
 ruhe();
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': an der Herde der Stempel');
 const A=w.BWReise.ORTE[3];ok(d.getElementById('reise').textContent.includes(A.satz)&&/Zum Ergebnis/.test(d.getElementById('reise').textContent),id+': Stempel Tanzania, dann Ergebnis');
 ok(!d.body.classList.contains('morph'),id+': letzte Station ohne Reiseweg');
 d.getElementById('weiter').click();
 const t=d.getElementById('over').textContent;
 ok(B.G.mode==='over'&&/Etappe geschafft/.test(t)&&/Zebra: 16\/16/.test(t)&&/Alle vier Stempel/.test(t),id+': Ergebnis der ganzen Reise');
 d.getElementById('toMenu').click();
}
ok(B.saved().stempel.includes('zebra'),'Stempel fuer das Zebra');
ok(B.saved().best.all>0&&/Bestwert/.test(d.querySelector('[data-part="all"]').textContent),'Bestwert im Menue');

/* falsches Tor: der Loewe holt auf; vier richtige in Folge: wieder Abstand */
d.querySelector('[data-kap="3"]').click();d.querySelector('[data-part="y6u2-partb"]').click();
{const q=O.q;tor(falsch);ok(O.hearts===Z.HEARTS-1&&O.streak===0&&O.missed.has(q.en),'falsches Tor: der Loewe kommt naeher');
 ok(O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');
 for(let i=0;i<4;i++)tor(richtig);ok(O.hearts===Z.HEARTS&&O.streak===4,'vier richtige in Folge: wieder mehr Abstand');
 for(let i=0;i<4;i++)tor(richtig);ok(O.hearts===Z.HEARTS,'nie mehr als volle Herzen');}
/* Gras und Hindernisse */
{const s0=O.score;O.items.push({typ:'gras',d:O.dist+Z.Z0+0.2,lane:Math.round(O.lane)});tick(2);ok(O.gras>0&&O.score>s0,'Gras gibt Punkte');
 O.streak=3;const h0=O.hearts,v0=Z.speed();O.items.push({typ:'stein',d:O.dist+Z.Z0+0.2,lane:Math.round(O.lane)});
 const sicher=O.gate.d;O.gate.d=O.dist+500;tick(2);ok(O.stolpern>0&&O.streak===0&&O.hearts===h0&&Z.speed()<v0,'Stein: stolpern, langsamer, kein Herz');
 O.items.push({typ:'huegel',d:O.dist+Z.Z0+0.2,lane:(Math.round(O.lane)+1)%3});const st=O.stolpern;O.stolpern=0;tick(2);ok(O.stolpern===0,'Hindernis auf anderem Pfad: nichts');O.gate.d=sicher;}
/* Steuerung */
{Z.lane(1);tick(20);Z.tipp(fake,330,300);ok(O.ziel===2,'Tippen rechts: rechter Pfad');Z.tipp(fake,20,300);ok(O.ziel===0,'Tippen links: linker Pfad');
 Z.lane(1);tick(20);Z.tipp(fake,180,300);Z.wisch(fake,180,260);ok(O.ziel===2,'nach rechts wischen');
 Z.tipp(fake,180,300);Z.wisch(fake,180,100);ok(O.ziel===0||O.ziel===1,'nach links wischen');
 Z.lane(1);Z.tipp(fake,180,300);Z.wisch(fake,180,190);ok(O.ziel===1,'kleine Bewegung ist kein Wischen');
 d.querySelector('#choices [data-lane="2"]').click();ok(O.ziel===2,'Knopf waehlt den Pfad');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.ziel===0,'Zifferntaste');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight'}));ok(O.ziel===1,'Pfeiltaste: ein Pfad weiter');
 B.pause(true);const x0=O.dist;Z.update(0.5);ok(O.dist===x0,'Pause haelt an');B.pause(false);Z.update(0.05);ok(O.dist>x0,'und weiter');}
/* verlieren */
{O.hearts=1;tor(falsch);ruhe();ok(B.G.mode==='over'&&/Löwe war schneller/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Abstand ist Schluss');
 d.getElementById('again').click();ok(B.G.kap===3&&O.mode==='play'&&O.hearts===Z.HEARTS&&O.k===0,'Kapitel 4 nochmal');}
/* Musik und Seite */
const Mu=w.BWMusik.STUECKE.zebra;ok(Mu&&Mu.takte.length>=32&&Mu.takte[0].chord==='D'&&Mu.max>Mu.bpm,'eigenes Zebra-Stueck in D-Dur');
ok(Mu.takte.every(t=>t.melody.every(n=>n.n>=55&&n.n<=96&&n.step+n.len<=16)&&w.BWMusik.STUECKE.zebra.akkorde[t.chord]),'Zebra-Noten im Takt');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');ok(['frage.js','zebrafigur.js','zebra.js'].every(f=>html.includes(f+'?v=')),'Dateien eingebunden');
ok(/position:absolute!important/.test(fs.readFileSync(path.join(dir,'style.css'),'utf8')),'Frage-Kasten nur noch fuer Screenreader');
console.log('bw-zebra: '+checks+' Pruefungen bestanden');
