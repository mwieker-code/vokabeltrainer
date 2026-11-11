/* Sled Run (Year 6, Unit 2): Jedes Tor hat genau eine richtige Spur. Wer
   richtig faehrt, kommt nach zwanzig Toren ins Ziel; ein falsches Tor kostet
   ein Herz und bringt das Wort zurueck, drei falsche beenden die Fahrt.
   Sterne geben Punkte, Felsen kosten nur die Serie. Lernfaecher bleiben
   unberuehrt. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/sled');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/sled/',virtualConsole:new VirtualConsole()});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'year6/figuren.js'),'utf8'));w.eval(fs.readFileSync(path.join(dir,'game.js'),'utf8'));
const S=w.SledGame,G=S.G,D=w.CLIMB_DATA;
const step=()=>S.update(0.02);
/* Faehrt bis zum naechsten Tor; weicht Felsen aus, wenn dodge gesetzt ist. */
function toGate(lane,dodge){
 let n=0;
 while(G.mode==='ride'&&n++<5000){
  if(G.gate.z<12)S.steer(lane);
  else if(dodge){const rocks=G.items.filter(i=>i.type==='rock'&&i.z>0&&i.z<16).map(i=>i.lane);if(rocks.includes(G.lane))S.steer([0,1,2].find(l=>!rocks.includes(l)));}
  step();
 }
 return n*0.02;
}
const settle=()=>{let n=0;while(G.mode==='result'&&n++<500)step();};

ok(d.querySelectorAll('#levels [data-part]').length===6,'Auswahl: fuenf Abschnitte und die ganze Unit');
ok(d.querySelector('[data-rider="penguin"]').disabled&&S.rider()==='kid','Pinguin als Fahrer anfangs gesperrt');
ok(d.querySelectorAll('#riders [data-rider]').length===3,'drei Fahrer zur Wahl');
ok(!d.querySelector('[data-rider="silky"]').disabled&&/Silky/.test(d.querySelector('[data-rider="silky"]').textContent),'Silky sofort waehlbar');
d.querySelector('[data-rider="silky"]').click();
ok(S.rider()==='silky'&&JSON.parse(w.localStorage.getItem('vt6:sled:v1')).rider==='silky','Silky gewaehlt und gespeichert');
d.querySelector('[data-rider="kid"]').click();ok(S.rider()==='kid','zurueck zum Rodelkind');
ok(/noch 3× ins Ziel/.test(d.querySelector('[data-rider="penguin"]').textContent),'Sperre nennt die fehlenden Zieleinlaeufe');
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(!d.getElementById('stage').hidden&&G.mode==='ride'&&G.hearts===S.HEARTS,'Fahrt laeuft: '+id);
 let slowest=99;
 for(let k=0;k<S.GOAL;k++){
  const en=G.options.map(o=>o.en),de=G.options.map(o=>o.de);
  ok(G.options.length===3&&new Set(en).size===3&&new Set(de).size===3,'drei verschiedene Antworten');
  ok(G.options[G.gate.right]===G.q&&d.getElementById('prompt').textContent===G.q.de,'genau eine richtige Spur zur Frage');
  ok([...d.querySelectorAll('#chips [data-lane]')].map(b=>b.textContent).join('|')===en.join('|'),'Antworten als Knoepfe in Spurreihenfolge');
  ok(G.items.every(i=>i.z<G.gate.z-20),'nichts liegt direkt vor dem Tor');
  const t=toGate(G.gate.right,true);slowest=Math.min(slowest,t);
  ok(G.mode==='result'&&G.result.ok,'richtiges Tor erkannt');
  settle();
 }
 ok(slowest>=3.2,'auch spaet bleibt Zeit zum Lesen ('+slowest.toFixed(1)+' s)');
 ok(G.items.every(i=>i.z<G.gate?.z-20||!G.gate),'Gegenstaende liegen vor dem Tor');
 ok(G.mode==='finish'&&G.hearts===S.HEARTS,'nach zwanzig Toren kommt das Ziel');
 let n=0;while((G.mode==='finish'||G.mode==='celebrate')&&n++<4000)step();
 ok(G.mode==='over'&&G.won&&/Im Ziel/.test(d.querySelector('#over h1').textContent),'im Ziel: '+id);
 ok(/Jedes Tor richtig/.test(d.getElementById('over').textContent),'Abschluss ohne Fehlerliste');
 d.getElementById('toMenu').click();
 ok(/im Ziel/.test(d.querySelector('[data-part="'+id+'"]').textContent),'Zieleinlauf in der Auswahl vermerkt');
}

