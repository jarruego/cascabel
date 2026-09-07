# Recursos libres y referentes de interfaz

Investigación del 2026-09-06. **Cada entrada lleva su licencia y un veredicto**, porque una
lista de enlaces sin eso no sirve: lo caro no es encontrar recursos, es descubrir en el mes
ocho que uno de ellos era CC BY-NC y hay que rehacer el trabajo.

Recordatorio de la regla 1: nada de esto se carga desde su servidor. Todo lo que entre se
descarga, se procesa y se sirve desde nuestro origen.

---

## 1. Partituras de dominio público

El cuello de botella real del proyecto: hay once actividades del catálogo bloqueadas por no
tener repertorio verificado.

| Recurso | Qué es | Licencia | Veredicto |
|---|---|---|---|
| **PDMX** | **250 000 partituras MusicXML**, dataset publicado en Zenodo y GitHub | **CC0 en su totalidad** | **El hallazgo más importante de esta investigación.** Resuelve el bloqueo de repertorio de golpe, y es CC0 puro |
| **OpenScore** | Partituras interactivas de dominio público, en MuseScore, MusicXML, PDF, MIDI | CC0 | Ya estaba en `08-LEGAL.md`. Curado a mano, menos volumen y más calidad que PDMX |
| **Choral Public Domain Library** | 43 000 partituras corales | Varía por obra | Útil para canción infantil a varias voces. **Hay que comprobar obra por obra**: no todo es CC0 |
| **Mutopia** | 2 000+ partituras clásicas | Dominio público o CC | Ya estaba en los documentos |

**Cómo entra esto sin romper nada.** El formato fuente del proyecto es JSON + ABC, y eso no
cambia (ADR 0002). MusicXML se **importa** para traer repertorio y se convierte a ABC con
`music21`, que ya está en `tools/`. La conversión no es automática y no debe serlo: cada
pieza pasa por `npm run contenido:validar`, que comprueba tesitura, saltos y compases.

> **Aviso que sigue en pie**: que una partitura esté en un repositorio CC0 **no prueba** que
> la obra sea de dominio público en España. El plazo español son 70 años desde la muerte del
> autor, **u 80 si murió antes del 7-12-1987**. PDMX es CC0 respecto a *la transcripción*;
> la obra subyacente hay que verificarla igual. Ver `08-LEGAL.md`.

---

## 2. Ilustración y personajes

Lo que falta para tener identidad propia en vez de emoji.

| Recurso | Qué es | Licencia | Veredicto |
|---|---|---|---|
| **Open Peeps** | Personajes humanos por piezas: pelo, ropa, poses, tonos de piel. Se combinan | **CC0** | **La mejor opción para los personajes del proyecto.** Permite construir una mascota propia sin dibujarla desde cero, y la modularidad da variedad barata |
| **Fresh Folk** | Personajes y objetos combinables, con distintas poses y tonos de piel | Libre, revisar términos | Buena para diversidad representada. Hay que leer la licencia exacta antes de usar |
| **Lukasz Adam** | Ilustraciones SVG generales | CC0, sin atribución | Útil para escenas, no para personajes recurrentes |
| **OpenMoji** | Los 47 iconos que ya usamos | CC BY-SA 4.0 | Ya integrado. Resuelve «concreto y reconocible», no da identidad |
| **Kenney.nl** | Assets de juego, muy orientados a infantil | CC0 | Ya citado en `08-LEGAL.md`. Sobre todo PNG de sprites, menos útil que SVG |

**Recomendación**: **Open Peeps** para construir un personaje propio, manteniendo OpenMoji
para los objetos concretos. Es la combinación que da identidad sin tener que ilustrar 54
actividades a mano, y las dos son CC0 o compatibles.

---

## 3. Sonido

