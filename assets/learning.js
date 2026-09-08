/* Shared upgrade for all four trainers. Existing progress keys and records stay intact. */
(function () {
  'use strict';
  const upper = typeof YEARS === 'undefined';
  const originalHome = renderHome;
  const originalSession = renderSession;
  const originalHelp = renderHelp;
  const topicFor = new Map();
  for (const t of TOPICS) for (const v of (SETS[t.id] || [])) topicFor.set(v, t.id);
  const allWords = () => TOPICS.flatMap(t => SETS[t.id] || []);
  const record = v => upper ? rec(topicFor.get(v), S.dir, v.id) : rec(S.dir, v.id);
  const safe = value => esc(String(value == null ? '' : value));
  const home = () => { S.view = 'home'; S.options = null; render(); };
  S.dir = 'de2en';
  S.roundSource = null;
  S.roundLimit = Infinity;
  S.scope = 'all';
  S.typedValue = '';
  S.retried = new Set();
  S.missed = new Set();

  const sessionKey=KEY+':session:v1';
  const wordKey=v=>topicFor.get(v)+'|'+v.id;
  const wordMap=new Map(allWords().map(v=>[wordKey(v),v]));
  function checkpoint(){
    try{if(S.view!=='session'||!S.queue.length||S.i>=S.queue.length)return;
      localStorage.setItem(sessionKey,JSON.stringify({source:S.roundSource,dir:S.dir,mode:S.mode,scope:S.scope,i:S.i,seen:S.seen,initial:S.initialCount,queue:S.queue.map(wordKey),retried:[...S.retried].map(wordKey),missed:[...S.missed].map(wordKey),answered:[...S.roundAnswered].map(wordKey)}));
    }catch(e){}
  }
  function stored(){try{const x=JSON.parse(localStorage.getItem(sessionKey));return x&&Array.isArray(x.queue)&&x.queue.length&&x.queue.every(k=>wordMap.has(k))&&Number.isInteger(x.i)&&x.i>=0&&x.i<x.queue.length&&['all','short','due'].includes(x.scope)&&['en2de','de2en'].includes(x.dir)?x:null;}catch(e){return null;}}
  function resume(){const x=stored();if(!x)return;S.roundSource=x.source;S.topicId=x.source;S.dir=x.dir;S.mode=x.mode;S.scope=x.scope;S.onlyDue=x.scope==='due';S.roundLimit=x.scope==='short'?10:Infinity;S.queue=x.queue.map(k=>wordMap.get(k));S.i=x.i;S.seen=x.seen;S.initialCount=x.initial;for(const [field,key] of [['retried','retried'],['missed','missed'],['roundAnswered','answered']])S[field]=new Set((x[key]||[]).map(k=>wordMap.get(k)).filter(Boolean));S.answered=null;S.revealed=false;S.options=null;S.typedValue='';S.view='session';render();}
  function setup(topicId){
    S.roundSource=topicId;S.topicId=topicId;
    const words=upper?(SETS[topicId]||[]):setOf(topicId),due=words.filter(v=>isDue(record(v))).length;
    view.innerHTML='<h2>Lernumfang wählen</h2><p>'+safe(TOPICS.find(t=>t.id===topicId)?.name||'Deine Auswahl')+'</p><div class="scope-options"><button class="topic primary" data-scope="all">Alles üben · '+words.length+' Vokabeln</button><button class="topic" data-scope="short">Kurze Runde · bis zu 10 Vokabeln</button><button class="topic" data-scope="due">Nur fällige Vokabeln · '+due+'</button></div><button id="setupBack">Zur Übersicht</button>';
    document.getElementById('setupBack').onclick=home;
    view.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{S.scope=b.dataset.scope;S.onlyDue=S.scope==='due';S.roundLimit=S.scope==='short'?10:Infinity;S.view='session';buildQueue();render();});
  }
  window.addEventListener('pagehide',checkpoint);
  const originalList=renderList;
  const csvSelected=new Set();
  const csvRows=()=>TOPICS.flatMap(t=>(SETS[t.id]||[]).map((v,i)=>({key:t.id+':'+i,unit:(t.unitName?t.unitName+' · ':'')+t.name,en:v.en,de:v.de})));
  function csvDownload(selected){
    const rows=csvRows().filter(r=>!selected||csvSelected.has(r.key));
    const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const csv='\ufeff'+[['Unit','Englisch','Deutsch'],...rows.map(r=>[r.unit,r.en,r.de])].map(row=>row.map(quote).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=selected?'vokabeln-auswahl.csv':'vokabeln-alle.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  renderList=function(){
    originalList();
    const box=document.getElementById('vlist');if(!box)return;
    const controls=document.createElement('section');controls.className='csv-controls';controls.hidden=true;
    controls.innerHTML='<h2>CSV exportieren</h2><p>Drei Spalten: Unit, Englisch, Deutsch. Alle Vokabeln umfasst diesen Jahrgang, unabhängig vom Suchfilter.</p><div class="controls"><button id="csvAll">Alle Vokabeln exportieren</button><button id="csvSelected">Auswahl exportieren</button><button id="csvVisible">Sichtbare Treffer auswählen</button><button id="csvClear">Auswahl aufheben</button></div><p id="csvCount" role="status"></p>';
    box.before(controls);
    const update=()=>{document.getElementById('csvCount').textContent=csvSelected.size+' Vokabeln ausgewählt';document.getElementById('csvSelected').disabled=!csvSelected.size;};
    box.querySelectorAll('[data-sec]').forEach(sec=>{const id=sec.dataset.sec;sec.querySelectorAll('.vrow').forEach((row,i)=>{const k=id+':'+i;const label=document.createElement('label');label.className='csv-check';label.hidden=true;const input=document.createElement('input');input.type='checkbox';input.checked=csvSelected.has(k);input.setAttribute('aria-label',(SETS[id]?.[i]?.en||'Vokabel')+' für CSV auswählen');input.dataset.csvKey=k;input.onchange=()=>{input.checked?csvSelected.add(k):csvSelected.delete(k);update();};label.append(input,document.createTextNode(' Für CSV auswählen'));row.append(label);});});
    document.getElementById('lcsv').onclick=()=>{controls.hidden=!controls.hidden;box.querySelectorAll('.csv-check').forEach(el=>el.hidden=controls.hidden);};
    document.getElementById('csvAll').onclick=()=>csvDownload(false);
    document.getElementById('csvSelected').onclick=()=>csvDownload(true);
    document.getElementById('csvVisible').onclick=()=>{box.querySelectorAll('details').forEach(sec=>{if(sec.hidden||sec.style.display==='none')return;sec.querySelectorAll('.vrow:not(.off) input[data-csv-key]').forEach(input=>{input.checked=true;csvSelected.add(input.dataset.csvKey);});sec.open=true;});update();};
    document.getElementById('csvClear').onclick=()=>{csvSelected.clear();box.querySelectorAll('[data-csv-key]').forEach(input=>input.checked=false);update();};update();
  };
  // Split alternatives BEFORE removing punctuation. Keep both optional-word forms.
  function forms(target) {
    const parts = String(target).split(/\s*(?:[,;]|\s\/\s|\/)\s*/).filter(Boolean);
    const result = [];
    for (const part of parts) {
      const variants = [part.replace(/[()]/g, ''), part.replace(/\([^)]*\)/g, '')];
      for (const variant of variants) {
        const value = normalise(variant.replace(/\b(?:sb|sth)\./gi, '').replace(/^(?:AE|BE):\s*/i, ''));
        if (value) result.push(value);
      }
    }
    return [...new Set(result)];
  }
  checkTyped = function(input, target) {
    const a = normalise(String(input));
    if (!a) return 'no';
    const choices = forms(target);
    if (choices.includes(a)) return 'ok';
    return choices.some(b => distance(a, b) <= (b.length > 6 ? 2 : b.length > 2 ? 1 : 0)) ? 'near' : 'no';
  };

  // Levenshtein alignment marks substitutions, insertions and deletions on both sides.
  function comparison(input, target) {
    const a = Array.from(normalise(input));
    const candidates = forms(target);
    const b = Array.from(candidates.sort((x,y) => distance(a.join(''),x)-distance(a.join(''),y))[0] || target);
    const d = Array.from({length:a.length+1}, (_,i) => [i]);
    for(let j=0;j<=b.length;j++) d[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++)
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    let i=a.length,j=b.length, left=[],right=[];
    const mark = x => '<mark>'+safe(x)+'</mark>';
    while(i||j){
      if(i&&j&&a[i-1]===b[j-1]){left.unshift(safe(a[--i]));right.unshift(safe(b[--j]));}
      else if(i&&j&&d[i][j]===d[i-1][j-1]+1){left.unshift(mark(a[--i]));right.unshift(mark(b[--j]));}
      else if(i&&d[i][j]===d[i-1][j]+1){left.unshift(mark(a[--i]));}
      else{right.unshift(mark(b[--j]));}
    }
    return '<div class="correction"><div><small>Deine Schreibweise</small><strong>'+left.join('')+'</strong></div><div><small>Passende Lösung</small><strong>'+right.join('')+'</strong></div></div>';
  }
  function feedback() {
    const input = document.getElementById('typeIn');
    if(input) input.value = S.typedValue || '';
    const el = document.getElementById('verdict');
    if(!el || !S.answered) return;
    const solution = S.mode==='cloze' ? clozeParts(current()).word : ansSide(current());
    el.className='verdict '+S.answered;
    el.setAttribute('role','status');
    el.innerHTML = (S.answered==='ok' ? 'Richtig.' : S.answered==='near' ? 'Fast – schau dir die markierten Buchstaben an.' : (S.retried.has(current()) ? 'Noch nicht. Dieses Wort bleibt zum Weiterüben fällig.' : 'Noch nicht. Dieses Wort kommt in der Runde noch einmal.'))
      + (S.answered==='ok' ? '' : comparison(S.typedValue,solution))
      + (S.answered==='ok' ? '' : '<p>Vollständiger Eintrag: '+safe(solution)+'</p>');
  }
  submitTyped = function() {
    const input = document.getElementById('typeIn');
    if(!input || S.answered || !input.value.trim()) return;
    S.typedValue=input.value;
    const target=S.mode==='cloze'?clozeParts(current()).word:ansSide(current());
    S.answered=checkTyped(S.typedValue,target);

    render();
    window.LearningFeedback?.signal(S.answered);
  };

  buildQueue = function() {
    const source = S.roundSource || S.topicId;
    let words = source==='today' ? allWords() : upper ? (SETS[source] || []) : setOf(source);
    if(S.mode==='cloze') words=words.filter(hasCloze);
    const due=words.filter(v=>isDue(record(v)));
    const pool=S.onlyDue?due:words;
    // Reviewed due cards before unseen cards; new words fill the remaining places.
    const reviewed=shuffle(pool.filter(v=>record(v).due!==0));
    const unseen=shuffle(pool.filter(v=>record(v).due===0));
    S.queue=[...reviewed,...unseen].slice(0,S.roundLimit);
    S.initialCount=S.queue.length; S.i=0; S.seen=0; S.revealed=false;
    S.answered=null; S.options=null; S.typedValue=''; S.mixedDue=false;
    S.retried=new Set(); S.missed=new Set(); S.roundAnswered=new Set();
  };
  startSession = function(topicId) {
    setup(topicId);
  };
  renderHome = function() {
    if(upper){
      originalHome();
      const oldDue=document.getElementById('dueBtn');if(oldDue)oldDue.remove();



    }else{
      S.yearId=YEARS[0].id;
      renderYear();
      const bar=view.querySelector('.sessionbar'); if(bar)bar.remove();
      view.insertAdjacentHTML('afterbegin','<h2 class="section-title">Deine Units</h2>');
      if(KEY==='vt6:progress')view.insertAdjacentHTML('beforeend','<a class="topic grammar-tile" href="grammar/"><span class="t-name">Grammar</span><br><span class="t-count">Hier kannst du Grammatik üben.</span></a>');
      view.insertAdjacentHTML('beforeend','<div class="quicklinks"><button id="allBtn">Vokabeln nachschlagen</button><button id="helpBtn">So funktioniert’s</button></div>');
      document.getElementById('allBtn').onclick=()=>{S.view='list';render();};
      document.getElementById('helpBtn').onclick=()=>{S.view='help';render();};
    }
    view.insertAdjacentHTML('afterbegin','<div class="sessionbar"><button class="switch" id="homeDirection">'+dirLabel()+'</button></div>');
    if(stored()){const savedRound=stored();const name=TOPICS.find(t=>t.id===savedRound.source)?.name||savedRound.source;view.insertAdjacentHTML('afterbegin','<button class="topic" id="resumeRound">Runde fortsetzen · '+safe(name)+'<br><span class="t-count">'+savedRound.i+' von '+savedRound.queue.length+' Schritten · '+(savedRound.dir==='de2en'?'DE → EN':'EN → DE')+'</span></button>');document.getElementById('resumeRound').onclick=resume;}
    document.getElementById('homeDirection').onclick=()=>{S.dir=S.dir==='en2de'?'de2en':'en2de';render();};
  };
  // All overview/back actions share the direct Unit dashboard.
  if(!upper) renderYear = (function(original){return function(){
    if(S.view==='year'){S.view='home';return renderHome();}
    return original();
  };})(renderYear);

  rate = function(quality) {
    const v=current(); if(!v || !(S.revealed || S.answered)) return;
    // An objectively wrong typed/choice answer cannot advance a card as "known".
    if(S.mode==='mc' && S.answered!==v.id) quality=0;
    if((S.mode==='type'||S.mode==='cloze') && S.answered==='no') quality=0;
    if((S.mode==='type'||S.mode==='cloze') && S.answered==='near') quality=Math.min(quality,1);
    const r=record(v);
    if(quality===0)r.box=1;
    else if(quality===1)r.box=Math.max(1,r.box-1);
    // One promotion per word per round, including its retry.
    else if(!S.roundAnswered.has(v))r.box=Math.min(5,r.box+1);
    r.due=Date.now()+INTERVALS[r.box]*DAY;
    S.roundAnswered.add(v);
    if(quality<2){
      S.missed.add(v);
      if(!S.retried.has(v)){
        S.retried.add(v);
        S.queue.push(v);
      }
    }
    if(S.mode==='card')window.LearningFeedback?.signal(quality===2?'ok':quality===1?'near':'no');
    save(); S.seen++;S.i++;S.revealed=false;S.answered=null;S.options=null;S.typedValue='';
    render();
  };
  renderSession = function() {
    if(!S.queue.length){
      view.innerHTML='<div class="done"><h2>Keine passenden Wörter fällig</h2><p>'+(S.mode==='cloze'?'Für diese Auswahl sind gerade keine passenden Lückensätze fällig.':'Du hast die fälligen Wörter dieser Auswahl bereits wiederholt.')+'</p><div class="controls"><button id="practiceAll">Freiwillig üben</button><button id="emptyHome">Zur Übersicht</button></div></div>';
      document.getElementById('emptyHome').onclick=home;
      document.getElementById('practiceAll').onclick=()=>{S.onlyDue=false;if(S.mode==='cloze')S.mode='card';buildQueue();render();};return;
    }
    if(S.i>=S.queue.length){renderDone();return;}
    if(upper) S.topicId=topicFor.get(current());
    else if(S.roundSource==='today') S.topicId=YEARS[0].id+'-all';
    checkpoint();
    if(typeof Sfx!=='undefined'){Sfx.play=kind=>window.LearningFeedback?.signal(kind);}
    originalSession();
    document.getElementById('sfxBtn')?.remove();
    const back=document.getElementById('back');if(back)back.onclick=()=>{checkpoint();home();};
    if(back){back.textContent='Später fortsetzen';}
    const rail=view.querySelector('.rail');
    if(rail){
      const details=document.createElement('details');details.className='box-details';
      const summary=document.createElement('summary');summary.textContent='Deine fünf Lernfächer ansehen';
      rail.replaceWith(details);details.append(summary,rail);
    }
    const stage=view.querySelector('.stage');
    if(stage)stage.insertAdjacentHTML('beforebegin','<div class="round-progress"><span>'+(S.i>=S.initialCount?'Fehlerwiederholung':S.scope==='short'?'Kurze Runde':S.scope==='due'?'Fällige Vokabeln':'Alles üben')+' · '+S.initialCount+' Wörter</span><span>'+(S.i>=S.initialCount?S.i-S.initialCount:S.i)+' von '+(S.i>=S.initialCount?S.queue.length-S.initialCount:S.initialCount)+' erledigt</span><progress max="'+S.queue.length+'" value="'+S.i+'" aria-label="Fortschritt dieser Runde"></progress></div>');
    for(const b of view.querySelectorAll('[data-mode]')) b.onclick=()=>{
      S.mode=b.dataset.mode;buildQueue();render();
    };
    const input=document.getElementById('typeIn');if(input){input.maxLength=200;input.oninput=()=>{S.typedValue=input.value;};}if(input)input.setAttribute('aria-label',S.mode==='cloze'?'Fehlendes englisches Wort':S.dir==='en2de'?'Deutsche Übersetzung':'Englische Übersetzung');
    feedback();
    const incorrect = S.answered && ((S.mode==='mc' && S.answered!==current().id) || ((S.mode==='type'||S.mode==='cloze') && S.answered!=='ok'));
    if(incorrect){
      const controls=view.querySelector('.controls');
      if(controls){
        controls.innerHTML='<button class="primary" id="continueCorrection">Weiter · noch einmal üben</button>';
        document.getElementById('continueCorrection').onclick=()=>rate(S.answered==='near'?1:0);
      }
    }
  };
  renderDone = function() {
    try{localStorage.removeItem(sessionKey);}catch(e){}
    view.innerHTML='<div class="done"><div class="summary-number">'+S.initialCount+'</div><h2>Runde geschafft</h2><p>'+S.initialCount+' Wörter · '+S.seen+' Antworten<br>'+S.missed.size+' Wörter zum Weiterüben</p><div class="controls"><button class="primary" id="nextRound">Lernumfang wählen</button><button id="doneHome">Zur Übersicht</button></div></div>';
    document.getElementById('doneHome').onclick=home;
    document.getElementById('nextRound').onclick=()=>setup(S.roundSource);
    updateFoot();
    window.LearningFeedback?.tone('done');
  };
  renderHelp = function(){
    originalHelp();
    const doc=view.querySelector('.doc');
    if(doc)doc.insertAdjacentHTML('afterbegin','<h2>Dein Lernumfang</h2><p>Wähle einen Part, eine Unit oder ein Thema. Alles üben umfasst alle Wörter deiner Auswahl, auch bereits gelernte. Alternativ wählst du zehn Wörter oder nur fällige Vokabeln. Fehler werden nach dem ersten Durchgang einmal wiederholt. Mit Später fortsetzen speicherst du die Runde auf diesem Gerät. Ein Wechsel der Übungsart startet den gewählten Lernumfang neu.</p><p>Beim Tippen bleiben deine Eingabe und die Lösung sichtbar. Markierte Buchstaben zeigen Abweichungen. Falsche Antworten werden nicht als gewusst gespeichert, auch wenn du „Gewusst“ antippst.</p>');
  };
  render();
})();
