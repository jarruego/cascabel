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

| Fuente | Autor | Licencia |
|---|---|---|
| Bravura (notación SMuFL) | Steinberg | SIL OFL 1.1 |
| Andika | SIL International | SIL OFL 1.1 |
| Atkinson Hyperlegible | Braille Institute | SIL OFL 1.1 |

Todas se sirven desde `/fuentes`, nunca desde un CDN externo.

## Audio, imágenes y partituras

_(Vacío por ahora. Una fila por asset a medida que entren.)_

| Fichero | Obra | Autor | Fuente | Licencia | Fecha |
|---|---|---|---|---|---|
