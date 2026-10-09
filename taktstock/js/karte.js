// Beat-Map: Zeitpunkte aller Schläge, Taktanfänge und Lautheit einer Aufnahme.
// Alles, was das Spiel über die Musik weiß, kommt von hier.

export const DYN_STUFEN = [
  [0.0, 'pp'],
  [0.18, 'p'],
  [0.38, 'mf'],
  [0.6, 'f'],
  [0.8, 'ff'],
];

export function dynName(wert) {
  let name = 'pp';
  for (const [ab, n] of DYN_STUFEN) if (wert >= ab) name = n;
  return name;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export class Karte {
  constructor(json) {
    if (!json || !Array.isArray(json.beats) || json.beats.length < 8) {
      throw new Error('Beat-Map braucht mindestens acht Schläge.');
    }
    this.roh = json;
    this.titel = json.titel || '';
    this.takt = json.takt || 4;
    this.beats = json.beats.map(Number);
    const n = this.beats.length;
    this.takte = new Set(json.takte && json.takte.length ? json.takte : this.#taktRaster());
    this.lautheit = json.lautheit && json.lautheit.length === n ? json.lautheit.map(Number) : new Array(n).fill(0.5);
    this.start = Math.max(0, Math.min(n - 4, json.start ?? 0));
    this.ende = Math.max(this.start + 4, Math.min(n - 1, json.ende ?? n - 1));
    this.dauern = [];
    for (let i = 0; i < n - 1; i++) this.dauern.push(Math.max(0.05, this.beats[i + 1] - this.beats[i]));
    this.dauern.push(this.dauern[n - 2]);
    this.fermaten = new Set(json.fermaten ?? this.#fermatenFinden());
    this.periode = this.#glaetten();
    this.laut = this.#lautGlaetten();
    this.taktNr = this.#taktNummern();
    this.hinweise = [];
  }

  get anzahl() { return this.beats.length; }

  #taktRaster() {
    const out = [];
    for (let i = 0; i < this.beats.length; i += this.takt) out.push(i);
    return out;
  }

  #fermatenFinden() {
    const d = this.dauern;
    const out = [];
    for (let i = 1; i < d.length - 1; i++) {
      const nachbarn = [];
      for (let j = Math.max(0, i - 4); j <= Math.min(d.length - 1, i + 4); j++) if (j !== i) nachbarn.push(d[j]);
      if (d[i] > 1.8 * median(nachbarn) && d[i] > 0.9) out.push(i);
    }
    return out;
  }

  // Lokale Originalperiode: Median der Nachbarschläge, Fermaten ausgenommen.
  #glaetten() {
    const d = this.dauern;
    const out = [];
    for (let i = 0; i < d.length; i++) {
      if (this.fermaten.has(i)) { out.push(d[i]); continue; }
      const w = [];
      for (let j = Math.max(0, i - 2); j <= Math.min(d.length - 1, i + 2); j++) if (!this.fermaten.has(j)) w.push(d[j]);
      out.push(median(w));
    }
    return out;
  }

  #lautGlaetten() {
    const l = this.lautheit;
    return l.map((_, i) => {
      let s = 0, c = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(l.length - 1, i + 2); j++) { s += l[j]; c++; }
      return s / c;
    });
  }

  #taktNummern() {
    const nr = [];
    let takt = 0;
    for (let i = 0; i < this.beats.length; i++) {
      if (this.takte.has(i)) takt++;
      nr.push(Math.max(1, takt));
    }
    return nr;
  }

  // Bruchteil-Schlagindex zur Aufnahmezeit t
  pos(t) {
    const b = this.beats;
    if (t <= b[0]) return (t - b[0]) / this.dauern[0];
    if (t >= b[b.length - 1]) return b.length - 1 + (t - b[b.length - 1]) / this.dauern[b.length - 1];
    let lo = 0, hi = b.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (b[m] <= t) lo = m; else hi = m;
    }
    return lo + (t - b[lo]) / this.dauern[lo];
  }

  // Aufnahmezeit zum Bruchteil-Schlagindex
  zeit(phi) {
    const n = this.beats.length;
    if (phi <= 0) return this.beats[0] + phi * this.dauern[0];
    if (phi >= n - 1) return this.beats[n - 1] + (phi - (n - 1)) * this.dauern[n - 1];
    const i = Math.floor(phi);
    return this.beats[i] + (phi - i) * this.dauern[i];
  }

  idx(i) { return Math.max(0, Math.min(this.beats.length - 1, i)); }
  bpm(i) { return 60 / this.periode[this.idx(i)]; }
  istFermate(i) { return this.fermaten.has(this.idx(i)); }
  istTaktanfang(i) { return this.takte.has(i); }
  zielLaut(i) { return this.laut[this.idx(i)]; }

  // Hinweise für die Partitur: automatisch aus Tempo und Lautheit, dazu
  // handgeschriebene aus der Stückbeschreibung (Zeitangaben in Sekunden).
  hinweiseBauen(eigene = []) {
    const out = [];
    const n = this.beats.length;
    // Dynamik
    let letzte = null, kandidat = null, seit = 0;
    for (let i = this.start; i <= this.ende; i++) {
      const name = dynName(this.laut[i]);
      if (name !== kandidat) { kandidat = name; seit = i; }
      if (kandidat !== letzte && i - seit >= 3) {
        out.push({ schlag: seit, text: kandidat, art: 'dyn' });
        letzte = kandidat;
      }
    }
    // Crescendo / Diminuendo
    for (let i = this.start + 4; i < Math.min(n - 8, this.ende - 4); i += 2) {
      const vor = this.laut[i], nach = this.laut[i + 8];
      if (nach - vor > 0.32) { out.push({ schlag: i, text: 'cresc.', art: 'gabel', bis: i + 8, auf: true }); i += 8; }
      else if (vor - nach > 0.32) { out.push({ schlag: i, text: 'dim.', art: 'gabel', bis: i + 8, auf: false }); i += 8; }
    }
    // Tempo
    let sperre = this.start;
    for (let i = this.start + 4; i < Math.min(n - 8, this.ende); i++) {
      if (i < sperre) continue;
      const a = this.bpm(i - 2), b = this.bpm(i + 6);
      const v = b / a;
      if (v > 1.25) { out.push({ schlag: i + 1, text: 'più mosso!', art: 'tempo' }); sperre = i + 12; }
      else if (v < 0.8) { out.push({ schlag: i + 1, text: 'meno mosso', art: 'tempo' }); sperre = i + 12; }
      else if (v > 1.09) { out.push({ schlag: i, text: 'accel.', art: 'tempo' }); sperre = i + 12; }
      else if (v < 0.91) { out.push({ schlag: i, text: 'rit.', art: 'tempo' }); sperre = i + 12; }
    }
    for (const f of this.fermaten) if (f >= this.start && f <= this.ende) out.push({ schlag: f, text: 'Fermate – halten!', art: 'fermate' });
    for (const h of eigene) {
      const schlag = h.schlag ?? Math.round(this.pos(h.t ?? 0));
      out.push({ ...h, schlag, art: h.art || 'witz' });
    }
    // Automatische Hinweise dicht neben eigenen weglassen
    const eigeneSchlaege = out.filter((h) => h.art === 'witz' || h.art === 'satz').map((h) => h.schlag);
    this.hinweise = out
      .filter((h) => h.art !== 'tempo' && h.art !== 'gabel' || !eigeneSchlaege.some((s) => Math.abs(s - h.schlag) < 2))
      .sort((x, y) => x.schlag - y.schlag);
    return this.hinweise;
  }

  // Bereich der Tempokurve für die Partitur
  bpmBereich() {
    const w = [];
    for (let i = this.start; i <= this.ende; i++) if (!this.fermaten.has(i)) w.push(this.bpm(i));
    w.sort((a, b) => a - b);
    return [w[Math.floor(w.length * 0.02)] || 60, w[Math.floor(w.length * 0.98)] || 120];
  }

  alsJSON() {
    return {
      version: 1,
      titel: this.titel,
      quelle: this.roh.quelle || 'Taktstock',
      takt: this.takt,
      beats: this.beats.map((t) => Math.round(t * 1000) / 1000),
      takte: [...this.takte].sort((a, b) => a - b),
      lautheit: this.lautheit.map((x) => Math.round(x * 1000) / 1000),
      ...(this.roh.start != null ? { start: this.roh.start } : {}),
      ...(this.roh.ende != null ? { ende: this.roh.ende } : {}),
    };
  }
}

