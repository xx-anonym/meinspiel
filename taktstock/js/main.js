import { Karte } from './karte.js';
import { Klang } from './klang.js';
import { Dirigent } from './dirigent.js';
import { Eingabe } from './eingabe.js';
import { Partitur } from './partitur.js';
import { Orchester } from './orchester.js';
import { STUECKE, STUECK } from './stuecke.js';
import { kritikSchreiben, applausFuer } from './kritik.js';
import * as speicher from './speicher.js';
import { Einmessen } from './einmessen.js';
import { autoKarte } from './autokarte.js';

const app = document.getElementById('app');
const klang = new Klang();
let einst = speicher.einstellungen();
klang.direktModus = !!einst.direkt; // gilt bis zum Neuladen
let laufend = null; // aktuelle Vorstellung

const MODI = {
  tippen: { name: 'Tippen', text: 'Tippen, Klicken oder Leertaste – jeder Druck ist ein Schlag.' },
  geste: { name: 'Geste', text: 'Taktstock mit Maus oder Finger führen. Tiefster Punkt = Schlag, Größe = Lautstärke.' },
  handy: { name: 'Handy', text: 'Das Handy ist der Taktstock: Jeder Ruck ist ein Schlag, die Wucht ist die Lautstärke.' },
};

const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function gruss() {
  const std = new Date().getHours();
  const zeit = std < 5 ? 'Gute Nacht' : std < 11 ? 'Guten Morgen' : std < 17 ? 'Guten Tag' : 'Guten Abend';
  return einst.name ? `${zeit}, ${einst.name}.` : `${zeit}.`;
}

function stoecke(n, max = 4) {
  let s = '';
  for (let i = 1; i <= max; i++) s += `<span class="stock ${i <= n ? 'an' : ''}"></span>`;
  return `<span class="stoecke" title="Schwierigkeit ${n} von ${max}">${s}</span>`;
}

// ---------------------------------------------------------------- Titel

async function titel() {
  aufraeumen();
  const best = speicher.bestwerte();
  const eigene = await speicher.eigeneListe();
  app.className = 'titel';
  app.innerHTML = `
    <header class="kopf">
      <p class="ueber">Dirigierspiel mit echten Orchesteraufnahmen</p>
      <h1>Taktstock</h1>
      <p class="unter">${h(gruss())} Du gibst den Schlag, die Aufnahme folgt deinem Tempo, und das Publikum hat eine Meinung dazu.</p>
    </header>

    <section class="modi" aria-label="Steuerung">
      ${Object.entries(MODI).map(([k, m]) => `
        <button class="modus ${einst.modus === k ? 'an' : ''}" data-modus="${k}" aria-pressed="${einst.modus === k}">
          <span class="modus-name">${m.name}</span>
          <span class="modus-text">${m.text}</span>
        </button>`).join('')}
    </section>

    <section class="programm" aria-label="Programm">
      <h2>Programm</h2>
      ${STUECKE.map((s) => {
        const b = best[s.id], fr = best['frei:' + s.id];
        return `
        <article class="karte-stueck" data-id="${s.id}">
          <div class="nr">${s.nr}</div>
          <div class="info">
            <p class="komponist">${h(s.komponist)}</p>
            <h3>${h(s.titel)} <span class="zusatz">${h(s.zusatz)}</span></h3>
            <p class="ensemble">${h(s.ensemble)} · ${h(s.jahr)}</p>
            <p class="beschreibung">${h(s.beschreibung)}</p>
            <p class="meta">${stoecke(s.schwierigkeit)}
              ${b ? `<span class="best">Bestwert <b>${b.punkte}</b></span>` : '<span class="best leer">noch nicht dirigiert</span>'}
              ${fr ? `<span class="best">Freies Spiel bis <b>${fr.punkte} %</b></span>` : ''}</p>
          </div>
          <div class="knoepfe">
            <button class="haupt" data-akt="spielen" data-id="${s.id}">Dirigieren</button>
            <button data-akt="frei" data-id="${s.id}">Freies Spiel</button>
            <button class="leise" data-akt="einmessen" data-id="${s.id}">Einmessen</button>
          </div>
        </article>`;
      }).join('')}
    </section>

    <section class="eigenes" aria-label="Eigenes Stück">
      <h2>Eigenes Stück</h2>
      <label class="ablage" id="ablage">
        <input type="file" accept="audio/*" id="datei" hidden>
        <span class="ablage-titel">Audiodatei hierher ziehen oder auswählen</span>
        <span class="ablage-text">MP3, M4A, OGG, WAV. Die Datei bleibt in deinem Browser und wird nirgends hochgeladen.</span>
      </label>
      <div class="eigene-liste">
        ${eigene.map((e) => `
          <div class="eigen" data-id="${h(e.id)}">
            <span class="eigen-name">${h(e.name)}</span>
            ${best['eigen:' + e.id] ? `<span class="best">Bestwert <b>${best['eigen:' + e.id].punkte}</b></span>` : ''}
            <span class="eigen-knoepfe">
              <button data-akt="eigenSpielen" data-id="${h(e.id)}">Dirigieren</button>
              <button data-akt="eigenFrei" data-id="${h(e.id)}">Frei</button>
              <button data-akt="eigenEinmessen" data-id="${h(e.id)}">Einmessen</button>
              <button class="leise" data-akt="eigenLoeschen" data-id="${h(e.id)}" aria-label="Löschen">✕</button>
            </span>
          </div>`).join('')}
      </div>
    </section>

    <footer class="fuss">
      <button class="link" data-akt="anleitung">So geht’s</button>
      <button class="link" data-akt="einstellungen">Einstellungen</button>
      <button class="link" data-akt="credits">Aufnahmen &amp; Lizenzen</button>
    </footer>`;

  app.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.modus) {
      einst.modus = b.dataset.modus;
      speicher.einstellungenSpeichern(einst);
      app.querySelectorAll('.modus').forEach((m) => { m.classList.toggle('an', m === b); m.setAttribute('aria-pressed', m === b); });
      return;
    }
    const id = b.dataset.id;
    switch (b.dataset.akt) {
      case 'spielen': return vorstellung(STUECK[id], { frei: false });
      case 'frei': return vorstellung(STUECK[id], { frei: true });
      case 'einmessen': return einmessen(STUECK[id]);
      case 'eigenSpielen': return vorstellung(await eigenesStueck(id), { frei: false });
      case 'eigenFrei': return vorstellung(await eigenesStueck(id), { frei: true });
      case 'eigenEinmessen': return einmessen(await eigenesStueck(id));
      case 'eigenLoeschen':
        if (confirm('Dieses Stück aus dem Browser löschen?')) { await speicher.eigenesLoeschen(id); titel(); }
        return;
      case 'anleitung': return anleitung();
      case 'einstellungen': return einstellungen();
      case 'credits': return credits();
      default:
    }
  };

  const ablage = app.querySelector('#ablage');
  const datei = app.querySelector('#datei');
  datei.onchange = () => { if (datei.files[0]) dateiAufnehmen(datei.files[0]); };
  ablage.ondragover = (e) => { e.preventDefault(); ablage.classList.add('ueber'); };
  ablage.ondragleave = () => ablage.classList.remove('ueber');
  ablage.ondrop = (e) => {
    e.preventDefault();
    ablage.classList.remove('ueber');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) dateiAufnehmen(f);
  };
}