| Recurso | Qué es | Licencia | Veredicto |
|---|---|---|---|
| **VCSL** | 3,9 GB de muestras instrumentales | **CC0 1.0** | **Ya en uso.** Marimba, glockenspiel, pandero, claves. Sigue siendo la mejor fuente |
| **VSCO 2 CE** | Orquesta comunitaria | CC0 | Ya citado. Para cuando haga falta orquesta |
| **Freesound** | 700 000 sonidos | **Mixta: CC0, CC BY, CC BY-NC** | Útil **filtrando por CC0**. La etiqueta hay que comprobarla sonido a sonido: hay CC BY-NC, que **no** podemos usar |
| **Pixabay sonidos** | Efectos «sin atribución» | Licencia propia de Pixabay | **Cuidado.** `08-LEGAL.md` ya avisa: la licencia de Pixabay **no es libre** y no se puede sublicenciar. **Descartada** |
| **ZapSplat** | Efectos, sección CC0 | CC0 en parte del catálogo | Solo la parte marcada CC0, y comprobándolo |
| **OpenGameArt** | Assets de juego | CC0 en parte | Menor volumen, pero limpio |

### Soundfonts General MIDI: donde sí estaba todo

**La primera búsqueda se equivocó de sitio, y conviene dejar dicho en qué.** Miró bancos de
muestras *orquestales* —VCSL, VSCO 2, Universidad de Iowa, Philharmonia— y de ahí concluyó
que no había voz. La conclusión era correcta para esos bancos y falsa en general: el sitio
donde está todo son los **soundfonts General MIDI**, que llevan veinte años siendo el
material con el que suena cualquier reproductor de MIDI y traen los 128 instrumentos del
estándar, voz incluida.

| Recurso | Qué es | Licencia | Veredicto |
|---|---|---|---|
| **FluidR3_GM** | Soundfont de Frank Wen, 2000-2008, los 128 instrumentos de General MIDI | **MIT** | **Lo que faltaba.** MIT está en las cuatro que admite `CLAUDE.md` §3 |
| **gleitz/midi-js-soundfonts** | FluidR3 y MusyngKite **ya renderizados nota a nota**, 88 ficheros MP3 y OGG por instrumento | **MIT** | Ahorra sintetizar el `.sf2`. Es de donde bajamos |
| **MuseScore General** | Soundfont de MuseScore, más moderno y pesado | MIT | Alternativa si algún día hace falta más calidad |
| **Salamander Grand Piano** | Piano de cola con 16 capas de velocidad | CC BY 3.0 | Excelente para piano solo, pero **son cientos de megas** y CC BY obliga a atribuir |
| **FreePats** | Parches libres sueltos | Mezcla de dominio público y GPL | **Hay que mirar pieza a pieza.** La GPL no nos vale en el front |
| **Philharmonia Orchestra** | Muestras orquestales de descarga gratuita | Términos propios, no libres | **Descartada.** Gratis no es libre |

**Lo que entró**: piano, xilófono, flauta, guitarra de nailon, violín y **voz**. Seis
instrumentos, 78 muestras, **1,9 MB**.

> **Y por eso no van en el precache.** 1,9 MB multiplicarían por tres la primera descarga de
> un colegio entero para bajar cinco instrumentos que ese niño no va a abrir. `vite.config.ts`
> los excluye del precache y los cachea al usarlos con `CacheFirst`: el primer día que se
> abre la actividad del piano se bajan sus muestras y a partir de ahí funciona sin conexión.
> `CacheFirst` y no `StaleWhileRevalidate` porque una muestra de audio no cambia nunca.

**Una muestra cada tres semitonos, y no seis por instrumento.** La marimba de VCSL tiene seis
en tres octavas porque es percusiva y aguanta el estirado. Un sostenido no: `playbackRate`
cambia la altura **y la duración**, así que una flauta estirada tres semitonos suena a flauta
acelerada. Con esta densidad el estirado máximo es de semitono y medio, que no delata.

### Voz cantada: se buscó y no está

El 2026-09-06 se buscó una muestra libre de **una voz cantando una nota**, que es lo que
piden tres actividades de reconocimiento de timbre. Resultado, para no repetir la búsqueda:

