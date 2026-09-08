# Informe I+D+i — Código libre reutilizable y usabilidad en pantalla pequeña y pizarra

Investigación del 2026-09-08. Continúa `docs/11-RECURSOS-Y-REFERENTES.md` (2026-09-06), que
cubrió partituras, ilustración, sonido y la investigación de NN/g sobre niños. **Este no
repite nada de aquello**: va de (A) repositorios de código con licencia comprobada, (B) la
pizarra digital, (C) la pantalla pequeña y (D) el espacio que roban botones y mensajes.

Las licencias y las fechas de la parte A están comprobadas contra la API de GitHub y el
registro de npm el 2026-09-08, no copiadas de un README. Los números de la parte B están
calculados aquí y llevan la aritmética delante para que se puedan rehacer.

## Qué de esto ya está hecho, al 2026-09-09

Este documento nació como I+D pura y **dos de sus hallazgos se han ejecutado ya**. Lo demás
sigue abierto, así que conviene saber qué se lee como historia y qué como propuesta:

| | Estado |
|---|---|
| §D.2 — la tarjeta de reacción se iba antes de leerse | **Hecho.** La corrección ya no lleva reloj: se va cuando el niño responde. La regla vive en `motor/maquinaReaccion.ts` con su test |
| §D.1 — las dos barras fijas en apaisado | **Hecho, y por un motivo mejor que el que decía aquí.** No era «sobra cromo»: era que el espacio ya se estaba pagando con botones de 44 px donde `--objetivo` vale 75. Comparten renglón |
| §B — toda la pizarra: la escala tipográfica, la calibración, arriba se mira / abajo se toca | Abierto. Es lo más importante que queda |
| §C — `svh`, consultas de contenedor, el escenario escalado | Abierto |
| §A — los repositorios | No se ejecuta: es un mapa para cuando haga falta |

Y una corrección a lo que este mismo informe decía: en §D.1 sostenía que la barra de la
aplicación «tiene un solo destino, Volver». **Es falso**: tiene tres, y uno de ellos —el
personaje— es la única forma de releer la consigna. Por eso lo que se hizo no fue quitarla.

---

## 0. Las cinco cosas que hay que llevarse

1. **El modo pizarra no agranda ni una letra.** `:root[data-pizarra] { font-size: 156% }`
   sólo mueve lo que está en `rem`, y toda la escala tipográfica del proyecto está en píxeles
   absolutos (`--t-c1: 20px`, `--t-l: 25px`…), empezando por `body { font-size: var(--t-c1) }`.
   Lo que sí crece en pizarra es el objetivo táctil (×1,6), el icono y el contraste. El texto,
   no. §B.3
2. **La fila de atrás no lee nada, y se puede calcular.** Con la regla de 1/200 (ISO 9241-303),
   el cuerpo de texto actual —20 px en un panel de 75″— es legible hasta **2,4 m**; el titular
   hasta 3,7 m. Un aula española tiene la última fila a 6–7 m. §B.1
3. **No hay dos problemas, hay uno.** Una pizarra bien calibrada para 5 m tiene un presupuesto
   de diseño de 47 anchos de letra; un móvil apaisado, 37; un móvil en vertical, 18. La pizarra
   legible desde el fondo **es más estrecha que un móvil apaisado**. Si el diseño se piensa en
   anchos de letra en vez de en píxeles, las dos pantallas salen del mismo trabajo. §B.2
4. **El hallazgo de repositorio más útil no es de música: es `reveal.js`** (MIT, 72 000
   estrellas). Resuelve exactamente esto —un contenido diseñado a un tamaño fijo que se escala
   entero a cualquier pantalla— y el proyecto ya hace su versión artesanal con `zoom` en el
   pentagrama. §A.5
5. **La tarjeta de `Reaccion` se va antes de que un niño de 2.º la haya leído.** A 60 palabras
   por minuto (baremo de 2.º de Primaria), dieciocho palabras son dieciocho segundos, y la
   tarjeta duraba 6,2. **Resuelto el 2026-09-09**: la corrección ya no lleva reloj. §D.2

---

# Parte A — Repositorios

## A.1 Cómo leer estas tablas

`CLAUDE.md` §3 admite **MIT, BSD, ISC y Apache-2.0**. Prohíbe GPL y AGPL en el front. LGPL
sólo como fichero cargado dinámicamente. Aquí aparece además **MPL-2.0**, que no está en esa
lista y no es lo mismo que GPL: es copyleft *por fichero*, así que usarla como dependencia no
contagia nuestro código, pero cualquier modificación de sus ficheros hay que publicarla. Es
una decisión tuya, no mía.

Y un aviso que ha salido dos veces en esta búsqueda: **un repositorio público sin fichero de
licencia es «todos los derechos reservados»**. No se puede copiar ni una función.

## A.2 Notación: pentagramas y figuras

