const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
/* bili/history gehoert dazu: Dort wird genauso getippt und geluecktet,
   der Berg fehlte dort aber - als einzige Uebungsseite. */
for(const folder of ['year5','year6','year7','year8','year9','year10','oberstufe','bili/history']){
 const html=fs.readFileSync(folder+'/index.html','utf8');
 assert.match(html,/ascent\.js/);assert.match(html,/inp\.focus\(\{preventScroll:true\}\)/);
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>({measureText:()=>({width:10})});w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=f=>w.setTimeout(()=>f(w.performance.now()),0);w.cancelAnimationFrame=w.clearTimeout.bind(w);
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync('assets/learning.js','utf8'));run(fs.readFileSync('assets/ascent.js','utf8'));
 assert.equal(w.document.querySelectorAll('.ascent-panel').length,0);

 w.document.querySelector('[data-topic]').click();w.document.querySelector('[data-scope="short"]').click();
 run("S.mode='type';buildQueue();render();");
 const panel=()=>w.document.querySelector('.ascent-panel');
 const antworte=wort=>{
  run("Object.assign(current(),{en:'school',de:'Schule',pos:'noun'});S.dir='de2en';render();");
  w.document.querySelector('#typeIn').value=wort;
  w.document.querySelector('#submit').click();
 };
 const prozent=()=>panel().querySelector('.ascent-percent').textContent;
 const serie=()=>panel().querySelector('.ascent-streak').textContent;

 /* Nicht jede kurze Runde hat zehn Woerter - bili/history hat weniger.
    Die Etappe ist so lang wie die Runde, hoechstens zehn. */
 const laenge=Math.min(10,run('S.initialCount'));
 const erwartet=k=>Math.round(k/laenge*100)+' %';
 assert.equal(prozent(),'0 %',folder);
 /* Vorangehen tut nur, wer das Wort kann. Ein Fehler laesst die Figur
    stehen - er wirft nicht zurueck, bringt aber auch nichts ein. Wuerde
    jede Antwort zaehlen, erreichte den Gipfel auch, wer zehnmal
    danebentippt. */
 antworte('school');
 assert.equal(serie(),'1 in Folge',folder+': die Serie zaehlt nicht mit');
 assert.equal(prozent(),erwartet(1),folder+': das gekonnte Wort bringt keinen Schritt');
 run('render();');
 assert.equal(w.document.querySelectorAll('.ascent-panel').length,1,folder+': der Berg steht doppelt');
 run('rate(2);');

 antworte('falsch');
 assert.equal(serie(),'0 in Folge',folder+': die Serie reisst beim Fehler nicht');
 assert.equal(prozent(),erwartet(1),folder+': der Fehler bringt die Figur trotzdem voran');
 run('rate(0);');

 /* Die restlichen gekonnten Woerter fuehren auf den Gipfel der Etappe. */
 for(let k=1;k<laenge;k++){ antworte('school'); run('rate(2);'); }
 run('render();');
 assert.equal(prozent(),'100 %',folder+': der Gipfel wird nicht erreicht');
 assert.ok(panel().classList.contains('ascent-gipfel'),folder+': kein Gipfelzustand');
 assert.match(panel().querySelector('.ascent-count').textContent,/Gipfel geschafft/,
   folder+': der Gipfel wird nicht genannt');
 /* Sichtbar steht im Bild nur der Serienzaehler. "Dein Aufstieg" stand
    am Rechner ueber dem Gipfel und war dort im Weg; fuer Screenreader
    bleibt der Name im aria-label. */
 assert.equal(panel().querySelector('.ascent-label').children.length,1,
   folder+': im Bild steht mehr als der Zaehler');
 assert.equal(/AUFSTIEG/.test(panel().querySelector('.ascent-label').textContent.toUpperCase()),false,
   folder+': die Beschriftung ueber dem Gipfel ist zurueck');
 assert.match(panel().getAttribute('aria-label'),/Dein Aufstieg/,
   folder+': der Name fuer Screenreader fehlt');
 run('S.i=S.queue.length;render();');
 assert.ok(panel().classList.contains('ascent-summit'),folder);
 run("S.mode='cloze';buildQueue();render();");assert.equal(panel().querySelector('.ascent-percent').textContent,'0 %');
 run("S.mode='mc';buildQueue();render();");assert.equal(w.document.querySelectorAll('.ascent-panel').length,0);
 dom.window.close();
}
console.log('Mountain: alle Übungsseiten, progress, streak, retries, finish and mode changes passed.');
