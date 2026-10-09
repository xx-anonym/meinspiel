// ANNO – GeoGuessr für die deutsche Sprachgeschichte.
// Reines JavaScript ohne Build. Die Passagen liegen in data/passages.json (Index)
// und data/passages/<werk>.json; erzeugt von scripts/build_passages.py.
'use strict';

// ---------------------------------------------------------------- Regeln

const RUNDEN = 5;
const MAX_JAHR = 4000;        // exaktes Jahr
const MAX_GATTUNG = 500;
const MAX_AUTOR = 500;
const MAX_RUNDE = MAX_JAHR + MAX_GATTUNG + MAX_AUTOR;
const ABFALL = 35;            // 4000 · e^(−Abstand/35)
const SCHRITT_KOSTEN = 0.1;   // Moving: jeder Schritt kostet 10 % der möglichen Punkte

const GATTUNGEN = ['Belletristik', 'Gebrauchsliteratur', 'Wissenschaft'];
const JAHRHUNDERTE = [
  { id: '17', name: '17. Jh.', von: 1600, bis: 1699, achse: [1600, 1700] },
  { id: '18', name: '18. Jh.', von: 1700, bis: 1799, achse: [1700, 1800] },
  { id: '19', name: '19. Jh.', von: 1800, bis: 1900, achse: [1800, 1900] },
];
// Grobe Epochen der Literaturgeschichte, für die Statistik
const EPOCHEN = [
  { name: 'Barock', von: 1600, bis: 1719 },
  { name: 'Aufklärung', von: 1720, bis: 1769 },
  { name: 'Sturm und Drang, Klassik', von: 1770, bis: 1804 },
  { name: 'Romantik', von: 1805, bis: 1829 },
  { name: 'Biedermeier, Vormärz', von: 1830, bis: 1849 },
  { name: 'Realismus', von: 1850, bis: 1889 },
  { name: 'Moderne', von: 1890, bis: 1900 },
];
const BEWEGUNG = {
  move: { name: 'Moving', text: 'Du darfst dir den Absatz davor oder danach dazuholen. Jeder Schritt kostet 10 % der möglichen Punkte.' },
  nomove: { name: 'No Move', text: 'Nur die eine Passage.' },
  nmpz: { name: 'NMPZ', text: 'Nur ein einzelner Satz.' },
};
const SCHREIBUNG = {
  original: { name: 'Original', text: 'Schreibung und Typografie wie im Druck: ſ, uͤ, ꝛc., Virgeln.' },
  typo: { name: 'Moderne Typografie', text: 'Rundes s, ä/ö/ü, Komma statt Virgel, I und U statt J und V am Wortanfang. Die Rechtschreibung bleibt historisch.' },
  norm: { name: 'Normalisiert', text: 'Moderne Schreibung (Normalisierung des DTA). Es bleiben nur Wortschatz, Satzbau und Stil.' },
};
const AUSWAHL = {
  bekannt: { name: 'Bekannte Autoren', text: 'Nur Autoren, die man kennen kann: von Gryphius über Lessing, Goethe und Kant bis Fontane, Darwin und Nietzsche.' },
  alle: { name: 'Ganzes Korpus', text: 'Alle Werke des DTA-Kernkorpus, auch Predigten, Rechtsbücher, Chemie und Ratgeber von Verfassern, die heute kaum jemand kennt.' },
};
const STANDARD = Object.freeze({
  auswahl: 'bekannt',
  bewegung: 'nomove',
  schreibung: 'original',
  gattungen: [...GATTUNGEN],
  jh: JAHRHUNDERTE.map((j) => j.id),
});

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const stand = $('#stand');

// ---------------------------------------------------------------- Hilfen

const zahl = (n) => n.toLocaleString('de-DE');
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const punkteFuerJahr = (abstand) => Math.round(MAX_JAHR * Math.exp(-abstand / ABFALL));

// Urteil über eine Runde (nur nach dem Jahr) und über ein ganzes Spiel
const URTEILE = [
  [0, 'Aufs Jahr genau', 'gut'],
  [3, 'Volltreffer', 'gut'],
  [10, 'Sehr nah', 'gut'],
  [25, 'Gut geschätzt', 'mittel'],
  [50, 'Ordentlich', 'mittel'],
  [100, 'Daneben', 'schwach'],
  [Infinity, 'Weit daneben', 'schwach'],
];
const urteil = (abstand) => URTEILE.find(([bis]) => abstand <= bis);
const RAENGE = [
  [0.88, 'Meisterhaft', 'gut'],
  [0.7, 'Sehr belesen', 'gut'],
  [0.5, 'Belesen', 'mittel'],
  [0.32, 'Solide', 'mittel'],
  [0.15, 'Lehrjahre', 'schwach'],
  [0, 'Erste Seiten', 'schwach'],
];
const rang = (anteil) => RAENGE.find(([ab]) => anteil >= ab);

function jahreText(d) {
  if (d === 0) return 'aufs Jahr genau';
  return d === 1 ? '1 Jahr daneben' : `${d} Jahre daneben`;
}

