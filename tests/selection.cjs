const {JSDOM}=require('jsdom'),vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
for(const year of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const html=fs.readFileSync(year+'/index.html','utf8');const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+year+'/'}),w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());let csv;
 w.Blob=class{constructor(parts){this.text=parts.join('')}};w.URL.createObjectURL=b=>(csv=b.text,'blob:test');w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);run(fs.readFileSync('assets/learning.js','utf8'));
 const total=run('Object.values(SETS).flat().length');assert(run('Object.values(SETS).flat().every(v=>v.pos && v.pos.trim())'),year+' missing part of speech');
 d.querySelector('#allBtn').click();assert.equal(d.querySelectorAll('.vpos').length,total);d.querySelector('#lcsv').click();assert(d.querySelector('#vlist').classList.contains('selecting'));assert(!d.querySelector('.selection-bar').hidden);
 const expected=run(`TOPICS.filter(t=>${year==='oberstufe'?'t.year===TOPICS[0].year':'t.unit===TOPICS[0].unit'}).reduce((n,t)=>n+SETS[t.id].length,0)`);
 const group=d.querySelector('.selection-unit input');assert(!group.getAttribute('aria-label').includes('undefined'));group.click();assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,expected);d.querySelector('#selectionCSV').click();assert.equal(csv.split('\r\n').length,expected+1);
 d.querySelector('#selectionReview').click();assert.equal(d.querySelectorAll('.vrow:not(.selection-hidden)').length,expected);d.querySelector('#selectionReview').click();
 d.querySelector('#selectionClear').click();const section=d.querySelector('[data-sec]');section.querySelector('summary input').click();assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,section.querySelectorAll('[data-csv-key]').length);assert(group.indeterminate);
 d.querySelector('#selectionClear').click();const q=d.querySelector('#lq');q.value='adverb';q.dispatchEvent(new w.Event('input'));const hits=d.querySelectorAll('.vrow:not(.off)').length;assert(hits>0);d.querySelector('#selectionHits').click();assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,hits);assert(!d.querySelector('#selectionPrompt').disabled);
 d.querySelector('#lcsv').click();assert(d.querySelector('.selection-bar').hidden);assert(!d.querySelector('#vlist').classList.contains('selecting'));console.log(year+': group, section, search, review, CSV, word classes passed');w.close();
}
