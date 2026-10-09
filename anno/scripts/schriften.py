#!/usr/bin/env python3
"""Erzeugt die Webschriften in fonts/ als Untermengen von EB Garamond und Cardo.

Die Schnitte kommen von Google Fonts (SIL Open Font License) und werden auf die
Zeichen reduziert, die in data/ und in der Oberfläche vorkommen. EB Garamond
ist die Hauptschrift. Aus Cardo kommen nur die Zeichen, die EB Garamond fehlt
(etwa das r rotunda ꝛ in „ꝛc.“).

EB Garamond enthält das kombinierende e (U+0364, das e über uͤ, aͤ, oͤ), aber
keine Anker dafür; der Browser setzt es dann rechts neben den Buchstaben.
Das Skript ergänzt deshalb eine Mark-to-Base-Positionierung, die das e dort
aufsetzt, wo auch das Trema (U+0308) sitzen würde.

Nach jedem Neuaufbau der Passagen ausführen:

    pip install fonttools brotli
    python3 scripts/schriften.py
"""

import glob
import io
import os
import re
import sys
import urllib.request

from fontTools import subset
from fontTools.otlLib import builder as otl
from fontTools.ttLib import TTFont

CSS = ('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400'
       '&family=Cardo:ital,wght@0,400;1,400')
SCHNITTE = {
    ('EB Garamond', 'normal', '400'): 'AnnoGaramond-Regular',
    ('EB Garamond', 'italic', '400'): 'AnnoGaramond-Italic',
    ('EB Garamond', 'normal', '600'): 'AnnoGaramond-SemiBold',
    ('Cardo', 'normal', '400'): 'AnnoCardo-Regular',
    ('Cardo', 'italic', '400'): 'AnnoCardo-Italic',
}
# Immer dabei: Grundzeichen der Oberfläche
BASIS = {chr(c) for c in range(0x20, 0x7f)} | {chr(c) for c in range(0xa0, 0x100)} | set('–—‘’‚“”„…·↗−×→←ſ')


def laden(url):
    with urllib.request.urlopen(url) as r:
        return r.read()


def schnitte():
    """Lädt die TrueType-Dateien der fünf Schnitte (URLs aus der Google-Fonts-CSS)."""
    css = laden(CSS).decode('utf-8')
    dateien = {}
    for block in re.findall(r'@font-face\s*{(.*?)}', css, re.S):
        fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        stil = re.search(r'font-style:\s*(\w+)', block).group(1)
        gew = re.search(r'font-weight:\s*(\d+)', block).group(1)
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        name = SCHNITTE.get((fam, stil, gew))
        if name:
            dateien[name] = laden(url)
    fehlt = set(SCHNITTE.values()) - set(dateien)
    if fehlt:
        sys.exit(f'Nicht gefunden: {", ".join(sorted(fehlt))}')
    return dateien


def zeichen_im_projekt(wurzel):
    z = set(BASIS)
    pfade = [os.path.join(wurzel, 'data', 'passages.json')]
    pfade += glob.glob(os.path.join(wurzel, 'data', 'passages', '*.json'))
    pfade += [os.path.join(wurzel, f) for f in ('index.html', 'app.js')]
    for p in pfade:
        with open(p, encoding='utf-8') as f:
            z |= set(f.read())
    return {c for c in z if c.isprintable() or c in '­'}


