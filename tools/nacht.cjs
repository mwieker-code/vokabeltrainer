/* =========================================================================
   NACHTAUFSTIEG - die Farben fuer den dunklen Bildschirm
   -------------------------------------------------------------------------
   Die Seiten tragen ihre Farben an vielen Stellen fest eingetragen: in den
   gemeinsamen Dateien unter assets/, in den Vorschau-Dateien der Jahrgaenge
   und im <style>-Block jeder Seite. Von Hand nachgezogen waere jede dieser
   Stellen beim naechsten Umbau still wieder hell.

   Dieses Werkzeug liest deshalb jede Farbregel und schreibt ihr dunkles
   Gegenstueck gleich dahinter:

     assets/learning.css        ->  assets/learning-nacht.css
     yearN/design/preview.css   ->  yearN/design/preview-nacht.css
     <style> in der Seite       ->  <style media="screen" data-nacht> danach

   Jedes Gegenstueck steht direkt hinter seinem Original. So bleibt die
   Reihenfolge der Regeln dieselbe, und es gewinnt weiterhin, was vorher
   gewonnen hat. Alles gilt nur fuer den Bildschirm (media="screen"): Der
   Druck bleibt schwarz auf weiss, wie die Arbeitsblaetter es brauchen.

   Wie umgerechnet wird, entscheidet die Rolle der Farbe:
     Flaeche  (background)        hell  -> dunkel, gleicher Farbton
     Schrift  (color, fill ...)   dunkel -> hell, gleicher Farbton
     Linie    (border, outline)   hell  -> gedaempft dunkel
   Kraeftige Farben (Unit-Farben, Knoepfe mit weisser Schrift) bleiben, wie
   sie sind. Gerechnet wird in OKLab, damit "gleicher Farbton" auch so
   aussieht.

   Obenauf kommt assets/nacht-marke.css, von Hand geschrieben: Schriften,
   Alpengluehen, Tastenfeld, Berg. Die Datei wird nur verlinkt, nicht
   erzeugt.

   Aufruf:  node tools/nacht.cjs          schreibt alles neu
            node tools/nacht.cjs --check  meldet, ob etwas veraltet ist
   ========================================================================= */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MARKE = 'assets/nacht-marke.css';
const THEMA = 'assets/thema.js';

/* ---------------------------------------------------------------- Farben */
function srgbZuLinear(c){ c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linearZuSrgb(c){ const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return v * 255; }
function zuOklch(r, g, b){
  r = srgbZuLinear(r); g = srgbZuLinear(g); b = srgbZuLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, B), H: Math.atan2(B, A) };
}
function ausOklch(L, C, H){
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
  return [ 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s ].map(linearZuSrgb);
}
/* Liegt die Farbe ausserhalb von sRGB, wird die Buntheit zurueckgenommen,
   nicht die Helligkeit - die ist es, auf die es hier ankommt. */
function imRaum(L, C, H){
  let lo = 0, hi = C, rgb = ausOklch(L, C, H);
  const drin = v => v.every(x => x >= -0.5 && x <= 255.5);
  if (drin(rgb)) return rgb;
  for (let i = 0; i < 24; i++){
    const mid = (lo + hi) / 2, t = ausOklch(L, mid, H);
    if (drin(t)){ lo = mid; rgb = t; } else hi = mid;
  }
  return ausOklch(L, lo, H);
}
const hex2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');

function lies(text){
  let m = /^#([0-9a-f]{3,8})$/i.exec(text);
  if (m){
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
             a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(text);
  if (m){
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4] && m[4].endsWith('%')) a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  const namen = { white: [255, 255, 255], black: [0, 0, 0] };
  if (namen[text.toLowerCase()]){ const [r, g, b] = namen[text.toLowerCase()]; return { r, g, b, a: 1 }; }
  return null;
}
function schreib(r, g, b, a){
  const h = '#' + hex2(r) + hex2(g) + hex2(b);
  return a >= 0.999 ? h.toUpperCase() : (h + hex2(a * 255)).toUpperCase();
}

