(function(){
'use strict';
const key='vt:feedback:v1',motion=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
let prefs={sound:false,animation:true},ctx;
try{const p=JSON.parse(localStorage.getItem(key));if(p){prefs.sound=p.sound===true;prefs.animation=p.animation!==false;}}catch(e){}
function save(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch(e){}sync();}
function sync(){document.documentElement.classList.toggle('feedback-motion',prefs.animation&&!motion?.matches);document.querySelectorAll('[data-feedback-pref]').forEach(b=>{const k=b.dataset.feedbackPref;b.setAttribute('aria-pressed',String(prefs[k]));b.textContent=(k==='sound'?'Töne':'Animationen')+': '+(prefs[k]?'an':'aus');});}
function tone(kind){if(!prefs.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=ctx||new Audio();ctx.resume().then(()=>{const notes=kind==='done'?[523,659,784]:kind==='ok'?[660]:kind==='near'?[440]:[330];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.11;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.14);});}).catch(()=>{});}catch(e){}}
function signal(kind){tone(kind);const host=document.querySelector('.vcard,#feedback,.panel');if(!host)return;host.classList.remove('feedback-ok','feedback-near','feedback-no');void host.offsetWidth;host.classList.add('feedback-'+kind);}
window.LearningFeedback={signal,tone};
const bar=document.createElement('div');bar.className='feedback-settings';bar.setAttribute('aria-label','Rückmeldungen');bar.innerHTML='<button type="button" data-feedback-pref="sound"></button><button type="button" data-feedback-pref="animation"></button>';const host=document.querySelector('.wrap,main');if(host)host.append(bar);bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{prefs[b.dataset.feedbackPref]=!prefs[b.dataset.feedbackPref];save();if(b.dataset.feedbackPref==='sound'&&prefs.sound)tone('ok');});if(motion)motion.addEventListener?.('change',sync);sync();
})();
