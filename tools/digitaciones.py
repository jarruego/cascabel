#!/usr/bin/env python3
"""
Genera los diagramas de digitación de flauta dulce soprano.

**Por qué se generan y no se descargan.** No hay ningún banco CC0 de diagramas de flauta, y
los que circulan son escaneos de métodos con derechos. Dibujarlos es trivial —un rectángulo
y ocho círculos— y así son nuestros, quedan CC BY-SA como el resto del contenido, y pesan
unos cientos de bytes cada uno en vez de un PNG.

**Y solo se generan si, la y sol.** No es prudencia excesiva: la digitación de la flauta
soprano tiene **dos sistemas**, barroco y alemán, y el instrumento del aula puede ser de
cualquiera de los dos. Enseñar una digitación equivocada es peor que no enseñar ninguna.

Ahora bien, **si, la y sol se digitan igual en los dos sistemas**: si es pulgar más el
primer agujero, la añade el segundo y sol el tercero. Lo que separa a los dos sistemas es la
familia del fa —fa, fa sostenido y sus agudos—, donde el barroco usa digitación de horquilla
y el alemán una simple. Comprobado el 2026-09-06 contra varias tablas de digitación
publicadas, incluida la de Peripole.

Por eso la secuencia si-la-sol es la que empieza en todos los métodos escolares y la que
declara el catálogo: **son las tres notas que se pueden enseñar sin tener que preguntar qué
flauta hay en el aula**. Añadir do' y re' —el siguiente paso de `docs/03-CURRICULO.md`— es
seguro por el mismo motivo, pero no se hace aquí sin comprobarlo igual de bien.

Uso:  python tools/digitaciones.py
Salida: public/digitaciones/*.svg
"""

from __future__ import annotations

from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "digitaciones"

# Nota -> (pulgar tapado, agujeros delanteros tapados). Los agujeros se numeran de 1 a 7
# desde el más cercano a la boquilla, que es como los numera cualquier método.
DIGITACIONES: dict[str, tuple[bool, set[int]]] = {
    "si": (True, {1}),
    "la": (True, {1, 2}),
    "sol": (True, {1, 2, 3}),
}

ANCHO, ALTO = 90, 260
# El recuadro empieza a la izquierda del cero: el agujero del pulgar y su rótulo van fuera
# del cuerpo, a la izquierda, y con el recuadro en 0 la palabra «pulgar» salía cortada por
# la mitad. Lo vio el autor el 2026-09-12.
IZQUIERDA = -28
CENTRO = 52          # eje de los agujeros delanteros
RADIO = 11
PRIMERO = 62         # y del primer agujero
PASO = 26            # separación entre agujeros


def circulo(cx: int, cy: int, r: int, tapado: bool) -> str:
    """
    Tapado = relleno oscuro; abierto = solo contorno.

    **El relleno no informa solo.** Un agujero tapado lleva además el contorno más grueso,
    porque en una fotocopia en blanco y negro de un colegio la diferencia de tono se pierde
    y la de grosor no. Es la regla 6 aplicada a un dibujo que va a acabar en papel.
    """
    relleno = "#171c2b" if tapado else "none"
    grosor = 3 if tapado else 2
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{relleno}" '
            f'stroke="#171c2b" stroke-width="{grosor}"/>')


def diagrama(nombre: str, pulgar: bool, tapados: set[int]) -> str:
    partes = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{IZQUIERDA} 0 {ANCHO - IZQUIERDA} {ALTO}" '
        f'role="img" aria-label="Digitación de {nombre} en flauta dulce soprano">',
        f'<title>Digitación de {nombre}</title>',
        # Cuerpo de la flauta.
        f'<rect x="30" y="10" width="44" height="{ALTO - 30}" rx="22" '
        f'fill="#fbfbf9" stroke="#171c2b" stroke-width="3"/>',
        # Boquilla, para que se vea por dónde se sopla y el dibujo tenga orientación.
        '<path d="M30 24 h44" stroke="#171c2b" stroke-width="3"/>',
        # Agujero del pulgar: va DETRÁS, así que se dibuja fuera del cuerpo y unido con una
        # línea de puntos. Ponerlo dentro lo confundiría con los delanteros.
        '<line x1="20" y1="44" x2="34" y2="44" stroke="#171c2b" '
        'stroke-width="2" stroke-dasharray="3 3"/>',
        circulo(12, 44, 9, pulgar),
        # Trece y no once: el dibujo se ve a 190 px de alto, y a once la palabra no se leía.
        '<text x="12" y="30" text-anchor="middle" font-size="13" '
        'font-family="system-ui, sans-serif" fill="#4a5266">pulgar</text>',
    ]
    for i in range(1, 8):
        partes.append(circulo(CENTRO, PRIMERO + PASO * (i - 1), RADIO, i in tapados))
    partes.append('</svg>')
    return "\n".join(partes)


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, (pulgar, tapados) in DIGITACIONES.items():
        ruta = SALIDA / f"flauta-{nombre}.svg"
        ruta.write_text(diagrama(nombre, pulgar, tapados), encoding="utf-8")
        print(f"  {ruta.relative_to(RAIZ)}  ({ruta.stat().st_size} B)")
    print(f"\n{len(DIGITACIONES)} diagramas. Barroca y alemana coinciden en estas tres notas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
