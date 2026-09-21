/* Die Rueckmeldetoene.

   Der Fehler, gegen den dieser Test steht: Sie waren aus, bis jemand
   sie einschaltet - und der einzige Schalter steht ganz unten auf der
   Seite, hinter der Karte, dem Tastenfeld und der Fusszeile. Ein Kind
   findet ihn nicht und erfaehrt nie, dass es ihn gibt.

   Geprueft wird deshalb beides: dass sie ohne Zutun klingen, und dass
   eine ausdrueckliche Abschaltung stehen bleibt. Das zweite ist der
   Teil, der beim Umstellen leicht verlorengeht. */
const {JSDOM}=require('jsdom');
const fs=require('fs'),vm=require('vm'),path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const quelle=fs.readFileSync(path.join(root,'assets/feedback.js'),'utf8');

function starten(gespeichert){
  const dom=new JSDOM('<!doctype html><div class="wrap"></div>',
    {url:'https://example.org/',runScripts:'outside-only'});
  const w=dom.window;
  if(gespeichert!==undefined) w.localStorage.setItem('vt:feedback:v1',gespeichert);
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){}});
  /* Ein Klangwerk zum Mitzaehlen: jsdom bringt keines mit. */
  const werk={gebaut:0,geweckt:0,zustand:'suspended'};
  w.AudioContext=function(){
    werk.gebaut++;
    return {get state(){return werk.zustand;},
      resume(){werk.geweckt++;werk.zustand='running';return Promise.resolve();},
      currentTime:0,sampleRate:44100,
      createBuffer:(a,b)=>({getChannelData:()=>new Float32Array(b)}),
      createConvolver:()=>({connect(){},set buffer(v){}}),
      createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}),
      createOscillator:()=>({type:'',frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}}),
      createBufferSource:()=>({connect(){},start(){},set buffer(v){}}),
      createBiquadFilter:()=>({type:'',frequency:{value:0},Q:{value:0},connect(){}}),
      destination:{}};
  };
  vm.runInContext(quelle,dom.getInternalVMContext());
  dom.__werk=werk;
  const knopf=k=>w.document.querySelector('[data-feedback-pref="'+k+'"]');
  return {w,knopf,text:k=>knopf(k).textContent,werk:dom.__werk};
}

/* Ohne gespeicherte Wahl: Ton an. */
{
  const t=starten();
  assert.equal(t.text('sound'),'Töne: an','frisch im Browser sind die Töne aus');
  assert.equal(t.text('animation'),'Animationen: an','frisch im Browser sind die Animationen aus');
  console.log('frischer Browser: Töne an, Animationen an');
}

/* Wer sie abschaltet, behaelt das - auch ueber das Neuladen hinweg. */
{
  const t=starten('{"sound":false,"animation":true}');
  assert.equal(t.text('sound'),'Töne: aus','die Abschaltung wird übergangen');
  console.log('ausdrücklich abgeschaltet: bleibt aus');
}
{
  const t=starten('{"sound":true,"animation":false}');
  assert.equal(t.text('sound'),'Töne: an');
  assert.equal(t.text('animation'),'Animationen: aus','die Abschaltung der Animationen wird übergangen');
  console.log('Animationen getrennt abschaltbar');
}

/* Ein Klick schaltet um und legt die Wahl ab. */
{
  const t=starten();
  t.knopf('sound').click();
  assert.equal(t.text('sound'),'Töne: aus','der Schalter wirkt nicht');
  const abgelegt=JSON.parse(t.w.localStorage.getItem('vt:feedback:v1'));
  assert.equal(abgelegt.sound,false,'die Wahl wird nicht gespeichert');
  console.log('Schalter wirkt und merkt sich die Wahl');
}

/* Kaputtes oder fremdes Gespeichertes darf nicht zum Verstummen fuehren. */
for(const müll of ['','null','{}','nicht json','[1,2,3]']){
  const t=starten(müll);
  assert.equal(t.text('sound'),'Töne: an','unbrauchbarer Speicherstand schaltet die Töne ab: '+JSON.stringify(müll));
}
console.log('unbrauchbarer Speicherstand: Töne bleiben an');

