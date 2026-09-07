const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let count=0;
for(const folder of ['year5','year6','year9','year10','oberstufe']){
 const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'});
 const w=dom.window;w.scrollTo=()=>{};
 const run=code=>vm.runInContext(code,dom.getInternalVMContext());
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));

 const ok=(val,msg)=>{assert.ok(val,folder+': '+msg);count++;};
 ok(!w.document.querySelector('#learnToday'),'daily learning removed');
 ok(!!w.document.querySelector('a[href="grammar/"]')===(folder==='year6'),'grammar belongs to Year 6 only');
 ok(!w.document.querySelector('[data-year]'),'no duplicate year selection');
 if(folder==='oberstufe'){
  ok(w.document.querySelector('#all a[href="../all/analysis/"]'),'analysis nested under upper-school ALL');
  ok(w.document.querySelector('#all').open,'ALL expanded on normal entry');
  ok(w.document.querySelector('#all .ycount').textContent.startsWith('3 Themen'),'analysis included in topic count');
 }
 else ok(!w.document.querySelector('a[href*="analysis/"]'),'analysis absent from other year groups');
 for(const [answer,target] of [['Geschäft','Geschäft, Unternehmen'],['colonise','(to) colonize / colonise'],['apply for','(to) apply (for sth.)'],['Kumpel','Kumpel; Freund/in']])
  ok(run(`checkTyped(${JSON.stringify(answer)},${JSON.stringify(target)})`)==='ok','alternative '+answer);
 ok(run(`checkTyped('coastel','coastal')`)==='near','typo feedback');
 ok(run(`checkTyped('wrong','coastal')`)==='no','wrong feedback');
 ok(run(`checkTyped('','coastal')`)==='no','blank rejected');
 w.document.querySelector('[data-topic]').click();
 w.document.querySelector('[data-scope="short"]').click();
 ok(run('S.queue.length')===10,'ten cards');
 ok(w.document.querySelector('.box-details'),'collapsible boxes');
 run('S.revealed=true; rate(0)');
 ok(run('S.queue.length')===11,'one retry added');
 ok(run('S.queue[10]===S.queue[0]'),'retry after initial pass');
 run('S.i=10;S.revealed=true;rate(0)');
 ok(run('S.queue.length')===11,'retries bounded');
 // Restart, exercise typed answer persistence through a full redraw.
 run(`S.mode='type';buildQueue();render()`);
 let input=w.document.querySelector('#typeIn');input.value='completely wrong';
 w.document.querySelector('#submit').click();
 ok(w.document.querySelector('#typeIn').value==='completely wrong','entered answer preserved');
 ok(w.document.querySelector('.correction mark'),'differences highlighted');
 run('render()');
 ok(w.document.querySelector('.correction'),'feedback survives rerender');
 run('rate(2)');
 ok(run('S.queue.length')===11,'wrong cannot be rated known');
 // End-to-end finite round and next action.
 run(`while(S.i<S.queue.length){S.revealed=true;S.answered='no';rate(0);}`);
 ok(w.document.querySelector('#doneHome'),'round ends');
 ok(run('S.seen<=20'),'round bounded to twenty attempts');
 w.document.querySelector('#doneHome').click();
 ok(w.document.querySelector('[data-topic]'),'back to topic selection');
 // Existing progress record survives startup/renders; no renamed storage keys.
 const key=run('KEY');ok(w.localStorage.getItem(key),'progress saved under original key');
 const saved=JSON.parse(w.localStorage.getItem(key));
 ok(Object.keys(saved).length>0,'record retained');
 const restored=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'});
 restored.window.localStorage.setItem(key,JSON.stringify(saved));
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],restored.getInternalVMContext());
 vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),restored.getInternalVMContext());
 ok(JSON.stringify(JSON.parse(restored.window.localStorage.getItem(key)))===JSON.stringify(saved),'saved progress unchanged after reload');
 restored.window.close();
 // No due cards: no hidden fallback to the whole vocabulary.
 run(`for(const t of TOPICS)for(const v of SETS[t.id]||[]){const r=${folder==='oberstufe'?'rec(t.id,S.dir,v.id)':'rec(S.dir,v.id)'};r.due=Date.now()+86400000;} S.onlyDue=true;S.view="session";buildQueue();render();`);
 ok(run('S.queue.length')===0,'no due means empty');
 ok(w.document.querySelector('#practiceAll'),'explicit practice offered');
 w.document.querySelector('#practiceAll').click();
 ok(run('S.queue.length')===10,'optional practice works');
 // Cloze works without mutating the selected source and grading requires actual inflection.
 run(`S.mode='cloze';S.onlyDue=false;buildQueue();render()`);
 ok(run('S.queue.every(hasCloze)'),'cloze only eligible words');
 ok(run('INTERVALS[1]===0 && INTERVALS[2]===1 && INTERVALS[5]===8'),'intervals match help');
 run('S.mode="card";S.view="home";render()');
 w.document.querySelector('[data-topic]').click();
 w.document.querySelector('[data-scope="all"]').click();
 ok(run('S.queue.length === (typeof YEARS === "undefined" ? SETS[S.roundSource].length : setOf(S.roundSource).length)'),'all includes future-due words');
 run('S.mode="card";buildQueue();S.revealed=true;rate(2)');
 const remaining=run('S.queue.map(v=>v.id).join(",")');
 w.document.querySelector('#back').click();
 ok(w.document.querySelector('#resumeRound'),'resume offered');
 w.document.querySelector('#resumeRound').click();
 ok(run('S.i===1'),'resume keeps position');
 ok(run('S.queue.map(v=>v.id).join(",")')===remaining,'resume keeps order');
 dom.window.close();
 console.log(folder+' passed');
}
console.log(count+' checks passed');
