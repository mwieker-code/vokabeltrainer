/* =========================================================================
   WRITING A DISCUSSION – Year 9
   Lernkarten, Uebungen und Phrase bank nach der Praesentation "Writing a
   discussion". Eigener Speicher (vt:discussion9:v1), damit der Vokabel-
   Lernstand von Year 9 unberuehrt bleibt. Freie Texte bewertet die Seite
   nicht - dafuer braeuchte sie einen Server.
   ========================================================================= */
(function(){
'use strict';
const D=window.DISCUSSION_DATA, app=document.getElementById('app');
const KEY='vt:discussion9:v1', DAY=86400000;
let saved={version:1,results:{}}, persistent=true;
const valid=o=>o&&o.version===1&&o.results&&typeof o.results==='object'&&!Array.isArray(o.results)
  &&Object.values(o.results).every(r=>r&&Number.isFinite(r.attempts)&&Number.isFinite(r.correct)&&Number.isFinite(r.due));
try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw);if(!valid(p))throw Error('ungueltig');saved=p;}}catch(e){persistent=false;}
function status(){
  const s=document.getElementById('storage');
  if(s)s.textContent=persistent?'Your progress is saved in this browser.':'Browser storage is unavailable – your progress is kept only for this visit.';
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(saved));persistent=true;}catch(e){persistent=false;}
  status();
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* Die fuenf Uebungen. "order" zeigt je Runde einen ganzen Text. */
const MODES={
  order:  {name:'Order the four parts',          short:'Order',   perRound:1},
  intro:  {name:'Rule 1 · The introduction',      short:'Rule 1',  perRound:6},
  prel:   {name:'Rule 2 · P – R – E – L',         short:'Rule 2',  perRound:6},
  answer: {name:'Rule 3 · Answer the other side', short:'Rule 3',  perRound:6},
  phrases:{name:'Phrase bank · Which box?',       short:'Phrases', perRound:6}
};
const questions=[];
D.models.forEach(m=>questions.push({id:'order:'+m.id,mode:'order',m}));
D.intros.forEach(x=>questions.push({id:'intro:'+x.id,mode:'intro',x}));
D.prel.forEach(p=>p.sentences.forEach((s,i)=>questions.push({id:'prel:'+p.id+':'+i,mode:'prel',p,i})));
D.answerChoice.forEach(a=>questions.push({id:'answer:'+a.id,mode:'answer',kind:'choice',a}));
D.answerGap.forEach(a=>questions.push({id:'answer:'+a.id,mode:'answer',kind:'gap',a}));
D.phrases.forEach(ph=>questions.push({id:'phrases:'+ph.id,mode:'phrases',ph}));
const stat=mode=>{const qs=questions.filter(q=>q.mode===mode);return qs.filter(q=>saved.results[q.id]?.lastCorrect).length+'/'+qs.length;};

let mode='intro',queue=[],index=0,score=0,retried=new Set(),answered=false,options=[],assign={};
function show(html){app.innerHTML=html;const title=app.querySelector('h1');if(title){title.tabIndex=-1;title.focus();}window.scrollTo?.(0,0);}

function home(){
  show('<h1>Writing a discussion</h1>'
    +'<p class="intro">Learn the four parts, practise the three rules and build your phrase bank – step by step towards your class test.</p>'
    +'<div class="stats">'+Object.keys(MODES).map(k=>'<span>'+MODES[k].short+' · '+stat(k)+'</span>').join('')+'</div>'
    +'<p class="pill">Counts show tasks answered correctly on your latest attempt.</p>'
    +'<div class="grid">'
    +'<section class="panel"><h2>Learn</h2><p>Seven short cards: the operator, the four parts, the three rules, your writing plan and the checklist.</p><button class="primary" id="learn">Start the cards</button></section>'
    +'<section class="panel"><h2>Practise</h2><p>Short rounds with explanations. Every mistake comes back once.</p><div class="actions">'
      +Object.keys(MODES).map(k=>'<button data-start="'+k+'">'+MODES[k].name+'</button>').join('')+'</div></section>'
    +'<section class="panel"><h2>Phrase bank</h2><p>Useful phrases for every part of your text, each with an example.</p><button id="bank">Open the phrase bank</button>'
      +'<p class="muted">You can also train the phrases like vocabulary: Year 9 → Skills – Writing a discussion.</p></section>'
    +'</div>'
    +'<section class="panel"><h2>Writing workshop</h2><p>Write your own discussion step by step: collect, decide, order, write – then check your text with the checklist.'
      +(hasDraft()?' Your draft is saved.':'')+'</p><button class="primary" id="workshop">'+(hasDraft()?'Continue writing':'Start writing')+'</button></section>');
  document.getElementById('learn').onclick=()=>learn(0);
  document.getElementById('workshop').onclick=()=>workshop(draft.step);
  document.getElementById('bank').onclick=bank;
  app.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>start(b.dataset.start));
}

