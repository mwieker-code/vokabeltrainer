/* Free Kick Tour (Year 6, Unit 2): Vier Tafeln im Tor, genau eine passt zum
   deutschen Wort. Wer fuenfzehnmal schiesst und dabei hoechstens zwei
   falsche Woerter trifft, schafft die Tour. Nur ein falsches Wort kostet ein
   Herz; Torwart, Mauer, Pfosten und daneben kosten nur die Serie. Mauer,
   Wind, Kurve, Kraft und Steuerung werden ohne Zeichenflaeche geprueft. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/kick');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/kick/',virtualConsole:new VirtualConsole()});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8'));
for(const f of ['spieler.js','game.js'])w.eval(fs.readFileSync(path.join(dir,f),'utf8'));
const S=w.KickGame,G=S.G,D=w.CLIMB_DATA;
const step=()=>S.update(0.02);
const until=(cond,max)=>{let n=0;while(!cond()&&n++<(max||3000))step();return n;};
/* Ein sauberer Schuss mitten auf Tafel i: Wind ausgeglichen, gutes Tempo,
   und wenn die Mauer im Weg steht, mit Kurve drumherum. */
function ideal(i){
 const m=S.mitte(i,G.time+S.RUNUP+0.9);
 for(const c of [0,1.8,-1.8,2.3,-2.3]){const inp={tx:m.x-G.wind,ty:m.y,u:1300,c};if(!S.plan(inp).blocked)return inp;}
 return {tx:m.x-G.wind,ty:m.y,u:1300,c:0};
}
const toAim=()=>{if(G.mode==='intro')d.getElementById('feld').dispatchEvent(new w.Event('pointerdown'));until(()=>G.mode==='aim'||G.mode==='celebrate'||G.mode==='over');};
let last=null;
const fire=inp=>{const R=S.shoot(inp);last=R;until(()=>G.mode==='result');const k=R&&R.kind;until(()=>G.mode!=='result');return k;};

ok(d.querySelectorAll('#levels [data-part]').length===D.parts.length+1,'Auswahl: alle Abschnitte und die ganze Unit');
ok(d.querySelectorAll('#players [data-player]').length===3,'drei Spieler zur Wahl');
ok(d.querySelector('[data-player="flash"]').disabled&&S.player()==='leo','Flash anfangs gesperrt, Leo voreingestellt');
ok(/noch 3× Tour/.test(d.querySelector('[data-player="flash"]').textContent),'Sperre nennt die fehlenden Touren');
d.querySelector('[data-player="mia"]').click();
ok(S.player()==='mia'&&JSON.parse(w.localStorage.getItem('vt6:kick:v1')).player==='mia','Mia gewaehlt und gespeichert');
d.querySelector('[data-player="leo"]').click();ok(S.player()==='leo','zurueck zu Leo');

/* Volle Touren ohne Torwart: jeder Schuss sitzt */
G.noKeeper=true;
for(const id of [...D.parts.map(p=>p.id),'all']){
 d.querySelector('[data-part="'+id+'"]').click();
 ok(!d.getElementById('stage').hidden&&G.mode==='intro'&&G.hearts===S.HEARTS,'Tour beginnt mit dem Bolzplatz: '+id);
 const orte=new Set();
 for(let k=0;k<S.SHOTS;k++){
  toAim();
  orte.add(S.ort().id);
  ok(S.ort()===S.ORTE[Math.floor(k/S.PER)],'Station passt zum Schuss '+(k+1));
  const en=G.options.map(o=>o.en),de=G.options.map(o=>o.de);
  ok(G.options.length===4&&new Set(en).size===4&&new Set(de).size===4,'vier verschiedene Antworten');
  ok(G.options[G.right]===G.q&&d.getElementById('prompt').textContent===G.q.de,'genau eine richtige Tafel zur Frage');
  ok([...d.querySelectorAll('#chips [data-zone]')].map(b=>b.textContent.slice(1)).join('|')===en.join('|'),'Antworten als Knoepfe in Tafelreihenfolge');
  if(S.ort().wall)ok(Math.abs(G.wallX)>0,'Mauer steht vor einer Seite');
  const kind=fire(ideal(G.right));
  ok(kind==='tor','sauberer Schuss auf die richtige Tafel ist ein Tor ('+kind+', Schuss '+(k+1)+')');
 }
 ok(orte.size===3,'drei Stationen: Bolzplatz, Schulhof, Stadion');
 ok(G.mode==='celebrate'&&G.goals===S.SHOTS&&G.hearts===S.HEARTS,'nach fuenfzehn Schuessen ist die Tour geschafft');
 until(()=>G.mode==='over');
 ok(G.won&&/Tour geschafft/.test(d.querySelector('#over h1').textContent),'Abschluss: '+id);
 ok(/Kein einziges falsches Wort/.test(d.getElementById('over').textContent)&&d.querySelectorAll('#over .sterne').length===1,'Abschluss ohne Fehlerliste, mit Sternen');
 d.getElementById('toMenu').click();
 ok(/Tour geschafft/.test(d.querySelector('[data-part="'+id+'"]').textContent),'Tour in der Auswahl vermerkt');
}
ok(S.unlocked()&&!d.querySelector('[data-player="flash"]').disabled,'Flash nach drei Touren frei');
d.querySelector('[data-player="flash"]').click();ok(S.player()==='flash','Flash spielt');

