// ANNO – Musik und Klänge.
// Die Musik sind Aufnahmen (Bach, Goldberg-Variationen, Kimiko Ishizaka, CC0) aus musik/.
// Alle Klänge werden im Browser erzeugt (Web Audio), es gibt dafür keine Dateien.
// Die Musik hängt nie von der Passage ab, sie verrät also nichts.
'use strict';

const Klang = (() => {
  const SCHLUESSEL = 'anno.klang';
  const POSITION = 'anno.musik';
  const PEGEL_MUSIK = 0.5;
  const PEGEL_EFFEKTE = 0.5;
  const STUECKE = [
    { datei: 'musik/goldberg-aria.mp3', titel: 'Aria' },
    { datei: 'musik/goldberg-var13.mp3', titel: 'Variatio 13' },
    { datei: 'musik/goldberg-var21.mp3', titel: 'Variatio 21' },
    { datei: 'musik/goldberg-var25.mp3', titel: 'Variatio 25' },
  ];
  // Töne ohne Terz (G und D), damit sie zu den Stücken in G-Dur und g-Moll passen
  const TON = { G2: 98, D3: 146.83, G3: 196, D4: 293.66, A4: 440, G4: 392, D5: 587.33, G5: 783.99, D6: 1174.66, A3: 220 };

  const einst = { musik: true, effekte: true };
  try { Object.assign(einst, JSON.parse(localStorage.getItem(SCHLUESSEL)) || {}); } catch { /* Standard */ }
  const speichern = () => {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(einst)); } catch { /* egal */ }
  };

  let ctx = null;
  let effekte = null;   // Bus für Klänge
  let hall = null;      // Raumanteil der gezupften Töne
  let musikBus = null;
  let rauschPuffer = null;
  const saiten = new Map();
  let letzterTick = 0;
  const beiTitel = [];

  // ------------------------------------------------------------ Grundlagen

  function aufbauen() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { return false; }
    const master = ctx.createDynamicsCompressor();
    master.threshold.value = -14;
    master.ratio.value = 3;
    master.connect(ctx.destination);
    effekte = ctx.createGain();
    effekte.gain.value = einst.effekte ? PEGEL_EFFEKTE : 0;
    effekte.connect(master);
    musikBus = ctx.createGain();
    musikBus.gain.value = 0;
    musikBus.connect(master);
    const faltung = ctx.createConvolver();
    faltung.buffer = raum(1.6);
    hall = ctx.createGain();
    hall.gain.value = 0.22;
    hall.connect(faltung).connect(effekte);
    rauschPuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = rauschPuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // Impulsantwort eines kleinen, holzigen Raums
  function raum(dauer) {
    const n = Math.floor(ctx.sampleRate * dauer);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) {
        const t = i / ctx.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.32) * (t < 0.008 ? t / 0.008 : 1);
      }
    }
    return b;
  }

  const bereit = () => ctx && ctx.state === 'running' && einst.effekte;

  // Freischalten beim ersten Tippen oder Klicken (Vorgabe der Browser)
  function entsperren() {
    const neu = !ctx;
    if (!aufbauen()) return;
    if (neu) {
      // Zupfklänge vorab erzeugen, damit das erste Ergebnis nicht stockt
      const vorbereiten = () => Object.values(TON).forEach(saite);
      if (window.requestIdleCallback) requestIdleCallback(vorbereiten, { timeout: 2000 });
      else setTimeout(vorbereiten, 300);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (einst.musik && !document.hidden) musikStarten();
  }
  for (const art of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(art, entsperren, { capture: true, passive: true });
  }

  function rauschen(ziel, start, dauer, versatz = Math.random()) {
    const q = ctx.createBufferSource();
    q.buffer = rauschPuffer;
    q.connect(ziel);
    q.start(start, versatz * 1.5, dauer + 0.05);
    return q;
  }

  function filter(typ, frequenz, guete = 0.7) {
    const f = ctx.createBiquadFilter();
    f.type = typ;
    f.frequency.value = frequenz;
    f.Q.value = guete;
    return f;
  }

  function huellkurve(start, spitze, an, ab) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(spitze, start + an);
    g.gain.exponentialRampToValueAtTime(0.0001, start + an + ab);
    return g;
  }

  // ------------------------------------------------------------ Gezupfte Töne

  // Additiv erzeugter Zupfklang (zwischen Laute und Cembalo); wird je Tonhöhe zwischengespeichert
  function saite(freq) {
    if (saiten.has(freq)) return saiten.get(freq);
    const sr = ctx.sampleRate;
    const dauer = 2.2;
    const n = Math.floor(sr * dauer);
    const b = ctx.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    const teiltoene = [1, 0.55, 0.42, 0.22, 0.16, 0.09, 0.06, 0.035];
    for (let k = 0; k < teiltoene.length; k++) {
      const f = freq * (k + 1) * (1 + 0.0004 * k * k);
      if (f > sr / 2.2) break;
      // gedämpfte Schwingung als fortlaufende Drehung: schneller als sin() und exp() je Abtastwert
      const w = (2 * Math.PI * f) / sr;
      const c = Math.cos(w);
      const s = Math.sin(w);
      const r = Math.exp(-(2.2 + k * 1.6 + freq / 500) / sr);
      const phase = Math.random() * Math.PI;
      let x = Math.cos(phase) * teiltoene[k];
      let y = Math.sin(phase) * teiltoene[k];
      for (let i = 0; i < n; i++) {
        d[i] += y;
        const x2 = r * (x * c - y * s);
        y = r * (x * s + y * c);
        x = x2;
      }
    }
    // weicher Anschlag und ein kurzer Anriss
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      d[i] *= Math.min(1, t / 0.003) * 0.32;
      if (t < 0.012) d[i] += (Math.random() * 2 - 1) * 0.05 * (1 - t / 0.012);
    }
    saiten.set(freq, b);
    return b;
  }

  function zupfen(freq, wann = 0, laut = 0.5, gedaempft = false) {
    if (!bereit()) return;
    const t = ctx.currentTime + wann;
    const q = ctx.createBufferSource();
    q.buffer = saite(freq);
    const g = ctx.createGain();
    g.gain.value = laut;
    if (gedaempft) {
      g.gain.setValueAtTime(laut, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    }
    const tief = filter('lowpass', gedaempft ? 900 : 5200, 0.5);
    q.connect(tief).connect(g);
    g.connect(effekte);
    g.connect(hall);
    q.start(t);
    q.stop(t + (gedaempft ? 0.3 : 2.2));
  }

  function folge(toene, abstand, laut) {
    toene.forEach((f, i) => zupfen(f, i * abstand, laut * (1 - i * 0.04)));
  }

  // ------------------------------------------------------------ Geräusche

  // Papier: ein Blatt wird gewendet
  function blatt(laut = 1) {
    if (!bereit()) return;
    const t = ctx.currentTime + 0.01;
    const dauer = 0.34;
    const hoch = filter('highpass', 700);
    const band = filter('bandpass', 2600, 0.6);
    band.frequency.setValueAtTime(1500, t);
    band.frequency.exponentialRampToValueAtTime(4200, t + dauer);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    // knisternde Körner
    let z = t;
    while (z < t + dauer) {
      const a = (0.05 + Math.random() * 0.1) * laut * Math.sin(Math.PI * ((z - t) / dauer));
      g.gain.setValueAtTime(0.0001, z);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, a), z + 0.004);
      z += 0.012 + Math.random() * 0.03;
      g.gain.exponentialRampToValueAtTime(0.0001, z);
    }
    rauschen(hoch, t, dauer);
    hoch.connect(band).connect(g).connect(effekte);
    // weiches Wischen darunter
    const wisch = filter('lowpass', 1400);
    const h = huellkurve(t, 0.06 * laut, 0.12, 0.25);
    rauschen(wisch, t, dauer + 0.1);
    wisch.connect(h).connect(effekte);
  }

  // Feder: kurzes Kratzen, solange die Linie gezogen wird
  function strich(dauer = 0.75) {
    if (!bereit()) return;
    const t = ctx.currentTime + 0.02;
    const band = filter('bandpass', 3200, 2.2);
    band.frequency.setValueAtTime(2600, t);
    band.frequency.linearRampToValueAtTime(3800, t + dauer);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    let z = t;
    while (z < t + dauer) {
      const a = 0.05 + Math.random() * 0.06;
      g.gain.linearRampToValueAtTime(a * Math.min(1, (t + dauer - z) / 0.15 + 0.2), z + 0.01);
      z += 0.02 + Math.random() * 0.02;
      g.gain.linearRampToValueAtTime(0.012, z);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer + 0.05);
    const weich = filter('lowpass', 5200);
    const leise = ctx.createGain();
    leise.gain.value = 0.6;
    rauschen(band, t, dauer + 0.1);
    band.connect(weich).connect(g).connect(leise).connect(effekte);
  }

  // Stempel: dumpfer Schlag auf Papier
  function stempel(laut = 1) {
    if (!bereit()) return;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.14);
    o.connect(huellkurve(t, 0.55 * laut, 0.004, 0.22)).connect(effekte);
    o.start(t);
    o.stop(t + 0.3);
    const tief = filter('lowpass', 1100);
    rauschen(tief, t, 0.15);
    tief.connect(huellkurve(t, 0.3 * laut, 0.002, 0.1)).connect(effekte);
  }

  // Nadel: der Pin wird gesetzt
  function pin() {
    if (!bereit()) return;
    const t = ctx.currentTime + 0.003;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    o.connect(huellkurve(t, 0.2, 0.002, 0.08)).connect(effekte);
    o.start(t);
    o.stop(t + 0.12);
    const hoch = filter('highpass', 2800);
    rauschen(hoch, t, 0.02);
    hoch.connect(huellkurve(t, 0.08, 0.001, 0.015)).connect(effekte);
  }

  // Raster: leises Ticken über Jahrzehnt- und Jahrhundertstrichen
  function tick(stark = false, hoehe = 0) {
    if (!bereit()) return;
    const jetzt = performance.now();
    if (jetzt - letzterTick < 28) return;
    letzterTick = jetzt;
    const t = ctx.currentTime + 0.002;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = (stark ? 2500 : 1900) + hoehe;
    o.connect(huellkurve(t, stark ? 0.075 : 0.045, 0.001, 0.022)).connect(effekte);
    o.start(t);
    o.stop(t + 0.04);
  }

  function klick() {
    if (!bereit()) return;
    const t = ctx.currentTime + 0.002;
    const band = filter('bandpass', 1800, 1.4);
    rauschen(band, t, 0.03);
    band.connect(huellkurve(t, 0.12, 0.001, 0.03)).connect(effekte);
  }

  // ------------------------------------------------------------ Musikalische Rückmeldungen

  // Ergebnis einer Runde: je besser, desto voller
  function ergebnis(anteil) {
    if (!bereit()) return;
    ducken(1.8);
    if (anteil >= 0.85) folge([TON.G3, TON.D4, TON.G4, TON.D5, TON.G5], 0.075, 0.55);
    else if (anteil >= 0.55) folge([TON.G3, TON.D4, TON.G4], 0.09, 0.5);
    else if (anteil >= 0.25) folge([TON.G3, TON.D4], 0.12, 0.45);
    else { zupfen(TON.D3, 0, 0.42); zupfen(TON.G2, 0.16, 0.42); }
  }

  function richtig() {
    if (!bereit()) return;
    zupfen(TON.D5, 0, 0.32);
    zupfen(TON.G5, 0.08, 0.32);
  }

  function falsch() {
    if (!bereit()) return;
    zupfen(TON.D3, 0, 0.5, true);
  }

  // Zählen der Punkte: Ticks, die mit dem Wert steigen
  function zaehlen(anteil) {
    tick(false, 900 * anteil);
  }

  // Ende eines Spiels: Kadenz von der Dominante zur Tonika
  function schluss(anteil) {
    if (!bereit()) return;
    ducken(3);
    if (anteil >= 0.55) {
      zupfen(TON.D4, 0, 0.42); zupfen(TON.A4, 0.04, 0.36);
      [TON.G3, TON.D4, TON.G4, TON.D5, TON.G5].forEach((f, i) => zupfen(f, 0.5 + i * 0.11, 0.5));
    } else if (anteil >= 0.3) {
      zupfen(TON.A3, 0, 0.4);
      [TON.G3, TON.D4, TON.G4].forEach((f, i) => zupfen(f, 0.4 + i * 0.12, 0.45));
    } else {
      zupfen(TON.D3, 0, 0.4);
      zupfen(TON.G2, 0.35, 0.45);
    }
  }

  // Bestwert oder gewonnene Herausforderung: ein schneller Lauf nach oben
  function triumph() {
    if (!bereit()) return;
    ducken(2.5);
    [TON.G3, TON.D4, TON.G4, TON.D5, TON.G5, TON.D6].forEach((f, i) => zupfen(f, i * 0.06, 0.4));
    zupfen(TON.G5, 0.5, 0.35);
    zupfen(TON.D5, 0.5, 0.3);
  }

  function vibrieren(ms) {
    if (einst.effekte && navigator.vibrate && matchMedia('(pointer: coarse)').matches) {
      try { navigator.vibrate(ms); } catch { /* egal */ }
    }
  }

  // ------------------------------------------------------------ Musik

  let audio = null;
  let reihe = [];
  let platz = 0;
  let spielt = false;
  let anhalteZeit = null;
  let gemeldet = false;

  function positionLesen() {
    try { return JSON.parse(localStorage.getItem(POSITION)) || null; } catch { return null; }
  }
  function positionSchreiben() {
    if (!audio) return;
    try { localStorage.setItem(POSITION, JSON.stringify({ s: reihe[platz], t: Math.floor(audio.currentTime || 0) })); } catch { /* egal */ }
  }

  function reiheBilden(erstes) {
    const rest = STUECKE.map((s, i) => i).filter((i) => i !== erstes);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    reihe = [erstes, ...rest];
    platz = 0;
  }

  function stueckLaden(ab = 0) {
    audio.src = STUECKE[reihe[platz]].datei;
    if (ab > 0) {
      audio.addEventListener('loadedmetadata', () => {
        if (ab < (audio.duration || 0) - 10) audio.currentTime = ab;
      }, { once: true });
    }
  }

  function musikAufbauen() {
    if (audio) return;
    audio = new Audio();
    audio.preload = 'auto';
    const quelle = ctx.createMediaElementSource(audio);
    quelle.connect(musikBus);
    const pos = positionLesen();
    const erstes = pos && Number.isInteger(pos.s) && STUECKE[pos.s] ? pos.s : 0;
    reiheBilden(erstes);
    stueckLaden(pos && pos.s === erstes ? Math.max(0, (pos.t || 0) - 3) : 0);
    audio.addEventListener('ended', () => {
      platz += 1;
      if (platz >= reihe.length) reiheBilden(reihe[reihe.length - 1] === 0 ? 1 : 0);
      stueckLaden();
      setTimeout(() => { if (spielt) audio.play().catch(() => {}); }, 1800);
    });
    audio.addEventListener('playing', () => {
      if (!gemeldet) {
        gemeldet = true;
        beiTitel.forEach((f) => f(`Bach, Goldberg-Variationen · ${STUECKE[reihe[platz]].titel}`));
      }
    });
    let zuletzt = 0;
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime - zuletzt > 5 || audio.currentTime < zuletzt) {
        zuletzt = audio.currentTime;
        positionSchreiben();
      }
    });
    audio.addEventListener('error', () => { spielt = false; });
  }

  function musikStarten() {
    if (!ctx || !einst.musik) return;
    musikAufbauen();
    clearTimeout(anhalteZeit);
    if (!spielt) {
      spielt = true;
      const t = ctx.currentTime;
      musikBus.gain.cancelScheduledValues(t);
      musikBus.gain.setValueAtTime(musikBus.gain.value, t);
      musikBus.gain.linearRampToValueAtTime(PEGEL_MUSIK, t + 3);
    }
    if (audio.paused) audio.play().catch(() => { spielt = false; });
  }

  function musikAnhalten(sanft = 0.8) {
    if (!audio || !spielt) return;
    spielt = false;
    const t = ctx.currentTime;
    musikBus.gain.cancelScheduledValues(t);
    musikBus.gain.setValueAtTime(musikBus.gain.value, t);
    musikBus.gain.linearRampToValueAtTime(0, t + sanft);
    clearTimeout(anhalteZeit);
    anhalteZeit = setTimeout(() => { if (!spielt) { audio.pause(); positionSchreiben(); } }, sanft * 1000 + 60);
  }

  // Musik kurz leiser, wenn ein Ergebnis erklingt
  function ducken(sekunden) {
    if (!ctx || !spielt) return;
    const t = ctx.currentTime;
    const g = musikBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(PEGEL_MUSIK * 0.45, t + 0.15);
    g.setValueAtTime(PEGEL_MUSIK * 0.45, t + sekunden);
    g.linearRampToValueAtTime(PEGEL_MUSIK, t + sekunden + 1.2);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      musikAnhalten(0.3);
    } else {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (einst.musik) musikStarten();
    }
  });
  window.addEventListener('pagehide', positionSchreiben);

  // ------------------------------------------------------------ Schalter

  function musikSchalten(an = !einst.musik) {
    einst.musik = an;
    speichern();
    if (an) { entsperren(); musikStarten(); } else musikAnhalten();
    return an;
  }

  function effekteSchalten(an = !einst.effekte) {
    einst.effekte = an;
    speichern();
    if (aufbauen()) {
      const t = ctx.currentTime;
      effekte.gain.cancelScheduledValues(t);
      effekte.gain.setTargetAtTime(an ? PEGEL_EFFEKTE : 0, t, 0.03);
    }
    if (an) klick();
    return an;
  }

  return {
    get musik() { return einst.musik; },
    get effekte() { return einst.effekte; },
    musikSchalten,
    effekteSchalten,
    beiTitel: (f) => beiTitel.push(f),
    blatt, strich, stempel, pin, tick, klick, zaehlen,
    ergebnis, richtig, falsch, schluss, triumph, vibrieren,
  };
})();
