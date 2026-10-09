// Die Wertung als Zeitungskritik: eine Überschrift, zwei trockene Sätze.

const K = {
  beethoven7: {
    triumph: [
      ['Ein Puls wie ein Uhrwerk', 'Gleichmäßig, unerbittlich, ergreifend: So wächst dieser Satz, wie Beethoven ihn gemeint haben dürfte.', 'Am Ende hustete niemand, was in diesem Saal als stehende Ovation gilt.'],
      ['Der Trauermarsch, der niemanden kaltließ', 'Selten hat man das Allegretto so unbeirrbar schreiten hören.', 'Die Bratschen, sonst eher unauffällig, wirkten beinahe stolz.'],
    ],
    gut: [
      ['Solide geschritten', 'Der Puls blieb meist dort, wo er hingehört, und das Fortissimo kam mit Wucht.', 'Kleine Wackler verzeiht man gern; Beethoven war schließlich auch kein Metronom.'],
      ['Beethoven, gut abgehangen', 'Das Allegretto schritt würdevoll und nur gelegentlich schneller als ein Trauerzug.', 'Das Publikum blieb wach, was bei diesem Satz eine Leistung ist.'],
    ],
    schnell: [
      ['Allegretto mit Termindruck', 'Der Trauerzug hatte offenbar noch einen Anschlusstermin.', 'Beethoven schrieb Allegretto, nicht Allegro; aber wer liest heute noch Partituren.'],
      ['Trauermarsch im Laufschritt', 'So zügig hat man diesen Satz selten zu Grabe getragen.', 'Die Celli kamen kaum zum Trauern.'],
    ],
    langsam: [
      ['Allegretto in Zeitlupe', 'Der Puls schlug so ruhig, dass Reihe 9 ihn für eingeschlafen hielt.', 'Die Bratschen haben es trotzdem durchgestanden, respektvoll schweigend.'],
      ['Ein Trauermarsch, der sich Zeit nimmt', 'Zwischen zwei Schlägen hätte man bequem seinen Mantel an der Garderobe abholen können.', 'Beethovens Metronomangabe lag an diesem Abend offenbar im Fundus.'],
    ],
    mittel: [
      ['Beethoven mit Schlagseite', 'Der Satz wankte, fiel aber nicht.', 'Das Fortissimo kam, nur eben nicht ganz pünktlich.'],
    ],
    schwach: [
      ['Der Puls setzt aus', 'Ein Allegretto, das mehr stolperte als schritt.', 'Die zweiten Geigen tauschten vielsagende Blicke.'],
    ],
    desaster: [
      ['Beethoven hätte es nicht gehört. Zum Glück.', 'Was als Trauermarsch begann, endete als Trauerfall.', 'Der Saal applaudierte erleichtert, vor allem dem Ende.'],
    ],
  },
  radetzky: {
    triumph: [
      ['Neujahr im Oktober', 'Der Saal klatschte, als hinge der Weltfrieden davon ab, und kein Schlag ging daneben.', 'Man hätte schwören können, es sei der erste Januar.'],
      ['Wien, wie es klatscht und lacht', 'Orchester und Publikum marschierten im Gleichschritt bis zur letzten Note.', 'Der Feldmarschall hätte salutiert.'],
    ],
    gut: [
      ['Ein Marsch mit Haltung', 'Das Tempo stand, der Saal klatschte begeistert und meist sogar gleichzeitig.', 'Nur im Rang wollte jemand im Trio nicht aufhören.'],
    ],
    schnell: [
      ['Radetzky im Galopp', 'Der Feldmarschall erreichte das Ziel deutlich vor seiner Armee.', 'Das Publikum klatschte tapfer hinterher, teils bis heute.'],
    ],
    langsam: [
      ['Ein Marsch mit Gehhilfe', 'Man marschierte, als drückten neue Stiefel.', 'Das Publikum klatschte langsam, und das war nicht nur Begeisterung.'],
    ],
    klatschChaos: [
      ['Wien klatscht, nur wann?', 'Saal und Orchester fanden phasenweise getrennt voneinander statt.', 'Der Marsch endete zweimal: einmal auf der Bühne, einmal im Parkett.'],
      ['Klatschen nach Gehör', 'Jeder Tempowechsel kam für das Publikum so überraschend wie ein Steuerbescheid.', 'Im Rang klatschte man noch, als das Orchester schon die Noten einpackte.'],
    ],
    mittel: [
      ['Radetzky, leicht verstimmt', 'Der Marsch stand, das Publikum schwankte.', 'Ein Abend für Freunde des Offbeats.'],
    ],
    schwach: [
      ['Marschieren will gelernt sein', 'Zwischen Orchester und Saal tat sich ein Graben auf, tiefer als der Orchestergraben.', 'Die kleine Trommel wirkte ratlos.'],
    ],
    desaster: [
      ['Rückzug an allen Fronten', 'Radetzky gewann seine Schlachten; dieser Abend ging verloren.', 'Das Publikum klatschte am Ende, aber eher für sich selbst.'],
    ],
  },
  brahms5: {
    triumph: [
      ['Feuer, aber mit Plan', 'Jeder Tempowechsel kam, als hätte Brahms ihn gerade erst erfunden.', 'Selbst die Kontrabässe wirkten überrascht von sich.'],
      ['Stokowski hätte genickt', 'Rubato an allen richtigen Stellen und an keiner falschen.', 'Ein Tanz, bei dem selbst der Kritiker kurz mit dem Fuß wippte.'],
    ],
    gut: [
      ['Temperament mit Bodenhaftung', 'Die meisten Tempowechsel saßen, die übrigen standen wenigstens.', 'Ein Ungarischer Tanz, nach dem man nicht sofort einen Arzt braucht.'],
    ],
    schnell: [
      ['Ungarisch im Zeitraffer', 'Das Vivace begann schon vor dem Vivace.', 'Die Klarinetten spielten, als führe gleich der letzte Bus.'],
    ],
    langsam: [
      ['Ein Csárdás im Kurbad', 'Das Feuer glomm, aber es loderte nie.', 'Man tanzte, als gäbe es Rückenschmerzen auf Rezept.'],
    ],
    unruhig: [
      ['Ungarisch für Anfänger', 'Rubato gab es reichlich, allerdings an den falschen Stellen.', 'Die Holzbläser hätten sich eine Landkarte gewünscht.'],
    ],
    mittel: [
      ['Halb Tanz, halb Taumel', 'Die Tempowechsel kamen, nur selten zur selben Zeit wie im Orchester.', 'Brahms ist robust; er hat Schlimmeres überstanden.'],
    ],
    schwach: [
      ['Ein Tanz auf Glatteis', 'Wo Brahms beschleunigt, bremste der Dirigent, und umgekehrt.', 'Das Orchester hielt sich tapfer an sich selbst fest.'],
    ],
    desaster: [
      ['Ungarn bittet um Auslieferung', 'Von Brahms blieb vor allem die Tonart erkennbar.', 'Der Applaus war kurz und klang nach Notwehr.'],
    ],
  },
  grieg: {
    triumph: [
      ['Die Halle bebt', 'Ein Accelerando wie ein Erdrutsch, präzise bis zum letzten Felsbrocken.', 'Man möchte nicht wissen, was aus dem Berg geworden ist.'],
      ['Der Bergkönig dankt ab', 'Langsam begonnen, gnadenlos gesteigert, punktgenau eingestürzt.', 'Peer Gynt ist entkommen; das Publikum nur knapp.'],
    ],
    gut: [
      ['Trolle mit Taktgefühl', 'Die Steigerung saß, auch wenn der Berg einmal kurz zu früh wackelte.', 'Das Publikum hielt sich am Programmheft fest.'],
    ],
    schnell: [
      ['Ein Bergkönig auf Speed', 'Die Trolle kamen gar nicht erst zum Schleichen.', 'Peer Gynt dürfte die Halle noch vor dem Orchester verlassen haben.'],
      ['Accelerando ohne Anlauf', 'Das Stück wurde schon schneller, bevor es überhaupt langsam war.', 'Grieg hätte es für eine Polka gehalten.'],
    ],
    langsam: [
      ['Der Bergkönig hält Mittagsschlaf', 'Das Accelerando fand eher im Konjunktiv statt.', 'Die Trolle wirkten beruhigt, das Publikum auch.'],
      ['Kein Entkommen, nur Schritttempo', 'Peer Gynt hätte bei diesem Tempo gemütlich einen Kaffee trinken können.', 'Der Berg stürzte schließlich ein, vermutlich aus Langeweile.'],
    ],
    mittel: [
      ['Trolle mit Orientierungsproblemen', 'Die Steigerung kam in Schüben, wie das Wetter in Norwegen.', 'Am Ende stand der Berg noch, wackelig, aber er stand.'],
    ],
    schwach: [
      ['Felsschlag in der Halle', 'Das Accelerando verlor unterwegs mehrere Instrumentengruppen.', 'Die Pauke suchte bis zuletzt nach dem Takt.'],
    ],
    desaster: [
      ['Kollaps vor dem Kollaps', 'Der Berg stürzte ein, lange bevor Grieg es vorgesehen hatte.', 'Das Publikum floh geordneter als das Orchester.'],
    ],
  },
  eigen: {
    triumph: [['Ein Abend für die Geschichtsbücher', 'Das Orchester folgte jedem Wink, als hätte es nie etwas anderes gewollt.', 'Selbst die Garderobiere kam zum Applaus herein.']],
    gut: [['Mit sicherer Hand', 'Das Tempo saß, die Musik atmete.', 'Kleine Unebenheiten nahm das Publikum als Charakter.']],
    schnell: [['Mit Rückenwind', 'Das Stück kam deutlich früher an als geplant.', 'Die Musiker blätterten um, wann immer sie konnten.']],
    langsam: [['Gemächlich bis gemütlich', 'Man ließ sich Zeit, viel Zeit.', 'Im Parkett wurde die Spieldauer neu berechnet.']],
    unruhig: [['Taktstock mit Eigenleben', 'Das Tempo wechselte öfter als die Besetzung.', 'Das Orchester blieb höflich und folgte, so gut es ging.']],
    mittel: [['Licht und Schatten', 'Es gab gelungene Momente und solche, die man gelungen nennen könnte.', 'Das Publikum entschied sich wohlwollend für Applaus.']],
    schwach: [['Ein Abend mit Lernkurve', 'Orchester und Dirigent lernten sich im Laufe des Stücks kennen.', 'Eine Freundschaft ist daraus noch nicht geworden.']],
    desaster: [['Das Orchester bittet um Versetzung', 'Was genau gespielt wurde, wird noch ermittelt.', 'Der Applaus war kurz, aber ehrlich erleichtert.']],
  },
};

