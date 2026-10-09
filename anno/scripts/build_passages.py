#!/usr/bin/env python3
"""ANNO – Vorverarbeitung des DTA-Kernkorpus.

Liest das Kernkorpus des Deutschen Textarchivs (TEI-P5, als ZIP oder Ordner)
und, falls vorhanden, die normalisierten Reintext-Fassungen des DTA. Schreibt

    data/passages.json             Index: alle Werke mit Metadaten
    data/passages/<werk>.json      Passagen eines Werks

Jede Passage enthält den Originaltext (Absätze), einen einzelnen Satz für
NMPZ, bis zu zwei Kontextschritte davor und danach (für „Moving“) und, wenn
das DTA eine normalisierte Fassung liefert, dieselben Teile in moderner
Schreibung.

    python3 scripts/build_passages.py --download
    python3 scripts/build_passages.py --tei pfad/kernkorpus.zip --norm pfad/normalized.zip

Absätze sind Strings (Verszeilen mit \\n getrennt) oder Objekte:
    {"sp": "Daja.", "t": "Er iſt es! …"}   Rede in einem Drama
    {"st": "(Scene: Flur in Nathans Hauſe.)"}  Regieanweisung als eigener Absatz
Regieanweisungen innerhalb einer Rede stehen in ⟨…⟩.
"""

import argparse
import collections
import functools
import io
import json
import multiprocessing as mp
import os
import random
import re
import sys
import time
import unicodedata
import urllib.request
import zipfile
from difflib import SequenceMatcher

from lxml import etree

TEI_URL = 'https://www.deutschestextarchiv.de/media/download/dta_kernkorpus_2026-02-10.zip'
NORM_URL = 'https://www.deutschestextarchiv.de/media/download/dtak/2020-10-23/normalized/gesamt.zip'
SEITE_URL = 'https://www.deutschestextarchiv.de/book/view/{id}?p={seite}'

JAHR_MIN, JAHR_MAX = 1600, 1900
MIN_W, MAX_W = 80, 150          # Wörter pro Passage
CTX_MIN, CTX_MAX, CTX_EINZEL = 40, 150, 220   # Wörter pro Kontextschritt
CTX_SCHRITTE = 2                # Kontextschritte je Richtung
SATZ_MIN, SATZ_MAX = 12, 60     # Wörter für den NMPZ-Satz
DF_ANTEIL = 0.015               # Titelwort gilt als verräterisch, wenn es in höchstens so vielen Werken vorkommt

NS = {'t': 'http://www.tei-c.org/ns/1.0'}
T = '{http://www.tei-c.org/ns/1.0}'

# Interne Markierungen im Text eines Blocks (Private Use Area)
LB = '\ue000'                   # Zeilenumbruch im Druck
PB0, PB1 = '\ue001', '\ue002'   # Seitenwechsel: PB0 + Faksimile-Nr. + PB1
VL = '\ue003'                   # Ende einer Verszeile
LUECKE = '\ue004'               # Lücke (gap, Formel, Tabelle im Absatz)
NOTE = '\ue005'                 # Stelle einer entfernten Fußnote
SP0, SP1 = '\ue010', '\ue011'   # Sprecher
ST0, ST1 = '\ue012', '\ue013'   # Regieanweisung
MARKEN = SP0 + SP1 + ST0 + ST1

WORT = re.compile(r'(?:[^\W_]|[\u0300-\u036f])+')
ROEMISCH = re.compile(r'\b(M{1,2}[CDLXVI]{1,12})\b')

# --------------------------------------------------------------------------
# Falten von Wörtern

_FALT = str.maketrans({'ſ': 's', 'ꝛ': 'r', 'ß': 's', 'æ': 'ae', 'œ': 'oe', 'Æ': 'Ae', 'Œ': 'Oe',
                       'ʒ': 'z', 'ȝ': 'z', 'ı': 'i', 'ł': 'l'})


@functools.lru_cache(maxsize=1 << 18)
def ohne_zeichen(w):
    """ſ→s, Diakritika weg, Groß-/Kleinschreibung bleibt."""
    w = unicodedata.normalize('NFD', w.translate(_FALT))
    return ''.join(c for c in w if not unicodedata.combining(c))


@functools.lru_cache(maxsize=1 << 18)
def skelett(w):
    """Für die Suche nach Autornamen: ohne Diakritika, ae/oe/ue → a/o/u."""
    w = ohne_zeichen(w)
    return re.sub(r'([AOUaou])e', r'\1', w)


@functools.lru_cache(maxsize=1 << 18)
def klein(w):
    return skelett(w).lower()


_ANGL = [('sch', '\x01'), ('ch', '\x02'), ('ph', 'f'), ('th', 't'), ('dt', 't'), ('ck', 'k'),
         ('c', 'k'), ('\x01', 'sch'), ('\x02', 'ch'), ('y', 'i'), ('j', 'i'), ('v', 'u'),
         ('ie', 'i'), ('tz', 'z')]


@functools.lru_cache(maxsize=1 << 18)
def angleichen(w):
    """Aggressives Falten für den Abgleich Original ↔ normalisierte Fassung."""
    w = klein(w)
    for a, b in _ANGL:
        w = w.replace(a, b)
    w = re.sub(r'(?<=[aeiou])h', '', w)
    w = re.sub(r'(.)\1+', r'\1', w)
    return w


@functools.lru_cache(maxsize=1 << 18)
def stamm(w):
    for s in ('ens', 'es', 'en', 's', 'e', 'n'):
        if w.endswith(s) and len(w) - len(s) >= 4:
            return w[:-len(s)]
    return w


STOPP = set('''und oder der die das des dem den ein eine einer eines einem einen von vom zum zur
zu im in am an auf aus bey bei mit nach nebst samt sammt sambt uber uber fur durch wie auch
als so welche welcher welches deren dessen nicht noch nur sowie theil teil band buch erster
erste zweyter zweiter dritter vierter neue neuer neues neu alte alten sein seine seiner ihre
ihrer unter wider gegen sich seyn sein ist sind wird werden oder was wer'''.split())

# --------------------------------------------------------------------------
# Lesen von ZIP oder Ordner


class Quelle:
    def __init__(self, pfad, endung):
        self.pfad, self.endung, self._zip = pfad, endung, None
        self.namen = {}
        if os.path.isfile(pfad):
            with zipfile.ZipFile(pfad) as z:
                for n in z.namelist():
                    if n.endswith(endung):
                        self.namen[os.path.basename(n)[:-len(endung)]] = n
        else:
            for wurzel, _, dateien in os.walk(pfad):
                for f in dateien:
                    if f.endswith(endung):
                        self.namen[f[:-len(endung)]] = os.path.join(wurzel, f)

    def __contains__(self, k):
        return k in self.namen

    def oeffnen(self, k):
        if os.path.isfile(self.pfad):
            if self._zip is None:
                self._zip = zipfile.ZipFile(self.pfad)
            return self._zip.open(self.namen[k])
        return open(self.namen[k], 'rb')

    def lesen(self, k):
        with self.oeffnen(k) as f:
            return f.read()

    def __getstate__(self):
        d = dict(self.__dict__)
        d['_zip'] = None
        return d


# --------------------------------------------------------------------------
# Metadaten


def _txt(e):
    return ' '.join(''.join(e.itertext()).split()) if e is not None else ''


