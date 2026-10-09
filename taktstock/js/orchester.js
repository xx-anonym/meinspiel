// Blick vom Podium: das Orchester im Halbkreis (deutsche Aufstellung).
// Stilisierte Figuren wippen im Tempo; Gruppen in guter Stimmung leuchten.

const NS = 'http://www.w3.org/2000/svg';

// [Radius, von°, bis°, Anzahl, Instrument, Gruppe] – Winkel: −180 links, −90 Mitte, 0 rechts
const SITZE = [
  [500, -165, -142, 3, 'bass', 'streicher'],
  [500, -96, -84, 1, 'pauke', 'blech'],
  [500, -66, -24, 4, 'posaune', 'blech'],
  [425, -166, -136, 4, 'horn', 'blech'],
  [425, -118, -100, 2, 'klarinette', 'holz'],
  [425, -80, -62, 2, 'fagott', 'holz'],
  [425, -46, -20, 2, 'trompete', 'blech'],
  [350, -168, -146, 2, 'cello', 'streicher'],
  [350, -116, -98, 2, 'floete', 'holz'],
  [350, -82, -64, 2, 'oboe', 'holz'],
  [350, -42, -14, 3, 'bratsche', 'streicher'],
  [275, -168, -118, 4, 'geige', 'streicher'],
  [275, -108, -78, 3, 'cello', 'streicher'],
  [275, -70, -46, 2, 'bratsche', 'streicher'],
  [275, -38, -12, 3, 'geige2', 'streicher'],
  [200, -166, -96, 5, 'geige', 'streicher'],
  [200, -84, -14, 5, 'geige2', 'streicher'],
];

const HAUT = ['#e8bf98', '#d9a77c', '#c98f63', '#f0cfae', '#b57a50', '#e2b48c'];
const HAAR = ['#2b1d14', '#4a3020', '#1a1410', '#7a5a3a', '#9a9a9a', '#3d2a1c'];
const KLEID = ['#1a1411', '#16120f', '#211813', '#1c1612'];

function el(name, attrs = {}, eltern) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (eltern) eltern.appendChild(e);
  return e;
}

const zufall = (a, b) => a + Math.random() * (b - a);

export class Orchester {
  constructor(container) {
    this.container = container;
    // Ebenen: statischer Saal (Bild), Leuchten der Gruppen (Bilder mit CSS-Deckkraft),
    // darüber nur die beweglichen Figuren. So muss pro Bild wenig neu gezeichnet werden.
    this.hg = document.createElement('img');
    this.hg.className = 'orchester-ebene';
    this.hg.alt = '';
    container.appendChild(this.hg);
    this.glanz = {};
    for (const g of ['streicher', 'holz', 'blech']) {
      const i = document.createElement('img');
      i.className = 'orchester-ebene orchester-glanz';
      i.alt = '';
      container.appendChild(i);
      this.glanz[g] = i;
    }
    this.svg = el('svg', { class: 'orchester-svg', role: 'img', 'aria-label': 'Das Orchester vom Podium aus' });
    container.appendChild(this.svg);
    this.figuren = [];
    this.urls = [];
    this.modus = 'tippen';
    this.glanzWert = {};
    this.letztesBild = 0;
    this.#bauen();
    this.ro = new ResizeObserver(() => this.#bauen());
    this.ro.observe(container);
  }

  zerstoeren() {
    this.ro.disconnect();
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    this.container.textContent = '';
  }

  #alsBild(svg, img) {
    const text = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    this.urls.push(url);
    img.src = url;
  }

  #bauen() {
    const r = this.container.getBoundingClientRect();
    const A = r.width > 10 && r.height > 10 ? r.width / r.height : 1.8;
    const k = Math.max(0.5, Math.min(1.25, (1060 / A - 140) / 500));
    const hoch = A < 1.2;
    const schluessel = `${k.toFixed(2)}|${hoch}|${A.toFixed(2)}`;
    if (this.layoutKey === schluessel) return;
    this.layoutKey = schluessel;
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    this.urls = [];
    this.svg.textContent = '';
    this.figuren = [];
    this.glanzWert = {};
    const cx = 500, cy = 120 + 500 * k + 40;
    const breite = hoch ? 860 : 1060;
    const x0 = 500 - breite / 2;
    const h = cy + 30;
    // Im Hochformat: oben mehr Saal zeigen statt leerer Fläche
    const yTop = Math.min(0, h - breite / Math.max(0.3, A));
    const viewBox = `${x0} ${yTop.toFixed(0)} ${breite} ${(h - yTop).toFixed(0)}`;
    const neuesSvg = () => el('svg', { viewBox, preserveAspectRatio: 'xMidYMid meet' });
    this.svg.setAttribute('viewBox', viewBox);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const figurSkala = hoch ? 1.55 : 1.1;