// Ersetzt die Schläge einer Karte im Bereich der eingetippten Schläge.
// Taktanfänge: von Hand markierte gewinnen, sonst wird das Raster des
// vorherigen Abschnitts weitergezählt.
export function kartenMischen(alt, getippt, markierteTakte, takt) {
  const tippen = [...getippt].sort((a, b) => a - b);
  if (tippen.length < 4) return alt;
  const rand = 0.45 * median(tippen.slice(1).map((t, i) => t - tippen[i]));
  const von = tippen[0] - rand, bis = tippen[tippen.length - 1] + rand;
  const altBeats = alt ? alt.beats : [];
  const altTakte = alt ? alt.takte : new Set();
  const vorher = [], nachher = [];
  altBeats.forEach((t, i) => { if (t < von) vorher.push(i); else if (t > bis) nachher.push(i); });
  const beats = [];
  const takte = [];
  for (const i of vorher) { if (altTakte.has(i)) takte.push(beats.length); beats.push(altBeats[i]); }
  // Taktzählung fortsetzen
  let seitTakt = 0;
  if (vorher.length) {
    const letzterTakt = Math.max(-1, ...vorher.filter((i) => altTakte.has(i)));
    seitTakt = letzterTakt >= 0 ? vorher[vorher.length - 1] - letzterTakt + 1 : 0;
  }
  const markiert = new Set(markierteTakte);
  tippen.forEach((t, k) => {
    if (markiert.has(k)) seitTakt = 0;
    if (seitTakt % takt === 0) takte.push(beats.length);
    beats.push(t);
    seitTakt++;
  });
  for (const i of nachher) { if (altTakte.has(i)) takte.push(beats.length); beats.push(altBeats[i]); }
  return { beats, takte, takt };
}
