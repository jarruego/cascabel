#!/usr/bin/env python3
"""
Los cuatro sonidos de la percusión corporal: pitos, palmas, muslos y pies.

**Las palmas son una grabación de verdad** (VCSL, CC0, con varias repeticiones). Los otros
tres **están sintetizados**, y conviene decir por qué se acepta aquí lo que no se aceptó
para la voz.

En las actividades de timbre, el niño tiene que **reconocer** el sonido: ahí una imitación
sigue siendo una imitación y por eso la voz sintetizada se sustituyó por una muestreada. En
percusión corporal el sonido de la aplicación no es lo que hay que reconocer: **el sonido lo
hace el niño con su cuerpo**, y lo de la pantalla es la señal que le dice cuál toca y cuándo.
Es la misma función que el clic de un metrónomo, y a nadie le importa que el clic de un
metrónomo no sea una grabación de nada.

Aun así siguen siendo lo mismo que el resto: candidatos a grabarse el día que haya sesión de
grabación para las locuciones. Son cuatro sonidos y treinta segundos.

**Cómo se sintetizan, y de dónde salen los números.** Cada uno imita la física de lo que es:

 - **Pito**: un chasquido de uña contra dedo. Transitorio muy corto y brillante, con la
   energía entre 2 y 5 kHz. Casi todo ataque y casi nada de cuerpo.
 - **Muslo**: una palmada sobre carne y hueso. Amortiguada, de 200 a 600 Hz, corta: la carne
   absorbe los agudos y el muslo no resuena.
 - **Pie**: un golpe contra el suelo. Grave, de 60 a 150 Hz, con más cola porque lo que
   resuena es el suelo entero y no el pie.

Uso:  python tools/muestras-cuerpo.py
Salida: public/audio/muestras/cuerpo/*.opus
"""

from __future__ import annotations

import json
import math
import random
import shutil
import struct
import subprocess
import urllib.parse
import urllib.request
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "audio" / "muestras" / "cuerpo"
TASA = 48000

CARPETA_PALMAS = "Idiophones/Struck Idiophones/Claps"
BASE_VCSL = "https://raw.githubusercontent.com/sgossner/VCSL/master"

# Dos grabaciones por sonido: alternarlas evita que un patrón repetido suene a máquina.
REPETICIONES = 2


def escribir_wav(ruta: Path, muestras: list[float]) -> None:
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TASA)
        w.writeframes(
            b"".join(struct.pack("<h", int(max(-1, min(1, m)) * 32000)) for m in muestras)
        )


def ruido_filtrado(n: int, centro: float, ancho: float, semilla: int) -> list[float]:
    """
    Ruido pasado por un resonador de segundo orden.

    Un golpe sobre un cuerpo es ruido con una resonancia: no tiene altura definida —no es una
    nota— pero sí una banda donde se concentra la energía, y esa banda es lo que distingue un
    muslo de un pie. Sin el filtro, los tres sonarían al mismo «pff».
    """
    r = random.Random(semilla)
    w0 = 2 * math.pi * centro / TASA
    # Coeficientes de un pasabanda de segundo orden.
    alfa = math.sin(w0) * math.sinh(math.log(2) / 2 * (ancho / centro) * w0 / math.sin(w0))
    b0, b1, b2 = alfa, 0.0, -alfa
    a0, a1, a2 = 1 + alfa, -2 * math.cos(w0), 1 - alfa

    x1 = x2 = y1 = y2 = 0.0
    salida = []
    for _ in range(n):
        x = r.uniform(-1, 1)
        y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, x
        y2, y1 = y1, y
        salida.append(y)
    return salida


def golpe(dur: float, centro: float, ancho: float, caida: float, semilla: int) -> list[float]:
    """Ruido resonante con una caída exponencial. Sin ataque suave: un golpe es instantáneo."""
    n = int(dur * TASA)
    base = ruido_filtrado(n, centro, ancho, semilla)
    pico = max(abs(x) for x in base) or 1.0
    return [x / pico * math.exp(-i / TASA / caida) for i, x in enumerate(base)]


