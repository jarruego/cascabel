#!/usr/bin/env python3
"""
Baja instrumentos de verdad de VCSL y de VSCO 2 CE y los prepara para el sampler.

**Qué resuelve.** Piano, xilófono, flauta y violín sonaban con el soundfont General MIDI de
2008 (`muestras-gm.py`), y no había ni trompeta, ni clarinete, ni violonchelo, ni flauta
dulce —que es la que se toca en el colegio—, ni arpa, ni órgano. El autor lo dijo así:
«suena todo muy robótico». Las dos bibliotecas de Versilian son **grabaciones**, CC0, y
están enteras en GitHub, así que se bajan fichero a fichero sin bajar los gigas que no se
usan.

**Cómo se eligen las notas.** Una muestra cada tres o cuatro semitonos, que es lo que
`docs/10` fija para los timbres sostenidos: con esa densidad el `Sampler` estira como mucho
semitono y medio, y eso no se oye. La lista de notas de cada instrumento está aquí porque
depende de qué grabó cada biblioteca —el trombón tiene un D#3 y no un D3— y de la tesitura
que un niño va a tocar: nada por debajo de lo que suena en un aula.

**Lo que hace con cada muestra**: la baja a `.cache/instrumentos/`, y la convierte con la
misma función que las de marimba —`muestras-instrumento.py`: pico a −3 dBFS, recorte del
silencio inicial relativo al pico, 2,25 s como mucho, Opus 48 kbps mono—.

Uso:
    python tools/muestras-vcsl.py                 # todos los instrumentos de la tabla
    python tools/muestras-vcsl.py trompeta arpa   # solo esos
    python tools/muestras-vcsl.py --tabla         # imprime el bloque para instrumentos.ts

Salida: public/audio/muestras/<instrumento>/<nota>.opus
"""
from __future__ import annotations

import importlib.util
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / ".cache" / "instrumentos"
UA = {"User-Agent": "Cascabel/1.0 (biblioteca educativa libre; jarruego@mecohisa.com)"}

VCSL = "https://raw.githubusercontent.com/sgossner/VCSL/master/"
VSCO = "https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/"