// Für Suche und Vergleich: ohne Diakritika, ſ → s, klein, nur Buchstaben und Ziffern
function falten(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ſ/g, 's').replace(/ß/g, 'ss').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Deterministischer Zufall: gleicher Seed, gleiche Passagen.
function hash32(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neuerSeed() {
  const z = new Uint32Array(2);
  crypto.getRandomValues(z);
  return z[0].toString(36) + z[1].toString(36);
}

// Zählt eine Zahl hoch; mit ton tickt es dabei leise, mit steigender Tonhöhe.
function hochzaehlen(el, ziel, dauer = 1200, { von = 0, ton = false } = {}) {
  if (ruhig() || ziel === von) { el.textContent = zahl(ziel); return; }
  const start = performance.now();
  const stufen = Math.min(16, Math.max(4, Math.round(dauer / 90)));
  let stufe = -1;
  const schritt = (jetzt) => {
    if (!el.isConnected) return;
    const t = Math.min(1, (jetzt - start) / dauer);
    const k = 1 - Math.pow(1 - t, 3);
    el.textContent = zahl(Math.round(von + (ziel - von) * k));
    const s = Math.floor(k * stufen);
    if (ton && s !== stufe && t < 1) { stufe = s; Klang.zaehlen(k); }
    if (t < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

// Geplante Schritte einer Animation; ein Seitenwechsel bricht sie ab.
let plan = [];
function spaeter(fn, ms) {
  plan.push(setTimeout(fn, ms));
}
function planLeeren() {
  plan.forEach(clearTimeout);
  plan = [];
}

// Tinte: die Wörter eines Textes erscheinen nacheinander
function tinte(wurzel, auswahl = () => true, gesamt = 900) {
  if (ruhig() || !wurzel) return;
  const knoten = [];
  const gang = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  while (gang.nextNode()) {
    if (gang.currentNode.nodeValue.trim() && auswahl(gang.currentNode)) knoten.push(gang.currentNode);
  }
  const teile = knoten.map((n) => n.nodeValue.split(/(\s+)/));
  const woerter = teile.reduce((s, t) => s + t.filter((x) => x && !/^\s+$/.test(x)).length, 0);
  const takt = Math.min(16, gesamt / Math.max(1, woerter));
  let i = 0;
  knoten.forEach((n, k) => {
    const frag = document.createDocumentFragment();
    for (const teil of teile[k]) {
      if (!teil) continue;
      if (/^\s+$/.test(teil)) { frag.append(teil); continue; }
      const w = document.createElement('span');
      w.className = 'w';
      w.style.animationDelay = `${Math.round(i++ * takt)}ms`;
      w.textContent = teil;
      frag.append(w);
    }
    n.replaceWith(frag);
  });
}

let meldungZeit = null;
function meldung(text) {
  const el = $('#meldung');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('weg');
  el.classList.remove('da');
  el.getBoundingClientRect();
  el.classList.add('da');
  clearTimeout(meldungZeit);
  meldungZeit = setTimeout(() => {
    el.classList.add('weg');
    meldungZeit = setTimeout(() => { el.hidden = true; }, ruhig() ? 0 : 260);
  }, 2600);
}

// localStorage kann fehlen oder voll sein; das Spiel läuft dann ohne Speicher.
const speicher = {
  lesen(k, ersatz) {
    try {
      const s = localStorage.getItem(k);
      return s ? JSON.parse(s) : ersatz;
    } catch { return ersatz; }
  },
  schreiben(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ohne Speicher weiter */ }
  },
  loeschen(k) {
    try { localStorage.removeItem(k); } catch { /* egal */ }
  },
};

// ---------------------------------------------------------------- Einstellungen

function pruefen(e) {
  const g = (e && Array.isArray(e.gattungen) ? e.gattungen : []).filter((x) => GATTUNGEN.includes(x));
  const j = (e && Array.isArray(e.jh) ? e.jh : []).filter((x) => JAHRHUNDERTE.some((h) => h.id === x));
  return {
    auswahl: e && e.auswahl in AUSWAHL ? e.auswahl : STANDARD.auswahl,
    bewegung: e && e.bewegung in BEWEGUNG ? e.bewegung : STANDARD.bewegung,
    schreibung: e && e.schreibung in SCHREIBUNG ? e.schreibung : STANDARD.schreibung,
    gattungen: g.length ? GATTUNGEN.filter((x) => g.includes(x)) : [...GATTUNGEN],
    jh: j.length ? JAHRHUNDERTE.map((h) => h.id).filter((x) => j.includes(x)) : JAHRHUNDERTE.map((h) => h.id),
  };
}

let einstellungen = pruefen(speicher.lesen('anno.einstellungen', STANDARD));

function istStandardFilter(e) {
  return e.gattungen.length === GATTUNGEN.length && e.jh.length === JAHRHUNDERTE.length;
}

function achse(e) {
  const gewaehlt = JAHRHUNDERTE.filter((h) => e.jh.includes(h.id));
  return { von: Math.min(...gewaehlt.map((h) => h.achse[0])), bis: Math.max(...gewaehlt.map((h) => h.achse[1])) };
}

function filterText(e) {
  const teile = [];
  if (e.gattungen.length < GATTUNGEN.length) teile.push(e.gattungen.join(', '));
  if (e.jh.length < JAHRHUNDERTE.length) {
    teile.push(JAHRHUNDERTE.filter((h) => e.jh.includes(h.id)).map((h) => h.name).join(', '));
  }
  return teile.join(' · ');
}

const satz = (t) => (t.endsWith('.') ? t : `${t}.`);

function modusText(e) {
  return [AUSWAHL[e.auswahl].name, BEWEGUNG[e.bewegung].name, SCHREIBUNG[e.schreibung].name, filterText(e)].filter(Boolean).join(' · ');
}

function werkPasst(w, e) {
  if (e.auswahl === 'bekannt' && !w.bekannt) return false;
  if (!e.gattungen.includes(w.gattung)) return false;
  if (!JAHRHUNDERTE.some((h) => e.jh.includes(h.id) && w.jahr >= h.von && w.jahr <= h.bis)) return false;
  return (e.schreibung === 'norm' ? w.norm : w.n) > 0;
}

// ---------------------------------------------------------------- Daten

let indexDaten = null;
let autorSuche = [];
let nachnamen = new Map();
let nachnamenBekannt = new Map();
const werkCache = new Map();

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function ladeIndex() {
  if (!indexDaten) {
    indexDaten = await json('data/passages.json');
    for (const w of indexDaten.werke) w.bekannt = w.a.some((i) => indexDaten.autoren[i].bekannt);
    autorSuche = indexDaten.autoren.map((a, i) => ({
      i,
      bekannt: Boolean(a.bekannt),
      name: a.name,
      f: falten(a.name),
      alias: (a.alias || []).map((x) => ({ name: x, f: falten(x) })),
    }));
    // Nachname (vor einem Komma wie in „Eberhard Ludwig, Herzog von Württemberg“): eindeutig?
    nachnamen = new Map();
    nachnamenBekannt = new Map();
    for (const a of autorSuche) {
      const n = falten(a.name.split(',')[0]).split(' ').pop();
      nachnamen.set(n, nachnamen.has(n) ? -2 : a.i);
      if (a.bekannt) nachnamenBekannt.set(n, nachnamenBekannt.has(n) ? -2 : a.i);
    }
  }
  return indexDaten;
}

function ladeWerk(id) {
  if (!werkCache.has(id)) {
    const p = json(`data/passages/${encodeURIComponent(id)}.json`);
    p.catch(() => werkCache.delete(id));
    werkCache.set(id, p);
  }
  return werkCache.get(id);
}

function seitenUrl(werk, seite) {
  return indexDaten.quelle.seite
    .replace('{id}', encodeURIComponent(werk.id))
    .replace('{seite}', encodeURIComponent(seite));
}

// Wählt die Passagen eines Spiels. Hängt nur vom Seed, den Einstellungen und den
// Daten ab, damit Tagesaufgabe und Challenge-Link überall dieselben Passagen zeigen.
async function passagenWaehlen(seed, e) {
  const index = await ladeIndex();
  const norm = e.schreibung === 'norm';
  const werke = index.werke.filter((w) => werkPasst(w, e));
  if (!werke.length) throw new Error('Für diese Auswahl gibt es keine Passagen.');
  const gewicht = (w) => (norm ? w.norm : w.n);
  const gesamt = werke.reduce((s, w) => s + gewicht(w), 0);
  const rng = mulberry32(hash32(`werke|${seed}`));
  const wahl = [];
  const ids = new Set();
  for (let versuche = 0; wahl.length < RUNDEN; versuche++) {
    let r = rng() * gesamt;
    let w = werke[werke.length - 1];
    for (const x of werke) {
      if (r < gewicht(x)) { w = x; break; }
      r -= gewicht(x);
    }
    if (ids.has(w.id) && versuche < 500) continue;
    ids.add(w.id);
    wahl.push(w);
  }
  const daten = await Promise.all(wahl.map((w) => ladeWerk(w.id)));
  const genommen = new Set();
  return wahl.map((eintrag, k) => {
    const werk = daten[k];
    let kandidaten = werk.passagen.map((p, i) => i).filter((i) => !norm || werk.passagen[i].norm);
    const frei = kandidaten.filter((i) => !genommen.has(`${werk.id}#${i}`));
    if (frei.length) kandidaten = frei;
    const nr = kandidaten[Math.floor(mulberry32(hash32(`passage|${seed}|${k}`))() * kandidaten.length)];
    genommen.add(`${werk.id}#${nr}`);
    return { eintrag, werk, nr, passage: werk.passagen[nr] };
  });
}

// ---------------------------------------------------------------- Autoren

// Mit nurBekannt nur Autoren der Auswahl „Bekannte Autoren“
function autorVorschlaege(text, max = 8, nurBekannt = false) {
  const f = falten(text);
  if (!f) return [];
  const treffer = [];
  for (const a of autorSuche) {
    if (nurBekannt && !a.bekannt) continue;
    let rang = null;
    let ueber = null;
    const wortanfang = (x) => x.split(' ').some((w) => w.startsWith(f));
    const alias = (test) => a.alias.find((x) => test(x.f));
    if (a.f.startsWith(f)) rang = 0;
    else if (wortanfang(a.f)) rang = 1;
    else if (alias(wortanfang)) { rang = 2; ueber = alias(wortanfang).name; }
    else if (a.f.includes(f)) rang = 3;
    else if (alias((x) => x.includes(f))) { rang = 4; ueber = alias((x) => x.includes(f)).name; }
    if (rang !== null) treffer.push({ i: a.i, name: a.name, ueber, rang });
  }
  treffer.sort((x, y) => x.rang - y.rang || x.name.localeCompare(y.name, 'de'));
  return treffer.slice(0, max);
}

// Index des Autors zu einer Eingabe; null bei leerer Eingabe, -1, wenn der Name nicht im Korpus
// steht, -2, wenn ein bloßer Nachname mehrere Personen meint. Bei Nachnamen gehen bekannte
// Autoren vor: „Schiller“ ist Friedrich Schiller.
function autorFinden(text) {
  const f = falten(text);
  if (!f) return null;
  const genau = autorSuche.find((a) => a.f === f || a.alias.some((x) => x.f === f));
  if (genau) return genau.i;
  const n = nachnamenBekannt.get(f) ?? nachnamen.get(f);
  return n === undefined ? -1 : n;
}

// ---------------------------------------------------------------- Text

const UMLAUT = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' };
const KONSONANT = 'bcdfghklmnpqrstxzß';

// Moderne Typografie: Buchstabenformen und Zeichen von heute, Rechtschreibung bleibt historisch.
function moderneTypografie(s) {
  return s
    .replace(/ſ/g, 's')
    .replace(/([aouAOU])\u0364/g, (m, v) => UMLAUT[v])
    .replace(/\u0364/g, '')
    .replace(/ꝛc\./g, 'etc.')
    .replace(/ꝛ/g, 'r')
    .replace(/([mn])\u0303/g, '$1$1')
    .replace(/ñ/g, 'nn')
    .replace(/ẽ|e\u0303/g, 'en')
    // Versalien im Wortinneren („HErꝛ“, „GOtt“) wie heute
    .replace(/(^|[^\p{L}\p{M}])(\p{Lu})(\p{Lu}+)(?=\p{Ll})/gu, (m, a, b, c) => a + b + c.toLowerCase())
    // I/J und U/V waren Formen desselben Buchstabens: „Jch“ → „Ich“, „vnd“ → „und“
    .replace(new RegExp(`(^|[^\\p{L}\\p{M}])([Jj])(?=[${KONSONANT}])`, 'gu'), (m, a, j) => a + (j === 'J' ? 'I' : 'i'))
    .replace(new RegExp(`(^|[^\\p{L}\\p{M}])([Vv])(?=[${KONSONANT}])`, 'gu'), (m, a, v) => a + (v === 'V' ? 'U' : 'u'))
    // Virgel → Komma
    .replace(/([\p{L}\p{M}\d.)’'])[ \t]*\/(?=[ \t\n]|$)/gu, '$1,')
    .replace(/([\p{L}\p{M}])\/(?=\p{L})/gu, '$1, ')
    .replace(/[‟〟]/g, '“');
}

function absatzUmformen(a, f) {
  if (typeof a === 'string') return f(a);
  if ('sp' in a) return { sp: f(a.sp), t: f(a.t) };
  return { st: f(a.st) };
}

// Die Teile einer Passage in der gewählten Schreibung
function fassung(p, schreibung) {
  if (schreibung === 'norm' && p.norm) {
    return {
      text: p.norm.text,
      satz: p.norm.satz,
      vor: p.norm.vor.map((t, i) => ({ text: t, klebt: p.vor[i] ? p.vor[i].klebt : false })),
      nach: p.norm.nach.map((t, i) => ({ text: t, klebt: p.nach[i] ? p.nach[i].klebt : false })),
    };
  }
  const f = schreibung === 'typo' ? moderneTypografie : (x) => x;
  const absaetze = (liste) => liste.map((a) => absatzUmformen(a, f));
  return {
    text: absaetze(p.text),
    satz: f(p.satz),
    vor: p.vor.map((s) => ({ text: absaetze(s.text), klebt: s.klebt })),
    nach: p.nach.map((s) => ({ text: absaetze(s.text), klebt: s.klebt })),
  };
}

function zeilen(s) {
  return esc(s)
    .replace(/⟨([^⟩]*)⟩/g, '<em class="regie">$1</em>')
    .replace(/\n/g, '<br>');
}

const absatzRoh = (a) => (typeof a === 'string' ? a : 'sp' in a ? a.t : a.st);

// Ein Absatz aus Teilen (Kontext und Passage können im selben Absatz stehen)
function absatzHtml(teile) {
  const erster = teile[0].a;
  const art = typeof erster === 'string' ? '' : 'sp' in erster ? 'rede' : 'regie';
  const vers = teile.some((t) => absatzRoh(t.a).includes('\n'));
  const klassen = [art, vers && 'vers'].filter(Boolean).join(' ');
  const inhalt = teile.map((t) => {
    const a = t.a;
    let h;
    if (typeof a === 'string') h = zeilen(a);
    else if ('sp' in a) h = `<span class="sprecher">${esc(a.sp)}</span> ${zeilen(a.t)}`;
    else h = esc(a.st);
    const cls = [t.kontext && 'kontext', t.neu && 'neu', t.kern && 'kern'].filter(Boolean).join(' ');
    return cls ? `<span class="${cls}">${h}</span>` : h;
  }).join(' ');
  return `<p${klassen ? ` class="${klassen}"` : ''}>${inhalt}</p>`;
}

// Passage mit vorN Kontextschritten davor und nachN danach
function textHtml(f, vorN, nachN, neu = null) {
  const stuecke = [];
  for (let i = vorN - 1; i >= 0; i--) {
    stuecke.push({ abs: f.vor[i].text, kontext: true, klebtDanach: f.vor[i].klebt, neu: neu === `vor${i}` });
  }
  stuecke.push({ abs: f.text, kern: true });
  for (let i = 0; i < nachN; i++) {
    stuecke.push({ abs: f.nach[i].text, kontext: true, klebtDavor: f.nach[i].klebt, neu: neu === `nach${i}` });
  }
  const absaetze = [];
  stuecke.forEach((st, k) => {
    const klebt = k > 0 && (stuecke[k - 1].klebtDanach || st.klebtDavor);
    st.abs.forEach((a, j) => {
      const teil = { a, kontext: st.kontext, neu: st.neu, kern: st.kern && j === 0 };
      if (j === 0 && klebt && absaetze.length) absaetze[absaetze.length - 1].push(teil);
      else absaetze.push([teil]);
    });
  });
  return absaetze.map(absatzHtml).join('');
}

// Nach der Auflösung im NMPZ-Modus: den Satz in der ganzen Passage hervorheben
function satzMarkieren(html, satz) {
  const s = zeilen(satz);
  const i = html.indexOf(s);
  return i < 0 ? html : `${html.slice(0, i)}<mark>${s}</mark>${html.slice(i + s.length)}`;
}

function gattungText(werk) {
  return [werk.gattung, werk.untergattung].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- Zeitleiste

function striche(von, bis) {
  const spanne = bis - von;
  const schritt = spanne > 150 ? 10 : 5;
  const beschriftung = spanne > 150 ? 50 : 10;
  const anteil = (j) => ((j - von) / spanne) * 100;
  let s = '';
  for (let j = von; j <= bis; j += schritt) {
    const art = j % 100 === 0 ? 'j100' : j % 50 === 0 ? 'j50' : j % 10 === 0 ? 'j10' : 'j5';
    const pos = `left:${anteil(j)}%;--p:${(anteil(j) / 100).toFixed(3)}`;
    s += `<span class="zl-strich ${art}" style="${pos}"></span>`;
    if (j % beschriftung === 0) {
      const leise = beschriftung === 10 && j % 20 !== 0 && j % 50 !== 0 ? ' leise' : '';
      s += `<span class="zl-zahl ${art}${leise}" style="${pos}">${j}</span>`;
    }
  }
  return s;
}

class Zeitleiste {
  constructor(el, { von, bis, beiAenderung = () => {}, beiEingabe = () => {} }) {
    this.el = el;
    this.von = von;
    this.bis = bis;
    this.jahr = null;
    this.gesperrt = false;
    this.ziehen = false;
    this.puffer = '';
    this.beiAenderung = beiAenderung;
    this.beiEingabe = beiEingabe;
    el.classList.add('zl');
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', 'Erscheinungsjahr');
    el.setAttribute('aria-valuemin', von);
    el.setAttribute('aria-valuemax', bis);
    el.setAttribute('aria-valuetext', 'noch kein Jahr gewählt');
    el.innerHTML = `
      <div class="zl-flaeche">
        <span class="zl-spur"></span>
        <span class="zl-welle" hidden></span>
        ${striche(von, bis)}
        <span class="zl-strecke" hidden></span>
        <span class="zl-schatten" hidden><span></span></span>
        <span class="zl-pin zl-tipp" hidden><span class="zl-fahne"></span></span>
        <span class="zl-pin zl-loesung" hidden><span class="zl-fahne"></span></span>
      </div>`;
    this.flaeche = $('.zl-flaeche', el);
    this.tippPin = $('.zl-tipp', el);
    this.schattenEl = $('.zl-schatten', el);

    el.addEventListener('pointerdown', (e) => {
      if (this.gesperrt || e.button > 0) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      this.ziehen = true;
      el.setPointerCapture(e.pointerId);
      this.schatten(null);
      this.setzen(this.jahrBei(e.clientX));
    });
    el.addEventListener('pointermove', (e) => {
      if (this.gesperrt) return;
      if (this.ziehen) this.setzen(this.jahrBei(e.clientX));
      else if (e.pointerType === 'mouse') this.schatten(this.jahrBei(e.clientX));
    });
    const ende = () => { this.ziehen = false; };
    el.addEventListener('pointerup', ende);
    el.addEventListener('pointercancel', ende);
    el.addEventListener('pointerleave', () => this.schatten(null));
    el.addEventListener('keydown', (e) => this.taste(e));
  }

  anteil(jahr) {
    return ((jahr - this.von) / (this.bis - this.von)) * 100;
  }

  get mitte() {
    return Math.round((this.von + this.bis) / 2);
  }

  jahrBei(x) {
    const r = this.flaeche.getBoundingClientRect();
    return Math.round(this.von + klemmen((x - r.left) / r.width, 0, 1) * (this.bis - this.von));
  }

  taste(e) {
    if (this.gesperrt || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      this.puffer = (this.puffer + e.key).slice(0, 4);
      clearTimeout(this.pufferZeit);
      if (this.puffer.length === 4) {
        const j = Number(this.puffer);
        this.puffer = '';
        this.setzen(j);
      } else {
        this.beiEingabe(this.puffer);
        this.pufferZeit = setTimeout(() => { this.puffer = ''; this.beiAenderung(this.jahr); }, 2500);
      }
      return;
    }
    const schritt = e.shiftKey ? 10 : 1;
    const j = this.jahr ?? this.mitte;
    const neu = {
      ArrowLeft: j - schritt, ArrowDown: j - schritt,
      ArrowRight: j + schritt, ArrowUp: j + schritt,
      PageDown: j - 10, PageUp: j + 10,
      Home: this.von, End: this.bis,
    }[e.key];
    if (neu === undefined) return;
    e.preventDefault();
    this.puffer = '';
    this.setzen(this.jahr == null && e.key.startsWith('Arrow') ? this.mitte : neu);
  }

  setzen(jahr) {
    if (this.gesperrt) return;
    jahr = klemmen(Math.round(jahr), this.von, this.bis);
    const alt = this.jahr;
    this.jahr = jahr;
    if (alt === null) {
      Klang.pin();
      Klang.vibrieren(8);
      this.tippPin.classList.add('faellt');
    } else if (alt !== jahr) {
      // beim Ziehen tickt jedes überquerte Jahrzehnt, sonst jeder Schritt
      const jz = (j) => Math.floor(j / 10);
      if (!this.ziehen) Klang.tick(jahr % 100 === 0);
      else if (jz(alt) !== jz(jahr)) Klang.tick(Math.floor(alt / 100) !== Math.floor(jahr / 100));
    }
    this.tippPin.hidden = false;
    this.tippPin.style.left = `${this.anteil(jahr)}%`;
    $('.zl-fahne', this.tippPin).textContent = jahr;
    this.el.setAttribute('aria-valuenow', jahr);
    this.el.setAttribute('aria-valuetext', String(jahr));
    this.beiAenderung(jahr);
  }

  schatten(jahr) {
    const s = this.schattenEl;
    if (jahr == null || this.gesperrt) { s.hidden = true; return; }
    s.hidden = false;
    s.style.left = `${this.anteil(jahr)}%`;
    s.firstElementChild.textContent = jahr;
  }

  aufloesen(loesung) {
    this.gesperrt = true;
    this.schatten(null);
    this.el.classList.add('gesperrt');
    this.el.tabIndex = -1;
    this.el.setAttribute('aria-disabled', 'true');
    const tipp = this.jahr;
    const l = klemmen(loesung, this.von, this.bis);
    const strecke = $('.zl-strecke', this.el);
    const pin = $('.zl-loesung', this.el);
    $('.zl-fahne', pin).textContent = loesung;
    pin.style.left = `${this.anteil(l)}%`;
    strecke.hidden = false;
    strecke.style.left = `${this.anteil(tipp)}%`;
    strecke.style.width = '0';
    strecke.getBoundingClientRect();
    strecke.classList.add('laeuft');
    strecke.style.left = `${this.anteil(Math.min(tipp, l))}%`;
    strecke.style.width = `${Math.abs(this.anteil(l) - this.anteil(tipp))}%`;
    const welle = $('.zl-welle', this.el);
    welle.style.left = `${this.anteil(l)}%`;
    spaeter(() => {
      pin.hidden = false;
      pin.classList.add('auftauchen');
      welle.hidden = false;
    }, ruhig() ? 0 : 750);
  }
}

function miniLeiste(r, i, von, bis) {
  const anteil = (j) => ((klemmen(j, von, bis) - von) / (bis - von)) * 100;
  const t = anteil(r.tipp);
  const l = anteil(r.werk.jahr);
  return `
    <div class="mini" style="--i:${i}">
      <span class="mini-nr">${i + 1}</span>
      <span class="mini-spur">
        <span class="mini-strecke" style="left:${Math.min(t, l)}%;width:${Math.abs(t - l)}%;transform-origin:${t <= l ? 'left' : 'right'}"></span>
        <span class="mini-punkt tipp" style="left:${t}%" title="Dein Tipp: ${r.tipp}"></span>
        <span class="mini-punkt loesung" style="left:${l}%" title="Erschienen: ${r.werk.jahr}"></span>
      </span>
    </div>`;
}

function miniAchse(von, bis) {
  const schritt = bis - von > 150 ? 50 : 20;
  let s = '';
  for (let j = von; j <= bis; j += schritt) {
    s += `<span class="${j % 100 ? 'j50' : 'j100'}" style="left:${((j - von) / (bis - von)) * 100}%">${j}</span>`;
  }
  return `<div class="mini mini-achse"><span class="mini-nr"></span><span class="mini-spur">${s}</span></div>`;
}

// ---------------------------------------------------------------- Statistik

const STAT_LEER = () => ({
  v: 1,
  spiele: 0,
  runden: 0,
  punkte: 0,
  abstand: 0,
  richtung: 0,
  gattung: [0, 0],
  autor: [0, 0],
  epoche: {},
  jh: {},
  gattungen: {},
  beste: {},
  verlauf: [],
});

// Schlüssel für Bestwerte: Bewegung|Schreibung|Auswahl[|gefiltert]. Ältere Schlüssel ohne
// Auswahl stammen aus der Zeit, als es nur das ganze Korpus gab.
function schluesselNeu(k) {
  const t = k.split('|');
  if (!(t[2] in AUSWAHL)) t.splice(2, 0, 'alle');
  return t.join('|');
}

function statistikLesen() {
  const st = speicher.lesen('anno.statistik', null);
  if (!st || st.v !== 1) return STAT_LEER();
  const beste = {};
  for (const [k, b] of Object.entries(st.beste || {})) {
    const neu = schluesselNeu(k);
    if (!beste[neu] || b.punkte > beste[neu].punkte) beste[neu] = b;
  }
  const verlauf = (st.verlauf || []).map((v) => ({ ...v, modus: schluesselNeu(v.modus) }));
  return { ...STAT_LEER(), ...st, beste, verlauf };
}

const epocheVon = (jahr) => (EPOCHEN.find((e) => jahr >= e.von && jahr <= e.bis) || EPOCHEN[EPOCHEN.length - 1]).name;
const jhVon = (jahr) => (JAHRHUNDERTE.find((h) => jahr >= h.von && jahr <= h.bis) || JAHRHUNDERTE[2]).name;
const bestSchluessel = (e) => `${e.bewegung}|${e.schreibung}|${e.auswahl}${istStandardFilter(e) ? '' : '|gefiltert'}`;

function bestName(schluessel) {
  const [b, s, a, f] = schluesselNeu(schluessel).split('|');
  return [AUSWAHL[a]?.name, BEWEGUNG[b]?.name, SCHREIBUNG[s]?.name, f && 'mit Filter'].filter(Boolean).join(' · ');
}

// Trägt ein beendetes Spiel ein; gibt zurück, ob es ein neuer Bestwert ist.
function statistikEintragen(sp) {
  const st = statistikLesen();
  const summe = sp.runden.reduce((s, r) => s + r.ergebnis.summe, 0);
  const fach = (o, k, d) => {
    const x = o[k] || [0, 0, 0];
    o[k] = [x[0] + 1, x[1] + Math.abs(d), x[2] + d];
  };
  st.spiele += 1;
  for (const r of sp.runden) {
    const d = r.tipp - r.werk.jahr;
    st.runden += 1;
    st.punkte += r.ergebnis.summe;
    st.abstand += Math.abs(d);
    st.richtung += d;
    fach(st.epoche, epocheVon(r.werk.jahr), d);
    fach(st.jh, jhVon(r.werk.jahr), d);
    fach(st.gattungen, r.werk.gattung, d);
    if (r.ergebnis.gattung !== null) st.gattung = [st.gattung[0] + 1, st.gattung[1] + (r.ergebnis.gattung ? 1 : 0)];
    if (r.ergebnis.autor !== null) st.autor = [st.autor[0] + 1, st.autor[1] + (r.ergebnis.autor ? 1 : 0)];
  }
  const k = bestSchluessel(sp.einst);
  const heute = new Date().toISOString().slice(0, 10);
  const vorher = st.beste[k];
  const neu = !vorher || summe > vorher.punkte;
  if (neu) st.beste[k] = { punkte: summe, datum: heute };
  st.verlauf.unshift({ datum: heute, modus: k, punkte: summe, art: sp.art });
  st.verlauf = st.verlauf.slice(0, 20);
  speicher.schreiben('anno.statistik', st);
  return neu && Boolean(vorher);
}

// ---------------------------------------------------------------- Tagesaufgabe & Challenge

function tagHeute() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}

function datumText(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(j, m - 1, t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

function tageLesen() {
  return speicher.lesen('anno.tage', {});
}

function challengeAusUrl() {
  const q = new URLSearchParams(location.search);
  const seed = q.get('seed');
  if (!seed || !/^[\w.-]{1,40}$/.test(seed)) return null;
  const gat = (q.get('gat') || '').split('');
  const einst = pruefen({
    // Links von vor der Auswahl „Bekannte Autoren“ meinen das ganze Korpus
    auswahl: q.get('aus') || 'alle',
    bewegung: q.get('bew'),
    schreibung: q.get('schr'),
    gattungen: GATTUNGEN.filter((g) => gat.includes(g[0])),
    jh: (q.get('jh') || '').split('.'),
  });
  const gegen = (q.get('gegen') || '').split('.').map(Number);
  return {
    seed,
    einst,
    gegen: gegen.length === RUNDEN && gegen.every((x) => Number.isInteger(x) && x >= 0 && x <= MAX_RUNDE) ? gegen : null,
  };
}

function challengeUrl(sp) {
  const q = new URLSearchParams({
    seed: sp.seed,
    aus: sp.einst.auswahl,
    bew: sp.einst.bewegung,
    schr: sp.einst.schreibung,
    gat: sp.einst.gattungen.map((g) => g[0]).join(''),
    jh: sp.einst.jh.join('.'),
    gegen: sp.runden.map((r) => r.ergebnis.summe).join('.'),
  });
  return `${location.origin}${location.pathname}?${q}`;
}

async function teilen(url, text) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: 'ANNO', text, url });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    meldung('Link kopiert');
  } catch {
    window.prompt('Link zum Kopieren:', url);
  }
}

// ---------------------------------------------------------------- Spiel

let spiel = null;
let zeitleiste = null;
let challenge = challengeAusUrl();

const aktuelle = () => spiel.runden[spiel.runde];
const summe = () => spiel.runden.reduce((s, r) => s + (r.ergebnis ? r.ergebnis.summe : 0), 0);

function standZeigen(plus = 0) {
  if (!spiel) { stand.innerHTML = ''; return; }
  const runde = spiel.runde < RUNDEN ? `Runde ${spiel.runde + 1} von ${RUNDEN}` : 'Auswertung';
  const art = spiel.art === 'tag' ? 'Tagesaufgabe · ' : spiel.art === 'challenge' ? 'Challenge · ' : '';
  const jetzt = summe();
  stand.innerHTML = `<span><span class="stand-art">${art}</span>${runde}</span><span class="stand-punkte"><span>${zahl(jetzt - plus)}</span></span>`;
  if (plus > 0) {
    const el = $('.stand-punkte', stand);
    hochzaehlen(el.firstElementChild, jetzt, 700, { von: jetzt - plus });
    const f = document.createElement('span');
    f.className = 'plus';
    f.textContent = `+${zahl(plus)}`;
    f.setAttribute('aria-hidden', 'true');
    el.append(f);
    f.addEventListener('animationend', () => f.remove());
  }
}

async function spielStarten({ seed = neuerSeed(), einst = einstellungen, art = 'normal', gegen = null, tag = null, wertung = true } = {}) {
  planLeeren();
  app.innerHTML = '<p class="laden">Passagen werden geladen …</p>';
  window.scrollTo(0, 0);
  try {
    const wahl = await passagenWaehlen(seed, einst);
    const { von, bis } = achse(einst);
    spiel = {
      seed, einst, art, gegen, tag, wertung, von, bis,
      runde: 0,
      runden: wahl.map((w) => ({
        ...w,
        tipp: null,
        gattungTipp: null,
        autorWahl: null,
        autorTipp: null,
        autorText: '',
        vor: 0,
        nach: 0,
        ergebnis: null,
      })),
    };
    if (location.search) history.replaceState(null, '', location.pathname);
    challenge = null;
    rundeZeigen();
  } catch (err) {
    fehler(err);
  }
}

function rundeZeigen() {
  const r = aktuelle();
  const e = spiel.einst;
  r.fassung = fassung(r.passage, e.schreibung);
  planLeeren();
  standZeigen();
  Klang.blatt();
  app.innerHTML = `
    <section class="runde">
      <p class="modus-zeile"><span>${esc(modusText(e))}</span><span id="moeglich"></span></p>
      <button type="button" class="mehr" id="mehr-vor" hidden></button>
      <article class="blatt passage${e.bewegung === 'nmpz' ? ' nmpz' : ''}" id="passage" lang="de" aria-label="Passage"></article>
      <button type="button" class="mehr" id="mehr-nach" hidden></button>
      <div class="blatt zusatz" id="zusatz">
        <p class="zusatz-kopf">Zusatzfragen <small>freiwillig, je ${zahl(MAX_GATTUNG)} Punkte</small></p>
        <div class="zusatz-zeile">
          <span class="zusatz-titel" id="gattung-titel">Gattung</span>
          <div class="wahl" role="radiogroup" aria-labelledby="gattung-titel">
            ${GATTUNGEN.map((g) => `<button type="button" class="chip" role="radio" aria-checked="false" data-gattung="${g}">${g}</button>`).join('')}
          </div>
        </div>
        <div class="zusatz-zeile">
          <label class="zusatz-titel" for="autor-ein">Autor</label>
          <div class="autor-feld">
            <input id="autor-ein" type="text" autocomplete="off" autocapitalize="words" spellcheck="false"
              placeholder="Name, z. B. Lessing" role="combobox" aria-autocomplete="list"
              aria-expanded="false" aria-controls="autor-liste">
            <ul id="autor-liste" class="autor-liste" role="listbox" hidden></ul>
          </div>
        </div>
      </div>
      <div class="dock" id="dock">
        <div class="dock-zeile">
          <span class="frage">Wann ist das erschienen?</span>
          <button type="button" class="knopf haupt" id="tippen" disabled>Tippen</button>
        </div>
        <div id="zl"></div>
        <div class="dock-zeile fein" role="group" aria-label="Jahr feinjustieren">
          <button type="button" class="knopf klein" data-d="-10" aria-label="10 Jahre früher">−10</button>
          <button type="button" class="knopf klein" data-d="-1" aria-label="1 Jahr früher">−1</button>
          <output class="jahr-anzeige" id="jahr" aria-live="polite">····</output>
          <button type="button" class="knopf klein" data-d="1" aria-label="1 Jahr später">+1</button>
          <button type="button" class="knopf klein" data-d="10" aria-label="10 Jahre später">+10</button>
        </div>
      </div>
      <div id="aufloesung"></div>
    </section>`;
  window.scrollTo(0, 0);
  textZeigen();
  tinte($('#passage'));

  const anzeige = $('#jahr');
  const knopf = $('#tippen');
  zeitleiste = new Zeitleiste($('#zl'), {
    von: spiel.von,
    bis: spiel.bis,
    beiAenderung: (j) => {
      anzeige.textContent = j ?? '····';
      anzeige.classList.toggle('gesetzt', j != null);
      if (knopf.disabled && j != null) knopf.classList.add('bereit');
      knopf.disabled = j == null;
    },
    beiEingabe: (p) => {
      anzeige.textContent = p.padEnd(4, '·');
      anzeige.classList.remove('gesetzt');
    },
  });
  for (const b of $$('.fein [data-d]')) {
    b.addEventListener('click', () => {
      const j = zeitleiste.jahr;
      zeitleiste.setzen(j == null ? zeitleiste.mitte : j + Number(b.dataset.d));
    });
  }
  knopf.addEventListener('click', tippen);
  $('#mehr-vor').addEventListener('click', () => mehrText('vor'));
  $('#mehr-nach').addEventListener('click', () => mehrText('nach'));

  for (const chip of $$('.zusatz .chip')) {
    chip.addEventListener('click', () => {
      if (r.ergebnis) return;
      Klang.klick();
      r.gattungTipp = r.gattungTipp === chip.dataset.gattung ? null : chip.dataset.gattung;
      for (const c of $$('.zusatz .chip')) c.setAttribute('aria-checked', String(c.dataset.gattung === r.gattungTipp));
    });
  }
  autorFeld($('#autor-ein'), $('#autor-liste'), (i) => { r.autorWahl = i; });
}

function moeglichZeigen() {
  const r = aktuelle();
  const schritte = r.ergebnis ? r.ergebnis.schritte : r.vor + r.nach;
  const faktor = Math.max(0, 1 - SCHRITT_KOSTEN * schritte);
  $('#moeglich').textContent = schritte
    ? `höchstens ${zahl(Math.round(MAX_RUNDE * faktor))} Punkte (−${schritte * 10} %)`
    : '';
}

// Text der Passage je nach Modus; nach der Auflösung darf man frei weiterlesen.
function textZeigen(neu = null) {
  const r = aktuelle();
  const f = r.fassung;
  const e = spiel.einst;
  const fertig = r.ergebnis !== null;
  const el = $('#passage');
  const anker = neu && neu.startsWith('vor') ? $('.kern', el) : null;
  const vorher = anker ? anker.getBoundingClientRect().top : null;
  let html;
  if (e.bewegung === 'nmpz' && !fertig) html = `<p>${zeilen(f.satz)}</p>`;
  else html = textHtml(f, r.vor, r.nach, neu);
  if (e.bewegung === 'nmpz' && fertig) html = satzMarkieren(html, f.satz);
  el.innerHTML = html;
  if (neu) tinte(el, (n) => n.parentElement.closest('.neu'), 600);
  if (vorher !== null) {
    const nachher = $('.kern', el);
    if (nachher) window.scrollBy(0, nachher.getBoundingClientRect().top - vorher);
  }
  const darf = e.bewegung === 'move' || fertig;
  const knopf = (id, n, max, wort) => {
    const b = $(id);
    b.hidden = !darf;
    b.disabled = n >= max;
    const kosten = fertig ? '' : ' <small>−10 %</small>';
    b.innerHTML = n >= max
      ? `<span>Kein weiterer Absatz ${wort}</span>`
      : `<span>${wort === 'davor' ? '↑' : '↓'} Absatz ${wort}${kosten}</span>`;
  };
  knopf('#mehr-vor', r.vor, f.vor.length, 'davor');
  knopf('#mehr-nach', r.nach, f.nach.length, 'danach');
  moeglichZeigen();
}

function mehrText(richtung) {
  const r = aktuelle();
  if (spiel.einst.bewegung !== 'move' && !r.ergebnis) return;
  const max = richtung === 'vor' ? r.fassung.vor.length : r.fassung.nach.length;
  if (r[richtung] >= max) return;
  r[richtung] += 1;
  Klang.blatt(0.6);
  textZeigen(`${richtung}${r[richtung] - 1}`);
}

function autorFeld(input, liste, beiWahl) {
  let treffer = [];
  let aktiv = -1;
  const schliessen = () => {
    liste.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
  const markieren = () => {
    $$('li', liste).forEach((li, i) => li.setAttribute('aria-selected', String(i === aktiv)));
    if (aktiv >= 0) input.setAttribute('aria-activedescendant', `autor-${aktiv}`);
  };
  const zeigen = () => {
    treffer = autorVorschlaege(input.value, 8, spiel && spiel.einst.auswahl === 'bekannt');
    aktiv = -1;
    liste.innerHTML = treffer.map((t, i) => `
      <li role="option" id="autor-${i}" data-i="${i}" aria-selected="false">${esc(t.name)}${t.ueber ? `<small>${esc(t.ueber)}</small>` : ''}</li>`).join('');
    liste.hidden = !treffer.length;
    input.setAttribute('aria-expanded', String(treffer.length > 0));
  };
  const waehlen = (i) => {
    const t = treffer[i];
    if (!t) return;
    input.value = t.name;
    Klang.klick();
    beiWahl(t.i);
    schliessen();
  };
  input.addEventListener('input', () => { beiWahl(null); zeigen(); });
  input.addEventListener('focus', () => { if (input.value) zeigen(); });
  input.addEventListener('keydown', (e) => {
    if (liste.hidden || !treffer.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      aktiv = (aktiv + (e.key === 'ArrowDown' ? 1 : -1) + treffer.length) % treffer.length;
      markieren();
    } else if (e.key === 'Enter' && aktiv >= 0) {
      e.preventDefault();
      waehlen(aktiv);
    } else if (e.key === 'Escape') {
      schliessen();
    }
  });
  liste.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    waehlen(Number(li.dataset.i));
  });
  input.addEventListener('blur', () => setTimeout(schliessen, 120));
}

function bewerten(r) {
  const w = r.werk;
  const abstand = Math.abs(r.tipp - w.jahr);
  const jahr = punkteFuerJahr(abstand);
  const gattung = r.gattungTipp ? r.gattungTipp === w.gattung : null;
  const autor = r.autorTipp === null ? null : r.eintrag.a.includes(r.autorTipp);
  const schritte = r.vor + r.nach;
  const faktor = Math.max(0, 1 - SCHRITT_KOSTEN * schritte);
  const roh = jahr + (gattung ? MAX_GATTUNG : 0) + (autor ? MAX_AUTOR : 0);
  return { abstand, jahr, gattung, autor, schritte, faktor, summe: Math.round(roh * faktor), max: Math.round(MAX_RUNDE * faktor) };
}

function tippen() {
  const r = aktuelle();
  if (r.ergebnis || zeitleiste.jahr == null) return;
  const w = r.werk;
  r.tipp = zeitleiste.jahr;
  r.autorText = $('#autor-ein').value.trim();
  r.autorTipp = r.autorWahl ?? autorFinden(r.autorText);
  r.ergebnis = bewerten(r);
  const erg = r.ergebnis;
  const letzte = spiel.runde === RUNDEN - 1;

  $('#dock').classList.add('fertig');
  $('#zusatz').classList.add('fertig');
  $('#autor-ein').disabled = true;
  for (const c of $$('.zusatz .chip')) c.disabled = true;
  Klang.stempel();
  Klang.vibrieren(14);
  zeitleiste.aufloesen(w.jahr);
  spaeter(() => Klang.strich(0.7), 40);
  textZeigen();
  // NMPZ: der Rest der Passage erscheint um den markierten Satz herum
  if (spiel.einst.bewegung === 'nmpz') tinte($('#passage'), (n) => !n.parentElement.closest('mark'), 1200);

  const titel = w.untertitel ? `${esc(w.titel)}. <span class="untertitel">${esc(w.untertitel)}</span>` : esc(w.titel);
  const auflage = w.auflage > 1 ? ` · ${w.auflage}. Auflage` : '';
  const autorName = r.autorTipp !== null && r.autorTipp >= 0 ? indexDaten.autoren[r.autorTipp].name : r.autorText;
  // Zeitplan der Auflösung (ms): Linie, Lösungspin, Blatt, Zeilen, Punkte, Urteil
  const T = ruhig() ? { pin: 0, blatt: 0, zeile: 0, takt: 0, zaehlen: 0, dauer: 0, urteil: 0 }
    : { pin: 780, blatt: 900, zeile: 1050, takt: 140, zaehlen: 1150, dauer: 1100, urteil: 2350 };
  let zeilenNr = 0;
  const zeile = (titelText, text, wert, klasse = '') => `
    <tr class="${klasse}" style="animation-delay:${T.zeile + T.takt * zeilenNr++}ms"><th>${titelText}</th><td>${text}</td><td class="wert">${wert}</td></tr>`;
  const gattungZeile = erg.gattung === null
    ? zeile('Gattung', 'kein Tipp', '–', 'leer')
    : erg.gattung
      ? zeile('Gattung', `<span class="richtig">richtig</span> ${esc(r.gattungTipp)}`, `+${zahl(MAX_GATTUNG)}`)
      : zeile('Gattung', `<span class="falsch">daneben</span> dein Tipp: ${esc(r.gattungTipp)}, richtig: ${esc(w.gattung)}`, '0');
  let autorZeile;
  if (erg.autor === null) autorZeile = zeile('Autor', 'kein Tipp', '–', 'leer');
  else if (erg.autor) autorZeile = zeile('Autor', `<span class="richtig">richtig</span> ${esc(autorName)}`, `+${zahl(MAX_AUTOR)}`);
  else if (r.autorTipp === -1) autorZeile = zeile('Autor', `<span class="falsch">daneben</span> „${esc(r.autorText)}“ steht nicht im Korpus`, '0');
  else if (r.autorTipp === -2) autorZeile = zeile('Autor', `<span class="falsch">daneben</span> „${esc(r.autorText)}“ ist nicht eindeutig, bitte aus der Liste wählen`, '0');
  else autorZeile = zeile('Autor', `<span class="falsch">daneben</span> dein Tipp: ${esc(autorName)}`, '0');

  const [, urteilText, urteilStufe] = urteil(erg.abstand);
  $('#aufloesung').innerHTML = `
    <div class="blatt ergebnis" style="animation-delay:${T.blatt}ms">
      <div class="loesung-kopf">
        <div>
          <span class="loesung-jahr">${w.jahr}</span>
          <span class="abstand">${jahreText(erg.abstand)}</span>
          <span class="urteil ${urteilStufe}" id="urteil">${urteilText}</span>
        </div>
        <div class="punkte"><span id="punkte">0</span><small>von ${zahl(MAX_RUNDE)}</small></div>
      </div>
      <table class="wertung">
        ${zeile('Jahr', `dein Tipp: ${r.tipp}`, zahl(erg.jahr))}
        ${gattungZeile}
        ${autorZeile}
        ${erg.schritte ? zeile('Moving', `${erg.schritte} ${erg.schritte === 1 ? 'Schritt' : 'Schritte'}`, `−${erg.schritte * 10} %`) : ''}
      </table>
      <p class="werk-autor">${esc(w.autor)}</p>
      <p class="werk-titel"><cite>${titel}</cite></p>
      <p class="werk-meta">${esc(gattungText(w))}${w.ort ? ` · ${esc(w.ort)}` : ''}${auflage}</p>
      ${w.hinweis ? `<p class="werk-hinweis">${esc(w.hinweis)}</p>` : ''}
      <p class="werk-link"><a href="${esc(seitenUrl(w, r.passage.seite))}" target="_blank" rel="noopener">Diese Stelle im Faksimile ansehen (Deutsches Textarchiv)&nbsp;↗</a></p>
    </div>
    <div class="knopf-reihe" style="animation-delay:${T.blatt}ms"><button type="button" class="knopf haupt" id="weiter">${letzte ? 'Zur Auswertung' : 'Nächste Runde'}</button></div>`;
  spaeter(() => Klang.ergebnis(erg.jahr / MAX_JAHR), T.pin);
  // Gattung und Autor klingen, wenn ihre Zeile erscheint
  [erg.gattung, erg.autor].forEach((x, i) => {
    if (x !== null) spaeter(() => (x ? Klang.richtig() : Klang.falsch()), T.zeile + T.takt * (i + 1) + 60);
  });
  spaeter(() => hochzaehlen($('#punkte'), erg.summe, T.dauer || 1, { ton: true }), T.zaehlen);
  spaeter(() => {
    $('#urteil').classList.add('landet');
    Klang.stempel(erg.abstand <= 10 ? 0.8 : 0.5);
    if (erg.abstand === 0) Klang.triumph();
    standZeigen(erg.summe);
  }, T.urteil);
  $('#weiter').addEventListener('click', weiter);
  $('#dock').scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'start' });
  $('#weiter').focus({ preventScroll: true });
}

