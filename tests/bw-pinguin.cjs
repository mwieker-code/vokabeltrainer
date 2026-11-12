/* Black & White (Year 6, Unit 2). Teil 2: Kapitel 1 "Penguin Slide" und die
   Musik. Jedes Eistor hat genau einen richtigen und zwei verschiedene
   falsche Durchgaenge. Der richtige bringt Punkte, der falsche kostet ein
   Herz (oder den Schal). Gelenkt wird in drei Spuren wie bei Sled Run.
   Schanzen tragen ueber Gletscherspalten, Robben bremsen, Fische und Turbo;
   vor jedem Tor liegt eine ruhige Lesezone. Eine Mindestlesezeit gilt
   immer. Nach 16 Toren: Karte, Stempel und weiter zum Orca - die Punkte
   werden mitgenommen. Gespielt wird ohne Zeichenflaeche. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/bw');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/bw/',virtualConsole:new VirtualConsole()});
for(const f of ['year6/climb/data.js','year6/figuren.js','year6/bw/musik.js','year6/bw/morph.js','year6/bw/reise.js','year6/bw/pinguin.js','year6/bw/orca.js','year6/bw/game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
const w=dom.window,d=w.document,B=w.BWGame,P=w.BWPinguin,O=P.O,R=w.BWOrca,D=w.CLIMB_DATA;
const richtig=()=>O.gate.opts.find(o=>o.w===O.q),falsch=()=>O.gate.opts.find(o=>o.w!==O.q);
const zumTor=(lane,maxT=40)=>{const k=O.k;let t=0;P.lane(lane);while(O.k===k&&O.mode==='play'&&t<maxT){P.update(0.05);t+=0.05;}return t;};
const ruhe=()=>{let n=0;while((O.mode==='ziel'||O.mode==='lost')&&n++<200)P.update(0.05);};

/* Rinne und Durchgaenge */
for(const z of [0,500,3000,9000]){
 ok(P.laneX(0,z)<P.laneX(1,z)&&P.laneX(1,z)<P.laneX(2,z),'drei Durchgaenge nebeneinander bei '+z);
 for(let i=0;i<3;i++)ok(P.laneAt(P.laneX(i,z),z)===i,'Durchgang '+i+' wird erkannt bei '+z);
 ok(P.mitte(z)-P.halb(z)>=0&&P.mitte(z)+P.halb(z)<=360,'Rinne bleibt im Bild bei '+z);
}
ok(new Set([0,800,1600,2400].map(z=>Math.round(P.mitte(z)))).size>2,'die Rinne hat Kurven');
/* Kapitel 1 ist voreingestellt */
ok(B.G.startKap===0&&d.querySelector('[data-kap="0"]').getAttribute('aria-pressed')==='true','Pinguin ist voreingestellt');

/* jeder Abschnitt fehlerfrei durch beide Kapitel */
for(const id of [...D.parts.map(p=>p.id),'all']){
 B.G.startKap=0;d.querySelector('[data-part="'+id+'"]').click();
 ok(B.G.mode==='play'&&B.G.kap===0&&O.mode==='play'&&/^Tor 1\/16/.test(d.getElementById('floe').textContent),id+': Pinguin-Kapitel laeuft');
 ok(/Wischen oder tippen/.test(d.getElementById('hint').textContent),id+': Hinweis zum Pinguin');
 for(let k=0;k<P.GOAL;k++){
  const g=O.gate;
  ok(g.opts.length===3&&g.opts.filter(o=>o.w===O.q).length===1,id+': genau ein richtiger Durchgang');
  ok(new Set(g.opts.map(o=>o.w.en)).size===3&&new Set(g.opts.map(o=>o.w.de)).size===3,id+': drei verschiedene Woerter');
  ok(d.getElementById('prompt').textContent===O.q.de&&d.querySelectorAll('#choices button').length===3,id+': Frage und Knoepfe');
  ok((g.z-O.dist)/P.speed()>=P.MINREAD-0.01,id+': Mindestlesezeit');
  const s0=O.score,h0=O.hearts;zumTor(richtig().lane);
  ok(O.score>s0&&O.hearts===h0,id+': richtiges Tor bringt Punkte');
 }
 ruhe();
 ok(B.G.mode==='reise'&&!d.getElementById('reise').hidden,id+': nach dem Pinguin die Reise');
 const A=w.BWReise.ORTE[0];ok(d.getElementById('reise').textContent.includes(A.satz)&&/Weiter: Southern Ocean/.test(d.getElementById('reise').textContent),id+': Stempel und weiter zum Orca');
 const punkte=O.score;d.getElementById('weiter').click();
 ok(B.G.kap===1&&R.O.mode==='play'&&R.O.score===punkte,id+': Orca-Kapitel mit den Punkten aus Kapitel 1');
 d.getElementById('quit').click();
}
ok(JSON.stringify(B.saved().stempel)==='["pinguin"]','Stempel fuer den Pinguin');