# instrumento -> (biblioteca, carpeta, plantilla con {n} para la nota, notas, ¿sostiene?)
# Las notas van como las nombra el fichero de origen (con #), y se guardan como las lee el
# sampler (C4, Ds4...). Las notas con velocidad distinta van como (nota, fichero).
INSTRUMENTOS = {
    "piano": (VCSL, "Chordophones/Zithers/Grand Piano, Steinway B/NoSus",
              "JHPiano_NoSus_Close_{n}_vl3_rr1.wav",
              ["C2", "D2", "F#2", "A#2", "C3", "E3", "G#3", "C4", "E4", "G#4", "C5", "E5", "G#5", "C6", "E6", "G#6", "C7"], False),
    "xilofono": (VCSL, "Idiophones/Struck Idiophones/Xylophone/Hard Mallets",
                 "Xylo_Hard_{n}_ff_01_far.wav", ["G3", "C4", "G4", "C5", "G5", "C6", "G6", "C7"], False),
    "glockenspiel": (VCSL, "Idiophones/Struck Idiophones/Glockenspiel",
                     "glock_medium_{n}_01.wav", ["G4", "C5", "G5", "C6", "G6", "C7"], False),
    "vibrafono": (VCSL, "Idiophones/Struck Idiophones/Vibraphone/Hard Mallets",
                  "Vibes_hard_{n}_v3_rr1_Main.wav", ["F2", "A2", "C3", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5"], False),
    "arpa": (VCSL, "Chordophones/Composite Chordophones/Concert Harp",
             "KSHarp_{n}_mf1.wav", ["D2", "F2", "A2", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5", "G5", "B5"], False),
    "flauta-dulce": (VCSL, "Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder/Sustain",
                     "SopRecorder_Sus_{n}_rr1_Main.wav",
                     ["C4", "D4", "E4", "F#4", "G#4", "A#4", "C5", "D5", "E5", "F#5", "G5", "A#5", "C6"], True),
    "saxofon": (VCSL, "Aerophones/Reed Aerophones/Tenor Saxophone/Non-Vibrato",
                "BrettTenor_NV_Main_{n}_vl2_rr1.wav", ["C2", "E2", "A#2", "D3", "F#3", "A#3", "D4", "F#4", "A#4"], True),
    "armonica": (VCSL, "Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C/Sustains/Normal",
                 "Hohner-Special20_Normal_{n}.wav", ["C3", "E3", "C4", "E4", "G4", "C5", "E5", "G5", "C6"], True),
    "organo": (VCSL, "Aerophones/Edge-blown Aerophones/Pipe Organ/Loud",
               "Rode_Man3Open_{n}.wav", ["C2", "D#2", "F#2", "A2", "C3", "D#3", "F#3", "A3", "C4", "D#4", "F#4", "A4", "C5", "D#5"], True),
    "flauta": (VSCO, "Woodwinds/Flute/susNV",
               "LDFlute_susNV_{n}_v1_1.wav", ["C4", "E4", "A4", "C5", "E5", "A5", "C6"], True),
    "violin": (VSCO, "Strings/Solo Violin/Arco Vib",
               "LLVln_ArcoVib_{n}_f.wav", ["G3", "A3", "C4", "E4", "G4", "A4", "C5", "E5", "G5", "A5", "C6"], True),
    "violonchelo": (VSCO, "Strings/Cello Section/susvib",
                    "susvib_{n}_v3_1.wav", ["G1", "B1", "D2", "F2", "A2", "C3", "E3", "G3", "B3", "D4", "F4"], True),
    "contrabajo": (VSCO, "Strings/Solo Contrabass/SusVib",
                   "BKCtbss_SusVib_{n}_v3_rr1.wav", ["C1", "E1", "G#1", "C#2", "E2", "G#2", "B2"], True),
    "trompeta": (VSCO, "Brass/Trumpet/sus",
                 "Sum_SHTrumpet_sus_{n}_v3_rr1.wav", ["A2", "C3", "D#3", "G3", "A#3", "D4", "F4", "A4", "C5"], True),
    "trompa": (VSCO, "Brass/F Horn/sus",
               "MOHorn_sus_{n}_v2_1.wav",
               ["G1", "A#1", "D2", "F2", "A2", "C3", ("D4", "MOHorn_sus_D4_v1_1.wav"), ("F4", "MOHorn_sus_F4_v1_1.wav")], True),
    "trombon": (VSCO, "Brass/Tenor Trombone/sus",
                "tenortbn_sus_{n}_v2_1.wav", ["D#1", "F1", "A#1", "D2", "F2", "C3", "D#3", "F3"], True),
    "tuba": (VSCO, "Brass/Tuba/sus",
             "Tuba3_sus_{n}_v2_rr1_Mid.wav", ["A#0", "D#1", "F1", "A#1", "D2", "F2", "A#2", ("D3", "Tuba3_sus_D3_v1_rr1_Mid.wav")], True),
    "clarinete": (VSCO, "Woodwinds/Clarinet/susLong",
                  "DCClar_susLong_{n}_v2_rr1_sum.wav", ["F2", "A#2", "D3", "F3", "A#3", "D4", "F4", "A#4", "D5", "F#5"], True),
    "oboe": (VSCO, "Woodwinds/Oboe/Sus",
             "Oboe_Sus_{n}_v3_Main.wav", ["A#3", "D4", "F4", "A#4", "D5", "F5"], True),
    "fagot": (VSCO, "Woodwinds/Bassoon/sus",
              "PSBassoon_{n}_v2_1.wav", ["A#1", "C2", "G2", "C3", "D#3", "G#3", "A3", "C4", "D#4"], True),
}

# Las que sustituyen a un instrumento de General MIDI se apuntan para el aviso de terceros.
SUSTITUYEN_A_GM = {"piano", "xilofono", "flauta", "violin"}


def cargar_convertidor():
    ruta = RAIZ / "tools" / "muestras-instrumento.py"
    spec = importlib.util.spec_from_file_location("muestras_instrumento", ruta)
    modulo = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(modulo)
    return modulo.convertir


def bajar(url: str, destino: Path) -> None:
    if destino.exists():
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    for intento in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
                destino.write_bytes(r.read())
            return
        except Exception:  # noqa: BLE001
            if intento == 2:
                raise
            time.sleep(5)


def nombre_sampler(nota: str) -> str:
    return nota.lower().replace("#", "s")


def main() -> int:
    if "--tabla" in sys.argv:
        for nombre, (_, _, _, notas, _) in INSTRUMENTOS.items():
            const = nombre.upper().replace("-", "_")
            print(f"const {const}: Muestra[] = [")
            for n in notas:
                nota = n[0] if isinstance(n, tuple) else n
                print(f"  {{ nota: '{nota}', url: '/audio/muestras/{nombre}/{nombre_sampler(nota)}.opus' }},")
            print("];")
        return 0

    pedidos = [a for a in sys.argv[1:] if not a.startswith("--")] or list(INSTRUMENTOS)
    convertir = cargar_convertidor()
    for nombre in pedidos:
        base, carpeta, plantilla, notas, _ = INSTRUMENTOS[nombre]
        salida = RAIZ / "public" / "audio" / "muestras" / nombre
        total = 0
        for n in notas:
            nota, fichero = (n if isinstance(n, tuple) else (n, plantilla.format(n=n)))
            url = base + urllib.parse.quote(f"{carpeta}/{fichero}")
            crudo = CACHE / nombre / f"{nota}.wav"
            bajar(url, crudo)
            destino = salida / f"{nombre_sampler(nota)}.opus"
            convertir(crudo, destino)
            total += destino.stat().st_size
        print(f"  {nombre}: {len(notas)} muestras, {total / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