| Fuente | Qué se comprobó | Veredicto |
|---|---|---|
| **VCSL** | Su catálogo se organiza por la clasificación de Hornbostel-Sachs: aerófonos, cordófonos, electrófonos, idiófonos y membranófonos. **No hay categoría vocal**, y dentro de los aerófonos libres solo hay armónicas y una sirena | **No tiene voz** |
| **Universidad de Iowa (Electronic Music Studios)** | Maderas, metales, cuerda, percusión, piano y objetos encontrados | **No tiene voz**, y además **no declara licencia** en ninguna parte de su web, así que estaba descartada de todos modos |
| **VSCO 2 CE** | CC0, pero es orquestal; el coro está en la versión de pago | No sirve. Y un «aah» de coro no es lo que hace falta: un niño tiene que reconocer *una* voz, no una masa coral |
| **Wikimedia Commons** | Tiene grabaciones vocales, pero son obras completas, no notas aisladas | No sirve para muestrear |
| **Freesound (filtro CC0)** | Sí hay material vocal CC0 | **Vía abierta, pero exige escuchar.** Elegir una muestra vocal es un juicio de oído, y ese no se delega |

**RESUELTO EL 2026-09-06 POR OTRA VÍA** (ver el apartado de soundfonts GM, arriba): el programa 53 de FluidR3 es una voz humana muestreada y con licencia MIT. Lo que sigue valiendo de este apartado es el mapa de dónde NO buscar.

Para las **locuciones** —alguien diciendo la consigna— la conclusión no cambia: **hay que grabarlas**. Son treinta segundos con un móvil, sale CC0 o CC BY-SA
según se quiera, y encaja con lo que este mismo documento ya decía abajo. `tools/muestras-voz.py`
hace el resto: recorta, mide la altura, avisa si no es la nota declarada, normaliza y codifica.

> **Al día del 2026-09-08: esto ya no aplica.** Las locuciones se descartaron —ver
> [`adr/0006`](adr/0006-sin-locuciones-grabadas.md)—, así que lo de abajo queda como
> registro de lo que se buscó, no como tarea pendiente.

**Lo que falta de verdad no es material, son las locuciones.** Toda instrucción tiene que
existir en audio con **voz humana grabada**, nunca sintetizada (regla 1 de `04-DISENO-UI.md`),
y eso no está en ningún repositorio: hay que grabarlo. Es la única dependencia del proyecto
que no se resuelve descargando algo.

---

## 4. Interfaz para niños: lo que dice la investigación

Fuente principal: **Nielsen Norman Group**, *UX Design for Children (Ages 3–12)*, cuarta
edición. Tres rondas de estudios de laboratorio en EE. UU. y China, separadas por ocho y
nueve años, con más de 80 sitios y 36 aplicaciones probados por niños.

### Lo que confirma lo que ya hacemos

- **Distinguir tramos de edad** (3–5, 6–8, 9–12) porque las capacidades físicas y cognitivas
  difieren mucho. Es exactamente el ADR 0005 y sus tres carriles.
- **Los menores de 5 años no manejan arrastrar y soltar.** El enfoque que funciona es
  *tap-and-tap*: tocar el elemento y después tocar el destino. **Es literalmente lo que
  implementa `maquinaOrdenar.ts`**, y valida la decisión de no permitir arrastre en Infantil.
- **Entre 5 y 8 años, menos errores de navegación con interfaces simplificadas** y sin
  saturar. Es la regla 8 y el motivo de que la barra tenga tres destinos.

### Lo que NO cumplimos y hay que corregir

| Recomendación NN/g | Nosotros | Qué hacer |
|---|---|---|
| **Objetivo táctil de 2 × 2 cm** (~76 px) para niños, frente a 1 × 1 cm de adulto | Infantil 75 px ✓, pero `lectores` 60 px y `autonomos` 48 px | Los dos carriles de Primaria van por debajo. Revisar |
| **Separación de 64 px** entre botones para evitar toques accidentales | 24 px en Infantil, 16 y 12 en los otros | **Muy por debajo.** Es el hueco más claro que ha salido |
| Iconos de **60 × 60 a 80 × 80 px** | 62 % del botón: 46 px en Infantil | Corto en los carriles pequeños |
| Texto no menor de **24 pt** | 24 px en Infantil, 20 y 18 en los otros | 24 pt ≈ 32 px. Vamos cortos en todos |

