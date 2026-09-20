/* Wo die Luecke im Beispielsatz sitzt.

   Der Fehler, gegen den dieser Test steht: Bei "his - his name" fand
   die Seite die Wendung im Satz nicht und fiel auf "nimm das letzte
   Wort" zurueck - die Luecke sass auf "name", einer anderen Vokabel
   derselben Unit, waehrend "sein/e" gefragt war. Ein Kind konnte das
   nur am Zusammenhang erkennen.

   Geprueft wird deshalb der Zusammenhang selbst: Jedes Wort der Luecke
   muss zum Eintrag gehoeren. Eine mehrwoertige Luecke ist dabei immer
   in Ordnung - sie entsteht nur, wenn die ganze Wendung der Reihe nach
   im Satz steht. Eine einwoertige muss sich auf ein Wort des Eintrags
   zurueckfuehren lassen. */
const fs=require('fs'), path=require('path'), vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

const quelle=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8')
  .match(/clozeParts = function\(v\)\{[\s\S]*?\n  \};/);
assert.ok(quelle,'clozeParts steht nicht mehr in learning.js');
const ctx=vm.createContext({String,RegExp,Math});
vm.runInContext('var clozeParts;'+quelle[0],ctx);
const zerlege=v=>vm.runInContext('clozeParts('+JSON.stringify(v)+')',ctx);

const worte=s=>s.toLowerCase().split(/[^a-zäöüß'-]+/).filter(Boolean);
function gehoertDazu(wort, teile){
  return teile.some(t =>
    wort===t
    || t.endsWith('-') && wort.startsWith(t)
    || t.length>=3 && wort.startsWith(t.slice(0,Math.min(4,t.length)))
    || wort.length>=3 && t.startsWith(wort.slice(0,Math.min(4,wort.length))));
}

const seiten=['year5','year6','year7','year8','year9','year10','oberstufe','bili/history'];
let geprueft=0, ohne=0;
const fremd=[], strich=[];
for(const f of seiten){
  const html=fs.readFileSync(path.join(root,f,'index.html'),'utf8');
  const SETS=eval('('+html.match(/const SETS = (\{[\s\S]*?\n\});/)[1]+')');
  for(const [id,liste] of Object.entries(SETS)) for(const v of liste){
    /* Ein Gedankenstrich im englischen Feld haengt eine Wendung an das
       Stichwort. Beim Tippen muesste man sie mit eingeben. */
    if(/\s[-–]\s/.test(v.en)) strich.push(f+' '+id+': '+v.en);
    const r=zerlege(v);
    if(!r){ ohne++; continue; }
    geprueft++;
    const luecke=worte(r.word);
    if(luecke.length>1) continue;
    const teile=worte(r.core);
    if(!gehoertDazu(luecke[0],teile))
      fremd.push(f+' '+id+': '+JSON.stringify(v.en)+' -> Luecke '+JSON.stringify(r.word)
        +' im Satz "'+v.example_en+'"');
  }
}

assert.equal(strich.length,0,
  'Eintraege mit Gedankenstrich im englischen Feld:\n  '+strich.join('\n  '));
assert.equal(fremd.length,0,
  'Die Luecke sitzt auf einem Wort, das nicht zum Eintrag gehoert:\n  '+fremd.slice(0,10).join('\n  '));
assert.ok(geprueft>5000,'nur '+geprueft+' Luecken gefunden');

/* Und die Faelle, die den Fehler ausgeloest haben, namentlich. */
for(const [en,satz,erwartet] of [
    ['his','His name is Justin.','His'],
    ['their','Their names are Justin and Emma.','Their'],
    ['to raise awareness','The campaign raised awareness and changed nothing.','raised awareness'],
    ['(to) look up','We looked up and saw thousands of stars.','looked up']]){
  const r=zerlege({en,example_en:satz});
  assert.equal(r && r.word, erwartet, JSON.stringify(en)+': Luecke sitzt falsch');
}
console.log('Lücken: '+geprueft+' geprüft, '+ohne+' Einträge ohne Lücke, keine fremden Wörter');
