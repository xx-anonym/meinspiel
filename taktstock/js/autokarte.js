// Automatischer Beat-Map-Entwurf für eigene Stücke, direkt im Browser.
// Einsatzkurve (spektraler Fluss) → globales Tempo (Autokorrelation)
// → Schlagfolge per dynamischer Programmierung (Ellis 2007).
// Für Klassik nur ein Startpunkt; besser wird es im Einmess-Modus.

const SR = 11025;
const N = 1024;
const HOP = 256;
const FPS = SR / HOP;

const pause = () => new Promise((r) => setTimeout(r, 0));

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

async function dekodieren(file) {
  const daten = await file.arrayBuffer();
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new AC(1, 22050, 22050);
  const buf = await new Promise((ok, nein) => {
    const p = ctx.decodeAudioData(daten, ok, nein);
    if (p && p.then) p.then(ok, nein);
  });
  // Mono, auf 11025 Hz halbieren (Paare mitteln)
  const n = Math.floor(buf.length / 2);
  const mono = new Float32Array(n);
  const kanaele = [];
  for (let c = 0; c < buf.numberOfChannels; c++) kanaele.push(buf.getChannelData(c));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const k of kanaele) s += k[2 * i] + k[2 * i + 1];
    mono[i] = s / (2 * kanaele.length);
  }
  return mono;
}

function baender() {
  // ~36 logarithmische Bänder zwischen 50 Hz und 5 kHz
  const grenzen = [];
  for (let i = 0; i <= 36; i++) grenzen.push(50 * Math.pow(100, i / 36));
  return grenzen.map((f) => Math.max(1, Math.round((f / SR) * N)));
}

export async function autoKarte(file, fortschritt = () => {}) {
  const x = await dekodieren(file);
  fortschritt(0.15);
  const frames = Math.floor((x.length - N) / HOP);
  if (frames < FPS * 8) throw new Error('Das Stück ist zu kurz (mindestens acht Sekunden).');
  const fenster = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const grenzen = baender();
  const nb = grenzen.length - 1;
  let vorher = new Float32Array(nb);
  const fluss = new Float32Array(frames);
  const rms = new Float32Array(frames);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    const o = f * HOP;
    let e = 0;
    for (let i = 0; i < N; i++) { const v = x[o + i]; re[i] = v * fenster[i]; im[i] = 0; e += v * v; }
    rms[f] = Math.sqrt(e / N);
    fft(re, im);
    const jetzt = new Float32Array(nb);
    let fl = 0;
    for (let b = 0; b < nb; b++) {
      let s = 0;
      for (let k = grenzen[b]; k < Math.max(grenzen[b] + 1, grenzen[b + 1]); k++) s += Math.hypot(re[k], im[k]);
      jetzt[b] = Math.log(1 + 40 * s);
      const d = jetzt[b] - vorher[b];
      if (d > 0) fl += d;
    }
    fluss[f] = fl;
    vorher = jetzt;
    if (f % 2000 === 0) { fortschritt(0.15 + 0.6 * (f / frames)); await pause(); }
  }
  // langsame Anteile abziehen, gleichrichten, normieren
  const env = new Float32Array(frames);
  const w = 8;
  let max = 1e-9;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, f - w); j <= Math.min(frames - 1, f + w); j++) { s += fluss[j]; c++; }
    env[f] = Math.max(0, fluss[f] - s / c);
    max = Math.max(max, env[f]);
  }
  for (let f = 0; f < frames; f++) env[f] /= max;
  fortschritt(0.8);
  await pause();

  // Tempo: Autokorrelation, gewichtet um 110 bpm
  const lagMin = Math.floor((60 / 200) * FPS), lagMax = Math.ceil((60 / 45) * FPS);
  const ac = new Float32Array(lagMax * 4 + 2);
  for (let lag = 1; lag < ac.length; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += env[f] * env[f - lag];
    ac[lag] = s / (frames - lag);
  }
  let besterLag = lagMin, bester = -1;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    const bpm = (60 * FPS) / lag;
    const gewicht = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2));
    const v = ac[lag] * gewicht;
    if (v > bester) { bester = v; besterLag = lag; }
  }
  // Feinere Periode per Parabel
  const y0 = ac[besterLag - 1], y1 = ac[besterLag], y2 = ac[besterLag + 1];
  const P = besterLag + (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2 || 1);
  const takt = ac[Math.round(3 * P)] > 1.15 * Math.max(ac[Math.round(2 * P)], ac[Math.round(4 * P)] || 0) ? 3 : 4;

  // Dynamische Programmierung
  const score = new Float32Array(frames);
  const vorg = new Int32Array(frames).fill(-1);
  const alpha = 100;
  for (let t = 0; t < frames; t++) {
    const lo = Math.max(0, Math.floor(t - 2 * P)), hi = Math.floor(t - P / 2);
    let best = -Infinity, arg = -1;
    for (let tau = lo; tau <= hi; tau++) {
      const v = score[tau] - alpha * Math.pow(Math.log((t - tau) / P), 2);
      if (v > best) { best = v; arg = tau; }
    }
    if (arg >= 0 && best > 0) { score[t] = env[t] + best; vorg[t] = arg; } else score[t] = env[t];
  }
  let ende = frames - 1, bestE = -Infinity;
  for (let t = Math.max(0, frames - Math.ceil(P) - 1); t < frames; t++) if (score[t] > bestE) { bestE = score[t]; ende = t; }
  const pfad = [];
  for (let t = ende; t >= 0; t = vorg[t]) pfad.push(t);
  pfad.reverse();
  const versatz = N / 2 / SR; // Fenstermitte
  const beats = pfad.map((f) => Math.round((f / FPS + versatz) * 1000) / 1000);
  fortschritt(0.95);

  // Lautheit pro Schlag
  const db = beats.map((b, i) => {
    const a = Math.floor((b - versatz) * FPS), e = Math.max(a + 1, Math.floor(((beats[i + 1] ?? b + 0.5) - versatz) * FPS));
    let s = 0, c = 0;
    for (let f = Math.max(0, a); f < Math.min(frames, e); f++) { s += rms[f]; c++; }
    return 20 * Math.log10((c ? s / c : 0) + 1e-6);
  });
  const sortiert = [...db].sort((a, b) => a - b);
  const lo = sortiert[Math.floor(sortiert.length * 0.05)], hi = sortiert[Math.floor(sortiert.length * 0.97)];
  const lautheit = db.map((v) => Math.round(Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))) * 1000) / 1000);
  const takte = [];
  for (let i = 0; i < beats.length; i += takt) takte.push(i);
  fortschritt(1);
  return { version: 1, titel: file.name, quelle: 'Automatischer Entwurf im Browser', takt, beats, takte, lautheit };
}
