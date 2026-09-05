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
  S.roundSource = null;
  S.roundLimit = 10;
  S.typedValue = '';
  S.retried = new Set();
  S.missed = new Set();

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
    if(typeof Sfx !== 'undefined') Sfx.play(S.answered==='ok'?'ok':S.answered==='near'?'near':'no');
    render();
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
    S.roundSource=topicId; S.topicId=topicId; S.onlyDue=true;
    S.view='session'; buildQueue(); render();
  };
  function startToday(){S.roundSource='today';S.onlyDue=true;S.view='session';buildQueue();render();}
  if(upper) startDueSession=startToday;

  function dashboard(){
    const words=allWords();
    const due=words.filter(v=>isDue(record(v))).length;
    const known=words.filter(v=>record(v).box>=3).length;
    const year=upper?'Oberstufe':YEARS[0].label;
    return '<section class="dashboard" aria-label="Heute lernen"><h2>'+safe(year)+' · Heute lernen</h2><p>'
      +(due?'Starte mit bis zu 10 Wörtern. Schwierige Wörter wiederholst du am Ende oder nach einigen Karten.':'Alles für heute wiederholt. Du kannst eine freiwillige Übungsrunde starten.')
      +'</p><div class="controls"><button class="primary" id="learnToday">'+(due?'10 Wörter lernen':'Freiwillig üben')+'</button><button class="quiet" id="homeDirection">'+dirLabel()+'</button></div><small>'
      +due+' fällig oder neu · '+known+' von '+words.length+' in Fach 3–5</small></section>';
  }
  renderHome = function() {
    if(upper){
      originalHome();
      view.insertAdjacentHTML('afterbegin','<a class="topic" href="analysis/" style="text-decoration:none"><span class="t-name">Analysis Skills · Stylistic &amp; Rhetorical Devices</span><br><span class="t-count">Learn · Practise · Write — 12 devices and four mini-analyses</span></a>');
      const oldDue=document.getElementById('dueBtn');if(oldDue)oldDue.remove();
      view.insertAdjacentHTML('afterbegin',dashboard());
    }else{
      S.yearId=YEARS[0].id;
      renderYear();
      const bar=view.querySelector('.sessionbar'); if(bar)bar.remove();
      view.insertAdjacentHTML('afterbegin',dashboard()+'<h2 class="section-title">Deine Units</h2>');
      view.insertAdjacentHTML('beforeend','<div class="quicklinks"><button id="allBtn">Vokabeln nachschlagen</button><button id="helpBtn">So funktioniert’s</button></div>');
      document.getElementById('allBtn').onclick=()=>{S.view='list';render();};
      document.getElementById('helpBtn').onclick=()=>{S.view='help';render();};
    }
    document.getElementById('learnToday').onclick=()=>{
      const due=allWords().some(v=>isDue(record(v)));
      S.roundSource='today';S.onlyDue=due;S.view='session';buildQueue();render();
    };
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
        S.queue.splice(Math.min(S.i+4,S.queue.length),0,v);
      }
    }
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
    originalSession();
    const back=document.getElementById('back');if(back)back.onclick=home;
    const rail=view.querySelector('.rail');
    if(rail){
      const details=document.createElement('details');details.className='box-details';
      const summary=document.createElement('summary');summary.textContent='Deine fünf Lernfächer ansehen';
      rail.replaceWith(details);details.append(summary,rail);
    }
    const stage=view.querySelector('.stage');
    if(stage)stage.insertAdjacentHTML('beforebegin','<div class="round-progress"><span>Kurze Runde · '+S.initialCount+' Wörter</span><span>'+S.i+' von '+S.queue.length+' Schritten erledigt</span><progress max="'+S.queue.length+'" value="'+S.i+'" aria-label="Fortschritt dieser Runde"></progress></div>');
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
    view.innerHTML='<div class="done"><div class="summary-number">'+S.initialCount+'</div><h2>Runde geschafft</h2><p>'+S.initialCount+' Wörter · '+S.seen+' Antworten<br>'+S.missed.size+' Wörter zum Weiterüben</p><div class="controls"><button class="primary" id="nextRound">Nächste kurze Runde</button><button id="doneHome">Zur Übersicht</button></div></div>';
    document.getElementById('doneHome').onclick=home;
    document.getElementById('nextRound').onclick=()=>{buildQueue();render();};
    updateFoot();
  };
  renderHelp = function(){
    originalHelp();
    const doc=view.querySelector('.doc');
    if(doc)doc.insertAdjacentHTML('afterbegin','<h2>Die kurze Lernrunde</h2><p>„Heute lernen“ wählt bis zu zehn fällige oder neue Wörter. Bereits gelernte, fällige Wörter kommen zuerst. Du kannst auch eine Unit oder ein Thema auswählen. Unsichere und falsche Wörter erscheinen höchstens einmal zusätzlich in derselben Runde. Ein Wechsel der Übungsart startet eine neue kurze Runde.</p><p>Beim Tippen bleiben deine Eingabe und die Lösung sichtbar. Markierte Buchstaben zeigen Abweichungen. Falsche Antworten werden nicht als gewusst gespeichert, auch wenn du „Gewusst“ antippst.</p>');
  };
  render();
})();