/* Falsches Wort: ein Herz weg, das Wort kommt wieder, steht am Ende in der Liste */
d.querySelector('[data-part="y6u2-parta"]').click();toAim();
const q=G.q,falsch=(G.right+1)%4;
let kind=fire(ideal(falsch));
ok(kind==='falsch'&&G.hearts===S.HEARTS-1&&G.streak===0,'falsches Wort kostet ein Herz');
ok(G.queue.slice(0,4).includes(q),'das Wort kommt bald wieder');
toAim();kind=fire(ideal((G.right+1)%4));toAim();kind=fire(ideal((G.right+2)%4));
ok(G.hearts===0&&G.mode==='over'&&!G.won,'drei falsche Woerter beenden die Tour');
ok(/Abpfiff/.test(d.querySelector('#over h1').textContent)&&d.querySelectorAll('#over ul.missed li').length>=2,'Abschluss mit Woertern zum Ueben');
ok(d.querySelector('#over a.train').getAttribute('href')==='../','Link zurueck zum Vokabeltrainer');
d.getElementById('toMenu').click();

/* Geschick statt Wissen: kostet kein Herz */
d.querySelector('[data-part="y6u2-partb"]').click();toAim();
const pfosten=S.plan({tx:S.GW,ty:1.0,u:1300,c:0});ok(pfosten.kind==='pfosten','Pfosten erkannt');
const latte=S.plan({tx:1.5,ty:S.GH,u:1300,c:0});ok(latte.kind==='latte','Latte erkannt');
ok(S.plan({tx:0,ty:1.22,u:1300,c:0}).kind==='zwischen','zwischen zwei Tafeln zaehlt nicht');
ok(S.plan({tx:6,ty:1,u:1300,c:0}).kind==='daneben','neben das Tor');
ok(S.plan({tx:-2,ty:3.4,u:1300,c:0}).kind==='drueber','uebers Tor');
G.streak=3;let h=G.hearts;kind=fire({tx:6,ty:1,u:1300,c:0});
ok(kind==='daneben'&&G.hearts===h&&G.streak===0,'daneben kostet die Serie, kein Herz');
/* Kraft: zu langsam sackt ab, zu schnell steigt */
toAim();
const m0=S.mitte(0,G.time);
const schwach=S.plan({tx:m0.x,ty:m0.y,u:200,c:0}),gut=S.plan({tx:m0.x,ty:m0.y,u:1300,c:0}),fest=S.plan({tx:m0.x,ty:m0.y,u:3600,c:0});
ok(schwach.kraft==='schwach'&&schwach.fy<gut.fy-0.5&&schwach.T>gut.T,'zu langsam: Ball sackt ab und ist langsamer');
ok(fest.kraft==='fest'&&fest.fy>gut.fy+1&&fest.kind==='drueber','zu schnell: Ball steigt uebers Tor');
ok(gut.kraft==='gut'&&Math.abs(gut.fy-m0.y)<1e-9,'gutes Tempo: Ball fliegt dorthin, wo der Finger loslaesst');
/* Torwart: ahnt er die Ecke und steht nah, haelt er - ohne Herz */
G.noKeeper=false;const rand=w.Math.random;
w.Math.random=()=>0;G.kx=S.mitte(G.right,G.time).x;
const sicher=S.plan({tx:S.mitte(G.right,G.time).x,ty:S.mitte(G.right,G.time).y,u:900,c:0});
ok(sicher.kind==='gehalten'&&sicher.keeper.reads,'Torwart haelt, wenn er die Ecke ahnt und dort steht');
G.kx=0;w.Math.random=()=>0.99;G.lean=-0.7;G.kx=-0.7;
const rechts=S.plan({tx:3.0,ty:1.9,u:2200,c:0});
ok(rechts.keeper.aimX<0,'nicht geahnt: Torwart fliegt zur Seite, zu der er sich lehnt');
w.Math.random=rand;
G.kx=S.mitte(G.right,G.time).x;G.lean=G.kx;w.Math.random=()=>0;h=G.hearts;G.streak=2;const gehaltenId=G.q.id;
kind=fire({tx:S.mitte(G.right,G.time+1).x,ty:S.mitte(G.right,G.time+1).y,u:900,c:0});w.Math.random=rand;
ok(kind==='gehalten'&&G.hearts===h&&G.streak===0,'gehalten kostet die Serie, kein Herz');
ok(!G.missed.has(gehaltenId)&&!G.requeued.has(gehaltenId),'gehaltenes Wort zaehlt nicht als Fehler');
G.noKeeper=true;

