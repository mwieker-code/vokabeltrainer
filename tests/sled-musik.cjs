/* Sled Run – Musik: Noten lesbar und im Takt, Musik startet mit der Fahrt,
   folgt Tempo und Turbo, daempft bei Fehlern, spielt im Ziel eine Fanfare,
   haelt in der Pause an und laesst sich abschalten (gespeichert). Statt
   echtem Klang ein nachgebautes Web Audio, das mitzaehlt. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/sled');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
function fakeAudio(w,log){
 const param=v=>({value:v,setValueAtTime(x){this.value=x;},linearRampToValueAtTime(x){this.value=x;},exponentialRampToValueAtTime(x){this.value=x;},setTargetAtTime(x){this.value=x;},cancelScheduledValues(){}});
 const node=extra=>Object.assign({connect(){},disconnect(){}},extra);
 w.AudioContext=class{
  constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination=node();log.contexts++;log.ctx=this;}
  createGain(){return node({gain:param(1)});}
  createBiquadFilter(){const f=node({type:'',frequency:param(350),Q:param(1)});log.filters.push(f);return f;}
  createOscillator(){return node({type:'',frequency:param(440),start(t){log.notes.push({t,type:this.type,f:this.frequency.value});},stop(){}});}
  createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){return node({buffer:null,start(t){log.noise.push(t);},stop(){}});}
  resume(){this.state='running';log.resume++;}suspend(){this.state='suspended';log.suspend++;}
 };
}
function setup(stored){
 const log={contexts:0,notes:[],noise:[],filters:[],resume:0,suspend:0};
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/sled/',virtualConsole:new VirtualConsole()});
 const w=dom.window;fakeAudio(w,log);
 if(stored)w.localStorage.setItem('vt6:sled:musik',stored);
 let timers=[];w.setInterval=(f)=>{timers.push(f);return timers.length;};w.clearInterval=(i)=>{timers[i-1]=null;};
 w.eval(fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'year6/figuren.js'),'utf8'));
 for(const f of ['musik.js','game.js'])w.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 return {dom,w,d:w.document,log,timers,M:w.SledMusik,S:w.SledGame};
}

/* Noten */
{
 const {M}=setup();
 ok(M._song.length===4&&M._bars.length===32,'Lied: A A B A, 32 Takte');
 for(const part of M._song)for(const bar of part.melody){
  const t=bar.split(' ');ok(t.length===8,'acht Achtel je Takt: '+bar);
  ok(t.every(x=>x==='_'||x==='-'||M._midi(x)!==null),'nur gueltige Noten: '+bar);
 }
 for(const b of M._bars)for(const n of b.melody)ok(n.step+n.len<=16&&n.n>=55&&n.n<=90,'Note im Takt und in Singlage');
 ok(M._midi('A4')===69&&M._midi('C4')===60,'Notennamen richtig');
}

