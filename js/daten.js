// Besetzung – Kataloge: Fächer, Eigenschaften, Opern mit ihren Rollen, Häuser.
//
// Die Fachzuordnung folgt dem deutschen Fachsystem (Kloiber), vereinfacht auf
// vierzehn Fächer. Wo Rollen zwischen zwei Fächern liegen, steht das gängigere.

// ------------------------------------------------------------------ Fächer

export const FAECHER = {
  Sb: { name: 'Soubrette', kurz: 'Soubr.', gruppe: 'sopran', nachbarn: ['Kol', 'Lyr'] },
  Kol: { name: 'Koloratursopran', kurz: 'Kolor.', gruppe: 'sopran', nachbarn: ['Sb', 'Lyr'] },
  Lyr: { name: 'Lyrischer Sopran', kurz: 'Lyr. S', gruppe: 'sopran', nachbarn: ['Sb', 'Kol', 'JD', 'Mez'] },
  JD: { name: 'Jugendlich-dramatischer Sopran', kurz: 'Jug.-dr. S', gruppe: 'sopran', nachbarn: ['Lyr', 'Dr'] },
  Dr: { name: 'Dramatischer Sopran', kurz: 'Dram. S', gruppe: 'sopran', nachbarn: ['JD', 'Mez'] },
  Mez: { name: 'Mezzosopran / Alt', kurz: 'Mezzo', gruppe: 'mezzo', nachbarn: ['Dr', 'Lyr'] },
  Spt: { name: 'Spiel- und Charaktertenor', kurz: 'Spieltenor', gruppe: 'tenor', nachbarn: ['LyT'] },
  LyT: { name: 'Lyrischer Tenor', kurz: 'Lyr. Tenor', gruppe: 'tenor', nachbarn: ['Spt', 'JHT'] },
  JHT: { name: 'Jugendlicher Heldentenor', kurz: 'Jug. Held', gruppe: 'tenor', nachbarn: ['LyT', 'HT'] },
  HT: { name: 'Heldentenor', kurz: 'Heldentenor', gruppe: 'tenor', nachbarn: ['JHT'] },
  LyB: { name: 'Lyrischer Bariton / Kavalierbariton', kurz: 'Lyr. Bar.', gruppe: 'bariton', nachbarn: ['HB', 'BB'] },
  HB: { name: 'Helden- und Charakterbariton', kurz: 'Held.-Bar.', gruppe: 'bariton', nachbarn: ['LyB', 'Ba'] },
  Ba: { name: 'Seriöser Bass', kurz: 'Bass', gruppe: 'bass', nachbarn: ['HB', 'BB'] },
  BB: { name: 'Bassbuffo', kurz: 'Bassbuffo', gruppe: 'bass', nachbarn: ['Ba', 'LyB'] },
};
export const FACH_IDS = Object.keys(FAECHER);
export const WEIBLICH = new Set(['Sb', 'Kol', 'Lyr', 'JD', 'Dr', 'Mez']);

/** 1 = eigenes Fach, 0.75 = Nachbarfach, 0.35 = fachfremd */
export function passung(saengerFach, rollenFach) {
  if (saengerFach === rollenFach) return 1;
  if (FAECHER[saengerFach].nachbarn.includes(rollenFach)) return 0.75;
  return 0.35;
}

// ------------------------------------------------------------------ Klassen, Gewichte, Belastung

export const KLASSE_WERT = [0, 35, 48, 60, 72, 85];
export const KLASSE_GAGE = [0, 3, 5, 8, 12, 17];
export const GEWICHT = { H: 1, P: 0.6, N: 0.3 };
export const GEWICHT_NAME = { H: 'Hauptpartie', P: 'Partie', N: 'Nebenpartie' };
export const BELASTUNG = [0, 12, 22, 35];
export const BELASTUNG_NAME = ['', 'leicht', 'mittel', 'schwer'];

// ------------------------------------------------------------------ Anforderungen & Eigenschaften

// Anforderungen einer Rolle; passende Eigenschaft gibt +20 %.
export const ANFORDERUNGEN = {
  hoehe: { name: 'Höhe', zeichen: '↑', ohne: 'Ohne sichere Höhe steigt das Kiekser-Risiko.' },
  kol: { name: 'Koloratur', zeichen: '≈', ohne: 'Ohne Koloratur −10 %.' },
  tiefe: { name: 'Tiefe', zeichen: '↓', ohne: 'Ohne schwarze Tiefe −10 %.' },
  spiel: { name: 'Spiel', zeichen: '◐', ohne: 'Ohne Bühnenpräsenz kein Bonus.' },
  ausdauer: { name: 'Ausdauer', zeichen: '∞', ohne: 'Ohne Ausdauer kostet die Partie anderthalbmal so viel Stimme.' },
};

