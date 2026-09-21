(function(){
'use strict';
const key='vt:feedback:v1',motion=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
/* Toene sind an, bis jemand sie abschaltet. Vorher waren sie aus, und
   der einzige Schalter steht ganz unten auf der Seite - ein Kind
   findet ihn nicht und erfaehrt nie, dass es ihn gibt. Wer sie
   ausschaltet, behaelt das: gespeichert wird nur die ausdrueckliche
   Wahl, und sound!==false laesst sie stehen. */
let prefs={sound:true,animation:true},ctx;
try{const p=JSON.parse(localStorage.getItem(key));if(p){prefs.sound=p.sound!==false;prefs.animation=p.animation!==false;}}catch(e){}
function save(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch(e){}sync();}
function sync(){document.documentElement.classList.toggle('feedback-motion',prefs.animation&&!motion?.matches);document.querySelectorAll('[data-feedback-pref]').forEach(b=>{const k=b.dataset.feedbackPref;b.setAttribute('aria-pressed',String(prefs[k]));b.textContent=(k==='sound'?'Töne':'Animationen')+': '+(prefs[k]?'an':'aus');});}
/* =========================================================================
   KLANG DER RUECKMELDUNG  -  Charakter "Glocke"
   Vier unharmonische Teiltoene im Verhaeltnis einer angeschlagenen Glocke,
   weiche Huellkurve und ein kurzer gerechneter Raum. Alles aus dem
   Web-Audio-Baukasten: keine Dateien, keine Ladezeit.
   ========================================================================= */
const LAUT=0.115;                       /* auf dem bisherigen Pegel gehalten */
let hall,trocken,nass;
function kette(ac){
  if(trocken&&trocken.context===ac)return;
  const rate=ac.sampleRate,laenge=Math.floor(rate*1.1);
  const puffer=ac.createBuffer(2,laenge,rate);
  for(let k=0;k<2;k++){const kanal=puffer.getChannelData(k);
    for(let i=0;i<laenge;i++)kanal[i]=(Math.random()*2-1)*Math.pow(1-i/laenge,3.4);}
  hall=ac.createConvolver();hall.buffer=puffer;
  trocken=ac.createGain();trocken.gain.value=0.88;
  nass=ac.createGain();nass.gain.value=0.16;
  hall.connect(nass);trocken.connect(ac.destination);nass.connect(ac.destination);
}
/* Ein Teilton mit weichem Anschlag und exponentiellem Ausklingen. */
function teilton(ac,freq,start,dauer,pegel,anschlagZeit){
  const o=ac.createOscillator(),g=ac.createGain();
  o.type='sine';o.frequency.setValueAtTime(freq,start);
  g.gain.setValueAtTime(0.0001,start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002,pegel),start+(anschlagZeit||0.004));
  g.gain.exponentialRampToValueAtTime(0.0001,start+dauer);
  o.connect(g);g.connect(trocken);g.connect(hall);
  o.start(start);o.stop(start+dauer+0.05);
}
/* Der Anschlag selbst: ein sehr kurzes, gefiltertes Rauschen. */
function anschlag(ac,start,pegel){
  const laenge=Math.floor(ac.sampleRate*0.035);
  const puffer=ac.createBuffer(1,laenge,ac.sampleRate);
  const d=puffer.getChannelData(0);
  for(let i=0;i<laenge;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/laenge,2.2);
  const q=ac.createBufferSource();q.buffer=puffer;
  const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=3200;f.Q.value=1.2;
  const g=ac.createGain();g.gain.value=pegel;
  q.connect(f);f.connect(g);g.connect(trocken);g.connect(hall);
  q.start(start);
}
const TEIL=[1,2.76,5.40,8.93],ANTEIL=[1,0.42,0.22,0.10];
function glocke(ac,grund,start,dauer,lautstaerke){
  anschlag(ac,start,0.035*lautstaerke);
  TEIL.forEach((v,i)=>teilton(ac,grund*v,start,dauer*(1-i*0.13),LAUT*ANTEIL[i]*lautstaerke,0.004));
}
function tone(kind){if(!prefs.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=ctx||new Audio();ctx.resume().then(()=>{
  kette(ctx);
  const t=ctx.currentTime+0.01;
  if(kind==='done'){                       /* Runde geschafft: drei Anschlaege aufwaerts */
    [523,659,784].forEach((f,i)=>glocke(ctx,f,t+i*0.16,1.0,0.7));
  }else if(kind==='ok'){                   /* richtig: Grundton, kurz darauf die Quinte */
    glocke(ctx,784,t,1.15,1);
    TEIL.forEach((v,i)=>teilton(ctx,1176*v,t+0.13,0.8*(1-i*0.13),LAUT*ANTEIL[i]*0.55,0.004));
  }else if(kind==='near'){                 /* fast richtig: derselbe Klang, tiefer, ohne Quinte */
    glocke(ctx,587,t,1.15,1);
  }else{                                   /* falsch: tiefer, kuerzer, mit Unterton */
    glocke(ctx,392,t,0.8,1);
    teilton(ctx,196,t,0.6,LAUT*0.4,0.01);
  }
}).catch(()=>{});}catch(e){}}
function confettiBurst(host){for(let i=0;i<16;i++){const p=document.createElement('span');p.className='confetti-piece';const angle=Math.random()*Math.PI*2,dist=44+Math.random()*76;p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist+'px');p.style.setProperty('--rot',(Math.random()*360-180)+'deg');p.style.background=['var(--moss)','var(--petrol)','var(--amber)'][i%3];p.style.animationDelay=(Math.random()*30)+'ms';host.appendChild(p);p.addEventListener('animationend',()=>p.remove());}}
/* Kurzes Vibrieren zur Antwort. Android und Chrome koennen das; auf dem
   iPhone fehlt die Schnittstelle in allen Browsern, weil alle WebKit
   nutzen - dort passiert schlicht nichts. Gekoppelt an denselben Schalter
   wie die Animationen. */
function buzz(kind){
  try{
    if(!prefs.animation||!motion||motion.matches)return;
    if(typeof navigator.vibrate!=='function')return;
    navigator.vibrate(kind==='ok'?18:kind==='near'?[14,60,14]:[26,50,26]);
  }catch(e){}
}
function signal(kind){tone(kind);buzz(kind);const host=document.querySelector('.vcard,#feedback,.panel');if(!host)return;host.classList.remove('feedback-ok','feedback-near','feedback-no');host.querySelectorAll('.confetti-piece').forEach(p=>p.remove());void host.offsetWidth;host.classList.add('feedback-'+kind);if(kind==='ok'&&document.documentElement.classList.contains('feedback-motion'))confettiBurst(host);}
window.LearningFeedback={signal,tone};
const bar=document.createElement('div');bar.className='feedback-settings';bar.setAttribute('aria-label','Rückmeldungen');bar.innerHTML='<button type="button" data-feedback-pref="sound"></button><button type="button" data-feedback-pref="animation"></button>';const host=document.querySelector('.wrap,main');if(host)host.append(bar);bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{prefs[b.dataset.feedbackPref]=!prefs[b.dataset.feedbackPref];save();if(b.dataset.feedbackPref==='sound'&&prefs.sound)tone('ok');});if(motion)motion.addEventListener?.('change',sync);sync();
})();
