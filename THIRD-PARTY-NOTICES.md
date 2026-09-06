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

| Fichero | Obra | Autor | Fuente | Licencia | Fecha | Comprobación |
|---|---|---|---|---|---|---|
| `public/audio/muestras/marimba/*.opus` (6) | Marimba, notas F3 C4 G4 B4 F5 C6, golpe medio | Versilian Studios y colaboradores | https://github.com/sgossner/VCSL | CC0 1.0 | 2026-09-06 | `LICENSE` del repositorio dice «CC0 1.0 Universal»; la API de GitHub declara `CC0-1.0` |
| `public/audio/muestras/*.opus` | Pandero (frame drum), claves, campanilla nepalí y glockenspiel G4/C5/C6 | Versilian Studios y colaboradores | https://github.com/sgossner/VCSL | CC0 1.0 | 2026-09-06 | `LICENSE` del repositorio: «CC0 1.0 Universal» |
| `public/audio/muestras/tempo-*.opus`, `acorde-*.opus` | Derivados: la claves repetida al pulso, y tres glockenspiel transpuestos y mezclados | Versilian Studios (material) · Proyecto cocomusic (montaje) | `tools/muestras-derivadas.py` | CC0 1.0 | 2026-09-06 | CC0 permite cualquier transformación sin condiciones |
| `public/audio/muestras/voz-la.opus` | Un «la» cantado | Proyecto cocomusic | `tools/muestras-provisionales.py` | CC0 | 2026-09-06 | **sintetizada por formantes; es la única que queda por sustituir por una grabación real** |
| `content/actividades/c2-14-himno-de-la-alegria.json` | Tema del cuarto movimiento de la Sinfonía n.º 9 («Himno de la alegría»), melodía sola | Ludwig van Beethoven (1770-1827) | transcripción propia a notación ABC, verificada con `music21` | **Dominio público** | 2026-09-06 | el autor murió en 1827; incluso con los 80 años de la disposición transitoria española el plazo venció en 1907 |
| `content/actividades/c2-12-canon-a-dos-voces.json` | Melodía del canon «Frère Jacques» («Frère Blaise» en su fuente más antigua), transportada a fa mayor | Anónima francesa del siglo XVIII; se ha propuesto la autoría de Jean-Philippe Rameau (1683-1764) | manuscrito «Recueil de Timbres de Vaudevilles», BnF, fechado hacia 1775-1785 | **Dominio público** | 2026-09-06 | fuente conocida más antigua de 1780; el único autor que se le ha atribuido murió en 1764. La letra en español es nuestra, escrita para la actividad |
| `content/actividades/c2-16-cuatro-bandas.json` | Motivo inicial de la Sinfonía n.º 5, melodía sola | Ludwig van Beethoven (1770-1827) | transcripción propia a notación ABC, verificada con `music21` | **Dominio público** | 2026-09-06 | el autor murió en 1827; ni con los 80 años de la disposición transitoria española llegaría a 1907 |
| `public/iconos/*.svg` (27) | Iconos de actividad | OpenMoji · HfG Schwäbisch Gmünd | https://openmoji.org | **CC BY-SA 4.0** | 2026-09-06 | licencia en `LICENSE.txt` del repositorio oficial |

Las de VCSL van **procesadas** por `tools/muestras-instrumento.py`: pico normalizado a
−3 dBFS, silencio inicial recortado y codificadas a Opus 48 kbps mono. La CC0 permite
cualquier transformación sin condiciones; se documenta el proceso por trazabilidad, no por
obligación.

**Por qué se normaliza el pico**: las muestras crudas de VCSL van de −29 a −39 dBFS según la
nota. Diez decibelios de diferencia entre notas del mismo instrumento no suenan a matiz,
suenan a error.

**Sobre OpenMoji y la CC BY-SA 4.0.** Es la misma licencia que ya tienen nuestros
contenidos (`LICENSE-CONTENT.md`), así que no añade ninguna obligación nueva: atribuir —se
hace en la pantalla de créditos y aquí— y compartir igual, que ya hacemos. Los iconos son
**contenido**, no código: el código sigue siendo Apache-2.0 y la ShareAlike no lo alcanza.
Si algún día se modifican los dibujos, la versión modificada también será CC BY-SA 4.0.

**Sobre el Himno de la alegría.** Es el único caso de repertorio ajeno que ha entrado hasta
ahora, y conviene dejar dicho por qué se pudo. No basta con que una melodía «sea muy antigua»:
el plazo español son 70 años desde la muerte del autor, **u 80 si murió antes del 7-12-1987**,
y el fonograma es un derecho aparte del de la obra. Aquí los dos están limpios: Beethoven
murió en 1827, y **no se usa grabación ajena ninguna** —la melodía se sintetiza con las
muestras de marimba CC0 que ya están en el proyecto—. La transcripción a ABC es propia y se
pasó por `music21` antes de generar el JSON.

**Sobre la voz, y por qué sigue sintetizada.** Es la única muestra del banco que no es una
grabación, y no por falta de haberlo intentado. Se comprobó el 2026-09-06: **VCSL no tiene
voz** —su catálogo se organiza por la clasificación de Hornbostel-Sachs, y no hay categoría
vocal: solo aerófonos, cordófonos, electrófonos, idiófonos y membranófonos—; la colección de
la **Universidad de Iowa tampoco la tiene**, y además no declara licencia en ninguna parte;
y en **Freesound** sí hay material vocal CC0, pero elegir uno exige escucharlo, que es
justamente lo que no se puede delegar.

Se ha mejorado por **síntesis de formantes**, que es lo que separa una voz de un tono: un
formante es una resonancia fija del tracto vocal y se queda donde está aunque cambie la nota,
así que la envolvente del espectro no se mueve con la altura. La versión anterior eran cuatro
armónicos de amplitud fija, que es un órgano suave. Aun así sigue siendo una imitación, y en
las tres actividades donde se usa lo que el niño tiene que reconocer es *una voz*.

`tools/muestras-voz.py` convierte una grabación de móvil en muestra del banco: recorta
silencios, mide la altura y avisa si no coincide con la nota declarada, normaliza y codifica.
