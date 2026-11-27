/* =========================================================================
   TOWN RACE – Musik, Motoren und Geraeusche (Web Audio, nichts zu laden)
   window.StadtMusik:
     start() / stop()     Renn-Musik (flotter Synth-Pop, eigene Komposition)
     leise(ja)            Musik gedaempft (Pause, Ergebnis)
     motor(i,tempo,gas)   Motorgeraeusch von Kart i (0/1); motorAus()
     sfx(name)            piep, los, richtig, falsch, boost, stoss, ziel,
                          klick, hupe, wende
     setze(an), wecken(), blockiert
   Toene folgen der Einstellung der App (vt:feedback:v1); Musik hat einen
   eigenen Schalter (vt6:stadt:musik).
   ========================================================================= */
(function(){
'use strict';
const KEY='vt6:stadt:musik';
let an=(()=>{try{return localStorage.getItem(KEY)!=='aus';}catch(e){return true;}})();
const AC=window.AudioContext||window.webkitAudioContext;
let ac=null,master=null,bus=null,fx=null,noise=null,timer=null,step=0,next=0,laeuft=false;
const BPM=138;
const hz=n=>440*Math.pow(2,(n-69)/12);
function bereit(){
 if(!AC)return false;
 if(!ac){
  try{ac=new AC();}catch(e){return false;}
  master=ac.createGain();master.gain.value=0.17;master.connect(ac.destination);
  bus=ac.createGain();bus.gain.value=1;bus.connect(master);
  fx=ac.createGain();fx.gain.value=0.5;fx.connect(ac.destination);
  const len=ac.sampleRate;noise=ac.createBuffer(1,len,ac.sampleRate);
  const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 }
 if(ac.state==='suspended')try{ac.resume();}catch(e){}
 return true;
}
function ton(f,t,dauer,typ,laut,ziel,cut){
 const o=ac.createOscillator(),g=ac.createGain();let out=g;o.type=typ;o.frequency.setValueAtTime(f,t);
 if(cut){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;g.connect(fl);out=fl;}
 out.connect(ziel||bus);o.connect(g);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 o.start(t);o.stop(t+dauer+0.03);
}
function rauschen(t,dauer,typ,freq,laut,ziel){
 const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
 s.buffer=noise;f.type=typ;f.frequency.value=freq;s.connect(f);f.connect(g);g.connect(ziel||bus);
 g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);s.start(t,Math.random()*0.5);s.stop(t+dauer+0.02);
}
function kick(t,laut){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+0.11);
 g.gain.setValueAtTime(laut,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);o.connect(g);g.connect(bus);o.start(t);o.stop(t+0.22);}

/* Akkorde (Grundton MIDI) und Muster: Am – F – C – G, im B-Teil F – G – Em – Am */
const TEIL_A=[[57,[0,3,7]],[53,[0,4,7]],[48,[0,4,7]],[55,[0,4,7]]],TEIL_B=[[53,[0,4,7]],[55,[0,4,7]],[52,[0,3,7]],[57,[0,3,7]]];
const FOLGE=[TEIL_A,TEIL_A,TEIL_B,TEIL_A];
/* Melodie je Takt: Stufen ueber dem Akkord (Index in Akkord + Oktave), -1 = Pause */
const MEL_A=[[2,-1,1,-1,0,-1,1,2,-1,2,-1,1,0,-1,-1,-1],[0,-1,1,-1,2,-1,1,0,-1,1,-1,2,4,-1,-1,-1],[2,-1,2,1,0,-1,1,-1,2,-1,4,-1,2,-1,1,-1],[1,-1,0,-1,1,-1,2,-1,4,-1,-1,2,-1,1,-1,-1]];
const MEL_B=[[4,-1,-1,2,-1,-1,1,-1,2,-1,4,-1,5,-1,-1,-1],[4,-1,2,-1,1,-1,2,-1,4,-1,5,-1,4,-1,2,-1],[2,-1,1,-1,0,-1,1,-1,2,-1,1,-1,0,-1,-1,-1],[0,-1,-1,1,-1,-1,2,-1,4,-1,2,-1,0,-1,-1,-1]];
function plane(s,t){
 const takt=Math.floor(s/16),teil=FOLGE[Math.floor(takt/4)%FOLGE.length],[root,akk]=teil[takt%4],i=s%16,d=60/BPM/4;
 const melodie=(teil===TEIL_B?MEL_B:MEL_A)[takt%4][i];
 /* Bass: Achtel mit Oktavsprung */
 if(i%2===0)ton(hz(root-12+(i%4===2?12:0)),t,d*1.7,'sawtooth',0.12,null,600);
 /* Arpeggio */
 const st=[0,1,2,1][i%4];ton(hz(root+12+akk[st]),t,d*0.9,'square',0.025,null,2400);
 /* Melodie */
 if(melodie>=0){const n=root+24+(melodie>=3?12+akk[melodie-3]:akk[melodie]);ton(hz(n),t,d*2.2,'triangle',0.09);ton(hz(n)*2,t,d*1.2,'sine',0.02);}
 /* Schlagzeug */
 if(i%4===0)kick(t,0.38);
 if(i===4||i===12)rauschen(t,0.14,'bandpass',1800,0.22);
 if(i%2===1)rauschen(t,0.04,'highpass',8000,0.06);
}
function takt(){if(!laeuft||!ac)return;while(next<ac.currentTime+0.12){plane(step,next);next+=60/BPM/4;step++;}}
function start(){
 if(!an||!bereit()||laeuft)return;
 laeuft=true;step=0;next=ac.currentTime+0.08;
 bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(0.0001,ac.currentTime);bus.gain.exponentialRampToValueAtTime(1,ac.currentTime+1.0);
 timer=setInterval(takt,25);takt();
}
function stop(){
 laeuft=false;if(timer){clearInterval(timer);timer=null;}
 if(ac&&bus){const t=ac.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(0,t+0.3);
  const alt=bus;setTimeout(()=>{try{alt.disconnect();}catch(e){}},500);bus=ac.createGain();bus.gain.value=1;bus.connect(master);}
}
function leise(ja){if(!ac)return;const t=ac.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(ja?0.07:0.17,t+0.5);}

