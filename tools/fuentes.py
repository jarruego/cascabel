#!/usr/bin/env python3
"""
Prepara las tipografías de `public/fuentes/`.

Las fuentes se sirven SIEMPRE desde nuestro origen, nunca desde Google Fonts: eso
transmitiría la IP del niño a un tercero y hay condena judicial en Alemania por ello.
Ver docs/08-LEGAL.md. La CSP (`font-src 'self'`) lo hace cumplir técnicamente.

Andika se recorta a los caracteres que usamos. El paquete completo son 289 KB porque
cubre latino, cirílico, griego y AFI; nosotros necesitamos castellano y, cuando llegue
T3.2, valenciano, catalán, gallego, euskera e inglés. Todos caben en latino básico más
los suplementos A y B.

Bravura NO se recorta: sus glifos viven en el Área de Uso Privado según SMuFL y recortar
por rangos es una forma fiable de romperla. Se sirve entera y se carga solo cuando hace
falta, que hoy es nunca (T2.2).

Uso:  python tools/fuentes.py <ruta al zip de Andika> <ruta a Bravura.woff2>
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "fuentes"

# Rangos Unicode que se conservan de Andika.
UNICODES = ",".join(
    [
        "U+0020-007E",  # ASCII imprimible
        "U+00A0-00FF",  # Latino-1: á é í ó ú ñ ü ¿ ¡ ç
        "U+0100-017F",  # Latino extendido A: ŀ (catalán), ā, ō...
        "U+2018-201D",  # comillas tipográficas
        "U+2013-2014",  # guiones
        "U+2026",       # puntos suspensivos
        "U+00B7",       # punt volat del catalán: l·l
        "U+20AC",       # euro
    ]
)


def recortar_andika(zip_andika: Path) -> None:
    with zipfile.ZipFile(zip_andika) as z:
        nombre = next(n for n in z.namelist() if n.endswith("web/Andika-Regular.woff2"))
        crudo = SALIDA / "_andika-completa.woff2"
        crudo.write_bytes(z.read(nombre))
        # La licencia viaja con la fuente: la OFL obliga a conservarla.
        licencia = next(n for n in z.namelist() if n.endswith("OFL.txt"))
        (SALIDA / "Andika-OFL.txt").write_bytes(z.read(licencia))

    fuente = TTFont(crudo, flavor="woff2")
    opciones = subset.Options()
    opciones.flavor = "woff2"
    opciones.desubroutinize = True
    opciones.layout_features = ["*"]  # kerning y ligaduras: se leen mejor
    opciones.name_IDs = ["*"]  # los nombres incluyen el aviso de licencia
    opciones.notdef_outline = True
    subsetter = subset.Subsetter(options=opciones)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(fuente)

    destino = SALIDA / "Andika-Regular.woff2"
    fuente.save(destino, reorderTables=False)
    antes = crudo.stat().st_size
    crudo.unlink()
    print(f"  Andika-Regular.woff2  {destino.stat().st_size / 1024:.1f} KB "
          f"(de {antes / 1024:.1f} KB, {100 - destino.stat().st_size * 100 // antes:.0f} % menos)")


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    SALIDA.mkdir(parents=True, exist_ok=True)
    recortar_andika(Path(sys.argv[1]))

    bravura = SALIDA / "Bravura.woff2"
    bravura.write_bytes(Path(sys.argv[2]).read_bytes())
    print(f"  Bravura.woff2         {bravura.stat().st_size / 1024:.1f} KB (sin recortar)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
