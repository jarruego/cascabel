#!/usr/bin/env python3
"""
Genera los iconos PNG de la PWA a partir de la misma geometría que public/favicon.svg.

No es adorno: Chrome de Android **exige** un icono de 192 y otro de 512 para ofrecer
«Instalar aplicación». Sin ellos no se puede probar el micrófono en modo instalado, que es
media tarea T0.1.

Se genera por código en vez de exportarse a mano para que la marca no se desincronice: si
cambia el favicon, se cambian aquí las mismas cinco formas y se vuelve a ejecutar.

Uso:  python tools/iconos.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public"

ROJO = (191, 59, 38, 255)     # --acento
PAPEL = (242, 243, 239, 255)  # --papel

# Se dibuja a 8x y se reduce con LANCZOS: es el modo barato de tener bordes suaves sin
# meter una dependencia de rasterizado vectorial.
ESCALA = 8


def dibujar(lado: int, margen: float = 0.0) -> Image.Image:
    """
    `margen` es la fracción de lado que se deja libre alrededor del dibujo. Para el icono
    `maskable` hace falta un 20 % por cada lado: Android recorta el icono en círculo, en
    gota o en cuadrado redondeado según el fabricante, y sin margen se come el badajo.
    """
    n = lado * ESCALA
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fondo: cuadrado redondeado a sangre. En maskable ocupa todo, y el recorte cae aquí.
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 7 / 32), fill=ROJO)

    # Las cinco formas del favicon, en coordenadas de su viewBox de 32, encogidas por el
    # margen para que el recorte de Android no toque el dibujo.
    u = (n * (1 - 2 * margen)) / 32
    ox = oy = n * margen

    def x(v: float) -> float:
        return ox + v * u

    def y(v: float) -> float:
        return oy + v * u

    # Cuerpo del cascabel.
    d.ellipse([x(7), y(9), x(25), y(27)], fill=PAPEL)
    # Ranura horizontal.
    d.rectangle([x(6), y(16), x(26), y(18.2)], fill=ROJO)
    # Badajo.
    d.ellipse([x(14), y(22), x(18), y(26)], fill=ROJO)
    # Anilla.
    d.rounded_rectangle([x(13), y(4), x(19), y(8)], radius=int(1.5 * u), fill=PAPEL)

    return img.resize((lado, lado), Image.LANCZOS)


def main() -> int:
    for lado in (192, 512):
        ruta = SALIDA / f"icono-{lado}.png"
        dibujar(lado).save(ruta, optimize=True)
        print(f"  {ruta.relative_to(RAIZ)}  {ruta.stat().st_size / 1024:.1f} KB")

    ruta = SALIDA / "icono-512-maskable.png"
    dibujar(512, margen=0.2).save(ruta, optimize=True)
    print(f"  {ruta.relative_to(RAIZ)}  {ruta.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
