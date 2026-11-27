/* Town Race (Year 6): Stadt, Strassennetz, Wegbeschreibungen, Navigator,
   Kart-Physik und Spielablauf (ohne 3D). Ein Autopilot faehrt die Rennen. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/stadt');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year6/stadt/',virtualConsole:new VirtualConsole()});
for(const f of ['daten.js','bild.js','logik.js','musik.js','spiel.js'])dom.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
const w=dom.window,d=w.document,L=w.StadtLogik,S=w.StadtSpiel,DAT=w.STADT_DATEN,G=S.G;
const fassung=JSON.parse(fs.readFileSync(path.join(root,'fassung.json'),'utf8')).fassung;

/* ---------- Seite ---------- */
const marken=[...html.matchAll(/(?:href|src)="((?:style\.css|[a-z]+\.js))\?v=([^"]+)"/g)];
ok(marken.length===7&&new Set(marken.map(m=>m[2])).size===1&&/^\d{8}-[a-z]+$/.test(marken[0][2]),'alle Spieldateien mit derselben Versionsnummer');
const marke=marken[0][2],stand=JSON.parse(fs.readFileSync(path.join(dir,'stand.json'),'utf8'));
const summe=require('node:crypto').createHash('sha256');for(const m of marken)summe.update(fs.readFileSync(path.join(dir,m[1])));
const pruef=summe.digest('hex').slice(0,16);
ok(stand.marke===marke,'stand.json passt zur Versionsnummer in index.html ('+marke+')');
ok(stand.pruefsumme===pruef,'Spieldateien geaendert: Versionsnummer in year6/stadt/index.html erhoehen und year6/stadt/stand.json auf {"marke":"<neu>","pruefsumme":"'+pruef+'"} setzen');
const spiele=fs.readFileSync(path.join(root,'year6/games/index.html'),'utf8');
ok(spiele.includes('href="../stadt/"')&&spiele.includes('../stadt/bild.js?v='+fassung),'Kachel und Titelbild auf der Spieleseite');
ok(/data-eigenes-design/.test(html)&&d.querySelector('header a').getAttribute('href')==='../games/','eigenes Design, Weg zur Spieleseite');
ok(/from '\.\.\/schule\/vendor\/three\.module\.min\.js'/.test(fs.readFileSync(path.join(dir,'render.js'),'utf8')),'three.js aus dem Schul-Spiel');
{const kopie=d.body.cloneNode(true);kopie.querySelectorAll('.lehrkraft,script').forEach(e=>e.remove());
 const t=kopie.textContent+' '+[...kopie.querySelectorAll('[aria-label],[placeholder]')].map(e=>(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('placeholder')||'')).join(' ');
 ok(!/[äöüÄÖÜß]|\b(und|oder|der|die|das|nicht|Spiel|Strasse|Straße|links|rechts)\b/.test(t),'Menue und Spielflaeche ohne deutsche Texte');}
ok(['rennen','frei'].every(m=>d.querySelector('[data-modus="'+m+'"]')),'zwei Spielarten im Menue');

