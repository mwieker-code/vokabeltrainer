/* =========================================================================
   FREE KICK TOUR – Musik und Geraeusche
   Eine Stadionhymne in D-Dur, die der Browser selbst spielt (Web Audio):
   keine Dateien, keine Lizenzfragen, auch ohne Netz.
     tempo(f)   die Musik zieht mit der Serie an
     fehler()   ein falsches Wort daempft die Musik kurz ab
     ziel()     Schlusspfiff und Fanfare nach der Tour, abpfiff() beim Aus
     sfx(name)  schuss, netz, jubel, ooh, gehalten, mauer, pfosten, falsch,
                pfiff, klick. Sie haengen nicht an der Musik, sondern am
                Schalter "Toene" der App.
   Die Einstellung an/aus steht in vt6:kick:musik; ohne Wahl ist sie an.
   Wo es kein Web Audio gibt (oder in den Tests), tut die Musik nichts.
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:kick:musik';
let an=true;try{an=localStorage.getItem(KEY)!=='aus';}catch(e){}

/* ------------------------------------------------------------ Noten
   Je Takt acht Achtel: Notenname, "_" haelt die vorige Note, "-" ist Pause.
   Teil A ist der Fangesang, Teil B der Refrain; gespielt wird A B A B. */
const A={chords:['D','A','Bm','G','D','A','G','A'],melody:[
  'F#5 _ F#5 G5 A5 _ F#5 D5','E5 _ C#5 _ A4 - - -','D5 _ D5 E5 F#5 _ E5 D5','B4 _ _ _ - - G4 A4',
  'F#5 _ F#5 G5 A5 _ D6 _','C#6 _ A5 _ E5 _ - -','B5 A5 G5 F#5 E5 _ D5 E5','E5 _ _ _ - - - -']};
const B={chords:['G','A','F#m','Bm','G','A','D','D'],melody:[
  'B5 _ B5 _ A5 _ G5 _','A5 _ _ E5 C#5 _ - -','A5 _ A5 _ G5 _ F#5 _','F#5 _ _ D5 B4 _ - -',
  'G5 _ B5 _ D6 _ B5 _','C#6 _ _ A5 E5 _ - -','D6 _ A5 _ F#5 _ E5 _','D5 _ _ _ - - - -']};
const SONG=[A,B,A,B];
const CHORD={D:[2,6,9],A:[9,13,16],Bm:[11,14,18],G:[7,11,14],'F#m':[6,9,13]};   // Halbtoene ueber C
const ROOT={D:38,A:45,Bm:47,G:43,'F#m':42};                                     // Basston (MIDI)
const NAMES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(name){const m=/^([A-G])(#?)(\d)$/.exec(name);if(!m)return null;return 12*(Number(m[3])+1)+NAMES[m[1]]+(m[2]?1:0);}
const hz=n=>440*Math.pow(2,(n-69)/12);
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
let ac=null,bus=null,filter=null,master=null,noise=null,fx=null;
let timer=null,step=0,next=0,bpm=118,ziel=118,laeuft=false;
function bereit(){
  if(!AC)return false;
  if(!ac){
    try{ac=new AC();}catch(e){return false;}
    master=ac.createGain();master.gain.value=0.28;master.connect(ac.destination);
    filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=18000;filter.connect(master);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);
    fx=ac.createGain();fx.gain.value=0.5;fx.connect(ac.destination);
    const len=ac.sampleRate*1;noise=ac.createBuffer(1,len,ac.sampleRate);
    const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  }
  if(ac.state==='suspended')ac.resume?.();
  return true;
}
function ton(freq,t,dauer,typ,laut,ziel2,cut,attack){
  const o=ac.createOscillator(),g=ac.createGain();o.type=typ;o.frequency.setValueAtTime(freq,t);
  let out=g;
  if(cut){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;g.connect(f);out=f;}
  o.connect(g);out.connect(ziel2||bus);
  const a=attack||0.008;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+a);
  g.gain.exponentialRampToValueAtTime(laut*0.6,t+Math.min(0.14,dauer*0.5)+a);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dauer+a);
  o.start(t);o.stop(t+dauer+a+0.02);
}
function rauschen(t,dauer,typ,freq,laut,q,ziel2){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noise;f.type=typ;f.frequency.value=freq;if(q)f.Q.value=q;
  s.connect(f);f.connect(g);g.connect(ziel2||bus);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  s.start(t,Math.random()*0.5);s.stop(t+dauer+0.02);
}
function kick(t,laut){
  const o=ac.createOscillator(),g=ac.createGain();o.type='sine';
  o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+0.14);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+0.24);
}
/* Klatschen wie auf der Tribuene: drei kurz versetzte Rauschstoesse */
const klatsch=(t,laut)=>{for(let i=0;i<3;i++)rauschen(t+i*0.008,0.09,'bandpass',1500+i*200,laut*(1-i*0.2),0.9);};
const hat=(t,laut)=>rauschen(t,0.03,'highpass',8000,laut);
/* Grosse Trommel im Fanblock */
const pauke=(t,laut)=>{ton(70,t,0.3,'sine',laut,null,400);rauschen(t,0.08,'lowpass',300,laut*0.4);};

