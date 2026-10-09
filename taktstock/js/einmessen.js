// Einmess-Modus: Die Aufnahme läuft, du tippst mit, daraus wird die Beat-Map.
// Getippt wird über einen Ausschnitt oder das ganze Stück; nur dieser
// Ausschnitt der alten Karte wird ersetzt.

import { Karte, kartenMischen } from './karte.js';

const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export class Einmessen {
  constructor({ app, stueck, json, audio, klang, latenz, speichern, zuruecksetzen, fertig, spielen }) {
    Object.assign(this, { app, stueck, audio, klang, latenz, speichernFn: speichern, zuruecksetzenFn: zuruecksetzen, fertig, spielen });
    this.karte = json ? new Karte(json) : null;
    this.takt = this.karte ? this.karte.takt : 4;
    this.tempo = 1;
    this.ab = 0;
    this.zustand = 'bereit';
    this.taps = [];
    this.marken = [];
    this.markeNaechster = false;
    this.ergebnis = null;
    this.uhr = { ct: 0, t: 0, rate: 1 };
    this.aktiv = true;
    this.tasten = (e) => this.#taste(e);
    window.addEventListener('keydown', this.tasten);
  }

  beenden() {
    this.aktiv = false;
    window.removeEventListener('keydown', this.tasten);
    cancelAnimationFrame(this.raf);
    this.audio.pause();
  }

  zeigen() {
    const st = this.stueck;
    const dauer = this.audio.duration || (this.karte ? this.karte.beats[this.karte.anzahl - 1] + 2 : 0);
    this.app.innerHTML = `
      <header class="em-kopf">
        <button class="link" data-akt="zurueck">‹ Programm</button>
        <h1>Einmessen</h1>
        <p class="em-stueck"><b>${h(st.titel)}</b> · ${h(st.komponist)}</p>
      </header>
      <p class="em-text">Die Aufnahme läuft, du tippst jeden Schlag mit: Leertaste oder auf die Fläche. <kbd>T</kbd> oder „Taktanfang“ markiert den nächsten Schlag als Eins. Ersetzt wird nur der Abschnitt, den du eintippst.</p>
      <div class="em-optionen">
        <div class="gruppe"><span>Schläge pro Takt</span>${[1, 2, 3, 4, 6].map((n) => `<button data-takt="${n}" class="${n === this.takt ? 'an' : ''}">${n}</button>`).join('')}</div>
        <div class="gruppe"><span>Geschwindigkeit</span>${[1, 0.75, 0.5].map((n) => `<button data-tempo="${n}" class="${n === this.tempo ? 'an' : ''}">${Math.round(n * 100)} %</button>`).join('')}</div>
        <label class="gruppe ab"><span>Ab</span><input type="range" min="0" max="${Math.max(1, Math.floor(dauer))}" step="1" value="${this.ab}" id="em-ab"><b id="em-ab-wert">${mmss(this.ab)}</b></label>
      </div>
      <div class="em-flaeche" id="em-flaeche" tabindex="0">
        <canvas id="em-streifen"></canvas>
        <div class="em-zaehler"><b id="em-anzahl">0</b><span id="em-bpm">Schläge</span></div>
        <p class="em-status" id="em-status">Bereit.</p>
      </div>
      <div class="knoepfe em-knoepfe">
        <button class="haupt" data-akt="start" id="em-start">Aufnahme starten</button>
        <button data-akt="marke" id="em-marke" disabled>Taktanfang</button>
        <button data-akt="probe">Probehören mit Klick</button>
      </div>
      <div class="em-ergebnis" id="em-ergebnis"></div>
      <div class="knoepfe em-unten">
        <button data-akt="laden">Beat-Map als JSON herunterladen</button>
        ${this.zuruecksetzenFn ? '<button class="leise" data-akt="reset">Mitgelieferte Map wiederherstellen</button>' : ''}
      </div>`;
    this.cv = this.app.querySelector('#em-streifen');
    this.app.onclick = (e) => this.#klick(e);
    const ab = this.app.querySelector('#em-ab');
    ab.oninput = () => { this.ab = Number(ab.value); this.app.querySelector('#em-ab-wert').textContent = mmss(this.ab); };
    this.audio.addEventListener('loadedmetadata', () => { ab.max = Math.floor(this.audio.duration || 1); }, { once: true });
    const flaeche = this.app.querySelector('#em-flaeche');
    flaeche.addEventListener('pointerdown', (e) => { e.preventDefault(); this.#tap(e.timeStamp / 1000); });
    this.audio.onended = () => { if (this.zustand === 'aufnahme') this.#stopp(); else if (this.zustand === 'probe') this.#probeStopp(); };
    this.#schleife();
  }

  #klick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.takt) { this.takt = Number(b.dataset.takt); this.#gruppeAn(b); return; }
    if (b.dataset.tempo) { this.tempo = Number(b.dataset.tempo); this.#gruppeAn(b); return; }
    switch (b.dataset.akt) {
      case 'zurueck': this.fertig(); break;
      case 'start': if (this.zustand === 'aufnahme') this.#stopp(); else this.#start(); break;
      case 'marke': this.markeNaechster = true; this.#status('Nächster Schlag ist eine Eins.'); break;
      case 'probe': if (this.zustand === 'probe') this.#probeStopp(); else this.#probe(); break;
      case 'uebernehmen': this.#uebernehmen(); break;
      case 'verwerfen': this.ergebnis = null; this.app.querySelector('#em-ergebnis').innerHTML = ''; this.#status('Verworfen.'); break;
      case 'laden': this.#herunterladen(); break;
      case 'reset':
        if (confirm('Deine eingemessene Map löschen und die mitgelieferte verwenden?')) {
          this.zuruecksetzenFn();
          fetch(this.stueck.karte).then((r) => r.json()).then((j) => { this.karte = new Karte(j); this.#status('Mitgelieferte Map wiederhergestellt.'); });
        }
        break;
      case 'dirigieren': this.spielen(); break;
      default:
    }
  }

  #gruppeAn(b) { b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('an', x === b)); }
  #status(t) { const s = this.app.querySelector('#em-status'); if (s) s.textContent = t; }

  #taste(e) {
    if (!this.aktiv || e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); this.#tap(e.timeStamp / 1000); }
    else if (e.key === 't' || e.key === 'T') { if (this.zustand === 'aufnahme') { this.markeNaechster = true; this.#status('Nächster Schlag ist eine Eins.'); } }
    else if (e.key === 'Escape') { if (this.zustand === 'aufnahme') this.#stopp(); else if (this.zustand === 'probe') this.#probeStopp(); }
  }

  #audioZeit(t) {
    const a = this.audio, ct = a.currentTime;
    if (a.paused || ct !== this.uhr.ct) { this.uhr = { ct, t, rate: a.playbackRate }; return ct; }
    return ct + Math.min(0.25, t - this.uhr.t) * this.uhr.rate;
  }

  async #vorbereiten() {
    await this.klang.start();
    this.klang.verbinde(this.audio);
    this.klang.effekteZuruecksetzen();
    this.klang.blende(1, 0.05);
    this.audio.preservesPitch = true;
    this.audio.webkitPreservesPitch = true;
  }

  async #start() {
    await this.#vorbereiten();
    this.taps = [];
    this.marken = [];
    this.markeNaechster = true; // erster Schlag ist eine Eins
    this.ergebnis = null;
    this.app.querySelector('#em-ergebnis').innerHTML = '';
    this.audio.playbackRate = this.tempo;
    this.audio.currentTime = this.ab;
    try { await this.audio.play(); } catch { this.#status('Der Browser blockiert den Ton.'); return; }
    this.zustand = 'aufnahme';
    this.app.querySelector('#em-start').textContent = 'Stopp';
    this.app.querySelector('#em-marke').disabled = false;
    this.#status('Tippe mit. Der erste Schlag zählt als Eins.');
  }

  #tap(t) {
    if (this.zustand !== 'aufnahme') return;
    const pos = this.#audioZeit(t) - this.latenz() * this.audio.playbackRate;
    if (this.taps.length && pos - this.taps[this.taps.length - 1] < 0.12) return;
    if (this.markeNaechster) { this.marken.push(this.taps.length); this.markeNaechster = false; }
    this.taps.push(pos);
    this.pulse = 1;
    this.app.querySelector('#em-anzahl').textContent = this.taps.length;
    const n = this.taps.length;
    if (n >= 5) {
      const d = (this.taps[n - 1] - this.taps[n - 5]) / 4;
      this.app.querySelector('#em-bpm').textContent = `Schläge · ♩ ≈ ${Math.round(60 / d)}`;
    }
  }

  #stopp() {
    this.audio.pause();
    this.zustand = 'bereit';
    this.app.querySelector('#em-start').textContent = 'Aufnahme starten';
    this.app.querySelector('#em-marke').disabled = true;
    if (this.taps.length < 8) { this.#status('Zu wenige Schläge – mindestens acht.'); return; }
    const neu = kartenMischen(this.karte, this.taps, this.marken, this.takt);
    // Lautheit aus der alten Karte übernehmen (per Zeit), sonst neutral
    const lautheit = neu.beats.map((t) => {
      if (!this.karte) return 0.5;
      const i = Math.max(0, Math.min(this.karte.anzahl - 1, Math.floor(this.karte.pos(t))));
      return this.karte.lautheit[i];
    });
    const json = {
      version: 1,
      titel: this.karte ? this.karte.titel : this.stueck.titel,
      quelle: 'Einmess-Modus, ' + new Date().toISOString().slice(0, 10),
      takt: this.takt,
      beats: neu.beats.map((t) => Math.round(t * 1000) / 1000),
      takte: neu.takte,
      lautheit: lautheit.map((x) => Math.round(x * 1000) / 1000),
    };
    try {
      this.ergebnis = new Karte(json);
    } catch (err) {
      this.#status(err.message);
      return;
    }
    this.ergebnisJSON = json;
    const von = this.taps[0], bis = this.taps[this.taps.length - 1];
    const d = (bis - von) / (this.taps.length - 1);
    this.app.querySelector('#em-ergebnis').innerHTML = `
      <p><b>${this.taps.length}</b> Schläge von ${mmss(von)} bis ${mmss(bis)} eingetippt, im Mittel ♩ ≈ ${Math.round(60 / d)}.
      Die Karte hat jetzt ${json.beats.length} Schläge und ${json.takte.length} Takte.</p>
      <div class="knoepfe"><button class="haupt" data-akt="uebernehmen">Übernehmen &amp; speichern</button><button data-akt="probe">Probehören</button><button class="leise" data-akt="verwerfen">Verwerfen</button></div>`;
    this.#status('Fertig. Erst probehören, dann übernehmen.');
  }

  async #uebernehmen() {
    if (!this.ergebnisJSON) return;
    await this.speichernFn(this.ergebnisJSON);
    this.karte = this.ergebnis;
    this.ergebnis = null;
    this.app.querySelector('#em-ergebnis').innerHTML = '<p>Gespeichert. Ab jetzt dirigierst du mit dieser Beat-Map.</p><div class="knoepfe"><button class="haupt" data-akt="dirigieren">Jetzt dirigieren</button></div>';
  }

  async #probe() {
    const k = this.ergebnis || this.karte;
    if (!k) { this.#status('Noch keine Beat-Map.'); return; }
    await this.#vorbereiten();
    this.probeKarte = k;
    this.audio.playbackRate = 1;
    this.audio.currentTime = this.ab;
    try { await this.audio.play(); } catch { return; }
    this.zustand = 'probe';
    this.geplant = Math.ceil(k.pos(this.ab));
    this.#status('Probehören: Klick auf jedem Schlag, hell auf der Eins. Esc beendet.');
  }

  #probeStopp() {
    this.audio.pause();
    this.zustand = 'bereit';
    this.#status('Bereit.');
  }

  #herunterladen() {
    const k = this.ergebnis || this.karte;
    if (!k) return;
    const json = this.ergebnis ? this.ergebnisJSON : k.alsJSON();
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.stueck.eigen ? 'eigen' : this.stueck.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  #schleife() {
    const bild = () => {
      if (!this.aktiv) return;
      const t = performance.now() / 1000;
      const pos = this.#audioZeit(t);
      if (this.zustand === 'probe') {
        const k = this.probeKarte;
        const rate = this.audio.playbackRate || 1;
        while (this.geplant < k.anzahl && k.beats[this.geplant] - pos < 0.12) {
          const bt = k.beats[this.geplant];
          if (bt >= pos - 0.02) this.klang.klick(this.klang.jetzt() + Math.max(0, (bt - pos) / rate), k.istTaktanfang(this.geplant));
          this.geplant++;
        }
      }
      this.#zeichnen(pos);
      this.raf = requestAnimationFrame(bild);
    };
    this.raf = requestAnimationFrame(bild);
  }

  #zeichnen(pos) {
    const cv = this.cv;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const fenster = 6;
    const X = (t) => r.width / 2 + ((t - pos) / fenster) * r.width;
    const k = this.ergebnis || this.karte;
    if (k) {
      for (let i = 0; i < k.anzahl; i++) {
        const x = X(k.beats[i]);
        if (x < -5 || x > r.width + 5) continue;
        const eins = k.istTaktanfang(i);
        g.fillStyle = eins ? 'rgba(242,231,207,0.75)' : 'rgba(242,231,207,0.35)';
        g.fillRect(x - 1, r.height * (eins ? 0.15 : 0.3), 2, r.height * (eins ? 0.3 : 0.15));
      }
    }
    const marken = new Set(this.marken);
    this.taps.forEach((t, i) => {
      const x = X(t);
      if (x < -5 || x > r.width + 5) return;
      g.fillStyle = marken.has(i) ? '#ffcf7a' : '#d6a03c';
      g.fillRect(x - 1.5, r.height * 0.55, 3, r.height * (marken.has(i) ? 0.35 : 0.25));
    });
    this.pulse = (this.pulse || 0) * 0.85;
    g.fillStyle = `rgba(255,207,122,${0.5 + 0.5 * this.pulse})`;
    g.fillRect(r.width / 2 - 1, 0, 2, r.height);
    g.font = '600 11px Inter, system-ui, sans-serif';
    g.fillStyle = 'rgba(242,231,207,0.7)';
    g.fillText(mmss(Math.max(0, pos)), r.width / 2 + 6, 14);
    g.fillText('alte Map', 6, 14);
    g.fillText('deine Schläge', 6, r.height - 6);
  }
}
