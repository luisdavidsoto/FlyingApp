// Se ejecuta en cada deploy de Cloudflare Pages.
// Lee los PDF de public/aip, detecta aeropuerto y ciclo, organiza las hojas por categoría
// y escribe public/aip/index.json, que es lo que lee la app.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let pdfjs = null;
try { pdfjs = require('pdfjs-dist/legacy/build/pdf.js'); } catch (e) { console.warn('pdfjs no disponible:', e.message); }

const DIR = path.join(__dirname, 'public', 'aip');
const CATS = [
  ['Plano de aeródromo', /aerodrome chart|plano de aer[oó]dromo|\bADC\b/i],
  ['Estacionamiento / movimientos en tierra', /parking|docking|estacionamiento|ground movement|movimientos? en tierra/i],
  ['Salidas (SID)', /\bSID\b|salida normalizada|standard instrument departure/i],
  ['Llegadas (STAR)', /\bSTAR\b|llegada normalizada|standard instrument arrival/i],
  ['Aproximaciones por instrumentos', /instrument approach|aproximaci[oó]n por instrumentos|\bIAC\b|\b(ILS|LOC|VOR|NDB|RNAV|RNP|GNSS|TACAN)\b/i],
  ['Visual / circuito de tránsito', /visual approach|aproximaci[oó]n visual|aerodrome circuit|circuit|circuito|\bVAC\b/i],
  ['Otras cartas', /./]
];

function parseAip(T) {
  const out = { info: [], ch: {}, idx: false }, D = '-\u00ad\u2010-\u2015', pn = {};
  const reH = new RegExp('AD\\s*2\\s*S[KQ][A-Z]{2}\\s*[' + D + ']\\s*(\\d{1,3})\\b');
  T.forEach((t, i) => { const m = t.slice(0, 300).match(reH); if (m && !(m[1] in pn)) pn[m[1]] = i + 1; });
  const reI = /S[KQ][A-Z]{2}\s+AD\s*2\.(\d{1,2})\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 ,\/\-\.()]{3,90}?)(?=\s+S[KQ][A-Z]{2}\s+AD\s*2\.|[^A-ZÁÉÍÓÚÑ0-9 ,\/\-\.()]|$)/g;
  T.forEach((t, i) => { for (const m of t.matchAll(reI)) { const n = +m[1]; if (n > 24 || out.info.some(x => x[0] === n)) continue; out.info.push([n, m[2].split(/\.\s|\sS[KQ][A-Z]{2}\s/)[0].trim().slice(0, 70), i + 1]); } });
  const reC = new RegExp('AD\\s*2\\s*S[KQ][A-Z]{2}\\s*[' + D + ']\\s*(\\d{1,3})\\b', 'g');
  const f24 = T.findIndex(t => /AD\s*2\.24/.test(t)); const seen = new Set();
  if (f24 >= 0) for (let i = f24; i < Math.min(T.length, f24 + 4); i++) {
    const body = T[i], hm = body.slice(0, 250).match(reH); let last = hm ? hm.index + hm[0].length : 0;
    for (const m of body.matchAll(reC)) {
      if (m.index < last) continue;
      let title = body.slice(last, m.index).replace(/\s+/g, ' ').trim(); last = m.index + m[0].length;
      title = title.replace(/^.*(CHARTS RELATED TO AN AERODROME|RELATIVAS? AL AER[ÓO]DROMO)\s*/i, '').replace(/^[|\s.:-]+/, '').slice(-90);
      const pg = pn[m[1]];
      if (!pg || title.length < 3 || /AIRAC|AIP COLOMBIA|AIS COLOMBIA/i.test(title) || seen.has(title + pg)) continue;
      seen.add(title + pg); const cat = CATS.find(c => c[1].test(title))[0]; (out.ch[cat] = out.ch[cat] || []).push([title, pg]);
    }
  }
  out.idx = Object.keys(out.ch).length > 0;
  if (!out.idx) T.forEach((t, i) => {
    if (t.length > 1500) return; const head = t.slice(0, 700);
    for (const c of CATS.slice(0, 6)) if (c[1].test(head)) { (out.ch[c[0]] = out.ch[c[0]] || []).push([head.replace(/AIP|COLOMBIA|AIS COLOMBIA|AIRAC AMDT \d+\/\d+|\d{1,2} [A-Z]{3} \d{4}/g, '').trim().slice(0, 60) || 'Hoja', i + 1]); break; }
  });
  return out;
}

async function textOf(buf) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
  const T = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i), tc = await pg.getTextContent();
    T.push(tc.items.map(x => x.str).join(' ').replace(/\s+/g, ' ')); pg.cleanup();
  }
  return T;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const files = fs.readdirSync(DIR).filter(f => /\.pdf$/i.test(f)).sort();
  const out = { generated: new Date().toISOString(), airports: {} };
  for (const f of files) {
    try {
      const buf = fs.readFileSync(path.join(DIR, f)), size = buf.length;
      if (size >= 25 * 1024 * 1024) console.warn('AVISO: ' + f + ' pesa 25 MiB o más; Cloudflare Pages no lo publicará.');
      let T = []; try { if (pdfjs) T = await textOf(buf); } catch (e) { console.warn('No pude leer el texto de ' + f + ': ' + e.message); }
      let ic = (f.match(/AD\s*2\s*([A-Z]{4})/i) || [])[1];
      if (!ic && T.length) ic = (T.slice(0, 2).join(' ').match(/AD\s*2\s*(S[KQ][A-Z]{2})/) || [])[1];
      if (!ic) { console.warn('Archivo sin código OACI reconocible: ' + f); continue; }
      ic = ic.toUpperCase();
      const head = T.slice(0, 3).join(' '), cm = head.match(/AMDT\s*(\d+)\s*\/\s*(\d+)/), dm = head.match(/(\d{1,2}\s+[A-Z]{3}\s+\d{4})/);
      const r = T.length ? parseAip(T) : { info: [], ch: {}, idx: false };
      const label = ((f.replace(/\.pdf$/i, '').match(/AD\s*2\s*[A-Z]{4}\s*-\s*(.+)$/i) || [])[1] || ic).trim();
      out.airports[ic] = { file: f, v: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12), size, label,
        cycle: cm ? 'AMDT ' + cm[1] + '/' + cm[2] : '', val: cm ? (+cm[2]) * 1000 + (+cm[1]) : 0, date: dm ? dm[1] : '',
        pages: T.length, info: r.info, ch: r.ch, idx: !!r.idx };
      console.log('OK', ic, '|', f, '|', T.length + ' págs |', r.idx ? 'índice de cartas leído' : 'sin índice de cartas');
    } catch (e) { console.warn('Error con ' + f + ': ' + e.message); }
  }
  fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(out));
  console.log('Listo: ' + Object.keys(out.airports).length + ' aeropuerto(s) en aip/index.json');
})().catch(e => {
  console.warn('Se omitió el procesamiento del AIP:', e.message);
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), airports: {} })); } catch (x) {}
});
