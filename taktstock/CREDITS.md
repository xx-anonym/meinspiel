# Aufnahmen und Lizenzen

Alle vier Aufnahmen sind gemeinfrei. Für jede Datei steht hier, woher sie kommt
und warum sie frei ist. Die Kompositionen selbst sind ohnehin längst frei
(Beethoven † 1827, Strauss Vater † 1849, Brahms † 1897, Grieg † 1907).

Die Dateien in `audio/` sind für das Spiel bearbeitet: Pegel angeglichen, als MP3
kodiert, bei den Schellackplatten zusätzlich entknackst (`adeclick`), entrauscht
(`afftdn`), auf 55–6500 Hz begrenzt und zu Mono gemischt. Die Befehle stehen im
README.

---

## 1. Beethoven: 7. Sinfonie A-Dur op. 92, 2. Satz (Allegretto)

| | |
| --- | --- |
| Ensemble | London Symphony Orchestra |
| Dirigent | Felix Weingartner |
| Aufnahme | 1. Juni 1923, Columbia, Petty France Studios, London; Plattenseiten 3 und 4 neu aufgenommen am 6. November 1924 |
| Veröffentlichung | Columbia L 1480–1484 (Großbritannien, September 1923, Neuauflage November 1924); in den USA als Columbia Masterworks Set No. 1 (67034-D bis 67038-D) |
| Quelle | Internet Archive, „Beethoven 7th Symphony (Weingartner, 1923)“: <https://archive.org/details/cm-1-beethoven-7-i>, Datei `CM1 Beethoven 7 (ii).flac` |
| Lizenz | **Gemeinfrei** |
| Datei | `audio/beethoven7.mp3` |

Warum gemeinfrei:

- **USA:** Nach dem Music Modernization Act (Classics Protection and Access Act) endet der Schutz von Tonaufnahmen, die 1923 bis 1946 veröffentlicht wurden, 100 Jahre nach der Veröffentlichung. Für 1923 war das am 1. 1. 2024, für 1924 am 1. 1. 2025.
- **Deutschland/EU:** Die Rechte von Interpreten und Tonträgerherstellern (§§ 82, 85 UrhG) liefen für Aufnahmen, die vor 1963 veröffentlicht wurden, 50 Jahre. Sie sind seit den 1970er-Jahren erloschen.
- Die Digitalisierung einer gemeinfreien Platte begründet kein neues Recht.

## 2. Johann Strauss (Vater): Radetzky-Marsch op. 228

| | |
| --- | --- |
| Ensemble | „The President’s Own“ United States Marine Band (Bearbeitung für Blasorchester) |
| Dirigent | Col. John R. Bourgeois |
| Aufnahme | 18.–21. Mai 1992, Center for the Arts, George Mason University; Album „Sound Off“ |
| Quelle | Wikimedia Commons, `File:Radetzky March.ogg`: <https://commons.wikimedia.org/wiki/File:Radetzky_March.ogg> (ursprünglich von marineband.marines.mil) |
| Lizenz | **Gemeinfrei** (Commons-Vorlage PD-USMC) |
| Datei | `audio/radetzky.mp3` |

Warum gemeinfrei: Die Aufnahme ist ein Werk von Angehörigen des U.S. Marine Corps im Rahmen ihres Dienstes. Werke der US-Bundesregierung genießen keinen Urheberrechtsschutz (17 U.S.C. § 105).

Hinweis: Eine freie Orchesteraufnahme des Radetzky-Marschs in guter Qualität habe ich nicht gefunden. Diese Fassung ist für Blasorchester. Für einen Militärmarsch passt das, ein Sinfonieorchester ist es aber nicht.

## 3. Johannes Brahms: Ungarischer Tanz Nr. 5 (Orchesterfassung)

| | |
| --- | --- |
| Ensemble | Philadelphia Orchestra (auf dem Etikett: „Philadelphia Symphony Orchestra“) |
| Dirigent | Leopold Stokowski |
| Aufnahme | 1917, Victor, akustisch (vor dem elektrischen Mikrofon) |
| Quelle | Internet Archive, Great 78 Project (Transfer: George Blood L.P.): <https://archive.org/details/78_hungarian-dance-no-5_philadelphia-symphony-orchestra-brahms-leopold-stokowski_gbia0183029a> |
| Lizenz | **Gemeinfrei** |
| Datei | `audio/brahms5.mp3` |

Warum gemeinfrei:

- **USA:** Die Aufnahme wurde vor 1923 veröffentlicht. Der Schutz endete am 1. 1. 2022.
- **Deutschland/EU:** Der 50-jährige Leistungsschutz ist längst abgelaufen (siehe oben).

## 4. Edvard Grieg: Peer Gynt, Suite Nr. 1 op. 46 – IV. In der Halle des Bergkönigs

| | |
| --- | --- |
| Ensemble | Musopen Symphony (Musopen-Kickstarter-Projekt) |
| Aufnahme | 2012 |
| Quelle | Wikimedia Commons, `File:Grieg - Peer Gynt Suite No. 1, Op. 46 - IV. In the Hall of the Mountain King (Musopen Symphony).flac`: <https://commons.wikimedia.org/wiki/File:Grieg_-_Peer_Gynt_Suite_No._1,_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_(Musopen_Symphony).flac>; dieselbe Aufnahme auch im Internet Archive, „The Musopen DVD“: <https://archive.org/details/musopen-dvd> |
| Lizenz | **Gemeinfrei**: Musopen hat die Kickstarter-Aufnahmen ausdrücklich freigegeben (Commons: PD-author; Internet Archive: Public Domain Mark bzw. CC0) |
| Datei | `audio/grieg.mp3` |

---

## Alles andere

- **Beat-Maps** (`beatmaps/`): Der erste Entwurf stammt von `scripts/beatmap.py` (librosa). Beim Bergkönig ist der Schluss von Hand korrigiert (`scripts/korrektur.py`). Die Maps sind Teil dieses Projekts.
- **Saalgeräusche**: Klatschen, Applaus, Bravo-Rufe, Husten, Gähnen, Programmheft-Rascheln, Kiekser und Quietscher werden im Browser synthetisiert (Web Audio). Es gibt keine Sample-Dateien.
- **Schriften**: Playfair Display, Inter und UnifrakturMaguntia von Google Fonts, jeweils unter der SIL Open Font License.
- **Eigene Stücke**, die du per Drag & Drop lädst, bleiben in deinem Browser (IndexedDB) und werden nirgends hochgeladen.