| Proyecto | Qué es | Licencia | Estado | Veredicto |
|---|---|---|---|---|
| **vexml** (`stringsync/vexml`) | MusicXML → VexFlow. `render(musicXML, elemento)` y eventos por nota | **MIT** | activo (push 2026-09-08), 41 ★ | **El hallazgo de esta sección.** Es la vía para leer MusicXML **sin Verovio**, que es LGPL y por eso vive aparte con `import()` dinámico. Si funciona, el ADR sobre Verovio se simplifica. Pero 41 estrellas es un proyecto joven: **pruébalo contra tres partituras de PDMX antes de creerle nada** |
| **alphaTab** | Renderiza partitura con **cursor que avanza** y *layout* horizontal desplazable | **MPL-2.0** | activo, 1 827 ★ | Es literalmente el problema de `karaoke` y `seguir`, resuelto y probado en producción. La licencia no está en la lista de §3 → decisión tuya. **Mientras tanto, mira su modo `horizontal`**: es la respuesta al musicograma que no cabe |
| **OpenSheetMusicDisplay** | MusicXML → VexFlow | BSD-3 | activo, 1 957 ★ | `CLAUDE.md` ya lo descartó (arrastra VexFlow 1.2.93, de 2017). **Confirmado, el veredicto sigue** |
| **Verovio** | El estándar de renderizado MEI/MusicXML | LGPL-3.0 | activo, 924 ★ | Como está: fichero aparte, `import()` dinámico, jamás en el bundle |
| **Lomse** (`lenmus/lomse`) | Motor de notación completo en C++ | **MIT** | último push 2024-10 | Rareza: un motor de partitura entero con licencia MIT. No hay compilación WASM lista, así que hoy no es utilizable. Anótalo por si algún día VexFlow estorba |
| **Bravura** | La fuente SMuFL | OFL-1.1 | activo | **Ya está dentro** (`public/fuentes/Bravura.woff2`, 316 KB) y es la mejor herramienta que tienes para la pizarra: una figura dibujada con `font-size` escala perfecta a cualquier tamaño. Ver §B.4, porque hoy está desaprovechada |

## A.3 Apps educativas completas: qué mirar y qué no tocar

| Proyecto | Qué es | Licencia | Veredicto |
|---|---|---|---|
| **Chrome Music Lab** | Song Maker, Rhythm, Melody Maker… Web Audio + Tone.js | **Apache-2.0** | **Archivado en febrero de 2024.** Y eso lo mejora como referencia: es código congelado, con licencia compatible, del equipo que definió el género. **Song Maker es tu `rejilla` y Rhythm es tu `pads`.** Leer su tratamiento del *grid* táctil es la lectura más rentable de la lista. Si copias código, Apache-2.0 obliga a conservar el aviso |
| **GCompris** (KDE) | Suite educativa 2–10 años, con actividades de música | GPL-3.0 | **Sólo mirar.** Veinte años de decisiones de interfaz con niños pequeños, y una barra de control constante que resuelve «una sola navegación» mejor que la mayoría |
| **LenMus Phonascus** | Ejercicios de teoría y lectura | GPL-3.0 | **Sólo mirar**, y sobre todo su *catálogo de ejercicios*: es una taxonomía pedagógica hecha, útil para `docs/03-CURRICULO.md` |
| **Nootka** | Cantas o tocas una nota, la detecta por micrófono y la corrige sobre la pauta | GPL-3.0 | Es lo más parecido que existe a `cantar`. **Sólo mirar**, y mira en concreto cómo presenta el error de afinación sin castigar |
| **Music Blocks** (Sugar Labs) | Programación musical por bloques para niños | **AGPL-3.0** | **Descartado para código.** Interesante como idea de «autoría» para el carril de autónomos |
| **sightreading.training** | Entrenador de lectura muy pulido | **SIN LICENCIA** | **No se puede copiar nada.** Ni una función, ni un fichero. Se puede usar como usuario |
| **sightread** | Aprender piano estilo notas que caen | GPL-3.0 | Sólo mirar. Confirma lo que ya dijo `11-RECURSOS`: la mecánica vale, el marcador no |
| **OpenBoard** | El software de pizarra digital de referencia en centros educativos | GPL-3.0 | **Sólo mirar, y merece la pena**: 3 000 estrellas de decisiones sobre qué hacer con los controles en una superficie vertical enorme |
| **NYU MusEDLab** (Groove Pizza, aQWERTYon) | Herramientas de creación musical para aula | Mezcla; **la mayoría sin licencia** | Groove Pizza es la mejor idea de secuenciador rítmico circular que hay. Como código, la mayoría de sus repos no tienen licencia → sólo concepto. Ojo a `Accessible-Groove-Pizza`: un prototipo de secuenciador para usuarios ciegos |

## A.4 Librerías sueltas, con veredicto

