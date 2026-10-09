# Taktstock

Ein Dirigierspiel mit echten Orchesteraufnahmen. Du gibst den Schlag, die
Aufnahme folgt deinem Tempo in Echtzeit, ohne dass sich die Tonhöhe ändert.
Die Größe deiner Bewegung bestimmt die Lautstärke. Streicher, Holz und Blech
haben Launen, das Publikum auch. Am Ende steht die Kritik in der Zeitung.

Reines HTML, CSS und JavaScript (ES-Module). Kein Framework, kein Build-Schritt.

## Starten

```bash
cd taktstock
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Ein lokaler Server ist nötig, weil der Browser ES-Module und Beat-Maps nicht
von `file://` lädt. Die Aufnahmen werden vollständig in den Speicher geladen.
Deshalb funktioniert das Springen in der Aufnahme auch mit `http.server`, der
keine Range-Anfragen kann.

Das Handy als Taktstock (DeviceMotion) funktioniert nur über HTTPS, also über
die Vercel-Fassung oder einen Tunnel. Auf dem iPhone fragt das Spiel beim Start
nach der Erlaubnis für die Bewegungssensoren.

## Spielen

1. **Steuerung wählen**
   - **Tippen**: Jeder Tipp, Klick oder Druck auf die Leertaste ist ein Schlag.
   - **Geste**: Den Taktstock mit Maus oder Finger führen. Der tiefste Punkt einer Ab-auf-Bewegung ist der Schlag, die Höhe der Bewegung die Lautstärke.
   - **Handy**: Das Handy ist der Taktstock. Beschleunigungsspitzen sind Schläge, ihre Stärke ist die Lautstärke.
2. **Einsatz geben**: Zwei Schläge im gewünschten Tempo, beim dritten setzt das Orchester ein.
3. **Dirigieren**: Das Tempo ist der geglättete Mittelwert deiner letzten vier Schlagabstände. Die Wiedergabegeschwindigkeit ist dein Tempo geteilt durch das lokale Originaltempo laut Beat-Map. Sie wird weich nachgeführt und auf 0,5–1,8 begrenzt. Eine Phasenkorrektur zieht die Schläge der Aufnahme auf deine Schläge.
4. **Aufhören**: Kommt zwei Sekunden lang kein Schlag, wird das Orchester langsamer und verstummt. Zwei Schläge, und es geht an derselben Stelle weiter.

Die Partitur oben zeigt:
- die Takte;
- die Anweisungen (*Accelerando*, *Ritardando*, *pp* bis *ff*, Crescendo-Gabeln, „Fermate – halten!“ und Bemerkungen zum Stück);
- die Zielkurve des Tempos (gold gestrichelt) und dein Tempo (dunkel);
- als helles Band die Lautheit der Originalaufnahme.

Bei einer Fermate hört man auf zu schlagen. Das Orchester hält und wartet am
Ende der Fermate auf den Abschlag.

### Wertung

- **Zielkurve**: Tempo und Lautheitshüllkurve der Originalaufnahme. Bewertet wird pro Schlag das Tempo über die letzten drei Schläge, im Gesten- und Handymodus auch die Dynamik.
- **Stimmung**: Drei Leisten für Streicher, Holz und Blech. Sie sinken bei unruhigen Schlägen und bei großer Abweichung von der Zielkurve:
  - Streicher reagieren vor allem auf Unruhe,
  - Holz auf falsche Dynamik,
  - Blech auf Schleppen (und beim Radetzky auf einen Saal, der aus dem Takt klatscht).
- **Hörbare Folgen schlechter Stimmung**: Tiefpass, Leiern (moduliertes Delay), Kiekser im Horn, quietschende Klarinetten, im Extremfall kurze Aussetzer.
- **Publikum**:
  - zu langsam: Husten, Gähnen, Rascheln mit dem Programmheft;
  - gut: Applaus und Bravo-Rufe;
  - miserabel: eine einzelne Person klatscht langsam.
- **Radetzky-Marsch**: Der Saal klatscht mit. Er folgt deinem Tempo mit Verzögerung und korrigiert nach Gehör. Abrupte Tempowechsel bringen Saal und Orchester auseinander.
- **Freies Spiel**: ohne Wertung. Gemessen wird nur das Höchsttempo, zum Beispiel für den Bergkönig auf 180 %.

## Die Stücke

| # | Stück | Aufnahme | Thema |
| --- | --- | --- | --- |
| 1 | Beethoven, 7. Sinfonie, 2. Satz | LSO, Weingartner, 1923/24 | Tutorial: ruhiger, stetiger Puls (Wertung bis zum Fortissimo, freies Spiel ganzer Satz) |
| 2 | Strauss (Vater), Radetzky-Marsch | US Marine Band, 1992 | Mitklatschendes Publikum |
| 3 | Brahms, Ungarischer Tanz Nr. 5 | Philadelphia Orchestra, Stokowski, 1917 | Ständige Tempowechsel, ein Schlag pro Takt |
| 4 | Grieg, In der Halle des Bergkönigs | Musopen Symphony, 2012 | Accelerando bis zum Kollaps, Fermaten am Schluss |

Quellen und Lizenzen stehen in [CREDITS.md](CREDITS.md).

## Beat-Maps

Pro Aufnahme gibt es eine JSON-Datei in `beatmaps/`:

