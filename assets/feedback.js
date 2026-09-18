(function(){
'use strict';
const key='vt:feedback:v1',motion=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
let prefs={sound:false,animation:true},ctx;
try{const p=JSON.parse(localStorage.getItem(key));if(p){prefs.sound=p.sound===true;prefs.animation=p.animation!==false;}}catch(e){}
function save(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch(e){}sync();}
function sync(){document.documentElement.classList.toggle('feedback-motion',prefs.animation&&!motion?.matches);document.querySelectorAll('[data-feedback-pref]').forEach(b=>{const k=b.dataset.feedbackPref;b.setAttribute('aria-pressed',String(prefs[k]));b.textContent=(k==='sound'?'Töne':'Animationen')+': '+(prefs[k]?'an':'aus');});}
function envTone(ac,freq,type,start,dur,peak){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(peak,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+dur+.02);}
function bendTone(ac,f0,f1,type,start,dur,peak){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,start);o.frequency.linearRampToValueAtTime(f1,start+dur);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(peak,start+.015);g.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+dur+.02);}
function tone(kind){if(!prefs.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=ctx||new Audio();ctx.resume().then(()=>{const t=ctx.currentTime;
  if(kind==='done'){[523,659,784].forEach((f,i)=>envTone(ctx,f,'sine',t+i*.11,.12,.035));}
  else if(kind==='ok'){[523,659,880,1047].forEach((f,i)=>envTone(ctx,f,'square',t+i*.055,.12,.09));}
  else if(kind==='near'){bendTone(ctx,392,523,'triangle',t,.16,.08);}
  else{[196,185].forEach(f=>envTone(ctx,f,'square',t,.26,.08));}
}).catch(()=>{});}catch(e){}}
function confettiBurst(host){for(let i=0;i<16;i++){const p=document.createElement('span');p.className='confetti-piece';const angle=Math.random()*Math.PI*2,dist=44+Math.random()*76;p.style.setProperty('--dx',Math.cos(angle)*dist+'px');p.style.setProperty('--dy',Math.sin(angle)*dist+'px');p.style.setProperty('--rot',(Math.random()*360-180)+'deg');p.style.background=['var(--moss)','var(--petrol)','var(--amber)'][i%3];p.style.animationDelay=(Math.random()*30)+'ms';host.appendChild(p);p.addEventListener('animationend',()=>p.remove());}}
function signal(kind){tone(kind);const host=document.querySelector('.vcard,#feedback,.panel');if(!host)return;host.classList.remove('feedback-ok','feedback-near','feedback-no');host.querySelectorAll('.confetti-piece').forEach(p=>p.remove());void host.offsetWidth;host.classList.add('feedback-'+kind);if(kind==='ok'&&document.documentElement.classList.contains('feedback-motion'))confettiBurst(host);}
window.LearningFeedback={signal,tone};
const bar=document.createElement('div');bar.className='feedback-settings';bar.setAttribute('aria-label','Rückmeldungen');bar.innerHTML='<button type="button" data-feedback-pref="sound"></button><button type="button" data-feedback-pref="animation"></button>';const host=document.querySelector('.wrap,main');if(host)host.append(bar);bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{prefs[b.dataset.feedbackPref]=!prefs[b.dataset.feedbackPref];save();if(b.dataset.feedbackPref==='sound'&&prefs.sound)tone('ok');});if(motion)motion.addEventListener?.('change',sync);sync();
})();