/* ------------------------------------------------------------ Lernkarten */
function learn(i){
  const c=D.cards[i],n=D.cards.length;
  show('<button id="back">← Writing a discussion</button>'
    +'<p class="pill">Card '+(i+1)+' of '+n+'</p><progress class="progress" value="'+(i+1)+'" max="'+n+'" aria-label="Cards"></progress>'
    +'<section class="panel card"><h1>'+esc(c.title)+'</h1><p class="lead">'+esc(c.lead)+'</p>'
    +'<dl class="items">'+c.items.map(([h,t])=>'<div><dt>'+esc(h)+'</dt><dd>'+esc(t)+'</dd></div>').join('')+'</dl></section>'
    +'<div class="actions"><button id="prev"'+(i?'':' disabled')+'>← Previous</button>'
    +'<button id="next" class="primary">'+(i<n-1?'Next card →':'Done – back to the overview')+'</button></div>');
  document.getElementById('back').onclick=home;
  document.getElementById('prev').onclick=()=>learn(i-1);
  document.getElementById('next').onclick=()=>i<n-1?learn(i+1):home();
}

/* ------------------------------------------------------------ Phrase bank */
function bank(){
  show('<button id="back">← Writing a discussion</button><h1>Your phrase bank</h1>'
    +'<p class="intro">One phrase from each box – that is already half the text.</p>'
    +D.boxes.map(b=>'<section class="panel"><h2>'+esc(b.name)+'</h2><ul class="bank">'
      +D.phrases.filter(p=>p.box===b.id).map(p=>'<li><strong lang="en">'+esc(p.en)+'</strong><span class="de">'+esc(p.de)+'</span><span class="ex" lang="en">'+esc(p.example)+'</span></li>').join('')
      +'</ul></section>').join('')
    +'<div class="actions"><button id="practise" class="primary">Practise: which box?</button><button id="home">Writing a discussion</button></div>');
  document.getElementById('back').onclick=home;
  document.getElementById('home').onclick=home;
  document.getElementById('practise').onclick=()=>start('phrases');
}

/* ------------------------------------------------------------ Uebungsrunden */
function start(m){
  mode=m;
  const pool=questions.filter(q=>q.mode===m);
  const due=pool.filter(q=>!saved.results[q.id]||saved.results[q.id].due<=Date.now());
  queue=shuffle(due.length?due:pool).slice(0,MODES[m].perRound);
  index=0;score=0;retried=new Set();
  render();
}
function frame(prompt,body){
  return '<button id="back">← Writing a discussion</button><h1>'+prompt+'</h1>'
    +'<p class="pill">'+MODES[mode].name+' · '+(index+1)+' of '+queue.length+'</p>'
    +'<progress class="progress" value="'+index+'" max="'+queue.length+'" aria-label="Round progress"></progress>'
    +'<section class="panel">'+body+'<div id="feedback" role="status"></div></section>';
}
const optionList=()=>'<div class="options">'+options.map((o,i)=>'<button data-option="'+i+'">'+o.html+'</button>').join('')+'</div>';

