/* Die Uebung auf dem Telefon: aufgeraeumte Runde und eigenes Tastenfeld.
   Geprueft wird die Logik, nicht die Darstellung - jsdom rechnet kein
   Layout. Die Masse sind im Browser gemessen, hier geht es darum, dass
   das Tastenfeld entsteht, die richtige Belegung traegt, wieder
   verschwindet und den Desktop in Ruhe laesst. */
const {JSDOM, VirtualConsole}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder, breite, alsApp, speicher){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  /* jsdom kann kein Canvas und meldet das lautstark. Die Schreibmarke
     faellt dann auf ihre Schaetzung zurueck - erwartet, kein Fehler. */
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window;w.scrollTo=()=>{};
  if(alsApp) Object.defineProperty(w.navigator,'standalone',{get:()=>true,configurable:true});
  if(speicher) for(const [k,v] of Object.entries(speicher)) w.localStorage.setItem(k,v);
  /* jsdom kennt matchMedia nicht - die Breite entscheidet. */
  w.matchMedia=q=>({matches:/max-width:620px/.test(q)?breite<=620:false,
    media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  return {w,d:w.document,lauf:code=>vm.runInContext(code,c)};
}

function inRunde(s){
  s.d.querySelector('#practiceAcross').click();
  [...s.d.querySelectorAll('#view button')].find(b=>/Alles üben/.test(b.textContent)).click();
}
const modus=(s,name)=>[...s.d.querySelectorAll('button')].find(b=>b.textContent.trim()===name).click();

/* Vom Startbildschirm gestartet gelten eigene Masse - und nur dort.
   Im Browser darf die Klasse nicht auftauchen, sonst waendern sich
   Abstaende und Tastenhoehe fuer alle. */
{
  const browser=seite('year5',390);
  inRunde(browser); modus(browser,'Tippen');
  assert.ok(!browser.d.body.classList.contains('eb-app'),
    'Browser gilt faelschlich als App');

  const app=seite('year5',390,true);
  inRunde(app); modus(app,'Tippen');
  assert.ok(app.d.body.classList.contains('eb-app'),
    'Start vom Startbildschirm nicht erkannt');
  /* Die Karte fuellt in der App den freien Platz, indem sie dem
     abgefragten Wort Abstand darueber gibt. Beim Tippen heisst dieses
     Wort prompt, beim Lueckensatz cloze - findet die Karte es nicht,
     bleibt der Platz leer, ohne dass etwas auffaellt. */
  for(const art of ['Tippen','Lückensatz']){
    modus(app,art);
    assert.ok(app.d.querySelector('.vcard .prompt, .vcard .cloze'),
      art+': die Karte findet ihr Wort nicht');
  }
  console.log('App-Erkennung: nur vom Startbildschirm, nicht im Browser');
}

/* Kein Zoom durch Doppeltippen, solange getippt wird. Wo genau ein
   Finger landet, weiss nur ein Browser mit Layout - hier steht nur,
   dass die Regel nicht aus dem Blatt verschwindet. Dass der Griff
   zwischen zwei Tasten der naechsten zugeschlagen wird, ist im Browser
   gemessen. */
{
  const blatt=fs.readFileSync(path.join(root,'assets/learning.css'),'utf8');
  assert.match(blatt,/body\.eb-tippen[^{]*\{touch-action:manipulation\}/,
    'die Regel gegen den Doppeltipp-Zoom fehlt');
  const skript=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8');
  assert.match(skript,/function naechsteTaste/,
    'der Griff neben die Taste wird nicht aufgefangen');
  console.log('Tastenfeld: kein Doppeltipp-Zoom, Griff daneben zählt');
}

/* Die Geometrie von iOS gilt jetzt immer - der Probeschalter, mit dem
   sie am Geraet verglichen wurde, ist fort. Bleibt er versehentlich
   stehen, sieht jeder Schueler eine Schaltflaeche, die ihn nichts
   angeht. */
{
  const blatt=fs.readFileSync(path.join(root,'assets/learning.css'),'utf8');
  assert.match(blatt,/body\.eb-tippen \.eb-tasten\{--tk:45px/,
    'die iOS-Geometrie gilt nicht mehr fuer jedes Tastenfeld');
  assert.equal(/eb-ios|tastenprobe/.test(blatt),false,
    'im Blatt steht noch etwas vom Probeschalter');
  const skript=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8');
  assert.equal(/iosProbe|tastenprobe/.test(skript),false,
    'im Skript steht noch etwas vom Probeschalter');
  const t=seite('year5',390,true,{'vt:tastenprobe':'ios'});
  inRunde(t); modus(t,'Tippen');
  assert.equal(t.d.querySelector('#tastenprobe'),null,'Probeknopf steht noch da');
  /* Unterste Reihe in der Reihenfolge von iOS: 123 ganz links, dann
     der Sprachwechsel - und keine fuenfte Taste mehr. */
  const unten=[...t.d.querySelectorAll('.eb-tasten .tr:last-child .tk')]
    .map(b=>b.dataset.k);
  assert.deepEqual(unten,['⌘','⇄',' ','⏎'],
    'die unterste Reihe steht nicht in der Reihenfolge von iOS');
  console.log('Tastenfeld: iOS-Geometrie fest, kein Probeschalter mehr');
}

/* Die Blitzrunde hat ihr eigenes Eingabefeld und ihre eigene Ansicht.
   Sie blieb dadurch als einzige bei der Systemtastatur. */
{
  const t=seite('year5',390);
  t.d.querySelector('#practiceAcross').click();
  [...t.d.querySelectorAll('#view button')].find(b=>/Blitz/i.test(b.textContent)).click();
  assert.equal(t.lauf('S.view'),'pvblitz','Blitzrunde startet nicht');
  const feld=t.d.getElementById('pvTypeIn');
  assert.ok(feld,'Blitzrunde: kein Eingabefeld');
  assert.ok(feld.hasAttribute('readonly'),'Blitzrunde: Systemtastatur nicht unterdrueckt');
  const feldchen=t.d.querySelector('.eb-tasten');
  assert.ok(feldchen,'Blitzrunde: kein Tastenfeld');
  assert.equal(feldchen.dataset.sprache,'en','Blitzrunde: es wird immer englisch geantwortet');
  assert.equal(t.d.body.dataset.ebAntwort,'offen',
    'Blitzrunde: die Seite gibt den Platz des Tastenfelds frei');

  const tippe=k=>feldchen.querySelector('.tk[data-k="'+k+'"]')
    .dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));
  'cat'.split('').forEach(tippe);
  assert.equal(feld.value,'cat','Blitzrunde: Eingabe kommt nicht an');
  const vorher=t.lauf('S.pv.i');
  tippe('\u23ce');
  assert.equal(t.lauf('S.pv.i'),vorher+1,
    'Blitzrunde: die Prüfen-Taste bringt kein neues Wort');
  assert.ok(t.d.querySelector('.eb-tasten'),'Blitzrunde: Tastenfeld verschwindet nach dem Prüfen');
  console.log('Blitzrunde: eigenes Tastenfeld, englische Belegung, Prüfen-Taste');
}

for(const folder of ['year5','year9','oberstufe','bili/history']){
  /* ---- Telefon ---- */
  const t=seite(folder,390);
  inRunde(t); modus(t,'Tippen');
  const feld=t.d.getElementById('typeIn');
  assert.ok(feld,folder+': kein Eingabefeld');
  assert.ok(t.d.body.classList.contains('eb-runde'),folder+': Runde nicht aufgeraeumt');
  assert.ok(t.d.body.classList.contains('eb-tippen'),folder+': Tastenfeld nicht aktiv');
  assert.ok(feld.hasAttribute('readonly'),folder+': Systemtastatur nicht unterdrueckt');

  /* Die Schreibmarke sitzt am Ende des Getippten; solange nichts
     dasteht, weicht der blasse Hinweis zur Seite. */
  const kasten=t.d.querySelector('.typebox');
  assert.ok(kasten.classList.contains('leer'),folder+': leeres Feld nicht erkannt');

  const feldchen=t.d.querySelector('.eb-tasten');
  assert.ok(feldchen,folder+': Tastenfeld fehlt');
  assert.equal(feldchen.dataset.sprache,'en',folder+': falsche Belegung bei DE -> EN');
  assert.ok(feldchen.querySelector('.tk.senden'),folder+': keine Pruefen-Taste');
  assert.ok(feldchen.querySelector('.tk.sprache'),folder+': kein Belegungswechsel');

  /* Tippen ueber die eigenen Tasten landet im Feld. */
  const tippe=k=>feldchen.querySelector('.tk[data-k="'+k+'"]')
    .dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));
  'cat'.split('').forEach(tippe);
  assert.equal(feld.value,'cat',folder+': Eingabe kommt nicht an');
  assert.ok(!kasten.classList.contains('leer'),folder+': Feld gilt noch als leer');
  assert.ok(parseFloat(kasten.style.getPropertyValue('--eb-marke-x'))>0,
    folder+': Schreibmarke wandert nicht mit');
  tippe('⌫');
  assert.equal(feld.value,'ca',folder+': Ruecktaste wirkt nicht');

  /* Zweite Ebene: Ziffern und Satzzeichen. Das Fragezeichen gehoert zum
     Lueckensatz, es darf nicht am Tastenfeld scheitern. */
  tippe('⌘');
  const zweite=t.d.querySelector('.eb-tasten');
  assert.equal(zweite.dataset.ebene,'zeichen',folder+': keine Zeichenebene');
  for(const z of ['?','!','.',',','-','1']) assert.ok(
    zweite.querySelector('.tk[data-k="'+z+'"]'),folder+': Zeichen fehlt: '+z);
  zweite.querySelector('.tk[data-k=\'"\']')
    .dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));
  assert.equal(feld.value,'ca"',folder+': Anfuehrungszeichen kommt nicht an');
  zweite.querySelector('.tk.ebene').dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));
  assert.equal(t.d.querySelector('.eb-tasten').dataset.ebene,'buchstaben',
    folder+': kein Weg zurueck zu den Buchstaben');
  feld.value='ca';

  /* Alle vier Uebungsarten stehen nebeneinander, mit kurzer
     Beschriftung - eine halb sichtbare sieht aus wie ein Fehler. */
  const modi=[...t.d.querySelectorAll('.sessionbar .switches .switch[data-mode]')];
  assert.equal(modi.length,4,folder+': nicht alle Uebungsarten in der Zeile');
  assert.equal(t.d.querySelector('.sessionbar .switches #dirBtn'),null,
    folder+': Richtungsschalter steht noch in der Schalterzeile');
  assert.ok(t.d.querySelector('.round-progress #dirBtn'),
    folder+': Richtungsschalter nicht in die Fortschrittszeile gewandert');

  /* Tippen muss sofort gehen - ohne vorher ins Feld zu tippen. */
  assert.equal(t.d.activeElement.id,'typeIn',folder+': Eingabefeld nicht bereit');

  /* Zurueck ist der einzige Ausgang und muss als Knopf erkennbar sein. */
  assert.ok(t.d.getElementById('back'),folder+': kein Zurueck');

  /* Andere Richtung, andere Belegung. */
  t.d.getElementById('dirBtn').click();
  const jetzt=t.d.querySelector('.eb-tasten');
  assert.equal(jetzt.dataset.sprache,'de',folder+': Belegung folgt der Richtung nicht');
  assert.ok(jetzt.textContent.includes('ü'),folder+': keine Umlaute in der deutschen Belegung');

  /* Karteikarte braucht kein Tastenfeld. */
  modus(t,'Karteikarte');
  assert.equal(t.d.querySelector('.eb-tasten'),null,folder+': Tastenfeld bleibt bei Karteikarte');

  /* Zurueck zur Uebersicht raeumt auf. */
  t.d.getElementById('back').click();
  assert.ok(!t.d.body.classList.contains('eb-runde'),folder+': Runde nicht beendet');
  assert.equal(t.d.querySelector('.eb-tasten'),null,folder+': Tastenfeld bleibt nach der Runde');

  /* ---- Rechner: nichts davon ---- */
  const r=seite(folder,1280);
  inRunde(r); modus(r,'Tippen');
  assert.equal(r.d.querySelector('.eb-tasten'),null,folder+': Tastenfeld auch am Rechner');
  assert.ok(!r.d.body.classList.contains('eb-runde'),folder+': Rechner wird aufgeraeumt');
  assert.ok(!r.d.getElementById('typeIn').hasAttribute('readonly'),
    folder+': Eingabefeld am Rechner gesperrt');

  console.log(folder+': Tastenfeld, Belegung, Rückzug und Rechner passen');
}

