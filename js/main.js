// Besetzung – Oberfläche.

import * as S from './spiel.js';
import * as A from './audio.js';
import {
  FAECHER, passung, KLASSE_GAGE, GEWICHT, GEWICHT_NAME, BELASTUNG_NAME, ANFORDERUNGEN, EIGENSCHAFTEN,
  OPER, OPERN, HAEUSER, HAUS, STILE,
} from './daten.js';
import {
  ladeLauf, speichereLauf, loescheLauf, ladeArchiv, speichereArchiv, ladeEinst, speichereEinst, freischalten,
} from './speicher.js';

// ------------------------------------------------------------------ Zustand

let run = ladeLauf();
if (run && run.v !== S.VERSION) run = null;
const archiv = ladeArchiv();
const einst = ladeEinst();
let ansicht = 'titel';
let zurueck = 'spiel';
let wahlHaus = 'leipzig';
let planWahl = [];
let archivTab = 'legenden';
let animiereErgebnis = false;
let laeuft = false;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('de-DE');
const prozent = (x) => `${Math.round(x * 100)} %`;
const warte = (ms) => new Promise((r) => setTimeout(r, ms / einst.tempo));

function speichern() {
  if (run) speichereLauf(run);
  speichereArchiv(archiv);
}
function toast(text) {
  const t = $('#toast');
  t.hidden = false;
  t.innerHTML = text;
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => { t.hidden = true; }, 3500);
}

// ------------------------------------------------------------------ Bausteine

const ICON = {
  ensemble: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/></svg>',
  menue: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  zurueck: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
};

function sterne(k) {
  return `<span class="sterne" title="${k} von 5">${'★'.repeat(k)}<span class="aus">${'★'.repeat(5 - k)}</span></span>`;
}
function fachChip(f, { hohl = false, lang = false } = {}) {
  const d = FAECHER[f];
  return `<span class="fach g-${d.gruppe} ${hohl ? 'hohl' : ''}" title="${esc(d.name)}">${lang ? d.name : d.kurz}</span>`;
}
function stimmeHTML(fr, nachher = null) {
  const kl = fr < 40 ? 'leer' : fr < 70 ? 'mude' : '';
  return `<span class="stimme ${kl}" title="Stimme"><span class="bar"><i style="width:${fr}%"></i></span>${fr} %${nachher != null ? ` → ${nachher} %` : ''}</span>`;
}
function anfHTML(rolle, s = null) {
  if (!rolle.anf.length) return '';
  return `<span class="anf">${rolle.anf.map((a) => {
    const kl = s ? (s.traits.includes(a) ? 'ok' : 'fehlt') : '';
    return `<span class="${kl}" title="${ANFORDERUNGEN[a].name}">${ANFORDERUNGEN[a].zeichen} ${ANFORDERUNGEN[a].name}</span>`;
  }).join('')}</span>`;
}
const lastHTML = (b) => `<span class="last" title="Belastung: ${BELASTUNG_NAME[b]}">${'●'.repeat(b)}${'○'.repeat(3 - b)}</span>`;
function traitChips(s, oper = null, rolle = null) {
  return s.traits.map((t) => {
    const e = EIGENSCHAFTEN[t];
    let kl = e.art === 'neg' ? 'schlecht' : '';
    if (rolle && (rolle.anf.includes(t) || (oper && oper.stil === t))) kl = 'gut';
    if (t === 'talent' || t === 'liebling') kl = kl || 'gold';
    return `<span class="chip ${kl}" title="${esc(e.text)}">${e.name}</span>`;
  }).join('');
}
function rufHTML(r) {
  return `<span class="ruf ${r <= 2 ? 'knapp' : ''}" title="Ruf ${r} von ${S.RUF_MAX}">${Array.from({ length: S.RUF_MAX }, (_, i) => `<i class="${i < r ? 'an' : ''}"></i>`).join('')}</span>`;
}

function leiste(html) {
  const l = $('#leiste');
  if (!html) { l.hidden = true; return; }
  l.hidden = false;
  $('.innen', l).innerHTML = html;
}

function kopfHTML() {
  const H = HAUS[run.haus];
  const fest = S.istFestwoche(run);
  return `<header class="kopf">
    <div class="haus"><b>${H.name}</b><span>${fest ? H.fest.name : `Woche ${run.woche}/${H.wochen}`}${run.taeglich ? ' · Tagesspielplan' : ''}</span></div>
    <div class="werte">
      <div class="wert-klein"><span>Ruf ${run.ruf}</span>${rufHTML(run.ruf)}</div>
      <div class="wert-klein"><span>Etat</span><b class="${run.etat < 0 ? 'schlecht' : ''}">${fmt(run.etat)} T€</b></div>
    </div>
    <button class="icon-btn" data-akt="ensemble" title="Ensemble">${ICON.ensemble}</button>
    <button class="icon-btn" data-akt="menue" title="Menü">${ICON.menue}</button>
  </header>`;
}

// ------------------------------------------------------------------ Render

function render() {
  const app = $('#app');
  leiste(null);
  if (ansicht === 'titel') return renderTitel(app);
  if (ansicht === 'neu') return renderNeu(app);
  if (ansicht === 'ensemble') return renderEnsemble(app);
  if (ansicht === 'archiv') return renderArchiv(app);
  if (ansicht === 'anleitung') return renderAnleitung(app);
  if (!run) { ansicht = 'titel'; return renderTitel(app); }
  switch (run.phase) {
    case 'wochenplan': return renderWochenplan(app);
    case 'festplan': return renderFestplan(app);
    case 'besetzung': case 'einspringer': return renderBesetzung(app);
    case 'vorstellung': return renderVorstellung(app);
    case 'wochenende': return renderWochenende(app);
    case 'ende': return renderEnde(app);
    default: return renderTitel(app);
  }
}

// ---------- Titel

function grussformel() {
  const h = new Date().getHours();
  if (h < 5) return 'Noch wach, Jonas?';
  if (h < 11) return 'Guten Morgen, Jonas.';
  if (h < 17) return 'Guten Tag, Jonas.';
  return 'Guten Abend, Jonas.';
}
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function renderTitel(app) {
  const siege = Object.values(archiv.siege).reduce((a, b) => a + b, 0);
  const tg = archiv.taeglich[heute()];
  const laufText = run && run.phase !== 'ende' ? `${HAUS[run.haus].name} · ${S.istFestwoche(run) ? HAUS[run.haus].fest.name : `Woche ${run.woche}`}` : '';
  app.innerHTML = `<div class="titel">
    <p class="gruss">${grussformel()}</p>
    <h1>Besetzung</h1>
    <p class="unter">Ein Ensemble-Roguelite. Du leitest das Ensemble der Oper Leipzig – wer singt die Tosca, wer schont die Stimme, wer springt ein, wenn der Tenor absagt?</p>
    <div class="knoepfe">
      ${laufText ? `<button class="btn btn-haupt" data-akt="fortsetzen">Weiterspielen<small>${esc(laufText)}</small></button>` : ''}
      <button class="btn ${laufText ? '' : 'btn-haupt'}" data-akt="neu">Neue Spielzeit</button>
      <button class="btn" data-akt="taeglich">Spielplan des Tages<small>${tg ? (tg.sieg ? `heute geschafft · Ruf ${tg.ruf}` : `heute bis Woche ${tg.woche}`) : new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</small></button>
      <div class="knopfreihe"><button class="btn btn-leise" data-akt="archiv">Archiv</button><button class="btn btn-leise" data-akt="anleitung">So geht’s</button></div>
    </div>
    <div class="statistik">
      <span>Spielzeiten <b>${archiv.laeufe}</b></span>
      <span>Gewonnen <b>${siege}</b></span>
      <span>Kammersänger <b>${archiv.legenden.length}</b></span>
      <span>Rollen gesungen <b>${Object.keys(archiv.rollenbuch).length}</b></span>
    </div>
  </div>`;
}

