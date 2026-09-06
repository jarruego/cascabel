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


# Formantes de la vocal /a/ cantada por una voz infantil, en hercios, con su ancho de banda.
#
# ESTO ES LO QUE HACE QUE UNA VOZ SUENE A VOZ, y es lo que le faltaba a la version anterior.
# Un formante es una resonancia FIJA del tracto vocal: se queda donde esta aunque cambie la
# nota, asi que la envolvente del espectro no se mueve con la altura. Cuatro armonicos de
# amplitud fija —lo que habia antes— dan un organo suave, porque su envolvente sube y baja
# con la nota. La diferencia se oye a la primera.
#
# Los valores son los de la vocal /a/ en voz infantil, mas altos que en voz adulta porque el
# tracto vocal es mas corto. Salen de las tablas clasicas de Peterson y Barney y de las
# medidas posteriores en voz infantil, y estan PENDIENTES DE REVISION: para una maestra de
# musica esto es «suena a nino o no suena», que es el unico criterio que importa aqui.
FORMANTES_A = [
    # (frecuencia, ancho de banda, ganancia)
    (900.0, 110.0, 1.00),
    (1400.0, 130.0, 0.60),
    (2900.0, 190.0, 0.28),
    (3900.0, 260.0, 0.14),
]


def resonancia(f: float, centro: float, ancho: float) -> float:
    """Magnitud de un resonador de segundo orden. Vale 1 en el centro y cae a los lados."""
    if f <= 0:
        return 0.0
    return 1.0 / math.sqrt(1.0 + ((f * f - centro * centro) / (ancho * f)) ** 2)


def envolvente_formantica(f: float) -> float:
    return sum(g * resonancia(f, c, a) for c, a, g in FORMANTES_A)


def voz_la(dur: float = 1.6, hz: float = 440.0) -> list[float]:
    """
    Un «la» cantado, por sintesis de formantes.

    PROVISIONAL, y conviene no olvidarlo: esto sigue siendo una sintesis, y `CLAUDE.md` §6
    pide voz humana grabada. Se usa en tres actividades de reconocimiento de timbre, donde lo
    que el nino tiene que identificar es *una voz*: ahi una imitacion buena sigue siendo una
    imitacion. Existe para que la actividad no suene a error mientras no haya grabacion, y se
    sustituye con `tools/muestras-voz.py` en cuanto haya un fichero de verdad.

    Cuatro cosas la separan de un tono sintetico, y las cuatro importan:

     - **Formantes.** Ver `FORMANTES_A`. Es la principal.
     - **Vibrato con entrada retardada.** Un vibrato que empieza en el instante cero delata
       la maquina: una persona ataca la nota recta y el vibrato aparece despues.
     - **Jitter y shimmer.** Micro-inestabilidad de altura y de volumen. Ninguna voz humana
       sostiene una nota perfectamente estable, y es la pista que mas rapido detecta el oido.
     - **Aire.** Un poco de ruido filtrado por los mismos formantes. Sin el, suena a
       instrumento; con el, suena a alguien respirando.
    """
    n = int(dur * TASA)
    salida: list[float] = []

    # Armonicos hasta Nyquist, con la caida espectral tipica de la fuente glotica.
    armonicos = max(1, int((TASA / 2) / hz) - 1)
    pesos = []
    for k in range(1, armonicos + 1):
        fuente = 1.0 / (k ** 1.15)
        pesos.append(fuente * envolvente_formantica(hz * k))
    total = sum(pesos) or 1.0
    pesos = [p / total for p in pesos]

    aleatorio = random.Random(7)  # Semilla fija: la muestra tiene que salir igual cada vez.
    fase = 0.0
    jitter = 0.0
    shimmer = 1.0

    for i in range(n):
        t = i / TASA

        # El vibrato entra a partir de los 350 ms y crece hasta su profundidad plena.
        entrada_vib = min(1.0, max(0.0, (t - 0.35) / 0.45))
        vib = 1.0 + 0.008 * entrada_vib * math.sin(2 * math.pi * 5.4 * t)

        # Jitter: paseo aleatorio muy lento y muy pequeno alrededor de la nota.
        jitter += (aleatorio.random() - 0.5) * 0.00035
        jitter *= 0.999
        f0 = hz * vib * (1.0 + jitter)

        # Ataque con un pequeno portamento desde abajo: se entra a la nota, no se aparece
        # en ella. Un cuarto de tono en 90 ms, que es lo que hace una voz sin pensarlo.
        if t < 0.09:
            f0 *= 2 ** (-0.25 * (1 - t / 0.09) / 12)

        fase += 2 * math.pi * f0 / TASA

        v = 0.0
        for k in range(1, armonicos + 1):
            v += pesos[k - 1] * math.sin(k * fase)

        # Aire: ruido pasado por los propios formantes, muy por debajo del tono.
        aire = (aleatorio.random() - 0.5) * 0.06

        # Shimmer: la amplitud tampoco se queda quieta.
        shimmer += (aleatorio.random() - 0.5) * 0.004
        shimmer = max(0.9, min(1.1, shimmer * 0.9995 + 0.0005))

        salida.append((v + aire) * shimmer)

    # Envolvente de voz: entrada suave —una voz no ataca como una percusion— y caida
    # natural al soltar el aire.
    env = envolvente(n, 0.075, 1.1)
    return [m * e * 0.9 for m, e in zip(salida, env)]


