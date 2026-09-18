/* Lernaufträge: Link erzeugen, öffnen, merken, Fortschritt zeigen, entfernen. */
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let count=0;

function boot(folder,html,url,storage){
 const dom=new JSDOM(html,{runScripts:'outside-only',url});
 const w=dom.window;w.scrollTo=()=>{};
 // jsdom kennt showModal nicht - der Dialog wird hier nur befüllt, nicht angezeigt.
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 if(storage)for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
 const run=code=>vm.runInContext(code,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/qr.js'),'utf8'));
 run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
 const dump=()=>{const out={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);out[k]=w.localStorage.getItem(k);}return out;};
 return {w,d:w.document,run,dump};
}

for(const folder of ['year6','oberstufe']){
 const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
 const base='https://example.org/'+folder+'/';
 const ok=(value,message)=>{assert.ok(value,folder+': '+message);count++;};
 const name='Hausaufgabe <img src=x onerror=alert(1)>';

 // Lehrkraft: erste Unit auswählen und den Auftragslink erzeugen.
 let teacher=boot(folder,html,base);
 teacher.d.getElementById('allBtn').click();
 const boxes=[...teacher.d.querySelectorAll('.selection-unit .direct-selection input')];
 ok(boxes.length,'Auswahl nach Unit vorhanden');
 boxes[0].click();
 teacher.d.querySelector('#selectionAssignment').click();
 const nameField=teacher.d.querySelector('#assignmentName');
 nameField.value=name;
 nameField.dispatchEvent(new teacher.w.Event('input'));
 const url=teacher.d.querySelector('#assignmentURL').value;
 ok(url.includes('auftrag='),'Link enthält den Auftrag');
 teacher.w.close();

 // Schülerin öffnet den Link: Banner sichtbar, Auftrag gemerkt, keine Karte doppelt.
 const pupil=boot(folder,html,url);
 ok(pupil.d.querySelector('.assignment-banner strong').textContent===name,'Name im Banner');
 ok(!pupil.d.querySelector('.assignment-banner img'),'Name wird escaped, nicht als HTML eingefügt');
 const saved=JSON.parse(pupil.w.localStorage.getItem(Object.keys(pupil.dump()).find(k=>k.endsWith(':assignments:v1'))));
 ok(Array.isArray(saved)&&saved.length===1,'Auftrag lokal gemerkt');
 ok(saved[0].name===name&&saved[0].date&&saved[0].count>0,'Name, Datum und Umfang gespeichert');
 ok(!pupil.d.querySelector('.assignment-card'),'kein doppelter Eintrag neben dem Banner');
 // Ein paar Vokabeln des Auftrags auf Fach 5 setzen.
 pupil.run(`(function(){const set=SETS[TOPICS[0].id].slice(0,7);
   for(const v of set){const r=(typeof YEARS==='undefined')?rec(TOPICS[0].id,'de2en',v.id):rec('de2en',v.id);r.box=5;}
   save();})()`);
 const store=pupil.dump();
 pupil.w.close();

 // Späterer Besuch ohne Link: Karte mit Fortschritt.
 const later=boot(folder,html,base,store);
 const card=later.d.querySelector('.assignment-card');
 ok(card,'gemerkter Auftrag erscheint auf der Übersicht');
 const text=card.textContent.replace(/\s+/g,' ');
 ok(text.includes(name),'Name auf der Karte');
 ok(/7 von \d+ Wörtern sitzen sicher/.test(text),'Fortschritt aus den Fachständen: '+text);
 ok(!later.d.querySelector('.assignment-card img'),'Karte escaped den Namen');
 ok(later.d.querySelector('.assignment-bar-fill').getAttribute('style').startsWith('width:'),'Fortschrittsbalken gesetzt');
 later.d.querySelector('[data-assignment-start]').click();
 ok(later.d.querySelector('[data-scope="all"]').textContent.includes(String(saved[0].count)),'Weiterüben startet den Auftrag');
 later.d.querySelector('#setupBack').click();
 ok(later.d.querySelectorAll('.assignment-card').length===1,'nach der Rückkehr genau eine Karte');
 later.d.querySelector('[data-assignment-forget]').click();
 ok(!later.d.querySelector('.assignment-card'),'Entfernen blendet die Karte aus');
 ok(JSON.parse(later.w.localStorage.getItem(Object.keys(store).find(k=>k.endsWith(':assignments:v1')))).length===0,'Entfernen löscht den Eintrag');
 later.w.close();

 // Veralteter Auftrag: Prüfsumme passt nicht mehr zum Vokabular.
 const key=Object.keys(store).find(k=>k.endsWith(':assignments:v1'));
 const stale={...store};
 stale[key]=JSON.stringify([{...JSON.parse(store[key])[0],fp:'ZZZZ'}]);
 const outdated=boot(folder,html,base,stale);
 ok(outdated.d.querySelector('.assignment-card-stale'),'veralteter Auftrag wird als ungültig markiert');
 ok(!outdated.d.querySelector('[data-assignment-start]'),'veralteter Auftrag lässt sich nicht starten');
 ok(outdated.d.querySelector('[data-assignment-forget]'),'veralteter Auftrag lässt sich entfernen');
 outdated.w.close();
}
console.log(count+' assignment checks passed');
