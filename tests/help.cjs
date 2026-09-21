const vm=require('vm'),fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('assert');
for(const folder of ['year8','year5','year6','year7','year9','year10','oberstufe','bili/history','year6/grammar/irregular-verbs']){
 const html=fs.readFileSync(folder+'/index.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'});
 const ctx=dom.getInternalVMContext();
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],ctx);
 const irregular=folder.includes('irregular');
 if(!irregular)vm.runInContext(fs.readFileSync('assets/learning.js','utf8'),ctx);
 vm.runInContext('renderHelp()',ctx);
 const text=dom.window.document.querySelector('.doc').textContent;
 if(!irregular){
  for(const phrase of ['Unit, Englisch, Deutsch','höchstens zehn','Später fortsetzen','Standardmäßig übst du DE → EN','als PDF speichern','Zum Home-Bildschirm','Fortschritt sichern','hörst du einen kurzen Ton'])assert(text.includes(phrase),folder+': '+phrase);

  /* Die Reihenfolge stand nirgends, sondern ergab sich daraus, in
     welcher Reihenfolge die Teile dazukamen. Jetzt steht sie in
     ANLEITUNG in learning.js - und hier noch einmal, ausgeschrieben.
     Zweimal aufgeschrieben ist Absicht: Ein Test, der dieselbe Liste
     liest wie der Code, prueft nur, dass die Datei sich selbst gleicht. */
  const ERWARTET=['Wofür ist diese Seite?','Loslegen','Die vier Übungsarten',
    'Abfragerichtung','Eingeben','Aussprache','Blitzrunde','Die fünf Fächer',
    'Dein Lernstand','Alle Vokabeln nachschlagen','Schriftgröße',
    'Basecamp auf den Startbildschirm','Ohne Internet üben',
    'Für Kolleginnen und Kollegen'];
  const kopf=[...dom.window.document.querySelectorAll('.doc h2')].map(h=>h.textContent.trim());
  /* Schriftgroesse gibt es nur, wo die Seite sie anbietet. */
  assert.deepStrictEqual(kopf,ERWARTET.filter(k=>kopf.includes(k)),
    folder+': die Anleitung steht in anderer Reihenfolge\n  '+kopf.join('\n  '));
  for(const k of ERWARTET){
    if(k==='Schriftgröße')continue;
    assert(kopf.includes(k),folder+': der Abschnitt "'+k+'" fehlt');
  }

  /* Das Tastenfeld auf dem Telefon kann Dinge, die niemand von allein
     findet - sie muessen in der Anleitung stehen. */
  for(const phrase of ['Rücktaste gedrückt halten','Leertaste gedrückt halten',
      'Schreibmarke wandert mit'])
    assert(text.includes(phrase),folder+': in "Eingeben" fehlt: '+phrase);

  /* Die Fassungsangabe bleibt das Letzte auf der Seite - sie wird nach
     dem Sortieren angehaengt. */
  const letztes=dom.window.document.querySelector('.doc').lastElementChild;
  assert(/^Fassung /.test(letztes.textContent.trim()),
    folder+': die Fassungsangabe steht nicht zuletzt');

  for(const stale of ['gerade sichtbaren Einträge','example_en','Tippfehler werden verziehen','Die erste Karte erscheint','Töne und Animationen','Tastatur am Computer','Dein Lernumfang'])assert(!text.includes(stale),folder+': stale '+stale);
 }else{
  assert(text.includes('beat – beat – beaten'));
  assert(!text.includes('sofort im selben Durchgang'));
  assert(text.includes('you were'));
 }
 assert(dom.window.document.getElementById('hback').onclick);
 console.log(folder+' help passed'); dom.window.close();
}
