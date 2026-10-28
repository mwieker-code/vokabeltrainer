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
    +'</div>');
  document.getElementById('learn').onclick=()=>learn(0);
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

home();status();
})();
