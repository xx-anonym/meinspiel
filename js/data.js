// Da capo! – Kataloge: Werke, Komponisten, Programme, Stars, Kritiker, Häuser.
//
// Die Werke stammen aus dem OpernLog-Katalog. „Ruhm“ ist die Publikumszahl,
// die ein Werk mitbringt (2–11, wie der Rang einer Spielkarte): Zauberflöte
// und Traviata füllen jedes Haus, Marnie eher nicht.

export const SCHULEN = {
  it: { name: 'Italienisch', kurz: 'ITA', farbe: '#2f8a4e' },
  de: { name: 'Deutsch', kurz: 'DEU', farbe: '#a3283c' },
  fr: { name: 'Französisch', kurz: 'FRA', farbe: '#2f5fa8' },
  os: { name: 'Osteuropäisch', kurz: 'OST', farbe: '#b8801f' },
  en: { name: 'Englisch', kurz: 'ENG', farbe: '#7246a8' },
};
export const SCHUL_IDS = Object.keys(SCHULEN);

export const EPOCHEN = [
  { name: 'Barock', roem: 'I', bis: 1759 },
  { name: 'Klassik', roem: 'II', bis: 1809 },
  { name: 'Frühromantik', roem: 'III', bis: 1849 },
  { name: 'Hochromantik', roem: 'IV', bis: 1889 },
  { name: 'Fin de Siècle', roem: 'V', bis: 1919 },
  { name: 'Moderne', roem: 'VI', bis: 9999 },
];
export const epocheVon = (jahr) => EPOCHEN.findIndex((e) => jahr <= e.bis);

export const KOMPONISTEN = {
  mozart: ['Mozart', 'Wolfgang Amadeus Mozart'],
  verdi: ['Verdi', 'Giuseppe Verdi'],
  wagner: ['Wagner', 'Richard Wagner'],
  puccini: ['Puccini', 'Giacomo Puccini'],
  rstrauss: ['R. Strauss', 'Richard Strauss'],
  bizet: ['Bizet', 'Georges Bizet'],
  weber: ['Weber', 'Carl Maria von Weber'],
  humperdinck: ['Humperdinck', 'Engelbert Humperdinck'],
  beethoven: ['Beethoven', 'Ludwig van Beethoven'],
  haendel: ['Händel', 'Georg Friedrich Händel'],
  rossini: ['Rossini', 'Gioachino Rossini'],
  donizetti: ['Donizetti', 'Gaetano Donizetti'],
  bellini: ['Bellini', 'Vincenzo Bellini'],
  janacek: ['Janáček', 'Leoš Janáček'],
  berg: ['Berg', 'Alban Berg'],
  britten: ['Britten', 'Benjamin Britten'],
  bartok: ['Bartók', 'Béla Bartók'],
  tschaikowsky: ['Tschaikowsky', 'Pjotr Iljitsch Tschaikowsky'],
  mussorgsky: ['Mussorgsky', 'Modest Mussorgsky'],
  offenbach: ['Offenbach', 'Jacques Offenbach'],
  gounod: ['Gounod', 'Charles Gounod'],
  saintsaens: ['Saint-Saëns', 'Camille Saint-Saëns'],
  dvorak: ['Dvořák', 'Antonín Dvořák'],
  smetana: ['Smetana', 'Bedřich Smetana'],
  schostakowitsch: ['Schostakowitsch', 'Dmitri Schostakowitsch'],
  debussy: ['Debussy', 'Claude Debussy'],
  massenet: ['Massenet', 'Jules Massenet'],
  korngold: ['Korngold', 'Erich Wolfgang Korngold'],
  bazimmermann: ['Zimmermann', 'Bernd Alois Zimmermann'],
  henze: ['Henze', 'Hans Werner Henze'],
  flotow: ['Flotow', 'Friedrich von Flotow'],
  lortzing: ['Lortzing', 'Albert Lortzing'],
  lehar: ['Lehár', 'Franz Lehár'],
  jstrauss: ['J. Strauss', 'Johann Strauss (Sohn)'],
  kalman: ['Kálmán', 'Emmerich Kálmán'],
  gluck: ['Gluck', 'Christoph Willibald Gluck'],
  monteverdi: ['Monteverdi', 'Claudio Monteverdi'],
  glass: ['Glass', 'Philip Glass'],
  adams: ['Adams', 'John Adams'],
  benjamin: ['Benjamin', 'George Benjamin'],
  muhly: ['Muhly', 'Nico Muhly'],
  purcell: ['Purcell', 'Henry Purcell'],
  berlioz: ['Berlioz', 'Hector Berlioz'],
  boito: ['Boito', 'Arrigo Boito'],
  borodin: ['Borodin', 'Alexander Borodin'],
  mascagni: ['Mascagni', 'Pietro Mascagni'],
  leoncavallo: ['Leoncavallo', 'Ruggero Leoncavallo'],
  giordano: ['Giordano', 'Umberto Giordano'],
  cilea: ['Cilea', 'Francesco Cilea'],
  prokofjew: ['Prokofjew', 'Sergej Prokofjew'],
  weill: ['Weill', 'Kurt Weill'],
  gershwin: ['Gershwin', 'George Gershwin'],
  strawinsky: ['Strawinsky', 'Igor Strawinsky'],
  poulenc: ['Poulenc', 'Francis Poulenc'],
  ponchielli: ['Ponchielli', 'Amilcare Ponchielli'],
};

// id, Titel, Komponist, Jahr, Schule, Ruhm, Akte, heiter, Kurztitel
const W = (id, t, c, y, s, r, a, h = false, k = null) => ({ id, t, c, y, s, r, a, h, k });

