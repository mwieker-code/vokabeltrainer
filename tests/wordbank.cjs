/* Die Word Bank beim Gap-Filling.

   Der Fehler, gegen den dieser Test steht: In einem Year-6-Test stand
   die Word Bank in derselben Reihenfolge wie die Luecken darunter.
   Damit war der Test durch blosses Abzaehlen zu loesen, ohne ein
   einziges Wort zu kennen.

   Geprueft wird beides: dass die Regel im Prompt steht, wo es eine
   Word Bank gibt - Klasse 5 und 6 mit Gap-Filling -, und dass sie
   fehlt, wo es keine gibt. Sonst erklaert der Prompt eine Word Bank,
   die im Test gar nicht vorkommt. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function prompt(folder,typen){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window; w.scrollTo=()=>{};
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},
    addListener(){},removeListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  /* Ein paar Dutzend Vokabeln reichen: Alle 825 einzeln anzuhaken
     dauert in jsdom laenger als der ganze uebrige Test. */
  vm.runInContext("S.view='list';render();",c);
  const d=w.document;
  [...d.querySelectorAll('button')].find(b=>/Vokabeln auswählen/.test(b.textContent)).click();
  for(const i of [...d.querySelectorAll('.csv-check input')].slice(0,30)){
    if(!i.checked){i.checked=true;i.dispatchEvent(new w.Event('change',{bubbles:true}));}
  }
  d.getElementById('selectionPrompt').click();
  const dlg=d.querySelector('.test-prompt-dialog');
  assert.ok(dlg,folder+': kein Prompt-Dialog');
  dlg.querySelectorAll('[name=taskType]').forEach(i=>{i.checked=typen.includes(i.value);
    i.dispatchEvent(new w.Event('change',{bubbles:true}));});
  dlg.querySelector('#promptCount').value='4';
  dlg.querySelector('#promptBalance').click();
  dlg.querySelector('#promptConfig').dispatchEvent(new w.Event('submit',{cancelable:true}));
  const text=dlg.querySelector('#promptText').value;
  assert.ok(text,folder+': kein Prompt erzeugt ('+typen.join(',')+')');
  dom.window.close();
  return text;
}

const REGEL=/Sortiere die Word Bank alphabetisch nach dem deutschen Begriff/;
const KONTROLLE=/Die Word Bank steht alphabetisch nach dem deutschen Begriff/;

/* ---- Klasse 5 und 6 mit Gap-Filling: die Regel steht da ---- */
for(const jahr of ['year5','year6']){
  const t=prompt(jahr,['gap']);
  assert.match(t,/Word Bank/,jahr+': keine Word Bank im Prompt');
  assert.match(t,REGEL,jahr+': der Prompt sagt nicht, wie die Word Bank zu ordnen ist');
  assert.match(t,/niemals in der Reihenfolge der Lücken/,
    jahr+': die Reihenfolge der Lücken ist nicht ausdrücklich verboten');
  assert.match(t,KONTROLLE,jahr+': die Schlusskontrolle prüft die Word Bank nicht');
}

/* ---- Ohne Gap-Filling gibt es keine Word Bank, also auch keine Regel ---- */
{
  const t=prompt('year6',['matching']);
  assert.ok(!REGEL.test(t),'year6 ohne Gap-Filling: die Word-Bank-Regel steht trotzdem da');
  assert.ok(!KONTROLLE.test(t),'year6 ohne Gap-Filling: die Schlusskontrolle steht trotzdem da');
  assert.match(t,/Keine Word Bank/,'year6 ohne Gap-Filling: der Prompt schliesst die Word Bank nicht aus');
}

/* ---- Ab Klasse 7 gibt es gar keine Word Bank ---- */
{
  const t=prompt('year8',['gap']);
  assert.match(t,/ohne Word Bank/,'year8: der Prompt erlaubt eine Word Bank');
  assert.ok(!REGEL.test(t),'year8: die Word-Bank-Regel steht da, obwohl es keine Word Bank gibt');
  assert.ok(!KONTROLLE.test(t),'year8: die Schlusskontrolle steht da, obwohl es keine Word Bank gibt');
}

console.log('Word Bank: alphabetisch statt in der Reihenfolge der Lücken, und nur dort erklärt, wo es sie gibt');
