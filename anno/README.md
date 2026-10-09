# ANNO

GeoGuessr für die deutsche Sprachgeschichte. Du bekommst eine zufällige
Passage aus einem echten Druck zwischen 1600 und 1900 und setzt einen Pin auf
der Zeitleiste. Gewertet wird nach dem Abstand in Jahren. Ein Spiel hat fünf
Runden.

Die Texte stammen aus dem Kernkorpus des
[Deutschen Textarchivs](https://www.deutschestextarchiv.de/) (CC BY-SA 4.0,
siehe [CREDITS.md](CREDITS.md)).

Reines HTML, CSS und JavaScript. Kein Framework, kein Build-Schritt.

## Spielen

```bash
cd anno
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Ein lokaler Server ist nötig, weil der Browser die JSON-Dateien nicht von
`file://` lädt.

### Einstellungen

| | |
| --- | --- |
| **Bewegung** | **Moving**: Über und unter der Passage holt man sich den Absatz davor oder danach dazu (je bis zu zwei Schritte). Jeder Schritt kostet 10 % der möglichen Punkte. **No Move**: nur die Passage. **NMPZ**: nur ein einzelner Satz. |
| **Schreibung** | **Original**: wie im Druck (ſ, uͤ, ꝛc., Virgeln). **Moderne Typografie**: ſ → s, uͤ/aͤ/oͤ → ü/ä/ö, ꝛ → r, ꝛc. → etc., dañ → dann, Virgel → Komma, „HErꝛ“ → „Herr“, J/V am Wortanfang vor Konsonant → I/U („Jch“ → „Ich“, „vnd“ → „und“). Die Rechtschreibung bleibt historisch („seyn“, „Theil“). **Normalisiert**: die normalisierte Fassung des DTA in moderner Schreibung. |
| **Gattung** | Belletristik, Gebrauchsliteratur, Wissenschaft (Mehrfachauswahl) |
| **Zeitraum** | 17., 18., 19. Jahrhundert (Mehrfachauswahl). Die Zeitleiste zeigt dann nur den gewählten Bereich, z. B. 1700–1800 mit Jahrzehnten. |

Die Einstellungen bleiben im Browser gespeichert.

### Bedienung

- **Zeitleiste** antippen oder ziehen, um den Pin zu setzen.
- **−10 / −1 / +1 / +10** zum Feinjustieren, auch mit dem Finger.
- **Tastatur** (Zeitleiste fokussiert): ← → je ein Jahr, mit Umschalt zehn
  Jahre, Bild ↑/↓ zehn Jahre, Pos1/Ende springen an den Rand. Vier Ziffern
  setzen das Jahr direkt, z. B. `1774`.
- **Gattung und Autor** sind freiwillig. Das Autorfeld schlägt beim Tippen
  Namen aus dem Korpus vor (↑ ↓ und Enter zum Auswählen). Es kennt auch
  Schreibvarianten und Pseudonyme: „Richter“ findet Jean Paul, „Hardenberg“
  Novalis. Wer nicht auswählt, bekommt den Punkt trotzdem, wenn der ganze
  Name oder ein eindeutiger Nachname („Lessing“) passt.
- **Enter** tippt bzw. geht zur nächsten Runde.
- Nach der Auflösung darf man kostenlos weiterlesen (Absatz davor/danach).
  Im NMPZ-Modus erscheint dann die ganze Passage mit dem markierten Satz.

### Wertung (höchstens 5.000 pro Runde)

- **Jahr**: `4000 · e^(−Abstand/35)`, also 4.000 Punkte für das exakte Jahr,
  ±10 Jahre ≈ 3.000, ±25 ≈ 2.000, ±50 ≈ 950, ±100 ≈ 230.
- **Gattung** richtig: +500 (Hauptkategorie des DTA).
- **Autor** richtig: +500. Personen werden über die GND-Nummer erkannt; bei
  Werken mit mehreren Verfassern zählt jeder. Anonyme Werke haben den
  „Autor“ Anonym.
- **Moving**: Die Summe der Runde wird um 10 % je Schritt gekürzt.

### Tagesaufgabe und Challenge-Link