export const EIGENSCHAFTEN = {
  hoehe: { name: 'Sichere Höhe', art: 'anf', text: '+20 % in Rollen mit Höhe.' },
  kol: { name: 'Koloratur', art: 'anf', text: '+20 % in Rollen mit Koloratur.' },
  tiefe: { name: 'Schwarze Tiefe', art: 'anf', text: '+20 % in Rollen mit Tiefe.' },
  spiel: { name: 'Bühnentier', art: 'anf', text: '+20 % in Rollen mit viel Spiel.' },
  ausdauer: { name: 'Ausdauer', art: 'anf', text: 'Verbraucht 40 % weniger Stimme; +20 % in Ausdauerpartien.' },
  mozart: { name: 'Mozartstimme', art: 'stil', stil: 'mozart', text: '+20 % bei Mozart.' },
  verdi: { name: 'Verdistimme', art: 'stil', stil: 'verdi', text: '+20 % bei Verdi.' },
  verismo: { name: 'Verismo', art: 'stil', stil: 'verismo', text: '+20 % bei Puccini, Mascagni, Leoncavallo.' },
  wagner: { name: 'Wagnerstimme', art: 'stil', stil: 'wagner', text: '+20 % bei Wagner.' },
  strauss: { name: 'Strauss-Stimme', art: 'stil', stil: 'strauss', text: '+20 % bei Richard Strauss.' },
  belcanto: { name: 'Belcanto', art: 'stil', stil: 'belcanto', text: '+20 % bei Rossini, Donizetti, Bellini.' },
  deutsch: { name: 'Deutsches Fach', art: 'stil', stil: 'deutsch', text: '+20 % bei Weber, Beethoven, Lortzing, Humperdinck.' },
  franz: { name: 'Französisch', art: 'stil', stil: 'franz', text: '+20 % im französischen Repertoire.' },
  slaw: { name: 'Slawisch', art: 'stil', stil: 'slaw', text: '+20 % bei Tschaikowsky und Dvořák.' },
  operette: { name: 'Operettencharme', art: 'stil', stil: 'operette', text: '+20 % in der Operette.' },
  modern: { name: 'Moderne', art: 'stil', stil: 'modern', text: '+20 % bei Berg, Britten, Weill.' },
  liebling: { name: 'Publikumsliebling', art: 'spez', text: '+10 % in jeder Rolle; jeder Abend mit ihr/ihm bringt +2 Etat.' },
  nerven: { name: 'Nerven aus Stahl', art: 'spez', text: 'Müdigkeit erhöht das Kiekser-Risiko nicht.' },
  robust: { name: 'Robust', art: 'spez', text: 'Nie indisponiert; verbraucht 20 % weniger Stimme.' },
  talent: { name: 'Talent', art: 'spez', text: 'Lernt doppelt so schnell.' },
  diva: { name: 'Diva', art: 'spez', text: '+20 % in Hauptpartien – singt aber nichts anderes.' },
  lampenfieber: { name: 'Lampenfieber', art: 'neg', text: '−20 % bei Premieren.' },
  kraenklich: { name: 'Kränklich', art: 'neg', text: 'Sagt öfter ab.' },
};
export const ANF_TRAITS = ['hoehe', 'kol', 'tiefe', 'spiel', 'ausdauer'];
export const STIL_TRAITS = ['mozart', 'verdi', 'verismo', 'wagner', 'strauss', 'belcanto', 'deutsch', 'franz', 'slaw', 'operette', 'modern'];

export const STILE = {
  mozart: 'Mozart', verdi: 'Verdi', verismo: 'Verismo', wagner: 'Wagner', strauss: 'Richard Strauss',
  belcanto: 'Belcanto', deutsch: 'Deutsche Oper', franz: 'Französisch', slaw: 'Slawisch', operette: 'Operette', modern: 'Moderne',
};

// ------------------------------------------------------------------ Opern

// R(Rolle, Fach, Gewicht H/P/N, Belastung 1–3, Anforderungen)
const R = (name, fach, gewicht, belastung, anf = []) => ({ name, fach, gewicht, belastung, anf });
// O(id, Titel, Komponist, Jahr, Stil, Beliebtheit, Rollen, Extras)
const O = (id, titel, komponist, jahr, stil, pop, rollen, extra = {}) => ({ id, titel, komponist, jahr, stil, pop, rollen, ...extra });

