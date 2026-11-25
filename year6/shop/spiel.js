/* =========================================================================
   SPIEL "Shopping Trip" (Year 6) - Auftraege, Korb, Kasse, Duell,
   Kassenbon, Steuerung und Karte. Laeuft auch ohne 3D (Tests): Die
   Darstellung kommt aus render.js und meldet sich mit "shoprender".
   ========================================================================= */
(function(){
'use strict';
const L=window.ShopLogik,DAT=window.SHOP_DATEN,welt=L.bauen(DAT);
const KEY='vt6:shop:v1',TEMPO=2.7,DREH=2.0,FOV=70,GREIF=4.6,KASSIERERIN='Amy';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G={modus:null,zustand:'menu',p:{x:welt.START.x,z:welt.START.z,yaw:welt.START.yaw,pitch:0},korb:{},liste:null,auftrag:null,
 profi:false,tafel:false,lang:false,name:'',t:0,schritt:0,hover:null,ware:null,kasse:null,duell:null,ergebnis:null,gelaufen:0};
const eingabe={keys:new Set(),stick:{x:0,y:0},look:{x:0,y:0},pad:new Set()};
const ton=k=>{try{window.LearningFeedback&&window.LearningFeedback.tone(k);}catch(e){}};

/* ---------------- Speicher ---------------- */
function laden(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return {};}}
function sichern(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}

/* ---------------- Sprache ---------------- */
function sprich(text,rate){
 const sp=window.speechSynthesis;if(!sp||typeof SpeechSynthesisUtterance==='undefined'||!text)return false;
 sp.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=rate||0.9;
 const st=sp.getVoices();const v=st.find(v=>/^en-GB/i.test(v.lang))||st.find(v=>/^en/i.test(v.lang));if(v)u.voice=v;
 sp.speak(u);return true;
}
const aufzaehlen=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];

/* ---------------- Einstellungen ---------------- */
function einstellungen(){
 const wert=n=>{const e=document.querySelector('input[name="'+n+'"]:checked');return e?e.value:'';};
 G.lang=wert('laenge')==='lang';G.profi=wert('schild')==='profi';
 G.tafel=!!($('tafel')&&$('tafel').checked);
 G.name=($('name')&&$('name').value.trim())||'';
 const d=laden();d.einst={lang:G.lang,profi:G.profi,tafel:G.tafel,name:G.name,
  team1:$('team1')?$('team1').value:'',team2:$('team2')?$('team2').value:'',runden:$('runden')?$('runden').value:'4',frist:$('frist')?$('frist').value:'90',duellHoeren:!!($('duellHoeren')&&$('duellHoeren').checked),duellSplit:!!($('duellSplit')&&$('duellSplit').checked)};
 sichern(d);
}
function einstellungenLaden(){
 const e=laden().einst;if(!e)return;
 const setze=(n,v)=>{const el=document.querySelector('input[name="'+n+'"][value="'+v+'"]');if(el)el.checked=true;};
 setze('laenge',e.lang?'lang':'kurz');setze('schild',e.profi?'profi':'leicht');
 if($('tafel'))$('tafel').checked=!!e.tafel;if($('name'))$('name').value=e.name||'';
 if($('team1')&&e.team1)$('team1').value=e.team1;if($('team2')&&e.team2)$('team2').value=e.team2;
 if($('runden')&&e.runden)$('runden').value=e.runden;if($('frist')&&e.frist)$('frist').value=e.frist;
 if($('duellHoeren'))$('duellHoeren').checked=!!e.duellHoeren;
 if($('duellSplit'))$('duellSplit').checked=!!e.duellSplit;
}

/* ---------------- Start ---------------- */
function zeige(id){for(const s of ['menu','stage','over'])if($(s))$(s).hidden=s!==id;document.body.classList.toggle('im-spiel',id==='stage');}
function start(modus,rnd){
 einstellungen();
 G.split=false;G.p2=null;G.hover2=null;G.sperre=[0,0];document.body.classList.remove('split');
 G.modus=modus;G.korb={};G.liste=null;G.auftrag=null;G.kasse=null;G.duell=null;G.ergebnis=null;G.ware=null;G.hover=null;G.gelaufen=0;G.t=0;
 Object.assign(G.p,{x:welt.START.x,z:welt.START.z,yaw:welt.START.yaw,pitch:0});
 document.body.classList.toggle('tafel',G.tafel||modus==='duell');
 document.body.dataset.modus=modus;
 for(const id of ['ware','korb','kasse','ansage','grosskarte','meldung'])if($(id))$(id).hidden=true;
 if(modus==='liste'||modus==='hoeren')G.liste=L.liste(welt,{n:G.lang?7:5,mengen:G.lang},rnd);
 if(modus==='budget'){const b=DAT.BUDGET,d=laden(),letzte=d.letztesBudget;
  const wahl=b.filter(x=>x.id!==letzte);G.auftrag=wahl[Math.floor((rnd||Math.random)()*wahl.length)];d.letztesBudget=G.auftrag.id;sichern(d);}
 G.zustand=modus==='frei'?'frei':'laden';
 zeige('stage');
 $('steuer').hidden=!(G.tafel||modus==='duell');
 if(modus==='duell')duellStart(rnd);
 G.mission=null;if(MISSIONEN.includes(modus))missionStart(modus,rnd);
 zettel();korbKnopf();
 if(R&&R.setProfi)R.setProfi(G.profi);
 starte3d();
 if(modus==='hoeren'||modus==='wo')setTimeout(()=>vorlesen(),600);
}
function menu(){
 if(window.speechSynthesis)try{speechSynthesis.cancel();}catch(e){}
 G.zustand='menu';zeige('menu');document.body.classList.remove('tafel');
 const d=laden(),b=d.best||{};
 for(const m of ['liste','hoeren','budget',...MISSIONEN]){const el=document.querySelector('[data-best="'+m+'"]');if(el)el.textContent=b[m]?'Rekord: '+'★'.repeat(b[m])+'☆'.repeat(3-b[m]):'';}
}

/* ---------------- Zettel (Liste oder Budget) ---------------- */
function zettel(){
 const box=$('zettel');if(!box)return;
 box.hidden=G.modus==='frei'||G.modus==='duell';
 $('duell').hidden=G.modus!=='duell';
 if(box.hidden)return;
 const ul=$('zListe'),bud=$('zBudget');
 $('woerter').innerHTML=DAT.WOERTER.map(([e,d])=>'<dt lang="en">'+esc(e)+'</dt><dd>'+esc(d)+'</dd>').join('');
 $('zAufgabe').hidden=!G.mission;
 if(G.mission){ul.innerHTML='';bud.hidden=true;return missionZettel();}
 if(G.liste){
  const st=L.listeStand(welt,G.liste,G.korb),hoeren=G.modus==='hoeren';
  $('zTitel').textContent=hoeren?'Listen and shop':'Shopping list';
  $('zInfo').textContent=hoeren?'Tippe auf 🔊, um eine Zeile zu hören.':'Finde alles im Laden und leg es in deinen Korb.';
  ul.innerHTML=st.zeilen.map((z,k)=>{
   const offen=!hoeren||z.ok;
   return '<li class="'+(z.ok?'ok':z.zuviel?'zuviel':'')+'">'
    +'<span class="haken" aria-hidden="true">'+(z.ok?'✓':z.zuviel?'!':'')+'</span>'
    +(offen?'<span class="txt">'+esc(z.text)+'</span>':'<button class="hoer" data-hoer="'+k+'">🔊 Item '+(k+1)+'</button>')
    +(z.zuviel?'<small>zu viele im Korb</small>':'')
    +(!hoeren&&!z.ok?'<button class="wo" data-wo="'+z.id+'" aria-label="Wo finde ich das?">?</button>':'')
    +'</li>';}).join('')
   +st.extra.map(e=>'<li class="extra"><span class="haken" aria-hidden="true">✗</span><span class="txt">'+esc(L.menge(welt.byId[e.id],e.n))+'</span><small>nicht auf der Liste</small></li>').join('');
  bud.hidden=true;
  if(st.alleDa&&!G.fertigGemeldet&&G.zustand==='laden'){G.fertigGemeldet=true;meldung(st.extra.length?'Alles da – aber im Korb ist auch etwas, das nicht auf der Liste steht.':'Alles da! Geh zur Kasse 1 und bezahle. 🛒',4000);ton('ok');}
  if(!st.alleDa)G.fertigGemeldet=false;
 }else if(G.auftrag){
  const st=L.budgetStand(welt,G.auftrag,G.korb);
  $('zTitel').textContent=G.auftrag.titel;
  $('zInfo').innerHTML='Du hast <b>'+L.betrag(G.auftrag.budget)+'</b>. <span lang="en">Buy:</span>';
  ul.innerHTML=st.gruppen.map(g=>'<li class="'+(g.ok?'ok':'')+'"><span class="haken" aria-hidden="true">'+(g.ok?'✓':'')+'</span><span class="txt">'+esc(g.en)
   +(g.ids.length?' <small>('+g.ids.map(id=>esc(welt.byId[id].schild)+(G.korb[id]>1?' ×'+G.korb[id]:'')).join(', ')+')</small>':'')+'</span></li>').join('')
   +st.extra.map(e=>'<li class="extra"><span class="haken" aria-hidden="true">✗</span><span class="txt">'+esc(L.menge(welt.byId[e.id],e.n))+'</span><small>nicht auf dem Zettel</small></li>').join('');
  bud.hidden=false;
  const anteil=Math.min(1,st.summe/st.budget);
  bud.querySelector('span').style.width=(anteil*100)+'%';
  bud.classList.toggle('drueber',!st.imBudget);
  bud.querySelector('p').textContent=st.imBudget?'Ausgegeben: '+L.betrag(st.summe)+' · übrig: '+L.betrag(st.rest):'Zu teuer! '+L.betrag(-st.rest)+' über dem Budget.';
 }
}
function vorlesen(){
 if(G.liste){const z=G.liste.map(e=>e.text);return sprich('Please buy '+aufzaehlen(z)+'.',0.85);}
 if(G.auftrag)return sprich(G.auftrag.titel+'. You have got '+L.betrag(G.auftrag.budget).replace('£','')+' pounds. Please buy '+aufzaehlen(G.auftrag.gruppen.map(g=>g.en))+'.',0.9);
 if(G.duell&&G.duell.ziel)return sprich('Please find '+G.duell.ziel.en+'.',0.85);
 const M=G.mission;
 if(M&&M.art==='rezept')return sprich(M.rezept.titel+'. '+M.rezept.text,0.85);
 if(M&&M.art==='wo')return sprich(M.frage,0.9);
 if(M&&M.art==='detektiv'&&M.raetsel)return sprich(M.raetsel.text,0.85);
 return false;
}