| Paquete | Para qué | Licencia | Veredicto |
|---|---|---|---|
| **tonal** | Teoría musical (escalas, intervalos, acordes) | MIT | **No como dependencia** —`escala.ts` ya funciona y tiene test— pero **sí como oráculo de test**: comparar nuestra construcción de escalas contra `tonal` en `tests/` es una red gratis y detecta el error musical que ninguno de los dos vamos a ver a ojo |
| **pitchfinder** | YIN, AMDF, wavelet dinámico | ISC | Igual: T2.0 ya bajó el NSDF a 0,19 ms. Vale como **segundo detector en el banco de pruebas**, para saber si el nuestro se está equivocando o es la señal la que es mala |
| **nexusui** | Componentes de interfaz de audio (diales, secuenciadores, teclado, *multislider*) | BSD | Mirar el `Sequencer` y el `Piano`. Como dependencia chocaría con la regla de un solo `AudioContext` |
| **smplr** | Reproductor de soundfonts | MIT | Ya tienes sampler propio. Sólo referencia |
| **webmidi.js** | Envoltorio de Web MIDI | Apache-2.0 | Para la Fase 3 (teclado real por USB). Guardado |
| **midi-writer-js** | Escribir MIDI | MIT | `exportar.ts` ya lo hace a mano y sin dependencias. **No** |
| **html-midi-player** | `<midi-visualizer>`, piano roll | BSD-2 | Arrastra Magenta. **Demasiado peso para lo que da** |
| **cwilso/metronome** y **cwilso/PitchDetect** | Los originales de Chris Wilson | MIT | Son la fuente del *lookahead scheduling* que ya usas. Referencia histórica, código de 2022 |
| **webaudiofont** | Soundfonts en Web Audio | **GPL-3.0** | **Trampa.** Sale el primero en cualquier búsqueda de «soundfont web». Descartado |
| **react-piano** | Teclado React | MIT | Sin mantenimiento desde 2023. `Teclado.tsx` ya es mejor |

## A.5 Y el más útil de todos, que no es de música

| Proyecto | Licencia | Por qué está aquí |
|---|---|---|
| **reveal.js** | **MIT**, 72 279 ★, activo | Resuelve el problema exacto de este informe: **se diseña una vez a un tamaño fijo (960×700 por defecto) y se escala entero a cualquier pantalla**, con `minScale`/`maxScale` para no pasarse por abajo ni por arriba. Es lo que el proyecto ya hace a mano con `zoom: 1.35 / 1.7 / 2` en el pentagrama, pero generalizado, probado por diez años de presentaciones en proyectores de aula, y con las esquinas afiladas ya limadas |
| **excalidraw** | MIT, 131 419 ★ | Referencia de interacción en superficie grande: paleta contextual junto al dedo, controles que no viven en una esquina lejana |
| **impress.js** | MIT | La misma idea que reveal, con transformaciones CSS |

**El detalle que hay que copiar de reveal.js, y no es el código**: escala con `transform:
scale()` y avisa de que a escalas altas el texto se emborrona en pantallas de baja densidad.
Tú ya llegaste a la conclusión contraria y mejor —`zoom` en vez de `transform`, documentada en
`tokens.css`—, porque `zoom` reflota la caja y no sólo la pintura. Es decir: **en esto vas por
delante del proyecto de 72 000 estrellas**. Lo que falta no es la técnica, es aplicarla a la
actividad entera en vez de sólo al pentagrama.

---

# Parte B — La pizarra digital

## B.1 La aritmética de la fila de atrás

Hay una norma y hay una regla práctica, y coinciden:

- **ISO 9241-303** pide que una letra abarque **20–22 minutos de arco** en el ojo, con
  **16 como mínimo absoluto**.
- **AVIXA/DISCAS** (ANSI/AVIXA V202.01, edición de 2026) razona igual en formato audiovisual:
  la relación de visionado no debe pasar de **6:1** (distancia del espectador más lejano entre
  altura de la imagen) y el tamaño del elemento se expresa como % de la altura de la imagen.

De 16′ de arco sale una regla que se puede usar mentalmente:

> **Altura del elemento ≥ distancia del observador más lejano / 200.**

Ahora los números concretos, con un panel de **75″ 16:9** (166,1 × 93,4 cm) mostrando
**1920×1080 px** → **1,156 px por milímetro**:

| Fila | Distancia | Altura mínima real | En píxeles CSS | `font-size` equivalente |
|---|---|---|---|---|
| Primera | 3 m | 15 mm | 17 px de altura de mayúscula | **~25 px** |
| Media | 5 m | 25 mm | 29 px | **~41 px** |
| Última | 7 m | 35 mm | 40 px | **~58 px** |

(La altura de mayúscula de Andika es ~0,70 del `font-size`; de ahí la última columna.)

**Y ahora lo que hay hoy en Cascabel, con las mismas cuentas:**

| Elemento | Tamaño actual | Altura de mayúscula | Legible hasta |
|---|---|---|---|
| Cuerpo de texto (`--t-c1`, 20 px) | 20 px | 12,1 mm | **2,4 m** |
| Titular `h1` en pizarra (`clamp` topado en `--t-xl`) | 31 px | 18,8 mm | **3,7 m** |
| Figura del musicograma (`.karaoke__figura`, 34 px) | 34 px | ~29 mm de glifo | ~4,5 m |
| Pentagrama en pizarra (`zoom: 2`, `SEPARACION` 14 px) | 28 px entre líneas | 24 mm | **4,8 m** |

Es decir: **el modo pizarra actual está calibrado, sin habérselo propuesto, para la tercera
fila.** El pentagrama es lo mejor parado —el truco del `zoom` funciona— y el texto es lo peor.

> **Comprobación honesta**: esto está calculado leyendo el CSS y las constantes, no medido en
> una pizarra real. La aritmética es la aritmética, pero el que un panel de 75″ presente 1920
> px CSS depende del escalado del sistema operativo: en un panel 4K con Windows al 150 % son
> 2560 px CSS y todo es un tercio más pequeño. Por eso §B.5.

## B.2 Los dos problemas son el mismo problema