- **Tagesaufgabe**: fünf feste Passagen pro Tag (Datum in deutscher Zeit),
  No Move, Original, ohne Filter. Gewertet wird der erste Versuch; eine
  Wiederholung zählt nicht für die Statistik.
- **Challenge-Link**: Nach jedem Spiel erzeugt „Challenge-Link teilen“ eine
  Adresse mit Seed, Einstellungen und den eigenen Punkten je Runde, z. B.
  `?seed=7onhas1x0qgkh&bew=move&schr=typo&gat=BGW&jh=18&gegen=1112.2759.3183.2073.1650`.
  Wer den Link öffnet, spielt dieselben fünf Passagen mit denselben Regeln und
  sieht am Ende den Vergleich Runde für Runde. Die Auswahl hängt nur vom Seed,
  den Einstellungen und den Daten ab. Ein Link bleibt gültig, solange
  `data/` gleich bleibt.

### Statistik

Gespeichert im Browser (`localStorage`, Schlüssel `anno.statistik`):
Bestwerte je Kombination aus Bewegung und Schreibung (mit Filter getrennt),
die letzten 20 Spiele, die Trefferquote bei Gattung und Autor und die
durchschnittliche Abweichung nach Epoche, Jahrhundert und Gattung,
jeweils mit der Tendenz zu früh oder zu spät. Die Seite nennt den größten
blinden Fleck, z. B. „Am weitesten daneben liegst du bei Barock: Ø 38 Jahre“.
Die Epochen sind grob nach Jahren eingeteilt: Barock bis 1719, Aufklärung
bis 1769, Sturm und Drang/Klassik bis 1804, Romantik bis 1829,
Biedermeier/Vormärz bis 1849, Realismus bis 1889, danach Moderne.

## Daten neu erzeugen

Die fertigen Daten liegen im Repository (`data/`). Neu erzeugen muss man sie
nur, wenn sich das Skript oder die DTA-Fassung ändert.

Voraussetzungen: Python 3.9 oder neuer, `lxml`.

```bash
cd anno
pip install lxml
python3 scripts/build_passages.py --download
```