/* ---------------- Meldung ---------------- */
let meldUhr=null;
function meldung(text,ms){const m=$('meldung');if(!m)return;m.textContent=text;m.hidden=false;clearTimeout(meldUhr);meldUhr=setTimeout(()=>{m.hidden=true;},ms||2600);}

/* ---------------- Ware ansehen und nehmen ---------------- */
function oeffneWare(id){
 if(G.zustand!=='laden'&&G.zustand!=='frei'&&!(G.duell&&G.duell.phase==='suche'))return false;
 const w=welt.byId[id];if(!w)return false;
 G.ware={id,anz:1,de:false};
 zeichneWare();
 return true;
}
function zeichneWare(){
 const box=$('ware'),a=G.ware;if(!box||!a)return;
 const w=welt.byId[a.id],farbe=L.ORTFARBE[w.ort],imKorb=G.korb[a.id]||0,name=!G.profi;
 const M=G.mission,waehlen=!!M&&(M.art==='detektiv'||(M.art==='wo'&&M.phase==='zeigen'));
 const frei=G.modus==='frei'||(!!M&&M.art==='wo'&&!waehlen),duell=G.modus==='duell'||waehlen;
 box.innerHTML='<button class="zu" id="wZu" aria-label="Schließen">✕</button>'
  +'<div class="w-kopf"><div class="w-bild" style="--a:'+w.farbe+';--b:'+w.akzent+'"><span aria-hidden="true">'+w.emo+'</span></div>'
  +'<div class="w-text"><span class="w-ort" style="--o:'+farbe+'" lang="en">'+esc(DAT.ORTE[w.ort].en)+'</span>'
  +(name?'<b class="w-name" lang="en">'+esc(L.gross(w.en))+'</b>':'<b class="w-name w-profi">Was ist das? <small>Profi: kein Name</small></b>')
  +'<span class="w-preis">'+L.preis(w.p)+(w.menge?' <small lang="en">each</small>':'')+'</span>'
  +(name?'<span class="w-de">'+(a.de?esc(w.de):'<button id="wDe" class="link">Auf Deutsch?</button>')+'</span>':'')
  +'</div></div>'
  +(duell?'<div class="w-knoepfe"><button id="wNehmen" class="primaer gross">'+(waehlen?'✔ Das ist es!':'✔ Das nehmen wir!')+'</button></div>'
   :frei?'<div class="w-knoepfe">'+(name?'<button id="wHoer" class="klein">🔊 Anhören</button>':'')+'</div>'
   :'<div class="w-menge"><button id="wMinus" aria-label="eins weniger">−</button><b id="wAnz">'+a.anz+'</b><button id="wPlus" aria-label="eins mehr">+</button></div>'
    +'<div class="w-knoepfe">'+(name?'<button id="wHoer" class="klein">🔊</button>':'')+'<button id="wNehmen" class="primaer">In den Korb · '+L.preis(w.p*a.anz)+'</button></div>'
    +(imKorb?'<p class="w-info">Schon im Korb: '+imKorb+'</p>':''));
 box.hidden=false;
 $('wZu').onclick=schliesseWare;
 if($('wDe'))$('wDe').onclick=()=>{a.de=true;zeichneWare();};
 if($('wHoer'))$('wHoer').onclick=()=>sprich(w.en);
 if($('wMinus'))$('wMinus').onclick=()=>{a.anz=Math.max(1,a.anz-1);zeichneWare();};
 if($('wPlus'))$('wPlus').onclick=()=>{a.anz=Math.min(6,a.anz+1);zeichneWare();};
 if($('wNehmen'))$('wNehmen').onclick=()=>waehlen?missionWahl(a.id):duell?duellWahl(a.id):nehmen(a.id,a.anz);
}
function schliesseWare(){G.ware=null;if($('ware'))$('ware').hidden=true;}
function nehmen(id,anz){
 if(G.zustand!=='laden')return false;
 G.korb[id]=(G.korb[id]||0)+(anz||1);
 schliesseWare();korbKnopf(true);zettel();
 meldung('🧺 '+L.gross(L.menge(welt.byId[id],anz||1))+' im Korb.');
 return true;
}
function korbKnopf(hupf){
 const k=$('korbKnopf');if(!k)return;
 k.hidden=G.modus==='frei'||G.modus==='duell'||G.modus==='wo'||G.modus==='detektiv';
 $('korbZahl').textContent=L.korbAnzahl(G.korb);$('korbSumme').textContent=L.betrag(L.korbSumme(welt,G.korb));
 if(hupf){k.classList.remove('hupf');void k.offsetWidth;k.classList.add('hupf');}
}
function zeigeKorb(){
 const box=$('korb');if(!box)return;
 const z=Object.entries(G.korb).filter(([,n])=>n>0);
 box.innerHTML='<button class="zu" id="kZu" aria-label="Schließen">✕</button><h3>Dein Korb</h3>'
  +(z.length?'<ul class="k-liste">'+z.map(([id,n])=>{const w=welt.byId[id];return '<li><span class="k-emo" aria-hidden="true">'+w.emo+'</span><span class="k-name" lang="en">'+esc(L.menge(w,n))+'</span><span class="k-preis">'+L.betrag(w.p*n)+'</span>'
    +'<button data-weg="'+id+'" aria-label="eins zurücklegen">−</button></li>';}).join('')+'</ul>'
    +'<p class="k-summe">Zusammen: <b>'+L.betrag(L.korbSumme(welt,G.korb))+'</b></p>'
   :'<p class="k-leer">Noch leer. Tippe im Regal auf eine Ware.</p>')
  +'<p class="k-tipp">Bezahlt wird an Kasse 1 vorne rechts neben dem Eingang.</p>';
 box.hidden=false;
 $('kZu').onclick=()=>{box.hidden=true;};
 box.querySelectorAll('[data-weg]').forEach(b=>b.onclick=()=>{weglegen(b.dataset.weg);zeigeKorb();});
}
function weglegen(id){if(!G.korb[id])return false;G.korb[id]--;if(!G.korb[id])delete G.korb[id];korbKnopf();zettel();return true;}

