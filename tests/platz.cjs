/* Platz fuer die Eingabe.

   Der Fehler, gegen den dieser Test steht: Am Rechner endete das
   Eingabefeld unter dem Fensterrand. Die Seite ist beim Tippen 1273
   Punkte hoch, ein MacBook Air zeigt 900 - das Feld endete bei 983.
   Wer tippen wollte, musste erst scrollen.

   jsdom rechnet kein Layout: Jede Kante liegt dort bei null. Die
   Masse stehen deshalb im Browser gemessen im Quelltext, hier wird
   geprueft, was ohne Layout zu pruefen ist - dass die Kaskade
   ueberhaupt anspringt, dass sie am Telefon die Finger davon laesst,
   dass sie hinter sich aufraeumt, und dass die drei Schwellen
   zueinander passen. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
/* Die Kaskade horcht auf Fenster und Bilder. Bleiben die Fenster
   offen, haelt der Zeitgeber den Prozess am Leben und der Test
   endet nie - obwohl er bestanden hat. */
const fenster=[];

function seite(breite){
  const html=fs.readFileSync(path.join(root,'year6/index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/year6/'});
  const w=dom.window; w.scrollTo=()=>{};
  /* jsdom bringt weder Bilder noch eine Leinwand mit - beides braucht
     der Berg. Dieselben Behelfe wie in tests/ascent.cjs. */
  w.requestAnimationFrame=f=>w.setTimeout(()=>f(Date.now()),0);
  w.cancelAnimationFrame=w.clearTimeout.bind(w);
  w.HTMLCanvasElement.prototype.getContext=()=>({measureText:()=>({width:10})});
  /* Die eine Abfrage, an der die Kaskade haengt. */
  w.matchMedia=q=>({matches:/min-width:621px/.test(q)?breite>=621
                          :/max-width:620px/.test(q)?breite<=620:false,
    media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/ascent.js'),'utf8'),c);
  /* Nicht eine feste Frist abwarten: Die Tests laufen nebeneinander,
     unter Last kommt die Kaskade spaeter dazu, und der Test schlug
     dann zufaellig fehl. Gewartet wird auf die Bedingung selbst. */
  const bis=async(pruefen,text)=>{
    for(let i=0;i<400;i++){
      if(pruefen()) return;
      await new Promise(r=>setTimeout(r,25));
    }
    assert.fail(text);
  };
  const ruhen=()=>new Promise(r=>setTimeout(r,250));
  fenster.push(w);
  return {w,d:w.document,lauf:s=>vm.runInContext(s,c),ruhen,bis};
}

(async()=>{
/* ---- Am Rechner: die Kaskade springt an ---- */
{
  const s=seite(1440);
  s.d.querySelector('[data-topic]').click();
  s.d.querySelector('[data-scope="all"]').click();
  s.lauf("S.mode='type';buildQueue();render();");
  assert.ok(s.d.body.classList.contains('ascent-active'),'keine Tipprunde');
  await s.bis(()=>s.d.body.classList.contains('platz-frei'),
    'die erste Stufe bleibt aus - Fusspolster und Mindesthoehe der Karte '
    +'stehen dann weiter im Weg');
  const berg=s.d.querySelector('.ascent-panel');
  assert.ok(berg,'kein Berg');
  await s.bis(()=>/^\d+px$/.test(berg.style.maxWidth),
    'der Berg bekommt keine Breite zugewiesen - er passt sich dann nicht an');

  /* ---- Und raeumt hinter sich auf ---- */
  s.lauf("S.view='home';render();");
  await s.bis(()=>['platz-frei','platz-fach','platz-kopf','platz-karte']
      .every(k=>!s.d.body.classList.contains(k)),
    'die Stufen bleiben nach der Runde stehen - die Uebersicht erbt dann die knappe Fassung');
  const fach=s.d.querySelector('.box-details');
  if(fach) assert.equal(fach.open,true,'die Lernfaecher bleiben nach der Runde zu');
}

/* ---- Am Telefon bleibt alles, wie es ist ----
   Dort ist die Kopfzeile in der Runde ohnehin fort und der Berg misst
   sich am Tastenfeld. Griffe die Kaskade auch dort zu, kaemen sich
   zwei Rechnungen in die Quere. */
{
  const s=seite(390);
  s.d.querySelector('[data-topic]').click();
  s.d.querySelector('[data-scope="all"]').click();
  s.lauf("S.mode='type';buildQueue();render();");
  await s.ruhen();
  for(const k of ['platz-frei','platz-fach','platz-kopf','platz-karte'])
    assert.ok(!s.d.body.classList.contains(k),k+' greift am Telefon');
  const berg=s.d.querySelector('.ascent-panel');
  if(berg) assert.equal(berg.style.maxWidth,'',
    'am Telefon bekommt der Berg eine Breite aufgezwungen');
}

/* ---- Die drei Schwellen passen zueinander ---- */
{
  const js=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8');
  const zahl=n=>Number((new RegExp('const '+n+'\\s*=\\s*(\\d+)').exec(js)||[])[1]);
  const min=zahl('PLATZ_MIN'), wunsch=zahl('PLATZ_WUNSCH'), max=zahl('PLATZ_MAX');
  assert.ok(min&&wunsch&&max,'die Schwellen stehen nicht mehr da, wo dieser Test sie sucht');
  assert.ok(min<wunsch&&wunsch<=max,
    'MIN '+min+' < WUNSCH '+wunsch+' <= MAX '+max+' gilt nicht - '
    +'die Kaskade laeuft dann bis zur letzten Stufe durch oder gar nicht an');
  /* Unter 300 Punkten Breite bricht die Zeile unter dem Berg um. */
  assert.ok(Math.round(min*380/180)>=300,'der Berg darf schmaler werden als 300 Punkte');
}

/* ---- Jede Stufe hat auch Regeln ---- */
{
  const css=fs.readFileSync(path.join(root,'assets/learning.css'),'utf8');
  for(const k of ['platz-frei','platz-fach','platz-kopf','platz-karte'])
    assert.ok(css.includes('body.'+k+' '),'keine Regel fuer '+k+' - die Stufe tut dann nichts');
  assert.match(css,/body\.platz-frei \.vcard\{min-height:0\}/,
    'die Mindesthoehe der Karte bleibt stehen - 90 Punkte leerer Boden');
}

/* ---- Die Startseite bringt ihre Kacheln ins Fenster ---- */
{
  const css=fs.readFileSync(path.join(root,'assets/menu-preview.css'),'utf8');
  const m=/#cards \.card\{min-height:clamp\((\d+)px,([\d.]+)vh,(\d+)px\)/.exec(css);
  assert.ok(m,'die Kachelhoehe waechst nicht mit dem Fenster');
  assert.equal(Number(m[3]),185,'die Kachel ist auf grossen Bildschirmen nicht mehr so hoch wie bisher');
  assert.ok(Number(m[1])<Number(m[3]),'die Kachel kann nicht kleiner werden');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/menu-preview\.css\?v=\d{8}-[a-z]+/,'die Startseite laedt die Datei ohne Marke');
}

for(const w of fenster) w.close();
console.log('Platz: Kaskade greift am Rechner, laesst das Telefon in Ruhe, raeumt auf; Kacheln wachsen mit');
})();
