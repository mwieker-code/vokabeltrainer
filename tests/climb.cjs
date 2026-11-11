/* Summit Climb (Year 6, Unit 2): Daten auf dem Stand der Vokabelseite, jede
   Frage hat genau eine richtige und zwei verschiedene falsche Antworten,
   richtige Griffe fuehren ueber Lager (mit Bonusfrage) zum Gipfel, falsche
   kosten Vorsprung und kommen wieder, der Nebel kostet Herzen. Dazu Items,
   Steinschlag, Eisgriffe, Adler, Serie und Figurenwahl - die Lernfaecher
   bleiben unberuehrt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/climb');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const {baue}=require('../tools/climb-daten.cjs');
ok(fs.readFileSync(path.join(dir,'data.js'),'utf8')===baue(),'data.js ist auf dem Stand von year6/index.html (sonst: node tools/climb-daten.cjs)');
function setup(){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/climb/',virtualConsole:new VirtualConsole()});
 for(const f of ['year6/climb/data.js','year6/figuren.js','year6/climb/musik.js','year6/climb/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
 return dom;
}
const dom=setup(),w=dom.window,d=w.document,C=w.ClimbGame,G=C.G,D=w.CLIMB_DATA;
const right=()=>G.holds.findIndex(h=>h.w===G.q);
const wrong=()=>G.holds.findIndex(h=>h.w!==G.q&&h.state==='ok');
const clear=()=>{G.rock=null;G.eagle=null;G.bonus=null;for(const h of G.holds)h.icy=false;};
/* bis die naechste Frage bereit ist; Bonusfragen im Lager richtig beantworten */
const settle=(answerCamp=true)=>{let n=0;while(G.mode!=='play'&&G.mode!=='over'&&n++<800){
  if(G.mode==='camp'&&G.challenge&&!G.challenge.done&&answerCamp)C.answerChallenge(G.challenge.options.indexOf(G.challenge.w));
  C.update(0.05);}};

ok(D.parts.length===5&&D.parts.every(p=>p.words.length>=3),'fuenf Abschnitte mit genug Woertern');
ok(d.querySelectorAll('#levels [data-part]').length===6,'Auswahl: fuenf Abschnitte und die ganze Unit');
ok(d.querySelectorAll('#riders [data-rider]').length===3&&d.querySelector('[data-rider="penguin"]').disabled,'drei Figuren, Pinguin anfangs gesperrt');

/* Jeder Abschnitt: fehlerfrei bis zum Gipfel */
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(!d.getElementById('stage').hidden&&G.mode==='play'&&G.hearts===C.HEARTS,'Spiel laeuft: '+id);
 let camps=0,guard=0;
 while(G.mode!=='over'&&guard++<60){
  if(G.mode==='summit'){C.update(0.05);continue;}
  clear();G.seil=false;
  const en=G.holds.map(h=>h.w.en),de=G.holds.map(h=>h.w.de);
  ok(G.holds.length===3&&new Set(en).size===3&&new Set(de).size===3,'drei verschiedene Griffe');
  ok(G.holds.filter(h=>h.w===G.q).length===1&&d.getElementById('prompt').textContent===G.q.de,'genau ein richtiger Griff zur Frage');
  ok(d.querySelectorAll('#choices [data-choice]').length===3,'Antworten auch als Knoepfe');
  C.choose(right());let n=0;while(G.mode==='jump'&&n++<100)C.update(0.05);
  if(G.mode==='camp'){camps++;
   ok(!d.getElementById('challenge').hidden&&G.challenge.options.length===3&&new Set(G.challenge.options.map(o=>o.de)).size===3,'Lager: Bonusfrage mit drei Antworten');
   ok(d.getElementById('challenge').textContent.includes(G.challenge.w.en),'Bonusfrage fragt das englische Wort');}
  if(G.mode==='summit'){let m=0;while(G.mode==='summit'&&m++<400)C.update(0.05);}
  else settle();
 }
 ok(camps===C.GOAL/C.CAMP-1,'drei Lager unterwegs: '+id);
 ok(G.mode==='over'&&G.won&&G.k===C.GOAL,'Gipfel erreicht: '+id);
 ok(/Gipfel erreicht/.test(d.querySelector('#over h1').textContent)&&/Kein einziger Fehlgriff/.test(d.getElementById('over').textContent),'Abschluss ohne Fehlerliste');
 d.getElementById('toMenu').click();
 ok(/Gipfel/.test(d.querySelector('[data-part="'+id+'"]').textContent),'Gipfel in der Auswahl vermerkt: '+id);
}
ok(!d.querySelector('[data-rider="penguin"]').disabled,'nach drei Gipfeln ist der Pinguin frei');
d.querySelector('[data-rider="silky"]').click();ok(C.rider()==='silky'&&JSON.parse(w.localStorage.getItem('vt6:climb:v1')).rider==='silky','Silky gewaehlt und gespeichert');

