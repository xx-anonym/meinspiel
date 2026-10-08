// Balance-Simulation: Wie oft lässt sich welches Programm aus acht Karten
// bilden, und wie weit kommt ein gieriger Bot?
//   node tools/sim.mjs [deck] [läufe]
import * as L from '../js/logic.js';
import { PROGRAMME, PROGRAMM_IDS, STAR } from '../js/data.js';

const deck = process.argv[2] || 'leipzig';
const N = Number(process.argv[3] || 300);

function teilmengen(arr, max = 5) {
  const out = [];
  const n = arr.length;
  for (let m = 1; m < 1 << n; m++) {
    let bits = 0;
    for (let x = m; x; x &= x - 1) bits++;
    if (bits > max) continue;
    out.push(arr.filter((_, i) => m & (1 << i)));
  }
  return out;
}

// 1) Häufigkeit des besten möglichen Programms in einer Starthand
{
  const zaehler = Object.fromEntries(PROGRAMM_IDS.map((p) => [p, 0]));
  const enth = Object.fromEntries(PROGRAMM_IDS.map((p) => [p, 0]));
  const rang = (a) => { const P = PROGRAMME[a]; return P.p * P.b; };
  const T = 4000;
  for (let t = 0; t < T; t++) {
    const run = L.neuerLauf({ deck, seed: 1000 + t });
    L.starteAbend(run);
    const cards = run.round.hand.map((u) => L.karte(run, u));
    let best = 'solo';
    const gesehen = new Set();
    for (const sub of teilmengen(cards)) {
      const ev = L.bewerte(sub);
      gesehen.add(ev.art);
      if (rang(ev.art) > rang(best)) best = ev.art;
    }
    zaehler[best]++;
    for (const a of gesehen) enth[a]++;
  }
  console.log(`\nDeck ${deck}: bestes Programm in der Starthand (8 Karten), ${T} Hände`);
  for (const p of PROGRAMM_IDS) console.log(`  ${PROGRAMME[p].name.padEnd(20)} bestes ${(100 * zaehler[p] / T).toFixed(1).padStart(5)} %   möglich ${(100 * enth[p] / T).toFixed(1).padStart(5)} %`);
}

// 2) Gieriger Bot
function besteAuswahl(run) {
  const r = run.round;
  const cards = r.hand.map((u) => L.karte(run, u));
  let best = null;
  for (const sub of teilmengen(cards)) {
    const uids = sub.map((c) => c.uid);
    const pr = L.pruefeAuswahl(run, uids);
    if (!pr.ok) continue;
    const kopie = structuredClone(run);
    const e = L.auffuehren(kopie, uids);
    if (!e) continue;
    if (!best || e.gesamt > best.wert) best = { uids, wert: e.gesamt, art: e.art };
  }
  return best;
}

function botAbend(run) {
  L.starteAbend(run);
  const r = run.round;
  while (run.phase === 'abend') {
    const b = besteAuswahl(run);
    const noetig = (r.ziel - r.punkte) / r.haende;
    if (b && (b.wert >= noetig || r.umbes === 0 || r.haende === 1 && b.wert >= r.ziel - r.punkte)) {
      L.auffuehren(run, b.uids);
    } else if (r.umbes > 0) {
      // Werke wegwerfen, die nicht zum besten Programm gehören
      const behalten = new Set(b ? b.uids : []);
      const weg = r.hand.filter((u) => !behalten.has(u)).slice(0, 5);
      if (!weg.length) { L.auffuehren(run, b.uids); continue; }
      L.umbesetzen(run, weg);
    } else if (b) {
      L.auffuehren(run, b.uids);
    } else break;
  }
}

function botFoyer(run, mitStars) {
  if (!mitStars) { L.foyerVerlassen(run); return; }
  for (let i = 0; i < run.shop.angebote.length; i++) {
    const a = run.shop.angebote[i];
    if (a.verkauft) continue;
    if ((a.art === 'star' || a.art === 'rez') && run.geld >= a.preis) L.kaufen(run, i);
  }
  if (run.investAngebot[run.station] && run.geld >= 14) L.investieren(run);
  L.foyerVerlassen(run);
}

for (const mitStars of N ? [false, true] : []) {
  const erreicht = {};
  const t0 = Date.now();
  const M = mitStars ? N : Math.min(N, 200);
  for (let t = 0; t < M; t++) {
    const run = L.neuerLauf({ deck, seed: 50000 + t });
    while (true) {
      if (run.phase === 'spielplan') botAbend(run);
      else if (run.phase === 'bravo') L.kassieren(run);
      else if (run.phase === 'shop') botFoyer(run, mitStars);
      else break;
      if (run.station > 12) break;
    }
    const st = run.phase === 'sieg' ? 9 : run.station;
    erreicht[st] = (erreicht[st] || 0) + 1;
  }
  console.log(`\nBot ${mitStars ? 'kauft Stars und Rezensionen' : 'ohne Käufe'} (${M} Läufe, ${((Date.now() - t0) / 1000).toFixed(1)} s): Station erreicht`);
  for (const k of Object.keys(erreicht).sort((a, b) => a - b)) console.log(`  ${k === '9' ? 'Sieg' : 'Station ' + k}: ${(100 * erreicht[k] / M).toFixed(1)} %`);
}
