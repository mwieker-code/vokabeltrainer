/* Die Fachseiten des bilingualen Unterrichts tragen dieselbe Mechanik wie
   die Oberstufe, sind aber keine Oberstufe: Ihre Gruppen sind Jahrgaenge,
   und alle Jahrgaenge eines Fachs teilen sich einen Lernstand, damit man
   jahrgangsuebergreifend ueben kann. Genau das wird hier geprueft. */
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

for(const fach of ['bili/history']){
 const html=fs.readFileSync(path.join(root,fach,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+fach+'/'});
 const w=dom.window;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 const c=dom.getInternalVMContext();
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
 vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
 const d=w.document;

 /* Ein eigener Schluessel, sonst ueberschreibt das Fach den Lernstand der
    Oberstufe. */
 const key=vm.runInContext('KEY',c);
 assert.notEqual(key,'vt:progress','Fachseite darf den Oberstufenschluessel nicht mitbenutzen');
 assert.match(key,/^vt:bili:/,'Fachschluessel folgt nicht dem Muster vt:bili:...');

 /* Jede Gruppe ist ein Jahrgang, und alle Jahrgaenge liegen auf dieser
    einen Seite - das ist die Voraussetzung fuers Querueben. */
 const jahrgaenge=[...new Set(vm.runInContext('TOPICS',c).map(t=>t.year))];
 assert.ok(jahrgaenge.length>1,'Eine Fachseite braucht mehr als einen Jahrgang');
 const gruppen=[...d.querySelectorAll('.yeargroup > summary .tag')].map(e=>e.textContent);
 assert.deepEqual(gruppen,jahrgaenge,'Gruppenueberschriften stimmen nicht mit den Jahrgaengen ueberein');

 /* Der Knopf zieht ueber alle Jahrgaenge, nicht nur ueber einen. */
 const quer=d.querySelector('#practiceAcross');
 assert.ok(quer,'Knopf zum Querueben fehlt');
 assert.match(quer.textContent,/Jahrgangsübergreifend/,'Knopf traegt die Oberstufen-Beschriftung');
 quer.click();
 const umfang=d.querySelector('#view').textContent;
 const alle=vm.runInContext('TOPICS.reduce((n,t)=>n+(SETS[t.id]||[]).length,0)',c);
 assert.match(umfang,new RegExp(alle+' Vokabeln'),'Querueben umfasst nicht alle Vokabeln der Seite');
 assert.match(umfang,/Alle Jahrgänge/,'Der Lernumfang heisst noch nach Themen statt nach Jahrgaengen');

 /* Zurueck zur Uebersicht, damit die Vokabelliste wieder erreichbar ist. */
 [...d.querySelectorAll('#view button')].find(b=>/Zur Übersicht/.test(b.textContent)).click();

 /* Der Test-Prompt darf keine Oberstufen-Zielstufe abfragen. */
 d.querySelector('#allBtn').click();
 d.querySelector('#lcsv').click();
 d.querySelector('[data-csv-group]').click();
 d.querySelector('#promptFromSelection').click();
 assert.equal(d.querySelector('#promptStage'),null,'Fachseite fragt faelschlich nach einer Oberstufen-Zielstufe');
 assert.match(d.querySelector('#promptConfig p').textContent,/Bilingualer Unterricht/,'Der Dialog nennt nicht das Fach');
 d.querySelector('#promptConfig').dispatchEvent(new w.Event('submit',{cancelable:true}));
 const prompt=d.querySelector('#promptText').value;
 assert.ok(!/Oberstufe/.test(prompt),'Der Prompt bezeichnet die Fachseite als Oberstufe');
 assert.match(prompt,/bilingual/i,'Der Prompt nennt den bilingualen Zusammenhang nicht');

 console.log(fach+': eigener Schlüssel, Jahrgangsgruppen, Querüben und Prompt passen');
}
