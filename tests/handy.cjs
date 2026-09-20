/* Die Uebung auf dem Telefon: aufgeraeumte Runde und eigenes Tastenfeld.
   Geprueft wird die Logik, nicht die Darstellung - jsdom rechnet kein
   Layout. Die Masse sind im Browser gemessen, hier geht es darum, dass
   das Tastenfeld entsteht, die richtige Belegung traegt, wieder
   verschwindet und den Desktop in Ruhe laesst. */
const {JSDOM, VirtualConsole}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder, breite, alsApp){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  /* jsdom kann kein Canvas und meldet das lautstark. Die Schreibmarke
     faellt dann auf ihre Schaetzung zurueck - erwartet, kein Fehler. */
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window;w.scrollTo=()=>{};
  if(alsApp) Object.defineProperty(w.navigator,'standalone',{get:()=>true,configurable:true});
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