const ZUSATZ = {
  stillstand2: ['Zweimal verstummte das Orchester ganz, vermutlich aus Respekt.', 'Mehrfach hielt das Orchester inne, um auf seinen Dirigenten zu warten.'],
  stillstand1: ['Einmal verstummte das Orchester ganz; das Programmheft nennt es inzwischen Generalpause.'],
  fermate: ['Fermaten wurden als unverbindliche Empfehlung behandelt.'],
  laut: ['Die Dynamik kannte zwei Stufen: laut und Blech.'],
  leise: ['Man dirigierte so dezent, dass das Orchester sich gelegentlich vergewisserte, ob noch jemand da ist.'],
  streicher: ['Die Streicher spielten zwischenzeitlich hörbar um ihr Leben.'],
  holz: ['Das Holz klang, als hätte es die Generalprobe verpasst.'],
  blech: ['Das Blech setzte eigene Akzente, meist dort, wo keine waren.'],
  kiekser: ['Das Horn kiekste so oft, dass man es für Absicht halten musste.'],
  zappler: ['Der Taktstock zitterte zeitweise wie ein Lämmerschwanz.'],
};

const zufallAus = (arr) => arr[Math.floor(Math.random() * arr.length)];

function kategorie(e, id) {
  const pool = K[id] || K.eigen;
  if (e.punkte >= 88) return 'triumph';
  if (e.tempoMittel > 0.1) return 'schnell';
  if (e.tempoMittel < -0.1) return 'langsam';
  if (e.punkte >= 74) return 'gut';
  if (pool.klatschChaos && e.klatsch != null && e.klatsch > 0.17) return 'klatschChaos';
  if (pool.unruhig && e.unruhe > 0.32) return 'unruhig';
  if (e.punkte >= 58) return 'mittel';
  if (e.punkte >= 42) return 'schwach';
  return 'desaster';
}

