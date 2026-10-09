// Die Kernschleife: Schläge rein, Tempo und Position der Aufnahme raus.
// Dazu Wertung, Stimmung der Instrumentengruppen und das Publikum.

export const RATE_MIN = 0.5;
export const RATE_MAX = 1.8;
const STILLE_AB = 2.0; // Sekunden ohne Schlag, bis das Orchester langsamer wird

const klemme = (x, a, b) => Math.max(a, Math.min(b, x));
const zufallAus = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mittel = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

// Tempo aus Schlägen: geglätteter Mittelwert der letzten vier Intervalle
export class Taktgeber {
  constructor() { this.reset(); }

  reset() {
    this.intervalle = [];
    this.periode = null;
    this.letzter = null;
    this.zappelFolge = [];
  }

  setze(periode, t) {
    this.periode = periode;
    this.intervalle = [periode];
    this.letzter = t;
    this.zappelFolge = [];
  }

  // Nach einer Pause: Tempo behalten, Intervall-Historie vergessen
  pause() {
    this.letzter = null;
    this.intervalle = [];
  }

  #mitteln() {
    let s = 0, w = 0;
    this.intervalle.forEach((x, i) => { const g = i + 1; s += x * g; w += g; });
    return s / w;
  }

  schlag(t) {
    if (this.letzter == null) { this.letzter = t; return { status: 'erster' }; }
    const iv = t - this.letzter;
    if (iv < 0.15) return { status: 'prell' };
    const P = this.periode;
    if (P && iv < 0.52 * P) {
      // Zu dichter Schlag: einmal ist Zappeln, mehrmals gleichmäßig ist ein neues Tempo
      this.zappelFolge.push(t);
      if (this.zappelFolge.length >= 3) {
        const z = this.zappelFolge.slice(-3);
        const a = z[1] - z[0], b = z[2] - z[1];
        if (Math.abs(a - b) / Math.max(a, b) < 0.2) {
          this.intervalle = [a, b];
          this.periode = this.#mitteln();
          this.letzter = t;
          this.zappelFolge = [];
          return { status: 'ok', intervall: b, neu: true };
        }
      }
      return { status: 'zappler', intervall: iv };
    }
    this.zappelFolge = [];
    if (iv > 2.6 || (P && iv > 2.8 * P)) {
      this.letzter = t;
      this.intervalle = [];
      return { status: 'luecke', intervall: iv };
    }
    const vorher = this.intervalle.length ? this.intervalle[this.intervalle.length - 1] : null;
    this.intervalle.push(iv);
    if (this.intervalle.length > 4) this.intervalle.shift();
    const neu = this.#mitteln();
    this.periode = P && this.intervalle.length === 1 ? 0.5 * P + 0.5 * neu : neu;
    this.letzter = t;
    return { status: 'ok', intervall: iv, vorher };
  }
}

const TEXTE = {
  husten: ['Reihe 7 hustet.', 'Jemand hustet demonstrativ.', 'Ein Husten aus der Loge, dezent wie ein Presslufthammer.', 'Hüsteln im zweiten Rang.'],
  gaehnen: ['Reihe 12 gähnt.', 'Ein Abonnent gähnt hörbar.', 'Jemand gähnt, mit allen Vokalen.', 'Im Parkett wird gegähnt.'],
  rascheln: ['Jemand blättert im Programmheft.', 'Raschel, raschel: Wann ist Pause?', 'Ein Bonbonpapier wird geöffnet. Langsam.', 'Jemand sucht im Programmheft die Spieldauer.'],
  gut: ['Ein Raunen geht durch den Saal.', 'Die erste Reihe wippt mit.', 'Jemand vergisst zu husten.', 'Im Rang hält man den Atem an.', 'Eine Dame legt das Opernglas weg.'],
  schnell: ['Ein Herr schaut auf die Uhr. Erfreut.', 'Die Notenwender schwitzen.', 'Das Parkett hält sich an den Armlehnen fest.'],
  einzeln: ['Ein einzelner Herr klatscht. Langsam.'],
  klatschChaos: ['Der Saal klatscht im eigenen Tempo.', 'Parkett und Rang klatschen gegeneinander.', 'Das Publikum ist einen Schlag voraus. Oder hinterher.'],
  klatschGut: ['Der Saal klatscht wie ein Mann.', 'Wien wäre stolz.'],
  verstummt: ['Das Orchester wartet höflich.', 'Stille. Im Rang kichert jemand.', 'Die Bratschen nutzen die Pause zum Stimmen.'],
  fermateFrueh: ['Fermate abgekürzt. Die Oboe ringt nach Luft.', 'Das war keine Fermate mehr, das war ein Komma.'],
  fermateGut: ['Gehalten – und losgelassen. Schön.'],
  kiekser: ['Das Horn kiekst.', 'Kiekser im Blech.'],
  quietscher: ['Die Klarinette quietscht.'],
};

