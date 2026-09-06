#!/usr/bin/env python3
"""
Validador de actividades de Cascabel.

Comprueba dos cosas que ningún humano debería comprobar a mano:

  1. Que el JSON cumple schemas/actividad.schema.json.
  2. Que la música tiene sentido para la edad declarada: compases que cuadran,
     ámbito dentro de la tesitura infantil, saltos razonables y figuras
     coherentes con el curso.

Se ejecuta sobre una tanda entera de contenido generado con IA. Lo que no pasa
se descarta y se regenera; así la revisión humana es corta y dirigida.

Uso:
    python tools/validar.py content/actividades
    python tools/validar.py content/actividades/inf-01-semaforo.json --estricto
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ESQUEMA = RAIZ / "schemas" / "actividad.schema.json"

# La consola de Windows es cp1252 por defecto y revienta con los simbolos que
# usamos para el informe. Sin esto, el validador se cae despues de haber hecho
# bien todo el trabajo, que es la peor forma posible de fallar.
for flujo in (sys.stdout, sys.stderr):
    try:
        flujo.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# ---------------------------------------------------------------------------
# Reglas pedagógicas. Fuente: práctica habitual documentada en programaciones
# didácticas españolas, NO normativa. Ver docs/03-CURRICULO.md.
# ---------------------------------------------------------------------------

# Tesitura cómoda de canto por etapa, en notas científicas.
TESITURA = {
    "infantil": ("D4", "A4"),
    "primaria-c1": ("C4", "C5"),
    "primaria-c2": ("B3", "D5"),
    "primaria-c3": ("A3", "E5"),
}

# Salto melódico máximo aceptable, en semitonos.
SALTO_MAX = {
    "infantil": 5,       # cuarta justa
    "primaria-c1": 7,    # quinta justa
    "primaria-c2": 9,    # sexta mayor
    "primaria-c3": 12,   # octava
}

# Figuras que se consideran introducidas en cada etapa (acumulativo).
FIGURAS_ETAPA = {
    "infantil": {"negra", "corchea", "silencio-negra"},
    "primaria-c1": {"negra", "corchea", "semicorchea", "blanca",
                    "silencio-negra", "silencio-blanca"},
    "primaria-c2": {"redonda", "blanca", "negra", "corchea", "semicorchea",
                    "puntillo", "ligadura", "sincopa",
                    "silencio-redonda", "silencio-blanca", "silencio-negra",
                    "silencio-corchea"},
    "primaria-c3": None,  # todas
}

# Número máximo de objetos simultáneos en pantalla (UX infantil, NN/g).
#
# El límite es POR CARRIL, no por etapa (ver docs/adr/0005-una-app-tres-carriles.md), y una
# actividad solo declara etapa. El 2.º ciclo se ve desde los dos carriles de Primaria, así
# que se aplica el MÁS ESTRICTO de los que puedan abrirla: si cabe en el carril de los
# primeros lectores, cabe en el de los autónomos, y nunca al revés.
MAX_OBJETOS_CARRIL = {"infantil": 4, "lectores": 6, "autonomos": 9}
CARRILES_DE_ETAPA = {
    "infantil": ["infantil"],
    "primaria-c1": ["lectores"],
    "primaria-c2": ["lectores", "autonomos"],
    "primaria-c3": ["autonomos"],
}
MAX_OBJETOS = {
    etapa: min(MAX_OBJETOS_CARRIL[c] for c in carriles)
    for etapa, carriles in CARRILES_DE_ETAPA.items()
}


# Con --permisivo, la falta de jsonschema o music21 degrada a aviso en vez de
# fallar. Existe sólo para poder inspeccionar contenido sin el entorno montado;
# NUNCA debe usarse en npm run verificar.
PERMISIVO = False


@dataclass
class Resultado:
    fichero: Path
    errores: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errores


def cargar_esquema() -> dict:
    if not ESQUEMA.exists():
        sys.exit(f"No encuentro el esquema en {ESQUEMA}")
    return json.loads(ESQUEMA.read_text(encoding="utf-8"))


def validar_esquema(datos: dict, esquema: dict, r: Resultado) -> None:
    try:
        import jsonschema
    except ImportError:
        # Un aviso aquí haría que una tanda entera pasase sin validar NADA y aun
        # así dijese "correctas". Es un error, y en modo permisivo un aviso.
        mensaje = "jsonschema no instalado: NO se ha validado el esquema"
        (r.avisos if PERMISIVO else r.errores).append(mensaje)
        return
    validador = jsonschema.Draft202012Validator(esquema)
    for err in sorted(validador.iter_errors(datos), key=lambda e: list(e.path)):
        ruta = "/".join(str(p) for p in err.path) or "(raíz)"
        r.errores.append(f"esquema · {ruta}: {err.message}")


def validar_musica(datos: dict, r: Resultado) -> None:
    """Parsea el ABC con music21 y comprueba lo que un maestro miraría primero."""
    abc = (datos.get("musica") or {}).get("abc")
    if not abc:
        return

    try:
        from music21 import converter, interval, note, pitch
    except ImportError:
        mensaje = "music21 no instalado: NO se ha validado la música"
        (r.avisos if PERMISIVO else r.errores).append(mensaje)
        return

    try:
        pieza = converter.parse(abc, format="abc")
    except Exception as exc:  # noqa: BLE001 - queremos el mensaje tal cual
        r.errores.append(f"música · el ABC no se puede parsear: {exc}")
        return

    # 1. ¿Cuadran los compases? El ABC ya viene dividido por barras; si no lo
    #    estuviera, makeMeasures lo divide. Llamarlo dos veces revienta music21.
    try:
        compases = list(pieza.recurse().getElementsByClass("Measure"))
        if not compases:
            compases = list(pieza.makeMeasures().recurse().getElementsByClass("Measure"))
        # music21 parte un compás desbordado en trozos y ajusta su barDuration,
        # así que comparar cada compás consigo mismo nunca falla. Hay que medir
        # contra la indicación de compás de la pieza.
        ts = pieza.recurse().getElementsByClass("TimeSignature").first()
        esperado = ts.barDuration.quarterLength if ts else None
        if esperado and compases:
            duraciones = [c.duration.quarterLength for c in compases]
            total = sum(duraciones)

            # (a) La pieza entera tiene que ser un múltiplo del compás. Es la regla
            #     fuerte: el parser de ABC de music21 PARTE un compás desbordado en
            #     dos trozos que miden bien por separado, así que mirar compás a
            #     compás deja pasar cinco negras en un 4/4. El total, no.
            resto = total % esperado
            if min(resto, esperado - resto) > 1e-6:
                r.errores.append(
                    f"música · la pieza dura {total} negras, que no es múltiplo de "
                    f"{esperado} ({ts.ratioString}): sobra o falta parte de un compás"
                )

            # (b) Si el primero es corto es una anacrusa, y entonces el último tiene
            #     que completarlo exactamente. Si no, no era una anacrusa.
            if len(duraciones) > 1 and duraciones[0] < esperado - 1e-6:
                suma = duraciones[0] + duraciones[-1]
                if abs(suma - esperado) > 1e-6:
                    r.errores.append(
                        f"música · el primer compás dura {duraciones[0]} negras y el "
                        f"último {duraciones[-1]}; si es anacrusa deben sumar {esperado}"
                    )

            # (c) Los compases interiores, completos siempre.
            for i, real in enumerate(duraciones):
                if i in (0, len(duraciones) - 1):
                    continue
                if abs(real - esperado) > 1e-6:
                    r.errores.append(
                        f"música · el compás {i + 1} dura {real} negras y deberían "
                        f"ser {esperado} ({ts.ratioString})"
                    )
    except Exception as exc:  # noqa: BLE001
        r.errores.append(f"música · no se puede dividir en compases: {exc}")

    notas = [n for n in pieza.recurse().notes if isinstance(n, note.Note)]
    if not notas:
        return

    etapa = datos.get("etapa", "primaria-c2")

    # 2. Ámbito dentro de la tesitura de la edad.
    if etapa in TESITURA:
        bajo, alto = (pitch.Pitch(p) for p in TESITURA[etapa])
        grave = min(notas, key=lambda n: n.pitch.ps).pitch
        agudo = max(notas, key=lambda n: n.pitch.ps).pitch
        if grave.ps < bajo.ps:
            r.errores.append(
                f"música · nota más grave {grave.nameWithOctave} por debajo de "
                f"la tesitura de {etapa} ({bajo.nameWithOctave})"
            )
        if agudo.ps > alto.ps:
            r.errores.append(
                f"música · nota más aguda {agudo.nameWithOctave} por encima de "
                f"la tesitura de {etapa} ({alto.nameWithOctave})"
            )

    # 3. Saltos melódicos.
    limite = SALTO_MAX.get(etapa, 12)
    for anterior, siguiente in zip(notas, notas[1:]):
        salto = abs(interval.Interval(anterior.pitch, siguiente.pitch).semitones)
        if salto > limite:
            r.errores.append(
                f"música · salto de {salto} semitonos "
                f"({anterior.nameWithOctave}→{siguiente.nameWithOctave}); "
                f"el máximo para {etapa} es {limite}"
            )

    # 4. Coherencia de figuras con la etapa declarada.
    permitidas = FIGURAS_ETAPA.get(etapa)
    declaradas = set((datos.get("practica") or {}).get("figuras") or [])
    if permitidas is not None and declaradas - permitidas:
        r.avisos.append(
            f"práctica · figuras poco habituales en {etapa}: "
            f"{sorted(declaradas - permitidas)}"
        )


def validar_producto(datos: dict, r: Resultado) -> None:
    """Reglas de producto que están en CLAUDE.md y que nadie recuerda a las 2 de la mañana."""
    etapa = datos.get("etapa", "")
    entrada = datos.get("entrada") or {}
    evaluacion = datos.get("evaluacion") or {}
    contenido = datos.get("contenido") or {}

    if entrada.get("modo", "").startswith("microfono") and entrada.get("alternativa") in (None, "ninguna"):
        r.errores.append(
            "producto · una actividad de micrófono necesita alternativa por toque "
            "(accesibilidad y aulas con 25 micrófonos abiertos)"
        )

    if etapa == "infantil" and entrada.get("modo") == "arrastre":
        r.errores.append("producto · por debajo de 6 años solo tap, nunca arrastrar")

    # Objetos simultáneos en pantalla, contados según el tipo. Antes solo se miraba
    # "opciones", así que emparejar y ordenar se colaban sin contar nada.
    if datos.get("tipo") == "emparejar":
        opciones = (contenido.get("izquierda") or []) + (contenido.get("derecha") or [])
    elif datos.get("tipo") == "ordenar":
        opciones = contenido.get("elementos")
    else:
        opciones = contenido.get("opciones")

    if isinstance(opciones, list) and etapa in MAX_OBJETOS:
        if len(opciones) > MAX_OBJETOS[etapa]:
            r.errores.append(
                f"producto · {len(opciones)} objetos en pantalla; el máximo para "
                f"{etapa} es {MAX_OBJETOS[etapa]} (carril más estricto que puede abrirla: "
                f"{min(CARRILES_DE_ETAPA[etapa], key=lambda c: MAX_OBJETOS_CARRIL[c])})"
            )

    for prohibido in ("vidas", "tiempo_limite_s", "racha", "clasificacion"):
        if prohibido in evaluacion or prohibido in contenido:
            r.errores.append(f"producto · '{prohibido}' está prohibido: el error nunca castiga")

    tipo = datos.get("tipo")
    if tipo == "emparejar":
        claves = {e.get("clave") for e in (contenido.get("izquierda") or [])} | {
            e.get("clave") for e in (contenido.get("derecha") or [])
        }
        for par in contenido.get("parejas") or []:
            for lado in ("izquierda", "derecha"):
                if par.get(lado) not in claves:
                    r.errores.append(
                        f"contenido · la pareja apunta a '{par.get(lado)}', que no existe "
                        f"entre los elementos"
                    )
        sin_audio = [
            e.get("clave")
            for e in (contenido.get("derecha") or [])
            if not e.get("audio")
        ]
        if sin_audio:
            r.avisos.append(
                f"contenido · elementos sin audio en la columna derecha: {sin_audio}. "
                f"La autocorrección de 'emparejar' es por el oído; sin sonido no la hay"
            )

    if tipo == "ordenar":
        claves = [e.get("clave") for e in (contenido.get("elementos") or [])]
        orden = contenido.get("orden") or []
        if sorted(claves) != sorted(orden):
            r.errores.append(
                f"contenido · 'orden' y 'elementos' no contienen las mismas claves: "
                f"{sorted(orden)} frente a {sorted(claves)}"
            )

    if datos.get("entrada", {}).get("modo") == "arrastre":
        r.errores.append(
            "producto · el arrastre no se usa en ningún tipo: WCAG 2.5.7 exige alternativa "
            "y la motricidad fina infantil no da. Usa 'toque-secuencial'"
        )

    # Tiempo de pantalla. El esquema permite hasta 60 minutos porque una guia-aula es una
    # sesión de clase entera; pero una actividad en la que el niño está DELANTE de la
    # pantalla no debe pasar de 20. La distinción la marca `lugar`, no el tipo: una
    # `guia-aula` mal etiquetada como `pantalla` tiene el mismo problema.
    duracion = datos.get("duracion_min")
    lugar = datos.get("lugar", "pantalla")
    if isinstance(duracion, int) and lugar == "pantalla" and duracion > 20:
        r.errores.append(
            f"producto · {duracion} min delante de la pantalla; el máximo es 20. "
            f"Si es una sesión de aula, marca lugar: hibrida o fuera"
        )

    if "locucion" not in datos:
        r.avisos.append("producto · sin locución: los niños de 3-8 años no leen el enunciado")

    tol = evaluacion.get("tolerancia_ms")
    if tol:
        esperado = {
            "infantil": 150,
            "primaria-c1": 100,
            "primaria-c2": 100,
            "primaria-c3": 70,
        }.get(etapa)
        if esperado and tol.get("perfecto", 0) < esperado:
            r.avisos.append(
                f"producto · tolerancia de {tol.get('perfecto')} ms demasiado dura "
                f"para {etapa} (referencia: {esperado} ms)"
            )
    if tol and "desvio_medio_con_signo" not in (evaluacion.get("reporta") or []):
        r.avisos.append(
            "producto · una actividad rítmica debería reportar el desvío medio con signo: "
            "un niño desfasado pero regular tiene buen pulso"
        )


def validar_fichero(ruta: Path, esquema: dict) -> Resultado:
    r = Resultado(fichero=ruta)
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        r.errores.append(f"json · {exc}")
        return r

    if ruta.stem != datos.get("id"):
        r.avisos.append(f"El id '{datos.get('id')}' no coincide con el nombre del fichero")

    validar_esquema(datos, esquema, r)
    validar_producto(datos, r)
    validar_musica(datos, r)
    return r


def main() -> int:
    ap = argparse.ArgumentParser(description="Valida actividades de Cascabel")
    ap.add_argument("ruta", type=Path, help="Fichero .json o carpeta")
    ap.add_argument("--estricto", action="store_true", help="Los avisos también fallan")
    ap.add_argument(
        "--permisivo",
        action="store_true",
        help="Si faltan jsonschema o music21, avisa en vez de fallar (no usar en CI)",
    )
    args = ap.parse_args()

    global PERMISIVO
    PERMISIVO = args.permisivo

    ficheros = (
        sorted(args.ruta.glob("**/*.json")) if args.ruta.is_dir() else [args.ruta]
    )
    if not ficheros:
        print(f"No hay actividades en {args.ruta}")
        return 0

    esquema = cargar_esquema()
    resultados = [validar_fichero(f, esquema) for f in ficheros]

    fallos = 0
    for r in resultados:
        nombre = r.fichero.relative_to(RAIZ) if RAIZ in r.fichero.parents else r.fichero
        if r.errores:
            fallos += 1
            print(f"\n✗ {nombre}")
            for e in r.errores:
                print(f"    ERROR   {e}")
            for a in r.avisos:
                print(f"    aviso   {a}")
        elif r.avisos:
            if args.estricto:
                fallos += 1
            print(f"\n! {nombre}")
            for a in r.avisos:
                print(f"    aviso   {a}")
        else:
            print(f"✓ {nombre}")

    total = len(resultados)
    print(f"\n{total - fallos}/{total} actividades correctas.")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