/* ---------------- Kasse ---------------- */
function kasseOeffnen(trotzdem){
 if(G.zustand!=='laden')return false;
 if(!L.korbAnzahl(G.korb)){meldung('Dein Korb ist noch leer.');return false;}
 const box=$('kasse');
 const fertig=G.liste?L.listeStand(welt,G.liste,G.korb).alleDa:L.budgetStand(welt,G.auftrag,G.korb).gruppen.every(g=>g.ok);
 if(!fertig&&!trotzdem){
  if(box){box.innerHTML='<div class="k-karte k-frage"><p class="k-gross">Auf deinem Zettel fehlt noch etwas.</p><p>Möchtest du trotzdem bezahlen?</p>'
   +'<p><button id="kWeiterSuchen" class="primaer">Weiter einkaufen</button> <button id="kTrotzdem" class="zweit">Trotzdem bezahlen</button></p></div>';
   box.hidden=false;$('kWeiterSuchen').onclick=()=>{box.hidden=true;};$('kTrotzdem').onclick=()=>kasseOeffnen(true);}
  return false;
 }
 const summe=L.korbSumme(welt,G.korb);
 const geld=DAT.GELD.slice();while(geld.reduce((a,b)=>a+b,0)<summe)geld.unshift(2000);
 G.kasse={geld,schritte:L.kassenSchritte(welt,summe),i:0,richtig:0,anzahl:0,summe,auswahl:[],gezahlt:0,wechsel:0,antwort:null};
 G.zustand='kasse';schliesseWare();if($('korb'))$('korb').hidden=true;
 kasseSchritt();
 return true;
}
function kasseSchritt(){
 const K=G.kasse,box=$('kasse');if(!K)return;
 const s=K.schritte[K.i];if(!s)return ende();
 if(s.art==='wechsel'){K.wechsel=K.gezahlt-K.summe;if(K.wechsel===0){s.sagt='Thank you. That\'s exactly right!';s.exakt=true;}else{s.sagt='Here\'s your change.';s.optionen=L.wechselOptionen(K.wechsel).map(L.betrag);s.richtig=L.betrag(K.wechsel);s.de='Wie viel Wechselgeld bekommst du?';s.warum='Bezahlt '+L.betrag(K.gezahlt)+' − '+L.betrag(K.summe)+' = '+L.betrag(K.wechsel);}}
 if(s.art==='geld'){s.sagt=K.schritte[K.i-1]?K.schritte[K.i-1].sagt:'That\'s '+L.betrag(K.summe)+', please.';}
 const bon=L.bon(welt,G.korb);
 const sagt=s.art==='frage'?(K.antwort||'…'):s.sagt;
 if(!box)return;
 box.innerHTML='<div class="k-buehne">'
  +'<div class="k-display" aria-label="Kassendisplay"><div class="k-posten">'+bon.zeilen.map((z,k)=>'<div style="--i:'+k+'"><span>'+(z.n>1?z.n+'× ':'')+esc(z.name)+'</span><span>'+L.betrag(z.summe)+'</span></div>').join('')+'</div>'
  +'<div class="k-total"><span>TOTAL</span><b>'+L.betrag(K.summe)+'</b></div></div>'
  +'<div class="k-person"><div class="avatar" aria-hidden="true"><i class="haar"></i><i class="gesicht"></i><i class="koerper"></i></div><span class="k-schild">'+KASSIERERIN+'</span></div>'
  +'<div class="k-blase" lang="en"><p id="kSagt">'+esc(sagt)+'</p>'+(sagt&&sagt!=='…'?'<button id="kHoer" class="klein" aria-label="Anhören">🔊</button>':'')+'</div>'
  +'</div><div class="k-aufgabe" id="kAufgabe"></div>'
  +'<p class="k-fort">Kasse · Schritt '+(K.i+1)+' von '+K.schritte.length+'</p>';
 box.hidden=false;
 if($('kHoer'))$('kHoer').onclick=()=>sprich(sagt);
 if(sagt&&sagt!=='…')sprich(sagt);
 const auf=$('kAufgabe');
 if(s.art==='geld')return geldAuswahl(auf);
 if(s.exakt){K.richtig++;K.anzahl++;auf.innerHTML='<p class="k-gut">Passend bezahlt – kein Wechselgeld. 👍</p><button id="kWeiter" class="primaer">Weiter</button>';$('kWeiter').onclick=weiterKasse;return;}
 const hinweis=s.art==='frage'?s.de:s.art==='wechsel'?s.de:'Was antwortest du?';
 auf.innerHTML='<p class="k-hinweis">'+esc(hinweis)+'</p><div class="k-optionen" lang="en">'+s.optionen.map((o,k)=>'<button data-opt="'+k+'">'+esc(o)+'</button>').join('')+'</div><p id="kRueck" class="k-rueck" aria-live="polite"></p>';
 auf.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>antworte(s.optionen[+b.dataset.opt]));
}
function antworte(text){
 const K=G.kasse;if(!K)return false;const s=K.schritte[K.i];if(!s||s.beantwortet)return false;
 s.beantwortet=true;const ok=text===s.richtig;K.anzahl++;if(ok)K.richtig++;
 ton(ok?'ok':'no');
 const auf=$('kAufgabe');
 if(auf){auf.querySelectorAll('[data-opt]').forEach(b=>{const t=s.optionen[+b.dataset.opt];b.disabled=true;if(t===s.richtig)b.classList.add('richtig');else if(t===text)b.classList.add('falsch');});
  const r=$('kRueck');if(r)r.innerHTML=(ok?'<b class="k-gut">Richtig!</b> ':'<b class="k-schlecht">Nicht ganz.</b> ')+esc(s.warum||'')+' <button id="kWeiter" class="primaer">Weiter</button>';
  if($('kWeiter'))$('kWeiter').onclick=weiterKasse;}
 if(s.art==='frage'){K.antwort=s.antwort;const p=$('kSagt');if(p)p.textContent=s.antwort;sprich(s.antwort);}
 return ok;
}
function weiterKasse(){const K=G.kasse;if(!K)return;K.i++;if(K.schritte[K.i]&&K.schritte[K.i].art!=='frage')K.antwort=null;kasseSchritt();}
const MUENZE=v=>v>=500?'schein s'+v:v>=100?'gold m'+v:v>=5?'silber m'+v:'kupfer m'+v;
function geldAuswahl(auf){
 const K=G.kasse;
 const zeichne=()=>{
  K.gezahlt=L.bezahlt({GELD:K.geld},K.auswahl);
  auf.innerHTML='<p class="k-hinweis">Bezahle <b>'+L.betrag(K.summe)+'</b>. Tippe auf Scheine und Münzen.</p>'
   +'<div class="geld">'+K.geld.map((v,i)=>K.auswahl.includes(i)?'<span class="platz"></span>':'<button class="'+MUENZE(v)+'" data-geld="'+i+'" aria-label="'+L.preis(v)+'">'+(v>=100?'£'+v/100:v+'p')+'</button>').join('')+'</div>'
   +'<div class="theke"><span>Auf der Theke: <b>'+L.betrag(K.gezahlt)+'</b></span><div>'+K.auswahl.map(i=>'<button class="'+MUENZE(K.geld[i])+' klein-geld" data-zurueck="'+i+'" aria-label="'+L.preis(K.geld[i])+' zurücknehmen">'+(K.geld[i]>=100?'£'+K.geld[i]/100:K.geld[i]+'p')+'</button>').join('')+'</div></div>'
   +'<button id="kZahlen" class="primaer"'+(K.gezahlt<K.summe?' disabled':'')+'>'+(K.gezahlt<K.summe?'Noch '+L.betrag(K.summe-K.gezahlt)+' fehlen':'Bezahlen')+'</button>';
  auf.querySelectorAll('[data-geld]').forEach(b=>b.onclick=()=>{K.auswahl.push(+b.dataset.geld);zeichne();});
  auf.querySelectorAll('[data-zurueck]').forEach(b=>b.onclick=()=>{K.auswahl=K.auswahl.filter(i=>i!==+b.dataset.zurueck);zeichne();});
  $('kZahlen').onclick=bezahlen;
 };
 zeichne();
}
function bezahlen(){const K=G.kasse;if(!K||K.gezahlt<K.summe)return false;ton('ok');K.i++;kasseSchritt();return true;}
/* Fuer Tests und Tastatur: passend oder mit dem 10-Pfund-Schein zahlen */
function zahleMit(indizes){const K=G.kasse;if(!K)return false;K.auswahl=indizes.slice();K.gezahlt=L.bezahlt({GELD:K.geld},K.auswahl);return bezahlen();}

