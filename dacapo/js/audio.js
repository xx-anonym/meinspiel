// Da capo! – Klang. Alles synthetisiert, keine Dateien.
//
// Jedes gezählte Werk spielt den nächsten Ton von Papagenos Panflöte
// (d–e–fis–g–a, wie im „Vogelfänger“), Faktoren bekommen Pauke und Blech,
// am Ende klatscht das Haus – je größer der Abend, desto dichter.

let ac = null;
let master = null, sfx = null, mus = null, rauschen = null, hall = null;
let an = { ton: true, musik: true };
let musikTimer = null, musikSchritt = 0, musikNaechste = 0;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function einstellen(e) {
  an = { ...an, ...e };
  if (!ac) return;
  sfx.gain.setTargetAtTime(an.ton ? 0.9 : 0, ac.currentTime, 0.05);
  mus.gain.setTargetAtTime(an.musik ? 0.16 : 0, ac.currentTime, 0.3);
  if (an.musik) musikStart(); else musikStop();
}

export function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { ac = new AC(); } catch (e) { ac = null; return; }
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
  master = ac.createGain(); master.gain.value = 0.85;
  sfx = ac.createGain(); sfx.gain.value = an.ton ? 0.9 : 0;
  mus = ac.createGain(); mus.gain.value = an.musik ? 0.16 : 0;
  // Ein kleiner Saal: kurzer Faltungshall aus Rauschen
  hall = ac.createConvolver();
  const len = Math.floor(ac.sampleRate * 1.6);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  hall.buffer = ir;
  const hallG = ac.createGain(); hallG.gain.value = 0.22;
  sfx.connect(comp); mus.connect(comp);
  sfx.connect(hall); mus.connect(hall); hall.connect(hallG); hallG.connect(comp);
  comp.connect(master); master.connect(ac.destination);
  rauschen = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = rauschen.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (an.musik) musikStart();
}

function jetzt() { return ac ? ac.currentTime : 0; }

function osz(typ, freq, t, dauer, vol, ziel = sfx, { attack = 0.01, release = null, detune = 0, vib = 0 } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  if (vib) {
    const l = ac.createOscillator(); const lg = ac.createGain();
    l.frequency.value = 5.2; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dauer + 0.5);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (release ?? dauer));
  o.connect(g); g.connect(ziel);
  o.start(t); o.stop(t + (release ?? dauer) + 0.05);
  return { o, g };
}

function rausch(t, dauer, vol, { typ = 'bandpass', f = 1500, q = 1, ziel = sfx, attack = 0.002 } = {}) {
  const s = ac.createBufferSource();
  s.buffer = rauschen;
  s.loop = dauer > 0.4;
  const fl = ac.createBiquadFilter(); fl.type = typ; fl.frequency.value = f; fl.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  s.connect(fl); fl.connect(g); g.connect(ziel);
  s.start(t, Math.random() * 1.5); s.stop(t + dauer + 0.05);
}

// ------------------------------------------------------------------ Effekte

export function klick() {
  if (!ac) return;
  const t = jetzt();
  osz('triangle', 1400, t, 0.05, 0.08);
  rausch(t, 0.03, 0.05, { f: 3000, q: 2 });
}

export function waehlen(an_) {
  if (!ac) return;
  const t = jetzt();
  osz('sine', an_ ? 880 : 660, t, 0.08, 0.07);
  rausch(t, 0.04, 0.04, { f: 2500, q: 3 });
}

export function austeilen(n = 1) {
  if (!ac) return;
  const t = jetzt();
  for (let i = 0; i < n; i++) rausch(t + i * 0.045, 0.09, 0.07, { f: 1800 + Math.random() * 1200, q: 0.7, typ: 'highpass' });
}

// Papagenos Panflöte: d e fis g a, dann weiter in G-Dur hinauf.
const PANFLOETE = [74, 76, 78, 79, 81, 83, 84, 86, 88, 90, 91, 93];
export function karte(i) {
  if (!ac) return;
  const t = jetzt();
  const m = PANFLOETE[Math.min(i, PANFLOETE.length - 1)];
  const f = mtof(m);
  osz('sine', f, t, 0.32, 0.17, sfx, { attack: 0.025, vib: 3 });
  osz('sine', f * 2, t, 0.18, 0.025, sfx, { attack: 0.02 });
  rausch(t, 0.12, 0.05, { f: f * 1.5, q: 4, attack: 0.02 });
}