export const WERKE = [
  W('zauberflote', 'Die Zauberflöte', 'mozart', 1791, 'de', 11, 2, true),
  W('don-giovanni', 'Don Giovanni', 'mozart', 1787, 'it', 10, 2, true),
  W('nozze-di-figaro', 'Le nozze di Figaro', 'mozart', 1786, 'it', 10, 4, true),
  W('cosi-fan-tutte', 'Così fan tutte', 'mozart', 1790, 'it', 9, 2, true),
  W('idomeneo', 'Idomeneo', 'mozart', 1781, 'it', 6, 3),
  W('entfuehrung', 'Die Entführung aus dem Serail', 'mozart', 1782, 'de', 8, 3, true, 'Die Entführung'),
  W('clemenza-di-tito', 'La clemenza di Tito', 'mozart', 1791, 'it', 6, 2),

  W('la-traviata', 'La traviata', 'verdi', 1853, 'it', 11, 3),
  W('aida', 'Aida', 'verdi', 1871, 'it', 10, 4),
  W('rigoletto', 'Rigoletto', 'verdi', 1851, 'it', 10, 3),
  W('il-trovatore', 'Il trovatore', 'verdi', 1853, 'it', 9, 4),
  W('nabucco', 'Nabucco', 'verdi', 1842, 'it', 9, 4),
  W('otello', 'Otello', 'verdi', 1887, 'it', 8, 4),
  W('falstaff', 'Falstaff', 'verdi', 1893, 'it', 8, 3, true),
  W('don-carlos', 'Don Carlos', 'verdi', 1867, 'it', 8, 5),
  W('macbeth', 'Macbeth', 'verdi', 1847, 'it', 7, 4),
  W('forza-del-destino', 'La forza del destino', 'verdi', 1862, 'it', 7, 4),
  W('un-ballo-in-maschera', 'Un ballo in maschera', 'verdi', 1859, 'it', 8, 3),
  W('simon-boccanegra', 'Simon Boccanegra', 'verdi', 1857, 'it', 6, 3),

  W('ring-rheingold', 'Das Rheingold', 'wagner', 1854, 'de', 7, 1),
  W('ring-walkuere', 'Die Walküre', 'wagner', 1856, 'de', 8, 3),
  W('ring-siegfried', 'Siegfried', 'wagner', 1871, 'de', 6, 3),
  W('ring-goetterdaemmerung', 'Götterdämmerung', 'wagner', 1874, 'de', 7, 3, false, 'Götter­dämmerung'),
  W('tristan', 'Tristan und Isolde', 'wagner', 1859, 'de', 8, 3),
  W('meistersinger', 'Die Meistersinger von Nürnberg', 'wagner', 1867, 'de', 7, 3, true, 'Die Meister­singer'),
  W('parsifal', 'Parsifal', 'wagner', 1882, 'de', 7, 3),
  W('lohengrin', 'Lohengrin', 'wagner', 1848, 'de', 8, 3),
  W('tannhaeuser', 'Tannhäuser', 'wagner', 1845, 'de', 8, 3),
  W('fliegender-hollaender', 'Der fliegende Holländer', 'wagner', 1843, 'de', 9, 3),

  W('la-boheme', 'La Bohème', 'puccini', 1896, 'it', 11, 4),
  W('tosca', 'Tosca', 'puccini', 1900, 'it', 11, 3),
  W('madama-butterfly', 'Madama Butterfly', 'puccini', 1904, 'it', 11, 2),
  W('turandot', 'Turandot', 'puccini', 1924, 'it', 10, 3),
  W('gianni-schicchi', 'Gianni Schicchi', 'puccini', 1918, 'it', 8, 1, true),
  W('manon-lescaut', 'Manon Lescaut', 'puccini', 1893, 'it', 7, 4),
  W('fanciulla-del-west', 'La fanciulla del West', 'puccini', 1910, 'it', 6, 3),
  W('suor-angelica', 'Suor Angelica', 'puccini', 1918, 'it', 5, 1),
  W('il-tabarro', 'Il tabarro', 'puccini', 1918, 'it', 5, 1),

  W('rosenkavalier', 'Der Rosenkavalier', 'rstrauss', 1911, 'de', 10, 3, true, 'Der Rosen­kavalier'),
  W('salome', 'Salome', 'rstrauss', 1905, 'de', 9, 1),
  W('elektra', 'Elektra', 'rstrauss', 1909, 'de', 8, 1),
  W('ariadne-naxos', 'Ariadne auf Naxos', 'rstrauss', 1912, 'de', 8, 2),
  W('frau-ohne-schatten', 'Die Frau ohne Schatten', 'rstrauss', 1919, 'de', 6, 3),
  W('capriccio', 'Capriccio', 'rstrauss', 1942, 'de', 6, 1, true),
  W('arabella', 'Arabella', 'rstrauss', 1933, 'de', 7, 3, true),
  W('daphne', 'Daphne', 'rstrauss', 1938, 'de', 5, 1),
  W('intermezzo', 'Intermezzo', 'rstrauss', 1924, 'de', 4, 2, true),

  W('carmen', 'Carmen', 'bizet', 1875, 'fr', 11, 4),
  W('perlenfischer', 'Les pêcheurs de perles', 'bizet', 1863, 'fr', 7, 3, false, 'Die Perlen­fischer'),
  W('freischuetz', 'Der Freischütz', 'weber', 1821, 'de', 9, 3),
  W('oberon', 'Oberon', 'weber', 1826, 'en', 5, 3),
  W('haensel-gretel', 'Hänsel und Gretel', 'humperdinck', 1893, 'de', 10, 3, true),
  W('fidelio', 'Fidelio', 'beethoven', 1805, 'de', 9, 2),
  W('giulio-cesare', 'Giulio Cesare in Egitto', 'haendel', 1724, 'it', 8, 3, false, 'Giulio Cesare'),
  W('rinaldo', 'Rinaldo', 'haendel', 1711, 'it', 6, 3),
  W('alcina', 'Alcina', 'haendel', 1735, 'it', 7, 3),
  W('barbiere', 'Il barbiere di Siviglia', 'rossini', 1816, 'it', 10, 2, true),
  W('cenerentola', 'La Cenerentola', 'rossini', 1817, 'it', 8, 2, true),
  W('guglielmo-tell', 'Guillaume Tell', 'rossini', 1829, 'fr', 6, 4),
  W('lucia', 'Lucia di Lammermoor', 'donizetti', 1835, 'it', 9, 3),
  W('elisir', 'L’elisir d’amore', 'donizetti', 1832, 'it', 9, 2, true),
  W('don-pasquale', 'Don Pasquale', 'donizetti', 1843, 'it', 7, 3, true),
  W('norma', 'Norma', 'bellini', 1831, 'it', 8, 2),
  W('i-puritani', 'I puritani', 'bellini', 1835, 'it', 6, 3),
  W('la-sonnambula', 'La sonnambula', 'bellini', 1831, 'it', 6, 2),
  W('jenufa', 'Jenůfa', 'janacek', 1904, 'os', 7, 3),
  W('katja-kabanova', 'Katja Kabanová', 'janacek', 1921, 'os', 6, 3),
  W('schlaue-fuechslein', 'Das schlaue Füchslein', 'janacek', 1924, 'os', 6, 3),
  W('wozzeck', 'Wozzeck', 'berg', 1922, 'de', 7, 3),
  W('lulu', 'Lulu', 'berg', 1935, 'de', 6, 3),
  W('peter-grimes', 'Peter Grimes', 'britten', 1945, 'en', 7, 3),
  W('turn-of-screw', 'The Turn of the Screw', 'britten', 1954, 'en', 6, 2),
  W('midsummer-nights-dream', 'A Midsummer Night’s Dream', 'britten', 1960, 'en', 6, 3, true, 'A Midsummer Night’s Dream'),
  W('blaubart', 'Herzog Blaubarts Burg', 'bartok', 1911, 'os', 6, 1),
  W('eugen-onegin', 'Eugen Onegin', 'tschaikowsky', 1879, 'os', 9, 3),
  W('pique-dame', 'Pique Dame', 'tschaikowsky', 1890, 'os', 7, 3),
  W('boris-godunow', 'Boris Godunow', 'mussorgsky', 1874, 'os', 7, 4),
  W('hoffmanns-erzaehlungen', 'Hoffmanns Erzählungen', 'offenbach', 1881, 'fr', 9, 5, false, 'Hoffmanns Erzäh­lungen'),
  W('faust', 'Faust', 'gounod', 1859, 'fr', 8, 5),
  W('samson-dalila', 'Samson et Dalila', 'saintsaens', 1877, 'fr', 7, 3),
  W('rusalka', 'Rusalka', 'dvorak', 1901, 'os', 8, 3),
  W('verkaufte-braut', 'Die verkaufte Braut', 'smetana', 1866, 'os', 7, 3, true),
  W('lady-macbeth', 'Lady Macbeth von Mzensk', 'schostakowitsch', 1934, 'os', 6, 4),
  W('pelleas', 'Pelléas et Mélisande', 'debussy', 1902, 'fr', 6, 5),
  W('werther', 'Werther', 'massenet', 1892, 'fr', 8, 4),
  W('manon', 'Manon', 'massenet', 1884, 'fr', 7, 5),
  W('tote-stadt', 'Die tote Stadt', 'korngold', 1920, 'de', 6, 3),
  W('soldaten', 'Die Soldaten', 'bazimmermann', 1965, 'de', 4, 4),
  W('bassariden', 'Die Bassariden', 'henze', 1966, 'de', 4, 1),
  W('martha', 'Martha', 'flotow', 1847, 'de', 6, 4, true),
  W('zar-zimmermann', 'Zar und Zimmermann', 'lortzing', 1837, 'de', 7, 3, true),
  W('wildschuetz', 'Der Wildschütz', 'lortzing', 1842, 'de', 6, 3, true),
  W('undine', 'Undine', 'lortzing', 1845, 'de', 5, 4),
  W('lustige-witwe', 'Die lustige Witwe', 'lehar', 1905, 'de', 9, 3, true),
  W('land-des-laechelns', 'Das Land des Lächelns', 'lehar', 1929, 'de', 7, 3),
  W('fledermaus', 'Die Fledermaus', 'jstrauss', 1874, 'de', 10, 3, true),
  W('csardasfuerstin', 'Die Csárdásfürstin', 'kalman', 1915, 'de', 7, 3, true, 'Die Csárdás­fürstin'),
  W('orfeo-euridice', 'Orfeo ed Euridice', 'gluck', 1762, 'it', 7, 3),
  W('iphigenie-tauride', 'Iphigénie en Tauride', 'gluck', 1779, 'fr', 5, 4),
  W('orfeo', 'L’Orfeo', 'monteverdi', 1607, 'it', 6, 5),
  W('poppea', 'L’incoronazione di Poppea', 'monteverdi', 1643, 'it', 6, 3, false, 'Poppea'),
  W('einstein-on-the-beach', 'Einstein on the Beach', 'glass', 1976, 'en', 5, 4),
  W('satyagraha', 'Satyagraha', 'glass', 1980, 'en', 4, 3),
  W('akhnaten', 'Akhnaten', 'glass', 1984, 'en', 5, 3),
  W('nixon-in-china', 'Nixon in China', 'adams', 1987, 'en', 6, 3),
  W('written-on-skin', 'Written on Skin', 'benjamin', 2012, 'en', 5, 3),
  W('marnie', 'Marnie', 'muhly', 2017, 'en', 4, 2),
  W('dido-aeneas', 'Dido and Aeneas', 'purcell', 1689, 'en', 7, 3),
  W('les-troyens', 'Les Troyens', 'berlioz', 1858, 'fr', 6, 5),
  W('mefistofele', 'Mefistofele', 'boito', 1868, 'it', 6, 4),
  W('fuerst-igor', 'Fürst Igor', 'borodin', 1890, 'os', 6, 4),
  W('cavalleria-rusticana', 'Cavalleria rusticana', 'mascagni', 1890, 'it', 8, 1),
  W('pagliacci', 'Pagliacci', 'leoncavallo', 1892, 'it', 8, 2),
  W('andrea-chenier', 'Andrea Chénier', 'giordano', 1896, 'it', 6, 4),
  W('adriana-lecouvreur', 'Adriana Lecouvreur', 'cilea', 1902, 'it', 5, 4),
  W('liebe-drei-orangen', 'Die Liebe zu den drei Orangen', 'prokofjew', 1921, 'os', 6, 4, true, 'Die Liebe zu den drei Orangen'),
  W('mahagonny', 'Aufstieg und Fall der Stadt Mahagonny', 'weill', 1930, 'de', 6, 3, false, 'Mahagonny'),
  W('porgy-bess', 'Porgy and Bess', 'gershwin', 1935, 'en', 7, 3),
  W('rake-progress', 'The Rake’s Progress', 'strawinsky', 1951, 'en', 6, 3),
  W('dialogues-carmelites', 'Dialogues des Carmélites', 'poulenc', 1957, 'fr', 6, 3, false, 'Dialogues des Carmélites'),
  W('la-gioconda', 'La Gioconda', 'ponchielli', 1876, 'it', 6, 4),
];
export const WERK = Object.fromEntries(WERKE.map((w) => [w.id, w]));