Si se mide el ancho de la pantalla **en anchos de cuerpo de texto** en vez de en píxeles:

| Pantalla | Ancho | Cuerpo de texto | Presupuesto |
|---|---|---|---|
| Móvil en vertical | 360 px | 20 px | **18 em** |
| Móvil apaisado | 740 px | 20 px | **37 em** |
| Tablet | 1024 px | 20 px | 51 em |
| Pizarra **como está hoy** | 1920 px | 20 px | 96 em |
| Pizarra legible a 5 m | 1920 px | 41 px | **47 em** |
| Pizarra legible a 7 m | 1920 px | 58 px | **33 em** |

**Una pizarra legible desde el fondo del aula es más estrecha que un móvil apaisado.** Ese es
el resultado importante de todo el informe. Hoy el modo pizarra hace lo contrario: mantiene el
texto pequeño y gasta los 96 em en aire. Lo que parecen dos frentes —«no cabe en el móvil» y
«no se ve en la pizarra»— es un solo diseño hecho en unidades relativas: si una actividad cabe
y funciona en **33 em de ancho por unos 18 de alto**, cabe en las dos.

Es, además, la explicación de por qué el trabajo del 2026-09-07 sobre los anchos funcionó a
medias: quitar el tope de 840 px arregló el desperdicio, pero dejó el contenido *pequeño y
repartido*, que en una pizarra es peor que pequeño y junto.

## B.3 Por qué el 156 % no hace nada

```css
:root[data-pizarra='true'] { font-size: 156%; }   /* tokens.css:1590 */
body { font-size: var(--t-c1); }                  /* tokens.css:278 → 20px */
--t-infantil: 24px;  --t-c1: 20px;  --t-l: 25px;  /* … toda la escala en px */
```

`font-size` en la raíz sólo cambia el valor de `rem`. En `tokens.css` hay **29 apariciones de
`rem`** y casi todas son `max-width`. Los tamaños de letra son **once en píxeles fijos** y
nueve en `clamp()` cuyos extremos también son píxeles. `body` corta la herencia poniendo un
valor absoluto, así que ni siquiera los `em` relativos de los componentes se enteran.

Traducción: el modo pizarra hoy **agranda los botones y el icono, sube el contraste y suelta el
ancho** —todo eso está bien y es correcto— pero **no agranda ni una letra ni una figura**.

**La corrección es pequeña y de una pieza**: que la escala tipográfica salga de un único
multiplicador. Algo como `--escala: 1` en la raíz, `--escala: 2` en pizarra, y los tokens
definidos como `calc(20px * var(--escala))`. Un solo número que mover, y §B.5 le pone valor.
No lo he tocado: afecta a las 78 actividades y es decisión de producto, igual que T3.5.

## B.4 Bravura ya está pagada, úsala

`.karaoke__figura[data-forma='figura'] { font-size: 34px }` es un glifo SMuFL con un tamaño
clavado. Una figura escrita con Bravura escala perfecta a cualquier tamaño sin perder un
píxel: es el material ideal para una pizarra y no cuesta nada, porque los 316 KB ya se pagan.

Lo mismo con las **once tallas de letra fijas y las 48 alturas fijas en píxeles** que hay en
`tokens.css`: son las que se quedan quietas cuando todo lo demás crece. No hay que hacerlas
fluidas todas —§C.2 dice cuáles importan de verdad—, pero sí las que el niño tiene que
**reconocer desde su sitio**: figuras, notas, símbolos y el estado de la actividad.

## B.5 La prueba de la fila de atrás

El navegador no sabe si está en un panel de 65″ o en uno de 86″, ni a qué escala lo pinta
Windows, ni dónde está la última fila. **No se puede adivinar, así que se pregunta** — y el
proyecto ya tiene el precedente exacto: `Calibracion.tsx` pregunta por la latencia porque
tampoco se puede adivinar.

La versión más simple que funciona: en Ajustes, junto al interruptor de pizarra, una tira con
la misma figura o la misma palabra a **cinco tamaños**, numerada. El maestro se va al último
pupitre, mira, vuelve y toca el número más pequeño que se leía. Eso fija `--escala` para
siempre en ese dispositivo. Treinta segundos, una vez por aula, sin sensores y sin adivinar
nada. Y encaja con el resto: es una decisión del adulto, guardada en el dispositivo, que no
sale de ahí.

Variante más barata todavía si quieres cero interfaz nueva: tres botones —**«tercera fila»,
«mitad del aula», «última fila»**— que ponen `--escala` en 1,25 / 2 / 2,9 según la tabla de
§B.1. Menos exacto y probablemente suficiente.

## B.6 Arriba se mira, abajo se toca

Esto no está en el proyecto y es el hallazgo de usabilidad más accionable de la parte B.

La investigación sobre pizarras en aulas de infantil y primaria dice lo mismo desde hace
quince años: **están montadas a una altura que los niños pequeños no alcanzan**, y arrastrar
objetos por la superficie les resulta muy difícil. La ergonomía de superficies verticales
grandes añade la zona de confort del adulto (aproximadamente 90–150 cm del suelo) y el «brazo
de gorila»: el cansancio de sostener el brazo en alto, que aparece en cuanto la tarea pasa de
unos segundos.

