/* Year 6 preview: Diktat (listening dictation) and Blitzrunde (60-second time attack).
   Local to this year only. Does not touch the spaced-repetition boxes or saved progress. */
(function(){
  'use strict';
  if(typeof TOPICS === 'undefined' || typeof S === 'undefined') return;

  const wordsFor = topicId => (topicId === 'today'
    ? TOPICS.flatMap(t => SETS[t.id] || [])
    : setOf(topicId)).filter(v => v.en && v.en.trim());

  const topicLabel = topicId => topicId === 'today'
    ? 'Alle Themen'
    : (TOPICS.find(t => t.id === topicId)?.name || 'Deine Auswahl');

  // ---- add the two preview buttons to the "Lernumfang wählen" screen ----
  const baseStartSession = startSession;
  startSession = function(topicId){
    baseStartSession(topicId);
    const box = view.querySelector('.scope-options');
    if(!box) return;
    const words = wordsFor(topicId);
    if(!words.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'preview-modes';
    wrap.innerHTML = '<p class="preview-label">Vorschau &middot; neue &Uuml;bungsarten <span class="badge">Nur Year 6</span></p>'
      + '<button class="topic" data-preview="dictation">Diktat &ndash; H&ouml;rverstehen'
      + '<br><span class="t-count">Wort h&ouml;ren, Schreibweise eintippen</span></button>'
      + '<button class="topic" data-preview="blitz">Blitzrunde &ndash; 60 Sekunden'
      + '<br><span class="t-count">So viele Vokabeln wie m&ouml;glich in einer Minute</span></button>';
    box.after(wrap);
    wrap.querySelector('[data-preview="dictation"]').onclick = () => startDictation(topicId);
    wrap.querySelector('[data-preview="blitz"]').onclick = () => startBlitz(topicId);
  };

  // ---- wire the two new views into the render dispatcher ----
  const baseRender = render;
  render = function(){
    if(S.view === 'pvdictation') return renderDictation();
    if(S.view === 'pvblitz') return renderBlitz();
    return baseRender();
  };

  function exitPreview(){
    stopBlitzTimer();
    S.pv = null; S.view = 'home'; render();
  }

  /* =========================================================================
     DIKTAT
     ========================================================================= */
  function startDictation(topicId){
    const words = wordsFor(topicId);
    S.pv = {
      mode: 'dictation', topicId,
      queue: shuffle(words).slice(0, Math.min(12, words.length)),
      i: 0, answered: null, spoken: false,
      correct: 0, near: 0, wrong: 0
    };
    S.view = 'pvdictation';
    render();
  }

  function renderDictation(){
    const pv = S.pv;
    if(!pv){ S.view = 'home'; return render(); }
    if(pv.i >= pv.queue.length){ renderDictationDone(); return; }
    const v = pv.queue[pv.i];
    const speechOk = Speech.available;
    view.innerHTML = `
      <div class="sessionbar">
        <button class="linkbtn" id="pvBack">&larr; &Uuml;bersicht</button>
        <div class="switches"><span class="switch pv-tag" aria-disabled="true">Vorschau &middot; Diktat</span></div>
      </div>
      <div class="eyebrow"><span>${esc(topicLabel(pv.topicId))}</span><span>${pv.i + 1} / ${pv.queue.length}</span></div>
      <div class="stage"><div class="vcard deal">
        <p class="pv-instruction">H&ouml;re das Wort und schreibe es auf Englisch.</p>
        <button type="button" class="primary pv-play" id="pvPlay" ${speechOk ? '' : 'disabled'}>
          ${speechOk ? 'Wort abspielen' : 'Sprachausgabe nicht verf&uuml;gbar'}</button>
        <p class="clue">Bedeutung: <span>${esc(v.de)}</span>${v.pos ? ' · ' + esc(v.pos) : ''}</p>
        <div class="typebox">
          <input id="pvTypeIn" placeholder="English word" aria-label="Gehörtes englisches Wort"
            autocomplete="off" autocapitalize="off" spellcheck="false" ${pv.answered ? 'disabled' : ''}>
          <div class="verdict" id="pvVerdict"></div>
        </div>
      </div></div>
      <div class="controls">${pv.answered
        ? '<button class="primary" id="pvNext">Weiter</button>'
        : '<button class="primary" id="pvSubmit">Pr&uuml;fen (Enter)</button>'}</div>`;
    document.getElementById('pvBack').onclick = exitPreview;
    document.getElementById('pvPlay').onclick = () => Speech.say(v.en);
    if(speechOk && !pv.spoken){ pv.spoken = true; Speech.say(v.en); }
    const input = document.getElementById('pvTypeIn');
    if(input){
      if(!pv.answered) input.focus();
      input.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); pv.answered ? dictationNext() : dictationSubmit(); } };
    }
    const sub = document.getElementById('pvSubmit'); if(sub) sub.onclick = dictationSubmit;
    const nxt = document.getElementById('pvNext'); if(nxt) nxt.onclick = dictationNext;
    if(pv.answered){
      const el = document.getElementById('pvVerdict');
      el.className = 'verdict ' + pv.answered;
      el.innerHTML = (pv.answered === 'ok' ? 'Richtig.' : pv.answered === 'near' ? 'Fast – Schreibweise prüfen.' : 'Noch nicht.')
        + (pv.answered === 'ok' ? '' : '<span class="sol">' + esc(v.en) + '</span>');
    }
  }

  function dictationSubmit(){
    const pv = S.pv, v = pv.queue[pv.i];
    const input = document.getElementById('pvTypeIn');
    if(!input || !input.value.trim()) return;
    const res = checkTyped(input.value, v.en);
    pv.answered = res;
    if(res === 'ok') pv.correct++; else if(res === 'near') pv.near++; else pv.wrong++;
    window.LearningFeedback?.signal(res);
    render();
  }

  function dictationNext(){
    S.pv.i++; S.pv.answered = null; S.pv.spoken = false; render();
  }

  function renderDictationDone(){
    const pv = S.pv;
    view.innerHTML = `<div class="done"><div class="summary-number">${pv.correct}</div>
      <h2>Diktat geschafft</h2>
      <p>${pv.queue.length} Wörter gehört · ${pv.correct} richtig, ${pv.near} fast richtig, ${pv.wrong} falsch</p>
      <div class="controls"><button class="primary" id="pvAgain">Nochmal</button><button id="pvHome">Zur Übersicht</button></div></div>`;
    document.getElementById('pvAgain').onclick = () => startDictation(pv.topicId);
    document.getElementById('pvHome').onclick = exitPreview;
  }

  /* =========================================================================
     BLITZRUNDE
     ========================================================================= */
  function startBlitz(topicId){
    const pool = wordsFor(topicId);
    S.pv = {
      mode: 'blitz', topicId, pool,
      queue: shuffle(pool), i: 0,
      correct: 0, wrong: 0, missed: [],
      timeLeft: 60, done: false, timer: null
    };
    S.view = 'pvblitz';
    render();
    S.pv.timer = setInterval(() => {
      const pv = S.pv;
      if(!pv || pv.mode !== 'blitz') return;
      pv.timeLeft--;
      const el = document.getElementById('pvTimeLeft');
      if(el) el.textContent = pv.timeLeft + 's';
      if(pv.timeLeft <= 0){ clearInterval(pv.timer); pv.timer = null; pv.done = true; render(); }
    }, 1000);
  }

  function stopBlitzTimer(){
    if(S.pv && S.pv.timer){ clearInterval(S.pv.timer); S.pv.timer = null; }
  }

  function blitzCurrent(){
    const pv = S.pv;
    if(pv.i >= pv.queue.length) pv.queue = pv.queue.concat(shuffle(pv.pool));
    return pv.queue[pv.i];
  }

  function renderBlitz(){
    const pv = S.pv;
    if(!pv){ S.view = 'home'; return render(); }
    if(pv.done){ renderBlitzDone(); return; }
    const v = blitzCurrent();
    view.innerHTML = `
      <div class="sessionbar">
        <button class="linkbtn" id="pvBack">&larr; &Uuml;bersicht</button>
        <div class="switches"><span class="switch pv-tag" aria-disabled="true">Vorschau &middot; Blitzrunde</span></div>
      </div>
      <div class="pv-blitz-bar">
        <span class="pv-blitz-time" id="pvTimeLeft" role="timer" aria-live="off">${pv.timeLeft}s</span>
        <span class="pv-blitz-score" role="status">${pv.correct} richtig</span>
      </div>
      <div class="stage"><div class="vcard deal">
        <h2 class="prompt">${esc(v.de)}</h2>
        <div class="typebox">
          <input id="pvTypeIn" placeholder="English word" aria-label="Englische Übersetzung"
            autocomplete="off" autocapitalize="off" spellcheck="false">
        </div>
      </div></div>`;
    document.getElementById('pvBack').onclick = exitPreview;
    const input = document.getElementById('pvTypeIn');
    if(input){
      input.focus();
      input.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); blitzSubmit(); } };
    }
  }

  function blitzSubmit(){
    const pv = S.pv;
    if(!pv || pv.done) return;
    const input = document.getElementById('pvTypeIn');
    if(!input || !input.value.trim()) return;
    const v = blitzCurrent();
    const res = checkTyped(input.value, v.en);
    if(res === 'ok') pv.correct++; else { pv.wrong++; pv.missed.push(v); }
    window.LearningFeedback?.signal(res);
    pv.i++;
    render();
  }

  function renderBlitzDone(){
    const pv = S.pv;
    const uniqueMissed = [...new Map(pv.missed.map(v => [v.id, v])).values()].slice(0, 12);
    const missedList = uniqueMissed.length
      ? '<ul class="pv-blitz-missed">' + uniqueMissed.map(v => '<li><b>' + esc(v.en) + '</b> – ' + esc(v.de) + '</li>').join('') + '</ul>'
      : '';
    view.innerHTML = `<div class="done"><div class="summary-number">${pv.correct}</div>
      <h2>Blitzrunde vorbei</h2>
      <p>${pv.correct} richtig, ${pv.wrong} falsch in 60 Sekunden</p>
      ${missedList}
      <div class="controls"><button class="primary" id="pvAgain">Nochmal</button><button id="pvHome">Zur Übersicht</button></div></div>`;
    document.getElementById('pvAgain').onclick = () => startBlitz(pv.topicId);
    document.getElementById('pvHome').onclick = exitPreview;
  }
})();