/* Die drei Rollen. Die Zahlen sind so gewaehlt, dass Weiss auf der
   Kartenfarbe der Marke landet (#161B24), zarte Toenungen als dunkle
   Toenungen desselben Farbtons erhalten bleiben und dunkle Schrift auf
   dem Nachtgrund gut lesbar wird. */
function wandle(farbe, rolle){
  const c = lies(farbe);
  if (!c) return farbe;
  const { L, C, H } = zuOklch(c.r, c.g, c.b);
  let nL = L, nC = C;
  if (rolle === 'flaeche'){
    if (L < 0.62) return farbe;
    nL = 0.215 + Math.max(0, 0.99 - L) * 0.45;
    nC = Math.min(C * 1.3, 0.06);
  } else if (rolle === 'schrift'){
    if (L > 0.62) return farbe;
    nL = 0.95 - L * 0.2;
    nC = Math.min(C * 0.8, 0.12);
  } else if (rolle === 'linie'){
    if (L >= 0.6){ nL = 0.30 + (1 - L) * 0.45; nC = Math.min(C, 0.06); }
    else if (L < 0.3){ nL = 0.45; }
    else return farbe;
  } else return farbe;
  /* Grau bleibt nicht grau: Unbunte Flaechen und Linien bekommen den
     kuehlen Ton des Nachthimmels, sonst stuenden sie wie Fremdkoerper
     zwischen den getoenten. */
  let nH = H;
  if (C < 0.006 && rolle !== 'schrift'){ nH = NACHT.H; nC = NACHT.C; }
  const [r, g, b] = imRaum(nL, nC, nH);
  return schreib(r, g, b, c.a);
}

const NACHT = zuOklch(0x16, 0x1B, 0x24);   // #161B24, die Kartenfarbe der Marke
const FARBE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function rolleVon(prop){
  prop = prop.toLowerCase();
  if (prop.startsWith('--')){
    if (/ink|text|fg|schrift|unit-ink|card-ink/.test(prop)) return 'schrift';
    if (/edge|rule|line|border|rand/.test(prop)) return 'linie';
    if (/bg|tint|ground|card|tile|paper|surface|flaeche/.test(prop)) return 'flaeche';
    return 'var';
  }
  if (/^(background|background-color|background-image)$/.test(prop)) return 'flaeche';
  if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color|stop-color)$/.test(prop)) return 'schrift';
  if (/^(border|outline|column-rule)/.test(prop)) return 'linie';
  return null;   // Schatten, accent-color und alles andere bleiben
}
/* Unbekannte Variablen: nach Helligkeit. Sehr hell ist fast immer eine
   Flaeche, sehr dunkel fast immer Schrift. Dazwischen bleibt es. */
