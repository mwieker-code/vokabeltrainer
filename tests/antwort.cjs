/* Was beim Tippen als richtig zaehlt.
   Der Eintrag traegt Klammern, Schraegstriche und Platzhalter - die
   Antwort eines Schuelers traegt sie nicht. Geprueft wird, dass beide
   Schreibweisen dasselbe bedeuten, und dass die Nachsicht dort endet,
   wo zwei verschiedene Woerter stehen. */
const {JSDOM,VirtualConsole}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,
    url:'https://example.org/'+folder+'/'});
  const w=dom.window;w.scrollTo=()=>{};
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){}});
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  return {pruefe:(i,t)=>vm.runInContext('checkTyped('+JSON.stringify(i)+','+JSON.stringify(t)+')',c),
          sets:vm.runInContext('SETS',c)};
}

const RICHTIG=[
  /* Das "to" gehoert zum Eintrag, nicht zur Antwort. */
  ['go','(to) go'],['to go','(to) go'],['go','to go'],['enjoy','to enjoy'],
  ['look at','(to) look at'],['phone','(to) phone sb.'],['be into','to be into sth.'],
  ['beg','(to) beg (for)'],['beg for','(to) beg (for)'],['to beg for','(to) beg (for)'],
  ['react to','to react (to)'],['suggest','(to) suggest sth.'],
  /* Der Schraegstrich in der Klammer trennt Ergaenzungen, nicht Loesungen. */
  ['stay','to stay (at/with)'],['stay at','to stay (at/with)'],['stay with','to stay (at/with)'],
  ['seem','to seem (to be/do)'],['were','(we/you/they) were'],['they were','(we/you/they) were'],
  ['stand up','to stand up (for/against sth./sb.)'],['furious with','furious (with/at sb.)'],
  /* Verneinungen: lang, kurz, ohne Apostroph. */
  ["doesn't",'does not'],['doesnt','does not'],['does not',"doesn't"],
  ["wasn't",'was not'],['was not',"wasn't"],['havent','have not'],['have not',"haven't"],
  ["can't",'cannot'],['cannot',"can't"],['cant','can not'],
  ["won't",'will not'],['will not',"won't"],['isnt','is not'],['are not',"aren't"],
  ['did not',"didn't"],['were not',"weren't"],["hasn't",'has not'],["shouldn't",'should not'],
  ['I do not know.',"I don't know."],['Do not go.',"Don't go."],
  ['he/she/it is not ...',"he/she/it isn't ..."]
];

/* Nachsicht heisst nicht Beliebigkeit. Die positiven Kurzformen sind
   ohne Apostroph eigene Woerter - sie duerfen nicht zusammenfallen. */
const FALSCH=[['stay','to go'],['were','we are'],['its','it is'],['shed','she would'],
  ['well','we will'],['ill','i will'],['do','do not'],['not','is not'],['cat','dog']];

for(const folder of ['year5','year7','oberstufe','bili/history']){
  const {pruefe,sets}=seite(folder);
  for(const [antwort,eintrag] of RICHTIG)
    assert.equal(pruefe(antwort,eintrag),'ok',
      folder+': "'+antwort+'" sollte zu "'+eintrag+'" passen');
  for(const [antwort,eintrag] of FALSCH)
    assert.notEqual(pruefe(antwort,eintrag),'ok',
      folder+': "'+antwort+'" darf nicht als "'+eintrag+'" durchgehen');
  assert.equal(pruefe('coastel','coastal'),'near',folder+': Tippfehler nicht als Fast erkannt');
  assert.equal(pruefe('','go'),'no',folder+': leere Eingabe');

  /* Und die Probe aufs Ganze: Wer abschreibt, was als Loesung
     dasteht - mit Klammern, Schraegstrichen und sb./sth. -, hat
     richtig geantwortet. */
  let daneben=[];
  for(const v of Object.values(sets).flat())
    if(pruefe(v.en,v.en)!=='ok') daneben.push(v.en);
  assert.equal(daneben.length,0,
    folder+': Loesung abgetippt und nicht anerkannt: '+daneben.slice(0,5).join(' | '));

  console.log(folder+': to-Formen, Klammern, Verneinungen und alle '+
    Object.values(sets).flat().length+' Eintraege passen');
}