function renderNeu(app) {
  if (!archiv.frei[wahlHaus]) wahlHaus = 'leipzig';
  app.innerHTML = `<div class="abschnitt"><h2>Neue Spielzeit</h2><button class="btn btn-leise btn-klein" data-akt="titel">${ICON.zurueck} Zurück</button></div>
    <p class="hinweis">Wähle dein Haus. Wer eine Spielzeit übersteht, wird ans nächste gerufen.</p>
    <div class="haeuser">${HAEUSER.map((h) => {
      const frei = archiv.frei[h.id];
      const vorgaenger = h.frei ? HAUS[h.frei].name : '';
      return `<button class="haus-wahl ${frei ? '' : 'zu'} ${wahlHaus === h.id ? 'gewaehlt' : ''}" data-akt="hausWahl" data-id="${h.id}">
        <span class="ueber">${h.stadt} · ${h.wochen} Wochen + ${h.fest.name}</span>
        <h3>${h.name}</h3>
        <p>${frei ? h.text : `Noch geschlossen – überstehe eine Spielzeit an der ${vorgaenger}.`}</p>
        ${archiv.siege[h.id] ? `<span class="leise" style="font-size:.82rem">${archiv.siege[h.id]}× überstanden · bester Ruf ${archiv.besterRuf[h.id]}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  leiste(`<button class="btn btn-haupt" data-akt="starten">Spielzeit beginnen</button>`);
}

// ---------- Wochenplan

function deckung(rolle) {
  let best = 'schlecht';
  for (const s of run.ensemble) {
    const p = passung(s.fach, rolle.fach);
    if (p === 1) return 'gut';
    if (p === 0.75) best = 'mittel';
  }
  return best;
}
function prognoseFuer(idx, plan = null) {
  const k = structuredClone(run);
  if (plan) { k.plan = plan; k.abend = 0; k.phase = 'besetzung'; k.besetzung = {}; }
  else { S.planFestlegen(k, [idx, idx === 0 ? 1 : 0]); }
  k.besetzung = {};
  S.vorschlag(k);
  const v = S.vorhersage(k);
  return v.erwartet / v.ziel;
}
function prognoseText(r) {
  if (r >= 1.2) return '<span class="gut">gute Chancen</span>';
  if (r >= 0.95) return '<span class="mittel">machbar</span>';
  return '<span class="schlecht">schwer</span>';
}
function angebotHTML(a, i, { waehlbar = true, prognose = false } = {}) {
  const o = OPER[a.oper];
  const nr = planWahl.indexOf(i);
  const z = S.ziel(run, o, a.premiere);
  const prog = waehlbar ? prognoseFuer(i) : prognose ? prognoseFuer(null, [a]) : null;
  return `<button class="zettel angebot ${nr >= 0 ? 'gewaehlt' : ''}" ${waehlbar ? `data-akt="angebot" data-i="${i}"` : ''}>
    ${nr >= 0 ? `<span class="nummer">${nr + 1}</span>` : ''}
    <span class="badge ${a.premiere ? 'premiere' : 'repertoire'}">${a.premiere ? 'Premiere' : 'Wiederaufnahme'}</span>
    <h3>${o.titel}</h3>
    <div class="meta">${o.komponist} · ${o.jahr} · ${STILE[o.stil]}${o.leipzig ? ' · Leipziger Uraufführung' : ''}</div>
    <div class="rollen-mini">${o.rollen.map((r) => `<span class="fach g-${FAECHER[r.fach].gruppe} d-${deckung(r)}" title="${esc(r.name)} · ${FAECHER[r.fach].name}">${FAECHER[r.fach].kurz}</span>`).join('')}</div>
    <div class="zahlen"><span>Ziel <b>${fmt(z)}</b></span><span>Beliebtheit ${'♥'.repeat(Math.round(o.pop * 3 - 1))}</span>${prog != null ? `<span>Prognose: ${prognoseText(prog)}</span>` : ''}</div>
  </button>`;
}

function festBanner() {
  const H = HAUS[run.haus];
  return `<div class="fest-banner"><div><b>Saisonfinale: ${H.fest.name}</b><div class="leise">${run.fest.map((id) => OPER[id].titel).join(' · ')}</div></div></div>`;
}

function renderWochenplan(app) {
  app.innerHTML = `${kopfHTML()}
    ${festBanner()}
    <div class="abschnitt"><h2>Spielplan dieser Woche</h2></div>
    <p class="hinweis">Wähle zwei Opern. Die Reihenfolge zählt: Wer am ersten Abend singt, hat am zweiten weniger Stimme. Punkte an den Fächern: grün = im Ensemble vorhanden, gelb = nur Nachbarfach, rot = fehlt.</p>
    ${run.angebote.map((a, i) => angebotHTML(a, i)).join('')}`;
  leiste(`<button class="btn btn-haupt" data-akt="planFest" ${planWahl.length === 2 ? '' : 'disabled'}>${planWahl.length === 2 ? 'Woche beginnen' : `Noch ${2 - planWahl.length} wählen`}</button>`);
}

function renderFestplan(app) {
  const H = HAUS[run.haus];
  app.innerHTML = `${kopfHTML()}
    <div class="abschnitt"><h2>${H.fest.name}</h2></div>
    <p class="hinweis">Das Finale der Spielzeit: ${run.plan.length} Abende hintereinander, ohne Wochenende dazwischen. Plane, wer wann singt – erholen kann sich nur, wer nicht auf der Bühne steht.</p>
    ${run.plan.map((a, i) => angebotHTML(a, i, { waehlbar: false, prognose: true })).join('')}`;
  leiste(`<button class="btn btn-haupt" data-akt="planFest">Festwoche beginnen</button>`);
}

// ---------- Besetzung

function renderBesetzung(app) {
  const oper = S.aktuelleOper(run);
  const premiere = S.aktuellePremiere(run);
  const v = S.vorhersage(run);
  const r = v.erwartet / v.ziel;
  const breite = Math.min(100, (r / 1.6) * 100);
  const marke = (1 / 1.6) * 100;
  const naechste = run.plan[run.abend + 1] ? OPER[run.plan[run.abend + 1].oper] : null;
  const besetzt = new Set(Object.values(run.besetzung));
  const frei = run.ensemble.filter((s) => !besetzt.has(s.id));
  app.innerHTML = `${kopfHTML()}
    <div class="zettel">
      <div class="oper-kopf">
        <span class="ueber">Abend ${run.abend + 1} von ${run.plan.length} · <span class="badge ${premiere ? 'premiere' : S.istFestwoche(run) ? 'fest' : 'repertoire'}">${premiere ? 'Premiere' : S.istFestwoche(run) ? 'Festwoche' : 'Wiederaufnahme'}</span>${run.tv ? ' · <span class="badge premiere">live im MDR</span>' : ''}</span>
        <h2>${oper.titel}</h2>
        <div class="meta">${oper.komponist} · ${oper.jahr} · ${STILE[oper.stil]}</div>
      </div>
      <div class="prognose">
        <div class="leiste"><i class="${r >= 0.95 ? '' : r >= 0.7 ? 'knapp' : 'zuwenig'}" style="width:${breite}%"></i><span class="marke" style="left:${marke}%" title="Ziel"></span></div>
        <div class="zeile"><span>Erwartung <b>${fmt(v.erwartet)}</b>${v.offen ? ` <span class="schlecht">(${v.offen} offen)</span>` : ''}</span><span>Ziel <b>${fmt(v.ziel)}</b> · ${v.offen ? '–' : prognoseText(r)}</span></div>
      </div>
    </div>
    <div class="rollen">${oper.rollen.map((rolle, i) => rolleHTML(oper, rolle, i)).join('')}</div>
    <div class="abschnitt"><h2 style="font-size:1.05rem">Heute frei</h2><span class="leise" style="font-size:.8rem">+12 % Stimme nach dem Abend</span></div>
    <div class="frei-liste">${frei.length ? frei.map((s) => `<span class="frei">${fachChip(s.fach)} ${esc(s.name.split(' ')[0])} ${stimmeHTML(s.frische)}</span>`).join('') : '<span class="leise">Alle stehen heute auf der Bühne.</span>'}</div>
    ${naechste ? `<p class="hinweis" style="margin-top:14px">Danach: <b>${naechste.titel}</b> – ${naechste.rollen.map((x) => `${x.name} (${FAECHER[x.fach].kurz})`).join(', ')}</p>` : ''}`;
  leiste(`<button class="btn btn-leise" data-akt="vorschlag" title="Leere Rollen mit der besten freien Stimme füllen">Vorschlag</button>
    <button class="btn btn-haupt" data-akt="vorhangAuf" ${v.offen ? 'disabled' : ''}>${v.offen ? `${v.offen} ${v.offen === 1 ? 'Rolle' : 'Rollen'} offen` : 'Vorhang auf'}</button>`);
  if (run.phase === 'einspringer') einspringerSheet();
}

function rolleHTML(oper, rolle, i) {
  const s = S.saenger(run, run.besetzung[i]);
  const kopf = `<div class="r-kopf">${fachChip(rolle.fach)}<span class="r-name">${rolle.name}</span><span class="r-gewicht">${GEWICHT_NAME[rolle.gewicht]}</span>${lastHTML(rolle.belastung)}</div>
    ${rolle.anf.length ? `<div style="margin-top:5px">${anfHTML(rolle, s)}</div>` : ''}`;
  if (!s) return `<button class="rolle leer" data-akt="rolle" data-i="${i}">${kopf}<div class="r-besetzt">+ besetzen</div></button>`;
  const w = S.rollenWert(run, s, rolle, oper);
  const risiko = w.kiekser;
  const p = passung(s.fach, rolle.fach);
  return `<button class="rolle" data-akt="rolle" data-i="${i}">${kopf}
    <div class="r-besetzt">
      <span class="r-saenger">${esc(s.name)} ${p < 1 ? fachChip(s.fach, { hohl: true }) : ''} ${sterne(s.klasse)}</span>
      ${stimmeHTML(s.frische, Math.max(0, s.frische - w.verbrauch))}
      <span class="r-risiko ${risiko >= 0.15 ? 'schlecht' : risiko >= 0.08 ? 'mittel' : 'leise'}" title="Kiekser-Risiko">⚠ ${prozent(risiko)}</span>
      <span class="r-punkte">${fmt(w.erwartet)}</span>
    </div></button>`;
}

function kandidatenFuer(rolle, oper, ausschluss = new Set()) {
  return run.ensemble.map((s) => ({ s, w: S.rollenWert(run, s, rolle, oper) }))
    .filter(({ s }) => !ausschluss.has(s.id))
    .sort((a, b) => (a.w.verbot ? 1 : 0) - (b.w.verbot ? 1 : 0) || b.w.erwartet - a.w.erwartet);
}

function wahlHTML({ s, w }, akt, i, { aktiv = false, notiz = '' } = {}) {
  const oper = S.aktuelleOper(run);
  const rolle = oper.rollen[i];
  const p = passung(s.fach, rolle.fach);
  const passText = p === 1 ? '<span class="gut">eigenes Fach</span>' : p === 0.75 ? '<span class="mittel">Nachbarfach ×0,75</span>' : '<span class="schlecht">fachfremd ×0,35</span>';
  return `<button class="wahl ${aktiv ? 'aktiv' : ''} ${w.verbot ? 'gesperrt' : ''}" data-akt="${akt}" data-i="${i}" data-id="${s.id}" ${w.verbot ? 'disabled' : ''}>
    <span class="w-name">${esc(s.name)} ${fachChip(s.fach)} ${sterne(s.klasse)}</span>
    <span class="w-punkte">${fmt(w.erwartet)}</span>
    <span class="w-unten">${passText} ${stimmeHTML(s.frische, Math.max(0, s.frische - w.verbrauch))}
      <span class="${w.kiekser >= 0.15 ? 'schlecht' : w.kiekser >= 0.08 ? 'mittel' : ''}">⚠ Kiekser ${prozent(w.kiekser)}</span>
      ${w.verbot ? `<span class="schlecht">${w.verbot}</span>` : notiz}</span>
    <span class="w-unten chips">${traitChips(s, oper, rolle)}</span>
  </button>`;
}

function sheet(html) {
  const sh = $('#sheet');
  sh.hidden = false;
  $('.sheet-box', sh).innerHTML = html;
  $('.sheet-box', sh).scrollTop = 0;
}
function sheetZu() { $('#sheet').hidden = true; }

function rolleSheet(i) {
  const oper = S.aktuelleOper(run);
  const rolle = oper.rollen[i];
  const aktuell = run.besetzung[i];
  const liste = kandidatenFuer(rolle, oper);
  sheet(`<span class="ueber">${GEWICHT_NAME[rolle.gewicht]} · ${FAECHER[rolle.fach].name} · Belastung ${BELASTUNG_NAME[rolle.belastung]}</span>
    <h3>Wer singt ${esc(rolle.name)}?</h3>
    ${rolle.anf.length ? `<p class="hinweis">${rolle.anf.map((a) => `<b>${ANFORDERUNGEN[a].name}:</b> passende Eigenschaft +20 %. ${ANFORDERUNGEN[a].ohne}`).join('<br>')}</p>` : ''}
    <div class="wahl-liste">${liste.map((k) => {
      const wo = S.besetztAls(run, k.s.id);
      const notiz = wo >= 0 && wo !== i ? `<span class="mittel">singt heute schon ${esc(oper.rollen[wo].name)} – wird getauscht</span>` : '';
      return wahlHTML(k, 'besetzen', i, { aktiv: k.s.id === aktuell, notiz });
    }).join('')}</div>
    <div class="knopfreihe" style="margin-top:12px">${aktuell != null ? `<button class="btn btn-leise" data-akt="freigeben" data-i="${i}">Rolle freigeben</button>` : ''}<button class="btn btn-leise" data-akt="sheetZu">Schließen</button></div>`);
}

function einspringerSheet() {
  const { rolle: i, saenger: krankId } = run.indisponiert;
  const oper = S.aktuelleOper(run);
  const rolle = oper.rollen[i];
  const krank = S.saenger(run, krankId);
  const besetzt = new Set(Object.values(run.besetzung));
  const liste = kandidatenFuer(rolle, oper, besetzt).filter((k) => !k.w.verbot);
  const kosten = S.gastKosten(run);
  sheet(`<span class="ueber">19:12 Uhr · Inspizientenruf</span>
    <h3>${esc(krank.name)} ist indisponiert!</h3>
    <p class="hinweis">${esc(rolle.name)} (${FAECHER[rolle.fach].name}) ist nicht besetzt. In achtzehn Minuten hebt sich der Vorhang.</p>
    <div class="abschnitt" style="margin-top:6px"><h2 style="font-size:1.05rem">Einspringen aus dem Ensemble</h2></div>
    <div class="wahl-liste">${liste.length ? liste.map((k) => wahlHTML(k, 'einspringen', i)).join('') : '<p class="leise">Niemand Freies im Haus.</p>'}</div>
    <div class="abschnitt"><h2 style="font-size:1.05rem">Oder …</h2></div>
    <div class="wahl-liste">
      <button class="wahl" data-akt="gast" ${run.etat >= kosten ? '' : 'disabled'}><span class="w-name">Gast einfliegen ${sterne(4)}</span><span class="w-punkte">−${kosten} T€</span><span class="w-unten">Eine Agentur schickt jemanden aus dem Fach, der die Rolle kennt.${run.etat < kosten ? ' <span class="schlecht">Zu wenig Etat.</span>' : ''}</span></button>
      <button class="wahl" data-akt="trotzdem"><span class="w-name">Ansage: „${esc(krank.name.split(' ')[0])} singt trotzdem“</span><span class="w-punkte">×0,7</span><span class="w-unten">Leistung −30 %, Kiekser-Risiko +15 Prozentpunkte.</span></button>
    </div>`);
}

// ---------- Vorstellung

function renderVorstellung(app) {
  const e = run.ergebnis;
  const oper = OPER[e.oper];
  const stufe = S.STUFEN.find((s) => s.id === e.stufe);
  const rollenHTML = e.rollen.map((r) => `<div class="ergebnis ${r.kiekser ? 'kiekser' : ''} ${animiereErgebnis ? '' : 'da'}">
      <span class="e-rolle">${esc(r.rolle)}</span><span class="e-punkte">${fmt(r.punkte)}</span>
      <span class="e-unten">${esc(r.saenger)} ${fachChip(r.fach)}
        ${r.kiekser ? '<span class="chip schlecht">Kiekser!</span>' : ''}
        ${r.angesagt ? '<span class="chip schlecht">angesagt</span>' : ''}
        ${r.debuet ? '<span class="chip gold">Rollendebüt</span>' : ''}
        <span class="${r.tagesform >= 1.03 ? 'gut' : r.tagesform <= 0.97 ? 'schlecht' : ''}">Tagesform ${r.tagesform >= 1 ? '+' : '−'}${Math.round(Math.abs(r.tagesform - 1) * 100)} %</span>
      </span></div>`).join('');
  app.innerHTML = `${kopfHTML()}
    <div class="vorstellung">
      <span class="ueber">Woche ${e.woche} · Abend ${e.abend + 1}${e.premiere ? ' · Premiere' : ''}</span>
      <h2>${oper.titel}</h2>
      <div class="ergebnis-liste">${rollenHTML}</div>
      <div class="summe" id="summe" ${animiereErgebnis ? 'style="visibility:hidden"' : ''}><b>${fmt(e.total)}</b><span class="leise">von ${fmt(e.ziel)} · ${prozent(e.ratio)}</span></div>
      <div id="stempel" ${animiereErgebnis ? 'hidden' : ''}>
        <div class="stempel s-${e.stufe}">${stufe.name}</div>
        <div class="folgen">
          <span>Ruf <b class="${e.rufDelta > 0 ? 'gut' : e.rufDelta < 0 ? 'schlecht' : ''}">${e.rufDelta > 0 ? '+' : ''}${e.rufDelta}</b> · Einnahmen <b>+${e.einnahmen} T€</b></span>
          ${e.aufstiege.map((a) => `<span class="gut">${esc(a.name)} singt sich frei: ${sterne(a.klasse)}</span>`).join('')}
          ${run.ruf <= 0 ? '<span class="schlecht"><b>Der Stadtrat beruft dich ab.</b></span>' : ''}
        </div>
      </div>
    </div>`;
  leiste(`<button class="btn btn-haupt" data-akt="weiter" ${animiereErgebnis ? 'disabled' : ''}>${weiterText()}</button>`);
  if (animiereErgebnis) { animiereErgebnis = false; ergebnisAnimieren(e); }
}

function weiterText() {
  if (run.ruf <= 0) return 'Zur Abrechnung';
  if (run.abend + 1 < run.plan.length) return `Weiter: ${OPER[run.plan[run.abend + 1].oper].titel}`;
  if (S.istFestwoche(run)) return 'Saisonbilanz';
  return 'Wochenende';
}

async function ergebnisAnimieren(e) {
  laeuft = true;
  A.gong();
  for (const el of $$('.ergebnis')) {
    await warte(330);
    el.classList.add('da');
    if (el.classList.contains('kiekser')) A.nichts(); else A.klick();
  }
  await warte(400);
  const summe = $('#summe');
  if (summe) summe.style.visibility = '';
  await warte(500);
  const st = $('#stempel');
  if (st) st.hidden = false;
  const staerke = { buh: 0, lau: 0.2, bravo: 0.5, bravi: 0.8, ovation: 1 }[e.stufe];
  if (e.stufe === 'buh') A.buh(); else A.applaus(staerke);
  if (e.stufe === 'ovation') A.sternstunde();
  laeuft = false;
  const b = $('[data-akt="weiter"]');
  if (b) b.disabled = false;
}

// ---------- Wochenende

function renderWochenende(app) {
  const w = run.wochenende;
  const b = w.bilanz;
  const ev = w.ereignis;
  const def = S.EREIGNISSE[ev.id];
  const ang = S.ANGEBOTE[w.angebot.art](w.angebot);
  app.innerHTML = `${kopfHTML()}
    <div class="abschnitt"><h2>Wochenende</h2></div>
    <div class="zettel kasse">
      <span class="ueber">Kasse</span>
      <div><span>Einnahmen der Woche</span><b class="gut">+${b.einnahmen}</b></div>
      <div><span>Subvention der Stadt</span><b class="gut">+${b.subvention}</b></div>
      <div><span>Gagen (${run.ensemble.filter((s) => !s.gast).length} Ensemblemitglieder)</span><b class="schlecht">−${b.gagen}</b></div>
      <div class="gesamt"><span>Etat</span><b>${fmt(run.etat)} T€</b></div>
      ${w.meldungen.map((m) => `<span class="schlecht">${m}</span>`).join('')}
      <span class="leise" style="font-size:.84rem">Alle erholen sich: +40 % Stimme.</span>
    </div>

    <div class="abschnitt"><h2>${def.titel}</h2></div>
    <div class="zettel">
      <p style="margin:0 0 10px">${esc(def.text(run, ev.p))}</p>
      ${ev.erledigt ? `<p class="gut" style="margin:0"><b>${esc(ev.antwort)}</b></p>` : `<div class="knopfreihe">${def.optionen.map((o, i) => `<button class="btn ${i === 0 ? '' : 'btn-leise'}" data-akt="ereignis" data-i="${i}">${o.text}</button>`).join('')}</div>`}
    </div>

    <div class="abschnitt"><h2>Vorsingen</h2><span class="leise" style="font-size:.82rem">${run.ensemble.length}/${S.MAX_ENSEMBLE} im Ensemble</span></div>
    ${w.vorsingen.map((k, i) => `<div class="zettel kandidat ${k.vergeben ? 'vergeben' : ''}">
      <div class="k-kopf"><span class="k-name">${esc(k.name)}</span>${fachChip(k.fach, { lang: true })}${sterne(k.klasse)}</div>
      <div class="chips">${traitChips(k)}</div>
      <div class="k-kopf"><span class="k-geld">${k.legende ? `Kammersänger·in, kommt für eine Woche als Gast · Honorar ${k.handgeld} T€` : `Gage ${k.gage} T€/Woche · Handgeld ${k.handgeld} T€`}</span>
      <button class="btn btn-klein ${k.vergeben ? '' : 'btn-haupt'}" data-akt="engagieren" data-i="${i}" ${k.vergeben || run.etat < k.handgeld ? 'disabled' : ''}>${k.vergeben ? 'Engagiert' : 'Engagieren'}</button></div>
    </div>`).join('')}

    <div class="abschnitt"><h2>${ang.titel}</h2><span class="leise" style="font-size:.82rem">${w.angebot.preis} T€</span></div>
    <div class="zettel">
      <p style="margin:0 0 8px">${ang.text}</p>
      ${w.angebot.erledigt ? '<p class="gut" style="margin:0"><b>Erledigt.</b></p>' : `<div class="chips">${run.ensemble.filter((s) => !s.gast).map((s) => {
        const sinnlos = w.angebot.art === 'meisterkurs' && s.traits.includes(w.angebot.trait);
        return `<button class="btn btn-klein btn-leise" data-akt="angebotNutzen" data-id="${s.id}" ${sinnlos || run.etat < w.angebot.preis ? 'disabled' : ''}>${esc(s.name.split(' ')[0])} ${FAECHER[s.fach].kurz}${w.angebot.art === 'kur' ? ` · ${s.frische} %` : ''}</button>`;
      }).join('')}</div>`}
    </div>`;
  leiste(`<button class="btn btn-leise" data-akt="ensemble">Ensemble</button><button class="btn btn-haupt" data-akt="naechsteWoche" ${ev.erledigt ? '' : 'disabled'}>${ev.erledigt ? (run.woche + 1 > HAUS[run.haus].wochen ? 'Zur Festwoche' : `Woche ${run.woche + 1}`) : 'Erst entscheiden'}</button>`);
}

// ---------- Ensemble

const GRUPPEN = ['sopran', 'mezzo', 'tenor', 'bariton', 'bass'];
function renderEnsemble(app) {
  if (!run) { ansicht = 'titel'; return render(); }
  const sortiert = [...run.ensemble].sort((a, b) => GRUPPEN.indexOf(FAECHER[a.fach].gruppe) - GRUPPEN.indexOf(FAECHER[b.fach].gruppe) || b.klasse - a.klasse);
  const gagen = run.ensemble.reduce((s, x) => s + x.gage, 0);
  app.innerHTML = `${kopfHTML()}
    <div class="abschnitt"><h2>Ensemble</h2><button class="btn btn-leise btn-klein" data-akt="zurueck">${ICON.zurueck} Zurück</button></div>
    <p class="hinweis">${run.ensemble.length} Stimmen · Gagen ${gagen} T€ pro Woche. Erfahrung füllt den goldenen Balken – voll heißt: ein Stern mehr.</p>
    ${sortiert.map((s) => {
      const rollen = Object.entries(s.rollen).sort((a, b) => b[1] - a[1]);
      const schwelle = S.aufstiegsSchwelle(s);
      return `<div class="zettel person">
        <div class="p-kopf"><span class="p-name">${esc(s.name)}</span>${fachChip(s.fach, { lang: true })}${sterne(s.klasse)}</div>
        <div class="p-zeile">${stimmeHTML(s.frische)}${s.klasse < 5 ? `<span class="xp" title="Erfahrung"><span class="bar"><i style="width:${Math.min(100, (s.xp / schwelle) * 100)}%"></i></span></span>` : ''}<span>${s.gast ? 'Gast' : `Gage ${s.gage} T€`}</span><span>${s.auftritte} Abende</span></div>
        <div class="chips">${traitChips(s)}</div>
        ${rollen.length ? `<details><summary>Rollenbuch (${rollen.length})</summary><div class="rollenbuch">${rollen.map(([k, n]) => { const [oid, rn] = k.split(':'); return `${esc(rn)} <span class="leise">(${OPER[oid]?.titel || oid})</span>${n > 1 ? ` ×${n}` : ''}`; }).join(' · ')}</div></details>` : ''}
        ${!s.gast && ['wochenplan', 'wochenende', 'besetzung', 'festplan'].includes(run.phase) ? `<div><button class="btn btn-klein btn-leise" data-akt="entlassenFrage" data-id="${s.id}">Vertrag auflösen (−${s.gage} T€)</button></div>` : ''}
      </div>`;
    }).join('')}`;
}

// ---------- Ende

function saisonName() {
  const d = new Date();
  const j = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${j}/${String(j + 1).slice(2)}`;
}
function kritikText() {
  const e = run.ende;
  const H = HAUS[run.haus];
  const a = run.stats.abende;
  const teile = [];
  const premieren = a.filter((x) => x.premiere).length;
  const ADJ = { Legendär: 'legendäre', Glanzvoll: 'glanzvolle', Solide: 'solide', 'Gerade so': 'knapp gerettete' };
  if (e.sieg) teile.push(`Eine ${ADJ[S.bewertung(e.ruf, true)]} Spielzeit an der ${H.name}: ${a.length} Abende, ${premieren} Premieren, und am Ende ${H.fest.name}, über die man noch reden wird.`);
  else teile.push(`In ${S.istFestwoche(run) ? 'der Festwoche' : `Woche ${e.woche}`} war Schluss: Der Stadtrat hat die Intendanz abberufen. ${a.length} Abende hat das Haus erlebt.`);
  if (e.bestes) teile.push(`Unvergessen: ${OPER[e.bestes.oper].titel}${e.bestes.star ? ` mit ${e.bestes.star}` : ''} in Woche ${e.bestes.woche} – ${S.STUFEN.find((s) => s.id === e.bestes.stufe).name.replace('!', '')} bei ${prozent(e.bestes.ratio)} des Ziels.`);
  if (e.schlechtestes && e.schlechtestes !== e.bestes && e.schlechtestes.ratio < 0.95) teile.push(`Lieber vergessen: ${OPER[e.schlechtestes.oper].titel} in Woche ${e.schlechtestes.woche}.`);
  const fest = a.filter((x) => x.fest);
  if (fest.length) teile.push(`${H.fest.name}: ${fest.map((x) => `${OPER[x.oper].titel} (${S.STUFEN.find((s) => s.id === x.stufe).name.replace('!', '')})`).join(', ')}.`);
  teile.push(`${run.stats.kiekser} ${run.stats.kiekser === 1 ? 'Kiekser' : 'Kiekser'}, ${run.stats.einspringer} Einspringer, ${run.stats.debuets} Rollendebüts – Theateralltag.`);
  teile.push(e.sieg ? 'Würde sofort wieder hingehen.' : 'Nächste Spielzeit wird alles anders.');
  return teile;
}
function renderEnde(app) {
  const e = run.ende;
  const H = HAUS[run.haus];
  const note = S.bewertung(e.ruf, e.sieg);
  const sterneZahl = { Legendär: 5, Glanzvoll: 4, Solide: 3, 'Gerade so': 2, Entlassen: 1 }[note];
  const kandidaten = e.sieg && !e.kammersaenger ? S.kammersaengerKandidaten(run) : [];
  app.innerHTML = `${kopfHTML()}
    <div class="vorstellung">
      <span class="ueber">Spielzeit ${saisonName()} · ${H.name}</span>
      <div class="stempel s-${e.sieg ? 'bravi' : 'buh'}">${e.sieg ? note : 'Abberufen'}</div>
    </div>
    <div class="kritik">
      <div class="k-kopf"><div class="plakat">B</div><div>
        <div class="k-titel">Spielzeit ${saisonName()} · ${H.name}</div>
        <div class="k-meta">${H.stadt} · Ruf ${e.ruf}/10${run.taeglich ? ' · Spielplan des Tages' : ''}</div>
        <div class="k-sterne">${'★'.repeat(sterneZahl)}</div>
      </div></div>
      ${kritikText().map((t) => `<p>${esc(t)}</p>`).join('')}
    </div>
    ${kandidaten.length ? `<div class="abschnitt"><h2>Ernennung zur Kammersängerin / zum Kammersänger</h2></div>
      <p class="hinweis">Eine Stimme deines Ensembles wird geehrt und kehrt in künftigen Spielzeiten gelegentlich als Gast zurück.</p>
      <div class="wahl-liste">${kandidaten.slice(0, 6).map((s) => `<button class="wahl" data-akt="kammersaenger" data-id="${s.id}"><span class="w-name">${esc(s.name)} ${fachChip(s.fach)} ${sterne(s.klasse)}</span><span class="w-punkte">${s.auftritte}×</span><span class="w-unten chips">${traitChips(s)}</span></button>`).join('')}</div>`
      : e.kammersaenger ? `<p class="hinweis gut" style="text-align:center"><b>${esc(e.kammersaenger)}</b> ist jetzt Kammersänger·in.</p>` : ''}
    <div class="raster" style="margin-top:14px">
      <div class="kachel"><span>Abende</span><b>${run.stats.abende.length}</b></div>
      <div class="kachel"><span>Standing Ovations</span><b>${run.stats.abende.filter((x) => x.stufe === 'ovation').length}</b></div>
      <div class="kachel"><span>Rollendebüts</span><b>${run.stats.debuets}</b></div>
      <div class="kachel"><span>Etat am Ende</span><b>${fmt(run.etat)} T€</b></div>
    </div>`;
  leiste(`<button class="btn btn-leise" data-akt="zumTitel">Zum Titel</button><button class="btn btn-haupt" data-akt="nochmal" ${kandidaten.length ? 'disabled title="Erst ernennen"' : ''}>Neue Spielzeit</button>`);
}

// ---------- Archiv & Anleitung

function renderArchiv(app) {
  const tabs = [['legenden', 'Kammersänger'], ['haeuser', 'Häuser'], ['rollen', 'Rollenbuch']];
  let inhalt = '';
  if (archivTab === 'legenden') {
    inhalt = archiv.legenden.length ? archiv.legenden.map((l) => `<div class="zettel person"><div class="p-kopf"><span class="p-name">KS ${esc(l.name)}</span>${fachChip(l.fach, { lang: true })}</div><div class="chips">${l.traits.map((t) => `<span class="chip">${EIGENSCHAFTEN[t]?.name || t}</span>`).join('')}</div><span class="leise" style="font-size:.84rem">${HAUS[l.haus]?.name || ''} · ${l.datum} · ${l.auftritte} Abende</span></div>`).join('')
      : '<p class="hinweis">Noch niemand. Übersteh eine Spielzeit und ernenne deine beste Stimme.</p>';
  } else if (archivTab === 'haeuser') {
    inhalt = HAEUSER.map((h) => `<div class="zettel"><span class="ueber">${h.stadt}</span><h3>${h.name}</h3><p class="hinweis" style="margin:4px 0 0">${archiv.frei[h.id] ? `${archiv.siege[h.id] || 0}× überstanden${archiv.besterRuf[h.id] != null ? ` · bester Ruf ${archiv.besterRuf[h.id]}` : ''}` : 'noch geschlossen'}</p></div>`).join('');
  } else {
    const alle = OPERN.flatMap((o) => o.rollen.map((r) => ({ o, r, key: `${o.id}:${r.name}` })));
    const gesungen = alle.filter((x) => archiv.rollenbuch[x.key]).length;
    inhalt = `<p class="hinweis">${gesungen} von ${alle.length} Rollen hat dein Haus schon besetzt.</p>
      ${OPERN.map((o) => `<div class="zettel" style="padding:10px 12px"><b style="font-family:var(--f-titel)">${o.titel}</b> <span class="leise" style="font-size:.84rem">${o.komponist}</span><div class="chips" style="margin-top:4px">${o.rollen.map((r) => { const n = archiv.rollenbuch[`${o.id}:${r.name}`]; return `<span class="chip ${n ? 'gut' : ''}">${esc(r.name)}${n ? ` ×${n}` : ''}</span>`; }).join('')}</div></div>`).join('')}`;
  }
  app.innerHTML = `<div class="abschnitt"><h2>Archiv</h2><button class="btn btn-leise btn-klein" data-akt="titel">${ICON.zurueck} Zurück</button></div>
    <div class="raster"><div class="kachel"><span>Spielzeiten</span><b>${archiv.laeufe}</b></div><div class="kachel"><span>Abende</span><b>${archiv.abende}</b></div><div class="kachel"><span>Ovationen</span><b>${archiv.ovationen}</b></div><div class="kachel"><span>Kiekser</span><b>${archiv.kiekser}</b></div></div>
    <div class="tabs">${tabs.map(([id, t]) => `<button class="${id === archivTab ? 'aktiv' : ''}" data-akt="archivTab" data-id="${id}">${t}</button>`).join('')}</div>
    ${inhalt}`;
}

function renderAnleitung(app) {
  app.innerHTML = `<div class="abschnitt"><h2>So geht’s</h2><button class="btn btn-leise btn-klein" data-akt="${run && zurueck === 'spiel' ? 'zurueck' : 'titel'}">${ICON.zurueck} Zurück</button></div>
  <div class="anleitung">
    <p>Du leitest das Ensemble eines Opernhauses durch eine Spielzeit: acht Wochen mit je zwei Vorstellungen, dann das Saisonfinale. Sinkt dein Ruf auf null, beruft dich der Stadtrat ab.</p>
    <h3>Jede Woche</h3>
    <ul>
      <li><b>Spielplan:</b> Wähle zwei von drei Opern. Die Punkte an den Fächern zeigen, ob dein Ensemble sie abdeckt.</li>
      <li><b>Besetzung:</b> Für jede Rolle wählst du eine Stimme. Du siehst vorher, was sie bringt und wie riskant es ist.</li>
      <li><b>Wochenende:</b> Kasse, ein Ereignis mit einer Entscheidung, Vorsingen und ein Angebot (Meisterkurs, Kur, Unterricht).</li>
    </ul>
    <h3>Was eine Stimme bringt</h3>
    <ul>
      <li><b>Sterne</b> sind die Grundqualität (35 bis 85 Punkte). Hauptpartien zählen voll, Partien 60 %, Nebenpartien 30 %.</li>
      <li><b>Fach:</b> im eigenen Fach volle Leistung, im Nachbarfach ×0,75, fachfremd ×0,35 – und deutlich mehr Kiekser-Risiko.</li>
      <li><b>Stimme</b> (0–100 %): Jede Partie kostet Stimme, je nach Belastung (●○○ bis ●●●). Müde Stimmen singen schwächer und kieksen öfter. Wer nicht singt, erholt sich (+12 % je Abend, +40 % am Wochenende).</li>
      <li><b>Anforderungen</b> der Rolle (↑ Höhe, ≈ Koloratur, ↓ Tiefe, ◐ Spiel, ∞ Ausdauer): passende Eigenschaft +20 %. Fehlt die Höhe, droht der Kiekser.</li>
      <li><b>Stil:</b> Mozartstimme, Wagnerstimme, Verismo … +20 % im passenden Repertoire.</li>
      <li><b>Rollenkenntnis:</b> Jede Wiederholung derselben Rolle +10 % (bis +30 %).</li>
    </ul>
    <h3>Der Abend</h3>
    <p>Kurz vor Beginn kann jemand absagen. Dann springt jemand aus dem Ensemble ein, du fliegst einen Gast ein, oder es gibt eine Ansage und die Person singt trotzdem. Danach entscheidet die Summe gegen das Ziel: unter 70 % Buhrufe (Ruf −2), unter 95 % lauer Applaus (−1), ab 120 % Bravi (+1), ab 145 % Standing Ovations. Gelungene Premieren bringen einen Extrapunkt.</p>
    <h3>Wachsen</h3>
    <p>Wer singt, sammelt Erfahrung und bekommt irgendwann einen Stern mehr. Am Ende einer überstandenen Spielzeit ernennst du eine Stimme zur Kammersängerin oder zum Kammersänger – sie kommt in späteren Spielzeiten manchmal als Gast zurück.</p>
  </div>`;
}

function menueSheet() {
  sheet(`<h3>Menü</h3>
    <div class="wahl-liste">
      <button class="btn" data-akt="anleitung">So geht’s</button>
      <button class="btn" data-akt="tonUm">Klang: ${einst.ton ? 'an' : 'aus'}</button>
      <button class="btn" data-akt="musikUm">Musik: ${einst.musik ? 'an' : 'aus'}</button>
      <button class="btn" data-akt="tempoUm">Tempo: ${einst.tempo === 1 ? 'normal' : 'schnell'}</button>
      <button class="btn" data-akt="zumTitel">Zum Titel (Spielzeit bleibt gespeichert)</button>
      <button class="btn btn-rot" data-akt="aufgebenFrage">Spielzeit aufgeben</button>
      <button class="btn btn-leise" data-akt="sheetZu">Schließen</button>
    </div>`);
}

// ------------------------------------------------------------------ Archiv pflegen

function archivNachAbend(e) {
  archiv.abende += 1;
  if (e.stufe === 'ovation') archiv.ovationen += 1;
  for (const r of e.rollen) {
    if (r.kiekser) archiv.kiekser += 1;
    const key = `${e.oper}:${r.rolle}`;
    archiv.rollenbuch[key] = (archiv.rollenbuch[key] || 0) + 1;
  }
  archiv.opern[e.oper] = (archiv.opern[e.oper] || 0) + 1;
}

function archivNachSaison() {
  const e = run.ende;
  if (e.gezaehlt) return;
  e.gezaehlt = true;
  archiv.laeufe += 1;
  if (e.sieg) {
    archiv.siege[run.haus] = (archiv.siege[run.haus] || 0) + 1;
    archiv.besterRuf[run.haus] = Math.max(archiv.besterRuf[run.haus] ?? 0, e.ruf);
    const neu = freischalten(archiv, run.haus);
    if (neu) setTimeout(() => toast(`Neues Haus: <b>${neu.name}</b>`), 800);
  }
  if (run.taeglich) {
    const alt = archiv.taeglich[run.taeglich];
    const neu = { sieg: e.sieg, ruf: e.ruf, woche: run.woche };
    if (!alt || (neu.sieg && !alt.sieg) || (neu.sieg === alt.sieg && (neu.sieg ? neu.ruf > alt.ruf : neu.woche > alt.woche))) archiv.taeglich[run.taeglich] = neu;
  }
  speichern();
}

// ------------------------------------------------------------------ Aktionen

async function vorhangAuf() {
  if (laeuft) return;
  A.init();
  const r = S.vorhangAuf(run);
  if (r === 'einspringer') { A.nichts(); speichern(); render(); return; }
  if (!r) return;
  nachVorstellung(r);
}
function nachVorstellung(e) {
  archivNachAbend(e);
  animiereErgebnis = true;
  speichern();
  render();
  window.scrollTo({ top: 0 });
}

const AKTIONEN = {
  fortsetzen: () => { ansicht = 'spiel'; render(); },
  neu: () => {
    if (run && run.phase !== 'ende') { sheet(`<h3>Laufende Spielzeit aufgeben?</h3><p class="hinweis">Sie zählt dann als beendet.</p><div class="knopfreihe"><button class="btn btn-leise" data-akt="sheetZu">Abbrechen</button><button class="btn btn-rot" data-akt="neuBestaetigt">Aufgeben</button></div>`); return; }
    ansicht = 'neu'; render();
  },
  neuBestaetigt: () => { sheetZu(); run = null; loescheLauf(); ansicht = 'neu'; render(); },
  taeglich: () => {
    const start = () => starten({ haus: 'leipzig', seed: S.seedAus('besetzung-' + heute()), taeglich: heute() });
    if (run && run.phase !== 'ende') { AKTIONEN._danach = start; sheet(`<h3>Laufende Spielzeit aufgeben?</h3><p class="hinweis">Der Spielplan des Tages beginnt eine neue.</p><div class="knopfreihe"><button class="btn btn-leise" data-akt="sheetZu">Abbrechen</button><button class="btn btn-rot" data-akt="danach">Aufgeben</button></div>`); return; }
    start();
  },
  danach: () => { sheetZu(); run = null; loescheLauf(); AKTIONEN._danach?.(); },
  titel: () => { ansicht = 'titel'; render(); },
  hausWahl: (el) => { if (!archiv.frei[el.dataset.id]) { toast('Dieses Haus ist noch geschlossen.'); return; } wahlHaus = el.dataset.id; A.klick(); render(); },
  starten: () => starten({ haus: wahlHaus }),
  angebot: (el) => {
    const i = Number(el.dataset.i);
    const pos = planWahl.indexOf(i);
    if (pos >= 0) planWahl.splice(pos, 1);
    else { if (planWahl.length >= 2) planWahl.shift(); planWahl.push(i); }
    A.klick(); render();
  },
  planFest: () => {
    const f = S.planFestlegen(run, planWahl);
    if (f) { toast(f); return; }
    planWahl = [];
    A.vorhang();
    speichern(); render(); window.scrollTo({ top: 0 });
  },
  rolle: (el) => { A.klick(); rolleSheet(Number(el.dataset.i)); },
  besetzen: (el) => {
    const f = S.besetzen(run, Number(el.dataset.i), Number(el.dataset.id));
    if (f) { toast(f); return; }
    A.waehlen(true); sheetZu(); speichern(); render();
  },
  freigeben: (el) => { S.besetzen(run, Number(el.dataset.i), null); sheetZu(); speichern(); render(); },
  vorschlag: () => { S.vorschlag(run); A.klick(); speichern(); render(); },
  vorhangAuf: () => vorhangAuf(),
  einspringen: (el) => { sheetZu(); const e = S.einspringen(run, 'ensemble', Number(el.dataset.id)); if (e) nachVorstellung(e); },
  gast: () => { sheetZu(); const e = S.einspringen(run, 'gast'); if (e) nachVorstellung(e); },
  trotzdem: () => { sheetZu(); const e = S.einspringen(run, 'trotzdem'); if (e) nachVorstellung(e); },
  weiter: () => {
    if (laeuft) return;
    S.weiter(run);
    if (run.phase === 'ende') { archivNachSaison(); if (run.ende.sieg) A.triumph(); else A.niederlage(); }
    speichern(); render(); window.scrollTo({ top: 0 });
  },
  ereignis: (el) => {
    const t = S.ereignisAntworten(run, Number(el.dataset.i));
    if (t) toast(esc(t));
    if (run.phase === 'ende') { archivNachSaison(); A.niederlage(); }
    A.klick(); speichern(); render();
  },
  engagieren: (el) => { const f = S.engagieren(run, Number(el.dataset.i)); if (f) { toast(f); return; } A.geld(); speichern(); render(); },
  angebotNutzen: (el) => { const f = S.angebotNutzen(run, Number(el.dataset.id)); if (f) { toast(f); return; } A.geld(); speichern(); render(); },
  naechsteWoche: () => { S.naechsteWoche(run); planWahl = []; A.vorhang(); speichern(); render(); window.scrollTo({ top: 0 }); },
  ensemble: () => { if (!run) return; zurueck = ansicht === 'ensemble' ? zurueck : 'spiel'; ansicht = 'ensemble'; sheetZu(); render(); window.scrollTo({ top: 0 }); },
  zurueck: () => { ansicht = 'spiel'; render(); },
  entlassenFrage: (el) => {
    const s = S.saenger(run, Number(el.dataset.id));
    sheet(`<h3>Vertrag von ${esc(s.name)} auflösen?</h3><p class="hinweis">Abfindung: eine Wochengage (${s.gage} T€). Das Rollenbuch geht mit.</p><div class="knopfreihe"><button class="btn btn-leise" data-akt="sheetZu">Abbrechen</button><button class="btn btn-rot" data-akt="entlassen" data-id="${s.id}">Auflösen</button></div>`);
  },
  entlassen: (el) => { const f = S.entlassen(run, Number(el.dataset.id)); sheetZu(); if (f) { toast(f); return; } speichern(); render(); },
  kammersaenger: (el) => {
    const s = S.saenger(run, Number(el.dataset.id));
    archiv.legenden.unshift({ name: s.name, fach: s.fach, traits: s.traits.filter((t) => !['lampenfieber', 'kraenklich', 'talent'].includes(t)), haus: run.haus, datum: new Date().toLocaleDateString('de-DE'), auftritte: s.auftritte });
    run.ende.kammersaenger = s.name;
    A.sternstunde(); speichern(); render();
  },
  nochmal: () => { run = null; loescheLauf(); ansicht = 'neu'; render(); },
  zumTitel: () => { sheetZu(); if (run && run.phase === 'ende') { run = null; loescheLauf(); } ansicht = 'titel'; render(); },
  menue: () => menueSheet(),
  sheetZu: () => { if (run?.phase === 'einspringer') return; sheetZu(); },
  archiv: () => { ansicht = 'archiv'; render(); },
  archivTab: (el) => { archivTab = el.dataset.id; render(); },
  anleitung: () => { sheetZu(); zurueck = run && ansicht !== 'titel' ? 'spiel' : 'titel'; ansicht = 'anleitung'; render(); window.scrollTo({ top: 0 }); },
  tonUm: () => { einst.ton = !einst.ton; A.einstellen(einst); speichereEinst(einst); menueSheet(); },
  musikUm: () => { A.init(); einst.musik = !einst.musik; A.einstellen(einst); speichereEinst(einst); menueSheet(); },
  tempoUm: () => { einst.tempo = einst.tempo === 1 ? 2.5 : 1; speichereEinst(einst); menueSheet(); },
  aufgebenFrage: () => sheet(`<h3>Spielzeit aufgeben?</h3><div class="knopfreihe"><button class="btn btn-leise" data-akt="sheetZu">Abbrechen</button><button class="btn btn-rot" data-akt="aufgeben">Aufgeben</button></div>`),
  aufgeben: () => {
    sheetZu();
    if (!run) return;
    run.ruf = 0;
    run.ende = { sieg: false, ruf: 0, woche: run.woche, bestes: null, schlechtestes: null, kammersaenger: null };
    run.phase = 'ende';
    archivNachSaison();
    ansicht = 'spiel'; render();
  },
};

function starten(opts) {
  A.init();
  run = S.neueSaison({ ...opts, legenden: archiv.legenden });
  planWahl = [];
  ansicht = 'spiel';
  speichern();
  A.vorhang();
  render();
  window.scrollTo({ top: 0 });
}

document.addEventListener('click', (ev) => {
  A.init();
  const el = ev.target.closest('[data-akt]');
  if (!el || el.disabled) return;
  const f = AKTIONEN[el.dataset.akt];
  if (f) f(el);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#sheet').hidden && run?.phase !== 'einspringer') sheetZu();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) speichern(); });

// ------------------------------------------------------------------ Start

A.einstellen(einst);
if (run && run.phase === 'ende' && run.ende?.gezaehlt && run.ende?.kammersaenger !== null) { /* Ende bleibt sichtbar bis „Neue Spielzeit“ */ }
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
window.besetzung = { get run() { return run; }, archiv, S };