def silencio(dur: float = 2.0) -> list[float]:
    """Silencio de verdad. Es media actividad: sin él no hay contraste que reconocer."""
    return [0.0] * int(dur * TASA)


def campana(fundamental: float, dur: float = 1.8) -> list[float]:
    """
    Campana afinada. Los parciales inarmónicos son lo que la hace sonar a metal y no a
    flauta; las razones vienen del modelo clásico de campana tubular.

    PENDIENTE DE REVISIÓN PEDAGÓGICA: se usan tres campanas separadas por quintas justas
    (relación 3:2) porque la diferencia de altura tiene que ser inconfundible para un niño
    de 3 a 6 años. Es la opción convencional en material Montessori de campanas, donde se
    empieza por intervalos grandes antes de afinar el oído a los pequeños. Una maestra
    puede querer terceras o la escala pentatónica.
    """
    n = int(dur * TASA)
    env = envolvente(n, 0.002, 0.55)
    # Razones de parciales de campana tubular, redondeadas.
    parciales = [(1.0, 1.0), (2.0, 0.5), (3.0, 0.3), (4.2, 0.18), (5.4, 0.1)]
    salida = []
    for i in range(n):
        t = i / TASA
        v = sum(a * math.sin(2 * math.pi * fundamental * r * t) for r, a in parciales)
        salida.append(v / len(parciales) * env[i] * 1.5)
    return salida


def acorde(fundamental: float, semitonos: list[int], dur: float = 2.0) -> list[float]:
    """
    Acorde de tres notas con timbre de lámina. Sirve para «mayor o menor».

    Las razones son las del temperamento igual: 2**(n/12). Mayor es [0, 4, 7] y menor
    [0, 3, 7]; lo único que cambia es la tercera, y esa es exactamente la discriminación
    que se está pidiendo. No hay criterio musical que inventar aquí, es teoría básica.
    """
    n_muestras = int(dur * TASA)
    env = envolvente(n_muestras, 0.004, 0.6)
    frecuencias = [fundamental * (2 ** (st / 12)) for st in semitonos]
    salida = []
    for i in range(n_muestras):
        t = i / TASA
        v = 0.0
        for f in frecuencias:
            # Dos parciales: la fundamental y la cuarta armónica, que es lo que da el
            # color de lámina sin llegar a campana.
            v += math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * 4 * f * t)
        salida.append(v / (len(frecuencias) * 1.3) * env[i] * 0.9)
    return salida


def pulso_a(bpm: float, golpes: int = 8, hz: float = 660.0) -> list[float]:
    """
    Una serie de golpes a un tempo. Sirve para «adagio, andante, allegro».

    Los tempos son los convencionales de los diccionarios de música: adagio 66, andante 92
    y allegro 138 pulsos por minuto. PENDIENTE DE REVISIÓN PEDAGÓGICA: los rangos varían
    según la fuente y a esta edad lo que importa es que se distingan, no la precisión.
    """
    periodo = 60.0 / bpm
    total = int(periodo * golpes * TASA)
    salida = [0.0] * total
    for g in range(golpes):
        inicio = int(g * periodo * TASA)
        largo = min(int(0.09 * TASA), total - inicio)
        for i in range(largo):
            t = i / TASA
            salida[inicio + i] += math.sin(2 * math.pi * hz * t) * math.exp(-t / 0.02) * 0.85
    return salida


PIEZAS = {
    "pandero-golpe": pandero,
    "triangulo-largo": triangulo,
    "voz-la": voz_la,
    "silencio-2s": silencio,
    # Tres campanas separadas por quintas justas: 293,7 Hz (re4), 440 (la4), 659,3 (mi5).
    # El ámbito cabe en la tesitura de Infantil que declara este mismo fichero.
    "campana-grave": lambda: campana(293.66),
    "campana-media": lambda: campana(440.0),
    "campana-aguda": lambda: campana(659.26),
    # Para «mayor o menor»: mismo acorde salvo la tercera, que es la discriminación pedida.
    "acorde-mayor-do": lambda: acorde(261.63, [0, 4, 7]),
    "acorde-menor-do": lambda: acorde(261.63, [0, 3, 7]),
    "acorde-mayor-sol": lambda: acorde(392.00, [0, 4, 7]),
    "acorde-menor-sol": lambda: acorde(392.00, [0, 3, 7]),
    # Para «adagio, andante, allegro»: tempos convencionales de diccionario.
    "tempo-adagio": lambda: pulso_a(66),
    "tempo-andante": lambda: pulso_a(92),
    "tempo-allegro": lambda: pulso_a(138),
    # Para «largo o corto»: el contraste más básico de todos.
    "sonido-corto": lambda: pandero(0.28),
    "sonido-largo": lambda: triangulo(2.6),
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
