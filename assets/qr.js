/* Minimaler QR-Encoder (Byte-Modus, Fehlerkorrektur M, Versionen 1-20).
   Eigenständig, damit die Seite weiterhin ohne fremde Bibliotheken auskommt
   und offline funktioniert. window.QR.matrix(text) liefert ein Feld aus
   0/1-Zeilen oder null, wenn der Text nicht hineinpasst. */
(function(){
'use strict';

/* Pro Version: [EC-Codewörter je Block, Blöcke Gruppe 1, Datenwörter Gruppe 1,
   Blöcke Gruppe 2, Datenwörter Gruppe 2] für Fehlerkorrekturstufe M. */
const EC_M = [
 null,
 [10,1,16,0,0],   [16,1,28,0,0],   [26,1,44,0,0],   [18,2,32,0,0],   [24,2,43,0,0],
 [16,4,27,0,0],   [18,4,31,0,0],   [22,2,38,2,39],  [22,3,36,2,37],  [26,4,43,1,44],
 [30,1,50,4,51],  [22,6,36,2,37],  [22,8,37,1,38],  [24,4,40,5,41],  [24,5,41,5,42],
 [28,7,45,3,46],  [28,10,46,1,47], [26,9,43,4,44],  [26,3,44,11,45], [26,3,41,13,42]
];

const ALIGN = [
 null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
 [6,22,38], [6,24,42], [6,26,46], [6,28,50], [6,30,54], [6,32,58], [6,34,62],
 [6,26,46,66], [6,26,48,70], [6,26,50,74], [6,30,54,78], [6,30,56,82],
 [6,30,58,86], [6,34,62,90]
];

/* ---- Galois-Feld GF(256) für Reed-Solomon ---- */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function(){
  let x = 1;
  for(let i = 0; i < 255; i++){
    EXP[i] = x; LOG[x] = i;
    x <<= 1;
    if(x & 0x100) x ^= 0x11d;
  }
  for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

function generator(degree){
  let poly = [1];
  for(let i = 0; i < degree; i++){
    const next = new Array(poly.length + 1).fill(0);
    for(let j = 0; j < poly.length; j++){
      next[j] ^= poly[j];                      // mit x multiplizieren
      next[j + 1] ^= mul(poly[j], EXP[i]);     // plus Alpha^i mal Polynom
    }
    poly = next;
  }
  return poly;
}

function ecCodewords(data, count){
  const gen = generator(count);
  const rest = data.concat(new Array(count).fill(0));
  for(let i = 0; i < data.length; i++){
    const factor = rest[i];
    if(!factor) continue;
    for(let j = 0; j < gen.length; j++) rest[i + j] ^= mul(gen[j], factor);
  }
  return rest.slice(data.length);
}

/* ---- Bitstrom ---- */
function bitStream(bytes, version, dataCodewords){
  const bits = [];
  const push = (value, length) => { for(let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1); };
  push(4, 4);                                   // Byte-Modus
  push(bytes.length, version < 10 ? 8 : 16);
  for(const b of bytes) push(b, 8);
  const capacity = dataCodewords * 8;
  for(let i = 0; i < 4 && bits.length < capacity; i++) bits.push(0);   // Abschluss
  while(bits.length % 8) bits.push(0);
  const out = [];
  for(let i = 0; i < bits.length; i += 8){
    let byte = 0;
    for(let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    out.push(byte);
  }
  const pad = [0xEC, 0x11];
  for(let i = 0; out.length < dataCodewords; i++) out.push(pad[i % 2]);
  return out;
}

/* ---- Blöcke bilden und verschränken ---- */
function codewords(bytes, version){
  const [ecPer, g1, d1, g2, d2] = EC_M[version];
  const dataTotal = g1 * d1 + g2 * d2;
  const data = bitStream(bytes, version, dataTotal);
  const blocks = [];
  let at = 0;
  for(let i = 0; i < g1; i++){ blocks.push(data.slice(at, at + d1)); at += d1; }
  for(let i = 0; i < g2; i++){ blocks.push(data.slice(at, at + d2)); at += d2; }
  const ec = blocks.map(b => ecCodewords(b, ecPer));
  const out = [];
  const longest = Math.max(d1, d2);
  for(let i = 0; i < longest; i++)
    for(const b of blocks) if(i < b.length) out.push(b[i]);
  for(let i = 0; i < ecPer; i++)
    for(const b of ec) out.push(b[i]);
  return out;
}

/* ---- Modulraster ---- */
function place(version, words){
  const size = version * 4 + 17;
  const grid = Array.from({length: size}, () => new Array(size).fill(null));
  const fixed = Array.from({length: size}, () => new Array(size).fill(false));
  const set = (r, c, v) => { grid[r][c] = v; fixed[r][c] = true; };

  const finder = (row, col) => {
    for(let r = -1; r <= 7; r++) for(let c = -1; c <= 7; c++){
      const rr = row + r, cc = col + c;
      if(rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const edge = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      set(rr, cc, edge || core ? 1 : 0);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

  for(let i = 8; i < size - 8; i++){                       // Taktmuster
    const v = i % 2 === 0 ? 1 : 0;
    set(6, i, v); set(i, 6, v);
  }

  /* Ausrichtungsmuster: nur die drei, die auf den Suchmustern liegen, entfallen.
     Muster auf der Taktlinie werden gezeichnet und überschreiben sie. */
  const centers = ALIGN[version], last = centers.length - 1;
  for(let a = 0; a < centers.length; a++) for(let b = 0; b < centers.length; b++){
    if((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) continue;
    const r = centers[a], c = centers[b];
    for(let dr = -2; dr <= 2; dr++) for(let dc = -2; dc <= 2; dc++)
      set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0);
  }

  set(size - 8, 8, 1);                                      // dunkles Modul
  for(let i = 0; i < 9; i++){                               // Formatbereich freihalten
    if(!fixed[8][i]) set(8, i, 0);
    if(!fixed[i][8]) set(i, 8, 0);
  }
  for(let i = 0; i < 8; i++){
    if(!fixed[8][size - 1 - i]) set(8, size - 1 - i, 0);
    if(!fixed[size - 1 - i][8]) set(size - 1 - i, 8, 0);
  }
  if(version >= 7){                                         // Versionsbereich freihalten
    for(let i = 0; i < 6; i++) for(let j = 0; j < 3; j++){
      set(size - 11 + j, i, 0); set(i, size - 11 + j, 0);
    }
  }

  let bit = 0;
  const total = words.length * 8;
  let up = true;
  for(let col = size - 1; col > 0; col -= 2){
    if(col === 6) col--;                                    // Taktspalte überspringen
    for(let step = 0; step < size; step++){
      const row = up ? size - 1 - step : step;
      for(let c = 0; c < 2; c++){
        const cc = col - c;
        if(fixed[row][cc]) continue;
        let v = 0;
        if(bit < total) v = (words[bit >> 3] >> (7 - (bit & 7))) & 1;
        bit++;
        grid[row][cc] = v;
      }
    }
    up = !up;
  }
  return {grid, fixed, size};
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0
];

function penalty(grid){
  const size = grid.length;
  let score = 0;
  const line = cells => {
    let run = 1;
    for(let i = 1; i < cells.length; i++){
      if(cells[i] === cells[i - 1]) run++;
      else { if(run >= 5) score += 3 + (run - 5); run = 1; }
    }
    if(run >= 5) score += 3 + (run - 5);
    const pattern = cells.join('');
    for(const p of ['1011101' + '0000', '0000' + '1011101']){
      let at = pattern.indexOf(p);
      while(at !== -1){ score += 40; at = pattern.indexOf(p, at + 1); }
    }
  };
  for(let r = 0; r < size; r++) line(grid[r]);
  for(let c = 0; c < size; c++) line(grid.map(row => row[c]));
  for(let r = 0; r < size - 1; r++) for(let c = 0; c < size - 1; c++){
    const v = grid[r][c];
    if(v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
  }
  let dark = 0;
  for(const row of grid) for(const v of row) dark += v;
  score += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
  return score;
}

function formatBits(mask){
  const data = (0 << 3) | mask;                 // Stufe M = 00
  let value = data << 10;
  for(let i = 4; i >= 0; i--) if(value & (1 << (i + 10))) value ^= 0x537 << i;
  return ((data << 10) | value) ^ 0x5412;
}

function versionBits(version){
  let value = version << 12;
  for(let i = 5; i >= 0; i--) if(value & (1 << (i + 12))) value ^= 0x1f25 << i;
  return (version << 12) | value;
}

function finish(version, base, mask){
  const size = base.size;
  const grid = base.grid.map(row => row.slice());
  for(let r = 0; r < size; r++) for(let c = 0; c < size; c++)
    if(!base.fixed[r][c] && MASKS[mask](r, c)) grid[r][c] ^= 1;

  const fmt = formatBits(mask);
  for(let i = 0; i < 15; i++){
    const bit = (fmt >> i) & 1;
    if(i < 6) grid[i][8] = bit;              // erste Kopie: senkrecht in Spalte 8
    else if(i === 6) grid[7][8] = bit;
    else if(i === 7) grid[8][8] = bit;
    else if(i === 8) grid[8][7] = bit;
    else grid[8][14 - i] = bit;              // und waagerecht in Zeile 8

    if(i < 8) grid[8][size - 1 - i] = bit;
    else grid[size - 15 + i][8] = bit;
  }
  grid[size - 8][8] = 1;

  if(version >= 7){
    const ver = versionBits(version);
    for(let i = 0; i < 18; i++){
      const bit = (ver >> i) & 1;
      const r = Math.floor(i / 3), c = i % 3;
      grid[size - 11 + c][r] = bit;
      grid[r][size - 11 + c] = bit;
    }
  }
  return grid;
}

function matrix(text){
  const bytes = [];
  for(const byte of new TextEncoder().encode(String(text))) bytes.push(byte);
  if(!bytes.length) return null;
  for(let version = 1; version <= 20; version++){
    const [ecPer, g1, d1, g2, d2] = EC_M[version];
    const dataCodewords = g1 * d1 + g2 * d2;
    const needed = 4 + (version < 10 ? 8 : 16) + bytes.length * 8;
    if(needed > dataCodewords * 8) continue;
    const base = place(version, codewords(bytes, version));
    let best = null, bestScore = Infinity;
    for(let mask = 0; mask < 8; mask++){
      const grid = finish(version, base, mask);
      const score = penalty(grid);
      if(score < bestScore){ bestScore = score; best = grid; }
    }
    return best;
  }
  return null;
}

/* Liefert den QR-Code als SVG-Zeichenkette - druckt scharf in jeder Größe. */
function svg(text, options){
  const grid = matrix(text);
  if(!grid) return null;
  const quiet = (options && options.quiet) || 4;
  const size = grid.length + quiet * 2;
  let path = '';
  for(let r = 0; r < grid.length; r++) for(let c = 0; c < grid.length; c++)
    if(grid[r][c]) path += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" '
    + 'shape-rendering="crispEdges" role="img" aria-label="QR-Code zum Lernauftrag">'
    + '<rect width="' + size + '" height="' + size + '" fill="#fff"/>'
    + '<path d="' + path + '" fill="#000"/></svg>';
}

/* Zeichnet denselben Code auf ein Canvas - nur für die Zwischenablage, wo
   Programme wie Word ein Rasterbild erwarten. Liefert null, wenn der Browser
   kein Canvas bereitstellt. */
function canvas(text, options){
  const grid = matrix(text);
  if(!grid) return null;
  const quiet = (options && options.quiet) || 4;
  const scale = (options && options.scale) || Math.max(4, Math.ceil(640 / (grid.length + quiet * 2)));
  const side = (grid.length + quiet * 2) * scale;
  const el = document.createElement('canvas');
  el.width = side; el.height = side;
  const ctx = el.getContext && el.getContext('2d');
  if(!ctx) return null;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, side, side);
  ctx.fillStyle = '#000';
  for(let r = 0; r < grid.length; r++) for(let c = 0; c < grid.length; c++)
    if(grid[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
  return el;
}

window.QR = {matrix, svg, canvas};
})();
