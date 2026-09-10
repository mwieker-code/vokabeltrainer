const vm=require('vm'),fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('assert');
for(const folder of ['year5','year6','year9','year10','oberstufe']){
const html=fs.readFileSync(folder+'/index.html','utf8'),d=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'}),w=d.window;let exported;w.Blob=class {constructor(parts){this.text=parts.join('');}};
w.URL.createObjectURL=b=>{exported=b;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],d.getInternalVMContext());vm.runInContext(fs.readFileSync('assets/learning.js','utf8'),d.getInternalVMContext());w.document.querySelector('#allBtn').click();w.document.querySelector('#lcsv').click();assert(w.document.querySelector('#csvSelected').disabled);const inputs=w.document.querySelectorAll('[data-csv-key]');inputs[0].click();assert(!w.document.querySelector('#csvSelected').disabled);w.document.querySelector('#csvSelected').click();assert(exported);assert(exported.text.startsWith('\ufeff"Unit";"Englisch";"Deutsch"'));assert.equal(exported.text.split('\r\n').length,2);w.document.querySelector('#csvAll').click();assert.equal(exported.text.split('\r\n').length,inputs.length+1);w.document.querySelector('#csvClear').click();assert(w.document.querySelector('#csvSelected').disabled);
// Closed sections must not become selected merely because they exist in the DOM.
w.document.querySelectorAll('#vlist details').forEach(sec=>sec.open=false);
w.document.querySelector('#csvVisible').click();assert(w.document.querySelector('#csvSelected').disabled);
const first=w.document.querySelector('#vlist details');first.open=true;
w.document.querySelector('#csvVisible').click();w.document.querySelector('#csvSelected').click();
assert.equal(exported.text.split('\r\n').length,first.querySelectorAll('[data-csv-key]').length+1);
w.document.querySelector('#csvClear').click();
const group=w.document.querySelector('[data-csv-group]');group.click();
const groupIds=group.dataset.csvGroup.split(',');
const expected=[...w.document.querySelectorAll('#vlist [data-sec]')].filter(sec=>groupIds.includes(sec.dataset.sec)).reduce((n,sec)=>n+sec.querySelectorAll('[data-csv-key]').length,0);
w.document.querySelector('#csvSelected').click();assert.equal(exported.text.split('\r\n').length,expected+1);
group.click();assert(w.document.querySelector('#csvSelected').disabled);
const query=w.document.querySelector('#lq');query.value='a';query.dispatchEvent(new w.Event('input'));
const hits=w.document.querySelectorAll('#vlist .vrow:not(.off) [data-csv-key]').length;
w.document.querySelectorAll('#vlist details').forEach(sec=>sec.open=false);
w.document.querySelector('#csvVisible').click();w.document.querySelector('#csvSelected').click();assert(hits>0);assert.equal(exported.text.split('\r\n').length,hits+1);
console.log(folder+' CSV selection passed');w.close();}
