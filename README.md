# Besetzung

Ein Ensemble-Roguelite für den Browser. Du leitest das Ensemble der Oper
Leipzig durch eine Spielzeit: Wer singt die Tosca, wer schont die Stimme für
die Wagner-Festtage, wer springt ein, wenn der Tenor um 19:12 Uhr absagt?

Reines HTML, CSS und JavaScript (ES-Module). Kein Framework, kein Build-Schritt.

## Spielen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Auf dem Handy lässt es sich zum Home-Bildschirm hinzufügen und läuft dann auch
offline.

## So geht’s

Eine Spielzeit hat acht Wochen mit je zwei Vorstellungen, danach das
Saisonfinale (in Leipzig die Wagner-Festtage). Sinkt der Ruf auf null, beruft
dich der Stadtrat ab.

- **Spielplan:** Jede Woche wählst du zwei von drei Opern. Farbpunkte an den
  Fächern zeigen, ob dein Ensemble sie abdeckt.
- **Besetzung:** Für jede Rolle eine Stimme. Vor dem Abend siehst du pro Rolle,
  was sie bringt, wie viel Stimme sie kostet und wie hoch das Kiekser-Risiko ist.
- **Vorstellung:** Kurz vor Beginn kann jemand absagen – Einspringer aus dem
  Ensemble, Gast einfliegen oder „singt trotzdem“. Die Summe gegen das Ziel
  entscheidet über Buhrufe, Bravi oder Standing Ovations.
- **Wochenende:** Kasse, ein Ereignis mit einer Entscheidung, Vorsingen und ein
  Angebot (Meisterkurs, Stimmkur, Unterricht).

### Was eine Stimme bringt

| Faktor | Wirkung |
| --- | --- |
| Sterne (1–5) | Grundwert 35 bis 85 |
| Gewicht der Rolle | Hauptpartie 100 %, Partie 60 %, Nebenpartie 30 % |
| Fach | eigenes ×1, Nachbarfach ×0,75, fachfremd ×0,35 (plus Kiekser-Risiko) |
| Stimme | 100 % → ×1, 0 % → ×0,55; unter 60 % steigt das Kiekser-Risiko |
| Anforderungen | Höhe, Koloratur, Tiefe, Spiel, Ausdauer: passende Eigenschaft +20 % |
| Stil | Mozart-, Verdi-, Wagnerstimme … im passenden Repertoire +20 % |
| Rollenkenntnis | +10 % je Wiederholung, bis +30 % |

Die vierzehn Fächer folgen dem deutschen Fachsystem, vereinfacht: Soubrette,
Koloratursopran, lyrischer, jugendlich-dramatischer und dramatischer Sopran,
Mezzo/Alt, Spiel-, lyrischer, jugendlicher Helden- und Heldentenor, lyrischer
Bariton, Helden-/Charakterbariton, seriöser Bass, Bassbuffo.

## Was drinsteckt

- **49 Opern** mit ihren Rollen, Fächern, Anforderungen und Belastung – von der
  Zauberflöte bis Peter Grimes, mit den Leipziger Uraufführungen von Lortzing
  und Weill
- **4 Häuser:** Oper Leipzig, Semperoper (Strauss-Tage), Wiener Staatsoper
  (Festwochen), Bayreuth (nur Wagner, am Ende der ganze Ring)
- **Kammersänger:** Nach einer überstandenen Spielzeit ernennst du eine Stimme;
  sie kehrt in späteren Spielzeiten manchmal als Gast zurück
- **Spielplan des Tages** mit festem Zufall, **Archiv** mit Rollenbuch über alle
  Spielzeiten
- Synthetisierter Klang: Gong, Applaus aus einzelnen Klatschern, Buhrufe, Blech

## Dateien

| Datei | Inhalt |
| --- | --- |
| `js/daten.js` | Fächer, Eigenschaften, Opern mit Rollen, Häuser, Namen |
| `js/spiel.js` | Spiellogik ohne DOM, mit eigenem Zufallsgenerator |
| `js/main.js` | Oberfläche |
| `js/audio.js` | Klang (Web Audio) |
| `js/speicher.js` | Spielstand und Archiv im Browser |
| `tools/sim.mjs` | Balance-Simulation (`node tools/sim.mjs leipzig 300`) |

Das Vorgängerspiel „Da capo!“ liegt in der Git-Historie dieses Branches.

Im Ordner [`taktstock/`](taktstock/) liegt außerdem **Taktstock**, ein Dirigierspiel mit echten Orchesteraufnahmen (eigenes README).
