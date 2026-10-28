/* Writing a discussion (Year 9): Inhalte vollstaendig, jede Uebung laeuft
   bis zum Rundenende, Ordnen der vier Teile wird richtig bewertet, Speicher
   getrennt vom Vokabel-Lernstand, und die Phrase bank steht auch als
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
