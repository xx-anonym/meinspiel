#!/usr/bin/env python3
"""Ersetzt die Schläge einer Beat-Map in einem Zeitbereich durch eigene Zeitpunkte.

Gedacht für Stellen, an denen der automatische Entwurf danebenliegt:
Fermaten, Generalpausen, Schlussakkorde. Die Lautheit wird für die neuen
Schläge aus der Aufnahme neu berechnet, die Taktzählung läuft weiter.

Beispiel (Schlussakkorde im Bergkönig, mit zwei Generalpausen):
    python3 scripts/korrektur.py beatmaps/grieg.json audio/grieg.mp3 \
        --von 133.0 --bis 155 \
        --beats 133.13,133.74,134.30,135.20,136.15,139.12,140.07,143.00
"""
import argparse
import json

import numpy as np

try:
    import librosa
except ImportError:  # pragma: no cover
    raise SystemExit("librosa fehlt: pip install librosa soundfile")

from beatmap import SR, lautheit


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("karte")
    ap.add_argument("audio")
    ap.add_argument("--von", type=float, required=True)
    ap.add_argument("--bis", type=float, required=True)
    ap.add_argument("--beats", required=True, help="kommagetrennte Zeitpunkte in Sekunden")
    ap.add_argument("--fermaten", default="", help="kommagetrennte Zeitpunkte, deren Schlag eine Fermate ist")
    a = ap.parse_args()

    with open(a.karte, encoding="utf-8") as f:
        k = json.load(f)
    alt = k["beats"]
    takt = k.get("takt", 4)
    takte_alt = set(k.get("takte", []))
    neu_t = sorted(float(x) for x in a.beats.split(",") if x.strip())
    vorher = [i for i, t in enumerate(alt) if t < a.von]
    nachher = [i for i, t in enumerate(alt) if t > a.bis]

    beats, takte = [], []
    for i in vorher:
        if i in takte_alt:
            takte.append(len(beats))
        beats.append(alt[i])
    letzter_takt = max([i for i in vorher if i in takte_alt], default=-1)
    seit = (vorher[-1] - letzter_takt + 1) if vorher and letzter_takt >= 0 else 0
    for t in neu_t:
        if seit % takt == 0:
            takte.append(len(beats))
        beats.append(t)
        seit += 1
    for i in nachher:
        if i in takte_alt:
            takte.append(len(beats))
        beats.append(alt[i])

    y, _ = librosa.load(a.audio, sr=SR, mono=True)
    k["beats"] = [round(t, 3) for t in beats]
    k["takte"] = takte
    k["lautheit"] = [round(float(x), 3) for x in lautheit(y, np.array(beats))]
    if a.fermaten:
        ft = [float(x) for x in a.fermaten.split(",")]
        k["fermaten"] = sorted({int(np.argmin(np.abs(np.array(beats) - t))) for t in ft})
    k["quelle"] = k.get("quelle", "") + f"; von Hand korrigiert {a.von}–{a.bis} s"
    with open(a.karte, "w", encoding="utf-8") as f:
        json.dump(k, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(vorher)} + {len(neu_t)} + {len(nachher)} = {len(beats)} Schläge -> {a.karte}")


if __name__ == "__main__":
    main()