/* Falscher Griff, Serie und Punkte */
d.querySelector('[data-part="y6u2-partb"]').click();clear();
const q=G.q,fog=G.fog,bad=wrong();
C.choose(bad);
ok(G.holds[bad].state==='broken'&&G.k===0&&G.fog>fog,'falscher Griff broeckelt, der Nebel holt auf');
ok(G.missed.has(q.id)&&G.queue.slice(0,4).includes(q),'Wort gemerkt und kommt bald wieder');
settle();C.choose(bad);ok(G.mode==='play','gebroeckelter Griff laesst sich nicht noch einmal waehlen');
let score=G.score;C.choose(right());settle();ok(G.k===1&&G.score===score,'zweiter Versuch: Hoehe ja, Punkte nein');
for(let i=0;i<3;i++){clear();C.choose(right());settle();}
ok(G.streak===3&&C.multiplier()>1.25,'Serie hebt den Multiplikator');
score=G.score;const m=C.multiplier();clear();C.choose(right());const diff=G.score-score;settle();
ok(diff===Math.round(100*m/10)*10,'Punkte wachsen mit der Serie');

/* Items: nur wer rechtzeitig richtig antwortet, bekommt sie */
const item=(type)=>{clear();G.bonus={type,t:C.BONUS_TIME,x:40,y:G.climber.y+80,got:false};};
item('kristall');score=G.score;const mk=C.multiplier();C.choose(right());ok(G.score-score===Math.round(100*mk/10)*10+50,'Kristall: +50');settle();
item('karabiner');C.choose(right());settle();ok(G.karabiner,'Karabiner aufgenommen');
clear();const f0=G.fog;C.choose(wrong());ok(!G.karabiner&&G.fog===f0,'Karabiner faengt den Fehler ab');settle();C.choose(right());settle();
item('pickel');const f1=G.fog;C.choose(right());ok(G.fog<f1-C.P,'Eispickel draengt den Nebel zurueck');settle();
item('seil');C.choose(right());settle();ok(G.seil,'Seil aufgenommen');
clear();const k0=G.k;C.choose(right());settle();ok(G.k===k0+2||G.mode==='over'||G.k===C.GOAL,'Seil: naechster Zug doppelt hoch');
item('edelweiss');let t=0;while(G.bonus&&t++<200)C.update(0.05);ok(!G.bonus,'Item verschwindet nach Ablauf der Zeit');

/* Steinschlag sperrt einen Griff */
S2:{
 d.getElementById('quit').click();d.querySelector('[data-part="y6u2-partc"]').click();clear();
 const lane=right();G.rock={lane,phase:'warn',t:0,stones:[]};
 let n=0;while(G.rock.phase==='warn'&&n++<100)C.update(0.05);
 ok(G.rock.phase==='fall','nach der Warnung fallen Steine');
 const k1=G.k,fg=G.fog;C.choose(lane);
 ok(G.k===k1&&G.fog>fg&&G.mode==='play','gesperrter Griff: Steinschlag statt Sprung');
 n=0;while(G.rock&&n++<200)C.update(0.05);
 C.choose(lane);ok(G.mode==='jump','nach dem Steinschlag ist der Griff wieder frei');settle();
}
/* Eisgriff: nach dem Landen rutscht man ab */
clear();G.holds[right()].icy=true;const fi=G.fog;C.choose(right());let n=0;while(G.mode==='jump'&&n++<100)C.update(0.05);
ok(G.fog>=fi+0.3*C.P-1e-6,'Eisgriff laesst abrutschen');settle();
/* Adler: holt einen falschen Griff, Bonus fuer die richtige Antwort */
clear();const wl=wrong();G.eagle={hold:G.holds[wl],t:0,side:1,done:false};
n=0;while(G.holds[wl].state==='ok'&&n++<100)C.update(0.05);
ok(G.holds[wl].state==='eagle','Adler nimmt einen falschen Griff');
ok(G.holds.find(h=>h.w===G.q).state==='ok','der richtige Griff bleibt');
score=G.score;const mult=C.multiplier();C.choose(right());ok(G.score-score===Math.round(100*mult/10)*10+150&&G.eagles===1,'Adler-Bonus +150');settle();

