/* =========================================================================
   SLED RUN – Musik
   Ein Winterlied in C-Dur, das der Browser selbst spielt (Web Audio): keine
   Dateien, keine Lizenzfragen, auch ohne Netz. Es haengt am Spiel:
     tempo(f)   die Musik wird mit der Fahrt schneller
     turbo(on)  im Turbo kommt Schlagzeug dazu
     fehler()   ein falsches Tor daempft die Musik kurz ab
     ziel()     Fanfare im Ziel, sturz() ein Abgesang beim Spielende
   Die Einstellung an/aus steht in vt6:sled:musik; ohne Wahl ist sie an.
   Wo es kein Web Audio gibt (oder in den Tests), tut die Musik nichts.
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:sled:musik';
let an=true;try{an=localStorage.getItem(KEY)!=='aus';}catch(e){}

/* ------------------------------------------------------------ Noten
   Je Takt acht Achtel: Notenname, "_" haelt die vorige Note, "-" ist Pause.
   Teil A ist die Strophe, Teil B der Refrain; gespielt wird A A B A. */
const A={chords:['C','G','Am','F','C','G','F','G'],melody:[
  'G4 C5 E5 G5 _ E5 C5 _','D5 _ B4 D5 G5 _ _ -','A4 C5 E5 A5 _ G5 E5 _','F5 E5 D5 C5 _ A4 _ -',
  'G4 C5 E5 G5 _ C6 B5 A5','G5 _ D5 _ B4 D5 G5 _','A5 G5 F5 E5 D5 _ C5 D5','E5 _ D5 _ B4 _ G4 -']};
const B={chords:['Am','F','C','G','Am','F','G','G'],melody:[
  'C6 _ B5 A5 _ E5 _ -','C6 _ A5 F5 _ C5 _ -','E5 G5 C6 _ B5 C6 D6 _','B5 _ G5 _ D5 _ - -',
  'C6 _ B5 A5 _ E5 A5 C6','D6 _ C6 A5 _ F5 _ -','D6 C6 B5 A5 G5 _ B5 _','D6 _ _ _ G5 _ - -']};
const SONG=[A,A,B,A];
const CHORD={C:[0,4,7],G:[7,11,14],Am:[9,12,16],F:[5,9,12]};      // Halbtoene ueber C
const ROOT={C:36,G:43,Am:45,F:41};                                  // Basston (MIDI)
const NAMES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(name){const m=/^([A-G])(#?)(\d)$/.exec(name);if(!m)return null;return 12*(Number(m[3])+1)+NAMES[m[1]]+(m[2]?1:0);}
const hz=n=>440*Math.pow(2,(n-69)/12);
/* Melodie in Ereignisse zerlegen: Schritt (Sechzehntel) und Laenge */
function noten(bar){
  const t=bar.split(' '),out=[];
  t.forEach((x,i)=>{
    if(x==='_'){if(out.length&&out[out.length-1].end===i*2)out[out.length-1].end+=2;return;}
    if(x==='-')return;
    out.push({step:i*2,end:i*2+2,n:midi(x)});
  });
  return out.map(o=>({step:o.step,len:o.end-o.step,n:o.n}));
}
const BARS=SONG.flatMap(part=>part.melody.map((m,i)=>({chord:part.chords[i],melody:noten(m),refrain:part===B})));

/* ----------------------------------------------------------- Klang */
const AC=window.AudioContext||window.webkitAudioContext;
let ac=null,bus=null,filter=null,master=null,noise=null;
let timer=null,step=0,next=0,bpm=128,ziel=128,turboAn=false,laeuft=false;
function bereit(){
  if(!AC)return false;
  if(!ac){
    try{ac=new AC();}catch(e){return false;}
    master=ac.createGain();master.gain.value=0.3;master.connect(ac.destination);
    filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=18000;filter.connect(master);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);
    const len=ac.sampleRate*0.5;noise=ac.createBuffer(1,len,ac.sampleRate);
    const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  }
  if(ac.state==='suspended')ac.resume?.();
  return true;
}
function ton(freq,t,dauer,typ,laut,ziel2,cut){
  const o=ac.createOscillator(),g=ac.createGain();o.type=typ;o.frequency.setValueAtTime(freq,t);
  let out=g;
  if(cut){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;g.connect(f);out=f;}
  o.connect(g);out.connect(ziel2||bus);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.008);
  g.gain.exponentialRampToValueAtTime(laut*0.55,t+Math.min(0.12,dauer*0.5));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  o.start(t);o.stop(t+dauer+0.02);
}
function rauschen(t,dauer,typ,freq,laut,q){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noise;f.type=typ;f.frequency.value=freq;if(q)f.Q.value=q;
  s.connect(f);f.connect(g);g.connect(bus);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  s.start(t,Math.random()*0.3);s.stop(t+dauer+0.02);
}
function kick(t,laut){
  const o=ac.createOscillator(),g=ac.createGain();o.type='sine';
  o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+0.13);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+0.22);
}
const snare=(t,laut)=>{rauschen(t,0.14,'bandpass',1800,laut,0.8);ton(190,t,0.08,'triangle',laut*0.5);};
const hat=(t,laut)=>rauschen(t,0.035,'highpass',7500,laut);
/* Schlittenglocken: helles Rauschen und zwei kurze Klingeltoene */
const glocke=(t,laut)=>{rauschen(t,0.07,'bandpass',9000,laut,2.5);ton(2637,t,0.06,'sine',laut*0.18);ton(3136,t+0.01,0.05,'sine',laut*0.12);};

