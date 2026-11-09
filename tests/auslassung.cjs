/* Auslassungspunkte sind Platzhalter: "by ..." ist mit "by" richtig
   beantwortet, ebenso mit "by ..." oder "by …". Geprueft fuer jeden
   Eintrag mit Punkten auf jeder Vokabelseite, in beiden Richtungen. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const pages=['year5','year6','year7','year8','year9','year10','oberstufe','bili/history','bili/geography'];
for(const rel of pages){
 const html=fs.readFileSync(path.join(root,rel,'index.html'),'utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+rel+'/'});
 dom.window.scrollTo=()=>{};dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
 const c=dom.getInternalVMContext(),run=s=>vm.runInContext(s,c);
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
 const words=Object.values(run('SETS')).flat();
 const check=(input,target)=>run('checkTyped('+JSON.stringify(input)+','+JSON.stringify(target)+')');
 for(const v of words)for(const target of [v.en,v.de]){
  if(!target||!/\.\.\.|…/.test(target)||/[(\/,;]/.test(target))continue;
  const ohne=target.replace(/\.{2,}|…/g,' ').replace(/\s+/g,' ').trim();
  ok(check(ohne,target)==='ok',rel+': ohne Punkte richtig: '+target);
  ok(check(target,target)==='ok',rel+': wie geschrieben richtig: '+target);
  ok(check(target.replace(/\.\.\./g,'…'),target)==='ok',rel+': mit … richtig: '+target);
 }
 if(rel==='year6'){
  ok(check('by','by ...')==='ok'&&check('By','by ...')==='ok','year6: by');
  ok(check('bye','by ...')!=='ok','year6: bye bleibt nicht richtig');
 }
 dom.window.close();
}
console.log(checks+' Auslassungspunkte checks passed');
