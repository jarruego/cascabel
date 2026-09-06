#!/usr/bin/env python3
"""
Convierte una grabación de voz en una muestra del proyecto.

**Por qué existe.** `voz-la.opus` está sintetizada, y eso es un problema real: se usa en tres
actividades de reconocimiento de timbre donde lo que el niño tiene que identificar es
*una voz*. Una imitación buena sigue siendo una imitación, y `CLAUDE.md` §6 pide voz humana
grabada, nunca sintetizada.

**Y no se resuelve descargando nada.** Se comprobó: VCSL —nuestra fuente CC0— no tiene voz
(su catálogo son aerófonos, cordófonos, idiófonos y membranófonos, sin categoría vocal); la
colección de la Universidad de Iowa tampoco la tiene y además no declara licencia; y en
Freesound hay material CC0 vocal pero no se puede juzgar sin escucharlo. Es exactamente lo
que ya anticipaba `docs/11-RECURSOS-Y-REFERENTES.md`: **lo que falta no es material, son las
grabaciones**, y es la única dependencia del proyecto que no se resuelve descargando algo.

Así que esto convierte treinta segundos de móvil en una muestra lista.

Uso:
    python tools/muestras-voz.py grabacion.m4a
    python tools/muestras-voz.py grabacion.wav --nombre voz-la --nota A4

Acepta lo que acepte ffmpeg: .m4a de un iPhone o Android, .wav, .mp3, .ogg, .opus.

Qué hace, y por qué cada paso:

 1. **Recorta el silencio** del principio y del final. Una grabación de móvil trae siempre
    el ruido de pulsar el botón.
 2. **Mide la altura** por autocorrelación y dice qué nota has cantado de verdad. Si el
    fichero se llama `voz-la` conviene que sea un la: el sampler transporta por
    `playbackRate` desde la nota declarada, y una muestra mal etiquetada desafina TODO lo
    que se construya sobre ella.
 3. **Normaliza el pico a -3 dBFS**, igual que `muestras-instrumento.py`. Sin esto, la voz
    suena a otro volumen que la marimba y parece un fallo.
 4. **Codifica a Opus 48 kbps mono**, que es el formato del banco.

Consejos de grabación, que valen más que cualquier procesado posterior:

 - Una habitación con cosas blandas: sofá, cortinas, una cama. Un aula vacía o un pasillo
   meten reverberación que no se puede quitar después.
 - A un palmo del micrófono, no pegado: pegado entran las explosivas y el roce.
 - Canta la vocal sostenida —«laaaa»— unos dos segundos, ni fuerte ni flojo.
 - Graba tres o cuatro tomas y quédate con la que menos te chirríe. Es más rápido que
   intentar arreglar una toma regular.
"""

from __future__ import annotations

import argparse
import math
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras"
TASA = 48000

NOMBRES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def hay_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def a_wav_mono(origen: Path, destino: Path) -> None:
    """Todo entra por ffmpeg: así da igual con qué se haya grabado."""
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(origen),
         "-ac", "1", "-ar", str(TASA), str(destino)],
        check=True,
    )


def leer(wav: Path) -> list[float]:
    with wave.open(str(wav), "rb") as w:
        crudo = w.readframes(w.getnframes())
    n = len(crudo) // 2
    return [v / 32768.0 for v in struct.unpack("<%dh" % n, crudo[: n * 2])]


def escribir(wav: Path, muestras: list[float]) -> None:
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TASA)
        w.writeframes(b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, m)) * 32000)) for m in muestras
        ))


def recortar_silencio(m: list[float], umbral: float = 0.02) -> list[float]:
    """
    Recorta por energía en ventanas de 10 ms, no muestra a muestra.

    Muestra a muestra cortaría en cualquier cruce por cero: una onda pasa por el cero
    constantemente y eso no es silencio.
    """
    ventana = TASA // 100
    fuertes = [
        i for i in range(0, len(m) - ventana, ventana)
        if max(abs(x) for x in m[i:i + ventana]) > umbral
    ]
    if not fuertes:
        return m
    # Un poco de aire a los lados: cortar justo en el ataque produce un chasquido.
    ini = max(0, fuertes[0] - ventana * 2)
    fin = min(len(m), fuertes[-1] + ventana * 6)
    return m[ini:fin]


