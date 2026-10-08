// Da capo! – Oberfläche: Bildschirme, Animationen, Eingabe.

import * as L from './logic.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import { icon } from './icons.js';
import {
  WERK, WERKE, KOMPONISTEN, SCHULEN, EPOCHEN, epocheVon, PROGRAMME, PROGRAMM_IDS, STERNSTUNDEN,
  STARS, STAR, RARITAET, PROBE, VEREDELUNG, INVESTITION, KRITIK, HAEUSER, GASTSPIELE, ABENDE,
  REPERTOIRES, REPERTOIRE, STRENGE, REZENSIONEN, fmtX,
} from './data.js';
import {
  ladeLauf, speichereLauf, loescheLauf, ladeMeta, speichereMeta, ladeEinst, speichereEinst, pruefeFreischaltungen,
} from './speicher.js';

// ------------------------------------------------------------------ Zustand

let run = ladeLauf();
if (run && run.v !== L.VERSION) run = null;
const meta = ladeMeta();
const einst = ladeEinst();
let auswahl = new Set();
let busy = false;
let neuWahl = { deck: 'leipzig', strenge: 1 };
let ovTab = 'werke';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const warte = (ms) => new Promise((r) => setTimeout(r, ms / einst.tempo));

function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e15) return (n / 1e15).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Brd.';
  if (n >= 1e12) return (n / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Bio.';
  if (n >= 1e9) return (n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mrd.';
  return n.toLocaleString('de-DE');
}
function fmtB(b) {
  if (b >= 1e6) return fmt(b);
  const r = Math.round(b * 10) / 10;
  return r.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}
function markup(t) {
  return String(t)
    .replace(/\{p:([^}]+)\}/g, '<span class="t-p">$1</span>')
    .replace(/\{b:([^}]+)\}/g, '<span class="t-b">$1</span>')
    .replace(/\{x:([^}]+)\}/g, '<span class="t-x">$1</span>')
    .replace(/\{g:([^}]+)\}/g, '<span class="t-g">$1</span>');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const muenze = (n) => `<span class="muenze">${n}</span>`;

function speichern() {
  if (run && !['vorhang'].includes(run.phase)) speichereLauf(run);
  speichereMeta(meta);
}

function toast(text, art = '') {
  const t = $('#toast');
  t.hidden = false;
  t.className = 'toast ' + art;
  t.innerHTML = text;
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => { t.hidden = true; }, 3300);
}

function banner(html, ms = 1400) {
  const b = $('#banner');
  b.hidden = false;
  b.innerHTML = html;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  clearTimeout(banner.tm);
  banner.tm = setTimeout(() => { b.hidden = true; }, ms / einst.tempo);
}

function zeige(id) {
  for (const s of ['titel', 'neu', 'spiel']) $('#' + s).hidden = s !== id;
}

async function vorhangZu() {
  A.vorhang();
  $('#vorhangL').classList.add('zu');
  $('#vorhangR').classList.add('zu');
  await new Promise((r) => setTimeout(r, 560));
}
async function vorhangAuf() {
  await new Promise((r) => setTimeout(r, 120));
  $('#vorhangL').classList.remove('zu');
  $('#vorhangR').classList.remove('zu');
}

// ------------------------------------------------------------------ Bausteine

function karteHTML(c, { klasse = '', verdeckt = false } = {}) {
  if (verdeckt) return `<div class="karte verdeckt ${klasse}" data-uid="${c.uid}"><span class="ruecken">Dc</span></div>`;
  const w = WERK[c.w];
  const s = L.schule(c);
  const ep = EPOCHEN[epocheVon(w.y)];
  const titel = w.k || w.t;
  const laenge = titel.replace(/­/g, '').length;
  const lang = laenge > 22 ? 'lang' : laenge > 13 ? 'mittel' : '';
  const enh = c.enh ? `<div class="k-enh">${VEREDELUNG[c.enh].name}</div>` : '';
  return `<div class="karte s-${s} ${c.enh ? 'enh-' + c.enh : ''} ${klasse}" data-uid="${c.uid}" style="--sf:${SCHULEN[s].farbe}">
    <div class="k-kopf"><span class="k-ruhm">${w.r}</span><span class="k-schule">${SCHULEN[s].kurz}</span></div>
    <div class="k-titel ${lang}">${titel}</div>
    <div class="k-komp">${KOMPONISTEN[w.c][0]}</div>
    <div class="k-epoche"><span class="lang">${ep.name}</span><span class="kurz">Epoche ${ep.roem}</span></div>
    <div class="k-fuss"><span class="k-jahr">${w.y}</span>${w.h ? '<span class="k-heiter">heiter</span>' : ''}<span class="k-akte" title="${w.a} ${w.a === 1 ? 'Akt' : 'Akte'}">${'●'.repeat(w.a)}</span></div>
    ${enh}
  </div>`;
}

function starHTML(s, { i = null, klasse = '', unbekannt = false } = {}) {
  const d = STAR[s.id];
  let wert = '';
  if (s.id === 'melchior' || s.id === 'stammpublikum') wert = s.v ? `+${s.v}` : '';
  if (s.id === 'intendant' && s.v) wert = `×${fmtX(1 + s.v)}`;
  const aus = run?.round && run.round.offStar === i && i != null ? 'aus' : '';
  return `<div class="star r${d.rar} ${aus} ${klasse} ${unbekannt ? 'unbekannt' : ''}" ${i != null ? `data-star="${i}"` : ''} data-sid="${s.id}" title="${esc(unbekannt ? '???' : d.name)}">
    ${wert ? `<span class="s-wert">${wert}</span>` : ''}
    <span class="s-icon">${icon(d.icon)}</span>
    <span class="s-name">${unbekannt ? '???' : `<span class="lang">${d.name}</span><span class="kurz">${d.kurz}</span>`}</span>
  </div>`;
}

function zettelHTML(art, id, extra = {}) {
  if (art === 'rez') {
    const P = PROGRAMME[id];
    const st = run ? run.stufen[id] : 1;
    return `<div class="zettel" data-zettel="rez">
      <div class="z-kopf">${REZENSIONEN[id]}</div>
      <div class="z-art">${P.name}</div>
      <div class="z-text">Stufe ${st} → ${st + 1}<br><span class="t-p">+${P.sp}</span> · <span class="t-b">+${P.sb}</span></div>
    </div>`;
  }
  if (art === 'probe') {
    const p = PROBE[id];
    return `<div class="zettel" data-zettel="probe">${icon('probe')}<div class="z-kopf">${p.name}</div><div class="z-art">Probe</div></div>`;
  }
  if (art === 'paket') {
    const p = L.PAKETE[id];
    return `<div class="zettel paket">${icon('paket')}<div class="z-kopf">${p.name}</div><div class="z-text">${p.text}</div></div>`;
  }
  if (art === 'invest') {
    const v = INVESTITION[id];
    return `<div class="zettel invest">${icon('haus')}<div class="z-kopf">${v.name}</div><div class="z-text">${v.text}</div></div>`;
  }
  return '';
}

function sternstundenVon(w) {
  return STERNSTUNDEN.filter((s) => (s.werke && s.werke.includes(w)) || (s.komponisten && s.komponisten.includes(WERK[w].c)));
}

// ------------------------------------------------------------------ Titel

function tagesDatum() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function grussformel() {
  const h = new Date().getHours();
  if (h < 5) return 'Noch wach, Jonas?';
  if (h < 11) return 'Guten Morgen, Jonas.';
  if (h < 17) return 'Guten Tag, Jonas.';
  return 'Guten Abend, Jonas.';
}

function renderTitel() {
  zeige('titel');
  const heute = tagesDatum();
  const tg = meta.taeglich[heute];
  const datumText = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  const anzahlStern = STERNSTUNDEN.filter((s) => meta.sternstunden[s.id]).length;
  const anzahlStars = STARS.filter((s) => meta.stars[s.id]).length;
  const laufText = run && run.phase !== 'vorhang'
    ? `Station ${run.station} · ${L.haus(run.station).name}${run.taeglich ? ' · Tagesspielplan' : ''}`
    : '';
  $('#titel').innerHTML = `
    <div class="titel-inner">
      <p class="gruss">${grussformel()}</p>
      <h1 class="logo">Da capo!</h1>
      <div class="ornament">✦ ✦ ✦</div>
      <p class="unterzeile">Ein Opern-Roguelike. Stell den Spielplan zusammen, gewinne die Kritiker, toure von der Oper Leipzig bis auf den Grünen Hügel – und dann: noch einmal von vorn.</p>
      <div class="titel-knoepfe">
        ${laufText ? `<button class="btn btn-gold btn-gross" data-akt="fortsetzen">Fortsetzen<small>${esc(laufText)}</small></button>` : ''}
        <button class="btn ${laufText ? '' : 'btn-gold'} btn-gross" data-akt="neu">Neue Spielzeit</button>
        <button class="btn" data-akt="taeglich">${icon('kalender')} Spielplan des Tages<small>${datumText}${tg ? ` · bisher Station ${tg.station}${tg.sieg ? ' – gewonnen!' : ''}` : ''}</small></button>
        <div class="reihe">
          <button class="btn" data-akt="verzeichnis">Werkverzeichnis</button>
          <button class="btn" data-akt="anleitung">Anleitung</button>
        </div>
      </div>
      <div class="titel-stats">
        <span>Werke <b>${Object.keys(meta.werke).length}/${WERKE.length}</b></span>
        <span>Sternstunden <b>${anzahlStern}/${STERNSTUNDEN.length}</b></span>
        <span>Stars <b>${anzahlStars}/${STARS.length}</b></span>
        ${meta.laeufe ? `<span>Beste Station <b>${meta.besteStation}</b></span>` : ''}
        ${meta.siege ? `<span>Siege <b>${meta.siege}</b></span>` : ''}
      </div>
      <div class="titel-ton">
        <button class="icon-btn" data-akt="tonUm" title="Klang">${icon(einst.ton ? 'ton' : 'stumm')}</button>
        <button class="icon-btn" data-akt="musikUm" title="Musik" style="opacity:${einst.musik ? 1 : 0.4}">${icon('musik')}</button>
      </div>
    </div>`;
}

// ------------------------------------------------------------------ Neue Spielzeit

