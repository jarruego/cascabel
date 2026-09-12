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

Ordenado por **lo que llega al navegador del niño**, y no por orden alfabético, porque es lo
que decide la obligación: las licencias de software obligan al que *distribuye*. Una
dependencia instalada que no viaja en el paquete no genera aviso — pero se apunta igual, para
que se sepa por qué está en `package.json`.

**Se distribuye con la aplicación.** Aquí es donde las obligaciones son reales:

| Paquete | Licencia | Cómo llega |
|---|---|---|
| React, React DOM | MIT | En el paquete principal |
| React Router | MIT | En el paquete principal |
| Zustand | MIT | En el paquete principal |
| Workbox (a través de `vite-plugin-pwa`) | MIT | Genera el *service worker*, que sí se sirve |
| VexFlow | MIT | **Aparte**: trozo `partitura`, con `import()` dinámico, el día que se abre un pentagrama |

**Instalado y NO se distribuye.** Ninguna de estas tres llega al navegador hoy:

| Paquete | Licencia | Por qué está y por qué no viaja |
|---|---|---|
| abcjs | MIT | Dibuja la partitura de la ficha del maestro desde la notación ABC del JSON. Solo la carga `app/Ficha.tsx`, con `import()` dinámico: va en su propio trozo y no en el bundle de las actividades |
| Tone.js | MIT | Igual: instalada para el transporte, todavía sin usar |
| pitchy | MIT | El detector de tono **no la usa**. `public/worklets/tono-processor.js` implementa NSDF/McLeod directamente, porque un worklet se carga por URL y no por `import`. Ver abajo |

**No se distribuye nunca**: las herramientas de desarrollo (Vite, `@vitejs/plugin-react`,
ESLint, Prettier, Vitest, jsdom — MIT; TypeScript — Apache-2.0) y `music21` (BSD-3-Clause),
que solo corre en `tools/`.

**Sobre pitchy y el algoritmo de McLeod.** Lo que el worklet implementa es el **NSDF**
descrito en McLeod y Wyvill, *A Smarter Way to Find Pitch* (ICMC 2005). Un algoritmo publicado
no está protegido por derecho de autor; lo que tiene licencia es el **código** que lo
implementa, y ese código es nuestro. La cita al artículo es rigor académico, no una obligación
legal; el aviso MIT de pitchy no hace falta mientras la librería no viaje, y hoy no viaja.

### Si algún día entra una dependencia con copyleft

El criterio completo está en `CLAUDE.md` §3 y razonado en `docs/08-LEGAL.md`. Lo que hay que
escribir **aquí** en cada caso:

- **LGPL** (es el caso de **Verovio**, LGPL-3.0-or-later, si algún día se incorpora): debe
  cargarse como fichero independiente e **inalterado** con `import()` dinámico, nunca dentro
  del bundle. Se publica el aviso de licencia y el enlace a su código fuente. La razón de la
  frontera técnica es legal: la LGPL exige que el usuario pueda sustituir la librería, y dentro
  de un bundle minificado no puede.
- **MPL-2.0**: sus ficheros conservan su licencia y los nuestros siguen siendo Apache-2.0. El
  aviso tiene que decir **dónde se consigue su código fuente**, porque lo que servimos es forma
  ejecutable (§3.2 de la MPL), y basta el enlace al repositorio de origen. Si algún día
  modificamos uno de sus ficheros, ese fichero modificado se publica bajo MPL — cosa que ya
  ocurre sola, porque el repositorio entero es público.
