/* Das Web-App-Manifest: die Angaben, mit denen ein Telefon die Seite
   auf den Startbildschirm legt. Geprueft wird, dass die Datei gueltig
   ist, dass jedes genannte Symbol wirklich existiert und die Groesse
   hat, die dasteht, und dass jede Seite das Manifest ueber einen Pfad
   erreicht, der von ihr aus stimmt - ein falscher Pfad faellt sonst
   erst auf dem Telefon auf. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');

const roh=fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8');
const m=JSON.parse(roh);

for(const feld of ['name','short_name','start_url','scope','display','icons',
                   'background_color','theme_color','lang','id'])
  assert.ok(m[feld],'Manifest ohne '+feld);
assert.equal(m.display,'standalone','Manifest startet nicht als eigene App');
assert.equal(m.lang,'de','Manifest nicht auf Deutsch');

/* Relativ, nicht absolut: Die Seite liegt unter /vokabeltrainer/, ein
   fuehrender Schraegstrich zeigte auf die falsche Stelle. */
for(const feld of ['id','start_url','scope'])
  assert.ok(!m[feld].startsWith('/'),'Manifest: '+feld+' darf nicht am Wurzelverzeichnis haengen');

/* Groesse aus dem PNG-Kopf lesen - was im Manifest steht, muss stimmen,
   sonst waehlt das Telefon das falsche Symbol oder gar keines. */
const masse=datei=>{const b=fs.readFileSync(datei);
  assert.equal(b.toString('ascii',12,16),'IHDR',datei+': kein PNG');
  return b.readUInt32BE(16)+'x'+b.readUInt32BE(20);};

for(const icon of m.icons){
  const datei=path.join(root,icon.src);
  assert.ok(fs.existsSync(datei),'Manifest nennt ein Symbol, das fehlt: '+icon.src);
  assert.equal(masse(datei),icon.sizes,icon.src+': andere Groesse als angegeben');
  assert.equal(icon.type,'image/png',icon.src+': Typ passt nicht');
}
assert.ok(m.icons.some(i=>/\b512x512\b/.test(i.sizes)&&i.purpose==='any'),
  'kein grosses Symbol fuer den Startbildschirm');
assert.ok(m.icons.some(i=>i.purpose==='maskable'),
  'kein beschneidbares Symbol - Android legt sonst einen weissen Rand darum');

/* Und die Gegenrichtung: jede Seite verweist auf das Manifest. */
const seiten=[];
(function suche(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(['dist','node_modules','.git','tests','content'].includes(e.name))continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())suche(p);
    else if(e.name==='index.html')seiten.push(p);
  }
})(root);

let gezaehlt=0;
for(const seite of seiten){
  const html=fs.readFileSync(seite,'utf8');
  /* Die beiden Weiterleitungsseiten tragen keinen Kopf und brauchen
     keinen - sie schicken sofort weiter. */
  if(!/name="viewport"/.test(html))continue;
  gezaehlt++;
  const kurz=path.relative(root,seite);
  for(const [name,muster] of [
      ['Manifest',/<link rel="manifest" href="([^"]+)"/],
      ['Apple-Symbol',/<link rel="apple-touch-icon" href="([^"]+)"/]]){
    const treffer=muster.exec(html);
    assert.ok(treffer,kurz+': kein '+name);
    const ziel=path.resolve(path.dirname(seite),treffer[1]);
    assert.ok(fs.existsSync(ziel),kurz+': '+name+' zeigt ins Leere ('+treffer[1]+')');
  }
  assert.ok(/name="apple-mobile-web-app-capable" content="yes"/.test(html),
    kurz+': oeffnet auf dem iPhone nicht als eigene App');
  const farbe=/<meta name="theme-color" content="([^"]+)"/.exec(html);
  if(farbe) assert.equal(farbe[1],m.theme_color,
    kurz+': Seitenfarbe und Manifestfarbe gehen auseinander');
}
assert.ok(gezaehlt>=13,'nur '+gezaehlt+' Seiten mit Kopf gefunden');

/* Der Apple-Pfad steht nur in den Seiten, nicht im Manifest - iOS liest
   ihn dort. Er muss trotzdem ein PNG der erwarteten Groesse sein. */
assert.equal(masse(path.join(root,'assets/apple-touch-icon.png')),'180x180',
  'apple-touch-icon hat nicht 180x180');

console.log('Manifest: '+m.icons.length+' Symbole, '+gezaehlt+' Seiten verweisen darauf');