/* Steuerung: Spuren begrenzt, Knoepfe und Tasten */
d.querySelector('[data-part="y6u2-partc"]').click();
S.move(-1);S.move(-1);ok(G.lane===0,'links ist Schluss');S.move(1);S.move(1);S.move(1);ok(G.lane===2,'rechts ist Schluss');
d.querySelector('#chips [data-lane="1"]').click();ok(G.lane===1&&d.querySelector('#chips [data-lane="1"]').getAttribute('aria-pressed')==='true','Knopf waehlt die Spur');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft'}));ok(G.lane===0,'Pfeiltaste lenkt');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'3'}));ok(G.lane===2,'Zifferntaste waehlt die Spur');
S.pause(true);const z=G.gate.z;S.update(1);ok(G.gate.z===z,'Pause haelt die Fahrt an');S.pause(false);

/* Sterne und Felsen */
G.items.length=0;G.items.push({type:'star',lane:1,z:1});S.steer(1);G.x=0;const p0=G.score;step();step();step();
ok(G.score===p0+10&&G.stars===1,'Stern gibt zehn Punkte');
G.items.length=0;G.items.push({type:'rock',lane:1,z:1});G.streak=4;G.score=100;const hearts=G.hearts;step();step();step();
ok(G.streak===0&&G.score===70&&G.hearts===hearts,'Fels kostet Serie und Punkte, aber kein Herz');
G.items.length=0;G.items.push({type:'rock',lane:0,z:1});G.streak=2;step();step();step();ok(G.streak===2,'Fels in anderer Spur trifft nicht');


/* Fahrer freigeschaltet: sechs Zieleinlaeufe oben, gebraucht werden drei */
ok(S.unlocked()&&!d.querySelector('[data-rider="penguin"]').disabled,'Pinguin nach drei Zieleinlaeufen frei');
d.querySelector('[data-rider="penguin"]').click();
ok(S.rider()==='penguin'&&JSON.parse(w.localStorage.getItem('vt6:sled:v1')).rider==='penguin','Pinguin als Fahrer gewaehlt und gespeichert');
ok(d.querySelector('[data-rider="penguin"]').getAttribute('aria-pressed')==='true','Auswahl sichtbar');

