#!/usr/bin/env python3
"""
Prepara una voz cantada grabada en clase para el sampler.

**Por qué existe.** No hay ninguna biblioteca libre con notas cantadas sueltas: VCSL y VSCO
no tienen voz, Commons tiene canciones enteras y no notas, y Freesound exige clave de API.
La voz del sampler es el programa 53 de General MIDI —un «ooh» muestreado— y el autor la oye
artificial, con razón. La única voz de verdad que va a haber en Cascabel es **la que se
grabe**: treinta segundos con un móvil, una nota cada tres semitonos, y esta herramienta
hace el resto. Sale con licencia CC BY-SA 4.0, como todo el contenido.

**Cómo grabar.** En una habitación sin eco, con el móvil a un palmo de la boca. Se canta
cada nota con «aah» y sin vibrato, dos segundos y medio, sin subir ni bajar, y se para. Un
fichero por nota, o uno solo con todas seguidas y un silencio entre ellas: la herramienta
las parte por los silencios. Las notas que hacen falta son las de `NOTAS`, y se pueden dar
con un piano, con la app (el piano de Instrumentos) o con la flauta dulce.

**Lo que comprueba.** La altura de cada trozo, con autocorrelación normalizada —el mismo
método que el afinador de la app—, y avisa si la nota cantada no es la declarada: cantar un
la cuando toca un sol no es un matiz, es otra muestra. Con `--forzar` entra igual.

Uso:
    python tools/muestras-voz.py grabaciones/            # C4.wav, D#4.wav... uno por nota
    python tools/muestras-voz.py voz.m4a --notas C4,D#4,F#4,A4,C5,D#5,F#5,A5
    python tools/muestras-voz.py ... --nombre voz-nina   # otro instrumento: voz-nina, voz-nino

Salida: public/audio/muestras/<nombre>/<nota>.opus, y el bloque para instrumentos.ts.
"""
from __future__ import annotations

import argparse
import math
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NOTAS = ["C4", "D#4", "F#4", "A4", "C5", "D#5", "F#5", "A5"]
TASA = 48000
UMBRAL_SILENCIO = 0.02
MINIMO_S = 0.6
CENTS_ADMITIDOS = 60


def a_wav(origen: Path, destino: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(origen),
         "-ac", "1", "-ar", str(TASA), str(destino)],
        check=True,
    )


def leer(wav: Path) -> list[float]:
    with wave.open(str(wav), "rb") as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2
        crudo = w.readframes(w.getnframes())
    return [int.from_bytes(crudo[i:i + 2], "little", signed=True) / 32768 for i in range(0, len(crudo), 2)]


def escribir(wav: Path, muestras: list[float]) -> None:
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TASA)
        w.writeframes(b"".join(int(max(-1, min(1, x)) * 32767).to_bytes(2, "little", signed=True) for x in muestras))


def trozos_por_silencio(x: list[float]) -> list[list[float]]:
    """Parte una grabación larga donde hay más de un cuarto de segundo casi en silencio."""
    ventana = TASA // 50
    activo = []
    for i in range(0, len(x), ventana):
        bloque = x[i:i + ventana]
        rms = math.sqrt(sum(v * v for v in bloque) / max(1, len(bloque)))
        activo.append(rms > UMBRAL_SILENCIO)
    trozos, actual, en_silencio = [], [], 0
    for i, a in enumerate(activo):
        if a:
            actual.extend(x[i * ventana:(i + 1) * ventana])
            en_silencio = 0
        else:
            en_silencio += 1
            if actual and en_silencio > 12:
                if len(actual) > MINIMO_S * TASA:
                    trozos.append(actual)
                actual = []
    if len(actual) > MINIMO_S * TASA:
        trozos.append(actual)
    return trozos