/* Nebel: kostet ein Herz, beim letzten ist Schluss */
clear();const h0=G.hearts;n=0;while(G.mode==='play'&&n++<4000)C.update(0.05);
ok(G.mode==='hurt'&&G.hearts===h0-1,'Nebel kostet ein Herz');
ok(n*0.05>5,'aber nicht in den ersten Sekunden ('+(n*0.05).toFixed(1)+' s)');
n=0;while(G.mode==='hurt'&&n++<100)C.update(0.05);ok(G.mode==='play','es geht weiter');
for(let i=0;i<10&&G.mode!=='over';i++){n=0;while(G.mode!=='over'&&n++<4000){clear();C.update(0.05);}}
ok(G.mode==='over'&&!G.won&&/Nebel/.test(d.querySelector('#over h1').textContent),'ohne Herzen ist Schluss');

/* Lager: Bonusfrage richtig = Herz, falsch = nichts */
d.querySelector('#toMenu').click();d.querySelector('[data-part="y6u2-partb"]').click();
G.hearts=2;for(let i=0;i<5;i++){clear();C.choose(right());let j=0;while(G.mode==='jump'&&j++<100)C.update(0.05);if(G.mode!=='camp')settle();}
ok(G.mode==='camp','Lager nach 250 m');
C.answerChallenge(G.challenge.options.indexOf(G.challenge.w));ok(G.hearts===3,'richtige Bonusfrage: Extra-Herz');
settle();
for(let i=0;i<5;i++){clear();C.choose(right());let j=0;while(G.mode==='jump'&&j++<100)C.update(0.05);if(G.mode!=='camp')settle();}
const h2=G.hearts,wi=G.challenge.options.findIndex(o=>o!==G.challenge.w);C.answerChallenge(wi);
ok(G.hearts===h2&&/Leider nicht/.test(d.getElementById('challenge').textContent),'falsche Bonusfrage: nur die Loesung');
settle(false);ok(G.mode==='play'&&d.getElementById('challenge').hidden,'nach dem Lager geht es weiter');

/* Pause haelt alles an */
C.pause(true);const fz=G.fog;C.update(1);ok(G.fog===fz,'Pause haelt den Nebel an');C.pause(false);

/* Speicher: nur Bestwerte und Figur, Lernfaecher unberuehrt */
const saved=JSON.parse(w.localStorage.getItem('vt6:climb:v1'));
ok(saved.best.all>0&&saved.summits['y6u2-partb']===1,'Bestwert und Gipfel gespeichert');
ok(w.localStorage.getItem('vt6:progress')===null,'Lernfaecher unberuehrt');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
ok(/data-eigenes-design/.test(html)&&!/data-nacht/.test(html),'eigenes Design ohne Hell und Nacht');
ok(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="climb/"'),'Kachel in Year 6');

/* Musik: Noten lesbar, Geraeusche verschieden */
const M=w.ClimbMusik;
ok(M._song.length===4&&M._bars.length===32,'Lied: A B A B, 32 Takte');
for(const part of M._song)for(const bar of part.melody){const tk=bar.split(' ');ok(tk.length===8&&tk.every(x=>x==='_'||x==='-'||M._midi(x)!==null),'Takt lesbar: '+bar);}
ok(M.geraeusche.length===13,'dreizehn Geraeusche');
dom.window.close();
console.log(checks+' climb checks passed');
