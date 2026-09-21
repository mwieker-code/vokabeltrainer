/* Zelt und Menue in der Kopfzeile.

   Der Fehler, gegen den dieser Test steht: Anleitung und Woerterbuch
   lagen nur auf dem Startmenue. Wer eine Runde begonnen hatte, kam an
   beide nicht mehr heran, ohne die Runde zu verlassen. Das Menue macht
   sie in jeder Ansicht erreichbar - und nimmt die Knoepfe aus dem
   Seitenfuss mit hinein.

   Geprueft wird, was beim Umbauen leicht kaputtgeht: dass die Knoepfe
   wirklich umziehen statt abgeschrieben zu werden (sonst haengen zwei
   Abschriften an einem Handgriff), dass das Zelt die Tiefe der Seite
   trifft, und dass ein Richtungswechsel mitten in der Runde die
   Warteschlange neu baut - ohne das zeigt die Karte das alte Wort in
   der neuen Richtung. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

const SEITEN=['year5','year6','year7','year8','year9','year10','oberstufe','bili/history'];

function seite(folder){
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
  return {w,d:w.document,lauf:code=>vm.runInContext(code,c)};
}
const posten=(s,name)=>s.d.querySelector('[data-menue="'+name+'"]');
const oeffnen=s=>s.d.getElementById('menueKnopf').click();

for(const folder of SEITEN){
  const s=seite(folder);

  /* ---- Das Zelt fuehrt zur Startseite ---- */
  const zelt=s.d.querySelector('.brand-link');
  assert.ok(zelt,folder+': Zelt ist kein Verweis');
  assert.equal(zelt.getAttribute('href'),
    s.d.querySelector('.home-link').getAttribute('href'),
    folder+': Zelt zeigt woanders hin als der Weg daneben');
  assert.ok(zelt.querySelector('.brandmark'),folder+': Zelt ohne Bildmarke');
  assert.ok(zelt.getAttribute('aria-label'),folder+': Zelt ohne Beschriftung');

  /* ---- Das Blatt haengt geschlossen an der Kopfzeile ---- */
  const knopf=s.d.getElementById('menueKnopf'), blatt=s.d.getElementById('menueBlatt');
  assert.ok(knopf&&blatt,folder+': kein Menue');
  assert.ok(s.d.querySelector('.masthead').contains(knopf),folder+': Menue nicht in der Kopfzeile');
  assert.equal(blatt.hidden,true,folder+': Menue steht von selbst offen');
  assert.equal(knopf.getAttribute('aria-expanded'),'false',folder);
  oeffnen(s);
  assert.equal(blatt.hidden,false,folder+': Menue oeffnet nicht');
  assert.equal(knopf.getAttribute('aria-expanded'),'true',folder);

  /* ---- Die Knoepfe aus dem Fuss sind umgezogen, nicht abgeschrieben ---- */
  for(const id of ['exportBtn','importBtn']){
    const alle=s.d.querySelectorAll('#'+id);
    assert.equal(alle.length,1,folder+': '+id+' gibt es '+alle.length+' mal');
    assert.ok(blatt.contains(alle[0]),folder+': '+id+' steckt nicht im Menue');
  }
  assert.equal(s.d.querySelectorAll('.foot-actions').length,0,
    folder+': leere Huelle im Seitenfuss geblieben');
  /* Der verborgene Dateiwaehler gehoert zum Laden und muss bleiben. */
  assert.ok(s.d.getElementById('importFile'),folder+': Dateiwaehler verschwunden');

  /* ---- Anleitung und Woerterbuch, aus einer laufenden Runde heraus ---- */
  s.d.querySelector('[data-topic]').click();
  s.d.querySelector('[data-scope="short"]').click();
  assert.equal(s.lauf('S.view'),'session',folder+': keine Runde');
  oeffnen(s);
  posten(s,'hilfe').click();
  assert.equal(s.lauf('S.view'),'help',folder+': Anleitung nicht erreichbar');
  assert.equal(blatt.hidden,true,folder+': Menue bleibt nach der Wahl offen');
  oeffnen(s);
  posten(s,'liste').click();
  assert.equal(s.lauf('S.view'),'list',folder+': Woerterbuch nicht erreichbar');

  /* ---- Richtung: in der Runde wird die Warteschlange neu gebaut ---- */
  s.lauf("S.view='home';render();");
  oeffnen(s);
  const vorher=s.lauf('S.dir');
  assert.match(posten(s,'richtung').textContent,/Abfragerichtung: (EN → DE|DE → EN)/,
    folder+': Richtung ohne Anzeige');
  posten(s,'richtung').click();
  assert.notEqual(s.lauf('S.dir'),vorher,folder+': Richtung bleibt stehen');

  s.d.querySelector('[data-topic]').click();
  s.d.querySelector('[data-scope="short"]').click();
  const ersteFrage=s.lauf('S.queue[0].id');
  s.lauf('S.i=1;S.options=["alt"]');
  oeffnen(s);
  posten(s,'richtung').click();
  assert.equal(s.lauf('S.view'),'session',folder+': Richtung wirft aus der Runde');
  assert.equal(s.lauf('S.options'),null,folder+': alte Auswahl steht noch');
  assert.equal(s.lauf('S.i'),0,folder+': Warteschlange nicht neu gebaut');
  assert.ok(s.lauf('S.queue.length')>0,folder+': leere Warteschlange nach dem Wechsel');
  assert.ok(ersteFrage,folder);
}

/* Die Startseite traegt kein learning.js und darum auch kein Menue: Sie
   ist die Startseite, das Zelt zeigte dort auf sich selbst. */
{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(!/home-link/.test(html),'Startseite hat unerwartet einen Rueckweg');
}

console.log('Kopfzeile: Zelt verweist, Menue traegt Anleitung, Woerterbuch, Richtung und den Fuss');
