/* Drucken, was ausgewaehlt ist.

   Der Fehler, gegen den dieser Test steht: Ein zugeklappter Abschnitt
   druckt nichts - richtig so, sonst kaeme bei jedem Ausdruck der ganze
   Jahrgang mit. Wer aber Vokabeln anhakte, ohne die Abschnitte zu
   oeffnen, bekam ein leeres Blatt: 99 angehakte Vokabeln, 16
   zugeklappte Abschnitte, null Zeilen auf dem Papier. Erst der Umweg
   ueber "Auswahl ansehen" klappte sie auf.

   Geprueft wird deshalb beides: dass die Auswahl beim Drucken von
   selbst aufgeht, und dass die Liste danach wieder so dasteht wie
   vorher. Das Zweite geht beim Umbauen leicht verloren - und dann
   findet man nach jedem Ausdruck alle sechzehn Abschnitte offen. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function liste(folder){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window; w.scrollTo=()=>{};
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},
    addListener(){},removeListener(){}});
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  vm.runInContext("S.view='list';render();",c);
  return {w,d:w.document,lauf:s=>vm.runInContext(s,c)};
}

const s=liste('year8');
const abschnitte=()=>[...s.d.querySelectorAll('[data-sec]')];
const offen=()=>abschnitte().filter(a=>a.open).length;
const gezeigt=()=>[...s.d.querySelectorAll('.vrow')]
  .filter(r=>!r.classList.contains('selection-hidden')&&!r.classList.contains('off')).length;
const angehakt=()=>s.d.querySelectorAll('.csv-check input:checked').length;
const drucken=art=>s.w.dispatchEvent(new s.w.Event(art));

/* ---- Ausgangslage: ein Abschnitt von Hand geoeffnet ---- */
abschnitte()[3].open=true;
const alleZeilen=s.d.querySelectorAll('.vrow').length;
assert.ok(alleZeilen>100,'zu wenige Zeilen fuer diesen Test');
assert.equal(offen(),1);

/* ---- Auswahl treffen, ohne einen Abschnitt zu oeffnen ---- */
[...s.d.querySelectorAll('button')].find(b=>/Vokabeln auswählen/.test(b.textContent)).click();
const kopf=s.d.querySelector('.selection-unit input[type=checkbox]');
assert.ok(kopf,'keine Unit-Ueberschrift zum Anhaken gefunden');
kopf.checked=true; kopf.dispatchEvent(new s.w.Event('change',{bubbles:true}));
const gewaehlt=angehakt();
assert.ok(gewaehlt>0,'nichts angehakt');
assert.equal(offen(),1,'das Anhaken klappt schon von selbst Abschnitte auf');
assert.equal(gezeigt(),alleZeilen,'am Bildschirm bleibt die ganze Liste stehen');

/* ---- Und jetzt drucken, ohne "Auswahl ansehen" ---- */
drucken('beforeprint');
assert.equal(gezeigt(),gewaehlt,
  'im Druck stehen '+gezeigt()+' Zeilen auf dem Blatt, ausgewaehlt sind '+gewaehlt);
const mitAuswahl=abschnitte().filter(a=>
  [...a.querySelectorAll('[data-csv-key]')].some(i=>i.closest('.vrow')
    && !i.closest('.vrow').classList.contains('selection-hidden')));
assert.ok(mitAuswahl.length>0,'kein Abschnitt traegt die Auswahl');
for(const a of mitAuswahl)
  assert.equal(a.open,true,'ein Abschnitt mit Auswahl bleibt zu und druckt nichts');

/* ---- Danach steht die Liste wieder, wie sie stand ---- */
drucken('afterprint');
assert.equal(gezeigt(),alleZeilen,'nach dem Druck fehlen Zeilen am Bildschirm');
assert.equal(offen(),1,'nach dem Druck stehen '+offen()+' Abschnitte offen statt einer');
assert.equal(abschnitte()[3].open,true,'der von Hand geoeffnete Abschnitt ist zu');
assert.equal(angehakt(),gewaehlt,'die Auswahl selbst hat sich geaendert');
assert.match(s.d.getElementById('selectionReview').textContent,/Auswahl ansehen/,
  'der Knopf steht auf Ansehen, obwohl nur gedruckt wurde');

/* ---- Ohne Auswahl aendert der Druck nichts ---- */
{
  const t=liste('year8');
  const ab=[...t.d.querySelectorAll('[data-sec]')];
  ab[0].open=true;
  const vorher=ab.map(a=>a.open);
  t.w.dispatchEvent(new t.w.Event('beforeprint'));
  assert.deepEqual(ab.map(a=>a.open),vorher,
    'ohne Auswahl klappt der Druck Abschnitte auf - dann kommt der ganze Jahrgang mit');
  assert.equal([...t.d.querySelectorAll('.vrow.selection-hidden')].length,0,
    'ohne Auswahl werden Zeilen ausgeblendet');
}

console.log('Auswahl drucken: '+gewaehlt+' angehakte Vokabeln gehen von selbst aufs Blatt, die Liste steht danach wie zuvor');