De ahí salen tres reglas concretas para el modo pizarra, y ninguna necesita rediseñar nada:

1. **Todo lo que se toca vive en la mitad inferior de la pantalla.** La mitad superior es para
   mirar: la pauta, el musicograma, la consigna. Un niño de 5 años alcanza cómodamente hasta
   unos 120 cm; el borde superior de un panel montado a norma está por encima de 200.
2. **En pizarra, la tarjeta de `Reaccion` se va arriba.** Hoy está superpuesta **abajo a la
   izquierda**, que es justo la zona alcanzable: en una pizarra está tapando el sitio donde el
   niño tiene que tocar. En una tablet, abajo a la izquierda está perfecto. Es literalmente una
   regla CSS distinta bajo `[data-pizarra]`.
3. **Los controles van donde está la mano, no en una esquina.** En un panel de 86″ hay metro y
   medio hasta la esquina: obligar a caminar hasta el botón «otra vez» es un coste real que en
   una tablet no existe. La solución probada en superficies grandes es que la acción principal
   aparezca **junto al último punto tocado**. Excalidraw y OpenBoard lo hacen de dos maneras
   distintas y las dos merecen mirarse.

## B.7 Dos cosas de coste casi nulo

- **Que no se apague la pantalla.** Una actividad de escucha puede pasar tres minutos sin que
  nadie toque nada, y el panel se atenúa en mitad de la canción. La **Screen Wake Lock API** es
  *Baseline* desde mayo de 2024 (Chrome 84+, Firefox 126+, Safari 16.4+) y son quince líneas
  con `try/catch`, pidiéndola al empezar la actividad y soltándola al salir. Encaja con la
  regla del micrófono: se intenta, y si falla no pasa nada.
- **Un mando de presentación de 10 €.** Se conecta por Bluetooth y **manda teclas de página
  arriba/abajo y flechas**: no hace falta ningún emparejamiento, ningún permiso ni una línea de
  driver. Si las actividades responden a `→`, `espacio` y `Esc`, el maestro dirige la clase
  desde el fondo del aula y no le da la espalda a nadie. `tecladoQwerty.ts` ya demuestra que el
  camino del teclado está trillado en el proyecto.

---

# Parte C — La pantalla pequeña

## C.1 `vh` miente en el móvil, y hay veinte

En `tokens.css` hay **una veintena de `clamp()` con `vh`** (`56vh`, `38vh`, `52vh`, `70vh`…).
En los navegadores móviles, `vh` se resuelve contra el **viewport grande**: el que habría si la
barra de direcciones estuviera oculta. Con la barra visible —que es como se abre siempre— un
`height: 52vh` ocupa más de la mitad de lo que de verdad se ve, y lo que va debajo se sale.

- `svh` es el viewport **pequeño** (barra visible): estable, nunca se pasa. Es el que quieres
  para lo que **tiene que caber sí o sí**: el teclado, el musicograma, la rejilla.
- `dvh` sigue a la barra mientras aparece y desaparece: bueno para fondos, malo para lo que se
  toca, porque hace que la interfaz baile bajo el dedo.

Es un cambio mecánico, verificable y de bajo riesgo, y `tests/layout.test.ts` ya vigila esa
familia de errores: la lección de `min(46vh, 340px)` es exactamente la misma clase de bug, un
número que dice lo que no significa.

## C.2 Consultas de contenedor: el bug del teclado, resuelto por CSS

De `docs/04-DISENO-UI.md`:

> «el teclado **mide su caja** para decidir cuántas octavas caben, así que estaba midiendo
> 840 px por mucho monitor que hubiera delante».

Eso es, palabra por palabra, el caso de uso de las **consultas de contenedor**, disponibles en
los tres navegadores desde 2023. Con `container-type: size` en el marco de la actividad, un
componente pregunta por **su** espacio y no por el de la ventana, y `cqi`/`cqb` dan unidades
relativas a ese espacio:

```css
.actividad-marco { container-type: size; container-name: escenario; }
.teclado__teclas  { height: clamp(150px, 40cqb, 340px); }
.karaoke__figura  { font-size: clamp(24px, 6cqb, 96px); }
```

Lo que compra, y por eso lo pongo tan arriba:

- **Desaparece el `ResizeObserver` de `Teclado.tsx` y de `Pads.tsx`.** Menos JavaScript midiendo
  cajas, que es donde estos bugs viven.
- **El modo ampliado (`Lienzo.tsx`) deja de necesitar reglas propias.** Si la actividad se mide
  contra su contenedor, ampliar el contenedor la agranda sola. Hoy hay una tanda de reglas
  `[data-ampliado]` duplicando tamaños; con `cqb` sobran.
- **La pizarra deja de ser un caso especial.** Un contenedor grande da unidades grandes.

## C.3 El escenario que se escala

La consecuencia de §B.2 —una sola geometría para móvil y pizarra— tiene un nombre y una
implementación probada: la de reveal.js. Aplicada aquí sería un componente `Escenario` que
envuelve la actividad, declara una geometría de diseño (por ejemplo **1000 × 620**, que en
proporción es un aula y un móvil apaisado), y aplica `zoom: min(anchoReal/1000, altoReal/620)`.

Ventajas, que son grandes:

