#!/usr/bin/env python3
"""Erzeugt den ersten Entwurf einer Beat-Map für Taktstock.

Klassik ist rubato. Ein globales Tempo hilft deshalb wenig. Das Skript
schätzt zuerst eine weich veränderliche Tempokurve (Tempogramm plus Viterbi)
und sucht dann per dynamischer Programmierung die Schläge, die zu dieser
Kurve und zu den Einsätzen passen (Ellis 2007, mit lokaler Periode).

Ergebnis ist ein Entwurf. Korrigiert wird im Spiel im Einmess-Modus oder
direkt in der JSON-Datei.

Beispiel:
    python3 scripts/beatmap.py audio/grieg.mp3 --takt 4 --bpm 60 220 \
        --titel "In der Halle des Bergkönigs" -o beatmaps/grieg.json

Abhängigkeiten: pip install librosa soundfile
"""
import argparse
import json
import sys

import numpy as np

try:
    import librosa
except ImportError:  # pragma: no cover
    sys.exit("librosa fehlt: pip install librosa soundfile")

SR = 22050
HOP = 256


def onset_kurve(y):
    """SuperFlux-artige Einsatzkurve: unempfindlicher gegen Vibrato."""
    S = librosa.feature.melspectrogram(y=y, sr=SR, hop_length=HOP, n_mels=138, fmin=27.5, fmax=16000)
    S = librosa.power_to_db(S, ref=np.max)
    env = librosa.onset.onset_strength(S=S, sr=SR, hop_length=HOP, lag=2, max_size=3)
    env = env - np.convolve(env, np.ones(9) / 9, mode="same") * 0.5
    env = np.maximum(env, 0)
    return env / (env.max() + 1e-9)


def tiefen_kurve(y):
    """Einsätze nur im Bass, für die Lage der Taktanfänge."""
    S = librosa.feature.melspectrogram(y=y, sr=SR, hop_length=HOP, n_mels=40, fmin=30, fmax=300)
    S = librosa.power_to_db(S, ref=np.max)
    env = librosa.onset.onset_strength(S=S, sr=SR, hop_length=HOP, lag=2, max_size=1)
    return env / (env.max() + 1e-9)


def tempokurve(env, bpm_min, bpm_max, fenster_s=8.0, sprungstrafe=6.0):
    """Lokales Tempo pro Frame als glatter Pfad durch das Tempogramm."""
    fps = SR / HOP
    win = int(fenster_s * fps)
    tg = librosa.feature.tempogram(onset_envelope=env, sr=SR, hop_length=HOP, win_length=win)
    bpms = librosa.tempo_frequencies(tg.shape[0], sr=SR, hop_length=HOP)
    ok = (bpms >= bpm_min) & (bpms <= bpm_max)
    idx = np.where(ok)[0]
    bpms = bpms[idx]
    tg = tg[idx]
    tg = tg / (tg.max(axis=0, keepdims=True) + 1e-9)
    obs = np.log(tg + 0.05)
    lb = np.log2(bpms)
    trans = -sprungstrafe * np.abs(lb[:, None] - lb[None, :]) * 12  # pro Halbton-Schritt im log-Raum
    n = obs.shape[1]
    # Viterbi in Schritten von 8 Frames reicht und ist schnell
    schritt = 8
    cols = list(range(0, n, schritt))
    score = obs[:, cols[0]].copy()
    back = []
    for c in cols[1:]:
        cand = score[None, :] + trans
        b = cand.argmax(axis=1)
        score = cand[np.arange(len(b)), b] + obs[:, c]
        back.append(b)
    pfad = [int(score.argmax())]
    for b in reversed(back):
        pfad.append(int(b[pfad[-1]]))
    pfad.reverse()
    grob = bpms[pfad]
    return np.interp(np.arange(n), cols, grob)


def schlaege(env, bpm_kurve, straffheit=200.0):
    """Dynamische Programmierung mit lokaler Periode."""
    fps = SR / HOP
    n = len(env)
    periode = 60.0 * fps / bpm_kurve
    score = np.zeros(n)
    vorg = -np.ones(n, dtype=int)
    for t in range(n):
        P = periode[t]
        lo = int(t - 2.0 * P)
        hi = int(t - 0.5 * P)
        if hi <= 0:
            score[t] = env[t]
            continue
        lo = max(lo, 0)
        tau = np.arange(lo, hi)
        strafe = -straffheit * (np.log((t - tau) / P)) ** 2
        kand = score[tau] + strafe
        k = int(kand.argmax())
        score[t] = env[t] + kand[k]
        vorg[t] = tau[k]
    # Ende: bestes Maximum in der letzten Periode
    P = periode[-1]
    ende = n - 1 - int(np.argmax(score[::-1][: int(P) + 1]))
    pfad = [ende]
    while vorg[pfad[-1]] >= 0:
        pfad.append(int(vorg[pfad[-1]]))
    pfad.reverse()
    return np.array(pfad)


