#!/usr/bin/env python3
"""
Construye sonidos derivados a partir de muestras REALES, en vez de sintetizarlos.

Sustituye a lo que hacía `tools/muestras-provisionales.py` para tres familias:

  - **Tempos** (adagio, andante, allegro): una claves de verdad repetida al pulso, en vez
    de un seno con envolvente exponencial. Un seno no suena a percusión, suena a pitido de
    microondas, y el niño lo nota aunque no sepa decir por qué.
  - **Acordes** (mayor y menor): tres glockenspiel reales transpuestos y mezclados. La
    transposición se hace por `asetrate`, que cambia altura y duración a la vez — en una
    lámina percusiva no se nota, y es exactamente el mismo truco que usa el sampler.
  - **Campanas** graves, medias y agudas: glockenspiel real a distintas alturas.

Todo el material de partida es CC0 (Versilian Community Sample Library).

Uso:  python tools/muestras-derivadas.py <carpeta-con-los-wav-crudos>
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras"
TASA = 48000
PICO_OBJETIVO_DB = -3.0

# Tempos convencionales de diccionario. Lo que importa a esta edad es que se distingan.
TEMPOS = {"adagio": 66, "andante": 92, "allegro": 138}

# Semitonos de cada acorde sobre la fundamental. Mayor y menor solo se diferencian en la
# tercera, y esa es exactamente la discriminación que pide la actividad.
ACORDES = {"mayor": [0, 4, 7], "menor": [0, 3, 7]}


def ffmpeg(args: list[str]) -> None:
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args])
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg falló: {' '.join(args[:6])}…")


def pico_db(ruta: Path) -> float:
    salida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(ruta), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", salida)
    return float(m.group(1)) if m else 0.0


def a_opus(entrada: Path, destino: Path, filtros: str = "") -> None:
    """Normaliza el pico y codifica. Sin normalizar, unas muestras suenan y otras no."""
    ganancia = PICO_OBJETIVO_DB - pico_db(entrada)
    cadena = f"volume={ganancia:.2f}dB" + (f",{filtros}" if filtros else "")
    destino.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(["-i", str(entrada), "-af", cadena, "-ac", "1", "-ar", str(TASA),
            "-c:a", "libopus", "-b:a", "48k", str(destino)])
    print(f"  {destino.relative_to(RAIZ)}  {destino.stat().st_size / 1024:.1f} KB")


def tempo(origen: Path, bpm: int, destino: Path, golpes: int = 8) -> None:
    """Repite una muestra al pulso, con adelay y amix. Ocho golpes bastan para reconocerlo."""
    periodo_ms = round(60000 / bpm)
    entradas: list[str] = []
    filtros: list[str] = []
    for i in range(golpes):
        entradas += ["-i", str(origen)]
        filtros.append(f"[{i}:a]adelay={i * periodo_ms}|{i * periodo_ms}[g{i}]")
    mezcla = "".join(f"[g{i}]" for i in range(golpes))
    # `normalize=0` evita que amix baje el volumen al mezclar ocho pistas que no se solapan.
    filtros.append(f"{mezcla}amix=inputs={golpes}:normalize=0[out]")

    destino.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg([*entradas, "-filter_complex", ";".join(filtros), "-map", "[out]",
            "-ac", "1", "-ar", str(TASA), "-c:a", "libopus", "-b:a", "48k", str(destino)])
    print(f"  {destino.relative_to(RAIZ)}  {destino.stat().st_size / 1024:.1f} KB  ({bpm} bpm)")


def acorde(origen: Path, semitonos: list[int], destino: Path) -> None:
    """Mezcla tres copias transpuestas. asetrate cambia altura y duración a la vez."""
    entradas: list[str] = []
    filtros: list[str] = []
    for i, st in enumerate(semitonos):
        entradas += ["-i", str(origen)]
        tasa = round(TASA * (2 ** (st / 12)))
        # aresample devuelve a 48 kHz tras cambiar la velocidad de lectura.
        filtros.append(f"[{i}:a]asetrate={tasa},aresample={TASA},volume={1/len(semitonos):.3f}[n{i}]")
    mezcla = "".join(f"[n{i}]" for i in range(len(semitonos)))
    filtros.append(f"{mezcla}amix=inputs={len(semitonos)}:normalize=0[out]")

    destino.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg([*entradas, "-filter_complex", ";".join(filtros), "-map", "[out]",
            "-t", "2.2", "-ac", "1", "-ar", str(TASA), "-c:a", "libopus", "-b:a", "48k",
            str(destino)])
    print(f"  {destino.relative_to(RAIZ)}  {destino.stat().st_size / 1024:.1f} KB")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    crudos = Path(sys.argv[1])

    recorte = "silenceremove=start_periods=1:start_threshold=-43dB:start_silence=0.002"

    def corta(dur: float) -> str:
        """
        Recorte con desvanecido. Las muestras crudas de percusión afinada duran siete
        segundos porque la lámina sigue vibrando, y en una actividad de discriminación
        eso es una eternidad: el niño espera siete segundos por estímulo y abandona.
        Dos segundos y medio bastan para reconocer el timbre y la altura.
        """
        return f"{recorte},afade=t=out:st={dur - 0.35:.2f}:d=0.35,atrim=0:{dur}"

    print("Percusión y campanas, de muestra real:")
    a_opus(crudos / "pandero.wav", SALIDA / "pandero-golpe.opus", corta(1.2))
    a_opus(crudos / "claves.wav", SALIDA / "sonido-corto.opus", corta(0.7))
    a_opus(crudos / "campanilla.wav", SALIDA / "sonido-largo.opus", corta(2.8))
    a_opus(crudos / "campanilla.wav", SALIDA / "triangulo-largo.opus", corta(2.8))
    a_opus(crudos / "glock-G4.wav", SALIDA / "campana-grave.opus", corta(2.5))
    a_opus(crudos / "glock-C5.wav", SALIDA / "campana-media.opus", corta(2.5))
    a_opus(crudos / "glock-C6.wav", SALIDA / "campana-aguda.opus", corta(2.5))

    print("\nTempos, con una claves de verdad:")
    for nombre, bpm in TEMPOS.items():
        tempo(crudos / "claves.wav", bpm, SALIDA / f"tempo-{nombre}.opus")

    print("\nAcordes, con glockenspiel real:")
    for nombre, st in ACORDES.items():
        acorde(crudos / "glock-C5.wav", st, SALIDA / f"acorde-{nombre}-do.opus")
        acorde(crudos / "glock-G4.wav", st, SALIDA / f"acorde-{nombre}-sol.opus")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