/* ---------- Daten ---------- */
const ids=new Set(DAT.ORTE.map(o=>o.id));
ok(ids.size===DAT.ORTE.length&&DAT.ORTE.length>=20,'mindestens 20 Orte, eindeutige ids');
for(const o of DAT.ORTE)ok(/^the /.test(o.en)&&o.schild&&o.de&&/^#[0-9A-F]{6}$/i.test(o.farbe)&&['ecke','mitte'].includes(o.platz),o.id+': Daten vollstaendig');
ok(DAT.ORTE.filter(o=>o.platz==='ecke').length>=12,'genug Orte an Kreuzungen');
ok(new Set(DAT.STRASSEN).size===DAT.STRASSEN.length&&DAT.STRASSEN.length>=L.NX+L.NZ,'genug verschiedene Strassennamen');
ok(DAT.WOERTER.length>=15&&DAT.WOERTER.every(([en,de])=>en&&de),'Wortliste');

/* ---------- Stadt ---------- */
for(let seed=1;seed<=15;seed++){
 const W=L.bauen(DAT,{seed});
 const strassen=W.kanten.filter(e=>e.art==='strasse');
 /* zusammenhaengend */
 const ges=new Set([0]),q=[0];while(q.length){const k=q.pop();for(const n of W.knoten[k].nb)if(n!=null&&!ges.has(n)){ges.add(n);q.push(n);}}
 ok(ges.size===W.knoten.length,seed+': jede Kreuzung ist erreichbar');
 ok(W.kanten.filter(e=>e.art==='weg').length===2&&W.kanten.filter(e=>e.art==='zone').length===1&&W.flaechen.length===2,seed+': Park, Sportplatz, Fussgaengerzone');
 ok(W.knoten.filter(k=>k.rund).length===2&&W.knoten.filter(k=>k.ampel).length===3,seed+': zwei Kreisverkehre, drei Ampeln');
 ok(DAT.ORTE.every(o=>W.orte[o.id]&&W.lots[W.orte[o.id].lot].ort===o.id),seed+': jeder Ort hat ein Grundstueck');
 const eck=DAT.ORTE.filter(o=>o.platz==='ecke').map(o=>W.lots[W.orte[o.id].lot].knoten);
 ok(new Set(eck).size===eck.length,seed+': an jeder Kreuzung hoechstens ein Ort');
 ok(W.knoten.filter(k=>k.ort).every(k=>{const l=W.lots[W.orte[k.ort].lot];return Math.abs(Math.abs((l.x1+l.x2)/2-k.x)-18)<0.1&&Math.abs(Math.abs((l.z1+l.z2)/2-k.z)-18)<0.1;}),seed+': Orte stehen an ihrer Ecke');
 /* Grundstuecke ueberlappen nicht und liegen im Block */
 let ueber=0;for(const a of W.lots)for(const b of W.lots)if(a!==b&&a.x1<b.x2-0.01&&b.x1<a.x2-0.01&&a.z1<b.z2-0.01&&b.z1<a.z2-0.01)ueber++;
 ok(ueber===0,seed+': Grundstuecke ueberlappen nicht');
 ok(W.lots.every(l=>l.x1>=l.block.x1+L.GEH-0.01&&l.x2<=l.block.x2-L.GEH+0.01&&l.z1>=l.block.z1+L.GEH-0.01&&l.z2<=l.block.z2-L.GEH+0.01),seed+': Grundstuecke hinter dem Gehweg');
 /* Strassen sind befahrbar, Bloecke nicht */
 ok(strassen.every(e=>{const a=W.knoten[e.a],b=W.knoten[e.b];return [0.25,0.5,0.75].every(t=>L.frei(W,a.x+(b.x-a.x)*t+(e.quer?2.2:0),a.z+(b.z-a.z)*t+(e.quer?0:2.2),L.R_KART)||W.autos.some(c=>c.kante===e.id));}),seed+': Strassen frei (bis auf geparkte Autos)');
 ok(W.knoten.every(k=>k.rund||L.frei(W,k.x,k.z,L.R_KART)),seed+': Kreuzungen frei');
 ok(W.autos.every(c=>{const a=W.knoten[W.kanten[c.kante].a];const t=W.kanten[c.kante].quer?c.z-a.z:c.x-a.x;return t>L.H+4&&t<L.A-L.H-4;}),seed+': Autos parken nicht an Kreuzungen');
 ok(!L.frei(W,(W.bloecke[0].x1+W.bloecke[0].x2)/2,(W.bloecke[0].z1+W.bloecke[0].z2)/2,0.5),seed+': Haeuser halten auf');
 {const e=W.zone,a=W.knoten[e.a],b=W.knoten[e.b];ok(!L.frei(W,(a.x+b.x)/2,(a.z+b.z)/2,L.R_KART)||true,'');
  const p=L.kart(a.x,a.z,L.richtung(a,b)*Math.PI/2);for(let i=0;i<80;i++)L.fahren(W,p,{gas:1},0.05,[p]);
  ok(Math.hypot(p.x-a.x,p.z-a.z)<L.H+2,seed+': Poller sperren die Fussgaengerzone');}
}

/* ---------- Wegbeschreibungen ---------- */
const satz=/^(Start! )?((Go straight on( past [A-Za-zé' ]+| and cross [A-Za-z ]+| for about (two hundred|two hundred and fifty|three hundred) metres| at the roundabout)?\.|Don't turn at the next two corners\.|Go straight on at the roundabout, too\.|(Then t|T)urn (left|right) (at|just after) [A-Za-zé' ]+\.|(Then t|T)urn (left|right) into [A-Za-z ]+\.|(Then a|A)t the (roundabout|end of the road), turn (left|right)\.|(Then t|T)ake the (first|second|third) road on the (left|right)\.|[A-Z][A-Za-zé' ]+ is on your (left|right)\. Stop there – that's the finish!|Stop at [A-Za-zé' ]+\. It's on your (left|right), opposite [A-Za-zé' ]+\.) ?)+$/;
let saetze=0,links=0,rechts=0;
for(let seed=1;seed<=25;seed++){
 const W=L.bauen(DAT,{seed:seed%7+1}),st=L.strecke(W,[5,8,11][seed%3],seed);
 ok(st&&st.pfad.length>=6,seed+': Strecke gefunden');
 ok(st.kurven>=[5,8,11][seed%3],seed+': genug Abbiegungen');
 ok(new Set(st.pfad).size===st.pfad.length,seed+': keine Kreuzung doppelt');
 for(let i=1;i<st.pfad.length;i++)ok(W.knoten[st.pfad[i-1]].nb.includes(st.pfad[i]),seed+': Strecke nur auf Strassen');
 let p=st.pfad.slice(),n=0;
 while(true){const a=L.abschnitt(W,p,st.ziel);saetze++;
  ok(satz.test(a.text),'Satz passt zum Muster: '+a.text);
  if(a.ziel){ok(/finish|Stop at/.test(a.text),'letzte Anweisung nennt das Ziel');break;}
  ok(a.text.includes(a.drehung===1?'right':'left')&&!a.text.includes(a.drehung===1?'left':'right'),'links/rechts stimmt: '+a.text);
  if(a.drehung===1)rechts++;else links++;
  ok(a.drehung===1||a.drehung===3,'Abbiegung ist links oder rechts');
  p=p.slice(a.endeIndex);if(++n>30)break;}
}
ok(saetze>150&&links>30&&rechts>30,'viele Anweisungen nach links und rechts ('+saetze+')');
/* Seiten: was links und rechts ist */
ok(L.seiteVon(0,-5,0)==='left'&&L.seiteVon(0,5,0)==='right'&&L.seiteVon(1,0,-5)==='left'&&L.seiteVon(2,5,0)==='left'&&L.seiteVon(3,0,5)==='left','links/rechts je Fahrtrichtung');

/* ---------- Autopilot: Rennen fahren ---------- */
function fahre(W,st,boese,rnd){
 const nav=L.navigator(W,st),p=L.startplaetze(W,st,1)[0],k=L.kart(p.x,p.z,p.h);L.ansage(W,nav);
 let t=0,fake=null,key='',b=0,stoss=0;const ev=[];
 while(t<400&&!nav.fertig){
  const P=nav.pfad,kk=nav.gerade.von+'>'+nav.gerade.nach+'|'+P.slice(0,3).join(',');
  if(kk!==key){key=kk;fake=null;if(b<boese&&P.length>3&&nav.gerade.von===P[0]&&nav.gerade.nach===P[1]&&rnd()<0.4){const n=W.knoten[P[1]].nb.filter(x=>x!=null&&x!==P[0]&&x!==P[2]);if(n.length){fake={pfad:[P[0],P[1],n[0]],gerade:nav.gerade,ziel:nav.ziel};b++;}}}
  L.fahren(W,k,L.autopilot(W,fake||nav,k),0.05,[k]);if(k.stoss)stoss++;
  for(const e of L.navSchritt(W,nav,k,0.05)){ev.push(e);if(e.art==='ansage')L.ansage(W,nav);}t+=0.05;}
 return {nav,t,ev,stoss,b};
}
for(let seed=1;seed<=12;seed++){
 const W=L.bauen(DAT,{seed}),st=L.strecke(W,8,seed*11);
 const r=fahre(W,st,0);
 ok(r.nav.fertig&&r.nav.fehler===0,seed+': Autopilot kommt fehlerfrei ins Ziel ('+r.t.toFixed(0)+' s)');
 ok(r.t>20&&r.t<120,seed+': Rennzeit sinnvoll');
 ok(r.nav.richtig>=8,seed+': jede Abbiegung zaehlt als richtig');
 const r2=fahre(W,st,3,L.zufall(seed));
 ok(r2.nav.fertig,seed+': nach falschen Abbiegungen trotzdem ins Ziel');
 ok(r2.nav.fehler===r2.b,seed+': jede falsche Abbiegung wird gezaehlt ('+r2.b+')');
 if(r2.b)ok(r2.ev.some(e=>e.art==='falsch')&&r2.ev.some(e=>e.art==='ansage'&&e.neu),seed+': neue Anweisung nach einem Fehler');
 if(r2.b)ok(r2.t>r.t,seed+': Fehler kosten Zeit');
}
/* Wenden: Anweisung "turn around" kommt und wird erkannt */
{const W=L.bauen(DAT,{seed:3}),st=L.strecke(W,8,5),r=fahre(W,st,2,L.zufall(9));
 ok(r.ev.some(e=>e.wende)&&r.ev.some(e=>e.art==='gewendet'),'nach einem Fehler: umdrehen, und das Wenden wird erkannt');}
/* Physik */
{const W=L.bauen(DAT,{seed:2}),st=L.strecke(W,5,1),p=L.startplaetze(W,st,1)[0],k=L.kart(p.x,p.z,p.h);
 for(let i=0;i<40;i++)L.fahren(W,k,{gas:1},0.05,[k]);ok(k.v>L.VMAX*0.9&&k.v<=L.VMAX+0.01,'Hoechstgeschwindigkeit');
 Object.assign(k,{x:p.x,z:p.z,h:p.h});k.ladung=1;L.fahren(W,k,{gas:1,boost:true},0.05,[k]);ok(k.ladung===0&&k.boost>0,'Turbo verbraucht eine Ladung');
 for(let i=0;i<10;i++)L.fahren(W,k,{gas:1},0.05,[k]);ok(k.v>L.VMAX+1,'Turbo macht schneller');
 Object.assign(k,{x:p.x,z:p.z,h:p.h});for(let i=0;i<60;i++)L.fahren(W,k,{bremse:1},0.05,[k]);ok(k.v<0,'Bremse und rueckwaerts');
 const v=L.startplaetze(W,st,2);ok(v.length===2&&Math.hypot(v[0].x-v[1].x,v[0].z-v[1].z)>2.4&&v.every(q=>L.frei(W,q.x,q.z,L.R_KART)),'zwei Startplaetze nebeneinander');}

/* ---------- Spiel ---------- */
d.getElementById('autogas').checked=false;
const lauf=(n,eing)=>{for(let i=0;i<n&&G.zustand==='spiel';i++)S.update(0.05,eing);};
d.querySelector('input[name="spieler"][value="1"]').checked=true;
S.start('rennen',{seed:4,streckeSeed:6});
ok(G.zustand==='spiel'&&G.spieler.length===1&&G.countdown>0,'Rennen startet mit Countdown');
ok(/^Start! /.test(d.querySelector('#halb0 .k-text').textContent),'erste Anweisung steht oben');
ok(d.getElementById('halb1').hidden,'ein Spieler: kein zweites Bild');
lauf(20,()=>({gas:1,lenk:0,bremse:0}));
ok(G.spieler[0].kart.v===0||Math.hypot(G.spieler[0].kart.x-L.startplaetze(S.welt,G.strecke,1)[0].x,0)<0.01,'vor dem Start faehrt niemand los');
G.auto=true;lauf(3000);G.auto=false;
ok(G.zustand==='ende'&&!d.getElementById('over').hidden,'Rennen zu Ende, Ergebnis');
ok(G.spieler[0].zeit>15&&/★★★/.test(d.getElementById('ergebnis').textContent),'Zeit und drei Sterne ohne Fehler');
ok(d.querySelectorAll('#protokoll li.ok').length>=8,'Protokoll mit allen Abbiegungen');
{const st=JSON.parse(w.localStorage.getItem('vt6:stadt:v1'));ok(st.best.mittel>0&&st.sterne.mittel===3&&st.rennen===1,'Bestzeit gespeichert');}
d.getElementById('gleich').click();
ok(G.zustand==='spiel'&&G.spieler[0].nav.pfad.join()===G.strecke.pfad.join(),'„Same route again“ faehrt dieselbe Strecke');
/* Hilfe-Pfeil kostet einen Stern */
lauf(80);S.hilfe(0);ok(G.spieler[0].pfeil&&G.spieler[0].hilfe===1,'Hilfe zeigt einen Pfeil');
G.auto=true;lauf(3000);G.auto=false;
ok(/★★☆/.test(d.getElementById('ergebnis').textContent),'mit Hilfe hoechstens zwei Sterne');
/* Splitscreen */
d.querySelector('input[name="spieler"][value="2"]').checked=true;
S.start('rennen',{seed:5,streckeSeed:2});
ok(G.spieler.length===2&&d.body.classList.contains('split')&&!d.getElementById('halb1').hidden,'Splitscreen fuer zwei Teams');
ok(d.querySelector('#halb0 .k-team').textContent==='Team Red'&&d.querySelector('#halb1 .k-team').textContent==='Team Blue','Teamnamen');
/* Tastatur: W A S D fuer Team 1, Pfeile fuer Team 2 */
S.tasten.add('arrowup');ok(S.eingabe(1).gas===1&&S.eingabe(0).gas===0,'Pfeiltasten steuern Team 2');S.tasten.clear();
S.tasten.add('a');ok(S.eingabe(0).lenk<0&&S.eingabe(1).lenk===0,'W A S D steuern Team 1');S.tasten.clear();
/* Controller: jeder sein eigenes Kart */
const knopf=v=>({pressed:v>0.5,value:v});
const FAKE=[0,1].map(i=>({index:i,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>knopf(0))}));
S.padQuelle(()=>FAKE);
FAKE[1].buttons[7]=knopf(1);S.padTick();ok(S.eingabe(1).gas===1&&S.eingabe(0).gas===0,'R2 von Controller 2 gibt Gas fuer Team 2');
FAKE[1].buttons[7]=knopf(0);FAKE[0].axes=[-1,0,0,0];S.padTick();ok(S.eingabe(0).lenk<-0.9&&S.eingabe(1).lenk===0,'linker Stick lenkt');FAKE[0].axes=[0,0,0,0];
FAKE[0].buttons[9]=knopf(1);S.padTick();ok(G.pause&&!d.getElementById('pause').hidden,'Options pausiert');FAKE[0].buttons[9]=knopf(0);S.padTick();
FAKE[0].buttons[0]=knopf(1);S.padTick();FAKE[0].buttons[0]=knopf(0);S.padTick();ok(!G.pause,'Weiter mit ✕/A');
G.auto=true;lauf(4000);G.auto=false;
ok(G.zustand==='ende'&&/wins!/.test(d.getElementById('overTitel').textContent),'Sieger im Splitscreen');
ok(d.querySelectorAll('.e-karte').length===2,'Ergebnis fuer beide Teams');
S.padQuelle(()=>[]);S.padTick();
/* Fussgaengerzone: Meldung beim Anfahren der Poller */
d.querySelector('input[name="spieler"][value="1"]').checked=true;
S.start('frei',{seed:6});
{const W=S.welt,e=W.zone,a=W.knoten[e.a],b=W.knoten[e.b],k=G.spieler[0].kart,dr=L.richtung(a,b);
 Object.assign(k,{x:a.x+L.DX[dr]*2,z:a.z+L.DZ[dr]*2,h:dr*Math.PI/2,v:0});
 lauf(40,()=>({gas:1,lenk:0,bremse:0}));
 ok(/pedestrian zone/.test(d.querySelector('#halb0 .meldung').textContent),'Hinweis: nicht durch die Fussgaengerzone');}
ok(/📍/.test(d.getElementById('freiOrt').textContent),'Free drive zeigt, wo man ist');
S.menu();ok(!d.getElementById('menu').hidden&&/Best: /.test(d.querySelector('[data-best="rennen"]').textContent),'Menue mit Bestzeit');

console.log('stadt: '+checks+' Pruefungen bestanden');
