/* =========================================================================
   HELL ODER NACHT
   Steht im <head> jeder Seite, vor allen Stylesheets: Das Attribut
   data-thema muss gesetzt sein, bevor die Seite das erste Mal gezeichnet
   wird - sonst blitzt sie beim Laden im falschen Licht auf.

   Drei Stellungen: automatisch (folgt dem Geraet), hell, nacht. Gespeichert
   wird nur eine ausdrueckliche Wahl; wer nichts waehlt, folgt dem Geraet,
   auch wenn es abends selbst umschaltet.

   Die dunklen Farben (tools/nacht.cjs, assets/nacht-marke.css) gelten nur,
   solange html nicht data-thema="hell" traegt. Der Schalter haengt sich in
   die Leiste mit "Toene" und "Animationen" (assets/feedback.js); die
   Startseite hat einen eigenen Knopf mit data-thema-knopf.
   ========================================================================= */
(function(){
  'use strict';
  var SCHLUESSEL = 'eb:thema';
  var FARBE = {hell: '#F4F1EA', nacht: '#0D1017'};
  var NAMEN = {auto: 'Automatisch', hell: 'Hell', nacht: 'Nacht'};
  var geraet = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  var wahl = 'auto';
  try{
    var gespeichert = localStorage.getItem(SCHLUESSEL);
    if(gespeichert === 'hell' || gespeichert === 'nacht') wahl = gespeichert;
  }catch(e){}

  function wirksam(){
    if(wahl !== 'auto') return wahl;
    return geraet && geraet.matches ? 'hell' : 'nacht';
  }
  function anwenden(){
    var thema = wirksam();
    document.documentElement.setAttribute('data-thema', thema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', FARBE[thema]);
    var knoepfe = document.querySelectorAll('[data-thema-knopf]');
    for(var i = 0; i < knoepfe.length; i++){
      var k = knoepfe[i];
      k.setAttribute('aria-label', 'Design: ' + NAMEN[wahl] + ' - antippen zum Wechseln');
      if(k.hasAttribute('data-thema-text')) k.textContent = 'Design: ' + NAMEN[wahl];
      k.setAttribute('data-thema-wahl', wahl);
    }
  }
  function setzen(neu){
    wahl = (neu === 'hell' || neu === 'nacht') ? neu : 'auto';
    try{
      if(wahl === 'auto') localStorage.removeItem(SCHLUESSEL);
      else localStorage.setItem(SCHLUESSEL, wahl);
    }catch(e){}
    anwenden();
  }
  function weiter(){
    setzen(wahl === 'auto' ? 'hell' : wahl === 'hell' ? 'nacht' : 'auto');
  }
  if(geraet){
    var folgen = function(){ if(wahl === 'auto') anwenden(); };
    if(geraet.addEventListener) geraet.addEventListener('change', folgen);
    else if(geraet.addListener) geraet.addListener(folgen);
  }
  anwenden();

  /* Der Knopf in der Einstellungsleiste. Die Leiste legt feedback.js am
     Ende der Seite an; zu DOMContentLoaded steht sie. */
  function einhaengen(){
    var leiste = document.querySelector('.feedback-settings');
    if(leiste && !leiste.querySelector('[data-thema-knopf]')){
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-thema-knopf', '');
      b.setAttribute('data-thema-text', '');
      leiste.appendChild(b);
    }
    var alle = document.querySelectorAll('[data-thema-knopf]');
    for(var i = 0; i < alle.length; i++){
      if(alle[i].__thema) continue;
      alle[i].__thema = true;
      alle[i].addEventListener('click', weiter);
    }
    anwenden();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einhaengen);
  else einhaengen();

  window.ebThema = {wahl: function(){ return wahl; }, wirksam: wirksam, setzen: setzen, weiter: weiter};
})();
