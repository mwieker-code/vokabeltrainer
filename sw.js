/* English Basecamp ohne Netz.

   Der Grundgedanke ist knapp: Was einmal geladen wurde, bleibt
   erreichbar. Es wird nichts im Voraus eingelagert - die Seiten tragen
   ihre Versionsnummern an verschiedenen Dateien, und eine Liste, die
   davon abweicht, waere beim naechsten Release still falsch. Statt
   dessen legt jede erfolgreiche Anfrage ihre Antwort ab.

   Seiten kommen zuerst aus dem Netz und nur ersatzweise aus dem Lager:
   Wer Empfang hat, sieht immer den aktuellen Stand. Dateien mit
   Versionsnummer kommen zuerst aus dem Lager, denn unter derselben
   Nummer aendern sie sich nie.

   Die Fassungsdatei geht nie durch dieses Lager - sie ist die Instanz,
   an der die Seite erkennt, ob sie veraltet ist. */

const FASSUNG = new URL(self.location.href).searchParams.get('v') || 'ohne-nummer';
const LAGER = 'basecamp-' + FASSUNG;
const FRIST = 4000;   // so lange wartet eine Seite auf das Netz

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const name of await caches.keys())
      if(name.startsWith('basecamp-') && name !== LAGER) await caches.delete(name);
    await self.clients.claim();
  })());
});

function mitFrist(versprechen, ms){
  return new Promise((gut, schlecht) => {
    const uhr = setTimeout(() => schlecht(new Error('Zeit abgelaufen')), ms);
    versprechen.then(a => { clearTimeout(uhr); gut(a); },
                     f => { clearTimeout(uhr); schlecht(f); });
  });
}

async function ablegen(anfrage, antwort){
  /* Nur vollstaendige eigene Antworten: Eine Fehlerseite oder ein
     Teilstueck im Lager waere schlimmer als gar nichts. */
  if(!antwort || !antwort.ok || antwort.type !== 'basic') return;
  const lager = await caches.open(LAGER);
  await lager.put(anfrage, antwort);
}

async function netzZuerst(anfrage){
  const laufend = fetch(anfrage);
  try{
    const antwort = await mitFrist(laufend, FRIST);
    ablegen(anfrage, antwort.clone());
    return antwort;
  }catch(e){
    const gelagert = await caches.match(anfrage, {ignoreSearch: false});
    if(gelagert) return gelagert;
    /* Nichts im Lager - dann doch auf das Netz warten, so lange es
       dauert, und den Fehler weiterreichen, wenn es nicht kommt. */
    const antwort = await laufend;
    ablegen(anfrage, antwort.clone());
    return antwort;
  }
}

async function lagerZuerst(anfrage){
  const gelagert = await caches.match(anfrage);
  if(gelagert) return gelagert;
  const antwort = await fetch(anfrage);
  ablegen(anfrage, antwort.clone());
  return antwort;
}

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if(anfrage.method !== 'GET') return;
  const url = new URL(anfrage.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.endsWith('/fassung.json')) return;   // immer frisch vom Netz
  e.respondWith(anfrage.mode === 'navigate' ? netzZuerst(anfrage) : lagerZuerst(anfrage));
});

/* Ein Notausgang: Die Seite kann das ganze Lager raeumen lassen. */
self.addEventListener('message', e => {
  if(e.data !== 'lager-raeumen') return;
  e.waitUntil((async () => {
    for(const name of await caches.keys())
      if(name.startsWith('basecamp-')) await caches.delete(name);
  })());
});