// Programme – die „Pokerhände“ eines Opernabends.
// p/b: Grundwerte Publikum/Begeisterung; sp/sb: Zuwachs je Stufe.
export const PROGRAMME = {
  solo: { name: 'Solo-Arie', p: 5, b: 1, sp: 10, sb: 1, regel: 'Kein Muster – das Werk mit dem größten Ruhm zählt.' },
  doppel: { name: 'Doppelabend', p: 10, b: 2, sp: 15, sb: 1, regel: 'Zwei Werke desselben Komponisten.' },
  zweiDoppel: { name: 'Zwei Doppelabende', p: 20, b: 2, sp: 20, sb: 1, regel: 'Zweimal je zwei Werke eines Komponisten.' },
  national: { name: 'Nationalabend', p: 30, b: 3, sp: 15, sb: 2, regel: 'Fünf Werke derselben Schule.' },
  kompAbend: { name: 'Komponistenabend', p: 40, b: 3, sp: 20, sb: 2, regel: 'Drei Werke desselben Komponisten.' },
  zeitreise: { name: 'Zeitreise', p: 35, b: 4, sp: 30, sb: 3, regel: 'Fünf Werke aus fünf verschiedenen Jahrzehnten, alle innerhalb von sieben Jahrzehnten (etwa 1840er bis 1900er).' },
  festspiel: { name: 'Festspielwoche', p: 40, b: 4, sp: 25, sb: 2, regel: 'Drei Werke eines Komponisten und zwei eines anderen.' },
  werkschau: { name: 'Werkschau', p: 60, b: 7, sp: 30, sb: 3, regel: 'Vier Werke desselben Komponisten.' },
  grosseZeit: { name: 'Große Zeitreise', p: 100, b: 8, sp: 40, sb: 4, regel: 'Eine Zeitreise, ganz in einer Schule.' },
  gesamtwerk: { name: 'Gesamtwerk', p: 120, b: 12, sp: 35, sb: 3, regel: 'Fünf Werke desselben Komponisten.' },
};
export const PROGRAMM_IDS = Object.keys(PROGRAMME);

