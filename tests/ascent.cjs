const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const folder of ['year5','year6','year7','year8','year9','year10','oberstufe']){
 const html=fs.readFileSync(folder+'/index.html','utf8');
 assert.match(html,/ascent\.js/);assert.match(html,/inp\.focus\(\{preventScroll:true\}\)/);
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>({measureText:()=>({width:10})});w.scrollTo=()=>{};w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=f=>w.setTimeout(()=>f(w.performance.now()),0);w.cancelAnimationFrame=w.clearTimeout.bind(w);
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync('assets/learning.js','utf8'));run(fs.readFileSync('assets/ascent.js','utf8'));
 assert.equal(w.document.querySelectorAll('.ascent-panel').length,0);
 w.document.querySelector('[data-topic]').click();w.document.querySelector('[data-scope="short"]').click();
 run("S.mode='type';buildQueue();render();");
 const panel=()=>w.document.querySelector('.ascent-panel');
 assert.equal(panel().querySelector('.ascent-percent').textContent,'0 %',folder);
 run("Object.assign(current(),{en:'school',de:'Schule',pos:'noun'});S.dir='de2en';render();");
 w.document.querySelector('#typeIn').value='school';w.document.querySelector('#submit').click();
 assert.equal(panel().querySelector('.ascent-streak').textContent,'1 in Folge');
 assert.equal(panel().querySelector('.ascent-percent').textContent,'10 %');run('render();');
 assert.equal(w.document.querySelectorAll('.ascent-panel').length,1);
 run('rate(2);');w.document.querySelector('#typeIn').value='wrong';w.document.querySelector('#submit').click();
 assert.equal(panel().querySelector('.ascent-streak').textContent,'0 in Folge');
 run('rate(0);S.i=S.initialCount;render();');assert.equal(panel().querySelector('.ascent-percent').textContent,'100 %');
 run('S.i=S.queue.length;render();');assert.ok(panel().classList.contains('ascent-summit'));
 run("S.mode='cloze';buildQueue();render();");assert.equal(panel().querySelector('.ascent-percent').textContent,'0 %');
 run("S.mode='mc';buildQueue();render();");assert.equal(w.document.querySelectorAll('.ascent-panel').length,0);
 dom.window.close();
}
console.log('Mountain: all seven year groups, progress, streak, retries, finish and mode changes passed.');