function render(){
  answered=false;
  if(index>=queue.length)return done();
  const q=queue[index];
  if(q.mode==='order')return renderOrder(q);
  let prompt='',body='';
  if(q.mode==='intro'){
    prompt='Which introduction opens the question without giving an opinion?';
    options=shuffle(q.x.options).map(o=>({html:esc(o.text),right:o.right,why:o.why}));
    body='<p class="context">Topic: '+esc(q.x.topic)+'</p>'+optionList();
  }
  if(q.mode==='prel'){
    prompt='What does the highlighted sentence do?';
    options=D.roles.map((r,i)=>({html:'<strong>'+r.id+' – '+r.name+'</strong><small>'+esc(r.question)+'</small>',right:i===q.i,
      why:r.id+' – '+r.name+': '+r.question+(r.id==='L'?' A link is not always possible or necessary – but when it is there, it leads back to your opinion.':'')}));
    body='<p class="context">Your opinion: '+esc(q.p.opinion)+'</p><p class="quote" lang="en">'
      +q.p.sentences.map((s,i)=>i===q.i?'<mark>'+esc(s)+'</mark>':esc(s)).join(' ')+'</p>'+optionList();
  }
  if(q.mode==='answer'&&q.kind==='choice'){
    prompt='Which sentence answers the other side better?';
    options=shuffle([{html:esc(q.a.weak),right:false,why:'This only names the other side and then ignores it. It does not answer the argument.'},
                     {html:esc(q.a.strong),right:true,why:'This first accepts the point of the other side and then answers it with a reason.'}]);
    body='<p class="context">The other side says: “'+esc(q.a.claim)+'”</p>'+optionList();
  }
  if(q.mode==='answer'&&q.kind==='gap'){
    prompt='Which words complete the sentence?';
    options=shuffle([q.a.right,...q.a.wrong]).map(t=>({html:esc(t),right:t===q.a.right,why:q.a.why}));
    body='<p class="quote" lang="en">'+esc(q.a.sentence).replace('___','<span class="gap" aria-label="gap">&nbsp;</span>')+'</p>'+optionList();
  }
  if(q.mode==='phrases'){
    prompt='Which box of the phrase bank does this phrase belong to?';
    const box=D.boxes.find(b=>b.id===q.ph.box);
    options=D.boxes.map(b=>({html:esc(b.name),right:b.id===q.ph.box,why:'This phrase belongs to “'+box.name+'”. Example: '+q.ph.example}));
    body='<p class="quote" lang="en">'+esc(q.ph.en)+'</p>'+optionList();
  }
  show(frame(prompt,body));
  document.getElementById('back').onclick=home;
  app.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{
    if(answered)return;
    const o=options[Number(b.dataset.option)];
    app.querySelectorAll('[data-option]').forEach((x,i)=>{x.disabled=true;if(options[i].right)x.classList.add('correct');});
    if(!o.right)b.classList.add('incorrect');
    const right=options.find(x=>x.right);
    grade(o.right,'<p>'+esc(o.why)+'</p>'+(!o.right&&right.why!==o.why?'<p>'+esc(right.why)+'</p>':''));
  });
}

/* Die vier Absaetze eines Mustertextes in die richtige Reihenfolge bringen. */
function renderOrder(q){
  assign={};
  const order=shuffle([0,1,2,3]);
  show(frame('Put the four parts in the right order.',
    '<p class="context">Question: '+esc(q.m.question)+'</p><p class="muted">Choose for every paragraph which part of a discussion it is.</p>'
    +order.map(r=>'<div class="para" data-para="'+r+'"><p lang="en">'+esc(q.m.parts[r])+'</p><div class="slots" role="group" aria-label="Part of the discussion">'
      +D.partNames.map((n,s)=>'<button data-slot="'+s+'" data-para="'+r+'" aria-pressed="false">'+(s+1)+' '+n+'</button>').join('')+'</div></div>').join('')
    +'<div class="actions"><button id="check" class="primary" disabled>Check the order</button></div>'));
  document.getElementById('back').onclick=home;
  app.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
    if(answered)return;
    const r=Number(b.dataset.para);assign[r]=Number(b.dataset.slot);
    app.querySelectorAll('[data-para="'+r+'"][data-slot]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    document.getElementById('check').disabled=Object.keys(assign).length<4;
  });
  document.getElementById('check').onclick=()=>{
    if(answered||Object.keys(assign).length<4)return;
    const right=[0,1,2,3].every(r=>assign[r]===r);
    app.querySelectorAll('.para').forEach(p=>{const r=Number(p.dataset.para);p.classList.add(assign[r]===r?'correct':'incorrect');});
    app.querySelectorAll('[data-slot]').forEach(x=>x.disabled=true);
    document.getElementById('check').disabled=true;
    const wrong=[0,1,2,3].filter(r=>assign[r]!==r);
    grade(right,right?'<p>All four parts are in the right place. Your opinion only appears in the conclusion.</p>'
      :'<p>Look again at these paragraphs:</p><ul>'+wrong.map(r=>'<li><strong>'+(r+1)+' '+D.partNames[r]+':</strong> '+esc(D.partWhy[r])+' <span class="muted">(“'+esc(q.m.parts[r].split(' ').slice(0,6).join(' '))+' …”)</span></li>').join('')+'</ul>');
  };
}

