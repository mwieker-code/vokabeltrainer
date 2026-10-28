/* Writing a discussion (Year 9): Inhalte vollstaendig, jede Uebung laeuft
   bis zum Rundenende, Ordnen der vier Teile wird richtig bewertet, Speicher
   getrennt vom Vokabel-Lernstand, Schreibwerkstatt mit Entwurf, und die Phrase bank steht auch als
   Vokabelthema in Year 9 - mit sinnvoller Luecke im Lueckensatz. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year9/discussion');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
function setup(seed){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year9/discussion/'});
 dom.window.scrollTo=()=>{};
 if(seed)dom.window.localStorage.setItem('vt:discussion9:v1',seed);
 for(const f of ['data.js','app.js'])dom.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 return dom;
}
const dom=setup(),w=dom.window,d=w.document,data=w.DISCUSSION_DATA;

/* Inhalte */
ok(data.cards.length===7,'sieben Lernkarten');
ok(data.models.length===3&&data.models.every(m=>m.parts.length===4),'drei Mustertexte mit je vier Teilen');
ok(!data.models.some(m=>/exchange year|Australia/i.test(m.question)),'kein Mustertext zum Thema der Schreibaufgabe');
ok(data.boxes.length===6,'sechs Kaesten der Phrase bank');
ok(data.phrases.every(p=>data.boxes.some(b=>b.id===p.box)&&p.example),'jede Wendung hat Kasten und Beispiel');
for(const x of data.intros)ok(x.options.filter(o=>o.right).length===1,'genau eine richtige Einleitung: '+x.topic);
for(const p of data.prel)ok(p.sentences.length===4,'P-R-E-L-Absatz mit vier Saetzen');
for(const a of data.answerGap)ok(a.sentence.includes('___')&&a.wrong.length===2,'Luecke und zwei Ablenker');
/* Regel 1 laut Folie: Die Meinung gehoert nicht in die Einleitung. */
for(const m of data.models)ok(!/\b(I think|I believe|In my opinion|Personally)\b/.test(m.parts[0]),'Einleitung ohne Meinung: '+m.id);
for(const m of data.models)ok(/\b(I believe|Personally|In my opinion)\b/.test(m.parts[3]),'Schluss mit Meinung: '+m.id);

/* Lernkarten blaettern */
d.querySelector('#learn').click();
for(let i=0;i<data.cards.length;i++){ok(d.querySelector('h1').textContent===data.cards[i].title,'Karte '+(i+1));d.querySelector('#next').click();}
ok(d.querySelector('#learn'),'nach der letzten Karte zurueck zur Uebersicht');

/* Jede Uebung bis zum Rundenende - erst immer die erste Antwort */
for(const mode of ['intro','prel','answer','phrases']){
 d.querySelector('[data-start="'+mode+'"]').click();let n=0;
 while(d.querySelector('[data-option]')){
  d.querySelector('[data-option]').click();
  ok(d.querySelector('#feedback .feedback'),'Rueckmeldung nach der Antwort');
  d.querySelector('#next').click();ok(++n<=12,'Runde bleibt begrenzt');
 }
 ok(d.querySelector('#again'),'Runde endet: '+mode);d.querySelector('#home').click();
}

/* Ordnen: richtig zugeordnet ist richtig, vertauscht ist falsch */
d.querySelector('[data-start="order"]').click();
ok(d.querySelector('#check').disabled,'Pruefen erst nach vier Zuordnungen');
for(let r=0;r<4;r++)d.querySelector('[data-para="'+r+'"][data-slot="'+r+'"]').click();
ok(!d.querySelector('#check').disabled,'Pruefen frei');
d.querySelector('#check').click();
ok(/Well done/.test(d.querySelector('#feedback').textContent),'richtige Reihenfolge erkannt');
ok(d.querySelectorAll('.para.correct').length===4,'alle Absaetze gruen');
d.querySelector('#next').click();d.querySelector('#home').click();
d.querySelector('[data-start="order"]').click();
d.querySelector('[data-para="0"][data-slot="3"]').click();d.querySelector('[data-para="3"][data-slot="0"]').click();
d.querySelector('[data-para="1"][data-slot="1"]').click();d.querySelector('[data-para="2"][data-slot="2"]').click();
d.querySelector('#check').click();
ok(/Not quite/.test(d.querySelector('#feedback').textContent),'vertauschte Teile erkannt');
ok(d.querySelectorAll('.para.incorrect').length===2,'genau die zwei falschen markiert');