// Sternstunden: berühmte Paarungen und Zyklen. Stehen alle Werke im
// Programm, wird die Begeisterung vervielfacht.
export const STERNSTUNDEN = [
  { id: 'ring', name: 'Der Ring des Nibelungen', x: 5, werke: ['ring-rheingold', 'ring-walkuere', 'ring-siegfried', 'ring-goetterdaemmerung'], hinweis: 'Vier Abende, ein Ring.' },
  { id: 'trilogia', name: 'Trilogia popolare', x: 3, werke: ['rigoletto', 'il-trovatore', 'la-traviata'], hinweis: 'Verdis drei Volltreffer der frühen 1850er.' },
  { id: 'daponte', name: 'Da-Ponte-Trilogie', x: 2, werke: ['nozze-di-figaro', 'don-giovanni', 'cosi-fan-tutte'], hinweis: 'Mozart und sein Librettist, dreimal.' },
  { id: 'trittico', name: 'Il trittico', x: 3, werke: ['il-tabarro', 'suor-angelica', 'gianni-schicchi'], hinweis: 'Puccinis Dreiteiler an einem Abend.' },
  { id: 'cavpag', name: 'Cav/Pag', x: 3, werke: ['cavalleria-rusticana', 'pagliacci'], hinweis: 'Das berühmteste Doppel des Verismo.' },
  { id: 'figaro', name: 'Figaro hier, Figaro da', x: 2, werke: ['barbiere', 'nozze-di-figaro'], hinweis: 'Beaumarchais’ Barbier – erst ledig, dann verheiratet.' },
  { id: 'manon', name: 'Zweimal Manon', x: 3, werke: ['manon', 'manon-lescaut'], hinweis: 'Dieselbe Heldin, zwei Komponisten.' },
  { id: 'orpheus', name: 'Orpheus steigt zweimal hinab', x: 3, werke: ['orfeo', 'orfeo-euridice'], hinweis: 'Derselbe Sänger, 155 Jahre auseinander.' },
  { id: 'faust', name: 'Zwei Seelen, ach!', x: 2.5, werke: ['faust', 'mefistofele'], hinweis: 'Goethes Teufelspakt – französisch und italienisch.' },
  { id: 'shakespeare', name: 'Shakespeare-Abend', x: 2.5, werke: ['otello', 'falstaff', 'macbeth', 'midsummer-nights-dream'], min: 3, hinweis: 'Drei Werke nach dem Barden aus Stratford.' },
  { id: 'glass', name: 'Porträt-Trilogie', x: 4, werke: ['einstein-on-the-beach', 'satyagraha', 'akhnaten'], hinweis: 'Physiker, Pazifist, Pharao.' },
  { id: 'leipzig', name: 'Uraufgeführt in Leipzig', x: 2.5, werke: ['zar-zimmermann', 'wildschuetz', 'mahagonny'], min: 2, hinweis: 'Zwei Uraufführungen deiner Stadt.' },
  { id: 'dresden', name: 'Strauss in Dresden', x: 2, werke: ['salome', 'elektra', 'rosenkavalier'], hinweis: 'Drei Uraufführungen an der Semperoper.' },
  { id: 'romantisch', name: 'Wagners Romantische', x: 2, werke: ['fliegender-hollaender', 'tannhaeuser', 'lohengrin'], hinweis: 'Bevor es Musikdramen wurden.' },
  { id: 'operette', name: 'Walzerseligkeit', x: 3, werke: ['fledermaus', 'lustige-witwe', 'csardasfuerstin'], hinweis: 'Drei Wiener Operetten-Uraufführungen.' },
  { id: 'belcanto', name: 'Belcanto-Dreigestirn', x: 2.5, komponisten: ['rossini', 'donizetti', 'bellini'], hinweis: 'Je ein Werk der drei Belcanto-Meister.' },
];