// Begeisterung: Pizzicato-Akkord
export function begeisterung(i = 0) {
  if (!ac) return;
  const t = jetzt();
  const basis = [55, 59, 62, 67][i % 4];
  for (const [k, iv] of [[0, 0], [1, 4], [2, 7]].map(([k, iv]) => [k, iv])) {
    osz('triangle', mtof(basis + 12 + iv), t + k * 0.012, 0.22, 0.09);
  }
}

// Faktor: Pauke und Blech
export function faktor() {
  if (!ac) return;
  const t = jetzt();
  const p = ac.createOscillator(); const pg = ac.createGain();
  p.type = 'sine';
  p.frequency.setValueAtTime(120, t);
  p.frequency.exponentialRampToValueAtTime(58, t + 0.35);
  pg.gain.setValueAtTime(0.45, t);
  pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  p.connect(pg); pg.connect(sfx); p.start(t); p.stop(t + 0.75);
  rausch(t, 0.25, 0.15, { f: 180, q: 1, typ: 'lowpass' });
  blech([55, 62, 67, 71], t + 0.02, 0.5, 0.05);
}

function blech(noten, t, dauer, vol) {
  for (const n of noten) {
    const o = ac.createOscillator(); const o2 = ac.createOscillator();
    const fl = ac.createBiquadFilter(); const g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth';
    o.frequency.value = mtof(n); o2.frequency.value = mtof(n); o2.detune.value = 8;
    fl.type = 'lowpass'; fl.Q.value = 2;
    fl.frequency.setValueAtTime(400, t);
    fl.frequency.linearRampToValueAtTime(2400, t + 0.08);
    fl.frequency.exponentialRampToValueAtTime(700, t + dauer);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(sfx);
    o.start(t); o2.start(t); o.stop(t + dauer + 0.05); o2.stop(t + dauer + 0.05);
  }
}

export function geld() {
  if (!ac) return;
  const t = jetzt();
  osz('square', 1568, t, 0.07, 0.04);
  osz('square', 2093, t + 0.07, 0.14, 0.04);
}

export function nichts() {
  if (!ac) return;
  const t = jetzt();
  osz('sawtooth', 110, t, 0.25, 0.06);
  rausch(t, 0.15, 0.05, { f: 300, q: 1 });
}

// Sternstunde: Fanfare
export function sternstunde() {
  if (!ac) return;
  const t = jetzt();
  const folge = [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [84, 0.6]];
  for (const [n, dt] of folge) blech([n, n - 12], t + dt, dt === 0.6 ? 1.2 : 0.3, 0.06);
  osz('sine', 1046, t + 0.6, 1.4, 0.05, sfx, { attack: 0.2 });
}

// Applaus aus einzelnen Klatschern. staerke 0..1
export function applaus(staerke = 0.5, dauer = null) {
  if (!ac) return;
  const t0 = jetzt();
  const d = dauer ?? 1.2 + staerke * 2.4;
  const dichte = 25 + staerke * 110;
  const n = Math.floor(dichte * d);
  for (let i = 0; i < n; i++) {
    const rel = Math.random();
    const t = t0 + rel * d;
    const huelle = Math.min(1, rel * 6) * Math.pow(1 - rel, 0.7);
    rausch(t, 0.02 + Math.random() * 0.03, (0.05 + Math.random() * 0.07) * huelle * (0.5 + staerke * 0.6),
      { f: 900 + Math.random() * 1800, q: 1.4 + Math.random() });
  }
  rausch(t0, d, 0.035 * staerke, { f: 1200, q: 0.4, attack: 0.3 });
}

// Buhrufe: tiefe Vokalformanten mit Vibrato
export function buh() {
  if (!ac) return;
  const t = jetzt();
  for (let s = 0; s < 6; s++) {
    const st = t + Math.random() * 0.5;
    const f0 = 95 + Math.random() * 60;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 1.15, st);
    o.frequency.linearRampToValueAtTime(f0, st + 0.9);
    const l = ac.createOscillator(); const lg = ac.createGain();
    l.frequency.value = 5 + Math.random() * 2; lg.gain.value = 4;
    l.connect(lg); lg.connect(o.frequency);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 330; f1.Q.value = 6;
    const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 750; f2.Q.value = 8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.35, st + 0.12);
    g.gain.setValueAtTime(0.35, st + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 1.3);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(sfx);
    o.start(st); l.start(st); o.stop(st + 1.4); l.stop(st + 1.4);
  }
}

