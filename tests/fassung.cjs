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
    if(['dist','node_modules','.git','tests','content'].includes(e.name))continue;
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
assert.ok(geprueft>=10,'nur '+geprueft+' Seiten mit Versionsnummer gefunden');

/* Die Seite liest ihre eigene Fassung aus der Adresse, mit der
   learning.js geladen wurde - also muss dort eine stehen. */
for(const seite of seiten){
  const html=fs.readFileSync(seite,'utf8');
  if(!/learning\.js/.test(html))continue;
  assert.match(html,/learning\.js\?v=\d{8}-[a-z]+/,
    path.relative(root,seite)+': learning.js ohne Versionsnummer');
}

console.log('Fassung '+datei.fassung+': '+geprueft+' Seiten stimmen mit fassung.json überein');
