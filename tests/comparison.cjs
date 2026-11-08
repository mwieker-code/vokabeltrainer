/* Year 6 Grammar: Comparison of adjectives - sechs Kategorien mit je 24
   Aufgaben, jede Runde laeuft durch, und die Eingabe verzeiht Satzzeichen,
   Gedankenstriche und ein zusaetzliches "the" bei den Formen. */
const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('node:assert/strict');
const dir=__dirname+'/../year6/grammar/comparison/';
const dom=new JSDOM(fs.readFileSync(dir+'index.html','utf8'),{runScripts:'outside-only',url:'http://localhost/year6/grammar/comparison/'}),w=dom.window,d=w.document;
for(const f of ['data.js','app.js'])w.eval(fs.readFileSync(dir+f,'utf8'));
let count=0;const ok=(x,m)=>{assert.ok(x,m);count++};
const all=w.GRAMMAR_DATA.flatMap(g=>g.items);
ok(w.GRAMMAR_DATA.length===6,'sechs Kategorien');ok(new Set(all.map(q=>q.id)).size===all.length,'eindeutige IDs');
for(const q of all){ok(q.answers.length&&q.hint&&!q.prompt.includes(' / '),'Aufgabe vollstaendig: '+q.id);}
const answer=v=>{d.querySelector('#answer').value=v;d.querySelector('#form').dispatchEvent(new w.Event('submit',{cancelable:true}));return d.querySelector('#feedback strong').textContent;};
const task=()=>all.find(q=>q.id===d.querySelector('.task').dataset.questionId);
for(const g of w.GRAMMAR_DATA){
 ok(g.items.length===24,'24 Aufgaben: '+g.id);ok(new Set(g.items.map(q=>q.prompt)).size===24,'keine doppelte Aufgabe: '+g.id);
 d.querySelector('[data-group="'+g.id+'"]').click();d.querySelector('#short').click();let n=0;
 while(d.querySelector('#form')){const q=task();ok(q);ok(answer(q.answers[0])==='Richtig!','richtig erkannt: '+q.id);d.querySelector('#next').click();ok(++n<=12);}
 ok(d.querySelector('h2').textContent==='12 / 12 beim ersten Versuch richtig','Rundenende '+g.id);d.querySelector('#home').click();
}
/* Schreibweisen bei den Formen */
const form=w.GRAMMAR_DATA[0].items.find(q=>q.prompt.endsWith(': big'));
d.querySelector('[data-group="er-est"]').click();d.querySelector('#start').click();
let guard=0;while(task().id!==form.id&&guard++<30){answer('x');d.querySelector('#next').click();}
ok(answer('Bigger – the biggest.')==='Richtig!','Gedankenstrich, the und Punkt werden verziehen');
d.querySelector('#home').click();d.querySelector('[data-group="er-est"]').click();d.querySelector('#start').click();
guard=0;while(task().id!==form.id&&guard++<60){answer('x');d.querySelector('#next').click();}
ok(answer('biger, bigest')==='Noch nicht ganz.','falsche Schreibung bleibt falsch');
d.querySelector('#home').click();
/* Gemischte Runde und Speicher */
d.querySelector('#mixed').click();let n=0;while(d.querySelector('#reveal')){d.querySelector('#reveal').click();d.querySelector('#next').click();ok(++n<=24);}
ok(n===24,'gemischte Runde: 12 Aufgaben und 12 Wiederholungen');ok(w.localStorage.getItem('vt6:grammar:comparison:v1'),'Fortschritt gespeichert');
ok(w.localStorage.getItem('vt6:grammar:simple-past:v1')===null,'Simple past unberuehrt');
const hub=fs.readFileSync(__dirname+'/../year6/grammar/index.html','utf8');ok(hub.includes('href="comparison/"'),'Kachel auf der Grammatikseite');
dom.window.close();
console.log(count+' comparison checks passed; '+all.length+' tasks.');