SONIDOS = {
    # Chasquido de uña: casi todo ataque, brillante, y se apaga en nada.
    "pitos": lambda s: golpe(0.16, 3200, 2400, 0.020, s),
    # Palmada sobre carne y hueso: amortiguada, media, la carne se come los agudos.
    "muslos": lambda s: golpe(0.22, 380, 320, 0.045, s),
    # Contra el suelo: grave y con cola, porque lo que resuena es el suelo.
    "pies": lambda s: golpe(0.45, 95, 90, 0.110, s),
}


def normalizar_y_codificar(wav: Path, destino: Path) -> int:
    with wave.open(str(wav), "rb") as w:
        datos = w.readframes(w.getnframes())
    n = len(datos) // 2
    pico = max(abs(v) for v in struct.unpack(f"<{n}h", datos[: n * 2])) / 32768 if n else 0
    ganancia = 0.0 if pico <= 0 else 20 * math.log10((10 ** (-3 / 20)) / pico)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
         "-af", f"volume={ganancia:.2f}dB",
         "-c:a", "libopus", "-b:a", "48k", "-ac", "1", str(destino)],
        check=True,
    )
    return destino.stat().st_size


def bajar_palmas() -> int:
    url = f"https://api.github.com/repos/sgossner/VCSL/contents/{urllib.parse.quote(CARPETA_PALMAS)}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            ficheros = sorted(e["name"] for e in json.load(r) if e["name"].endswith(".wav"))
    except Exception as exc:  # noqa: BLE001
        print(f"  no se pudieron listar las palmas: {exc}")
        return 0

    total = 0
    for i, fichero in enumerate(ficheros[:REPETICIONES]):
        crudo = SALIDA / f"_{fichero}"
        try:
            enlace = f"{BASE_VCSL}/{urllib.parse.quote(CARPETA_PALMAS)}/{urllib.parse.quote(fichero)}"
            with urllib.request.urlopen(enlace, timeout=60) as r, crudo.open("wb") as f:
                shutil.copyfileobj(r, f)
        except Exception as exc:  # noqa: BLE001
            print(f"  no se pudo bajar {fichero}: {exc}")
            continue
        mono = SALIDA / f"_mono{i}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(crudo),
             "-af", "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0",
             "-ac", "1", "-ar", str(TASA), str(mono)],
            check=True,
        )
        destino = SALIDA / f"palmas-{i + 1}.opus"
        total += normalizar_y_codificar(mono, destino)
        print(f"    {fichero:24} -> {destino.name}   (VCSL, grabación real)")
        crudo.unlink(missing_ok=True)
        mono.unlink(missing_ok=True)
    return total


def main() -> int:
    if not shutil.which("ffmpeg"):
        print("Falta ffmpeg.")
        return 1
    SALIDA.mkdir(parents=True, exist_ok=True)

    print("palmas  (VCSL, CC0)")
    total = bajar_palmas()

    for nombre, hacer in SONIDOS.items():
        print(f"\n{nombre}  (sintetizado)")
        for i in range(REPETICIONES):
            # Semilla distinta por repetición: es lo que hace que las dos no sean idénticas.
            temporal = SALIDA / f"_{nombre}{i}.wav"
            escribir_wav(temporal, hacer(1000 + i))
            destino = SALIDA / f"{nombre}-{i + 1}.opus"
            total += normalizar_y_codificar(temporal, destino)
            temporal.unlink(missing_ok=True)
            print(f"    -> {destino.name}")

    print(f"\nTotal: {total / 1024:.0f} KB")
    print("\nLas palmas son de VCSL (CC0). Los otros tres están SINTETIZADOS y son señal,")
    print("no timbre que reconocer: el sonido de verdad lo hace el niño con su cuerpo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
