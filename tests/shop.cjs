/* Shopping Trip (Year 6): Waren und Abteilungen vollstaendig, jeder Regalplatz
   ist vom Eingang aus erreichbar, Waende und Regale halten auf, der Blickstrahl
   trifft die richtige Ware, Listen, Budget, Kasse, Wechselgeld, Kassenbon und
   Team-Duell funktionieren. Gespielt wird ohne 3D. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/shop');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.org/year6/shop/',virtualConsole:new VirtualConsole()});
for(const f of ['daten.js','bild.js','logik.js','spiel.js'])dom.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
const w=dom.window,d=w.document,L=w.ShopLogik,S=w.ShopSpiel,welt=S.welt,DAT=w.SHOP_DATEN,G=S.G;
const fassung=JSON.parse(fs.readFileSync(path.join(root,'fassung.json'),'utf8')).fassung;

/* Seite */
for(const m of html.matchAll(/<script (?:type="module" )?src="([^"?]+)\?v=([^"]+)"/g))ok(m[2]===fassung,m[1]+' mit aktueller Versionsnummer');
ok(/data-eigenes-design/.test(html)&&d.querySelector('header a').getAttribute('href')==='../games/','eigenes Design, Weg zur Spieleseite');
ok(/from '\.\.\/schule\/vendor\/three\.module\.min\.js'/.test(fs.readFileSync(path.join(dir,'render.js'),'utf8')),'three.js aus dem Schul-Spiel');
ok(['liste','hoeren','budget','rezept','wo','detektiv','duell','frei'].every(m=>d.querySelector('[data-modus="'+m+'"]')),'acht Spielarten im Menue');

/* Daten */
const ids=new Set(DAT.WAREN.map(x=>x.id));
ok(ids.size===DAT.WAREN.length&&DAT.WAREN.length>=60,'mindestens 60 Waren, eindeutige ids');
for(const x of DAT.WAREN){
 ok(/^(a|an) /.test(x.en)&&x.pl&&x.de&&x.schild&&x.emo,x.id+': Texte vollstaendig');
 ok(Number.isInteger(x.p)&&x.p>0&&x.p<1000,x.id+': Preis in Pence');
 ok(DAT.ORTE[x.ort],x.id+': Abteilung bekannt');
}
ok(Object.keys(DAT.ORTE).every(o=>DAT.WAREN.some(x=>x.ort===o)),'jede Abteilung hat Waren');
ok(L.menge(welt.byId.apple,3)==='three apples'&&L.menge(welt.byId.water,2)==='two bottles of water'&&L.menge(welt.byId.bread,1)==='a loaf of bread','Mengenangaben');
ok(L.preis(65)==='65p'&&L.preis(275)==='£2.75'&&L.betrag(5)==='£0.05','Preise schreiben');

/* Grundriss */
ok(welt.plaetze.length===DAT.WAREN.length,'jede Ware hat genau einen Regalplatz');
const erreichbar=L.erreichbar(welt);
for(const p of welt.plaetze){
 ok(p.vorne.some(v=>erreichbar(v.x,v.z)),p.id+': vom Eingang aus erreichbar');
 const v=p.vorne[0],t=L.treffer(welt,[v.x,L.AUGE,v.z],(()=>{const dx=(p.x1+p.x2)/2-v.x,dy=1.0-L.AUGE,dz=(p.z1+p.z2)/2-v.z,l=Math.hypot(dx,dy,dz);return [dx/l,dy/l,dz/l];})(),5);
 ok(t&&t.platz.id===p.id,p.id+': Blick aufs Regal trifft die Ware');
}
for(const k of welt.KASSEN)ok(erreichbar(k.x1-0.8,(k.z1+k.z2)/2),'Kasse '+k.nr+' erreichbar');
const z=welt.KASSEN_ZONE;ok(erreichbar((z.x1+z.x2)/2,(z.z1+z.z2)/2),'Bereich vor Kasse 1 erreichbar');
/* Bewegung */
const p1={x:12,z:9};for(let i=0;i<60;i++)L.bewegen(welt,p1,-0.1,0);
ok(p1.x>=welt.GONDEL[0]+welt.GT+welt.R-1e-9,'Regal haelt auf');
const p2={x:5,z:22.3};for(let i=0;i<60;i++)L.bewegen(welt,p2,0,0.1);
ok(p2.z<23.6,'nicht durch die Tuer hinaus');
const p3={x:12,z:9};for(let i=0;i<30;i++)L.bewegen(welt,p3,-0.1,-0.1);
ok(p3.z<8&&p3.x>10,'am Regal entlang gleiten');
/* Strahl durch die Bildmitte = Blickrichtung */
const s=L.strahl({x:3,z:4,yaw:0.7,pitch:-0.2},0,0,70,1.5),r=L.richtung(0.7,-0.2);
ok(s.d.every((v,i)=>Math.abs(v-r[i])<1e-9),'Bildmitte = Blickrichtung');