// Stars – das Ensemble (die „Joker“). Wirkungen stehen in logic.js.
// Markup: {p:…} Publikum, {b:…} Begeisterung, {x:…} Faktor, {g:…} Dukaten.
export const STARS = [
  { id: 'claque', name: 'Die Claque', rar: 1, preis: 2, icon: 'hands', text: '{b:+4 Begeisterung}.', flavor: 'Bezahlter Beifall ist auch Beifall.' },
  { id: 'caruso', name: 'Enrico Caruso', rar: 1, preis: 5, icon: 'note', text: 'Jedes gezählte italienische Werk: {b:+3 Begeisterung}.' },
  { id: 'lehmann', name: 'Lotte Lehmann', rar: 1, preis: 5, icon: 'note', text: 'Jedes gezählte deutsche Werk: {b:+3 Begeisterung}.' },
  { id: 'calve', name: 'Emma Calvé', rar: 1, preis: 5, icon: 'note', text: 'Jedes gezählte französische Werk: {b:+4 Begeisterung}.', flavor: 'Die Carmen ihrer Zeit.' },
  { id: 'schaljapin', name: 'Fjodor Schaljapin', rar: 1, preis: 5, icon: 'note', text: 'Jedes gezählte osteuropäische Werk: {b:+4 Begeisterung}.' },
  { id: 'pears', name: 'Peter Pears', rar: 1, preis: 5, icon: 'note', text: 'Jedes gezählte englische Werk: {b:+4 Begeisterung}.' },
  { id: 'souffleur', name: 'Der Souffleur', rar: 1, preis: 3, icon: 'box', text: '{b:+8 Begeisterung}, wenn das Programm einen Doppelabend enthält.' },
  { id: 'abonnent', name: 'Der Abonnent', rar: 1, preis: 4, icon: 'ticket', text: '{b:+12 Begeisterung}, wenn das Programm einen Komponistenabend enthält.' },
  { id: 'dramaturgin', name: 'Die Dramaturgin', rar: 1, preis: 4, icon: 'book', text: '{b:+12 Begeisterung}, wenn das Programm eine Zeitreise enthält.' },
  { id: 'lokalpatriot', name: 'Der Lokalpatriot', rar: 1, preis: 4, icon: 'flag', text: '{b:+10 Begeisterung}, wenn das Programm einen Nationalabend enthält.' },
  { id: 'platzanweiserin', name: 'Die Platzanweiserin', rar: 1, preis: 3, icon: 'ticket', text: '{p:+50 Publikum}, wenn das Programm einen Doppelabend enthält.' },
  { id: 'abendkasse', name: 'Die Abendkasse', rar: 1, preis: 4, icon: 'ticket', text: '{p:+100 Publikum}, wenn das Programm einen Komponistenabend enthält.' },
  { id: 'gewandhaus', name: 'Gewandhausorchester', rar: 1, preis: 5, icon: 'lyre', text: 'Jedes gezählte Werk: {p:+10 Publikum}.', flavor: 'Leipzig, seit 1743.' },
  { id: 'allerlei', name: 'Leipziger Allerlei', rar: 1, preis: 4, icon: 'bowl', text: '{b:+4 Begeisterung} je Schule unter den gespielten Werken.' },
  { id: 'kurz', name: 'Kurz und bündig', rar: 1, preis: 4, icon: 'clock', text: 'Jedes gezählte Werk mit 1–2 Akten: {b:+3 Begeisterung}.' },
  { id: 'sitzfleisch', name: 'Sitzfleisch', rar: 1, preis: 4, icon: 'clock', text: 'Jedes gezählte Werk mit 4 oder mehr Akten: {p:+30 Publikum}.' },
  { id: 'buffo', name: 'Der Buffo', rar: 1, preis: 4, icon: 'mask', text: 'Jedes gezählte heitere Werk: {b:+3 Begeisterung}.' },
  { id: 'kassenschlager', name: 'Kassenschlager', rar: 1, preis: 5, icon: 'star', text: 'Jedes gezählte Werk mit Ruhm 10 oder 11: {b:+4 Begeisterung}.' },
  { id: 'maezen', name: 'Der Mäzen', rar: 1, preis: 5, icon: 'coin', text: '{g:+4 Dukaten} am Ende jedes Abends.' },
  { id: 'garderobiere', name: 'Die Garderobiere', rar: 1, preis: 4, icon: 'coin', text: '{g:+1 Dukat} je übrig gebliebener Umbesetzung am Abendende.' },
  { id: 'pausensekt', name: 'Pausensekt', rar: 1, preis: 4, icon: 'glass', text: '+1 Umbesetzung pro Abend.' },
  { id: 'inspizient', name: 'Der Inspizient', rar: 1, preis: 5, icon: 'headset', text: '+1 Handgröße.' },

  { id: 'daponte', name: 'Lorenzo Da Ponte', rar: 2, preis: 6, icon: 'quill', text: 'Jedes gezählte Mozart-Werk: {p:+30 Publikum} und {b:+3 Begeisterung}.' },
  { id: 'boito', name: 'Arrigo Boito', rar: 2, preis: 6, icon: 'quill', text: 'Jedes gezählte Verdi-Werk: {b:+5 Begeisterung}.' },
  { id: 'hofmannsthal', name: 'Hugo von Hofmannsthal', rar: 2, preis: 6, icon: 'quill', text: 'Jedes gezählte Werk von Richard Strauss: {b:+5 Begeisterung}.' },
  { id: 'illica', name: 'Luigi Illica', rar: 2, preis: 6, icon: 'quill', text: 'Jedes gezählte Puccini-Werk: {b:+5 Begeisterung}.', flavor: 'Bohème, Tosca, Butterfly – alle mit Giacosa.' },
  { id: 'ricordi', name: 'Giulio Ricordi', rar: 2, preis: 6, icon: 'coin', text: 'Jedes gezählte Werk von Verdi oder Puccini: {g:+1 Dukat}.', flavor: 'Der Verleger.' },
  { id: 'ludwig', name: 'Ludwig II.', rar: 2, preis: 6, icon: 'crown', text: 'Jedes gezählte Wagner-Werk: {g:+2 Dukaten}.' },
  { id: 'melchior', name: 'Lauritz Melchior', rar: 2, preis: 6, icon: 'note', text: 'Wächst um {b:+1 Begeisterung} für jedes gezählte Wagner-Werk.', wert: (v) => `Derzeit {b:+${v || 0} Begeisterung}.` },
  { id: 'stammpublikum', name: 'Das Stammpublikum', rar: 2, preis: 6, icon: 'heart', text: 'Wächst um {b:+2 Begeisterung} bei jeder Vorstellung mit mindestens einem Doppelabend. Eine Solo-Arie setzt es zurück.', wert: (v) => `Derzeit {b:+${v || 0} Begeisterung}.` },
  { id: 'zugabe', name: 'Zugabe!', rar: 2, preis: 6, icon: 'repeat', text: 'Das erste gezählte Werk jeder Vorstellung zählt doppelt.' },
  { id: 'dacapo', name: 'Da capo!', rar: 2, preis: 7, icon: 'repeat', text: 'In der letzten Vorstellung eines Abends zählt jedes Werk doppelt.' },
  { id: 'raritaeten', name: 'Der Raritätensammler', rar: 2, preis: 7, icon: 'lens', text: 'Jedes gezählte Werk mit Ruhm 6 oder weniger: {x:×1,5 Begeisterung}.' },
  { id: 'orakel', name: 'Das Silvester-Orakel', rar: 2, preis: 6, icon: 'eye', text: 'Deutet zu jedem Abend eine Schule. Gezählte Werke dieser Schule: {x:×1,5 Begeisterung}.', wert: (v, run) => run?.round?.orakel ? `Heute: ${SCHULEN[run.round.orakel].name}.` : '' , flavor: 'Wachs ins Wasser, Blick in die Zukunft.' },
  { id: 'fraktion', name: 'Fraktionsdisziplin', rar: 2, preis: 6, icon: 'gavel', text: '{x:×2 Begeisterung}, wenn mindestens drei Werke gespielt werden und alle derselben Schule angehören.' },
  { id: 'regietheater', name: 'Regietheater', rar: 2, preis: 5, icon: 'mask', text: '{x:×2 Begeisterung}. Nach jedem Abend droht mit 1 zu 5 ein Buhsturm – dann geht der Star.' },
  { id: 'prisma', name: 'Das Prisma', rar: 2, preis: 7, icon: 'prism', text: 'Nationalabend und Zeitreisen gelingen schon mit vier Werken.' },
  { id: 'opernglas', name: 'Das Opernglas', rar: 2, preis: 7, icon: 'binoc', text: '+1 Vorstellung pro Abend.' },
  { id: 'ausschuss', name: 'Der Kulturausschuss', rar: 2, preis: 6, icon: 'gavel', text: '{g:+10 Dukaten} Fördermittel nach jedem Kritikerabend.' },
  { id: 'pavarotti', name: 'Nessun dorma', rar: 2, preis: 6, icon: 'note', text: 'Wird genau ein Werk gespielt: {x:×4 Begeisterung}.' },
  { id: 'generalprobe', name: 'Die Generalprobe', rar: 2, preis: 6, icon: 'clock', text: 'In der ersten Vorstellung eines Abends: {x:×2 Begeisterung}.' },

  { id: 'callas', name: 'Maria Callas', rar: 3, preis: 9, icon: 'diva', text: 'Jedes gezählte italienische Werk: {x:×1,3 Begeisterung}.', flavor: 'La Divina.' },
  { id: 'cosima', name: 'Cosima Wagner', rar: 3, preis: 9, icon: 'crown', text: 'Jedes gezählte Wagner-Werk: {x:×1,5 Begeisterung}.' },
  { id: 'toscanini', name: 'Arturo Toscanini', rar: 3, preis: 8, icon: 'baton', text: '{x:×2,5 Begeisterung}, wenn alle gespielten Werke (mindestens zwei) aus derselben Epoche stammen.' },
  { id: 'karajan', name: 'Herbert von Karajan', rar: 3, preis: 8, icon: 'baton', text: 'In der letzten Vorstellung eines Abends: {x:×3 Begeisterung}.' },
  { id: 'kino', name: 'Live im Kino', rar: 3, preis: 9, icon: 'film', text: '{p:×2 Publikum}. Die Übertragung füllt jeden Saal.' },
  { id: 'intendant', name: 'Der Generalintendant', rar: 3, preis: 8, icon: 'laurel', text: 'Wächst nach jedem bestandenen Kritikerabend um {x:×0,5 Begeisterung}.', wert: (v) => `Derzeit {x:×${fmtX(1 + (v || 0))} Begeisterung}.` },
  { id: 'opernfuehrer', name: 'Reclams Opernführer', rar: 3, preis: 8, icon: 'book', text: 'Sternstunden zählen zusätzlich {x:×2}. Fehlende Werke deiner Sternstunden tauchen öfter im Foyer auf.' },
  { id: 'hustenbonbon', name: 'Hustenbonbons', rar: 3, preis: 8, icon: 'candy', text: 'Die Regeln der Kritiker gelten nicht.' },
];
export const STAR = Object.fromEntries(STARS.map((s) => [s.id, s]));
export const RARITAET = { 1: 'Ensemble', 2: 'Solist', 3: 'Legende' };