function grade(right,html){
  answered=true;
  const q=queue[index],r=saved.results[q.id]||{attempts:0,correct:0,due:0};
  r.attempts++;if(right){r.correct++;score++;}r.lastCorrect=right;
  r.due=Date.now()+(right?Math.min(7,Math.max(1,r.correct))*DAY:0);
  saved.results[q.id]=r;save();
  if(!right&&!retried.has(q.id)){retried.add(q.id);queue.splice(Math.min(index+3,queue.length),0,q);}
  document.getElementById('feedback').innerHTML='<div class="feedback"><strong>'+(right?'Well done.':'Not quite.')+'</strong>'+html
    +'<button id="next" class="primary">Continue</button></div>';
  const next=document.getElementById('next');
  next.onclick=()=>{index++;render();};
  next.focus();
  window.LearningFeedback?.signal(right?'ok':'no');
}

function done(){
  show('<h1>Round complete</h1><section class="panel"><h2>'+score+' of '+queue.length+' answers correct</h2>'
    +'<p>'+(queue.length-retried.size)+' tasks · '+retried.size+' repeated after a mistake</p>'
    +'<div class="actions"><button id="again" class="primary">Another round</button><button id="home">Writing a discussion</button></div></section>');
  document.getElementById('again').onclick=()=>start(mode);
  document.getElementById('home').onclick=home;
  window.LearningFeedback?.tone?.('done');
}

/* ------------------------------------------------------------ Schreibwerkstatt
   Der Entwurf liegt unter eigenem Schluessel, damit ein kaputter Entwurf nie
   den Uebungsstand kostet. Die Seite bewertet den Text nicht; sie gibt nur
   Hinweise zu den drei Regeln und fuehrt durch die Checkliste. */
