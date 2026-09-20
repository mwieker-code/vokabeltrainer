/* Die Uebung auf dem Telefon: aufgeraeumte Runde und eigenes Tastenfeld.
   Geprueft wird die Logik, nicht die Darstellung - jsdom rechnet kein
   Layout. Die Masse sind im Browser gemessen, hier geht es darum, dass
   das Tastenfeld entsteht, die richtige Belegung traegt, wieder
   verschwindet und den Desktop in Ruhe laesst. */
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder, breite){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'});
  const w=dom.window;w.scrollTo=()=>{};
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

for(const folder of ['year5','year9','oberstufe','bili/history']){
  /* ---- Telefon ---- */
  const t=seite(folder,390);
  inRunde(t); modus(t,'Tippen');
  const feld=t.d.getElementById('typeIn');
  assert.ok(feld,folder+': kein Eingabefeld');
  assert.ok(t.d.body.classList.contains('eb-runde'),folder+': Runde nicht aufgeraeumt');
  assert.ok(t.d.body.classList.contains('eb-tippen'),folder+': Tastenfeld nicht aktiv');
  assert.ok(feld.hasAttribute('readonly'),folder+': Systemtastatur nicht unterdrueckt');

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
  tippe('⌫');
  assert.equal(feld.value,'ca',folder+': Ruecktaste wirkt nicht');

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
