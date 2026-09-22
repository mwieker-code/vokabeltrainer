/* PROBE: PLATZ FUER DIE EINGABE
   Wegwerfschicht ueber der echten Uebungsseite. Sie aendert nichts am
   Bestand - sie legt sich nur darueber, damit sich am Mac und am
   iPhone ansehen laesst, ob die Rechnung stimmt.

   Das Problem, gemessen am 22.09. auf year6, Tippen und Lueckensatz:

     Fenster   Unterkante des Eingabefelds   fehlt
     1440x900              983                 83
     1512x982              983                  1  (hinter dem Knopf)
     1366x768              935                167
     1280x800              935                135

   Die Seite ist 1273 Punkte hoch, das Fenster oft nur 800. Kopfzeile
   110, Schalterzeile 44, Lernfaecher 101, Berg 277, Karte 290 - jedes
   Stueck fuer sich berechtigt, zusammen zu viel. Wer tippen wollte,
   musste erst scrollen.

   Feste Zahlen helfen hier nicht: Ein 16:9-Bildschirm ist flach, ein
   iPad hoch, ein Fenster kann jede Form haben. Deshalb wird gemessen
   und nachgegeben, in dieser Reihenfolge:

     1. Der Berg wird kleiner - bis auf ein Mindestmass.
     2. Reicht das nicht, klappen die Lernfaecher zu. Danach darf der
        Berg wieder wachsen, wenn Platz frei wurde.
     3. Reicht das nicht, wird die Karte knapper gesetzt.
     4. Reicht auch das nicht, holt die Seite das Feld in den Blick -
        dann bleibt wenigstens das Scrollen erspart.

   Der Berg gibt zuerst nach, weil er nichts kostet: Er ist Zierde,
   kein Inhalt. Die Lernfaecher sind Auskunft, die man waehrend des
   Tippens nicht braucht, aber nach der Runde wieder sehen will - wer
   sie von Hand aufklappt, dem klappt die Probe sie nicht wieder zu.

   Gemessen wird nicht der Abstand zum Rand und dann aufaddiert - das
   war beim Telefon der Fehler, der sechs Durchlaeufe brauchte, bis er
   zur Ruhe kam: Die Hoehe zu aendern verschiebt genau den Abstand, den
   man gerade gemessen hat. Gerechnet wird stattdessen mit dem Rest:
   Gesamthoehe minus Berg haengt nicht am Berg. */