const W=D.workshop, DKEY='vt:discussion9:draft';
const STEPS=['Question','Collect','Decide','Order','Write','Check'];
const CHECKS=D.cards.find(c=>c.title==='Check your own text').items.map(x=>x[1]);
const MARKS=[['yes','✓','Yes'],['partly','(✓)','Partly'],['no','✗','Not yet']];
const blank=()=>({version:1,step:0,topic:'',forPts:['','',''],againstPts:['','',''],side:'',opinion:'',order:[0,1,2],answer:-1,parts:['','','',''],checks:CHECKS.map(()=>''),changes:['','']});
const strings=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>typeof x==='string');
let draft=blank();
try{
  const raw=localStorage.getItem(DKEY);
  if(raw){
    const p=JSON.parse(raw),b=blank();
    if(p&&p.version===1){
      if(Number.isInteger(p.step)&&p.step>=0&&p.step<STEPS.length)b.step=p.step;
      for(const k of ['topic','opinion'])if(typeof p[k]==='string')b[k]=p[k];
      if(p.side==='for'||p.side==='against')b.side=p.side;
      for(const k of ['forPts','againstPts'])if(strings(p[k],3))b[k]=p[k];
      if(strings(p.parts,4))b.parts=p.parts;
      if(strings(p.changes,2))b.changes=p.changes;
      if(strings(p.checks,CHECKS.length))b.checks=p.checks;
      if(Array.isArray(p.order)&&p.order.length===3&&[0,1,2].every(i=>p.order.includes(i)))b.order=p.order;
      if(Number.isInteger(p.answer)&&p.answer>=-1&&p.answer<3)b.answer=p.answer;
    }
    draft=b;
  }
}catch(e){}
function keep(){try{localStorage.setItem(DKEY,JSON.stringify(draft));persistent=true;}catch(e){persistent=false;}status();}
function hasDraft(){return !!(draft.topic||draft.parts.some(Boolean)||draft.forPts.some(Boolean)||draft.againstPts.some(Boolean));}
const words=t=>(t.match(/[A-Za-zÀ-ÿ0-9’'-]+/g)||[]).filter(w=>/[A-Za-zÀ-ÿ0-9]/.test(w)).length;
const total=()=>draft.parts.reduce((n,t)=>n+words(t),0);
const ownPts=()=>draft.side==='against'?draft.againstPts:draft.forPts;
const otherPts=()=>draft.side==='against'?draft.forPts:draft.againstPts;
const ordered=()=>draft.order.map(i=>ownPts()[i]).filter(x=>x.trim());
function countText(){
  const n=total();
  return n+' of '+W.min+'–'+W.max+' words · '+(n<W.min?(W.min-n)+' more to go':n>W.max?(n-W.max)+' words too many – shorten a little':'within the word count ✓');
}
/* Hinweise zu den drei Regeln - nur Anhaltspunkte, keine Bewertung. */
function hints(){
  const h=[],[intro,other,own,end]=draft.parts,opinion=/\b(I think|I believe|I agree|I disagree|In my opinion|In my view|Personally)\b/i;
  if(opinion.test(intro))h.push('Rule 1: Your introduction already gives your opinion. Keep it for the conclusion.');
  if(words(other)>20&&!/\b(On the one hand|Some people|Supporters of|Opponents of|Many people|It is often said)\b/i.test(other))h.push('The other side: make clear whose arguments these are, e.g. “On the one hand, some people think …”.');
  if(words(own)>20&&!/\b(Admittedly|While it is true|Although I understand|It is true that)\b/i.test(own))h.push('Rule 3: Answer the other side at least once, e.g. “Admittedly, … However, …”.');
  if(words(end)>8&&!opinion.test(end))h.push('Conclusion: Say clearly what you think, e.g. “After looking at both sides, I believe that …”.');
  return h;
}
const fullText=()=>[draft.topic.trim(),...draft.parts.map(t=>t.trim())].filter(Boolean).join('\n\n');

/* Neu zeichnen ohne Sprung nach oben - fuer Auswahl innerhalb eines Schritts. */
function redraw(sel){const y=window.scrollY||0;workshop(draft.step);window.scrollTo?.(0,y);app.querySelector(sel)?.focus({preventScroll:true});}
function workshop(step){
  draft.step=step;keep();
  const nav='<ol class="steps">'+STEPS.map((n,i)=>'<li><button data-step="'+i+'"'+(i===step?' aria-current="step" class="primary"':'')+'>'+(i+1)+' '+n+'</button></li>').join('')+'</ol>';
  let body='';
  if(step===0){
    body='<h2>Which question do you discuss?</h2><p class="muted">Choose a practice question or write your own – for example the question your teacher gives you.</p>'
      +'<div class="options">'+W.topics.map((t,i)=>'<button data-topic="'+i+'"'+(draft.topic===t?' class="correct" aria-pressed="true"':' aria-pressed="false"')+' lang="en">'+esc(t)+'</button>').join('')+'</div>'
      +'<label for="own">Your own question</label><input id="own" lang="en" value="'+esc(W.topics.includes(draft.topic)?'':draft.topic)+'" placeholder="Should …?">';
  }
  if(step===1){
    const col=(k,h)=>'<div><h2>'+h+'</h2>'+draft[k].map((v,i)=>'<label for="'+k+i+'">'+h+' '+(i+1)+'</label><input id="'+k+i+'" data-list="'+k+'" data-i="'+i+'" lang="en" value="'+esc(v)+'">').join('')+'</div>';
    body='<p class="context">Question: '+esc(draft.topic||'–')+'</p><p class="muted">Short notes are enough. Aim for three points on each side.</p><div class="table">'+col('forPts','For')+col('againstPts','Against')+'</div>';
  }
  if(step===2){
    body='<p class="context">Question: '+esc(draft.topic||'–')+'</p><h2>Which side do you take?</h2><div class="actions">'
      +[['for','For'],['against','Against']].map(([k,n])=>'<button data-side="'+k+'" aria-pressed="'+(draft.side===k)+'"'+(draft.side===k?' class="primary"':'')+'>'+n+'</button>').join('')+'</div>'
      +'<label for="opinion">Your opinion in one sentence</label><input id="opinion" lang="en" value="'+esc(draft.opinion)+'" placeholder="I believe that …">'
      +'<p class="muted">The arguments of the other side go into part 2, your arguments into part 3.</p>';
  }
  if(step===3){
    const own=ownPts(),list=draft.order.filter(i=>own[i].trim());
    body=!draft.side?'<p>First decide which side you take (step 3).</p>'
      :'<h2>Your arguments: weakest first, strongest last</h2>'
      +(list.length?'<ol class="order">'+list.map((i,k)=>'<li><span><strong>'+(k+1)+'.</strong> <span lang="en">'+esc(own[i])+'</span></span><span class="move"><button data-up="'+k+'" aria-label="Move up"'+(k?'':' disabled')+'>↑</button><button data-down="'+k+'" aria-label="Move down"'+(k<list.length-1?'':' disabled')+'>↓</button></span></li>').join('')+'</ol>'
        :'<p class="muted">You have not collected any arguments for your side yet (step 2).</p>')
      +'<h2>Which argument of the other side will you answer?</h2>'
      +(otherPts().some(x=>x.trim())?'<div class="options">'+otherPts().map((x,i)=>x.trim()?'<button data-answer="'+i+'" aria-pressed="'+(draft.answer===i)+'"'+(draft.answer===i?' class="correct"':'')+' lang="en">'+esc(x)+'</button>':'').join('')+'</div>'
        :'<p class="muted">You have not collected any arguments for the other side yet (step 2).</p>')
      +'<p class="muted">Rule 3: Answer it in your part with “Admittedly, … However, …”.</p>';
  }
  if(step===4){
    const notes=[draft.topic?[draft.topic]:[],otherPts().filter(x=>x.trim()),[...ordered(),...(draft.answer>=0&&otherPts()[draft.answer].trim()?['Answer: '+otherPts()[draft.answer]]:[])],draft.opinion?[draft.opinion]:[]];
    body='<p class="context">Question: '+esc(draft.topic||'–')+'</p><p class="count" id="count">'+countText()+'</p>'
      +W.parts.map((p,i)=>'<div class="part"><h2><label for="part'+i+'">'+(i+1)+' '+D.partNames[i]+'</label></h2><p class="muted">'+esc(p.tip)+' <span class="nowrap">('+p.words+')</span></p>'
        +(notes[i].length?'<ul class="notes">'+notes[i].map(n=>'<li lang="en">'+esc(n)+'</li>').join('')+'</ul>':'')
        +'<textarea id="part'+i+'" data-part="'+i+'" lang="en">'+esc(draft.parts[i])+'</textarea><p class="muted" id="words'+i+'">'+words(draft.parts[i])+' words</p>'
        +'<details><summary>Phrases for this part</summary><div class="chips">'
          +D.phrases.filter(ph=>p.boxes.includes(ph.box)).map(ph=>'<button data-insert="'+i+'" data-phrase="'+esc(ph.en)+'" lang="en">'+esc(ph.en)+'</button>').join('')
        +'</div></details></div>').join('');
  }
  if(step===5){
    const h=hints();
    body='<h2>Your text</h2><div class="quote text" lang="en">'+(fullText()?fullText().split('\n\n').map(t=>'<p>'+esc(t)+'</p>').join(''):'<p class="muted">Nothing written yet.</p>')+'</div>'
      +'<p class="count">'+countText()+'</p>'
      +(h.length?'<div class="feedback"><strong>Hints</strong><ul>'+h.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="muted">The app cannot mark your text – these are only hints.</p></div>':'')
      +'<h2>Checklist</h2><ul class="checklist">'+CHECKS.map((c,i)=>'<li><span>'+esc(c)+'</span><span class="marks" role="group" aria-label="'+esc(c)+'">'
        +MARKS.map(([k,s,n])=>'<button data-check="'+i+'" data-mark="'+k+'" aria-pressed="'+(draft.checks[i]===k)+'" title="'+n+'"'+(draft.checks[i]===k?' class="primary"':'')+'>'+s+'<span class="sr"> '+n+'</span></button>').join('')+'</span></li>').join('')+'</ul>'
      +'<h2>Two things I will change</h2>'+draft.changes.map((v,i)=>'<label for="change'+i+'">Change '+(i+1)+'</label><input id="change'+i+'" data-change="'+i+'" value="'+esc(v)+'">').join('')
      +'<div class="actions"><button id="copy" class="primary">Copy my text</button><button id="fresh">Start a new text</button></div><p id="copied" role="status" class="muted"></p>'
      +'<h2>Compare with a model text</h2><p class="muted">A model on a different question – look at how the four parts are built.</p>'
      +D.models.map(m=>'<details><summary lang="en">'+esc(m.question)+'</summary>'+m.parts.map((t,i)=>'<p><strong>'+(i+1)+' '+D.partNames[i]+'</strong><br><span lang="en">'+esc(t)+'</span></p>').join('')+'</details>').join('');
  }
  show('<button id="back">← Writing a discussion</button><h1>Writing workshop</h1>'
    +'<p class="pill">Step '+(step+1)+' of '+STEPS.length+' · '+STEPS[step]+' · your draft is saved automatically</p>'+nav
    +'<section class="panel workshop">'+body+'</section>'
    +'<div class="actions"><button id="prev"'+(step?'':' disabled')+'>← Previous</button>'
    +(step<STEPS.length-1?'<button id="next" class="primary">Next: '+STEPS[step+1]+' →</button>':'<button id="home">Writing a discussion</button>')+'</div>');
  /* Wie in der Klassenarbeit: keine Rechtschreibpruefung, keine Autokorrektur. */
  app.querySelectorAll('input,textarea').forEach(el=>{el.spellcheck=false;el.setAttribute('spellcheck','false');el.setAttribute('autocorrect','off');});
  document.getElementById('back').onclick=home;
  document.getElementById('prev').onclick=()=>workshop(step-1);
  const next=document.getElementById('next');if(next)next.onclick=()=>workshop(step+1);
  const hb=document.getElementById('home');if(hb)hb.onclick=home;
  app.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>workshop(Number(b.dataset.step)));
  const on=(sel,fn)=>app.querySelectorAll(sel).forEach(el=>el.addEventListener('input',()=>{fn(el);keep();}));
  app.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{draft.topic=W.topics[Number(b.dataset.topic)];redraw('[data-topic="'+b.dataset.topic+'"]');});
  on('#own',el=>{draft.topic=el.value;app.querySelectorAll('[data-topic]').forEach(b=>{b.classList.remove('correct');b.setAttribute('aria-pressed','false');});});
  on('[data-list]',el=>{draft[el.dataset.list][Number(el.dataset.i)]=el.value;});
  app.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{if(draft.side!==b.dataset.side){draft.side=b.dataset.side;draft.answer=-1;}redraw('[data-side="'+b.dataset.side+'"]');});
  on('#opinion',el=>{draft.opinion=el.value;});
  const move=(k,d)=>{const own=ownPts(),list=draft.order.filter(i=>own[i].trim()),rest=draft.order.filter(i=>!own[i].trim());[list[k],list[k+d]]=[list[k+d],list[k]];draft.order=[...list,...rest];redraw('[data-'+(d<0?'up':'down')+'="'+(k+d)+'"]:not(:disabled)');};
  app.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>move(Number(b.dataset.up),-1));
  app.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>move(Number(b.dataset.down),1));
  app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{draft.answer=Number(b.dataset.answer);redraw('[data-answer="'+b.dataset.answer+'"]');});
  /* Textfelder wachsen mit, damit am Handy der ganze Absatz sichtbar bleibt. */
  const grow=el=>{el.style.height='auto';if(el.scrollHeight)el.style.height=el.scrollHeight+2+'px';};
  app.querySelectorAll('[data-part]').forEach(grow);
  on('[data-part]',el=>{const i=Number(el.dataset.part);grow(el);draft.parts[i]=el.value;document.getElementById('words'+i).textContent=words(el.value)+' words';document.getElementById('count').textContent=countText();});
  /* Wendung an der Cursorposition einfuegen; "…" markiert, was der Satz noch braucht. */
  app.querySelectorAll('[data-insert]').forEach(b=>b.onclick=()=>{
    const ta=document.getElementById('part'+b.dataset.insert),v=ta.value,a=ta.selectionStart??v.length,e=ta.selectionEnd??a;
    const before=v.slice(0,a),add=(before&&!/\s$/.test(before)?' ':'')+b.dataset.phrase+' ';
    ta.value=before+add+v.slice(e);ta.focus();ta.selectionStart=ta.selectionEnd=a+add.length;
    ta.dispatchEvent(new Event('input'));
  });
  app.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.check);draft.checks[i]=b.dataset.mark;keep();
    app.querySelectorAll('[data-check="'+i+'"]').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',String(on));x.classList.toggle('primary',on);});
  });
  on('[data-change]',el=>{draft.changes[Number(el.dataset.change)]=el.value;});
  const copy=document.getElementById('copy');
  if(copy)copy.onclick=()=>{
    const out=document.getElementById('copied');
    const fail=()=>{out.textContent='Copying is not possible here – select your text above and copy it.';};
    if(!fullText())return void(out.textContent='There is no text to copy yet.');
    try{navigator.clipboard.writeText(fullText()).then(()=>{out.textContent='Your text has been copied.';},fail);}catch(e){fail();}
  };
  const fresh=document.getElementById('fresh');
  if(fresh)fresh.onclick=()=>{if(!window.confirm('Delete your draft and start a new text?'))return;draft=blank();keep();workshop(0);};
}

home();status();
})();
