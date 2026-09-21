/* Die Liste im Druck.

   Der Fehler, gegen den dieser Test steht: Die Marke der ausgewaehlten
   Zeile ist ein Schatten im Inneren der Zeile - drei Pixel am linken
   Rand. Auf dem Bildschirm steht davor das Kaestchen zum Anhaken und
   haelt ihr den Platz frei. Im Druck ist das Kaestchen ausgeblendet,
   und die Marke sass im ersten Buchstaben: Aus "subway" wurde "ubway".

   Geprueft wird die Beziehung zwischen beiden Massen, nicht ihre
   Werte: Die Rinne im Druck muss breiter sein als die Marke. Wer eines
   von beiden aendert, faellt hier auf. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'assets/learning.css'),'utf8');

/* ---- Wie breit ist die Marke? ---- */
const marke=/\.vrow:has\(\.csv-check input:checked\)\{[^}]*box-shadow:inset\s+(\d+)px/.exec(css);
assert.ok(marke,'die Marke der Auswahl steht nicht mehr da, wo dieser Test sie sucht');
const breite=Number(marke[1]);

/* ---- Und wie breit ist die Rinne im Druck? ---- */
const bloecke=[...css.matchAll(/@media\s+print\s*\{/g)].map(m=>{
  let i=m.index+m[0].length, tiefe=1;
  while(i<css.length&&tiefe>0){ if(css[i]==='{')tiefe++; else if(css[i]==='}')tiefe--; i++; }
  return css.slice(m.index,i);
});
const rinne=bloecke.map(b=>/\.vlist \.vrow[^{]*\{[^}]*padding-left:(\d+)px/.exec(b)).find(Boolean);
assert.ok(rinne,'im Druck bekommt die Zeile keine Rinne - die Marke sitzt dann im Wort');
assert.ok(Number(rinne[1])>breite,
  'die Rinne im Druck ist '+rinne[1]+'px, die Marke '+breite+'px - '
  +'sie deckt damit den ersten Buchstaben zu');

/* ---- Die Rinne gilt fuer jede Zeile, nicht nur die ausgewaehlte ----
   Sonst stuenden im Druck einer Auswahl die angehakten Zeilen weiter
   rechts als die uebrigen. */
assert.ok(!/\.vrow:has\([^)]*\)\s*\{[^}]*padding-left/.test(rinne.input),
  'die Rinne haengt an der Auswahl - dann stehen die Zeilen versetzt');

/* ---- Und die Seiten holen diese Datei auch ---- */
for(const seite of ['year5','year6','year7','year8','year9','year10','oberstufe','bili/history']){
  const html=fs.readFileSync(path.join(root,seite,'index.html'),'utf8');
  assert.match(html,/learning\.css\?v=/,seite+': ohne learning.css bleibt die Rinne aus');
  assert.match(html,/@media print\{[\s\S]*?\.lbody\{[^}]*columns:2/,
    seite+': die zweispaltige Druckfassung der Liste fehlt');
}

console.log('Druck: Rinne '+rinne[1]+'px > Marke '+breite+'px, auf allen acht Listen');
