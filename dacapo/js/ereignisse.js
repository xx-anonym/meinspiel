// Da capo! – Post für die Intendanz: ein Ereignis zu Beginn jeder neuen
// Station, mit zwei oder drei Antworten. Rein und ohne DOM wie die Logik.
//
// Ereignis:  titel, text (Text oder Funktion), moeglich(run, t), vorbereiten(run, t) → d
// Antwort:   text, wirkung (Markup wie bei den Stars), kosten (Dukaten),
//            grund(run, t, d) → warum gerade nicht wählbar, sonst null
//            tun(run, t, d) → Meldung
// Texte, Wirkungen und Kosten dürfen Funktionen (run, d) sein.
// t sind Werkzeuge aus logic.js (Zufall, Karten, Stars, Stufen, Modifikatoren).

import { STAR, WERKE, KOMPONISTEN, PROGRAMME } from './data.js';

const keineLoge = (run) => (run.stars.length >= run.maxStars ? 'Keine Loge frei.' : null);
const name = (id) => STAR[id].name;
const stufenText = (arten, n = 1) => `${arten.map((a) => PROGRAMME[a].name).join(' und ')} ${arten.length > 1 ? 'steigen' : 'steigt'} ${n === 1 ? 'je eine Stufe' : `um ${n} Stufen`}.`;

function zweiWerkeVon(run, t, komp) {
  const pool = WERKE.filter((w) => w.c === komp);
  const neu = [];
  for (let i = 0; i < 2 && pool.length; i++) neu.push(t.pick(run, pool));
  return neu;
}

