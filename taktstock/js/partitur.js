// Die vereinfachte Partitur oben: Takte, Anweisungen, Zielkurve für Tempo
// und Lautstärke. Läuft von rechts nach links, „jetzt“ ist die goldene Linie.

const FARBEN = {
  papier: '#f2e7cf',
  papierDunkel: '#e6d7b8',
  tinte: '#2a2118',
  linie: 'rgba(60,40,20,0.22)',
  takt: 'rgba(42,33,24,0.55)',
  gold: '#a8741c',
  rot: '#a3302a',
  ziel: 'rgba(168,116,28,0.9)',
  ist: '#2a2118',
  dyn: 'rgba(120,80,30,0.16)',
  dynRand: 'rgba(120,80,30,0.45)',
};

export class Partitur {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.karte = null;
    this.puls = 0;
  }

  setze(karte, { dynamikAktiv = false, frei = false } = {}) {
    this.karte = karte;
    this.dynamikAktiv = dynamikAktiv;
    this.frei = frei;
    const [lo, hi] = karte.bpmBereich();
    this.bpmLo = lo / 1.45;
    this.bpmHi = hi * (frei ? 1.9 : 1.4);
  }

  schlag() { this.puls = 1; }

  #groesse() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { W: r.width, H: r.height };
  }

  zeichne(phi, { verlauf = [], dyn = null, bpmIst = null } = {}) {
    const kt = this.karte;
    if (!kt) return;
    const { W, H } = this.#groesse();
    const g = this.g;
    const px = Math.max(26, Math.min(62, W / 15));
    const x0 = Math.round(W * 0.24);
    const X = (b) => x0 + (b - phi) * px;
    const von = Math.max(0, Math.floor(phi - x0 / px) - 1);
    const bis = Math.min(kt.anzahl - 1, Math.ceil(phi + (W - x0) / px) + 1);

    // Papier
    g.fillStyle = FARBEN.papier;
    g.fillRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(120,90,50,0.12)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    const textY = 3;
    const sysTop = Math.round(Math.max(H * 0.4, 46)), sysBot = Math.round(sysTop + H * 0.24);
    const kurveTop = sysBot + 6, kurveBot = H - 6;

    // Dynamik-Band (Ziel) unter den Notenlinien
    g.beginPath();
    for (let i = von; i <= bis; i++) {
      const y = sysBot - 2 - kt.laut[i] * (sysBot - sysTop - 4);
      if (i === von) g.moveTo(X(i), y); else g.lineTo(X(i), y);
    }
    g.lineTo(X(bis), sysBot);
    g.lineTo(X(von), sysBot);
    g.closePath();
    g.fillStyle = FARBEN.dyn;
    g.fill();

    // Notenlinien
    g.strokeStyle = FARBEN.linie;
    g.lineWidth = 1;
    for (let l = 0; l < 5; l++) {
      const y = Math.round(sysTop + (l * (sysBot - sysTop)) / 4) + 0.5;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }

    // Schläge und Takte
    g.font = '600 10px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    let letzteNrX = -999;
    for (let i = von; i <= bis; i++) {
      const x = Math.round(X(i)) + 0.5;
      if (kt.istTaktanfang(i)) {
        g.strokeStyle = FARBEN.takt;
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x, sysTop); g.lineTo(x, sysBot); g.stroke();
        if (x - letzteNrX > 34) {
          g.fillStyle = 'rgba(42,33,24,0.5)';
          g.fillText(String(kt.taktNr[i]), x, sysTop - 2);
          letzteNrX = x;
        }
      } else {
        g.strokeStyle = 'rgba(42,33,24,0.18)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, sysBot - 5); g.lineTo(x, sysBot); g.stroke();
      }
      if (kt.istFermate(i)) this.#fermate(X(i + 0.5), sysTop + 2);
      // Schlagpunkt
      const vorbei = i < phi;
      g.fillStyle = vorbei ? 'rgba(42,33,24,0.25)' : 'rgba(42,33,24,0.6)';
      g.beginPath();
      g.arc(X(i), (sysTop + sysBot) / 2, kt.istTaktanfang(i) ? 3.2 : 2.2, 0, Math.PI * 2);
      g.fill();
    }
    if (kt.ende < kt.anzahl - 1 && !this.frei) {
      const x = X(kt.ende);
      g.fillStyle = FARBEN.tinte;
      g.fillRect(x - 1, sysTop, 2, sysBot - sysTop);
      g.fillRect(x + 3, sysTop, 4, sysBot - sysTop);
    }

    // Tempokurve: Ziel (gold) und Ist (Tinte)
    const yB = (bpm) => {
      const v = Math.log(bpm / this.bpmLo) / Math.log(this.bpmHi / this.bpmLo);
      return kurveBot - Math.max(0, Math.min(1, v)) * (kurveBot - kurveTop);
    };
    g.setLineDash([4, 3]);
    g.strokeStyle = FARBEN.ziel;
    g.lineWidth = 1.6;
    g.beginPath();
    let offen = false;
    for (let i = von; i <= bis; i++) {
      if (kt.istFermate(i)) { offen = false; continue; }
      const y = yB(kt.bpm(i));
      if (!offen) { g.moveTo(X(i), y); offen = true; } else g.lineTo(X(i), y);
    }
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = FARBEN.ist;
    g.lineWidth = 2;
    g.beginPath();
    offen = false;
    for (const v of verlauf) {
      if (v.schlag < von - 1) continue;
      if (v.bpm == null) { offen = false; continue; }
      const y = yB(v.bpm);
      if (!offen) { g.moveTo(X(v.schlag + 0.5), y); offen = true; } else g.lineTo(X(v.schlag + 0.5), y);
    }
    if (bpmIst && offen) g.lineTo(x0, yB(bpmIst));
    g.stroke();

    // Hinweise (zwei Zeilen, ohne Überlappung)
    const zeilen = [-1e9, -1e9];
    for (const h of kt.hinweise) {
      const x = X(h.schlag);
      if (x > W + 10) break;
      const font = h.art === 'dyn' ? 'italic 700 14px "Playfair Display", Georgia, serif'
        : h.art === 'satz' ? 'italic 600 13px "Playfair Display", Georgia, serif'
          : h.art === 'fermate' ? '700 12px Inter, system-ui, sans-serif'
            : 'italic 500 12px "Playfair Display", Georgia, serif';
      g.font = font;
      const w = g.measureText(h.text).width;
      if (x + w < -10) continue;
      let z = 0;
      if (zeilen[0] > x - 6) z = 1;
      if (z === 1 && zeilen[1] > x - 6) continue;
      zeilen[z] = x + w;
      const y = textY + z * 16;
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillStyle = h.art === 'fermate' ? FARBEN.rot : h.art === 'tempo' ? FARBEN.gold : FARBEN.tinte;
      g.globalAlpha = x < x0 - 4 ? 0.45 : 1;
      g.fillText(h.text, x, y);
      if (h.art === 'gabel' && h.bis) {
        const xb = X(h.bis), ym = y + 22;
        g.strokeStyle = FARBEN.tinte;
        g.lineWidth = 1;
        g.beginPath();
        if (h.auf) { g.moveTo(x, ym); g.lineTo(xb, ym - 4); g.moveTo(x, ym); g.lineTo(xb, ym + 4); }
        else { g.moveTo(x, ym - 4); g.lineTo(xb, ym); g.moveTo(x, ym + 4); g.lineTo(xb, ym); }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    // Jetzt-Linie
    const p = this.puls;
    this.puls *= 0.88;
    g.fillStyle = `rgba(214,160,60,${0.18 + 0.4 * p})`;
    g.fillRect(x0 - 6 - 6 * p, 0, 12 + 12 * p, H);
    g.fillStyle = FARBEN.gold;
    g.fillRect(x0 - 1, 0, 2, H);
    if (this.dynamikAktiv && dyn != null) {
      const y = sysBot - 2 - dyn * (sysBot - sysTop - 4);
      g.fillStyle = FARBEN.rot;
      g.beginPath(); g.arc(x0, y, 4, 0, Math.PI * 2); g.fill();
    }
    // Kante
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, H - 1, W, 1);
  }

  #fermate(x, y) {
    const g = this.g;
    g.strokeStyle = FARBEN.rot;
    g.fillStyle = FARBEN.rot;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(x, y + 8, 7, Math.PI, 0);
    g.stroke();
    g.beginPath();
    g.arc(x, y + 6, 1.8, 0, Math.PI * 2);
    g.fill();
  }
}