`--download` lädt beide Archive von der
[Download-Seite des DTA](https://www.deutschestextarchiv.de/download) nach
`scripts/_dta/` (rund 380 MB TEI und 310 MB normalisierter Reintext; der
Ordner ist von Git ausgenommen). Wer die Archive schon hat:

```bash
python3 scripts/build_passages.py \
  --tei pfad/dta_kernkorpus_2026-02-10.zip \
  --norm pfad/gesamt.zip
```

Nur Metadaten (Autoren, Titel, Gattung) neu schreiben, ohne die Passagen
neu auszuwählen (dauert Sekunden):

```bash
python3 scripts/build_passages.py --tei pfad/dta_kernkorpus_2026-02-10.zip --nur-metadaten
```

`--tei` und `--norm` nehmen ZIP-Dateien oder entpackte Ordner. Ohne `--norm`
entstehen die Passagen ohne normalisierte Fassung. Mit
`--nur werk1 werk2 …` (DTA-Kürzel wie `goethe_werther01_1774`) oder
`--limit 20` lässt sich an wenigen Werken testen, mit `--seed` eine andere
Auswahl ziehen. Ein kompletter Lauf dauert auf vier Kernen etwa sieben
Minuten.

Danach die Schriften an die neuen Zeichen anpassen und Stichproben ansehen:

```bash
pip install fonttools brotli
python3 scripts/schriften.py
python3 scripts/stichproben.py 20 > STICHPROBEN.md
python3 scripts/stichproben.py 5 --kontext --norm      # mit Kontext und normalisierter Fassung
```

### Was das Skript tut

1. **Metadaten** aus dem `teiHeader`: Autor (mit GND-Nummer und
   Pseudonym aus `addName`), Titel, Untertitel,
   Erscheinungsjahr der digitalisierten Ausgabe, Ort, Auflage, Gattung
   (`dwds1main`: Belletristik, Gebrauchsliteratur, Wissenschaft),
   Untergattung (`dtasub`), URL. Das DTA digitalisiert nach seinen
   Leitlinien die erste selbstständige Ausgabe. Wo es eine spätere Auflage
   ist (32 von 1464 Werken), zeigt die Auflösung das an. Werke außerhalb
   von 1600–1900 fallen weg.
2. **Haupttext**: nur `<body>`, also ohne Titelei und Anhang. Außerdem
   ausgeschlossen:
   - Abschnitte vom Typ Vorrede, Widmung, Register, Inhaltsverzeichnis,
     Druckfehler, Verlagsanzeige o. Ä. sowie unmarkierte Abschnitte, deren
     Überschrift so beginnt („Vorrede“, „An den Leser“, „Register“ …)
   - Fußnoten und Marginalien (`note`), Kolumnentitel, Bogensignaturen und
     Kustoden (`fw`), Tabellen, Abbildungen, Überschriften, Briefköpfe und
     -schlüsse, Personenverzeichnisse und Kapitelzusammenfassungen
   - Bei `choice` gilt die Korrektur (`corr`) statt des Druckfehlers, die
     Originalschreibung (`orig`) statt der Regularisierung und die
     Abkürzung (`abbr`) statt der Auflösung.
3. **Bereinigen**: Silbentrennung am Zeilenende (`-` oder `¬` vor `<lb/>`)
   wird zusammengezogen, wenn kleingeschrieben weitergeht („darzu-/thun“ →
   „darzuthun“). Bei Großschreibung bleibt der Bindestrich
   („Kunſt-/Geſchichte“), ebenso vor „und“/„oder“ („Ein- und“).
   Zeilenumbrüche fallen weg, Absätze und Verszeilen bleiben. Manche
   Versdramen und Gedichte sind im DTA als Absatz mit Zeilenumbrüchen
   kodiert. Das erkennt das Skript (mindestens vier Zeilen, keine
   Silbentrennung, fast alle Zeilen beginnen groß, viele enden mit einem
   Satzzeichen) und behält dort die Verszeilen. Wo eine Fußnote entfernt
   wurde, bleibt kein Leerzeichen vor dem Satzzeichen stehen. Die
   Schreibung bleibt sonst unangetastet: ſ, uͤ/aͤ/oͤ, ꝛc., Virgeln.
4. **Passagen**: Sätze werden an `. ! ?` vor Großbuchstaben getrennt, nicht
   aber nach Abkürzungen, Ordinalzahlen und Initialen. Eine Passage ist eine
   Folge ganzer Sätze mit 80–150 Wörtern, auch über Absatzgrenzen, aber
   nicht über Überschriften. Pro Werk 10–15 Passagen (je nach Länge), über
   das Werk verteilt und ohne Überschneidung.
5. **Verworfen** wird eine Passage, wenn sie
   - den Nachnamen des Autors enthält (auch gebeugt, z. B. „Leſſings“; bei
     Doppelnamen jeden Teil, z. B. „Stilling“ bei Jung-Stilling),
   - den Werktitel enthält, als Ganzes oder ein seltenes Titelwort, auch
     gebeugt oder in einem Kompositum („Urhinkel“ bei „Gockel, Hinkel und
     Gackeleia“). Selten heißt: Das Wort steht in höchstens 1,5 % aller
     Werke, z. B. „Stopfkuchen“ oder „Werther“, aber nicht „Natur“.
   - einen Sprecher hat, dessen Name im Titel steckt (auch abgekürzt:
     „Horribil.“ bei „Horribilicribrifax“),
   - eine Liste ist (mindestens sechs Absätze mit im Schnitt weniger als
     sechs Wörtern außerhalb von Dramen, z. B. Reimwörterbücher),
   - eine Jahreszahl im Bereich ±5 Jahre um das Erscheinungsjahr enthält
     (arabisch oder römisch),
   - eine Lücke hat (nicht transkribiertes Griechisch/Hebräisch, Formel,
     unleserliche Stelle, nicht darstellbares Zeichen) oder zu mehr als
     20 % aus Ziffern und Zeichen besteht.
6. **Seite**: Zu jeder Passage wird die Faksimile-Nummer (`pb/@facs`) des
   ersten Satzes gespeichert. Die Auflösung verlinkt auf
   `https://www.deutschestextarchiv.de/book/view/<werk>?p=<seite>`.
7. **Kontext für Moving**: bis zu zwei Schritte davor und danach, je ein
   Absatz oder der Rest des Absatzes (höchstens 150 Wörter, kurze Absätze
   werden bis 40 Wörter zusammengefasst). Kontext, der etwas verraten würde,
   wird abgeschnitten. `klebt: true` heißt, dass der Schritt im selben
   Absatz weitergeht wie die Passage.
8. **NMPZ-Satz**: ein Satz der Passage mit möglichst 12–60 Wörtern.
9. **Normalisierte Fassung**: aus dem normalisierten Reintext des DTA
   (moderne Schreibung, erzeugt mit dem DTA-Normalisierer CAB). Der Reintext
   hat keine Seiten- und Absatzangaben, deshalb gleicht das Skript Wort für
   Wort mit der Passage ab (Dreiwortanker, dann `difflib`). Absatzgrenzen,
   Verszeilen und Sprecher werden übertragen. Virgeln werden zu Kommas,
   gerade Anführungszeichen zu „…“. Bei zu geringer Übereinstimmung bleibt
   `norm` leer.

### Datenformat

`data/passages.json` ist der Index:

```json
{
  "version": 2,
  "quelle": { "name": "Deutsches Textarchiv, Kernkorpus", "lizenz": "CC BY-SA 4.0",
              "seite": "https://www.deutschestextarchiv.de/book/view/{id}?p={seite}", "…": "…" },
  "autoren": [
    { "name": "Jean Paul", "alias": ["Johann Paul Friedrich Richter"] },
    { "name": "Wilhelm Raabe", "alias": ["Jakob Corvinus"] }
  ],
  "werke": [
    { "id": "raabe_stopfkuchen_1891", "autor": "Wilhelm Raabe", "titel": "Stopfkuchen",
      "jahr": 1891, "gattung": "Belletristik", "untergattung": "Roman",
      "a": [719], "n": 13, "norm": 13 }
  ]
}
```

`autoren` ist die Tabelle für Autovervollständigung und Wertung: eine Zeile
je Person, über die GND-Nummer zusammengeführt, mit dem häufigsten Namen und
den übrigen Schreibungen und Pseudonymen als `alias`. `a` verweist auf die
Zeilen der Verfasser eines Werks. Regierende Fürsten heißen einheitlich
„Name Ordnungszahl, Titel von Land“ („Friedrich II., König von Preußen“).

`data/passages/<id>.json` enthält dieselben Metadaten (dazu `untertitel`,
`ort`, `auflage`, `url`, `lizenz`) und die Passagen:

```json
{
  "seite": 11,
  "woerter": 104,
  "text": ["Es liegt mir daran, gleich in den erſten Zeilen dieſer Niederſchrift …"],
  "satz": "Nämlich ich habe es in Südafrika zu einem Vermögen gebracht, …",
  "vor":  [{ "text": ["…"], "klebt": false }],
  "nach": [{ "text": ["…"], "klebt": true }, { "text": ["…"], "klebt": false }],
  "norm": { "text": ["…"], "satz": "…", "vor": [["…"]], "nach": [["…"], ["…"]] }
}
```

Ein Absatz ist ein String (Verszeilen durch `\n` getrennt) oder ein Objekt:
`{"sp": "Daja.", "t": "Er iſt es! …"}` für eine Rede im Drama,
`{"st": "(Scene: Flur in Nathans Hauſe.)"}` für eine Regieanweisung. Eine
Regieanweisung mitten in einer Rede steht in `⟨…⟩`.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Oberfläche und Spiel |
| `data/passages.json` | Index aller Werke |
| `data/passages/*.json` | Passagen je Werk |
| `fonts/` | EB Garamond und Cardo als WOFF2-Untermengen, mit Lizenzen |
| `scripts/build_passages.py` | Vorverarbeitung DTA → JSON |
| `scripts/schriften.py` | Schrift-Untermengen erzeugen |
| `scripts/stichproben.py` | Zufällige Passagen als Markdown ausgeben |
| `STICHPROBEN.md` | 20 Stichproben zur Kontrolle (Stufe 1) |
| `CREDITS.md` | Quellen und Lizenzen |