function renderNeu() {
  zeige('neu');
  if (!meta.frei[neuWahl.deck]) neuWahl.deck = 'leipzig';
  neuWahl.strenge = Math.min(neuWahl.strenge, meta.strengeFrei);
  const st = STRENGE[neuWahl.strenge - 1];
  $('#neu').innerHTML = `
    <div class="neu-inner">
      <h2>Neue Spielzeit</h2>
      <p>Wähle dein Startrepertoire. Weitere schaltest du auf der Tournee frei.</p>
      <div class="decks">
        ${REPERTOIRES.map((r) => {
          const frei = meta.frei[r.id];
          const sieg = meta.siegeJeDeck[r.id];
          return `<button class="deck ${frei ? '' : 'zu'} ${neuWahl.deck === r.id ? 'gewaehlt' : ''}" data-akt="deckWahl" data-id="${r.id}" ${frei ? '' : 'aria-disabled="true"'}>
            <h3>${r.name}</h3>
            <p>${frei ? r.text : r.frei.text}</p>
            <span class="deck-meta">${frei ? `${r.zufall || r.werke.length} Werke${r.star ? ' · Star: ' + STAR[r.star].name : ''}${sieg ? ` · gewonnen bis Strenge ${sieg}` : ''}` : 'Noch verschlossen'}</span>
          </button>`;
        }).join('')}
      </div>
      <h3 style="font-family:var(--f-disp);color:var(--gold-h);margin:18px 0 0">Strenge</h3>
      <div class="strenge">
        ${STRENGE.map((s) => `<button class="btn btn-klein ${s.stufe === neuWahl.strenge ? 'aktiv' : ''}" data-akt="strengeWahl" data-n="${s.stufe}" ${s.stufe > meta.strengeFrei ? 'disabled' : ''}>${s.stufe}</button>`).join('')}
      </div>
      <p class="strenge-text"><b>${st.name}.</b> ${st.text}${meta.strengeFrei < 5 ? ` <span style="color:var(--text-d)">Gewinne mit Strenge ${meta.strengeFrei}, um Strenge ${meta.strengeFrei + 1} freizuschalten.</span>` : ''}</p>
      <div class="neu-fuss">
        <button class="btn" data-akt="titel">Zurück</button>
        <button class="btn btn-gold btn-gross" data-akt="starten">Vorhang auf!</button>
      </div>
    </div>`;
}

async function laufStarten(opts) {
  A.init();
  run = L.neuerLauf(opts);
  auswahl.clear();
  for (const s of run.stars) meta.stars[s.id] = 1;
  speichern();
  await vorhangZu();
  zeige('spiel');
  renderSpiel();
  await vorhangAuf();
}

// ------------------------------------------------------------------ Spiel

function renderSpiel() {
  if (!run) return renderTitel();
  zeige('spiel');
  document.documentElement.style.setProperty('--tempo', einst.tempo);
  renderHud();
  renderEnsemble();
  renderMitte();
  renderHand();
  renderAktionen();
  layout();
  if (run.phase === 'vorhang' || run.phase === 'sieg') zeigeEnde(run.phase === 'sieg');
}

function renderHud() {
  const h = L.haus(run.station);
  const r = run.round;
  // Im Foyer zeigt die Leiste schon den nächsten Abend.
  const imFoyer = run.phase === 'shop' || run.phase === 'pack';
  const naechster = imFoyer && run.abend === 2 ? null : imFoyer ? run.abend + 1 : run.abend;
  const abendIdx = naechster ?? 0;
  const abend = ABENDE[abendIdx];
  const kId = naechster == null ? null : L.kritikerVon(run);
  const kAktiv = r ? r.kritiker : L.kritikerAktiv(run, abendIdx);
  const k = kId ? KRITIK[kId] : null;
  const istBoss = abendIdx === 2 && naechster != null;
  const ziel = r ? r.ziel : naechster == null ? L.ziel(run, run.station + 1, 0) : L.ziel(run, run.station, abendIdx);
  const punkte = r ? r.punkte : 0;
  const stand = L.repertoireStand(run);
  const stationText = run.station <= L.STATIONEN ? `Station ${run.station} von ${L.STATIONEN}` : `Gastspiel ${run.station - L.STATIONEN}`;
  $('#hud').innerHTML = `
    <div class="hud-station"><span class="klein">${stationText} · ${h.stadt}</span><b>${h.name}</b></div>
    <div class="hud-menue">
      <button class="icon-btn" data-akt="repertoire" title="Repertoire: im Stapel / gesamt">${icon('karten')}<span id="hRep">${stand.stapel}/${stand.gesamt}</span></button>
      <button class="icon-btn" data-akt="programme" title="Programme">${icon('liste')}</button>
      <button class="icon-btn" data-akt="menue" title="Menü">${icon('menue')}</button>
    </div>
    <div class="hud-abend ${istBoss ? 'boss' : ''}">
      <span class="abend-name">${imFoyer ? 'Foyer · als Nächstes: ' : ''}${naechster == null ? 'nächste Station' : abend.name}${istBoss && k ? ': ' + k.name : ''}</span>
      ${istBoss && k ? `<span class="regel">${kAktiv ? k.regel : 'Hustenbonbons wirken – keine Regel.'}</span>` : ''}
    </div>
    <div class="hud-werte">
      <div class="wert ziel"><span class="lbl">Ziel</span><b id="hZiel">${fmt(ziel)}</b></div>
      <div class="wert applaus"><span class="lbl">Applaus</span><b id="hApplaus">${fmt(punkte)}</b><span class="bar"><i id="hBar" style="width:${Math.min(100, (100 * punkte) / ziel)}%"></i></span></div>
      <div class="wert haende" title="Vorstellungen"><span class="lbl">Vorst.</span><b id="hHaende">${r ? r.haende : '–'}</b></div>
      <div class="wert umb" title="Umbesetzungen"><span class="lbl">Umbes.</span><b id="hUmb">${r ? r.umbes : '–'}</b></div>
      <div class="wert geld"><span class="lbl">Dukaten</span><b id="hGeld">${muenze(run.geld)}</b></div>
    </div>`;
}

function renderEnsemble() {
  const sl = [];
  run.stars.forEach((s, i) => sl.push(starHTML(s, { i })));
  for (let i = run.stars.length; i < run.maxStars; i++) sl.push('<div class="slot-leer">Loge</div>');
  $('#stars').innerHTML = sl.join('');
  $('#stars').style.setProperty('--slots', run.maxStars);
  const pl = [];
  run.proben.forEach((id, i) => pl.push(`<div class="probe-mini" data-probe="${i}" title="${PROBE[id].name}">${icon('probe')}<span><span class="lang">${PROBE[id].name}</span><span class="kurz">${PROBE[id].kurz}</span></span></div>`));
  for (let i = run.proben.length; i < run.maxProben; i++) pl.push('<div class="slot-leer">Probe</div>');
  $('#proben').innerHTML = pl.join('');
}

function renderMitte() {
  const m = $('#mitte');
  $('#handbereich').hidden = run.phase !== 'abend';
  switch (run.phase) {
    case 'spielplan': m.innerHTML = spielplanHTML(); break;
    case 'abend': m.innerHTML = stageHTML(); renderVorschau(); break;
    case 'bravo': m.innerHTML = bravoHTML(); break;
    case 'shop': m.innerHTML = foyerHTML(); break;
    case 'pack': m.innerHTML = paketHTML(); break;
    default: m.innerHTML = '';
  }
}

// ---------- Spielplan der Station

