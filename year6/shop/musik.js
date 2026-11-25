/* =========================================================================
   SHOPPING TRIP – Musik und Geraeusche
   Entspannte Ladenmusik (Bossa nova in F-Dur), die der Browser selbst spielt
   (Web Audio): keine Dateien, keine Lizenzfragen, auch ohne Netz.
     start(art)   'laden' ruhig, 'duell' schneller und mit mehr Schlagzeug
     stop()       ausblenden
     leise(an)    an der Kasse: Musik leiser und dumpfer
     sfx(name,n)  piep, scan (n Artikel), kasse, muenze, korb, tuer, klick,
                  gong, tick, falsch, fanfare. Sie haengen nicht an der Musik,
                  sondern am Schalter "Toene" der App.
   Die Einstellung an/aus steht in vt6:shop:musik; ohne Wahl ist sie an.
   Wo es kein Web Audio gibt (oder in den Tests), tut die Musik nichts.
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:shop:musik';
let an=true;try{an=localStorage.getItem(KEY)!=='aus';}catch(e){}

/* ------------------------------------------------------------ Noten
   Je Takt acht Achtel: Notenname, "_" haelt die vorige Note, "-" ist Pause.
   Gespielt wird A A B A. */
const A={chords:['Fmaj7','Dm7','Gm7','C7','Fmaj7','Am7','Bbmaj7','C7'],melody:[
  'A4 _ C5 _ F5 _ E5 C5','D5 _ _ _ - - A4 C5','D5 _ F5 _ A5 _ G5 F5','E5 _ _ _ - - - -',
  'A4 _ C5 _ F5 _ A5 _','G5 _ E5 _ C5 _ - -','D5 E5 F5 _ D5 _ Bb4 _','C5 _ _ _ - - - -']};
const B={chords:['Bbmaj7','Am7','Gm7','Fmaj7','Bbmaj7','Am7','Gm7','C7'],melody:[
  'D5 _ F5 _ A5 _ G5 _','E5 _ C5 _ A4 _ - -','Bb4 _ D5 _ G5 _ F5 E5','F5 _ _ _ - - C5 _',
  'D5 _ F5 _ Bb5 _ A5 _','G5 _ E5 _ C5 _ A4 _','Bb4 _ D5 _ E5 _ G5 _','F5 _ _ _ - - - -']};
const SONG=[A,A,B,A];
const CHORD={Fmaj7:[5,9,12,16],Dm7:[2,5,9,12],Gm7:[7,10,14,17],C7:[4,7,10,12],Am7:[9,12,16,19],Bbmaj7:[10,14,17,21]};
const ROOT={Fmaj7:41,Dm7:38,Gm7:43,C7:36,Am7:45,Bbmaj7:46};
const NAMES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(name){const m=/^([A-G])(#|b)?(\d)$/.exec(name);if(!m)return null;return 12*(Number(m[3])+1)+NAMES[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);}
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
const BARS=SONG.flatMap(part=>part.melody.map((m,i)=>({chord:part.chords[i],melody:noten(m)})));

/* ----------------------------------------------------------- Klang */
const AC=window.AudioContext||window.webkitAudioContext;
let ac=null,bus=null,filter=null,master=null,noise=null,fx=null;
let timer=null,step=0,next=0,bpm=100,art='laden',laeuft=false;
function bereit(){
 if(!AC)return false;
 if(!ac){
  try{ac=new AC();}catch(e){return false;}
  master=ac.createGain();master.gain.value=0.2;master.connect(ac.destination);
  filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=16000;filter.connect(master);
  bus=ac.createGain();bus.gain.value=1;bus.connect(filter);
  fx=ac.createGain();fx.gain.value=0.5;fx.connect(ac.destination);
  const len=ac.sampleRate;noise=ac.createBuffer(1,len,ac.sampleRate);
  const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 }
 if(ac.state==='suspended')ac.resume?.();
 return true;
}
/* Ein Ton mit weichem Ausklingen. obert: Lautstaerke des Obertons (E-Piano, Vibraphon) */
function ton(freq,t,dauer,typ,laut,obert,ziel2,cut){
 const g=ac.createGain();let out=g;
 if(cut){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;g.connect(f);out=f;}
 out.connect(ziel2||bus);
 const o=ac.createOscillator();o.type=typ;o.frequency.setValueAtTime(freq,t);o.connect(g);
 let o2=null;if(obert){o2=ac.createOscillator();const g2=ac.createGain();o2.type='sine';o2.frequency.setValueAtTime(freq*4,t);g2.gain.value=obert;o2.connect(g2);g2.connect(g);}
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.012);
 g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 o.start(t);o.stop(t+dauer+0.03);if(o2){o2.start(t);o2.stop(t+dauer+0.03);}
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
 o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);
 g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
 o.connect(g);g.connect(bus);o.start(t);o.stop(t+0.22);
}
const rim=(t,laut)=>{ton(1700,t,0.04,'triangle',laut);rauschen(t,0.03,'bandpass',2500,laut*0.6,3);};
const shaker=(t,laut)=>rauschen(t,0.05,'highpass',7000,laut);