/* ---- Der alte Tongenerator ist fort ----
   Jede Jahrgangsseite brachte ein eigenes Sfx mit: neunundvierzig Zeilen
   Web Audio, ein eigener Speicherschluessel und ein Knopf in der Runde,
   den learning.js gleich wieder entfernte. Gespielt hat davon nichts -
   learning.js ersetzte Sfx.play durch den Aufruf der Rueckmeldung.
   Bleibt davon etwas stehen, gibt es wieder zwei Wege zum selben Ton. */
{
  const seiten=fs.readdirSync(root,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&!['dist','node_modules','.git','tests','content','probe'].includes(e.name))
    .map(e=>path.join(root,e.name,'index.html')).filter(f=>fs.existsSync(f));
  assert.ok(seiten.length>=7,'zu wenige Seiten gefunden: '+seiten.length);
  for(const f of seiten){
    const t=fs.readFileSync(f,'utf8'), kurz=path.relative(root,f);
    for(const rest of ['const Sfx','Sfx.play','Sfx.toggle','Sfx.enabled','sfxBtn',':sfx'])
      assert.equal(t.includes(rest),false,kurz+': vom alten Tongenerator steht noch '+rest);
  }
  const gemeinsam=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8');
  /* Ohne Kommentare geprueft: Der Kommentar, der die Geschichte erklaert,
     darf den Namen nennen - der Code nicht mehr. */
  const ohneKommentar=gemeinsam.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  assert.equal(/Sfx|sfxBtn/.test(ohneKommentar),false,
    'learning.js stuetzt den alten Tongenerator noch');
  /* Die Auswahl gibt ihre Rueckmeldung im Klick der Antwortknoepfe. Sie
     stand frueher in jeder Jahrgangsseite und fehlte der Oberstufe und
     Bili ganz - dort blieb dieser Modus stumm. */
  assert.match(ohneKommentar,/\[data-opt\][\s\S]{0,400}LearningFeedback\?\.signal/,
    'die Auswahl gibt keine Rückmeldung mehr');
  console.log('alter Tongenerator: restlos fort, Auswahl zentral vertont');
}

/* ---- Der Klang muss beim Fingerdruck wach sein ----
   Safari laesst Web Audio nur zu, wenn der Kontext in einer echten
   Fingerbewegung entsteht oder geweckt wird. Vorher geschah beides erst,
   wenn der erste Ton faellig war, und der Klang wurde dann noch hinter
   einem resume().then() gebaut - dieser Rueckgabepunkt zaehlt dort nicht
   mehr zur Fingerbewegung. Am Mac blieb es deshalb still.
   Geprueft wird: kein Kontext ohne Zutun, einer beim ersten Druck, und
   das Wecken wiederholt sich - der Kontext kann zwischendurch wieder
   einschlafen. */
{
  const t=starten();
  assert.equal(t.werk.gebaut,0,'ein Klangwerk entsteht ungefragt beim Laden');
  t.w.document.dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));
  t.w.dispatchEvent(new t.w.Event('pointerdown'));
  assert.equal(t.werk.gebaut,1,'beim Fingerdruck entsteht kein Klangwerk');
  assert.ok(t.werk.geweckt>=1,'das Klangwerk wird beim Fingerdruck nicht geweckt');
  /* Wieder eingeschlafen - der naechste Druck muss erneut wecken. */
  t.werk.zustand='suspended';
  const vorher=t.werk.geweckt;
  t.w.dispatchEvent(new t.w.Event('keydown'));
  assert.ok(t.werk.geweckt>vorher,'ein eingeschlafenes Klangwerk wird nicht wieder geweckt');
  assert.equal(t.werk.gebaut,1,'es entsteht bei jedem Druck ein neues Klangwerk');
  console.log('Klang: beim Druck geweckt, auch wieder und wieder');
}