export const OPERN = [
  O('zauberfloete', 'Die Zauberflöte', 'Mozart', 1791, 'mozart', 1.25, [
    R('Tamino', 'LyT', 'H', 2), R('Pamina', 'Lyr', 'H', 2), R('Papageno', 'LyB', 'H', 1, ['spiel']),
    R('Königin der Nacht', 'Kol', 'P', 2, ['hoehe', 'kol']), R('Sarastro', 'Ba', 'P', 2, ['tiefe']), R('Monostatos', 'Spt', 'N', 1, ['spiel']),
  ]),
  O('figaro', 'Le nozze di Figaro', 'Mozart', 1786, 'mozart', 1.15, [
    R('Figaro', 'LyB', 'H', 2, ['spiel']), R('Susanna', 'Sb', 'H', 2, ['spiel']), R('Contessa', 'Lyr', 'H', 2),
    R('Conte Almaviva', 'LyB', 'P', 2), R('Cherubino', 'Mez', 'P', 1), R('Bartolo', 'BB', 'N', 1, ['spiel']),
  ]),
  O('giovanni', 'Don Giovanni', 'Mozart', 1787, 'mozart', 1.15, [
    R('Don Giovanni', 'LyB', 'H', 2, ['spiel']), R('Leporello', 'BB', 'H', 2, ['spiel']), R('Donna Anna', 'JD', 'P', 3, ['hoehe', 'kol']),
    R('Donna Elvira', 'Lyr', 'P', 2), R('Don Ottavio', 'LyT', 'P', 1, ['kol']), R('Zerlina', 'Sb', 'N', 1),
  ]),
  O('cosi', 'Così fan tutte', 'Mozart', 1790, 'mozart', 1.0, [
    R('Fiordiligi', 'Lyr', 'H', 3, ['hoehe', 'kol']), R('Dorabella', 'Mez', 'H', 2), R('Ferrando', 'LyT', 'H', 2),
    R('Guglielmo', 'LyB', 'P', 2), R('Despina', 'Sb', 'P', 1, ['spiel']), R('Don Alfonso', 'BB', 'P', 1, ['spiel']),
  ]),
  O('entfuehrung', 'Die Entführung aus dem Serail', 'Mozart', 1782, 'mozart', 1.0, [
    R('Konstanze', 'Kol', 'H', 3, ['hoehe', 'kol']), R('Belmonte', 'LyT', 'H', 2, ['kol']), R('Osmin', 'BB', 'H', 2, ['tiefe', 'spiel']),
    R('Blonde', 'Sb', 'P', 1, ['hoehe']), R('Pedrillo', 'Spt', 'P', 1, ['spiel']),
  ]),
  O('traviata', 'La traviata', 'Verdi', 1853, 'verdi', 1.3, [
    R('Violetta Valéry', 'Lyr', 'H', 3, ['kol', 'hoehe']), R('Alfredo Germont', 'LyT', 'H', 2), R('Giorgio Germont', 'LyB', 'H', 2),
    R('Flora Bervoix', 'Mez', 'N', 1),
  ]),
  O('rigoletto', 'Rigoletto', 'Verdi', 1851, 'verdi', 1.15, [
    R('Rigoletto', 'HB', 'H', 3, ['spiel']), R('Gilda', 'Kol', 'H', 2, ['hoehe', 'kol']), R('Herzog von Mantua', 'LyT', 'H', 2, ['hoehe']),
    R('Sparafucile', 'Ba', 'P', 1, ['tiefe']), R('Maddalena', 'Mez', 'N', 1),
  ]),
  O('aida', 'Aida', 'Verdi', 1871, 'verdi', 1.15, [
    R('Aida', 'JD', 'H', 3, ['hoehe']), R('Radamès', 'JHT', 'H', 3, ['hoehe']), R('Amneris', 'Mez', 'H', 3),
    R('Amonasro', 'HB', 'P', 2), R('Ramfis', 'Ba', 'P', 1, ['tiefe']),
  ]),
  O('trovatore', 'Il trovatore', 'Verdi', 1853, 'verdi', 1.0, [
    R('Leonora', 'JD', 'H', 3, ['kol']), R('Manrico', 'JHT', 'H', 3, ['hoehe']), R('Azucena', 'Mez', 'H', 3),
    R('Conte di Luna', 'LyB', 'H', 2), R('Ferrando', 'Ba', 'N', 1),
  ]),
  O('otello', 'Otello', 'Verdi', 1887, 'verdi', 0.95, [
    R('Otello', 'HT', 'H', 3), R('Desdemona', 'JD', 'H', 2), R('Iago', 'HB', 'H', 3, ['spiel']),
    R('Cassio', 'LyT', 'P', 1), R('Emilia', 'Mez', 'N', 1),
  ]),
  O('falstaff', 'Falstaff', 'Verdi', 1893, 'verdi', 0.9, [
    R('Sir John Falstaff', 'HB', 'H', 3, ['spiel']), R('Ford', 'LyB', 'P', 2), R('Alice Ford', 'Lyr', 'P', 2, ['spiel']),
    R('Nannetta', 'Sb', 'P', 1, ['hoehe']), R('Fenton', 'LyT', 'P', 1), R('Mrs. Quickly', 'Mez', 'P', 1, ['tiefe', 'spiel']),
  ]),
  O('boheme', 'La Bohème', 'Puccini', 1896, 'verismo', 1.3, [
    R('Rodolfo', 'LyT', 'H', 2, ['hoehe']), R('Mimì', 'Lyr', 'H', 2), R('Marcello', 'LyB', 'H', 2),
    R('Musetta', 'Sb', 'P', 1, ['spiel', 'hoehe']), R('Colline', 'Ba', 'P', 1), R('Schaunard', 'LyB', 'N', 1),
  ]),
  O('tosca', 'Tosca', 'Puccini', 1900, 'verismo', 1.3, [
    R('Floria Tosca', 'JD', 'H', 3, ['spiel']), R('Mario Cavaradossi', 'JHT', 'H', 2, ['hoehe']), R('Scarpia', 'HB', 'H', 2, ['spiel']),
    R('Angelotti', 'Ba', 'N', 1), R('Spoletta', 'Spt', 'N', 1),
  ]),
  O('butterfly', 'Madama Butterfly', 'Puccini', 1904, 'verismo', 1.25, [
    R('Cio-Cio-San', 'JD', 'H', 3, ['ausdauer']), R('Pinkerton', 'LyT', 'H', 2, ['hoehe']), R('Sharpless', 'LyB', 'P', 2),
    R('Suzuki', 'Mez', 'P', 1), R('Goro', 'Spt', 'N', 1, ['spiel']),
  ]),
  O('turandot', 'Turandot', 'Puccini', 1926, 'verismo', 1.1, [
    R('Turandot', 'Dr', 'H', 3, ['hoehe']), R('Calaf', 'JHT', 'H', 3, ['hoehe']), R('Liù', 'Lyr', 'H', 2),
    R('Timur', 'Ba', 'P', 1), R('Ping', 'LyB', 'P', 1, ['spiel']),
  ]),
  O('cavalleria', 'Cavalleria rusticana', 'Mascagni', 1890, 'verismo', 1.0, [
    R('Santuzza', 'JD', 'H', 3), R('Turiddu', 'JHT', 'H', 2), R('Alfio', 'HB', 'P', 2),
    R('Lola', 'Mez', 'N', 1), R('Mamma Lucia', 'Mez', 'N', 1),
  ]),
  O('pagliacci', 'Pagliacci', 'Leoncavallo', 1892, 'verismo', 1.0, [
    R('Canio', 'JHT', 'H', 3, ['spiel']), R('Nedda', 'Lyr', 'H', 2), R('Tonio', 'HB', 'H', 2, ['hoehe']),
    R('Silvio', 'LyB', 'P', 1), R('Beppe', 'Spt', 'N', 1),
  ]),
  O('carmen', 'Carmen', 'Bizet', 1875, 'franz', 1.3, [
    R('Carmen', 'Mez', 'H', 3, ['spiel']), R('Don José', 'JHT', 'H', 3), R('Escamillo', 'HB', 'H', 2, ['spiel']),
    R('Micaëla', 'Lyr', 'P', 2, ['hoehe']), R('Frasquita', 'Sb', 'N', 1), R('Zuniga', 'Ba', 'N', 1),
  ]),
  O('hoffmann', 'Hoffmanns Erzählungen', 'Offenbach', 1881, 'franz', 1.0, [
    R('Hoffmann', 'LyT', 'H', 3, ['ausdauer']), R('Die Bösewichter', 'HB', 'H', 2, ['spiel']), R('Olympia', 'Kol', 'P', 2, ['hoehe', 'kol']),
    R('Antonia', 'Lyr', 'P', 2), R('Nicklausse', 'Mez', 'P', 2), R('Die Diener', 'Spt', 'N', 1, ['spiel']),
  ]),
  O('faust', 'Faust', 'Gounod', 1859, 'franz', 0.95, [
    R('Faust', 'LyT', 'H', 2, ['hoehe']), R('Marguerite', 'Lyr', 'H', 2, ['kol']), R('Méphistophélès', 'Ba', 'H', 2, ['spiel']),
    R('Valentin', 'LyB', 'P', 1), R('Siébel', 'Mez', 'N', 1),
  ]),
  O('werther', 'Werther', 'Massenet', 1892, 'franz', 0.95, [
    R('Werther', 'LyT', 'H', 2), R('Charlotte', 'Mez', 'H', 2), R('Albert', 'LyB', 'P', 1), R('Sophie', 'Sb', 'P', 1),
  ]),
  O('hollaender', 'Der fliegende Holländer', 'Wagner', 1843, 'wagner', 1.0, [
    R('Der Holländer', 'HB', 'H', 3), R('Senta', 'JD', 'H', 3, ['hoehe']), R('Erik', 'JHT', 'P', 2),
    R('Daland', 'Ba', 'P', 2), R('Der Steuermann', 'LyT', 'N', 1), R('Mary', 'Mez', 'N', 1),
  ]),
  O('lohengrin', 'Lohengrin', 'Wagner', 1850, 'wagner', 1.0, [
    R('Lohengrin', 'JHT', 'H', 3), R('Elsa von Brabant', 'JD', 'H', 3), R('Ortrud', 'Mez', 'H', 3, ['hoehe', 'spiel']),
    R('Friedrich von Telramund', 'HB', 'H', 3), R('König Heinrich', 'Ba', 'P', 2), R('Der Heerrufer', 'LyB', 'N', 1),
  ]),
  O('tristan', 'Tristan und Isolde', 'Wagner', 1865, 'wagner', 0.9, [
    R('Tristan', 'HT', 'H', 3, ['ausdauer']), R('Isolde', 'Dr', 'H', 3, ['ausdauer']), R('Brangäne', 'Mez', 'P', 2),
    R('Kurwenal', 'HB', 'P', 2), R('König Marke', 'Ba', 'P', 2, ['tiefe']),
  ]),
  O('rheingold', 'Das Rheingold', 'Wagner', 1869, 'wagner', 0.85, [
    R('Wotan', 'HB', 'H', 2), R('Loge', 'Spt', 'H', 2, ['spiel']), R('Alberich', 'HB', 'H', 2, ['spiel']),
    R('Fricka', 'Mez', 'P', 1), R('Mime', 'Spt', 'N', 1, ['spiel']), R('Fafner', 'Ba', 'N', 1, ['tiefe']),
  ]),
  O('walkuere', 'Die Walküre', 'Wagner', 1870, 'wagner', 1.0, [
    R('Siegmund', 'HT', 'H', 3), R('Sieglinde', 'JD', 'H', 2), R('Brünnhilde', 'Dr', 'H', 3, ['hoehe', 'ausdauer']),
    R('Wotan', 'HB', 'H', 3, ['ausdauer']), R('Fricka', 'Mez', 'P', 2), R('Hunding', 'Ba', 'P', 1, ['tiefe']),
  ]),
  O('siegfried', 'Siegfried', 'Wagner', 1876, 'wagner', 0.8, [
    R('Siegfried', 'HT', 'H', 3, ['ausdauer', 'hoehe']), R('Mime', 'Spt', 'H', 2, ['spiel']), R('Der Wanderer', 'HB', 'H', 2),
    R('Brünnhilde', 'Dr', 'P', 2, ['hoehe']), R('Alberich', 'HB', 'P', 1, ['spiel']), R('Erda', 'Mez', 'N', 1, ['tiefe']),
  ]),
  O('goetterdaemmerung', 'Götterdämmerung', 'Wagner', 1876, 'wagner', 0.85, [
    R('Siegfried', 'HT', 'H', 3, ['ausdauer', 'hoehe']), R('Brünnhilde', 'Dr', 'H', 3, ['ausdauer', 'hoehe']), R('Hagen', 'Ba', 'H', 3, ['tiefe']),
    R('Gunther', 'HB', 'P', 1), R('Gutrune', 'JD', 'P', 1), R('Waltraute', 'Mez', 'P', 1),
  ]),
  O('meistersinger', 'Die Meistersinger von Nürnberg', 'Wagner', 1868, 'wagner', 0.9, [
    R('Hans Sachs', 'HB', 'H', 3, ['ausdauer']), R('Walther von Stolzing', 'JHT', 'H', 3, ['hoehe']), R('Eva', 'JD', 'H', 2),
    R('Sixtus Beckmesser', 'LyB', 'P', 2, ['spiel']), R('David', 'Spt', 'P', 2), R('Veit Pogner', 'Ba', 'P', 1),
  ]),
  O('parsifal', 'Parsifal', 'Wagner', 1882, 'wagner', 0.85, [
    R('Parsifal', 'HT', 'H', 3), R('Kundry', 'Mez', 'H', 3, ['hoehe', 'spiel']), R('Gurnemanz', 'Ba', 'H', 3, ['ausdauer']),
    R('Amfortas', 'HB', 'P', 2), R('Klingsor', 'HB', 'N', 1, ['spiel']),
  ]),
  O('rosenkavalier', 'Der Rosenkavalier', 'R. Strauss', 1911, 'strauss', 1.05, [
    R('Feldmarschallin', 'JD', 'H', 2), R('Octavian', 'Mez', 'H', 2), R('Sophie', 'Kol', 'H', 2, ['hoehe']),
    R('Baron Ochs auf Lerchenau', 'BB', 'H', 3, ['tiefe', 'spiel']), R('Faninal', 'HB', 'P', 1), R('Ein Sänger', 'LyT', 'N', 1, ['hoehe']),
  ]),
  O('salome', 'Salome', 'R. Strauss', 1905, 'strauss', 0.95, [
    R('Salome', 'Dr', 'H', 3, ['hoehe', 'spiel']), R('Jochanaan', 'HB', 'H', 2), R('Herodes', 'Spt', 'H', 2, ['spiel']),
    R('Herodias', 'Mez', 'P', 1, ['spiel']), R('Narraboth', 'LyT', 'P', 1),
  ]),
  O('elektra', 'Elektra', 'R. Strauss', 1909, 'strauss', 0.8, [
    R('Elektra', 'Dr', 'H', 3, ['hoehe', 'ausdauer']), R('Chrysothemis', 'JD', 'H', 2, ['hoehe']), R('Klytämnestra', 'Mez', 'H', 2, ['spiel']),
    R('Orest', 'HB', 'P', 2), R('Aegisth', 'Spt', 'N', 1),
  ]),
  O('ariadne', 'Ariadne auf Naxos', 'R. Strauss', 1916, 'strauss', 0.9, [
    R('Ariadne', 'JD', 'H', 2), R('Zerbinetta', 'Kol', 'H', 3, ['hoehe', 'kol']), R('Der Komponist', 'Mez', 'H', 2),
    R('Bacchus', 'HT', 'P', 3, ['hoehe']), R('Harlekin', 'LyB', 'N', 1), R('Der Musiklehrer', 'LyB', 'N', 1),
  ]),
  O('fidelio', 'Fidelio', 'Beethoven', 1814, 'deutsch', 1.0, [
    R('Leonore', 'Dr', 'H', 3, ['hoehe']), R('Florestan', 'HT', 'H', 2, ['hoehe']), R('Rocco', 'Ba', 'P', 2),
    R('Don Pizarro', 'HB', 'P', 2), R('Marzelline', 'Sb', 'P', 1), R('Jaquino', 'Spt', 'N', 1),
  ]),
  O('freischuetz', 'Der Freischütz', 'Weber', 1821, 'deutsch', 1.0, [
    R('Max', 'JHT', 'H', 2), R('Agathe', 'JD', 'H', 2), R('Ännchen', 'Sb', 'H', 2, ['spiel']),
    R('Kaspar', 'Ba', 'H', 2, ['spiel']), R('Ottokar', 'LyB', 'N', 1), R('Ein Eremit', 'Ba', 'N', 1),
  ]),
  O('haensel', 'Hänsel und Gretel', 'Humperdinck', 1893, 'deutsch', 1.2, [
    R('Hänsel', 'Mez', 'H', 2), R('Gretel', 'Sb', 'H', 2), R('Die Knusperhexe', 'Mez', 'P', 2, ['spiel']),
    R('Peter, Besenbinder', 'LyB', 'P', 1), R('Gertrud', 'Mez', 'N', 1), R('Sandmännchen', 'Sb', 'N', 1),
  ]),
  O('zar', 'Zar und Zimmermann', 'Lortzing', 1837, 'deutsch', 0.85, [
    R('Peter I.', 'LyB', 'H', 2), R('Peter Iwanow', 'Spt', 'H', 2, ['spiel']), R('Van Bett', 'BB', 'H', 2, ['spiel']),
    R('Marie', 'Sb', 'H', 2), R('Marquis von Chateauneuf', 'LyT', 'P', 1, ['hoehe']),
  ], { leipzig: true }),
  O('wildschuetz', 'Der Wildschütz', 'Lortzing', 1842, 'deutsch', 0.8, [
    R('Baculus', 'BB', 'H', 2, ['spiel']), R('Graf von Eberbach', 'LyB', 'H', 2), R('Baronin Freimann', 'Lyr', 'H', 2, ['spiel']),
    R('Baron Kronthal', 'LyT', 'H', 2), R('Gräfin', 'Mez', 'P', 1, ['spiel']), R('Gretchen', 'Sb', 'P', 1),
  ], { leipzig: true }),
  O('barbiere', 'Il barbiere di Siviglia', 'Rossini', 1816, 'belcanto', 1.15, [
    R('Figaro', 'LyB', 'H', 2, ['spiel']), R('Rosina', 'Mez', 'H', 2, ['kol']), R('Graf Almaviva', 'LyT', 'H', 2, ['kol', 'hoehe']),
    R('Dottor Bartolo', 'BB', 'H', 2, ['spiel']), R('Don Basilio', 'Ba', 'P', 1, ['tiefe']),
  ]),
  O('elisir', 'L’elisir d’amore', 'Donizetti', 1832, 'belcanto', 1.05, [
    R('Nemorino', 'LyT', 'H', 2), R('Adina', 'Sb', 'H', 2, ['kol']), R('Dulcamara', 'BB', 'H', 2, ['spiel']),
    R('Belcore', 'LyB', 'P', 1, ['spiel']), R('Giannetta', 'Sb', 'N', 1),
  ]),
  O('lucia', 'Lucia di Lammermoor', 'Donizetti', 1835, 'belcanto', 1.0, [
    R('Lucia', 'Kol', 'H', 3, ['hoehe', 'kol']), R('Edgardo', 'LyT', 'H', 2, ['hoehe']), R('Enrico', 'LyB', 'H', 2),
    R('Raimondo', 'Ba', 'P', 1), R('Arturo', 'LyT', 'N', 1),
  ]),
  O('norma', 'Norma', 'Bellini', 1831, 'belcanto', 0.9, [
    R('Norma', 'Dr', 'H', 3, ['kol', 'ausdauer']), R('Adalgisa', 'Mez', 'H', 2), R('Pollione', 'JHT', 'H', 2, ['hoehe']),
    R('Oroveso', 'Ba', 'P', 1, ['tiefe']),
  ]),
  O('onegin', 'Eugen Onegin', 'Tschaikowsky', 1879, 'slaw', 1.0, [
    R('Eugen Onegin', 'LyB', 'H', 2), R('Tatjana', 'Lyr', 'H', 3), R('Lenski', 'LyT', 'H', 2),
    R('Olga', 'Mez', 'P', 1), R('Fürst Gremin', 'Ba', 'P', 1, ['tiefe']), R('Monsieur Triquet', 'Spt', 'N', 1, ['spiel']),
  ]),
  O('rusalka', 'Rusalka', 'Dvořák', 1901, 'slaw', 0.95, [
    R('Rusalka', 'JD', 'H', 3), R('Der Prinz', 'JHT', 'H', 2, ['hoehe']), R('Ježibaba', 'Mez', 'P', 2, ['spiel']),
    R('Der Wassermann', 'Ba', 'P', 2), R('Die fremde Fürstin', 'Dr', 'N', 1),
  ]),
  O('fledermaus', 'Die Fledermaus', 'J. Strauss', 1874, 'operette', 1.2, [
    R('Rosalinde', 'Lyr', 'H', 2, ['hoehe']), R('Gabriel von Eisenstein', 'LyT', 'H', 2, ['spiel']), R('Adele', 'Sb', 'H', 2, ['kol', 'spiel']),
    R('Prinz Orlofsky', 'Mez', 'P', 1, ['spiel']), R('Dr. Falke', 'LyB', 'P', 1), R('Alfred', 'LyT', 'N', 1, ['hoehe']),
  ]),
  O('wozzeck', 'Wozzeck', 'Berg', 1925, 'modern', 0.75, [
    R('Wozzeck', 'HB', 'H', 3, ['spiel']), R('Marie', 'JD', 'H', 3), R('Der Hauptmann', 'Spt', 'P', 2, ['spiel', 'hoehe']),
    R('Der Doktor', 'BB', 'P', 2, ['spiel']), R('Der Tambourmajor', 'HT', 'N', 1), R('Andres', 'LyT', 'N', 1),
  ]),
  O('grimes', 'Peter Grimes', 'Britten', 1945, 'modern', 0.8, [
    R('Peter Grimes', 'JHT', 'H', 3), R('Ellen Orford', 'JD', 'H', 2), R('Captain Balstrode', 'HB', 'P', 2),
    R('Auntie', 'Mez', 'N', 1), R('Swallow', 'Ba', 'N', 1),
  ]),
  O('mahagonny', 'Aufstieg und Fall der Stadt Mahagonny', 'Weill', 1930, 'modern', 0.8, [
    R('Jim Mahoney', 'JHT', 'H', 3), R('Jenny Hill', 'Lyr', 'H', 2, ['spiel']), R('Leokadja Begbick', 'Mez', 'H', 2, ['spiel']),
    R('Fatty', 'Spt', 'P', 1), R('Dreieinigkeitsmoses', 'HB', 'P', 1),
  ], { leipzig: true, kurz: 'Mahagonny' }),
];
export const OPER = Object.fromEntries(OPERN.map((o) => [o.id, o]));