// Drag & Drop irgendwo auf der Titelseite
window.addEventListener('dragover', (e) => { if (app.className === 'titel') e.preventDefault(); });
window.addEventListener('drop', (e) => {
  if (app.className !== 'titel' || e.target.closest('#ablage')) return;
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) dateiAufnehmen(f);
});

async function dateiAufnehmen(file) {
  if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(file.name)) {
    meldung('Das sieht nicht nach einer Audiodatei aus.');
    return;
  }
  const dlg = dialog(`<h2>${h(file.name)}</h2><p class="lade">Ich höre mir das Stück an und suche die Schläge …</p><div class="balken"><i></i></div>`, { schliessbar: false });
  try {
    const karte = await autoKarte(file, (p) => { const i = dlg.querySelector('.balken i'); if (i) i.style.width = `${Math.round(p * 100)}%`; });
    const id = 'e' + Date.now().toString(36);
    const name = file.name.replace(/\.[^.]+$/, '');
    karte.titel = name;
    await speicher.eigenesSpeichern({ id, name, datum: Date.now(), blob: file, karte });
    dlg.innerHTML = `<h2>${h(name)}</h2>
      <p>Erster Entwurf der Beat-Map: <b>${karte.beats.length}</b> Schläge, etwa <b>${Math.round(60 / median(karte.beats))}</b> pro Minute.</p>
      <p class="klein">Automatisch erkannt – bei Klassik oft daneben. Im Einmess-Modus tippst du die Schläge selbst mit; das dauert so lange wie das Stück und macht alles danach besser.</p>
      <div class="knoepfe"><button class="haupt" data-x="ein">Einmessen</button><button data-x="los">Gleich dirigieren</button><button class="leise" data-x="zu">Später</button></div>`;
    dlg.onclick = async (e) => {
      const x = e.target.dataset.x;
      if (!x) return;
      dialogZu();
      const st = await eigenesStueck(id);
      if (x === 'ein') einmessen(st);
      else if (x === 'los') vorstellung(st, { frei: false });
      else titel();
    };
  } catch (err) {
    console.error(err);
    dlg.innerHTML = `<h2>Das hat nicht geklappt</h2><p>${h(err.message || 'Die Datei ließ sich nicht dekodieren.')}</p><div class="knoepfe"><button data-x="zu">Schade</button></div>`;
    dlg.onclick = (e) => { if (e.target.dataset.x) { dialogZu(); titel(); } };
  }
}

function median(beats) {
  const d = beats.slice(1).map((t, i) => t - beats[i]).sort((a, b) => a - b);
  return d[d.length >> 1] || 0.6;
}