- **Una actividad se diseña una vez.** Se acabaron las reglas por punto de ruptura para cada
  tipo de motor.
- **Las proporciones no cambian nunca.** El niño que aprende en la tablet ve exactamente la
  misma pantalla en la pizarra, más grande. Eso importa más de lo que parece a los 5 años.
- **Ya está validado en tu propio código**: `.pentagrama__lienzo { zoom: … }` es esto mismo, en
  pequeño, y funciona.

Y la trampa, que es real y hay que decirla: **escalar hacia abajo encoge también el objetivo
táctil**. En un móvil de 360 px, un escenario de 1000 px se queda en 0,36 y un botón de 75 px
pasa a 27: por debajo del mínimo de cualquier carril. Así que el escenario necesita **suelo**:
si la escala baja de lo que permite `--objetivo`, se deja de escalar y se aplica lo que ya
hace el proyecto —recortar el marco, no la actividad, y desplazar en horizontal lo que no
quepa—. Con suelo, es un patrón excelente; sin suelo, es una trituradora de accesibilidad.

Mi recomendación es la mixta y por ese orden: **contenedores primero (§C.2), escenario después
y sólo para los tipos con geometría fija** —`pentagrama`, `rejilla`, `karaoke`, `escala`,
`compases`—, que son los que tienen dibujo y zonas de toque compartiendo coordenadas.

---

# Parte D — El espacio que roban los botones y los mensajes

## D.1 Hay una métrica y tiene nombre

NN/g la llama **relación contenido/cromo** (*content-to-chrome ratio*): la proporción de
pantalla dedicada a lo que el usuario ha venido a hacer frente a lo que es andamiaje. Su
conclusión, que es la que te interesa, es que **el mismo cromo que es irrelevante en un monitor
grande se come media pantalla en una pequeña**, y que la respuesta correcta no es «menos
contenido» sino «menos cromo»: revelar bajo demanda lo que no se usa en cada momento.

En Cascabel el cromo son cuatro cosas: la barra de navegación (`--alto-barra`, 76 px, 56 en
apaisado), la barra de acciones (`--alto-acciones`), el titular y la nota fija para el adulto.
En un móvil apaisado de 360 px de alto, sólo la primera son ya el **16 % de la pantalla,
permanentes**, en la postura en la que menos altura hay — que es justo la postura del piano y
de todo lo que avanza de lado.

**Lo que propongo no es quitar nada, es medirlo.** Ya hay `tests/layout.test.ts`, la casa
tiene por norma que un fallo visto una vez se convierte en test, y desde el 2026-09-09
`BarraAcciones` *publica* su altura en `--alto-acciones` en vez de adivinarla. Con eso el
presupuesto es calculable: un test que afirme que, en el punto de ruptura de móvil apaisado, la
suma de alturas del cromo no pasa del 25 % del alto. Hoy no sé si pasa; el test lo diría, y
sobre todo lo diría **la próxima vez**, que es cuando duele.

Tres ideas concretas para bajarlo, por orden de cuánto cuestan:

1. ~~**Si hay que discutir una de las dos barras, es la de la aplicación.**~~ **Hecho el
   2026-09-09, y de otra manera.** Este punto proponía quitar la barra de la aplicación dentro
   de la actividad, con el argumento de que «tiene un solo destino, Volver». Ese argumento era
   **falso**: tiene tres, y uno es el personaje, que es la única forma de releer la consigna.

   Lo que sí se sostuvo al medirlo fue otra cosa, y es mejor: en apaisado las dos barras son
   110 px de 360 —el 31 %— y ese espacio **ya se estaba pagando por otro lado**, porque la
   media query baja los botones a 44 px cuando `--objetivo` vale 75 en Infantil. Así que las
   dos barras **comparten renglón** en apaisado, sin que desaparezca nada. Y queda abierta la
   pregunta que eso destapa: si con los ~54 px devueltos se vuelve a `var(--objetivo)`.
   **Decisión tuya, y contra una decisión reciente**: lo que aporto es el número.
2. **Los controles se apagan mientras suena.** No desaparecer: bajar a un 40 % de opacidad y
   volver enteros al primer movimiento del puntero o al primer toque. Durante la reproducción
   nadie los está mirando, y en pizarra es cuando más molesta que compitan con la pauta.
3. **La nota para el adulto (`.pista-fija`) es la primera candidata a plegarse.** Es texto que
   el niño no lee y que el adulto lee una vez. Un botón pequeño con el símbolo del adulto que
   la despliega deja su altura entera a la actividad.

## D.2 La tarjeta de `Reaccion` se va demasiado pronto

> **Resuelto el 2026-09-09.** Lo que sigue es el diagnóstico, que se conserva porque los
> números son los que justifican la solución. Y la solución no fue la de esta sección: en vez
> de calibrar el reloj contra la velocidad lectora, se le quitó el reloj a la corrección.
> Cualquier número habría estado mal para alguien —entre 2.º y 6.º la velocidad se dobla— y la
> respuesta del niño es una señal fiable que no hay que calibrar. Ver
> [`motor/maquinaReaccion.ts`](../src/motor/maquinaReaccion.ts).

Se iba sola **a los 3,5 s más un poco por carácter**. La decisión de sacarla del flujo y
superponerla fue claramente correcta —empujaba el tablero dos veces por respuesta—, pero el
tiempo no estaba calibrado contra nadie.

