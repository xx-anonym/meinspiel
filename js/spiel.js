// Besetzung – Spiellogik. Rein, ohne DOM. Der Lauf ist ein JSON-Objekt mit
// eigenem Zufallsgenerator: speicherbar, fortsetzbar, als Tagesspielplan für
// alle gleich.

import {
  FAECHER, FACH_IDS, WEIBLICH, passung, KLASSE_WERT, KLASSE_GAGE, GEWICHT, BELASTUNG,
  EIGENSCHAFTEN, ANF_TRAITS, OPERN, OPER, HAUS, VORNAMEN_W, VORNAMEN_M, NACHNAMEN, STILE,
} from './daten.js';

export const VERSION = 1;
export const MAX_ENSEMBLE = 14;
export const RUF_MAX = 10;

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
function gewichtetWaehlen(run, eintraege) {
  const summe = eintraege.reduce((s, e) => s + e.w, 0);
  let x = rnd(run) * summe;
  for (const e of eintraege) { x -= e.w; if (x <= 0) return e.v; }
  return eintraege[eintraege.length - 1].v;
}
export function seedAus(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const klammer = (x, a, b) => Math.max(a, Math.min(b, x));

// ------------------------------------------------------------------ Sängerinnen und Sänger

// Welche Eigenschaften zu welchem Fach passen (für die Zufallserzeugung).
const FACH_TRAITS = {
  Sb: { anf: ['spiel', 'hoehe', 'kol'], stil: ['mozart', 'operette', 'deutsch', 'belcanto'] },
  Kol: { anf: ['kol', 'hoehe'], stil: ['mozart', 'belcanto', 'strauss'] },
  Lyr: { anf: ['hoehe', 'kol', 'spiel'], stil: ['mozart', 'verdi', 'verismo', 'franz', 'slaw', 'operette'] },
  JD: { anf: ['hoehe', 'ausdauer', 'spiel'], stil: ['verdi', 'verismo', 'wagner', 'strauss', 'deutsch', 'slaw'] },
  Dr: { anf: ['ausdauer', 'hoehe'], stil: ['wagner', 'strauss', 'verdi', 'belcanto'] },
  Mez: { anf: ['spiel', 'tiefe', 'kol', 'hoehe'], stil: ['mozart', 'verdi', 'franz', 'wagner', 'belcanto', 'strauss'] },
  Spt: { anf: ['spiel', 'hoehe'], stil: ['mozart', 'wagner', 'strauss', 'modern', 'operette'] },
  LyT: { anf: ['hoehe', 'kol', 'spiel'], stil: ['mozart', 'verdi', 'verismo', 'belcanto', 'franz', 'slaw', 'operette'] },
  JHT: { anf: ['hoehe', 'ausdauer', 'spiel'], stil: ['verdi', 'verismo', 'wagner', 'deutsch', 'modern'] },
  HT: { anf: ['ausdauer', 'hoehe'], stil: ['wagner', 'strauss', 'verdi'] },
  LyB: { anf: ['spiel', 'hoehe'], stil: ['mozart', 'verdi', 'belcanto', 'franz', 'slaw', 'operette'] },
  HB: { anf: ['spiel', 'ausdauer'], stil: ['verdi', 'wagner', 'strauss', 'modern'] },
  Ba: { anf: ['tiefe', 'ausdauer', 'spiel'], stil: ['mozart', 'verdi', 'wagner', 'slaw'] },
  BB: { anf: ['spiel', 'tiefe'], stil: ['mozart', 'belcanto', 'strauss', 'deutsch'] },
};

function gage(s) {
  let g = KLASSE_GAGE[s.klasse];
  if (s.traits.includes('diva')) g += 3;
  if (s.traits.includes('liebling')) g += 2;
  if (s.traits.includes('kraenklich')) g -= 1;
  return Math.max(2, g);
}

function name(run, weiblich) {
  const vergeben = new Set(run.ensemble.map((s) => s.name));
  for (let i = 0; i < 30; i++) {
    const n = `${pick(run, weiblich ? VORNAMEN_W : VORNAMEN_M)} ${pick(run, NACHNAMEN)}`;
    if (!vergeben.has(n)) return n;
  }
  return `${pick(run, weiblich ? VORNAMEN_W : VORNAMEN_M)} ${pick(run, NACHNAMEN)}`;
}

export function neuerSaenger(run, fach, klasse, { traits = null, extra = true } = {}) {
  const s = {
    id: run.nextId++, name: name(run, WEIBLICH.has(fach)), fach, klasse,
    frische: 100, xp: 0, traits: [], rollen: {}, auftritte: 0, gage: 0,
  };
  if (traits) s.traits = [...traits];
  else {
    const ft = FACH_TRAITS[fach];
    s.traits.push(pick(run, ft.anf));
    if (rnd(run) < 0.6) s.traits.push(pick(run, ft.stil));
    if (extra) {
      const r = rnd(run);
      if (r < 0.06) s.traits.push('liebling');
      else if (r < 0.11) s.traits.push('nerven');
      else if (r < 0.16) s.traits.push('robust');
      else if (r < 0.2 && klasse >= 3) s.traits.push('diva');
      else if (r < 0.26) s.traits.push('lampenfieber');
      else if (r < 0.31) s.traits.push('kraenklich');
    }
    s.traits = [...new Set(s.traits)];
  }
  s.gage = gage(s);
  return s;
}

const START_ENSEMBLE = {
  default: [['Sb', 3], ['Lyr', 3], ['JD', 3], ['Mez', 3], ['LyT', 3], ['JHT', 2], ['LyB', 3], ['HB', 2], ['Ba', 3]],
  bayreuth: [['JD', 3], ['Dr', 3], ['Mez', 3], ['JHT', 3], ['HT', 3], ['HB', 3], ['HB', 2], ['Ba', 3], ['Spt', 2]],
};

// ------------------------------------------------------------------ Neue Spielzeit

export function neueSaison({ haus = 'leipzig', seed = (Math.random() * 2 ** 32) >>> 0, taeglich = null, legenden = [] } = {}) {
  const H = HAUS[haus];
  const run = {
    v: VERSION, seed, rng: seed >>> 0, haus, taeglich,
    woche: 1, phase: 'wochenplan',
    ruf: H.start, etat: 110,
    ensemble: [], nextId: 1,
    angebote: [], plan: [], abend: 0, besetzung: {},
    indisponiert: null, angesagt: null, tv: false,
    ergebnis: null, wochenende: null, ende: null,
    gespielt: {}, letzteBesetzung: {}, wocheEinnahmen: 0,
    fest: [], legenden: legenden.slice(0, 20),
    stats: { abende: [], kiekser: 0, einspringer: 0, debuets: 0, aufstiege: 0 },
  };
  for (const [fach, klasse] of START_ENSEMBLE[haus] || START_ENSEMBLE.default) run.ensemble.push(neuerSaenger(run, fach, klasse, { extra: false }));
  const pool = H.fest.pool;
  run.fest = H.fest.alle ? [...pool] : mischen(run, [...pool]).slice(0, 3).sort((a, b) => OPER[a].jahr - OPER[b].jahr);
  angeboteErzeugen(run);
  return run;
}

export const istFestwoche = (run) => run.woche > HAUS[run.haus].wochen;
export const saenger = (run, id) => run.ensemble.find((s) => s.id === id) || null;
export const rollenSchluessel = (oper, rolle) => `${oper.id}:${rolle.name}`;

// ------------------------------------------------------------------ Spielplan der Woche

function angeboteErzeugen(run) {
  const H = HAUS[run.haus];
  run.abend = 0;
  run.besetzung = {};
  run.wocheEinnahmen = 0;
  if (istFestwoche(run)) {
    run.angebote = [];
    run.plan = run.fest.map((id) => ({ oper: id, premiere: !run.gespielt[id] }));
    run.phase = 'festplan';
    return;
  }
  const letzte = new Set(run.plan.map((p) => p.oper));
  let pool = OPERN.filter((o) => (!H.nurStil || o.stil === H.nurStil) && !letzte.has(o.id));
  // Früh in der Spielzeit eher leichtere Kost, später darf es Wagner sein.
  const schwere = (o) => o.rollen.reduce((s, r) => s + r.belastung * (r.gewicht === 'H' ? 1 : 0.4), 0);
  const eintraege = pool.map((o) => {
    let w = o.pop * (H.gewichte?.[o.stil] || 1);
    if (run.haus === 'leipzig' && o.leipzig) w *= 1.5;
    const s = schwere(o);
    if (run.woche <= 2 && s > 9) w *= 0.35;
    else if (run.woche <= 4 && s > 10) w *= 0.6;
    return { v: o.id, w };
  });
  const gewaehlt = [];
  while (gewaehlt.length < 3 && eintraege.length) {
    const id = gewichtetWaehlen(run, eintraege);
    gewaehlt.push(id);
    eintraege.splice(eintraege.findIndex((e) => e.v === id), 1);
  }
  run.angebote = gewaehlt.map((id) => ({ oper: id, premiere: !run.gespielt[id] }));
  run.plan = [];
  run.phase = 'wochenplan';
}

/** Zwei der drei Angebote in dieser Reihenfolge spielen. */
export function planFestlegen(run, indizes) {
  if (run.phase === 'festplan') {
    run.phase = 'besetzung';
    vorbesetzen(run);
    return null;
  }
  if (run.phase !== 'wochenplan') return 'Nicht jetzt.';
  if (indizes.length !== 2 || indizes[0] === indizes[1]) return 'Wähle zwei Opern.';
  run.plan = indizes.map((i) => ({ ...run.angebote[i] }));
  run.phase = 'besetzung';
  vorbesetzen(run);
  return null;
}

export const aktuelleOper = (run) => (run.plan[run.abend] ? OPER[run.plan[run.abend].oper] : null);
export const aktuellePremiere = (run) => !!run.plan[run.abend]?.premiere;

export function anspruch(run) {
  return 40 + 4 * run.woche + HAUS[run.haus].anspruch;
}
export function ziel(run, oper = aktuelleOper(run), premiere = aktuellePremiere(run)) {
  const summe = oper.rollen.reduce((s, r) => s + GEWICHT[r.gewicht], 0);
  let z = summe * anspruch(run);
  if (premiere) z *= 1.05;
  return Math.round(z);
}

// ------------------------------------------------------------------ Besetzung und Vorhersage

/**
 * Was bringt diese Sängerin in dieser Rolle? Alles, was die Anzeige braucht.
 */
export function rollenWert(run, s, rolle, oper = aktuelleOper(run), premiere = aktuellePremiere(run)) {
  const details = [];
  let verbot = null;
  if (s.traits.includes('diva') && rolle.gewicht !== 'H') verbot = 'singt als Diva nur Hauptpartien';
  const grund = KLASSE_WERT[s.klasse];
  const p = passung(s.fach, rolle.fach);
  if (p < 1) details.push({ text: p === 0.75 ? `Nachbarfach ×0,75` : `fachfremd ×0,35`, gut: false });
  const fr = 0.55 + 0.45 * (s.frische / 100);
  if (s.frische < 100) details.push({ text: `Stimme ${s.frische} % ×${String(Math.round(fr * 100) / 100).replace('.', ',')}`, gut: s.frische >= 80 });
  let bonus = 0;
  for (const a of rolle.anf) {
    if (s.traits.includes(a)) { bonus += 0.2; details.push({ text: `${EIGENSCHAFTEN[a].name} +20 %`, gut: true }); }
    else if (a === 'kol' || a === 'tiefe') { bonus -= 0.1; details.push({ text: `ohne ${a === 'kol' ? 'Koloratur' : 'Tiefe'} −10 %`, gut: false }); }
  }
  if (s.traits.includes(oper.stil)) { bonus += 0.2; details.push({ text: `${EIGENSCHAFTEN[oper.stil].name} +20 %`, gut: true }); }
  const rk = Math.min(3, s.rollen[rollenSchluessel(oper, rolle)] || 0);
  if (rk) { bonus += 0.1 * rk; details.push({ text: `Rolle ${rk}× gesungen +${rk * 10} %`, gut: true }); }
  if (s.traits.includes('diva') && rolle.gewicht === 'H') { bonus += 0.2; details.push({ text: 'Diva +20 %', gut: true }); }
  if (s.traits.includes('liebling')) { bonus += 0.1; details.push({ text: 'Publikumsliebling +10 %', gut: true }); }
  if (s.traits.includes('lampenfieber') && premiere) { bonus -= 0.2; details.push({ text: 'Lampenfieber −20 %', gut: false }); }
  const wert = grund * p * fr * (1 + bonus) * GEWICHT[rolle.gewicht];

  let kiekser = 0.02;
  if (p === 0.75) kiekser += 0.06;
  else if (p < 0.75) kiekser += 0.25;
  if (!s.traits.includes('nerven')) kiekser += Math.max(0, 60 - s.frische) * 0.005;
  if (rolle.anf.includes('hoehe') && !s.traits.includes('hoehe')) kiekser += 0.06;
  kiekser = Math.min(0.6, kiekser);
  return { wert, erwartet: wert * (1 - kiekser * 0.55), kiekser, verbrauch: verbrauch(s, rolle), details, verbot };
}

/** Erfahrung bis zum nächsten Stern. */
export const aufstiegsSchwelle = (s) => 2 + 1.2 * s.klasse;

export function verbrauch(s, rolle) {
  let v = BELASTUNG[rolle.belastung];
  if (rolle.anf.includes('ausdauer') && !s.traits.includes('ausdauer')) v *= 1.5;
  if (s.traits.includes('ausdauer')) v *= 0.6;
  if (s.traits.includes('robust')) v *= 0.8;
  return Math.round(v);
}

/** Wo singt diese Person heute schon? (Rollenindex oder -1) */
export function besetztAls(run, id) {
  for (const [idx, sid] of Object.entries(run.besetzung)) if (sid === id) return Number(idx);
  return -1;
}

export function besetzen(run, rollenIdx, saengerId) {
  if (run.phase !== 'besetzung') return 'Nicht jetzt.';
  const oper = aktuelleOper(run);
  const rolle = oper.rollen[rollenIdx];
  if (!rolle) return 'Diese Rolle gibt es nicht.';
  if (saengerId == null) { delete run.besetzung[rollenIdx]; return null; }
  const s = saenger(run, saengerId);
  if (!s) return 'Unbekannt.';
  const w = rollenWert(run, s, rolle, oper);
  if (w.verbot) return `${s.name} ${w.verbot}.`;
  const alt = besetztAls(run, saengerId);
  if (alt >= 0 && alt !== rollenIdx) delete run.besetzung[alt];
  run.besetzung[rollenIdx] = saengerId;
  return null;
}

function vorbesetzen(run) {
  const oper = aktuelleOper(run);
  run.besetzung = {};
  const alt = run.letzteBesetzung[oper.id] || {};
  for (const [idx, sid] of Object.entries(alt)) {
    const s = saenger(run, sid);
    if (s && besetztAls(run, sid) < 0 && !rollenWert(run, s, oper.rollen[idx], oper).verbot) run.besetzung[idx] = sid;
  }
}

/** Füllt leere Rollen mit dem jeweils besten freien Ensemblemitglied (nur heute gedacht). */
export function vorschlag(run) {
  if (run.phase !== 'besetzung') return;
  const oper = aktuelleOper(run);
  const offen = oper.rollen.map((r, i) => i).filter((i) => run.besetzung[i] == null)
    .sort((a, b) => GEWICHT[oper.rollen[b].gewicht] - GEWICHT[oper.rollen[a].gewicht] || oper.rollen[b].belastung - oper.rollen[a].belastung);
  for (const i of offen) {
    let best = null;
    for (const s of run.ensemble) {
      if (besetztAls(run, s.id) >= 0) continue;
      const w = rollenWert(run, s, oper.rollen[i], oper);
      if (w.verbot) continue;
      if (!best || w.erwartet > best.w) best = { id: s.id, w: w.erwartet };
    }
    if (best) run.besetzung[i] = best.id;
  }
}

export function vorhersage(run) {
  const oper = aktuelleOper(run);
  let erwartet = 0;
  let offen = 0;
  for (let i = 0; i < oper.rollen.length; i++) {
    const s = saenger(run, run.besetzung[i]);
    if (!s) { offen++; continue; }
    erwartet += rollenWert(run, s, oper.rollen[i], oper).erwartet;
  }
  return { erwartet: Math.round(erwartet), offen, ziel: ziel(run) };
}

// ------------------------------------------------------------------ Vorstellung

const STUFEN = [
  { id: 'buh', ab: 0, name: 'Buhrufe', ruf: -2 },
  { id: 'lau', ab: 0.7, name: 'Lauer Applaus', ruf: -1 },
  { id: 'bravo', ab: 0.95, name: 'Bravo!', ruf: 0 },
  { id: 'bravi', ab: 1.2, name: 'Bravi!', ruf: 1 },
  { id: 'ovation', ab: 1.45, name: 'Standing Ovations', ruf: 1 },
];
export { STUFEN };
export const stufeFuer = (ratio) => [...STUFEN].reverse().find((s) => ratio >= s.ab);

export function gastKosten(run) { return 18 + 4 * run.woche; }

/** Vorhang auf: prüft, ob jemand absagt. Gibt 'einspringer' oder das Ergebnis zurück. */
export function vorhangAuf(run) {
  if (run.phase !== 'besetzung') return null;
  const oper = aktuelleOper(run);
  if (vorhersage(run).offen > 0) return null;
  run.angesagt = null;
  for (let i = 0; i < oper.rollen.length; i++) {
    const s = saenger(run, run.besetzung[i]);
    if (s.traits.includes('robust')) continue;
    let p = 0.025 + (s.traits.includes('kraenklich') ? 0.09 : 0) + (s.frische < 30 ? 0.08 : 0);
    if (rnd(run) < p) {
      run.indisponiert = { rolle: i, saenger: s.id };
      run.phase = 'einspringer';
      return 'einspringer';
    }
  }
  return auffuehren(run);
}

/** Antwort auf eine Absage: 'ensemble' (mit ersatzId), 'gast' oder 'trotzdem'. */
export function einspringen(run, wahl, ersatzId = null) {
  if (run.phase !== 'einspringer') return null;
  const { rolle: idx, saenger: krankId } = run.indisponiert;
  const oper = aktuelleOper(run);
  const rolle = oper.rollen[idx];
  if (wahl === 'ensemble') {
    const e = saenger(run, ersatzId);
    if (!e || e.id === krankId || besetztAls(run, e.id) >= 0 || rollenWert(run, e, rolle, oper).verbot) return null;
    run.besetzung[idx] = e.id;
    run.stats.einspringer += 1;
  } else if (wahl === 'gast') {
    const kosten = gastKosten(run);
    if (run.etat < kosten) return null;
    run.etat -= kosten;
    const g = neuerSaenger(run, rolle.fach, 4, { traits: [...rolle.anf, oper.stil].filter((t) => EIGENSCHAFTEN[t]).slice(0, 2) });
    g.gast = 'abend';
    g.name = `${g.name} (Gast)`;
    run.ensemble.push(g);
    run.besetzung[idx] = g.id;
  } else {
    run.angesagt = idx;
  }
  run.phase = 'besetzung';
  run.indisponiert = null;
  return auffuehren(run, krankId);
}

function auffuehren(run, krankId = null) {
  const oper = aktuelleOper(run);
  const premiere = aktuellePremiere(run);
  const z = ziel(run);
  const rollen = [];
  let summe = 0;
  const besetzte = new Set();
  for (let i = 0; i < oper.rollen.length; i++) {
    const rolle = oper.rollen[i];
    const s = saenger(run, run.besetzung[i]);
    besetzte.add(s.id);
    const w = rollenWert(run, s, rolle, oper, premiere);
    const angesagt = run.angesagt === i;
    const tagesform = 0.92 + rnd(run) * 0.16;
    const kiekserRisiko = Math.min(0.8, w.kiekser + (angesagt ? 0.15 : 0));
    const kiekser = rnd(run) < kiekserRisiko;
    const punkte = w.wert * tagesform * (kiekser ? 0.45 : 1) * (angesagt ? 0.7 : 1);
    summe += punkte;
    const schluessel = rollenSchluessel(oper, rolle);
    const debuet = !s.rollen[schluessel];
    rollen.push({
      idx: i, rolle: rolle.name, saenger: s.name, saengerId: s.id, fach: s.fach, punkte: Math.round(punkte),
      erwartet: Math.round(w.erwartet), tagesform, kiekser, angesagt, debuet: debuet && !s.gast,
    });
    if (kiekser) run.stats.kiekser += 1;
  }
  const total = Math.round(summe);
  const ratio = total / z;
  const stufe = stufeFuer(ratio);
  let rufDelta = stufe.ruf;
  if (premiere && ratio >= 1.2) rufDelta += 1;
  if (run.tv) { rufDelta *= 2; run.tv = false; }
  const lieblinge = rollen.filter((r) => saenger(run, r.saengerId).traits.includes('liebling')).length;
  const einnahmen = Math.round(30 * oper.pop * klammer(ratio, 0.5, 1.6) * (premiere ? 1.25 : 1) + lieblinge * 2);

  // Stimmen, Erfahrung, Rollenbuch
  const aufstiege = [];
  for (let i = 0; i < oper.rollen.length; i++) {
    const rolle = oper.rollen[i];
    const s = saenger(run, run.besetzung[i]);
    s.frische = klammer(s.frische - verbrauch(s, rolle), 0, 100);
    s.auftritte += 1;
    const key = rollenSchluessel(oper, rolle);
    if (!s.rollen[key] && !s.gast) run.stats.debuets += 1;
    s.rollen[key] = (s.rollen[key] || 0) + 1;
    s.xp += GEWICHT[rolle.gewicht] * (s.traits.includes('talent') ? 2 : 1);
    const schwelle = aufstiegsSchwelle(s);
    if (s.klasse < 5 && s.xp >= schwelle && !s.gast) {
      s.xp -= schwelle;
      s.klasse += 1;
      s.gage = gage(s);
      aufstiege.push({ name: s.name, klasse: s.klasse });
      run.stats.aufstiege += 1;
    }
  }
  for (const s of run.ensemble) if (!besetzte.has(s.id)) s.frische = klammer(s.frische + 12, 0, 100);
  if (krankId != null) { const k = saenger(run, krankId); if (k) k.frische = klammer(k.frische + 10, 0, 100); }

  run.ruf = klammer(run.ruf + rufDelta, 0, RUF_MAX);
  run.etat += einnahmen;
  run.wocheEinnahmen += einnahmen;
  run.gespielt[oper.id] = (run.gespielt[oper.id] || 0) + 1;
  run.letzteBesetzung[oper.id] = Object.fromEntries(Object.entries(run.besetzung).filter(([, id]) => !saenger(run, id)?.gast));
  run.ensemble = run.ensemble.filter((s) => s.gast !== 'abend');

  run.ergebnis = {
    oper: oper.id, premiere, ziel: z, total, ratio, stufe: stufe.id, rufDelta, einnahmen, rollen, aufstiege,
    woche: run.woche, abend: run.abend, fest: istFestwoche(run),
  };
  const top = rollen.reduce((m, r) => (r.punkte > m.punkte ? r : m), rollen[0]);
  run.stats.abende.push({ oper: oper.id, woche: run.woche, ratio, stufe: stufe.id, total, ziel: z, premiere, fest: istFestwoche(run), star: `${top.saenger.replace(' (Gast)', '')} als ${top.rolle}` });
  run.angesagt = null;
  run.phase = 'vorstellung';
  return run.ergebnis;
}

/** Nach dem Applaus: nächster Abend, Wochenende oder Ende. */
export function weiter(run) {
  if (run.phase !== 'vorstellung') return;
  if (run.ruf <= 0) { saisonEnde(run, false); return; }
  run.abend += 1;
  if (run.abend < run.plan.length) { run.phase = 'besetzung'; vorbesetzen(run); return; }
  if (istFestwoche(run)) { saisonEnde(run, true); return; }
  wochenendeBeginnen(run);
}

// ------------------------------------------------------------------ Wochenende

export function subvention(run) { return 26 + (run.ruf >= 8 ? 6 : 0); }

function wochenendeBeginnen(run) {
  const gagen = run.ensemble.reduce((s, x) => s + x.gage, 0);
  const sub = subvention(run);
  run.etat += sub - gagen;
  const meldungen = [];
  if (run.etat < 0) {
    run.ruf = klammer(run.ruf - 1, 0, RUF_MAX);
    meldungen.push('Die Gagen kamen zu spät – die Presse hat es gemerkt. Ruf −1.');
  }
  for (const s of run.ensemble) s.frische = klammer(s.frische + 40, 0, 100);
  run.wochenende = {
    bilanz: { einnahmen: run.wocheEinnahmen, subvention: sub, gagen },
    meldungen,
    ereignis: ereignisWaehlen(run),
    vorsingen: vorsingenErzeugen(run),
    angebot: angebotErzeugen(run),
  };
  run.phase = 'wochenende';
  if (run.ruf <= 0) saisonEnde(run, false);
}

export function naechsteWoche(run) {
  if (run.phase !== 'wochenende') return;
  run.woche += 1;
  // Gäste mit Wochenvertrag reisen ab
  run.ensemble = run.ensemble.filter((s) => !(s.gast && s.gast !== 'abend' && s.gast < run.woche));
  run.wochenende = null;
  angeboteErzeugen(run);
}

function fehlendeFaecher(run) {
  const da = new Set(run.ensemble.map((s) => s.fach));
  const bedarf = {};
  for (const id of run.fest) for (const r of OPER[id].rollen) bedarf[r.fach] = (bedarf[r.fach] || 0) + GEWICHT[r.gewicht];
  return FACH_IDS.filter((f) => !da.has(f)).sort((a, b) => (bedarf[b] || 0) - (bedarf[a] || 0));
}

function vorsingenErzeugen(run) {
  const kandidaten = [];
  const fehlend = fehlendeFaecher(run);
  for (let i = 0; i < 3; i++) {
    const fach = i === 0 && fehlend.length ? fehlend[rint(run, Math.min(3, fehlend.length))] : pick(run, FACH_IDS);
    let k = 2 + Math.floor(run.woche / 2.5) + (rnd(run) < 0.35 ? 1 : 0) - (rnd(run) < 0.3 ? 1 : 0) + (run.ruf >= 8 && rnd(run) < 0.3 ? 1 : 0);
    k = klammer(k, 1, 5);
    const s = neuerSaenger(run, fach, k);
    s.handgeld = 2 * s.gage;
    kandidaten.push(s);
  }
  // Ehemalige Kammersänger kommen manchmal als Gast vorbei
  if (run.legenden.length && rnd(run) < 0.2) {
    const l = pick(run, run.legenden);
    if (!run.ensemble.some((s) => s.legende === l.name)) {
      const s = neuerSaenger(run, l.fach, 5, { traits: l.traits });
      s.name = l.name;
      s.legende = l.name;
      s.gast = run.woche + 1;
      s.gage = 0;
      s.handgeld = 40;
      kandidaten[2] = s;
    }
  }
  return kandidaten.map((s) => ({ ...s, vergeben: false }));
}

export function engagieren(run, idx) {
  const w = run.wochenende;
  const k = w?.vorsingen[idx];
  if (!k || k.vergeben) return 'Schon vergeben.';
  if (run.ensemble.length >= MAX_ENSEMBLE) return `Mehr als ${MAX_ENSEMBLE} Ensemblemitglieder kann das Haus nicht bezahlen.`;
  if (run.etat < k.handgeld) return 'Zu wenig Etat für das Handgeld.';
  run.etat -= k.handgeld;
  const s = { ...k };
  delete s.vergeben;
  delete s.handgeld;
  run.ensemble.push(s);
  k.vergeben = true;
  return null;
}

export function entlassen(run, id) {
  const s = saenger(run, id);
  if (!s || s.gast) return 'Gäste gehen von selbst.';
  if (!['wochenplan', 'wochenende', 'besetzung', 'festplan'].includes(run.phase)) return 'Nicht jetzt.';
  if (run.ensemble.filter((x) => !x.gast).length <= 6) return 'Unter sechs Ensemblemitglieder geht es nicht.';
  run.etat -= s.gage;
  run.ensemble = run.ensemble.filter((x) => x.id !== id);
  const idx = besetztAls(run, id);
  if (idx >= 0) delete run.besetzung[idx];
  return null;
}

// Angebote fürs Wochenende: man wählt die Person selbst.
function angebotErzeugen(run) {
  const r = rnd(run);
  if (r < 0.4) return { art: 'meisterkurs', trait: pick(run, ANF_TRAITS), preis: 30, erledigt: false };
  if (r < 0.7) return { art: 'kur', preis: 12, erledigt: false };
  return { art: 'unterricht', preis: 20, erledigt: false };
}
export const ANGEBOTE = {
  meisterkurs: (a) => ({ titel: `Meisterkurs: ${EIGENSCHAFTEN[a.trait].name}`, text: `Eine Person deiner Wahl lernt „${EIGENSCHAFTEN[a.trait].name}“.` }),
  kur: () => ({ titel: 'Stimmkur', text: 'Eine Person deiner Wahl ist danach wieder bei 100 % Stimme.' }),
  unterricht: () => ({ titel: 'Gesangsunterricht', text: 'Eine Person deiner Wahl sammelt Erfahrung für den nächsten Stern.' }),
};

export function angebotNutzen(run, id) {
  const a = run.wochenende?.angebot;
  const s = saenger(run, id);
  if (!a || a.erledigt || !s || s.gast) return 'Nicht möglich.';
  if (run.etat < a.preis) return 'Zu wenig Etat.';
  if (a.art === 'meisterkurs') {
    if (s.traits.includes(a.trait)) return `${s.name} kann das schon.`;
    s.traits.push(a.trait);
  } else if (a.art === 'kur') {
    s.frische = 100;
  } else {
    s.xp += 3;
    const schwelle = aufstiegsSchwelle(s);
    if (s.klasse < 5 && s.xp >= schwelle) { s.xp -= schwelle; s.klasse += 1; s.gage = gage(s); }
  }
  run.etat -= a.preis;
  a.erledigt = true;
  return null;
}

// ------------------------------------------------------------------ Ereignisse

const EREIGNISSE = {
  abwerbung: {
    titel: 'Ein Angebot aus Wien',
    geht: (run) => run.ensemble.some((s) => !s.gast && s.klasse >= 3),
    vorbereiten: (run) => {
      const s = [...run.ensemble].filter((x) => !x.gast && x.klasse >= 3).sort((a, b) => b.klasse - a.klasse || b.auftritte - a.auftritte)[0];
      return { id: s.id };
    },
    text: (run, p) => `Die Wiener Staatsoper will ${saenger(run, p.id)?.name} abwerben. Halten kostet eine höhere Gage.`,
    optionen: [
      { text: 'Gage um 50 % erhöhen', tu: (run, p) => { const s = saenger(run, p.id); if (s) s.gage = Math.round(s.gage * 1.5); return `${s?.name} bleibt.`; } },
      { text: 'Ziehen lassen', tu: (run, p) => { const s = saenger(run, p.id); run.ensemble = run.ensemble.filter((x) => x.id !== p.id); return `${s?.name} geht nach Wien.`; } },
    ],
  },
  tv: {
    titel: 'Der MDR will übertragen',
    text: () => 'Der erste Abend der nächsten Woche läuft live im Fernsehen. Gutes Geld – aber Erfolg und Blamage zählen doppelt.',
    optionen: [
      { text: 'Zusagen (+15 Etat)', tu: (run) => { run.etat += 15; run.tv = true; return 'Die Kameras kommen.'; } },
      { text: 'Absagen', tu: () => 'Kein Fernsehen.' },
    ],
  },
  sponsor: {
    titel: 'Ein Autohaus will den Vorhang bedrucken',
    text: () => 'Viel Geld, aber das Feuilleton wird sich lustig machen.',
    optionen: [
      { text: 'Annehmen (+40 Etat, Ruf −1)', tu: (run) => { run.etat += 40; run.ruf = klammer(run.ruf - 1, 0, RUF_MAX); return 'Der Vorhang glänzt jetzt in Metallic.'; } },
      { text: 'Ablehnen', tu: () => 'Der Vorhang bleibt rot.' },
    ],
  },
  grippe: {
    titel: 'Grippewelle',
    text: () => 'Im Chor husten schon die Ersten.',
    optionen: [
      { text: 'Vorsorge: Ingwer und Inhalieren (−20 Etat)', tu: (run) => { run.etat -= 20; return 'Alle bleiben gesund.'; } },
      { text: 'Riskieren', tu: (run) => { const opfer = mischen(run, run.ensemble.filter((s) => !s.gast)).slice(0, 2); for (const s of opfer) s.frische = klammer(s.frische - 35, 0, 100); return `Erwischt: ${opfer.map((s) => s.name).join(' und ')} (Stimme −35).`; } },
    ],
  },
  stadtrat: {
    titel: 'Der Kulturausschuss kommt',
    text: () => 'Die Abgeordneten wollen das Haus sehen. Ein Empfang würde Eindruck machen.',
    optionen: [
      { text: 'Empfang geben (−20 Etat, Ruf +1)', tu: (run) => { run.etat -= 20; run.ruf = klammer(run.ruf + 1, 0, RUF_MAX); return 'Sekt, Häppchen, Wohlwollen.'; } },
      { text: 'Keine Zeit', tu: () => 'Die Abgeordneten sehen sich die Kantine an.' },
    ],
  },
  verriss: {
    titel: 'Ein Verriss',
    text: () => 'Ein Feuilletonist hat dein Haus verrissen. Antworten oder schweigen?',
    optionen: [
      { text: 'Interview geben (50:50)', tu: (run) => { const gut = rnd(run) < 0.5; run.ruf = klammer(run.ruf + (gut ? 1 : -1), 0, RUF_MAX); return gut ? 'Souverän. Ruf +1.' : 'Das ging nach hinten los. Ruf −1.'; } },
      { text: 'Schweigen', tu: () => 'Der Sturm zieht vorbei.' },
    ],
  },
  studio: {
    titel: 'Ein Talent im Opernstudio',
    geht: (run) => run.ensemble.length < MAX_ENSEMBLE,
    vorbereiten: (run) => ({ fach: pick(run, FACH_IDS) }),
    text: (run, p) => `Junge Stimme, ${FAECHER[p.fach].name}, noch roh – aber sie lernt doppelt so schnell.`,
    optionen: [
      { text: 'Ins Ensemble holen (−10 Etat)', tu: (run, p) => { run.etat -= 10; const s = neuerSaenger(run, p.fach, 1, { traits: ['talent'] }); run.ensemble.push(s); return `${s.name} ist jetzt im Ensemble.`; } },
      { text: 'Noch nicht', tu: () => 'Vielleicht nächstes Jahr.' },
    ],
  },
  opernball: {
    titel: 'Opernball',
    text: () => 'Das Ensemble soll beim Ball singen. Gut für die Kasse, schlecht für die Stimmen.',
    optionen: [
      { text: 'Hingehen (+30 Etat)', tu: (run) => { run.etat += 30; const opfer = mischen(run, run.ensemble.filter((s) => !s.gast)).slice(0, 3); for (const s of opfer) s.frische = klammer(s.frische - 25, 0, 100); return `Bis drei Uhr früh: ${opfer.map((s) => s.name).join(', ')} (Stimme −25).`; } },
      { text: 'Absagen', tu: () => 'Früh ins Bett.' },
    ],
  },
  zoff: {
    titel: 'Zoff hinter der Bühne',
    geht: (run) => run.ensemble.filter((s) => !s.gast).length >= 2,
    vorbereiten: (run) => { const [a, b] = mischen(run, run.ensemble.filter((s) => !s.gast)); return { a: a.id, b: b.id }; },
    text: (run, p) => `${saenger(run, p.a)?.name} und ${saenger(run, p.b)?.name} reden nicht mehr miteinander.`,
    optionen: [
      { text: 'Schlichten (−12 Etat)', tu: (run) => { run.etat -= 12; return 'Händedruck in der Kantine.'; } },
      { text: 'Laufen lassen', tu: (run, p) => { for (const id of [p.a, p.b]) { const s = saenger(run, id); if (s) s.frische = klammer(s.frische - 30, 0, 100); } return 'Schlaflose Nächte auf beiden Seiten (Stimme −30).'; } },
    ],
  },
  maezen: {
    titel: 'Ein Leipziger Mäzen',
    geht: (run) => run.haus === 'leipzig',
    text: () => 'Ein Freund des Hauses hat geerbt und möchte etwas zurückgeben.',
    optionen: [{ text: 'Dankend annehmen (+25 Etat)', tu: (run) => { run.etat += 25; return 'Ein Platz im Foyer trägt jetzt seinen Namen.'; } }],
  },
  wagnerverband: {
    titel: 'Der Wagner-Verband fragt an',
    geht: (run) => run.fest.some((id) => OPER[id].stil === 'wagner'),
    text: () => 'Für die Festtage würde der Verband eine Probenwoche bezahlen – wenn du dafür eine Vorstellung für Mitglieder gibst.',
    optionen: [
      { text: 'Einverstanden (+20 Etat, alle Stimmen −10)', tu: (run) => { run.etat += 20; for (const s of run.ensemble) s.frische = klammer(s.frische - 10, 0, 100); return 'Die Mitglieder sind selig.'; } },
      { text: 'Lieber nicht', tu: () => 'Die Festtage bleiben ohne Verbandsgeld.' },
    ],
  },
};
export { EREIGNISSE };

function ereignisWaehlen(run) {
  const moegliche = Object.entries(EREIGNISSE).filter(([, e]) => !e.geht || e.geht(run));
  const [id, e] = pick(run, moegliche);
  return { id, p: e.vorbereiten ? e.vorbereiten(run) : {}, erledigt: false, antwort: null };
}

export function ereignisAntworten(run, optIdx) {
  const ev = run.wochenende?.ereignis;
  if (!ev || ev.erledigt) return null;
  const def = EREIGNISSE[ev.id];
  const opt = def.optionen[optIdx];
  if (!opt) return null;
  ev.antwort = opt.tu(run, ev.p);
  ev.erledigt = true;
  if (run.ruf <= 0) saisonEnde(run, false);
  return ev.antwort;
}

// ------------------------------------------------------------------ Saisonende

function saisonEnde(run, sieg) {
  const a = run.stats.abende;
  const bestes = a.length ? a.reduce((m, x) => (x.ratio > m.ratio ? x : m), a[0]) : null;
  const schlechtestes = a.length ? a.reduce((m, x) => (x.ratio < m.ratio ? x : m), a[0]) : null;
  run.ende = { sieg, ruf: run.ruf, woche: run.woche, bestes, schlechtestes, kammersaenger: null };
  run.phase = 'ende';
}

export function kammersaengerKandidaten(run) {
  return run.ensemble.filter((s) => !s.gast && s.auftritte >= 3).sort((a, b) => b.klasse - a.klasse || b.auftritte - a.auftritte);
}

export function bewertung(ruf, sieg) {
  if (!sieg) return 'Entlassen';
  if (ruf >= 10) return 'Legendär';
  if (ruf >= 7) return 'Glanzvoll';
  if (ruf >= 4) return 'Solide';
  return 'Gerade so';
}

export { STILE };