// ------------------------------------------------------------------ Häuser

export const HAEUSER = [
  {
    id: 'leipzig', name: 'Oper Leipzig', stadt: 'Leipzig', wochen: 8, anspruch: -2, start: 6,
    text: 'Dein Heimathaus. Ein Repertoire quer durch alle Epochen – und zum Saisonende die Wagner-Festtage in Wagners Geburtsstadt.',
    fest: { name: 'Wagner-Festtage', pool: ['hollaender', 'lohengrin', 'walkuere', 'tristan', 'meistersinger', 'parsifal'] },
  },
  {
    id: 'dresden', name: 'Semperoper', stadt: 'Dresden', wochen: 8, anspruch: -1, start: 6, frei: 'leipzig',
    text: 'Strauss’ Uraufführungshaus. Anspruchsvolleres Publikum, viel Strauss und Wagner. Finale: die Strauss-Tage.',
    fest: { name: 'Strauss-Tage', pool: ['rosenkavalier', 'salome', 'elektra', 'ariadne'] },
    gewichte: { strauss: 2.5, wagner: 1.6 },
  },
  {
    id: 'wien', name: 'Wiener Staatsoper', stadt: 'Wien', wochen: 8, anspruch: 1, start: 6, frei: 'dresden',
    text: 'Das strengste Publikum der Welt. Mozart, Strauss, Operette – und am Ende die Festwochen.',
    fest: { name: 'Wiener Festwochen', pool: ['fledermaus', 'figaro', 'rosenkavalier', 'zauberfloete', 'giovanni'] },
    gewichte: { mozart: 1.8, operette: 2, strauss: 1.6 },
  },
  {
    id: 'bayreuth', name: 'Bayreuther Festspiele', stadt: 'Bayreuth', wochen: 5, anspruch: 9, start: 6, frei: 'wien',
    text: 'Nur Wagner. Fünf Wochen Grüner Hügel, dann der ganze Ring an vier Abenden.',
    nurStil: 'wagner',
    fest: { name: 'Der Ring des Nibelungen', pool: ['rheingold', 'walkuere', 'siegfried', 'goetterdaemmerung'], alle: true },
  },
];
export const HAUS = Object.fromEntries(HAEUSER.map((h) => [h.id, h]));

