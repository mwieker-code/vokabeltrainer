/* Games-Rubrik: erzeugt fuer Year 6, Year 9 und History
     <fach>/games/data.js      alle Units und Abschnitte mit Vokabeln (window.GAME_DATA)
     <fach>/games/index.html   Spieleseite mit Sled Run und Summit Climb
     <fach>/sled/index.html    Sled Run   (Code bleibt in year6/sled/)
     <fach>/climb/index.html   Summit Climb (Code bleibt in year6/climb/)
   Quelle sind die Vokabelseiten des Fachs (TOPICS und SETS) und die
   Vorlagen in tools/vorlagen/. Die Versionsnummer kommt aus fassung.json.
   Aufruf:  node tools/spiele.cjs          schreibt alle Dateien
            node tools/spiele.cjs --check  meldet, ob etwas veraltet ist */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const MIN_TEIL=6;   // kleinere Abschnitte gibt es nur ueber "Ganze Unit" bzw. "Alle Themen"
const FAECHER=[
 {dir:'year6',fach:'Year 6',schluessel:'vt6',start:'y6u2',altAll:'y6u2'},
 {dir:'year9',fach:'Year 9',schluessel:'vt9',ohne:['Skills – Writing a discussion']},
 {dir:'bili/history',fach:'History',schluessel:'vt:bili:history',eineUnit:'History',alleName:'Alle Themen'}
];
const rel=(von,nach)=>{const r=path.relative(path.join(ROOT,von),path.join(ROOT,nach)).split(path.sep).join('/');return r;};
function lies(datei){
 const s=fs.readFileSync(path.join(ROOT,datei),'utf8');
 const teil=(name,zu)=>{const a=s.indexOf('const '+name+' = '),b=s.indexOf('\n'+zu+';',a)+2;return (0,eval)('('+s.slice(a+name.length+9,b)+')');};
 return {TOPICS:teil('TOPICS',']'),SETS:teil('SETS','}')};
}
function daten(f){
 const {TOPICS,SETS}=lies(f.dir+'/index.html'),units=[];
 for(const t of TOPICS){
  const unitName=f.eineUnit||t.unitName,unitId=f.eineUnit?'alle':t.unit;
  if(!unitName||(f.ohne||[]).includes(unitName))continue;
  const words=(SETS[t.id]||[]).filter(v=>v.en&&v.de).map(v=>({id:v.id,en:v.en,de:v.de,pos:v.pos||''}));
  if(!words.length)continue;
  let u=units.find(x=>x.id===unitId);if(!u)units.push(u={id:unitId,name:unitName,parts:[]});
  u.parts.push({id:t.id,name:t.name,words,klein:words.length<MIN_TEIL||undefined});
 }
 const d={fach:f.fach,schluessel:f.schluessel,trainer:'../',units:units.filter(u=>u.parts.reduce((n,p)=>n+p.words.length,0)>=6)};
 if(f.start)d.start=f.start;if(f.altAll)d.altAll=f.altAll;if(f.alleName)d.alleName=f.alleName;
 return '/* Erzeugt von tools/spiele.cjs aus '+f.dir+'/index.html - nicht von Hand aendern. */\nwindow.GAME_DATA = '+JSON.stringify(d)+';\n';
}
function seite(vorlage,f,unter){
 const v=JSON.parse(fs.readFileSync(path.join(ROOT,'fassung.json'),'utf8')).fassung;
 const ort=f.dir+'/'+unter;
 return fs.readFileSync(path.join(__dirname,'vorlagen',vorlage),'utf8')
  .replaceAll('{{WURZEL}}',rel(ort,'')+'/')
  .replaceAll('{{CODE}}',(rel(ort,'year6/'+vorlage.replace('.html',''))||'.')+'/')
  .replaceAll('{{FIGUREN}}',rel(ort,'year6/figuren.js'))
  .replaceAll('{{FACH_GROSS}}',f.fach.toUpperCase())
  .replaceAll('{{FACH}}',f.fach)
  .replaceAll('{{V}}',v)
  .replace('href="./style.css','href="style.css').replace(/src="\.\/(musik|game)\.js/g,'src="$1.js');
}
function dateien(){
 const out={};
 for(const f of FAECHER){
  out[f.dir+'/games/data.js']=daten(f);
  out[f.dir+'/games/index.html']=seite('games.html',f,'games');
  out[f.dir+'/sled/index.html']=seite('sled.html',f,'sled');
  out[f.dir+'/climb/index.html']=seite('climb.html',f,'climb');
 }
 return out;
}
module.exports={dateien,FAECHER,MIN_TEIL};
if(require.main===module){
 const alle=dateien();let alt=0;
 for(const [datei,inhalt] of Object.entries(alle)){
  const ziel=path.join(ROOT,datei),jetzt=fs.existsSync(ziel)?fs.readFileSync(ziel,'utf8'):null;
  if(jetzt===inhalt)continue;
  if(process.argv.includes('--check')){console.error('veraltet: '+datei);alt++;continue;}
  fs.mkdirSync(path.dirname(ziel),{recursive:true});fs.writeFileSync(ziel,inhalt);console.log('geschrieben: '+datei);
 }
 if(process.argv.includes('--check')){if(alt){console.error('Bitte "node tools/spiele.cjs" laufen lassen.');process.exit(1);}console.log('Spiele-Dateien aktuell.');}
}
