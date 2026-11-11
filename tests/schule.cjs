/* Find your way! (Year 6): Die Schulkarte ist zusammenhaengend, jeder Raum hat
   eine Tuer zum Flur und ist vom Haupteingang aus erreichbar, Waende halten
   auf, Tueren und Treppen lassen durch, die Wegbeschreibungen sind
   vollstaendig und stimmen mit dem Ziel ueberein. Gespielt wird ohne 3D. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),dir=path.join(root,'year6/schule');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/year6/schule/',virtualConsole:new VirtualConsole()});
for(const f of ['karte.js','logik.js','spiel.js'])dom.window.eval(fs.readFileSync(path.join(dir,f),'utf8'));
const w=dom.window,d=w.document,L=w.SchulLogik,S=w.SchulSpiel,welt=S.welt,G=S.G;

/* Karte */
ok(welt.rooms.length>=70,'mindestens 70 Raeume mit Nummer');
ok(new Set(welt.rooms.map(r=>r.id)).size===welt.rooms.length,'Raumnummern eindeutig');
ok(welt.rooms.every(r=>/^[01]\.\d\d(\.\d)?$/.test(r.id)),'Raumnummern im Schema 0.xx / 1.xx');
ok(welt.rooms.every(r=>(r.id[0]==='0')===(r.f===0)),'0.xx im Erdgeschoss, 1.xx im ersten Stock');
ok(welt.rooms.every(r=>r.door),'jeder Raum hat eine Tuer zum Flur');
for(const r of welt.rooms){const t=r.door,c=L.clsAt(welt,r.f,t.sx,t.sy);ok(c===L.IN||c===L.STAIR,'Standpunkt vor '+r.id+' liegt im Gebaeude');
 ok(L.frei(welt,r.f,t.sx,t.sy,c),'vor '+r.id+' ist Platz');}
ok(welt.floors[0].doors.length===8,'acht Ausgaenge im Erdgeschoss');
ok(welt.floors.every(F=>F.walls.length>20),'Waende erzeugt');
ok(welt.floors[0].walls.some(s=>s.t==='glass')&&welt.floors[0].walls.some(s=>s.t==='facade'),'Glas zum Innenhof, Fassade zum Schulhof');
ok(welt.K.floors[0].stairs.length===4&&welt.K.floors[1].stairs.length===4,'vier Treppenhaeuser je Stockwerk');

/* Erreichbarkeit und Beschreibungen vom Haupteingang */
const start={f:0,x:S.START.x,y:S.START.y,dir:2};
for(const r of welt.rooms){
 const b=L.beschreibung(welt,start,r);
 ok(b,r.id+' vom Haupteingang erreichbar');
 const p=b.pfad;
 for(let k=1;k<p.length;k++){const a=p[k-1],c=p[k];
  if(a.f!==c.f){ok(a.i===c.i&&a.j===c.j&&L.treppeBei(welt,{f:a.f,x:a.i*10+5,y:a.j*10+5})>=0,'Stockwerk nur ueber Treppen ('+r.id+')');continue;}
  ok(Math.abs(a.i-c.i)+Math.abs(a.j-c.j)===1,'Weg in Einzelschritten ('+r.id+')');}
 ok(b.saetze.length>=2&&b.saetze.every(s=>/^[A-Z].*[.]$/.test(s)&&!/undefined|NaN/.test(s)),'saubere Saetze fuer '+r.id);
 ok(b.saetze[0]==='Go in through the main entrance.','Start durch den Haupteingang ('+r.id+')');
 ok(b.saetze.some(s=>s.includes(r.id)),'Ziel '+r.id+' wird genannt');
 ok(b.saetze.some(s=>/stairs/.test(s))===(r.f===1),'Treppe genau dann, wenn der Raum oben liegt ('+r.id+')');
 ok(/^(Go up|Turn (left|right|around) and go up)/.test(b.saetze.find(s=>/stairs/.test(s))||'Go up'),'nach oben heisst "go up" ('+r.id+')');
}
/* Beispiel: Seite des Ziels passt zur Blickrichtung */
const b32=L.beschreibung(welt,start,welt.byId['0.32']);
ok(b32.saetze.join(' ')==='Go in through the main entrance. Turn left and go straight on for about 35 metres. Room 0.32 is on your right.','Weg zu 0.32: '+b32.saetze.join(' '));
const bWc=L.beschreibung(welt,start,welt.byId['0.37']);
ok(/The toilets \(0\.37\) are on your/.test(bWc.saetze.join(' ')),'Toiletten: "are"');
const bOben=L.beschreibung(welt,start,welt.byId['1.33']);
ok(bOben.saetze.some(s=>/^At the top of the stairs, /.test(s)),'oben: "At the top of the stairs"');
/* vom ersten Stock nach unten */
const r1=welt.byId['1.33'].door,bRunter=L.beschreibung(welt,{f:1,x:r1.sx,y:r1.sy,dir:L.richtungVon(r1.nx,r1.ny)},welt.byId['0.62']);
ok(bRunter.saetze.some(s=>/go down the stairs to the ground floor/i.test(s)),'nach unten: "go down the stairs"');
ok(bRunter.saetze.some(s=>/^At the bottom of the stairs, /.test(s)),'unten: "At the bottom of the stairs"');
ok(welt.byId['0.27'].opposite==='0.26.1'&&/opposite the toilets \(0\.26\.1\)/.test(L.beschreibung(welt,start,welt.byId['0.27']).saetze.join(' ')),'"opposite" bei gegenueberliegenden Tueren');