/* ---------------- Ergebnis und Kassenbon ---------------- */
function auswerten(){
 const K=G.kasse,kasse=K&&K.anzahl?K.richtig/K.anzahl:0;
 let einkauf=0,sparsam=true,info={};
 if(G.liste){const st=L.listeStand(welt,G.liste,G.korb);
  const pkt=st.zeilen.filter(z=>z.ok).length-0.5*st.extra.reduce((a,e)=>a+e.n,0);
  einkauf=Math.max(0,pkt)/st.zeilen.length;info.liste=st;}
 if(G.auftrag){const st=L.budgetStand(welt,G.auftrag,G.korb);
  einkauf=st.gruppen.filter(g=>g.ok).length/st.gruppen.length-0.15*st.extra.length;
  if(!st.imBudget)einkauf*=0.5;einkauf=Math.max(0,einkauf);
  sparsam=st.imBudget&&st.summe<=st.min+0.35*(st.budget-st.min);
  info.budget=st;info.vergleiche=L.vergleiche(welt,st);}
 let s=L.sterne(0.6*einkauf+0.4*kasse);
 if(G.auftrag){if(!info.budget.imBudget)s=1;else if(!sparsam)s=Math.min(s,2);}
 return {einkauf,kasse,sterne:s,sparsam,...info,richtig:K?K.richtig:0,anzahl:K?K.anzahl:0};
}
function ende(){
 if(window.speechSynthesis)try{speechSynthesis.cancel();}catch(e){}
 const E=auswerten();G.ergebnis=E;G.zustand='ende';
 const d=laden();d.best=d.best||{};const alt=d.best[G.modus]||0;if(E.sterne>alt)d.best[G.modus]=E.sterne;d.einkaeufe=(d.einkaeufe||0)+1;sichern(d);
 $('kasse').hidden=true;
 const o=$('over');if(!o)return;
 const bon=L.bon(welt,G.korb),K=G.kasse,datum=new Date();
 let einkauf='';
 if(E.liste)einkauf='<ul class="e-liste">'+E.liste.zeilen.map(z=>'<li class="'+(z.ok?'ok':'nein')+'"><span>'+(z.ok?'✓':'✗')+'</span><span lang="en">'+esc(z.text)+'</span>'+(z.ok?'':'<small>'+(z.hat?'im Korb: '+z.hat:'fehlt')+'</small>')+'</li>').join('')
  +E.liste.extra.map(e=>'<li class="nein"><span>✗</span><span lang="en">'+esc(L.menge(welt.byId[e.id],e.n))+'</span><small>nicht auf der Liste</small></li>').join('')+'</ul>';
 if(E.budget)einkauf='<p class="e-budget '+(E.budget.imBudget?'gut':'schlecht')+'">'+(E.budget.imBudget?'Im Budget geblieben: ':'Über dem Budget: ')+L.betrag(E.budget.summe)+' von '+L.betrag(E.budget.budget)
  +(E.sparsam&&E.budget.imBudget?' – sehr sparsam! 💚':E.budget.imBudget?' – das ginge noch günstiger.':'')+'</p>'
  +'<ul class="e-liste">'+E.budget.gruppen.map(g=>'<li class="'+(g.ok?'ok':'nein')+'"><span>'+(g.ok?'✓':'✗')+'</span><span lang="en">'+esc(g.en)+'</span></li>').join('')+'</ul>'
  +(E.vergleiche.length?'<h3>Cheaper or the cheapest?</h3><ul class="e-saetze" lang="en">'+E.vergleiche.map(v=>'<li class="'+(v.gut?'gut':'')+'">'+(v.gut?'👍 ':'💡 ')+esc(v.text)+'</li>').join('')+'</ul>':'');
 o.innerHTML='<div class="e-kopf"><h1 tabindex="-1">'+(E.sterne===3?'Brilliant!':E.sterne===2?'Well done!':'Good try!')+'</h1>'
  +'<p class="e-sterne" aria-label="'+E.sterne+' von 3 Sternen">'+'★'.repeat(E.sterne)+'<span>'+'★'.repeat(3-E.sterne)+'</span></p></div>'
  +'<div class="e-raster"><div class="e-karten">'
  +'<section class="e-karte"><h2>'+(G.auftrag?esc(G.auftrag.titel):'Deine Einkaufsliste')+'</h2>'+einkauf+'</section>'
  +'<section class="e-karte"><h2>An der Kasse</h2><p>'+E.richtig+' von '+E.anzahl+' Antworten richtig.</p></section>'
  +'<section class="e-karte e-aktion"><label>Name auf dem Kassenbon <input id="bonName" type="text" maxlength="30" value="'+esc(G.name)+'" placeholder="Vorname"></label>'
  +'<p class="e-knoepfe"><button id="bonDruck" class="zweit">🖨 Drucken</button> <button id="bonBild" class="zweit">💾 Als Bild speichern</button></p>'
  +'<p class="e-knoepfe"><button id="nochmal" class="primaer">Noch eine Runde</button> <button id="zumMenu" class="zweit">Zum Menü</button></p></section></div>'
  +'<div class="bon" id="bon" lang="en">'+bonHtml(bon,K,datum,E)+'</div></div>';
 zeige('over');
 const nameFeld=$('bonName');
 nameFeld.oninput=()=>{G.name=nameFeld.value.trim();const n=$('bonKunde');if(n)n.textContent=G.name||'________________';const d2=laden();d2.einst=d2.einst||{};d2.einst.name=G.name;sichern(d2);if($('name'))$('name').value=G.name;};
 $('bonDruck').onclick=()=>{try{window.print();}catch(e){}};
 $('bonBild').onclick=()=>bonSpeichern(bon,K,datum,E);
 $('nochmal').onclick=()=>start(G.modus);$('zumMenu').onclick=menu;
 if(E.sterne===3)konfetti(o);
 o.querySelector('h1').focus();
}
const zeit=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+'  '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
function aufgabeName(){return G.modus==='hoeren'?'Listen and shop':G.modus==='budget'?'Budget: '+G.auftrag.titel:'Shopping list';}
function bonHtml(bon,K,datum,E){
 return '<p class="b-laden">'+esc(DAT.laden)+'</p><p class="b-klein">'+esc(DAT.adresse)+'</p><p class="b-klein">'+zeit(datum)+' · Till 1 · '+KASSIERERIN+'</p><hr>'
  +bon.zeilen.map(z=>'<div class="b-zeile"><span>'+(z.n>1?z.n+' x ':'')+esc(z.name.toUpperCase())+(z.n>1?'<small> @ '+L.betrag(z.einzel)+'</small>':'')+'</span><span>'+L.betrag(z.summe)+'</span></div>').join('')
  +'<hr><div class="b-zeile b-total"><span>TOTAL</span><span>'+L.betrag(bon.summe)+'</span></div>'
  +'<div class="b-zeile"><span>CASH</span><span>'+L.betrag(K?K.gezahlt:0)+'</span></div><div class="b-zeile"><span>CHANGE</span><span>'+L.betrag(K?Math.max(0,K.gezahlt-bon.summe):0)+'</span></div><hr>'
  +'<p class="b-klein">'+esc(aufgabeName())+'</p><p class="b-sterne">'+'★'.repeat(E.sterne)+'☆'.repeat(3-E.sterne)+'</p>'
  +'<p class="b-klein">Checkout talk: '+E.richtig+'/'+E.anzahl+'</p>'
  +'<p class="b-kunde">Customer: <span id="bonKunde">'+esc(G.name||'________________')+'</span></p>'
  +'<div class="b-code" aria-hidden="true"></div><p class="b-danke">Thank you for shopping<br>at '+esc(DAT.laden)+'!</p>';
}
function bonSpeichern(bon,K,datum,E){
 const c=document.createElement('canvas'),zeilen=bon.zeilen.length,Wd=420,H=520+zeilen*30;c.width=Wd*2;c.height=H*2;
 const g=c.getContext&&c.getContext('2d');if(!g)return false;
 g.scale(2,2);g.fillStyle='#FFFDF7';g.fillRect(0,0,Wd,H);
 const mono='"JetBrains Mono", ui-monospace, Menlo, monospace';
 let y=46;const mitte=(t,f)=>{g.font=f;g.textAlign='center';g.fillText(t,Wd/2,y);};
 g.fillStyle='#1D2A33';mitte(DAT.laden.toUpperCase(),'800 26px '+mono);y+=24;
 mitte(DAT.adresse,'400 13px '+mono);y+=20;mitte(zeit(datum)+' · Till 1 · '+KASSIERERIN,'400 13px '+mono);y+=18;
 const strich=()=>{g.setLineDash([4,4]);g.strokeStyle='#888';g.beginPath();g.moveTo(24,y);g.lineTo(Wd-24,y);g.stroke();g.setLineDash([]);y+=26;};
 strich();
 const zeile=(l,r,f)=>{g.font=f||'500 15px '+mono;g.textAlign='left';g.fillText(l,28,y);g.textAlign='right';g.fillText(r,Wd-28,y);y+=30;};
 for(const z of bon.zeilen)zeile((z.n>1?z.n+' x ':'')+z.name.toUpperCase(),L.betrag(z.summe));
 strich();zeile('TOTAL',L.betrag(bon.summe),'800 19px '+mono);zeile('CASH',L.betrag(K?K.gezahlt:0));zeile('CHANGE',L.betrag(K?Math.max(0,K.gezahlt-bon.summe):0));strich();
 mitte(aufgabeName(),'600 14px '+mono);y+=34;g.fillStyle='#E0A100';mitte('★'.repeat(E.sterne)+'☆'.repeat(3-E.sterne),'400 30px sans-serif');y+=28;
 g.fillStyle='#1D2A33';mitte('Checkout talk: '+E.richtig+'/'+E.anzahl,'400 13px '+mono);y+=30;
 mitte('Customer: '+(G.name||'________________'),'700 16px '+mono);y+=28;
 for(let i=0;i<60;i++){const b=(i*7919)%5;g.fillRect(70+i*4.6,y,b>2?3:1.5,46);}y+=76;
 mitte('Thank you for shopping','400 14px '+mono);y+=20;mitte('at '+DAT.laden+'!','400 14px '+mono);
 try{const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='kassenbon'+(G.name?'-'+G.name.replace(/[^\wäöüÄÖÜß-]+/g,'_'):'')+'.png';document.body.append(a);a.click();a.remove();}catch(e){return false;}
 return true;
}
function konfetti(host){
 const farben=['#E9573F','#F6BB42','#8CC152','#3BAFDA','#D770AD'];
 for(let i=0;i<40;i++){const s=document.createElement('i');s.className='konfetti';s.style.left=(Math.random()*100)+'%';s.style.background=farben[i%5];
  s.style.animationDelay=(Math.random()*0.6)+'s';s.style.setProperty('--dx',(Math.random()*160-80)+'px');host.append(s);setTimeout(()=>s.remove(),3200);}
}

