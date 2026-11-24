/* Hoerrunde: Die Seite spricht ein Wort, man schreibt es auf
   (uebernommen aus Camp de Base, dem Franzoesisch-Trainer).

   Geprueft wird ohne echte Stimme: speechSynthesis ist nachgebaut und
   merkt sich, was gesprochen werden sollte. Gesprochen wird beim Start,
   beim Weiter und auf Knopfdruck, langsam mit kleinerem Tempo. Ohne
   englische Stimme (aber mit anderen) gibt es keinen Startknopf. */
const {JSDOM,VirtualConsole}=require('jsdom');
const vm=require('node:vm');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

function seite(folder,stimmen){
  const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
  const stille=new VirtualConsole();
  stille.on('jsdomError',e=>{ if(!/getContext/.test(String(e.message))) throw e; });
  const dom=new JSDOM(html,{runScripts:'outside-only',virtualConsole:stille,url:'https://example.org/'+folder+'/'});
  const w=dom.window;w.scrollTo=()=>{};
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  const gesprochen=[];
  w.SpeechSynthesisUtterance=function(t){this.text=t;};
  w.speechSynthesis={speaking:false,pending:false,paused:false,getVoices:()=>stimmen,
    speak(u){gesprochen.push({text:u.text,rate:u.rate,lang:u.lang});},cancel(){gesprochen.abgebrochen=(gesprochen.abgebrochen||0)+1;this.speaking=false;},resume(){},addEventListener(){}};
  const c=dom.getInternalVMContext();
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/learning.js'),'utf8'),c);
  return {w,d:w.document,gesprochen,lauf:code=>vm.runInContext(code,c)};
}
const EN=[{name:'Daniel',lang:'en-GB',localService:true}];
const warte=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
for(const folder of ['year5','year6','year7','year8','year9','year10']){
  const s=seite(folder,EN);
  s.d.getElementById('practiceAcross').click();
  const knopf=s.d.getElementById('startHoeren');
  assert.ok(knopf,folder+': kein Startknopf fuer die Hoerrunde');
  knopf.click();
  const woerter=JSON.parse(s.lauf('JSON.stringify(S.hr.woerter)'));
  assert.equal(woerter.length,10,folder+': zehn Woerter');
  assert.ok(woerter.every(v=>!/[\/…:()]|\.\.\./.test(v.en.replace(/^\(to\)\s*/i,''))),folder+': kein Eintrag mit Schraegstrich, Klammer oder Auslassung');
  assert.equal(s.gesprochen.length,1,folder+': beim Start wird gesprochen');
  assert.equal(s.gesprochen[0].lang,'en-GB');
  /* Nochmal und langsam */
  s.d.getElementById('hrLangsam').click();
  assert.ok(s.gesprochen.at(-1).rate<0.9,folder+': langsam ist langsamer');
  s.d.getElementById('hrNochmal').click();
  assert.equal(s.gesprochen.at(-1).rate,0.9);
  /* iOS meldet manchmal noch "spricht", obwohl die Stimme fertig ist.
     Dann darf "Langsam" nicht nur anhalten, sondern muss neu sprechen. */
  const w=s.w.speechSynthesis;w.speaking=true;
  const vorher=s.gesprochen.length;
  s.d.getElementById('hrLangsam').click();
  assert.equal(s.gesprochen.abgebrochen,1,folder+': haengende Stimme wird abgebrochen');
  await warte(320);
  assert.equal(s.gesprochen.length,vorher+1,folder+': danach wird langsam neu gesprochen');
  assert.equal(s.gesprochen.at(-1).rate,0.1,folder+': langsam ist das langsamste Tempo');
  /* Fest: ein Eintrag mit Komma-Gruppen (unregelmaessige Verben) */
  {const alt=s.lauf('JSON.stringify(S.hr.woerter[0])');
   s.lauf("S.hr.woerter[0]={en:'(to) swing, swung, swung',de:'schwingen'};S.hr.i=0;S.hr.antwort=null;render()");
   s.d.getElementById('hrLangsam').click();assert.equal(s.gesprochen.at(-1).text,'swing. swung. swung',folder+': Gruppenpausen');
   s.d.getElementById('hrNochmal').click();assert.equal(s.gesprochen.at(-1).text,'swing, swung, swung',folder+': normal unveraendert');
   s.lauf('S.hr.woerter[0]='+alt+';render()');}
  /* Mehrteilige Eintraege bekommen langsam Pausen zwischen den Woertern */
  {const mehr=woerter.find(v=>/\s/.test(v.en.replace(/^\(to\)\s*/i,'').replace(/^to\s+/i,'').replace(/\b(?:sb|sth)\b\.?/gi,'').trim()));
   if(mehr){s.lauf('S.hr.i='+woerter.indexOf(mehr)+';render()');s.d.getElementById('hrLangsam').click();
     const langsam=s.gesprochen.at(-1).text;
     s.d.getElementById('hrNochmal').click();
     const normal=s.gesprochen.at(-1).text;
     /* Langsam: hinter jedem Wort eine Pause; normal klingt anders */
     assert.ok(langsam!==normal&&langsam.split(' ').slice(0,-1).every(w=>/[,.]$/.test(w)),folder+': Wortpausen nur bei Langsam ('+mehr.en+': '+langsam+' / '+normal+')');
     s.lauf('S.hr.i=0;render()');}}
  for(let i=0;i<10;i++){
    const v=woerter[i];
    const feld=s.d.getElementById('typeIn');
    /* Richtig, mit Tippfehler oder falsch - abwechselnd. Was "fast" ist,
       entscheidet die Seite selbst (checkTyped). */
    const eingabe=i%3===0?v.en.replace(/^\(to\)\s*/i,''):i%3===1?v.en.replace(/^\(to\)\s*/i,'').slice(0,-1):'xqzw';
    feld.value=eingabe;
    const erwartet=s.lauf('checkTyped('+JSON.stringify(eingabe)+','+JSON.stringify(v.en)+')');
    if(i%3===0)assert.equal(erwartet,'ok',folder+': '+v.en+' abgeschrieben ist richtig');
    if(i%3===2)assert.equal(erwartet,'no');
    s.d.getElementById('submit').click();
    assert.ok(s.d.querySelector('.hr-loesung.'+erwartet),folder+': '+feld.value+' / '+v.en+' sollte '+erwartet+' sein');
    assert.ok(s.d.querySelector('.hr-loesung').textContent.includes(v.de),folder+': Bedeutung nach der Antwort');
    const vorher=s.gesprochen.length;
    s.d.getElementById('hrWeiter').click();
    if(i<9)assert.equal(s.gesprochen.length,vorher+1,folder+': Weiter spricht das naechste Wort');
  }
  assert.match(s.d.querySelector('.summary-number').textContent,/^\d+ \/ 10$/);
  const nochmal=s.d.getElementById('missedPractice');
  assert.ok(nochmal&&/noch einmal hören/.test(nochmal.textContent),folder+': Fehler noch einmal hoeren');
  nochmal.click();
  assert.ok(s.lauf('S.hr.woerter.length')<10,folder+': nur die falschen');
  s.w.close();
}
/* Stimmen da, aber keine englische: keine Hoerrunde */
{const s=seite('year7',[{name:'Thomas',lang:'fr-FR',localService:true}]);
 s.d.getElementById('practiceAcross').click();
 assert.equal(s.d.getElementById('startHoeren'),null,'ohne englische Stimme keine Hoerrunde');
 s.w.close();}
/* Liste noch leer (iOS am Anfang): die Runde wird angeboten */
{const s=seite('year7',[]);
 s.d.getElementById('practiceAcross').click();
 assert.ok(s.d.getElementById('startHoeren'),'leere Stimmenliste: Hoerrunde trotzdem da');
 s.w.close();}
})().then(()=>console.log('Hörrunde: zehn Wörter, sprechen beim Start, Weiter und auf Knopfdruck, prüfen wie beim Tippen, in Year 5 bis 10; Langsam auch bei hängender Stimme')).catch(e=>{console.error(e);process.exit(1);});