async function eigenesStueck(id) {
  const e = await speicher.eigenesLesen(id);
  if (!e) throw new Error('Stück nicht gefunden');
  return {
    id: 'eigen:' + e.id,
    eigenId: e.id,
    eigen: true,
    titel: e.name,
    zusatz: '',
    komponist: 'Eigenes Stück',
    ensemble: 'aus deiner Sammlung',
    jahr: '',
    blob: e.blob,
    kartenJSON: e.karte,
    schwierigkeit: 0,
    toleranz: 0.13,
    hinweise: [],
  };
}

// ---------------------------------------------------------------- Laden

async function karteLaden(stueck) {
  if (stueck.eigen) return stueck.kartenJSON;
  const lokal = speicher.karteLesen(stueck.id);
  if (lokal) return lokal;
  const r = await fetch(stueck.karte);
  if (!r.ok) throw new Error('Beat-Map fehlt: ' + stueck.karte);
  return r.json();
}

// Die Aufnahme kommt komplett als Blob in den Speicher. So lässt sich darin
// überall hin springen, auch wenn der Server keine Range-Anfragen kann
// (python -m http.server kann es nicht).
const audioCache = new Map();
async function audioQuelle(stueck) {
  const schluessel = stueck.eigen ? stueck.id : stueck.audio;
  if (audioCache.has(schluessel)) return audioCache.get(schluessel);
  let blob = stueck.blob;
  if (!blob) {
    const r = await fetch(stueck.audio);
    if (!r.ok) throw new Error('Aufnahme fehlt: ' + stueck.audio);
    blob = await r.blob();
  }
  const url = URL.createObjectURL(blob);
  audioCache.set(schluessel, url);
  return url;
}

let audioEl = null;
function audioElement() {
  // Ein Element für alles: MediaElementSource lässt sich nur einmal anlegen.
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.crossOrigin = 'anonymous';
    audioEl.setAttribute('playsinline', '');
  }
  audioEl.preservesPitch = true;
  audioEl.mozPreservesPitch = true;
  audioEl.webkitPreservesPitch = true;
  return audioEl;
}

// ---------------------------------------------------------------- Vorstellung