export const EREIGNISSE = [
  {
    id: 'heiser',
    titel: 'Der Tenor ist heiser',
    text: 'Am Morgen der Premiere krächzt der Heldentenor nur noch. Die Agentur hätte jemanden frei – gegen Honorar.',
    optionen: [
      {
        text: 'Einspringer engagieren', kosten: 6, wirkung: 'Ein zufälliger Ensemble-Star kommt dazu.', grund: keineLoge,
        tun: (run, t) => { const id = t.zufallsStar(run, [], 1); if (!id) return 'Niemand frei.'; run.stars.push({ id, v: 0 }); return `${name(id)} springt ein.`; },
      },
      {
        text: 'Er singt trotzdem', wirkung: '{g:+4 Dukaten} gespart – aber der nächste Abend hat eine Vorstellung weniger.',
        tun: (run, t) => { run.geld += 4; t.abendMod(run, { haende: -1 }); return 'Er gurgelt mit Salbeitee.'; },
      },
    ],
  },
  {
    id: 'ricordi',
    titel: 'Post aus Mailand',
    text: 'Casa Ricordi bietet Aufführungsrechte an: frisch gedruckte Partituren, die Stimmen schon eingerichtet.',
    optionen: [
      {
        text: 'Verdi-Partituren', kosten: 8, wirkung: 'Zwei zufällige Verdi-Werke mit Starbesetzung ({b:+4 Begeisterung}).',
        tun: (run, t) => `Neu: ${zweiWerkeVon(run, t, 'verdi').map((w) => t.titel(t.neuesWerk(run, w.id, 'mult'))).join(', ')}.`,
      },
      {
        text: 'Puccini-Partituren', kosten: 8, wirkung: 'Zwei zufällige Puccini-Werke mit Starbesetzung ({b:+4 Begeisterung}).',
        tun: (run, t) => `Neu: ${zweiWerkeVon(run, t, 'puccini').map((w) => t.titel(t.neuesWerk(run, w.id, 'mult'))).join(', ')}.`,
      },
      { text: 'Höflich ablehnen', wirkung: 'Nichts passiert.', tun: () => 'Grazie, no.' },
    ],
  },
  {
    id: 'brand',
    titel: 'Feuer im Fundus',
    text: 'Im Kulissenlager brennt es. Die Feuerwehr fragt, ob sie wirklich alles retten soll.',
    optionen: [
      { text: 'Alles retten', kosten: 10, wirkung: 'Nichts geht verloren.', tun: () => 'Gerettet – bis auf ein paar angesengte Perücken.' },
      {
        text: 'Brennen lassen', wirkung: 'Drei zufällige Werke verbrennen. Die Versicherung zahlt {g:+6 Dukaten}.',
        grund: (run) => (run.repertoire.length <= 15 ? 'Das Repertoire ist schon zu klein.' : null),
        tun: (run, t) => {
          const weg = t.mischen(run, [...run.repertoire]).slice(0, 3);
          const ids = new Set(weg.map((c) => c.uid));
          run.repertoire = run.repertoire.filter((c) => !ids.has(c.uid));
          run.geld += 6;
          return `Verbrannt: ${weg.map((c) => t.titel(c)).join(', ')}.`;
        },
      },
    ],
  },
  {
    id: 'diner',
    titel: 'Diner beim Mäzen',
    text: 'Ein Bankier lädt in seine Villa. Zwischen Hauptgang und Dessert fragt er, wofür du sein Geld ausgeben würdest.',
    optionen: [
      { text: 'Für die Gagen', wirkung: '{g:+15 Dukaten}.', tun: (run) => { run.geld += 15; return 'Der Scheck liegt unter der Serviette.'; } },
      { text: 'Für das Festspielhaus', wirkung: 'Der nächste Bauabschnitt kostet die Hälfte.', tun: (run) => { run.bauRabatt = 0.5; return 'Er übernimmt die halben Baukosten.'; } },
    ],
  },
  {
    id: 'abwerben',
    titel: 'Ein Abwerbeversuch',
    moeglich: (run) => run.stars.length > 0,
    vorbereiten: (run) => {
      const s = [...run.stars].sort((a, b) => (STAR[b.id].preis || 0) - (STAR[a.id].preis || 0))[0];
      return { sid: s.id };
    },
    text: (run, d) => `Die Staatsoper will ${name(d.sid)} – und bietet eine stattliche Ablöse.`,
    optionen: [
      {
        text: 'Ziehen lassen', wirkung: (run, d) => `Der Star geht, du bekommst {g:+${3 * STAR[d.sid].preis} Dukaten}.`,
        grund: (run, t, d) => (run.stars.some((s) => s.id === d.sid) ? null : 'Der Star ist schon weg.'),
        tun: (run, t, d) => { t.starWeg(run, d.sid); run.geld += 3 * STAR[d.sid].preis; return `${name(d.sid)} wechselt nach Berlin.`; },
      },
      {
        text: 'Gehalt erhöhen', kosten: (run, d) => STAR[d.sid].preis, wirkung: 'Der Star bleibt.',
        grund: (run, t, d) => (run.stars.some((s) => s.id === d.sid) ? null : 'Der Star ist schon weg.'),
        tun: (run, t, d) => `${name(d.sid)} bleibt dem Haus treu.`,
      },
    ],
  },
  {
    id: 'gastdirigent',
    titel: 'Ein Gastdirigent aus Wien',
    text: 'Er hat drei freie Probentage und eine ausgeprägte Vorliebe. Welche?',
    optionen: [
      { text: 'Die großen Komponistenabende', wirkung: stufenText(['kompAbend', 'werkschau']), tun: (run, t) => { t.stufe(run, 'kompAbend', 1); t.stufe(run, 'werkschau', 1); return 'Er probt Satz für Satz.'; } },
      { text: 'Die Nationalabende', wirkung: stufenText(['national', 'zeitreise']), tun: (run, t) => { t.stufe(run, 'national', 1); t.stufe(run, 'zeitreise', 1); return 'Er schwärmt von Klangfarben.'; } },
      { text: 'Das kleine Format', wirkung: stufenText(['doppel', 'zweiDoppel']), tun: (run, t) => { t.stufe(run, 'doppel', 1); t.stufe(run, 'zweiDoppel', 1); return 'Er liebt das Kammerspiel.'; } },
    ],
  },
  {
    id: 'tombola',
    titel: 'Tombola im Foyer',
    text: 'Der Förderverein verlost einen Kronleuchter. Die Theaterkasse könnte mitspielen.',
    optionen: [
      {
        text: 'Alles auf eine Karte', wirkung: 'Halbe Chance: Dukaten verdoppeln (höchstens {g:+40}). Sonst ist die Hälfte weg.',
        grund: (run) => (run.geld < 2 ? 'Die Kasse ist leer.' : null),
        tun: (run, t) => {
          if (t.rnd(run) < 0.5) { const g = Math.min(40, run.geld); run.geld += g; return `Hauptgewinn! {g:+${g} Dukaten}.`; }
          const g = Math.floor(run.geld / 2); run.geld -= g; return `Niete. ${g} Dukaten sind weg.`;
        },
      },
      { text: 'Nicht mitspielen', wirkung: 'Nichts passiert.', tun: () => 'Der Kronleuchter geht an die Garderobiere.' },
    ],
  },
  {
    id: 'opernball',
    titel: 'Der Opernball',
    text: 'Die halbe Stadt tanzt auf deiner Bühne. Eine Loge wird frei – oder du tanzt einfach mit.',
    optionen: [
      { text: 'Eine Loge mieten', kosten: 15, wirkung: '+1 Platz für Stars, dauerhaft.', tun: (run) => { run.maxStars += 1; return 'Eine neue Loge.'; } },
      { text: 'Durchtanzen', wirkung: 'In dieser Station +1 Umbesetzung pro Abend.', tun: (run, t) => { t.stationMod(run, { umbes: 1 }); return 'Das Ensemble ist bestens gelaunt.'; } },
    ],
  },
  {
    id: 'sammler',
    titel: 'Nachlass eines Sammlers',
    text: 'Ein Sammler hinterlässt dem Haus seine Partiturbibliothek – lauter Raritäten.',
    optionen: [
      {
        text: 'Ins Repertoire', wirkung: 'Drei zufällige Werke mit Ruhm 6 oder weniger.',
        tun: (run, t) => {
          const pool = WERKE.filter((w) => w.r <= 6);
          const neu = [0, 1, 2].map(() => t.neuesWerk(run, t.pick(run, pool).id));
          return `Neu: ${neu.map((c) => t.titel(c)).join(', ')}.`;
        },
      },
      { text: 'Ans Antiquariat', wirkung: '{g:+10 Dukaten}.', tun: (run) => { run.geld += 10; return 'Verkauft.'; } },
    ],
  },
  {
    id: 'streik',
    titel: 'Die Bühnentechnik streikt',
    text: 'Keine Umbauten, kein Licht, keine Versenkung. Die Gewerkschaft will mehr Geld.',
    optionen: [
      { text: 'Nachgeben', kosten: 12, wirkung: 'Alles läuft wie gehabt.', tun: () => 'Der Vorhang hebt sich wieder.' },
      { text: 'Aussitzen', wirkung: 'In dieser Station −1 Umbesetzung pro Abend.', tun: (run, t) => { t.stationMod(run, { umbes: -1 }); return 'Gespielt wird im Einheitsbühnenbild.'; } },
      { text: 'Konzertant spielen', wirkung: 'In dieser Station +1 Vorstellung pro Abend, aber −1 Handgröße.', tun: (run, t) => { t.stationMod(run, { haende: 1, hand: -1 }); return 'Frack statt Kostüm.'; } },
    ],
  },
  {
    id: 'plattenfirma',
    titel: 'Die Plattenfirma ruft',
    text: 'Ein Label will dein Ensemble aufnehmen. Live mitschneiden oder lieber ins Studio?',
    moeglich: (run) => run.repertoire.length > 0,
    optionen: [
      {
        text: 'Live mitschneiden', wirkung: 'Zwei zufällige Werke werden Goldene Schallplatten ({g:+2 Dukaten}, wenn gezählt).',
        tun: (run, t) => { const cs = t.zufallsKarten(run, 2); for (const c of cs) c.enh = 'gold'; return `Vergoldet: ${cs.map((c) => t.titel(c)).join(', ')}.`; },
      },
      {
        text: 'Ins Studio', kosten: 6, wirkung: 'Ein zufälliges Werk wird zur Festspielfassung ({x:×1,5 Begeisterung}).',
        tun: (run, t) => { const [c] = t.zufallsKarten(run, 1); c.enh = 'xmult'; return `${t.titel(c)} in der Festspielfassung.`; },
      },
    ],
  },
  {
    id: 'regisseur',
    titel: 'Ein Skandalregisseur',
    text: 'Er möchte den Holländer auf einer Bohrinsel spielen lassen. Die Presse wäre begeistert, die Abonnenten weniger.',
    moeglich: (run, t) => !t.hatStar(run, 'regietheater'),
    optionen: [
      { text: 'Engagieren', wirkung: 'Regietheater kommt dazu ({x:×2 Begeisterung}, aber Buhsturm-Gefahr).', grund: keineLoge, tun: (run) => { run.stars.push({ id: 'regietheater', v: 0 }); return 'Die Proben beginnen mit einer Pressekonferenz.'; } },
      { text: 'Vor die Tür setzen', wirkung: 'Die Abonnenten danken es dir: {g:+6 Dukaten}.', tun: (run) => { run.geld += 6; return 'Blumen von den Abonnenten.'; } },
    ],
  },
  {
    id: 'uebersetzung',
    titel: 'Alles auf Deutsch?',
    text: 'Der Kulturausschuss möchte, dass das Publikum versteht, was gesungen wird.',
    moeglich: (run, t) => run.repertoire.some((c) => t.schule(c) !== 'de'),
    optionen: [
      {
        text: 'Übersetzen lassen', wirkung: 'Vier zufällige nicht-deutsche Werke zählen fortan als deutsch.',
        tun: (run, t) => {
          const cs = t.mischen(run, run.repertoire.filter((c) => t.schule(c) !== 'de')).slice(0, 4);
          for (const c of cs) c.s = 'de';
          return `Auf Deutsch: ${cs.map((c) => t.titel(c)).join(', ')}.`;
        },
      },
      { text: 'Originalsprache', wirkung: stufenText(['national']), tun: (run, t) => { t.stufe(run, 'national', 1); return 'Mit Übertiteln.'; } },
    ],
  },
  {
    id: 'jubilaeum',
    titel: 'Ein Jubiläum',
    moeglich: (run) => run.repertoire.length > 0,
    vorbereiten: (run, t) => {
      const n = {};
      for (const c of run.repertoire) n[t.komp(c)] = (n[t.komp(c)] || 0) + 1;
      const max = Math.max(...Object.values(n));
      return { komp: t.pick(run, Object.keys(n).filter((k) => n[k] === max).sort()) };
    },
    text: (run, d) => `${KOMPONISTEN[d.komp][1]} hat einen runden Geburtstag. Die Stadt erwartet etwas.`,
    optionen: [
      {
        text: 'Eine Festwoche', wirkung: (run, d) => `Zwei zufällige Werke von ${KOMPONISTEN[d.komp][0]} kommen ins Repertoire.`,
        tun: (run, t, d) => { const neu = zweiWerkeVon(run, t, d.komp).map((w) => t.neuesWerk(run, w.id)); return `Neu: ${neu.map((c) => t.titel(c)).join(', ')}.`; },
      },
      { text: 'Ein Gedenkkonzert', wirkung: stufenText(['kompAbend'], 2), tun: (run, t) => { t.stufe(run, 'kompAbend', 2); return 'Ein würdiger Abend.'; } },
    ],
  },
  {
    id: 'kritikerpapst',
    titel: 'Der Kritikerpapst kündigt sich an',
    text: 'Er kommt zum Kritikerabend dieser Station. Man könnte ihn vorher zum Essen einladen …',
    moeglich: (run, t) => !t.istFinale(run) && !!t.kritikerAktiv(run, 2),
    optionen: [
      { text: 'Zum Essen einladen', kosten: 10, wirkung: 'Am Kritikerabend dieser Station gilt die Regel nicht.', tun: (run, t) => { t.stationMod(run, { kritikerFrei: true }); return 'Er bestellt den teuersten Wein.'; } },
      { text: 'Herausfordern', wirkung: 'Das Ziel des Kritikerabends steigt um 25 %, die Gage verdreifacht sich.', tun: (run, t) => { t.stationMod(run, { kritikerZiel: 1.25, kritikerGage: 3 }); return 'Die Fehde ist eröffnet.'; } },
      { text: 'Ignorieren', wirkung: 'Nichts passiert.', tun: () => 'Er wird schon kommen.' },
    ],
  },
];
export const EREIGNIS = Object.fromEntries(EREIGNISSE.map((e) => [e.id, e]));
