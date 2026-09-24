/* Die Fassung steht an zwei Stellen: als Versionsnummer hinter jeder
   gemeinsamen Datei in den Seiten, und in fassung.json, das die Seite
   beim Start abfragt. Gehen die beiden auseinander, laedt sich jede
   Seite bei jedem Start einmal neu - oder nie. Deshalb hier
   festgehalten, dass sie zusammenpassen. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

const datei=JSON.parse(fs.readFileSync(path.join(root,'fassung.json'),'utf8'));
assert.ok(datei.fassung,'fassung.json ohne Angabe');
assert.match(datei.fassung,/^\d{8}-[a-z]+$/,'fassung.json: unerwartete Form');

const seiten=[];
(function suche(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    /* probe/ liegt daneben, nicht in der App: abgeloeste Vorschauen mit
       eigenen Kopien von learning.js, die keine Fassung tragen und keine
       tragen sollen. Wuerden sie mitgezaehlt, muesste jede Vorschau bei
       jedem Release mitwandern. */
    if(['dist','node_modules','.git','tests','content','probe'].includes(e.name))continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())suche(p);
    else if(e.name==='index.html')seiten.push(p);
  }
})(root);

let geprueft=0, abweichend=[];
for(const seite of seiten){
  const html=fs.readFileSync(seite,'utf8');
  /* Es zaehlt die Marke an learning.js und learning.css: Aus der ersten
     liest die Seite ihre eigene Fassung. Andere Dateien tragen ihre
     eigene Marke und werden nur bewegt, wenn sie sich aendern. */
  const marken=[...html.matchAll(/learning\.(?:js|css)\?v=(\d{8}-[a-z]+)/g)].map(m=>m[1]);
  if(!marken.length)continue;
  geprueft++;
  for(const m of new Set(marken))
    if(m!==datei.fassung) abweichend.push(path.relative(root,seite)+': '+m);
}
assert.equal(abweichend.length,0,
  'Seiten tragen eine andere Fassung als fassung.json ('+datei.fassung+'):\n  '
  +abweichend.slice(0,8).join('\n  '));
/* Die Startseite laedt seit dem Nachtaufstieg kein learning.css mehr -
   sie bringt ihre Gestaltung selbst mit. Es bleiben die acht Lernseiten
   und der Verbtrainer. */
assert.ok(geprueft>=9,'nur '+geprueft+' Seiten mit Versionsnummer gefunden');

/* Die Seite liest ihre eigene Fassung aus der Adresse, mit der
   learning.js geladen wurde - also muss dort eine stehen. */
for(const seite of seiten){
  const html=fs.readFileSync(seite,'utf8');
  if(!/learning\.js/.test(html))continue;
  assert.match(html,/learning\.js\?v=\d{8}-[a-z]+/,
    path.relative(root,seite)+': learning.js ohne Versionsnummer');
}

/* ---- Der Helfer fuer den Betrieb ohne Netz ----
   Er kann hier nicht laufen - ein Service Worker braucht einen Browser.
   Geprueft wird, was auch ohne ihn schiefgehen kann: eine Fassung, die
   im Helfer festgeschrieben statt aus seiner Adresse gelesen wird, und
   eine Fassungsdatei, die versehentlich mit eingelagert wird. Beides
   liesse sich erst am Geraet bemerken, und zwar zu spaet. */
const helfer=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(helfer,/searchParams\.get\('v'\)/,
  'sw.js liest seine Fassung nicht aus der eigenen Adresse');
assert.ok(!new RegExp('\\d{8}-[a-z]+').test(helfer),
  'sw.js traegt eine festgeschriebene Fassung - sie veraltet beim naechsten Release');
assert.match(helfer,/fassung\.json/,
  'sw.js nimmt die Fassungsdatei nicht vom Einlagern aus');
assert.match(helfer,/caches\.delete/,
  'sw.js raeumt alte Lager nicht ab');

const gemeinsam=fs.readFileSync(path.join(root,'assets/learning.js'),'utf8');
assert.match(gemeinsam,/register\(\s*ort \+ 'sw\.js\?v='/,
  'learning.js meldet den Helfer nicht mit Fassung an');
assert.match(gemeinsam,/updateViaCache: 'none'/,
  'learning.js laesst den Helfer selbst zwischenspeichern');
assert.match(gemeinsam,/id="hclear"/,
  'in der Hilfe fehlt der Notausgang zum Leeren des Zwischenspeichers');

const bau=fs.readFileSync(path.join(root,'build.cjs'),'utf8');
for(const n of ['sw.js','fassung.json','manifest.webmanifest'])
  assert.ok(bau.includes("'"+n+"'"),'build.cjs kopiert '+n+' nicht mit');

console.log('Fassung '+datei.fassung+': '+geprueft+' Seiten, Helfer und Notausgang stimmen');