/* Listen */
const rnd=L.zufall(42);
for(let k=0;k<30;k++){const li=L.liste(welt,{n:7,mengen:true},rnd);
 ok(li.length===7&&new Set(li.map(e=>e.id)).size===7,'Liste: sieben verschiedene Waren');
 ok(new Set(li.map(e=>welt.byId[e.id].ort)).size>=5,'Liste: mindestens fuenf Abteilungen');
 ok(li.every(e=>e.n===1||welt.byId[e.id].menge),'Zahlen nur bei zaehlbaren Waren');}
/* Budget */
for(const a of DAT.BUDGET){
 const alle=a.gruppen.flatMap(g=>g.aus);ok(new Set(alle).size===alle.length&&alle.every(id=>ids.has(id)),a.id+': Gruppen getrennt, Waren bekannt');
 ok(L.minimum(welt,a)<=a.budget*0.8,a.id+': mit dem Budget gut zu schaffen');
 const korb={};for(const g of a.gruppen){const b=g.aus.map(id=>welt.byId[id]).sort((x,y)=>x.p-y.p)[0];korb[b.id]=(korb[b.id]||0)+(g.n||1);}
 const st=L.budgetStand(welt,a,korb);ok(st.fertig&&st.imBudget&&st.summe===st.min,a.id+': billigste Wahl erfuellt alles');
 ok(L.vergleiche(welt,st).every(v=>v.gut),a.id+': billigste Wahl wird gelobt');
}
const pic=DAT.BUDGET.find(b=>b.id==='picnic'),teuer=L.budgetStand(welt,pic,{orangejuice:1,strawberries:1,bread:1,honey:1,popcorn:1});
ok(L.vergleiche(welt,teuer).some(v=>v.text==='A bottle of water (65p) is cheaper than a carton of orange juice (£1.40).'),'Vergleichssatz mit cheaper than');
ok(!L.budgetStand(welt,pic,{orangejuice:4,cake:1}).imBudget,'Budget ueberschritten erkannt');
/* Wechselgeld */
for(const c of [0,5,95,410,1390]){const o=L.wechselOptionen(c,rnd);ok(o.length===3&&o.includes(c)&&new Set(o).size===3&&o.every(v=>v>=0),'Wechselgeld-Auswahl fuer '+c);}
ok(DAT.GELD.reduce((a,b)=>a+b,0)>=DAT.BUDGET.reduce((a,b)=>Math.max(a,b.budget),0),'Geldbeutel reicht fuer jedes Budget');
/* Kassensaetze: genau eine richtige Antwort */
for(const [art,liste] of Object.entries(DAT.KASSE))for(const v of liste)ok(v.ant.length===3&&new Set(v.ant).size===3&&v.warum,'Kasse '+art+': drei verschiedene Antworten mit Erklaerung');
const schritte=L.kassenSchritte(welt,735,rnd);
ok(schritte.map(x=>x.art).join()==='gruss,tuete,frage,zahlen,geld,wechsel,bon,tschuess','Ablauf an der Kasse');
ok(schritte[3].sagt==='That\'s £7.35, please.','Summe wird genannt');