- **GPL o AGPL**: no se escribe nada aquí, porque no entran. Ni en el front ni en `tools/`.

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
| `content/actividades/c2-14-himno-de-la-alegria.json` | Tema del cuarto movimiento de la Sinfonía n.º 9 («Himno de la alegría»), melodía sola | Ludwig van Beethoven (1770-1827) | transcripción propia a notación ABC, verificada con `music21` | **Dominio público** | 2026-09-06 | el autor murió en 1827; incluso con los 80 años de la disposición transitoria española el plazo venció en 1907 |
| `content/actividades/c2-12-canon-a-dos-voces.json` e `inf-16-animales-que-bajan.json` | Melodía del canon «Frère Jacques» («Frère Blaise» en su fuente más antigua), transportada a fa mayor | Anónima francesa del siglo XVIII; se ha propuesto la autoría de Jean-Philippe Rameau (1683-1764) | manuscrito «Recueil de Timbres de Vaudevilles», BnF, fechado hacia 1775-1785 | **Dominio público** | 2026-09-06 | fuente conocida más antigua de 1780; el único autor que se le ha atribuido murió en 1764. La letra en español es nuestra, escrita para la actividad |
| `content/actividades/c2-16-cuatro-bandas.json` | Motivo inicial de la Sinfonía n.º 5, melodía sola | Ludwig van Beethoven (1770-1827) | transcripción propia a notación ABC, verificada con `music21` | **Dominio público** | 2026-09-06 | el autor murió en 1827; ni con los 80 años de la disposición transitoria española llegaría a 1907 |
| `public/audio/muestras/{guitarra,voz,sitar,koto,kalimba,gaita,banjo,tambor-metalico}/*.opus` | Instrumentos de General MIDI: guitarra de nailon, voz («Voice Oohs») y seis del mundo — sitar, koto, kalimba, gaita, banjo y tambor metálico. Piano, xilófono, flauta y violín salieron de aquí el 2026-09-10 y ahora son grabaciones (filas de VCSL y VSCO) | Frank Wen, soundfont **FluidR3_GM** (2000-2008); renderizado nota a nota por `gleitz/midi-js-soundfonts` | https://github.com/gleitz/midi-js-soundfonts | **MIT** | 2026-09-06 | ambos repositorios declaran MIT; la MIT **exige conservar el aviso de copyright también en el audio derivado**, y por eso esta fila existe |
| `public/audio/muestras/{piano,xilofono,glockenspiel,vibrafono,arpa,flauta-dulce,saxofon,armonica,organo}/*.opus` | Piano de cola Steinway B, xilófono, carillón, vibráfono, arpa de concierto, flauta dulce soprano, saxo tenor, armónica y órgano de tubos. Una muestra cada tres o cuatro semitonos, bajadas fichero a fichero por `tools/muestras-vcsl.py` | Versilian Studios y colaboradores, **VCSL** | https://github.com/sgossner/VCSL | CC0 1.0 | 2026-09-10 | `LICENSE` del repositorio: «CC0 1.0 Universal». Normalizadas a −3 dBFS y recortadas a 2,25 s |
| `public/audio/muestras/{flauta,violin,violonchelo,contrabajo,trompeta,trompa,trombon,tuba,clarinete,oboe,fagot}/*.opus` | Flauta travesera, violín solo, sección de violonchelos, contrabajo, trompeta, trompa, trombón, tuba, clarinete, oboe y fagot | Versilian Studios y colaboradores, **VSCO 2 Community Edition** | https://github.com/sgossner/VSCO-2-CE | CC0 1.0 | 2026-09-10 | el repositorio declara CC0; mismo tratamiento que VCSL |
| `public/audio/muestras/percusion/*.opus` (20) | Kit de percusión de aula: bombo, caja, tom, bongó, charles, plato, pandereta, claves, caja china y triángulo, con dos grabaciones de cada golpe | Versilian Studios y colaboradores | https://github.com/sgossner/VCSL | CC0 1.0 | 2026-09-07 | `LICENSE` del repositorio: «CC0 1.0 Universal». Recortadas por el ataque y normalizadas a −3 dBFS; el bombo, al golpe v7 y cortado a 2,2 s el 2026-09-10 |
| `public/iconos/pandereta.svg` y `public/iconos/bombo.svg` | Dibujos de la pandereta y el bombo, para los pads del kit | gramzon («Tambourine1.svg») y ArtFavor («Bass drum.svg»), en Wikimedia Commons | https://commons.wikimedia.org/wiki/File:Tambourine1.svg · https://commons.wikimedia.org/wiki/File:Bass_drum.svg | CC0 1.0 | 2026-09-12 | Sin condiciones. `claves.svg` es dibujo propio |
| `public/iconos/*.svg` (90 emoji: instrumentos, animales, vehículos, casa, tiempo, gestos, señales y cifras) | Iconos de actividad | Noto Color Emoji · Google (Copyright 2013 Google Inc.) | https://github.com/googlefonts/noto-emoji | Apache-2.0 | 2026-09-12 | `LICENSE` del repositorio. Sustituyen a los OpenMoji desde el 2026-09-12 por el estilo, elegido por el autor con este orden de preferencia: Noto, Fluent, Twemoji, OpenMoji. Ficheros `svg/emoji_u*.svg` sin modificar, renombrados |
| `public/iconos/kalimba.svg` | La kalimba, que no es un emoji | OpenMoji · HfG Schwäbisch Gmünd | https://openmoji.org | **CC BY-SA 4.0** | 2026-09-06 | licencia en `LICENSE.txt` del repositorio oficial. Era una de las 94 de OpenMoji; el resto se sustituyó el 2026-09-12 |
| `public/audio/sonidos/**/*.opus` (99) y `content/sonidos.json` | Banco de sonidos reales: animales, vehículos, casa y calle, instrumentos tocados, estilos y fragmentos de obras. Cada fichero con su autor y su licencia en el manifiesto, verificados por API contra Wikimedia Commons por `tools/sonidos.py` | Cada uno el suyo: usuarios de Commons, Kevin MacLeod (incompetech), Musopen, Open Goldberg… | https://commons.wikimedia.org | **CC0, dominio público, CC BY 2.5/3.0/4.0 y CC BY-SA 2.0/3.0/4.0**, según fichero | 2026-09-10 | la licencia y el autor de cada uno están en `content/sonidos.json` y en la pantalla de créditos de la app; no entra nada que no sea una de esas |

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

