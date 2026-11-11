/* =========================================================================
   SUMMIT CLIMB – Musik und Geraeusche
   Ein spannungsvolles Stueck in a-Moll, das der Browser selbst spielt (Web
   Audio): Flaechenklaenge, Arpeggio, pulsierender Bass. Es haengt am Spiel:
     gefahr(g)  0 = Nebel weit weg ... 1 = Nebel direkt unter dir: schneller,
                heller, mit Herzschlag und Hi-Hats
     fehler()   ein falscher Griff daempft die Musik kurz ab
     aua()      der Nebel hat einen eingeholt
     lager()    kleiner Jingle im Lager, gipfel() Fanfare, sturz() Abgesang
     sfx(name)  Geraeusche: kristall, edelweiss, karabiner, seil, pickel,
                steinschlag, rumpeln, adler, eis, herz, griff, karabinerhalt,
                perfekt, feuerwerk - sie folgen dem Schalter "Toene" der App
   Musik an/aus steht in vt6:climb:musik; ohne Wahl ist sie an.
   Wo es kein Web Audio gibt (oder in den Tests), tut sie nichts.
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:climb:musik';
let an=true;try{an=localStorage.getItem(KEY)!=='aus';}catch(e){}

/* ------------------------------------------------------------ Noten
   Je Takt acht Achtel: Notenname, "_" haelt, "-" ist Pause.
   Teil A: geheimnisvoll, Teil B: drängend. Gespielt wird A B A B. */
const A={chords:['Am','F','C','G','Am','F','E','E'],melody:[
  'A4 _ C5 _ E5 _ D5 C5','C5 _ _ _ A4 _ - -','G4 _ C5 _ E5 _ G5 _','F5 E5 D5 _ B4 _ - -',
  'A4 _ C5 _ E5 _ A5 _','A5 G5 F5 _ C5 _ - -','B4 _ D5 _ E5 _ G#5 _','E5 _ _ _ - - - -']};
const B={chords:['Dm','Am','E','Am','Dm','Am','F','E'],melody:[
  'D5 F5 A5 _ G5 F5 E5 _','E5 _ C5 _ A4 _ - -','B4 D5 E5 _ G#5 _ B5 _','A5 _ _ _ E5 _ - -',
  'D5 F5 A5 _ G5 F5 E5 _','C6 _ B5 A5 _ E5 _ -','F5 _ A5 _ C6 _ B5 A5','G#5 _ _ _ E5 _ - -']};
const SONG=[A,B,A,B];
const CHORD={Am:[9,12,16],F:[5,9,12],C:[0,4,7],G:[7,11,14],E:[4,8,11],Dm:[2,5,9]};   // Halbtoene ueber C
const ROOT={Am:45,F:41,C:48,G:43,E:40,Dm:38};                                       // Basston (MIDI)
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
const BARS=SONG.flatMap(part=>part.melody.map((m,i)=>({chord:part.chords[i],melody:noten(m),drang:part===B})));

/* ----------------------------------------------------------- Klang */
const AC=window.AudioContext||window.webkitAudioContext;
let ac=null,bus=null,filter=null,master=null,noise=null,fx=null;
let timer=null,step=0,next=0,bpm=100,ziel=100,gef=0,laeuft=false;
function bereit(){
  if(!AC)return false;
  if(!ac){
    try{ac=new AC();}catch(e){return false;}
    master=ac.createGain();master.gain.value=0.3;master.connect(ac.destination);
    filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=18000;filter.connect(master);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);
    fx=ac.createGain();fx.gain.value=0.5;fx.connect(ac.destination);
    const len=ac.sampleRate*0.5;noise=ac.createBuffer(1,len,ac.sampleRate);
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
  const at=attack||0.008;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+at);
  if(!attack)g.gain.exponentialRampToValueAtTime(laut*0.55,t+Math.min(0.12,dauer*0.5));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  o.start(t);o.stop(t+dauer+0.02);
}
function rauschen(t,dauer,typ,freq,laut,q,ziel2){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noise;f.type=typ;f.frequency.value=freq;if(q)f.Q.value=q;
  s.connect(f);f.connect(g);g.connect(ziel2||bus);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  s.start(t,Math.random()*0.3);s.stop(t+dauer+0.02);
}
function trommel(t,f1,f2,laut,dauer,ziel2){
  const o=ac.createOscillator(),g=ac.createGain();o.type='sine';
  o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dauer*0.7);
  g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
  o.connect(g);g.connect(ziel2||bus);o.start(t);o.stop(t+dauer+0.02);
}
const hat=(t,laut)=>rauschen(t,0.03,'highpass',8000,laut);

