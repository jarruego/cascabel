#!/usr/bin/env python3
"""
Descarga un kit de percusión de la Versilian Community Sample Library (CC0).

**Por qué VCSL y no un soundfont GM.** Para las alturas, FluidR3 gana: trae 128 instrumentos
afinados y con licencia MIT. Para la percusión, no: el mapa de percusión de General MIDI son
muestras cortas pensadas para acompañar, y aquí la percusión **es** la actividad. VCSL trae
grabaciones de instrumento suelto, con varias intensidades y varias repeticiones del mismo
golpe, que es lo que hace falta cuando lo que suena es un solo golpe y se oye entero.

**Los ocho del kit no son los de una batería de rock**, son los que hay en un aula de
Primaria española y los que un niño reconoce por su nombre: bombo, caja, charles, plato,
tom, pandereta, claves y caja china. Un charles y un plato de ride le dirían lo mismo a un
niño de ocho años —«un plato»—, así que se ha preferido cubrir familias distintas antes que
completar una batería.

**Round robin, y esto sí importa.** VCSL trae el mismo golpe grabado varias veces (`rr1`,
`rr2`...). Se bajan dos por instrumento y se alternan al tocar: un redoble con la misma
muestra repetida suena a máquina de escribir, y con dos alterna lo justo para sonar a alguien
golpeando. Es la diferencia entre una percusión que se puede escuchar y una que cansa a los
diez segundos.

Uso:  python tools/muestras-percusion.py
Salida: public/audio/muestras/percusion/*.opus
"""

from __future__ import annotations

import json
import math
import shutil
import struct
import subprocess
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras" / "percusion"
BASE = "https://raw.githubusercontent.com/sgossner/VCSL/master"

# nombre nuestro -> (carpeta en VCSL, prefijo del fichero, intensidad)
#
# Se coge una intensidad media y no la más fuerte: un golpe al máximo satura en el altavoz
# de una tablet y suena a chasquido, no a instrumento.
KIT = {
    # El bombo va al golpe más fuerte (v7) a propósito: los bombos de VCSL son de orquesta,
    # casi todo por debajo de 150 Hz, y un altavoz de móvil o de tablet no reproduce eso.
    # El autor lo oyó «muy tenue» el 2026-09-10: el prefijo de antes («BD1_Hit») no casaba
    # con ningún fichero y se cogía el primero por orden, v2, el más flojo y el que menos
    # ataque tiene. Medido: v7 lleva 13 dB más entre 150 y 300 Hz y 16 dB más entre 300 y
    # 1000 Hz, que es lo que un altavoz pequeño sí da.
    "bombo": ("Membranophones/Struck Membranophones/Bass Drum 1", "BDrumNew_hit", "v7"),
    "caja": ("Membranophones/Struck Membranophones/Snare Drum, Modern 1", "Snare2_HitNS", "v4"),
    "tom": ("Membranophones/Struck Membranophones/Tom 1", "Tom1_Hit", "v4"),
    "bongo": ("Membranophones/Struck Membranophones/Bongos", "Bongo", "v4"),
    "charles": ("Idiophones/Struck Idiophones/Hi-Hat Cymbal", "HH", "v4"),
    "plato": ("Idiophones/Struck Idiophones/Suspended Cymbal 1", "SusCym1", "v4"),
    "pandereta": ("Idiophones/Struck Idiophones/Tambourine 1", "Tamb1", "v4"),
    "claves": ("Idiophones/Struck Idiophones/Claves", "Claves", "v4"),
    "cajachina": ("Idiophones/Struck Idiophones/Woodblock", "WB", "v4"),
    "triangulo": ("Idiophones/Struck Idiophones/Triangles", "Tri", "v4"),
}

# Cuántas repeticiones distintas del mismo golpe se bajan.
REPETICIONES = 2


def listar(carpeta: str) -> list[str]:
    url = f"https://api.github.com/repos/sgossner/VCSL/contents/{urllib.parse.quote(carpeta)}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return [e["name"] for e in json.load(r) if e["type"] == "file"]
    except Exception as exc:  # noqa: BLE001
        print(f"    no se pudo listar {carpeta}: {exc}")
        return []