def metadaten(h):
    bf = h.find('t:fileDesc/t:sourceDesc/t:biblFull', NS)
    titel = _txt(bf.find('t:titleStmt/t:title[@type="main"]', NS))
    unter = _txt(bf.find('t:titleStmt/t:title[@type="sub"]', NS))
    autoren, namen = [], []
    for p in bf.iterfind('t:titleStmt/t:author/t:persName', NS):
        sn = _txt(p.find('t:surname', NS))
        fn = _txt(p.find('t:forename', NS))
        gen = _txt(p.find('t:genName', NS))
        rolle = _txt(p.find('t:roleName', NS))
        zusatz = _txt(p.find('t:addName', NS))
        gnd = p.get('ref')
        if sn in ('N. N.', 'NN', 'N. N', 'Anonym', 'o. A.', ''):
            if fn:
                name = ' '.join(x for x in (fn, gen) if x) + (f', {rolle}' if rolle else '')
                autoren.append({'name': name, 'gnd': gnd, 'alias': []})
            continue
        fuerst = fuerstenname(sn, fn)
        if '<' in sn:
            autoren.append({'name': fuerst or re.sub(r'\s*<(.*?)>', r' (\1)', sn), 'gnd': gnd, 'alias': []})
            continue
        alias = []
        if zusatz and '<' not in zusatz:
            teile = [t.strip() for t in zusatz.split(',')]
            alias.append(' '.join(reversed(teile)) if len(teile) == 2 else zusatz)
        autoren.append({'name': fuerst or f'{fn} {sn}'.strip(), 'gnd': gnd, 'alias': alias})
        namen.append(sn)
        if zusatz:
            namen.append(zusatz.split(',')[0].strip())
    autor = ' / '.join(dict.fromkeys(a['name'] for a in autoren)) or 'Anonym'
    pub = bf.find('t:publicationStmt', NS)
    jahr = int(_txt(pub.find('t:date[@type="publication"]', NS))[:4])
    ort = _txt(pub.find('t:pubPlace', NS))
    ed = bf.find('t:editionStmt/t:edition', NS)
    auflage = int(ed.get('n')) if ed is not None and (ed.get('n') or '').isdigit() else None
    idno = {i.get('type'): (i.text or '').strip() for i in h.iterfind('t:fileDesc/t:publicationStmt/t:idno/t:idno', NS)}
    klassen = collections.defaultdict(list)
    for c in h.iterfind('t:profileDesc/t:textClass/t:classCode', NS):
        klassen[c.get('scheme', '').rsplit('#', 1)[-1]].append((c.text or '').strip())
    gattung = (klassen.get('dwds1main') or klassen.get('dtamain') or ['?'])[0]
    if gattung == 'Fachtext':
        gattung = 'Wissenschaft'
    unterg = (klassen.get('dtasub') or klassen.get('dwds1sub') or [''])[0]
    lizenz = h.find('t:fileDesc/t:publicationStmt/t:availability/t:licence', NS)
    hinweis = ''
    if auflage and auflage > 1:
        hinweis = _txt(bf.find('t:notesStmt/t:note[@type="remarkSource"]', NS))
        hinweis = re.sub(r'\s*\((vgl\.|siehe|Link)[^)]*\)', '', hinweis)
        hinweis = re.sub(r'\s*https?://\S+', '', hinweis).strip()
    return {
        'id': idno.get('DTADirName'),
        'autor': autor,
        'titel': titel,
        'untertitel': unter,
        'jahr': jahr,
        'ort': ort,
        'auflage': auflage,
        'gattung': gattung,
        'untergattung': unterg,
        'url': idno.get('URLWeb') or f"https://www.deutschestextarchiv.de/{idno.get('DTADirName')}",
        'lizenz': lizenz.get('target') if lizenz is not None else None,
        'hinweis': hinweis,
        '_namen': namen,
        '_autoren': autoren,
    }


TITEL = {'Herzog', 'Herzogin', 'König', 'Königin', 'Kurfürst', 'Markgraf', 'Fürst', 'Fürstin', 'Graf', 'Gräfin',
         'Kaiser', 'Kaiserin', 'Landgraf', 'Woiwode', 'Prinz', 'Prinzessin', 'Bischof', 'Erzbischof'}
ORDNUNG = re.compile(r'^[IVXL]+\.$')
FUERSTEN_SONDERFALL = {'Leopold Römisch-Deutsches Reich': 'Leopold I., römisch-deutscher Kaiser'}


def fuerstenname(sn, fn):
    """Regierende Fürsten einheitlich als „Name Ordnungszahl, Titel von Land“.

    Das DTA verteilt diese Namen unterschiedlich auf surname und forename,
    z. B. „<Württemberg, Herzog>“ + „Eberhard Ludwig“, „Preußen, König“ +
    „Friedrich I.“ oder „Rudolf-August Braunschweig-Lüneburg“ + „Herzog“."""
    if sn in FUERSTEN_SONDERFALL:
        return FUERSTEN_SONDERFALL[sn]
    m = re.match(r'^(.*?)\s*<(.*)>$', sn)
    if m:
        teile = [t.strip() for t in m.group(2).split(',')]
        name = ' '.join(x for x in [fn, m.group(1)] + [t for t in teile if ORDNUNG.match(t)] if x)
        titel = [t for t in teile if t in TITEL]
        land = [t for t in teile if t not in TITEL and not ORDNUNG.match(t)]
        if titel:
            return f"{name}, {titel[0]}" + (f" von {', '.join(land)}" if land else '')
        return None
    woerter = fn.replace(';', ' ').replace(',', ' ').split()
    if woerter and woerter[0] in TITEL and len(sn.split()) >= 2:
        *vorname, land = sn.split()
        ordnung = [w for w in woerter[1:] if ORDNUNG.match(w)]
        return f"{' '.join(vorname + ordnung)}, {woerter[0]} von {land}"
    m = re.match(r'^(.+),\s*(\w+)$', sn)
    if m and m.group(2) in TITEL and fn:
        return f'{fn}, {m.group(2)} von {m.group(1)}'
    m = re.match(r'^(\w+) von (.+)$', sn)
    if m and m.group(1) in TITEL and fn:
        return f'{fn}, {sn}'
    return None


def kopf_lesen(quelle, k):
    with quelle.oeffnen(k) as f:
        for _, h in etree.iterparse(f, events=('end',), tag=T + 'teiHeader', huge_tree=True):
            return metadaten(h)


def titelwoerter(titel):
    return [klein(w) for w in WORT.findall(titel) if len(klein(w)) >= 4 and klein(w) not in STOPP]


# --------------------------------------------------------------------------
# Haupttext → Abschnitte → Blöcke

AUSGESCHLOSSENE_DIVS = {'index', 'bibliography', 'contents', 'dedication', 'preface', 'imprint',
                        'corrigenda', 'advertisement', 'frontispiece', 'postface', 'copyright',
                        'imprimatur', 'figures', 'abbreviations'}
# Überschriften unmarkierter Abschnitte, die ganz wegfallen
VERZEICHNIS_KOPF = re.compile(
    r'^\W*(register|inhalt|innhalt|verzeichni|druckfehler|errata|index|verbesserung|anzeige|verlagsanzeige|'
    r'subscribenten|pranumeranten)', re.I)
# Überschriften von Vorreden: Der Abschnitt fällt bis zum ersten Einschnitt weg
# (milestone, Unterabschnitt). Manche Drucke sind so kodiert, dass das ganze
# Werk im Abschnitt „Vorbericht“ steckt.
VORREDE_KOPF = re.compile(
    r'^\W*(vorrede|vorbericht|vorerinnerung|vorwort|vorrete|zuschrift|zueignung|widmung|dedica|'
    r'nachrede|nachwort|nachschrift|an den (\w+ )*leser|an die leser|'
    r'(geneigter|gunstiger|lieber|christlicher|hochgeehrter) leser|praefatio|prooemium|epistola|zum geleit)', re.I)
