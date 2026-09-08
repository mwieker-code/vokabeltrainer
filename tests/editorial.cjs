const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('assert');
const html=fs.readFileSync('year6/grammar/irregular-verbs/index.html','utf8');const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year6/grammar/irregular-verbs/'}),w=dom.window;for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())w.eval(m[1]);let n=0;function check(x){assert(x);n++;}
for(const [target,alias] of [['burnt','burned'],['learnt','learned'],['smelt','smelled'],['spelt','spelled'],['spilt','spilled']])check(w.checkForm(alias,target)==='ok');
for(const [target,wrong] of [['went','wened'],['built','builled'],['sent','sened'],['felt','felled'],['stood','stand'],['run','ran'],['were','was']])check(w.checkForm(wrong,target)!=='ok');
check(w.checkForm('ran','run')==='no');check(w.checkNeg('did not went',['did not go',"didn't go"])==='no');
check(w.V.find(v=>v.base==='beat').type==='base-past');check(w.V.find(v=>v.base==='stand up').sPp==='She has ___ to answer a question.');
for(const v of w.V){check(v.sSp.split('___').length===2&&v.sPp.split('___').length===2);check(w.checkForm(v.past,v.past)==='ok');check(w.checkForm(v.pp,v.pp)==='ok');}
for(const t of w.TOPICS){w.S.view='home';w.render();w.document.querySelector('[data-topic="'+t.id+'"]').click();check(!!w.document.querySelector('.vcard'));check(!!w.document.querySelector('#submit,#flip'));}
w.startSession('t-top20');const v=w.current();w.S.answered=true;w.S.res=['no'];w.rate(2);check(w.rec(v.id).box===1);dom.window.close();
console.log(n+' editorial regression checks passed.');