/* Ein Sechzehntel planen */
function plane(s,t){
  const bar=BARS[Math.floor(s/16)%BARS.length],i=s%16,d=60/bpm/4;
  /* Melodie */
  for(const n of bar.melody)if(n.step===i){
    const len=n.len*d*0.95;ton(hz(n.n),t,len,'square',0.10,null,3200);ton(hz(n.n-12),t,len,'triangle',0.07);
  }
  /* Bass in Achteln: Grundton, Oktave, Quinte */
  if(i%2===0){const r=ROOT[bar.chord],pat=[0,0,12,0,7,0,12,7][i/2];ton(hz(r+pat),t,d*1.8,'triangle',0.22,null,900);ton(hz(r+pat),t,d*1.6,'square',0.035,null,600);}
  /* Im Refrain ein leises Arpeggio */
  if(bar.refrain){const c=CHORD[bar.chord];ton(hz(60+c[i%3]+(i%6>2?12:0)),t,d*0.9,'triangle',0.035);}
  /* Glocken auf jeder Achtel, betont auf den Vierteln */
  if(i%2===0)glocke(t,i%4===0?0.16:0.08);
  /* Grundschlag */
  if(i===0||i===8)kick(t,0.55);
  if(i===4||i===12)snare(t,0.2);
  /* Turbo: treibendes Schlagzeug */
  if(turboAn){
    if(i%4===0)kick(t,0.6);
    hat(t,i%2?0.05:0.09);
    if(i===14||i===15)snare(t,0.16);
  }
}
function takt(){
  if(!laeuft||!ac)return;
  bpm+=(ziel-bpm)*0.08;
  while(next<ac.currentTime+0.12){plane(step,next);next+=60/bpm/4;step++;}
}
function start(){
  if(!an||!bereit())return;
  if(laeuft)return;
  laeuft=true;step=0;next=ac.currentTime+0.06;bpm=ziel=128;turboAn=false;
  filter.frequency.cancelScheduledValues(ac.currentTime);filter.frequency.setValueAtTime(18000,ac.currentTime);
  bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(1,ac.currentTime);
  timer=setInterval(takt,25);takt();
}
function stop(){
  laeuft=false;if(timer){clearInterval(timer);timer=null;}
  if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.25);
    /* Neu verbinden, damit die naechste Fahrt mit vollem Pegel beginnt */
    const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},400);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);}
}
function pause(on){
  if(!ac)return;
  if(on){if(laeuft){clearInterval(timer);timer=null;}ac.suspend?.();}
  else{ac.resume?.();if(laeuft&&!timer){next=ac.currentTime+0.06;timer=setInterval(takt,25);}}
}
/* Spiel-Tempo 1 ... 2 auf 128 ... 168 Schlaege */
function tempo(f){ziel=128+Math.max(0,Math.min(1,(f-1)/1.03))*40;}
function turbo(on){turboAn=!!on;}
function fehler(){
  if(!laeuft||!ac)return;const t=ac.currentTime;
  filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(18000,t);
  filter.frequency.exponentialRampToValueAtTime(500,t+0.08);filter.frequency.setValueAtTime(500,t+0.45);
  filter.frequency.exponentialRampToValueAtTime(18000,t+1.2);
}
function melodie(folge,typ){
  if(!an||!bereit())return;
  const t0=ac.currentTime+0.05;
  for(const [n,s,l,laut] of folge){ton(hz(n),t0+s,l,typ,laut,null,4000);if(typ==='square')ton(hz(n-12),t0+s,l,'triangle',laut*0.7);}
}
function ziel_(){
  stop();if(!an||!bereit())return;
  /* Fanfare: C-E-G-C, dann der Akkord mit Glockenwirbel */
  melodie([[72,0,0.14,0.11],[76,0.14,0.14,0.11],[79,0.28,0.14,0.11],[84,0.42,1.2,0.12],[76,0.42,1.2,0.06],[79,0.42,1.2,0.06]],'square');
  const t=ac.currentTime+0.05;kick(t+0.42,0.6);for(let i=0;i<10;i++)glocke(t+0.42+i*0.06,0.12-i*0.008);
}
function sturz(){
  stop();
  melodie([[67,0,0.22,0.09],[65,0.22,0.22,0.09],[64,0.44,0.22,0.09],[62,0.66,0.22,0.09],[60,0.88,0.9,0.1]],'triangle');
}
function setze(on){
  an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}
  if(!an)stop();
}
window.SledMusik={start,stop,pause,tempo,turbo,fehler,ziel:ziel_,sturz,setze,
  get an(){return an;},get laeuft(){return laeuft;},verfuegbar:!!AC,_bars:BARS,_song:SONG,_midi:midi};
})();
