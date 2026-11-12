/* "large" und "tall" hiessen beide nur "groß" - beim Tippen und auf den
   Karten liess sich nicht erkennen, welches Wort gemeint ist. Jetzt sagt
   ein Zusatz, worum es geht. "groß" allein bleibt als deutsche Antwort
   richtig, der Zusatz darf mitgeschrieben werden. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const html=fs.readFileSync(path.join(root,'year6/index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year6/'});
dom.window.scrollTo=()=>{};dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
const c=dom.getInternalVMContext(),run=s=>vm.runInContext(s,c);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())run(m[1]);
run(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'));
const words=Object.values(run('SETS')).flat(),check=(i,t)=>run('checkTyped('+JSON.stringify(i)+','+JSON.stringify(t)+')');
const large=words.find(v=>v.en==='large'),tall=words.find(v=>v.en==='tall');
ok(large&&tall&&large.de!==tall.de,'large und tall haben verschiedene deutsche Bedeutungen');
for(const v of [large,tall]){
 ok(/^groß \(.+\)$/.test(v.de),v.en+': "groß" mit Zusatz');
 ok(check('groß',v.de)==='ok','"groß" allein richtig fuer '+v.en);
 ok(check(v.de,v.de)==='ok','wie geschrieben richtig fuer '+v.en);
}
ok(check('large',large.en)==='ok'&&check('tall',large.en)!=='ok','large bleibt large');
/* Die Spiele lesen dieselben Daten */
const climb=fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8');
ok(climb.includes(JSON.stringify(large.de))&&climb.includes(JSON.stringify(tall.de)),'Spieldaten auf dem neuen Stand');
console.log('gross: '+checks+' Pruefungen bestanden');
