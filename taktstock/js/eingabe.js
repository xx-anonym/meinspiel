// Eingabe: Tippen/Klicken/Leertaste, Gesten mit Maus oder Finger,
// oder das Handy selbst als Taktstock (DeviceMotion).
// Alle Zeiten in Sekunden auf der performance.now()-Uhr.

const sek = (ms) => ms / 1000;

export class Eingabe {
  constructor(flaeche, { onSchlag, onSpur = () => {}, onTaste = () => {} }) {
    this.flaeche = flaeche;
    this.onSchlag = onSchlag;
    this.onSpur = onSpur;
    this.onTaste = onTaste;
    this.modus = 'tippen';
    this.aktiv = false;
    this.spur = [];
    this.geste = null;
    this.letzterSchlag = 0;
    this.bewegung = null;
    this.h = {
      taste: (e) => this.#taste(e),
      runter: (e) => this.#runter(e),
      bewegt: (e) => this.#bewegt(e),
      hoch: (e) => this.#hoch(e),
      motion: (e) => this.#motion(e),
    };
  }

  aktivieren(modus) {
    this.deaktivieren();
    this.modus = modus;
    this.aktiv = true;
    this.spur = [];
    this.geste = null;
    window.addEventListener('keydown', this.h.taste);
    this.flaeche.addEventListener('pointerdown', this.h.runter);
    if (modus === 'geste') {
      this.flaeche.addEventListener('pointermove', this.h.bewegt);
      window.addEventListener('pointerup', this.h.hoch);
      window.addEventListener('pointercancel', this.h.hoch);
    }
    if (modus === 'handy') window.addEventListener('devicemotion', this.h.motion);
  }

  deaktivieren() {
    this.aktiv = false;
    window.removeEventListener('keydown', this.h.taste);
    this.flaeche.removeEventListener('pointerdown', this.h.runter);
    this.flaeche.removeEventListener('pointermove', this.h.bewegt);
    window.removeEventListener('pointerup', this.h.hoch);
    window.removeEventListener('pointercancel', this.h.hoch);
    window.removeEventListener('devicemotion', this.h.motion);
  }

  // iOS verlangt eine Erlaubnis für Bewegungssensoren, aus einer Nutzergeste heraus.
  static async bewegungErlauben() {
    const DME = window.DeviceMotionEvent;
    if (!DME) return 'fehlt';
    if (typeof DME.requestPermission === 'function') {
      try {
        const r = await DME.requestPermission();
        return r === 'granted' ? 'ok' : 'abgelehnt';
      } catch {
        return 'abgelehnt';
      }
    }
    return window.isSecureContext ? 'ok' : 'unsicher';
  }

  #schlag(t, dyn = null, x = null, y = null) {
    if (t - this.letzterSchlag < 0.09) return;
    this.letzterSchlag = t;
    this.onSchlag(t, dyn, x, y);
  }

  #taste(e) {
    if (e.repeat) return;
    if (e.code === 'Space' || e.key === ' ') {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      this.#schlag(sek(e.timeStamp || performance.now()));
      return;
    }
    this.onTaste(e);
  }

  #istKnopf(e) {
    return !!(e.target && e.target.closest && e.target.closest('button, a, input, select, label, [data-kein-schlag]'));
  }

  #runter(e) {
    if (this.#istKnopf(e)) return;
    if (this.modus === 'tippen' || this.modus === 'handy') {
      e.preventDefault();
      const r = this.flaeche.getBoundingClientRect();
      this.#schlag(sek(e.timeStamp || performance.now()), null, e.clientX - r.left, e.clientY - r.top);
      return;
    }
    if (this.modus === 'geste') {
      e.preventDefault();
      try { this.flaeche.setPointerCapture(e.pointerId); } catch { /* egal */ }
      this.geste = null;
      this.#punkt(e.clientX, e.clientY, sek(e.timeStamp || performance.now()));
    }
  }

  #hoch() {
    this.geste = null;
  }

  // Maus dirigiert auch ohne gedrückte Taste, Finger nur bei Berührung
  #bewegt(e) {
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) this.#punkt(ev.clientX, ev.clientY, sek(ev.timeStamp || e.timeStamp || performance.now()));
  }

  // Gestenerkennung: tiefster Punkt einer Ab-auf-Bewegung ist ein Schlag.
  #punkt(cx, cy, t) {
    const r = this.flaeche.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    const H = Math.max(200, r.height);
    this.spur.push({ x, y, t });
    while (this.spur.length > 2 && t - this.spur[0].t > 0.75) this.spur.shift();
    this.onSpur(this.spur);
    const g = this.geste;
    const huerde = H * 0.022;
    if (!g) {
      this.geste = { richtung: 'runter', ext: y, extT: t, extX: x, oben: y };
      return;
    }
    if (g.richtung === 'runter') {
      if (y > g.ext) { g.ext = y; g.extT = t; g.extX = x; }
      else if (g.ext - y > huerde) {
        const amp = g.ext - g.oben;
        if (amp > H * 0.04) {
          const dyn = Math.max(0, Math.min(1, (amp / H - 0.05) / 0.42));
          this.#schlag(g.extT, dyn, g.extX, g.ext);
        }
        this.geste = { richtung: 'hoch', ext: y, extT: t, extX: x, oben: g.oben, unten: g.ext };
      }
    } else {
      if (y < g.ext) { g.ext = y; g.extT = t; }
      else if (y - g.ext > huerde) {
        this.geste = { richtung: 'runter', ext: y, extT: t, extX: x, oben: g.ext };
      }
    }
  }

  // Handy als Taktstock: Beschleunigungsspitzen sind Schläge.
  #motion(e) {
    const t = sek(e.timeStamp || performance.now());
    let ax, ay, az;
    if (e.acceleration && e.acceleration.x != null) {
      ({ x: ax, y: ay, z: az } = e.acceleration);
    } else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
      // Schwerkraft per Hochpass herausrechnen
      const g = e.accelerationIncludingGravity;
      const b = this.bewegung || (this.bewegung = { gx: g.x, gy: g.y, gz: g.z });
      b.gx += 0.08 * (g.x - b.gx); b.gy += 0.08 * (g.y - b.gy); b.gz += 0.08 * (g.z - b.gz);
      ax = g.x - b.gx; ay = g.y - b.gy; az = g.z - b.gz;
    } else return;
    const mag = Math.hypot(ax, ay, az);
    const m = this.motionZustand || (this.motionZustand = { vorher: 0, vorvorher: 0, tVorher: t, spitze: 8, letzte: 0 });
    // lokales Maximum über einer gleitenden Schwelle
    const schwelle = Math.max(4.5, m.spitze * 0.45);
    if (m.vorher > schwelle && m.vorher >= m.vorvorher && m.vorher > mag && m.tVorher - m.letzte > 0.22) {
      m.letzte = m.tVorher;
      m.spitze = m.spitze * 0.7 + m.vorher * 0.3;
      const dyn = Math.max(0, Math.min(1, (m.vorher - 4) / 22));
      this.#schlag(m.tVorher, dyn);
    }
    m.spitze = Math.max(6, m.spitze * 0.999);
    m.vorvorher = m.vorher;
    m.vorher = mag;
    m.tVorher = t;
    this.onSpur(null, mag);
  }
}