function weiter() {
  spiel.runde += 1;
  if (spiel.runde < RUNDEN) rundeZeigen();
  else auswertung();
}

function auswertung() {
  planLeeren();
  standZeigen();
  Klang.blatt();
  const sp = spiel;
  const gesamt = summe();
  const schnitt = sp.runden.reduce((s, r) => s + r.ergebnis.abstand, 0) / RUNDEN;
  if (!sp.gespeichert) {
    sp.gespeichert = true;
    sp.bestwert = sp.wertung ? statistikEintragen(sp) : false;
    if (sp.art === 'tag' && sp.wertung) {
      const tage = tageLesen();
      tage[sp.tag] = { punkte: gesamt, runden: sp.runden.map((r) => r.ergebnis.summe) };
      for (const k of Object.keys(tage).sort().slice(0, -60)) delete tage[k];
      speicher.schreiben('anno.tage', tage);
    }
  }
  let vergleich = '';
  let gewonnen = false;
  if (sp.gegen) {
    const gegenSumme = sp.gegen.reduce((s, x) => s + x, 0);
    gewonnen = gesamt > gegenSumme;
    const urteil = gesamt > gegenSumme ? 'Gewonnen!' : gesamt < gegenSumme ? 'Knapp verfehlt.' : 'Unentschieden.';
    vergleich = `<p class="vergleich"><strong>${urteil}</strong> Die Herausforderung lag bei ${zahl(gegenSumme)} Punkten.</p>`;
  }
  const anteil = gesamt / (RUNDEN * MAX_RUNDE);
  const [, rangText, rangStufe] = rang(anteil);
  const hinweise = [];
  if (sp.bestwert) hinweise.push(`<span class="glanz">Neuer Bestwert: ${esc(bestName(bestSchluessel(sp.einst)))}</span>`);
  if (sp.art === 'tag') hinweise.push(sp.wertung ? `Tagesaufgabe vom ${datumText(sp.tag)}` : 'Wiederholung der Tagesaufgabe, zählt nicht für die Statistik');

  app.innerHTML = `
    <section class="auswertung">
      <h1 class="seitentitel">Auswertung</h1>
      <p class="gesamt"><span id="gesamt">0</span> <small>von ${zahl(RUNDEN * MAX_RUNDE)} Punkten</small></p>
      <p class="rang"><span class="urteil gross ${rangStufe}" id="rang">${rangText}</span></p>
      <p class="schnitt">Im Schnitt ${zahl(Math.round(schnitt * 10) / 10)} Jahre daneben · ${esc(modusText(sp.einst))}</p>
      ${hinweise.map((h) => `<p class="hinweis-zeile">${h}</p>`).join('')}
      ${vergleich}
      <div class="blatt uebersicht" aria-label="Alle Tipps auf der Zeitleiste">
        ${sp.runden.map((r, i) => miniLeiste(r, i, sp.von, sp.bis)).join('')}
        ${miniAchse(sp.von, sp.bis)}
        <p class="legende"><span class="mini-punkt tipp"></span> dein Tipp <span class="mini-punkt loesung"></span> erschienen</p>
      </div>
      <div class="knopf-reihe">
        <button type="button" class="knopf" id="teilen">Challenge-Link teilen</button>
        <button type="button" class="knopf haupt" id="nochmal">Neues Spiel</button>
      </div>
      <ol class="rueckblick">
        ${sp.runden.map((r, i) => rueckblickHtml(r, i, sp)).join('')}
      </ol>
      <div class="knopf-reihe">
        <button type="button" class="knopf" id="zur-statistik">Statistik</button>
        <button type="button" class="knopf" id="zum-start">Startseite</button>
      </div>
    </section>`;
  window.scrollTo(0, 0);
  const T = ruhig() ? { zaehlen: 0, rang: 0, jubel: 0 } : { zaehlen: 250, rang: 1850, jubel: 2600 };
  spaeter(() => hochzaehlen($('#gesamt'), gesamt, 1500, { ton: true }), T.zaehlen);
  spaeter(() => {
    $('#rang').classList.add('landet');
    Klang.stempel(0.8);
    Klang.schluss(anteil);
  }, T.rang);
  if (sp.bestwert || gewonnen) spaeter(() => Klang.triumph(), T.jubel);
  $('#nochmal').addEventListener('click', () => spielStarten());
  $('#zur-statistik').addEventListener('click', statistikZeigen);
  $('#zum-start').addEventListener('click', startseite);
  $('#teilen').addEventListener('click', () => {
    const text = sp.art === 'tag'
      ? `ANNO, Tagesaufgabe vom ${datumText(sp.tag)}: ${zahl(gesamt)} Punkte. Schaffst du mehr?`
      : `ANNO: ${zahl(gesamt)} Punkte (${modusText(sp.einst)}). Schaffst du mehr?`;
    teilen(challengeUrl(sp), text);
  });
}