// ------------------------------------------------------------------ Namen

export const VORNAMEN_W = ['Anna', 'Marie', 'Katharina', 'Elena', 'Sophie', 'Ji-Yeon', 'Hye-Jin', 'Magdalena', 'Agnieszka', 'Chiara',
  'Ingrid', 'Solveig', 'Tamar', 'Nino', 'Olga', 'Daria', 'Ewa', 'Johanna', 'Theresa', 'Clara', 'Mirjam', 'Asmik', 'Lucía',
  'Valentina', 'Hanna', 'Kristīne', 'Aigul', 'Rebecca', 'Leonie', 'Franziska', 'Yuki', 'Camille', 'Margarethe', 'Irina', 'Paula'];
export const VORNAMEN_M = ['Matthias', 'Tobias', 'Florian', 'Kai', 'Jan', 'Hyun-Woo', 'Min-Jun', 'Luca', 'Stefano', 'Pavel', 'Tomasz',
  'Lars', 'Björn', 'Giorgi', 'Levan', 'Dmitri', 'Rafael', 'Andrés', 'Michael', 'David', 'Nikolai', 'Sebastian', 'Benjamin',
  'Konstantin', 'Ólafur', 'Ricardo', 'Thomas', 'Felix', 'Johannes', 'Daniel', 'Aleksander', 'Arturo', 'Wolfgang', 'Emil'];
export const NACHNAMEN = ['Albrecht', 'Brandt', 'Vogel', 'Hartmann', 'Kessler', 'Winter', 'Sommer', 'Lindner', 'Krüger', 'Petrenko',
  'Kowalski', 'Novák', 'Kim', 'Park', 'Lee', 'Rossi', 'Bianchi', 'Marchetti', 'Lindqvist', 'Nilsson', 'Andersen', 'Beridze',
  'Kapanadze', 'Morales', 'Ortega', 'Fischer', 'Weber', 'Schulze', 'Hoffmann', 'Richter', 'Neumann', 'Zimmermann', 'Bergmann',
  'Ozols', 'Halvorsen', 'Moreau', 'Laurent', 'Sato', 'Tanaka', 'Horváth', 'Popescu', 'Jensen', 'Hofer', 'Haas', 'Engel'];
