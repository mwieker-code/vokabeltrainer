/* Die Rueckmeldetoene.

   Der Fehler, gegen den dieser Test steht: Sie waren aus, bis jemand
   sie einschaltet - und der einzige Schalter steht ganz unten auf der
   Seite, hinter der Karte, dem Tastenfeld und der Fusszeile. Ein Kind
   findet ihn nicht und erfaehrt nie, dass es ihn gibt.

   Geprueft wird deshalb beides: dass sie ohne Zutun klingen, und dass
   eine ausdrueckliche Abschaltung stehen bleibt. Das zweite ist der
   Teil, der beim Umstellen leicht verlorengeht. */
const {JSDOM}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const quelle=fs.readFileSync(path.join(root,'assets/feedback.js'),'utf8');

function starten(gespeichert){
  const dom=new JSDOM('<!doctype html><div class="wrap"></div>',
    {url:'https://example.org/',runScripts:'outside-only'});
  const w=dom.window;
  if(gespeichert!==undefined) w.localStorage.setItem('vt:feedback:v1',gespeichert);
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){}});
  vm.runInContext(quelle,dom.getInternalVMContext());
  const knopf=k=>w.document.querySelector('[data-feedback-pref="'+k+'"]');
  return {w,knopf,text:k=>knopf(k).textContent};
}

/* Ohne gespeicherte Wahl: Ton an. */
{
  const t=starten();
  assert.equal(t.text('sound'),'Töne: an','frisch im Browser sind die Töne aus');
  assert.equal(t.text('animation'),'Animationen: an','frisch im Browser sind die Animationen aus');
  console.log('frischer Browser: Töne an, Animationen an');
}

/* Wer sie abschaltet, behaelt das - auch ueber das Neuladen hinweg. */
{
  const t=starten('{"sound":false,"animation":true}');
  assert.equal(t.text('sound'),'Töne: aus','die Abschaltung wird übergangen');
  console.log('ausdrücklich abgeschaltet: bleibt aus');
}
{
  const t=starten('{"sound":true,"animation":false}');
  assert.equal(t.text('sound'),'Töne: an');
  assert.equal(t.text('animation'),'Animationen: aus','die Abschaltung der Animationen wird übergangen');
  console.log('Animationen getrennt abschaltbar');
}

/* Ein Klick schaltet um und legt die Wahl ab. */
{
  const t=starten();
  t.knopf('sound').click();
  assert.equal(t.text('sound'),'Töne: aus','der Schalter wirkt nicht');
  const abgelegt=JSON.parse(t.w.localStorage.getItem('vt:feedback:v1'));
  assert.equal(abgelegt.sound,false,'die Wahl wird nicht gespeichert');
  console.log('Schalter wirkt und merkt sich die Wahl');
}

/* Kaputtes oder fremdes Gespeichertes darf nicht zum Verstummen fuehren. */
for(const müll of ['','null','{}','nicht json','[1,2,3]']){
  const t=starten(müll);
  assert.equal(t.text('sound'),'Töne: an','unbrauchbarer Speicherstand schaltet die Töne ab: '+JSON.stringify(müll));
}
console.log('unbrauchbarer Speicherstand: Töne bleiben an');