/* Zwei gehaltene Tasten. Beide brauchen echte Zeit, deshalb laeuft
   dieser Teil asynchron - der Rest der Datei ist da schon durch. */
(async () => {
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const t = seite('year5', 390);
  inRunde(t); modus(t, 'Tippen');
  const box = t.d.querySelector('.eb-tasten');
  const feld = t.d.getElementById('typeIn');
  const kasten = feld.closest('.typebox');
  const marke = () => kasten.style.getPropertyValue('--eb-marke-x');
  const druck = (k, x) => box.querySelector('.tk[data-k="' + k + '"]')
    .dispatchEvent(new t.w.MouseEvent('pointerdown', {bubbles:true, clientX:x || 0}));

  /* Die Ruecktaste: ein Tipp nimmt einen Buchstaben, gehalten raeumt
     sie die ganze Zeile. */
  'cat'.split('').forEach(k => druck(k));
  assert.equal(feld.value, 'cat', 'Eingabe kommt nicht an');
  druck('⌫');
  assert.equal(feld.value, 'ca', 'der Tipp auf die Ruecktaste nimmt keinen Buchstaben');
  await warte(700);
  assert.equal(feld.value, '', 'die gehaltene Ruecktaste raeumt die Zeile nicht');
  box.dispatchEvent(new t.w.Event('pointerup', {bubbles:true}));

  /* Die Leertaste: ein Tipp setzt ein Leerzeichen, gehalten wird das
     Tastenfeld zum Schiebefeld - das Leerzeichen kommt zurueck und der
     Finger zieht die Schreibmarke. */
  'cat'.split('').forEach(k => druck(k));
  druck(' ', 200);
  assert.equal(feld.value, 'cat ', 'der Tipp auf die Leertaste setzt kein Leerzeichen');
  await warte(500);
  assert.equal(feld.value, 'cat', 'das Halten nimmt das Leerzeichen nicht zurueck');
  assert.equal(box.dataset.schieben, 'an', 'das Tastenfeld wird nicht zum Schiebefeld');
  assert.ok(parseFloat(marke()) > 0, 'die Schreibmarke steht nicht hinter dem Wort');
  /* Ein Zeichen ist hier rund zwoelf Punkte breit - 60 nach links sind
     also weiter als das ganze Wort, die Marke landet davor. */
  box.dispatchEvent(new t.w.MouseEvent('pointermove', {bubbles:true, clientX:140}));
  assert.equal(parseFloat(marke()), 0, 'die Schreibmarke wandert nicht mit dem Finger');
  box.dispatchEvent(new t.w.MouseEvent('pointermove', {bubbles:true, clientX:188}));
  assert.ok(parseFloat(marke()) > 0 && parseFloat(marke()) < 36,
    'die Schreibmarke haelt nicht zwischen den Buchstaben');
  box.dispatchEvent(new t.w.MouseEvent('pointermove', {bubbles:true, clientX:140}));
  box.dispatchEvent(new t.w.Event('pointerup', {bubbles:true}));
  assert.ok(!box.dataset.schieben, 'das Schiebefeld bleibt nach dem Loslassen stehen');

  /* Und jetzt wird vorn eingefuegt, nicht hinten angehaengt. */
  druck('s');
  assert.equal(feld.value, 'scat', 'der Buchstabe landet nicht an der Schreibstelle');
  druck('⌫');
  assert.equal(feld.value, 'cat', 'die Ruecktaste loescht nicht an der Schreibstelle');
  box.dispatchEvent(new t.w.Event('pointerup', {bubbles:true}));
  console.log('Gehaltene Tasten: Zeile leeren, Schreibmarke schieben');
})();