(function(){
'use strict';

const LUFT = 14;            /* Luft unter dem Knopf */
/* Der Berg wird nicht beliebig klein: Unter 300 Punkten Breite bricht
   die Zeile darunter um - "Etappe 1 von 18 . 0 von 10 geschafft"
   steht dann zweizeilig neben der Prozentzahl. 300 geteilt durch das
   Seitenverhaeltnis sind 142 Punkte Hoehe. */
const MIN  = 142;
const MAX  = 246;           /* 520 breit bei 2,11:1 - der heutige Wert */
const FORM = 380/180;       /* Seitenverhaeltnis der Zeichnung */

let fachHandisch = false;   /* hat jemand die Faecher selbst aufgeklappt? */
let laeuft = false;

const amRechner = () =>
  matchMedia('(min-width:621px)').matches
  && !document.body.classList.contains('eb-runde');
const inRunde = () => document.body.classList.contains('ascent-active');

function fach(){ return document.querySelector('.box-details'); }
function feld(){ return document.getElementById('typeIn'); }
function panel(){ return document.querySelector('.ascent-panel'); }

/* Passt die Eingabe ins Fenster - ohne zu scrollen?

   Der erste Anlauf fragte, ob das Feld gerade im Fenster steht. Das
   ist nicht dasselbe: Steht die Seite schon gescrollt, sagt die Frage
   ja, obwohl genau das Scrollen ja der Beschwerdegrund war. Gerechnet
   wird deshalb mit der Lage im Dokument, nicht im Fenster.

   Der Pruefen-Knopf klebt am unteren Rand und nimmt seine Hoehe vom
   sichtbaren Platz weg, wo immer die Seite gerade steht. */
function steuerHoehe(){
  const l = document.querySelector('#view .controls');
  return l ? l.getBoundingClientRect().height : 0;
}
function fehlt(){
  const f = feld(); if(!f) return 0;
  const unten = f.getBoundingClientRect().bottom + scrollY;
  return Math.round(unten - (innerHeight - steuerHoehe() - LUFT));
}
function sitztDrin(){ return fehlt() <= 0; }

function fachStellen(zu){
  const d = fach(); if(!d) return;
  if(zu && d.open && !fachHandisch){ d.dataset.passt = 'zu'; d.open = false; }
  if(!zu && !d.open && d.dataset.passt === 'zu'){ delete d.dataset.passt; d.open = true; }
}

/* Der Berg wird ueber seine Breite kleiner, nicht ueber seine Hoehe:
   Eine Hoehe ohne Breite laesst die Zeichnung in ihrem Kasten
   schrumpfen und links und rechts Luft stehen. Ueber die Breite bleibt
   sie formatfuellend. */
function bergStellen(){
  const p = panel(); if(!p) return 0;
  const svg = p.querySelector('.mobile-landscape'); if(!svg) return 0;
  /* Die Breite wird nicht erst geloescht und dann neu gesetzt. Das war
     der Fehler im ersten Anlauf: Loeschen aendert die Hoehe, der
     Beobachter schlaegt an, und weil der neu gerechnete Wert derselbe
     war wie der gemerkte, wurde er nicht wieder gesetzt - der Berg
     blieb in voller Groesse stehen. Noetig ist das Loeschen ohnehin
     nicht: Der Rest haengt nicht am Berg, also stimmt die Rechnung
     auch bei einem schon verkleinerten Berg. */
  /* Gemessen wird bis zur Unterkante des Satzspiegels, nicht mit
     scrollHeight: Das wird nie kleiner als das Fenster. Auf einem
     hohen Bildschirm meldete es 1440 statt der 937, die der Inhalt
     wirklich braucht - der Berg blieb dort auf seinem Mindestmass
     stehen, obwohl reichlich Platz war. Der Satzspiegel klebt an
     nichts und sagt die Wahrheit. */
  const wrap = document.querySelector('.wrap');
  if(!wrap) return 0;
  const ende = wrap.getBoundingClientRect().bottom + scrollY;
  const hoch = p.getBoundingClientRect().height;
  const fuss = hoch - svg.getBoundingClientRect().height;   /* Beschriftung unten */
  const rest = ende - hoch;                                 /* haengt nicht am Berg */
  const platz = innerHeight - rest - LUFT - fuss;
  const hoehe = Math.max(MIN, Math.min(MAX, Math.round(platz)));
  p.style.maxWidth = Math.round(hoehe * FORM) + 'px';
  return hoehe;
}

function aufraeumen(){
  document.body.classList.remove('passt-fuss','passt-fach','passt-kopf','passt-karte');
  fachStellen(false);
  const p = panel(); if(p) p.style.removeProperty('max-width');
}

function passen(){
  if(laeuft || !document.body) return;
  if(!amRechner() || !inRunde()){ aufraeumen(); melden(null); return; }
  laeuft = true;
  /* Stufe 1 kostet nichts und gilt deshalb immer: Unter dem
     Pruefen-Knopf, der ohnehin am Rand klebt, stehen 64 Punkte
     Fusspolster, die in einer Runde niemand sieht. Erst danach faengt
     das Abwaegen an - und der Berg bekommt die 64 Punkte geschenkt,
     statt sie sich absparen zu muessen. */
  let stufe = 1, hoehe = 0;
  for(; stufe <= 4; stufe++){
    document.body.classList.add('passt-fuss');
    document.body.classList.toggle('passt-fach',  stufe >= 2);
    document.body.classList.toggle('passt-kopf',  stufe >= 3);
    document.body.classList.toggle('passt-karte', stufe >= 4);
    fachStellen(stufe >= 2);
    hoehe = bergStellen();
    if(sitztDrin()) break;
  }
  if(stufe > 4){
    /* Letzter Ausweg - ein sehr flaches Fenster gibt nicht mehr her.
       Dann wenigstens kein Scrollen von Hand. */
    const f = feld();
    if(f) f.scrollIntoView({block:'center', behavior:'auto'});
    stufe = 5;
  }
  laeuft = false;
  melden({stufe, hoehe});
}

/* ---- Die Anzeige der Probe ---- */
const STUFEN = ['',
                'Fußpolster weg, Berg passt sich an',
                '+ Lernfächer zu',
                '+ Kopfzeile kompakt',
                '+ Karte knapper',
                'reicht nicht — Feld in den Blick geholt'];
let tafel = null;
function melden(m){
  if(!tafel){
    tafel = document.createElement('div');
    tafel.className = 'passt-tafel';
    document.body.appendChild(tafel);
  }
  const luecke = fehlt();
  tafel.innerHTML = m
    ? '<b>Probe · Platz für die Eingabe</b>'
      + '<span>Fenster</span><b>' + innerWidth + ' × ' + innerHeight + '</b>'
      + '<span>Stufe</span><b>' + m.stufe + ' · ' + STUFEN[m.stufe] + '</b>'
      + '<span>Berg</span><b>' + m.hoehe + ' px</b>'
      + '<span>Seite</span><b>' + document.documentElement.scrollHeight + ' px hoch</b>'
      + '<span>Ergebnis</span><b class="' + (luecke <= 0 ? 'gut' : 'schlecht') + '">'
      + (luecke <= 0 ? (-luecke) + ' px Luft' : luecke + ' px zu tief') + '</b>'
    : '<b>Probe · Platz für die Eingabe</b><span>Zustand</span>'
      + '<b>ruht (keine Tipp- oder Lückenrunde am Rechner)</b>';
}

/* ---- Wann gerechnet wird ----
   Kein Haken in fremdem Code: Ein Beobachter auf der Ansicht faengt
   jede Aenderung - neues Wort, Korrektur, Moduswechsel - und der
   Fensterwechsel kommt dazu. Ein Bild Verzoegerung buendelt die
   Salven, die beim Zeichnen entstehen. */
let warte = 0;
function anstossen(){
  cancelAnimationFrame(warte);
  warte = requestAnimationFrame(() => requestAnimationFrame(passen));
}
addEventListener('resize', anstossen);
addEventListener('orientationchange', anstossen);
/* Der Handgriff wird am Klick erkannt, nicht am toggle-Ereignis: Die
   Seite baut die Lernfaecher bei jedem Wort neu auf und setzt sie dabei
   offen - das loest toggle aus und galt als Handgriff. Die Faecher
   klappten deshalb kein einziges Mal zu. */
document.addEventListener('click', e => {
  const s = e.target.closest && e.target.closest('.box-details > summary');
  if(s && !s.parentElement.open){ fachHandisch = true; }
  if(s) anstossen();
}, true);
document.addEventListener('toggle', e => {
  if(e.target.classList && e.target.classList.contains('box-details')) anstossen();
}, true);
const start = () => {
  const view = document.getElementById('view');
  if(view) new ResizeObserver(anstossen).observe(view);
  new MutationObserver(anstossen).observe(document.body,
    {attributes:true, attributeFilter:['class','data-eb-antwort']});
  anstossen();
};
if(document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
else start();
})();
