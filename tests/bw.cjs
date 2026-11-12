/* Black & White (Year 6, Unit 2), Kapitel 1 Pinguin und Kapitel 2 Orca: Jede Frage hat genau
   eine richtige und zwei verschiedene falsche Schollen. Richtige Schollen
   fuehren nach zwoelf Spruengen zur Verwandlung, falsche versinken und
   kosten ein Herz, ebenso das Schmelzen der eigenen Scholle. Das Spiel ist
   noch nicht in der App verlinkt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,G=B.G,D=w.CLIMB_DATA;
const right=()=>G.floes.findIndex(f=>f.w===G.q),wrong=()=>G.floes.findIndex(f=>f.w!==G.q&&f.state==='ok');
const settle=()=>{let n=0;while(G.mode!=='play'&&G.mode!=='over'&&n++<400)B.update(0.05);};

ok(d.querySelectorAll('#levels [data-part]').length===D.parts.length+1,'Auswahl: alle Abschnitte und die ganze Unit');
ok(typeof w.BWMorph.start==='function','Verwandlung geladen');
/* jeder Abschnitt fehlerfrei durch beide Kapitel: Pinguin, Reise, Orca, Reise */
ok(d.querySelector('[data-kap="0"]').getAttribute('aria-pressed')==='true'&&d.querySelector('[data-kap="1"]').disabled,'anfangs nur Kapitel 1 frei');
ok(d.querySelectorAll('#pass li.da').length===0,'Reisepass anfangs leer');
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 for(const kap of [0,1]){
  ok(G.mode==='play'&&G.kap===kap&&!d.getElementById('stage').hidden&&G.hearts===B.HEARTS,id+': Kapitel '+(kap+1)+' laeuft');
  const n=B.KAP[kap].optionen;
  for(let k=0;k<B.GOAL;k++){
   ok(G.floes.length===n&&G.floes.filter(f=>f.w===G.q).length===1,id+': genau eine richtige Antwort unter '+n);
   ok(new Set(G.floes.map(f=>f.w.en)).size===n&&new Set(G.floes.map(f=>f.w.de)).size===n,id+': lauter verschiedene Antworten');
   ok(d.getElementById('prompt').textContent===G.q.de&&d.querySelectorAll('#choices button').length===n,id+': Frage und Knoepfe');
   ok(B.choose(right())===true&&G.mode==='hop',id+': richtig - Sprung');
   ok(B.choose(0)===false,id+': im Sprung keine zweite Wahl');
   settle();
  }
  /* Reise mit Stempel */
  const ort=w.BWReise.ORTE[kap],r=d.getElementById('reise');
  ok(G.mode==='reise'&&!r.hidden,id+': nach Kapitel '+(kap+1)+' die Reise');
  ok(r.textContent.includes(ort.satz)&&r.textContent.includes(ort.ort.toUpperCase())&&r.textContent.includes(ort.de),id+': Stempel mit englischem Satz');
  ok(B.choose(0)===false,id+': waehrend der Reise keine Antwort');
  d.getElementById('weiter').click();
 }
 ok(G.mode==='over'&&G.k===B.GOAL,id+': nach beiden Kapiteln am Ziel');
 ok(/Kapitel 2 geschafft/.test(d.getElementById('over').textContent)&&G.score>=B.GOAL*20,id+': Ergebnis mit Punkten aus beiden Kapiteln');
 d.getElementById('toMenu').click();
}
ok(JSON.stringify(B.saved().stempel)==='["pinguin","orca"]'&&d.querySelectorAll('#pass li.da').length===2,'zwei Stempel im Reisepass, keine doppelten');
ok(!d.querySelector('[data-kap="1"]').disabled&&d.querySelector('[data-kap="2"]').disabled,'Kapitel 2 frei, Kapitel 3 folgt');
/* direkt mit Kapitel 2 starten */
d.querySelector('[data-kap="1"]').click();ok(G.startKap===1&&d.querySelector('[data-kap="1"]').getAttribute('aria-pressed')==='true','Kapitel 2 gewaehlt');
d.querySelector('[data-part="y6u2-parta"]').click();B.update(0.01);ok(G.kap===1&&G.floes.length===4&&/^Fisch 1\/12/.test(d.getElementById('floe').textContent),'Start direkt beim Orca');
const o0=B.fischOrt(G.floes[0],0),o1=B.fischOrt(G.floes[0],1);ok(o0.x>0.35&&o0.x<1&&o0.y>0.1&&o0.y<0.9&&(o0.x!==o1.x||o0.y!==o1.y),'Fische schwimmen im Bild');
ok(new Set(G.floes.map(f=>f.platz)).size===4,'jeder Fisch hat seinen Platz');
ok(B.saved().best.all>0,'Bestwert gespeichert');
const fw=wrong();B.choose(fw);ok(G.hearts===B.HEARTS-1&&G.floes[fw].state==='sink'&&G.pops.some(p=>/Kugelfisch/.test(p.text)),'falscher Fisch ist ein Kugelfisch');
G.melt=0.999;B.update(0.2);ok(G.hearts===B.HEARTS-2&&G.pops.some(p=>/Luft/.test(p.text)),'Luft ausgegangen kostet ein Herz');
B.choose(wrong());settle();ok(G.mode==='over'&&/Luft ausgegangen/.test(d.getElementById('over').textContent),'Orca verliert');
d.getElementById('again').click();ok(G.kap===1&&G.mode==='play','nochmal: wieder Kapitel 2');
d.getElementById('quit').click();d.querySelector('[data-kap="0"]').click();
/* falsche Scholle */
d.querySelector('[data-part="y6u2-partb"]').click();
const q=G.q,i=wrong();ok(B.choose(i)===false&&G.hearts===B.HEARTS-1&&G.mode==='play'&&G.q===q,'falsche Scholle kostet ein Herz, die Frage bleibt');
ok(G.floes[i].state==='sink'&&d.querySelector('#choices [data-lane="'+i+'"]').disabled,'falsche Scholle versinkt und ist gesperrt');
ok(B.choose(i)===false&&G.hearts===B.HEARTS-1,'versunkene Scholle zaehlt nicht noch einmal');
ok(G.missed.has(q.en),'Wort wird gemerkt');
B.choose(right());settle();ok(G.k===1&&G.streak===1,'danach geht es weiter');
/* Schmelzen */
const h0=G.hearts;B.update(0.05);G.melt=0.999;B.update(0.1);ok(G.hearts===h0-1&&G.melt<0.1,'geschmolzene Scholle kostet ein Herz');
/* schnelle Antwort bringt mehr */
G.melt=0;G.streak=0;let s0=G.score;G.floes.forEach(f=>f.fish=false);B.choose(right());const schnell=G.score-s0;settle();
G.melt=0.9;G.streak=0;s0=G.score;G.floes.forEach(f=>f.fish=false);B.choose(right());ok(schnell>G.score-s0,'schnelle Antwort bringt mehr Punkte');settle();
/* Fisch */
G.streak=0;G.melt=0.99;s0=G.score;const f0=G.fish;G.floes.forEach(f=>f.fish=f.w===G.q);B.choose(right());ok(G.fish===f0+1&&G.score-s0>=30,'Fisch bringt Bonus');settle();
/* verloren */
B.choose(wrong());ok(G.mode==='lost','ohne Herzen ist Schluss');settle();
ok(G.mode==='over'&&/Platsch/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'Ende mit Uebungsliste');
d.getElementById('again').click();ok(G.mode==='play'&&G.kap===0&&G.hearts===B.HEARTS&&G.k===0,'Nochmal spielen');
/* Tastatur */
const r=right();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:String(r+1)}));ok(G.mode==='hop','Zifferntaste waehlt die Scholle');
/* noch versteckt */
ok(!fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="bw/"'),'noch keine Kachel in Year 6');
ok(/data-eigenes-design/.test(fs.readFileSync(path.join(dir,'index.html'),'utf8')),'eigenes Design');
console.log('bw: '+checks+' Pruefungen bestanden');