**Sobre la voz, y dónde NO buscarla.** Esto es historia de la búsqueda, no el estado actual:
`voz-la.opus` **ya no está sintetizada** —es el programa 53 de FluidR3, con licencia MIT, y va
en la fila de General MIDI de la tabla de arriba, que es la que manda—. Lo que sigue valiendo
es el mapa de dónde no hay que volver a mirar. Se comprobó el 2026-09-06: **VCSL no tiene
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

**Aviso de FluidR3, requerido por la MIT.** Copyright © 2000-2008 Frank Wen. Se concede
permiso, libre de cargo, para usar, copiar, modificar y distribuir el material sin
restricciones, conservando este aviso. Nuestras muestras son cortes normalizados y
recodificados de ese material, hechos por `tools/muestras-gm.py`, y siguen amparados y
obligados por la misma licencia.

**Y la voz sintetizada ya no existe.** `voz-la.opus` era lo único del banco que no era una
grabación; ahora es el programa 53 de General MIDI, una voz humana muestreada. Se verificó
midiendo el espectro antes de darla por buena: fundamental en 438,7 Hz y **un pico
secundario hacia 1,2 kHz después de un valle**, que es la firma de un formante. Un tono
sintetizado decae de forma monótona y no hace eso. La síntesis de formantes se **borró** de
`tools/muestras-provisionales.py` en vez de dejarla comentada: código muerto que haría dudar
de cuál de los dos era el bueno.

Sigue pendiente lo que `CLAUDE.md` §6 pide para las **locuciones**: alguien diciendo la
consigna en voz alta. Eso no lo da ningún banco y hay que grabarlo, con
`tools/muestras-voz.py`.