/* Phrase bank */
d.querySelector('#back').click();d.querySelector('#bank').click();
ok(d.querySelectorAll('ul.bank li').length===data.phrases.length,'alle Wendungen in der Phrase bank');

/* Speicher getrennt und nach dem Neuladen da */
const state=w.localStorage.getItem('vt:discussion9:v1');ok(Object.keys(JSON.parse(state).results).length>0,'Ergebnisse gespeichert');
const again=setup(state);ok(again.window.document.querySelector('.stats').textContent.includes('Order · 1/3'),'Stand nach dem Neuladen');
ok(again.window.localStorage.getItem('vt9:progress')===null,'Vokabel-Lernstand unberuehrt');

/* Schreibwerkstatt: alle sechs Schritte, Entwurf unter eigenem Schluessel,
   Wortzaehler, Regel-Hinweise, Checkliste und Neuanfang. */
{
 const ws=setup(),W=ws.window,doc=W.document,type=(el,v)=>{el.value=v;el.dispatchEvent(new W.Event('input'));};
 ok(!data.workshop.topics.some(t=>/exchange|Australia/i.test(t)),'keine Uebungsfrage zum Thema der Schreibaufgabe');
 ok(!data.workshop.topics.some(t=>data.models.some(m=>m.question===t)),'keine Uebungsfrage zu einem Mustertext');
 doc.querySelector('#workshop').click();
 ok(doc.querySelector('[aria-current="step"]').textContent.includes('Question'),'Werkstatt beginnt bei der Frage');
 doc.querySelector('[data-topic="0"]').click();
 ok(doc.querySelector('[data-topic="0"]').getAttribute('aria-pressed')==='true','Frage gewaehlt');
 type(doc.querySelector('#own'),'Should pets be allowed at school?');
 doc.querySelector('#next').click();
 ok(doc.querySelector('.context').textContent.includes('pets'),'eigene Frage uebernommen');
 ['quiet lessons','more time for hobbies','less stress'].forEach((v,i)=>type(doc.querySelector('#forPts'+i),v));
 ['practice helps','parents see progress',''].forEach((v,i)=>type(doc.querySelector('#againstPts'+i),v));
 doc.querySelector('#next').click();
 doc.querySelector('[data-side="for"]').click();
 ok(doc.querySelector('[data-side="for"]').getAttribute('aria-pressed')==='true','Seite gewaehlt');
 type(doc.querySelector('#opinion'),'I believe that pets help students.');
 doc.querySelector('#next').click();
 ok(doc.querySelectorAll('ol.order li').length===3,'eigene Argumente zum Ordnen');
 ok(doc.querySelectorAll('[data-answer]').length===2,'nur ausgefuellte Gegenargumente zur Auswahl');
 doc.querySelector('[data-down="0"]').click();
 ok(doc.querySelector('ol.order li').textContent.includes('more time'),'Reihenfolge geaendert');
 doc.querySelector('[data-answer="1"]').click();
 doc.querySelector('#next').click();
 ok(doc.querySelectorAll('textarea[data-part]').length===4,'vier Textfelder');
 ok(doc.querySelectorAll('.part')[1].textContent.includes('practice helps'),'Notizen der Gegenseite bei Teil 2');
 ok(doc.querySelectorAll('.part')[2].textContent.includes('Answer: parents see progress'),'gewaehltes Gegenargument bei Teil 3');
 doc.querySelector('[data-insert="0"]').click();
 ok(doc.querySelector('#part0').value.trim()===data.phrases.find(p=>p.box==='intro').en,'Wendung eingefuegt');
 type(doc.querySelector('#part0'),'In my opinion pets are great. '+'word '.repeat(40));
 type(doc.querySelector('#part2'),'word '.repeat(150));
 type(doc.querySelector('#part3'),'word '.repeat(30));
 ok(/^226 of 250–300 words · 24 more to go/.test(doc.querySelector('#count').textContent),'Wortzaehler');
 type(doc.querySelector('#part1'),'On the one hand, '+'word '.repeat(40));
 ok(/within the word count/.test(doc.querySelector('#count').textContent),'Wortzahl erreicht');
 doc.querySelector('#next').click();
 const hintText=doc.querySelector('.feedback').textContent;
 ok(/Rule 1/.test(hintText)&&/Rule 3/.test(hintText)&&/Conclusion/.test(hintText),'Hinweise zu Regel 1, Regel 3 und Schluss');
 ok(!/The other side:/.test(hintText),'kein Hinweis, wo die Gegenseite eingeleitet ist');
 ok(doc.querySelectorAll('ul.checklist li').length===6,'Checkliste mit sechs Punkten');
 doc.querySelector('[data-check="2"][data-mark="partly"]').click();
 ok(doc.querySelector('[data-check="2"][data-mark="partly"]').getAttribute('aria-pressed')==='true','Checkliste markiert');
 type(doc.querySelector('#change0'),'Remove my opinion from the introduction');
 ok(doc.querySelectorAll('details').length===data.models.length,'Mustertexte zum Vergleich');
 const stored=W.localStorage.getItem('vt:discussion9:draft'),sd=JSON.parse(stored);
 ok(sd.topic.includes('pets')&&sd.checks[2]==='partly'&&sd.changes[0].includes('opinion')&&sd.step===5,'Entwurf gespeichert');
 ok(W.localStorage.getItem('vt:discussion9:v1')===null,'Uebungsstand vom Entwurf getrennt');
 /* Nach dem Neuladen geht es an derselben Stelle weiter. */
 const back=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year9/discussion/'});
 back.window.scrollTo=()=>{};back.window.localStorage.setItem('vt:discussion9:draft',stored);
 for(const f of ['data.js','app.js'])back.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 ok(back.window.document.querySelector('#workshop').textContent==='Continue writing','Entwurf beim Neuladen erkannt');
 back.window.document.querySelector('#workshop').click();
 ok(back.window.document.querySelector('[aria-current="step"]').textContent.includes('Check'),'weiter beim letzten Schritt');
 back.window.close();
 /* Kaputter Entwurf schadet nicht. */
 const bad=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year9/discussion/'});
 bad.window.scrollTo=()=>{};bad.window.localStorage.setItem('vt:discussion9:draft','{"version":1,"step":99,"parts":"x"}');
 for(const f of ['data.js','app.js'])bad.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 bad.window.document.querySelector('#workshop').click();
 ok(bad.window.document.querySelectorAll('[data-topic]').length===data.workshop.topics.length,'ungueltiger Entwurf: Start bei Schritt 1');
 bad.window.close();
 /* Neuanfang nur nach Bestaetigung */
 W.confirm=()=>false;doc.querySelector('#fresh').click();
 ok(JSON.parse(W.localStorage.getItem('vt:discussion9:draft')).topic.includes('pets'),'Abbrechen behaelt den Entwurf');
 W.confirm=()=>true;doc.querySelector('#fresh').click();
 ok(JSON.parse(W.localStorage.getItem('vt:discussion9:draft')).topic===''&&doc.querySelector('[data-topic]'),'Neuanfang leert den Entwurf');
 ws.window.close();
}

/* Year 9: Kachel und Vokabelthema */
const html=fs.readFileSync(path.join(root,'year9/index.html'),'utf8');
const y9=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year9/'});y9.window.scrollTo=()=>{};
const c=y9.getInternalVMContext();
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
ok(y9.window.document.querySelector('a[href="discussion/"]'),'Kachel zur discussion in Year 9');
const phrases=vm.runInContext('SETS["y9-discussion-phrases"]',c);
ok(phrases.length===data.phrases.length,'Phrase bank auch als Vokabelthema');
for(const v of phrases){
 const p=vm.runInContext('clozeParts(SETS["y9-discussion-phrases"].find(x=>x.id==='+JSON.stringify(v.id)+'))',c);
 ok(p&&p.word.length>3,'Lueckensatz verdeckt einen sinnvollen Teil: '+v.en);
 if(v.cloze)ok(p.word===v.cloze,'zweiteilige Wendung verdeckt den ersten Teil: '+v.en);
}
dom.window.close();again.window.close();y9.window.close();
console.log(checks+' discussion checks passed');