async function vorstellung(stueck, { frei }) {
  aufraeumen();
  const modus = einst.modus;
  app.className = 'buehne';
  app.innerHTML = `
    <canvas class="partitur" aria-label="Partitur mit Tempo- und Dynamik-Zielkurve"></canvas>
    <div class="hud">
      <div class="hud-stueck"><b>${h(stueck.titel)}</b><span>${h(stueck.komponist)}${frei ? ' · freies Spiel' : ''}</span></div>
      <div class="hud-tempo"><span class="tempo-prozent">100 %</span><span class="tempo-bpm">–</span></div>
      <div class="hud-stimmung ${frei ? 'aus' : ''}">
        ${['streicher', 'holz', 'blech'].map((g) => `<div class="stimmung" data-g="${g}"><span>${{ streicher: 'Streicher', holz: 'Holz', blech: 'Blech' }[g]}</span><i><b></b></i></div>`).join('')}
      </div>
      <button class="schliessen" data-akt="zurueck" aria-label="Abbrechen">✕</button>
    </div>
    <div class="saal" id="saal" data-modus="${modus}">
      <div class="orchester" id="orchester"></div>
      <canvas class="spur" id="spur"></canvas>
      <div class="hinweis" id="hinweis"></div>
    </div>
    <div class="ticker" id="ticker" aria-live="polite"></div>`;

  const saalEl = app.querySelector('#saal');
  const hinweis = app.querySelector('#hinweis');
  const ticker = app.querySelector('#ticker');
  const partitur = new Partitur(app.querySelector('.partitur'));
  const orchester = new Orchester(app.querySelector('#orchester'));
  orchester.setzeModus(modus);
  const spur = new Spur(app.querySelector('#spur'));

  zeigeHinweis(hinweis, '<p>Lade die Aufnahme …</p>');

  let json, quelle;
  try {
    [json, quelle] = await Promise.all([karteLaden(stueck), audioQuelle(stueck)]);
  } catch (err) {
    zeigeHinweis(hinweis, `<p>${h(err.message)}</p><button data-akt="zurueck">Zurück</button>`);
    app.onclick = (e) => { if (e.target.closest('[data-akt="zurueck"]')) titel(); };
    return;
  }
  const karte = new Karte(json);
  if (!frei && stueck.wertungBis) karte.ende = Math.min(karte.anzahl - 1, Math.max(karte.start + 8, Math.round(karte.pos(stueck.wertungBis))));
  karte.hinweiseBauen(stueck.hinweise || []);
  partitur.setze(karte, { dynamikAktiv: modus !== 'tippen', frei });

  const audio = audioElement();
  audio.pause();
  audio.src = quelle;
  audio.playbackRate = 1;
  audio.load();

  const lauf = laufend = { stueck, frei, modus, karte, audio, partitur, orchester, spur, aktiv: true, ticker };
  const vorschau = () => {
    if (!lauf.aktiv || lauf.dirigent) return;
    partitur.zeichne(karte.start - 0.6, {});
    orchester.zeichne(karte.start - 1, { zustand: 'bereit', stimmung: null, laut: 0.3, frei: true });
    lauf.raf = requestAnimationFrame(vorschau);
  };
  lauf.raf = requestAnimationFrame(vorschau);

  const tutorial = stueck.tutorial && !frei;
  zeigeHinweis(hinweis, `
    <h2>${h(stueck.titel)}</h2>
    <p class="klein">${h(stueck.komponist)}${stueck.ensemble ? ' · ' + h(stueck.ensemble) : ''}${stueck.jahr ? ' (' + h(stueck.jahr) + ')' : ''}</p>
    ${tutorial ? `<ol class="schritte">
      <li>Gib zwei Schläge im Tempo vor. Beim dritten setzt das Orchester ein.</li>
      <li>Schlag gleichmäßig weiter. Die goldene Linie oben ist das Originaltempo, die dunkle dein Tempo.</li>
      <li>Hörst du auf zu schlagen, wird das Orchester langsamer und verstummt.</li>
    </ol>` : `<p>${h(MODI[modus].text)}</p>`}
    <button class="haupt gross" data-akt="bereit" data-kein-schlag>${modus === 'handy' ? 'Sensor erlauben & los' : 'Bereit'}</button>`);

  app.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.akt === 'zurueck') { titel(); return; }
    if (b.dataset.akt === 'bereit') { bereitMachen(lauf, b); return; }
    if (b.dataset.akt === 'nochmal') { vorstellung(stueck, { frei }); return; }
  };

  // Alles, was eine Nutzergeste braucht (Ton, Sensoren), passiert synchron im Klick.
  function bereitMachen(l, knopf) {
    knopf.disabled = true;
    klang.weckenSofort();
    klang.verbinde(audio);
    klang.effekteZuruecksetzen();
    klang.blende(0, 0.01);
    const abspielen = audio.play();
    const sensor = l.modus === 'handy' ? Eingabe.bewegungErlauben() : Promise.resolve('ok');
    (async () => {
      const r = await sensor;
      try { await Promise.race([abspielen, new Promise((ok) => setTimeout(ok, 1500))]); } catch { /* egal */ }
      audio.pause();
      audio.currentTime = 0;
      if (!l.aktiv) return;
      if (r !== 'ok') {
        zeigeHinweis(hinweis, `<p>${r === 'unsicher' ? 'Bewegungssensoren gibt es nur über HTTPS.' : 'Kein Zugriff auf die Bewegungssensoren.'} Du kannst stattdessen tippen.</p><button class="haupt" data-akt="bereit" data-kein-schlag>Mit Tippen weiter</button>`);
        l.modus = 'tippen';
        orchester.setzeModus('tippen');
        partitur.setze(karte, { dynamikAktiv: false, frei });
        return;
      }
      await klang.start();
      klang.murmeln(true);
      starten(l);
    })();
  }

  function starten(l) {
    const dyn = l.modus !== 'tippen';
    const d = new Dirigent({
      audio, klang, karte, stueck,
      wertung: !frei,
      dynamikAktiv: dyn,
      latenzExtra: (einst.latenz || 0) / 1000,
      melde: (art, daten) => ereignis(l, art, daten),
    });
    l.dirigent = d;
    zeigeHinweis(hinweis, `<p class="auftakt-text">${l.modus === 'geste' ? 'Führe den Taktstock: zwei Schläge geben das Tempo vor.' : l.modus === 'handy' ? 'Zweimal kräftig schlagen – beim dritten Mal setzt das Orchester ein.' : 'Zweimal tippen – beim dritten Schlag setzt das Orchester ein.'}</p>`, 'leise');
    l.eingabe = new Eingabe(saalEl, {
      onSchlag: (t, dynWert, x, y) => {
        d.schlag(t, dynWert);
        partitur.schlag();
        orchester.schlag();
        spur.schlag(x, y);
      },
      onSpur: (punkte, mag) => spur.setze(punkte, mag),
      onTaste: (e) => { if (e.key === 'Escape') titel(); },
    });
    l.eingabe.aktivieren(l.modus);
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { l.wachHalten = w; }).catch(() => {});
    schleife(l);
  }
}