function karteSVG() {
  const alle = [...HAEUSER, ...GASTSPIELE.slice(0, Math.max(0, run.station - L.STATIONEN))];
  const W = 200, H = 220;
  const proj = (lon, lat) => [((lon - 5.6) / 11.6) * W, ((55.2 - lat) / 9.4) * H];
  const umriss = (pts) => pts.map(([lo, la]) => proj(lo, la).map((v) => v.toFixed(1)).join(',')).join(' ');
  const de = [[6.1, 51.85], [6.9, 53.4], [8.6, 53.9], [8.9, 54.9], [9.9, 54.8], [11.0, 54.0], [12.3, 54.4], [13.4, 54.6], [14.2, 53.9], [14.4, 53.3], [14.7, 52.6], [14.6, 51.6], [15.0, 51.0], [14.3, 50.9], [13.0, 50.5], [12.2, 50.3], [12.5, 49.8], [13.8, 48.8], [13.45, 48.57], [12.9, 47.7], [11.0, 47.4], [10.2, 47.3], [9.6, 47.5], [8.6, 47.7], [7.6, 47.6], [7.6, 48.3], [8.2, 49.0], [6.4, 49.5], [6.1, 50.1], [6.0, 50.8], [5.9, 51.1]];
  const at = [[9.6, 47.5], [10.2, 47.3], [11.0, 47.4], [12.9, 47.7], [13.45, 48.57], [14.7, 48.6], [15.0, 49.0], [16.9, 48.6], [17.1, 48.0], [16.5, 47.6], [16.1, 46.9], [14.6, 46.4], [13.7, 46.5], [12.4, 46.7], [11.2, 46.9], [10.5, 46.9], [9.6, 47.1]];
  const ch = [[7.6, 47.6], [8.6, 47.7], [9.6, 47.5], [9.6, 47.1], [10.5, 46.9], [10.1, 46.2], [9.0, 45.9], [7.9, 45.95], [7.0, 45.9], [6.1, 46.2], [6.1, 46.6], [7.0, 47.4]];
  const punkte = alle.map((h) => proj(h.lon, h.lat));
  const bis = Math.min(run.station, alle.length);
  const pfadFertig = punkte.slice(0, bis).map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const pfadRest = punkte.slice(bis - 1).map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  return `<svg class="sp-karte" viewBox="-8 -8 ${W + 16} ${H + 16}" aria-label="Tourneekarte">
    <g fill="rgba(201,168,76,.06)" stroke="rgba(201,168,76,.35)" stroke-width=".8" stroke-linejoin="round">
      <polygon points="${umriss(de)}"/><polygon points="${umriss(at)}"/><polygon points="${umriss(ch)}"/>
    </g>
    <polyline points="${pfadRest}" fill="none" stroke="rgba(236,210,127,.45)" stroke-width="1.4" stroke-dasharray="3 3"/>
    <polyline points="${pfadFertig}" fill="none" stroke="#ecd27f" stroke-width="2"/>
    ${punkte.map(([x, y], i) => {
      const nr = i + 1;
      const akt = nr === run.station;
      const f = nr < run.station ? '#ecd27f' : akt ? '#fff' : 'rgba(236,210,127,.5)';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${akt ? 5 : 3}" fill="${f}" ${akt ? 'stroke="#c9a84c" stroke-width="2"' : ''}>${akt ? '<animate attributeName="r" values="4;6.5;4" dur="1.6s" repeatCount="indefinite"/>' : ''}</circle>
      ${akt || i === 0 || i === 7 ? `<text x="${(x + 7).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="9" fill="${akt ? '#fff' : '#c9b99a'}" font-family="DM Sans, sans-serif">${alle[i].stadt.split(' ')[0]}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

function spielplanHTML() {
  const h = L.haus(run.station);
  const kId = L.kritikerVon(run);
  const k = KRITIK[kId];
  const huste = L.hatStar(run, 'hustenbonbon');
  const abende = ABENDE.map((a, i) => {
    const status = i < run.abend ? 'fertig' : i === run.abend ? 'aktuell' : 'kommend';
    const gage = run.strenge >= 2 && i === 0 ? 0 : a.gage;
    return `<div class="sp-abend ${status} ${i === 2 ? 'boss' : ''}">
      <span class="sp-name">${a.name}</span>
      <span class="sp-ziel">Ziel <b>${fmt(L.ziel(run, run.station, i))}</b></span>
      <span class="sp-gage">Gage ${muenze(gage)}</span>
      ${i === 2 && k ? `<span class="sp-regel ${huste ? 'aus' : ''}"><b>${k.name}</b>${huste ? 'Dank Hustenbonbons ohne Regel.' : k.regel}</span>` : ''}
    </div>`;
  }).join('');
  return `<div class="panel spielplan">
    <div class="sp-kopf">
      <div>
        <span class="klein">${run.station <= L.STATIONEN ? `Station ${run.station} von ${L.STATIONEN}` : `Gastspiel ${run.station - L.STATIONEN}`} · ${h.stadt}</span>
        <h2>${h.name}</h2>
        <p>${h.notiz}</p>
      </div>
      ${karteSVG()}
    </div>
    <div class="sp-abende">${abende}</div>
    <div class="sp-fuss"><button class="btn btn-gold btn-gross" data-akt="vorhangAuf">Vorhang auf: ${ABENDE[run.abend].name}</button></div>
  </div>`;
}

// ---------- Bühne

function stageHTML() {
  const r = run.round;
  const k = r.kritiker ? KRITIK[r.kritiker] : null;
  return `<div class="stage" id="stage">
    ${k ? `<div class="stage-kritiker"><b>${k.name}:</b> ${k.regel}</div>` : ''}
    <div class="stage-prog" id="progName">&nbsp;</div>
    <div class="formel"><div class="box box-p"><span class="lbl">Publikum</span><span id="fP">0</span></div><span class="mal">×</span><div class="box box-b"><span class="lbl">Begeisterung</span><span id="fB">0</span></div></div>
    <div class="gesamt" id="gesamt"></div>
    <div class="gespielt" id="gespielt"></div>
    <div class="hinweis" id="hinweis"></div>
  </div>`;
}

function renderVorschau() {
  if (!run.round || run.phase !== 'abend' || busy) return;
  const uids = [...auswahl];
  const name = $('#progName'), fP = $('#fP'), fB = $('#fB'), hin = $('#hinweis');
  if (!name) return;
  for (const el of $$('#hand .karte')) el.classList.remove('passiv');
  if (!uids.length) {
    name.innerHTML = '&nbsp;';
    fP.textContent = '0'; fB.textContent = '0';
    hin.className = 'hinweis';
    const r = run.round;
    hin.textContent = r.nr === 0 ? 'Wähle bis zu fünf Werke für die Vorstellung.' : `Noch ${fmt(Math.max(0, r.ziel - r.punkte))} Applaus bis zum Ziel.`;
    return;
  }
  const pr = L.pruefeAuswahl(run, uids);
  const ev = pr.ev || L.bewerte(uids.map((u) => L.karte(run, u)), run);
  const w = L.programmWerte(run, ev.art);
  name.innerHTML = `${PROGRAMME[ev.art].name}<small>Stufe ${w.stufe}</small>`;
  fP.textContent = fmt(w.p);
  fB.textContent = fmt(w.b);
  const zaehlen = new Set(ev.zaehlen.map((c) => c.uid));
  for (const u of uids) {
    const el = $(`#hand .karte[data-uid="${u}"]`);
    if (el && !zaehlen.has(u)) el.classList.add('passiv');
  }
  const stern = L.sternstundenIn(uids.map((u) => L.karte(run, u)));
  const bekannte = stern.filter((s) => meta.sternstunden[s.id]);
  hin.className = 'hinweis ' + (pr.ok && !pr.nichtig ? '' : 'warn');
  if (!pr.ok && pr.grund) hin.textContent = pr.grund;
  else if (pr.nichtig) hin.textContent = `${pr.nichtig} Diese Vorstellung bringt 0 Applaus.`;
  else if (bekannte.length) hin.innerHTML = `<span class="stern-vorschau">★ ${bekannte.map((s) => `${s.name} ×${fmtX(s.x)}`).join(' · ')}</span>`;
  else if (stern.length) hin.innerHTML = '<span class="stern-vorschau">★ Hier liegt etwas in der Luft …</span>';
  else hin.textContent = PROGRAMME[ev.art].regel;
}

// ---------- Hand

function renderHand(neu = []) {
  const h = $('#hand');
  if (!run.round || run.phase !== 'abend') { h.innerHTML = ''; return; }
  const r = run.round;
  const neuSet = new Set(neu);
  let k = 0;
  h.innerHTML = r.hand.map((u) => {
    const c = L.karte(run, u);
    const kl = [auswahl.has(u) ? 'gewaehlt' : '', neuSet.has(u) ? 'neu' : '', L.zaehltNicht(run, c) && !r.verdeckt[u] ? 'nicht' : ''].join(' ');
    const html = karteHTML(c, { klasse: kl, verdeckt: !!r.verdeckt[u] });
    if (neuSet.has(u)) return html.replace('class="karte', `style="animation-delay:${(k++ * 0.06) / einst.tempo}s" class="karte`);
    return html;
  }).join('');
  layout();
}

const SORT_NAMEN = { komponist: 'Komponist', epoche: 'Jahr', ruhm: 'Ruhm', schule: 'Schule' };
function renderAktionen() {
  if (run.phase !== 'abend') { $('#aktionen').innerHTML = ''; return; }
  const r = run.round;
  const pr = L.pruefeAuswahl(run, [...auswahl]);
  $('#aktionen').innerHTML = `
    <button class="btn btn-sort" data-akt="sortieren" title="Sortierung (S)"><small>Sortiert nach</small>${SORT_NAMEN[run.sortierung]}</button>
    <button class="btn btn-rot" data-akt="umbesetzen" ${auswahl.size && r.umbes > 0 && !busy ? '' : 'disabled'}>Umbesetzen</button>
    <button class="btn btn-gold" data-akt="spielen" ${pr.ok && !busy ? '' : 'disabled'}>Aufführen</button>`;
}

function layout() {
  // Stars
  const ens = $('#ensemble');
  if (ens && run) {
    const breite = ens.clientWidth;
    const einheiten = run.maxStars + run.maxProben * 0.78;
    const sw = Math.max(48, Math.min(96, (breite - 14 - 6 * (run.maxStars + run.maxProben)) / einheiten));
    document.documentElement.style.setProperty('--sw', sw + 'px');
  }
  // Hand
  const h = $('#hand');
  if (h && run?.round && run.phase === 'abend') {
    const n = Math.max(1, h.children.length);
    const breite = h.clientWidth || $('#buehne').clientWidth;
    const gap = 6;
    let cols = n;
    let kw = (breite - gap * (cols - 1)) / cols;
    if (kw < 88) { cols = Math.ceil(n / 2); kw = (breite - gap * (cols - 1)) / cols; }
    // Höhe begrenzen: auf flachen Bildschirmen kleinere Karten
    const rows = Math.ceil(n / cols);
    const maxH = window.innerHeight * (rows > 1 ? 0.36 : 0.26);
    kw = Math.min(kw, 128, (maxH - (rows - 1) * 8) / rows / 1.4);
    h.style.setProperty('--cols', cols);
    h.style.setProperty('--kw', Math.floor(kw) + 'px');
    h.style.setProperty('--hgap', rows > 1 ? '20px' : '8px');
  }
  const st = $('#stage');
  if (st) {
    const kw = Math.max(54, Math.min(116, (st.clientWidth - 40) / 5, (st.clientHeight - 150) / 1.4));
    st.style.setProperty('--kw-stage', Math.floor(kw) + 'px');
  }
}
window.addEventListener('resize', () => { if (run && !$('#spiel').hidden) layout(); });

// ---------- Bravo

function bravoHTML() {
  const b = run.bravo;
  const h = L.haus(run.station);
  return `<div class="panel bravo">
    <span class="klein">${ABENDE[run.abend].name} · ${h.name}</span>
    <h2>Bravo!</h2>
    <p>${fmt(b.punkte)} Applaus bei einem Ziel von ${fmt(b.ziel)}.</p>
    <ul class="gage">${b.zeilen.map((z) => `<li><span>${z.text}</span><b>+${z.v}</b></li>`).join('')}</ul>
    ${b.ereignisse.map((e) => `<div class="ereignis ${e.art}">${e.text}</div>`).join('')}
    <button class="btn btn-gold btn-gross" data-akt="kassieren">${b.sieg ? 'Zum Finale' : 'Ins Foyer'} · +${muenze(b.summe)}</button>
  </div>`;
}

async function bravoAnimieren() {
  const lis = $$('.gage li');
  for (const li of lis) {
    await warte(220);
    li.classList.add('da');
    A.geld();
  }
  if (run.bravo?.ereignisse.some((e) => e.art === 'buh')) A.buh();
}

// ---------- Foyer

function foyerHTML() {
  const sh = run.shop;
  const naechster = run.abend + 1 > 2 ? { station: run.station + 1, abend: 0 } : { station: run.station, abend: run.abend + 1 };
  const nName = ABENDE[naechster.abend].name;
  const nHaus = L.haus(naechster.station);
  const invId = run.investAngebot[run.station];
  const ware = sh.angebote.map((a, i) => {
    let inhalt = '';
    if (a.art === 'star') inhalt = starHTML({ id: a.id, v: 0 });
    else if (a.art === 'werk') inhalt = karteHTML({ uid: -1, w: a.id, enh: a.enh });
    else inhalt = zettelHTML(a.art, a.id);
    return `<div class="ware ${a.verkauft ? 'verkauft' : ''}" data-akt="ware" data-i="${i}">${inhalt}<span class="preis ${run.geld < a.preis ? 'zu-teuer' : ''}">${muenze(a.preis)}</span></div>`;
  }).join('');
  const pakete = sh.pakete.map((p, i) => `<div class="ware ${p.gekauft ? 'verkauft' : ''}" data-akt="paketInfo" data-i="${i}">${zettelHTML('paket', p.art)}<span class="preis ${run.geld < p.preis ? 'zu-teuer' : ''}">${muenze(p.preis)}</span></div>`).join('');
  const inv = invId ? `<div class="ware" data-akt="investInfo">${zettelHTML('invest', invId)}<span class="preis ${run.geld < INVESTITION[invId].preis ? 'zu-teuer' : ''}">${muenze(INVESTITION[invId].preis)}</span></div>` : '';
  return `<div class="panel foyer">
    <div class="foyer-kopf">
      <div><span class="klein">Pause im ${L.haus(run.station).name}</span><h2>Das Foyer</h2></div>
      <span class="klein">Als Nächstes: ${nName}${naechster.station !== run.station ? ' · ' + nHaus.name : ''} · Ziel ${fmt(L.ziel(run, naechster.station, naechster.abend))}</span>
    </div>
    <div class="foyer-sektion"><span class="klein">Angebote</span><div class="foyer-reihe">${ware}</div></div>
    <div class="foyer-reihe">
      <div class="foyer-sektion"><span class="klein">Pakete</span><div class="foyer-reihe">${pakete}</div></div>
      ${inv ? `<div class="foyer-sektion"><span class="klein">Investition</span><div class="foyer-reihe">${inv}</div></div>` : ''}
    </div>
    <div class="foyer-knoepfe">
      <button class="btn btn-blau" data-akt="reroll" ${run.geld >= sh.reroll ? '' : 'disabled'}>Neu disponieren<small>${muenze(sh.reroll)}</small></button>
      <button class="btn btn-gold" data-akt="foyerWeiter">Weiter<small>${naechster.station !== run.station ? 'zur nächsten Station' : nName === 'Gala' ? 'zum Gala-Abend' : 'zum Kritikerabend'}</small></button>
    </div>
  </div>`;
}

// ---------- Paket

function paketHTML() {
  const pk = run.pack;
  const P = L.PAKETE[pk.art];
  const wahl = pk.auswahl.map((a, i) => {
    let inhalt = '', text = '';
    if (a.art === 'werk') {
      inhalt = karteHTML({ uid: -1, w: a.id, enh: a.enh });
      const w = WERK[a.id];
      text = `${KOMPONISTEN[w.c][1]}, ${w.y}${a.enh ? ' · ' + VEREDELUNG[a.enh].name : ''}`;
    } else if (a.art === 'star') {
      inhalt = starHTML({ id: a.id, v: 0 });
      text = markup(STAR[a.id].text);
    } else if (a.art === 'rez') {
      inhalt = zettelHTML('rez', a.id);
      text = PROGRAMME[a.id].regel;
    } else {
      inhalt = zettelHTML('probe', a.id);
      text = markup(PROBE[a.id].text);
    }
    return `<div class="wahl">${inhalt}<span class="wahl-text">${text}</span><button class="btn btn-gold btn-klein" data-akt="paketWahl" data-i="${i}">Nehmen</button></div>`;
  }).join('');
  return `<div class="panel">
    <span class="klein">Paket geöffnet</span>
    <h2>${P.name}</h2>
    <p>${P.text}</p>
    <div class="wahl-reihe">${wahl}</div>
    <div style="display:flex;justify-content:center"><button class="btn" data-akt="paketSkip">Nichts davon</button></div>
  </div>`;
}

// ------------------------------------------------------------------ Aufführen (die große Animation)

function rectVon(el) { return el ? el.getBoundingClientRect() : null; }
function flug(text, art, el, unten = false) {
  const r = rectVon(el);
  if (!r) return;
  const f = document.createElement('div');
  f.className = 'flug ' + art;
  f.textContent = text;
  f.style.left = r.left + r.width / 2 + 'px';
  f.style.top = (unten ? r.bottom + 2 : r.top - 8) + 'px';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1000 / einst.tempo);
}
function pulsiere(el) {
  if (!el) return;
  el.classList.remove('puls');
  void el.offsetWidth;
  el.classList.add('puls');
}
function zaehleHoch(el, von, bis, ms, format = fmt) {
  return new Promise((res) => {
    const t0 = performance.now();
    const dauer = ms / einst.tempo;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dauer);
      const e = 1 - Math.pow(1 - k, 3);
      el.innerHTML = format(von + (bis - von) * e);
      if (k < 1) requestAnimationFrame(tick); else res();
    };
    requestAnimationFrame(tick);
  });
}
function schuetteln(staerke = 1) {
  if (!einst.wackeln || staerke <= 0) return;
  const s = $('#buehne');
  s.classList.remove('wackeln-screen');
  void s.offsetWidth;
  s.classList.add('wackeln-screen');
}

