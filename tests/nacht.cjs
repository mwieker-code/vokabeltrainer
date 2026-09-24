/* Nachtaufstieg: Die dunklen Gegenstuecke der Farbregeln werden von
   tools/nacht.cjs erzeugt. Aendert jemand eine Farbe in einer Seite oder
   in assets/, ohne das Werkzeug laufen zu lassen, bliebe die Stelle auf
   dem Bildschirm still hell - das faengt dieser Test ab. Ausserdem: Jede
   Seite traegt die Marke, und nichts davon erreicht den Druck. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {baue,wandle}=require('../tools/nacht.cjs');

let veraltet=[];
for(const [rel,inhalt] of baue()){
  const ziel=path.join(root,rel);
  if(!fs.existsSync(ziel)||fs.readFileSync(ziel,'utf8')!==inhalt) veraltet.push(rel);
}
assert.equal(veraltet.length,0,'Nachtfarben veraltet, bitte "node tools/nacht.cjs" laufen lassen:\n  '+veraltet.join('\n  '));

/* Jede Seite der App laedt die Marke als letzte Datei und nur fuer den
   Bildschirm. */
const seiten=[];
(function suche(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(['dist','node_modules','.git','tests','content','probe','tools'].includes(e.name))continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())suche(p);
    else if(e.name==='index.html'&&dir!==root)seiten.push(p);
  }
})(root);
let gezaehlt=0;
for(const seite of seiten){
  const html=fs.readFileSync(seite,'utf8');
  if(!/<link rel="stylesheet"|<style/.test(html))continue;
  gezaehlt++;
  const kurz=path.relative(root,seite);
  const marke=html.lastIndexOf('nacht-marke.css');
  assert.ok(marke>0,kurz+': ohne nacht-marke.css');
  assert.ok(marke>html.lastIndexOf('<link rel="stylesheet" href='),kurz+': nacht-marke.css steht nicht zuletzt');
  for(const m of html.matchAll(/<link rel="stylesheet"[^>]*data-nacht[^>]*>|<style[^>]*data-nacht[^>]*>/g))
    assert.match(m[0],/media="screen"/,kurz+': Nachtfarben ohne media="screen" - sie traefen den Druck');
}
assert.ok(gezaehlt>=12,'nur '+gezaehlt+' Seiten mit Nachtfarben gefunden');

/* Die Umrechnung selbst: Weiss wird zur Kartenfarbe, dunkle Schrift hell,
   kraeftige Farben bleiben. */
const hell=h=>{const n=parseInt(h.slice(1,7),16);return ((n>>16)+(n>>8&255)+(n&255))/3;};
assert.ok(hell(wandle('#FFFFFF','flaeche'))<40,'Weiss wird nicht dunkel');
assert.ok(hell(wandle('#18323d','schrift'))>180,'dunkle Schrift wird nicht hell');
assert.equal(wandle('#2459A6','flaeche'),'#2459A6','kraeftige Flaeche wurde veraendert');

/* Die Startseite traegt dieselbe Marke und keinen Lager-Abschnitt. */
const start=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(start,/--night:#0D1017/,'Startseite ohne Nachtgrund');
assert.ok(!/Lager \d|Fünf Lager|Lernfächer/.test(start),'Startseite zeigt die Lernfaecher');
assert.match(start,/fonts\.css\?v=\d+/,'Startseite laedt die Schriften nicht');

console.log('Nachtaufstieg: Gegenstuecke aktuell, Marke auf '+gezaehlt+' Seiten, Druck unberuehrt');
