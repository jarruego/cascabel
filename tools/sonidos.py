#!/usr/bin/env python3
"""
Baja, verifica y prepara el banco de sonidos reales de `content/sonidos.json`.

**Qué resuelve.** Hasta el 2026-09-10 lo único grabado de verdad eran los instrumentos:
los tempos, los acordes, las campanas y «sonido largo/corto» estaban sintetizados, y no
había ni un animal, ni un vehículo, ni un sonido de casa, ni un fragmento de música con
estilo. El autor lo dijo así: «ahora suena todo muy robótico o directamente raro».

**De dónde sale.** De Wikimedia Commons, y solo de ahí, por una razón que no es de gusto:
Commons devuelve por API **la licencia y el autor de cada fichero**, así que la verificación
que `CLAUDE.md` §3 exige —«cada cosa que entra se apunta»— la hace esta herramienta y no la
memoria de nadie. Freesound tiene más sonidos pero exige una clave de API para bajarlos;
Commons no. Y en Commons están además el catálogo entero de Kevin MacLeod (CC BY 3.0, para
los estilos) y las grabaciones de Musopen (dominio público, para las obras).

**Lo que hace con cada entrada del manifiesto:**

 1. Pide a la API de Commons el fichero y sus metadatos, y **rechaza** todo lo que no esté
    en CC0, dominio público, CC BY o CC BY-SA. Una CC BY-NC o una «Attribution» sin versión
    no entran, por bueno que sea el sonido.
 2. Lo baja a `.cache/sonidos/` (fuera del repositorio) y recorta el tramo que dice el
    manifiesto: `desde` y `segundos`. Un ladrido son cuatro segundos, no cuarenta.
 3. Normaliza el pico a −3 dBFS, mete un desvanecido al principio y al final para que el
    corte no chasque, y codifica a Opus 48 kbps mono, como todo el audio del proyecto.
 4. Escribe en el propio manifiesto lo que ha verificado: licencia, autor, URL y fecha.
    Es lo que la pantalla de créditos enseña, y es lo que hace que la atribución que exige
    la CC BY salga de datos y no de un texto escrito a mano.

Uso:
    python tools/sonidos.py                # todo lo que falte o haya cambiado
    python tools/sonidos.py perro vaca     # solo esos ids
    python tools/sonidos.py --forzar       # rehace todo aunque ya exista

Salida: public/audio/sonidos/<categoria>/<id>.opus
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MANIFIESTO = RAIZ / "content" / "sonidos.json"
CACHE = RAIZ / ".cache" / "sonidos"
SALIDA = RAIZ / "public" / "audio" / "sonidos"
UA = {"User-Agent": "Cascabel/1.0 (biblioteca educativa libre; jarruego@mecohisa.com)"}
PICO_DB = -3.0

# Las que caben con Apache-2.0 y CC BY-SA 4.0 (CLAUDE.md §3). Con versión: una «Attribution»
# a secas no dice qué texto de licencia es, y eso no se acepta.
LICENCIAS_VALIDAS = re.compile(
    r"^(CC0(\s1\.0)?|Public domain|CC BY(-SA)?\s\d(\.\d)?(\s[a-z]{2})?)$", re.IGNORECASE
)


# Commons corta el grifo con un 429 en cuanto se le piden dos cosas por segundo. Un
# segundo y pico entre peticiones, y si aun asi protesta, se espera medio minuto y se
# vuelve a intentar: esto se ejecuta una vez y no tiene prisa.
PAUSA_S = 1.3


def pedir(url: str, timeout: int) -> bytes:
    for intento in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                datos = r.read()
            time.sleep(PAUSA_S)
            return datos
        except urllib.error.HTTPError as e:
            if e.code != 429 or intento == 3:
                raise
            time.sleep(30 * (intento + 1))
    raise RuntimeError("inalcanzable")


def api(params: dict) -> dict:
    params["format"] = "json"
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    return json.loads(pedir(url, 120))


def sin_html(texto: str) -> str:
    return re.sub(r"<[^>]+>", "", texto or "").strip()


def metadatos(titulo: str) -> dict:
    d = api({"action": "query", "titles": titulo, "prop": "imageinfo", "iiprop": "url|extmetadata"})
    pagina = next(iter(d["query"]["pages"].values()))
    if "missing" in pagina or not pagina.get("imageinfo"):
        raise RuntimeError(f"no existe en Commons: {titulo}")
    ii = pagina["imageinfo"][0]
    ext = ii.get("extmetadata", {})
    valor = lambda k: ext.get(k, {}).get("value")  # noqa: E731
    return {
        "url": ii["url"],
        "pagina": ii.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(titulo)}",
        "licencia": sin_html(valor("LicenseShortName") or ""),
        "licencia_url": valor("LicenseUrl") or "",
        "autor": sin_html(valor("Artist") or valor("Credit") or "")[:120],
    }


def descargar(url: str, destino: Path) -> None:
    if destino.exists():
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(pedir(url, 600))


def pico_db(fichero: Path, desde: float, segundos: float) -> float:
    salida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-ss", str(desde), "-t", str(segundos), "-i", str(fichero),
         "-af", "volumedetect", "-f", "null", "-"],
        # ffmpeg escribe el nombre del fichero en su salida, y los de Commons traen
        # acentos y comillas: leer eso con la pagina de codigos de Windows revienta.
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stderr
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", salida)
    if not m:
        raise RuntimeError(f"no se pudo medir el pico de {fichero.name}")
    return float(m.group(1))


def convertir(origen: Path, destino: Path, desde: float, segundos: float) -> None:
    ganancia = PICO_DB - pico_db(origen, desde, segundos)
    filtros = ",".join([
        f"volume={ganancia:.2f}dB",
        "afade=t=in:st=0:d=0.03",
        f"afade=t=out:st={max(0.0, segundos - 0.35):.2f}:d=0.35",
    ])
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(desde), "-t", str(segundos),
         # `-vn`: algunos ficheros de Commons son vídeo (.webm) con el sonido dentro, y sin esto
         # ffmpeg intenta meter la imagen en un .opus y falla.
         "-i", str(origen), "-vn", "-ac", "1", "-af", filtros, "-c:a", "libopus", "-b:a", "48k",
         "-application", "audio", str(destino)],
        check=True,
    )


def main() -> int:
    argumentos = [a for a in sys.argv[1:] if not a.startswith("--")]
    # La consola de Windows sale en cp1252 y se atraganta con «✓» y «✗»: se fuerza UTF-8.
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8")
    forzar = "--forzar" in sys.argv
    manifiesto = json.loads(MANIFIESTO.read_text(encoding="utf-8"))
    hechos = 0
    fallos: list[str] = []

    for s in manifiesto["sonidos"]:
        if argumentos and s["id"] not in argumentos:
            continue
        destino = SALIDA / s["categoria"] / f"{s['id']}.opus"
        if destino.exists() and s.get("verificado") and not forzar:
            continue
        try:
            m = metadatos(s["commons"])
            if not LICENCIAS_VALIDAS.match(m["licencia"]):
                raise RuntimeError(f"licencia no admitida: «{m['licencia']}»")
            extension = Path(urllib.parse.unquote(m["url"])).suffix or ".bin"
            crudo = CACHE / f"{s['id']}{extension}"
            descargar(m["url"], crudo)
            convertir(crudo, destino, float(s.get("desde", 0)), float(s["segundos"]))
            s["verificado"] = {
                "licencia": m["licencia"],
                "licencia_url": m["licencia_url"],
                "autor": m["autor"],
                "url": m["pagina"],
                "fecha": date.today().isoformat(),
            }
            hechos += 1
            print(f"✓ {s['categoria']}/{s['id']}  {m['licencia']}  · {m['autor'][:50]}")
        except Exception as exc:  # noqa: BLE001
            fallos.append(f"{s['id']}: {exc}")
            s.pop("verificado", None)
            print(f"✗ {s['id']}: {exc}")

    manifiesto["generado"] = date.today().isoformat()
    # Con salto de linea de Unix, como todo el repositorio: si no, en Windows sale CRLF.
    MANIFIESTO.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"\n{hechos} sonidos preparados, {len(fallos)} fallos.")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