# Elemente, deren Inhalt nie in eine Passage kommt; außerhalb eines Absatzes trennen sie den Text
TRENNEN = {'head', 'castList', 'titlePage', 'trailer', 'closer', 'opener', 'dateline', 'salute',
           'signed', 'argument', 'epigraph', 'listBibl', 'postscript', 'byline',
           'docImprint', 'docTitle', 'docAuthor', 'docDate', 'imprimatur', 'front', 'back'}
AUSLASSEN = {'note', 'fw', 'figDesc', 'sic', 'reg', 'expan', 'del', 'speaker', 'figure'}


class Leser:
    def __init__(self):
        self.abschnitte, self.akt = [], []
        self.buf = None
        self.seite = 0
        self.sprecher = None
        self.fortsetzen = False

    # --- Blöcke
    def flush(self):
        if self.buf is not None:
            b = block_fertig(self.buf)
            if b:
                self.akt.append(b)
            self.buf = None
        self.fortsetzen = False

    def trenn(self):
        self.flush()
        if self.akt:
            self.abschnitte.append(self.akt)
            self.akt = []

    def oeffne(self, art):
        if self.fortsetzen and self.buf is not None:
            self.fortsetzen = False
            return
        self.flush()
        self.buf = {'art': art, 'teile': [], 'seite': self.seite}
        if self.sprecher and art != 'st':
            self.buf['teile'].append(f'{SP0}{self.sprecher}{SP1} ')
            self.sprecher = None

    def text(self, t):
        if not t:
            return
        if self.buf is None:
            if not t.strip():
                return
            self.oeffne('p')
        self.buf['teile'].append(t)

    def marke(self, m):
        if self.buf is not None:
            self.buf['teile'].append(m)

    # --- Baum
    def kinder(self, el):
        self.text(el.text)
        for c in el:
            self.knoten(c)
            self.text(c.tail)

    def ueberspringen(self, el):
        """Inhalt auslassen, aber Seitenwechsel darin mitzählen."""
        if not isinstance(el.tag, str):
            return
        for pb in el.iter(T + 'pb'):
            m = re.search(r'(\d+)', pb.get('facs') or '')
            if m:
                self.seite = int(m.group(1))
                self.marke(f'{PB0}{self.seite}{PB1}')

    def knoten(self, el):
        if not isinstance(el.tag, str):
            return
        tag = el.tag[len(T):] if el.tag.startswith(T) else el.tag
        drin = self.buf is not None
        if tag in ('lb', 'cb'):
            self.marke(LB)
        elif tag == 'pb':
            m = re.search(r'(\d+)', el.get('facs') or '')
            if m:
                self.seite = int(m.group(1))
                self.marke(f'{PB0}{self.seite}{PB1}')
        elif tag == 'space':
            self.marke(' ')
        elif tag in ('gap', 'formula', 'table'):
            if drin:
                self.marke(LUECKE)
            else:
                self.trenn()
        elif tag == 'milestone':
            if not drin:
                self.trenn()
        elif tag in AUSLASSEN:
            if tag == 'note':
                self.marke(NOTE)
            self.ueberspringen(el)
        elif tag in TRENNEN:
            if not drin:
                self.trenn()
            self.ueberspringen(el)
        elif tag == 'choice':
            kinder = {c.tag[len(T):]: c for c in el if isinstance(c.tag, str)}
            for wahl in ('corr', 'orig', 'abbr', 'seg'):
                if wahl in kinder:
                    self.kinder(kinder[wahl])
                    break
            else:
                for c in el:
                    if isinstance(c.tag, str):
                        self.kinder(c)
                        break
        elif tag in ('div', 'body', 'text', 'group', 'floatingText'):
            self.trenn()
            kopf = _txt(el.find('t:head', NS)) if tag == 'div' else ''
            if tag == 'div' and (el.get('type') in AUSGESCHLOSSENE_DIVS or VERZEICHNIS_KOPF.search(klein(kopf))):
                self.ueberspringen(el)
            elif tag == 'div' and VORREDE_KOPF.search(klein(kopf)):
                weiter = False
                for c in el:
                    ctag = c.tag[len(T):] if isinstance(c.tag, str) and c.tag.startswith(T) else ''
                    weiter = weiter or ctag in ('milestone', 'div', 'floatingText')
                    if weiter:
                        self.knoten(c)
                        self.text(c.tail)
                    else:
                        self.ueberspringen(c)
            else:
                self.kinder(el)
            self.trenn()
        elif tag in ('p', 'item', 'ab'):
            if drin and not self.fortsetzen:
                self.kinder(el)
            else:
                self.oeffne('p')
                self.kinder(el)
                self.flush()
        elif tag == 'lg':
            if drin and not self.fortsetzen:
                self.kinder(el)
            elif el.find('t:lg', NS) is not None:
                self.kinder(el)
            else:
                self.oeffne('v')
                self.kinder(el)
                self.flush()
        elif tag == 'l':
            if not drin:
                self.oeffne('v')
            self.kinder(el)
            self.marke(VL)
        elif tag == 'sp':
            self.flush()
            sp = el.find('t:speaker', NS)
            self.sprecher = ' '.join(''.join(sp.itertext()).split()) if sp is not None else None
            self.kinder(el)
            self.flush()
            self.sprecher = None
        elif tag == 'stage':
            if drin:
                self.marke(ST0)
                self.kinder(el)
                self.marke(ST1)
            elif self.sprecher:
                self.oeffne('p')
                self.marke(ST0)
                self.kinder(el)
                self.marke(ST1)
                self.fortsetzen = True
            else:
                self.oeffne('st')
                self.marke(ST0)
                self.kinder(el)
                self.marke(ST1)
                self.flush()
        elif tag in ('list', 'spGrp'):
            self.kinder(el)
        else:
            self.kinder(el)


TRENN_RE = re.compile(
    r'(?<=[^\W\d_]|[\u0300-\u036f])([-¬=])((?:\s|' + LB + '|' + PB0 + r'\d+' + PB1 + r')*' + LB +
    r'(?:\s|' + LB + '|' + PB0 + r'\d+' + PB1 + r')*)((?:[^\W_]|[\u0300-\u036f])*)')
BINDEWOERTER = {'und', 'oder', 'bis', 'u', 'od', 'vnd', 'vnnd', 'als', 'noch', 'wie', 'sowie', 'resp', 'zu', 'auch'}


def _trennung(m):
    zeichen, luecke, wort = m.groups()
    seiten = ''.join(re.findall(PB0 + r'\d+' + PB1, luecke))
    if not wort:
        return ('-' if zeichen == '¬' else zeichen) + seiten + ' '
    if wort[0].islower():
        if ohne_zeichen(wort).lower() in BINDEWOERTER:
            return '- ' + seiten + wort
        return wort + seiten
    if zeichen == '=' and not wort[0].isupper():
        return m.group(0)
    return '-' + seiten + wort


def _verdichten(s):
    s = re.sub(r'[^\S\n]+', ' ', s)
    s = re.sub(r' *\n\s*', '\n', s)
    return s.lstrip()