/* Ablauf mit nachgebautem Web Audio */
{
 const {d,w,log,timers,M,S}=setup();
 ok(M.verfuegbar&&M.an,'Musik verfuegbar und standardmaessig an');
 ok(!d.getElementById('musik').hidden&&d.getElementById('musikMenu').textContent.includes('an'),'Schalter sichtbar');
 ok(!M.laeuft,'im Menue keine Musik');
 d.querySelector('[data-part="y6u2-parta"]').click();
 ok(M.laeuft&&log.notes.length>0,'Musik startet mit der Fahrt');
 /* Zeit vergehen lassen: Uhr des Kontexts vorstellen, Takt-Planer aufrufen */
 const play=sec=>{const n0=log.notes.length,z0=log.noise.length;for(let t=0;t<sec;t+=0.025){log.ctx.currentTime+=0.025;for(const f of timers)if(f)f();}return{notes:log.notes.length-n0,noise:log.noise.length-z0};};
 const ruhig=play(4);
 ok(ruhig.notes>40&&ruhig.noise>10,'Melodie, Bass und Glocken laufen ('+ruhig.notes+' Toene)');
 S.G.streak=8;S.G.turbo=2;S.update(0.02);play(3);
 const schnell=play(4);
 ok(schnell.noise>ruhig.noise*1.6,'Turbo bringt Schlagzeug dazu ('+ruhig.noise+' → '+schnell.noise+')');
 ok(schnell.notes>ruhig.notes,'schnellere Fahrt, schnellere Musik');
 S.pause(true);ok(log.suspend===1,'Pause haelt die Musik an');S.pause(false);ok(log.resume>=1,'weiter mit Musik');
 d.getElementById('musik').click();
 ok(!M.an&&!M.laeuft&&w.localStorage.getItem('vt6:sled:musik')==='aus','Musik aus und gespeichert');
 ok(d.getElementById('musik').classList.contains('aus')&&d.getElementById('musik').getAttribute('aria-pressed')==='false','Schalter zeigt aus');
 d.getElementById('musik').click();ok(M.an&&M.laeuft,'wieder an, laeuft sofort weiter');
 d.getElementById('quit').click();ok(!M.laeuft,'Spiel beenden stoppt die Musik');
}
/* Gespeichertes "aus" gilt beim naechsten Mal */
{
 const {d,log,M}=setup('aus');
 ok(!M.an&&d.getElementById('musikMenu').textContent.includes('aus'),'aus bleibt aus');
 d.querySelector('[data-part="y6u2-parta"]').click();
 ok(!M.laeuft&&log.notes.length===0,'keine Musik, wenn ausgeschaltet');
}
/* Fanfare im Ziel, Abgesang beim Sturz */
{
 const {log,M,S}=setup();
 S.start('y6u2-parta');const n0=log.notes.length;
 M.ziel();ok(!M.laeuft&&log.notes.length>n0+5,'Fanfare im Ziel');
 S.start('y6u2-parta');const n1=log.notes.length;
 M.fehler();ok(log.filters.some(f=>f.frequency.value<18000),'Fehler daempft die Musik');
 M.sturz();ok(!M.laeuft&&log.notes.length>n1+4,'Abgesang beim Sturz');
}
/* Geraeusche beim Einsammeln: jedes Item klingt anders, auch bei Musik aus;
   der App-Schalter "Toene" schaltet sie ab. */
{
 const {log,M,S,w}=setup('aus');
 S.start('y6u2-parta');
 const klang={};
 for(const name of M.geraeusche){const n0=log.notes.length,z0=log.noise.length;M.sfx(name);
   klang[name]=log.notes.slice(n0).map(n=>n.type+':'+Math.round(n.f)).join(',')+'|'+(log.noise.length-z0);
   ok(log.notes.length>n0,'Geraeusch spielt: '+name);}
 ok(M.geraeusche.length===7&&new Set(Object.values(klang)).size===7,'sieben verschiedene Geraeusche');
 /* im Spiel ausgeloest */
 const G=S.G;const hole=type=>{const n0=log.notes.length;G.items.length=0;G.items.push({type,lane:G.lane,z:0.1,seed:0.2});G.x=G.lane-1;S.update(0.02);return log.notes.length>n0;};
 for(const type of ['star','penguin','turbo','shield','rock'])ok(hole(type),'Einsammeln klingt: '+type);
 w.localStorage.setItem('vt:feedback:v1',JSON.stringify({sound:false,animation:true}));
 const n0=log.notes.length;M.sfx('stern');hole('star');
 ok(log.notes.length===n0,'Toene aus: keine Geraeusche');
}
/* Ohne Web Audio passiert nichts - und nichts geht kaputt */
{
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/sled/',virtualConsole:new VirtualConsole()});
 const w=dom.window;w.eval(fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'year6/figuren.js'),'utf8'));
 for(const f of ['musik.js','game.js'])w.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 ok(!w.SledMusik.verfuegbar&&w.document.getElementById('musik').hidden,'ohne Web Audio kein Schalter');
 w.document.querySelector('[data-part="y6u2-parta"]').click();w.SledMusik.fehler();w.SledMusik.ziel();
 ok(w.SledGame.G.mode==='ride','Spiel laeuft trotzdem');
}
console.log(checks+' Musik checks passed');
