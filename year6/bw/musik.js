/* =========================================================================
   BLACK & WHITE - Musik. Jedes Kapitel hat ein eigenes Stueck, das der
   Browser selbst spielt (Web Audio): keine Dateien, keine Lizenzfragen,
   auch ohne Netz.
     spiele(id)  Stueck starten: 'pinguin' oder 'orca'
     tempo(f)    die Musik wird mit dem Spiel schneller (f = 1 ... 1,6)
     turbo(on)   im Turbo kommt Schlagzeug dazu
     fehler()    ein Fehler daempft die Musik kurz ab
     ziel()      Fanfare am Kapitelende, ende() Abgesang beim Spielende
     stop(), pause(on)
   Die Einstellung an/aus steht in vt6:bw:musik; ohne Wahl ist sie an.
   Wo es kein Web Audio gibt (oder in den Tests), tut die Musik nichts.
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:bw:musik';
let an=true;try{an=localStorage.getItem(KEY)!=='aus';}catch(e){}

/* ------------------------------------------------------------ Noten
   Je Takt acht Achtel: Notenname, "_" haelt die vorige Note, "-" ist Pause. */
const NAMES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(name){const m=/^([A-G])([#b]?)(\d)$/.exec(name);if(!m)return null;return 12*(Number(m[3])+1)+NAMES[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);}
const hz=n=>440*Math.pow(2,(n-69)/12);
function noten(bar){
 const out=[];
 bar.split(' ').forEach((x,i)=>{
  if(x==='_'){if(out.length&&out[out.length-1].end===i*2)out[out.length-1].end+=2;return;}
  if(x==='-')return;
  out.push({step:i*2,end:i*2+2,n:midi(x)});
 });
 return out.map(o=>({step:o.step,len:o.end-o.step,n:o.n}));
}
function takte(teile,folge){return folge.flatMap(k=>teile[k].melody.map((m,i)=>({chord:teile[k].chords[i],melody:noten(m),refrain:k==='B'})));}

/* ORCA RUSH - d-Moll, fliessend, mit Echo wie unter Wasser */
const ORCA={bpm:112,max:144,echo:0.32,
 akkorde:{Dm:[50,[0,3,7]],Bb:[46,[0,4,7]],F:[41,[0,4,7]],C:[48,[0,4,7]],Gm:[43,[0,3,7]],A:[45,[0,4,7]]},
 teile:{
  A:{chords:['Dm','Bb','F','C','Dm','Bb','Gm','A'],melody:[
   'A4 D5 F5 A5 _ G5 F5 _','G5 _ F5 D5 _ - D5 F5','A5 _ C6 A5 _ F5 _ -','G5 _ E5 C5 _ E5 G5 _',
   'A4 D5 F5 A5 _ D6 C6 A5','Bb5 _ A5 G5 _ F5 G5 _','D5 F5 G5 Bb5 _ A5 G5 _','A5 _ _ _ C#5 _ E5 -']},
  B:{chords:['Bb','C','Dm','Dm','Bb','C','A','A'],melody:[
   'F5 _ D6 _ C6 _ Bb5 A5','G5 _ E5 _ C6 _ _ -','A5 _ F5 _ D5 F5 A5 _','D6 _ C6 A5 _ F5 _ -',
   'F5 _ D6 _ C6 _ Bb5 A5','G5 _ C6 _ E6 _ D6 C6','C#6 _ A5 _ E5 _ C#5 E5','A5 _ _ _ - - - -']}},
 folge:['A','A','B','A','B']};
/* PINGUIN - G-Dur, hupfend, Xylophon und Zupfbass */
const PINGUIN={bpm:132,max:176,echo:0.12,
 akkorde:{G:[43,[0,4,7]],D:[50,[0,4,7]],Em:[52,[0,3,7]],C:[48,[0,4,7]]},
 teile:{
  A:{chords:['G','D','Em','C','G','D','C','D'],melody:[
   'D5 G5 _ B5 A5 G5 _ D5','F#5 _ A5 _ D5 _ - -','E5 G5 B5 _ A5 G5 E5 _','C5 E5 G5 _ E5 _ - -',
   'D5 G5 _ B5 A5 G5 _ B5','D6 _ C6 B5 A5 _ F#5 _','E5 _ G5 _ C6 B5 A5 G5','A5 _ F#5 _ D5 _ - -']},
  B:{chords:['C','D','G','Em','C','D','G','G'],melody:[
   'E5 _ G5 _ C6 _ B5 A5','F#5 _ A5 _ D6 _ C6 _','B5 _ D6 _ G6 _ D6 B5','G5 _ B5 _ E6 _ - -',
   'E5 _ G5 _ C6 _ E6 D6','C6 _ A5 _ F#5 _ A5 _','G5 B5 D6 G6 _ D6 B5 _','G5 _ _ _ - - - -']}},
 folge:['A','A','B','A']};
const STUECKE={orca:ORCA,pinguin:PINGUIN};
for(const s of Object.values(STUECKE))s.takte=takte(s.teile,s.folge);

/* ----------------------------------------------------------- Klang */
const AC=window.AudioContext||window.webkitAudioContext;
let ac=null,bus=null,filter=null,master=null,noise=null,echo=null,echoGain=null,fx=null;
let timer=null,step=0,next=0,bpm=120,ziel=120,turboAn=false,laeuft=false,stueck=ORCA,stueckId='orca';
function bereit(){
 if(!AC)return false;
 if(!ac){
  try{ac=new AC();}catch(e){return false;}
  master=ac.createGain();master.gain.value=0.3;master.connect(ac.destination);
  filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=18000;filter.connect(master);
  bus=ac.createGain();bus.gain.value=1;bus.connect(filter);
  /* Echo: fuer den Orca kraeftig, fuer den Pinguin nur ein Hauch */
  echo=ac.createDelay(1);echo.delayTime.value=0.32;echoGain=ac.createGain();echoGain.gain.value=0.3;
  const ton2=ac.createBiquadFilter();ton2.type='lowpass';ton2.frequency.value=2400;
  echo.connect(ton2);ton2.connect(echoGain);echoGain.connect(echo);echoGain.connect(filter);
  fx=ac.createGain();fx.gain.value=0.5;fx.connect(ac.destination);
  const len=ac.sampleRate*0.5;noise=ac.createBuffer(1,len,ac.sampleRate);
  const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 }
 if(ac.state==='suspended'&&ac.resume)ac.resume();
 return true;
}
function ton(freq,t,dauer,typ,laut,o){
 o=o||{};const osc=ac.createOscillator(),g=ac.createGain();osc.type=typ;osc.frequency.setValueAtTime(freq,t);
 if(o.gleit)osc.frequency.exponentialRampToValueAtTime(freq*o.gleit,t+dauer);
 let out=g;
 if(o.cut){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=o.cut;g.connect(f);out=f;}
 osc.connect(g);out.connect(bus);if(o.echo)out.connect(echo);
 const an=o.an||0.008;
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+an);
 if(!o.flaeche)g.gain.exponentialRampToValueAtTime(laut*(o.halt||0.55),t+Math.min(0.12,dauer*0.5));
 g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 osc.start(t);osc.stop(t+dauer+0.02);
}
function rauschen(t,dauer,typ,freq,laut,q){
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
 s.buffer=noise;f.type=typ;f.frequency.value=freq;if(q)f.Q.value=q;
 s.connect(f);f.connect(g);g.connect(bus);
 g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 s.start(t,Math.random()*0.3);s.stop(t+dauer+0.02);
}
function kick(t,laut,tief){
 const o=ac.createOscillator(),g=ac.createGain();o.type='sine';
 o.frequency.setValueAtTime(tief?110:150,t);o.frequency.exponentialRampToValueAtTime(40,t+0.15);
 g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.24);
 o.connect(g);g.connect(bus);o.start(t);o.stop(t+0.26);
}
const snare=(t,laut)=>{rauschen(t,0.14,'bandpass',1800,laut,0.8);ton(190,t,0.08,'triangle',laut*0.5);};
const klatsch=(t,laut)=>{for(let i=0;i<3;i++)rauschen(t+i*0.012,0.05,'bandpass',1400,laut*(1-i*0.25),1.2);};
const hat=(t,laut)=>rauschen(t,0.035,'highpass',7500,laut);
const shaker=(t,laut)=>rauschen(t,0.06,'bandpass',5200,laut,1.5);
/* Xylophon: kurzer Ton mit hellem Oberton */
const xylo=(f,t,laut)=>{ton(f,t,0.32,'triangle',laut,{halt:0.3});ton(f*4,t,0.06,'sine',laut*0.25);};

function plane(s,t){
 const S=stueck,bar=S.takte[Math.floor(s/16)%S.takte.length],i=s%16,d=60/bpm/4,[root,iv]=S.akkorde[bar.chord];
 if(S===ORCA){
  /* Flaeche: weicher Akkord ueber den ganzen Takt */
  if(i===0)for(const x of iv)ton(hz(root+12+x),t,d*16,'sine',0.045,{an:0.4,flaeche:true});
  /* Melodie mit Echo */
  for(const n of bar.melody)if(n.step===i){const len=n.len*d*0.95;ton(hz(n.n),t,len,'triangle',0.13,{echo:true,cut:3600});ton(hz(n.n+12),t,len*0.6,'sine',0.025,{echo:true});}
  /* perlendes Arpeggio in Sechzehnteln */
  const arp=[0,1,2,1,0,1,2,3][i%8],ton_=root+24+(arp===3?12:iv[arp]);ton(hz(ton_),t,d*1.4,'sine',bar.refrain?0.05:0.032,{echo:true});
  /* Bass: Grundton auf 1, Quinte auf 3+, Grundton auf 4 */
  if(i===0||i===6||i===12)ton(hz(root-12+(i===6?7:0)),t,d*(i===0?5:3),'sine',0.3,{cut:500});
  /* sanftes Schlagzeug */
  if(i===0||i===10)kick(t,0.45,true);
  if(i%4===2)shaker(t,0.05);
  if(i===8)rauschen(t,0.18,'bandpass',900,0.08,0.7);
  if(turboAn){hat(t,i%2?0.04:0.07);if(i===4||i===12)snare(t,0.15);if(i%4===0)kick(t,0.4);}
 }else{
  /* Pinguin: Xylophon-Melodie, Zupfbass, Klatschen */
  for(const n of bar.melody)if(n.step===i){xylo(hz(n.n),t,0.16);if(n.len>=4)ton(hz(n.n),t,n.len*d*0.9,'square',0.025,{cut:2200});}
  if(i%4===0){const b=root-12+[0,7,12,7][i/4];ton(hz(b),t,d*1.5,'triangle',0.3,{halt:0.25,cut:1200});}
  if(bar.refrain&&i%2===1){const x=iv[(i>>1)%3];ton(hz(root+24+x),t,d*0.8,'triangle',0.04);}
  if(i===0||i===8)kick(t,0.5);
  if(i===4||i===12)klatsch(t,0.18);
  if(i%2===0)hat(t,i%4===0?0.05:0.03);
  if(turboAn){if(i%4===2)kick(t,0.35);hat(t,0.05);if(i===14||i===15)snare(t,0.14);}
 }
}
function takt(){
 if(!laeuft||!ac)return;
 bpm+=(ziel-bpm)*0.08;
 while(next<ac.currentTime+0.12){plane(step,next);next+=60/bpm/4;step++;}
}
function spiele(id){
 stueckId=STUECKE[id]?id:'orca';stueck=STUECKE[stueckId];
 if(!an||!bereit())return;
 if(laeuft)stop();
 laeuft=true;step=0;next=ac.currentTime+0.08;bpm=ziel=stueck.bpm;turboAn=false;
 echo.delayTime.setValueAtTime(60/stueck.bpm*0.75,ac.currentTime);echoGain.gain.setValueAtTime(stueck.echo,ac.currentTime);
 filter.frequency.cancelScheduledValues(ac.currentTime);filter.frequency.setValueAtTime(18000,ac.currentTime);
 bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(0.0001,ac.currentTime);bus.gain.exponentialRampToValueAtTime(1,ac.currentTime+0.6);
 timer=setInterval(takt,25);takt();
}
function stop(){
 laeuft=false;if(timer){clearInterval(timer);timer=null;}
 if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.3);
  const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},450);
  bus=ac.createGain();bus.gain.value=1;bus.connect(filter);}
}
function pause(on){
 if(!ac)return;
 if(on){if(laeuft){clearInterval(timer);timer=null;}if(ac.suspend)ac.suspend();}
 else{if(ac.resume)ac.resume();if(laeuft&&!timer){next=ac.currentTime+0.06;timer=setInterval(takt,25);}}
}
const clamp01=v=>Math.max(0,Math.min(1,v));
function tempo(f){ziel=stueck.bpm+clamp01((f-1)/0.6)*(stueck.max-stueck.bpm);}
function turbo(on){turboAn=!!on;}
function fehler(){
 if(!laeuft||!ac)return;const t=ac.currentTime;
 filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(18000,t);
 filter.frequency.exponentialRampToValueAtTime(450,t+0.08);filter.frequency.setValueAtTime(450,t+0.45);
 filter.frequency.exponentialRampToValueAtTime(18000,t+1.2);
}
function melodie(folge,typ){
 if(!an||!bereit())return;
 const t0=ac.currentTime+0.05;
 for(const [n,s,l,laut] of folge){ton(hz(n),t0+s,l,typ,laut,{cut:4000,echo:true});}
}
function ziel_(){
 stop();if(!an||!bereit())return;
 melodie([[74,0,0.16,0.12],[77,0.16,0.16,0.12],[81,0.32,0.16,0.12],[86,0.48,1.3,0.13],[81,0.48,1.3,0.06],[77,0.48,1.3,0.06]],'triangle');
 const t=ac.currentTime+0.05;kick(t+0.48,0.5,true);for(let i=0;i<8;i++)shaker(t+0.48+i*0.07,0.08-i*0.008);
}
function ende(){
 stop();
 melodie([[69,0,0.24,0.09],[67,0.24,0.24,0.09],[65,0.48,0.24,0.09],[64,0.72,0.24,0.09],[62,0.96,1,0.1]],'triangle');
}
function setze(on){an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}if(!an)stop();else if(window.BWMusik._wieder)window.BWMusik._wieder();}
window.BWMusik={spiele,stop,pause,tempo,turbo,fehler,ziel:ziel_,ende,setze,get an(){return an;},get laeuft(){return laeuft;},get stueck(){return stueckId;},
 verfuegbar:!!AC,STUECKE,_wieder:null,_plane:(s)=>{/* fuer Tests: Noten pruefen */return stueck.takte[Math.floor(s/16)%stueck.takte.length];}};
})();