export function fmtX(x) {
  return String(Math.round(x * 100) / 100).replace('.', ',');
}

// Rezensionen werten ein Programm sofort um eine Stufe auf (die „Planeten“).
export const REZENSIONEN = {
  solo: 'Leipziger Volkszeitung',
  doppel: 'Das Opernglas',
  zweiDoppel: 'taz',
  kompAbend: 'Süddeutsche Zeitung',
  zeitreise: 'Die Zeit',
  national: 'FAZ',
  festspiel: 'Opernwelt',
  werkschau: 'Der Spiegel',
  grosseZeit: 'Neue Zürcher Zeitung',
  gesamtwerk: 'Deutschlandfunk Kultur',
};

// Proben verändern Werke im Repertoire (die „Tarotkarten“).
// ziel: [min, max] Werke, die in der Hand gewählt sein müssen.
export const PROBEN = [
  { id: 'neuinszenierung', name: 'Neuinszenierung', ziel: [1, 2], text: 'Bis zu zwei gewählte Werke werden neu inszeniert: {p:+30 Publikum}, wenn gezählt.' },
  { id: 'starbesetzung', name: 'Starbesetzung', ziel: [1, 2], text: 'Bis zu zwei gewählte Werke erhalten eine Starbesetzung: {b:+4 Begeisterung}, wenn gezählt.' },
  { id: 'festspielfassung', name: 'Festspielfassung', ziel: [1, 1], text: 'Ein gewähltes Werk wird zur Festspielfassung: {x:×1,5 Begeisterung}, wenn gezählt.' },
  { id: 'schallplatte', name: 'Goldene Schallplatte', ziel: [1, 1], text: 'Ein gewähltes Werk bringt {g:+2 Dukaten}, wenn gezählt.' },
  { id: 'uebersetzung', name: 'Übersetzung', ziel: [2, 3], text: 'Zwei oder drei gewählte Werke übernehmen die Schule des linken.' },
  { id: 'streichung', name: 'Streichung', ziel: [1, 2], text: 'Bis zu zwei gewählte Werke werden aus dem Repertoire gestrichen.' },
  { id: 'wiederaufnahme', name: 'Wiederaufnahme', ziel: [1, 1], text: 'Ein gewähltes Werk wird ein zweites Mal ins Repertoire aufgenommen.' },
  { id: 'spielplanaenderung', name: 'Spielplanänderung', ziel: [1, 1], text: 'Ein gewähltes Werk wird gegen ein anderes desselben Komponisten getauscht.' },
  { id: 'benefiz', name: 'Benefizgala', ziel: null, text: 'Verdoppelt deine Dukaten (höchstens {g:+20}).' },
  { id: 'opernstudio', name: 'Opernstudio', ziel: null, text: 'Bildet einen zufälligen Star aus (Ensemble oder Solist), wenn ein Platz frei ist.' },
  { id: 'vorschau', name: 'Spielzeitvorschau', ziel: null, text: 'Zwei zufällige Programme steigen um je eine Stufe.' },
];
export const PROBE = Object.fromEntries(PROBEN.map((p) => [p.id, p]));

export const VEREDELUNG = {
  bonus: { name: 'Neuinszenierung', text: '{p:+30 Publikum}' },
  mult: { name: 'Starbesetzung', text: '{b:+4 Begeisterung}' },
  xmult: { name: 'Festspielfassung', text: '{x:×1,5 Begeisterung}' },
  gold: { name: 'Goldene Schallplatte', text: '{g:+2 Dukaten}' },
};

// Investitionen: eine pro Station im Foyer (die „Gutscheine“).
export const INVESTITIONEN = [
  { id: 'drehbuehne', name: 'Drehbühne', preis: 10, text: '+1 Angebot im Foyer.' },
  { id: 'orchestergraben', name: 'Größerer Orchestergraben', preis: 10, text: '+1 Handgröße.' },
  { id: 'abonnement', name: 'Zweites Abonnement', preis: 10, text: '+1 Vorstellung pro Abend.' },
  { id: 'probebuehne', name: 'Probebühne', preis: 10, text: '+1 Umbesetzung pro Abend.' },
  { id: 'loge', name: 'Neue Proszeniumsloge', preis: 10, text: '+1 Platz für Stars.' },
  { id: 'ticketsystem', name: 'Neues Ticketsystem', preis: 8, text: 'Neu disponieren kostet 2 Dukaten weniger.' },
  { id: 'notenarchiv', name: 'Notenarchiv', preis: 8, text: '+1 Platz für Proben.' },
  { id: 'pressestelle', name: 'Pressestelle', preis: 8, text: 'Rezensionen kosten im Foyer nur noch 1 Dukat.' },
  { id: 'foerderverein', name: 'Förderverein', preis: 10, text: 'Zinsen bis zu 10 statt 5 Dukaten.' },
];
export const INVESTITION = Object.fromEntries(INVESTITIONEN.map((v) => [v.id, v]));