/* Bossa: Bass auf 1 und 3 mit Quinte davor, E-Piano synkopiert, Vibraphon-Melodie */
function plane(s,t){
 const bar=BARS[Math.floor(s/16)%BARS.length],i=s%16,d=60/bpm/4,duell=art==='duell';
 for(const n of bar.melody)if(n.step===i)ton(hz(n.n),t,Math.max(0.5,n.len*d*1.6),'sine',duell?0.13:0.11,0.08,null,null);
 const r=ROOT[bar.chord];
 if(i===0||i===8)ton(hz(r),t,d*3.2,'triangle',0.28,0,null,700);
 if(i===6||i===14)ton(hz(r+7),t,d*1.8,'triangle',0.22,0,null,700);
 if([0,3,6,10,12].includes(i)){const c=CHORD[bar.chord];for(const h of c)ton(hz(60+h-12+(h<8?12:0)),t,d*(i===0?3:1.6),'sine',0.035,0.05,null,2600);}
 if(i===0||i===8||(duell&&(i===4||i===12)))kick(t,duell?0.42:0.3);
 if([3,6,10,12,14].includes(i))rim(t,duell?0.06:0.04);
 if(i%2===0||duell)shaker(t,i%4===0?0.035:0.022);
}
function takt(){
 if(!laeuft||!ac)return;
 while(next<ac.currentTime+0.12){plane(step,next);next+=60/bpm/4;step++;}
}
function start(neueArt){
 art=neueArt||'laden';bpm=art==='duell'?126:100;
 if(!an||!bereit())return;
 if(laeuft)return;
 laeuft=true;step=0;next=ac.currentTime+0.08;
 filter.frequency.cancelScheduledValues(ac.currentTime);filter.frequency.setValueAtTime(16000,ac.currentTime);
 bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(0.0001,ac.currentTime);bus.gain.exponentialRampToValueAtTime(1,ac.currentTime+1.2);
 timer=setInterval(takt,25);takt();
}
function stop(){
 laeuft=false;if(timer){clearInterval(timer);timer=null;}
 if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.4);
  const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},600);
  bus=ac.createGain();bus.gain.value=1;bus.connect(filter);}
}
function leise(ja){
 if(!ac||!filter)return;const t=ac.currentTime;
 filter.frequency.cancelScheduledValues(t);filter.frequency.setValueAtTime(filter.frequency.value,t);
 filter.frequency.exponentialRampToValueAtTime(ja?900:16000,t+0.6);
 master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(ja?0.11:0.2,t+0.6);
}

