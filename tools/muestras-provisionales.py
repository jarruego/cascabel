#!/usr/bin/env python3
"""
Genera muestras de audio PROVISIONALES por síntesis.

Esto NO es T1.7. Las muestras buenas serán grabaciones o material CC0 de VCSL y VSCO 2,
con timbres percusivos reales. Esto existe sólo para desbloquear T0.2 —que una actividad
se pueda jugar entera— sin quedarnos esperando a tener banco de sonidos.

Ventaja lateral que conviene no perder: al ser sintetizadas por nosotros, no arrastran
ninguna licencia de terceros. Son nuestras y son CC0.

Uso:  python tools/muestras-provisionales.py
Salida: public/audio/muestras/*.opus  (48 kbps mono, vía ffmpeg)
"""

from __future__ import annotations

import math
import random
import struct
import subprocess
import sys
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras"
TASA = 48000


def escribir_wav(ruta: Path, muestras: list[float]) -> None:
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TASA)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, m)) * 32000)) for m in muestras))


def envolvente(n: int, ataque: float, caida: float) -> list[float]:
    """ADSR simplificado. El ataque corto es lo que hace que un golpe suene a golpe."""
    a = max(1, int(ataque * TASA))
    salida = []
    for i in range(n):
        if i < a:
            salida.append(i / a)
        else:
            salida.append(math.exp(-(i - a) / (caida * TASA)))
    return salida


def pandero(dur: float = 0.45) -> list[float]:
    """Golpe de pandero: ruido filtrado más un modo grave de membrana."""
    n = int(dur * TASA)
    env = envolvente(n, 0.001, 0.08)
    rnd = random.Random(11)
    anterior = 0.0
    salida = []
    for i in range(n):
        # Ruido paso bajo de un polo: sin esto suena a estática, no a parche.
        ruido = rnd.uniform(-1, 1)
        anterior = anterior * 0.55 + ruido * 0.45
        t = i / TASA
        membrana = 0.45 * math.sin(2 * math.pi * 190 * t) * math.exp(-t / 0.05)
        salida.append((anterior * 0.55 + membrana) * env[i] * 0.9)
    return salida


def triangulo(dur: float = 2.2) -> list[float]:
    """Triángulo: parciales inarmónicos y caída muy larga. Es el contraste con el pandero."""
    n = int(dur * TASA)
    env = envolvente(n, 0.002, 0.7)
    parciales = [(2540, 1.0), (3721, 0.6), (5310, 0.35), (7015, 0.2), (9490, 0.12)]
    salida = []
    for i in range(n):
        t = i / TASA
        v = sum(a * math.sin(2 * math.pi * f * t) for f, a in parciales)
        salida.append(v / len(parciales) * env[i] * 1.4)
    return salida


def voz_la(dur: float = 1.5, hz: float = 440.0) -> list[float]:
    """Un «la» cantado: armónicos decrecientes y un vibrato leve, que es lo que lo hace voz."""
    n = int(dur * TASA)
    env = envolvente(n, 0.06, 1.2)
    salida = []
    for i in range(n):
        t = i / TASA
        f = hz * (1 + 0.006 * math.sin(2 * math.pi * 5.2 * t))
        v = (
            0.6 * math.sin(2 * math.pi * f * t)
            + 0.25 * math.sin(2 * math.pi * 2 * f * t)
            + 0.12 * math.sin(2 * math.pi * 3 * f * t)
            + 0.05 * math.sin(2 * math.pi * 4 * f * t)
        )
        salida.append(v * env[i] * 0.85)
    return salida


def silencio(dur: float = 2.0) -> list[float]:
    """Silencio de verdad. Es media actividad: sin él no hay contraste que reconocer."""
    return [0.0] * int(dur * TASA)


PIEZAS = {
    "pandero-golpe": pandero,
    "triangulo-largo": triangulo,
    "voz-la": voz_la,
    "silencio-2s": silencio,
}


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, generar in PIEZAS.items():
        wav = SALIDA / f"{nombre}.wav"
        opus = SALIDA / f"{nombre}.opus"
        escribir_wav(wav, generar())
        orden = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(wav),
            "-c:a", "libopus", "-b:a", "48k", "-ac", "1",
            str(opus),
        ]
        r = subprocess.run(orden)
        wav.unlink()
        if r.returncode != 0:
            print(f"ffmpeg falló con {nombre}", file=sys.stderr)
            return 1
        print(f"  {opus.relative_to(RAIZ)}  {opus.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