/* ---------- Spielablauf ohne 3D ---------- */
d.querySelector('[data-modus="liste"]').click();
ok(!d.getElementById('stage').hidden&&G.liste.length===5,'Shopping list startet mit fuenf Sachen');
ok(d.querySelectorAll('#zListe li').length===5,'Zettel zeigt fuenf Zeilen');
const e0=G.liste[0];
ok(S.oeffneWare(e0.id)&&!d.getElementById('ware').hidden,'Ware ansehen');
d.getElementById('wNehmen').click();
ok(G.korb[e0.id]===1&&d.querySelector('#zListe li.ok'),'in den Korb, Zeile abgehakt');
const fremd=DAT.WAREN.find(x=>!G.liste.some(e=>e.id===x.id)).id;
S.nehmen(fremd,1);ok(d.querySelector('#zListe li.extra'),'falsche Ware wird markiert');
S.weglegen(fremd);ok(!G.korb[fremd],'zuruecklegen');
/* Kasse mit unvollstaendiger Liste fragt nach */
ok(!S.kasseOeffnen()&&/fehlt noch etwas/.test(d.getElementById('kasse').textContent),'Rueckfrage bei fehlenden Sachen');
for(const e of G.liste)G.korb[e.id]=e.n;S.zettel();
ok(S.kasseOeffnen()&&G.zustand==='kasse','an die Kasse');
const K=G.kasse;
while(K.schritte[K.i]&&K.schritte[K.i].art!=='geld'){const x=K.schritte[K.i];ok(S.antworte(x.richtig),'Kasse: '+x.art+' richtig beantwortet');S.weiterKasse();}
ok(d.querySelectorAll('[data-geld]').length===DAT.GELD.length,'Geldbeutel angezeigt');
ok(!S.zahleMit([]),'ohne Geld kein Bezahlen');
ok(S.zahleMit([0,1]),'mit 15 Pfund bezahlt');
const ws=K.schritte[K.i];ok(ws.art==='wechsel'&&ws.richtig===L.betrag(1500-K.summe),'Wechselgeld richtig berechnet');
S.antworte(ws.richtig);S.weiterKasse();
while(K.schritte[K.i]){S.antworte(K.schritte[K.i].richtig);S.weiterKasse();}
ok(G.zustand==='ende'&&!d.getElementById('over').hidden,'Ergebnis angezeigt');
ok(G.ergebnis.sterne===3&&G.ergebnis.richtig===G.ergebnis.anzahl,'alles richtig = drei Sterne');
const bonText=d.getElementById('bon').textContent;
ok(bonText.includes('TOTAL')&&bonText.includes(L.betrag(K.summe))&&bonText.includes('CHANGE'),'Kassenbon mit Summe und Wechselgeld');
d.getElementById('bonName').value='Mia';d.getElementById('bonName').dispatchEvent(new w.Event('input'));
ok(d.getElementById('bonKunde').textContent==='Mia','Name auf dem Bon');
ok(JSON.parse(w.localStorage.getItem('vt6:shop:v1')).best.liste===3,'Bestwert gespeichert');

/* Budget-Runde, zu teuer = ein Stern */
S.start('budget',L.zufall(7));
ok(G.auftrag&&d.getElementById('zBudget').hidden===false,'Budget-Zettel mit Balken');
const a=G.auftrag;for(const g of a.gruppen){const t=g.aus.map(id=>welt.byId[id]).sort((x,y)=>y.p-x.p)[0];G.korb[t.id]=(G.korb[t.id]||0)+(g.n||1)*4;}
G.korb.cake=6;
S.zettel();ok(d.getElementById('zBudget').classList.contains('drueber'),'Balken zeigt: zu teuer');
S.kasseOeffnen();const K2=G.kasse;
while(K2.schritte[K2.i]){const x=K2.schritte[K2.i];if(x.art==='geld'){ok(S.zahleMit(K2.geld.map((_,i)=>i)),'teurer Einkauf: Geld reicht trotzdem');continue;}if(x.optionen&&!x.exakt)S.antworte(x.richtig);S.weiterKasse();}
ok(G.ergebnis&&G.ergebnis.sterne===1,'ueber dem Budget hoechstens ein Stern');

