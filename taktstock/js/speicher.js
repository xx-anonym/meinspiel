// Speicher: Bestwerte und Einstellungen in localStorage, eigene Stücke
// (Audiodatei plus Beat-Map) in IndexedDB. Nichts davon verlässt den Browser.

const BEST = 'taktstock.bestwerte.v1';
const EINST = 'taktstock.einstellungen.v1';
const KARTE = 'taktstock.karte.';

function lesen(schluessel, ersatz) {
  try {
    const s = localStorage.getItem(schluessel);
    return s ? JSON.parse(s) : ersatz;
  } catch {
    return ersatz;
  }
}

function schreiben(schluessel, wert) {
  try { localStorage.setItem(schluessel, JSON.stringify(wert)); return true; } catch { return false; }
}

export const bestwerte = () => lesen(BEST, {});

export function bestwertMelden(id, punkte, titel) {
  const alle = bestwerte();
  const alt = alle[id];
  const neu = !alt || punkte > alt.punkte;
  if (neu) {
    alle[id] = { punkte, titel, datum: new Date().toISOString().slice(0, 10) };
    schreiben(BEST, alle);
  }
  return { neu, alt: alt ? alt.punkte : null };
}

export function rekordMelden(id, prozent) {
  const alle = bestwerte();
  const s = alle['frei:' + id];
  if (!s || prozent > s.punkte) {
    alle['frei:' + id] = { punkte: prozent, datum: new Date().toISOString().slice(0, 10) };
    schreiben(BEST, alle);
    return true;
  }
  return false;
}

export const einstellungen = () => ({ modus: 'tippen', latenz: 0, name: 'Jonas', ...lesen(EINST, {}) });
export const einstellungenSpeichern = (e) => schreiben(EINST, e);

// Korrigierte Beat-Maps der mitgelieferten Stücke
export const karteLesen = (id) => lesen(KARTE + id, null);
export const karteSpeichern = (id, json) => schreiben(KARTE + id, json);
export function karteLoeschen(id) { try { localStorage.removeItem(KARTE + id); } catch { /* egal */ } }

// ---------- IndexedDB für eigene Stücke ----------

let dbVersprechen = null;
function db() {
  if (dbVersprechen) return dbVersprechen;
  dbVersprechen = new Promise((ok, nein) => {
    if (!window.indexedDB) { nein(new Error('IndexedDB fehlt')); return; }
    const r = indexedDB.open('taktstock', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('eigene', { keyPath: 'id' });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => nein(r.error);
  });
  return dbVersprechen;
}

async function tx(modus, fn) {
  const d = await db();
  return new Promise((ok, nein) => {
    const t = d.transaction('eigene', modus);
    const s = t.objectStore('eigene');
    const r = fn(s);
    t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
    t.onerror = () => nein(t.error);
  });
}

export async function eigeneListe() {
  try {
    const alle = await tx('readonly', (s) => s.getAll());
    return (alle || []).map(({ id, name, datum, karte }) => ({ id, name, datum, hatKarte: !!karte }));
  } catch {
    return [];
  }
}

export const eigenesLesen = (id) => tx('readonly', (s) => s.get(id));
export const eigenesSpeichern = (eintrag) => tx('readwrite', (s) => s.put(eintrag));
export const eigenesLoeschen = (id) => tx('readwrite', (s) => s.delete(id));