export class Dirigent {
  constructor({ audio, klang, karte, stueck = {}, wertung = true, dynamikAktiv = false, latenzExtra = 0, melde = () => {} }) {
    this.audio = audio;
    this.klang = klang;
    this.karte = karte;
    this.stueck = stueck;
    this.wertung = wertung;
    this.dynamikAktiv = dynamikAktiv;
    this.latenzExtra = latenzExtra;
    this.melde = melde;

    this.taktgeber = new Taktgeber();
    this.zustand = 'bereit';
    this.phi = karte.start - 1;
    this.rate = 1;
    this.faktor = 1; // Phasenkorrektur, höchstens ±8 %
    this.phase = 0;
    this.anzeige = null; // dein Tempo im Verhältnis zum Original, geglättet
    this.letzterSchlagT = -Infinity;
    this.letzterK = karte.start - 1;
    this.letzteKreuzT = null;
    this.uhr = { roh: 0, basis: 0, t0: 0, rate: 1 };
    this.dyn = 0.5;
    this.unruhe = 0;
    this.endePhi = (wertung ? karte.ende : karte.anzahl - 1) + 0.02;
    this.stimmung = { streicher: 0.8, holz: 0.8, blech: 0.8 };
    this.stimmungMin = { ...this.stimmung };
    this.grund = { streicher: null, holz: null, blech: null }; // warum eine Gruppe gerade verliert
    this.pub = { langeweile: 0, laune: 0.6, letzte: 0, einzeln: false, gutGemeldet: 0, schnell: 0 };
    this.stat = {
      punkte: [], tempo: [], unruhe: [], dyn: [], klatsch: [],
      stillstaende: 0, fermatenFrueh: 0, fermatenGut: 0, schlaege: 0, zappler: 0,
      maxRate: 0, minRate: 9, start: null, kiekser: 0,
    };
    this.verlauf = []; // [{schlag, bpm}] für die Partitur
    this.fermateOffen = null;
    this.fermateLos = false;
    this.fermateEilt = false;
    this.mitklatschen = stueck.klatschen ? new Mitklatschen(this, stueck.klatschen) : null;
  }

  get periode() { return this.taktgeber.periode; }
  get tempoProzent() { return Math.round((this.anzeige ?? this.rate) * 100); }

  latenz() { return this.klang.latenz() + this.latenzExtra; }