def altura_hz(x: list[float]) -> float | None:
    """
    Autocorrelación normalizada sobre el tramo central: el ataque y la caída sobran.

    Se coge el PRIMER pico que llega casi al máximo, no el máximo a secas: una señal
    periódica correlaciona igual de bien consigo misma a un periodo que a dos, y el máximo
    a secas cae un octava por debajo una vez de cada dos. Es el mismo criterio que usa el
    detector de la app (McLeod).
    """
    centro = x[len(x) // 3: 2 * len(x) // 3][: TASA // 4]
    if len(centro) < TASA // 10:
        return None
    lags = range(TASA // 1000, TASA // 60)  # de 1000 Hz a 60 Hz
    valores = []
    for lag in lags:
        num = sum(centro[i] * centro[i + lag] for i in range(0, len(centro) - lag, 2))
        den = sum(centro[i] * centro[i] for i in range(0, len(centro) - lag, 2))
        valores.append(num / den if den > 0 else 0.0)
    maximo = max(valores)
    if maximo < 0.7:
        return None
    for i in range(1, len(valores) - 1):
        if valores[i] >= 0.93 * maximo and valores[i] >= valores[i - 1] and valores[i] >= valores[i + 1]:
            return TASA / lags[i]
    return None


def a_midi(nota: str) -> int:
    nombres = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    return 12 * (int(nota[-1]) + 1) + nombres[nota[:-1]]


def cents_de_desvio(hz: float, nota: str) -> float:
    return 1200 * math.log2(hz / (440 * 2 ** ((a_midi(nota) - 69) / 12)))


def main() -> int:
    ap = argparse.ArgumentParser(description="Voz cantada grabada en clase, para el sampler")
    ap.add_argument("origen", type=Path, help="carpeta con un fichero por nota, o un fichero con todas seguidas")
    ap.add_argument("--notas", default=",".join(NOTAS), help="notas en orden, si es un solo fichero")
    ap.add_argument("--nombre", default="voz", help="nombre del instrumento (voz, voz-nina, voz-nino...)")
    ap.add_argument("--forzar", action="store_true", help="entra aunque la altura no cuadre")
    args = ap.parse_args()

    notas = args.notas.split(",")
    tmp = Path(tempfile.mkdtemp())
    pares: list[tuple[str, Path]] = []

    if args.origen.is_dir():
        for f in sorted(args.origen.iterdir()):
            if f.suffix.lower() in (".wav", ".m4a", ".mp3", ".ogg", ".opus", ".flac", ".aac"):
                wav = tmp / f"{f.stem}.wav"
                a_wav(f, wav)
                pares.append((f.stem.upper().replace("S", "#") if f.stem[-1].isdigit() else f.stem, wav))
    else:
        entero = tmp / "entero.wav"
        a_wav(args.origen, entero)
        trozos = trozos_por_silencio(leer(entero))
        if len(trozos) != len(notas):
            print(f"He encontrado {len(trozos)} notas y esperaba {len(notas)}: {', '.join(notas)}")
            return 1
        for nota, trozo in zip(notas, trozos):
            wav = tmp / f"{nota}.wav"
            escribir(wav, trozo)
            pares.append((nota, wav))

    problemas = 0
    for nota, wav in pares:
        hz = altura_hz(leer(wav))
        if hz is None:
            print(f"  {nota}: no se distingue la altura (¿demasiado corto, o con ruido?)")
            problemas += 1
        else:
            cents = cents_de_desvio(hz, nota)
            aviso = "" if abs(cents) <= CENTS_ADMITIDOS else f"   <- NO es {nota}: {cents:+.0f} cents"
            print(f"  {nota}: {hz:.1f} Hz ({cents:+.0f} cents){aviso}")
            if aviso:
                problemas += 1
    if problemas and not args.forzar:
        print("\nAlguna nota no cuadra. Se vuelve a grabar esa, o --forzar si de verdad es la buena.")
        return 1

    # La conversión es la misma que la de cualquier instrumento: pico, recorte, Opus.
    import importlib.util
    spec = importlib.util.spec_from_file_location("mi", RAIZ / "tools" / "muestras-instrumento.py")
    mi = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mi)
    salida = RAIZ / "public" / "audio" / "muestras" / args.nombre
    for nota, wav in pares:
        mi.convertir(wav, salida / f"{nota.lower().replace('#', 's')}.opus")

    const = args.nombre.upper().replace("-", "_")
    print(f"\nPara src/audio/instrumentos.ts:\nconst {const}: Muestra[] = [")
    for nota, _ in pares:
        print(f"  {{ nota: '{nota}', url: '/audio/muestras/{args.nombre}/{nota.lower().replace('#', 's')}.opus' }},")
    print("];\nY la licencia: CC BY-SA 4.0, con quien la haya cantado en THIRD-PARTY-NOTICES.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
