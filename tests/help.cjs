const vm=require('vm'),fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('assert');
for(const folder of ['year5','year6','year9','year10','oberstufe','year6/grammar/irregular-verbs']){
 const html=fs.readFileSync(folder+'/index.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/'+folder+'/'});
 const ctx=dom.getInternalVMContext();
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],ctx);
 const irregular=folder.includes('irregular');
 if(!irregular)vm.runInContext(fs.readFileSync('assets/learning.js','utf8'),ctx);
 vm.runInContext('renderHelp()',ctx);
 const text=dom.window.document.querySelector('.doc').textContent;
 if(!irregular){
  for(const phrase of ['Unit, Englisch, Deutsch','höchstens zehn','Später fortsetzen','Standardmäßig übst du DE → EN','Töne und Animationen','als PDF speichern'])assert(text.includes(phrase),folder+': '+phrase);
  for(const stale of ['gerade sichtbaren Einträge','example_en','Tippfehler werden verziehen','Die erste Karte erscheint'])assert(!text.includes(stale),folder+': stale '+stale);
 }else{
  assert(text.includes('beat – beat – beaten'));
  assert(!text.includes('sofort im selben Durchgang'));
  assert(text.includes('you were'));
 }
 assert(dom.window.document.getElementById('hback').onclick);
 console.log(folder+' help passed'); dom.window.close();
}