function rueckblickHtml(r, i, sp) {
  const e = r.ergebnis;
  const teile = [`Jahr ${zahl(e.jahr)}`];
  if (e.gattung !== null) teile.push(`Gattung ${e.gattung ? `+${MAX_GATTUNG}` : '0'}`);
  if (e.autor !== null) teile.push(`Autor ${e.autor ? `+${MAX_AUTOR}` : '0'}`);
  if (e.schritte) teile.push(`−${e.schritte * 10} %`);
  const gegen = sp.gegen ? `<span class="rb-gegen">Herausforderung ${zahl(sp.gegen[i])}</span>` : '';
  const f = r.fassung;
  const text = sp.einst.bewegung === 'nmpz' ? satzMarkieren(textHtml(f, 0, 0), f.satz) : textHtml(f, 0, 0);
  return `
    <li class="blatt" style="--i:${i}">
      <div class="rb-kopf">
        <span class="rb-nr">${i + 1}</span>
        <span class="rb-werk"><span class="werk-autor">${esc(r.werk.autor)}</span>
          <cite>${esc(r.werk.titel)}</cite> <span class="rb-jahr">${r.werk.jahr}</span></span>
        <span class="rb-punkte">${zahl(e.summe)}${gegen}</span>
      </div>
      <p class="rb-meta">Dein Tipp ${r.tipp}, ${jahreText(e.abstand)} · ${teile.join(' · ')} · ${esc(gattungText(r.werk))} ·
        <a href="${esc(seitenUrl(r.werk, r.passage.seite))}" target="_blank" rel="noopener">Faksimile&nbsp;↗</a></p>
      <div class="passage klein${sp.einst.bewegung === 'nmpz' ? ' nmpz' : ''}" lang="de">${text}</div>
    </li>`;
}