export function vorhang() {
  if (!ac) return;
  const t = jetzt();
  rausch(t, 1.1, 0.09, { f: 500, q: 0.5, typ: 'lowpass', attack: 0.3 });
}

export function gong() {
  if (!ac) return;
  const t = jetzt();
  for (const [f, v] of [[196, 0.18], [392, 0.06], [587, 0.04], [262, 0.05]]) {
    osz('sine', f, t, 2.6, v, sfx, { attack: 0.005 });
  }
}

// Niederlage: Moll-Kadenz
export function niederlage() {
  if (!ac) return;
  const t = jetzt();
  const akk = [[57, 60, 64], [53, 57, 60], [52, 56, 59], [45, 52, 57, 60]];
  akk.forEach((a, i) => a.forEach((n) => osz('triangle', mtof(n), t + i * 0.55, i === 3 ? 2.4 : 0.6, 0.06, sfx, { attack: 0.06 })));
}

// Sieg: Triumph mit Pauken
export function triumph() {
  if (!ac) return;
  const t = jetzt();
  const folge = [[60, 0], [64, 0.18], [67, 0.36], [72, 0.54], [67, 0.9], [72, 1.08], [76, 1.26], [79, 1.6]];
  for (const [n, dt] of folge) blech([n, n - 12, n - 5], t + dt, dt >= 1.6 ? 2 : 0.4, 0.045);
  for (let i = 0; i < 6; i++) setTimeout(() => faktor(), 1600 + i * 120);
  setTimeout(() => applaus(1, 5), 1700);
}

// ------------------------------------------------------------------ Musik
// Eine Spieluhr im Dreivierteltakt: G – e – C – D7, mit kleinen Varianten.

const AKKORDE = [
  [43, [67, 71, 74]], [40, [64, 67, 71]], [36, [64, 67, 72]], [38, [66, 69, 72]],
  [43, [67, 71, 74]], [45, [64, 69, 72]], [38, [66, 69, 74]], [43, [62, 67, 71]],
];
const MELODIE = [
  [79, 81, 83], [79, 76, 79], [76, 74, 72], [74, null, 72],
  [71, 74, 79], [81, 79, 76], [78, 81, 78], [79, null, null],
];
const SCHLAG = 60 / 92;

function musikStart() {
  if (!ac || musikTimer) return;
  musikNaechste = ac.currentTime + 0.2;
  musikTimer = setInterval(musikTick, 120);
}
function musikStop() {
  if (musikTimer) clearInterval(musikTimer);
  musikTimer = null;
}
function musikTick() {
  if (!ac) return;
  while (musikNaechste < ac.currentTime + 0.5) {
    const takt = Math.floor(musikSchritt / 3) % AKKORDE.length;
    const zl = musikSchritt % 3;
    const [bass, akk] = AKKORDE[takt];
    const t = musikNaechste;
    if (zl === 0) osz('triangle', mtof(bass), t, SCHLAG * 2.6, 0.22, mus, { attack: 0.01 });
    else for (const n of akk) osz('sine', mtof(n - 12), t, SCHLAG * 0.8, 0.05, mus, { attack: 0.01 });
    const runde = Math.floor(musikSchritt / (3 * AKKORDE.length));
    const mel = MELODIE[takt][zl];
    if (mel && runde % 2 === 1) {
      osz('sine', mtof(mel), t, SCHLAG * 1.6, 0.11, mus, { attack: 0.005 });
      osz('sine', mtof(mel) * 3, t, SCHLAG * 0.5, 0.012, mus, { attack: 0.005 });
    } else if (zl === 1) {
      osz('sine', mtof(akk[(takt + runde) % 3] + 12), t, SCHLAG * 1.2, 0.06, mus, { attack: 0.005 });
    }
    musikSchritt++;
    musikNaechste += SCHLAG;
  }
}