/* Bewegung: Wand haelt auf, Tuer laesst durch */
const p={f:0,x:340,y:470};
for(let i=0;i<40;i++)L.bewegen(welt,p,0,1);
ok(p.y>490&&L.clsAt(welt,0,p.x,p.y)===L.IN,'durch den Haupteingang hinein');
const q={f:0,x:300,y:470};for(let i=0;i<40;i++)L.bewegen(welt,q,0,1);
ok(q.y<490,'neben dem Eingang ist Glas');
const r={f:0,x:560,y:470};for(let i=0;i<40;i++)L.bewegen(welt,r,0,-1);
ok(r.y>456,'ohne Tuer nicht in den Innenhof');
const s={f:0,x:485,y:470};for(let i=0;i<40;i++)L.bewegen(welt,s,0,-1);
ok(s.y<456&&L.clsAt(welt,0,s.x,s.y)===L.OUT,'durch die Hoftuer in den Innenhof');
const t={f:0,x:589,y:650};for(let i=0;i<60;i++)L.bewegen(welt,t,1,0);
ok(t.x>590&&t.x<=600-L.BODY,'Raumwand haelt auf');
/* Treppe */
const u={f:0,x:620,y:560};ok(L.treppeBei(welt,u)>=0,'auf der Treppe');ok(L.treppeNehmen(welt,u)&&u.f===1,'Treppe hinauf');
ok(L.treppeNehmen(welt,u)&&u.f===0,'und wieder hinunter');
const v={f:0,x:700,y:505};ok(!L.treppeNehmen(welt,v)&&v.f===0,'ohne Treppe kein Stockwerkwechsel');

/* Spiel */
ok(d.querySelectorAll('[data-modus]').length===3,'drei Spielarten');
d.querySelector('[data-modus="karte"]').click();
ok(!d.getElementById('stage').hidden&&G.zustand==='spiel'&&G.aufgabe,'Spiel startet mit Aufgabe');
ok(G.aufgabe.raum.f===0,'erste Aufgabe im Erdgeschoss');
ok(d.querySelectorAll('#aSchritte li').length===G.aufgabe.b.saetze.length&&d.getElementById('aTitel').textContent.startsWith('Find '),'Auftrag angezeigt');
/* vorwaerts gehen bewegt, Wand stoppt */
const y0=G.p.y;S.update(0.05,{keys:new Set(['w'])});ok(G.p.y>y0,'W geht vorwaerts (Blick nach Sueden)');
/* fuenf Ziele erreichen */
for(let n=0;n<S.RUNDE;n++){
 ok(G.zustand==='spiel','Aufgabe '+(n+1)+' laeuft');
 const ziel=G.aufgabe.raum,dd=ziel.door;
 if(n===1)S.zeigeHilfe();
 G.aufgabe.gelaufen=G.aufgabe.b.laenge;G.p.f=dd.f;G.p.x=dd.sx;G.p.y=dd.sy;S.update(0.02,{keys:new Set()});
 ok(G.zustand==='geschafft'&&!d.getElementById('geschafft').hidden,'Ziel '+ziel.id+' erkannt');
 ok(G.ergebnisse[n].sterne===(n===1?1:3),'Sterne fuer Aufgabe '+(n+1));
 d.getElementById('weiter').click();
 if(n<S.RUNDE-1){ok(G.aufgabe.raum.id!==ziel.id,'neues Ziel');ok(Math.abs(L.richtungVon(dd.nx,dd.ny)-Math.round(G.p.yaw/(Math.PI/2))%4)===0,'Start mit dem Ruecken zur Tuer');}
}
ok(G.zustand==='ende'&&!d.getElementById('over').hidden,'Ergebnis nach fuenf Aufgaben');
ok(new Set(G.ergebnisse.map(e=>e.id)).size===5,'fuenf verschiedene Raeume');
ok(G.ergebnisse.some(e=>e.id[0]==='1'),'mindestens ein Raum im ersten Stock');
const gespeichert=JSON.parse(w.localStorage.getItem('vt6:schule:v1'));ok(gespeichert.best.karte===13&&gespeichert.runden===1,'Rekord gespeichert');
/* Sterne nach Umweg */
ok(S.sterne({gelaufen:60,b:{laenge:50},hilfe:false})===3&&S.sterne({gelaufen:90,b:{laenge:50}})===2&&S.sterne({gelaufen:200,b:{laenge:50}})===1,'Sterne nach Umweg');
/* Erkunden ohne Aufgabe */
d.getElementById('zumMenu').click();ok(!d.getElementById('menu').hidden,'zurueck zum Menue');
ok(/Rekord: 13/.test(d.querySelector('[data-best="karte"]').textContent),'Rekord im Menue');
d.querySelector('[data-modus="frei"]').click();ok(G.zustand==='frei'&&!G.aufgabe,'Erkunden ohne Aufgabe');

/* Seite und Dateien */
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
ok(/data-eigenes-design/.test(html)&&/type="module" src="render\.js\?v=/.test(html),'eigenes Design, 3D als Modul');
const r3=fs.readFileSync(path.join(dir,'render.js'),'utf8');
ok(/from '\.\/vendor\/three\.module\.min\.js'/.test(r3)&&fs.existsSync(path.join(dir,'vendor/three.module.min.js'))&&fs.existsSync(path.join(dir,'vendor/LICENSE-three.txt')),'three.js liegt mit Lizenz im Projekt');
ok(!fs.readdirSync(dir).some(f=>/\.(png|jpe?g|pdf|webp)$/i.test(f)),'keine Plan- oder Fotodateien im Projekt');
console.log('schule: '+checks+' Pruefungen bestanden');