// ---------------------------------------------------------------- Statistikseite

function tendenz(d) {
  if (Math.abs(d) < 5) return 'ausgewogen';
  return d < 0 ? `${zahl(Math.round(-d))} J. zu früh` : `${zahl(Math.round(d))} J. zu spät`;
}

function balkenTabelle(titel, daten, reihenfolge) {
  const zeilenDaten = reihenfolge.filter((k) => daten[k]).map((k) => {
    const [n, abs, signiert] = daten[k];
    return { k, n, schnitt: abs / n, richtung: signiert / n };
  });
  if (!zeilenDaten.length) return '';
  const max = Math.max(60, ...zeilenDaten.map((z) => z.schnitt));
  return `
    <h3>${titel}</h3>
    <table class="balken">
      ${zeilenDaten.map((z) => `
        <tr>
          <th>${esc(z.k)}</th>
          <td class="balken-zelle"><span class="balken-strich" style="width:${(z.schnitt / max) * 100}%;--i:${zeilenDaten.indexOf(z)}"></span></td>
          <td class="wert">Ø ${zahl(Math.round(z.schnitt))} J.</td>
          <td class="neben">${tendenz(z.richtung)} · ${z.n}&thinsp;×</td>
        </tr>`).join('')}
    </table>`;
}

function statistikZeigen() {
  planLeeren();
  spiel = null;
  standZeigen();
  Klang.blatt();
  const st = statistikLesen();
  const quote = ([n, r]) => (n ? `${Math.round((r / n) * 100)} %` : '–');
  const datum = (iso) => iso.split('-').reverse().join('.');
  let inhalt;
  if (!st.runden) {
    inhalt = '<div class="blatt"><p>Noch keine Spiele. Nach dem ersten Spiel steht hier, wo du gut liegst und wo deine blinden Flecken sind.</p></div>';
  } else {
    const faecher = EPOCHEN.map((e) => e.name).filter((k) => st.epoche[k] && st.epoche[k][0] >= 2)
      .map((k) => ({ k, schnitt: st.epoche[k][1] / st.epoche[k][0] }));
    faecher.sort((a, b) => b.schnitt - a.schnitt);
    const fleck = faecher[0];
    const beste = Object.entries(st.beste).sort((a, b) => b[1].punkte - a[1].punkte);
    inhalt = `
      <div class="blatt kennzahlen">
        <div><span data-ziel="${st.spiele}">${zahl(st.spiele)}</span><small>Spiele</small></div>
        <div><span data-ziel="${Math.round(st.punkte / st.runden)}">${zahl(Math.round(st.punkte / st.runden))}</span><small>Ø Punkte je Runde</small></div>
        <div><span data-ziel="${Math.round(st.abstand / st.runden)}">${zahl(Math.round(st.abstand / st.runden))}</span><small>Ø Jahre daneben</small></div>
        <div><span>${quote(st.gattung)}</span><small>Gattung richtig</small></div>
        <div><span>${quote(st.autor)}</span><small>Autor richtig</small></div>
      </div>
      <div class="blatt">
        <h2>Blinde Flecken</h2>
        ${fleck ? `<p class="fleck">Am weitesten daneben liegst du bei <strong>${esc(fleck.k)}</strong>: Ø ${zahl(Math.round(fleck.schnitt))} Jahre.</p>` : ''}
        <p class="klein">Insgesamt: ${tendenz(st.richtung / st.runden)}.</p>
        ${balkenTabelle('Nach Epoche', st.epoche, EPOCHEN.map((e) => e.name))}
        ${balkenTabelle('Nach Jahrhundert', st.jh, JAHRHUNDERTE.map((h) => h.name))}
        ${balkenTabelle('Nach Gattung', st.gattungen, GATTUNGEN)}
        <p class="klein">Epochen grob nach Jahren: Barock bis 1719, Aufklärung bis 1769, Sturm und Drang/Klassik bis 1804,
          Romantik bis 1829, Biedermeier/Vormärz bis 1849, Realismus bis 1889, danach Moderne.</p>
      </div>
      <div class="blatt">
        <h2>Bestwerte</h2>
        <table class="liste">
          ${beste.map(([k, b]) => `<tr><th>${esc(bestName(k))}</th><td class="wert">${zahl(b.punkte)}</td><td class="neben">${datum(b.datum)}</td></tr>`).join('')}
        </table>
      </div>
      <div class="blatt">
        <h2>Letzte Spiele</h2>
        <table class="liste">
          ${st.verlauf.map((v) => `<tr><th>${datum(v.datum)}${v.art === 'tag' ? ' · Tagesaufgabe' : v.art === 'challenge' ? ' · Challenge' : ''}</th><td class="neben">${esc(bestName(v.modus))}</td><td class="wert">${zahl(v.punkte)}</td></tr>`).join('')}
        </table>
      </div>
      <div class="knopf-reihe"><button type="button" class="knopf leise" id="zuruecksetzen">Statistik zurücksetzen</button></div>`;
  }
  app.innerHTML = `
    <section class="statistik">
      <h1 class="seitentitel">Statistik</h1>
      ${inhalt}
      <div class="knopf-reihe"><button type="button" class="knopf haupt" id="zum-start">Zur Startseite</button></div>
    </section>`;
  window.scrollTo(0, 0);
  for (const el of $$('[data-ziel]')) hochzaehlen(el, Number(el.dataset.ziel), 900);
  $('#zum-start').addEventListener('click', startseite);
  const reset = $('#zuruecksetzen');
  if (reset) {
    reset.addEventListener('click', () => {
      if (!confirm('Statistik und Bestwerte löschen?')) return;
      speicher.loeschen('anno.statistik');
      statistikZeigen();
    });
  }
}

