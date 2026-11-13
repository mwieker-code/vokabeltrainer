/* Free Kick Tour – Musik: Noten lesbar und im Takt, Musik startet mit der
   Tour, zieht mit der Serie an, daempft bei falschen Woertern, pfeift am
   Ende ab, haelt in der Pause an und laesst sich abschalten (gespeichert).
   Jedes Ereignis hat sein eigenes Geraeusch. Statt echtem Klang ein
   nachgebautes Web Audio, das mitzaehlt. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/kick');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
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
function setup(stored,ohneAudio){
 const log={contexts:0,notes:[],noise:[],filters:[],resume:0,suspend:0};
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/kick/',virtualConsole:new VirtualConsole()});
 const w=dom.window;if(!ohneAudio)fakeAudio(w,log);
 if(stored)w.localStorage.setItem('vt6:kick:musik',stored);
 let timers=[];w.setInterval=(f)=>{timers.push(f);return timers.length;};w.clearInterval=(i)=>{timers[i-1]=null;};
 w.eval(fs.readFileSync(path.join(root,'year6/climb/data.js'),'utf8'));
 for(const f of ['spieler.js','musik.js','game.js'])w.eval(fs.readFileSync(path.join(dir,f),'utf8'));
 return {dom,w,d:w.document,log,timers,M:w.KickMusik,S:w.KickGame};
}

/* Noten */
{
 const {M}=setup();
 ok(M._song.length===4&&M._bars.length===32,'Lied: A B A B, 32 Takte');
 for(const part of M._song)for(const bar of part.melody){
  const t=bar.split(' ');ok(t.length===8,'acht Achtel je Takt: '+bar);
  ok(t.every(x=>x==='_'||x==='-'||M._midi(x)!==null),'nur gueltige Noten: '+bar);
 }
 for(const b of M._bars)for(const n of b.melody)ok(n.step+n.len<=16&&n.n>=55&&n.n<=90,'Note im Takt und in Singlage');
 ok(M._midi('F#5')===78&&M._midi('A4')===69,'Notennamen mit Kreuz richtig');
}

/* Ablauf mit nachgebautem Web Audio */
{
 const {d,w,log,timers,M,S}=setup();
 ok(M.verfuegbar&&M.an,'Musik verfuegbar und standardmaessig an');
 ok(!d.getElementById('musik').hidden&&d.getElementById('musikMenu').textContent.includes('an'),'Schalter sichtbar');
 ok(!M.laeuft,'im Menue keine Musik');
 d.querySelector('[data-part="y6u2-parta"]').click();
 ok(M.laeuft&&log.notes.length>0,'Musik startet mit der Tour');
 const play=sec=>{const n0=log.notes.length,z0=log.noise.length;for(let t=0;t<sec;t+=0.025){log.ctx.currentTime+=0.025;for(const f of timers)if(f)f();}return{notes:log.notes.length-n0,noise:log.noise.length-z0};};
 const ruhig=play(4);
 ok(ruhig.notes>40&&ruhig.noise>20,'Gesang, Bass und Trommeln laufen ('+ruhig.notes+' Toene)');
 S.G.streak=10;S.update(0.02);play(3);
 const schnell=play(4);
 ok(schnell.notes>ruhig.notes,'lange Serie, schnellere Musik ('+ruhig.notes+' → '+schnell.notes+')');
 S.pause(true);ok(log.suspend===1,'Pause haelt die Musik an');S.pause(false);ok(log.resume>=1,'weiter mit Musik');
 d.getElementById('musik').click();
 ok(!M.an&&!M.laeuft&&w.localStorage.getItem('vt6:kick:musik')==='aus','Musik aus und gespeichert');
 ok(d.getElementById('musik').classList.contains('aus')&&d.getElementById('musik').getAttribute('aria-pressed')==='false','Schalter zeigt aus');
 d.getElementById('musik').click();ok(M.an&&M.laeuft,'wieder an, laeuft sofort weiter');
 d.getElementById('quit').click();ok(!M.laeuft,'Spiel beenden stoppt die Musik');
}
/* Gespeichertes "aus" gilt beim naechsten Mal */
{
 const {d,log,M}=setup('aus');
 ok(!M.an&&d.getElementById('musikMenu').textContent.includes('aus'),'aus bleibt aus');
 d.querySelector('[data-part="y6u2-parta"]').click();
 ok(!M.laeuft&&!log.notes.some(n=>n.type==='sawtooth'||n.type==='triangle'),'keine Musik, nur der Anpfiff');
}
/* Fanfare nach der Tour, Abpfiff beim Aus, Daempfer beim Fehler */
{
 const {log,M,S}=setup();
 S.start('y6u2-parta');const n0=log.notes.length;
 M.ziel();ok(!M.laeuft&&log.notes.length>n0+5,'Schlusspfiff und Fanfare');
 S.start('y6u2-parta');const n1=log.notes.length;
 M.fehler();ok(log.filters.some(f=>f.frequency.value<18000),'falsches Wort daempft die Musik');
 M.abpfiff();ok(!M.laeuft&&log.notes.length>n1+4,'Abpfiff beim Aus');
}
/* Geraeusche: jedes klingt anders, auch bei Musik aus; der App-Schalter
   "Toene" schaltet sie ab. */
{
 const {log,M,S,w}=setup('aus');
 S.start('y6u2-parta');
 const klang={};
 for(const name of M.geraeusche){const n0=log.notes.length,z0=log.noise.length,f0=log.filters.length;M.sfx(name);
   klang[name]=log.notes.slice(n0).map(n=>n.type+':'+Math.round(n.f)).join(',')+'|'+(log.noise.length-z0)+'|'+log.filters.slice(f0).map(f=>f.Q.value).join(',');
   ok(log.notes.length>n0||log.noise.length>z0,'Geraeusch spielt: '+name);}
 ok(M.geraeusche.length===10&&new Set(Object.values(klang)).size===10,'zehn verschiedene Geraeusche');
 /* im Spiel ausgeloest: Schuss, Netz und Jubel beim Tor */
 const G=S.G;G.noKeeper=true;
 const until=c=>{let n=0;while(!c()&&n++<3000)S.update(0.02);};
 S.chip(0);until(()=>G.mode==='aim');
 const m=S.mitte(G.right,G.time+1),n0=log.notes.length,z0=log.noise.length;
 S.shoot({tx:m.x,ty:m.y,u:1300,c:0});until(()=>G.mode==='result');
 ok(G.shot.kind==='tor'&&log.notes.length>n0&&log.noise.length>z0+2,'Tor klingt: Schuss, Netz, Jubel');
 w.localStorage.setItem('vt:feedback:v1',JSON.stringify({sound:false,animation:true}));
 const n2=log.notes.length,z2=log.noise.length;M.sfx('netz');M.sfx('schuss');
 ok(log.notes.length===n2&&log.noise.length===z2,'Toene aus: keine Geraeusche');
}
/* Ohne Web Audio passiert nichts - und nichts geht kaputt */
{
 const {w,d}=setup(null,true);
 ok(!w.KickMusik.verfuegbar&&d.getElementById('musik').hidden,'ohne Web Audio kein Schalter');
 d.querySelector('[data-part="y6u2-parta"]').click();w.KickMusik.fehler();w.KickMusik.ziel();
 ok(w.KickGame.G.mode==='intro','Spiel laeuft trotzdem');
}
console.log(checks+' Musik checks passed');
