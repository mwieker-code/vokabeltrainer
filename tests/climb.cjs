/* Summit Climb (Year 6, Unit 2): Daten auf dem Stand der Vokabelseite, jede
   Frage hat genau eine richtige und zwei verschiedene falsche Antworten,
   richtige Griffe fuehren ueber Lager zum Gipfel, falsche kosten Vorsprung
   und kommen wieder, der Nebel beendet das Spiel - und die Lernfaecher
   bleiben unberuehrt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/climb');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const {baue}=require('../tools/climb-daten.cjs');
ok(fs.readFileSync(path.join(dir,'data.js'),'utf8')===baue(),'data.js ist auf dem Stand von year6/index.html (sonst: node tools/climb-daten.cjs)');
function setup(){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/climb/',virtualConsole:new VirtualConsole()});
 for(const f of ['data.js','game.js'])dom.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 return dom;
}
const dom=setup(),w=dom.window,d=w.document,C=w.ClimbGame,G=C.G,D=w.CLIMB_DATA;
const right=()=>G.holds.findIndex(h=>h.w===G.q);
const land=()=>{let n=0;while(G.mode!=='play'&&G.mode!=='over'&&n++<400)C.update(0.05);};

ok(D.parts.length===5&&D.parts.every(p=>p.words.length>=3),'fuenf Abschnitte mit genug Woertern');
ok(d.querySelectorAll('#levels [data-part]').length===6,'Auswahl: fuenf Abschnitte und die ganze Unit');

/* Jeder Abschnitt: fehlerfrei bis zum Gipfel */
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(!d.getElementById('stage').hidden&&G.mode==='play','Spiel laeuft: '+id);
 let camps=0;
 for(let k=0;k<C.GOAL;k++){
  ok(G.mode==='play','Frage '+(k+1));
  const en=G.holds.map(h=>h.w.en),de=G.holds.map(h=>h.w.de);
  ok(G.holds.length===3&&new Set(en).size===3&&new Set(de).size===3,'drei verschiedene Griffe');
  ok(G.holds.filter(h=>h.w===G.q).length===1&&d.getElementById('prompt').textContent===G.q.de,'genau ein richtiger Griff zur Frage');
  ok(d.querySelectorAll('#choices [data-choice]').length===3,'Antworten auch als Knoepfe');
  C.choose(right());
  let n=0;while(G.mode==='jump'&&n++<100)C.update(0.05);
  if(G.mode==='camp'){camps++;land();}
  if(G.mode==='summit')land();
 }
 ok(camps===C.GOAL/C.CAMP-1,'drei Lager unterwegs: '+id);
 ok(G.mode==='over'&&G.won&&G.k===C.GOAL,'Gipfel erreicht: '+id);
 ok(/Gipfel erreicht/.test(d.querySelector('#over h1').textContent)&&/Kein einziger Fehlgriff/.test(d.getElementById('over').textContent),'Abschluss ohne Fehlerliste');
 d.getElementById('toMenu').click();
 ok(/Gipfel/.test(d.querySelector('[data-part="'+id+'"]').textContent),'Gipfel in der Auswahl vermerkt: '+id);
}

/* Falscher Griff */
d.querySelector('[data-part="y6u2-partb"]').click();
const q=G.q,fog=G.fog,wrong=(right()+1)%3;
C.choose(wrong);
ok(G.holds[wrong].state==='broken'&&G.k===0,'falscher Griff broeckelt, keine Hoehe');
ok(G.fog>fog,'der Nebel holt auf');ok(G.missed.has(q.id),'Wort fuer die Fehlerliste gemerkt');
ok(G.queue.slice(0,4).includes(q),'Wort kommt bald wieder');
land();C.choose(wrong);ok(G.mode==='play','gebroeckelter Griff laesst sich nicht noch einmal waehlen');
const score=G.score;C.choose(right());land();
ok(G.k===1&&G.score===score,'zweiter Versuch: Hoehe ja, Punkte nein');

/* Pause haelt den Nebel an; ohne Antwort holt er einen ein */
C.pause(true);const still=G.fog;C.update(1);ok(G.fog===still,'Pause haelt den Nebel an');C.pause(false);
let t=0;while(G.mode==='play'&&t++<2000)C.update(0.05);
ok(G.mode==='over'&&!G.won,'der Nebel beendet das Spiel');
ok(t*0.05>8,'aber nicht in den ersten Sekunden ('+(t*0.05).toFixed(1)+' s)');
ok(/Nebel/.test(d.querySelector('#over h1').textContent)&&d.querySelector('.missed li').textContent.includes(q.en),'Fehlerliste zeigt das Wort');

/* Speicher: nur Bestwerte, Lernfaecher unberuehrt */
const saved=JSON.parse(w.localStorage.getItem('vt6:climb:v1'));
ok(saved.best.all>0&&saved.summits['y6u2-partb']===1,'Bestwert und Gipfel gespeichert');
ok(w.localStorage.getItem('vt6:progress')===null,'Lernfaecher unberuehrt');
ok(/data-eigenes-design/.test(fs.readFileSync(path.join(dir,'index.html'),'utf8'))&&!/nacht-marke/.test(fs.readFileSync(path.join(dir,'index.html'),'utf8')),'eigenes Design ohne Hell und Nacht');
ok(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="climb/"'),'Kachel in Year 6');
dom.window.close();
console.log(checks+' climb checks passed');