function ereignis(l, art, daten) {
  if (!l.aktiv) return;
  const hinweis = app.querySelector('#hinweis');
  switch (art) {
    case 'auftakt':
      zeigeHinweis(hinweis, '<p class="auftakt-text">Auftakt …</p>', 'leise');
      tickerText(l, 'Der Saal wird still.');
      break;
    case 'einsatz':
      zeigeHinweis(hinweis, '');
      break;
    case 'verstummt':
      zeigeHinweis(hinweis, '<p class="auftakt-text">Das Orchester wartet. Zwei Schläge, und es geht weiter.</p>', 'leise');
      break;
    case 'halt':
      zeigeHinweis(hinweis, '<p class="auftakt-text">Fermate. Ein Schlag, und es geht weiter.</p>', 'leise');
      break;
    case 'saal':
      tickerText(l, daten.text);
      if (daten.art === 'kiekser') l.orchester.ausruf('blech');
      if (daten.art === 'quietscher') l.orchester.ausruf('holz');
      break;
    case 'schlag':
      if (l.dirigent && (l.dirigent.zustand === 'laeuft')) zeigeHinweis(hinweis, '');
      break;
    case 'fehler':
      zeigeHinweis(hinweis, '<p>Der Browser blockiert den Ton. Tippe einmal auf „Bereit“.</p><button class="haupt" data-akt="bereit" data-kein-schlag>Bereit</button>');
      break;
    case 'ende':
      vorstellungEnde(l, daten);
      break;
    default:
  }
}

function tickerText(l, text) {
  const t = l.ticker;
  if (!t) return;
  const p = document.createElement('p');
  p.textContent = text;
  t.prepend(p);
  while (t.children.length > 3) t.lastChild.remove();
  setTimeout(() => p.classList.add('alt'), 5000);
}

function schleife(l) {
  const hud = {
    prozent: app.querySelector('.tempo-prozent'),
    bpm: app.querySelector('.tempo-bpm'),
    stimmung: Object.fromEntries([...app.querySelectorAll('.stimmung')].map((e) => [e.dataset.g, e])),
  };
  let letzteHud = 0;
  const bild = () => {
    if (!l.aktiv) return;
    l.raf = requestAnimationFrame(bild);
    try { schritt(); } catch (err) { console.error(err); }
  };
  const schritt = () => {
    const t = performance.now() / 1000;
    const d = l.dirigent;
    d.tick(t);
    const k = Math.floor(d.phi);
    const P = d.periode;
    l.partitur.zeichne(d.phi, { verlauf: d.verlauf, dyn: d.dynamikAktiv ? d.dyn : null, bpmIst: d.zustand === 'laeuft' && P ? 60 / P : null });
    l.orchester.zeichne(d.phi, { zustand: d.zustand, stimmung: d.wertung ? d.stimmung : null, laut: l.karte.zielLaut(k), frei: !d.wertung });
    l.spur.zeichne(t);
    if (t - letzteHud > 0.1) {
      letzteHud = t;
      const laeuft = d.zustand === 'laeuft' || d.zustand === 'schluss';
      hud.prozent.textContent = laeuft ? `${Math.round(d.rate * 100)} %` : '–';
      hud.prozent.classList.toggle('schnell', laeuft && d.rate > 1.12);
      hud.prozent.classList.toggle('langsam', laeuft && d.rate < 0.89);
      hud.bpm.textContent = P && laeuft ? `♩ ${Math.round(60 / P)} · Soll ${Math.round(l.karte.bpm(k))}` : `Soll ${Math.round(l.karte.bpm(Math.max(k, l.karte.start)))}`;
      for (const [g, e] of Object.entries(hud.stimmung)) {
        const v = d.stimmung[g];
        e.querySelector('b').style.width = `${Math.round(v * 100)}%`;
        e.classList.toggle('schlecht', v < 0.35);
      }
    }
  };
  l.raf = requestAnimationFrame(bild);
}

function vorstellungEnde(l, e) {
  const st = l.stueck;
  l.eingabe && l.eingabe.deaktivieren();
  if (!e.wertung) {
    const prozent = Math.round(e.maxRate * 100);
    const rekord = speicher.rekordMelden(st.id, prozent);
    klang.applaus(0.6, 5);
    setTimeout(() => {
      if (!l.aktiv) return;
      zeitung(l, {
        titel: prozent >= 160 ? 'Probe mit Überschallknall' : prozent >= 125 ? 'Eine flotte Probe' : 'Probe beendet',
        saetze: [`Höchsttempo ${prozent} %, Tiefsttempo ${Math.round(e.minRate * 100)} % des Originals.`, rekord ? 'Neuer Rekord für dieses Stück – die Musiker bitten um Zulage.' : 'Ohne Wertung, ohne Kritiker; das Orchester ist trotzdem erschöpft.'],
        frei: true,
      });
    }, 1400);
    return;
  }
  const kr = kritikSchreiben(e, st.eigen ? 'eigen' : st.id);
  const ap = applausFuer(e.punkte);
  if (ap.art === 'einzeln') {
    klang.einzelklatscher(7);
    tickerText(l, 'Ein einzelner Herr klatscht. Langsam.');
  } else {
    klang.applaus(ap.staerke, ap.dauer);
    if (ap.bravo) klang.bravo(klang.jetzt() + 0.6, ap.bravo);
    tickerText(l, ap.art === 'ovation' ? 'Bravo-Rufe! Das Parkett steht.' : ap.art === 'herzlich' ? 'Herzlicher Applaus.' : 'Höflicher Applaus.');
  }
  const rekord = speicher.bestwertMelden(st.id, e.punkte, kr.titel);
  setTimeout(() => { if (l.aktiv) zeitung(l, { ...kr, ergebnis: e, rekord }); }, 1800);
}

