/* Karteikarte Deutsch -> Englisch: Nach dem Umdrehen steht das englische
   Wort gross und das deutsche Stichwort klein. In der anderen Richtung und
   vor dem Umdrehen bleibt alles, wie es war. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const html=fs.readFileSync(path.join(root,'year7/index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year7/'});dom.window.scrollTo=()=>{};
const c=dom.getInternalVMContext(),d=dom.window.document,run=s=>vm.runInContext(s,c);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
const gross=()=>d.querySelector('.vcard').classList.contains('en-gross');
for(const dir of ['de2en','en2de']){
 run("S.view='home';S.mode='card';S.dir="+JSON.stringify(dir)+";startSession(TOPICS[0].id)");
 d.querySelector('[data-scope="all"]').click();
 run("S.mode='card';S.dir="+JSON.stringify(dir)+";S.revealed=false;render()");
 ok(!gross(),'vor dem Umdrehen unveraendert: '+dir);
 d.getElementById('flip').click();
 ok(d.querySelector('.answer .de'),'Antwort aufgedeckt: '+dir);
 ok(gross()===(dir==='de2en'),dir==='de2en'?'Englisch gross nach dem Umdrehen':'Englisch → Deutsch unveraendert');
}
const css=fs.readFileSync(path.join(root,'assets/nacht-marke.css'),'utf8');
ok(/\.vcard\.en-gross \.answer \.de\{[^}]*font-size:clamp\(42px/.test(css),'Antwort bekommt die Groesse des Stichworts');
ok(/\.vcard\.en-gross \.prompt\{[^}]*font-size:clamp\(24px/.test(css),'Stichwort bekommt die Groesse der Antwort');
dom.window.close();
console.log(checks+' Karteikarten-Groessen checks passed');
