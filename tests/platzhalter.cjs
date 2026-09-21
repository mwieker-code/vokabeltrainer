/* Jemand und etwas.

   Der Fehler, gegen den dieser Test steht: Gesucht war "to hang sth.
   up", getippt wurde "to hang something up" - und das galt als falsch.
   Die Seite nahm nur die Abkuerzung aus der Eingabe, und auch die nur
   mit Punkt.

   Der heikle Teil ist nicht die Abkuerzung, sondern das ausgeschriebene
   Wort: "something" ist in Year 5 selbst eine Vokabel (etwas), und
   "someone is right" heisst "jemand hat Recht". Wuerde es einfach
   gestrichen, verloere die eine ihre Loesung und fuer die andere
   genuegte "is right". Beides wird hier mitgeprueft. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window; w.scrollTo=()=>{};
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},
    addListener(){},removeListener(){}});
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  return (eingabe,ziel)=>vm.runInContext('checkTyped('+JSON.stringify(eingabe)+','+JSON.stringify(ziel)+')',c);
}

const pruefe=seite('year5');

/* ---- Der gemeldete Fall ---- */
assert.equal(pruefe('to hang something up','to hang sth. up'),'ok','der gemeldete Fall');
assert.equal(pruefe('hang something up','to hang sth. up'),'ok');
assert.equal(pruefe('to hang sth. up','to hang sth. up'),'ok');
assert.equal(pruefe('to hang sth up','to hang sth. up'),'ok','Punkt darf fehlen');
assert.equal(pruefe('to hang up','to hang sth. up'),'ok');

/* ---- sb. ebenso, in beiden Schreibweisen ---- */
for(const e of ['to phone somebody','to phone someone','to phone sb.','to phone sb','to phone'])
  assert.equal(pruefe(e,'to phone sb.'),'ok','Eingabe: '+e);

/* ---- Auch ohne Punkt im Eintrag: so steht es in der Oberstufe ---- */
assert.equal(pruefe('to take after','to take after sb'),'ok');
assert.equal(pruefe('to take after somebody','to take after sb'),'ok');
assert.equal(pruefe('to crack down on','to crack down (on sth)'),'ok');
assert.equal(pruefe('to crack down on something','to crack down (on sth)'),'ok');

/* ---- Was dabei nicht verlorengehen darf ---- */
assert.equal(pruefe('something','something'),'ok',
  '"something" ist selbst eine Vokabel und muss seine eigene Loesung behalten');
assert.equal(pruefe('someone','someone (or: somebody)'),'ok');
assert.equal(pruefe('somebody','someone (or: somebody)'),'ok',
  'die Klammer mit "or:" nennt eine zweite Loesung, keine Ergaenzung');
assert.equal(pruefe('everybody','everyone (or: everybody)'),'ok');
assert.equal(pruefe('nobody','no one (or: nobody)'),'ok');
assert.equal(pruefe('counsellor','counselor (BE: counsellor)'),'ok');
assert.equal(pruefe('paper','newspaper (also: paper)'),'ok');
assert.equal(pruefe('newspaper','newspaper (also: paper)'),'ok');
assert.equal(pruefe('or somebody','someone (or: somebody)'),'no',
  'das Etikett selbst ist keine Loesung');
assert.equal(pruefe('someone is right','someone is right'),'ok');
assert.equal(pruefe('is right','someone is right'),'no',
  'ohne "someone" ist es nicht die Loesung von "jemand hat Recht"');
assert.equal(pruefe('something','someone (or: somebody)'),'no');

/* ---- Und der Rest bleibt, wie er war ---- */
assert.equal(pruefe('house','house'),'ok');
assert.equal(pruefe('hous','house'),'near');
assert.equal(pruefe('tree','house'),'no');
assert.equal(pruefe('','to hang sth. up'),'no');
assert.equal(pruefe('sth.','to hang sth. up'),'no','nur der Platzhalter ist keine Antwort');

console.log('Platzhalter: sb. und sth. gelten auch ausgeschrieben, "something" behaelt seine Loesung');