/* Fehler und Schal */
B.G.startKap=0;d.querySelector('[data-part="y6u2-partb"]').click();
const q=O.q;zumTor(falsch().lane);ok(O.hearts===P.HEARTS-1&&O.streak===0&&O.missed.has(q.en),'falsches Tor kostet ein Herz');
ok(O.queue.slice(0,3).includes(q),'das Wort kommt bald wieder');
O.shield=true;zumTor(falsch().lane);ok(O.hearts===P.HEARTS-1&&!O.shield,'der Schal faengt einen Fehler ab');
const v0=P.speed();O.streak=8;ok(P.speed()>v0&&P.mult()>1,'Serie macht schneller');
O.turbo=2;ok(P.mult()>=2&&P.gapFor(P.speed())/P.speed()>=P.MINREAD-0.01,'Turbo: doppelte Punkte, Lesezeit bleibt');O.turbo=0;O.streak=0;
/* Spuren wie bei Sled Run: ein Schritt = eine Spur, ohne Ueberschiessen */
O.gate.z=O.dist+1e6;O.items.length=0;
P.lane(0);for(let i=0;i<40;i++)P.update(0.02);ok(Math.abs(O.x-P.laneX(0,O.dist))<2,'Spur 0 wird erreicht');
P.schritt(1);P.schritt(1);P.schritt(1);ok(O.spurNr===2,'nicht ueber die rechte Spur hinaus');
let max=-1e9;for(let i=0;i<60;i++){P.update(0.02);max=Math.max(max,O.x-P.laneX(2,O.dist));}
ok(Math.abs(O.x-P.laneX(2,O.dist))<2&&max<1,'weich hinueber, ohne Ueberschiessen');
P.schritt(-1);ok(O.spurNr===1,'Schritt nach links');
const zw=P.laneX(1,O.dist)-P.laneX(0,O.dist);ok(zw>60,'Spuren deutlich getrennt');
/* Kurven nur leicht */
let mn=1e9,mx=-1e9;for(let z=0;z<20000;z+=50){mn=Math.min(mn,P.mitte(z));mx=Math.max(mx,P.mitte(z));}ok(mx-mn<70,'die Rinne kurvt nur leicht');
/* Schanze und Spalte */
const it=(typ,lane,dz)=>({typ,lane,z:O.dist+(dz||1)});
O.bremse=0;O.items.length=0;P.lane(1);for(let i=0;i<40;i++)P.update(0.02);
O.items.push(it('schanze',1,1));P.update(0.02);ok(O.sprung>0&&O.jumps>=1,'Schanze: Sprung');
O.items.push({typ:'spalte',z:O.dist+2});const st0=O.streak=3;P.update(0.02);P.update(0.02);ok(O.stun<=0&&O.streak===3,'im Sprung ueber die Spalte');
let n=0;while(O.sprung>0&&n++<100)P.update(0.02);
O.items.push({typ:'spalte',z:O.dist+2});const h1=O.hearts;P.update(0.02);P.update(0.02);ok(O.stun>0&&O.streak===0&&O.hearts===h1,'ohne Sprung in die Spalte: Serie weg, kein Herz');
O.stun=0;O.streak=4;O.items.push(it('robbe',1,1));P.update(0.02);ok(O.stun>0&&O.streak===0&&O.hearts===h1,'Robbe bremst, kostet aber kein Herz');
const vs=P.speed();O.stun=0;ok(P.speed()>vs,'gebremst ist der Pinguin langsamer');
const f0=O.fish,s0=O.score;O.items.push(it('fisch',1,1));P.update(0.02);ok(O.fish===f0+1&&O.score>s0,'Fisch gibt Punkte');
O.items.push(it('fisch',1,1));O.items[O.items.length-1].hoch=true;P.update(0.02);ok(O.fish===f0+1,'Fisch in der Luft nur im Sprung');
O.items.push(it('fisch',2,1));P.update(0.02);ok(O.fish===f0+1,'Fisch im anderen Durchgang wird nicht eingesammelt');
O.items.push(it('turbo',1,1));P.update(0.02);ok(O.turbo===3,'Eis-Turbo eingesammelt');
O.items.push(it('schal',1,1));P.update(0.02);ok(O.shield,'Schal angelegt');
/* zwischen den Toren: vor jeder Spalte liegt eine Schanze, Robben sperren nur einen Durchgang,
   und vor jedem Tor liegt eine ruhige Lesezone */