function plane(s,t){
  const bar=BARS[Math.floor(s/16)%BARS.length],i=s%16,d=60/bpm/4;
  /* Gesang: weiche Rechteck-Toene mit langsamem Einsatz - wie viele Stimmen */
  for(const n of bar.melody)if(n.step===i){
    const len=n.len*d*0.92;
    ton(hz(n.n),t,len,'sawtooth',0.05,null,1800,0.03);ton(hz(n.n)*1.004,t,len,'square',0.035,null,1400,0.03);ton(hz(n.n-12),t,len,'triangle',0.06,null,null,0.02);
  }
  if(i%2===0){const r=ROOT[bar.chord],pat=[0,0,12,0,7,0,12,7][i/2];ton(hz(r+pat),t,d*1.7,'triangle',0.2,null,800);}
  if(bar.refrain&&i%4===2){const c=CHORD[bar.chord];for(const h of c)ton(hz(60+h),t,d*1.6,'square',0.018,null,2400);}
  if(i===0||i===8)pauke(t,0.5);
  if(i===6)kick(t,0.3);
  if(i===4||i===12)klatsch(t,0.24);
  if(i%2===0)hat(t,i%4===0?0.05:0.03);
  /* leises Raunen der Zuschauer */
  if(i===0)rauschen(t,d*16,'bandpass',600,0.025,0.5);
}
function takt(){
  if(!laeuft||!ac)return;
  bpm+=(ziel-bpm)*0.08;
  while(next<ac.currentTime+0.12){plane(step,next);next+=60/bpm/4;step++;}
}
function start(){
  if(!an||!bereit())return;
  if(laeuft)return;
  laeuft=true;step=0;next=ac.currentTime+0.06;bpm=ziel=118;
  filter.frequency.cancelScheduledValues(ac.currentTime);filter.frequency.setValueAtTime(18000,ac.currentTime);
  bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(1,ac.currentTime);
  timer=setInterval(takt,25);takt();
}
function stop(){
  laeuft=false;if(timer){clearInterval(timer);timer=null;}
  if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.25);
    const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},400);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);}
}
function pause(on){
  if(!ac)return;
  if(on){if(laeuft){clearInterval(timer);timer=null;}ac.suspend?.();}
  else{ac.resume?.();if(laeuft&&!timer){next=ac.currentTime+0.06;timer=setInterval(takt,25);}}
}
/* Serie 0 ... 10 auf 118 ... 142 Schlaege */
function tempo(f){ziel=118+Math.max(0,Math.min(1,(f-1)/0.5))*24;}
function fehler(){
  if(!laeuft||!ac)return;const t=ac.currentTime;
  filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(18000,t);
  filter.frequency.exponentialRampToValueAtTime(450,t+0.08);filter.frequency.setValueAtTime(450,t+0.5);
  filter.frequency.exponentialRampToValueAtTime(18000,t+1.3);
}
function melodie(folge,typ){
  if(!an||!bereit())return;
  const t0=ac.currentTime+0.05;
  for(const [n,s,l,laut] of folge){ton(hz(n),t0+s,l,typ,laut,null,4000);if(typ==='square')ton(hz(n-12),t0+s,l,'triangle',laut*0.7);}
}
function ziel_(){
  stop();if(!an||!bereit())return;
  pfeife(ac.currentTime+0.02,[0.18,0.18,0.6]);
  melodie([[74,0.9,0.16,0.1],[78,1.06,0.16,0.1],[81,1.22,0.16,0.1],[86,1.38,1.2,0.11],[78,1.38,1.2,0.05],[81,1.38,1.2,0.05]],'square');
  const t=ac.currentTime+0.05;pauke(t+1.38,0.6);for(let i=0;i<8;i++)klatsch(t+1.4+i*0.09,0.2-i*0.015);
}
function abpfiff(){
  stop();if(!an||!bereit())return;
  pfeife(ac.currentTime+0.02,[0.2,0.2,0.7]);
  melodie([[69,1.0,0.22,0.08],[67,1.22,0.22,0.08],[66,1.44,0.22,0.08],[64,1.66,0.22,0.08],[62,1.88,0.9,0.09]],'triangle');
}
/* ------------------------------------------------------- Geraeusche */
function toene(){try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}}
function piep(t,f1,f2,dauer,typ,laut){
  const o=ac.createOscillator(),g=ac.createGain();o.type=typ;
  o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dauer*0.85);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  o.connect(g);g.connect(fx);o.start(t);o.stop(t+dauer+0.02);
}
function zisch(t,f1,f2,dauer,laut,q){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noise;f.type='bandpass';f.Q.value=q||1.2;f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+dauer);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+dauer*0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*0.4);s.stop(t+dauer+0.02);
}
/* Schiedsrichterpfeife: ein trillernder hoher Ton je Laenge */
function pfeife(t,laengen){
  let s=t;for(const l of laengen){
    const o=ac.createOscillator(),lfo=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(2900,s);lfo.frequency.setValueAtTime(32,s);lg.gain.setValueAtTime(140,s);
    lfo.connect(lg);lg.connect(o.frequency);o.connect(g);g.connect(fx);
    g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(0.22,s+0.02);g.gain.setValueAtTime(0.22,s+l-0.03);g.gain.exponentialRampToValueAtTime(0.0001,s+l);
    o.start(s);lfo.start(s);o.stop(s+l+0.02);lfo.stop(s+l+0.02);s+=l+0.08;}
}
const GERAEUSCH={
  /* Schuss: dumpfer Tritt gegen das Leder */
  schuss:t=>{piep(t,220,60,0.12,'sine',0.7);zisch(t,1800,500,0.06,0.35,0.9);},
  /* Netz: Rauschen, das nach unten wegsackt */
  netz:t=>{zisch(t,3000,700,0.45,0.4,0.8);},
  /* Jubel: das Publikum schwillt an und klingt aus */
  jubel:t=>{zisch(t,500,900,1.6,0.35,0.5);zisch(t+0.05,1200,2000,1.4,0.2,0.6);piep(t+0.1,880,1320,0.18,'triangle',0.12);piep(t+0.3,1320,1760,0.22,'triangle',0.1);},
  /* Ooh: ein enttaeuschtes Raunen */
  ooh:t=>{zisch(t,900,350,0.9,0.28,1.4);},
  /* Gehalten: Handschuh fasst den Ball, dann Raunen */
  gehalten:t=>{piep(t,160,70,0.14,'sine',0.6);zisch(t,1200,400,0.12,0.3,1);zisch(t+0.1,900,350,0.8,0.22,1.4);},
  /* Mauer: Aufprall am Koerper */
  mauer:t=>{piep(t,180,55,0.18,'sine',0.7);zisch(t,800,200,0.15,0.35,0.8);},
  /* Pfosten: metallisches Klingen */
  pfosten:t=>{[880,1320,2210,3170].forEach((f,i)=>piep(t,f,f*0.995,0.6-i*0.1,'sine',0.18-i*0.03));zisch(t+0.05,900,350,0.8,0.18,1.4);},
  /* Falsch: zwei tiefe Toene */
  falsch:t=>{piep(t,330,300,0.16,'square',0.12);piep(t+0.18,250,220,0.28,'square',0.12);},
  pfiff:t=>pfeife(t,[0.35]),
  klick:t=>{piep(t,1400,1500,0.04,'triangle',0.15);}
};
function sfx(name){
  if(!toene()||!GERAEUSCH[name]||!bereit())return;
  try{GERAEUSCH[name](ac.currentTime+0.01);}catch(e){}
}
function setze(on){
  an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}
  if(!an)stop();
}
window.KickMusik={start,stop,pause,tempo,fehler,ziel:ziel_,abpfiff,setze,sfx,geraeusche:Object.keys(GERAEUSCH),
  get an(){return an;},get laeuft(){return laeuft;},verfuegbar:!!AC,_bars:BARS,_song:SONG,_midi:midi};
})();
