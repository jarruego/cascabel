#!/usr/bin/env python3
"""
Descarga instrumentos del banco General MIDI de FluidR3 y los prepara para el proyecto.

**Qué resuelve.** Hasta ahora el banco tenía marimba y poco más, y la voz estaba sintetizada.
La búsqueda anterior (`docs/11-RECURSOS-Y-REFERENTES.md`) miró bancos de muestras
*orquestales* —VCSL, VSCO 2, Iowa— y se quedó corta: **el sitio donde sí está todo son los
soundfonts General MIDI**, que llevan veinte años siendo el material con el que suena
cualquier reproductor de MIDI.

**Qué es FluidR3_GM.** El soundfont de Frank Wen, 2000-2008, con los 128 instrumentos GM.
**Licencia MIT**, que es una de las cuatro que `CLAUDE.md` §3 admite. Y `gleitz/midi-js-soundfonts`
—también MIT— lo publica **ya renderizado nota a nota** en MP3 y OGG, 88 ficheros por
instrumento, que ahorra tener que sintetizar el .sf2 nosotros.

**Por qué esto sí trae voz.** El programa GM 53 es «Voice Oohs» y el 52 «Choir Aahs»: son
voces humanas muestreadas. Se comprobó midiendo el espectro de la nota la4 antes de usarla:
fundamental en 438,7 Hz y **un pico secundario hacia 1,2 kHz después de un valle**, que es
la firma de un formante. Un tono sintetizado decae de forma monótona y no hace eso. Es voz
de verdad, y sustituye a la síntesis de formantes de `muestras-provisionales.py`.

**Cuidado con el estirado.** El `Sampler` cubre los huecos con `playbackRate`, y eso vale
para timbres percusivos —marimba, xilófono, glockenspiel— pero delata en los sostenidos,
porque además de la altura cambia la duración. Por eso aquí se bajan **una muestra cada tres
semitonos** en vez de las seis de la marimba: con esa densidad el estirado máximo es de un
semitono y medio, que no se oye en ningún timbre.

Uso:
    python tools/muestras-gm.py                    # los instrumentos por defecto
    python tools/muestras-gm.py flute violin       # solo esos
    python tools/muestras-gm.py --listar           # qué hay disponible

Salida: public/audio/muestras/<instrumento>/*.opus, normalizados a -3 dBFS.
"""

from __future__ import annotations

import argparse
import math
import shutil
import struct
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras"
BASE = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM"

# Nombre nuestro -> programa de FluidR3.
#
# La selección no es «todos los que hay»: son los que un aula de Primaria reconoce y los que
# el catálogo necesita. Se dejan fuera los 120 restantes a propósito — un banco de 128
# instrumentos es un banco que nadie mantiene.
INSTRUMENTOS = {
    "piano": "acoustic_grand_piano",
    "xilofono": "xylophone",
    "marimba-gm": "marimba",
    "glockenspiel": "glockenspiel",
    "flauta": "flute",
    "guitarra": "acoustic_guitar_nylon",
    "violin": "violin",
    "trompeta": "trumpet",
    # Programa 53 de GM. Es la voz humana muestreada que sustituye a la sintetizada.
    "voz": "voice_oohs",
    "coro": "choir_aahs",
}

POR_DEFECTO = ["piano", "xilofono", "flauta", "guitarra", "violin", "voz"]

# Nuestro formato usa sostenidos (`aMidi` de `sampler.ts` solo entiende `#`), pero el
# repositorio nombra los ficheros con BEMOLES: Db y no C#. Son la misma tecla, así que se
# traduce al pedir y se guarda con el nombre nuestro.
NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
EN_BEMOLES = {"C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"}

# Una muestra cada tres semitonos, de do3 a do6. Cubre de sobra la tesitura infantil y la
# de flauta dulce, y deja el estirado máximo en un semitono y medio.
PASO_SEMITONOS = 3
DESDE_MIDI = 48   # C3
HASTA_MIDI = 84   # C6


def nombre_midi(midi: int) -> str:
    return f"{NOTAS[midi % 12]}{midi // 12 - 1}"