function wandleVariable(farbe){
  const c = lies(farbe);
  if (!c) return farbe;
  const { L } = zuOklch(c.r, c.g, c.b);
  if (L > 0.8) return wandle(farbe, 'flaeche');
  if (L < 0.4) return wandle(farbe, 'schrift');
  return farbe;
}
function wandleWert(prop, wert){
  const rolle = rolleVon(prop);
  if (!rolle) return wert;
  /* Bilder als data-URI tragen eigene Farben - nicht anfassen. */
  if (/url\(/i.test(wert)) return wert;
  return wert.replace(FARBE, f => rolle === 'var' ? wandleVariable(f) : wandle(f, rolle));
}

/* ------------------------------------------------------------ CSS lesen */
function ohneKommentare(css){ return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
function parse(css){
  css = ohneKommentare(css);
  let i = 0;
  function block(){
    const out = [];
    while (i < css.length){
      while (i < css.length && /\s/.test(css[i])) i++;
      if (i >= css.length) break;
      if (css[i] === '}'){ i++; break; }
      const start = i;
      let tiefe = 0, q = null;
      while (i < css.length){
        const ch = css[i];
        if (q){ if (ch === '\\') i++; else if (ch === q) q = null; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (ch === '(') tiefe++;
        else if (ch === ')') tiefe--;
        else if (tiefe === 0 && (ch === '{' || ch === ';' || ch === '}')) break;
        i++;
      }
      const kopf = css.slice(start, i).trim();
      if (css[i] === ';'){ i++; continue; }          // @import o. ae.
      if (css[i] === '}'){ continue; }
      i++;                                           // {
      if (kopf.startsWith('@')){
        const name = /^@([\w-]+)/.exec(kopf)[1].toLowerCase();
        if (/^(media|supports|layer|container)$/.test(name)) out.push({ at: kopf, kinder: block() });
        else { rumpf(); }                            // keyframes, font-face, page
      } else out.push({ sel: kopf, decl: deklarationen(rumpf()) });
    }
    return out;
  }
  function rumpf(){
    const start = i;
    let tiefe = 1, q = null;
    while (i < css.length){
      const ch = css[i];
      if (q){ if (ch === '\\') i++; else if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === '{') tiefe++;
      else if (ch === '}'){ tiefe--; if (!tiefe) break; }
      i++;
    }
    const text = css.slice(start, i); i++;
    return text;
  }
  return block();
}
function deklarationen(text){
  const out = [];
  let tiefe = 0, q = null, start = 0;
  const nimm = s => {
    const k = s.indexOf(':');
    if (k < 0) return;
    const prop = s.slice(0, k).trim();
    let wert = s.slice(k + 1).trim();
    const wichtig = /!important\s*$/i.test(wert);
    if (wichtig) wert = wert.replace(/\s*!important\s*$/i, '');
    if (prop) out.push({ prop, wert, wichtig });
  };
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){ if (ch === '\\') i++; else if (ch === q) q = null; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '(') tiefe++;
    else if (ch === ')') tiefe--;
    else if (ch === ';' && !tiefe){ nimm(text.slice(start, i)); start = i + 1; }
  }
  nimm(text.slice(start));
  return out;
}

/* ------------------------------------------------------ Gegenstueck bauen */
function nurDruck(at){ return /^@media\b/i.test(at) && /\bprint\b/i.test(at) && !/\bscreen\b/i.test(at) && !/\bnot\s+print\b/i.test(at); }
/* Innerhalb einer Datei hebt eine spaetere Regel eine fruehere auf - etwa
   ".masthead{border:1px solid ...}" und weiter unten ".masthead{border:0}".
   Das Gegenstueck steht aber hinter der ganzen Datei; schriebe es die
   fruehe Farbe, kaeme der laengst entfernte Rahmen zurueck. Deshalb zaehlt
   je Selektor und Eigenschaft nur die letzte Angabe, und eine Kurzform
   (border, background, outline) loescht die Einzelangaben davor. */
function deckt(kurz, lang){
  if (kurz === lang) return true;
  return /^(border|background|outline|border-(top|right|bottom|left))$/.test(kurz) && lang.startsWith(kurz + '-');
}
function gegenstueck(css){
  const stand = new Map();   // Kontext+Selektor -> Map(prop -> {wert, neu, wichtig, nr})
  let nr = 0;
  (function lauf(knoten, kontext){
    for (const k of knoten){
      if (k.at){
        if (nurDruck(k.at)) continue;
        lauf(k.kinder, kontext.concat(k.at));
        continue;
      }
      const sel = k.sel.replace(/\s+/g, ' ');
      const schluessel = kontext.join('\u0000') + '\u0001' + sel;
      if (!stand.has(schluessel)) stand.set(schluessel, { kontext, sel, props: new Map() });
      const props = stand.get(schluessel).props;
      for (const d of k.decl){
        const p = d.prop.toLowerCase();
        /* !important verliert nicht gegen eine spaetere Angabe ohne. */
        const alt = props.get(p);
        if (alt && alt.wichtig && !d.wichtig) continue;
        for (const q of [...props.keys()]) if (q !== p && deckt(p, q) && !(props.get(q).wichtig && !d.wichtig)) props.delete(q);
        props.set(p, { prop: d.prop, wert: d.wert, neu: wandleWert(d.prop, d.wert), wichtig: d.wichtig, nr: nr++ });
      }
    }
  })(parse(css), []);
  /* In der Reihenfolge der letzten Angabe ausgeben, damit auch zwischen
     verschiedenen Selektoren gleicher Staerke die Reihenfolge stimmt. */
  const posten = [];
  for (const { kontext, sel, props } of stand.values())
    for (const d of props.values())
      if (d.neu !== d.wert) posten.push({ kontext, sel, text: d.prop + ':' + d.neu + (d.wichtig ? '!important' : ''), nr: d.nr });
  posten.sort((a, b) => a.nr - b.nr);
  const zeilen = [];
  let letzte = null;
  for (const p of posten){
    const kopf = p.kontext.join(' ') + '|' + p.sel;
    if (letzte && letzte.kopf === kopf){ letzte.texte.push(p.text); continue; }
    letzte = { kopf, kontext: p.kontext, sel: p.sel, texte: [p.text] };
    zeilen.push(letzte);
  }
  return zeilen.map(z => {
    const bild = z.kontext.some(k => /^@(-webkit-)?keyframes|^@font-face|^@page/i.test(k));
    let r = (bild ? z.sel : nurNachts(z.sel)) + '{' + z.texte.join(';') + '}';
    for (let i = z.kontext.length - 1; i >= 0; i--) r = z.kontext[i] + '{' + r + '}';
    return r;
  }).join('\n');
}
/* Hell oder Nacht waehlt assets/thema.js ueber html[data-thema]. Jede
   dunkle Regel gilt nur, solange dort nicht "hell" steht. :where() zaehlt
   nicht mit - die Staerke jeder Regel bleibt, wie sie war. */
const NICHT_HELL = ':not([data-thema="hell"])';
function teile(sel){
  const teile = [];
  let tiefe = 0, anfang = 0;
  for (let i = 0; i < sel.length; i++){
    const c = sel[i];
    if (c === '(' || c === '[') tiefe++;
    else if (c === ')' || c === ']') tiefe--;
    else if (c === ',' && tiefe === 0){ teile.push(sel.slice(anfang, i)); anfang = i + 1; }
  }
  teile.push(sel.slice(anfang));
  return teile.map(t => t.trim()).filter(Boolean);
}
function nurNachts(sel){
  return teile(sel).map(t => {
    const m = /^(:root|html)(?![\w-])/i.exec(t);
    if (m) return m[1] + ':where(' + NICHT_HELL + ')' + t.slice(m[1].length);
    return ':where(html' + NICHT_HELL + ') ' + t;
  }).join(',');
}

const KOPF = '/* Automatisch erzeugt von tools/nacht.cjs aus {QUELLE} - nicht von Hand aendern.\n'
           + '   Dunkle Gegenstuecke der Farbregeln, nur fuer den Bildschirm. */\n';

/* -------------------------------------------------------------- Seiten */
function seiten(){
  const liste = [];
  (function suche(dir){
    for (const e of fs.readdirSync(dir, { withFileTypes: true })){
      if (['dist', 'node_modules', '.git', 'tests', 'content', 'probe', 'tools'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) suche(p);
      else if (e.name === 'index.html' && dir !== ROOT) liste.push(p);
    }
  })(ROOT);
  return liste.sort();
}
function fassung(){ return JSON.parse(fs.readFileSync(path.join(ROOT, 'fassung.json'), 'utf8')).fassung; }
const nachtName = f => f.replace(/\.css$/, '-nacht.css');

/* Baut alle Dateien im Speicher. Rueckgabe: Pfad -> Inhalt. */
function baue(){
  const dateien = new Map();
  const v = fassung();
  for (const seite of seiten()){
    let html = fs.readFileSync(seite, 'utf8');
    const ordner = path.dirname(seite);
    /* Alte Gegenstuecke entfernen - dann von vorn. */
    html = html.replace(/\n?<style media="screen" data-nacht>[\s\S]*?<\/style>/g, '')
               .replace(/\n?<link rel="stylesheet" media="screen" data-nacht href="[^"]*">/g, '')
               .replace(/\n?<script data-nacht src="[^"]*"><\/script>/g, '');
    if (!/<link rel="stylesheet"|<style/.test(html)) continue;
    /* 0. Der Schalter fuer Hell und Nacht vor dem ersten Stylesheet. */
    const thema = path.relative(ordner, path.join(ROOT, THEMA)).split(path.sep).join('/');
    const erstes = html.search(/<link rel="stylesheet"|<style/);
    html = html.slice(0, erstes) + '<script data-nacht src="' + thema + '?v=' + v + '"></script>\n' + html.slice(erstes);
    /* 1. Jeder <style>-Block bekommt sein Gegenstueck dahinter. */
    html = html.replace(/<style>([\s\S]*?)<\/style>/g, (ganz, css) => {
      const g = gegenstueck(css);
      return g ? ganz + '\n<style media="screen" data-nacht>\n' + g + '\n</style>' : ganz;
    });
    /* 2. Jede verlinkte CSS-Datei ebenso, ausser den Schriften. */
    html = html.replace(/<link rel="stylesheet" href="([^"?]+\.css)(\?[^"]*)?">/g, (ganz, href) => {
      if (/fonts\.css$|-nacht\.css$|nacht-marke\.css$/.test(href)) return ganz;
      const quelle = path.resolve(ordner, href);
      if (!fs.existsSync(quelle)) return ganz;
      const rel = path.relative(ROOT, quelle);
      const g = gegenstueck(fs.readFileSync(quelle, 'utf8'));
      if (!g) return ganz;
      dateien.set(nachtName(rel), KOPF.replace('{QUELLE}', rel) + g + '\n');
      return ganz + '\n<link rel="stylesheet" media="screen" data-nacht href="' + nachtName(href) + '?v=' + v + '">';
    });
    /* 3. Die Marke kommt ganz ans Ende, hinter das letzte Stylesheet. */
    const marke = path.relative(ordner, path.join(ROOT, MARKE)).split(path.sep).join('/');
    const letzte = Math.max(html.lastIndexOf('<link rel="stylesheet"'), html.lastIndexOf('</style>'));
    const ende = html.lastIndexOf('<link rel="stylesheet"') > html.lastIndexOf('</style>')
      ? html.indexOf('>', letzte) + 1 : letzte + '</style>'.length;
    html = html.slice(0, ende) + '\n<link rel="stylesheet" media="screen" data-nacht href="' + marke + '?v=' + v + '">' + html.slice(ende);
    dateien.set(path.relative(ROOT, seite), html);
  }
  return dateien;
}

if (require.main === module){
  const pruefen = process.argv.includes('--check');
  let veraltet = [];
  for (const [rel, inhalt] of baue()){
    const ziel = path.join(ROOT, rel);
    const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : null;
    if (alt === inhalt) continue;
    if (pruefen) veraltet.push(rel);
    else fs.writeFileSync(ziel, inhalt);
  }
  if (pruefen && veraltet.length){
    console.error('Nachtfarben veraltet - bitte "node tools/nacht.cjs" laufen lassen:\n  ' + veraltet.join('\n  '));
    process.exit(1);
  }
  console.log(pruefen ? 'Nachtfarben aktuell.' : 'Nachtfarben geschrieben.');
}
module.exports = { baue, wandle, gegenstueck, parse, nurNachts };