d.getElementById('quit').click();B.G.startKap=0;d.querySelector('[data-part="all"]').click();
let spalten=0;
for(let k=0;k<P.GOAL-1;k++){
 const zwischen=O.items.filter(i=>i.z>O.dist&&i.z<O.gate.z);
 for(const sp of zwischen.filter(i=>i.typ==='spalte')){spalten++;ok(zwischen.some(i=>i.typ==='schanze'&&i.z<sp.z&&sp.z-i.z<120),'vor der Spalte liegt eine Schanze');}
 ok(zwischen.filter(i=>i.typ==='robbe').length<=1,'hoechstens eine Robbe je Abschnitt');
 const lang=O.gate.z-O.dist;ok(zwischen.every(i=>O.gate.z-i.z>=lang*0.45),'Lesezone vor dem Tor ohne Hindernisse');
 O.hearts=P.HEARTS;zumTor(richtig().lane);
}
ok(spalten>=3,'Spalten kommen vor');
/* verlieren */
B.G.startKap=0;d.querySelector('#toMenu, #quit')&&d.getElementById('quit').click();d.querySelector('[data-part="y6u2-parta"]').click();
n=0;while(O.mode==='play'&&n++<20){P.lane(falsch().lane);O.x=P.laneX(falsch().lane,O.gate.z);O.dist=O.gate.z-1;P.update(0.05);}
ruhe();ok(B.G.mode==='over'&&/Bauchlandung/.test(d.getElementById('over').textContent)&&/noch üben/.test(d.getElementById('over').textContent),'ohne Herzen ist Schluss');
d.getElementById('again').click();ok(B.G.kap===0&&O.mode==='play'&&O.hearts===P.HEARTS&&O.k===0,'Kapitel 1 nochmal');
/* Steuerung */
d.querySelector('#choices [data-lane="2"]').click();ok(O.spurNr===2,'Knopf waehlt die Spur');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1'}));ok(O.spurNr===0,'Zifferntaste waehlt die Spur');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight'}));ok(O.spurNr===1,'Pfeiltaste: eine Spur weiter');
const fake={getBoundingClientRect:()=>({left:0,top:0,width:360,height:600})};
P.wisch(fake,200,120);ok(O.spurNr===0,'Wischen nach links');P.wisch(fake,100,180);ok(O.spurNr===1,'Wischen nach rechts');
P.wisch(fake,P.laneX(2,O.dist),P.laneX(2,O.dist));ok(O.spurNr===2,'Tippen auf eine Spur');
B.pause(true);const z0=O.dist;P.update(0.5);ok(O.dist===z0,'Pause haelt an');B.pause(false);

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