// ---------------------------------------------------------------- Startseite

function auswahlHtml(name, optionen, gewaehlt, mehrfach) {
  return optionen.map(([wert, text]) => {
    const an = mehrfach ? gewaehlt.includes(wert) : gewaehlt === wert;
    return `<button type="button" class="chip" data-feld="${name}" data-wert="${wert}" role="${mehrfach ? 'checkbox' : 'radio'}" aria-checked="${an}">${text}</button>`;
  }).join('');
}

function startseite() {
  planLeeren();
  spiel = null;
  standZeigen();
  Klang.blatt(0.7);
  const e = einstellungen;
  const tag = tagHeute();
  const erledigt = tageLesen()[tag];
  const ch = challenge;
  app.innerHTML = `
    <section class="start">
      <h1 class="titel" aria-label="ANNO">${[...'ANNO'].map((b, i) => `<span style="--i:${i}" aria-hidden="true">${b}</span>`).join('')}</h1>
      <p class="unterzeile">GeoGuessr für die deutsche Sprachgeschichte</p>
      ${ch ? `
      <div class="blatt challenge">
        <p class="zusatz-kopf">Herausforderung</p>
        <p>Dieselben fünf Passagen, dieselben Regeln: <strong>${esc(satz(modusText(ch.einst)))}</strong>
          ${ch.gegen ? `Zu schlagen: <strong>${zahl(ch.gegen.reduce((s, x) => s + x, 0))} Punkte</strong>.` : ''}</p>
        <div class="knopf-reihe links"><button type="button" class="knopf haupt" id="annehmen">Annehmen</button></div>
      </div>` : ''}
      <div class="blatt passage start-text">
        <p>Du bekommst eine Passage aus einem echten Druck zwischen 1600 und 1900, in der Schreibung des Originals:
          mit langem ſ, mit uͤ und aͤ, mit Virgeln (/), wo heute Kommas stehen.</p>
        <p>Setze einen Pin auf die Zeitleiste. Gewertet wird wie bei GeoGuessr nach dem Abstand, nur in Jahren statt
          Kilometern: bis zu ${zahl(MAX_JAHR)} Punkte für das Jahr, dazu je ${zahl(MAX_GATTUNG)} für Gattung und Autor.
          ${RUNDEN} Runden.</p>
      </div>
      <div class="blatt einstellungen">
        <fieldset>
          <legend>Texte</legend>
          <div class="wahl" role="radiogroup" aria-label="Texte">${auswahlHtml('auswahl', Object.entries(AUSWAHL).map(([k, v]) => [k, v.name]), e.auswahl, false)}</div>
          <p class="erklaerung">${esc(AUSWAHL[e.auswahl].text)}</p>
        </fieldset>
        <fieldset>
          <legend>Bewegung</legend>
          <div class="wahl" role="radiogroup" aria-label="Bewegung">${auswahlHtml('bewegung', Object.entries(BEWEGUNG).map(([k, v]) => [k, v.name]), e.bewegung, false)}</div>
          <p class="erklaerung">${esc(BEWEGUNG[e.bewegung].text)}</p>
        </fieldset>
        <fieldset>
          <legend>Schreibung</legend>
          <div class="wahl" role="radiogroup" aria-label="Schreibung">${auswahlHtml('schreibung', Object.entries(SCHREIBUNG).map(([k, v]) => [k, v.name]), e.schreibung, false)}</div>
          <p class="erklaerung">${esc(SCHREIBUNG[e.schreibung].text)}</p>
        </fieldset>
        <fieldset>
          <legend>Gattung</legend>
          <div class="wahl" role="group" aria-label="Gattung">${auswahlHtml('gattungen', GATTUNGEN.map((g) => [g, g]), e.gattungen, true)}</div>
        </fieldset>
        <fieldset>
          <legend>Zeitraum</legend>
          <div class="wahl" role="group" aria-label="Zeitraum">${auswahlHtml('jh', JAHRHUNDERTE.map((h) => [h.id, h.name]), e.jh, true)}</div>
        </fieldset>
        <p class="auswahl-info" id="auswahl-info"></p>
      </div>
      <div class="knopf-reihe"><button type="button" class="knopf haupt" id="los">Spiel starten</button></div>
      <div class="blatt tag-karte">
        <div>
          <p class="zusatz-kopf">Tagesaufgabe · ${datumText(tag)}</p>
          <p class="klein">${erledigt
            ? `Heute geschafft: <strong>${zahl(erledigt.punkte)} Punkte</strong>. Eine Wiederholung zählt nicht für die Statistik.`
            : `Fünf Passagen, für alle dieselben: ${esc(satz(modusText(STANDARD)))}`}</p>
        </div>
        <button type="button" class="knopf" id="tag">${erledigt ? 'Nochmal' : 'Spielen'}</button>
      </div>
      <nav class="fuss">
        <button type="button" class="link" id="zur-statistik">Statistik</button>
      </nav>
      <details class="ueber" id="ueber">
        <summary>Über ANNO</summary>
        <div class="ueber-text">
          <p><strong>Texte.</strong> Alle Passagen stammen aus dem Kernkorpus des
            <a href="https://www.deutschestextarchiv.de/" target="_blank" rel="noopener">Deutschen Textarchivs</a> (DTA)
            der Berlin-Brandenburgischen Akademie der Wissenschaften, Fassung vom 10.&nbsp;Februar 2026<span id="umfang"></span>.
            Die Volltexte stehen unter der Lizenz
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener">CC BY-SA 4.0</a>;
            Urheber der elektronischen Fassung ist das Deutsche Textarchiv. Die daraus gewonnenen Passagen stehen unter derselben Lizenz.
            Die normalisierte Fassung ist die des DTA (Reintext, Fassung vom 23.&nbsp;Oktober 2020).</p>
          <p><strong>Zitierempfehlung des DTA.</strong> Deutsches Textarchiv. Grundlage für ein Referenzkorpus der neuhochdeutschen Sprache.
            Herausgegeben von der Berlin-Brandenburgischen Akademie der Wissenschaften, Berlin 2026.</p>
          <p><strong>Auswahl.</strong> Pro Werk zehn bis fünfzehn zufällige Stellen aus dem Haupttext, 80 bis 150 Wörter lang.
            Titelei, Vorreden, Widmungen, Register, Fußnoten, Tabellen, Kolumnentitel, Bogensignaturen und Kustoden sind ausgenommen,
            ebenso Stellen, die Autor, Titel oder das Erscheinungsjahr nennen. Die Silbentrennung am Zeilenende ist aufgelöst, sonst
            steht alles so da wie im Druck. Gewertet wird das Erscheinungsjahr des digitalisierten Drucks; ist es eine spätere Auflage,
            steht das in der Auflösung.</p>
          <p><strong>Bekannte Autoren.</strong> Die Voreinstellung zieht nur aus Werken von<span id="kanon-umfang"></span> Autorinnen
            und Autoren, die man aus Schule, Studium oder Allgemeinbildung kennen kann: Dichter von Opitz bis Hofmannsthal,
            Philosophen von Kant bis Nietzsche, dazu bekannte Namen aus Wissenschaft und Geschichte wie Humboldt, Gauß, Darwin,
            Röntgen oder Bismarck. Die Auswahl ist von Hand getroffen und steht in <code>scripts/kanon.txt</code>.
            „Ganzes Korpus“ spielt mit allen Werken.</p>
          <p><strong>Wertung.</strong> Jahr: ${zahl(MAX_JAHR)} · e<sup>−Abstand/${ABFALL}</sup>, also etwa 3.000 Punkte bei 10 Jahren Abstand,
            2.000 bei 25, 950 bei 50 und 230 bei 100. Gattung und Autor bringen je ${zahl(MAX_GATTUNG)} Punkte. Im Modus Moving kostet
            jeder zusätzliche Absatz 10 % der möglichen Punkte.</p>
          <p><strong>Speicher.</strong> Einstellungen, Statistik und Tagesaufgaben bleiben nur in diesem Browser (localStorage).</p>
          <p><strong>Faksimiles.</strong> Die Links führen zur jeweiligen Seite im DTA. Die Rechte an den Bilddigitalisaten liegen bei den besitzenden Bibliotheken.</p>
          <p><strong>Schriften.</strong> EB Garamond (Georg Duffner, Octavio Pardo) und Cardo (David J. Perry), beide unter der SIL Open Font License.</p>
          <p><strong>Musik.</strong> Johann Sebastian Bach, Goldberg-Variationen BWV 988: Aria und Variationen 13, 21 und 25,
            gespielt von Kimiko Ishizaka (<a href="https://archive.org/details/OpenGoldbergVariations" target="_blank" rel="noopener">The Open Goldberg Variations</a>, 2012),
            gemeinfrei (CC0). Die Musik ist für alle Passagen dieselbe und verrät nichts. Die Klänge erzeugt der Browser selbst.
            Musik und Klänge lassen sich oben rechts abschalten, die Musik auch mit der Taste M.</p>
        </div>
      </details>
    </section>`;

  const info = () => {
    const el = $('#auswahl-info');
    if (!indexDaten || !el) return;
    const werke = indexDaten.werke.filter((w) => werkPasst(w, einstellungen));
    const n = werke.reduce((s, w) => s + (einstellungen.schreibung === 'norm' ? w.norm : w.n), 0);
    el.textContent = `${zahl(n)} Passagen aus ${zahl(werke.length)} Werken`;
    $('#los').disabled = n === 0;
  };
  for (const chip of $$('.einstellungen .chip')) {
    chip.addEventListener('click', () => {
      const { feld, wert } = chip.dataset;
      Klang.klick();
      const neu = { ...einstellungen };
      if (feld === 'gattungen' || feld === 'jh') {
        const liste = neu[feld].includes(wert) ? neu[feld].filter((x) => x !== wert) : [...neu[feld], wert];
        if (!liste.length) { meldung('Mindestens eine Auswahl bleibt an'); return; }
        neu[feld] = liste;
      } else {
        neu[feld] = wert;
      }
      einstellungen = pruefen(neu);
      speicher.schreiben('anno.einstellungen', einstellungen);
      for (const c of $$(`.einstellungen .chip[data-feld="${feld}"]`)) {
        const an = Array.isArray(einstellungen[feld]) ? einstellungen[feld].includes(c.dataset.wert) : einstellungen[feld] === c.dataset.wert;
        c.setAttribute('aria-checked', String(an));
      }
      const texte = { auswahl: AUSWAHL, bewegung: BEWEGUNG, schreibung: SCHREIBUNG }[feld];
      if (texte) chip.closest('fieldset').querySelector('.erklaerung').textContent = texte[einstellungen[feld]].text;
      info();
    });
  }
  $('#los').addEventListener('click', () => spielStarten());
  $('#tag').addEventListener('click', () => spielStarten({ seed: `tag-${tag}`, einst: STANDARD, art: 'tag', tag, wertung: !erledigt }));
  $('#zur-statistik').addEventListener('click', statistikZeigen);
  if (ch) {
    $('#annehmen').addEventListener('click', () => spielStarten({ seed: ch.seed, einst: ch.einst, art: 'challenge', gegen: ch.gegen }));
  }
  ladeIndex().then((index) => {
    const passagen = index.werke.reduce((s, w) => s + w.n, 0);
    const umfang = $('#umfang');
    if (umfang) umfang.textContent = `; im Spiel ${zahl(index.werke.length)} Werke mit ${zahl(passagen)} Passagen`;
    const kanon = $('#kanon-umfang');
    if (kanon) {
      const bekannt = index.autoren.filter((a) => a.bekannt && !a.ohne_passage).length;
      const werke = index.werke.filter((w) => w.bekannt);
      kanon.textContent = ` ${zahl(bekannt)}`;
      kanon.title = `${zahl(werke.length)} Werke, ${zahl(werke.reduce((s, w) => s + w.n, 0))} Passagen`;
    }
    info();
  }).catch(() => {});
}