def descargar(url: str, destino: Path) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=30) as r, destino.open("wb") as f:
            shutil.copyfileobj(r, f)
        return destino.stat().st_size > 0
    except Exception as exc:  # noqa: BLE001 - se informa y se sigue con el resto
        print(f"    no se pudo bajar {url.rsplit('/', 1)[-1]}: {exc}")
        return False


def pico(wav: Path) -> float:
    with wave.open(str(wav), "rb") as w:
        datos = w.readframes(w.getnframes())
    n = len(datos) // 2
    if not n:
        return 0.0
    valores = struct.unpack(f"<{n}h", datos[: n * 2])
    return max(abs(v) for v in valores) / 32768


def preparar(mp3: Path, destino: Path) -> int:
    """
    Normaliza a -3 dBFS y codifica a Opus 48 kbps mono.

    **La normalización no es cosmética.** Las muestras de FluidR3 salen a niveles muy
    distintos entre instrumentos —la voz venía a -18 dBFS y la marimba mucho más alta—, y
    dos instrumentos a distinto volumen en la misma actividad no suenan a matiz, suenan a
    fallo. Es el mismo tratamiento que `muestras-instrumento.py` da a las de VCSL.
    """
    temporal = destino.with_suffix(".tmp.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
         "-ac", "1", "-ar", "48000", str(temporal)],
        check=True,
    )
    p = pico(temporal)
    ganancia = 0.0 if p <= 0 else 20 * math.log10((10 ** (-3 / 20)) / p)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(temporal),
         "-af", f"volume={ganancia:.2f}dB",
         "-c:a", "libopus", "-b:a", "48k", "-ac", "1", str(destino)],
        check=True,
    )
    temporal.unlink(missing_ok=True)
    return destino.stat().st_size


def bajar_instrumento(nombre: str, programa: str) -> int:
    carpeta = SALIDA / nombre
    carpeta.mkdir(parents=True, exist_ok=True)
    temporales = carpeta / "_tmp"
    temporales.mkdir(exist_ok=True)

    total = 0
    hechas = 0
    print(f"\n{nombre}  ({programa})")
    for midi in range(DESDE_MIDI, HASTA_MIDI + 1, PASO_SEMITONOS):
        nota = nombre_midi(midi)
        mp3 = temporales / f"{nota}.mp3"
        letra, octava = nota[:-1], nota[-1]
        url = f"{BASE}/{programa}-mp3/{EN_BEMOLES.get(letra, letra)}{octava}.mp3"
        if not descargar(url, mp3):
            continue
        destino = carpeta / f"{nota.replace('#', 's').lower()}.opus"
        total += preparar(mp3, destino)
        hechas += 1
        print(f"    {nota:4} -> {destino.name}")

    shutil.rmtree(temporales, ignore_errors=True)
    print(f"  {hechas} muestras, {total / 1024:.0f} KB")
    return total


def main() -> int:
    ap = argparse.ArgumentParser(description="Descarga instrumentos GM de FluidR3")
    ap.add_argument("instrumentos", nargs="*", default=None)
    ap.add_argument("--listar", action="store_true")
    args = ap.parse_args()

    if args.listar:
        for n, p in INSTRUMENTOS.items():
            print(f"  {n:14} {p}")
        return 0

    if not shutil.which("ffmpeg"):
        print("Falta ffmpeg.")
        return 1

    elegidos = args.instrumentos or POR_DEFECTO
    desconocidos = [i for i in elegidos if i not in INSTRUMENTOS]
    if desconocidos:
        print(f"No conozco: {desconocidos}. Prueba --listar")
        return 1

    total = sum(bajar_instrumento(i, INSTRUMENTOS[i]) for i in elegidos)
    print(f"\nTotal: {total / 1024:.0f} KB en {len(elegidos)} instrumentos.")
    print("\nRecuerda: FluidR3 es © 2000-2008 Frank Wen, licencia MIT. La atribución va")
    print("en THIRD-PARTY-NOTICES.md, y la MIT la exige también para el audio derivado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