function zusatz(e) {
  const kand = [];
  if (e.stillstaende >= 2) kand.push(['stillstand2', 5]);
  else if (e.stillstaende === 1) kand.push(['stillstand1', 3]);
  if (e.fermatenFrueh > 0) kand.push(['fermate', 3.5]);
  if (e.dynamikAktiv && e.dynMittel > 0.2) kand.push(['laut', 3]);
  if (e.dynamikAktiv && e.dynMittel < -0.2) kand.push(['leise', 3]);
  if (e.kiekser >= 3) kand.push(['kiekser', 3.2]);
  const sm = e.stimmungMin;
  const schlechteste = ['streicher', 'holz', 'blech'].sort((a, b) => sm[a] - sm[b])[0];
  if (sm[schlechteste] < 0.3) kand.push([schlechteste, 2.5]);
  if (e.zappler >= 6) kand.push(['zappler', 2]);
  if (!kand.length) return null;
  kand.sort((a, b) => b[1] - a[1]);
  return zufallAus(ZUSATZ[kand[0][0]]);
}

export function kritikSchreiben(e, stueckId) {
  const pool = K[stueckId] || K.eigen;
  const kat = kategorie(e, stueckId);
  const [titel, s1, s2] = zufallAus(pool[kat] || K.eigen[kat] || K.eigen.mittel);
  const z = kat === 'triumph' ? null : zusatz(e);
  return { kategorie: kat, titel, saetze: [s1, z || s2] };
}

export function applausFuer(punkte) {
  if (punkte >= 88) return { art: 'ovation', staerke: 1, dauer: 9, bravo: 6 };
  if (punkte >= 72) return { art: 'herzlich', staerke: 0.8, dauer: 7, bravo: 2 };
  if (punkte >= 50) return { art: 'hoeflich', staerke: 0.45, dauer: 4.5, bravo: 0 };
  return { art: 'einzeln', staerke: 0, dauer: 0, bravo: 0 };
}
