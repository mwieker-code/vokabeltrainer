const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
for(const year of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const h=fs.readFileSync(year+'/index.html','utf8'),dom=new JSDOM(h,{runScripts:'outside-only',url:'https://example.org/'+year+'/'}),w=dom.window,d=w.document;let file;
 w.scrollTo=()=>{};w.Blob=class{constructor(parts){file=parts.join('')}};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());for(const m of h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);run(fs.readFileSync('assets/learning.js','utf8'));
 d.querySelector('#allBtn').click();d.querySelector('#lcsv').click();d.querySelector('.selection-unit input').click();const n=d.querySelectorAll('[data-csv-key]:checked').length;
 d.querySelector('#selectionSave').click();const saved=JSON.parse(file);assert.equal(saved.year,year==='oberstufe'?year:Number(year.slice(4)));assert.equal(saved.words.length,n);
 const load=async data=>d.querySelector('#selectionFile').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:''}});
 d.querySelector('#selectionClear').click();await load(saved);assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,n);
 await load({...saved,year:'wrong'});assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,n);assert(d.querySelector('#selectionFileStatus').textContent.includes('Bitte'));
 console.log(year+': save/load and wrong-year protection passed');w.close();
}
})();