  // Aufnahmezeit mit Extrapolation zwischen den (grobkörnigen) currentTime-Updates
  #audioZeit(t) {
    const a = this.audio;
    const ct = a.currentTime;
    if (a.paused || ct !== this.uhr.roh) { this.uhr = { roh: ct, basis: ct, t0: t, rate: a.playbackRate }; return ct; }
    return this.uhr.basis + Math.min(0.25, t - this.uhr.t0) * this.uhr.rate;
  }

  // Die Wiedergabegeschwindigkeit ändert sich selten und nur in Stufen:
  // jede Änderung kann im Browser hörbar ruckeln.
  #rateSetzen(r, t, immer = false) {
    if (!Number.isFinite(r)) return;
    r = klemme(r, RATE_MIN, RATE_MAX);
    if (!immer && Math.abs(r - this.rate) / this.rate < 0.015) return;
    const jetzt = this.#audioZeit(t);
    this.rate = r;
    try { this.audio.playbackRate = r; } catch { /* ignorieren */ }
    this.uhr = { roh: this.audio.currentTime, basis: jetzt, t0: t, rate: r };
  }

  #rateAusTempo(t, immer = false) {
    const P = this.taktgeber.periode;
    if (!P) return;
    const k = this.karte.idx(Math.max(this.karte.start, Math.floor(this.phi)));
    if (this.karte.istFermate(k)) {
      this.#rateSetzen(this.fermateEilt ? RATE_MAX : 1, t, immer);
      return;
    }
    this.#rateSetzen((this.karte.periode[k] / P) * this.faktor, t, immer);
  }

  // ---------- Eingabe ----------

  schlag(t, dyn = null) {
    if (dyn != null) this.dyn = this.dyn * 0.35 + dyn * 0.65;
    this.melde('schlag', { t, dyn });
    switch (this.zustand) {
      case 'bereit':
      case 'wartet':
        this.auftaktT = t;
        this.zustand = 'auftakt';
        this.klang.murmeln(false);
        this.melde('auftakt');
        return;
      case 'auftakt': {
        const P = t - this.auftaktT;
        if (P < 0.25 || P > 2.2) { this.auftaktT = t; return; }
        const k = this.phi <= this.karte.start ? this.karte.start : Math.max(this.karte.start, Math.ceil(this.phi - 0.15));
        this.#starte(t, P, k);
        return;
      }
      case 'ausklang':
        this.#weiterNachAusklang(t);
        this.#schlagImLauf(t);
        return;
      case 'halt':
        this.#loslassen(t);
        return;
      case 'laeuft':
        this.#schlagImLauf(t);
        return;
      default:
    }
  }

  #starte(t, P, k) {
    const a = this.audio, kt = this.karte;
    const D = kt.periode[k];
    const r0 = klemme(D / P, RATE_MIN, RATE_MAX);
    let pos = kt.beats[k] - D;
    let verzoegerung = 0;
    if (pos < 0) { verzoegerung = -pos / r0; pos = 0; }
    this.taktgeber.setze(P, t);
    this.letzterSchlagT = t;
    this.letzterK = k - 1;
    this.startK = k;
    this.letzteKreuzT = null;
    this.rate = r0;
    this.faktor = 1;
    this.phase = 0;
    this.anzeige = D / P;
    a.playbackRate = r0;
    a.currentTime = pos;
    this.uhr = { roh: pos, basis: pos, t0: t, rate: r0 };
    this.klang.blende(1, 0.05);
    this.zustand = 'laeuft';
    if (this.stat.start == null) this.stat.start = t;
    const los = () => { const p = a.play(); if (p && p.catch) p.catch((e) => this.melde('fehler', e)); };
    if (verzoegerung > 0.01) setTimeout(los, verzoegerung * 1000); else los();
    this.melde('einsatz', { k });
  }

  #schlagImLauf(t) {
    const kt = this.karte;
    // Wo ist das Orchester für die Ohren gerade? (Ausgabe hinkt hinterher)
    const tA = this.#audioZeit(t) - this.latenz() * this.rate;
    const phiH = kt.pos(tA);
    const f = Math.floor(phiH);
    this.stat.schlaege++;
    // Fermate: der Schlag in die Fermate hinein ist normal, danach ist jeder Schlag ein Abschlag
    if (kt.istFermate(f) && phiH - f >= 0.25) {
      this.letzterSchlagT = t;
      this.taktgeber.pause();
      this.taktgeber.schlag(t);
      this.fermateEilt = true;
      this.#rateSetzen(RATE_MAX, t, true);
      if (!this.fermateLos) {
        this.fermateLos = true;
        if (phiH - f < 0.8) {
          this.stat.fermatenFrueh++;
          this.#text('fermateFrueh');
        } else {
          this.stat.fermatenGut++;
        }
      }
      return;
    }
    const r = this.taktgeber.schlag(t);
    if (r.status === 'prell') { this.stat.schlaege--; return; }
    if (r.status === 'zappler') {
      this.stat.zappler++;
      this.unruhe = Math.min(1, this.unruhe + 0.35);
      return;
    }
    this.letzterSchlagT = t;
    const P = this.taktgeber.periode;
    const ziel = Math.round(phiH);
    const err = ziel - phiH; // > 0: Orchester hinkt hinterher
    this.phase = this.phase * 0.4 + err * 0.6;
    this.faktor = 1 + klemme(0.4 * this.phase, -0.08, 0.08);
    const D = kt.periode[kt.idx(ziel)];
    this.anzeige = this.anzeige == null ? D / P : this.anzeige * 0.6 + (D / P) * 0.4;
    this.#rateAusTempo(t);
    // Unruhe: Intervallsprung, der nicht in der Musik steht
    if (r.status === 'ok' && r.vorher) {
      const soll = Math.log(kt.periode[kt.idx(ziel)] / kt.periode[kt.idx(ziel - 1)]);
      const ist = Math.log(r.intervall / r.vorher);
      const u = klemme((Math.abs(ist - soll) - 0.06) / 0.3, 0, 1);
      this.unruhe = this.unruhe * 0.5 + u * 0.5;
    }
  }

  #ausklang(t) {
    this.zustand = 'ausklang';
    this.ausklangT = t;
    this.ausklangStufe = t;
    this.stat.stillstaende++;
    this.klang.blende(0, 1.6);
    this.melde('ausklang');
  }

  #weiterNachAusklang(t) {
    this.zustand = 'laeuft';
    this.klang.blende(1, 0.15);
    this.taktgeber.pause();
    this.taktgeber.schlag(t);
    this.#rateAusTempo(t, true);
  }

  #loslassen(t) {
    // Nach gehaltener Fermate geht es weiter
    this.stat.fermatenGut++;
    this.fermateLos = true;
    this.zustand = 'laeuft';
    this.letzterSchlagT = t;
    this.taktgeber.pause();
    this.taktgeber.schlag(t);
    this.faktor = 1;
    this.klang.blende(1, 0.06);
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});
    this.#text('fermateGut');
  }

  // ---------- Takt ----------

  tick(t) {
    const a = this.audio, kt = this.karte;
    const tA = this.#audioZeit(t);
    if (this.zustand !== 'bereit') this.phi = kt.pos(tA);

    if (this.zustand === 'laeuft') {
      const k = Math.floor(this.phi);
      let neuerSchlag = false;
      while (this.letzterK < k) { this.letzterK++; this.#kreuzung(this.letzterK, t); neuerSchlag = true; }
      if (this.phi >= this.endePhi) {
        this.#schluss(t);
      } else {
        const P = this.taktgeber.periode;
        const inFermate = kt.istFermate(k);
        if (inFermate && this.fermateOffen !== k) {
          this.fermateOffen = k;
          this.fermateLos = false;
          this.fermateEilt = false;
          this.#rateSetzen(1, t, true);
        }
        const seit = t - this.letzterSchlagT;
        const grenze = Math.max(STILLE_AB, 2.1 * P) + (inFermate ? kt.dauern[kt.idx(k)] / Math.max(this.rate, 0.5) : 0);
        if (inFermate && this.phi - k > 0.96 && !this.fermateLos) {
          // Orchester hält am Ende der Fermate an und wartet auf den Abschlag
          this.zustand = 'halt';
          this.klang.blende(0.0, 0.05);
          setTimeout(() => { if (this.zustand === 'halt') a.pause(); }, 70);
          this.melde('halt');
        } else if (seit > grenze) {
          this.#ausklang(t);
        } else if (neuerSchlag) {
          // Pro Schlag: Originaltempo kann sich ändern, Phasenkorrektur klingt ab
          this.faktor = 1 + (this.faktor - 1) * 0.6;
          this.#rateAusTempo(t);
          this.stat.maxRate = Math.max(this.stat.maxRate, this.rate);
          this.stat.minRate = Math.min(this.stat.minRate, this.rate);
        }
      }
    } else if (this.zustand === 'ausklang') {
      // Orchester wird in Stufen langsamer
      if (t - (this.ausklangStufe || 0) > 0.35 && this.rate > RATE_MIN) {
        this.ausklangStufe = t;
        this.#rateSetzen(this.rate * 0.86, t, true);
      }
      const k = Math.floor(this.phi);
      while (this.letzterK < k) { this.letzterK++; this.#kreuzung(this.letzterK, t); }
      if (t - this.ausklangT > 1.7) {
        a.pause();
        this.zustand = 'wartet';
        this.taktgeber.pause();
        this.#text('verstummt');
        this.melde('verstummt');
      }
    } else if (this.zustand === 'schluss') {
      if (a.ended || t > this.schlussBis) this.#beenden();
    }

    if (this.zustand === 'laeuft' || this.zustand === 'ausklang' || this.zustand === 'schluss') this.#dynamikAnwenden();
    if (this.mitklatschen) this.mitklatschen.tick(t);
  }

  #dynamikAnwenden() {
    if (!this.dynamikAktiv) return;
    const ziel = this.karte.zielLaut(Math.floor(this.phi));
    const db = klemme((this.dyn - ziel) * 16, -12, 10);
    this.klang.dynamik(Math.pow(10, db / 20));
  }

  #schluss(t) {
    this.zustand = 'schluss';
    const kt = this.karte;
    const letzter = kt.anzahl - 1;
    if (this.wertung && kt.ende < letzter - 2) {
      this.klang.blende(0, 3.2);
      this.schlussBis = t + 3.3;
    } else {
      this.#rateSetzen(1, t, true); // Schlussakkord klingt im Originaltempo aus
      const rest = Math.max(0, (this.audio.duration || kt.beats[letzter] + 4) - this.audio.currentTime);
      this.schlussBis = t + Math.min(8, rest + 0.3);
    }
  }

  #beenden() {
    this.zustand = 'ende';
    this.audio.pause();
    this.melde('ende', this.ergebnis());
  }

  abbrechen() {
    this.zustand = 'ende';
    this.audio.pause();
    this.klang.blende(0, 0.2);
  }

  // ---------- Wertung ----------

  #kreuzung(k, t) {
    const kt = this.karte;
    // genaue Wandzeit der Kreuzung aus der aktuellen Position zurückrechnen
    const tx = t - (this.phi - k) * kt.dauern[Math.max(0, k)] / Math.max(0.3, this.rate);
    const vorher = this.letzteKreuzT;
    this.letzteKreuzT = tx;
    this.melde('takt', { k, takt: kt.istTaktanfang(k) });
    if (vorher == null || k <= this.startK || this.zustand !== 'laeuft') return;
    const wand = tx - vorher;
    if (wand <= 0.05) return;
    const rEff = kt.dauern[k - 1] / wand;
    const fermate = kt.istFermate(k - 1);
    this.verlauf.push({ schlag: k - 1, bpm: fermate ? null : 60 / (kt.dauern[k - 1] / rEff) });
    if (this.verlauf.length > 400) this.verlauf.shift();
    if (fermate) return;
    // Gewertet wird dein Tempo (geglättet über die letzten Schlagabstände) gegen das
    // Originaltempo an dieser Stelle – nicht die Phasenkorrektur des Orchesters.
    const P = this.taktgeber.periode || wand;
    const r3 = kt.periode[k - 1] / P;
    const tempo = Math.log2(r3); // + zu schnell, − zu langsam
    const dynZiel = kt.zielLaut(k - 1);
    const dynAbw = this.dynamikAktiv ? this.dyn - dynZiel : 0;
    const klatsch = this.mitklatschen ? this.mitklatschen.abweichung() : 0;
    this.unruhe *= 0.85;

    // Die ersten Schläge nach dem Einsatz sind Anlauf und zählen nicht
    if (!this.wertung || k <= this.startK + 2) return;

    const tol = this.stueck.toleranz ?? 0.18;
    let p = Math.exp(-Math.pow(Math.abs(tempo) / tol, 2));
    if (this.dynamikAktiv) p *= 0.72 + 0.28 * Math.exp(-Math.pow(dynAbw / 0.25, 2));
    p *= 1 - Math.min(0.35, this.unruhe * 0.45);
    if (this.mitklatschen && this.mitklatschen.laeuft) p *= 1 - Math.min(0.5, klatsch * 1.4);
    this.stat.punkte.push(100 * p);
    this.stat.tempo.push(tempo);
    this.stat.unruhe.push(this.unruhe);
    if (this.dynamikAktiv) this.stat.dyn.push(dynAbw);
    if (this.mitklatschen && this.mitklatschen.laeuft) this.stat.klatsch.push(klatsch);

    // Stimmung
    const st = this.stimmung;
    const s = Math.max(0, Math.abs(tempo) - 0.07) / 0.3; // bis ~5 % frei
    const schlepp = tempo < 0 ? 1.35 : 1;
    const u = this.unruhe;
    const regen = p > 0.75 ? 0.028 : p > 0.5 ? 0.01 : 0;
    const tempoText = tempo < 0 ? 'zu langsam' : 'zu schnell';
    const verluste = {
      streicher: [[0.075 * u, 'unruhig'], [0.03 * s, tempoText]],
      holz: [[this.dynamikAktiv ? 0.07 * Math.abs(dynAbw) : 0, dynAbw > 0 ? 'zu laut' : 'zu leise'], [0.045 * s, tempoText], [0.02 * u, 'unruhig']],
      blech: [[0.05 * s * schlepp, tempoText], [0.02 * u, 'unruhig'], [0.06 * klatsch, 'Saal daneben']],
    };
    for (const [g, liste] of Object.entries(verluste)) {
      const verlust = liste.reduce((a, [v]) => a + v, 0);
      st[g] = klemme(st[g] - verlust + regen, 0, 1);
      // Warum verliert die Gruppe? Den größten Posten merken, für die Anzeige
      if (verlust > regen + 0.004) {
        const [, text] = liste.reduce((a, b) => (b[0] > a[0] ? b : a));
        this.grund[g] = { text, t };
      } else if (this.grund[g] && t - this.grund[g].t > 1.5) {
        this.grund[g] = null;
      }
    }
    for (const g of ['streicher', 'holz', 'blech']) this.stimmungMin[g] = Math.min(this.stimmungMin[g], st[g]);
    this.klang.stimmung(st);
    const gesamt = 0.42 * st.streicher + 0.25 * st.holz + 0.33 * st.blech;
    if (gesamt < 0.22 && Math.random() < (0.22 - gesamt) * 2.2) this.klang.aussetzer(0.05 + Math.random() * 0.14);
    if (st.blech < 0.33 && Math.random() < (0.33 - st.blech) * 0.45) {
      this.klang.kiekser(undefined, Math.random() < 0.5 ? -0.45 : 0.45);
      this.stat.kiekser++;
      if (Math.random() < 0.5) this.#text('kiekser');
    }
    if (st.holz < 0.3 && Math.random() < (0.3 - st.holz) * 0.35) {
      this.klang.quietscher();
      if (Math.random() < 0.5) this.#text('quietscher');
    }
    this.#publikum(p, r3, t);
  }

  #text(art) {
    this.melde('saal', { art, text: zufallAus(TEXTE[art]) });
  }

  #publikum(p, rEff, t) {
    const pub = this.pub;
    pub.laune = pub.laune * 0.9 + p * 0.1;
    pub.langeweile = pub.langeweile * 0.92 + (rEff < 0.87 ? (0.87 - rEff) * 1.3 : 0);
    pub.schnell = pub.schnell * 0.92 + (rEff > 1.18 ? (rEff - 1.18) * 1.2 : 0);
    if (t - pub.letzte < 2.6) return;
    if (pub.langeweile > 0.22 && Math.random() < pub.langeweile * 0.55) {
      const art = zufallAus(['husten', 'husten', 'gaehnen', 'rascheln']);
      if (art === 'husten') this.klang.husten();
      else if (art === 'gaehnen') this.klang.gaehnen();
      else this.klang.rascheln();
      this.#text(art);
      pub.letzte = t;
    } else if (pub.schnell > 0.2 && Math.random() < 0.25) {
      this.#text('schnell');
      pub.letzte = t;
    } else if (pub.laune < 0.3 && !pub.einzeln && this.stat.punkte.length > 24) {
      pub.einzeln = true;
      this.klang.einzelklatscher(4);
      this.#text('einzeln');
      pub.letzte = t + 4;
    } else if (pub.laune > 0.88 && t - pub.gutGemeldet > 14 && Math.random() < 0.3) {
      this.#text('gut');
      pub.letzte = t;
      pub.gutGemeldet = t;
    }
    if (this.mitklatschen && this.mitklatschen.laeuft && t - pub.letzte > 3) {
      const a = this.mitklatschen.abweichung();
      if (a > 0.22 && Math.random() < 0.4) { this.#text('klatschChaos'); pub.letzte = t; }
      else if (a < 0.05 && pub.laune > 0.85 && Math.random() < 0.08) { this.#text('klatschGut'); pub.letzte = t; }
    }
  }

  ergebnis() {
    const s = this.stat;
    const roh = mittel(s.punkte);
    const abzug = s.stillstaende * 3 + s.fermatenFrueh * 2;
    return {
      wertung: this.wertung,
      punkte: Math.max(0, Math.round(roh - abzug)),
      schlagAnteil: s.punkte.length,
      tempoMittel: mittel(s.tempo),
      tempoStreu: mittel(s.tempo.map(Math.abs)),
      unruhe: mittel(s.unruhe),
      dynMittel: mittel(s.dyn),
      dynStreu: mittel(s.dyn.map(Math.abs)),
      dynamikAktiv: this.dynamikAktiv,
      klatsch: s.klatsch.length ? mittel(s.klatsch) : null,
      stimmung: { ...this.stimmung },
      stimmungMin: { ...this.stimmungMin },
      stillstaende: s.stillstaende,
      fermatenFrueh: s.fermatenFrueh,
      fermatenGut: s.fermatenGut,
      zappler: s.zappler,
      kiekser: s.kiekser,
      maxRate: s.maxRate,
      minRate: s.minRate,
    };
  }
}