```json
{
  "version": 1,
  "titel": "…",
  "takt": 2,
  "beats": [0.221, 0.964, 1.695],
  "takte": [0, 2, 4],
  "lautheit": [0.53, 0.41, 0.38],
  "fermaten": [151]
}
```

- `beats`: Zeitpunkte aller Schläge in Sekunden.
- `takte`: Indizes der Schläge, mit denen ein Takt beginnt.
- `lautheit`: RMS pro Schlag, auf 0–1 normiert (5. bis 97. Perzentil).
- `fermaten` (optional): Schläge, die gehalten werden. Ohne diese Angabe gilt jeder Schlag als Fermate, der mehr als 1,8-mal so lang ist wie seine Nachbarn.

### Erster Entwurf mit librosa

```bash
pip install librosa soundfile
python3 scripts/beatmap.py audio/grieg.mp3 --takt 2 --bpm 45 112 --sprung 8 -o beatmaps/grieg.json
```

Klassik ist rubato, ein globales Tempo hilft deshalb wenig. Das Skript schätzt
erst eine weich veränderliche Tempokurve (Tempogramm plus Viterbi) und sucht
dann die Schläge per dynamischer Programmierung entlang dieser Kurve.

- `--bpm` begrenzt den Tempobereich und legt damit die Schlagebene fest.
- `--sprung` regelt, wie sprunghaft das Tempo sein darf.

Die mitgelieferten Maps sind so entstanden:

```bash
python3 scripts/beatmap.py audio/beethoven7.mp3 --takt 2 --bpm 55 95 -o beatmaps/beethoven7.json
python3 scripts/beatmap.py audio/radetzky.mp3  --takt 2 --bpm 85 125 -o beatmaps/radetzky.json
python3 scripts/beatmap.py audio/brahms5.mp3   --takt 1 --bpm 36 100 --sprung 2 --fenster 5 -o beatmaps/brahms5.json
python3 scripts/beatmap.py audio/grieg.mp3     --takt 2 --bpm 45 112 --sprung 8 -o beatmaps/grieg.json
python3 scripts/korrektur.py beatmaps/grieg.json audio/grieg.mp3 --von 133 --bis 160 \
  --beats 133.13,133.74,134.30,135.20,136.15,139.12,140.07,143.00,143.94,144.88,145.65,146.40,148.29,149.56 \
  --fermaten 136.15,140.07,146.40
```

### Korrigieren

- **Im Spiel (Einmess-Modus)**: Die Aufnahme läuft, auf Wunsch auf 75 % oder 50 % verlangsamt. Du tippst mit der Leertaste mit, `T` markiert die nächste Eins. Ersetzt wird nur der Abschnitt, den du eingetippt hast. „Probehören mit Klick“ spielt die Aufnahme mit einem Klick auf jedem Schlag. Gespeichert wird im Browser; als JSON heruntergeladen landet die Map in `beatmaps/`.
- **Von Hand**: mit `scripts/korrektur.py` (siehe oben) oder direkt in der JSON-Datei.

## Eigene Stücke

Eine Audiodatei auf die Startseite ziehen. Sie bleibt im Browser (IndexedDB)
und wird nirgends hochgeladen. Den ersten Entwurf der Beat-Map rechnet
`js/autokarte.js` direkt im Browser:
- spektraler Fluss als Einsatzkurve,
- Tempo per Autokorrelation,
- Schläge per dynamischer Programmierung.

Für Klassik ist dieser Entwurf oft ungenau. Danach also einmal einmessen.

## Aufbereitung der Aufnahmen

```bash
# Schellack (Beethoven, Brahms): mono, entknacksen, entrauschen, Band begrenzen, normalisieren
ffmpeg -i quelle.flac -ac 1 -ar 44100 \
  -af "adeclick=w=55:o=75:a=2:t=2,highpass=f=55,lowpass=f=6500,afftdn=nr=14:nf=-38:tn=1" klar.wav
ffmpeg -i klar.wav -af "volume=<Spitze auf -1 dB>" -c:a libmp3lame -b:a 96k audio/beethoven7.mp3
# Moderne Aufnahmen (Radetzky, Grieg): nur Pegel, 128 kbit/s
```

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html`, `style.css` | Seite und Gestaltung |
| `js/main.js` | Oberfläche: Programm, Bühne, Kritik, Dialoge |
| `js/dirigent.js` | Kernschleife: Schläge → Tempo, Position, Wiedergabegeschwindigkeit; Wertung, Stimmung, Publikum, Mitklatschen |
| `js/karte.js` | Beat-Map: Position ↔ Zeit, Originaltempo, Fermaten, Partitur-Hinweise |
| `js/eingabe.js` | Tippen, Gesten, DeviceMotion |
| `js/klang.js` | Web Audio: Dynamik, Tiefpass, Leiern, Aussetzer; synthetisierter Saal |
| `js/partitur.js` | Partitur-Streifen mit Zielkurven |
| `js/orchester.js` | Orchester im Halbkreis (SVG) |
| `js/kritik.js` | Zeitungskritik |
| `js/einmessen.js` | Einmess-Modus |
| `js/autokarte.js` | Beat-Map-Entwurf im Browser |
| `js/speicher.js` | Bestwerte, Einstellungen, eigene Stücke |
| `scripts/beatmap.py`, `scripts/korrektur.py` | Beat-Maps mit librosa |
| `audio/`, `beatmaps/` | Aufnahmen und Beat-Maps |
