// Da capo! – Spiellogik. Rein und ohne DOM: der Zustand eines Laufs ist ein
// JSON-Objekt, alle Zufälle laufen über den Generator im Lauf selbst. So lässt
// sich ein Lauf speichern, fortsetzen und als „Spielplan des Tages“ für alle
// gleich auswürfeln.

import {
  WERK, WERKE, KOMPONISTEN, SCHUL_IDS, epocheVon, PROGRAMME, PROGRAMM_IDS, STERNSTUNDEN,
  STARS, STAR, PROBEN, PROBE, INVESTITIONEN, INVESTITION, KRITIKER, FINAL_KRITIKER,
  HAEUSER, GASTSPIELE, ZIELE, ABENDE, REPERTOIRE, REZENSIONEN,
} from './data.js';

export const VERSION = 1;
export const STATIONEN = 8;

// ------------------------------------------------------------------ Zufall

export function rnd(run) {
  let t = (run.rng = (run.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (run, n) => Math.floor(rnd(run) * n);
const pick = (run, arr) => arr[rint(run, arr.length)];
function mischen(run, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rint(run, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function seedAus(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ------------------------------------------------------------------ Werke

export const werkVon = (c) => WERK[c.w];
export const komp = (c) => WERK[c.w].c;
export const schule = (c) => c.s || WERK[c.w].s;
export const epoche = (c) => epocheVon(WERK[c.w].y);
export const ruhm = (c) => WERK[c.w].r;
export const kompName = (id) => KOMPONISTEN[id][0];

export function karte(run, uid) {
  return run.repertoire.find((c) => c.uid === uid) || null;
}
function neueKarte(run, w, enh = null, s = null) {
  const c = { uid: run.nextUid++, w };
  if (enh) c.enh = enh;
  if (s) c.s = s;
  return c;
}

// ------------------------------------------------------------------ Stars

export const aktiveStars = (run) => run.stars.filter((s, i) => !(run.round && run.round.offStar === i));
export const hatStar = (run, id) => run.stars.some((s) => s.id === id);
const hatAktiv = (run, id) => aktiveStars(run).some((s) => s.id === id);
export const hatInvest = (run, id) => run.investitionen.includes(id);
export const verkaufswert = (s) => Math.max(1, Math.floor((STAR[s.id]?.preis || 2) / 2));

// ------------------------------------------------------------------ Neuer Lauf

export function neuerLauf({ deck = 'leipzig', strenge = 1, seed = (Math.random() * 2 ** 32) >>> 0, taeglich = null } = {}) {
  const def = REPERTOIRE[deck] || REPERTOIRE.leipzig;
  const run = {
    v: VERSION, seed, rng: seed >>> 0, deck: def.id, strenge, taeglich,
    station: 1, abend: 0, phase: 'spielplan', endlos: false,
    geld: 4, repertoire: [], nextUid: 1,
    stars: [], maxStars: 5, proben: [], maxProben: 2,
    stufen: Object.fromEntries(PROGRAMM_IDS.map((p) => [p, 1])),
    gespielt: Object.fromEntries(PROGRAMM_IDS.map((p) => [p, 0])),
    handSize: 8 + (def.bonus?.handSize || 0),
    haende: 4,
    umbes: 3 + (def.bonus?.discards || 0) - (strenge >= 4 ? 1 : 0),
    investitionen: [], foyerPlaetze: 2,
    kritiker: {}, kritikerGehabt: [], investAngebot: {},
    sortierung: 'komponist',
    round: null, shop: null, pack: null, bravo: null,
    stats: {
      besteVorstellung: 0, besteArt: null, besteWerke: [], vorstellungen: 0,
      sternstunden: {}, komponisten: {}, verdient: 0, abende: 0, gestrichen: 0,
      ende: null,
    },
  };
  let ids = def.werke;
  if (def.zufall) ids = mischen(run, WERKE.map((w) => w.id)).slice(0, def.zufall);
  for (const w of ids) run.repertoire.push(neueKarte(run, w));
  if (def.star) run.stars.push({ id: def.star, v: 0 });
  kritikerWaehlen(run);
  return run;
}

// ------------------------------------------------------------------ Stationen

export function haus(station) {
  if (station <= STATIONEN) return HAEUSER[station - 1];
  return GASTSPIELE[(station - STATIONEN - 1) % GASTSPIELE.length];
}

function kritikerWaehlen(run) {
  const st = run.station;
  if (run.kritiker[st]) return;
  if (st % STATIONEN === 0) {
    run.kritiker[st] = pick(run, FINAL_KRITIKER).id;
  } else {
    const fair = KRITIKER.filter((k) => !kritikerUnfair(run, k.id));
    let pool = fair.filter((k) => !run.kritikerGehabt.includes(k.id));
    if (!pool.length) { run.kritikerGehabt = []; pool = fair; }
    // In Station 1 keine allzu gemeinen Regeln.
    if (st === 1) pool = pool.filter((k) => !['strenge', 'schlaefer', 'ungeduld', 'pedant'].includes(k.id));
    const k = pick(run, pool).id;
    run.kritiker[st] = k;
    run.kritikerGehabt.push(k);
  }
  if (!run.investAngebot[st]) {
    const pool = INVESTITIONEN.filter((v) => !run.investitionen.includes(v.id));
    run.investAngebot[st] = pool.length ? pick(run, pool).id : null;
  }
}

// Eine Regel, die den Großteil des Repertoires entwertet, macht den Abend
// unspielbar – etwa der Kritiker vom Hügel gegen das rein italienische
// Belcanto-Abo. Solche Kritiker werden nicht gezogen.
const UNFAIR_AB = 0.6;
function kritikerUnfair(run, k) {
  const n = run.repertoire.length;
  if (!n) return false;
  return run.repertoire.filter((c) => kritikerTrifft(k, c)).length / n > UNFAIR_AB;
}

// Kritiker, die man mitten im Abend tauschen kann, ohne Ziel, Hand oder
// Vorstellungen neu zu berechnen.
const TAUSCHBAR = ['purist', 'avantgarde', 'mailand', 'huegel', 'wagnerianer', 'moralist', 'gelangweilt', 'abonnentin', 'feuilleton', 'pedant', 'huster', 'sparkommissar'];

/**
 * Repariert Spielstände, die noch einen unfairen Kritiker gezogen haben.
 * Gibt den neuen Kritiker zurück, wenn getauscht wurde.
 */
export function kritikerReparieren(run) {
  const st = run.station;
  const alt = run.kritiker[st];
  if (!alt || !KRITIKER.some((k) => k.id === alt) || !kritikerUnfair(run, alt)) return null;
  const imAbend = run.phase === 'abend' && run.abend === 2 && run.round;
  let pool = KRITIKER.filter((k) => !kritikerUnfair(run, k.id) && k.id !== alt);
  if (imAbend) pool = pool.filter((k) => TAUSCHBAR.includes(k.id));
  if (!pool.length) return null;
  const neu = pick(run, pool).id;
  run.kritiker[st] = neu;
  run.kritikerGehabt = run.kritikerGehabt.filter((k) => k !== alt).concat(neu);
  if (imAbend && run.round.kritiker === alt) run.round.kritiker = neu;
  return neu;
}

export function kritikerVon(run, station = run.station) {
  return run.kritiker[station] || null;
}
// Gilt die Regel des Kritikers heute? Nur am dritten Abend, und nicht mit Hustenbonbons.
export function kritikerAktiv(run, abend = run.abend) {
  if (abend !== 2) return null;
  if (hatStar(run, 'hustenbonbon')) return null;
  return kritikerVon(run);
}

function rund(n) {
  if (n < 1000) return Math.round(n / 10) * 10;
  if (n < 100000) return Math.round(n / 100) * 100;
  const mag = 10 ** (Math.floor(Math.log10(n)) - 2);
  return Math.round(n / mag) * mag;
}
export function ziel(run, station = run.station, abend = run.abend) {
  let basis = station <= STATIONEN
    ? ZIELE[station - 1]
    : ZIELE[STATIONEN - 1] * Math.pow(2.2, station - STATIONEN);
  if (run.strenge >= 5) basis *= 1.6;
  else if (run.strenge >= 3) basis *= 1.25;
  let f = ABENDE[abend].faktor;
  const k = kritikerAktiv(run, abend);
  if (k === 'schlaefer') f = 1;
  if (k === 'gruenerhuegel') f = 4;
  return rund(basis * f);
}

export function handGroesse(run) {
  let n = run.handSize;
  if (hatStar(run, 'inspizient')) n += 1;
  if (run.round?.kritiker === 'kurzsichtig') n -= 1;
  return n;
}
function vorstellungenProAbend(run, k) {
  if (k === 'schlaefer') return 1;
  return run.haende + (hatStar(run, 'opernglas') ? 1 : 0);
}
function umbesetzungenProAbend(run, k) {
  if (k === 'ungeduld') return 0;
  return Math.max(0, run.umbes + (hatStar(run, 'pausensekt') ? 1 : 0));
}

// ------------------------------------------------------------------ Abend

export function starteAbend(run) {
  kritikerWaehlen(run);
  const k = kritikerAktiv(run);
  run.round = {
    ziel: ziel(run), punkte: 0, kritiker: k,
    haende: 0, umbes: 0, nr: 0,
    stapel: mischen(run, run.repertoire.map((c) => c.uid)),
    hand: [], ablage: [], arten: [], verdeckt: {},
    orakel: hatStar(run, 'orakel') ? pick(run, SCHUL_IDS) : null,
    offStar: null, beste: 0,
  };
  run.round.haende = vorstellungenProAbend(run, k);
  run.round.umbes = umbesetzungenProAbend(run, k);
  if (k === 'primadonna') primadonnaWuerfeln(run);
  run.phase = 'abend';
  run.bravo = null;
  ziehen(run);
  return run.round;
}

function primadonnaWuerfeln(run) {
  run.round.offStar = run.stars.length ? rint(run, run.stars.length) : null;
}

function ziehen(run) {
  const r = run.round;
  const neu = [];
  const n = handGroesse(run);
  while (r.hand.length < n && r.stapel.length) {
    const uid = r.stapel.pop();
    r.hand.push(uid);
    neu.push(uid);
    if (r.kritiker === 'regie' && rnd(run) < 0.25) r.verdeckt[uid] = true;
  }
  sortiereHand(run);
  return neu;
}

const SCHUL_ORDNUNG = Object.fromEntries(SCHUL_IDS.map((s, i) => [s, i]));
export function sortiereHand(run, art = run.sortierung) {
  const r = run.round;
  if (!r) return;
  const cards = r.hand.map((u) => karte(run, u));
  const anzahl = {};
  for (const c of cards) anzahl[komp(c)] = (anzahl[komp(c)] || 0) + 1;
  const name = (c) => kompName(komp(c));
  const jahr = (c) => werkVon(c).y;
  const vergleich = {
    komponist: (a, b) => (anzahl[komp(b)] - anzahl[komp(a)]) || name(a).localeCompare(name(b), 'de') || jahr(a) - jahr(b),
    epoche: (a, b) => jahr(a) - jahr(b) || name(a).localeCompare(name(b), 'de'),
    ruhm: (a, b) => ruhm(b) - ruhm(a) || name(a).localeCompare(name(b), 'de') || jahr(a) - jahr(b),
    schule: (a, b) => SCHUL_ORDNUNG[schule(a)] - SCHUL_ORDNUNG[schule(b)] || name(a).localeCompare(name(b), 'de') || jahr(a) - jahr(b),
  }[art] || (() => 0);
  cards.sort((a, b) => {
    const va = r.verdeckt[a.uid] ? 1 : 0, vb = r.verdeckt[b.uid] ? 1 : 0;
    return va - vb || vergleich(a, b) || a.uid - b.uid;
  });
  r.hand = cards.map((c) => c.uid);
}

// ------------------------------------------------------------------ Bewertung

function gruppiere(cards, key) {
  const m = new Map();
  for (const c of cards) {
    const k = key(c);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  return [...m.values()];
}
const summeRuhm = (g) => g.reduce((s, c) => s + ruhm(c), 0);
export const jahrzehnt = (c) => Math.floor(werkVon(c).y / 10);
export const ZEIT_SPANNE = 7; // Jahrzehnte

// Zeitreise: fünf verschiedene Jahrzehnte, die in ein Fenster von sieben
// Jahrzehnten passen – je Jahrzehnt das Werk mit dem größten Ruhm.
function zeitFolge(cards, req) {
  const m = new Map();
  for (const c of cards) {
    const d = jahrzehnt(c);
    if (!m.has(d) || ruhm(c) > ruhm(m.get(d))) m.set(d, c);
  }
  const ds = [...m.keys()].sort((a, b) => a - b);
  let best = null;
  for (let i = 0; i < ds.length; i++) {
    const fenster = ds.filter((d) => d >= ds[i] && d - ds[i] < ZEIT_SPANNE);
    if (fenster.length >= req && (!best || fenster.length > best.length)) best = fenster;
  }
  return best ? best.map((d) => m.get(d)) : null;
}

// Rangfolge bei Gleichstand (höher = besser).
const RANG = Object.fromEntries(PROGRAMM_IDS.map((p, i) => [p, i]));

/**
 * Welches Programm ergeben die gespielten Werke? Passen mehrere, gilt das mit
 * dem höchsten Grundwert (Stufe eingerechnet) – das Haus spielt immer die
 * beste Lesart.
 * @returns {{art: string, zaehlen: object[], enth: object, kandidaten: string[], statt: string|null}}
 */
export function bewerte(cards, run = null) {
  const req = run && hatAktiv(run, 'prisma') ? 4 : 5;
  const n = cards.length;
  if (!n) return null;
  const komps = gruppiere(cards, komp).sort((a, b) => b.length - a.length || summeRuhm(b) - summeRuhm(a));
  const c0 = komps[0]?.length || 0;
  const c1 = komps[1]?.length || 0;
  const schulen = gruppiere(cards, schule).sort((a, b) => b.length - a.length || summeRuhm(b) - summeRuhm(a));
  const national = schulen[0].length >= req ? schulen[0] : null;
  const zeitreise = zeitFolge(cards, req);
  let gross = null;
  for (const g of schulen) {
    const z = zeitFolge(g, req);
    if (z && (!gross || z.length > gross.length)) gross = z;
  }

  const kand = [];
  if (n === 5 && c0 === 5) kand.push(['gesamtwerk', cards]);
  if (gross) kand.push(['grosseZeit', gross]);
  if (c0 >= 4) kand.push(['werkschau', komps[0]]);
  if (c0 >= 3 && c1 >= 2) kand.push(['festspiel', [...komps[0], ...komps[1]]]);
  if (zeitreise) kand.push(['zeitreise', zeitreise]);
  if (c0 >= 3) kand.push(['kompAbend', komps[0]]);
  if (national) kand.push(['national', national]);
  if (c0 >= 2 && c1 >= 2) kand.push(['zweiDoppel', [...komps[0], ...komps[1]]]);
  if (c0 >= 2) kand.push(['doppel', komps[0]]);
  kand.push(['solo', [cards.reduce((best, c) => (ruhm(c) > ruhm(best) ? c : best), cards[0])]]);

  const wert = ([art, zs]) => {
    const st = run ? run.stufen[art] : 1;
    const P = PROGRAMME[art];
    return (P.p + (st - 1) * P.sp + summeRuhm(zs)) * (P.b + (st - 1) * P.sb);
  };
  const waehle = (liste) => {
    let best = liste[0];
    let bestWert = wert(best);
    for (const k of liste.slice(1)) {
      const w = wert(k);
      if (w > bestWert || (w === bestWert && RANG[k[0]] > RANG[best[0]])) { best = k; bestWert = w; }
    }
    return best;
  };

  // Die stärkste *erlaubte* Lesart: Verbietet der Kritiker ein Programm,
  // spielt das Haus das beste andere, das noch geht.
  const r = run?.round;
  let erlaubt = kand;
  if (r?.kritiker === 'gelangweilt') {
    const frei = kand.filter(([a]) => !r.arten.includes(a));
    if (frei.length) erlaubt = frei;
  } else if (r?.kritiker === 'abonnentin' && r.arten.length) {
    const pflicht = kand.filter(([a]) => a === r.arten[0]);
    if (pflicht.length) erlaubt = pflicht;
  }
  const [art, zaehlen] = waehle(erlaubt);
  const ohneRegel = waehle(kand)[0];
  const set = new Set(zaehlen);
  return {
    art,
    zaehlen: cards.filter((c) => set.has(c)),
    kandidaten: erlaubt.map((k) => k[0]),
    statt: ohneRegel !== art ? ohneRegel : null,
    enth: {
      doppel: c0 >= 2,
      zweiDoppel: c0 >= 2 && c1 >= 2,
      kompAbend: c0 >= 3,
      festspiel: c0 >= 3 && c1 >= 2,
      werkschau: c0 >= 4,
      national: !!national || !!gross,
      zeitreise: !!zeitreise || !!gross,
    },
  };
}

export function sternstundenIn(cards) {
  const ids = new Set(cards.map((c) => c.w));
  const komps = new Set(cards.map(komp));
  return STERNSTUNDEN.filter((s) => {
    if (s.komponisten) return s.komponisten.every((k) => komps.has(k));
    const treffer = s.werke.filter((w) => ids.has(w)).length;
    return treffer >= (s.min || s.werke.length);
  });
}

export function programmWerte(run, art) {
  const P = PROGRAMME[art];
  const st = run.stufen[art];
  return { p: P.p + (st - 1) * P.sp, b: P.b + (st - 1) * P.sb, stufe: st };
}

export function zaehltNicht(run, c) {
  const k = run.round?.kritiker;
  return k ? kritikerTrifft(k, c) : false;
}

/** Würde die Regel dieses Kritikers das Werk entwerten? */
export function kritikerTrifft(k, c) {
  const w = werkVon(c);
  switch (k) {
    case 'purist': return w.y > 1900;
    case 'avantgarde': return w.y < 1850;
    case 'mailand': return schule(c) === 'de';
    case 'huegel': return schule(c) === 'it';
    case 'wagnerianer': return w.a < 3;
    case 'moralist': return w.h;
    default: return false;
  }
}

/** Darf diese Auswahl gespielt werden? Für die Vorschau und den Knopf. */
export function pruefeAuswahl(run, uids) {
  const r = run.round;
  if (!r || run.phase !== 'abend') return { ok: false, grund: '' };
  if (!uids.length) return { ok: false, grund: '' };
  if (uids.length > 5) return { ok: false, grund: 'Höchstens fünf Werke pro Vorstellung.' };
  const cards = uids.map((u) => karte(run, u));
  const ev = bewerte(cards, run);
  const k = r.kritiker;
  const fuenf = Math.min(5, r.hand.length);
  if (k === 'strenge' && uids.length !== fuenf) return { ok: false, ev, grund: `Die Strenge verlangt genau ${fuenf === 5 ? 'fünf' : fuenf} Werke.` };
  // Diese beiden blockieren nicht – sonst könnte man sich festspielen. Die
  // Vorstellung bringt dann eben nichts (wie bei Balatro).
  if (k === 'gelangweilt' && r.arten.includes(ev.art)) return { ok: true, ev, grund: '', nichtig: `${PROGRAMME[ev.art].name} hatten wir heute schon. Gähn.` };
  if (k === 'abonnentin' && r.arten.length && r.arten[0] !== ev.art) return { ok: true, ev, grund: '', nichtig: `Die Stammabonnentin will heute nur ${PROGRAMME[r.arten[0]].name}.` };
  return { ok: true, ev, grund: '' };
}

// ------------------------------------------------------------------ Wertung

// Wirkungen je gezähltem Werk.
const KARTEN_FX = {
  caruso: (c) => schule(c) === 'it' && { b: 3 },
  lehmann: (c) => schule(c) === 'de' && { b: 3 },
  calve: (c) => schule(c) === 'fr' && { b: 4 },
  schaljapin: (c) => schule(c) === 'os' && { b: 4 },
  pears: (c) => schule(c) === 'en' && { b: 4 },
  gewandhaus: () => ({ p: 10 }),
  kurz: (c) => werkVon(c).a <= 2 && { b: 3 },
  sitzfleisch: (c) => werkVon(c).a >= 4 && { p: 30 },
  buffo: (c) => werkVon(c).h && { b: 3 },
  kassenschlager: (c) => ruhm(c) >= 10 && { b: 4 },
  daponte: (c) => komp(c) === 'mozart' && { p: 30, b: 3 },
  boito: (c) => komp(c) === 'verdi' && { b: 5 },
  hofmannsthal: (c) => komp(c) === 'rstrauss' && { b: 5 },
  illica: (c) => komp(c) === 'puccini' && { b: 5 },
  ricordi: (c) => (komp(c) === 'verdi' || komp(c) === 'puccini') && { g: 1 },
  ludwig: (c) => komp(c) === 'wagner' && { g: 2 },
  melchior: (c, s) => {
    if (komp(c) !== 'wagner') return null;
    s.v = (s.v || 0) + 1;
    return { wachs: `+${s.v}` };
  },
  raritaeten: (c) => ruhm(c) <= 6 && { x: 1.5 },
  orakel: (c, s, run) => schule(c) === run.round.orakel && { x: 1.5 },
  callas: (c) => schule(c) === 'it' && { x: 1.3 },
  cosima: (c) => komp(c) === 'wagner' && { x: 1.5 },
};

// Wirkungen einmal pro Vorstellung, in der Reihenfolge der Stars.
const HAND_FX = {
  claque: () => ({ b: 4 }),
  souffleur: (ctx) => ctx.ev.enth.doppel && { b: 8 },
  abonnent: (ctx) => ctx.ev.enth.kompAbend && { b: 12 },
  dramaturgin: (ctx) => ctx.ev.enth.zeitreise && { b: 12 },
  lokalpatriot: (ctx) => ctx.ev.enth.national && { b: 10 },
  platzanweiserin: (ctx) => ctx.ev.enth.doppel && { p: 50 },
  abendkasse: (ctx) => ctx.ev.enth.kompAbend && { p: 100 },
  allerlei: (ctx) => ({ b: 4 * new Set(ctx.cards.map(schule)).size }),
  melchior: (ctx, s) => s.v > 0 && { b: s.v },
  stammpublikum: (ctx, s) => s.v > 0 && { b: s.v },
  fraktion: (ctx) => ctx.cards.length >= 3 && new Set(ctx.cards.map(schule)).size === 1 && { x: 2 },
  regietheater: () => ({ x: 2 }),
  pavarotti: (ctx) => ctx.cards.length === 1 && { x: 4 },
  generalprobe: (ctx) => ctx.erste && { x: 2 },
  toscanini: (ctx) => ctx.cards.length >= 2 && new Set(ctx.cards.map(epoche)).size === 1 && { x: 2.5 },
  karajan: (ctx) => ctx.letzte && { x: 3 },
  kino: () => ({ px: 2 }),
  intendant: (ctx, s) => s.v > 0 && { x: 1 + s.v },
};

/**
 * Spielt die gewählten Werke. Gibt die Schritte für die Animation zurück und
 * verändert den Lauf.
 */
export function auffuehren(run, uidsGewaehlt) {
  const r = run.round;
  const pr = pruefeAuswahl(run, uidsGewaehlt);
  if (!pr.ok) return null;
  // In Handreihenfolge spielen – so sieht man es auch.
  const uids = r.hand.filter((u) => uidsGewaehlt.includes(u));
  const cards = uids.map((u) => karte(run, u));
  const ev = pr.ev;
  const art = ev.art;
  const stars = run.stars;
  const off = r.offStar;
  const letzte = r.haende === 1;
  const erste = r.nr === 0;
  const ctx = { run, ev, cards, letzte, erste };

  let { p: P, b: B, stufe } = programmWerte(run, art);
  if (r.kritiker === 'feuilleton') { P = Math.ceil(P / 2); B = Math.max(1, Math.ceil(B / 2)); }
  const schritte = [];
  let geld = 0;
  const S = (s) => { s.P = P; s.B = B; schritte.push(s); };
  S({ t: 'basis', art, stufe });
  const nichtig = !!pr.nichtig;
  if (nichtig) { P = 0; B = 0; S({ t: 'nichtig', text: pr.nichtig }); }

  // Stammpublikum wächst vor der Wertung (wie der Bus bei Balatro).
  stars.forEach((s, i) => {
    if (nichtig || i === off || s.id !== 'stammpublikum') return;
    if (art === 'solo') { if (s.v) { s.v = 0; S({ t: 'wachs', i, text: 'Zurückgesetzt' }); } }
    else if (ev.enth.doppel) { s.v = (s.v || 0) + 2; S({ t: 'wachs', i, text: `+${s.v}` }); }
  });

  const wende = (fx, quelle) => {
    if (!fx) return;
    if (fx.p) { P += fx.p; S({ t: 'p', v: fx.p, ...quelle }); }
    if (fx.b) { B += fx.b; S({ t: 'b', v: fx.b, ...quelle }); }
    if (fx.x) { B *= fx.x; S({ t: 'x', v: fx.x, ...quelle }); }
    if (fx.px) { P *= fx.px; S({ t: 'px', v: fx.px, ...quelle }); }
    if (fx.g) { geld += fx.g; S({ t: 'g', v: fx.g, ...quelle }); }
    if (fx.wachs) S({ t: 'wachs', text: fx.wachs, ...quelle });
  };

  const zugabe = stars.some((s, i) => i !== off && s.id === 'zugabe');
  const dacapo = letzte && stars.some((s, i) => i !== off && s.id === 'dacapo');
  const gezaehlt = [];
  (nichtig ? [] : ev.zaehlen).forEach((c, idx) => {
    if (zaehltNicht(run, c)) { S({ t: 'nicht', uid: c.uid }); return; }
    gezaehlt.push(c);
    const mal = 1 + (zugabe && idx === 0 ? 1 : 0) + (dacapo ? 1 : 0);
    for (let m = 0; m < mal; m++) {
      if (m > 0) S({ t: 'zugabe', uid: c.uid });
      P += ruhm(c);
      S({ t: 'karte', uid: c.uid, v: ruhm(c) });
      if (c.enh === 'bonus') { P += 30; S({ t: 'p', v: 30, uid: c.uid }); }
      if (c.enh === 'mult') { B += 4; S({ t: 'b', v: 4, uid: c.uid }); }
      if (c.enh === 'xmult') { B *= 1.5; S({ t: 'x', v: 1.5, uid: c.uid }); }
      if (c.enh === 'gold') { geld += 2; S({ t: 'g', v: 2, uid: c.uid }); }
      stars.forEach((s, i) => {
        if (i === off) return;
        const f = KARTEN_FX[s.id];
        if (f) wende(f(c, s, run), { i, uid: c.uid });
      });
    }
  });

  stars.forEach((s, i) => {
    if (nichtig || i === off) return;
    const f = HAND_FX[s.id];
    if (f) wende(f(ctx, s), { i });
  });

  const stern = nichtig ? [] : sternstundenIn(cards);
  const fuehrer = stars.some((s, i) => i !== off && s.id === 'opernfuehrer');
  for (const st of stern) {
    const x = st.x * (fuehrer ? 2 : 1);
    B *= x;
    S({ t: 'stern', id: st.id, name: st.name, v: x });
    run.stats.sternstunden[st.id] = (run.stats.sternstunden[st.id] || 0) + 1;
  }

  const gesamt = Math.floor(P * B);

  // Buchhaltung
  r.punkte += gesamt;
  r.haende -= 1;
  r.nr += 1;
  r.arten.push(art);
  r.beste = Math.max(r.beste, gesamt);
  run.gespielt[art] += 1;
  if (r.kritiker === 'pedant' && run.stufen[art] > 1) run.stufen[art] -= 1;
  let kosten = 0;
  if (r.kritiker === 'sparkommissar') kosten = Math.min(run.geld + geld, cards.length);
  run.geld += geld - kosten;
  run.stats.verdient += geld;
  run.stats.vorstellungen += 1;
  for (const c of cards) run.stats.komponisten[komp(c)] = (run.stats.komponisten[komp(c)] || 0) + 1;
  if (gesamt > run.stats.besteVorstellung) {
    run.stats.besteVorstellung = gesamt;
    run.stats.besteArt = art;
    run.stats.besteWerke = cards.map((c) => c.w);
  }

  r.hand = r.hand.filter((u) => !uids.includes(u));
  r.ablage.push(...uids);
  for (const u of uids) delete r.verdeckt[u];

  let gehustet = [];
  if (r.kritiker === 'huster' && r.hand.length) {
    const h = mischen(run, [...r.hand]).slice(0, 2);
    r.hand = r.hand.filter((u) => !h.includes(u));
    r.ablage.push(...h);
    gehustet = h;
  }

  const ergebnis = {
    art, stufe, uids, zaehlen: ev.zaehlen.map((c) => c.uid), gezaehlt: gezaehlt.map((c) => c.uid),
    schritte, P, B, gesamt, geld, kosten, stern: stern.map((s) => s.id), gehustet,
    werke: cards.map((c) => c.w), neu: [], gewonnen: false, verloren: false,
  };

  if (r.punkte >= r.ziel) {
    ergebnis.gewonnen = true;
    abendGewonnen(run);
  } else if (r.haende <= 0) {
    ergebnis.verloren = true;
    run.phase = 'vorhang';
    run.stats.ende = { station: run.station, abend: run.abend, kritiker: r.kritiker, punkte: r.punkte, ziel: r.ziel };
  } else {
    ergebnis.neu = ziehen(run);
    if (r.kritiker === 'primadonna') primadonnaWuerfeln(run);
  }
  return ergebnis;
}

export function umbesetzen(run, uidsGewaehlt) {
  const r = run.round;
  if (!r || run.phase !== 'abend' || r.umbes <= 0) return null;
  const uids = r.hand.filter((u) => uidsGewaehlt.includes(u)).slice(0, 5);
  if (!uids.length) return null;
  r.umbes -= 1;
  r.hand = r.hand.filter((u) => !uids.includes(u));
  r.ablage.push(...uids);
  for (const u of uids) delete r.verdeckt[u];
  return { uids, neu: ziehen(run) };
}

// ------------------------------------------------------------------ Abendende

function abendGewonnen(run) {
  const r = run.round;
  const zeilen = [];
  const ereignisse = [];
  const a = ABENDE[run.abend];
  const gage = run.strenge >= 2 && run.abend === 0 ? 0 : a.gage;
  zeilen.push({ text: `Gage ${a.name}`, v: gage });
  if (r.haende > 0) zeilen.push({ text: `${r.haende} übrige ${r.haende === 1 ? 'Vorstellung' : 'Vorstellungen'}`, v: r.haende });
  for (const s of run.stars) {
    if (s.id === 'maezen') zeilen.push({ text: 'Der Mäzen', v: 4 });
    if (s.id === 'garderobiere' && r.umbes > 0) zeilen.push({ text: 'Die Garderobiere', v: r.umbes });
    if (s.id === 'ausschuss' && run.abend === 2) zeilen.push({ text: 'Fördermittel des Kulturausschusses', v: 10 });
  }
  const cap = hatInvest(run, 'foerderverein') ? 10 : 5;
  const zins = Math.min(cap, Math.floor(Math.max(0, run.geld) / 5));
  if (zins > 0) zeilen.push({ text: `Zinsen (1 je 5 Dukaten, höchstens ${cap})`, v: zins });

  if (run.abend === 2) {
    for (const s of run.stars) {
      if (s.id === 'intendant') {
        s.v = (s.v || 0) + 0.5;
        ereignisse.push({ text: `Der Generalintendant wächst auf ×${String(1 + s.v).replace('.', ',')}.`, art: 'gut' });
      }
    }
  }
  const regie = run.stars.findIndex((s) => s.id === 'regietheater');
  if (regie >= 0 && rnd(run) < 0.2) {
    run.stars.splice(regie, 1);
    ereignisse.push({ text: 'Buhsturm! Das Regietheater verlässt das Haus.', art: 'buh' });
  }

  run.stats.abende += 1;
  const sieg = run.station === STATIONEN && run.abend === 2 && !run.endlos;
  run.bravo = { zeilen, ereignisse, summe: zeilen.reduce((s, z) => s + z.v, 0), punkte: r.punkte, ziel: r.ziel, sieg };
  run.phase = 'bravo';
}

export function kassieren(run) {
  if (run.phase !== 'bravo' || !run.bravo) return;
  run.geld += run.bravo.summe;
  run.stats.verdient += run.bravo.summe;
  const sieg = run.bravo.sieg;
  run.round = null;
  if (sieg) {
    run.phase = 'sieg';
    run.stats.ende = { station: run.station, abend: 2, sieg: true };
    return;
  }
  oeffneFoyer(run);
}

export function endlosWeiter(run) {
  run.endlos = true;
  oeffneFoyer(run);
}

export function foyerVerlassen(run) {
  if (run.phase !== 'shop') return;
  run.shop = null;
  run.abend += 1;
  if (run.abend > 2) {
    run.abend = 0;
    run.station += 1;
  }
  kritikerWaehlen(run);
  run.phase = 'spielplan';
}

// ------------------------------------------------------------------ Foyer

function rezPreis(run) { return hatInvest(run, 'pressestelle') ? 1 : 3; }

function zufallsStar(run, ausschluss, maxRar = 3) {
  const besitz = new Set([...run.stars.map((s) => s.id), ...ausschluss]);
  const roll = rnd(run);
  let rar = roll < 0.68 ? 1 : roll < 0.95 ? 2 : 3;
  rar = Math.min(rar, maxRar);
  for (let versuch = 0; versuch < 3; versuch++) {
    const pool = STARS.filter((s) => s.rar === rar && !besitz.has(s.id));
    if (pool.length) return pick(run, pool).id;
    rar = rar === 1 ? 2 : 1;
  }
  const rest = STARS.filter((s) => !besitz.has(s.id));
  return rest.length ? pick(run, rest).id : null;
}

function fehlendeSternWerke(run) {
  const da = new Set(run.repertoire.map((c) => c.w));
  const fehlend = new Set();
  for (const s of STERNSTUNDEN) {
    if (!s.werke) continue;
    const hab = s.werke.filter((w) => da.has(w)).length;
    if (hab > 0) for (const w of s.werke) if (!da.has(w)) fehlend.add(w);
  }
  return [...fehlend];
}

function zufallsWerk(run) {
  if (hatStar(run, 'opernfuehrer') && rnd(run) < 0.5) {
    const f = fehlendeSternWerke(run);
    if (f.length) return pick(run, f);
  }
  return pick(run, WERKE).id;
}
const ENH = ['bonus', 'mult', 'xmult', 'gold'];
function zufallsVeredelung(run, chance) {
  if (rnd(run) >= chance) return null;
  const r = rnd(run);
  return r < 0.35 ? 'bonus' : r < 0.7 ? 'mult' : r < 0.85 ? 'gold' : 'xmult';
}

function angebot(run, ausschluss) {
  const r = rnd(run);
  if (r < 0.6) {
    const id = zufallsStar(run, ausschluss);
    if (id) { ausschluss.push(id); return { art: 'star', id, preis: STAR[id].preis }; }
  }
  if (r < 0.76) return { art: 'rez', id: pick(run, PROGRAMM_IDS.filter((p) => p !== 'gesamtwerk' && p !== 'grosseZeit' || run.gespielt[p] > 0)), preis: rezPreis(run) };
  if (r < 0.9) return { art: 'probe', id: pick(run, PROBEN).id, preis: 3 };
  const enh = zufallsVeredelung(run, 0.35);
  return { art: 'werk', id: zufallsWerk(run), enh, preis: enh ? 4 : 3 };
}

const PAKETE = {
  heft: { name: 'Spielzeitheft', preis: 4, text: 'Wähle eins von drei Werken für dein Repertoire.' },
  feuilleton: { name: 'Feuilleton', preis: 4, text: 'Wähle eine von drei Rezensionen.' },
  mappe: { name: 'Probenmappe', preis: 4, text: 'Wähle eine von drei Proben.' },
  agentur: { name: 'Künstleragentur', preis: 6, text: 'Wähle einen von zwei Stars.' },
};
export { PAKETE };

function paket(run) {
  const r = rnd(run);
  const art = r < 0.34 ? 'heft' : r < 0.6 ? 'feuilleton' : r < 0.82 ? 'mappe' : 'agentur';
  return { art, preis: PAKETE[art].preis, gekauft: false };
}

export function rerollBasis(run) { return hatInvest(run, 'ticketsystem') ? 3 : 5; }

export function oeffneFoyer(run) {
  const aus = [];
  const angebote = [];
  for (let i = 0; i < run.foyerPlaetze; i++) angebote.push(angebot(run, aus));
  run.shop = {
    angebote,
    pakete: [paket(run), paket(run)],
    reroll: rerollBasis(run),
  };
  run.phase = 'shop';
}

export function neuDisponieren(run) {
  const sh = run.shop;
  if (!sh || run.geld < sh.reroll) return false;
  run.geld -= sh.reroll;
  sh.reroll += 1;
  const aus = [];
  sh.angebote = sh.angebote.map(() => angebot(run, aus));
  return true;
}

/** Kauf eines Angebots. Gibt eine Fehlermeldung oder null zurück. */
export function kaufen(run, idx) {
  const a = run.shop?.angebote[idx];
  if (!a || a.verkauft) return 'Schon vergeben.';
  if (run.geld < a.preis) return 'Zu wenig Dukaten.';
  if (a.art === 'star' && run.stars.length >= run.maxStars) return 'Alle Logenplätze sind besetzt. Verkaufe erst einen Star.';
  if (a.art === 'probe' && run.proben.length >= run.maxProben) return 'Kein Platz mehr für Proben.';
  run.geld -= a.preis;
  a.verkauft = true;
  if (a.art === 'star') run.stars.push({ id: a.id, v: 0 });
  if (a.art === 'probe') run.proben.push(a.id);
  if (a.art === 'rez') run.stufen[a.id] += 1;
  if (a.art === 'werk') run.repertoire.push(neueKarte(run, a.id, a.enh));
  return null;
}

export function investieren(run) {
  const id = run.investAngebot[run.station];
  if (!id) return 'Nichts im Angebot.';
  const v = INVESTITION[id];
  if (run.geld < v.preis) return 'Zu wenig Dukaten.';
  run.geld -= v.preis;
  run.investitionen.push(id);
  run.investAngebot[run.station] = null;
  switch (id) {
    case 'drehbuehne': run.foyerPlaetze += 1; if (run.shop) run.shop.angebote.push(angebot(run, [])); break;
    case 'orchestergraben': run.handSize += 1; break;
    case 'abonnement': run.haende += 1; break;
    case 'probebuehne': run.umbes += 1; break;
    case 'loge': run.maxStars += 1; break;
    case 'notenarchiv': run.maxProben += 1; break;
    case 'ticketsystem': if (run.shop) run.shop.reroll = Math.max(0, run.shop.reroll - 2); break;
    case 'pressestelle':
      if (run.shop) for (const a of run.shop.angebote) if (a.art === 'rez') a.preis = 1;
      break;
    default: break;
  }
  return null;
}

export function paketOeffnen(run, idx) {
  const p = run.shop?.pakete[idx];
  if (!p || p.gekauft) return 'Schon geöffnet.';
  if (run.geld < p.preis) return 'Zu wenig Dukaten.';
  run.geld -= p.preis;
  p.gekauft = true;
  let auswahl = [];
  if (p.art === 'heft') {
    for (let i = 0; i < 3; i++) auswahl.push({ art: 'werk', id: zufallsWerk(run), enh: zufallsVeredelung(run, 0.3) });
  } else if (p.art === 'feuilleton') {
    const pool = mischen(run, PROGRAMM_IDS.filter((a) => (a !== 'gesamtwerk' && a !== 'grosseZeit') || run.gespielt[a] > 0));
    auswahl = pool.slice(0, 3).map((id) => ({ art: 'rez', id }));
  } else if (p.art === 'mappe') {
    auswahl = mischen(run, PROBEN.map((x) => x.id)).slice(0, 3).map((id) => ({ art: 'probe', id }));
  } else {
    const aus = [];
    for (let i = 0; i < 2; i++) {
      const id = zufallsStar(run, aus);
      if (id) { aus.push(id); auswahl.push({ art: 'star', id }); }
    }
  }
  run.pack = { art: p.art, auswahl };
  run.phase = 'pack';
  return null;
}

export function paketWaehlen(run, idx) {
  const pk = run.pack;
  if (!pk) return 'Kein Paket offen.';
  if (idx != null) {
    const a = pk.auswahl[idx];
    if (!a) return 'Ungültig.';
    if (a.art === 'star' && run.stars.length >= run.maxStars) return 'Alle Logenplätze sind besetzt. Verkaufe erst einen Star.';
    if (a.art === 'probe' && run.proben.length >= run.maxProben) return 'Kein Platz mehr für Proben.';
    if (a.art === 'werk') run.repertoire.push(neueKarte(run, a.id, a.enh));
    if (a.art === 'rez') run.stufen[a.id] += 1;
    if (a.art === 'probe') run.proben.push(a.id);
    if (a.art === 'star') run.stars.push({ id: a.id, v: 0 });
  }
  run.pack = null;
  run.phase = 'shop';
  return null;
}

export function starVerkaufen(run, i) {
  const s = run.stars[i];
  if (!s) return;
  run.geld += verkaufswert(s);
  run.stars.splice(i, 1);
  if (run.round && run.round.offStar != null) {
    if (run.round.offStar === i) run.round.offStar = null;
    else if (run.round.offStar > i) run.round.offStar -= 1;
  }
}
export function starVerschieben(run, i, d) {
  const j = i + d;
  if (j < 0 || j >= run.stars.length) return i;
  [run.stars[i], run.stars[j]] = [run.stars[j], run.stars[i]];
  if (run.round && run.round.offStar != null) {
    if (run.round.offStar === i) run.round.offStar = j;
    else if (run.round.offStar === j) run.round.offStar = i;
  }
  return j;
}
export function probeVerkaufen(run, i) {
  if (!run.proben[i]) return;
  run.proben.splice(i, 1);
  run.geld += 1;
}

// ------------------------------------------------------------------ Proben

export function probeBereit(run, id, uids) {
  const p = PROBE[id];
  if (!p) return { ok: false, grund: '' };
  if (!p.ziel) {
    if (id === 'opernstudio' && run.stars.length >= run.maxStars) return { ok: false, grund: 'Kein Logenplatz frei.' };
    return { ok: true };
  }
  if (run.phase !== 'abend') return { ok: false, grund: 'Nur während eines Abends: wähle dafür Werke in der Hand.' };
  const [min, max] = p.ziel;
  if (uids.length < min || uids.length > max) {
    const n = min === max ? `genau ${min}` : `${min} bis ${max}`;
    return { ok: false, grund: `Wähle ${n} ${max === 1 ? 'Werk' : 'Werke'} in der Hand.` };
  }
  return { ok: true };
}

/** Wendet eine Probe an. Gibt einen Text für die Meldung zurück oder null. */
export function probeAnwenden(run, idx, uidsGewaehlt = []) {
  const id = run.proben[idx];
  if (!id) return null;
  const bereit = probeBereit(run, id, uidsGewaehlt);
  if (!bereit.ok) return null;
  const r = run.round;
  const uids = r ? r.hand.filter((u) => uidsGewaehlt.includes(u)) : [];
  const cards = uids.map((u) => karte(run, u));
  let text = '';
  switch (id) {
    case 'neuinszenierung': for (const c of cards) c.enh = 'bonus'; text = 'Neu inszeniert.'; break;
    case 'starbesetzung': for (const c of cards) c.enh = 'mult'; text = 'Starbesetzung steht.'; break;
    case 'festspielfassung': for (const c of cards) c.enh = 'xmult'; text = 'Festspielfassung erstellt.'; break;
    case 'schallplatte': for (const c of cards) c.enh = 'gold'; text = 'Goldene Schallplatte gepresst.'; break;
    case 'uebersetzung': {
      const s = schule(cards[0]);
      for (const c of cards.slice(1)) {
        if (s === werkVon(c).s) delete c.s; else c.s = s;
      }
      text = 'Übersetzt.';
      break;
    }
    case 'streichung': {
      const weg = new Set(uids);
      run.repertoire = run.repertoire.filter((c) => !weg.has(c.uid));
      r.hand = r.hand.filter((u) => !weg.has(u));
      run.stats.gestrichen += uids.length;
      text = uids.length === 1 ? 'Gestrichen.' : `${uids.length} Werke gestrichen.`;
      break;
    }
    case 'wiederaufnahme': {
      const c = cards[0];
      const kopie = neueKarte(run, c.w, c.enh, c.s);
      run.repertoire.push(kopie);
      r.hand.push(kopie.uid);
      sortiereHand(run);
      text = `${werkVon(c).t} kommt ein zweites Mal ins Repertoire.`;
      break;
    }
    case 'spielplanaenderung': {
      const c = cards[0];
      const alt = werkVon(c);
      let pool = WERKE.filter((w) => w.c === alt.c && w.id !== alt.id);
      if (!pool.length) pool = WERKE.filter((w) => w.s === alt.s && w.id !== alt.id);
      const neu = pick(run, pool);
      c.w = neu.id;
      if (c.s === neu.s) delete c.s;
      sortiereHand(run);
      text = `Statt ${alt.t}: ${neu.t}.`;
      break;
    }
    case 'benefiz': {
      const g = Math.min(20, Math.max(0, run.geld));
      run.geld += g;
      text = `Die Benefizgala bringt ${g} Dukaten.`;
      break;
    }
    case 'opernstudio': {
      const sid = zufallsStar(run, [], 2);
      if (sid) { run.stars.push({ id: sid, v: 0 }); text = `Aus dem Opernstudio: ${STAR[sid].name}.`; }
      break;
    }
    case 'vorschau': {
      const pool = mischen(run, PROGRAMM_IDS.filter((a) => (a !== 'gesamtwerk' && a !== 'grosseZeit') || run.gespielt[a] > 0)).slice(0, 2);
      for (const a of pool) run.stufen[a] += 1;
      text = `${pool.map((a) => PROGRAMME[a].name).join(' und ')} steigen eine Stufe.`;
      break;
    }
    default: break;
  }
  run.proben.splice(idx, 1);
  return text || 'Erledigt.';
}

// ------------------------------------------------------------------ Hilfen für die Anzeige

export function repertoireStand(run) {
  const r = run.round;
  if (!r) return { stapel: run.repertoire.length, gesamt: run.repertoire.length };
  return { stapel: r.stapel.length, gesamt: run.repertoire.length };
}

export function lieblingsKomponist(run) {
  const e = Object.entries(run.stats.komponisten).sort((a, b) => b[1] - a[1]);
  return e[0] ? { id: e[0][0], n: e[0][1] } : null;
}

export { REZENSIONEN, ENH };
