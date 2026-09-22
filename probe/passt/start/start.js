/* PROBE: Anzeige zur Startseite. Sie rechnet nichts - sie liest nur ab,
   damit sich am Geraet ablesen laesst, ob alles ins Fenster passt. */
(function(){
'use strict';
let tafel=null;
function melden(){
  if(!document.body)return;
  if(!tafel){tafel=document.createElement('div');tafel.className='passt-tafel';document.body.appendChild(tafel);}
  const bili=document.getElementById('bili');
  const fuss=document.querySelector('.foot');
  const letzte=(fuss||bili);
  const unten=letzte?Math.round(letzte.getBoundingClientRect().bottom+scrollY):0;
  const luecke=unten-innerHeight;
  const karte=document.querySelector('#cards .card');
  tafel.innerHTML='<b>Probe · Startseite</b>'
    +'<span>Fenster</span><b>'+innerWidth+' × '+innerHeight+'</b>'
    +'<span>Seite</span><b>'+document.documentElement.scrollHeight+' px hoch</b>'
    +'<span>Kachel</span><b>'+(karte?Math.round(karte.getBoundingClientRect().height):'—')+' px</b>'
    +'<span>Ergebnis</span><b class="'+(luecke<=0?'gut':'schlecht')+'">'
    +(luecke<=0?(-luecke)+' px Luft':luecke+' px zu viel')+'</b>';
}
let warte=0;
const anstossen=()=>{cancelAnimationFrame(warte);warte=requestAnimationFrame(melden);};
addEventListener('resize',anstossen);
addEventListener('orientationchange',anstossen);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>setTimeout(anstossen,120));
else setTimeout(anstossen,120);
setTimeout(anstossen,600);
})();