def descargar(carpeta: str, fichero: str, destino: Path) -> bool:
    url = f"{BASE}/{urllib.parse.quote(carpeta)}/{urllib.parse.quote(fichero)}"
    try:
        with urllib.request.urlopen(url, timeout=60) as r, destino.open("wb") as f:
            shutil.copyfileobj(r, f)
        return destino.stat().st_size > 0
    except Exception as exc:  # noqa: BLE001
        print(f"    no se pudo bajar {fichero}: {exc}")
        return False


def pico(wav: Path) -> float:
    try:
        with wave.open(str(wav), "rb") as w:
            canales = w.getnchannels()
            datos = w.readframes(w.getnframes())
    except Exception:  # noqa: BLE001
        return 0.0
    n = len(datos) // 2
    if not n:
        return 0.0
    valores = struct.unpack(f"<{n}h", datos[: n * 2])
    del canales
    return max(abs(v) for v in valores) / 32768


# Cuánto se deja sonar como máximo, en segundos. El bombo de orquesta resuena seis segundos
# y eso son cuarenta kilobytes por golpe que nadie oye entre pulso y pulso.
DURACION_MAXIMA = {"bombo": 2.2}


def preparar(origen: Path, destino: Path, duracion_maxima: float | None = None) -> int:
    """
    Recorta el silencio inicial, normaliza a -3 dBFS y codifica a Opus.

    **El recorte del silencio no es cosmético en percusión.** Las muestras de VCSL traen
    hasta cien milisegundos de aire antes del golpe, y en un instrumento de altura eso no se
    nota; en uno de percusión, cien milisegundos son la diferencia entre ir a tiempo y no
    ir. Todo el proyecto compara golpes con una rejilla, así que ese aire desplazaría cada
    golpe y el niño saldría tarde sin haber hecho nada mal.
    """
    temporal = destino.with_suffix(".tmp.wav")
    # `silenceremove` con umbral bajo: quita lo que hay ANTES del ataque y nada más.
    filtros = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0"
    if duracion_maxima:
        # Se corta con una bajada de medio segundo, no a cuchillo.
        filtros += f",atrim=end={duracion_maxima},afade=t=out:st={duracion_maxima - 0.5}:d=0.5"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(origen),
         "-af", filtros,
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


def main() -> int:
    if not shutil.which("ffmpeg"):
        print("Falta ffmpeg.")
        return 1

    SALIDA.mkdir(parents=True, exist_ok=True)
    temporales = SALIDA / "_tmp"
    temporales.mkdir(exist_ok=True)

    # Con nombres en la línea de órdenes se rehacen solo esos: `muestras-percusion.py bombo`.
    pedidos = set(sys.argv[1:])
    total = 0
    for nombre, (carpeta, prefijo, intensidad) in KIT.items():
        if pedidos and nombre not in pedidos:
            continue
        ficheros = [f for f in listar(carpeta) if f.lower().endswith(".wav")]
        # Se prefieren los de la intensidad pedida; si no hay, cualquiera sirve.
        candidatos = [f for f in ficheros if intensidad in f and prefijo.lower() in f.lower()]
        if not candidatos:
            candidatos = [f for f in ficheros if prefijo.lower() in f.lower()]
        if not candidatos:
            candidatos = ficheros
        if not candidatos:
            print(f"  {nombre}: no hay muestras en {carpeta}")
            continue

        print(f"\n{nombre}  ({carpeta})")
        for i, fichero in enumerate(sorted(candidatos)[:REPETICIONES]):
            crudo = temporales / fichero
            if not descargar(carpeta, fichero, crudo):
                continue
            destino = SALIDA / f"{nombre}-{i + 1}.opus"
            total += preparar(crudo, destino, DURACION_MAXIMA.get(nombre))
            print(f"    {fichero[:44]:44} -> {destino.name}")

    shutil.rmtree(temporales, ignore_errors=True)
    print(f"\nTotal: {total / 1024:.0f} KB")
    print("\nVCSL es © Versilian Studios y colaboradores, CC0 1.0. La atribución no es")
    print("obligatoria pero se hace igual, en THIRD-PARTY-NOTICES.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