function metaNachVorstellung(erg) {
  const neueWerke = [];
  for (const w of erg.werke) {
    if (!meta.werke[w]) neueWerke.push(w);
    meta.werke[w] = (meta.werke[w] || 0) + 1;
  }
  const neueStern = [];
  for (const s of erg.stern) {
    if (!meta.sternstunden[s]) neueStern.push(s);
    meta.sternstunden[s] = (meta.sternstunden[s] || 0) + 1;
  }
  meta.programme[erg.art] = (meta.programme[erg.art] || 0) + 1;
  meta.vorstellungen += 1;
  for (const w of erg.werke) meta.komponisten[WERK[w].c] = (meta.komponisten[WERK[w].c] || 0) + 1;
  if (erg.gesamt > meta.besteVorstellung) { meta.besteVorstellung = erg.gesamt; meta.besteArt = erg.art; }
  return { neueWerke, neueStern };
}

async function spielen() {
  if (busy || !run?.round) return;
  const uids = [...auswahl];
  const pr = L.pruefeAuswahl(run, uids);
  if (!pr.ok) { if (pr.grund) toast(pr.grund); return; }
  A.init();
  busy = true;
  renderAktionen();
  const r = run.round;
  const zielVorher = r.ziel;
  const punkteVorher = r.punkte;
  const geldVorher = run.geld;
  const rects = new Map(uids.map((u) => [u, rectVon($(`#hand .karte[data-uid="${u}"]`))]));
  const erg = L.auffuehren(run, uids);
  if (!erg) { busy = false; renderAktionen(); return; }
  const neuMeta = metaNachVorstellung(erg);
  auswahl.clear();

  // Werke auf die Bühne
  const buehne = $('#gespielt');
  $('#hinweis').textContent = '';
  buehne.innerHTML = erg.uids.map((u) => karteHTML(L.karte(run, u))).join('');
  for (const u of erg.uids) $(`#hand .karte[data-uid="${u}"]`)?.remove();
  for (const u of erg.gehustet) $(`#hand .karte[data-uid="${u}"]`)?.classList.add('weg');
  const gezaehlt = new Set(erg.zaehlen);
  $$('.karte', buehne).forEach((el) => {
    const u = Number(el.dataset.uid);
    const r0 = rects.get(u);
    const r1 = el.getBoundingClientRect();
    if (r0) {
      el.style.transition = 'none';
      el.style.transform = `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${r0.width / r1.width})`;
      void el.offsetWidth;
      el.style.transition = `transform ${0.38 / einst.tempo}s cubic-bezier(.2,.8,.2,1)`;
      el.style.transform = '';
    }
    if (!gezaehlt.has(u)) setTimeout(() => el.classList.add('passiv'), 380 / einst.tempo);
  });
  A.austeilen(erg.uids.length);
  await warte(420);
  for (const el of $$('.karte', buehne)) el.style.transition = '';

  const fP = $('#fP'), fB = $('#fB'), name = $('#progName');
  const kartenEl = (u) => $(`#gespielt .karte[data-uid="${u}"]`);
  const starEl = (i) => $(`#stars .star[data-star="${i}"]`);
  let ton = 0;
  for (const s of erg.schritte) {
    const ziel = s.i != null && s.uid == null ? starEl(s.i) : s.uid != null ? kartenEl(s.uid) : null;
    if (s.i != null) starEl(s.i)?.classList.remove('wackeln');
    switch (s.t) {
      case 'basis':
        name.innerHTML = `${PROGRAMME[s.art].name}<small>Stufe ${s.stufe}</small>`;
        fP.textContent = fmt(s.P); fB.textContent = fmtB(s.B);
        pulsiere(name);
        A.klick();
        await warte(380);
        break;
      case 'karte': {
        const el = kartenEl(s.uid);
        if (el) { el.classList.remove('zaehlt'); void el.offsetWidth; el.classList.add('zaehlt'); }
        flug(`+${s.v}`, 'p', el);
        fP.textContent = fmt(s.P); pulsiere(fP.parentElement);
        A.karte(ton++);
        await warte(300);
        break;
      }
      case 'p': case 'px':
        flug(s.t === 'px' ? `×${fmtX(s.v)} Publikum` : `+${s.v}`, s.t === 'px' ? 'x' : 'p', s.i != null ? starEl(s.i) : ziel, s.i != null);
        if (s.i != null) { const se = starEl(s.i); se?.classList.add('wackeln'); }
        fP.textContent = fmt(s.P); pulsiere(fP.parentElement);
        if (s.t === 'px') { A.faktor(); const rr = rectVon(fP); if (rr) FX.goldstaub(rr.left + rr.width / 2, rr.top); } else A.karte(ton++);
        await warte(s.t === 'px' ? 420 : 260);
        break;
      case 'b':
        flug(`+${fmtB(s.v)}`, 'b', s.i != null ? starEl(s.i) : ziel, s.i != null);
        if (s.i != null) starEl(s.i)?.classList.add('wackeln');
        fB.textContent = fmtB(s.B); pulsiere(fB.parentElement);
        A.begeisterung(ton);
        await warte(260);
        break;
      case 'x': {
        const el = s.i != null ? starEl(s.i) : ziel;
        flug(`×${fmtX(s.v)}`, 'x', el, s.i != null);
        if (s.i != null) el?.classList.add('wackeln');
        fB.textContent = fmtB(s.B); pulsiere(fB.parentElement);
        A.faktor();
        const rr = rectVon(fB); if (rr) FX.goldstaub(rr.left + rr.width / 2, rr.top + rr.height / 2, 10);
        await warte(400);
        break;
      }
      case 'g':
        flug(`+${s.v} Dukaten`, 'g', s.i != null ? starEl(s.i) : ziel, s.i != null);
        if (s.i != null) starEl(s.i)?.classList.add('wackeln');
        A.geld();
        await warte(260);
        break;
      case 'nichtig':
        fP.textContent = '0'; fB.textContent = '0';
        $$('.karte', buehne).forEach((el) => el.classList.add('nicht'));
        banner(`<span class="b-klein">${KRITIK[run.round?.kritiker || 'gelangweilt']?.name || 'Kritik'}</span><span class="b-gross">Durchgefallen</span><span class="b-neu" style="color:#ffb4aa">${s.text}</span>`, 1600);
        A.nichts();
        await warte(1300);
        break;
      case 'nicht':
        flug('zählt nicht', 'n', ziel);
        kartenEl(s.uid)?.classList.add('nicht');
        A.nichts();
        await warte(300);
        break;
      case 'zugabe':
        flug('Zugabe!', 'z', ziel);
        await warte(220);
        break;
      case 'wachs':
        if (s.i != null) { starEl(s.i)?.classList.add('wackeln'); flug(s.text, 'w', starEl(s.i), true); }
        await warte(240);
        break;
      case 'stern': {
        const neu = neuMeta.neueStern.includes(s.id);
        A.sternstunde();
        banner(`<span class="b-klein">★ Sternstunde ★</span><span class="b-gross">${s.name}</span><span class="b-x">×${fmtX(s.v)} Begeisterung</span>${neu ? '<span class="b-neu">Neu im Werkverzeichnis entdeckt!</span>' : ''}`, 1900);
        FX.goldstaub(window.innerWidth / 2, window.innerHeight * 0.42, 40);
        fB.textContent = fmtB(s.B); pulsiere(fB.parentElement);
        await warte(1500);
        break;
      }
      default: break;
    }
  }

  // Gesamtwert
  await warte(160);
  $$('.karte', buehne).forEach((el) => el.classList.add('hoch'));
  const ges = $('#gesamt');
  ges.textContent = '0';
  const anteil = Math.min(1.5, erg.gesamt / Math.max(1, zielVorher));
  await zaehleHoch(ges, 0, erg.gesamt, 450 + Math.min(600, anteil * 500));
  pulsiere(ges);
  if (anteil >= 0.35) schuetteln(anteil);
  A.applaus(Math.min(1, 0.25 + anteil * 0.7));
  if (anteil >= 0.6) FX.rosen(Math.min(1, anteil * 0.6));
  if (erg.gesamt >= zielVorher) banner('<span class="b-klein">Ein einziger Abend</span><span class="b-gross">Standing Ovations!</span>', 1500);
  buehne.innerHTML = '';
  await warte(250);

  // Applaus ins Konto
  const hA = $('#hApplaus');
  await zaehleHoch(hA, punkteVorher, punkteVorher + erg.gesamt, 520);
  $('#hBar').style.width = Math.min(100, (100 * (punkteVorher + erg.gesamt)) / zielVorher) + '%';
  if (run.geld !== geldVorher) { $('#hGeld').innerHTML = muenze(run.geld); pulsiere($('#hGeld')); }
  if (erg.kosten) toast(`Der Sparkommissar kassiert ${erg.kosten} ${erg.kosten === 1 ? 'Dukat' : 'Dukaten'}.`);
  for (const w of neuMeta.neueWerke.slice(0, 2)) toast(`Neu im Werkverzeichnis: <b>${WERK[w].t}</b>`, 'neu-werk');
  await warte(380);
  ges.textContent = '';
  speichern();

  if (erg.gewonnen) {
    busy = false;
    await warte(200);
    FX.rosen(0.8);
    A.applaus(1, 3.4);
    renderHud();
    renderEnsemble();
    renderMitte();
    renderAktionen();
    bravoAnimieren();
    pruefeMeta();
    speichern();
    return;
  }
  if (erg.verloren) {
    busy = false;
    A.niederlage();
    await warte(600);
    laufBeendet(false);
    return;
  }
  busy = false;
  renderHud();
  renderEnsemble();
  renderHand(erg.neu);
  if (erg.neu.length) A.austeilen(erg.neu.length);
  renderVorschau();
  renderAktionen();
}

