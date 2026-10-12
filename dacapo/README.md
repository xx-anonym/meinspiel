# Da capo!

Ein Opern-Roguelike für den Browser. Du bist Intendant, stellst aus deinem
Repertoire Abend für Abend ein Programm zusammen und tourst von der Oper
Leipzig bis auf den Grünen Hügel. Am Ende jeder Spielzeit steht eine Kritik
im Stil eines OpernLog-Eintrags – und dann: noch einmal von vorn.

Die Mechanik ist von Balatro inspiriert, der Inhalt ist Oper: Die 121 Werke
stammen aus dem OpernLog-Katalog, mit echten Entstehungsjahren, Akten und
Sprachen.

Reines HTML, CSS und JavaScript (ES-Module). Kein Framework, kein Build-Schritt.

## Spielen

Lokal reicht ein beliebiger statischer Server:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Auf dem Handy lässt es sich zum Home-Bildschirm hinzufügen und läuft dann
auch offline (Service Worker).

## So geht's

- Du ziehst acht Werke. Wähle bis zu fünf und führe sie auf.
- **Applaus = Publikum × Begeisterung.** Das Programm liefert die Grundwerte,
  jedes gezählte Werk bringt seinen Ruhm als Publikum mit.
- Jede Station hat drei Abende: Premiere, Gala und Kritikerabend. Am
  Kritikerabend gilt eine Sonderregel („Der Purist: Werke nach 1900 zählen
  nicht“).
- **Standing Ovations:** Wer an einem Abend das Doppelte des Ziels holt, dem
  schreibt die Presse das Programm der besten Vorstellung eine Stufe hoch. Da
  der Abend mit dem Erreichen des Ziels endet, lohnt sich der große Wurf.
- Zwischen den Abenden geht es ins Foyer: Stars engagieren, Rezensionen
  kaufen, Werke proben, Pakete öffnen, investieren – und einmal pro Pause beim
  **Verlag** bestellen: Komponist wählen, eins von drei seiner Werke nehmen,
  zuerst solche, die noch fehlen. Fehlende Teile angefangener Sternstunden
  tauchen außerdem öfter auf.
- **Absagen:** Premiere und Gala dürfen ausfallen. Dann gibt es keine Gage
  und kein Foyer, aber einen **Gutschein**: ein Gratis-Paket, einen
  Talentscout, eine Uraufführung, einen besänftigten Kritiker … Welcher
  Gutschein wartet, steht schon auf dem Spielplan.
- **Post für die Intendanz:** Zu Beginn jeder neuen Station liegt ein Ereignis
  auf dem Schreibtisch – der Tenor ist heiser, im Fundus brennt es, die
  Staatsoper will deinen besten Star. Zwei oder drei Antworten, selten
  umsonst.
- Für volle Kassen gibt es dort das **Festspielhaus**: Jeder Bauabschnitt
  (Grundstein, Bühnenturm, Mystischer Abgrund …) multipliziert die
  Begeisterung jeder Vorstellung dauerhaft mit ×1,5 und kostet doppelt so viel
  wie der vorige – 25, 50, 100, 200 … Dukaten, ohne Obergrenze.

### Programme

| Programm | Bedingung | Grundwert |
| --- | --- | --- |
| Solo-Arie | kein Muster | 5 × 1 |
| Doppelabend | 2 Werke eines Komponisten | 10 × 2 |
| Zwei Doppelabende | 2 + 2 | 20 × 2 |
| Nationalabend | 5 Werke einer Schule | 30 × 3 |
| Komponistenabend | 3 Werke eines Komponisten | 40 × 3 |
| Zeitreise | 5 verschiedene Jahrzehnte innerhalb von sieben | 35 × 4 |
| Festspielwoche | 3 + 2 | 40 × 4 |
| Werkschau | 4 Werke eines Komponisten | 60 × 7 |
| Große Zeitreise | Zeitreise in einer Schule | 100 × 8 |
| Gesamtwerk | 5 Werke eines Komponisten | 120 × 12 |

Passen mehrere, spielt das Haus die stärkste Lesart.

## Was drinsteckt

- **121 Werke** von Monteverdi bis Muhly, in fünf Schulen (ITA, DEU, FRA, OST, ENG)
- **57 Stars** – Callas, Caruso, Toscanini, Karajan, Ludwig II., Cosima, Da Ponte,
  das Gewandhausorchester, das Leipziger Allerlei, das Silvester-Orakel, die
  Zweitbesetzung (kopiert ihren rechten Nachbarn) …
- **11 Gutscheine** fürs Absagen und **15 Ereignisse** zwischen den Stationen
- **16 Sternstunden** zum Entdecken: Ring, Trilogia popolare, Da-Ponte-Trilogie,
  Cav/Pag, Il trittico, „Uraufgeführt in Leipzig“ und mehr
- **17 Kritiker** plus zwei Finalgegner in Bayreuth
- **10 Rezensionen** (LVZ bis Deutschlandfunk Kultur), **11 Proben**, **9 Investitionen**
- **Das Festspielhaus** als Großprojekt ohne Ende, damit Dukaten nie wertlos werden
- **7 Startrepertoires** zum Freischalten – zuletzt die **Komische Oper** mit nur
  den 26 heiteren Werken – und **5 Strengestufen**
- **Spielplan des Tages**: ein Lauf mit festem Zufall, für alle gleich
- **Werkverzeichnis** über alle Läufe: gespielte Werke, Sternstunden, Stars, Statistik
- Endlos-Modus mit Gastspielen nach dem Sieg
- Synthetisierter Klang: Papagenos Panflöte für jedes gezählte Werk, Pauken für
  Faktoren, Applaus aus Rauschen, Buhrufe fürs Regietheater, eine Spieluhr-Musik

## Steuerung

| Aktion | Touch / Maus | Tastatur |
| --- | --- | --- |
| Werk wählen | antippen | `1`–`9` |
| Aufführen | Knopf | `Enter` |
| Umbesetzen | Knopf | `U` |
| Sortierung wechseln | Knopf | `S` |
| Werk-Details | lange drücken / Rechtsklick | – |
| Programme | Listen-Symbol | `P` |
| Menü / schließen | Menü-Symbol | `Esc` |

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Gerüst |
| `style.css` | Gestaltung (Samt, Gold, Programmzettel) |
| `js/data.js` | Kataloge: Werke, Programme, Stars, Kritiker, Häuser |
| `js/logic.js` | Spiellogik ohne DOM, mit eigenem Zufallsgenerator |
| `js/ereignisse.js` | Post für die Intendanz: Ereignisse und ihre Antworten |
| `js/main.js` | Oberfläche, Animationen, Eingabe |
| `js/audio.js` | Klang und Musik (Web Audio) |
| `js/fx.js` | Rosen, Goldstaub, Konfetti |
| `js/speicher.js` | Speicherstand im Browser |
| `tools/sim.mjs` | Balance-Simulation (`node tools/sim.mjs leipzig 100`, mit `ohne-haus` als drittem Argument baut der Bot kein Festspielhaus) |
