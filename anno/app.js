// ANNO – GeoGuessr für die deutsche Sprachgeschichte.
// Reines JavaScript ohne Build. Die Passagen liegen in data/passages.json (Index)
// und data/passages/<werk>.json; erzeugt von scripts/build_passages.py.
'use strict';

const JAHR_MIN = 1600;
const JAHR_MAX = 1900;
const RUNDEN = 5;
const MAX_JAHR = 4000;   // Punkte für das exakte Jahr
const ABFALL = 35;       // 4000 · e^(−Abstand/35)

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const stand = $('#stand');

// ---------------------------------------------------------------- Hilfen

const zahl = (n) => n.toLocaleString('de-DE');
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));
const anteil = (jahr) => ((jahr - JAHR_MIN) / (JAHR_MAX - JAHR_MIN)) * 100;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const punkteFuerJahr = (abstand) => Math.round(MAX_JAHR * Math.exp(-abstand / ABFALL));

function jahreText(d) {
  if (d === 0) return 'aufs Jahr genau';
  return d === 1 ? '1 Jahr daneben' : `${d} Jahre daneben`;
}

// Deterministischer Zufall: gleicher Seed, gleiche Passagen.
function hash32(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neuerSeed() {
  const z = new Uint32Array(2);
  crypto.getRandomValues(z);
  return z[0].toString(36) + z[1].toString(36);
}

function hochzaehlen(el, ziel, dauer = 1200) {
  const start = performance.now();
  const schritt = (jetzt) => {
    const t = Math.min(1, (jetzt - start) / dauer);
    el.textContent = zahl(Math.round(ziel * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(schritt);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) el.textContent = zahl(ziel);
  else requestAnimationFrame(schritt);
}

// ---------------------------------------------------------------- Daten

let indexDaten = null;
const werkCache = new Map();

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function ladeIndex() {
  if (!indexDaten) indexDaten = await json('data/passages.json');
  return indexDaten;
}

function ladeWerk(id) {
  if (!werkCache.has(id)) {
    const p = json(`data/passages/${encodeURIComponent(id)}.json`);
    p.catch(() => werkCache.delete(id));
    werkCache.set(id, p);
  }
  return werkCache.get(id);
}

function seitenUrl(werk, seite) {
  return indexDaten.quelle.seite
    .replace('{id}', encodeURIComponent(werk.id))
    .replace('{seite}', encodeURIComponent(seite));
}

// ---------------------------------------------------------------- Text

function zeilen(s) {
  return esc(s)
    .replace(/⟨([^⟩]*)⟩/g, '<em class="regie">$1</em>')
    .replace(/\n/g, '<br>');
}

function absatzHtml(a) {
  if (typeof a === 'string') {
    return `<p${a.includes('\n') ? ' class="vers"' : ''}>${zeilen(a)}</p>`;
  }
  if ('sp' in a) {
    const vers = a.t.includes('\n') ? ' vers' : '';
    return `<p class="rede${vers}"><span class="sprecher">${esc(a.sp)}</span> ${zeilen(a.t)}</p>`;
  }
  return `<p class="regie">${esc(a.st)}</p>`;
}

const passageHtml = (absaetze) => absaetze.map(absatzHtml).join('');

function gattungText(werk) {
  return [werk.gattung, werk.untergattung].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- Zeitleiste

function strichHtml() {
  let s = '';
  for (let j = JAHR_MIN; j <= JAHR_MAX; j += 10) {
    const art = j % 100 === 0 ? 'j100' : j % 50 === 0 ? 'j50' : 'j10';
    s += `<span class="zl-strich ${art}" style="left:${anteil(j)}%"></span>`;
    if (j % 50 === 0) s += `<span class="zl-zahl ${art}" style="left:${anteil(j)}%">${j}</span>`;
  }
  return s;
}

class Zeitleiste {
  constructor(el, { beiAenderung = () => {}, beiEingabe = () => {} } = {}) {
    this.el = el;
    this.jahr = null;
    this.gesperrt = false;
    this.ziehen = false;
    this.puffer = '';
    this.beiAenderung = beiAenderung;
    this.beiEingabe = beiEingabe;
    el.classList.add('zl');
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', 'Erscheinungsjahr');
    el.setAttribute('aria-valuemin', JAHR_MIN);
    el.setAttribute('aria-valuemax', JAHR_MAX);
    el.setAttribute('aria-valuetext', 'noch kein Jahr gewählt');
    el.innerHTML = `
      <div class="zl-flaeche">
        <span class="zl-spur"></span>
        ${strichHtml()}
        <span class="zl-strecke" hidden></span>
        <span class="zl-schatten" hidden><span></span></span>
        <span class="zl-pin zl-tipp" hidden><span class="zl-fahne"></span></span>
        <span class="zl-pin zl-loesung" hidden><span class="zl-fahne"></span></span>
      </div>`;
    this.flaeche = $('.zl-flaeche', el);
    this.tippPin = $('.zl-tipp', el);
    this.schattenEl = $('.zl-schatten', el);

    el.addEventListener('pointerdown', (e) => {
      if (this.gesperrt || e.button > 0) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      this.ziehen = true;
      el.setPointerCapture(e.pointerId);
      this.schatten(null);
      this.setzen(this.jahrBei(e.clientX));
    });
    el.addEventListener('pointermove', (e) => {
      if (this.gesperrt) return;
      if (this.ziehen) this.setzen(this.jahrBei(e.clientX));
      else if (e.pointerType === 'mouse') this.schatten(this.jahrBei(e.clientX));
    });
    const ende = () => { this.ziehen = false; };
    el.addEventListener('pointerup', ende);
    el.addEventListener('pointercancel', ende);
    el.addEventListener('pointerleave', () => this.schatten(null));
    el.addEventListener('keydown', (e) => this.taste(e));
  }

  jahrBei(x) {
    const r = this.flaeche.getBoundingClientRect();
    return Math.round(JAHR_MIN + klemmen((x - r.left) / r.width, 0, 1) * (JAHR_MAX - JAHR_MIN));
  }

  taste(e) {
    if (this.gesperrt || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      this.puffer = (this.puffer + e.key).slice(0, 4);
      clearTimeout(this.pufferZeit);
      if (this.puffer.length === 4) {
        const j = Number(this.puffer);
        this.puffer = '';
        this.setzen(j);
      } else {
        this.beiEingabe(this.puffer);
        this.pufferZeit = setTimeout(() => { this.puffer = ''; this.beiAenderung(this.jahr); }, 2500);
      }
      return;
    }
    const schritt = e.shiftKey ? 10 : 1;
    const j = this.jahr ?? 1750;
    const neu = {
      ArrowLeft: j - schritt, ArrowDown: j - schritt,
      ArrowRight: j + schritt, ArrowUp: j + schritt,
      PageDown: j - 10, PageUp: j + 10,
      Home: JAHR_MIN, End: JAHR_MAX,
    }[e.key];
    if (neu === undefined) return;
    e.preventDefault();
    this.puffer = '';
    this.setzen(this.jahr == null && e.key.startsWith('Arrow') ? 1750 : neu);
  }

  setzen(jahr) {
    if (this.gesperrt) return;
    jahr = klemmen(Math.round(jahr), JAHR_MIN, JAHR_MAX);
    this.jahr = jahr;
    this.tippPin.hidden = false;
    this.tippPin.style.left = `${anteil(jahr)}%`;
    $('.zl-fahne', this.tippPin).textContent = jahr;
    this.el.setAttribute('aria-valuenow', jahr);
    this.el.setAttribute('aria-valuetext', String(jahr));
    this.beiAenderung(jahr);
  }

  schatten(jahr) {
    const s = this.schattenEl;
    if (jahr == null || this.gesperrt) { s.hidden = true; return; }
    s.hidden = false;
    s.style.left = `${anteil(jahr)}%`;
    s.firstElementChild.textContent = jahr;
  }

  aufloesen(loesung) {
    this.gesperrt = true;
    this.schatten(null);
    this.el.classList.add('gesperrt');
    this.el.tabIndex = -1;
    this.el.setAttribute('aria-disabled', 'true');
    const tipp = this.jahr;
    const strecke = $('.zl-strecke', this.el);
    const pin = $('.zl-loesung', this.el);
    $('.zl-fahne', pin).textContent = loesung;
    pin.style.left = `${anteil(loesung)}%`;
    strecke.hidden = false;
    strecke.style.left = `${anteil(tipp)}%`;
    strecke.style.width = '0';
    strecke.getBoundingClientRect();
    strecke.classList.add('laeuft');
    strecke.style.left = `${anteil(Math.min(tipp, loesung))}%`;
    strecke.style.width = `${Math.abs(anteil(loesung) - anteil(tipp))}%`;
    const dauer = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750;
    setTimeout(() => { pin.hidden = false; pin.classList.add('auftauchen'); }, dauer);
  }
}

function miniLeiste(r, i) {
  const t = anteil(r.tipp);
  const l = anteil(r.werk.jahr);
  return `
    <div class="mini">
      <span class="mini-nr">${i + 1}</span>
      <span class="mini-spur">
        <span class="mini-strecke" style="left:${Math.min(t, l)}%;width:${Math.abs(t - l)}%"></span>
        <span class="mini-punkt tipp" style="left:${t}%" title="Dein Tipp: ${r.tipp}"></span>
        <span class="mini-punkt loesung" style="left:${l}%" title="Erschienen: ${r.werk.jahr}"></span>
      </span>
    </div>`;
}

function miniAchse() {
  let s = '';
  for (let j = JAHR_MIN; j <= JAHR_MAX; j += 50) {
    s += `<span class="${j % 100 ? 'j50' : 'j100'}" style="left:${anteil(j)}%">${j}</span>`;
  }
  return `<div class="mini mini-achse"><span class="mini-nr"></span><span class="mini-spur">${s}</span></div>`;
}

// ---------------------------------------------------------------- Spiel

let spiel = null;
let zeitleiste = null;

const summe = () => spiel.runden.reduce((s, r) => s + (r.punkte ?? 0), 0);

function standZeigen() {
  if (!spiel) { stand.innerHTML = ''; return; }
  const runde = spiel.runde < RUNDEN ? `Runde ${spiel.runde + 1} von ${RUNDEN}` : 'Auswertung';
  stand.innerHTML = `<span>${runde}</span><span class="stand-punkte">${zahl(summe())}</span>`;
}

async function spielStarten() {
  app.innerHTML = '<p class="laden">Passagen werden geladen …</p>';
  try {
    const index = await ladeIndex();
    const seed = neuerSeed();
    const rng = mulberry32(hash32(seed));
    const werke = index.werke;
    const gesamt = werke.reduce((s, w) => s + w.n, 0);
    const wahl = [];
    const ids = new Set();
    while (wahl.length < RUNDEN) {
      let r = Math.floor(rng() * gesamt);
      let w = werke[0];
      for (w of werke) {
        if (r < w.n) break;
        r -= w.n;
      }
      if (ids.has(w.id)) continue;
      ids.add(w.id);
      wahl.push({ id: w.id, nr: r });
    }
    const daten = await Promise.all(wahl.map((w) => ladeWerk(w.id)));
    spiel = {
      seed,
      runde: 0,
      runden: wahl.map((w, k) => ({ werk: daten[k], passage: daten[k].passagen[w.nr], tipp: null, punkte: null })),
    };
    rundeZeigen();
  } catch (err) {
    fehler(err);
  }
}

function rundeZeigen() {
  const r = spiel.runden[spiel.runde];
  standZeigen();
  app.innerHTML = `
    <section class="runde">
      <article class="blatt passage" lang="de" aria-label="Passage">${passageHtml(r.passage.text)}</article>
      <div class="dock" id="dock">
        <div class="dock-zeile">
          <span class="frage">Wann ist das erschienen?</span>
          <button class="knopf haupt" id="tippen" disabled>Tippen</button>
        </div>
        <div id="zl"></div>
        <div class="dock-zeile fein" role="group" aria-label="Jahr feinjustieren">
          <button class="knopf klein" data-d="-10" aria-label="10 Jahre früher">−10</button>
          <button class="knopf klein" data-d="-1" aria-label="1 Jahr früher">−1</button>
          <output class="jahr-anzeige" id="jahr" aria-live="polite">····</output>
          <button class="knopf klein" data-d="1" aria-label="1 Jahr später">+1</button>
          <button class="knopf klein" data-d="10" aria-label="10 Jahre später">+10</button>
        </div>
      </div>
      <div id="aufloesung"></div>
    </section>`;
  window.scrollTo(0, 0);
  const anzeige = $('#jahr');
  const knopf = $('#tippen');
  zeitleiste = new Zeitleiste($('#zl'), {
    beiAenderung: (j) => {
      anzeige.textContent = j ?? '····';
      anzeige.classList.toggle('gesetzt', j != null);
      knopf.disabled = j == null;
    },
    beiEingabe: (p) => {
      anzeige.textContent = p.padEnd(4, '·');
      anzeige.classList.remove('gesetzt');
    },
  });
  for (const b of $$('.fein [data-d]')) {
    b.addEventListener('click', () => {
      zeitleiste.setzen((zeitleiste.jahr ?? 1750) + (zeitleiste.jahr == null ? 0 : Number(b.dataset.d)));
    });
  }
  knopf.addEventListener('click', tippen);
}

function tippen() {
  const r = spiel.runden[spiel.runde];
  if (r.tipp != null || zeitleiste.jahr == null) return;
  const w = r.werk;
  r.tipp = zeitleiste.jahr;
  r.abstand = Math.abs(r.tipp - w.jahr);
  r.punkte = punkteFuerJahr(r.abstand);
  const letzte = spiel.runde === RUNDEN - 1;

  $('#dock').classList.add('fertig');
  zeitleiste.aufloesen(w.jahr);
  const titel = w.untertitel ? `${esc(w.titel)}. <span class="untertitel">${esc(w.untertitel)}</span>` : esc(w.titel);
  const auflage = w.auflage > 1 ? ` · ${w.auflage}. Auflage` : '';
  $('#aufloesung').innerHTML = `
    <div class="blatt ergebnis">
      <div class="loesung-kopf">
        <div>
          <span class="loesung-jahr">${w.jahr}</span>
          <span class="abstand">${jahreText(r.abstand)}</span>
        </div>
        <div class="punkte"><span id="punkte">0</span><small>von ${zahl(MAX_JAHR)}</small></div>
      </div>
      <p class="werk-autor">${esc(w.autor)}</p>
      <p class="werk-titel"><cite>${titel}</cite></p>
      <p class="werk-meta">${esc(gattungText(w))}${w.ort ? ` · ${esc(w.ort)}` : ''}${auflage}</p>
      ${w.hinweis ? `<p class="werk-hinweis">${esc(w.hinweis)}</p>` : ''}
      <p class="werk-link"><a href="${esc(seitenUrl(w, r.passage.seite))}" target="_blank" rel="noopener">Diese Stelle im Faksimile ansehen (Deutsches Textarchiv)&nbsp;↗</a></p>
    </div>
    <div class="weiter-zeile"><button class="knopf haupt" id="weiter">${letzte ? 'Zur Auswertung' : 'Nächste Runde'}</button></div>`;
  hochzaehlen($('#punkte'), r.punkte);
  standZeigen();
  $('#weiter').addEventListener('click', weiter);
  $('#dock').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $('#weiter').focus({ preventScroll: true });
}

function weiter() {
  spiel.runde += 1;
  if (spiel.runde < RUNDEN) rundeZeigen();
  else auswertung();
}

function auswertung() {
  standZeigen();
  const gesamt = summe();
  const schnitt = spiel.runden.reduce((s, r) => s + r.abstand, 0) / RUNDEN;
  app.innerHTML = `
    <section class="auswertung">
      <h1 class="seitentitel">Auswertung</h1>
      <p class="gesamt"><span id="gesamt">0</span> <small>von ${zahl(RUNDEN * MAX_JAHR)} Punkten</small></p>
      <p class="schnitt">Im Schnitt ${zahl(Math.round(schnitt * 10) / 10)} Jahre daneben</p>
      <div class="blatt uebersicht" aria-label="Alle Tipps auf der Zeitleiste">
        ${spiel.runden.map(miniLeiste).join('')}
        ${miniAchse()}
        <p class="legende"><span class="mini-punkt tipp"></span> dein Tipp <span class="mini-punkt loesung"></span> erschienen</p>
      </div>
      <ol class="rueckblick">
        ${spiel.runden.map((r, i) => `
          <li class="blatt">
            <div class="rb-kopf">
              <span class="rb-nr">${i + 1}</span>
              <span class="rb-werk"><span class="werk-autor">${esc(r.werk.autor)}</span>
                <cite>${esc(r.werk.titel)}</cite> <span class="rb-jahr">${r.werk.jahr}</span></span>
              <span class="rb-punkte">${zahl(r.punkte)}</span>
            </div>
            <p class="rb-meta">Dein Tipp ${r.tipp}, ${jahreText(r.abstand)} · ${esc(gattungText(r.werk))} ·
              <a href="${esc(seitenUrl(r.werk, r.passage.seite))}" target="_blank" rel="noopener">Faksimile&nbsp;↗</a></p>
            <div class="passage klein" lang="de">${passageHtml(r.passage.text)}</div>
          </li>`).join('')}
      </ol>
      <div class="weiter-zeile"><button class="knopf haupt" id="nochmal">Neues Spiel</button></div>
    </section>`;
  window.scrollTo(0, 0);
  hochzaehlen($('#gesamt'), gesamt, 1500);
  $('#nochmal').addEventListener('click', spielStarten);
}

// ---------------------------------------------------------------- Startseite

function startseite() {
  spiel = null;
  standZeigen();
  app.innerHTML = `
    <section class="start">
      <h1 class="titel">ANNO</h1>
      <p class="unterzeile">GeoGuessr für die deutsche Sprachgeschichte</p>
      <div class="blatt passage start-text">
        <p>Du bekommst eine Passage aus einem echten Druck zwischen 1600 und 1900, in der Schreibung des Originals:
          mit langem ſ, mit uͤ und aͤ, mit Virgeln (/), wo heute Kommas stehen.</p>
        <p>Setze einen Pin auf die Zeitleiste. Gewertet wird wie bei GeoGuessr nach dem Abstand, nur in Jahren statt
          Kilometern: bis zu ${zahl(MAX_JAHR)} Punkte pro Runde, ${RUNDEN} Runden.</p>
      </div>
      <div class="weiter-zeile"><button class="knopf haupt" id="los">Spiel starten</button></div>
      <details class="ueber" id="ueber">
        <summary>Über ANNO</summary>
        <div class="ueber-text">
          <p><strong>Texte.</strong> Alle Passagen stammen aus dem Kernkorpus des
            <a href="https://www.deutschestextarchiv.de/" target="_blank" rel="noopener">Deutschen Textarchivs</a> (DTA)
            der Berlin-Brandenburgischen Akademie der Wissenschaften, Fassung vom 10.&nbsp;Februar 2026<span id="umfang"></span>.
            Die Volltexte stehen unter der Lizenz
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener">CC BY-SA 4.0</a>;
            Urheber der elektronischen Fassung ist das Deutsche Textarchiv. Die daraus gewonnenen Passagen stehen unter derselben Lizenz.</p>
          <p><strong>Zitierempfehlung des DTA.</strong> Deutsches Textarchiv. Grundlage für ein Referenzkorpus der neuhochdeutschen Sprache.
            Herausgegeben von der Berlin-Brandenburgischen Akademie der Wissenschaften, Berlin 2026.</p>
          <p><strong>Auswahl.</strong> Pro Werk zehn bis fünfzehn zufällige Stellen aus dem Haupttext, 80 bis 150 Wörter lang.
            Titelei, Vorreden, Widmungen, Register, Fußnoten, Tabellen, Kolumnentitel, Bogensignaturen und Kustoden sind ausgenommen,
            ebenso Stellen, die Autor, Titel oder das Erscheinungsjahr nennen. Die Silbentrennung am Zeilenende ist aufgelöst, sonst
            steht alles so da wie im Druck.</p>
          <p><strong>Faksimiles.</strong> Die Links führen zur jeweiligen Seite im DTA. Die Rechte an den Bilddigitalisaten liegen bei den besitzenden Bibliotheken.</p>
          <p><strong>Schriften.</strong> EB Garamond (Georg Duffner, Octavio Pardo) und Cardo (David J. Perry), beide unter der SIL Open Font License.</p>
        </div>
      </details>
    </section>`;
  $('#los').addEventListener('click', spielStarten);
  ladeIndex().then((index) => {
    const passagen = index.werke.reduce((s, w) => s + w.n, 0);
    const umfang = $('#umfang');
    if (umfang) umfang.textContent = `; im Spiel ${zahl(index.werke.length)} Werke mit ${zahl(passagen)} Passagen`;
  }).catch(() => {});
}

function fehler(err) {
  spiel = null;
  standZeigen();
  const lokal = location.protocol === 'file:';
  app.innerHTML = `
    <section class="start">
      <div class="blatt">
        <p><strong>Die Passagen konnten nicht geladen werden.</strong></p>
        ${lokal ? '<p>ANNO muss über einen lokalen Server laufen, nicht als Datei. Im Ordner <code>anno/</code>:</p><pre>python3 -m http.server 8000</pre><p>und dann <code>http://localhost:8000</code> öffnen.</p>' : ''}
        <p class="klein">${esc(err.message || err)}</p>
      </div>
      <div class="weiter-zeile"><button class="knopf haupt" id="nochmal">Nochmal versuchen</button></div>
    </section>`;
  $('#nochmal').addEventListener('click', spielStarten);
}

// Enter: tippen bzw. weiter (außer auf Knöpfen und Links, die das selbst tun)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !spiel || spiel.runde >= RUNDEN) return;
  if (e.target.closest('button, a, input, select, textarea, summary')) return;
  const r = spiel.runden[spiel.runde];
  e.preventDefault();
  if (r.tipp == null) tippen();
  else weiter();
});

$('.marke').addEventListener('click', (e) => {
  if (spiel && spiel.runde < RUNDEN && !confirm('Laufendes Spiel abbrechen?')) e.preventDefault();
});

startseite();