def _ist_vers(s):
    """Verse, die als Absatz mit Zeilenumbrüchen kodiert sind (z. B. Versdramen):
    mindestens vier Zeilen, keine Silbentrennung, fast alle Zeilen beginnen groß und
    viele enden mit einem Satzzeichen (in Prosa endet kaum eine Zeile so)."""
    zeilen = [re.sub(PB0 + r'\d+' + PB1 + '|[' + MARKEN + ']', '', z).strip()
              for z in s.split(LB)]
    zeilen = [z for z in zeilen if WORT.search(z)]
    if len(zeilen) < 4:
        return False
    gross = sum(1 for z in zeilen if z.lstrip('„"‚\'»«([‟—–- ')[:1].isupper())
    ende = sum(1 for z in zeilen[:-1] if re.search(r'[,.;:!?/—–)\]“"\'’]$', z))
    if len(zeilen) >= 6 and gross == len(zeilen):
        return ende >= 0.25 * (len(zeilen) - 1)
    return gross >= 0.85 * len(zeilen) and ende >= 0.4 * (len(zeilen) - 1)


def block_fertig(buf):
    s = re.sub(r'\s+', ' ', ''.join(buf['teile'])).replace('\ufffc', LUECKE)   # U+FFFC: nicht darstellbares Zeichen
    # Fußnotenzeichen weg, ohne Leerraum vor dem Satzzeichen zu hinterlassen („Ausgaben .“)
    s = re.sub(r'[\s' + LB + ']*' + NOTE + r'+[\s' + LB + r']*(?=[.,;:!?)\]])', '', s).replace(NOTE, '')
    s, trennungen = TRENN_RE.subn(_trennung, s)
    if buf['art'] != 'v' and trennungen == 0 and _ist_vers(s):
        s = s.replace(LB, VL)
    s = s.replace(LB, ' ').replace(VL, '\n').replace(ST0 + ST1, '')
    stuecke = re.split(PB0 + r'(\d+)' + PB1, s)
    texte, seiten = stuecke[0::2], [int(x) for x in stuecke[1::2]]
    anker = [(len(_verdichten(''.join(texte[:i + 1]))), f) for i, f in enumerate(seiten)]
    text = _verdichten(''.join(texte)).rstrip()
    if not WORT.search(re.sub('[' + MARKEN + ']', '', text)):
        return None
    return {'text': text, 'anker': anker, 'seite': buf['seite'], 'art': buf['art'],
            'saetze': saetze(text)}


ABK = set('''d u z b s v vgl bzw hr hrn fr st nr no num cap kap c pag p tom lib vid dr mag cf conf sc
scil cfr ibid ib fol art n lit sect ca etc rc resp ders dgl desgl ff f sq sqq seqq jun sen sel sr
ew hochw gn kgl konigl kaiserl churf furstl hochfurstl durchl evang luth christl geb gest ev geh chr
a o pp gr thlr rthlr fl kr pf pfd ctr lat griech franz engl ital ebend ebds hl heil cap gl sl
majest mai maj excell exc em ehrw wohlehrw hochwohlgeb wohlgeb gebr allerh ff bl bll anm vers
tit tab fig ex ed edit pag col vol mr mad mons msc mss viz hrsg herausg uebers ubers ders dies
dergl sog sogen bes ggf inkl excl incl ca dgl usf usw ff mlle mme rev'''.split())
SATZENDE = re.compile(r'[.!?…]+[\"\'’”“»«‟〟)\]' + ST1 + r']*(\s+)')


def _abkuerzung(text, pos):
    """Steht vor dem Punkt an pos eine Abkürzung, eine Zahl oder eine Initiale?"""
    if text[pos] != '.':
        return False
    m = re.search(r'((?:[^\W_]|[\u0300-\u036f])+)$', text[max(0, pos - 40):pos])
    if not m:
        return False
    w = m.group(1)
    if w.isdigit() or len(ohne_zeichen(w)) == 1:
        return True
    if re.fullmatch(r'[IVXLCDM]+', w):
        return True
    return ohne_zeichen(w).lower() in ABK


def saetze(text):
    """Zerlegt einen Block in Satzspannen (a, b)."""
    grenzen = [0]
    for m in SATZENDE.finditer(text):
        nach = m.end()
        rest = text[nach:nach + 4].lstrip('„"‚\'»«(‟〟[' + SP0 + ST0)
        if not rest or not rest[0].isupper():
            continue
        if _abkuerzung(text, m.start()):
            continue
        grenzen.append(nach)
    grenzen.append(len(text))
    spannen = []
    for a, b in zip(grenzen, grenzen[1:]):
        while a < b and text[a].isspace():
            a += 1
        while b > a and text[b - 1].isspace():
            b -= 1
        if b > a:
            spannen.append((a, b))
    return spannen


def woerter(s):
    return len(WORT.findall(s))


# --------------------------------------------------------------------------
# Verräter


class Pruefer:
    def __init__(self, meta, verraeter_titel):
        self.jahr = meta['jahr']
        self.namen = []
        for n in meta['_namen']:
            teile = [skelett(x) for x in WORT.findall(n)]
            if teile:
                self.namen.append(teile)
            if len(teile) > 1:   # „Jung-Stilling“, „Ziegler und Kliphausen“: jeder Teil für sich
                self.namen += [[t] for t in teile if len(t) >= 4 and t.lower() not in ('und', 'genannt')]
        tw = titelwoerter(meta['titel'])
        self.titel_folge = tw if len(tw) >= 2 else None
        self.titel_alle = {stamm(w) for w in (klein(x) for x in WORT.findall(meta['titel'])) if len(w) >= 3 and w not in STOPP}
        self.titel_stamm = [stamm(w) for w in tw if stamm(w) in verraeter_titel]

    @staticmethod
    def _passt(tok, s):
        return tok == s or (tok.startswith(s) and len(tok) - len(s) <= 3 and len(s) >= 4)

    def verraet(self, text):
        """Gibt einen Grund zurück, wenn der Text Autor, Titel oder Jahr verrät."""
        sprecher = re.findall(SP0 + '(.*?)' + SP1, text)
        rein = re.sub('[' + MARKEN + '⟨⟩]', ' ', text)
        for m in re.finditer(r'(?<!\d)(1[4-9]\d\d)(?!\d)', rein):
            if abs(int(m.group(1)) - self.jahr) <= 5:
                return 'jahr'
        for m in ROEMISCH.finditer(rein):
            z = roemisch(m.group(1))
            if z and abs(z - self.jahr) <= 5:
                return 'jahr'
        toks = [skelett(w) for w in WORT.findall(rein)]
        for teile in self.namen:
            n = len(teile)
            for i in range(len(toks) - n + 1):
                if all(toks[i + k] == teile[k] for k in range(n - 1)) and self._passt(toks[i + n - 1], teile[-1]):
                    return 'autor'
        kl = [t.lower() for t in toks]
        if self.titel_folge:
            n = len(self.titel_folge)
            inhalt = [w for w in kl if len(w) >= 4 and w not in STOPP]
            for i in range(len(inhalt) - n + 1):
                if inhalt[i:i + n] == self.titel_folge:
                    return 'titel'
        for s in self.titel_stamm:
            if any(self._passt(t, s) or (len(s) >= 5 and s in t) for t in kl):   # auch in Komposita: „Urhinkel“
                return 'titel'
        for sp in sprecher:
            for w in WORT.findall(sp):
                w = stamm(klein(w))
                if len(w) >= 3 and any(t == w or (len(w) >= 4 and t.startswith(w)) for t in self.titel_alle):
                    return 'sprecher'
        return None


