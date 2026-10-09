# ANNO

GeoGuessr für die deutsche Sprachgeschichte. Du bekommst eine zufällige
Passage aus einem echten Druck zwischen 1600 und 1900 und setzt einen Pin auf
der Zeitleiste. Gewertet wird nach dem Abstand in Jahren. Ein Spiel hat fünf
Runden.

Die Texte stammen aus dem Kernkorpus des
[Deutschen Textarchivs](https://www.deutschestextarchiv.de/) (CC BY-SA 4.0,
siehe [CREDITS.md](CREDITS.md)).

Reines HTML, CSS und JavaScript. Kein Framework, kein Build-Schritt.

## Stand

Erste Ausbaustufe: Vorverarbeitung und Kernschleife.

- Modus **Original** (Schreibung und Typografie wie im Druck)
- **No Move**: nur die eine Passage
- Wertung nur nach dem Jahr: `4000 · e^(−Abstand/35)`, also 4.000 Punkte für
  das exakte Jahr, ±10 Jahre ≈ 3.000, ±25 ≈ 2.000, ±50 ≈ 950, ±100 ≈ 230
- Auflösung mit Distanzlinie auf der Zeitleiste, hochzählenden Punkten und
  einem Link auf die Faksimile-Seite im DTA
- Auswertung nach fünf Runden mit allen Passagen, Lösungen und Punkten

Die Daten enthalten schon alles für die nächsten Stufen: Kontext für
„Moving“, den Einzelsatz für „NMPZ“ und die normalisierte Fassung.
Noch nicht im Spiel sind die Modi Moving und NMPZ, die Schwierigkeitsstufen
„Moderne Typografie“ und „Normalisiert“, die Filter, Gattung und Autor als
Zusatzfragen, die Statistik, die Daily Challenge und der Challenge-Link.

## Spielen

```bash
cd anno
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Ein lokaler Server ist nötig, weil der Browser die JSON-Dateien nicht von
`file://` lädt.

Bedienung:

- **Zeitleiste** antippen oder ziehen, um den Pin zu setzen.
- **−10 / −1 / +1 / +10** zum Feinjustieren, auch mit dem Finger.
- **Tastatur** (Zeitleiste fokussiert): ← → je ein Jahr, mit Umschalt zehn
  Jahre, Bild ↑/↓ zehn Jahre, Pos1/Ende springen an den Rand. Vier Ziffern
  setzen das Jahr direkt, z. B. `1774`.
- **Enter** tippt bzw. geht zur nächsten Runde.

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

1. **Metadaten** aus dem `teiHeader`: Autor, Titel, Untertitel,
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
  "version": 1,
  "quelle": { "name": "Deutsches Textarchiv, Kernkorpus", "lizenz": "CC BY-SA 4.0",
              "seite": "https://www.deutschestextarchiv.de/book/view/{id}?p={seite}", "…": "…" },
  "werke": [
    { "id": "raabe_stopfkuchen_1891", "autor": "Wilhelm Raabe", "titel": "Stopfkuchen",
      "jahr": 1891, "gattung": "Belletristik", "untergattung": "Roman", "n": 13, "norm": 13 }
  ]
}
```

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
| `STICHPROBEN.md` | 20 Stichproben zur Kontrolle |
| `CREDITS.md` | Quellen und Lizenzen |
