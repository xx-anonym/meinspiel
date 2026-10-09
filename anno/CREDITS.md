# Quellen und Lizenzen

## Texte: Deutsches Textarchiv (DTA)

Alle Passagen in `data/` stammen aus dem **Kernkorpus des Deutschen Textarchivs**.

| | |
| --- | --- |
| Herausgeber | Berlin-Brandenburgische Akademie der Wissenschaften (BBAW), seit Projektende kuratiert im NFDI-Konsortium Text+ |
| Website | <https://www.deutschestextarchiv.de/> |
| Download-Seite | <https://www.deutschestextarchiv.de/download> |
| TEI-Fassung | DTA-Kernkorpus, Version vom 10. Februar 2026: <https://www.deutschestextarchiv.de/media/download/dta_kernkorpus_2026-02-10.zip> (1478 Texte, MD5 `5883b2cb334271c075e7143244206845`) |
| Normalisierte Fassung | DTA-Kernkorpus, Reintext „normalisiert“, Version vom 23. Oktober 2020: <https://www.deutschestextarchiv.de/media/download/dtak/2020-10-23/normalized/gesamt.zip> (MD5 `eab0a7d14fbcc88286930c60c561af8f`) |
| Lizenz | **CC BY-SA 4.0**, <https://creativecommons.org/licenses/by-sa/4.0/deed.de> |

Was die Download-Seite und die
[Nutzungsbedingungen](https://www.deutschestextarchiv.de/doku/nutzungsbedingungen)
dazu sagen (Stand Oktober 2026):

- Alle Inhalte der Download-Seite stehen, soweit nicht anders gekennzeichnet,
  unter CC BY-SA 4.0. Jede TEI-Datei trägt im `teiHeader` dieselbe Lizenz
  (`<licence target="https://creativecommons.org/licenses/by-sa/4.0/deed.de">`).
- Die Volltexte stehen seit dem 16. Juni 2020 unter CC BY-SA 4.0, vorher unter
  CC BY-NC 3.0. Wer die Texte weiterverwendet, muss in der Form „Deutsches
  Textarchiv“ auf das DTA als Urheber der elektronischen Fassung hinweisen.
- Die reine Textfassung eines Werks (ohne die Annotationen der XML- und
  HTML-Fassungen) kann nach den Nutzungsbedingungen „im Sinne der
  Gemeinfreiheit“ ohne Einschränkungen benutzt werden.
- Die Rechte an den Bilddigitalisaten (Faksimiles) liegen bei den besitzenden
  Bibliotheken. ANNO zeigt keine Faksimiles, sondern verlinkt nur auf die
  jeweilige Seite im DTA.

**Zitierempfehlung des DTA:** Deutsches Textarchiv. Grundlage für ein
Referenzkorpus der neuhochdeutschen Sprache. Herausgegeben von der
Berlin-Brandenburgischen Akademie der Wissenschaften, Berlin 2026.
URL: <https://www.deutschestextarchiv.de/>.

**Lizenz der abgeleiteten Daten:** `data/passages.json` und
`data/passages/*.json` sind Auszüge aus den DTA-Texten. Sie wurden
gekürzt, die Silbentrennung ist aufgelöst und die Auszeichnung entfernt.
Sie stehen wie die Vorlage unter **CC BY-SA 4.0**, Namensnennung
„Deutsches Textarchiv“. Jede Passage nennt Werk und Seite. Der Index
verweist auf die Quelle.

Die Metadaten (Autor, Titel, Erscheinungsjahr, Gattung) stammen aus den
`teiHeader`n der DTA-Dateien. Die Gattung folgt der DTA-Klassifikation
(Hauptkategorie `dwds1main`: Belletristik, Gebrauchsliteratur,
Wissenschaft; Untergattung `dtasub`).

## Musik

| Datei | Stück | Aufnahme | Lizenz |
| --- | --- | --- | --- |
| `musik/goldberg-aria.mp3` | J. S. Bach, Goldberg-Variationen BWV 988: Aria | Kimiko Ishizaka, *The Open Goldberg Variations* (2012) | CC0 1.0 |
| `musik/goldberg-var13.mp3` | Variatio 13 a 2 Clav. | ebenda | CC0 1.0 |
| `musik/goldberg-var21.mp3` | Variatio 21, Canone alla Settima | ebenda | CC0 1.0 |
| `musik/goldberg-var25.mp3` | Variatio 25 a 2 Clav. | ebenda | CC0 1.0 |

Quelle: <https://archive.org/details/OpenGoldbergVariations> (Lizenzangabe
<http://creativecommons.org/publicdomain/zero/1.0/>), Projektseite
<https://www.opengoldbergvariations.org/>. Die Aufnahmen wurden für ANNO mit
ffmpeg auf mono heruntergemischt, leicht komprimiert, auf etwa −23 LUFS
normalisiert, mit kurzen Ein- und Ausblendungen versehen und als MP3 (VBR)
neu kodiert. CC0 verlangt keine Namensnennung; sie steht hier trotzdem.

Alle übrigen Klänge erzeugt `klang.js` zur Laufzeit; sie haben keine Quelle.

## Schriften

Beide Schriften liegen in `fonts/` als Untermengen im Format WOFF2 (erzeugt
mit `scripts/schriften.py` aus den Dateien von Google Fonts).

| Schrift | Urheber | Lizenz |
| --- | --- | --- |
| EB Garamond (Regular, Italic, SemiBold) | Georg Duffner, Octavio Pardo; Copyright 2017 The EB Garamond Project Authors | SIL Open Font License 1.1, `fonts/OFL-EBGaramond.txt` |
| Cardo (Regular, Italic), nur für Zeichen, die EB Garamond fehlen | David J. Perry; Copyright 2002–2011 | SIL Open Font License 1.1, `fonts/OFL-Cardo.txt` |

Keine der beiden Schriften hat einen „Reserved Font Name“. Im CSS heißen die
Untermengen „Anno Garamond“ und „Anno Cardo“, damit der Browser sie nicht mit
lokal installierten Vollversionen verwechselt.
