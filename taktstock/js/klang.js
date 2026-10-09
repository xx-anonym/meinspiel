// Klang: die Aufnahme läuft durch Web Audio (Dynamik, Stimmungs-Effekte),
// alles andere im Saal ist synthetisiert – Klatschen, Husten, Gähnen,
// Programmheft-Rascheln, Bravo-Rufe, Kiekser im Blech.

const VOKALE = {
  a: [800, 1200, 2500],
  o: [450, 800, 2600],
  u: [330, 700, 2400],
  e: [500, 1700, 2500],
  ae: [650, 1700, 2500],
  schwa: [520, 1450, 2450],
  h: [600, 1400, 2500],
};

const zufall = (a, b) => a + Math.random() * (b - a);

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class Klang {
  constructor() {
    this.ctx = null;
    this.quelle = null;
    this.gemurmel = null;
  }

  get bereit() { return !!this.ctx && this.ctx.state === 'running'; }

  // Synchron aus einer Nutzergeste heraus: Kontext anlegen und anstoßen.
  weckenSofort() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.#aufbau();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  async start() {
    this.weckenSofort();
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch { /* bleibt stumm */ }
    }
  }

  // Direktwiedergabe ohne Web Audio (Notlösung für Geräte, auf denen das
  // Tempo über MediaElementSource nicht folgt). Keine Effekte, Blende über volume.
  direkt(audio) {
    this.direktEl = audio;
    this.direktPegel = 0;
    this.direktDyn = 1;
    this.#direktAnwenden();
  }

  // Lautstärke im Direktbetrieb: Blende × Dynamik, mit Luft nach oben
  #direktAnwenden() {
    const el = this.direktEl;
    if (!el) return;
    try { el.volume = Math.max(0, Math.min(1, 0.75 * this.direktPegel * this.direktDyn)); } catch { /* iOS ignoriert volume */ }
  }

  // Ausgabeverzögerung in Sekunden, so gut der Browser sie kennt
  latenz() {
    if (!this.ctx) return 0.03;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0.01);
  }

  jetzt() { return this.ctx ? this.ctx.currentTime : 0; }

  #aufbau() {
    const c = this.ctx;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 14;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.2;
    this.master = c.createGain();
    this.master.gain.value = 0.92;
    this.master.connect(this.limiter).connect(c.destination);

    // Orchesterkette: Leiern (moduliertes Delay) → Tiefpass → Dynamik → Aussetzer → Blende
    this.wobble = c.createDelay(0.06);
    this.wobble.delayTime.value = 0.012;
    this.wobbleLfo = c.createOscillator();
    this.wobbleLfo.frequency.value = 0.9;
    this.wobbleTiefe = c.createGain();
    this.wobbleTiefe.gain.value = 0;
    this.wobbleLfo.connect(this.wobbleTiefe).connect(this.wobble.delayTime);
    this.wobbleLfo.start();
    this.tiefpass = c.createBiquadFilter();
    this.tiefpass.type = 'lowpass';
    this.tiefpass.frequency.value = 18000;
    this.tiefpass.Q.value = 0.6;
    this.dyn = c.createGain();
    this.aussetzerGain = c.createGain();
    this.blendeGain = c.createGain();
    this.blendeGain.gain.value = 0;
    this.wobble.connect(this.tiefpass).connect(this.dyn).connect(this.aussetzerGain).connect(this.blendeGain).connect(this.master);

    // Saal: trocken plus Hall
    this.saal = c.createGain();
    this.saal.gain.value = 0.9;
    this.hall = c.createConvolver();
    this.hall.buffer = this.#hallImpuls(2.2);
    this.hallGain = c.createGain();
    this.hallGain.gain.value = 0.42;
    this.saal.connect(this.master);
    this.saal.connect(this.hall).connect(this.hallGain).connect(this.master);

    this.weiss = this.#rauschPuffer(3);
    this.applausPuffer = this.#applausRendern(6, 140);
    this.klatschVarianten = [0.01, 0.028, 0.06, 0.11].map((s) => this.#mengeKlatschRendern(s, 46));
  }

  // ---------- Orchester ----------

  verbinde(audio) {
    if (this.direktModus && !this.quelle) { this.direkt(audio); return; }
    if (this.quelle && this.quelle.el === audio) return;
    const q = this.ctx.createMediaElementSource(audio);
    q.connect(this.wobble);
    this.quelle = { el: audio, node: q };
  }

  dynamik(gainLinear) {
    if (this.direktEl && !this.quelle) {
      this.direktDyn += (gainLinear - this.direktDyn) * 0.15;
      this.#direktAnwenden();
      return;
    }
    if (!this.ctx) return;
    this.dyn.gain.setTargetAtTime(gainLinear, this.ctx.currentTime, 0.12);
  }

  blende(ziel, sekunden = 0.08) {
    if (this.direktEl && !this.quelle) {
      const von = this.direktPegel, t0 = performance.now(), dauer = Math.max(10, sekunden * 1000);
      clearInterval(this.blendTimer);
      this.blendTimer = setInterval(() => {
        const f = Math.min(1, (performance.now() - t0) / dauer);
        this.direktPegel = von + (ziel - von) * f;
        this.#direktAnwenden();
        if (f >= 1) clearInterval(this.blendTimer);
      }, 20);
      return;
    }
    if (!this.ctx) return;
    const g = this.blendeGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(ziel, t + Math.max(0.01, sekunden));
  }

  // Stimmungen 0..1 → hörbare Folgen
  stimmung({ streicher, holz, blech }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gesamt = 0.42 * streicher + 0.25 * holz + 0.33 * blech;
    const cutoff = gesamt >= 0.55 ? 18000 : 700 * Math.pow(18000 / 700, Math.max(0, gesamt) / 0.55);
    this.tiefpass.frequency.setTargetAtTime(cutoff, t, 0.4);
    const tiefe = streicher < 0.55 ? ((0.55 - streicher) / 0.55) * 0.0042 : 0;
    this.wobbleTiefe.gain.setTargetAtTime(tiefe, t, 0.6);
    this.wobbleLfo.frequency.setTargetAtTime(0.7 + (1 - streicher) * 0.9, t, 1);
  }

  aussetzer(dauer = 0.12) {
    if (this.direktEl && !this.quelle) {
      const pegel = this.direktPegel;
      this.direktPegel = pegel * 0.05;
      this.#direktAnwenden();
      setTimeout(() => { this.direktPegel = Math.max(this.direktPegel, pegel); this.#direktAnwenden(); }, dauer * 1000);
      return;
    }
    if (!this.ctx) return;
    const g = this.aussetzerGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0.03, t + 0.012);
    g.setValueAtTime(0.03, t + dauer);
    g.linearRampToValueAtTime(1, t + dauer + 0.03);
  }

  effekteZuruecksetzen() {
    if (this.direktEl && !this.quelle) { this.direktDyn = 1; this.#direktAnwenden(); }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tiefpass.frequency.setTargetAtTime(18000, t, 0.05);
    this.wobbleTiefe.gain.setTargetAtTime(0, t, 0.05);
    this.aussetzerGain.gain.cancelScheduledValues(t);
    this.aussetzerGain.gain.setValueAtTime(1, t);
    this.dyn.gain.setTargetAtTime(1, t, 0.05);
  }

  // ---------- Bausteine ----------

  #rauschPuffer(sek) {
    const c = this.ctx, n = Math.floor(sek * c.sampleRate);
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  #hallImpuls(sek) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sek * sr);
    const b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const huelle = Math.pow(1 - t / sek, 2.2) * Math.exp(-t * 2.4);
        const k = 0.25 + 0.7 * (t / sek); // hinten dumpfer
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * huelle * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
      }
    }
    return b;
  }

  // Ein Klatscher als kurzer, gefilterter Rauschstoß, direkt in Arrays geschrieben
  static #klatschSchreiben(L, R, sr, t0, amp, hell, pan, wrap) {
    const n = L.length;
    const len = Math.floor(sr * zufall(0.018, 0.034));
    const start = Math.floor(t0 * sr);
    const a = 0.25 + hell * 0.6; // Tiefpass-Koeffizient
    const b2 = 0.03 + 0.05 * (1 - hell);
    let lp = 0, lp2 = 0;
    const gl = amp * Math.cos((pan + 1) * Math.PI / 4), gr = amp * Math.sin((pan + 1) * Math.PI / 4);
    const tau = len * zufall(0.18, 0.3);
    for (let i = 0; i < len; i++) {
      let j = start + i;
      if (wrap) j = ((j % n) + n) % n; else if (j < 0 || j >= n) continue;
      const x = Math.random() * 2 - 1;
      lp += a * (x - lp);
      lp2 += b2 * (lp - lp2);
      const env = (i < 12 ? i / 12 : 1) * Math.exp(-i / tau);
      const s = (lp - lp2) * env;
      L[j] += s * gl;
      R[j] += s * gr;
    }
  }

  #applausRendern(sek, menschen) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sek * sr);
    const b = c.createBuffer(2, n, sr);
    const L = b.getChannelData(0), R = b.getChannelData(1);
    for (let p = 0; p < menschen; p++) {
      const rate = zufall(3.2, 5.6);
      const amp = zufall(0.15, 0.6) * (Math.random() < 0.1 ? 1.8 : 1);
      const hell = Math.random(), pan = zufall(-0.9, 0.9);
      let t = Math.random() / rate;
      while (t < sek) {
        Klang.#klatschSchreiben(L, R, sr, t, amp, hell, pan, true);
        t += (1 / rate) * (1 + 0.08 * gauss());
      }
    }
    let max = 0;
    for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
    for (let i = 0; i < n; i++) { L[i] /= max; R[i] /= max; }
    return b;
  }

  #mengeKlatschRendern(streuung, menschen) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(0.7 * sr);
    const b = c.createBuffer(2, n, sr);
    const L = b.getChannelData(0), R = b.getChannelData(1);
    for (let p = 0; p < menschen; p++) {
      const t = 0.2 + gauss() * streuung;
      Klang.#klatschSchreiben(L, R, sr, t, zufall(0.2, 0.6), Math.random(), zufall(-0.9, 0.9), false);
    }
    let max = 0;
    for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
    for (let i = 0; i < n; i++) { L[i] /= max; R[i] /= max; }
    return b;
  }

  #quelle(puffer, wann, { gain = 1, rate = 1, pan = 0, ziel = this.saal, offset = 0, dauer } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = puffer;
    s.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
    let kette = s.connect(g);
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      kette = kette.connect(p);
    }
    kette.connect(ziel);
    s.start(wann, offset, dauer);
    return { s, g };
  }

  #rausch(wann, dauer, ziel) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.weiss;
    s.connect(ziel);
    s.start(wann, Math.random() * 2, dauer + 0.05);
    return s;
  }

  // Formant-Stimme: f0-Verlauf, Vokalverlauf, Lautstärkeverlauf
  #stimme(t0, { f0, vokale, huelle, hauch = 0.12, pan = 0, gain = 0.5, ziel = this.saal }) {
    const c = this.ctx;
    const ende = t0 + huelle[huelle.length - 1][0] + 0.05;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0[0][1], t0);
    for (const [t, f] of f0) osc.frequency.linearRampToValueAtTime(f, t0 + t);
    const quelle = c.createGain();
    quelle.gain.value = 1;
    osc.connect(quelle);
    const hauchG = c.createGain();
    hauchG.gain.value = hauch;
    this.#rausch(t0, ende - t0, hauchG);
    hauchG.connect(quelle);
    const amp = c.createGain();
    amp.gain.setValueAtTime(0, t0);
    for (const [t, v] of huelle) amp.gain.linearRampToValueAtTime(v * gain, t0 + t);
    let out = amp;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      amp.connect(p);
      out = p;
    }
    out.connect(ziel);
    const breiten = [90, 110, 150];
    const pegel = [1, 0.55, 0.25];
    for (let k = 0; k < 3; k++) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      const [tv, v0] = vokale[0];
      bp.frequency.setValueAtTime(VOKALE[v0][k], t0 + tv);
      for (const [t, v] of vokale) bp.frequency.linearRampToValueAtTime(VOKALE[v][k], t0 + t);
      bp.Q.value = VOKALE[vokale[0][1]][k] / breiten[k];
      const g = c.createGain();
      g.gain.value = pegel[k] * 3;
      quelle.connect(bp).connect(g).connect(amp);
    }
    osc.start(t0);
    osc.stop(ende);
  }

  // ---------- Publikum ----------

  klatscher(wann = this.jetzt(), gain = 0.5) {
    const c = this.ctx, sr = c.sampleRate;
    const b = c.createBuffer(2, Math.floor(sr * 0.08), sr);
    Klang.#klatschSchreiben(b.getChannelData(0), b.getChannelData(1), sr, 0.002, 1, zufall(0.4, 0.8), zufall(-0.3, 0.3), false);
    this.#quelle(b, wann, { gain });
  }

  // Ein Schlag des mitklatschenden Saals. streuung 0..1 → wie uneinig
  saalKlatscht(wann, laut, streuung) {
    const v = this.klatschVarianten;
    const i = Math.min(v.length - 1, Math.floor(streuung * v.length));
    // Puffer hat seinen Schwerpunkt bei 0.2 s
    const start = wann - 0.2;
    const jetzt = this.jetzt();
    const offset = Math.max(0, jetzt - start);
    this.#quelle(v[i], Math.max(jetzt, start), { gain: 0.22 + 0.62 * laut, rate: zufall(0.96, 1.04), offset });
  }

  applaus(staerke = 1, dauer = 6) {
    const c = this.ctx, t = c.currentTime;
    const { s, g } = this.#quelle(this.applausPuffer, t, { gain: 0 });
    s.loop = true;
    const spitze = 0.25 + 0.75 * staerke;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(spitze, t + 0.9);
    g.gain.setValueAtTime(spitze, t + Math.max(1, dauer - 2.2));
    g.gain.linearRampToValueAtTime(0, t + dauer);
    s.stop(t + dauer + 0.1);
    return () => {
      const n = c.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setValueAtTime(g.gain.value, n);
      g.gain.linearRampToValueAtTime(0, n + 0.6);
      try { s.stop(n + 0.7); } catch { /* schon gestoppt */ }
    };
  }

  bravo(wann = this.jetzt(), stimmen = 3) {
    for (let i = 0; i < stimmen; i++) {
      const t0 = wann + zufall(0, 1.6) + i * 0.35;
      const f = Math.random() < 0.75 ? zufall(105, 150) : zufall(190, 240);
      const len = zufall(0.85, 1.25);
      this.#stimme(t0, {
        f0: [[0, f * 0.9], [0.1, f * 1.25], [0.28, f * 1.3], [0.4, f * 1.1], [0.75 * len, f * 0.8]],
        vokale: [[0, 'schwa'], [0.09, 'a'], [0.26, 'a'], [0.36, 'o'], [len, 'o']],
        huelle: [[0, 0], [0.025, 0.2], [0.045, 0.05], [0.07, 0.9], [0.25, 1], [0.29, 0.35], [0.36, 0.9], [0.55 * len, 0.75], [len, 0]],
        hauch: 0.1,
        pan: zufall(-0.7, 0.7),
        gain: zufall(0.18, 0.3),
      });
    }
  }

  husten(wann = this.jetzt()) {
    const c = this.ctx;
    const pan = zufall(-0.8, 0.8);
    const stoesse = Math.random() < 0.6 ? 2 : 3;
    for (let k = 0; k < stoesse; k++) {
      const t0 = wann + k * zufall(0.17, 0.26);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.75, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = zufall(450, 750);
      bp.Q.value = 1.1;
      const bp2 = c.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.value = zufall(1300, 1900);
      bp2.Q.value = 1.5;
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      if (p) p.pan.value = pan;
      const ziel = p ? (p.connect(this.saal), p) : this.saal;
      g.connect(ziel);
      bp.connect(g);
      bp2.connect(g);
      const n1 = this.#rausch(t0, 0.25, bp);
      n1.connect(bp2);
      this.#stimme(t0, {
        f0: [[0, zufall(120, 160)], [0.12, 100]],
        vokale: [[0, 'schwa'], [0.15, 'o']],
        huelle: [[0, 0], [0.01, 0.4], [0.12, 0]],
        hauch: 0.5, pan, gain: 0.2,
      });
    }
  }

  gaehnen(wann = this.jetzt()) {
    const f = Math.random() < 0.6 ? zufall(170, 230) : zufall(250, 320);
    this.#stimme(wann, {
      f0: [[0, f], [0.35, f * 1.25], [1.1, f * 0.85], [1.7, f * 0.6]],
      vokale: [[0, 'h'], [0.3, 'a'], [0.9, 'ae'], [1.4, 'o'], [1.7, 'u']],
      huelle: [[0, 0], [0.25, 0.35], [0.5, 0.8], [1.2, 0.65], [1.75, 0]],
      hauch: 0.55,
      pan: zufall(-0.8, 0.8),
      gain: 0.28,
    });
  }

  rascheln(wann = this.jetzt()) {
    const c = this.ctx, sr = c.sampleRate, dauer = zufall(0.8, 1.5);
    const b = c.createBuffer(2, Math.floor(sr * dauer), sr);
    const L = b.getChannelData(0), R = b.getChannelData(1);
    const pan = zufall(-0.8, 0.8);
    let t = 0;
    while (t < dauer - 0.02) {
      const len = Math.floor(sr * zufall(0.002, 0.012));
      const s0 = Math.floor(t * sr);
      const amp = zufall(0.1, 1) * (0.6 + 0.4 * Math.sin(Math.PI * t / dauer));
      let hp = 0, prev = 0;
      for (let i = 0; i < len && s0 + i < L.length; i++) {
        const x = Math.random() * 2 - 1;
        hp = 0.7 * (hp + x - prev); prev = x;
        const v = hp * amp * (1 - i / len);
        L[s0 + i] += v * (1 - pan) * 0.5;
        R[s0 + i] += v * (1 + pan) * 0.5;
      }
      t += zufall(0.004, 0.03);
    }
    this.#quelle(b, wann, { gain: 0.5 });
  }

  // Eine einzelne Person klatscht langsam. Gibt Stopp-Funktion zurück.
  einzelklatscher(anzahl = 7) {
    const t = this.jetzt() + 0.4;
    let abstand = 1.15;
    let z = t;
    for (let i = 0; i < anzahl; i++) {
      this.klatscher(z, 0.8);
      z += abstand;
      abstand *= 1.06;
    }
    return z - this.jetzt();
  }

  // Blech kiekst: Horn springt auf den falschen Ton
  kiekser(wann = this.jetzt(), pan = -0.4) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const f = zufall(300, 380);
    osc.frequency.setValueAtTime(f, wann);
    osc.frequency.setValueAtTime(f * 1.5, wann + 0.09);
    osc.frequency.linearRampToValueAtTime(f * 1.33, wann + 0.13);
    osc.frequency.linearRampToValueAtTime(f * 0.94, wann + 0.38);
    const growl = c.createOscillator();
    growl.frequency.value = 28;
    const growlG = c.createGain();
    growlG.gain.value = 0.35;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0, wann);
    amp.gain.linearRampToValueAtTime(0.2, wann + 0.03);
    amp.gain.setValueAtTime(0.2, wann + 0.2);
    amp.gain.linearRampToValueAtTime(0, wann + 0.42);
    growl.connect(growlG).connect(amp.gain);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.Q.value = 2.5;
    let out = amp;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; amp.connect(p); out = p; }
    out.connect(this.master);
    osc.connect(lp).connect(amp);
    osc.start(wann); growl.start(wann);
    osc.stop(wann + 0.45); growl.stop(wann + 0.45);
  }

  // Holz quietscht: Klarinette überbläst
  quietscher(wann = this.jetzt()) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    const f = zufall(2300, 3100);
    osc.frequency.setValueAtTime(f, wann);
    osc.frequency.linearRampToValueAtTime(f * 1.04, wann + 0.06);
    osc.frequency.linearRampToValueAtTime(f * 0.97, wann + 0.2);
    const amp = c.createGain();
    amp.gain.setValueAtTime(0, wann);
    amp.gain.linearRampToValueAtTime(0.12, wann + 0.015);
    amp.gain.setValueAtTime(0.12, wann + 0.16);
    amp.gain.linearRampToValueAtTime(0, wann + 0.24);
    osc.connect(amp).connect(this.master);
    osc.start(wann);
    osc.stop(wann + 0.26);
  }

  // Gemurmel vor Beginn
  murmeln(an) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    if (an) {
      if (this.gemurmel) return;
      const s = c.createBufferSource();
      s.buffer = this.weiss;
      s.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 650;
      bp.Q.value = 0.8;
      const bp2 = c.createBiquadFilter();
      bp2.type = 'lowpass';
      bp2.frequency.value = 1800;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.13, t + 1.2);
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.37;
      const lfoG = c.createGain();
      lfoG.gain.value = 0.04;
      lfo.connect(lfoG).connect(g.gain);
      s.connect(bp).connect(bp2).connect(g).connect(this.saal);
      s.start(t);
      lfo.start(t);
      this.gemurmel = { s, g, lfo };
    } else if (this.gemurmel) {
      const { s, g, lfo } = this.gemurmel;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.9);
      s.stop(t + 1);
      lfo.stop(t + 1);
      this.gemurmel = null;
    }
  }

  // Klick für das Probehören einer Beat-Map
  klick(wann, betont) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = betont ? 1760 : 1175;
    const g = c.createGain();
    g.gain.setValueAtTime(0, wann);
    g.gain.linearRampToValueAtTime(betont ? 0.22 : 0.14, wann + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, wann + 0.05);
    o.connect(g).connect(this.master);
    o.start(wann);
    o.stop(wann + 0.06);
  }
}
