// Balance-Simulation für „Besetzung“.
//   node tools/sim.mjs [haus] [läufe]
// Ein einfacher Bot: wählt die zwei Opern mit der besten Erwartung, besetzt
// gierig, springt sinnvoll ein und engagiert am Wochenende die beste Stimme.
import * as S from '../js/spiel.js';
import { OPER, HAUS } from '../js/daten.js';

const haus = process.argv[2] || 'leipzig';
const N = Number(process.argv[3] || 300);

function erwartungFuer(run, idx) {
  const k = structuredClone(run);
  S.planFestlegen(k, [idx, idx === 0 ? 1 : 0]);
  S.vorschlag(k);
  const v = S.vorhersage(k);
  return v.erwartet / v.ziel;
}

function botWoche(run) {
  if (run.phase === 'festplan') { S.planFestlegen(run, []); return; }
  const werte = run.angebote.map((_, i) => ({ i, w: erwartungFuer(run, i) })).sort((a, b) => b.w - a.w);
  S.planFestlegen(run, [werte[0].i, werte[1].i]);
}

function botAbend(run) {
  S.vorschlag(run);
  let r = S.vorhangAuf(run);
  if (r === 'einspringer') {
    const { rolle } = run.indisponiert;
    const oper = S.aktuelleOper(run);
    let best = null;
    for (const s of run.ensemble) {
      if (s.id === run.indisponiert.saenger || S.besetztAls(run, s.id) >= 0) continue;
      const w = S.rollenWert(run, s, oper.rollen[rolle], oper);
      if (!w.verbot && (!best || w.erwartet > best.w)) best = { id: s.id, w: w.erwartet };
    }
    if (best && best.w > 25) r = S.einspringen(run, 'ensemble', best.id);
    else if (run.etat >= S.gastKosten(run) + 20) r = S.einspringen(run, 'gast');
    else r = S.einspringen(run, 'trotzdem');
  }
  return r;
}

function botWochenende(run) {
  const w = run.wochenende;
  if (!w.ereignis.erledigt) S.ereignisAntworten(run, w.ereignis.id === 'sponsor' || w.ereignis.id === 'maezen' || w.ereignis.id === 'studio' ? 0 : 1);
  if (run.phase !== 'wochenende') return;
  // beste Stimme engagieren, wenn bezahlbar
  const k = w.vorsingen.map((s, i) => ({ s, i })).filter(({ s }) => !s.vergeben).sort((a, b) => b.s.klasse - a.s.klasse);
  for (const { s, i } of k) {
    if (run.etat - s.handgeld >= 25 && run.ensemble.length < S.MAX_ENSEMBLE) { S.engagieren(run, i); break; }
  }
  // schwächste, teure Leute entlassen, wenn das Ensemble voll ist
  const a = w.angebot;
  if (!a.erledigt && run.etat > a.preis + 30) {
    const ziel = [...run.ensemble].filter((s) => !s.gast).sort((x, y) => x.frische - y.frische)[0];
    if (ziel && (a.art !== 'kur' || ziel.frische < 70)) S.angebotNutzen(run, ziel.id);
  }
  S.naechsteWoche(run);
}

const ergebnisse = { sieg: 0, entlassen: 0, ruf: {}, wocheEnde: {}, stufen: {}, etat: [], kiekser: 0, abende: 0 };
const t0 = Date.now();
for (let t = 0; t < N; t++) {
  const run = S.neueSaison({ haus, seed: 1000 + t });
  let schutz = 0;
  while (run.phase !== 'ende' && schutz++ < 500) {
    if (run.phase === 'wochenplan' || run.phase === 'festplan') botWoche(run);
    else if (run.phase === 'besetzung') botAbend(run);
    else if (run.phase === 'vorstellung') S.weiter(run);
    else if (run.phase === 'wochenende') botWochenende(run);
    else throw new Error('Phase ' + run.phase);
  }
  if (run.ende.sieg) ergebnisse.sieg++; else { ergebnisse.entlassen++; ergebnisse.wocheEnde[run.woche] = (ergebnisse.wocheEnde[run.woche] || 0) + 1; }
  ergebnisse.ruf[run.ruf] = (ergebnisse.ruf[run.ruf] || 0) + 1;
  for (const a of run.stats.abende) { ergebnisse.stufen[a.stufe] = (ergebnisse.stufen[a.stufe] || 0) + 1; ergebnisse.abende++; }
  ergebnisse.kiekser += run.stats.kiekser;
  ergebnisse.etat.push(run.etat);
}
const p = (x) => (100 * x / N).toFixed(1) + ' %';
console.log(`${HAUS[haus].name}: ${N} Spielzeiten in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('  Saison überstanden:', p(ergebnisse.sieg), ' entlassen:', p(ergebnisse.entlassen));
console.log('  Entlassen in Woche:', JSON.stringify(ergebnisse.wocheEnde));
console.log('  Ruf am Ende:', JSON.stringify(ergebnisse.ruf));
console.log('  Applaus:', Object.entries(ergebnisse.stufen).map(([k, v]) => `${k} ${(100 * v / ergebnisse.abende).toFixed(0)} %`).join(', '));
console.log('  Kiekser je Saison:', (ergebnisse.kiekser / N).toFixed(1), ' Etat am Ende (Median):', ergebnisse.etat.sort((a, b) => a - b)[Math.floor(N / 2)]);