/* Ein Sechzehntel planen */
function plane(s,t){
  const bar=BARS[Math.floor(s/16)%BARS.length],i=s%16,d=60/bpm/4,c=CHORD[bar.chord];
  /* Flaeche: der Akkord, weich einsetzend, einen Takt lang */
  if(i===0)for(const n of c){ton(hz(48+n),t,d*16,'sawtooth',0.018,null,900+gef*1400,0.35);ton(hz(60+n),t,d*16,'triangle',0.03,null,null,0.4);}
  /* Melodie, im ruhigen Teil leiser */
  for(const n of bar.melody)if(n.step===i){
    const len=n.len*d*0.95,laut=bar.drang?0.085:0.065;
    ton(hz(n.n),t,len,'square',laut,null,2000+gef*1800);ton(hz(n.n-12),t,len,'triangle',laut*0.8);
  }
  /* Arpeggio: Achtel, bei Gefahr Sechzehntel */
  if(i%2===0||gef>0.45)ton(hz(72+c[i%3]+(i%8>3?-12:0)),t,d*0.9,'triangle',0.04);
  /* Bass: Viertel, bei Gefahr pulsierende Achtel */
  if(i%4===0||(gef>0.5&&i%2===0)){const r=ROOT[bar.chord];ton(hz(r),t,d*(i%4===0?3.4:1.6),'triangle',0.22,null,700);ton(hz(r),t,d*1.6,'square',0.03,null,500);}
  /* Pauke auf 1 und 3 */
  if(i===0||i===8)trommel(t,110,62,0.45,0.35);
  /* Herzschlag, je naeher der Nebel, desto lauter */
  if(gef>0.3&&(i===0||i===8)){trommel(t,70,40,0.6*gef,0.18);trommel(t+d*1.3,64,38,0.45*gef,0.16);}
  if(gef>0.6)hat(t,i%2?0.035:0.07);
  if(bar.drang&&(i===4||i===12))rauschen(t,0.12,'bandpass',1600,0.12,0.9);
}
function takt(){
  if(!laeuft||!ac)return;
  bpm+=(ziel-bpm)*0.06;
  while(next<ac.currentTime+0.12){plane(step,next);next+=60/bpm/4;step++;}
}
function start(){
  if(!an||!bereit())return;
  if(laeuft)return;
  laeuft=true;step=0;next=ac.currentTime+0.06;bpm=ziel=100;gef=0;
  filter.frequency.cancelScheduledValues(ac.currentTime);filter.frequency.setValueAtTime(18000,ac.currentTime);
  bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(1,ac.currentTime);
  timer=setInterval(takt,25);takt();
}
function stop(){
  laeuft=false;if(timer){clearInterval(timer);timer=null;}
  if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.25);
    /* Neu verbinden, damit die naechste Runde mit vollem Pegel beginnt */
    const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},400);
    bus=ac.createGain();bus.gain.value=1;bus.connect(filter);}
}
function pause(on){
  if(!ac)return;
  if(on){if(laeuft){clearInterval(timer);timer=null;}ac.suspend?.();}
  else{ac.resume?.();if(laeuft&&!timer){next=ac.currentTime+0.06;timer=setInterval(takt,25);}}
}
/* Gefahr 0 ... 1 auf 100 ... 140 Schlaege */
function gefahr(g){gef=Math.max(0,Math.min(1,g));ziel=100+gef*40;}
function daempfen(tief,dauer){
  if(!laeuft||!ac)return;const t=ac.currentTime;
  filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(18000,t);
  filter.frequency.exponentialRampToValueAtTime(tief,t+0.08);filter.frequency.setValueAtTime(tief,t+dauer*0.4);
  filter.frequency.exponentialRampToValueAtTime(18000,t+dauer);
}
const fehler=()=>daempfen(500,1.2);
function melodie(folge,typ,ziel2){
  if(!bereit())return;
  const t0=ac.currentTime+0.05;
  for(const [n,s,l,laut] of folge){ton(hz(n),t0+s,l,typ,laut,ziel2||null,4000);if(typ==='square')ton(hz(n-12),t0+s,l,'triangle',laut*0.7,ziel2||null);}
}
function aua(){
  if(!bereit())return;daempfen(300,1.6);
  if(!toene())return;const t=ac.currentTime+0.02;trommel(t,90,40,0.8,0.5,fx);
  melodie([[64,0,0.25,0.12],[63,0.22,0.5,0.12]],'triangle',fx);
}
function lager(){
  if(!an||!bereit())return;
  melodie([[72,0,0.12,0.08],[76,0.1,0.12,0.08],[79,0.2,0.12,0.08],[84,0.3,0.5,0.09]],'triangle');
}
function gipfel(){
  stop();if(!an||!bereit())return;
  /* Fanfare: A-Dur nach dem a-Moll des Aufstiegs */
  melodie([[69,0,0.16,0.11],[73,0.16,0.16,0.11],[76,0.32,0.16,0.11],[81,0.48,1.4,0.12],[73,0.48,1.4,0.06],[76,0.48,1.4,0.06]],'square');
  const t=ac.currentTime+0.05;trommel(t+0.48,110,55,0.7,0.6);for(let i=0;i<8;i++)rauschen(t+0.48+i*0.07,0.08,'bandpass',8000,0.1-i*0.01,2.5);
}
function sturz(){
  stop();if(!an)return;
  melodie([[69,0,0.25,0.09],[67,0.25,0.25,0.09],[65,0.5,0.25,0.09],[64,0.75,0.25,0.09],[57,1.0,1.0,0.1]],'triangle');
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
  s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*0.2);s.stop(t+dauer+0.02);
}
const GERAEUSCH={
  /* Kristall: glaeserne Toene nach oben */
  kristall:t=>{piep(t,1568,1568,0.14,'sine',0.3);piep(t+0.05,2349,2349,0.2,'sine',0.25);piep(t+0.1,3136,3136,0.18,'sine',0.12);},
  /* Edelweiss: weiche Harfe aufwaerts */
  edelweiss:t=>{[880,1109,1319,1760,2217].forEach((f,i)=>piep(t+i*0.045,f,f,0.3,'triangle',0.16));},
  /* Karabiner: metallisches Klicken */
  karabiner:t=>{piep(t,3200,2800,0.04,'square',0.12);piep(t+0.06,4200,3800,0.05,'square',0.1);zisch(t,6000,5000,0.05,0.12,6);},
  /* Seil: surrendes Zischen */
  seil:t=>{zisch(t,400,2400,0.35,0.4,2);piep(t,300,700,0.3,'triangle',0.12);},
  /* Eispickel: Hieb ins Eis */
  pickel:t=>{piep(t,1800,900,0.08,'square',0.12);zisch(t,7000,3000,0.12,0.3,3);piep(t+0.08,600,300,0.2,'triangle',0.15);},
  /* Steinschlag-Treffer: dumpfer Schlag */
  steinschlag:t=>{piep(t,150,50,0.25,'sine',0.7);zisch(t,500,150,0.2,0.35,0.8);},
  /* Steine kommen: tiefes Rumpeln */
  rumpeln:t=>{zisch(t,180,90,0.9,0.35,0.7);piep(t,70,45,0.8,'sine',0.25);},
  /* Adler: Schrei */
  adler:t=>{piep(t,2200,1500,0.28,'sawtooth',0.07);piep(t+0.02,2500,1700,0.24,'triangle',0.08);},
  /* Eisgriff: Abrutschen */
  eis:t=>{zisch(t,5000,1200,0.4,0.3,4);piep(t,900,500,0.35,'triangle',0.08);},
  /* Herz gewonnen */
  herz:t=>{[659,784,1047].forEach((f,i)=>piep(t+i*0.08,f,f,0.25,'triangle',0.2));},
  /* Landen am Griff: leises Klacken */
  griff:t=>{piep(t,420,260,0.06,'triangle',0.12);zisch(t,1800,900,0.04,0.06,2);},
  /* Karabiner faengt einen Fehler ab */
  karabinerhalt:t=>{piep(t,2600,2600,0.06,'square',0.08);piep(t+0.07,2000,2000,0.12,'triangle',0.15);},
  /* Perfekter Sprung: goldener Glitzerlauf */
  perfekt:t=>{[1047,1319,1568,2093,2637].forEach((f,i)=>piep(t+i*0.035,f,f,0.22,'sine',0.18));zisch(t,3000,9000,0.3,0.12,3);},
  /* Feuerwerk: Knall und Knistern */
  feuerwerk:t=>{piep(t,200,60,0.2,'sine',0.35);for(let i=0;i<6;i++)zisch(t+0.05+i*0.04,6000,4000,0.05,0.08,3);}
};
function sfx(name){
  if(!toene()||!GERAEUSCH[name]||!bereit())return;
  try{GERAEUSCH[name](ac.currentTime+0.01);}catch(e){}
}
function setze(on){
  an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}
  if(!an)stop();
}
window.ClimbMusik={start,stop,pause,gefahr,fehler,aua,lager,gipfel,sturz,setze,sfx,geraeusche:Object.keys(GERAEUSCH),
  get an(){return an;},get laeuft(){return laeuft;},verfuegbar:!!AC,_bars:BARS,_song:SONG,_midi:midi};
})();
