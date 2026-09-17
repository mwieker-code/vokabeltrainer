const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
const h=fs.readFileSync('year8/index.html','utf8'),dom=new JSDOM(h,{runScripts:'outside-only',url:'https://example.org/year8/'}),w=dom.window,d=w.document;let file;
w.Blob=class{constructor(parts){file=parts.join('')}};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'))};
for(const m of h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],dom.getInternalVMContext());vm.runInContext(fs.readFileSync('assets/learning.js','utf8'),dom.getInternalVMContext());
d.querySelector('#allBtn').click();d.querySelector('#lcsv').click();d.querySelector('.selection-unit input').click();const n=d.querySelectorAll('[data-csv-key]:checked').length;
d.querySelector('#selectionName').value='Mein Test';d.querySelector('#selectionSave').click();const saved=file;assert.equal(JSON.parse(saved).words.length,n);
d.querySelector('#selectionClear').click();await d.querySelector('#selectionFile').onchange({target:{files:[{size:saved.length,text:async()=>saved}],value:''}});assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,n);
await d.querySelector('#selectionFile').onchange({target:{files:[{size:2,text:async()=>'{}'}],value:''}});assert.equal(d.querySelectorAll('[data-csv-key]:checked').length,n);
d.querySelector('#selectionPrompt').click();const submit=()=>d.querySelector('#promptConfig').dispatchEvent(new w.Event('submit',{cancelable:true}));
d.querySelector('#promptAB').checked=true;const sentences=d.querySelector('[value=sentences]');sentences.checked=true;sentences.dispatchEvent(new w.Event('change'));d.querySelector('#promptTense').value='past perfect';d.querySelector('#promptCount').value=12;
for(const [t,n] of [['gap',5],['matching',4],['sentences',3]])d.querySelector('[data-allocation='+t+']').value=n;
submit();let p=d.querySelector('#promptText').value;assert(p.includes('vier getrennte'));assert(p.includes('Gap-Filling: 5; Definition-Matching: 4; Sätze bilden: 3'));assert(p.includes('Zeitform past perfect'));assert(p.includes('Total: / 12'));assert(!p.includes('Erstelle zwei getrennte'));
d.querySelector('[data-allocation=gap]').value=6;submit();assert(d.querySelector('#promptError').textContent.includes('genau 12'));
d.querySelector('#promptBalance').click();assert(d.querySelector('#promptResult').hidden);submit();assert(!d.querySelector('#promptError').textContent);
console.log('Pilot: save/load round trip, invalid import, A/B, tense, distribution, validation passed');w.close();
})();