def roemisch(s):
    werte = {'M': 1000, 'D': 500, 'C': 100, 'L': 50, 'X': 10, 'V': 5, 'I': 1}
    z, vor = 0, 0
    for c in reversed(s):
        v = werte[c]
        z = z - v if v < vor else z + v
        vor = max(vor, v)
    return z if 1000 <= z <= 2000 else None


# --------------------------------------------------------------------------
# Passagen auswählen


def satz_text(block, a, b):
    return block['text'][a:b]


class Werk:
    def __init__(self, abschnitte):
        self.abschnitte = abschnitte
        self.flach = []           # je Abschnitt: Liste (block_idx, satz_idx, wörter, lücke)
        for ab in abschnitte:
            fl = []
            for bi, bl in enumerate(ab):
                for si, (a, b) in enumerate(bl['saetze']):
                    s = bl['text'][a:b]
                    fl.append((bi, si, woerter(s), LUECKE in s))
            self.flach.append(fl)
        self.woerter = sum(x[2] for fl in self.flach for x in fl)
        self.gruende = collections.Counter()

    def teil(self, ab, k0, k1):
        """Absätze für die Sätze k0..k1-1 eines Abschnitts (mit internen Marken)."""
        fl, abs_ = self.flach[ab], self.abschnitte[ab]
        absaetze, akt_block, a0, b0 = [], None, None, None
        for k in range(k0, k1):
            bi, si = fl[k][0], fl[k][1]
            a, b = abs_[bi]['saetze'][si]
            if bi != akt_block:
                if akt_block is not None:
                    absaetze.append(abs_[akt_block]['text'][a0:b0])
                akt_block, a0 = bi, a
            b0 = b
        if akt_block is not None:
            absaetze.append(abs_[akt_block]['text'][a0:b0])
        return absaetze

    def seite(self, ab, k):
        bi, si = self.flach[ab][k][0], self.flach[ab][k][1]
        bl = self.abschnitte[ab][bi]
        a = bl['saetze'][si][0]
        s = bl['seite']
        for pos, f in bl['anker']:
            if pos <= a:
                s = f
        return s

    def kontext(self, ab, k0, k1, richtung, pruefer):
        """Bis zu CTX_SCHRITTE Schritte vor (richtung=-1) oder nach (+1) der Passage."""
        fl = self.flach[ab]
        schritte = []
        grenze = k0 if richtung < 0 else k1   # erster nicht gezeigter Satz (vorwärts) bzw. erster gezeigter (rückwärts)
        for _ in range(CTX_SCHRITTE):
            ks, summe = [], 0
            k = grenze - 1 if richtung < 0 else grenze
            while 0 <= k < len(fl):
                bi, _si, w, luecke = fl[k]
                if luecke:
                    break
                if ks and summe >= CTX_MIN and bi != fl[ks[-1]][0]:
                    break
                if summe + w > CTX_MAX and not (not ks and w <= CTX_EINZEL):
                    break
                ks.append(k)
                summe += w
                k += richtung
            if not ks:
                break
            lo, hi = min(ks), max(ks) + 1
            text = self.teil(ab, lo, hi)
            if pruefer.verraet('\n'.join(text)):
                break
            if richtung < 0:
                klebt = fl[hi - 1][0] == fl[grenze][0]
                grenze = lo
            else:
                klebt = fl[lo][0] == fl[grenze - 1][0]
                grenze = hi
            schritte.append({'text': text, 'klebt': klebt})
        return schritte

    def kandidat(self, ab, k0, pruefer):
        fl = self.flach[ab]
        summe, k = 0, k0
        while k < len(fl) and summe < MIN_W:
            if fl[k][3]:
                return None
            summe += fl[k][2]
            k += 1
        if summe < MIN_W or summe > MAX_W:
            return None
        text = self.teil(ab, k0, k)
        rein = re.sub('[' + MARKEN + '⟨⟩]', ' ', ' '.join(text))
        buchst = sum(c.isalpha() for c in rein)
        zeichen = sum(not c.isspace() for c in rein)
        if zeichen == 0 or buchst / zeichen < 0.8:
            return None
        if sum(c.isdigit() for c in rein) > 0.04 * zeichen:
            return None
        # Listen (Reimwörter, Pflanzennamen, Register): viele sehr kurze Absätze außerhalb von Dramen
        kurz = [woerter(a) for a in text if not a.startswith(SP0)]
        if len(kurz) >= 6 and sum(kurz) / len(kurz) < 6:
            self.gruende['liste'] += 1
            return None
        grund = pruefer.verraet('\n'.join(text))
        if grund:
            self.gruende[grund] += 1
            return None
        return (ab, k0, k, text)