// Das Publikum klatscht mit: in deinem Tempo, aber mit Verzögerung.
class Mitklatschen {
  constructor(dirigent, abschnitte) {
    this.d = dirigent;
    // Abschnitte in Sekunden der Aufnahme → Schlagindizes
    this.abschnitte = abschnitte.map(([a, b]) => [Math.round(dirigent.karte.pos(a)), Math.round(dirigent.karte.pos(b))]);
    this.laeuft = false;
    this.P = null;
    this.naechster = null;
    this.abw = [];
  }

  #imAbschnitt(phi) { return this.abschnitte.some(([a, b]) => phi >= a - 0.1 && phi < b); }

  abweichung() { return this.abw.length ? mittel(this.abw.slice(-4)) : 0; }

  tick(t) {
    const d = this.d;
    if (d.zustand !== 'laeuft' && d.zustand !== 'ausklang') {
      this.laeuft = false;
      return;
    }
    const kt = d.karte;
    const phi = d.phi;
    const k = Math.floor(phi);
    const D = kt.dauern[kt.idx(k)];
    const r = Math.max(0.3, d.rate || 1);
    const imAbschnitt = this.#imAbschnitt(phi + 0.5);
    if (!this.laeuft) {
      if (imAbschnitt && d.zustand === 'laeuft') {
        // Einstieg auf den nächsten Orchesterschlag
        this.laeuft = true;
        this.P = D / r;
        this.naechster = t + (Math.ceil(phi) - phi) * D / r;
        this.abw = [];
      }
      return;
    }
    if (!imAbschnitt) {
      this.laeuft = false;
      return;
    }
    if (this.naechster - t > 0.06) return;
    // Wo ist das Orchester zum Klatschzeitpunkt?
    const phiDann = phi + (this.naechster - t) * r / D;
    const async = phiDann - Math.round(phiDann); // in Schlägen, ±0.5
    this.abw.push(Math.abs(async));
    if (this.abw.length > 16) this.abw.shift();
    const laut = kt.zielLaut(k) * (d.dynamikAktiv ? 0.35 + 0.65 * d.dyn : 1);
    const aenderung = Math.abs((d.taktgeber.periode || this.P) - this.P) / this.P;
    const streuung = klemme(0.08 + Math.abs(async) * 2.6 + aenderung * 3, 0, 0.999);
    const wann = d.klang.jetzt() + Math.max(0, this.naechster - t);
    d.klang.saalKlatscht(wann, 0.35 + 0.65 * laut, streuung);
    d.melde('klatsch', { async });
    // Saal folgt deinem Tempo träge und korrigiert die Phase nach Gehör
    const Pd = d.taktgeber.periode || this.P;
    this.P += (Pd - this.P) * 0.28;
    this.naechster += this.P - async * this.P * 0.22;
    if (this.naechster < t) this.naechster = t + this.P * 0.5;
  }
}