/* Tempo, Turbo, Schild, Pinguine */
d.querySelector('[data-part="y6u2-partc"]').click();
const clear=()=>{G.items.length=0;};
const grab=type=>{clear();G.items.push({type,lane:G.lane,z:0.5,seed:0.3});G.x=G.lane-1;step();};
ok(S.multiplier()===1,'Grundwert x1');
clear();toGate(G.gate.right,false);ok(G.score===100,'erstes Tor: 100 Punkte');settle();
for(let i=0;i<5;i++){clear();toGate(G.gate.right,false);settle();}
ok(S.tempoOf(G.streak)>1.2&&G.speed>S.GAP/6.6,'Serie macht schneller');
let before=G.score,m=S.multiplier();clear();toGate(G.gate.right,false);
ok(G.score-before===Math.round(100*m/10)*10&&G.score-before>100,'schneller gibt mehr Punkte');settle();
grab('turbo');ok(G.turbo===S.TURBO_GATES,'Turbo aufgenommen');
before=G.score;m=S.multiplier();clear();toGate(G.gate.right,false);
ok(G.score-before===Math.round(100*m/10)*10&&m>=2,'Turbo verdoppelt die Punkte');
ok(G.turbo===S.TURBO_GATES-1,'Turbo zaehlt die Tore herunter');settle();
ok(S.GAP/G.speed>=S.MIN_READ-1e-9,'auch im Turbo bleibt die Mindestlesezeit ('+(S.GAP/G.speed).toFixed(2)+' s)');
grab('penguin');grab('penguin');grab('penguin');grab('penguin');
ok(G.penguins===4,'Pinguine rutschen mit');
before=G.score;m=S.multiplier();ok(Math.abs(m-S.tempoOf(G.streak)*2*1.4)<1e-9,'jeder Pinguin hebt die Punkte um ein Zehntel');
grab('shield');ok(G.shield,'Schild aufgenommen');
const herzen=G.hearts;clear();toGate((G.gate.right+1)%3,false);
ok(G.hearts===herzen&&!G.shield,'Schild faengt das falsche Tor ab');
ok(G.penguins===2&&G.turbo===0&&G.streak===0,'falsches Tor: halbe Kette weg, Turbo und Serie vorbei');
ok(S.tempoOf(G.streak)===1,'Tempo faellt zurueck');settle();
grab('rock');ok(G.penguins===1,'Fels kostet einen Pinguin');
for(let i=0;i<20;i++)grab('penguin');ok(G.penguins===S.MAX_PENGUINS,'Kette hat eine Hoechstlaenge');


/* Profi-Modus: schneller, weniger Lesezeit, mehr Punkte, eigene Bestwerte */
d.getElementById('toMenu')?.click();S.showMenu();
ok(d.querySelector('[data-modus="normal"]').getAttribute('aria-pressed')==='true','Normal ist voreingestellt');
const normalBest=JSON.parse(w.localStorage.getItem('vt6:sled:v1')).best;
d.querySelector('[data-modus="profi"]').click();
ok(JSON.parse(w.localStorage.getItem('vt6:sled:v1')).modus==='profi'&&d.querySelector('[data-modus="profi"]').getAttribute('aria-pressed')==='true','Profi gewaehlt und gespeichert');
ok(!/Bestwert/.test(d.querySelector('[data-part="y6u2-partb"]').textContent),'Profi hat eigene Bestwerte');
d.querySelector('[data-part="y6u2-parta"]').click();
ok(G.modus==='profi'&&S.modus().min===2.5,'Profi-Fahrt laeuft');
const t0=S.GAP/G.speed;ok(Math.abs(t0-8*0.8)<1e-9,'Profi startet schneller ('+t0.toFixed(1)+' s)');
ok(Math.abs(S.multiplier()-1.5)<1e-9,'Profi gibt anderthalbfache Punkte');
G.items.length=0;toGate(G.gate.right,false);ok(G.score===150,'erstes Tor im Profi: 150 Punkte');settle();
G.streak=30;G.turbo=3;G.k=19;
ok(Math.abs(S.tempoOf(G.streak)-2)<1e-9,'Profi-Tempo bis x2');
ok(Math.abs(S.GAP/S.gateSpeed()-2.5)<1e-9,'Profi: Mindestlesezeit 2,5 s');
G.streak=0;G.turbo=0;
let pf=0;while(G.mode!=='over'&&pf++<40){G.items.length=0;toGate(G.gate?.right??1,false);settle();let n=0;while((G.mode==='finish'||G.mode==='celebrate')&&n++<4000)step();}
const after=JSON.parse(w.localStorage.getItem('vt6:sled:v1'));
ok(after.best['profi:y6u2-parta']>0&&JSON.stringify(after.best).includes('profi:'),'Profi-Bestwert getrennt gespeichert');
ok(/Profi/.test(d.getElementById('over').textContent),'Abschluss nennt den Profi-Bestwert');
d.getElementById('toMenu').click();d.querySelector('[data-modus="normal"]').click();
ok(G.modus==='normal'&&S.modus().min===3.5,'zurueck auf Normal');