/* Hoeren: Zeilen erst nach dem Finden lesbar */
S.start('hoeren');
ok(d.querySelectorAll('#zListe [data-hoer]').length===G.liste.length,'Hoerliste zeigt nur Knoepfe');
S.nehmen(G.liste[0].id,G.liste[0].n);ok(d.querySelectorAll('#zListe [data-hoer]').length===G.liste.length-1,'gefundene Zeile wird lesbar');

/* Team-Duell */
d.getElementById('runden').value='3';
S.start('duell',L.zufall(3));
const D=G.duell;ok(D.aufgaben.length===6&&!d.getElementById('ansage').hidden,'Duell: Ansage fuer Team 1');
ok(S.duellLos()&&D.phase==='suche','Duell: Suche laeuft');
S.update(10,{keys:new Set(),pad:new Set(),look:{x:0,y:0},stick:{x:0,y:0}});
ok(D.rest<D.frist,'Duell: Uhr laeuft');
ok(S.duellWahl(D.ziel.id)&&D.phase==='bonus'&&D.teams[0].punkte>=100,'Duell: richtige Ware gibt Punkte');
S.duellBonusAntwort(D.bonus.richtig);ok(D.teams[0].punkte>=150&&D.phase==='ergebnis','Duell: Bonusfrage');
S.duellWeiter();S.duellLos();
const falsch=welt.waren.find(x=>x.id!==D.ziel.id).id;S.duellWahl(falsch);
ok(D.teams[1].punkte===0&&/Leider nicht/.test(d.getElementById('ansage').textContent),'Duell: falsche Ware gibt keine Punkte');
while(G.zustand!=='ende'){S.duellWeiter();if(G.zustand==='ende')break;S.duellLos();S.duellWahl(D.ziel.id);if(D.phase==='bonus')S.duellBonusAntwort('x');}
ok(/wins!|draw/.test(d.getElementById('over').textContent),'Duell: Sieger angezeigt');

