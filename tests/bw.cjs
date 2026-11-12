/* Black & White (Year 6, Unit 2), Kapitel 1 - Pinguin: Jede Frage hat genau
   eine richtige und zwei verschiedene falsche Schollen. Richtige Schollen
   fuehren nach zwoelf Spruengen zur Verwandlung, falsche versinken und
   kosten ein Herz, ebenso das Schmelzen der eigenen Scholle. Das Spiel ist
   noch nicht in der App verlinkt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/morph.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,G=B.G,D=w.CLIMB_DATA;
const right=()=>G.floes.findIndex(f=>f.w===G.q),wrong=()=>G.floes.findIndex(f=>f.w!==G.q&&f.state==='ok');
const settle=()=>{let n=0;while(G.mode!=='play'&&G.mode!=='over'&&n++<400)B.update(0.05);};

ok(d.querySelectorAll('#levels [data-part]').length===D.parts.length+1,'Auswahl: alle Abschnitte und die ganze Unit');
ok(typeof w.BWMorph.start==='function','Verwandlung geladen');
/* jeder Abschnitt fehlerfrei bis zur Verwandlung */
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(G.mode==='play'&&!d.getElementById('stage').hidden,id+': Spiel laeuft');
 for(let n=0;n<B.GOAL;n++){
  ok(G.floes.length===3&&G.floes.filter(f=>f.w===G.q).length===1,id+': genau eine richtige Scholle');
  ok(new Set(G.floes.map(f=>f.w.en)).size===3&&new Set(G.floes.map(f=>f.w.de)).size===3,id+': drei verschiedene Schollen');
  ok(d.getElementById('prompt').textContent===G.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  ok(B.choose(right())===true&&G.mode==='hop',id+': richtige Scholle - Sprung');
  ok(B.choose(0)===false,id+': im Sprung keine zweite Wahl');
  settle();
 }
 ok(G.mode==='over'&&G.k===B.GOAL&&G.hearts===B.HEARTS,id+': nach zwoelf Schollen am Ziel');
 ok(/Kapitel 1 geschafft/.test(d.getElementById('over').textContent)&&G.score>=B.GOAL*10,id+': Ergebnis mit Punkten');
 d.getElementById('toMenu').click();
}
ok(JSON.parse(w.localStorage.getItem('vt6:bw:v1')).best.all>0&&/Bestwert/.test(d.querySelector('[data-part="all"]').textContent),'Bestwert gespeichert und im Menue');
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
d.getElementById('again').click();ok(G.mode==='play'&&G.hearts===B.HEARTS&&G.k===0,'Nochmal spielen');
/* Tastatur */
const r=right();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:String(r+1)}));ok(G.mode==='hop','Zifferntaste waehlt die Scholle');
/* noch versteckt */
ok(!fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="bw/"'),'noch keine Kachel in Year 6');
ok(/data-eigenes-design/.test(fs.readFileSync(path.join(dir,'index.html'),'utf8')),'eigenes Design');
console.log('bw: '+checks+' Pruefungen bestanden');