def auswaehlen(werk, pruefer, rng, ziel):
    """Wählt bis zu `ziel` sich nicht überschneidende Passagen, über das Werk verteilt."""
    alle = [(ab, k) for ab, fl in enumerate(werk.flach) for k in range(len(fl))]
    if not alle:
        return []
    belegt = set()
    gewaehlt = []
    schichten = [alle[i * len(alle) // ziel:(i + 1) * len(alle) // ziel] for i in range(ziel)]

    def versuchen(kandidaten, max_versuche):
        rng.shuffle(kandidaten)
        for ab, k in kandidaten[:max_versuche]:
            if (ab, k) in belegt:
                continue
            c = werk.kandidat(ab, k, pruefer)
            if not c:
                continue
            _, k0, k1, _ = c
            if any((ab, j) in belegt for j in range(k0, k1)):
                continue
            for j in range(k0, k1):
                belegt.add((ab, j))
            return c
        return None

    for sch in schichten:
        c = versuchen(list(sch), 400)
        if c:
            gewaehlt.append(c)
    versuche = 0
    while len(gewaehlt) < ziel and versuche < 3:
        c = versuchen(list(alle), 3000)
        if not c:
            versuche += 1
            continue
        gewaehlt.append(c)
    gewaehlt.sort(key=lambda c: (c[0], c[1]))
    return gewaehlt


def nmpz_satz(werk, ab, k0, k1, rng):
    fl = werk.flach[ab]
    kand = []
    for k in range(k0, k1):
        w = fl[k][2]
        kand.append((abs(w - 25) if SATZ_MIN <= w <= SATZ_MAX else 1000 + abs(w - 25), k))
    kand.sort()
    gut = [k for d, k in kand if d < 1000][:3]
    return rng.choice(gut) if gut else kand[0][1]


# --------------------------------------------------------------------------
# Normalisierte Fassung


class Normtext:
    def __init__(self, text):
        self.text = text.replace('_', ' ')
        self.w = [(m.start(), m.end()) for m in WORT.finditer(self.text)]
        self.f = [angleichen(self.text[a:b]) for a, b in self.w]
        idx = collections.defaultdict(list)
        for j in range(len(self.f) - 2):
            idx[(self.f[j], self.f[j + 1], self.f[j + 2])].append(j)
        self.tri = {k: v for k, v in idx.items() if len(v) <= 20}

    def vor(self, j):
        """Präfix (öffnende Zeichen) des Worts j."""
        start = self.w[j - 1][1] if j > 0 else 0
        luecke = self.text[start:self.w[j][0]]
        m = re.search(r'\s', luecke[::-1])
        return luecke[len(luecke) - m.start():] if m else ''

    def nach(self, j):
        ende = self.w[j + 1][0] if j + 1 < len(self.w) else len(self.text)
        luecke = self.text[self.w[j][1]:ende]
        m = re.search(r'\s', luecke[::-1])
        if m:
            luecke = luecke[:len(luecke) - m.start()]
        return re.sub(r'\s+', ' ', luecke)

    def stueck(self, j):
        a, b = self.w[j]
        return self.vor(j) + self.text[a:b] + self.nach(j)


def original_token(teile):
    """teile: Liste von (teil_id, [absätze]). Liefert die Wörter mit den Ereignissen davor.

    brk: 2 = neuer Absatz, 1 = neue Verszeile; auf/zu: Marken, die vor dem Wort
    geöffnet bzw. geschlossen werden; zu_nach: Marken am Ende des Absatzes."""
    toks = []
    for tid, absaetze in teile:
        for ai, ab in enumerate(absaetze):
            auf, zu, brk, im_sp = [], [], (2 if ai > 0 else 0), False
            for m in re.finditer(r'(?:[^\W_]|[\u0300-\u036f])+|[' + MARKEN + r'\n]', ab):
                x = m.group(0)
                if x in (SP0, ST0):
                    auf.append(x)
                    im_sp = im_sp or x == SP0
                elif x in (SP1, ST1):
                    zu.append(x)
                    im_sp = im_sp and x != SP1
                elif x == '\n':
                    brk = max(brk, 1)
                else:
                    toks.append({'w': x, 'teil': tid, 'brk': brk, 'auf': auf, 'zu': zu, 'zu_nach': [],
                                 'satz': False, 'sp': im_sp, 'pos': m.start(), 'abs': ai})
                    auf, zu, brk = [], [], 0
            if zu and toks:
                toks[-1]['zu_nach'] = zu
    return toks


def modern_typo(w):
    w = w.replace('ſ', 's').replace('ꝛ', 'r')
    w = re.sub(r'([aouAOU])\u0364', lambda m: m.group(1) + '\u0308', w)
    return unicodedata.normalize('NFC', w)


def angleichen_teile(norm, toks):
    """Richtet die Original-Wörter an der normalisierten Fassung des DTA aus.

    Liefert {teil_id: [absätze], 'satz': str} in normalisierter Schreibung, nur
    für Teile mit ausreichender Übereinstimmung."""
    if norm is None or len(toks) < 10:
        return {}
    of = [angleichen(t['w']) for t in toks]
    stimmen, versaetze = collections.Counter(), []
    for i in range(len(of) - 2):
        for j in norm.tri.get((of[i], of[i + 1], of[i + 2]), ()):
            stimmen[(j - i) // 20] += 1
            versaetze.append(j - i)
    if not stimmen:
        return {}
    fach, anzahl = stimmen.most_common(1)[0]
    if anzahl < 3:
        return {}
    nah = sorted(d for d in versaetze if abs(d // 20 - fach) <= 1)
    d = nah[len(nah) // 2]
    lo, hi = max(0, d - 40), min(len(norm.w), d + len(of) + 40)
    if hi - lo < 10:
        return {}

    # Abbildung: (orig_index, 'n', norm_index) oder (orig_index, 'o', Ersatztext)
    abbild, gleich, fehlt = [], collections.Counter(), collections.Counter()
    n_orig = len(of)
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, of, norm.f[lo:hi], autojunk=False).get_opcodes():
        j1, j2 = j1 + lo, j2 + lo
        if tag == 'equal':
            for k in range(i2 - i1):
                abbild.append((i1 + k, 'n', j1 + k))
                gleich[toks[i1 + k]['teil']] += 1
        elif tag == 'replace':
            ni, nj = i2 - i1, j2 - j1
            if i1 == 0 and nj > ni:            # Rand des Suchfensters
                j1, nj = j2 - ni, ni
            elif i2 == n_orig and nj > ni:
                j2, nj = j1 + ni, ni
            if nj > ni + 3:                     # vermutlich eingeschobene Fußnote o. Ä.
                for k in range(i1, i2):
                    abbild.append((k, 'o', modern_typo(toks[k]['w'])))
                    fehlt[toks[k]['teil']] += 1
                continue
            for k in range(nj):
                abbild.append((i1 + (k * ni) // nj, 'n', j1 + k))
        elif tag == 'insert':
            if 0 < i1 < n_orig and j2 - j1 <= 3:
                for k in range(j1, j2):
                    abbild.append((i1 - 1, 'n', k))
        elif tag == 'delete':
            for k in range(i1, i2):
                abbild.append((k, 'o', modern_typo(toks[k]['w'])))
                fehlt[toks[k]['teil']] += 1
    abbild.sort(key=lambda x: (x[0], x[1] == 'o', x[2] if x[1] == 'n' else 0))

    anzahl_teil = collections.Counter(t['teil'] for t in toks)
    gut = {tid for tid, n in anzahl_teil.items() if gleich[tid] >= 0.35 * n and fehlt[tid] <= 0.15 * n}

    aus = collections.defaultdict(str)
    satz = ''
    vorher, akt = -1, None
    for oi, art, x in abbild:
        t = toks[oi]
        if oi > vorher:
            bereich = toks[vorher + 1:oi + 1]
            if akt is None or t['teil'] != akt:
                if akt is not None:
                    aus[akt] = aus[akt].rstrip() + ''.join(toks[vorher]['zu_nach'])
                akt = t['teil']
                aus[akt] += ''.join(m for b in bereich if b['teil'] == akt for m in b['auf'])
            else:
                s = aus[akt]
                zu = toks[vorher]['zu_nach'] + [m for b in bereich for m in b['zu']]
                brk = max(b['brk'] for b in bereich)
                if brk or zu:
                    s = s.rstrip() + ''.join(zu) + ('\n\n' if brk == 2 else '\n' if brk == 1 else ' ')
                aus[akt] = s + ''.join(m for b in bereich for m in b['auf'])
            vorher = oi
        stueck = norm.stueck(x) if art == 'n' else x + ' '
        aus[akt] += stueck
        if t['satz']:
            satz += stueck
    if akt is not None:
        aus[akt] = aus[akt].rstrip() + ''.join(toks[vorher]['zu_nach'])

    ergebnis = {tid: [nachbessern(a) for a in s.strip().split('\n\n')] for tid, s in aus.items() if tid in gut}
    if 'p' in ergebnis and satz.strip():
        ergebnis['satz'] = nachbessern(satz.strip())
    return ergebnis


def nachbessern(s):
    """Typografie der normalisierten Fassung: „…“, Gedankenstrich, Virgel → Komma."""
    s = re.sub(r'[ \t]+', ' ', s).strip()
    s = s.replace(' --', ' –').replace('--', '–')
    s = re.sub(r"(?<=[^\W\d_]e)'(?=[\s,.;:!?]|$)", '', s)
    s = re.sub(r'(?<=[^\W\d_]) (?=[.,;:!?](?! ?\.))', '', s)   # Reintext: Leerzeichen, wo eine Fußnote stand
    s = re.sub(r'(?<=[^\W\d_])/(?=\s)', ',', s)
    s = re.sub(r'\s+/\s+', ', ', s)
    aus, auf = [], True
    for i, c in enumerate(s):
        if c == '"':
            vor = s[i - 1] if i else ' '
            if vor.isspace() or vor in '(' + SP0 + SP1 + ST0 + '\n' or i == 0:
                aus.append('„')
            else:
                aus.append('“')
        else:
            aus.append(c)
    return ''.join(aus)


# --------------------------------------------------------------------------
# Ausgabeformat


def absatz_json(s):
    s = s.strip()
    if s.startswith(SP0) and SP1 in s:
        sp, rest = s[1:].split(SP1, 1)
        return {'sp': sp.strip(), 't': inline(rest.strip())}
    if s.startswith(ST0) and s.endswith(ST1) and s.count(ST0) == 1:
        return {'st': s[1:-1].strip()}
    return inline(s)


def inline(s):
    s = s.replace(ST0, '⟨').replace(ST1, '⟩').replace(SP0, '').replace(SP1, '')
    return re.sub(r'[ \t]+', ' ', s).strip()


def satz_json(s):
    if s.startswith(SP0) and SP1 in s:
        s = s.split(SP1, 1)[1]
    return inline(s)


# --------------------------------------------------------------------------
# Ein Werk verarbeiten

_quellen = {}


def werk_verarbeiten(args):
    k, tei, norm, meta, verraeter, seed = args
    rng = random.Random(f'{seed}:{k}')
    daten = tei.lesen(k)
    wurzel = etree.fromstring(daten, etree.XMLParser(huge_tree=True, remove_comments=True))
    text = wurzel.find('t:text', NS)
    leser = Leser()
    for teil in text:
        tag = teil.tag[len(T):] if isinstance(teil.tag, str) else ''
        if tag == 'body':
            leser.knoten(teil)
        elif tag == 'group':
            leser.knoten(teil)
    leser.trenn()
    werk = Werk(leser.abschnitte)
    pruefer = Pruefer(meta, verraeter)
    ziel = 10 + round(5 * min(1, max(0, (werk.woerter - 20000) / 180000)))
    gewaehlt = auswaehlen(werk, pruefer, rng, ziel)

    normtext = None
    if norm is not None and k in norm:
        try:
            normtext = Normtext(norm.lesen(k).decode('utf-8'))
        except Exception:
            normtext = None

    passagen, statistik = [], collections.Counter()
    for ab, k0, k1, absaetze in gewaehlt:
        vor = werk.kontext(ab, k0, k1, -1, pruefer)
        nach = werk.kontext(ab, k0, k1, +1, pruefer)
        ks = nmpz_satz(werk, ab, k0, k1, rng)
        satz = werk.teil(ab, ks, ks + 1)[0]
        p = {
            'seite': werk.seite(ab, k0),
            'woerter': sum(werk.flach[ab][j][2] for j in range(k0, k1)),
            'text': [absatz_json(a) for a in absaetze],
            'satz': satz_json(satz),
            'vor': [{'text': [absatz_json(a) for a in s['text']], 'klebt': s['klebt']} for s in vor],
            'nach': [{'text': [absatz_json(a) for a in s['text']], 'klebt': s['klebt']} for s in nach],
        }
        # Normalisierte Fassung
        teile = [(f'v{i}', s['text']) for i, s in reversed(list(enumerate(vor)))]
        teile.append(('p', absaetze))
        teile += [(f'n{i}', s['text']) for i, s in enumerate(nach)]
        toks = original_token(teile)
        # NMPZ-Satz markieren
        satz_abs = satz_lage(werk, ab, k0, ks)
        for t in toks:
            if t['teil'] == 'p' and not t['sp'] and t['abs'] == satz_abs[0] and satz_abs[1] <= t['pos'] < satz_abs[2]:
                t['satz'] = True
        n = angleichen_teile(normtext, toks)
        if 'p' in n and 'satz' in n and not pruefer.verraet('\n'.join(n['p'])):
            nv = []
            for i in range(len(vor)):
                if f'v{i}' not in n:
                    break
                nv.append([absatz_json(a) for a in n[f'v{i}']])
            nn = []
            for i in range(len(nach)):
                if f'n{i}' not in n:
                    break
                nn.append([absatz_json(a) for a in n[f'n{i}']])
            p['norm'] = {'text': [absatz_json(a) for a in n['p']], 'satz': satz_json(n['satz']),
                         'vor': nv, 'nach': nn}
            statistik['norm'] += 1
        else:
            p['norm'] = None
        statistik['passagen'] += 1
        passagen.append(p)
    statistik.update({f'abgelehnt_{g}': n for g, n in werk.gruende.items()})
    return k, passagen, werk.woerter, statistik


def satz_lage(werk, ab, k0, ks):
    """(absatz_index_in_passage, start, ende) des NMPZ-Satzes im Passagentext."""
    fl = werk.flach[ab]
    ai, akt = -1, None
    erster_a = None
    for k in range(k0, ks + 1):
        bi = fl[k][0]
        if bi != akt:
            ai += 1
            akt = bi
            erster_a = werk.abschnitte[ab][bi]['saetze'][fl[k][1]][0]
    bl = werk.abschnitte[ab][fl[ks][0]]
    a, b = bl['saetze'][fl[ks][1]]
    return ai, a - erster_a, b - erster_a


# --------------------------------------------------------------------------
# Vorlauf: wie verbreitet sind die Titelwörter im Korpus?

_TAG = re.compile(r'<[^>]+>')


def titel_df_werk(args):
    k, tei, stamm_menge = args
    s = tei.lesen(k).decode('utf-8')
    s = s[s.find('</teiHeader>'):]
    s = re.sub(r'[-¬]\s*<lb/>\s*', '', s)
    s = _TAG.sub(' ', s)
    gefunden = set()
    for w in set(WORT.findall(s)):
        st = stamm(klein(w))
        if st in stamm_menge:
            gefunden.add(st)
    return gefunden


# --------------------------------------------------------------------------


def laden(url, ziel):
    if os.path.exists(ziel):
        return ziel
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    print(f'Lade {url} …', file=sys.stderr)
    tmp = ziel + '.part'
    with urllib.request.urlopen(url) as r, open(tmp, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    os.replace(tmp, ziel)
    return ziel


def main():
    hier = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tei', help='DTA-Kernkorpus (ZIP oder Ordner mit *.TEI-P5.xml)')
    ap.add_argument('--norm', help='Normalisierte Reintexte des DTA (ZIP oder Ordner mit *.txt)')
    ap.add_argument('--download', action='store_true', help='beide Archive vom DTA laden (ca. 700 MB)')
    ap.add_argument('--cache', default=os.path.join(hier, '_dta'), help='Ordner für die Downloads')
    ap.add_argument('--out', default=os.path.join(hier, '..', 'data'))
    ap.add_argument('--seed', default='anno-1')
    ap.add_argument('--nur', nargs='*', help='nur diese Werke (DTA-Kürzel), zum Testen')
    ap.add_argument('--limit', type=int, help='nur die ersten N Werke, zum Testen')
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 2)
    ap.add_argument('--nur-metadaten', action='store_true',
                    help='nur Metadaten und Index neu schreiben, Passagen unverändert lassen')
    a = ap.parse_args()

    if a.download:
        a.tei = a.tei or laden(TEI_URL, os.path.join(a.cache, 'dta_kernkorpus.zip'))
        a.norm = a.norm or laden(NORM_URL, os.path.join(a.cache, 'dta_normalisiert.zip'))
    if not a.tei:
        ap.error('--tei oder --download angeben')
    tei = Quelle(a.tei, '.TEI-P5.xml')
    norm = Quelle(a.norm, '.txt') if a.norm else None
    schluessel = sorted(tei.namen)
    if a.nur:
        schluessel = [k for k in schluessel if k in set(a.nur)]
    if a.limit:
        schluessel = schluessel[:a.limit]
    t0 = time.time()

    # 1. Metadaten
    metas = {}
    for k in sorted(tei.namen):
        m = kopf_lesen(tei, k)
        if JAHR_MIN <= m['jahr'] <= JAHR_MAX:
            metas[k] = m
    schluessel = [k for k in schluessel if k in metas]
    print(f'{len(metas)} Werke {JAHR_MIN}–{JAHR_MAX} ({time.time() - t0:.0f} s)', file=sys.stderr)

    os.makedirs(os.path.join(a.out, 'passages'), exist_ok=True)
    personen = autorentabelle(metas)
    if a.nur_metadaten:
        metadaten_erneuern(a.out, metas, personen, t0)
        return

    # 2. Verbreitung der Titelwörter im ganzen Korpus
    alle_staemme = {stamm(w) for m in metas.values() for w in titelwoerter(m['titel'])}
    df = collections.Counter()
    with mp.Pool(a.jobs) as pool:
        for gef in pool.imap_unordered(titel_df_werk, [(k, tei, alle_staemme) for k in metas], chunksize=8):
            df.update(gef)
    grenze = max(3, int(DF_ANTEIL * len(metas)))
    verraeter = {s for s in alle_staemme if df[s] <= grenze}
    print(f'{len(verraeter)} von {len(alle_staemme)} Titelwörtern gelten als verräterisch '
          f'(in ≤ {grenze} Werken) ({time.time() - t0:.0f} s)', file=sys.stderr)

    # 3. Passagen
    statistik = collections.Counter()
    jobs = [(k, tei, norm, metas[k], verraeter, a.seed) for k in schluessel]
    with mp.Pool(a.jobs) as pool:
        for i, (k, passagen, nw, st) in enumerate(pool.imap_unordered(werk_verarbeiten, jobs, chunksize=2)):
            statistik.update(st)
            if (i + 1) % 100 == 0:
                print(f'  {i + 1}/{len(jobs)} ({time.time() - t0:.0f} s)', file=sys.stderr)
            if not passagen:
                statistik['ohne_passagen'] += 1
                continue
            werk = werk_metadaten(metas[k], personen)
            werk['passagen'] = passagen
            with open(os.path.join(a.out, 'passages', f'{k}.json'), 'w', encoding='utf-8') as f:
                json.dump(werk, f, ensure_ascii=False, separators=(',', ':'))
    index = index_schreiben(a.out, metas, personen)
    print(f"Fertig: {len(index)} Werke, {statistik['passagen']} Passagen, davon {statistik['norm']} "
          f"mit normalisierter Fassung; {statistik['ohne_passagen']} Werke ohne Passage "
          f'({time.time() - t0:.0f} s)', file=sys.stderr)
    print('Verworfene Kandidaten: ' + ', '.join(f'{k[10:]} {v}' for k, v in sorted(statistik.items())
                                              if k.startswith('abgelehnt_')), file=sys.stderr)


def _schluessel(person):
    return person['gnd'] or 'name:' + person['name']


def autorentabelle(metas):
    """Eine Zeile je Person (über die GND-Nummer zusammengeführt), mit dem
    häufigsten Namen als Anzeigenamen und den übrigen Schreibungen als Alias."""
    namen = collections.defaultdict(collections.Counter)
    alias = collections.defaultdict(set)
    for m in metas.values():
        for p in m['_autoren']:
            namen[_schluessel(p)][p['name']] += 1
            alias[_schluessel(p)].update(p['alias'])
    personen = {}
    for k, zaehler in namen.items():
        name = sorted(zaehler.items(), key=lambda x: (-x[1], -len(x[0])))[0][0]
        personen[k] = {'name': name, 'alias': sorted((set(zaehler) | alias[k]) - {name})}
    personen['anonym'] = {'name': 'Anonym', 'alias': []}
    return personen


def werk_metadaten(meta, personen):
    m = {x: y for x, y in meta.items() if not x.startswith('_')}
    schluessel = [_schluessel(p) for p in meta['_autoren']] or ['anonym']
    m['autor'] = ' / '.join(dict.fromkeys(personen[k]['name'] for k in schluessel))
    return m


def kanon_lesen():
    """Namen aus scripts/kanon.txt (bekannte Autoren), ohne Kommentare und Leerzeilen."""
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kanon.txt')
    if not os.path.exists(pfad):
        return set()
    with open(pfad, encoding='utf-8') as f:
        return {z.strip() for z in f if z.strip() and not z.lstrip().startswith('#')}


def index_schreiben(out, metas, personen):
    """Schreibt data/passages.json aus den vorhandenen Werkdateien."""
    tabelle = sorted(personen, key=lambda k: klein(personen[k]['name']))
    nummer = {k: i for i, k in enumerate(tabelle)}
    index = []
    for k, meta in metas.items():
        pfad = os.path.join(out, 'passages', f'{k}.json')
        if not os.path.exists(pfad):
            continue
        with open(pfad, encoding='utf-8') as f:
            passagen = json.load(f)['passagen']
        m = werk_metadaten(meta, personen)
        eintrag = {x: m[x] for x in ('id', 'autor', 'titel', 'jahr', 'gattung', 'untergattung')}
        eintrag['a'] = [nummer[_schluessel(p)] for p in meta['_autoren']] or [nummer['anonym']]
        eintrag['n'] = len(passagen)
        eintrag['norm'] = sum(1 for p in passagen if p['norm'])
        index.append(eintrag)
    index.sort(key=lambda e: (e['jahr'], e['id']))
    benutzt = {i for e in index for i in e['a']}
    kanon = kanon_lesen()
    gefunden = set()
    autoren = []
    for i, k in enumerate(tabelle):
        p = personen[k]
        autoren.append({'name': p['name'], 'alias': p['alias']} if p['alias'] else {'name': p['name']})
        if i not in benutzt:
            autoren[-1]['ohne_passage'] = True
        treffer = kanon & ({p['name']} | set(p['alias']))
        if treffer:
            autoren[-1]['bekannt'] = True
            gefunden |= treffer
    if kanon - gefunden:
        print('kanon.txt: nicht im Korpus: ' + ', '.join(sorted(kanon - gefunden)), file=sys.stderr)
    gesamt = {
        'version': 2,
        'erzeugt': time.strftime('%Y-%m-%d'),
        'quelle': {
            'name': 'Deutsches Textarchiv, Kernkorpus',
            'url': 'https://www.deutschestextarchiv.de/',
            'download': TEI_URL,
            'normalisiert': NORM_URL,
            'lizenz': 'CC BY-SA 4.0',
            'lizenz_url': 'https://creativecommons.org/licenses/by-sa/4.0/deed.de',
            'seite': SEITE_URL,
        },
        'autoren': autoren,
        'werke': index,
    }
    with open(os.path.join(out, 'passages.json'), 'w', encoding='utf-8') as f:
        json.dump(gesamt, f, ensure_ascii=False, separators=(',', ':'))
    return index


def metadaten_erneuern(out, metas, personen, t0):
    """Nur Metadaten in den vorhandenen Werkdateien und den Index neu schreiben;
    die Auswahl der Passagen bleibt unverändert."""
    n = 0
    for k, meta in metas.items():
        pfad = os.path.join(out, 'passages', f'{k}.json')
        if not os.path.exists(pfad):
            continue
        with open(pfad, encoding='utf-8') as f:
            werk = json.load(f)
        neu = werk_metadaten(meta, personen)
        neu['passagen'] = werk['passagen']
        with open(pfad, 'w', encoding='utf-8') as f:
            json.dump(neu, f, ensure_ascii=False, separators=(',', ':'))
        n += 1
    index = index_schreiben(out, metas, personen)
    print(f'Metadaten von {n} Werken erneuert, Index mit {len(index)} Werken ({time.time() - t0:.0f} s)',
          file=sys.stderr)

if __name__ == '__main__':
    main()