// Kritiker: die Herrschaften am dritten Abend jeder Station.
export const KRITIKER = [
  { id: 'purist', name: 'Der Purist', regel: 'Werke nach 1900 zählen nicht.' },
  { id: 'avantgarde', name: 'Die Avantgardistin', regel: 'Werke vor 1850 zählen nicht.' },
  { id: 'mailand', name: 'Der Kritiker aus Mailand', regel: 'Deutsche Werke zählen nicht.' },
  { id: 'huegel', name: 'Der Kritiker vom Hügel', regel: 'Italienische Werke zählen nicht.' },
  { id: 'strenge', name: 'Die Strenge', regel: 'Jede Vorstellung muss genau fünf Werke umfassen.' },
  { id: 'gelangweilt', name: 'Der Gelangweilte', regel: 'Kein Programm darf zweimal gespielt werden.' },
  { id: 'feuilleton', name: 'Der Feuilletonist', regel: 'Grundwerte von Publikum und Begeisterung sind halbiert.' },
  { id: 'huster', name: 'Der Huster', regel: 'Nach jeder Vorstellung fliegen zwei zufällige Werke aus der Hand.' },
  { id: 'sparkommissar', name: 'Der Sparkommissar', regel: 'Jedes gespielte Werk kostet 1 Dukat.' },
  { id: 'ungeduld', name: 'Die Ungeduldige', regel: 'Keine Umbesetzungen.' },
  { id: 'schlaefer', name: 'Der Schläfer', regel: 'Nur eine Vorstellung – aber ein niedrigeres Ziel.' },
  { id: 'regie', name: 'Das Regieteam', regel: 'Jedes vierte Werk wird verdeckt gezogen.' },
  { id: 'kurzsichtig', name: 'Der Kurzsichtige', regel: '−1 Handgröße.' },
  { id: 'pedant', name: 'Der Pedant', regel: 'Jede Vorstellung senkt die Stufe des gespielten Programms um 1.' },
  { id: 'abonnentin', name: 'Die Stammabonnentin', regel: 'Nur eine Art Programm pro Abend.' },
  { id: 'wagnerianer', name: 'Der Wagnerianer', regel: 'Werke mit weniger als drei Akten zählen nicht.' },
  { id: 'moralist', name: 'Der Moralist', regel: 'Heitere Werke zählen nicht.' },
];
export const FINAL_KRITIKER = [
  { id: 'gruenerhuegel', name: 'Der Grüne Hügel', regel: 'Das Ziel ist doppelt so hoch.', finale: true },
  { id: 'primadonna', name: 'Die Primadonna assoluta', regel: 'Vor jeder Vorstellung ist ein zufälliger Star indisponiert.', finale: true },
];
export const KRITIK = Object.fromEntries([...KRITIKER, ...FINAL_KRITIKER].map((k) => [k.id, k]));

// Die Tournee: von Leipzig nach Bayreuth, danach Gastspiele.
export const HAEUSER = [
  { id: 'leipzig', name: 'Oper Leipzig', stadt: 'Leipzig', lat: 51.339, lon: 12.381, notiz: 'Heimspiel. Seit 1693 – nach Venedig und Hamburg das drittälteste bürgerliche Musiktheater Europas.' },
  { id: 'halle', name: 'Oper Halle', stadt: 'Halle (Saale)', lat: 51.483, lon: 11.970, notiz: 'Händels Geburtsstadt. Jeden Juni: Händel-Festspiele.' },
  { id: 'dresden', name: 'Semperoper', stadt: 'Dresden', lat: 51.054, lon: 13.735, notiz: 'Uraufführungsort von Holländer und Tannhäuser – und von neun Opern von Richard Strauss.' },
  { id: 'berlin', name: 'Staatsoper Unter den Linden', stadt: 'Berlin', lat: 52.517, lon: 13.395, notiz: '1742 von Friedrich dem Großen eröffnet.' },
  { id: 'hamburg', name: 'Hamburgische Staatsoper', stadt: 'Hamburg', lat: 53.557, lon: 9.988, notiz: 'Gegründet 1678 als erstes öffentliches Opernhaus im deutschsprachigen Raum.' },
  { id: 'muenchen', name: 'Bayerische Staatsoper', stadt: 'München', lat: 48.140, lon: 11.579, notiz: 'Hier kamen Tristan, Meistersinger, Rheingold und Walküre zur Welt.' },
  { id: 'wien', name: 'Wiener Staatsoper', stadt: 'Wien', lat: 48.203, lon: 16.369, notiz: 'Eröffnet 1869 mit Mozarts Don Giovanni.' },
  { id: 'bayreuth', name: 'Bayreuther Festspielhaus', stadt: 'Bayreuth', lat: 49.958, lon: 11.580, notiz: 'Eröffnet 1876 mit dem ersten vollständigen Ring. Das Finale.' },
];
export const GASTSPIELE = [
  { id: 'salzburg', name: 'Großes Festspielhaus', stadt: 'Salzburg', lat: 47.800, lon: 13.042, notiz: 'Gastspiel bei den Salzburger Festspielen.' },
  { id: 'zuerich', name: 'Opernhaus Zürich', stadt: 'Zürich', lat: 47.365, lon: 8.547, notiz: 'Gastspiel am Utoquai.' },
  { id: 'bregenz', name: 'Seebühne Bregenz', stadt: 'Bregenz', lat: 47.507, lon: 9.737, notiz: 'Die größte Seebühne der Welt.' },
  { id: 'frankfurt', name: 'Oper Frankfurt', stadt: 'Frankfurt am Main', lat: 50.108, lon: 8.674, notiz: 'Gastspiel am Willy-Brandt-Platz.' },
  { id: 'essen', name: 'Aalto-Theater', stadt: 'Essen', lat: 51.452, lon: 7.012, notiz: 'Alvar Aaltos weißer Saal.' },
  { id: 'koeln', name: 'Oper Köln', stadt: 'Köln', lat: 50.938, lon: 6.958, notiz: 'Gastspiel am Offenbachplatz.' },
];
// Zielwerte des ersten Abends je Station (wie die Antes bei Balatro).
export const ZIELE = [300, 800, 1800, 4200, 9000, 17000, 30000, 48000];
export const ABENDE = [
  { name: 'Premiere', faktor: 1, gage: 3 },
  { name: 'Gala', faktor: 1.5, gage: 4 },
  { name: 'Kritikerabend', faktor: 2, gage: 5 },
];

