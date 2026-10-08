// Da capo! – Speicherstand im Browser: der laufende Lauf, das Werkverzeichnis
// über alle Läufe und die Einstellungen.

import { REPERTOIRES, STERNSTUNDEN } from './data.js';

const LAUF = 'dacapo.lauf.v1';
const META = 'dacapo.meta.v1';
const EINST = 'dacapo.einstellungen.v1';

function lesen(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function schreiben(key, wert) {
  try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* ohne Speicher weiterspielen */ }
}

export function ladeLauf() { return lesen(LAUF); }
export function speichereLauf(run) { schreiben(LAUF, run); }
export function loescheLauf() { try { localStorage.removeItem(LAUF); } catch (e) { /* egal */ } }

const META_LEER = () => ({
  v: 1,
  laeufe: 0, siege: 0, besteStation: 0, besteVorstellung: 0, besteArt: null,
  werke: {}, sternstunden: {}, stars: {}, programme: {}, komponisten: {},
  frei: { leipzig: true }, strengeFrei: 1, siegeJeDeck: {}, taeglich: {},
  vorstellungen: 0, neu: [],
});

export function ladeMeta() {
  const m = lesen(META) || {};
  const leer = META_LEER();
  return { ...leer, ...m, frei: { ...leer.frei, ...(m.frei || {}) } };
}
export function speichereMeta(meta) { schreiben(META, meta); }

export function ladeEinst() {
  return { ton: true, musik: true, tempo: 1, wackeln: true, ...(lesen(EINST) || {}) };
}
export function speichereEinst(e) { schreiben(EINST, e); }

/** Prüft Freischaltungen und gibt die neu freigeschalteten Repertoires zurück. */
export function pruefeFreischaltungen(meta) {
  const neu = [];
  const stern = Object.keys(meta.sternstunden).filter((k) => STERNSTUNDEN.some((s) => s.id === k)).length;
  const werke = Object.keys(meta.werke).length;
  for (const r of REPERTOIRES) {
    if (meta.frei[r.id] || !r.frei) continue;
    const f = r.frei;
    const ok = (f.art === 'station' && meta.besteStation >= f.wert)
      || (f.art === 'sieg' && meta.siege >= f.wert)
      || (f.art === 'sternstunden' && stern >= f.wert)
      || (f.art === 'werke' && werke >= f.wert);
    if (ok) { meta.frei[r.id] = true; neu.push(r); }
  }
  return neu;
}
