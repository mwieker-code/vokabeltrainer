const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let count=0;
for(const year of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const html=fs.readFileSync(year+'/index.html','utf8');const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+year+'/'}),w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());w.scrollTo=()=>{};
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);run(fs.readFileSync('assets/learning.js','utf8'));
 const words=run('Object.values(SETS).flat()');assert(words.every(v=>typeof v.example_en==='string'&&v.example_en.trim()),year+' missing examples');
 if(['year7','year8'].includes(year)){
  const authored=JSON.parse(fs.readFileSync('content/'+year+'-examples.json','utf8'));assert.equal(Object.keys(authored).length,words.length);
  for(const v of words){assert.equal(v.example_en,authored[v.id]);assert(v.example_en.split(/\s+/).length>=5);}
  assert(!html.includes('Diese Wortlisten enthalten keine Beispielsätze'));
 }
 const d=w.document;d.querySelector('#allBtn').click();assert.equal(d.querySelectorAll('.vex').length,words.length,year+' example rows');
 const toggle=d.querySelector('#lex');if(toggle.getAttribute('aria-pressed')!=='true')toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'true');assert(!d.querySelector('#vlist').classList.contains('hide-ex'));
 d.querySelector('#lcsv').click();toggle.click();assert(d.querySelector('#vlist').classList.contains('selecting'));toggle.click();assert(d.querySelector('#vlist').classList.contains('selecting'));
 for(const el of d.querySelectorAll('.vex'))assert(el.textContent.trim());
 count+=words.length;console.log(year+': '+words.length+' examples present and dictionary display checked');w.close();
}
console.log(count+' vocabulary entries have examples');
