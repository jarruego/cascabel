# Material de terceros

Inventario de todo el material externo incorporado al proyecto. **Se actualiza en el mismo
commit en que se añade el material**, nunca después: reconstruir esta trazabilidad a los dos
años es imposible, y sin ella no se puede relicenciar nada ni responder a una reclamación.

## Cómo añadir una entrada

| Campo | Ejemplo |
|---|---|
| Fichero | `public/audio/muestras/marimba-c4.opus` |
| Obra original | Marimba C4 |
| Autor | Versilian Studios |
| Fuente (URL) | https://github.com/sgossner/VCSL |
| Licencia | CC0 |
| Fecha de descarga | 2026-09-05 |
| Comprobación | dominio público verificado / licencia en el repositorio |

Las actividades declaran además su propio material en el campo `creditos` de su JSON. La
pantalla de créditos de la app se genera a partir de ahí.

## Software

| Paquete | Licencia |
|---|---|
| React, React DOM | MIT |
| Vite, vite-plugin-pwa, Workbox | MIT |
| Tone.js | MIT |
| abcjs | MIT |
| VexFlow | MIT |
| pitchy (referencia del algoritmo NSDF/McLeod) | MIT |
| Zustand | MIT |
| music21 (solo herramientas, no se distribuye) | BSD-3-Clause |

**Verovio**, si algún día se incorpora, es **LGPL-3.0-or-later**: debe cargarse como fichero
independiente e inalterado (`import()` dinámico), nunca dentro del bundle, y hay que publicar
el aviso de licencia y el enlace a su código fuente.

## Tipografías

| Fichero | Obra | Autor | Fuente | Licencia | Fecha | Comprobación |
|---|---|---|---|---|---|---|
| `public/fuentes/Andika-Regular.woff2` | Andika 7.000 Regular | SIL International | https://github.com/silnrsi/font-andika/releases/tag/v7.000 | SIL OFL 1.1 | 2026-09-06 | `OFL.txt` incluido en el paquete y copiado a `public/fuentes/Andika-OFL.txt`; aviso de licencia presente en la tabla `name` de la propia fuente |
| `public/fuentes/Bravura.woff2` | Bravura (notación SMuFL) | Steinberg Media Technologies | https://github.com/steinbergmedia/bravura | SIL OFL 1.1 | 2026-09-06 | licencia declarada en el repositorio oficial de SMuFL |

Pendiente, cuando se implemente el conmutador de tipografía de `docs/04-DISENO-UI.md`:
Atkinson Hyperlegible (Braille Institute, OFL 1.1) y OpenDyslexic.

**Andika va recortada.** `tools/fuentes.py` la reduce de 289 KB a 40 KB conservando latino
básico y sus suplementos, que es lo que hace falta para castellano y para las lenguas
cooficiales de T3.2. La OFL permite modificar y redistribuir; lo que exige es conservar el
aviso de licencia, y se conserva por partida doble: en `Andika-OFL.txt` y dentro de la
propia fuente. **Bravura no se recorta**: sus glifos viven en el Área de Uso Privado y
recortar por rangos la rompe.

Lo que la OFL **prohíbe** y conviene no olvidar: vender las fuentes por separado, y usar
los Nombres Reservados de Fuente (`Andika`, `Bravura`) en una versión modificada. El
recorte no cambia el nombre porque no altera los glifos, solo elimina los que no usamos;
si algún día se retocan trazos, hay que renombrar.

Todas se sirven desde `/fuentes`, nunca desde un CDN externo. La CSP (`font-src 'self'`)
lo hace cumplir técnicamente: no es una promesa, es que el navegador no puede hacer otra
cosa. Ver `docs/08-LEGAL.md`.

## Audio, imágenes y partituras

_(Vacío por ahora. Una fila por asset a medida que entren.)_

| Fichero | Obra | Autor | Fuente | Licencia | Fecha |
|---|---|---|---|---|---|