/* Zwei Pinguine stehen hintereinander und lassen sich beide holen */
let zweier=0,beide=0;
for(let i=0;i<80;i++){
 S.start('y6u2-partb');G.k=5;G.items.length=0;S._next();
 const pg=G.items.filter(x=>x.type==='penguin').sort((x,y)=>x.z-y.z);
 if(pg.length<2)continue;zweier++;
 ok(pg[0].lane!==pg[1].lane&&pg[1].z-pg[0].z>=20,'zwei Pinguine versetzt hintereinander');
 G.items=pg;G.lane=1;G.x=0;G.penguins=0;G.crew=[];
 S.steer(pg[0].lane);let n=0;while(pg[0].z>0&&n++<500)step();
 S.steer(pg[1].lane);while(pg[1].z>0&&n++<1000)step();
 if(G.penguins===2)beide++;
}
ok(zweier>10&&beide===zweier,'beide Pinguine erreichbar ('+beide+' von '+zweier+')');
/* auch im Profi-Tempo */
d.getElementById('quit').click();S.showMenu();d.querySelector('[data-modus="profi"]').click();
zweier=0;beide=0;
for(let i=0;i<60;i++){
 S.start('y6u2-partb');G.k=15;G.streak=30;G.turbo=3;G.items.length=0;S._next();
 const pg=G.items.filter(x=>x.type==='penguin').sort((x,y)=>x.z-y.z);
 if(pg.length<2)continue;zweier++;
 G.items=pg;G.lane=1;G.x=0;G.penguins=0;G.crew=[];
 S.steer(pg[0].lane);let n=0;while(pg[0].z>0&&n++<500)step();
 S.steer(pg[1].lane);while(pg[1].z>0&&n++<1000)step();
 if(G.penguins===2)beide++;
}
ok(zweier>5&&beide===zweier,'auch bei Hoechsttempo beide erreichbar ('+beide+' von '+zweier+')');
d.getElementById('quit').click();S.showMenu();d.querySelector('[data-modus="normal"]').click();

/* Falsches Tor */
S.start('y6u2-partc');
G.items.length=0;const q=G.q;toGate((G.gate.right+1)%3,false);
ok(G.mode==='result'&&!G.result.ok&&G.hearts===S.HEARTS-1,'falsches Tor kostet ein Herz');
ok(G.missed.has(q.id)&&G.queue.slice(0,4).includes(q),'Wort gemerkt und kommt bald wieder');
ok(d.querySelector('#chips .right').textContent===q.en&&d.querySelector('#chips .wrong'),'richtige und gewaehlte Antwort markiert');
settle();
for(let i=0;i<2;i++){G.items.length=0;toGate((G.gate.right+1)%3,false);settle();}
ok(G.mode==='over'&&!G.won&&/Sturz/.test(d.querySelector('#over h1').textContent),'drei falsche Tore beenden die Fahrt');
ok(d.querySelector('.missed li').textContent.includes(q.en),'Fehlerliste zeigt das Wort');

const saved=JSON.parse(w.localStorage.getItem('vt6:sled:v1'));
ok(saved.best.all>0&&saved.finishes['y6u2-partb']===1,'Bestwert und Zieleinlauf gespeichert');
ok(w.localStorage.getItem('vt6:progress')===null&&w.localStorage.getItem('vt6:climb:v1')===null,'Lernfaecher und Kletterspiel unberuehrt');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
ok(/data-eigenes-design/.test(html)&&!/data-nacht/.test(html),'eigenes Design ohne Hell und Nacht');
ok(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="sled/"'),'Kachel in Year 6');
dom.window.close();
console.log(checks+' sled checks passed');