async function umbesetzen() {
  if (busy || !run?.round || !auswahl.size || run.round.umbes <= 0) return;
  A.init();
  busy = true;
  const uids = [...auswahl];
  for (const u of uids) $(`#hand .karte[data-uid="${u}"]`)?.classList.add('weg');
  A.austeilen(uids.length);
  await warte(280);
  const erg = L.umbesetzen(run, uids);
  auswahl.clear();
  busy = false;
  if (!erg) { renderHand(); return; }
  renderHud();
  renderHand(erg.neu);
  A.austeilen(erg.neu.length);
  renderVorschau();
  renderAktionen();
  speichern();
}

function auswaehlen(uid) {
  if (busy || !run?.round || run.phase !== 'abend') return;
  if (auswahl.has(uid)) auswahl.delete(uid);
  else {
    if (auswahl.size >= 5) { toast('Höchstens fünf Werke pro Vorstellung.'); return; }
    auswahl.add(uid);
  }
  A.init();
  A.waehlen(auswahl.has(uid));
  $(`#hand .karte[data-uid="${uid}"]`)?.classList.toggle('gewaehlt', auswahl.has(uid));
  renderVorschau();
  renderAktionen();
}

// ------------------------------------------------------------------ Phasen-Aktionen

async function abendStarten() {
  if (busy) return;
  A.init();
  busy = true;
  await vorhangZu();
  L.starteAbend(run);
  auswahl.clear();
  busy = false;
  renderSpiel();
  renderHand(run.round.hand);
  if (run.round.kritiker) A.gong();
  await vorhangAuf();
  A.austeilen(run.round.hand.length);
  if (run.round.orakel) toast(`Das Orakel deutet: <b>${SCHULEN[run.round.orakel].name}</b>.`);
  speichern();
}

function kassieren() {
  if (run.phase !== 'bravo') return;
  A.geld();
  L.kassieren(run);
  if (run.phase === 'sieg') {
    laufBeendet(true);
    return;
  }
  for (const a of run.shop.angebote) if (a.art === 'star') meta.starsGesehen = { ...(meta.starsGesehen || {}), [a.id]: 1 };
  renderSpiel();
  speichern();
}

function foyerWeiter() {
  const vorher = run.station;
  L.foyerVerlassen(run);
  if (run.station !== vorher) {
    meta.besteStation = Math.max(meta.besteStation, run.station);
    pruefeMeta();
  }
  renderSpiel();
  speichern();
}

function pruefeMeta() {
  meta.besteStation = Math.max(meta.besteStation, run?.station || 0);
  const neu = pruefeFreischaltungen(meta);
  for (const r of neu) toast(`Freigeschaltet: <b>${r.name}</b>`, 'gut');
  speichereMeta(meta);
}

function laufBeendet(sieg) {
  meta.laeufe += 1;
  meta.besteStation = Math.max(meta.besteStation, sieg ? L.STATIONEN + 1 : run.station);
  if (sieg) {
    meta.siege += 1;
    meta.siegeJeDeck[run.deck] = Math.max(meta.siegeJeDeck[run.deck] || 0, run.strenge);
    if (run.strenge >= meta.strengeFrei && meta.strengeFrei < 5) {
      meta.strengeFrei = run.strenge + 1;
      toast(`Strenge ${meta.strengeFrei} freigeschaltet.`, 'gut');
    }
  }
  if (run.taeglich) {
    const alt = meta.taeglich[run.taeglich];
    const neu = { station: sieg ? L.STATIONEN : run.station, sieg, punkte: run.stats.besteVorstellung };
    if (!alt || neu.station > alt.station || (sieg && !alt.sieg)) meta.taeglich[run.taeglich] = neu;
  }
  pruefeMeta();
  if (sieg) {
    speichereLauf(run);
    A.triumph();
    FX.konfetti(220);
  } else {
    run.phase = 'vorhang';
    loescheLauf();
  }
  speichereMeta(meta);
  zeigeEnde(sieg);
}

// ------------------------------------------------------------------ Tagebuch & Ende

function halbeSterne(n) {
  const voll = Math.floor(n);
  return '★'.repeat(voll) + (n - voll >= 0.5 ? '½' : '');
}

const MIT_ARTIKEL = {
  solo: 'eine Solo-Arie', doppel: 'ein Doppelabend', zweiDoppel: 'zwei Doppelabende', national: 'ein Nationalabend',
  kompAbend: 'ein Komponistenabend', zeitreise: 'eine Zeitreise', festspiel: 'eine Festspielwoche', werkschau: 'eine Werkschau',
  grosseZeit: 'eine Große Zeitreise', gesamtwerk: 'ein Gesamtwerk',
};
const ZAHLWORT = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
const mal = (n) => (n < ZAHLWORT.length ? ZAHLWORT[n] + 'mal' : `${n}-mal`);
const abende = (n) => `${n} ${n === 1 ? 'Abend' : 'Abende'}`;

function rezensionText(sieg) {
  const st = run.stats;
  const deck = REPERTOIRE[run.deck].name;
  const h = L.haus(run.station);
  const teile = [];
  if (sieg) teile.push(`Eine Spielzeit für die Geschichtsbücher: mit dem ${deck} von der Oper Leipzig bis auf den Grünen Hügel – ${abende(st.abende)}, und das Publikum wollte nicht nach Hause.`);
  else if (run.station === 1) teile.push(`Die Spielzeit mit dem ${deck} endete schon beim Heimspiel in Leipzig. ${st.abende === 0 ? 'Gleich der erste Abend wurde zur Zitterpartie.' : `Immerhin ${st.abende === 1 ? 'ein Abend' : abende(st.abende)} mit Applaus.`}`);
  else teile.push(`Mit dem ${deck} ging es bis nach ${h.stadt}. ${st.abende === 1 ? 'Ein Abend hielt' : `${abende(st.abende)} hielten`} das Haus in Atem.`);
  const stern = Object.keys(st.sternstunden);
  if (stern.length) {
    const namen = stern.map((id) => STERNSTUNDEN.find((s) => s.id === id)?.name).filter(Boolean);
    teile.push(`Unvergessen: ${namen.slice(0, 3).join(', ')} – ${namen.length > 1 ? 'echte Sternstunden' : 'eine echte Sternstunde'}.`);
  }
  if (st.besteVorstellung > 0 && st.besteArt) {
    const titel = st.besteWerke.slice(0, 3).map((w) => WERK[w].t).join(', ');
    teile.push(`Am stärksten: ${MIT_ARTIKEL[st.besteArt]} mit ${titel}${st.besteWerke.length > 3 ? ' und mehr' : ''} – ${fmt(st.besteVorstellung)} Applaus.`);
  }
  const lk = L.lieblingsKomponist(run);
  if (lk) teile.push(`${KOMPONISTEN[lk.id][1]} stand ${mal(lk.n)} auf dem Programm.`);
  if (!sieg && st.ende) {
    const e = st.ende;
    const fehlt = Math.max(0, e.ziel - e.punkte);
    if (e.kritiker) teile.push(`Am Kritikerabend hatte ${KRITIK[e.kritiker].name} das letzte Wort – es fehlten ${fmt(fehlt)} Applaus.`);
    else teile.push(`${e.abend === 2 ? 'Beim Kritikerabend' : `Bei der ${ABENDE[e.abend].name}`} fehlten am Ende ${fmt(fehlt)} Applaus.`);
  }
  const schluss = sieg ? ['Würde sofort wieder hingehen.', 'Fünf Sterne, ohne Zögern.', 'Bravissimo.'] : ['Würde wieder hingehen.', 'Nächste Spielzeit wird alles anders.', 'Da capo, bitte.', 'Die Inszenierung bleibt im Gedächtnis.'];
  teile.push(schluss[(run.seed + st.abende) % schluss.length]);
  return teile;
}

function zeigeEnde(sieg) {
  const st = run.stats;
  const h = L.haus(Math.min(run.station, L.STATIONEN + 20));
  const bewertung = sieg ? 5 : Math.max(0.5, Math.min(4.5, 0.5 * Math.floor((run.station - 1) * 1.1 + run.abend * 0.4 + 1)));
  const lk = L.lieblingsKomponist(run);
  const plakatFarbe = lk ? ({ mozart: '#c9a84c', verdi: '#2d7d46', wagner: '#7d2d2d', puccini: '#2d5a7d', rstrauss: '#7d5a2d', bizet: '#7d2d5a', haendel: '#5a2d7d', rossini: '#2d7d7d', donizetti: '#7d7d2d' }[lk.id] || '#8b1a2b') : '#8b1a2b';
  const datum = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const ov = $('#overlay');
  ov.hidden = false;
  ov.innerHTML = `<div class="ov-inner"><div class="ende">
    <h2>${sieg ? 'Triumph!' : 'Vorhang.'}</h2>
    <p class="unter">${sieg ? 'Bayreuth liegt dir zu Füßen.' : `Die Spielzeit endet in ${h.stadt}.`}</p>
    <div class="tagebuch">
      <div class="tb-kopf">
        <div class="tb-poster" style="--pf:${plakatFarbe}">Dc</div>
        <div>
          <div class="tb-titel">Spielzeit ${run.taeglich ? 'des Tages' : ''} · ${REPERTOIRE[run.deck].name}</div>
          <div class="tb-meta">${h.name} · ${datum}${run.strenge > 1 ? ` · Strenge ${run.strenge}` : ''}</div>
          <div class="tb-sterne">${halbeSterne(bewertung)}</div>
        </div>
      </div>
      <div class="tb-text">${rezensionText(sieg).map((t) => `<p>${t}</p>`).join('')}</div>
    </div>
    <div class="ende-stats">
      <div class="stat"><span>Station</span><b>${sieg ? '8 / 8' : run.station}</b></div>
      <div class="stat"><span>Abende</span><b>${st.abende}</b></div>
      <div class="stat"><span>Beste Vorst.</span><b>${fmt(st.besteVorstellung)}</b></div>
    </div>
    <div class="ende-knoepfe">
      ${sieg ? '<button class="btn btn-gold btn-gross" data-akt="endlos">Gastspiele: endlos weiter</button>' : ''}
      <button class="btn ${sieg ? '' : 'btn-gold btn-gross'}" data-akt="dacapo">Da capo! <small>gleiches Repertoire</small></button>
      <button class="btn" data-akt="zumTitel">Zum Titel</button>
    </div>
  </div></div>`;
}

// ------------------------------------------------------------------ Sheets