    // ---- Statischer Saal
    const hg = neuesSvg();
    const defs = el('defs', {}, hg);
    const lg = el('radialGradient', { id: 'licht', cx: '50%', cy: '55%', r: '60%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffcf86', 'stop-opacity': '0.34' }, lg);
    el('stop', { offset: '55%', 'stop-color': '#c77a2c', 'stop-opacity': '0.12' }, lg);
    el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': '0' }, lg);
    const glow = el('radialGradient', { id: 'glimmen' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffd88f', 'stop-opacity': '0.85' }, glow);
    el('stop', { offset: '100%', 'stop-color': '#ffb347', 'stop-opacity': '0' }, glow);
    const lampe = el('radialGradient', { id: 'lampe' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#fff1c7', 'stop-opacity': '1' }, lampe);
    el('stop', { offset: '35%', 'stop-color': '#ffcf7a', 'stop-opacity': '0.5' }, lampe);
    el('stop', { offset: '100%', 'stop-color': '#ffb347', 'stop-opacity': '0' }, lampe);
    const holzG = el('linearGradient', { id: 'podest', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#5a3620' }, holzG);
    el('stop', { offset: '100%', 'stop-color': '#2a170c' }, holzG);

    // Rückwand mit Orgelpfeifen
    el('rect', { x: x0, y: yTop, width: breite, height: h - yTop, fill: '#140c08' }, hg);
    const wandH = cy - 500 * k - 10;
    const platz = wandH - 30 - yTop; // Höhe über der Brüstung
    const orgel = Math.min(260, Math.max(90, platz * 0.55));
    for (let i = 0; i < 31; i++) {
      const px = 500 + (i - 15) * 17;
      const ph = orgel * (0.55 + 0.4 * Math.cos((i - 15) / 5)) + (i % 2) * 12;
      el('rect', { x: px - 6, y: wandH - ph - 30, width: 12, height: ph, rx: 5, fill: '#3a2614', opacity: 0.55 }, hg);
    }
    if (platz > 260) {
      // Ränge mit Logenlampen und Kronleuchter
      for (const [y, n] of [[yTop + platz * 0.18, 9], [yTop + platz * 0.42, 11]]) {
        el('rect', { x: x0, y, width: breite, height: 8, fill: '#2a1a0f' }, hg);
        for (let i = 0; i < n; i++) {
          const lx = x0 + ((i + 0.5) * breite) / n;
          el('circle', { cx: lx, cy: y - 10, r: 16, fill: 'url(#lampe)', opacity: 0.55 }, hg);
          el('rect', { x: lx - 16, y: y + 8, width: 32, height: 22, rx: 3, fill: '#1d120b' }, hg);
        }
      }
      const ky = yTop + platz * 0.08;
      el('circle', { cx: 500, cy: ky, r: 90, fill: 'url(#glimmen)', opacity: 0.35 }, hg);
      for (let i = -3; i <= 3; i++) el('circle', { cx: 500 + i * 16, cy: ky + Math.abs(i) * -4 + 8, r: 5, fill: '#ffe2a8', opacity: 0.9 }, hg);
    }
    el('rect', { x: x0, y: wandH - 30, width: breite, height: 30, fill: '#24160d' }, hg);
    el('ellipse', { cx: 500, cy: cy - 260 * k, rx: 640, ry: 420 * k + 120, fill: 'url(#licht)' }, hg);
    // Podeste (Stufen)
    for (const rr of [540, 465, 390, 315, 240]) {
      el('ellipse', { cx, cy, rx: rr, ry: rr * k, fill: 'url(#podest)', stroke: '#7a4c28', 'stroke-width': 1.5, opacity: 0.92 }, hg);
    }
    el('ellipse', { cx, cy, rx: 165, ry: 165 * k, fill: '#1c110a', stroke: '#6b4223', 'stroke-width': 1.5 }, hg);
    this.#alsBild(hg, this.hg);

    // ---- Leuchten der Gruppen, je eine Ebene
    const glanzFlaechen = {
      streicher: [[300, cy - 260 * k, 230, 120 * k + 30], [700, cy - 260 * k, 230, 120 * k + 30]],
      holz: [[500, cy - 385 * k, 130, 70 * k + 20]],
      blech: [[190, cy - 330 * k, 120, 80 * k + 20], [760, cy - 420 * k, 170, 80 * k + 20]],
    };
    for (const [g, flaechen] of Object.entries(glanzFlaechen)) {
      const gs = neuesSvg();
      const d = el('defs', {}, gs);
      const gl = el('radialGradient', { id: 'g' }, d);
      el('stop', { offset: '0%', 'stop-color': '#ffd88f', 'stop-opacity': '0.85' }, gl);
      el('stop', { offset: '100%', 'stop-color': '#ffb347', 'stop-opacity': '0' }, gl);
      for (const [ex, ey, rx, ry] of flaechen) el('ellipse', { cx: ex, cy: ey, rx, ry, fill: 'url(#g)' }, gs);
      this.#alsBild(gs, this.glanz[g]);
      this.glanz[g].style.opacity = '0';
    }

    // Sitze von hinten nach vorn
    const sitze = [];
    for (const [rad, a, b, n, art, gruppe] of SITZE) {
      for (let i = 0; i < n; i++) {
        const w = n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1);
        const t = (w * Math.PI) / 180;
        sitze.push({ x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) * k, rad, art, gruppe, w });
      }
    }
    sitze.sort((p, q) => p.y - q.y);
    const ebene = el('g', {}, this.svg);
    for (const s of sitze) {
      const tiefe = 1.12 - ((s.rad - 200) / 300) * 0.38;
      const sk = tiefe * figurSkala;
      const f = this.#figur(s, sk);
      ebene.appendChild(f.g);
      this.figuren.push(f);
    }
    // Taktstock (nur im Tipp-Modus sichtbar)
    this.stock = el('g', { class: 'taktstock' }, this.svg);
    const sx = 560, sy = h - 6;
    this.stockArm = el('g', { transform: `translate(${sx} ${sy})` }, this.stock);
    this.stockLinie = el('g', {}, this.stockArm);
    el('path', { d: 'M 0 0 L -8 -44', stroke: '#2b1a10', 'stroke-width': 9, 'stroke-linecap': 'round' }, this.stockLinie);
    el('path', { d: 'M -8 -44 L -60 -150', stroke: '#f4ead8', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, this.stockLinie);
    el('circle', { cx: -60, cy: -150, r: 3.5, fill: '#fff6dd' }, this.stockLinie);
    this.stock.style.display = this.modus === 'tippen' ? '' : 'none';
    this.k = k;
  }

  #figur(s, sk) {
    const g = el('g', { transform: `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${sk.toFixed(3)})` });
    const koerper = el('g', {}, g);
    const kleid = KLEID[Math.floor(Math.random() * KLEID.length)];
    const haut = HAUT[Math.floor(Math.random() * HAUT.length)];
    const haar = HAAR[Math.floor(Math.random() * HAAR.length)];
    const steht = s.art === 'bass' || s.art === 'pauke';
    const hy = steht ? -48 : -37;
    // Notenpult mit Lampe
    const pult = el('g', {}, null);
    if (s.art !== 'pauke') {
      el('path', { d: 'M -10 8 L 10 8 L 8 -2 L -8 -2 Z', fill: '#0d0907', opacity: 0.92 }, pult);
      el('circle', { cx: 0, cy: -3, r: 5.5, fill: '#ffcf7a', opacity: 0.22 }, pult);
      el('circle', { cx: 0, cy: -3, r: 2, fill: '#fff1c7', opacity: 0.9 }, pult);
    }
    // Rumpf
    el('path', { d: steht ? 'M -15 0 Q -17 -36 0 -40 Q 17 -36 15 0 Z' : 'M -14 0 Q -16 -27 0 -29 Q 16 -27 14 0 Z', fill: kleid }, koerper);
    el('path', { d: steht ? 'M -3 -38 L 0 -30 L 3 -38 Z' : 'M -3 -28 L 0 -21 L 3 -28 Z', fill: '#efe6d6' }, koerper);
    const kopf = el('g', { transform: `translate(0 ${hy})` }, koerper);
    el('circle', { cx: 0, cy: 0, r: 8.5, fill: haut }, kopf);
    el('path', { d: 'M -8.6 -1 Q -8 -10 0 -10 Q 8 -10 8.6 -1 Q 4 -6 0 -6 Q -4 -6 -8.6 -1 Z', fill: haar }, kopf);
    const instr = el('g', {}, koerper);
    let bogen = null, extra = null;
    switch (s.art) {
      case 'geige': case 'geige2': case 'bratsche': {
        const gross = s.art === 'bratsche' ? 1.12 : 1;
        el('ellipse', { cx: -9, cy: hy + 12, rx: 4.2 * gross, ry: 8 * gross, transform: `rotate(-58 -9 ${hy + 12})`, fill: '#8a4b22' }, instr);
        bogen = el('g', { transform: `translate(-2 ${hy + 13})` }, instr);
        el('line', { x1: -4, y1: 0, x2: 24, y2: 10, stroke: '#d8c8a8', 'stroke-width': 1.4 }, bogen);
        break;
      }
      case 'cello': {
        el('ellipse', { cx: 0, cy: -9, rx: 7.5, ry: 13, fill: '#7a3f1c' }, instr);
        el('line', { x1: 0, y1: -20, x2: 0, y2: hy + 8, stroke: '#2b1a10', 'stroke-width': 1.6 }, instr);
        bogen = el('g', { transform: 'translate(0 -8)' }, instr);
        el('line', { x1: -14, y1: 1, x2: 14, y2: -2, stroke: '#d8c8a8', 'stroke-width': 1.4 }, bogen);
        break;
      }
      case 'bass': {
        el('ellipse', { cx: -2, cy: -14, rx: 9.5, ry: 18, fill: '#6f3818' }, instr);
        el('line', { x1: -2, y1: -30, x2: -2, y2: hy - 6, stroke: '#2b1a10', 'stroke-width': 2 }, instr);
        bogen = el('g', { transform: 'translate(-2 -12)' }, instr);
        el('line', { x1: -16, y1: 2, x2: 16, y2: -2, stroke: '#d8c8a8', 'stroke-width': 1.6 }, bogen);
        break;
      }
      case 'floete':
        el('line', { x1: -4, y1: hy + 5, x2: 26, y2: hy + 9, stroke: '#cfd6dc', 'stroke-width': 2 }, instr);
        break;
      case 'oboe': case 'klarinette':
        el('line', { x1: 0, y1: hy + 6, x2: 3, y2: hy + 30, stroke: '#141010', 'stroke-width': 2.6 }, instr);
        if (s.art === 'klarinette') el('ellipse', { cx: 3, cy: hy + 31, rx: 3, ry: 1.6, fill: '#141010' }, instr);
        break;
      case 'fagott':
        el('line', { x1: -8, y1: -2, x2: 7, y2: hy - 12, stroke: '#7a3f1c', 'stroke-width': 4 }, instr);
        el('path', { d: `M 3 ${hy - 2} Q 0 ${hy + 4} -2 ${hy + 6}`, stroke: '#c0a060', 'stroke-width': 1.2, fill: 'none' }, instr);
        break;
      case 'horn':
        el('circle', { cx: 9, cy: hy + 18, r: 7.5, fill: 'none', stroke: '#d9a441', 'stroke-width': 2.6 }, instr);
        el('circle', { cx: 15, cy: hy + 25, r: 5, fill: '#b9852c' }, instr);
        break;
      case 'trompete':
        el('line', { x1: 0, y1: hy + 6, x2: 0, y2: hy + 18, stroke: '#d9a441', 'stroke-width': 2.4 }, instr);
        el('circle', { cx: 0, cy: hy + 20, r: 5.5, fill: '#e2b04d', stroke: '#9a6a1c', 'stroke-width': 1 }, instr);
        break;
      case 'posaune': {
        el('circle', { cx: 0, cy: hy + 18, r: 6.5, fill: '#e2b04d', stroke: '#9a6a1c', 'stroke-width': 1 }, instr);
        extra = el('line', { x1: 3, y1: hy + 8, x2: 3, y2: hy + 30, stroke: '#d9a441', 'stroke-width': 1.6 }, instr);
        break;
      }
      case 'pauke': {
        el('ellipse', { cx: -17, cy: -4, rx: 14, ry: 8, fill: '#a35a2a', stroke: '#e0b070', 'stroke-width': 1 }, g);
        el('ellipse', { cx: 17, cy: -4, rx: 14, ry: 8, fill: '#a35a2a', stroke: '#e0b070', 'stroke-width': 1 }, g);
        bogen = el('g', { transform: `translate(0 ${hy + 20})` }, instr);
        el('line', { x1: -6, y1: 0, x2: -18, y2: 14, stroke: '#d8c8a8', 'stroke-width': 1.6 }, bogen);
        el('line', { x1: 6, y1: 0, x2: 18, y2: 14, stroke: '#d8c8a8', 'stroke-width': 1.6 }, bogen);
        break;
      }
      default:
    }
    g.appendChild(pult);
    return {
      g, koerper, kopf, bogen, extra, art: s.art, gruppe: s.gruppe,
      basis: `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${sk.toFixed(3)})`,
      versatz: zufall(-0.07, 0.07), amp: zufall(0.7, 1.3), neig: zufall(-1, 1), hy,
      ausruf: 0,
    };
  }

  setzeModus(modus) {
    this.modus = modus;
    if (this.stock) this.stock.style.display = modus === 'tippen' ? '' : 'none';
  }

  schlag() { this.stockPuls = 1; }

  ausruf(gruppe) {
    const kand = this.figuren.filter((f) => f.gruppe === gruppe && f.art !== 'pauke');
    const f = kand[Math.floor(Math.random() * kand.length)];
    if (!f) return;
    const t = el('text', { x: 10, y: f.hy - 12, class: 'ausruf' }, f.g);
    t.textContent = gruppe === 'blech' ? '♪!' : '♪?';
    setTimeout(() => t.remove(), 900);
  }

  // Jedes Bild: Position im Stück, Stimmung, Lautstärke
  zeichne(phi, { zustand, stimmung, laut = 0.5, frei = false }) {
    const jetzt = performance.now();
    if (jetzt - this.letztesBild < 30) return; // 30 Bilder pro Sekunde reichen
    this.letztesBild = jetzt;
    const f = phi - Math.floor(phi);
    const k = Math.floor(phi);
    const spielt = zustand === 'laeuft' || zustand === 'schluss' || zustand === 'ausklang';
    const bereit = zustand === 'auftakt';
    const zeit = performance.now() / 1000;
    for (const fig of this.figuren) {
      const st = stimmung ? stimmung[fig.gruppe] : 0.8;
      let dy = 0, rot = 0, bogenW = 0;
      if (spielt) {
        const ff = (f + fig.versatz + 1) % 1;
        const a = fig.amp * (1.5 + 3.2 * laut) * (0.45 + 0.55 * st);
        dy = a * Math.exp(-ff * 5.5);
        rot = Math.sin((phi / 2 + fig.versatz) * Math.PI) * 2.2 * fig.neig + (st < 0.35 ? 6 * (0.35 - st) / 0.35 * fig.neig : 0);
        const richtung = (k % 2 === 0 ? 1 : -1);
        bogenW = richtung * (1 - 2 * ff) * 13;
      } else if (bereit) {
        dy = -2.5;
      } else {
        dy = Math.sin(zeit * 1.3 + fig.versatz * 40) * 0.5;
        rot = fig.neig * 1.2;
      }
      fig.koerper.setAttribute('transform', `translate(0 ${dy.toFixed(2)}) rotate(${rot.toFixed(2)})`);
      if (fig.bogen) {
        if (fig.art === 'cello' || fig.art === 'bass') fig.bogen.setAttribute('transform', `translate(${(bogenW * 0.5).toFixed(2)} ${fig.art === 'bass' ? -12 : -8})`);
        else if (fig.art === 'pauke') fig.bogen.setAttribute('transform', `translate(0 ${(fig.hy + 20 - Math.abs(bogenW) * 0.4).toFixed(2)})`);
        else fig.bogen.setAttribute('transform', `translate(${(-2 + bogenW * 0.45).toFixed(2)} ${(fig.hy + 13).toFixed(2)}) rotate(${(bogenW * 0.3).toFixed(2)})`);
      }
      if (fig.extra && spielt) fig.extra.setAttribute('y2', (fig.hy + 30 + Math.max(0, bogenW) * 0.8).toFixed(1));
    }
    for (const [gruppe, bild] of Object.entries(this.glanz)) {
      const st = stimmung ? stimmung[gruppe] : 0.8;
      const o = Math.round((frei ? 0.45 : Math.max(0, (st - 0.45) / 0.55) * (spielt ? 0.85 : 0.4)) * 20) / 20;
      if (this.glanzWert[gruppe] !== o) { this.glanzWert[gruppe] = o; bild.style.opacity = String(o); }
    }
    // Taktstock im Tipp-Modus
    if (this.stockLinie) {
      const p = this.stockPuls || 0;
      this.stockPuls = p * 0.85;
      const w = bereit ? -14 : -4 + 22 * p;
      this.stockLinie.setAttribute('transform', `rotate(${w.toFixed(2)})`);
    }
  }
}
