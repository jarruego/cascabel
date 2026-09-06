#!/usr/bin/env python3
"""
Convierte muestras crudas de un instrumento a las que sirve la app.

Hace tres cosas, y la primera es la que más se nota:

 1. **Normaliza el pico.** Las muestras crudas de VCSL van de -29 a -39 dBFS según la
    nota. Diez decibelios de diferencia entre notas del mismo instrumento no suenan a
    matiz, suenan a error: el niño oye que unas notas «funcionan» y otras no.
 2. Recorta el silencio inicial con un umbral RELATIVO al pico de esa muestra, no
    absoluto. Con umbral fijo, las notas agudas —que son más flojas— se borraban enteras.
 3. Codifica a Opus 48 kbps mono, que es lo que fija CLAUDE.md.

Uso:  python tools/muestras-instrumento.py <carpeta-wav> <nombre-instrumento>
      Los ficheros de entrada se llaman como la nota: C4.wav, G4.wav...
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

PICO_OBJETIVO_DB = -3.0
DURACION_MAX_S = 2.25
# El desvanecido evita el clic del corte. Empieza antes del final para que se note poco.
FUNDIDO_DESDE_S = 1.9
FUNDIDO_S = 0.35


def pico_db(wav: Path) -> float:
    salida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", salida)
    if not m:
        raise RuntimeError(f"no se pudo medir el pico de {wav.name}")
    return float(m.group(1))


def convertir(wav: Path, destino: Path) -> None:
    pico = pico_db(wav)
    ganancia = PICO_OBJETIVO_DB - pico

    # El umbral de recorte es relativo al pico YA normalizado: 40 dB por debajo. Con un
    # umbral absoluto, una nota aguda floja se borraba entera. Lo aprendimos por las malas.
    umbral = PICO_OBJETIVO_DB - 40

    filtros = ",".join(
        [
            f"volume={ganancia:.2f}dB",
            f"silenceremove=start_periods=1:start_threshold={umbral:.1f}dB:start_silence=0.002",
            f"afade=t=out:st={FUNDIDO_DESDE_S}:d={FUNDIDO_S}",
        ]
    )

    destino.parent.mkdir(parents=True, exist_ok=True)
    orden = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(wav),
        "-af", filtros,
        "-t", str(DURACION_MAX_S),
        "-ac", "1", "-ar", "48000",
        "-c:a", "libopus", "-b:a", "48k",
        str(destino),
    ]
    if subprocess.run(orden).returncode != 0:
        raise RuntimeError(f"ffmpeg falló con {wav.name}")

    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(destino)],
        capture_output=True, text=True,
    ).stdout.strip()
    # Una muestra de menos de un cuarto de segundo es que algo se ha comido el sonido.
    if not dur or float(dur) < 0.25:
        raise RuntimeError(f"{destino.name} ha salido de {dur} s: el recorte se ha pasado")

    print(f"  {destino.relative_to(RAIZ)}  {float(dur):.2f} s  "
          f"{destino.stat().st_size / 1024:.1f} KB  (pico crudo {pico:.1f} dB)")


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    origen, instrumento = Path(sys.argv[1]), sys.argv[2]
    salida = RAIZ / "public" / "audio" / "muestras" / instrumento

    wavs = sorted(origen.glob("*.wav"))
    if not wavs:
        print(f"No hay .wav en {origen}")
        return 1

    total = 0
    for wav in wavs:
        nombre = wav.stem.lower().replace("#", "s")
        destino = salida / f"{nombre}.opus"
        convertir(wav, destino)
        total += destino.stat().st_size

    print(f"\n  {instrumento}: {len(wavs)} muestras, {total / 1024:.1f} KB en total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
