#!/usr/bin/env python3
"""Zieht zufällige Passagen aus data/passages.json und gibt sie als Markdown aus.

    python3 scripts/stichproben.py 20 > STICHPROBEN.md
    python3 scripts/stichproben.py 5 --seed 7 --kontext --norm
"""

import argparse
import json
import os
import random


def absatz(a):
    if isinstance(a, str):
        return a
    if 'sp' in a:
        return f"*{a['sp']}* {a['t']}"
    return f"*{a['st']}*"


def block(absaetze, einzug='> '):
    zeilen = []
    for i, a in enumerate(absaetze):
        if i:
            zeilen.append(einzug.rstrip())
        for z in absatz(a).split('\n'):
            zeilen.append(einzug + z)
    return '\n'.join(zeilen)


def main():
    hier = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument('n', type=int, nargs='?', default=20)
    ap.add_argument('--daten', default=os.path.join(hier, '..', 'data'))
    ap.add_argument('--seed', default='stichprobe')
    ap.add_argument('--kontext', action='store_true', help='Kontextschritte mit ausgeben')
    ap.add_argument('--norm', action='store_true', help='normalisierte Fassung mit ausgeben')
    ap.add_argument('--werk', nargs='*', help='nur aus diesen Werken')
    a = ap.parse_args()

    index = json.load(open(os.path.join(a.daten, 'passages.json'), encoding='utf-8'))
    werke = index['werke']
    if a.werk:
        werke = [w for w in werke if w['id'] in a.werk]
    rng = random.Random(a.seed)
    paare = [(w, i) for w in werke for i in range(w['n'])]
    auswahl = rng.sample(paare, min(a.n, len(paare)))
    auswahl.sort(key=lambda p: p[0]['jahr'])
    seite_url = index['quelle']['seite']
    print(f"# Stichproben ({len(auswahl)} von {len(paare)} Passagen aus {len(werke)} Werken)\n")
    for nr, (w, i) in enumerate(auswahl, 1):
        werk = json.load(open(os.path.join(a.daten, 'passages', w['id'] + '.json'), encoding='utf-8'))
        p = werk['passagen'][i]
        gattung = werk['gattung'] + (f" / {werk['untergattung']}" if werk['untergattung'] else '')
        print(f"## {nr}. {werk['autor']}: {werk['titel']} ({werk['jahr']})\n")
        print(f"{gattung} · {p['woerter']} Wörter · "
              f"[Faksimile S. {p['seite']}]({seite_url.format(id=werk['id'], seite=p['seite'])})\n")
        if a.kontext:
            for k, s in reversed(list(enumerate(p['vor']))):
                print(f"*davor, Schritt {k + 1}{' (gleicher Absatz)' if s['klebt'] else ''}:*\n")
                print(block(s['text']) + '\n')
            print('*Passage:*\n')
        print(block(p['text']) + '\n')
        if a.kontext:
            for k, s in enumerate(p['nach']):
                print(f"*danach, Schritt {k + 1}{' (gleicher Absatz)' if s['klebt'] else ''}:*\n")
                print(block(s['text']) + '\n')
            print(f"*NMPZ-Satz:* {p['satz']}\n")
        if a.norm:
            if p['norm']:
                print('*Normalisiert:*\n')
                print(block(p['norm']['text']) + '\n')
                if a.kontext:
                    print(f"*NMPZ normalisiert:* {p['norm']['satz']}\n")
            else:
                print('*Keine normalisierte Fassung.*\n')


if __name__ == '__main__':
    main()
