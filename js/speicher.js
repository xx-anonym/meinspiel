// Besetzung – Speicherstand im Browser: laufende Spielzeit, Archiv, Einstellungen.

import { HAEUSER } from './daten.js';

const LAUF = 'besetzung.lauf.v1';
const META = 'besetzung.archiv.v1';
const EINST = 'besetzung.einstellungen.v1';

function lesen(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function schreiben(key, wert) {
  try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* ohne Speicher weiterspielen */ }
}

export const ladeLauf = () => lesen(LAUF);
export const speichereLauf = (run) => schreiben(LAUF, run);
export function loescheLauf() { try { localStorage.removeItem(LAUF); } catch (e) { /* egal */ } }

const LEER = () => ({
  v: 1, laeufe: 0, siege: {}, besterRuf: {}, legenden: [], rollenbuch: {}, opern: {},
  taeglich: {}, frei: { leipzig: true }, abende: 0, ovationen: 0, kiekser: 0,
});
export function ladeArchiv() {
  const m = lesen(META) || {};
  const l = LEER();
  return { ...l, ...m, frei: { ...l.frei, ...(m.frei || {}) } };
}
export const speichereArchiv = (m) => schreiben(META, m);

export function ladeEinst() { return { ton: true, musik: false, tempo: 1, ...(lesen(EINST) || {}) }; }
export const speichereEinst = (e) => schreiben(EINST, e);

/** Schaltet nach einem Sieg das nächste Haus frei. Gibt das neue Haus zurück. */
export function freischalten(archiv, gewonnenIn) {
  const neu = HAEUSER.find((h) => h.frei === gewonnenIn && !archiv.frei[h.id]);
  if (neu) archiv.frei[neu.id] = true;
  return neu || null;
}
