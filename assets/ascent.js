/* Isolated preview adapter. Uses the current trainer and its real keyboard. */
(function(){
 if(typeof S==='undefined'||typeof buildQueue!=='function')return;
 const scenes={"small":"<svg class=\"mobile-landscape\" viewBox=\"0 0 380 180\" role=\"img\" aria-label=\"Bergpanorama mit Aufstieg zum Gipfel\"><defs><linearGradient id=\"mobileSky\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"180\"><stop stop-color=\"#deeee8\"/><stop offset=\"1\" stop-color=\"#f1edda\"/></linearGradient></defs><path fill=\"url(#mobileSky)\" d=\"M-400 -400H780V180H-400Z\"/><circle cx=\"285\" cy=\"42\" r=\"20\" fill=\"#efd594\"/><path d=\"M0 112L52 55L102 110L156 40L220 107L268 63L380 114V180H0Z\" fill=\"#b1cabe\"/><path d=\"M0 146L87 92L149 132L233 68L311 130L380 89V180H0Z\" fill=\"#88aa99\"/><path d=\"M79 180L332 31L380 105V180Z\" fill=\"#537e6c\"/><path d=\"M332 31L319 108L355 150L380 170V105Z\" fill=\"#365e50\"/><path d=\"M292 55L332 31L355 66L335 58L329 66L320 51L311 60Z\" fill=\"#f7f4e5\"/><path d=\"M0 163Q83 143 145 168T380 153V180H0Z\" fill=\"#365e4c\"/><path d=\"M-400 176H780V560H-400Z\" fill=\"#365e4c\"/><path id=\"mobileRoute\" d=\"M28 157C35 156.9 56.3 156.5 70 156.5C83.7 156.5 97.3 157 110 157C122.7 157 134.4 157 146.1 156.5C157.8 153.1 169.4 142.8 180 136.5C190.7 130.2 200 124.7 210 118.8C220 112.9 230 107.1 240 101.2C250 95.3 260 89.4 270 83.5C280 77.6 291.3 70.9 300 65.8C308.7 60.7 318.3 55.1 322 52.9\" fill=\"none\" stroke=\"#e7edda\" stroke-width=\"2.5\" stroke-dasharray=\"2 6\" stroke-linecap=\"round\"/><path id=\"mobileTrail\" d=\"M28 157C35 156.9 56.3 156.5 70 156.5C83.7 156.5 97.3 157 110 157C122.7 157 134.4 157 146.1 156.5C157.8 153.1 169.4 142.8 180 136.5C190.7 130.2 200 124.7 210 118.8C220 112.9 230 107.1 240 101.2C250 95.3 260 89.4 270 83.5C280 77.6 291.3 70.9 300 65.8C308.7 60.7 318.3 55.1 322 52.9\" fill=\"none\" stroke=\"#f6d28a\" stroke-width=\"3\" stroke-linecap=\"round\"/><g color=\"#faf2d9\"><g transform=\"translate(159.1 129.4) scale(.52)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g><g transform=\"translate(242.1 79.8) scale(.52)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g></g><path d=\"M332 33V13\" stroke=\"#315446\" stroke-width=\"2\"/><path class=\"fahne\" d=\"M333 14Q343 10 351 14L348 23Q341 19 333 24Z\" fill=\"#db9b65\"/><circle class=\"gipfelglanz\" cx=\"332\" cy=\"31\" r=\"9\" fill=\"#ffe9b8\" opacity=\"0\"/><circle class=\"gipfelring\" cx=\"332\" cy=\"31\" r=\"9\" fill=\"none\" stroke=\"#f6d28a\" stroke-width=\"2\" opacity=\"0\"/><g id=\"mobileHiker\" transform=\"translate(93 416)\"><ellipse cy=\"2\" rx=\"11\" ry=\"3\" fill=\"#173f34\" opacity=\".25\"/><g class=\"hiker-body\"><path class=\"leg\" d=\"M0-12L-5-5L-6 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><path class=\"leg other\" d=\"M0-12L5-7L7 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"-9\" y=\"-27\" width=\"9\" height=\"14\" rx=\"3\" fill=\"#426d66\"/><path d=\"M0-26L0-13\" stroke=\"#eead66\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M2-24L9-18L14-22\" fill=\"none\" stroke=\"#eead66\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M14-24L11 1\" stroke=\"#dedaca\" stroke-width=\"2\"/><circle cy=\"-33\" r=\"5\" fill=\"#efc6a0\"/><path d=\"M-6-34Q-5-43 3-39L6-33Z\" fill=\"#d76f4c\"/><path d=\"M-6-33H8\" stroke=\"#d76f4c\" stroke-width=\"2\"/></g><g class=\"spark\" fill=\"#ffe2a0\"><path d=\"M-17-44l2-5 2 5 5 2-5 2-2 5-2-5-5-2Z\"/><circle cx=\"18\" cy=\"-48\" r=\"3\"/><circle cx=\"-13\" cy=\"-58\" r=\"2\"/></g></g>\n<g fill=\"#274c3e\"><path d=\"M8 169l7-21 7 21h-5v11h-4v-11ZM355 164l8-25 8 25h-6v16h-4v-16Z\"/></g></svg>"};
 const PRO_ETAPPE=10;
 /* Vorangehen tut nur, wer das Wort kann. Ein Fehler wirft nicht
    zurueck - er bringt nur nichts ein. Zurueckwerfen bestraefe genau
    die Kinder, die es am noetigsten haben; jede Antwort zaehlen zu
    lassen machte die Anzeige zur Luege, weil dann auch der Gipfel
    erreicht, wer zehnmal danebentippt. Wer ein Wort verfehlt,
    bekommt es in der Fehlerwiederholung noch einmal. */
 let streak=0,position=0,raf=0,queue=null,credited=new Set(),lastTarget=-1,gekonnt=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const panel=document.createElement('section');panel.className='ascent-panel';panel.setAttribute('aria-label','Dein Aufstieg');
 /* Der Grat: dieselbe Idee als schmales Band - ein Weg, ein Punkt, der
    ihm folgt, oben die Fahne. Das Nachtdesign zeigt ihn statt des
    Bergbilds und gibt der Karte den Platz, den das Bild belegt haette.
    Ohne das Nachtdesign bleibt er verborgen. */
 const grat='<svg class="ascent-grat" viewBox="0 0 360 64" aria-hidden="true">'
  +'<path d="M8 58C48 56 70 46 100 42S152 32 182 29S246 19 276 16S330 13 344 12V64H8Z" class="grat-hang"/>'
  +'<path id="gratRoute" d="M8 58C48 56 70 46 100 42S152 32 182 29S246 19 276 16S330 13 344 12" class="grat-weg"/>'
  +'<path id="gratTrail" d="M8 58C48 56 70 46 100 42S152 32 182 29S246 19 276 16S330 13 344 12" class="grat-spur"/>'
  +'<path d="M344 12V1" class="grat-mast"/><path d="M345 1L359 4.5L345 8Z" class="grat-fahne"/>'
  +'<g id="gratDot" transform="translate(8 58)"><circle r="10" class="grat-hof"/><circle r="6" class="grat-punkt"/></g></svg>';
 panel.innerHTML='<div class="ascent-label"><b class="ascent-streak">0 in Folge</b></div>'+scenes.small+grat+'<div class="ascent-footer"><span class="ascent-count"></span><strong class="ascent-percent"></strong></div>';
 const oldBuild=buildQueue;buildQueue=function(){streak=0;position=0;lastTarget=-1;gekonnt=0;credited=new Set();oldBuild();queue=S.queue;};
 /* Die Figur und der zurueckgelegte Weg an die Stelle "position"
    setzen - fuer beide Zeichnungen, die grosse und die flache. */
 function versetzen(){
  const pfad=panel.querySelector('#mobileRoute');
  if(!pfad||typeof pfad.getTotalLength!=='function')return;
  const laenge=pfad.getTotalLength(),punkt=pfad.getPointAtLength(position*laenge);
  panel.querySelector('#mobileHiker').setAttribute('transform',
   `translate(${punkt.x} ${punkt.y}) scale(.72)`);
  const linie=panel.querySelector('#mobileTrail');
  linie.style.strokeDasharray=laenge;
  linie.style.strokeDashoffset=laenge*(1-position);
  const kamm=panel.querySelector('#gratRoute');
  if(kamm){
   const l=kamm.getTotalLength(),p=kamm.getPointAtLength(position*l);
   panel.querySelector('#gratDot').setAttribute('transform',`translate(${p.x} ${p.y})`);
   const spur=panel.querySelector('#gratTrail');
   spur.style.strokeDasharray=l;
   spur.style.strokeDashoffset=l*(1-position);
  }
 }
 function animate(target){
  cancelAnimationFrame(raf);
  const start=performance.now(),from=position;
  panel.classList.add('ascent-walking');
  function tick(now){
   const t=reduced.matches?1:Math.min(1,(now-start)/950);
   position=from+(target-from)*t*t*(3-2*t);
   versetzen();
   if(t<1)raf=requestAnimationFrame(tick);
   else panel.classList.remove('ascent-walking');
  }
  raf=requestAnimationFrame(tick);
 }
 /* Wie hoch darf der Berg sein?

    Vorher wurde der Abstand zwischen Karte und Tastenfeld gemessen und
    zur bisherigen Hoehe addiert. Nur: Die Hoehe zu aendern verschiebt
    die Karte und damit genau den Abstand, den man gerade gemessen hat.
    Die Folge war eine Rueckkopplung, die erst nach sechs Durchlaeufen
    zur Ruhe kam - gemessen 175, 208, 224, 232, 236, 237 Punkte. Beim
    ersten Zeichnen blieben so 53 Punkte ungenutzt.

    Jetzt wird von der Oberkante des Bergs bis zum Tastenfeld gerechnet
    und die Karte abgezogen. Keine dieser drei Groessen haengt an der
    Hoehe des Bergs, also stimmt sie im ersten Durchlauf.

    Die Karte darf dafuer nicht mehr selbst wachsen - das besorgt eine
    Regel im Blatt (.ascent-active .vcard{min-height:0!important}).
    Ohne sie fuellen Karte und Berg denselben Platz und schieben sich
    gegenseitig. */
 const LUFT=14;
 function fitMobile(){
  const art=panel.querySelector('.mobile-landscape');
  if(!art||!panel.isConnected)return;
  art.style.removeProperty('--ascent-height');
  const stage=document.querySelector('.stage');
  if(stage)stage.style.removeProperty('--ascent-karte');
  if(!matchMedia('(max-width:620px)').matches)return;
  const tasten=document.querySelector('.eb-tasten');
  if(!tasten||!stage)return;
  /* Was der Rahmen ausser der Zeichnung noch traegt: Fusszeile und
     Raender. Bleibt gleich, egal wie hoch die Zeichnung ist. */
  /* Fusszeile, Raender und die Abstaende des Rahmens - alles, was der
     Rahmen ausser der Zeichnung noch belegt. */
  const stil=getComputedStyle(panel);
  const rahmen=panel.getBoundingClientRect().height-art.getBoundingClientRect().height
              +(parseFloat(stil.marginTop)||0)+(parseFloat(stil.marginBottom)||0);
  const platz=tasten.getBoundingClientRect().top
             -panel.getBoundingClientRect().top
             -stage.getBoundingClientRect().height-rahmen-LUFT;
  /* Zeigt das Blatt den schmalen Grat statt des Bilds, bekommt die
     Karte den freien Platz. Gemessen wurde oben ohne ihre Mindesthoehe,
     also stimmt auch das im ersten Durchlauf. */
  const kamm=panel.querySelector('.ascent-grat'),karte=stage.querySelector('.vcard');
  if(kamm&&karte&&getComputedStyle(kamm).display!=='none'){
   stage.style.setProperty('--ascent-karte',Math.max(0,Math.round(karte.getBoundingClientRect().height+platz))+'px');
   return;
  }
  art.style.setProperty('--ascent-height',Math.max(44,Math.min(240,Math.round(platz)))+'px');
 }
 function update(){
  if(!document?.body)return;
  const active=['type','cloze'].includes(S.mode)&&(S.view==='session');
  const entering=active&&!document.body.classList.contains('ascent-active');
  document.body.classList.toggle('ascent-active',active);
  if(!active){panel.remove();return;}
  const stage=document.querySelector('.stage'),done=document.querySelector('.done');if(!stage&&!done)return;
  if(queue!==S.queue){queue=S.queue;credited=new Set();streak=0;position=0;lastTarget=-1;gekonnt=0;}
  const n=S.initialCount||S.queue.length;const completed=Math.min(n,gekonnt);
  /* Etappen: Bei 825 Woertern lag der Gipfel 825 Antworten entfernt, die
     Figur ruckte 0,43 Punkte pro Wort - unsichtbar. Zehn Woerter sind
     eine Etappe, der Gipfel also immer hoechstens zehn Antworten weit.
     Bei kurzen Runden gibt es genau eine Etappe; dort aendert sich
     nichts. */
  const etappen=Math.max(1,Math.ceil(n/PRO_ETAPPE));
  const etappe=Math.min(etappen,Math.max(1,Math.ceil(completed/PRO_ETAPPE)));
  const bisher=(etappe-1)*PRO_ETAPPE;
  const laenge=Math.min(PRO_ETAPPE,n-bisher);
  const inEtappe=Math.min(laenge,completed-bisher);
  const pct=laenge?inEtappe/laenge:0;
  const gipfel=laenge>0&&inEtappe>=laenge;
  panel.classList.toggle('ascent-gipfel',gipfel);
  panel.classList.toggle('ascent-summit',S.i>=S.queue.length);
  panel.querySelector('.ascent-count').textContent=(gipfel?'Gipfel geschafft! · ':'')+(etappen>1?'Etappe '+etappe+' von '+etappen+' · ':'')+inEtappe+' von '+laenge+' geschafft'+(S.i>=n&&S.i<S.queue.length?' · Wiederholung':'');
  panel.querySelector('.ascent-percent').textContent=Math.round(pct*100)+' %';panel.setAttribute('aria-label','Dein Aufstieg: Etappe '+etappe+' von '+etappen+', '+inEtappe+' von '+laenge+' Wörtern');panel.querySelector('.ascent-streak').textContent=streak+' in Folge';
  const bar=document.querySelector('.round-progress');if(bar){bar.querySelectorAll('span,progress').forEach(el=>el.hidden=true);}
  if(panel.nextElementSibling!==(stage||done))(stage||done).before(panel);
  if(matchMedia('(max-width:620px)').matches&&stage){
   const heading=stage.querySelector('.eyebrow');
   if(S.mode==='type'){
    const dir=document.getElementById('dirBtn');
    if(dir&&heading){dir.classList.add('ascent-direction');heading.insertBefore(dir,heading.lastElementChild);}
   }else if(S.mode==='cloze'&&heading&&!heading.querySelector('.ascent-direction-label')){
    const label=document.createElement('span');label.className='ascent-direction-label';label.textContent='DE → EN';
    heading.insertBefore(label,heading.lastElementChild);
   }
  }
  fitMobile();
  /* Eine neue Etappe faengt unten an. Dorthin wird nicht gelaufen -
     ein Rueckwaertsgang saehe aus wie ein Rueckschlag. */
  if(pct<position-0.01){cancelAnimationFrame(raf);position=pct;versetzen();}
  if(pct!==lastTarget){lastTarget=pct;animate(pct);}
  if(entering&&window.scrollY)window.scrollTo(0,0);
 }
 const oldSubmit=submitTyped;
 submitTyped=function(){
  const i=S.i;
  oldSubmit();
  if(!S.answered||credited.has(i))return;
  credited.add(i);
  const richtig=S.answered==='ok';
  if(richtig)gekonnt++;
  streak=richtig?streak+1:0;
  panel.querySelector('.ascent-streak').textContent=streak+' in Folge';
  panel.classList.remove('ascent-celebrate','ascent-rutsch');
  void panel.offsetWidth;
  /* Bei einem Fehler bleibt die Figur stehen und faengt sich kurz -
     das liest sich als "fast", nicht als "nein". */
  panel.classList.add(richtig?'ascent-celebrate':'ascent-rutsch');
  /* oldSubmit() hat schon gezeichnet, da stand der Zaehler noch auf
     dem alten Stand. Also noch einmal, jetzt mit dem neuen. */
  update();
 };
 const oldRender=render;render=function(){oldRender();update();};
 const observer=new MutationObserver(()=>{if(!panel.isConnected||panel.nextElementSibling!==document.querySelector('.stage,.done')||(S.mode==='type'&&matchMedia('(max-width:620px)').matches&&document.querySelector('.round-progress #dirBtn')))update();});
 observer.observe(view,{childList:true});
 addEventListener('resize',update);
 window.visualViewport?.addEventListener('resize',update);
 update();
})();