/* ---------------- Aufgaben 4-6: Recipe mission, Where is ...?, Price detective ---------------- */
const MISSIONEN=['rezept','wo','detektiv'],RUNDEN=5;
function missionStart(art,rnd){
 rnd=rnd||Math.random;const d=laden();
 if(art==='rezept'){const wahl=DAT.REZEPTE.filter(r=>r.id!==d.letztesRezept);const r=wahl[Math.floor(rnd()*wahl.length)];d.letztesRezept=r.id;sichern(d);
  G.mission={art,rezept:r};}
 else{G.mission={art,nr:0,punkte:0,max:art==='wo'?RUNDEN*3:RUNDEN*2,log:[],erledigt:[],rnd};missionRunde();}
}
function missionRunde(){
 const M=G.mission,rnd=M.rnd;
 if(M.art==='wo'){
  let ziel;do{ziel=welt.waren[Math.floor(rnd()*welt.waren.length)];}while(M.erledigt.includes(ziel.id)||M.erledigt.some(id=>welt.byId[id].ort===ziel.ort)&&M.erledigt.length<6);
  M.ziel=ziel;M.kunde=DAT.KUNDEN[M.nr%DAT.KUNDEN.length];M.frage=L.kundenFrage(welt,ziel.id);M.wahl=L.lageOptionen(welt,ziel.id,rnd);
  M.phase='frage';M.rueck='';M.eintrag={frage:M.frage,richtig:M.wahl.richtig,antwort:false,gezeigt:false};
 }else{
  M.raetsel=L.raetsel(welt,rnd,M.erledigt);M.versuche=0;M.rueck='';M.eintrag={text:M.raetsel.text,id:M.raetsel.id,punkte:0};
 }
 zettel();
}
function missionZettel(){
 const M=G.mission,zA=$('zAufgabe');
 if(M.art==='rezept'){
  $('zTitel').textContent=M.rezept.emo+' '+M.rezept.titel;
  $('zInfo').textContent='Lies das Rezept. Was brauchst du dafür? Leg alle Zutaten in den Korb.';
  const n=L.korbAnzahl(G.korb);
  zA.innerHTML='<p class="m-text" lang="en">'+esc(M.rezept.text)+'</p><p class="m-stand">Im Korb: <b>'+n+'</b> '+(n===1?'Sache':'Sachen')+'</p><button id="mKochen" class="primaer">🍳 Fertig – jetzt kochen!</button>';
  $('mKochen').onclick=kochen;
 }else if(M.art==='wo'){
  $('zTitel').textContent='Where is …? · '+(M.nr+1)+'/'+RUNDEN;
  $('zInfo').textContent=M.phase==='frage'?'Du arbeitest im Laden. Wie antwortest du?':'Zeig '+M.kunde.name+' die Ware: Geh hin und tippe darauf.';
  zA.innerHTML='<div class="m-kunde"><span class="m-emo" aria-hidden="true">'+M.kunde.emo+'</span><p lang="en"><small>'+esc(M.kunde.name)+'</small>„'+esc(M.frage)+'“</p></div>'
   +(M.phase==='frage'?'<div class="m-optionen" lang="en">'+M.wahl.optionen.map((o,k)=>'<button data-mopt="'+k+'">'+esc(o)+'</button>').join('')+'</div>'
    :'<p class="m-rueck">'+M.rueck+'</p><p lang="en" class="m-zeig">Show '+M.kunde.sie+' the '+esc(M.ziel.schild.toLowerCase())+'!</p><button id="mWeiter" class="klein">Überspringen →</button>');
  zA.querySelectorAll('[data-mopt]').forEach(b=>b.onclick=()=>woAntwort(M.wahl.optionen[+b.dataset.mopt]));
  if($('mWeiter'))$('mWeiter').onclick=missionWeiter;
 }else{
  $('zTitel').textContent='Price detective · '+(M.nr+1)+'/'+RUNDEN;
  $('zInfo').textContent='Lies das Rätsel, vergleiche die Preisschilder und tippe auf die richtige Ware.';
  zA.innerHTML='<p class="m-text m-raetsel" lang="en">🔍 '+esc(M.raetsel.text)+'</p>'+(M.rueck?'<p class="m-rueck">'+M.rueck+'</p>':'')
   +'<p class="m-stand">'+(M.versuche?'Noch ein Versuch.':'Zwei Versuche.')+' Punkte: <b>'+M.punkte+'</b></p>';
 }
}
function woAntwort(text){
 const M=G.mission;if(!M||M.art!=='wo'||M.phase!=='frage')return false;
 const ok=text===M.wahl.richtig;if(ok){M.punkte+=2;M.eintrag.antwort=true;}ton(ok?'ok':'no');
 M.rueck=ok?'<b class="k-gut">Richtig!</b>':'<b class="k-schlecht">Nicht ganz.</b> Richtig ist: <span lang="en">'+esc(M.wahl.richtig)+'</span>';
 M.phase='zeigen';sprich(M.wahl.richtig);zettel();return ok;
}
function missionWahl(id){
 const M=G.mission;if(!M)return false;schliesseWare();
 const w=welt.byId[id];
 if(M.art==='wo'){
  if(M.phase!=='zeigen')return false;
  if(id===M.ziel.id){M.punkte+=1;M.eintrag.gezeigt=true;ton('ok');meldung(M.kunde.emo+' „Thank you so much!“',2600);sprich('Thank you so much!');missionWeiter();return true;}
  ton('no');meldung('„No, that\'s '+w.en+'. Can you look again?“',3200);return false;
 }
 if(M.art==='detektiv'){
  if(id===M.raetsel.id){const p=M.versuche?1:2;M.punkte+=p;M.eintrag.punkte=p;ton('ok');meldung('🔍 Yes! It\'s '+w.en+'. Great detective work!',3000);missionWeiter();return true;}
  M.versuche++;ton('no');
  if(M.versuche>=2){meldung('Leider nicht. Gesucht war: '+L.gross(welt.byId[M.raetsel.id].en)+'.',3600);missionWeiter();return false;}
  M.rueck='<span lang="en">No – that\'s '+esc(w.en)+' ('+L.preis(w.p)+').</span> Lies das Rätsel noch einmal.';zettel();return false;
 }
 return false;
}
function missionWeiter(){
 const M=G.mission;if(!M)return false;
 M.log.push(M.eintrag);M.erledigt.push(M.art==='wo'?M.ziel.id:M.raetsel.id);M.nr++;
 if(M.nr>=RUNDEN)return missionEnde();
 missionRunde();if(M.art==='wo')setTimeout(vorlesen,500);return true;
}
function kochen(){
 if(!L.korbAnzahl(G.korb)){meldung('Dein Korb ist noch leer.');return false;}
 return missionEnde();
}
function markiere(text,zutaten){
 let h=esc(text);
 for(const z of zutaten){const re=new RegExp('\\b('+z.wort.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i');h=h.replace(re,'<mark class="'+(z.ok?'ok':'nein')+'">$1</mark>');}
 return h;
}
function missionEnde(){
 if(window.speechSynthesis)try{speechSynthesis.cancel();}catch(e){}
 const M=G.mission;schliesseWare();
 let anteil,inhalt;
 if(M.art==='rezept'){
  const st=L.rezeptStand(welt,M.rezept,G.korb);anteil=st.anteil;M.stand=st;
  inhalt='<section class="e-karte"><h2>'+M.rezept.emo+' '+esc(M.rezept.titel)+' <small>('+esc(M.rezept.de)+')</small></h2>'
   +'<ul class="e-liste">'+st.zutaten.map(z=>'<li class="'+(z.ok?'ok':'nein')+'"><span>'+(z.ok?'✓':'✗')+'</span><span lang="en">'+esc(welt.byId[z.id].en)+'</span><small>'+(z.ok?esc(welt.byId[z.id].de):'fehlt')+'</small></li>').join('')
   +st.extra.map(e=>'<li class="nein"><span>✗</span><span lang="en">'+esc(L.menge(welt.byId[e.id],e.n))+'</span><small>nicht im Rezept</small></li>').join('')+'</ul>'
   +'<h3>Das Rezept</h3><p class="e-rezept" lang="en">'+markiere(M.rezept.text,st.zutaten)+'</p></section>';
 }else if(M.art==='wo'){
  anteil=M.punkte/M.max;
  inhalt='<section class="e-karte"><h2>Where is …? · '+M.punkte+' / '+M.max+' Punkte</h2><ul class="e-saetze" lang="en">'
   +M.log.map(e=>'<li class="'+(e.antwort&&e.gezeigt?'gut':'')+'"><b>'+esc(e.frage)+'</b><br>'+esc(e.richtig)+'<br><small lang="de">'+(e.antwort?'✓ Antwort':'✗ Antwort')+' · '+(e.gezeigt?'✓ gezeigt':'✗ nicht gezeigt')+'</small></li>').join('')+'</ul></section>';
 }else{
  anteil=M.punkte/M.max;
  inhalt='<section class="e-karte"><h2>Price detective · '+M.punkte+' / '+M.max+' Punkte</h2><ul class="e-saetze" lang="en">'
   +M.log.map(e=>'<li class="'+(e.punkte?'gut':'')+'">'+esc(e.text)+'<br><b>→ '+esc(L.gross(welt.byId[e.id].en))+' ('+L.preis(welt.byId[e.id].p)+')</b> <small lang="de">'+(e.punkte===2?'✓ sofort':e.punkte===1?'✓ im 2. Versuch':'✗')+'</small></li>').join('')+'</ul></section>';
 }
 const st=L.sterne(anteil);G.ergebnis={sterne:st,anteil};G.zustand='ende';
 const d=laden();d.best=d.best||{};if(st>(d.best[G.modus]||0))d.best[G.modus]=st;d.einkaeufe=(d.einkaeufe||0)+1;sichern(d);
 const o=$('over');if(!o)return true;
 o.innerHTML='<div class="e-kopf"><h1 tabindex="-1">'+(st===3?'Brilliant!':st===2?'Well done!':'Good try!')+'</h1>'
  +'<p class="e-sterne" aria-label="'+st+' von 3 Sternen">'+'★'.repeat(st)+'<span>'+'★'.repeat(3-st)+'</span></p></div>'
  +'<div class="e-einzeln">'+inhalt+'<p class="e-knoepfe mitte"><button id="nochmal" class="primaer">Noch eine Runde</button> <button id="zumMenu" class="zweit">Zum Menü</button></p></div>';
 zeige('over');$('nochmal').onclick=()=>start(G.modus);$('zumMenu').onclick=menu;
 if(st===3)konfetti(o);o.querySelector('h1').focus();
 return true;
}

/* ---------------- Team-Duell ---------------- */
function duellStart(rnd){
 const n=+($('runden')?$('runden').value:4)||4,frist=+($('frist')?$('frist').value:90)||90;
 const namen=[($('team1')&&$('team1').value.trim())||'Team Red',($('team2')&&$('team2').value.trim())||'Team Blue'];
 G.duell={teams:namen.map(name=>({name,punkte:0})),runden:n,frist,rest:frist,hoeren:!!($('duellHoeren')&&$('duellHoeren').checked),
  aufgaben:L.duellAufgaben(welt,2*n,rnd),nr:0,phase:'ansage',ziel:null,letzte:null,rnd:rnd||Math.random,aktiv:0,split:false};
 if($('duellSplit')&&$('duellSplit').checked){
  if(padLesen().length>=2){G.split=true;G.duell.split=true;G.p.x=4.3;G.p2={x:5.7,z:welt.START.z,yaw:welt.START.yaw,pitch:0};G.sperre=[0,0];G.hover2=null;}
  else meldung('Für den geteilten Bildschirm braucht es zwei verbundene Controller (je eine Taste drücken). Das Duell läuft jetzt abwechselnd.',6000);
 }
 document.body.classList.toggle('split',G.split);
 duellAnzeige();duellAnsage();
}
function duellAnzeige(){
 const D=G.duell;if(!D)return;
 document.querySelectorAll('#duell .d-team').forEach(el=>{const t=D.teams[+el.dataset.team];el.querySelector('.d-name').textContent=t.name;el.querySelector('.d-punkte').textContent=t.punkte;el.classList.toggle('dran',!D.split&&+el.dataset.team===D.nr%2);});
 D.teams.forEach((t,i)=>{const n=$('halbName'+i);if(n)n.textContent=t.name;});
 $('dUhr').textContent=Math.ceil(D.rest);$('dUhr').classList.toggle('knapp',D.phase==='suche'&&D.rest<=15);
 $('dRunde').textContent=D.split?'Runde '+(D.nr+1)+'/'+2*D.runden:'Runde '+(Math.floor(D.nr/2)+1)+'/'+D.runden;
 const a=$('dAuftrag');
 if(a){a.hidden=D.phase!=='suche';if(D.phase==='suche')a.innerHTML=D.hoeren?'<button id="dHoer" class="klein">🔊 Find … (nochmal hören)</button>':'Find <b>'+esc(D.ziel.en)+'</b>';
  if($('dHoer'))$('dHoer').onclick=vorlesen;}
}
function duellAnsage(){
 const D=G.duell,box=$('ansage');D.phase='ansage';D.ziel=D.aufgaben[D.nr];D.rest=D.frist;
 D.aktiv=D.split?null:D.nr%2;G.zustand='duell';
 const teamName=D.split?D.teams.map(t=>t.name).join(' gegen '):D.teams[D.aktiv].name;
 if(box){box.innerHTML='<div class="a-karte"><p class="a-runde">Runde '+(D.split?(D.nr+1)+' von '+2*D.runden:(Math.floor(D.nr/2)+1)+' von '+D.runden)+'</p><p class="a-team">'+esc(teamName)+'</p>'
  +'<p class="a-auftrag" lang="en">'+(D.hoeren?'🎧 Listen carefully!':'Find '+esc(D.ziel.en)+'!')+'</p>'
  +(D.hoeren?'<p><button id="aHoer" class="zweit">🔊 Anhören</button></p>':'')
  +'<button id="aLos" class="primaer gross">Los geht’s! ⏱ '+D.frist+' s</button></div>';
  box.hidden=false;$('aLos').onclick=duellLos;if($('aHoer'))$('aHoer').onclick=vorlesen;}
 if(D.hoeren)setTimeout(vorlesen,300);
 duellAnzeige();
}
function duellLos(){const D=G.duell;if(!D||D.phase!=='ansage')return false;D.phase='suche';$('ansage').hidden=true;duellAnzeige();return true;}
function duellWahl(id){
 const D=G.duell;if(!D||D.phase!=='suche')return false;
 schliesseWare();
 if(id===D.ziel.id){const p=L.duellPunkte(D.rest,D.frist);D.teams[D.aktiv].punkte+=p;D.letzte={ok:true,punkte:p};ton('ok');duellBonus();}
 else{D.letzte={ok:false,punkte:0,id};ton('no');duellErgebnis();}
 return true;
}
function duellBonus(){
 const D=G.duell,box=$('ansage');D.phase='bonus';
 const K=DAT.KASSE,arten=['gruss','tuete','frage','bon','tschuess'],art=arten[Math.floor(D.rnd()*arten.length)],v=K[art][Math.floor(D.rnd()*K[art].length)];
 const opt=L.mischen(v.ant,D.rnd);D.bonus={richtig:v.ant[0],warum:v.warum};
 if(box){box.innerHTML='<div class="a-karte">'+(D.split?'<p class="a-team">'+esc(D.teams[D.aktiv].name)+'</p>':'')+'<p class="a-gut">✔ Richtig! +'+D.letzte.punkte+'</p><p class="a-runde">Bonusfrage: +50</p>'
  +(art==='frage'?'<p class="a-de">'+esc(v.de)+'</p>':'<p class="a-auftrag" lang="en">„'+esc(v.sagt)+'“</p><p class="a-de">Was antwortest du?</p>')
  +'<div class="k-optionen" lang="en">'+opt.map(o=>'<button data-bonus="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div></div>';
  box.hidden=false;box.querySelectorAll('[data-bonus]').forEach(b=>b.onclick=()=>duellBonusAntwort(b.dataset.bonus));}
 duellAnzeige();
}
function duellBonusAntwort(text){
 const D=G.duell;if(!D||D.phase!=='bonus')return false;
 const ok=text===D.bonus.richtig;if(ok){D.teams[D.aktiv].punkte+=50;D.letzte.punkte+=50;}D.letzte.bonus=ok;ton(ok?'ok':'no');
 duellErgebnis();return ok;
}
function duellErgebnis(){
 const D=G.duell,box=$('ansage'),l=D.letzte||{ok:false,punkte:0};D.phase='ergebnis';
 const naechstes=D.nr+1<2*D.runden;
 let txt;
 if(l.ok)txt='<p class="a-gut">+'+l.punkte+' Punkte</p>'+(l.bonus===undefined?'':l.bonus?'<p>Bonusfrage richtig! 🎉</p>':'<p>Bonusfrage: <span lang="en">„'+esc(D.bonus.richtig)+'“</span> wäre richtig gewesen.</p>');
 else if(l.zeit)txt='<p class="a-schlecht">⏱ Die Zeit ist um!</p><p lang="en">'+esc(L.gross(D.ziel.en))+': '+esc(L.wo(welt,D.ziel.id))+'</p>';
 else txt='<p class="a-schlecht">✗ Leider nicht.</p><p lang="en">That\'s '+esc(welt.byId[l.id].en)+'.<br>'+esc(L.gross(D.ziel.en))+': '+esc(L.wo(welt,D.ziel.id))+'</p>';
 if(box){box.innerHTML='<div class="a-karte"><p class="a-team">'+esc(D.aktiv==null?'Beide Teams':D.teams[D.aktiv].name)+'</p>'+txt
  +'<button id="aWeiter" class="primaer gross">'+(naechstes?(D.split?'Nächste Runde →':'Weiter: '+esc(D.teams[(D.nr+1)%2].name)):'Zum Ergebnis 🏆')+'</button></div>';
  box.hidden=false;$('aWeiter').onclick=duellWeiter;}
 duellAnzeige();
}
function duellWeiter(){const D=G.duell;if(!D||D.phase!=='ergebnis')return false;D.nr++;if(D.nr>=2*D.runden)return duellEnde();duellAnsage();return true;}
function duellZeitAus(){const D=G.duell;D.rest=0;D.letzte={ok:false,punkte:0,zeit:true};schliesseWare();ton('no');duellErgebnis();}
function duellEnde(){
 const D=G.duell;G.zustand='ende';$('ansage').hidden=true;
 const [a,b]=D.teams,sieg=a.punkte===b.punkte?null:a.punkte>b.punkte?a:b;
 const o=$('over');
 o.innerHTML='<div class="e-kopf"><p class="pokal" aria-hidden="true">🏆</p><h1 tabindex="-1">'+(sieg?esc(sieg.name)+' wins!':'It\'s a draw!')+'</h1></div>'
  +'<div class="e-duell">'+D.teams.map(t=>'<div class="'+(t===sieg?'sieg':'')+'"><span>'+esc(t.name)+'</span><b>'+t.punkte+'</b></div>').join('')+'</div>'
  +'<p class="e-knoepfe mitte"><button id="nochmal" class="primaer">Noch ein Duell</button> <button id="zumMenu" class="zweit">Zum Menü</button></p>';
 zeige('over');$('nochmal').onclick=()=>start('duell');$('zumMenu').onclick=menu;konfetti(o);o.querySelector('h1').focus();
}

/* ---------------- Controller (PlayStation, Xbox, ... ueber die Gamepad-Schnittstelle) ----------------
   Standard-Belegung: 0 = Kreuz/A, 1 = Kreis/B, 2 = Quadrat/X, 3 = Dreieck/Y, 4/5 = L1/R1 (LB/RB),
   8 = Share/View, 9 = Options/Menu, 12-15 = Steuerkreuz. In Fenstern waehlt das Steuerkreuz,
   Kreuz/A bestaetigt. Im Laden laeuft man mit dem linken Stick und sieht sich mit dem rechten um. */
const KN={A:0,B:1,X:2,Y:3,LB:4,RB:5,SELECT:8,START:9,HOCH:12,RUNTER:13,LINKS:14,RECHTS:15};
const uhr=()=>(typeof performance!=='undefined'?performance.now():Date.now())/1000;
let padQuelle=()=>{try{return navigator.getGamepads?[...navigator.getGamepads()]:[];}catch(e){return [];}};
const PAD={alt:new Map(),stand:[],fokus:null,fokusZeit:0,bereich:undefined,anzahl:-1};
const tot=v=>Math.abs(v||0)<0.2?0:(v-Math.sign(v)*0.2)/0.8;
function padLesen(){
 const liste=(padQuelle()||[]).filter(p=>p&&p.connected!==false&&p.buttons).sort((a,b)=>a.index-b.index);
 PAD.stand=liste.map(p=>{
  const alt=PAD.alt.get(p.index)||[],halt=new Set(),neu=new Set();
  const jetzt=[...p.buttons].map(b=>!!(b&&(b.pressed||b.value>0.5)));
  jetzt.forEach((d,i)=>{if(d){halt.add(i);if(!alt[i])neu.add(i);}});PAD.alt.set(p.index,jetzt);
  const a=p.axes||[];return {index:p.index,lx:tot(a[0]),ly:tot(a[1]),rx:tot(a[2]),ry:tot(a[3]),halt,neu};});
 return PAD.stand;
}
function padSumme(liste){
 const s={lx:0,ly:0,rx:0,ry:0,halt:new Set(),neu:new Set()},k=v=>Math.max(-1,Math.min(1,v));
 for(const p of liste){s.lx=k(s.lx+p.lx);s.ly=k(s.ly+p.ly);s.rx=k(s.rx+p.rx);s.ry=k(s.ry+p.ry);p.halt.forEach(i=>s.halt.add(i));p.neu.forEach(i=>s.neu.add(i));}
 return s;
}
const DIALOGE=['kasse','ansage','ware','korb','grosskarte'];
function padBereich(){
 if($('stage')&&!$('stage').hidden){for(const id of DIALOGE){const e=$(id);if(e&&!e.hidden)return e;}return null;}
 if($('over')&&!$('over').hidden)return $('over');
 if($('menu')&&!$('menu').hidden)return $('menu');
 return null;
}
const sichtbar=e=>!!e&&!e.disabled&&!e.closest('[hidden]');
function padZiele(b){return b?[...b.querySelectorAll('button,input,select,summary,a[href]')].filter(sichtbar):[];}
function padStandard(b){const z=padZiele(b);return z.find(e=>e.matches('.primaer'))||z.find(e=>e.matches('[data-opt],[data-mopt],[data-bonus],[data-geld],[data-modus]'))||z[0]||null;}
function padFokus(e){
 document.querySelectorAll('.pad-fokus').forEach(x=>x.classList.remove('pad-fokus'));
 PAD.fokus=e||null;PAD.fokusZeit=uhr();
 if(e){e.classList.add('pad-fokus');try{e.focus({preventScroll:true});}catch(_){}try{e.scrollIntoView&&e.scrollIntoView({block:'nearest'});}catch(_){}}
}
function padSchritt(liste,d){if(!liste.length)return;let i=liste.indexOf(PAD.fokus);if(i<0)i=d>0?-1:liste.length;padFokus(liste[(i+d+liste.length)%liste.length]);}
function padZurueck(b){
 if(b.id==='ware')schliesseWare();
 else if(b.id==='korb'||b.id==='grosskarte')b.hidden=true;
}
function padAnzeige(n){
 if(n===PAD.anzahl)return;PAD.anzahl=n;
 const el=$('padStatus');if(el){el.textContent=n?'🎮 '+n+' Controller verbunden'+(n>=2?' – geteilter Bildschirm im Team duel möglich.':'.'):'🎮 Kein Controller erkannt. Controller per Bluetooth koppeln und eine Taste drücken.';el.classList.toggle('an',n>0);}
 const sp=$('duellSplit');if(sp)sp.closest('label').classList.toggle('aus',n<2);
}
function padTick(){
 const P=padLesen();padAnzeige(P.length);
 if(!P.length)return;
 const S=padSumme(P),neu=S.neu,b=padBereich();
 if(b!==PAD.bereich){PAD.bereich=b;padFokus(b&&b.id!=='menu'&&b.id!=='over'||b&&neu.size?padStandard(b):null);return;}
 if(b){
  const z=padZiele(b);
  if(PAD.fokus&&(!b.contains(PAD.fokus)||!sichtbar(PAD.fokus)))padFokus(b.id==='menu'||b.id==='over'?null:padStandard(b));
  const hoch=neu.has(KN.HOCH)||neu.has(KN.LINKS)||neu.has(KN.LB),runter=neu.has(KN.RUNTER)||neu.has(KN.RECHTS)||neu.has(KN.RB);
  if((hoch||runter)&&!PAD.fokus){padFokus(padStandard(b));return;}
  if(hoch)padSchritt(z,-1);
  if(runter)padSchritt(z,1);
  if(neu.has(KN.A)){if(PAD.fokus){const f=PAD.fokus;f.click();}else padFokus(padStandard(b));}
  if(neu.has(KN.B))padZurueck(b);
  if(neu.has(KN.START)&&b.id==='grosskarte')b.hidden=true;
  return;
 }
 /* im Laden, kein Fenster offen */
 if(G.split&&G.duell&&G.duell.phase==='suche'){P.slice(0,2).forEach((p,i)=>{if(p.neu.has(KN.A))splitNehmen(i);});return;}
 const hud=padZiele($('stage')).filter(e=>e.closest('#zAufgabe')||e.id==='zurKasse');
 if(neu.has(KN.LB)||neu.has(KN.RB))padSchritt(hud,neu.has(KN.RB)?1:-1);
 if(neu.has(KN.A)){
  if(PAD.fokus&&hud.includes(PAD.fokus)&&uhr()-PAD.fokusZeit<6){const f=PAD.fokus;padFokus(null);f.click();}
  else if(G.zustand==='laden'||G.zustand==='frei'||(G.duell&&G.duell.phase==='suche'))nehmenMitte();
 }
 if(neu.has(KN.Y)&&$('korbKnopf')&&!$('korbKnopf').hidden)zeigeKorb();
 if(neu.has(KN.X))vorlesen();
 if(neu.has(KN.START))$('grosskarte').hidden=false;
}
function padSchleife(){try{padTick();}catch(e){}requestAnimationFrame(padSchleife);}

/* Geteilter Bildschirm: jedes Team nimmt mit Kreuz/A die Ware in seiner Bildmitte */
function splitNehmen(i){
 const D=G.duell;if(!D||!D.split||D.phase!=='suche')return false;
 if(uhr()<G.sperre[i])return false;
 const p=i?G.p2:G.p,h=L.blickTreffer(welt,p,GREIF);
 if(!h){halbMeldung(i,'Schau direkt auf eine Ware und geh nah heran.');return false;}
 if(h.platz.id===D.ziel.id){D.aktiv=i;return duellWahl(h.platz.id);}
 G.sperre[i]=uhr()+3;ton('no');halbMeldung(i,'✗ That\'s '+welt.byId[h.platz.id].en+'. 3 Sekunden Pause!');
 return false;
}
const halbUhr=[null,null];
function halbMeldung(i,text){const m=$('halb'+i);if(!m)return;m.textContent=text;m.hidden=false;clearTimeout(halbUhr[i]);halbUhr[i]=setTimeout(()=>{m.hidden=true;},2800);}

/* ---------------- Bewegung ---------------- */
function laufe(p,vor,seit,dt){
 const m=Math.hypot(vor,seit);if(m>1){vor/=m;seit/=m;}
 if(m<=0.02)return 0;
 const fx=Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=Math.sin(p.yaw);
 const x0=p.x,z0=p.z;
 L.bewegen(welt,p,(fx*vor+rx*seit)*TEMPO*dt,(fz*vor+rz*seit)*TEMPO*dt);
 return Math.hypot(p.x-x0,p.z-z0);
}
/* Controller-Achsen und Steuerkreuz auf eine Spielfigur */
function padLaufen(p,c,dt){
 if(!c)return 0;
 const h=c.halt,vor=-c.ly+(h.has(KN.HOCH)?1:0)-(h.has(KN.RUNTER)?1:0),seit=c.lx;
 p.yaw+=(c.rx*2.4+((h.has(KN.RECHTS)?1:0)-(h.has(KN.LINKS)?1:0))*DREH)*dt;
 p.pitch=Math.max(-1.0,Math.min(0.9,p.pitch-c.ry*1.7*dt));
 return laufe(p,vor,seit,dt);
}
function update(dt,inp){
 inp=inp||eingabe;
 const D=G.duell;
 if(D&&D.phase==='suche'){D.rest-=Math.min(dt,0.5);if(D.rest<=0)duellZeitAus();}
 dt=Math.min(dt,0.05);G.t+=dt;
 const laufen=G.zustand==='laden'||G.zustand==='frei'||(D&&D.phase==='suche');
 if(!laufen)return;
 const p=G.p,k=inp.keys||new Set(),pad=inp.pad||new Set();
 let vor=(k.has('w')||k.has('arrowup')||pad.has('vor')?1:0)-(k.has('s')||k.has('arrowdown')||pad.has('zurueck')?1:0)-(inp.stick?inp.stick.y:0);
 let seit=(k.has('d')?1:0)-(k.has('a')?1:0)+(inp.stick?inp.stick.x:0);
 const dreh=(k.has('arrowright')||pad.has('rechts')?1:0)-(k.has('arrowleft')||pad.has('links')?1:0);
 p.yaw+=dreh*DREH*dt;
 if(inp.look){p.yaw+=inp.look.x;p.pitch=Math.max(-1.0,Math.min(0.9,p.pitch-inp.look.y));inp.look.x=0;inp.look.y=0;}
 if(pad.size&&!inp.look.y)p.pitch*=Math.pow(0.1,dt);
 let s=laufe(p,vor,seit,dt);
 /* Controller: ohne geteilten Bildschirm steuern alle Controller dieselbe Figur */
 const frei=!padBereich(),jetzt=uhr();
 if(PAD.stand.length&&frei){
  if(G.split){
   if(jetzt>=G.sperre[0])s+=padLaufen(p,PAD.stand[0],dt);
   if(jetzt>=G.sperre[1]&&G.p2)padLaufen(G.p2,PAD.stand[1],dt);
  }else s+=padLaufen(p,padSumme(PAD.stand),dt);
 }
 G.gelaufen+=s;G.schritt+=s;
 const h=L.blickTreffer(welt,p,GREIF);G.hover=h?h.platz:null;
 if(G.split&&G.p2){const h2=L.blickTreffer(welt,G.p2,GREIF);G.hover2=h2?h2.platz:null;}
}
function nehmenMitte(){const h=L.blickTreffer(welt,G.p,GREIF);if(h)return oeffneWare(h.platz.id);meldung('Schau direkt auf eine Ware und geh nah heran.');return false;}

/* ---------------- Karte ---------------- */
let plan=null;
function grundriss(){
 if(plan)return plan;
 if(typeof document==='undefined')return null;
 const k=24,c=document.createElement('canvas');c.width=welt.W*k;c.height=welt.D*k;
 const g=c.getContext&&c.getContext('2d');if(!g)return null;
 g.fillStyle='#EFE8DA';g.fillRect(0,0,c.width,c.height);
 g.fillStyle='#E2D8C6';for(let x=0;x<welt.W;x+=2)for(let z=(x/2)%2*2;z<welt.D;z+=4)g.fillRect(x*k,z*k,2*k,2*k);
 const r=(x1,z1,x2,z2,f)=>{g.fillStyle=f;g.fillRect(x1*k,z1*k,(x2-x1)*k,(z2-z1)*k);};
 for(const h of welt.hin){if(h.art==='wand'||h.art==='tuerfeld')continue;r(h.x1,h.z1,h.x2,h.z2,h.art==='kasse'?'#56616B':h.art==='kabine'?'#8C97A1':'#B9AF9D');}
 for(const p of welt.plaetze)r(p.x1,p.z1,p.x2,p.z2,L.ORTFARBE[p.ort]);
 for(const p of welt.plaetze){g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;g.strokeRect(p.x1*k+1,p.z1*k+1,(p.x2-p.x1)*k-2,(p.z2-p.z1)*k-2);}
 r(welt.TUER.x1,welt.D-0.35,welt.TUER.x2,welt.D,'#3BAFDA');
 g.fillStyle='#1D2A33';g.textAlign='center';g.textBaseline='middle';
 for(const a of welt.GAENGE){g.font='800 30px Inter, system-ui, sans-serif';g.fillText(String(a.nr),a.x*k,9.5*k);}
 g.font='700 19px Inter, system-ui, sans-serif';
 const t=(s,x,z,rot)=>{g.save();g.translate(x*k,z*k);if(rot)g.rotate(rot);g.fillText(s,0,0);g.restore();};
 t('Fruit',2.1,9,-Math.PI/2);t('Veg',5.1,9,-Math.PI/2);t('Dairy & Meat',14.5,1.6);t('Frozen',28.2,9,Math.PI/2);t('Bakery',8.3,9.5,-Math.PI/2);
 t('Checkout',18.5,22.2);t('Entrance',5,23.2);
 return plan={c,k};
}
function zeichneKarte(cv,gross){
 if(!cv||!cv.getContext)return;const g=cv.getContext('2d');if(!g)return;
 const dpr=window.devicePixelRatio||1,Wc=cv.clientWidth||180,Hc=cv.clientHeight||144;
 if(cv.width!==Math.round(Wc*dpr)){cv.width=Math.round(Wc*dpr);cv.height=Math.round(Hc*dpr);}
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,Wc,Hc);
 const P=grundriss();if(!P)return;
 const sk=Math.min(Wc/welt.W,Hc/welt.D),ox=(Wc-welt.W*sk)/2,oy=(Hc-welt.D*sk)/2;
 g.fillStyle='#1D2A33';g.fillRect(0,0,Wc,Hc);
 g.drawImage(P.c,ox,oy,welt.W*sk,welt.D*sk);
 if(G.ware||G.hover){const pl=welt.plaetze.find(p=>p.id===(G.ware?G.ware.id:G.hover.id));if(pl){g.strokeStyle='#FFC845';g.lineWidth=gross?4:2;g.strokeRect(ox+pl.x1*sk,oy+pl.z1*sk,(pl.x2-pl.x1)*sk,(pl.z2-pl.z1)*sk);}}
 const figuren=G.split&&G.p2?[[G.p,'#E9573F'],[G.p2,'#1F78B4']]:[[G.p,'#E9573F']];
 for(const [p,farbe] of figuren){g.save();g.translate(ox+p.x*sk,oy+p.z*sk);g.rotate(p.yaw);
  g.fillStyle='rgba(255,200,69,.35)';g.beginPath();g.moveTo(0,0);g.arc(0,0,gross?60:22,-Math.PI/2-0.55,-Math.PI/2+0.55);g.closePath();g.fill();
  const s=gross?1.8:1;g.fillStyle=farbe;g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(0,-8*s);g.lineTo(6*s,6*s);g.lineTo(0,3*s);g.lineTo(-6*s,6*s);g.closePath();g.fill();g.stroke();g.restore();}
}

/* ---------------- 3D und Schleife ---------------- */
let R=null,laeuft=false,zuletzt=0;
const beruehrung=typeof window!=='undefined'&&('ontouchstart' in window||(navigator.maxTouchPoints||0)>0);
function starte3d(){
 if(R||!window.ShopRender)return;
 try{R=window.ShopRender.init($('welt'),welt,{mobil:beruehrung,profi:G.profi});const l=$('laden');if(l)l.hidden=true;}
 catch(e){const l=$('laden');if(l){l.hidden=false;l.textContent='3D lässt sich auf diesem Gerät nicht starten.';}return;}
 if(!laeuft&&typeof requestAnimationFrame==='function'){laeuft=true;zuletzt=performance.now();requestAnimationFrame(schleife);}
}
window.addEventListener('shoprender',()=>{if(G.zustand!=='menu')starte3d();});
function hinweis(){
 if(G.split){[G.hover,G.hover2].forEach((hv,i)=>{const e=$(i?'hinweis2':'hinweis');if(!e)return;const an=!!hv&&G.duell&&G.duell.phase==='suche';e.hidden=!an;if(!an)return;
  const txt=L.preis(welt.byId[hv.id].p);if(e.dataset.t!==txt){e.dataset.t=txt;e.innerHTML='<span lang="en">'+esc(txt)+'</span><small>✕ / A = nehmen</small>';}});return;}
 const h=$('hinweis');if(!h)return;
 const zeigen=G.hover&&!G.ware&&(G.zustand==='laden'||G.zustand==='frei'||(G.duell&&G.duell.phase==='suche'));
 h.hidden=!zeigen;if(!zeigen)return;
 const w=welt.byId[G.hover.id],txt=(G.profi||G.modus==='duell'?'':w.schild+' · ')+L.preis(w.p)+(w.menge?' each':'');
 const wie=PAD.stand.length?'✕ / A':beruehrung?'antippen':'klicken oder E';
 if(h.dataset.t!==txt+wie){h.dataset.t=txt+wie;h.innerHTML='<span lang="en">'+esc(txt)+'</span><small>'+wie+'</small>';}
}
function schleife(jetzt){
 const dt=(jetzt-zuletzt)/1000;zuletzt=jetzt;
 if(G.zustand!=='menu'&&G.zustand!=='ende'){
  update(dt);
  const kb=$('zurKasse');if(kb){const an=G.zustand==='laden'&&(G.modus==='liste'||G.modus==='hoeren'||G.modus==='budget')&&L.inKassenZone(welt,G.p);kb.hidden=!an;}
  if(G.duell){const u=$('dUhr'),v=String(Math.ceil(Math.max(0,G.duell.rest)));if(u&&u.textContent!==v){u.textContent=v;u.classList.toggle('knapp',G.duell.phase==='suche'&&G.duell.rest<=15);}}
  hinweis();
  if(R&&G.split&&G.p2)R.frame({t:G.t,views:[{x:G.p.x,z:G.p.z,yaw:G.p.yaw,pitch:G.p.pitch,hover:G.hover},{x:G.p2.x,z:G.p2.z,yaw:G.p2.yaw,pitch:G.p2.pitch,hover:G.hover2}]});
  else if(R)R.frame({x:G.p.x,z:G.p.z,yaw:G.p.yaw,pitch:G.p.pitch,t:G.t,bob:Math.sin(G.schritt*5.2)*0.03,hover:G.ware?welt.plaetze.find(p=>p.id===G.ware.id):G.hover});
  zeichneKarte($('karte'));
  if(!$('grosskarte').hidden)zeichneKarte($('grosskarte').querySelector('canvas'),true);
 }
 requestAnimationFrame(schleife);
}

/* ---------------- Eingabe ---------------- */
function tippen(cx,cy){
 const cv=$('welt'),r=cv.getBoundingClientRect(),w=r.width||1,h=r.height||1;
 const s=L.strahl(G.p,((cx-r.left)/w)*2-1,-(((cy-r.top)/h)*2-1),FOV,w/h);
 const t=L.treffer(welt,s.o,s.d,12);
 if(!t)return false;
 if(t.t>GREIF){meldung('Geh näher heran!');return false;}
 return oeffneWare(t.platz.id);
}
function binden(){
 const cv=$('welt');if(!cv)return;
 const tasten=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
 addEventListener('keydown',e=>{
  if(G.zustand==='menu'||G.zustand==='ende')return;
  if(e.target&&/input|select|textarea/i.test(e.target.tagName))return;
  const k=e.key.toLowerCase();
  if(tasten.includes(k)){eingabe.keys.add(k);e.preventDefault();}
  if(k==='escape'){schliesseWare();$('korb').hidden=true;$('grosskarte').hidden=true;}
  if((k==='e'||k==='enter')&&!G.ware&&document.activeElement===document.body){nehmenMitte();e.preventDefault();}
  if(k==='m')$('grosskarte').hidden=!$('grosskarte').hidden;
 });
 addEventListener('keyup',e=>eingabe.keys.delete(e.key.toLowerCase()));
 addEventListener('blur',()=>{eingabe.keys.clear();eingabe.pad.clear();});
 const zeiger=new Map(),knauf=$('stick');
 cv.addEventListener('pointerdown',e=>{
  const links=e.pointerType!=='mouse'&&e.clientX<innerWidth*0.4;
  zeiger.set(e.pointerId,{rolle:links?'stick':'blick',x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,t0:performance.now(),weg:0});
  if(links&&knauf){knauf.hidden=false;knauf.style.left=e.clientX+'px';knauf.style.top=e.clientY+'px';knauf.firstElementChild.style.transform='';}
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
 });
 cv.addEventListener('pointermove',e=>{const z=zeiger.get(e.pointerId);if(!z)return;
  z.weg+=Math.hypot(e.clientX-z.x,e.clientY-z.y);
  if(z.rolle==='stick'){const dx=e.clientX-z.x0,dy=e.clientY-z.y0,m=Math.hypot(dx,dy),r=50,f=m>r?r/m:1;
   eingabe.stick.x=dx*f/r;eingabe.stick.y=dy*f/r;if(knauf)knauf.firstElementChild.style.transform='translate('+dx*f+'px,'+dy*f+'px)';}
  else{const sk=e.pointerType==='mouse'?0.0045:0.0065;eingabe.look.x+=(e.clientX-z.x)*sk;eingabe.look.y+=(e.clientY-z.y)*sk;}
  z.x=e.clientX;z.y=e.clientY;});
 const los=e=>{const z=zeiger.get(e.pointerId);if(!z)return;zeiger.delete(e.pointerId);
  if(z.rolle==='stick'){eingabe.stick.x=0;eingabe.stick.y=0;if(knauf)knauf.hidden=true;}
  if(e.type==='pointerup'&&z.weg<12&&performance.now()-z.t0<450)tippen(e.clientX,e.clientY);};
 cv.addEventListener('pointerup',los);cv.addEventListener('pointercancel',los);
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 /* Steuerkreuz: halten = laufen bzw. drehen */
 document.querySelectorAll('#steuer [data-pad]').forEach(b=>{
  const k=b.dataset.pad;
  if(k==='nehmen'){b.onclick=nehmenMitte;return;}
  const an=e=>{eingabe.pad.add(k);b.classList.add('an');e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}};
  const aus=()=>{eingabe.pad.delete(k);b.classList.remove('an');};
  b.addEventListener('pointerdown',an);b.addEventListener('pointerup',aus);b.addEventListener('pointercancel',aus);b.addEventListener('lostpointercapture',aus);
 });
 $('quit').onclick=menu;
 $('vorlesen').onclick=vorlesen;
 $('woerterKnopf').onclick=()=>{const w=$('woerter');w.hidden=!w.hidden;$('woerterKnopf').setAttribute('aria-expanded',String(!w.hidden));};
 $('falten').onclick=()=>{const b=$('zettel');b.classList.toggle('zu');const zu=b.classList.contains('zu');$('falten').textContent=zu?'▾':'▴';$('falten').setAttribute('aria-label',zu?'Liste aufklappen':'Liste zuklappen');};
 $('zListe').addEventListener('click',e=>{const h=e.target.closest('[data-hoer]');if(h){const z=G.liste[+h.dataset.hoer];if(z)sprich(z.text,0.8);}
  const w=e.target.closest('[data-wo]');if(w)meldung(L.gross(welt.byId[w.dataset.wo].en)+' – '+L.wo(welt,w.dataset.wo),4200);});
 $('korbKnopf').onclick=()=>{if($('korb').hidden)zeigeKorb();else $('korb').hidden=true;};
 $('zurKasse').onclick=()=>kasseOeffnen();
 $('karte').onclick=()=>{$('grosskarte').hidden=false;};
 $('grosskarte').onclick=()=>{$('grosskarte').hidden=true;};
 addEventListener('resize',()=>{if(R)R.resize();});
 document.querySelectorAll('[data-modus]').forEach(b=>b.onclick=()=>start(b.dataset.modus));
 if($('heldBild')&&window.ShopBild)try{window.ShopBild($('heldBild'));}catch(e){}
}
einstellungenLaden();binden();menu();
if(typeof window!=='undefined'){addEventListener('gamepadconnected',()=>padTick());addEventListener('gamepaddisconnected',()=>padTick());}
padAnzeige(0);if(typeof requestAnimationFrame==='function')requestAnimationFrame(padSchleife);

window.ShopSpiel={G,welt,start,menu,update,oeffneWare,nehmen,weglegen,kasseOeffnen,antworte,zahleMit,bezahlen,weiterKasse,auswerten,ende,
 duellLos,duellWahl,duellBonusAntwort,duellWeiter,padTick,splitNehmen,padQuelle:f=>{padQuelle=f;},PAD,KN,woAntwort,missionWahl,missionWeiter,kochen,zettel,vorlesen,tippen,nehmenMitte,eingabe,bonSpeichern};
})();