> Estas cifras son de investigación con usuarios y **contradicen en parte lo que tenemos**,
> que salía de WCAG. WCAG es el mínimo legal; NN/g mide lo que de verdad funciona con niños.
> Cambiar los tokens afecta a las 43 actividades, así que **es una decisión de producto** y
> queda anotada como T3.5, no ejecutada por mi cuenta.

---

## 5. Ideas nuevas del autor, evaluadas

### Mini piano en el móvil

**Viable y barato.** Ya está casi todo: el `Sampler` con marimba CC0, el `AudioContext`
único y el tipo `lienzo`, que es un piano por franjas. Un teclado de verdad son teclas
blancas y negras en vez de franjas de color.

Referencias miradas: `x-piano` (Web Components), `Open-Web-Piano` (Web Audio + Web MIDI),
`virtual-keyboard-display` (TypeScript y React, pensado para enseñar). **Ninguna hace falta
como dependencia**: son cien líneas de nuestro propio código sobre el sampler que ya existe,
y una dependencia externa aquí traería su propia gestión de audio y chocaría con la regla de
un solo `AudioContext`.

Con **Web MIDI** se podría enchufar un teclado real por USB. Es aparte y va a Fase 3.

### Musicograma que avanza tipo Guitar Hero

**Viable, y encaja con lo que ya hay.** El tipo `seguir` ya tiene el cursor sincronizado por
`requestAnimationFrame` y separado del planificador de audio, que es la parte difícil y la
que casi todos hacen mal. Lo que falta es cambiar el bloque que se ilumina por notas que
caen sobre una línea de acierto.

Referencias: `KozielGPC/piano-hero`, `ksalehi/PianoHero` (Canvas a 60 Hz con
`requestAnimationFrame`), `malandrin/piano-hero` (lee MIDI). Todas son proyectos de
aprendizaje sin mantenimiento: **se mira el enfoque, no se depende de ellas**.

**Una advertencia pedagógica.** Guitar Hero puntúa, encadena combos y penaliza el fallo. Eso
choca de frente con la regla 4 y con lo que el dosier llama la mitad tóxica de Duolingo. La
mecánica de notas que caen **sí** vale —hace visible que la música avanza en el tiempo— pero
sin marcador, sin combo y sin fallar. Es un musicograma que se mueve, no un juego de puntos.

---

## Fuentes

- [PDMX en Zenodo](https://zenodo.org/records/14648209) · [PDMX en GitHub](https://github.com/pnlong/PDMX/) · [artículo](https://arxiv.org/html/2409.10831v1)
- [Sitios con MusicXML](https://www.musicxml.com/music-in-musicxml/)
- [NN/g — UX Design for Children (3–12)](https://www.nngroup.com/reports/children-on-the-web/)
- [NN/g — Design for Kids Based on Their Stage of Physical Development](https://www.nngroup.com/articles/children-ux-physical-development/)
- [NN/g — Children's UX: Usability Issues](https://www.nngroup.com/articles/childrens-websites-usability-issues/)
- [Bibliotecas de ilustración open source](https://www.toools.design/free-open-source-illustrations)
- [Ilustraciones CC0 de Lukasz Adam](https://lukaszadam.com/illustrations)
- [Freesound, filtro CC0](https://freesound.org/browse/tags/cc0/)
- [Recursos libres de sonido en Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Free_media_resources/Sound)
- [KozielGPC/piano-hero](https://github.com/KozielGPC/piano-hero) · [ksalehi/PianoHero](https://github.com/ksalehi/PianoHero) · [malandrin/piano-hero](https://github.com/malandrin/piano-hero)
- [Korilakkuma/x-piano](https://github.com/Korilakkuma/x-piano) · [Open-Web-Piano](https://github.com/iBundin/Open-Web-Piano) · [virtual-keyboard-display](https://github.com/fa-sharp/virtual-keyboard-display)