function zeitung(l, { titel: ueberschrift, saetze, ergebnis: e, rekord, frei }) {
  const st = l.stueck;
  const datum = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const prozent = (x) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}`;
  const zeilen = e ? [
    ['Tempo-Treue', prozent(1 - e.tempoStreu / 0.3)],
    ['Ruhige Hand', prozent(1 - e.unruhe)],
    ...(e.dynamikAktiv ? [['Dynamik', prozent(1 - e.dynStreu / 0.45)]] : []),
    ...(e.klatsch != null ? [['Saal im Takt', prozent(1 - e.klatsch / 0.35)]] : []),
    ['Streicher', prozent(e.stimmung.streicher)],
    ['Holz', prozent(e.stimmung.holz)],
    ['Blech', prozent(e.stimmung.blech)],
  ] : [];
  const div = document.createElement('div');
  div.className = 'zeitung-huelle';
  div.innerHTML = `
    <article class="zeitung" role="dialog" aria-label="Kritik">
      <header>
        <p class="zeitung-name">Die Abendkritik</p>
        <p class="zeitung-zeile"><span>${h(datum)}</span><span>Feuilleton</span></p>
      </header>
      <h2>${h(ueberschrift)}</h2>
      <p class="dachzeile">${h(st.komponist)}: ${h(st.titel)}${st.ensemble ? ' · ' + h(st.ensemble) : ''} · Am Pult: ${h(einst.name || 'Gastdirigent')}</p>
      <p class="text"><span class="initial">${h(saetze[0].charAt(0))}</span>${h(saetze[0].slice(1))} ${h(saetze[1])}</p>
      <p class="kuerzel">${rekord && rekord.neu ? `<span class="stempel">${rekord.alt == null ? 'Debüt' : 'Bestwert'}</span>` : ''}<span>Konrad Taktlos</span></p>
      ${e ? `<div class="wertung">
        <div class="zahl"><b>${e.punkte}</b><span>von 100</span></div>
        <dl>${zeilen.map(([k, v]) => `<div><dt>${k}</dt><dd><i style="width:${v}%"></i><span>${v}</span></dd></div>`).join('')}</dl>
      </div>` : ''}
      <div class="knoepfe">
        <button class="haupt" data-akt="nochmal">Nochmal</button>
        <button data-akt="zurueck">Zum Programm</button>
      </div>
    </article>`;
  app.appendChild(div);
  requestAnimationFrame(() => div.classList.add('da'));
}

// ---------------------------------------------------------------- Einmessen

async function einmessen(stueck) {
  aufraeumen();
  app.className = 'einmessen';
  app.innerHTML = '<p class="lade-zeile">Lade die Aufnahme …</p>';
  let json = null;
  try { json = await karteLaden(stueck); } catch { json = null; }
  const audio = audioElement();
  audio.pause();
  try {
    audio.src = await audioQuelle(stueck);
  } catch (err) {
    app.innerHTML = `<p>${h(err.message)}</p><button class="link" onclick="location.reload()">Zurück</button>`;
    return;
  }
  audio.playbackRate = 1;
  audio.load();
  const e = new Einmessen({
    app, stueck, json, audio, klang,
    latenz: () => klang.latenz() + (einst.latenz || 0) / 1000,
    speichern: async (neu) => {
      if (stueck.eigen) {
        const alt = await speicher.eigenesLesen(stueck.eigenId);
        await speicher.eigenesSpeichern({ ...alt, karte: neu });
        stueck.kartenJSON = neu;
      } else {
        speicher.karteSpeichern(stueck.id, neu);
      }
    },
    zuruecksetzen: stueck.eigen ? null : () => speicher.karteLoeschen(stueck.id),
    fertig: () => titel(),
    spielen: () => vorstellung(stueck, { frei: false }),
  });
  laufend = { aktiv: true, einmessen: e };
  e.zeigen();
}

// ---------------------------------------------------------------- Dialoge

function dialog(inhalt, { schliessbar = true } = {}) {
  dialogZu();
  const d = document.createElement('div');
  d.className = 'dialog-huelle';
  d.innerHTML = `<div class="dialog" role="dialog">${schliessbar ? '<button class="schliessen" data-zu aria-label="Schließen">✕</button>' : ''}<div class="dialog-inhalt">${inhalt}</div></div>`;
  document.body.appendChild(d);
  d.addEventListener('click', (e) => { if (e.target === d && schliessbar) dialogZu(); if (e.target.closest('[data-zu]')) dialogZu(); });
  return d.querySelector('.dialog-inhalt');
}

function dialogZu() { document.querySelectorAll('.dialog-huelle').forEach((d) => d.remove()); }

function meldung(text) { dialog(`<p>${h(text)}</p>`); }

function anleitung() {
  dialog(`
    <h2>So geht’s</h2>
    <p>Du stehst auf dem Podium. Die Aufnahme folgt deinem Schlag: Schlägst du schneller, spielt das Orchester schneller, ohne dass sich die Tonhöhe ändert.</p>
    <h3>Einsatz</h3>
    <p>Zwei Schläge geben das Tempo vor, beim dritten setzt das Orchester ein. Schlägst du zwei Sekunden lang nicht, wird es langsamer und verstummt.</p>
    <h3>Die Partitur oben</h3>
    <p>Die goldene, gestrichelte Linie ist das Tempo der Originalaufnahme, die dunkle dein Tempo. Das helle Band zeigt, wie laut die Stelle im Original ist. Anweisungen wie <i>Accelerando</i>, <i>Ritardando</i>, <i>pp</i> oder „Fermate – halten!“ kommen von rechts. Bei einer Fermate hörst du auf zu schlagen und gibst erst zum Weiterspielen wieder einen Schlag.</p>
    <h3>Steuerung</h3>
    <p><b>Tippen:</b> Jeder Tipp, Klick oder Druck auf die Leertaste ist ein Schlag. Die Lautstärke spielt das Orchester dann selbst.<br>
    <b>Geste:</b> Führe den Taktstock mit Maus oder Finger. Der tiefste Punkt einer Ab-auf-Bewegung ist der Schlag, die Größe der Bewegung die Lautstärke.<br>
    <b>Handy:</b> Das Handy selbst ist der Taktstock. Jeder Ruck ist ein Schlag. Das braucht HTTPS und auf dem iPhone eine Erlaubnis.</p>
    <h3>Stimmung</h3>
    <p>Streicher, Holz und Blech mögen keine unruhigen Schläge und keine großen Abweichungen von der Zielkurve. Schlechte Stimmung hört man: erst dumpfer, dann leiernd, am Ende mit Aussetzern. Das Publikum reagiert ebenfalls.</p>
    <h3>Eigene Stücke und Einmessen</h3>
    <p>Zieh eine Audiodatei auf die Startseite. Sie bleibt in deinem Browser. Eine automatisch erkannte Beat-Map ist bei Klassik oft ungenau. Im Einmess-Modus tippst du mit der Leertaste mit, und daraus wird die neue Beat-Map. Das funktioniert auch, um die mitgelieferten Stücke nachzubessern.</p>`);
}

function einstellungen() {
  const inhalt = dialog(`
    <h2>Einstellungen</h2>
    <label class="regler">Name auf dem Programmzettel
      <input type="text" id="name" maxlength="40" value="${h(einst.name || '')}" autocomplete="nickname">
    </label>
    <label class="regler">Zusätzliche Ausgabeverzögerung: <b id="lat-wert">${einst.latenz || 0} ms</b>
      <input type="range" min="0" max="350" step="10" value="${einst.latenz || 0}" id="latenz">
    </label>
    <p class="klein">Mit Bluetooth-Kopfhörern hinkt der Ton 150–250 ms hinterher. Stell hier ein, wie viel, dann folgt das Orchester genauer.</p>
    <label class="schalter"><input type="checkbox" id="direkt" ${einst.direkt ? 'checked' : ''}> Direktwiedergabe ohne Klangeffekte</label>
    <p class="klein">Nur falls das Tempo auf deinem Gerät nicht deinem Schlag folgt: Dann läuft die Aufnahme am Web-Audio-Mischpult vorbei. Dynamik, Leiern und Aussetzer fallen weg. Wirkt nach dem Neuladen.</p>
    <p class="klein">Eingemessene Beat-Maps der mitgelieferten Stücke liegen in diesem Browser. Zurücksetzen geht im Einmess-Modus des jeweiligen Stücks.</p>`);
  const dk = inhalt.querySelector('#direkt');
  dk.onchange = () => { einst.direkt = dk.checked; speicher.einstellungenSpeichern(einst); };
  const n = inhalt.querySelector('#name');
  n.oninput = () => { einst.name = n.value.trim(); speicher.einstellungenSpeichern(einst); };
  const r = inhalt.querySelector('#latenz');
  r.oninput = () => {
    einst.latenz = Number(r.value);
    inhalt.querySelector('#lat-wert').textContent = `${einst.latenz} ms`;
    speicher.einstellungenSpeichern(einst);
  };
}

async function credits() {
  const inhalt = dialog('<p>Lade …</p>');
  try {
    const md = await (await fetch('CREDITS.md')).text();
    inhalt.innerHTML = markdown(md);
    inhalt.closest('.dialog').classList.add('breit');
  } catch {
    inhalt.innerHTML = '<p>CREDITS.md ließ sich nicht laden.</p>';
  }
}

// Gerade genug Markdown für CREDITS.md: Überschriften, Tabellen, Listen, Links, fett, Code
function markdown(md) {
  const inline = (t) => h(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/&lt;(https?:[^&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const zeilen = md.split('\n');
  let out = '', tabelle = null, liste = false, absatz = [];
  const schliessen = () => {
    if (tabelle) { out += `<table>${tabelle.join('')}</table>`; tabelle = null; }
    if (liste) { out += '</ul>'; liste = false; }
    if (absatz.length) { out += `<p>${inline(absatz.join(' '))}</p>`; absatz = []; }
  };
  for (const z of zeilen) {
    if (/^\|/.test(z)) {
      if (/^\|\s*-/.test(z)) continue;
      const zellen = z.split('|').slice(1, -1).map((c) => inline(c.trim()));
      if (!tabelle) tabelle = [];
      if (zellen.every((c) => !c)) continue;
      tabelle.push(`<tr>${zellen.map((c, i) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`);
      continue;
    }
    if (/^- /.test(z)) { if (tabelle || absatz.length) schliessen(); if (!liste) { out += '<ul>'; liste = true; } out += `<li>${inline(z.slice(2))}</li>`; continue; }
    if (/^\s+\S/.test(z) && liste) { out = out.replace(/<\/li>$/, ` ${inline(z.trim())}</li>`); continue; }
    if (z.trim() && !/^(#|---)/.test(z)) { if (tabelle || liste) schliessen(); absatz.push(z.trim()); continue; }
    schliessen();
    if (/^# /.test(z)) out += `<h2>${inline(z.slice(2))}</h2>`;
    else if (/^## /.test(z)) out += `<h3>${inline(z.slice(3))}</h3>`;
    else if (/^---/.test(z)) out += '<hr>';
  }
  schliessen();
  return out;
}

function zeigeHinweis(el, html, art = '') {
  if (!el) return;
  el.innerHTML = html;
  el.className = `hinweis ${html ? 'da' : ''} ${art}`;
}

function aufraeumen() {
  dialogZu();
  if (laufend) {
    laufend.aktiv = false;
    if (laufend.raf) cancelAnimationFrame(laufend.raf);
    if (laufend.eingabe) laufend.eingabe.deaktivieren();
    if (laufend.dirigent) laufend.dirigent.abbrechen();
    if (laufend.orchester) laufend.orchester.zerstoeren();
    if (laufend.einmessen) laufend.einmessen.beenden();
    if (laufend.wachHalten) laufend.wachHalten.release().catch(() => {});
    laufend = null;
  }
  if (klang.ctx) { klang.murmeln(false); klang.effekteZuruecksetzen(); }
  if (audioEl) audioEl.pause();
  app.onclick = null;
}

// ---------------------------------------------------------------- Taktstock-Spur

class Spur {
  constructor(cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.punkte = [];
    this.ringe = [];
    this.mag = 0;
  }

  setze(punkte, mag) {
    if (punkte) this.punkte = punkte.slice();
    if (mag != null) this.mag = Math.max(this.mag * 0.9, mag);
  }

  schlag(x, y) {
    const r = this.cv.getBoundingClientRect();
    this.ringe.push({ x: x ?? r.width / 2, y: y ?? r.height * 0.6, t: performance.now() / 1000 });
  }

  zeichne(t) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const p = this.punkte.filter((q) => t - q.t < 0.7);
    if (p.length > 1) {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = 1; i < p.length; i++) {
        const alter = (t - p[i].t) / 0.7;
        const a = Math.max(0, 1 - alter);
        g.strokeStyle = `rgba(255,214,140,${0.85 * a})`;
        g.shadowColor = 'rgba(255,190,90,0.9)';
        g.shadowBlur = 14 * a;
        g.lineWidth = 1.5 + 5 * a;
        g.beginPath();
        g.moveTo(p[i - 1].x, p[i - 1].y);
        g.lineTo(p[i].x, p[i].y);
        g.stroke();
      }
      g.shadowBlur = 0;
      const s = p[p.length - 1];
      if (t - s.t < 0.4) {
        g.fillStyle = '#fff6dd';
        g.beginPath(); g.arc(s.x, s.y, 4, 0, Math.PI * 2); g.fill();
      }
    }
    if (this.mag > 0.5) {
      this.mag *= 0.93;
      g.strokeStyle = `rgba(255,214,140,${Math.min(0.8, this.mag / 25)})`;
      g.lineWidth = 3;
      g.beginPath(); g.arc(r.width / 2, r.height * 0.55, 20 + this.mag * 3, 0, Math.PI * 2); g.stroke();
    }
    this.ringe = this.ringe.filter((q) => t - q.t < 0.5);
    for (const q of this.ringe) {
      const a = (t - q.t) / 0.5;
      g.strokeStyle = `rgba(255,220,150,${0.8 * (1 - a)})`;
      g.lineWidth = 2.5 * (1 - a) + 0.5;
      g.beginPath(); g.arc(q.x, q.y, 8 + 46 * a, 0, Math.PI * 2); g.stroke();
    }
  }
}

// Fürs Testen in der Konsole
window.taktstock = { get laufend() { return laufend; }, klang, speicher };

titel();