/* Mauer und Kurve, Wind */
G.k=S.PER;G.mode='result';G.t=99;G.shot=Object.assign(G.shot||{},{kind:'tor'});step();toAim();
ok(S.ort().id==='schulhof'&&S.ort().wall===3,'Schulhof mit Mauer');
const seite=Math.sign(G.wallX),unten=seite<0?2:3,mu=S.mitte(unten,G.time+1);
const gerade=S.plan({tx:mu.x-G.wind,ty:mu.y,u:1300,c:0});
ok(gerade.blocked,'flacher Schuss auf der Mauerseite bleibt haengen');
const kurve=S.plan({tx:mu.x-G.wind,ty:mu.y,u:1300,c:seite*-2.2});
ok(!kurve.blocked,'mit Kurve um die Mauer herum');
const hoch=S.plan({tx:S.mitte(unten-2,G.time+1).x-G.wind,ty:S.mitte(unten-2,G.time+1).y,u:1300,c:0});
ok(!hoch.blocked,'hohe Ecke geht ueber die Mauer');
ok(Math.abs(gerade.fx-(gerade.tx+G.wind))<1e-9,'Wind versetzt den Ball');
G.wind=1;ok(S.plan({tx:0.9,ty:0.6,u:1300,c:0}).fx===1.9,'Wind von links schiebt nach rechts');

/* Bonus: Winkel und Kurve; Serie hebt die Punkte */
d.getElementById('quit').click();
d.querySelector('[data-part="y6u2-parta"]').click();toAim();
G.right=1;G.q=G.options[1];
let before=G.score;kind=fire({tx:3.1,ty:2.15,u:1300,c:0});
ok(kind==='tor'&&last.bonus.some(b=>b[0]==='Winkel'),'Tor in den Winkel gibt einen Bonus');
ok(last.bonus.some(b=>b[0]==='Perfekt'),'perfektes Wischtempo gibt einen Bonus');
toAim();G.aimTime=10;const m1=S.multiplier();
ok(Math.abs(m1-1.1)<1e-9,'Serie: jedes Tor hebt die Punkte um ein Zehntel');
before=G.score;kind=fire(ideal(G.right));
ok(kind==='tor'&&G.score-before===Math.round(100*1.1/10)*10+last.bonus.reduce((a,b)=>a+b[1],0),'Punkte: 100 mal Serie plus Bonus');
toAim();G.golden=true;G.aimTime=10;before=G.score;const m2=S.multiplier();kind=fire(ideal(G.right));
ok(G.score-before===Math.round(200*m2/10)*10+last.bonus.reduce((a,b)=>a+b[1],0),'Goldball zaehlt doppelt');