def frecuencia(m: list[float]) -> float | None:
    """
    Altura por autocorrelación sobre el trozo central de la grabación.

    El trozo central y no el principio: el ataque de una voz es inestable y el final se
    apaga. Lo que hay que medir es la parte sostenida, que es la que se va a transportar.
    """
    if len(m) < TASA // 2:
        return None
    centro = len(m) // 2
    ancho = min(TASA // 2, len(m) // 2)
    trozo = m[centro - ancho // 2: centro + ancho // 2]

    # 65 Hz a 1200 Hz cubre de una voz masculina grave a una infantil aguda.
    minimo, maximo = TASA // 1200, TASA // 65
    mejor, mejor_valor = 0, 0.0
    for desfase in range(minimo, min(maximo, len(trozo) - 1)):
        suma = sum(trozo[i] * trozo[i + desfase] for i in range(0, len(trozo) - desfase, 4))
        if suma > mejor_valor:
            mejor_valor, mejor = suma, desfase
    return TASA / mejor if mejor else None


def nota_de(hz: float) -> tuple[str, float]:
    """Nota más cercana y desviación en cents. La desviación es lo que dice si vale."""
    midi = 69 + 12 * math.log2(hz / 440.0)
    entero = round(midi)
    cents = (midi - entero) * 100
    return f"{NOMBRES[entero % 12]}{entero // 12 - 1}", cents


def normalizar(m: list[float], db: float = -3.0) -> list[float]:
    pico = max(abs(x) for x in m) or 1.0
    objetivo = 10 ** (db / 20)
    return [x * (objetivo / pico) for x in m]


def main() -> int:
    ap = argparse.ArgumentParser(description="Convierte una grabación de voz en muestra")
    ap.add_argument("origen", type=Path, help="Fichero grabado (m4a, wav, mp3, ogg...)")
    ap.add_argument("--nombre", default="voz-la", help="Nombre de la muestra, sin extensión")
    ap.add_argument("--nota", default=None,
                    help="Nota que dices haber cantado, p. ej. A4. Se comprueba contra la real")
    ap.add_argument("--sin-recorte", action="store_true", help="No recortar los silencios")
    args = ap.parse_args()

    if not hay_ffmpeg():
        print("Falta ffmpeg. Es lo único que hace falta instalar para esto.")
        return 1
    if not args.origen.exists():
        print(f"No encuentro {args.origen}")
        return 1

    SALIDA.mkdir(parents=True, exist_ok=True)
    temporal = SALIDA / "_voz_temporal.wav"
    a_wav_mono(args.origen, temporal)

    m = leer(temporal)
    if not m:
        print("La grabación está vacía.")
        temporal.unlink(missing_ok=True)
        return 1

    if not args.sin_recorte:
        antes = len(m)
        m = recortar_silencio(m)
        print(f"Recortado: {antes / TASA:.2f} s -> {len(m) / TASA:.2f} s")

    hz = frecuencia(m)
    if hz:
        nombre, cents = nota_de(hz)
        print(f"Altura medida: {hz:.1f} Hz -> {nombre} ({cents:+.0f} cents)")
        if abs(cents) > 35:
            print("  AVISO: estás a más de un tercio de tono de la nota más cercana.")
            print("  El sampler transporta desde la nota declarada: una muestra desafinada")
            print("  desafina todo lo que se construya encima. Merece la pena otra toma.")
        if args.nota and args.nota.upper() != nombre.upper():
            print(f"  AVISO: dices {args.nota} pero has cantado {nombre}.")
            print("  Revisa el nombre del fichero antes de darlo por bueno.")
    else:
        print("No he podido medir la altura: la grabación es muy corta o muy ruidosa.")

    m = normalizar(m)
    escribir(temporal, m)

    destino = SALIDA / f"{args.nombre}.opus"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(temporal),
         "-c:a", "libopus", "-b:a", "48k", "-ac", "1", str(destino)],
        check=True,
    )
    temporal.unlink(missing_ok=True)

    print(f"\nEscrito {destino.relative_to(RAIZ)}  ({destino.stat().st_size / 1024:.1f} KB)")
    print("\nQueda una cosa que no hace este script: anotar la grabación en")
    print("THIRD-PARTY-NOTICES.md. Es tuya, así que va como CC BY-SA 4.0 o CC0, lo que")
    print("prefieras, y hay que decir de dónde sale igual que con todo lo demás.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
