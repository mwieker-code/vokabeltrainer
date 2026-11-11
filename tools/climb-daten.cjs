/* Summit Climb (Year 6): schreibt year6/climb/data.js aus den Vokabeln der
   Unit 2 in year6/index.html. Die Vokabelseite bleibt die einzige Quelle;
   tests/climb.cjs prueft, dass data.js auf ihrem Stand ist.
   Aufruf:  node tools/climb-daten.cjs          schreibt die Datei
            node tools/climb-daten.cjs --check  meldet, ob sie veraltet ist */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),UNIT='y6u2',ZIEL=path.join(ROOT,'year6/climb/data.js');
function baue(){
  const s=fs.readFileSync(path.join(ROOT,'year6/index.html'),'utf8');
  const lies=(name,zu)=>{const a=s.indexOf('const '+name+' = '),b=s.indexOf('\n'+zu+';',a)+2;return (0,eval)('('+s.slice(a+name.length+9,b)+')');};
  const TOPICS=lies('TOPICS',']'),SETS=lies('SETS','}');
  const themen=TOPICS.filter(t=>t.unit===UNIT);
  const daten={unit:themen[0].unitName,parts:themen.map(t=>({id:t.id,name:t.name,
    words:SETS[t.id].filter(v=>v.en&&v.de).map(v=>({id:v.id,en:v.en,de:v.de,pos:v.pos||''}))}))};
  return '/* Erzeugt von tools/climb-daten.cjs aus year6/index.html - nicht von Hand aendern. */\nwindow.CLIMB_DATA = '+JSON.stringify(daten,null,1)+';\n';
}
module.exports={baue,ZIEL};
if(require.main===module){
  const neu=baue(),alt=fs.existsSync(ZIEL)?fs.readFileSync(ZIEL,'utf8'):null;
  if(process.argv.includes('--check')){if(alt!==neu){console.error('year6/climb/data.js ist veraltet - bitte "node tools/climb-daten.cjs" laufen lassen.');process.exit(1);}console.log('Climb-Daten aktuell.');}
  else{fs.writeFileSync(ZIEL,neu);console.log('Climb-Daten geschrieben.');}
}
