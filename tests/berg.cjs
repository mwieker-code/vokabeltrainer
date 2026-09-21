/* Der Weg am Berg.

   Der Fehler, gegen den dieser Test steht: Der gepunktete Pfad lief
   nicht am Vordergrundberg entlang. Oben kreuzte er den Grat und
   verlief 22 Einheiten darunter im Inneren des Bergs, unten schwebte
   er 53 darueber in der Luft. Die Lager standen daneben statt darauf.

   Gemessen wird ohne Browser: die Kurven aus dem d-Attribut werden
   hier selbst abgetastet. Der Grat des Vordergrundbergs ist die
   Gerade von (79,180) nach (332,31) - dieselbe Kante, die auch die
   Zeichnung fuellt. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const quelle=fs.readFileSync(path.join(root,'assets/ascent.js'),'utf8');

/* ---- Den Weg aus der Datei holen ---- */
const weg=/id=\\"mobileRoute\\" d=\\"([^\\]+)/.exec(quelle);
assert.ok(weg,'kein Weg in ascent.js gefunden');
const spur=/id=\\"mobileTrail\\" d=\\"([^\\]+)/.exec(quelle);
assert.ok(spur,'keine Spur in ascent.js gefunden');
assert.equal(spur[1],weg[1],
  'Weg und zurueckgelegte Spur laufen auseinander - die goldene Linie '
  +'liegt dann neben den Punkten');

/* ---- Kubische Bezier abtasten ---- */
function punkte(d){
  const zahlen=/[-+]?\d*\.?\d+/g;
  const teile=d.match(/[MC][^MC]*/g);
  let hier=null;const aus=[];
  for(const t of teile){
    const z=(t.match(zahlen)||[]).map(Number);
    if(t[0]==='M'){hier=[z[0],z[1]];aus.push(hier);continue;}
    for(let i=0;i+5<z.length;i+=6){
      const [x1,y1,x2,y2,x3,y3]=z.slice(i,i+6);
      const [x0,y0]=hier;
      for(let s=1;s<=24;s++){
        const t2=s/24,u=1-t2;
        aus.push([
          u*u*u*x0+3*u*u*t2*x1+3*u*t2*t2*x2+t2*t2*t2*x3,
          u*u*u*y0+3*u*u*t2*y1+3*u*t2*t2*y2+t2*t2*t2*y3]);
      }
      hier=[x3,y3];
    }
  }
  return aus;
}
const grat=x=>180-(149/253)*(x-79);
const bahn=punkte(weg[1]);
assert.ok(bahn.length>100,'zu wenige Abtastpunkte');

/* ---- Der Anstieg laeuft parallel zum Grat ---- */
const amBerg=bahn.filter(([x])=>x>=165&&x<=322).map(([x,y])=>y-grat(x));
const klein=Math.min(...amBerg), gross=Math.max(...amBerg);
assert.ok(klein>4,'Der Weg kommt dem Grat bis auf '+klein.toFixed(1)
  +' nahe - so laeuft er auf der Kante statt am Hang');
assert.ok(gross<24,'Der Weg faellt bis '+gross.toFixed(1)
  +' unter den Grat - so laeuft er quer durch den Berg statt an ihm entlang');
assert.ok(gross-klein<4,'Der Abstand zum Grat schwankt um '+(gross-klein).toFixed(1)
  +' - der Weg laeuft nicht parallel zum Berg');

/* ---- Nichts schwebt in der Luft ----
   Links vom Anstieg laeuft der Weg ueber die Wiese, die vor dem Berg
   liegt; dort darf er ueber der Gratlinie stehen. Ab dem Anstieg nicht
   mehr: dort waere er im Himmel. */
for(const [x,y] of bahn){
  if(x<150)continue;
  assert.ok(y>grat(x),'Der Weg steht bei x='+x.toFixed(0)+' ueber dem Grat, also im Himmel');
}
for(const [x,y] of bahn){
  if(x>146)continue;
  assert.ok(y>148&&y<168,'Der Anlauf verlaesst bei x='+x.toFixed(0)+' die Wiese (y='+y.toFixed(1)+')');
}
const [ex,ey]=bahn[bahn.length-1];
assert.ok(ex>300&&ey<60,'Der Weg endet nicht am Gipfel, sondern bei '+ex.toFixed(0)+'/'+ey.toFixed(0));

/* ---- Die Lager stehen auf dem Weg ---- */
const lager=[...quelle.matchAll(/translate\((-?[\d.]+) (-?[\d.]+)\) scale\(\.52\)/g)]
  .map(m=>({tx:Number(m[1]),ty:Number(m[2])}));
assert.equal(lager.length,2,'erwartete zwei Lager, fand '+lager.length);
/* Das Zelt steckt im Kaestchen 3..37 breit, 4..27 hoch. */
const nahAmWeg=x=>{let b=null;
  for(const [px,py] of bahn)if(b===null||Math.abs(px-x)<Math.abs(b[0]-x))b=[px,py];
  return b[1];};
const anteile=[];
for(const {tx,ty} of lager){
  const mitte=tx+20*.52, grund=ty+27*.52, spitze=ty+4*.52;
  assert.ok(Math.abs(grund-nahAmWeg(mitte))<1.5,
    'Lager bei x='+mitte.toFixed(0)+' steht '+(grund-nahAmWeg(mitte)).toFixed(1)
    +' neben dem Weg statt darauf');
  assert.ok(spitze>grat(mitte),
    'Die Spitze des Lagers bei x='+mitte.toFixed(0)+' ragt ueber den Grat in den Himmel');
  /* Wie weit ist das Lager den Weg hinauf? */
  let bis=0;
  for(let i=1;i<bahn.length;i++){
    if(bahn[i][0]>mitte)break;
    bis+=Math.hypot(bahn[i][0]-bahn[i-1][0],bahn[i][1]-bahn[i-1][1]);
  }
  let ganz=0;
  for(let i=1;i<bahn.length;i++)ganz+=Math.hypot(bahn[i][0]-bahn[i-1][0],bahn[i][1]-bahn[i-1][1]);
  anteile.push(bis/ganz);
}
/* Die Runde schreitet in Zehnteln voran. Stuenden die Lager auf einem
   Zehntel, stellte sich die Figur bei jeder Runde mitten ins Zelt. */
for(const a of anteile){
  const abstand=Math.min(...[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1].map(z=>Math.abs(a-z)));
  assert.ok(abstand>0.03,'Ein Lager liegt bei '+(a*100).toFixed(0)
    +' % und damit auf einem Halt der Runde - die Figur landet darin');
}
assert.ok(anteile[1]-anteile[0]>0.2,'Die Lager stehen zu dicht beieinander');

console.log('Berg: Weg laeuft parallel am Grat ('+klein.toFixed(1)+' bis '+gross.toFixed(1)
  +' darunter), Lager sitzen bei '+anteile.map(a=>Math.round(a*100)+' %').join(' und ')+' auf dem Weg');