function sheet(html) {
  const s = $('#sheet');
  s.hidden = false;
  $('.sheet-box', s).innerHTML = html;
}
function sheetZu() { $('#sheet').hidden = true; }

function starSheet(i) {
  const s = run.stars[i];
  const d = STAR[s.id];
  const wert = d.wert ? markup(d.wert(s.v, run)) : '';
  const aus = run.round && run.round.offStar === i;
  sheet(`<div class="sh-kopf">${starHTML(s)}<div><span class="klein">${RARITAET[d.rar]}</span><h3>${d.name}</h3></div></div>
    <p class="sh-text">${markup(d.text)}</p>
    ${wert ? `<p class="sh-wert">${wert}</p>` : ''}
    ${aus ? '<p class="sh-grund">Heute indisponiert (Primadonna assoluta).</p>' : ''}
    ${d.flavor ? `<p class="sh-flavor">${d.flavor}</p>` : ''}
    <p class="sh-wert" style="font-size:.82rem">Stars wirken von links nach rechts – die Reihenfolge zählt bei Faktoren.</p>
    <div class="sh-knoepfe">
      <button class="btn btn-klein" data-akt="starLinks" data-i="${i}" ${i === 0 || busy ? 'disabled' : ''}>${icon('links')}</button>
      <button class="btn btn-klein" data-akt="starRechts" data-i="${i}" ${i === run.stars.length - 1 || busy ? 'disabled' : ''}>${icon('rechts')}</button>
      <button class="btn btn-rot" data-akt="starVerkaufen" data-i="${i}" ${busy ? 'disabled' : ''}>Verkaufen · +${muenze(L.verkaufswert(s))}</button>
    </div>`);
}

function probeSheet(i) {
  const id = run.proben[i];
  const p = PROBE[id];
  const bereit = L.probeBereit(run, id, [...auswahl]);
  sheet(`<div class="sh-kopf">${zettelHTML('probe', id)}<div><span class="klein">Probe</span><h3>${p.name}</h3></div></div>
    <p class="sh-text">${markup(p.text)}</p>
    ${!bereit.ok && bereit.grund ? `<p class="sh-grund">${bereit.grund}</p>` : ''}
    <div class="sh-knoepfe">
      <button class="btn btn-gold" data-akt="probeNutzen" data-i="${i}" ${bereit.ok && !busy ? '' : 'disabled'}>Anwenden</button>
      <button class="btn btn-rot" data-akt="probeVerkaufen" data-i="${i}" ${busy ? 'disabled' : ''}>Verkaufen · +${muenze(1)}</button>
    </div>`);
}

function wareSheet(i) {
  const a = run.shop.angebote[i];
  let kopf = '', text = '', titel = '', klein = '';
  if (a.art === 'star') {
    const d = STAR[a.id];
    kopf = starHTML({ id: a.id, v: 0 }); titel = d.name; klein = `Star · ${RARITAET[d.rar]}`;
    text = `<p class="sh-text">${markup(d.text)}</p>${d.flavor ? `<p class="sh-flavor">${d.flavor}</p>` : ''}`;
  } else if (a.art === 'rez') {
    const P = PROGRAMME[a.id];
    kopf = zettelHTML('rez', a.id); titel = REZENSIONEN[a.id]; klein = 'Rezension';
    text = `<p class="sh-text">Eine Hymne auf deinen ${P.name}: das Programm steigt sofort auf Stufe ${run.stufen[a.id] + 1} (<span class="t-p">+${P.sp} Publikum</span>, <span class="t-b">+${P.sb} Begeisterung</span>).</p><p class="sh-wert">${P.regel}</p>`;
  } else if (a.art === 'probe') {
    const p = PROBE[a.id];
    kopf = zettelHTML('probe', a.id); titel = p.name; klein = 'Probe';
    text = `<p class="sh-text">${markup(p.text)}</p>`;
  } else {
    const w = WERK[a.id];
    kopf = karteHTML({ uid: -1, w: a.id, enh: a.enh }); titel = w.t; klein = 'Werk fürs Repertoire';
    text = werkText(a.id, a.enh);
  }
  const platz = a.art === 'star' ? run.stars.length < run.maxStars : a.art === 'probe' ? run.proben.length < run.maxProben : true;
  sheet(`<div class="sh-kopf">${kopf}<div><span class="klein">${klein}</span><h3>${titel}</h3></div></div>
    ${text}
    ${!platz ? `<p class="sh-grund">${a.art === 'star' ? 'Alle Logenplätze sind besetzt – verkaufe zuerst einen Star.' : 'Kein Platz mehr für Proben.'}</p>` : ''}
    <div class="sh-knoepfe">
      <button class="btn" data-akt="sheetZu">Zurück</button>
      <button class="btn btn-gold" data-akt="kaufen" data-i="${i}" ${run.geld >= a.preis && platz ? '' : 'disabled'}>Kaufen · ${muenze(a.preis)}</button>
    </div>`);
}

function werkText(wid, enh = null) {
  const w = WERK[wid];
  const ep = EPOCHEN[epocheVon(w.y)];
  const stern = sternstundenVon(wid);
  const sternText = stern.length ? stern.map((s) => meta.sternstunden[s.id] ? `★ ${s.name}` : '★ Teil einer noch unentdeckten Sternstunde').filter((v, i, a) => a.indexOf(v) === i).join('<br>') : '';
  return `<p class="sh-text">${KOMPONISTEN[w.c][1]}, ${w.y} · ${ep.name}</p>
    <p class="sh-wert">${SCHULEN[w.s].name} · ${w.a} ${w.a === 1 ? 'Akt' : 'Akte'}${w.h ? ' · heiter' : ''} · Ruhm ${w.r}${meta.werke[wid] ? ` · ${meta.werke[wid]}× gespielt` : ' · noch nie gespielt'}</p>
    ${enh ? `<p class="sh-text"><b>${VEREDELUNG[enh].name}:</b> ${markup(VEREDELUNG[enh].text)}, wenn gezählt.</p>` : ''}
    ${sternText ? `<p class="sh-wert" style="color:var(--gold-h)">${sternText}</p>` : ''}`;
}

function karteSheet(uid) {
  const c = L.karte(run, uid);
  if (!c || run.round?.verdeckt[uid]) return;
  const w = WERK[c.w];
  const umgeschrieben = c.s && c.s !== w.s ? `<p class="sh-wert">Übersetzt: zählt als ${SCHULEN[c.s].name}.</p>` : '';
  sheet(`<div class="sh-kopf">${karteHTML(c)}<div><span class="klein">Werk</span><h3>${w.t}</h3></div></div>
    ${werkText(c.w, c.enh)}${umgeschrieben}
    <div class="sh-knoepfe"><button class="btn" data-akt="sheetZu">Schließen</button></div>`);
}

function paketSheet(i) {
  const p = run.shop.pakete[i];
  const P = L.PAKETE[p.art];
  sheet(`<div class="sh-kopf">${zettelHTML('paket', p.art)}<div><span class="klein">Paket</span><h3>${P.name}</h3></div></div>
    <p class="sh-text">${P.text}</p>
    <div class="sh-knoepfe"><button class="btn" data-akt="sheetZu">Zurück</button>
    <button class="btn btn-gold" data-akt="paketKaufen" data-i="${i}" ${run.geld >= p.preis ? '' : 'disabled'}>Öffnen · ${muenze(p.preis)}</button></div>`);
}

function investSheet() {
  const id = run.investAngebot[run.station];
  if (!id) return;
  const v = INVESTITION[id];
  sheet(`<div class="sh-kopf">${zettelHTML('invest', id)}<div><span class="klein">Investition · gilt für die ganze Spielzeit</span><h3>${v.name}</h3></div></div>
    <p class="sh-text">${v.text}</p>
    <p class="sh-wert">Pro Station gibt es ein Angebot. Bereits getätigt: ${run.investitionen.length ? run.investitionen.map((x) => INVESTITION[x].name).join(', ') : 'nichts'}.</p>
    <div class="sh-knoepfe"><button class="btn" data-akt="sheetZu">Zurück</button>
    <button class="btn btn-gold" data-akt="investKaufen" ${run.geld >= v.preis ? '' : 'disabled'}>Investieren · ${muenze(v.preis)}</button></div>`);
}

function bestaetigen(text, akt, knopf = 'Ja') {
  sheet(`<p class="sh-text" style="font-size:1.05rem">${text}</p>
    <div class="sh-knoepfe"><button class="btn" data-akt="sheetZu">Abbrechen</button><button class="btn btn-rot" data-akt="${akt}">${knopf}</button></div>`);
}

// ------------------------------------------------------------------ Overlays

function overlay(html) {
  const ov = $('#overlay');
  ov.hidden = false;
  ov.innerHTML = `<div class="ov-inner">${html}</div>`;
  ov.scrollTop = 0;
}
function overlayZu() { $('#overlay').hidden = true; }
const ovKopf = (titel) => `<div class="ov-kopf"><h2>${titel}</h2><button class="icon-btn" data-akt="overlayZu" title="Schließen">${icon('schliessen')}</button></div>`;

function zeigeProgramme() {
  const zeilen = PROGRAMM_IDS.map((a) => {
    const w = run ? L.programmWerte(run, a) : { p: PROGRAMME[a].p, b: PROGRAMME[a].b, stufe: 1 };
    return `<tr><td><span class="prog">${PROGRAMME[a].name}</span>${w.stufe > 1 ? `<span class="stufe-pill">Stufe ${w.stufe}</span>` : ''}<span class="regel">${PROGRAMME[a].regel}</span></td>
      <td class="zahl"><span class="t-p">${w.p}</span> × <span class="t-b">${w.b}</span></td>
      <td class="zahl">${run ? run.gespielt[a] : meta.programme[a] || 0}×</td></tr>`;
  }).join('');
  overlay(`${ovKopf('Programme')}
    <p style="color:var(--text-m)">Applaus = (Grund-Publikum + Ruhm der gezählten Werke + Boni) × Begeisterung. Rezensionen heben ein Programm um eine Stufe. Passen mehrere Programme, spielt das Haus die stärkste Lesart.</p>
    <table class="tabelle"><thead><tr><th>Programm</th><th class="zahl">Grundwert</th><th class="zahl">${run ? 'Diese Spielzeit' : 'Gesamt'}</th></tr></thead><tbody>${zeilen}</tbody></table>`);
}

function zeigeRepertoire() {
  const r = run.round;
  const imStapel = new Set(r ? r.stapel : run.repertoire.map((c) => c.uid));
  const gruppen = {};
  for (const c of run.repertoire) (gruppen[L.komp(c)] ||= []).push(c);
  const sortiert = Object.entries(gruppen).sort((a, b) => b[1].length - a[1].length || KOMPONISTEN[a[0]][0].localeCompare(KOMPONISTEN[b[0]][0], 'de'));
  const schulen = {}, epochen = {};
  for (const c of run.repertoire) {
    schulen[L.schule(c)] = (schulen[L.schule(c)] || 0) + 1;
    epochen[L.epoche(c)] = (epochen[L.epoche(c)] || 0) + 1;
  }
  overlay(`${ovKopf(`Repertoire · ${run.repertoire.length} Werke`)}
    ${r ? `<p style="color:var(--text-m)">Noch ${r.stapel.length} im Stapel. Gezogene und gespielte Werke sind blass.</p>` : ''}
    <div class="rep-statistik">${Object.entries(schulen).map(([s, n]) => `<span class="chip">${SCHULEN[s].name} <b>${n}</b></span>`).join('')}</div>
    <div class="rep-statistik" style="margin-top:6px">${EPOCHEN.map((e, i) => epochen[i] ? `<span class="chip">${e.name} <b>${epochen[i]}</b></span>` : '').join('')}</div>
    ${sortiert.map(([k, cs]) => `<div class="rep-gruppe"><h4>${KOMPONISTEN[k][1]} · ${cs.length}</h4><div class="rep-karten">${cs.sort((a, b) => WERK[a.w].y - WERK[b.w].y).map((c) => karteHTML(c, { klasse: r && !imStapel.has(c.uid) ? 'weg-im-abend' : '' })).join('')}</div></div>`).join('')}`);
}

