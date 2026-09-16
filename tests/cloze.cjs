const {JSDOM}=require('jsdom');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');const root=path.resolve(__dirname,'..');let total=0;
for(const year of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const html=fs.readFileSync(path.join(root,year,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+year+'/'});dom.window.scrollTo=()=>{};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
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