def e_anker(font):
    """Setzt U+0364 an die Anker des Tremas (mark-to-base, Feature 'mark')."""
    cmap = font.getBestCmap()
    e, trema = cmap.get(0x364), cmap.get(0x308)
    if not e or not trema or 'GPOS' not in font:
        return False
    gpos = font['GPOS'].table
    glyf = font['glyf']
    basen, marke = {}, None
    for lookup in gpos.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if type(st).__name__ != 'MarkBasePos' or trema not in st.MarkCoverage.glyphs:
                continue
            rec = st.MarkArray.MarkRecord[st.MarkCoverage.glyphs.index(trema)]
            marke = marke or rec.MarkAnchor
            for g, br in zip(st.BaseCoverage.glyphs, st.BaseArray.BaseRecord):
                anker = br.BaseAnchor[rec.Class]
                if anker is not None and g not in basen:
                    basen[g] = {0: otl.buildAnchor(anker.XCoordinate, anker.YCoordinate)}
    if not marke or not basen:
        return False
    # Großbuchstaben haben keinen Trema-Anker (dafür gibt es Ü, Ä, Ö); das e sitzt dort um
    # die Differenz von Versal- und x-Höhe höher.
    os2 = font['OS/2']
    hoch = marke.YCoordinate + os2.sCapHeight - os2.sxHeight
    for c in 'AEIOUWY':
        g = cmap.get(ord(c))
        if g and g not in basen:
            gl = glyf[g]
            gl.recalcBounds(glyf)
            basen[g] = {0: otl.buildAnchor(round((gl.xMin + gl.xMax) / 2), hoch)}

    def box(g):
        gl = glyf[g]
        gl.recalcBounds(glyf)
        return gl.xMin, gl.yMin, gl.xMax, gl.yMax

    tx0, ty0, tx1, _ = box(trema)
    ex0, ey0, ex1, _ = box(e)
    x = (ex0 + ex1) / 2 + (marke.XCoordinate - (tx0 + tx1) / 2)
    y = ey0 + (marke.YCoordinate - ty0)
    tabelle = otl.buildMarkBasePosSubtable({e: (0, otl.buildAnchor(round(x), round(y)))}, basen,
                                           font.getReverseGlyphMap())
    gpos.LookupList.Lookup.append(otl.buildLookup([tabelle]))
    gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
    nr = gpos.LookupList.LookupCount - 1
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'mark':
            fr.Feature.LookupListIndex.append(nr)
            fr.Feature.LookupCount = len(fr.Feature.LookupListIndex)
    return True


def untermenge(daten, zeichen, ziel):
    font = TTFont(io.BytesIO(daten))
    if 'Garamond' in ziel and e_anker(font):
        print(f'{os.path.basename(ziel)}: Anker für U+0364 ergänzt')
    cmap = font.getBestCmap()
    codes = sorted(ord(c) for c in zeichen if ord(c) in cmap)
    opt = subset.Options()
    opt.layout_features = ['*']
    opt.flavor = 'woff2'
    opt.name_IDs = ['*']
    opt.name_languages = ['*']
    opt.notdef_outline = True
    opt.glyph_names = False
    s = subset.Subsetter(opt)
    s.populate(unicodes=codes)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(ziel)
    return len(codes), os.path.getsize(ziel)


def main():
    wurzel = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    ausgabe = os.path.join(wurzel, 'fonts')
    os.makedirs(ausgabe, exist_ok=True)
    zeichen = zeichen_im_projekt(wurzel)
    dateien = schnitte()
    garamond = TTFont(io.BytesIO(dateien['AnnoGaramond-Regular'])).getBestCmap()
    ui = {c for c in zeichen if c in BASIS or ord(c) < 0x250}
    luecken = {c for c in zeichen if ord(c) not in garamond and not c.isspace()}
    plan = {
        'AnnoGaramond-Regular': zeichen,
        'AnnoGaramond-Italic': zeichen,
        'AnnoGaramond-SemiBold': ui,
        'AnnoCardo-Regular': luecken,
        'AnnoCardo-Italic': luecken,
    }
    for name, z in plan.items():
        n, groesse = untermenge(dateien[name], z, os.path.join(ausgabe, name + '.woff2'))
        print(f'{name}.woff2: {n} Zeichen, {groesse // 1024} KB')
    cardo = TTFont(io.BytesIO(dateien['AnnoCardo-Regular'])).getBestCmap()
    ohne = sorted(c for c in luecken if ord(c) not in cardo)
    if ohne:
        print('In keiner der beiden Schriften: ' + ' '.join(f'{c} (U+{ord(c):04X})' for c in ohne))


if __name__ == '__main__':
    main()