/* Wischen: Ende = Ziel, Bogen = Kurve, Tempo aus der letzten Zehntelsekunde */
toAim();
const o=S.ort(),zx=S.SX(1.9,o.D),zy=S.SY(1.8,o.D),bx=S.SX(0,0),by=S.SY(0,0);
const zug=(n,dauer,bogen)=>Array.from({length:n+1},(_,i)=>{const f=i/n;return {x:bx+(zx-bx)*f+(bogen||0)*Math.sin(f*Math.PI),y:by+(zy-by)*f,t:f*dauer};});
let a=S.auswerten(zug(10,0.15));
ok(Math.abs(a.tx-1.9)<0.02&&Math.abs(a.ty-1.8)<0.02&&a.c===0,'gerader Wisch zielt auf das Ende');
ok(a.u>1000&&a.u<2600,'zuegiger Wisch hat gutes Tempo ('+Math.round(a.u)+')');
ok(S.auswerten(zug(10,0.9)).u<600,'langsames Ziehen ist zu schwach');
ok(S.auswerten(zug(10,0.15,-30)).c<-0.5&&S.auswerten(zug(10,0.15,30)).c>0.5,'Bogen nach links gibt Kurve nach links, nach rechts nach rechts');
ok(S.auswerten([{x:bx,y:by,t:0},{x:bx+5,y:by-5,t:0.1}])===null,'kurzes Tippen schiesst nicht');
ok(S.auswerten([{x:bx,y:by,t:0},{x:bx,y:by+80,t:0.1}])===null,'nach unten wischen schiesst nicht');
const kurz=S.auswerten([{x:bx,y:by,t:0},{x:bx+20,y:by-60,t:0.08}]);
ok(Math.abs(kurz.ty-0.6)<1e-6&&kurz.tx>0,'kurzer Wisch: flach in Wischrichtung');

/* Knoepfe und Tastatur */
const chip=d.querySelector('#chips [data-zone="2"]');chip.click();
ok(G.markerZone===2&&chip.getAttribute('aria-pressed')==='true'&&G.mode==='aim','erster Tipp zielt');
chip.click();ok(G.mode==='anlauf'&&G.shot.src==='knopf'&&G.shot.u===1250,'zweiter Tipp schiesst');
until(()=>G.mode!=='result'&&G.mode!=='anlauf'&&G.mode!=='flight');toAim();
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'4'}));ok(G.markerZone===3,'Taste 4 zielt unten rechts');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp'}));ok(G.markerZone===1,'Pfeil hoch: obere Reihe');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' '}));ok(G.charge,'Leertaste laedt');
for(let i=0;i<20;i++)step();
d.dispatchEvent(new w.KeyboardEvent('keyup',{key:' '}));ok(G.mode==='anlauf'&&G.shot.src==='taste','Loslassen schiesst');
S.pause(true);const t0=G.t;S.update(1);ok(G.t===t0,'Pause haelt das Spiel an');S.pause(false);

/* Profi-Modus: eigene Bestwerte, staerker, mehr Punkte */
d.getElementById('quit').click();
ok(d.querySelector('[data-modus="normal"]').getAttribute('aria-pressed')==='true','Normal ist voreingestellt');
d.querySelector('[data-modus="profi"]').click();
ok(JSON.parse(w.localStorage.getItem('vt6:kick:v1')).modus==='profi','Profi gewaehlt und gespeichert');
ok(!/Bestwert/.test(d.querySelector('[data-part="y6u2-intro"]').textContent),'Profi hat eigene Bestwerte');
d.querySelector('[data-part="y6u2-intro"]').click();toAim();
ok(G.modus==='profi'&&Math.abs(S.multiplier()-1.5)<1e-9,'Profi gibt anderthalbfache Punkte');
ok(S.modus().sweet[1]-S.modus().sweet[0]<S.MODI.normal.sweet[1]-S.MODI.normal.sweet[0],'Profi: engeres Wischtempo');

/* Einbindung */
ok(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8').includes('href="kick/"'),'Kachel in Year 6');
ok(fs.readFileSync(path.join(root,'build.cjs'),'utf8').includes("'year6/kick'"),'Seite im Build');
console.log('Free Kick Tour: '+checks+' Pruefungen bestanden');