def verfeinern(frames, env, radius=3):
    """Jeden Schlag auf das nächste lokale Maximum der Einsatzkurve ziehen."""
    out = []
    for f in frames:
        lo, hi = max(0, f - radius), min(len(env), f + radius + 1)
        out.append(lo + int(np.argmax(env[lo:hi])))
    return np.array(out)


def lautheit(y, beats_s):
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]
    db = librosa.amplitude_to_db(rms + 1e-6)
    fps = SR / HOP
    werte = []
    grenzen = list(beats_s) + [beats_s[-1] + (beats_s[-1] - beats_s[-2])]
    for a, b in zip(grenzen[:-1], grenzen[1:]):
        fa, fb = int(a * fps), max(int(a * fps) + 1, int(b * fps))
        werte.append(float(np.mean(db[fa:fb])) if fb <= len(db) else float(db[-1]))
    w = np.array(werte)
    lo, hi = np.percentile(w, 5), np.percentile(w, 97)
    return np.clip((w - lo) / (hi - lo + 1e-9), 0, 1)


def taktanfaenge(beats_f, tief, takt, phase=None):
    if takt <= 1:
        return list(range(len(beats_f)))
    if phase is None:
        guete = []
        for p in range(takt):
            sel = beats_f[p::takt]
            guete.append(float(np.mean([tief[max(0, f - 2): f + 3].max() for f in sel])))
        phase = int(np.argmax(guete))
    return list(range(phase, len(beats_f), takt))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--titel", default="")
    ap.add_argument("--takt", type=int, default=4, help="Schläge pro Takt")
    ap.add_argument("--bpm", type=float, nargs=2, default=(50, 200), metavar=("MIN", "MAX"),
                    help="erlaubter Tempobereich in Schlägen pro Minute")
    ap.add_argument("--phase", type=int, default=None, help="Index des ersten Taktanfangs (sonst geschätzt)")
    ap.add_argument("--von", type=float, default=0.0, help="erster Schlag nicht vor dieser Sekunde")
    ap.add_argument("--bis", type=float, default=None, help="letzter Schlag nicht nach dieser Sekunde")
    ap.add_argument("--straffheit", type=float, default=200.0, help="höher = gleichmäßigere Schläge")
    ap.add_argument("--fenster", type=float, default=8.0, help="Fenster des Tempogramms in Sekunden")
    ap.add_argument("--sprung", type=float, default=6.0, help="Strafe für Tempowechsel; kleiner = sprunghafter")
    a = ap.parse_args()

    y, _ = librosa.load(a.audio, sr=SR, mono=True)
    dauer = len(y) / SR
    env = onset_kurve(y)
    tief = tiefen_kurve(y)
    bpm = tempokurve(env, a.bpm[0], a.bpm[1], fenster_s=a.fenster, sprungstrafe=a.sprung)
    frames = verfeinern(schlaege(env, bpm, a.straffheit), env)
    t = librosa.frames_to_time(frames, sr=SR, hop_length=HOP)
    bis = a.bis if a.bis is not None else dauer
    keep = (t >= a.von) & (t <= bis)
    t, frames = t[keep], frames[keep]

    takte = taktanfaenge(frames, tief, a.takt, a.phase)
    laut = lautheit(y, t)
    karte = {
        "version": 1,
        "titel": a.titel,
        "quelle": "Entwurf von scripts/beatmap.py (librosa %s)" % librosa.__version__,
        "dauer": round(dauer, 3),
        "takt": a.takt,
        "beats": [round(float(x), 3) for x in t],
        "takte": takte,
        "lautheit": [round(float(x), 3) for x in laut],
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(karte, f, ensure_ascii=False, separators=(",", ":"))
    d = np.diff(t)
    print(f"{len(t)} Schläge, {len(takte)} Takte, Tempo {60/np.median(d):.0f} bpm "
          f"(min {60/np.percentile(d, 95):.0f}, max {60/np.percentile(d, 5):.0f}) -> {a.out}")


if __name__ == "__main__":
    main()