function fehler(err) {
  spiel = null;
  standZeigen();
  const lokal = location.protocol === 'file:';
  app.innerHTML = `
    <section class="start">
      <div class="blatt">
        <p><strong>Die Passagen konnten nicht geladen werden.</strong></p>
        ${lokal ? '<p>ANNO muss über einen lokalen Server laufen, nicht als Datei. Im Ordner <code>anno/</code>:</p><pre>python3 -m http.server 8000</pre><p>und dann <code>http://localhost:8000</code> öffnen.</p>' : ''}
        <p class="klein">${esc(err.message || err)}</p>
      </div>
      <div class="knopf-reihe"><button type="button" class="knopf haupt" id="zum-start">Zur Startseite</button></div>
    </section>`;
  $('#zum-start').addEventListener('click', startseite);
}

// Enter: tippen bzw. weiter (außer in Eingabefeldern, auf Knöpfen und Links)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !spiel || spiel.runde >= RUNDEN) return;
  if (e.target.closest('button, a, input, select, textarea, summary')) return;
  const r = aktuelle();
  e.preventDefault();
  if (!r.ergebnis) tippen();
  else weiter();
});

// Musik und Klänge
function schalterZeigen() {
  $('#musik-knopf').setAttribute('aria-pressed', String(Klang.musik));
  $('#klang-knopf').setAttribute('aria-pressed', String(Klang.effekte));
}
$('#musik-knopf').addEventListener('click', () => {
  meldung(Klang.musikSchalten() ? 'Musik an' : 'Musik aus');
  schalterZeigen();
});
$('#klang-knopf').addEventListener('click', () => {
  meldung(Klang.effekteSchalten() ? 'Klänge an' : 'Klänge aus');
  schalterZeigen();
});
window.addEventListener('keydown', (e) => {
  if ((e.key !== 'm' && e.key !== 'M') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest('input, select, textarea, [contenteditable]')) return;
  meldung(Klang.musikSchalten() ? 'Musik an' : 'Musik aus');
  schalterZeigen();
});
Klang.beiTitel(meldung);
schalterZeigen();

$('.marke').addEventListener('click', (e) => {
  e.preventDefault();
  if (spiel && spiel.runde < RUNDEN && spiel.runden.some((r) => r.ergebnis) && !confirm('Laufendes Spiel abbrechen?')) return;
  startseite();
});

startseite();
