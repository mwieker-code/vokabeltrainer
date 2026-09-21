/* Isolated preview adapter. Uses the current trainer and its real keyboard. */
(function(){
 if(typeof S==='undefined'||typeof buildQueue!=='function')return;
 const scenes={"large":"<svg viewBox=\"0 0 560 470\" role=\"img\" aria-label=\"Alpine Berglandschaft mit einer Figur auf dem Weg zum Gipfel\"><defs><linearGradient id=\"sky\" x2=\"0\" y2=\"1\"><stop stop-color=\"#dceee8\"/><stop offset=\"1\" stop-color=\"#f6efdb\"/></linearGradient><linearGradient id=\"rock\" x2=\".8\" y2=\"1\"><stop stop-color=\"#86a99e\"/><stop offset=\"1\" stop-color=\"#3b6b63\"/></linearGradient><linearGradient id=\"front\" x2=\"0\" y2=\"1\"><stop stop-color=\"#729984\"/><stop offset=\"1\" stop-color=\"#264e44\"/></linearGradient><filter id=\"shadow\"><feDropShadow dx=\"0\" dy=\"3\" stdDeviation=\"3\" flood-opacity=\".2\"/></filter></defs>\n<path fill=\"url(#sky)\" d=\"M0 0H560V470H0Z\"/><circle cx=\"430\" cy=\"137\" r=\"36\" fill=\"#f7d992\" opacity=\".8\"/><circle cx=\"430\" cy=\"137\" r=\"48\" fill=\"#f7d992\" opacity=\".12\"/>\n<g class=\"cloud\" fill=\"#fff\" opacity=\".6\"><path d=\"M35 145q9-14 20-7q8-23 27-15q12 3 14 15q22-5 30 7Z\"/><path d=\"M365 211q8-15 21-9q4-16 18-16q19 0 23 17q17-4 27 8Z\"/></g>\n<path d=\"M0 290L89 186L153 274L210 205L304 325L413 222L560 313V470H0Z\" fill=\"#adc6bc\"/><path d=\"M0 338L130 256L189 291L281 219L392 337L496 247L560 286V470H0Z\" fill=\"#93b3a7\"/>\n<path d=\"M90 431L335 139L505 409Z\" fill=\"url(#rock)\"/><path d=\"M335 139L329 232L372 277L348 319L429 432H505Z\" fill=\"#345e59\" opacity=\".55\"/><path d=\"M283 201L335 139L379 208L351 195L338 211L321 184L309 209Z\" fill=\"#f5f6e9\"/><path d=\"M335 139L338 211L351 195L379 208Z\" fill=\"#d7e6dc\"/>\n<path d=\"M0 404Q99 355 199 394T383 396T560 365V470H0Z\" fill=\"url(#front)\"/><path d=\"M0 446Q153 405 265 448T560 414V470H0Z\" fill=\"#345f4e\"/>\n<path id=\"route\" d=\"M93 416C114 399 160 401 166 376S137 352 179 334S238 326 232 299S208 281 259 257S301 242 288 221S316 186 335 169\" fill=\"none\" stroke=\"#e4ecd7\" stroke-width=\"3\" stroke-dasharray=\"2 8\" stroke-linecap=\"round\" opacity=\".65\"/><path id=\"trail\" d=\"M93 416C114 399 160 401 166 376S137 352 179 334S238 326 232 299S208 281 259 257S301 242 288 221S316 186 335 169\" fill=\"none\" stroke=\"#f4ce82\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n<g fill=\"#e4ad65\" stroke=\"#714f33\" stroke-width=\"1.5\"><path d=\"M61 423L78 393L98 423Z\"/><path d=\"M78 393L114 417L98 423Z\" fill=\"#c48f50\"/><path d=\"M73 423L80 408L86 423Z\" fill=\"#365b49\"/></g>\n<g fill=\"#e8ead8\" stroke=\"#426959\" stroke-width=\"2\"><circle cx=\"232\" cy=\"299\" r=\"5\"/><circle cx=\"288\" cy=\"221\" r=\"5\"/></g><g font-family=\"system-ui\" font-size=\"10\" fill=\"#f1f0df\"><text x=\"71\" y=\"444\">BASECAMP</text></g>\n<g aria-label=\"Zwischenziele\" color=\"#f5eed9\"><g transform=\"translate(241 286) scale(.65)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g><g transform=\"translate(299 209) scale(.65)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g></g><path d=\"M335 140V114\" stroke=\"#335849\" stroke-width=\"2.5\"/><path id=\"flag\" d=\"M336 114Q348 108 360 114L356 127Q347 121 336 128Z\" fill=\"#d59158\"/>\n<g id=\"hiker\" transform=\"translate(93 416)\" filter=\"url(#shadow)\"><ellipse cy=\"2\" rx=\"11\" ry=\"3\" fill=\"#173f34\" opacity=\".25\"/><g class=\"hiker-body\"><path class=\"leg\" d=\"M0-12L-5-5L-6 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><path class=\"leg other\" d=\"M0-12L5-7L7 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"-9\" y=\"-27\" width=\"9\" height=\"14\" rx=\"3\" fill=\"#426d66\"/><path d=\"M0-26L0-13\" stroke=\"#eead66\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M2-24L9-18L14-22\" fill=\"none\" stroke=\"#eead66\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M14-24L11 1\" stroke=\"#dedaca\" stroke-width=\"2\"/><circle cy=\"-33\" r=\"5\" fill=\"#efc6a0\"/><path d=\"M-6-34Q-5-43 3-39L6-33Z\" fill=\"#d76f4c\"/><path d=\"M-6-33H8\" stroke=\"#d76f4c\" stroke-width=\"2\"/></g><g class=\"spark\" fill=\"#ffe2a0\"><path d=\"M-17-44l2-5 2 5 5 2-5 2-2 5-2-5-5-2Z\"/><circle cx=\"18\" cy=\"-48\" r=\"3\"/><circle cx=\"-13\" cy=\"-58\" r=\"2\"/></g></g>\n<g fill=\"#234d40\"><path d=\"M26 405l9-30 10 30h-7v15h-6v-15ZM471 420l12-40 13 40h-10v20h-6v-20ZM498 410l9-30 10 30h-7v15h-6v-15Z\"/></g></svg>","small":"<svg class=\"mobile-landscape\" viewBox=\"0 0 380 180\" role=\"img\" aria-label=\"Bergpanorama mit Aufstieg zum Gipfel\"><defs><linearGradient id=\"mobileSky\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"180\"><stop stop-color=\"#deeee8\"/><stop offset=\"1\" stop-color=\"#f1edda\"/></linearGradient></defs><path fill=\"url(#mobileSky)\" d=\"M-400 -400H780V180H-400Z\"/><circle cx=\"285\" cy=\"42\" r=\"20\" fill=\"#efd594\"/><path d=\"M0 112L52 55L102 110L156 40L220 107L268 63L380 114V180H0Z\" fill=\"#b1cabe\"/><path d=\"M0 146L87 92L149 132L233 68L311 130L380 89V180H0Z\" fill=\"#88aa99\"/><path d=\"M79 180L332 31L380 105V180Z\" fill=\"#537e6c\"/><path d=\"M332 31L319 108L355 150L380 170V105Z\" fill=\"#365e50\"/><path d=\"M292 55L332 31L355 66L335 58L329 66L320 51L311 60Z\" fill=\"#f7f4e5\"/><path d=\"M0 163Q83 143 145 168T380 153V180H0Z\" fill=\"#365e4c\"/><path d=\"M-400 176H780V560H-400Z\" fill=\"#365e4c\"/><path id=\"mobileRoute\" d=\"M28 157C66 156 76 144 103 137S140 139 155 121S190 124 211 105S248 101 272 80S308 76 331 50\" fill=\"none\" stroke=\"#e7edda\" stroke-width=\"2.5\" stroke-dasharray=\"2 6\" stroke-linecap=\"round\"/><path id=\"mobileTrail\" d=\"M28 157C66 156 76 144 103 137S140 139 155 121S190 124 211 105S248 101 272 80S308 76 331 50\" fill=\"none\" stroke=\"#f6d28a\" stroke-width=\"3\" stroke-linecap=\"round\"/><g color=\"#faf2d9\"><g transform=\"translate(152 119) scale(.52)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g><g transform=\"translate(270 82) scale(.52)\"><path d=\"M3 27H37M6 27L20 4L34 27M15 27L20 13L25 27\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g></g><path d=\"M332 33V13\" stroke=\"#315446\" stroke-width=\"2\"/><path d=\"M333 14Q343 10 351 14L348 23Q341 19 333 24Z\" fill=\"#db9b65\"/><g id=\"mobileHiker\" transform=\"translate(93 416)\"><ellipse cy=\"2\" rx=\"11\" ry=\"3\" fill=\"#173f34\" opacity=\".25\"/><g class=\"hiker-body\"><path class=\"leg\" d=\"M0-12L-5-5L-6 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><path class=\"leg other\" d=\"M0-12L5-7L7 0\" fill=\"none\" stroke=\"#263c41\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"-9\" y=\"-27\" width=\"9\" height=\"14\" rx=\"3\" fill=\"#426d66\"/><path d=\"M0-26L0-13\" stroke=\"#eead66\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M2-24L9-18L14-22\" fill=\"none\" stroke=\"#eead66\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M14-24L11 1\" stroke=\"#dedaca\" stroke-width=\"2\"/><circle cy=\"-33\" r=\"5\" fill=\"#efc6a0\"/><path d=\"M-6-34Q-5-43 3-39L6-33Z\" fill=\"#d76f4c\"/><path d=\"M-6-33H8\" stroke=\"#d76f4c\" stroke-width=\"2\"/></g><g class=\"spark\" fill=\"#ffe2a0\"><path d=\"M-17-44l2-5 2 5 5 2-5 2-2 5-2-5-5-2Z\"/><circle cx=\"18\" cy=\"-48\" r=\"3\"/><circle cx=\"-13\" cy=\"-58\" r=\"2\"/></g></g>\n<g fill=\"#274c3e\"><path d=\"M8 169l7-21 7 21h-5v11h-4v-11ZM355 164l8-25 8 25h-6v16h-4v-16Z\"/></g></svg>"};
 const PRO_ETAPPE=10;
 let streak=0,position=0,raf=0,queue=null,credited=new Set(),lastTarget=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const panel=document.createElement('section');panel.className='ascent-panel';panel.setAttribute('aria-label','Dein Aufstieg');
 panel.innerHTML='<div class="ascent-label"><span>DEIN AUFSTIEG</span><b class="ascent-streak">0 in Folge</b></div>'+scenes.large+scenes.small+'<div class="ascent-footer"><span class="ascent-count"></span><strong class="ascent-percent"></strong></div>';
 const oldBuild=buildQueue;buildQueue=function(){streak=0;position=0;lastTarget=-1;credited=new Set();oldBuild();queue=S.queue;};
 /* Die Figur und der zurueckgelegte Weg an die Stelle "position"
    setzen - fuer beide Zeichnungen, die grosse und die flache. */
 function versetzen(){
  for(const [weg,figur,spur] of [['route','hiker','trail'],['mobileRoute','mobileHiker','mobileTrail']]){
   const pfad=panel.querySelector('#'+weg);
   if(!pfad||typeof pfad.getTotalLength!=='function')continue;
   const laenge=pfad.getTotalLength(),punkt=pfad.getPointAtLength(position*laenge);
   panel.querySelector('#'+figur).setAttribute('transform',
    `translate(${punkt.x} ${punkt.y})${figur==='mobileHiker'?' scale(.72)':''}`);
   const linie=panel.querySelector('#'+spur);
   linie.style.strokeDasharray=laenge;
   linie.style.strokeDashoffset=laenge*(1-position);
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
  if(!matchMedia('(max-width:620px)').matches)return;
  const tasten=document.querySelector('.eb-tasten'),stage=document.querySelector('.stage');
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
  art.style.setProperty('--ascent-height',Math.max(44,Math.min(240,Math.round(platz)))+'px');
 }
 function update(){
  if(!document?.body)return;
  const active=['type','cloze'].includes(S.mode)&&(S.view==='session');
  const entering=active&&!document.body.classList.contains('ascent-active');
  document.body.classList.toggle('ascent-active',active);
  if(!active){panel.remove();return;}
  const stage=document.querySelector('.stage'),done=document.querySelector('.done');if(!stage&&!done)return;
  if(queue!==S.queue){queue=S.queue;credited=new Set();streak=0;position=0;lastTarget=-1;}
  const n=S.initialCount||S.queue.length;const completed=Math.min(n,S.i+(S.answered?1:0));
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
  panel.classList.toggle('ascent-summit',S.i>=S.queue.length);
  panel.querySelector('.ascent-count').textContent=(etappen>1?'Etappe '+etappe+' von '+etappen+' · ':'')+inEtappe+' / '+laenge+' Wörter'+(S.i>=n&&S.i<S.queue.length?' · Wiederholung':'');
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
 const oldSubmit=submitTyped;submitTyped=function(){const i=S.i;oldSubmit();if(S.answered&&!credited.has(i)){credited.add(i);streak=S.answered==='ok'?streak+1:0;panel.querySelector('.ascent-streak').textContent=streak+' in Folge';panel.classList.remove('ascent-celebrate');void panel.offsetWidth;if(S.answered==='ok')panel.classList.add('ascent-celebrate');}};
 const oldRender=render;render=function(){oldRender();update();};
 const observer=new MutationObserver(()=>{if(!panel.isConnected||panel.nextElementSibling!==document.querySelector('.stage,.done')||(S.mode==='type'&&matchMedia('(max-width:620px)').matches&&document.querySelector('.round-progress #dirBtn')))update();});
 observer.observe(view,{childList:true});
 addEventListener('resize',update);
 window.visualViewport?.addEventListener('resize',update);
 update();
})();