// Startrepertoires (die „Decks“).
export const REPERTOIRES = [
  {
    id: 'leipzig', name: 'Leipziger Spielplan', text: 'Ausgewogen: die großen Fünf plus Belcanto, Franzosen und Lortzing.',
    werke: ['zauberflote', 'don-giovanni', 'nozze-di-figaro', 'cosi-fan-tutte', 'entfuehrung',
      'nabucco', 'rigoletto', 'la-traviata', 'aida', 'otello', 'falstaff',
      'fliegender-hollaender', 'tannhaeuser', 'lohengrin', 'tristan', 'ring-walkuere',
      'la-boheme', 'tosca', 'madama-butterfly', 'turandot', 'gianni-schicchi',
      'salome', 'elektra', 'rosenkavalier', 'ariadne-naxos', 'arabella',
      'barbiere', 'cenerentola', 'elisir', 'lucia',
      'carmen', 'faust', 'hoffmanns-erzaehlungen', 'eugen-onegin', 'rusalka',
      'peter-grimes', 'dido-aeneas', 'giulio-cesare', 'fidelio', 'zar-zimmermann'],
  },
  {
    id: 'belcanto', name: 'Belcanto-Abo', text: 'Nur Italienisch, von Monteverdi bis Verismo. Jeder Abend ein Nationalabend.',
    frei: { art: 'station', wert: 3, text: 'Erreiche Station 3 (Semperoper).' },
    werke: ['barbiere', 'cenerentola', 'guglielmo-tell', 'lucia', 'elisir', 'don-pasquale', 'norma', 'i-puritani', 'la-sonnambula',
      'nabucco', 'macbeth', 'rigoletto', 'il-trovatore', 'la-traviata', 'un-ballo-in-maschera', 'forza-del-destino', 'aida', 'otello',
      'la-boheme', 'tosca', 'madama-butterfly', 'turandot', 'gianni-schicchi', 'manon-lescaut',
      'nozze-di-figaro', 'don-giovanni', 'cosi-fan-tutte', 'clemenza-di-tito',
      'giulio-cesare', 'rinaldo', 'alcina', 'orfeo', 'poppea', 'orfeo-euridice',
      'cavalleria-rusticana', 'pagliacci', 'andrea-chenier', 'adriana-lecouvreur', 'mefistofele', 'la-gioconda'],
  },
  {
    id: 'bayreuth', name: 'Bayreuther Schule', text: 'Der ganze Wagner, der ganze Strauss und viel Deutsches. Startet mit Ludwig II.',
    star: 'ludwig', frei: { art: 'station', wert: 5, text: 'Erreiche Station 5 (Hamburg).' },
    werke: ['ring-rheingold', 'ring-walkuere', 'ring-siegfried', 'ring-goetterdaemmerung', 'tristan', 'meistersinger', 'parsifal', 'lohengrin', 'tannhaeuser', 'fliegender-hollaender',
      'rosenkavalier', 'salome', 'elektra', 'ariadne-naxos', 'frau-ohne-schatten', 'capriccio', 'arabella', 'daphne', 'intermezzo',
      'freischuetz', 'oberon', 'haensel-gretel', 'fidelio', 'zauberflote', 'entfuehrung',
      'zar-zimmermann', 'wildschuetz', 'undine', 'tote-stadt', 'wozzeck', 'lulu',
      'fledermaus', 'lustige-witwe', 'land-des-laechelns', 'csardasfuerstin', 'martha', 'mahagonny', 'bassariden', 'soldaten'],
  },
  {
    id: 'paris', name: 'Pariser Salon', text: 'Französisch, Osteuropäisch, Englisch – alles außer Italien und Deutschland. +1 Handgröße.',
    bonus: { handSize: 1 }, frei: { art: 'sternstunden', wert: 3, text: 'Entdecke 3 Sternstunden.' },
    werke: ['carmen', 'perlenfischer', 'faust', 'hoffmanns-erzaehlungen', 'samson-dalila', 'werther', 'manon', 'pelleas', 'les-troyens', 'guglielmo-tell', 'iphigenie-tauride', 'dialogues-carmelites',
      'eugen-onegin', 'pique-dame', 'boris-godunow', 'fuerst-igor', 'rusalka', 'verkaufte-braut', 'jenufa', 'katja-kabanova', 'schlaue-fuechslein', 'lady-macbeth', 'liebe-drei-orangen', 'blaubart',
      'dido-aeneas', 'peter-grimes', 'turn-of-screw', 'midsummer-nights-dream', 'rake-progress', 'porgy-bess', 'nixon-in-china', 'einstein-on-the-beach', 'satyagraha', 'akhnaten', 'written-on-skin', 'oberon'],
  },
  {
    id: 'moderne', name: 'Uraufführungs-Abo', text: 'Nur Werke ab 1890. Startet mit Regietheater.',
    star: 'regietheater', frei: { art: 'sieg', wert: 1, text: 'Gewinne eine Spielzeit.' },
    werke: ['la-boheme', 'tosca', 'madama-butterfly', 'turandot', 'gianni-schicchi', 'il-tabarro', 'suor-angelica', 'fanciulla-del-west',
      'salome', 'elektra', 'rosenkavalier', 'ariadne-naxos', 'frau-ohne-schatten', 'arabella', 'capriccio',
      'wozzeck', 'lulu', 'peter-grimes', 'turn-of-screw', 'midsummer-nights-dream', 'jenufa', 'katja-kabanova', 'schlaue-fuechslein',
      'einstein-on-the-beach', 'satyagraha', 'akhnaten', 'pelleas', 'tote-stadt', 'mahagonny', 'porgy-bess', 'rake-progress', 'dialogues-carmelites',
      'lady-macbeth', 'liebe-drei-orangen', 'blaubart', 'nixon-in-china', 'written-on-skin', 'lustige-witwe', 'csardasfuerstin', 'land-des-laechelns'],
  },
  {
    id: 'kabinett', name: 'Raritätenkabinett', text: '40 zufällige Werke aus dem ganzen Katalog. Startet mit dem Raritätensammler.',
    star: 'raritaeten', zufall: 40, frei: { art: 'werke', wert: 60, text: 'Bringe 60 verschiedene Werke auf die Bühne.' },
    werke: [],
  },
];
export const REPERTOIRE = Object.fromEntries(REPERTOIRES.map((r) => [r.id, r]));

// Strenge (Schwierigkeit), freigeschaltet durch Siege.
export const STRENGE = [
  { stufe: 1, name: 'Wohlwollend', text: 'Das Publikum liebt dich.' },
  { stufe: 2, name: 'Kritisch', text: 'Die Premiere bringt keine Gage.' },
  { stufe: 3, name: 'Anspruchsvoll', text: 'Dazu: alle Ziele +25 %.' },
  { stufe: 4, name: 'Gnadenlos', text: 'Dazu: −1 Umbesetzung.' },
  { stufe: 5, name: 'Bayreuth', text: 'Dazu: alle Ziele +60 % statt +25 %.' },
];