/* ---------------- Motoren ---------------- */
function toene(){try{const p=JSON.parse(localStorage.getItem('vt:feedback:v1'));return !p||p.sound!==false;}catch(e){return true;}}
const MOTOR=[null,null];
function motor(i,tempo,gas){
 if(!toene()||!bereit())return;
 let m=MOTOR[i];
 if(!m){m=MOTOR[i]={};m.g=ac.createGain();m.g.gain.value=0;m.f=ac.createBiquadFilter();m.f.type='lowpass';m.f.frequency.value=500;
  m.o1=ac.createOscillator();m.o1.type='sawtooth';m.o2=ac.createOscillator();m.o2.type='square';
  const g2=ac.createGain();g2.gain.value=0.5;m.o1.connect(m.f);m.o2.connect(g2);g2.connect(m.f);m.f.connect(m.g);
  if(ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=i?0.35:-0.35;m.g.connect(p);p.connect(fx);}else m.g.connect(fx);
  m.o1.start();m.o2.start();}
 const t=ac.currentTime,v=Math.abs(tempo||0),f=48+v*5.2+(gas||0)*10;
 m.o1.frequency.setTargetAtTime(f,t,0.06);m.o2.frequency.setTargetAtTime(f*0.5,t,0.06);
 m.f.frequency.setTargetAtTime(350+v*45+(gas||0)*300,t,0.08);
 m.g.gain.setTargetAtTime(0.05+(gas||0)*0.05+Math.min(0.05,v*0.003),t,0.08);
}
function motorAus(){for(let i=0;i<2;i++){const m=MOTOR[i];if(!m)continue;try{const t=ac.currentTime;m.g.gain.setTargetAtTime(0,t,0.05);m.o1.stop(t+0.4);m.o2.stop(t+0.4);}catch(e){}MOTOR[i]=null;}}

/* ---------------- Geraeusche ---------------- */
function piep(t,f1,f2,dauer,typ,laut){const o=ac.createOscillator(),g=ac.createGain();o.type=typ;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dauer*0.85);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);o.connect(g);g.connect(fx);o.start(t);o.stop(t+dauer+0.02);}
function zisch(t,f1,f2,dauer,laut){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise;f.type='bandpass';f.Q.value=1.1;
 f.frequency.setValueAtTime(f1,t);f.frequency.exponentialRampToValueAtTime(f2,t+dauer);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(laut,t+dauer*0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+dauer);
 s.connect(f);f.connect(g);g.connect(fx);s.start(t,Math.random()*0.4);s.stop(t+dauer+0.02);}
const GERAEUSCH={
 piep:t=>piep(t,660,660,0.22,'square',0.12),
 los:t=>{piep(t,1320,1320,0.5,'square',0.12);piep(t,660,660,0.5,'triangle',0.1);},
 richtig:t=>{piep(t,hz(84),hz(84),0.12,'triangle',0.16);piep(t+0.1,hz(88),hz(88),0.12,'triangle',0.16);piep(t+0.2,hz(91),hz(91),0.25,'triangle',0.16);},
 falsch:t=>{piep(t,220,200,0.18,'sawtooth',0.12);piep(t+0.2,180,160,0.3,'sawtooth',0.12);},
 wende:t=>{piep(t,500,700,0.12,'triangle',0.12);},
 boost:t=>{zisch(t,300,3500,0.7,0.35);piep(t,200,900,0.6,'sawtooth',0.06);},
 stoss:t=>{piep(t,120,50,0.18,'sine',0.5);zisch(t,800,200,0.15,0.25);},
 klick:t=>piep(t,1400,1500,0.035,'triangle',0.12),
 hupe:t=>{piep(t,415,415,0.35,'square',0.08);piep(t,523,523,0.35,'square',0.06);},
 ziel:t=>{[[72,0],[76,0.13],[79,0.26],[84,0.39],[79,0.6],[84,0.72]].forEach(([n,s],i)=>{const l=i===5?1.0:0.13;piep(t+s,hz(n),hz(n),l,'square',0.08);piep(t+s,hz(n-12),hz(n-12),l,'triangle',0.1);});
  zisch(t+0.7,2000,6000,1.2,0.12);}
};
function sfx(name){if(!toene()||!GERAEUSCH[name]||!bereit())return;try{GERAEUSCH[name](ac.currentTime+0.01);}catch(e){}}
function setze(on){an=!!on;try{localStorage.setItem(KEY,an?'an':'aus');}catch(e){}if(!an)stop();}
function wecken(){if(!ac)return bereit();if(ac.state!=='running')try{ac.resume();}catch(e){}return true;}
window.StadtMusik={start,stop,leise,motor,motorAus,sfx,setze,wecken,geraeusche:Object.keys(GERAEUSCH),
 get blockiert(){return !!ac&&ac.state!=='running'&&(laeuft||toene());},get an(){return an;},get laeuft(){return laeuft;},verfuegbar:!!AC};
})();
