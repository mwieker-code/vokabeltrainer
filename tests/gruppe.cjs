/* Oberkategorie als Ganzes ueben: Jede Gruppe mit mehreren Themen hat oben
   eine Kachel "Alle Themen"; die Runde mischt die Vokabeln aller Themen und
   schreibt den Lernstand in die einzelnen Themen. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
function load(rel){
 const html=fs.readFileSync(path.join(root,rel,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+rel+'/'});
 dom.window.scrollTo=()=>{};dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
 const c=dom.getInternalVMContext();
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
 vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
 return {dom,d:dom.window.document,run:s=>vm.runInContext(s,c)};
}
for(const rel of ['bili/history','bili/geography','oberstufe']){
 const {dom,d,run}=load(rel);
 const T=run('TOPICS'),key=t=>t.year+'|'+t.yearName;
 const gruppen=[...new Set(T.map(key))].filter(k=>!k.startsWith('ALL|')&&T.filter(t=>key(t)===k).length>1);
 const kacheln=[...d.querySelectorAll('.topic-gruppe')];
 ok(kacheln.length===gruppen.length,rel+': eine Kachel je Oberkategorie mit mehreren Themen');
 ok(!d.querySelector('#all .topic-gruppe'),rel+': keine Kachel im jahrgangsuebergreifenden Bereich');
 for(const k of kacheln){
  const g=k.closest('details.yeargroup');
  ok(g.querySelector('.topic')===k,rel+': Kachel steht oben in ihrer Gruppe');
  const n=run('TOPICS').filter(t=>'gruppe:'+key(t)===k.dataset.gruppe).reduce((s,t)=>s+run('SETS')[t.id].length,0);
  ok(k.textContent.includes(n+' Vok.'),rel+': Anzahl stimmt '+k.dataset.gruppe);
 }
 dom.window.close();
}
/* History: Imperialism and Empire als Runde */
{
 const {dom,d,run}=load('bili/history');
 const k=d.querySelector('[data-gruppe="gruppe:Year 9|Imperialism and Empire"]');ok(k,'Kachel Imperialism and Empire');
 k.click();
 ok(/52 Vokabeln/.test(d.querySelector('[data-scope="all"]').textContent),'Lernumfang zeigt alle 52 Vokabeln');
 ok(/Imperialism and Empire · alle Themen/.test(d.body.textContent),'Name der Auswahl');
 d.querySelector('[data-scope="all"]').click();
 const themen=new Set(run('S.queue').map(v=>run('TOPICS').find(t=>run('SETS')[t.id].includes(v)).id));
 ok(run('S.queue').length===52&&themen.size===6,'Runde mischt alle sechs Themen');
 const v=run('current()'),thema=run('S.topicId');
 ok(run('SETS')[thema].includes(v),'Karte gehoert zu ihrem Thema');
 run('S.revealed=true;render()');d.querySelector('[data-rate="2"]').click();
 const gespeichert=JSON.parse(dom.window.localStorage.getItem('vt:bili:history:progress')||'{}');
 ok(JSON.stringify(gespeichert).includes(thema),'Lernstand landet im einzelnen Thema');
 dom.window.close();
}
console.log(checks+' Oberkategorie checks passed');