function zeigeVerzeichnis(tab = ovTab) {
  ovTab = tab;
  const tabs = [['werke', 'Werke'], ['stern', 'Sternstunden'], ['stars', 'Stars'], ['statistik', 'Statistik']];
  let inhalt = '';
  if (tab === 'werke') {
    const gruppen = {};
    for (const w of WERKE) (gruppen[w.c] ||= []).push(w);
    const n = Object.keys(meta.werke).length;
    inhalt = `<p style="color:var(--text-m)">${n} von ${WERKE.length} Werken standen schon auf deiner Bühne.</p>
      <div class="fortschritt"><i style="width:${(100 * n) / WERKE.length}%"></i></div>
      ${Object.entries(gruppen).sort((a, b) => b[1].length - a[1].length || KOMPONISTEN[a[0]][0].localeCompare(KOMPONISTEN[b[0]][0], 'de')).map(([k, ws]) => {
        const gesehen = ws.filter((w) => meta.werke[w.id]).length;
        return `<div class="verz-gruppe"><h4>${KOMPONISTEN[k][1]}<small>${gesehen}/${ws.length}</small></h4><div class="verz-werke">
          ${ws.sort((a, b) => a.y - b.y).map((w) => `<div class="verz-werk ${meta.werke[w.id] ? '' : 'neu-g'}" style="--sf:${SCHULEN[w.s].farbe}"><i>${w.t}</i><span>${meta.werke[w.id] ? meta.werke[w.id] + '×' : w.y}</span></div>`).join('')}
        </div></div>`;
      }).join('')}`;
  } else if (tab === 'stern') {
    const n = STERNSTUNDEN.filter((s) => meta.sternstunden[s.id]).length;
    inhalt = `<p style="color:var(--text-m)">${n} von ${STERNSTUNDEN.length} entdeckt. Spiele die richtigen Werke gemeinsam in einer Vorstellung.</p>
      <div class="fortschritt"><i style="width:${(100 * n) / STERNSTUNDEN.length}%"></i></div>
      <div class="stern-liste">${STERNSTUNDEN.map((s) => {
        const da = meta.sternstunden[s.id];
        const werke = s.werke ? s.werke.map((w) => WERK[w].t).join(' · ') + (s.min ? ` (${s.min} davon)` : '') : s.komponisten.map((k) => KOMPONISTEN[k][1]).join(' · ');
        return `<div class="stern-eintrag ${da ? '' : 'zu'}"><span class="se-stern">★</span><div><div class="se-name">${da ? s.name : '???'}</div><div class="se-hinweis">${s.hinweis}</div>${da ? `<div class="se-werke">${werke}</div>` : ''}</div><span class="t-x">×${fmtX(s.x)}</span></div>`;
      }).join('')}</div>`;
  } else if (tab === 'stars') {
    const n = STARS.filter((s) => meta.stars[s.id]).length;
    inhalt = `<p style="color:var(--text-m)">${n} von ${STARS.length} Stars schon engagiert. Tippe auf einen, um ihn kennenzulernen.</p>
      <div class="fortschritt"><i style="width:${(100 * n) / STARS.length}%"></i></div>
      <div class="stars-galerie">${STARS.map((s) => {
        const bekannt = meta.stars[s.id] || meta.starsGesehen?.[s.id];
        return `<div data-akt="galerieStar" data-id="${s.id}">${starHTML({ id: s.id, v: 0 }, { unbekannt: !bekannt })}</div>`;
      }).join('')}</div>`;
  } else {
    const lieb = Object.entries(meta.komponisten).sort((a, b) => b[1] - a[1])[0];
    const prog = Object.entries(meta.programme).sort((a, b) => b[1] - a[1])[0];
    inhalt = `<div class="stat-raster">
      <div class="stat"><span>Spielzeiten</span><b>${meta.laeufe}</b></div>
      <div class="stat"><span>Gewonnen</span><b>${meta.siege}</b></div>
      <div class="stat"><span>Beste Station</span><b>${meta.besteStation > L.STATIONEN ? 'Sieg' : meta.besteStation || '–'}</b></div>
      <div class="stat"><span>Vorstellungen</span><b>${fmt(meta.vorstellungen)}</b></div>
      <div class="stat"><span>Beste Vorstellung</span><b>${fmt(meta.besteVorstellung)}</b></div>
      <div class="stat"><span>Lieblingskomponist</span><b>${lieb ? KOMPONISTEN[lieb[0]][0] : '–'}</b></div>
      <div class="stat"><span>Liebstes Programm</span><b style="font-size:1rem">${prog ? PROGRAMME[prog[0]].name : '–'}</b></div>
      <div class="stat"><span>Strenge frei bis</span><b>${meta.strengeFrei}</b></div>
    </div>`;
  }
  overlay(`${ovKopf('Werkverzeichnis')}
    <div class="tabs">${tabs.map(([id, t]) => `<button class="${id === tab ? 'aktiv' : ''}" data-akt="verzTab" data-id="${id}">${t}</button>`).join('')}</div>
    ${inhalt}`);
}

function zeigeAnleitung() {
  overlay(`${ovKopf('Anleitung')}
    <div class="ov-sektion"><h3>Worum es geht</h3>
      <p>Du bist Intendant und tourst mit deinem Repertoire durch acht Opernhäuser – von der Oper Leipzig bis nach Bayreuth. An jeder Station gibt es drei Abende: <b>Premiere</b>, <b>Gala</b> und den <b>Kritikerabend</b>, an dem eine Kritikerin oder ein Kritiker eine Sonderregel mitbringt. Erreichst du an einem Abend das Ziel nicht, fällt der Vorhang.</p></div>
    <div class="ov-sektion"><h3>Ein Abend</h3>
      <ul>
        <li>Du ziehst acht Werke auf die Hand. Wähle bis zu fünf und tippe auf <b>Aufführen</b>.</li>
        <li><b>Applaus = Publikum × Begeisterung.</b> Das Programm (siehe unten) gibt die Grundwerte, jedes gezählte Werk bringt seinen <span class="t-p">Ruhm</span> als Publikum dazu.</li>
        <li>Du hast vier <b>Vorstellungen</b> und drei <b>Umbesetzungen</b> (Werke abwerfen und nachziehen).</li>
        <li>Übrige Vorstellungen bringen Dukaten, und je 5 Dukaten auf dem Konto gibt es 1 Dukat Zinsen.</li>
      </ul></div>
    <div class="ov-sektion"><h3>Die Programme</h3>
      <table class="tabelle"><tbody>${PROGRAMM_IDS.map((a) => `<tr><td><span class="prog">${PROGRAMME[a].name}</span><span class="regel">${PROGRAMME[a].regel}</span></td><td class="zahl"><span class="t-p">${PROGRAMME[a].p}</span> × <span class="t-b">${PROGRAMME[a].b}</span></td></tr>`).join('')}</tbody></table>
      <p>Nur die Werke, die zum Programm gehören, zählen. Bei der <b>Zeitreise</b> zählen die Jahrzehnte der Entstehung: 1853, 1867, 1871, 1887 und 1893 sind fünf Jahrzehnte innerhalb von sieben.</p></div>
    <div class="ov-sektion"><h3>Die Werke</h3>
      <ul>
        <li>Oben links: <span class="t-p">Ruhm</span> (2–11). Oben rechts: die <b>Schule</b> (Sprache der Uraufführung): ITA, DEU, FRA, OST, ENG.</li>
        <li>Unten: Entstehungsjahr, <b>heiter</b> bei Komödien und Operetten, die Punkte zählen die Akte.</li>
        <li>Lange tippen (oder Rechtsklick) zeigt Details.</li>
      </ul></div>
    <div class="ov-sektion"><h3>Sternstunden</h3>
      <p>Berühmte Paarungen und Zyklen – die Da-Ponte-Trilogie, Cav/Pag, der Ring … Stehen sie gemeinsam im Programm, vervielfacht sich die Begeisterung. Sechzehn gibt es zu entdecken.</p></div>
    <div class="ov-sektion"><h3>Das Foyer</h3>
      <ul>
        <li><b>Stars</b> (bis zu fünf) wirken bei jeder Vorstellung, von links nach rechts.</li>
        <li><b>Rezensionen</b> heben ein Programm sofort um eine Stufe.</li>
        <li><b>Proben</b> verändern Werke: Neuinszenierung, Starbesetzung, Übersetzung, Streichung …</li>
        <li><b>Werke</b> und <b>Pakete</b> erweitern dein Repertoire, <b>Investitionen</b> gelten für die ganze Spielzeit.</li>
      </ul></div>
    <div class="ov-sektion"><h3>Tastatur</h3>
      <p><b>1–9</b> Werk wählen · <b>Enter</b> Aufführen · <b>U</b> Umbesetzen · <b>S</b> Sortierung · <b>P</b> Programme · <b>Esc</b> schließen</p></div>`);
}

function zeigeMenue() {
  const schalter = (akt, wert, opts) => `<div class="schalter">${opts.map(([v, t]) => `<button class="${wert === v ? 'aktiv' : ''}" data-akt="${akt}" data-v="${v}">${t}</button>`).join('')}</div>`;
  overlay(`${ovKopf('Menü')}
    <div class="menue-liste">
      <button class="btn btn-gold btn-gross" data-akt="overlayZu">Weiterspielen</button>
      <div class="einst-reihe"><span>Klang</span>${schalter('setTon', einst.ton ? 1 : 0, [[1, 'An'], [0, 'Aus']])}</div>
      <div class="einst-reihe"><span>Musik</span>${schalter('setMusik', einst.musik ? 1 : 0, [[1, 'An'], [0, 'Aus']])}</div>
      <div class="einst-reihe"><span>Tempo</span>${schalter('setTempo', einst.tempo, [[1, '1×'], [1.6, '2×'], [2.6, '3×']])}</div>
      <div class="einst-reihe"><span>Wackeln</span>${schalter('setWackeln', einst.wackeln ? 1 : 0, [[1, 'An'], [0, 'Aus']])}</div>
      <button class="btn" data-akt="programme">Programme</button>
      <button class="btn" data-akt="repertoire">Repertoire</button>
      <button class="btn" data-akt="verzeichnis">Werkverzeichnis</button>
      <button class="btn" data-akt="anleitung">Anleitung</button>
      <button class="btn" data-akt="zumTitel">Zum Titel (Spielzeit bleibt gespeichert)</button>
      <button class="btn btn-rot" data-akt="aufgebenFrage">Spielzeit aufgeben</button>
    </div>`);
}