/* ---------- Aufgaben 4-6 ---------- */
/* Lage: Satz passt zu den Nachbarn im Regal, genau eine richtige Antwort */
for(const x of DAT.WAREN){
 const satz=L.lageSatz(welt,x.id),n=L.nachbarn(welt,x.id);
 ok(n.length>=1&&n.every(id=>welt.plaetze.find(p=>p.id===id).seite===welt.plaetze.find(p=>p.id===x.id).seite),x.id+': Nachbarn im selben Regal');
 ok(/^It's (in|at) .+, (next to|between) the .+\.$/.test(satz)&&!satz.includes('undefined'),x.id+': Lagesatz '+satz);
 const o=L.lageOptionen(welt,x.id,rnd);ok(o.optionen.length===3&&new Set(o.optionen).size===3&&o.optionen.filter(t=>t===satz).length===1,x.id+': drei verschiedene Antworten, eine richtig');
 ok(/^Excuse me, where (is|are) the .+\?$/.test(L.kundenFrage(welt,x.id)),x.id+': Kundenfrage');
}
ok(L.kundenFrage(welt,'apple')==='Excuse me, where are the apples?'&&L.kundenFrage(welt,'honey')==='Excuse me, where is the honey?','is / are');
ok(L.lageSatz(welt,'cola')==='It\'s in aisle 1, between the lemonade and the apple juice.','Beispiel: Cola');
/* Raetsel: genau eine Ware im Bereich passt */
for(let k=0;k<200;k++){
 const q=L.raetsel(welt,rnd);ok(q&&welt.byId[q.id],'Raetsel erzeugt');
 const b=L.bereich(welt,q.id),gruppe=welt.waren.filter(x=>L.bereich(welt,x.id).key===b.key),name=x=>'the '+x.schild.toLowerCase();
 let passt;
 if(/the cheapest/.test(q.text))passt=gruppe.filter(x=>gruppe.every(y=>y.p>=x.p));
 else if(/the most expensive/.test(q.text))passt=gruppe.filter(x=>gruppe.every(y=>y.p<=x.p));
 else{const m=q.text.match(/cheaper than (.+), but more expensive than (.+)\. What/);const A=gruppe.find(x=>name(x)===m[1]),B=gruppe.find(x=>name(x)===m[2]);
  ok(A&&B,'Raetsel nennt Waren aus demselben Bereich: '+q.text);passt=gruppe.filter(x=>x.p<A.p&&x.p>B.p);}
 ok(passt.length===1&&passt[0].id===q.id,'Raetsel eindeutig: '+q.text);
}
/* Rezepte */
for(const r of DAT.REZEPTE){
 ok(r.zutaten.length>=4&&r.zutaten.every(([id,wort])=>ids.has(id)&&new RegExp('\\b'+wort+'\\b','i').test(r.text)),r.id+': Zutaten bekannt und im Text');
 const korb={};r.zutaten.forEach(([id])=>korb[id]=1);ok(L.rezeptStand(welt,r,korb).anteil===1,r.id+': alle Zutaten = volle Punktzahl');
 korb.cola=1;ok(L.rezeptStand(welt,r,korb).extra.length===1,r.id+': falsche Ware erkannt');
}
/* Ablauf: Recipe mission */
S.start('rezept',L.zufall(11));
const R0=G.mission.rezept;ok(/kochen/.test(d.getElementById('zAufgabe').textContent)&&d.getElementById('zListe').children.length===0,'Rezept im Zettel');
for(const [id] of R0.zutaten)S.nehmen(id,1);
ok(S.kochen()&&G.ergebnis.sterne===3&&d.querySelectorAll('#over mark.ok').length===R0.zutaten.length,'Rezept komplett: drei Sterne, Zutaten markiert');
/* Ablauf: Where is ...? */
S.start('wo',L.zufall(12));
for(let k=0;k<5;k++){const M=G.mission;
 ok(d.querySelectorAll('[data-mopt]').length===3,'Where is: drei Antworten (Runde '+(k+1)+')');
 ok(S.woAntwort(M.wahl.richtig)&&M.phase==='zeigen','Where is: richtige Antwort');
 S.oeffneWare(M.ziel.id);ok(/Das ist es/.test(d.getElementById('ware').textContent),'Where is: Ware zeigen');
 ok(S.missionWahl(M.ziel.id),'Where is: gezeigt');}
ok(G.zustand==='ende'&&G.ergebnis.sterne===3,'Where is: alles richtig = drei Sterne');
/* Ablauf: Price detective */
S.start('detektiv',L.zufall(13));
const M3=G.mission,erstes=M3.raetsel.id,falsch3=welt.waren.find(x=>x.id!==erstes).id;
ok(!S.missionWahl(falsch3)&&M3.versuche===1&&M3.nr===0,'Detektiv: falsche Ware, zweiter Versuch');
ok(S.missionWahl(erstes)&&M3.punkte===1,'Detektiv: im zweiten Versuch ein Punkt');
while(G.zustand!=='ende')S.missionWahl(G.mission.raetsel.id);
ok(M3.punkte===9&&new Set(M3.log.map(e=>e.id)).size===5,'Detektiv: fuenf verschiedene Raetsel');
ok(['rezept','wo','detektiv'].every(m=>JSON.parse(w.localStorage.getItem('vt6:shop:v1')).best[m]),'Bestwerte der neuen Spielarten gespeichert');

/* Spieleseite */
const hub=fs.readFileSync(path.join(root,'year6/games/index.html'),'utf8');
ok(hub.includes('href="../shop/"')&&hub.includes('../shop/bild.js?v='+fassung),'Year 6: Kachel auf der Spieleseite');
ok(!fs.readFileSync(path.join(root,'year9/games/index.html'),'utf8').includes('href="../shop/"'),'Year 9 ohne Shopping Trip');

console.log('shop: '+checks+' Pruefungen bestanden');