Los baremos españoles de velocidad lectora en Primaria dicen esto:

| Curso | Palabras por minuto (texto) | Carril |
|---|---|---|
| 1.º | 35–59 | lectores |
| 2.º | 60–84 | lectores |
| 3.º | 85–99 | lectores |
| 4.º | 100–114 | autónomos |
| 5.º | 115–124 | autónomos |
| 6.º | 125–134 | autónomos |

Un niño de 2.º a 60 ppm lee **una palabra por segundo**. La pista concreta que enseña algo
—«los dos “ti” entran en el mismo pulso»— son ocho palabras: **ocho segundos**, y eso es leer,
no entender. La tarjeta se ha ido antes de que llegue al final, y como es un texto que aparece
y desaparece, el niño ni siquiera sabe que se ha perdido algo.

Propuesta, y es aritmética, no opinión:

```
duración = 2 s de reacción + palabras / (ppm del carril / 60) + 2 s de margen
```

Con los baremos: **infantil** ~50 ppm efectivas (se la lee el adulto en voz alta, y leer en voz
alta es más lento), **lectores** 60, **autónomos** 110. Esas ocho palabras pasan de 3,5 s a
12 s en el carril de lectores y a 8 s en el de autónomos. Y con dos cautelas:

- **Techo**: si el resultado pasa de unos 15 s, el mensaje es demasiado largo para una tarjeta
  que se va sola. Eso no es un problema de tiempo, es un problema de redacción, y la auditoría
  de contenido puede avisarlo igual que ya avisa cuando el enunciado repite la ayuda.
- **Y la salida no puede ser «tocar la tarjeta la cierra»**: `Reaccion` **no recibe toques a
  propósito**, y está bien que sea así — se le robaría al tablero un toque que el niño creía
  dar en la actividad. Lo que sí la puede cerrar antes es **la siguiente respuesta**: si el niño
  ya ha actuado, la tarjeta anterior sobra. Mantiene la regla de que la tarjeta sólo se mira y
  quita el temor a que doce segundos se hagan largos.

## D.3 Y de paso, dos cosas de norma

- **WCAG 4.1.3 (mensajes de estado)**: un mensaje que aparece sin recibir el foco tiene que ser
  anunciable por un lector de pantalla, con `role="status"` o una región `aria-live` que exista
  **antes** de que llegue el texto. El proyecto ya lo trabajó —hay un test de `aria-live` que
  comprueba cuándo nace la región—, así que aquí sólo hay que asegurarse de que `Reaccion` y
  `.estado-actividad` estén los dos cubiertos.
- **WCAG 2.2.1 (tiempo ajustable)**: una tarjeta que se va sola es, leída con rigor, un límite
  de tiempo. La literatura de accesibilidad sobre *toasts* es unánime en que casi ningún
  patrón de *toast* del mundo real pasa una auditoría. La salida que ya tienes es la buena y
  conviene decirla en la documentación: **el mensaje no es la única vía** —se vuelve a leer
  pulsando al personaje— y por tanto lo que se va sola es una repetición, no la información.
  Si eso es cierto para todos los mensajes, el criterio se cumple; si algún día una pista
  aparece sólo ahí, deja de cumplirse.

---

# Parte E — Cómo comprobar todo esto sin creerse nada

## E.1 Una ruta `/laboratorio`

En el espíritu de `/revisar` y de `/diagnostico`: una ruta que pinta **la misma actividad en
seis `iframe` a la vez**, con los tamaños canónicos y su etiqueta:

| | Tamaño | Qué representa |
|---|---|---|
| 1 | 360 × 640 | Móvil en vertical, el peor caso |
| 2 | 740 × 360 | Móvil apaisado: la postura del piano |
| 3 | 1024 × 768 | Tablet de aula |
| 4 | 1366 × 768 | Portátil del maestro |
| 5 | 1920 × 1080 | Pizarra, escala 1 |
| 6 | 1920 × 1080 con `--escala: 2` | Pizarra desde la última fila |

Cuesta poco, no añade ninguna dependencia, y convierte «creo que en el móvil se rompe» en algo
que se ve entero de un vistazo. Es además la única forma de mirar el caso 6 sin tener una
pizarra delante.

## E.2 Lo que puede ser test y lo que no

Puede ser test, con jsdom y lo que ya hay:

- Que ningún `font-size` de un elemento **musical** esté en píxeles fijos.
- Que el cromo no pase del presupuesto en el punto de ruptura apaisado.
- Que ninguna altura crítica use `vh` en vez de `svh`.
- Que la duración de `Reaccion` salga de la fórmula y no de una constante.

No puede ser test y hay que escribirlo en el código: si se ve bien. Esa es tuya y de una
pizarra de verdad.

---

# Parte F — Lo que yo no haría

- **Añadir una librería de partitura más.** Tienes VexFlow y Bravura; el problema de la pauta
  no es el motor, es el tamaño.
- **Adoptar alphaTab** sin decidir antes qué hacemos con MPL-2.0. Mirar su *layout* horizontal
  es gratis; depender de él no.