// ------------------------------------------------------------------ Eingabe

const AKTIONEN = {
  fortsetzen: async () => { A.init(); await vorhangZu(); renderSpiel(); await vorhangAuf(); },
  neu: () => { A.init(); if (run && run.phase !== 'vorhang') bestaetigen('Die laufende Spielzeit wird aufgegeben. Wirklich neu beginnen?', 'neuBestaetigt', 'Neu beginnen'); else renderNeu(); },
  neuBestaetigt: () => { sheetZu(); run = null; loescheLauf(); renderNeu(); },
  taeglich: () => {
    A.init();
    const start = () => laufStarten({ deck: 'leipzig', strenge: 1, seed: L.seedAus('dacapo-' + tagesDatum()), taeglich: tagesDatum() });
    if (run && run.phase !== 'vorhang') { AKTIONEN._taeglichDanach = start; bestaetigen('Die laufende Spielzeit wird aufgegeben. Den Spielplan des Tages starten?', 'taeglichBestaetigt', 'Starten'); } else start();
  },
  taeglichBestaetigt: () => { sheetZu(); loescheLauf(); run = null; AKTIONEN._taeglichDanach?.(); },
  titel: () => renderTitel(),
  deckWahl: (el) => { if (!meta.frei[el.dataset.id]) { toast(REPERTOIRE[el.dataset.id].frei.text); return; } neuWahl.deck = el.dataset.id; A.klick(); renderNeu(); },
  strengeWahl: (el) => { neuWahl.strenge = Number(el.dataset.n); A.klick(); renderNeu(); },
  starten: () => laufStarten({ deck: neuWahl.deck, strenge: neuWahl.strenge }),
  vorhangAuf: () => abendStarten(),
  spielen: () => spielen(),
  umbesetzen: () => umbesetzen(),
  sortieren: () => {
    const reihe = ['komponist', 'epoche', 'ruhm', 'schule'];
    run.sortierung = reihe[(reihe.indexOf(run.sortierung) + 1) % reihe.length];
    L.sortiereHand(run);
    A.klick();
    renderHand();
    renderVorschau();
    renderAktionen();
    speichern();
  },
  kassieren: () => kassieren(),
  foyerWeiter: () => { A.klick(); foyerWeiter(); },
  reroll: () => { if (L.neuDisponieren(run)) { A.austeilen(3); for (const a of run.shop.angebote) if (a.art === 'star') meta.starsGesehen = { ...(meta.starsGesehen || {}), [a.id]: 1 }; renderSpiel(); speichern(); } },
  ware: (el) => wareSheet(Number(el.dataset.i)),
  kaufen: (el) => {
    const i = Number(el.dataset.i);
    const a = run.shop.angebote[i];
    const fehler = L.kaufen(run, i);
    if (fehler) { toast(fehler); return; }
    sheetZu();
    A.geld();
    if (a.art === 'star') meta.stars[a.id] = 1;
    if (a.art === 'rez') toast(`${REZENSIONEN[a.id]}: ${PROGRAMME[a.id].name} steigt auf Stufe ${run.stufen[a.id]}.`, 'gut');
    if (a.art === 'werk') toast(`${WERK[a.id].t} ist jetzt im Repertoire.`, 'gut');
    renderSpiel();
    speichern();
  },
  paketInfo: (el) => paketSheet(Number(el.dataset.i)),
  paketKaufen: (el) => {
    const f = L.paketOeffnen(run, Number(el.dataset.i));
    if (f) { toast(f); return; }
    sheetZu();
    A.austeilen(3);
    for (const a of run.pack.auswahl) if (a.art === 'star') meta.starsGesehen = { ...(meta.starsGesehen || {}), [a.id]: 1 };
    renderSpiel();
    speichern();
  },
  paketWahl: (el) => {
    const a = run.pack.auswahl[Number(el.dataset.i)];
    const f = L.paketWaehlen(run, Number(el.dataset.i));
    if (f) { toast(f); return; }
    A.geld();
    if (a?.art === 'star') meta.stars[a.id] = 1;
    if (a?.art === 'rez') toast(`${PROGRAMME[a.id].name} steigt auf Stufe ${run.stufen[a.id]}.`, 'gut');
    renderSpiel();
    speichern();
  },
  paketSkip: () => { L.paketWaehlen(run, null); renderSpiel(); speichern(); },
  investInfo: () => investSheet(),
  investKaufen: () => { const f = L.investieren(run); if (f) { toast(f); return; } sheetZu(); A.geld(); toast('Investiert.', 'gut'); renderSpiel(); speichern(); },
  starVerkaufen: (el) => { L.starVerkaufen(run, Number(el.dataset.i)); sheetZu(); A.geld(); renderSpiel(); if (run.phase === 'abend') renderVorschau(); speichern(); },
  starLinks: (el) => { const j = L.starVerschieben(run, Number(el.dataset.i), -1); renderEnsemble(); starSheet(j); speichern(); },
  starRechts: (el) => { const j = L.starVerschieben(run, Number(el.dataset.i), 1); renderEnsemble(); starSheet(j); speichern(); },
  probeNutzen: (el) => {
    const text = L.probeAnwenden(run, Number(el.dataset.i), [...auswahl]);
    sheetZu();
    if (!text) return;
    A.faktor();
    auswahl.clear();
    toast(text, 'gut');
    renderSpiel();
    speichern();
  },
  probeVerkaufen: (el) => { L.probeVerkaufen(run, Number(el.dataset.i)); sheetZu(); A.geld(); renderSpiel(); speichern(); },
  sheetZu: () => sheetZu(),
  overlayZu: () => { overlayZu(); if (run && !$('#spiel').hidden) layout(); },
  programme: () => zeigeProgramme(),
  repertoire: () => { if (run) zeigeRepertoire(); },
  verzeichnis: () => zeigeVerzeichnis(),
  verzTab: (el) => zeigeVerzeichnis(el.dataset.id),
  galerieStar: (el) => {
    const id = el.dataset.id;
    if (!(meta.stars[id] || meta.starsGesehen?.[id])) { toast('Noch nicht begegnet.'); return; }
    const d = STAR[id];
    sheet(`<div class="sh-kopf">${starHTML({ id, v: 0 })}<div><span class="klein">${RARITAET[d.rar]}</span><h3>${d.name}</h3></div></div><p class="sh-text">${markup(d.text)}</p>${d.flavor ? `<p class="sh-flavor">${d.flavor}</p>` : ''}<div class="sh-knoepfe"><button class="btn" data-akt="sheetZu">Schließen</button></div>`);
  },
  anleitung: () => zeigeAnleitung(),
  menue: () => zeigeMenue(),
  zumTitel: () => { overlayZu(); if (run && run.phase === 'vorhang') run = null; renderTitel(); },
  aufgebenFrage: () => bestaetigen('Spielzeit wirklich aufgeben? Sie zählt als beendet.', 'aufgeben', 'Aufgeben'),
  aufgeben: () => { sheetZu(); overlayZu(); if (!run) return; run.stats.ende = run.stats.ende || { station: run.station, abend: run.abend, kritiker: null, punkte: run.round?.punkte || 0, ziel: run.round?.ziel || L.ziel(run) }; laufBeendet(false); },
  dacapo: () => { const deck = run?.deck || 'leipzig'; const strenge = run?.strenge || 1; overlayZu(); laufStarten({ deck, strenge }); },
  endlos: () => { overlayZu(); L.endlosWeiter(run); renderSpiel(); speichern(); },
  tonUm: () => { einst.ton = !einst.ton; A.einstellen(einst); speichereEinst(einst); renderTitel(); },
  musikUm: () => { A.init(); einst.musik = !einst.musik; A.einstellen(einst); speichereEinst(einst); renderTitel(); },
  setTon: (el) => { einst.ton = el.dataset.v === '1'; A.einstellen(einst); speichereEinst(einst); zeigeMenue(); },
  setMusik: (el) => { A.init(); einst.musik = el.dataset.v === '1'; A.einstellen(einst); speichereEinst(einst); zeigeMenue(); },
  setTempo: (el) => { einst.tempo = Number(el.dataset.v); document.documentElement.style.setProperty('--tempo', einst.tempo); speichereEinst(einst); zeigeMenue(); },
  setWackeln: (el) => { einst.wackeln = el.dataset.v === '1'; speichereEinst(einst); zeigeMenue(); },
};

let langDruck = null;
let langGedrueckt = false;
document.addEventListener('pointerdown', (e) => {
  A.init();
  const k = e.target.closest('#hand .karte');
  langGedrueckt = false;
  if (k && !busy) {
    clearTimeout(langDruck);
    langDruck = setTimeout(() => { langGedrueckt = true; karteSheet(Number(k.dataset.uid)); }, 480);
  }
}, { passive: true });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, () => clearTimeout(langDruck), { passive: true });
document.addEventListener('pointermove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) clearTimeout(langDruck); }, { passive: true });

document.addEventListener('contextmenu', (e) => {
  const k = e.target.closest('.karte[data-uid]');
  if (k && run && Number(k.dataset.uid) > 0) { e.preventDefault(); karteSheet(Number(k.dataset.uid)); }
});

document.addEventListener('click', (e) => {
  if (langGedrueckt) { langGedrueckt = false; return; }
  const akt = e.target.closest('[data-akt]');
  if (akt) {
    if (akt.disabled || akt.getAttribute('aria-disabled') === 'true' && akt.dataset.akt !== 'deckWahl') return;
    const f = AKTIONEN[akt.dataset.akt];
    if (f) { f(akt); return; }
  }
  const karte = e.target.closest('#hand .karte');
  if (karte) { auswaehlen(Number(karte.dataset.uid)); return; }
  const star = e.target.closest('#stars .star');
  if (star) { A.klick(); starSheet(Number(star.dataset.star)); return; }
  const probe = e.target.closest('#proben .probe-mini');
  if (probe) { A.klick(); probeSheet(Number(probe.dataset.probe)); return; }
});

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (!$('#sheet').hidden) { sheetZu(); return; }
    if (!$('#overlay').hidden && run?.phase !== 'vorhang' && run?.phase !== 'sieg') { AKTIONEN.overlayZu(); return; }
    if (run && !$('#spiel').hidden) zeigeMenue();
    return;
  }
  if (!$('#sheet').hidden || !$('#overlay').hidden || !run || $('#spiel').hidden) return;
  if (run.phase === 'abend') {
    if (/^[1-9]$/.test(e.key)) {
      const u = run.round.hand[Number(e.key) - 1];
      if (u != null) auswaehlen(u);
    } else if (e.key === 'Enter') { e.preventDefault(); spielen(); }
    else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace' || e.key === 'Delete') umbesetzen();
    else if (e.key === 's' || e.key === 'S') AKTIONEN.sortieren();
    else if (e.key === 'p' || e.key === 'P') zeigeProgramme();
  } else if (e.key === 'Enter') {
    if (run.phase === 'spielplan') abendStarten();
    else if (run.phase === 'bravo') kassieren();
  }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) speichern(); });

// ------------------------------------------------------------------ Start

A.einstellen(einst);
document.documentElement.style.setProperty('--tempo', einst.tempo);
if (run && run.phase === 'vorhang') run = null;
renderTitel();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// Für Tests und Neugierige
window.daCapo = { get run() { return run; }, meta, L };
