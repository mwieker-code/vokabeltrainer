const {JSDOM}=require('jsdom');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');const root=path.resolve(__dirname,'..');let total=0;
for(const year of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const html=fs.readFileSync(path.join(root,year,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+year+'/'});dom.window.scrollTo=()=>{};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
 /* Der Lueckenmodus fehlte in year7 und year8 ueber Monate: Die Daten
    waren da, die Logik auch, nur der Schalter in der Runde war beim
    Anlegen der Seite vergessen worden. Von aussen sah alles heil aus -
    dieser Test sieht hin. */
 run("S.topicId=Object.keys(SETS)[0];S.queue=SETS[S.topicId].slice(0,1);S.i=0;"
   +"S.view='session';S.mode='card';S.answered=null;render();");
 const modi=[...dom.window.document.querySelectorAll('.switches .switch[data-mode]')]
   .map(b=>b.dataset.mode);
 for(const m of ['card','mc','type','cloze'])
  assert.ok(modi.includes(m),year+': die Uebungsart '+m+' fehlt in der Runde ('+modi.join(' ')+')');

 const rows=run('Object.values(SETS).flat().map(v=>({v,cp:clozeParts(v)})).filter(x=>x.cp)');
 for(const {v,cp} of rows){
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.ok(!new RegExp('\\b'+escape(cp.word)+'\\b','i').test(cp.before+' '+cp.after),year+': answer repeated: '+v.en);
  assert.equal(cp.before+cp.word+cp.after,v.example_en,year+': sentence preserved');
  total++;
 }
 // Render real cards, including the reported adverb and verb forms.
 for(const {v} of rows.filter(x=>/verb/.test(x.v.pos)).slice(0,12).concat(rows.filter(x=>x.v.en==='in progress'))){
  run(`S.topicId=Object.keys(SETS).find(id=>SETS[id].some(v=>v.id===${JSON.stringify(v.id)}));S.queue=[SETS[S.topicId].find(v=>v.id===${JSON.stringify(v.id)})];S.i=0;S.view='session';S.mode='cloze';S.answered=null;render();`);
  assert.ok(dom.window.document.querySelector('.cloze .gap'),year+': blank displayed');
  assert.ok(!dom.window.document.querySelector('.cloze .basef'),year+': no English answer hint');
 }
 console.log(year+': '+rows.length+' cloze sentences checked');dom.window.close();
}
console.log(total+' cloze sentences: no repeated answer or generated base-form hint');