/* ------------------------------------------------------- Geraeusche */
function toene(){try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}}
function piep(t,f1,f2,dauer,typ,laut){
 const o=ac.createOscillator(),g=ac.createGain();o.type=typ;
 o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dauer*0.85);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 o.connect(g);g.connect(fx);o.start(t);o.stop(t+dauer+0.02);
}
function zisch(t,f1,f2,dauer,laut,q){
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
 s.buffer=noise;f.type='bandpass';f.Q.value=q||1.2;f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+dauer);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+dauer*0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*0.4);s.stop(t+dauer+0.02);
}
/* Glocke: Grundton mit unharmonischen Obertoenen */
function glocke(t,f,laut,dauer){[1,2.76,5.4].forEach((m,i)=>piep(t,f*m,f*m*0.998,dauer*(1-i*0.25),'sine',laut*(i?0.3:1)));}
const GERAEUSCH={
 /* Scanner an der Kasse */
 piep:t=>piep(t,2350,2350,0.09,'square',0.06),
 scan:(t,n)=>{for(let i=0;i<Math.min(n||1,12);i++)piep(t+i*0.22,2350,2350,0.08,'square',0.055);},
 /* Registrierkasse: Klingeln und Schublade */
 kasse:t=>{glocke(t,1568,0.18,0.9);glocke(t+0.08,2093,0.14,0.8);zisch(t+0.12,600,200,0.25,0.25,0.9);piep(t+0.3,140,60,0.12,'sine',0.35);},
 /* Muenze auf der Theke */
 muenze:t=>{glocke(t,3200+Math.random()*600,0.08,0.25);glocke(t+0.05,2600,0.05,0.2);},
 /* Ware in den Korb */
 korb:t=>{piep(t,260,120,0.12,'sine',0.35);zisch(t,1800,700,0.12,0.12,0.8);},
 /* Automatische Schiebetuer */
 tuer:t=>{zisch(t,300,900,0.55,0.12,0.6);zisch(t+0.25,900,400,0.5,0.08,0.6);},
 klick:t=>piep(t,1400,1500,0.035,'triangle',0.12),
 /* Lautsprecher-Gong: ding-dong-ding */
 gong:t=>{glocke(t,784,0.16,1.1);glocke(t+0.42,659,0.16,1.1);glocke(t+0.84,523,0.18,1.6);},
 tick:t=>piep(t,1100,1000,0.05,'square',0.07),
 falsch:t=>{piep(t,330,300,0.16,'square',0.1);piep(t+0.18,250,220,0.28,'square',0.1);},
 fanfare:t=>{[[72,0],[76,0.12],[79,0.24],[84,0.36]].forEach(([n,s])=>{piep(t+s,hz(n),hz(n),s===0.36?0.9:0.14,'square',0.07);piep(t+s,hz(n-12),hz(n-12),s===0.36?0.9:0.14,'triangle',0.08);});
  glocke(t+0.36,hz(84),0.08,1.2);}
};
function sfx(name,n){
 if(!toene()||!GERAEUSCH[name]||!bereit())return;
 try{GERAEUSCH[name](ac.currentTime+0.01,n);}catch(e){}
}
function setze(on){
 an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}
 if(!an)stop();
}
/* Browser geben Ton erst nach einer echten Eingabe frei (Klick, Tippen, Taste).
   wecken() bei jeder solchen Eingabe aufrufen; blockiert sagt, ob der Ton gerade
   gesperrt ist, obwohl er laufen soll. */
function wecken(){if(!ac)return bereit();if(ac.state!=='running')try{ac.resume();}catch(e){}return true;}
window.ShopMusik={start,stop,leise,setze,sfx,wecken,get blockiert(){return !!ac&&ac.state!=='running'&&(laeuft||toene());},geraeusche:Object.keys(GERAEUSCH),
 get an(){return an;},get laeuft(){return laeuft;},get art(){return art;},verfuegbar:!!AC,_bars:BARS,_midi:midi};
})();
