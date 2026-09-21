/* Isolated preview adapter. Uses the current trainer and its real keyboard. */
(async function(){
 const scenes=await fetch('scene.json').then(r=>r.json());
 let streak=0,position=0,raf=0,queue=null,credited=new Set(),lastTarget=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const panel=document.createElement('section');panel.className='ascent-panel';panel.setAttribute('aria-label','Dein Aufstieg');
 panel.innerHTML='<div class="ascent-label"><span>DEIN AUFSTIEG</span><b class="ascent-streak">0 in Folge</b></div>'+scenes.large+scenes.small+'<div class="ascent-footer"><span class="ascent-count"></span><strong class="ascent-percent"></strong></div>';
 const note=document.createElement('div');note.className='ascent-preview-note';note.textContent='Bergvorschau · separater Test-Lernstand';document.body.append(note);
 const oldBuild=buildQueue;buildQueue=function(){streak=0;position=0;lastTarget=-1;credited=new Set();oldBuild();queue=S.queue;};
 function animate(target){cancelAnimationFrame(raf);const start=performance.now(),from=position;panel.classList.add('ascent-walking');function tick(now){let t=reduced.matches?1:Math.min(1,(now-start)/950);position=from+(target-from)*t*t*(3-2*t);for(const [r,h,tr] of [['route','hiker','trail'],['mobileRoute','mobileHiker','mobileTrail']]){const path=panel.querySelector('#'+r),len=path.getTotalLength(),pt=path.getPointAtLength(position*len);panel.querySelector('#'+h).setAttribute('transform',`translate(${pt.x} ${pt.y})${h==='mobileHiker'?' scale(.72)':''}`);const line=panel.querySelector('#'+tr);line.style.strokeDasharray=len;line.style.strokeDashoffset=len*(1-position);}if(t<1)raf=requestAnimationFrame(tick);else panel.classList.remove('ascent-walking');}raf=requestAnimationFrame(tick);}
 function update(){
  const active=['type','cloze'].includes(S.mode)&&(S.view==='session');
  document.body.classList.toggle('ascent-active',active);
  if(!active){panel.remove();return;}
  const stage=document.querySelector('.stage'),done=document.querySelector('.done');if(!stage&&!done)return;
  if(queue!==S.queue){queue=S.queue;credited=new Set();streak=0;position=0;lastTarget=-1;}
  const n=S.initialCount||S.queue.length;const completed=Math.min(n,S.i+(S.answered?1:0));const pct=n?completed/n:0;
  panel.classList.toggle('ascent-summit',S.i>=S.queue.length);
  panel.querySelector('.ascent-count').textContent=completed+' / '+n+' Wörter'+(S.i>=n&&S.i<S.queue.length?' · Wiederholung':'');
  panel.querySelector('.ascent-percent').textContent=Math.round(pct*100)+' %';panel.querySelector('.ascent-streak').textContent=streak+' in Folge';
  const bar=document.querySelector('.round-progress');if(bar){bar.querySelectorAll('span,progress').forEach(el=>el.hidden=true);}
  if(panel.nextElementSibling!==(stage||done))(stage||done).before(panel);
  if(pct!==lastTarget){lastTarget=pct;animate(pct);}
 }
 const oldSubmit=submitTyped;submitTyped=function(){const i=S.i;oldSubmit();if(S.answered&&!credited.has(i)){credited.add(i);streak=S.answered==='ok'?streak+1:0;panel.querySelector('.ascent-streak').textContent=streak+' in Folge';panel.classList.remove('ascent-celebrate');void panel.offsetWidth;if(S.answered==='ok')panel.classList.add('ascent-celebrate');}};
 const oldRender=render;render=function(){oldRender();update();};
 const observer=new MutationObserver(()=>{if(!panel.isConnected||panel.nextElementSibling!==document.querySelector('.stage,.done'))update();});
 observer.observe(view,{childList:true});
 // Start a real ten-word Year-6 round; all normal navigation remains available.
 S.roundSource=TOPICS[0].id;S.topicId=TOPICS[0].id;S.mode='cloze';S.scope='short';S.onlyDue=false;S.roundLimit=10;S.view='session';buildQueue();render();
})();