- **Tocar `abcjs`.** Está en `package.json` y no lo importa nadie: `vite.config.ts` ya lo sacó
  de `manualChunks` precisamente por eso y lo documenta. No pesa en el bundle. Sólo apunto que
  el texto de créditos (`creditos.softwareTexto`) sigue diciendo que «abcjs y VexFlow viajan en
  el paquete», y ya no es cierto de abcjs.
- **Playwright para las capturas.** Doscientos megas de navegadores para lo que la ruta
  `/laboratorio` resuelve con seis `iframe`.
- **Detectar la pizarra automáticamente.** No hay forma fiable: `pointer: coarse` no distingue
  un panel de 86″ de una tablet, y los tamaños en píxeles mienten con el escalado del sistema.
  Se pregunta (§B.5). Además tu documentación ya decidió que el modo se activa a mano y tiene
  razón: una tablet no debe agrandarse sola.

---

# Parte G — Por dónde empezar

Ordenado por relación entre lo que cuesta y lo que arregla:

| | Qué | Coste | Qué arregla |
|---|---|---|---|
| 1 | **Escala tipográfica relativa**: un `--escala` y los tokens en `calc()` | Medio (toca `tokens.css` entero, no las actividades) | Que el modo pizarra por fin agrande el texto. Es el bloqueo de todo lo demás |
| 2 | **La prueba de la fila de atrás** en Ajustes | Bajo | Pone un número real en `--escala`, medido en el aula del maestro |
| 3 | **`svh` donde hoy hay `vh`** | Bajo, mecánico | Que en el móvil no se salga lo que tiene que caber |
| ~~4~~ | ~~**Duración de `Reaccion` por velocidad lectora**~~ | **Hecho el 2026-09-09** | Y por una vía mejor que la de esta tabla: en vez de calibrar el reloj, quitarlo. Ver `motor/maquinaReaccion.ts` |
| 5 | **Arriba se mira, abajo se toca** en pizarra (empezando por mover `Reaccion`) | Bajo | Que un niño de 5 años alcance lo que tiene que tocar |
| 6 | **Consultas de contenedor** en el marco de la actividad | Medio | Elimina el `ResizeObserver` y las reglas de `[data-ampliado]` |
| 7 | **Ruta `/laboratorio`** | Bajo | Convierte todo lo anterior en algo que se mira, no que se cree |
| 8 | **Presupuesto de cromo con test** | Bajo | Que no vuelva a crecer |
| 9 | **Wake Lock y teclas de mando** | Muy bajo | Dos molestias de aula que nadie va a reportar nunca |
| 10 | **Escenario escalado** para los tipos de geometría fija | Alto | El diseño único móvil/pizarra. Después de 1 y 6, no antes |

Nada de esto necesita criterio musical, así que no hay ningún `PENDIENTE DE REVISIÓN
PEDAGÓGICA` que sacar de aquí. Lo que sí hay es una decisión de producto en el punto 1, del
mismo tamaño que T3.5, y una comprobación que sólo se puede hacer con una pizarra delante.

---

## Fuentes

**Repositorios** (licencia y actividad comprobadas contra la API de GitHub y npm, 2026-09-08):
chrome-music-lab · vexml · alphaTab · OpenSheetMusicDisplay · Verovio · Lomse · LenMus ·
Nootka · Music Blocks · sightread · sightreading.training · OpenBoard · GCompris (KDE) ·
NYU MusEDLab · reveal.js · impress.js · excalidraw · tonal · pitchfinder · nexusui · smplr ·
webmidi.js · midi-writer-js · html-midi-player · cwilso/metronome · cwilso/PitchDetect ·
webaudiofont · react-piano · Bravura (Steinberg).

**Normas y estudios**
- ISO 9241-303:2011 — altura de carácter de 20–22′ de arco, mínimo 16′.
- ANSI/AVIXA V202.01:2026 (DISCAS) — tamaño de imagen para contenido 2D; relación de visionado.
- NN/g — *Maximize Content-to-Chrome Ratio, Not the Amount of Content on Screen*.
- NN/g — *A Few Mobile UX Design Skills Help With Very Large Touchscreen UX Design*.
- Vatavu, Cramariuc & Schipor (2015), *Touch interaction for children aged 3 to 6 years*,
  IJHCS — y la serie MTAGIC de Anthony et al. sobre precisión táctil infantil.
- Investigación sobre pizarras digitales en aulas de infantil: altura de montaje fuera del
  alcance de los niños pequeños y dificultad del arrastre en superficie vertical.
- Baremos españoles de velocidad lectora por curso (texto y Prolec-R).
- WCAG 2.2 — 4.1.3 *Status Messages*, 2.2.1 *Timing Adjustable*; y la literatura de
  accesibilidad sobre *toasts* (Roselli, O'Hara, Soueidan).
- web.dev — *The Screen Wake Lock API is now supported in all browsers* (Baseline, mayo 2024).
- Documentación de abcjs (`responsive: 'resize'`, `wrap`), por si algún día se dibuja desde ABC.

**Del propio repositorio** (lo que se ha leído para calcular lo de arriba):
`src/estilos/tokens.css`, `src/motor/tipos/Pentagrama.tsx`, `src/app/preferencias.ts`,
`vite.config.ts`, `docs/04-DISENO-UI.md`, `docs/01-ARQUITECTURA.md`, `docs/07-ROADMAP.md`.
