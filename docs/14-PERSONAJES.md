# Los personajes de cocomusic

La metodología cocomusic tiene ocho personajes, uno por nota, y cada uno lleva asociados un
color, una emoción y una función educativa. Este documento no los inventa: los recoge, y
define **cómo entran en Cascabel** sin tocar código.

> Los personajes y sus nombres son de **cocomusic**, no de Cascabel, y no están cubiertos por
> las licencias del código ni de los contenidos. Ver `TRADEMARK.md`.

---

## 1. La pandilla

El orden **no es alfabético ni casual**: es la progresión de la metodología, de la seguridad
a la unión.

| # | Personaje | Nota | Color | Emoción | Rasgo | Idea clave |
|---|---|---|---|---|---|---|
| 1 | **DORA** | do | rojo | Seguridad | La base | Antes de explorar la música, necesitamos sentirnos seguros |
| 2 | **REX** | re | naranja | Curiosidad | El explorador | Escuchar para descubrir |
| 3 | **MILO** | mi | amarillo | Alegría | El bromista | La música también sirve para jugar, reír y conectar |
| 4 | **FARA** | fa | verde | Calma | La tranquilidad | Parar y escuchar también es hacer música |
| 5 | **SOL** | sol | azul | Energía | El brillo y el movimiento | La música se siente y se expresa con el cuerpo |
| 6 | **LAIA** | la | lila | Creatividad | La imaginación | La música también se puede inventar |
| 7 | **SIMÓN** | si | rosa | Sensibilidad | La escucha | Cuando escuchamos con atención, descubrimos más |
| 8 | **DOBY** | do′ | multicolor | Unión | El cierre | Cada personaje aporta algo, pero juntos forman la música |

**SOL es un nombre, no un astro.** El personaje representa energía y movimiento; dibujarlo
como un sol con rayos lo convertiría en otra cosa y arrastraría toda la temática solar, que
no es la suya.

**DOBY no es «otro do».** Cierra la octava y cierra el recorrido: su papel es integrar lo de
los siete anteriores, y por eso es multicolor. Donde aparezca junto a los demás, va el
último.

---

## 2. Los nombres de fichero

```
public/personajes/<personaje>-<pose>.svg
```

`<personaje>` es el nombre en minúsculas, sin tilde y sin acentos:

`dora` · `rex` · `milo` · `fara` · `sol` · `laia` · `simon` · `doby`

**El personaje va primero y la pose después**, no al revés, por una razón práctica: al listar
la carpeta quedan agrupados los ocho ficheros de cada personaje, que es como se revisan y
como se echa en falta el que no está.

Ejemplos: `milo-celebra.svg`, `fara-calla.svg`, `doby-neutro.svg`.

**Los nombres no se traducen.** Cuando llegue otro idioma, los ficheros siguen llamándose
igual: son identidad, no texto.

---

## 3. Las poses

Salen de los sitios donde la aplicación enseñaría un personaje, no de una lista de gestos
bonitos. Cada una tiene un uso concreto.

### El juego de diez

Las tres primeras las necesitan los ocho personajes; con solo `neutro` para los ocho, la
aplicación ya funciona entera.

| Pose | Dónde sale | Qué tiene que transmitir |
|---|---|---|
| `neutro` | Como **nota**: teclas del piano, carriles del musicograma, ordenar de grave a agudo | Retrato limpio, de frente. Es la que más se usa y la que más se ve pequeña |
| `celebra` | Al terminar una actividad | Alegría contenida. **No euforia**: se repite muchas veces y cansa |
| `anima` | Después de un intento fallido | Ánimo, nunca lástima. El error no castiga (§4): ni tristeza, ni ceño, ni lágrima |
| `saluda` | Pantalla de bienvenida de la actividad | Es la de DORA por rasgo, pero sirve para cualquiera |
| `busca` | Descubrir e identificar sonidos | La de REX |
| `palmea` | Ritmo, eco de palmas, percusión corporal | La de MILO |
| `calla` | El silencio: semáforo del sonido, escucha | La de FARA |
| `baila` | Pulso, caminar al ritmo, danzas | La de SOL |
| `canta` | Cantar, improvisar, inventar | La de LAIA |
| `escucha` | Discriminación auditiva, «¿quién ha sonado?» | La de SIMÓN |

**Ochenta ficheros para el juego completo**, y no hace falta tenerlos todos para empezar: la
aplicación va usando lo que encuentre.

### Cómo se comporta si falta un fichero

Busca la pose pedida; si no está, usa `neutro`; si tampoco, no dibuja nada y sigue. **Nunca
un hueco, nunca el icono roto del navegador**, que en una aplicación para niños es peor que
no enseñar nada. Se puede añadir de uno en uno.

### `-main`, la lámina de referencia

`doby-main.svg` no es una pose: es el dibujo grande del personaje, el que sirve de
referencia para generar los demás y para material impreso. No se precachea y la aplicación
no lo usa. Uno por personaje.

## 4. El contrato del fichero

Esto es lo que hace que ocho dibujos parezcan una pandilla y no ocho dibujos.

| | |
|---|---|
| **Formato** | SVG, sin mapas de bits incrustados |
| **Encuadre** | Exporta **recortado al dibujo**, como salga. De cuadrarlo se encarga `npm run personajes` |
| **Peso** | Lo que salga: los de Doby van a 16–22 KB y los de Dora a 33–44, porque Dora tiene más del doble de trazos. No es un defecto, es el dibujo. Ver el presupuesto de abajo |
| **Trazo** | El mismo grosor en los ocho. Un personaje con línea más fina parece de otra serie |
| **Texto** | **Ninguno.** Ni el nombre, ni la nota, ni letras. Va aparte y así se traduce |
| **Fuentes** | Ninguna: si hay letras, van convertidas a trazado |
| **Colores** | Planos, sin degradados ni sombras. Se ven a 40 px y se imprimen en gris |
| **Legibilidad** | Reconocible a **40 px** y en escala de grises |

**La silueta es lo que los distingue, no el color.** Es la regla §6 aplicada a los
personajes: el color nunca informa solo. Un niño con daltonismo, una ficha fotocopiada o una
tecla de piano de 48 px tienen que dejar reconocer a Milo sin depender del amarillo.

### El paso que hay que dar siempre

```bash
npm run personajes
```

Cuadra todas las poses en el mismo lienzo y limpia la cabecera del exportador. **Es
obligatorio**, y por una razón que se ve en cuanto no se hace: cada pose sale recortada a su
dibujo, así que una mide 155 × 225 y otra 207 × 220. Puestas en la misma caja, el personaje
cambia de tamaño al cambiar de gesto.

El script las apoya **abajo**, no las centra: lo que tiene que coincidir entre una pose y
otra son los pies. Centrándolas, un personaje con los brazos en alto bajaría los pies para
compensar y parecería que da saltos. `tests/personajes.test.ts` comprueba que se ha pasado.

### Qué se baja y cuándo

`neutro`, `celebra` y `anima` van en la primera descarga: salen en cualquier actividad. Las
otras siete se bajan el día que se abre la actividad que las usa y se quedan cacheadas. Es
lo mismo que se hace con los instrumentos, y por lo mismo.

**El presupuesto, medido con Doby y Dora y proyectado a los ocho:**

| | |
|---|---|
| Los ochenta dibujos | ~2,3 MB |
| Lo que va al precache (3 poses × 8) | ~670 KB |
| Primera descarga con los ocho dentro | ~2 MB, desde 1,35 MB |

Sube la primera visita a la mitad y medio, y se acepta: un personaje sale en todas las
pantallas, no es como un instrumento que la mayoría no abre. Si algún día apretara, lo
primero que saldría del precache es `anima` —solo aparece tras un intento fallido, y para
entonces la red ha tenido tiempo—, no `neutro`.

## 5. El color: hay que decidir algo

Los cuatro primeros coinciden con el código de la aplicación. Los tres últimos no.

| Nota | Cascabel (Boomwhacker) | cocomusic | |
|---|---|---|---|
| do | rojo | rojo | ✓ |
| re | naranja | naranja | ✓ |
| mi | amarillo | amarillo | ✓ |
| fa | verde | verde | ✓ |
| sol | **turquesa** | **azul** | ✗ |
| la | **índigo** | **lila** | ✗ |
| si | **violeta** | **rosa** | ✗ |

Cascabel usa el **código Boomwhacker**, verificado: do rojo, re naranja, mi amarillo, fa
verde, sol turquesa, la índigo, si violeta. No es una paleta elegida por gusto: es la de unos
tubos de plástico que existen, y si un colegio los tiene, la tecla de la app y el tubo que el
niño sostiene tienen que ser del mismo color.

Los tres del final de cocomusic están *desplazados*, no enfrentados: azul, lila y rosa
ocupan aproximadamente el sitio de turquesa, índigo y violeta, un paso más cálidos.

**Tres salidas, y la decisión es del autor:**

1. **Acercar los tres de cocomusic al Boomwhacker** — Sol turquesa, Laia índigo, Simón
   violeta. Un solo código en toda la metodología y coherencia con los instrumentos del aula.
   Cuesta retocar tres personajes.
2. **Mantener el color de cocomusic como identidad y el Boomwhacker como código de nota.**
   Laia es lila siempre; la nota *la* es índigo siempre. Funciona, pero hay que asumir que en
   el musicograma Laia aparecerá sobre un carril de otro color que el suyo.
3. **Cambiar la aplicación al código de cocomusic.** No lo recomiendo: rompería la
   correspondencia con los Boomwhackers, que es de las pocas cosas de la app que conectan con
   material físico real.

**Mi recomendación es la 1**, y solo si los tres retoques no desvirtúan nada de la
metodología. Si el color forma parte de la identidad del personaje de un modo que no se puede
tocar, la 2 es perfectamente viable y solo pide tenerlo escrito.

---

## 6. Prompts

Un bloque de estilo **idéntico** en los ocho, y luego el personaje y la pose. La consistencia
sale del bloque repetido, no de pedir «que se parezcan».

### Bloque de estilo (va en todos, sin cambiar una coma)

```
Ilustración vectorial plana para niños de 3 a 6 años. Personaje único, centrado,
de cuerpo entero, mirando al frente. Colores planos y saturados, sin degradados,
sin sombras, sin texturas. Contorno de grosor uniforme y redondeado. Formas
grandes y simples, silueta clara y reconocible en miniatura. Cara amable con ojos
grandes. Fondo blanco liso, sin escenario, sin objetos sueltos, sin texto ni
letras de ningún tipo. Composición cuadrada con aire alrededor del personaje.
```

### El personaje

Se añade al bloque anterior. La descripción física la pones tú —son tuyos—; lo que va aquí
es lo que **no** puede faltar en el prompt para que la pandilla funcione:

```
<personaje>: <tu descripción física>. Color dominante <color>. Expresión de
<emoción>. Sin ningún elemento que sugiera <lo que hay que evitar>.
```

| Personaje | Color dominante | Expresión | Evitar |
|---|---|---|---|
| DORA | rojo | serena, acogedora | que parezca autoritaria o triste |
| REX | naranja | curiosa, atenta, cejas arriba | que parezca asustada |
| MILO | amarillo | risueña, traviesa | mueca de burla: se ríe **con**, no **de** |
| FARA | verde | tranquila, ojos entornados | que parezca aburrida o dormida |
| SOL | azul | vivaz, en tensión de movimiento | soles, rayos, astros, amarillo |
| LAIA | lila | soñadora, imaginativa | magia, varitas, estrellas de hada |
| SIMÓN | rosa | atenta, receptiva | que parezca preocupado |
| DOBY | multicolor | alegre, integradora | que parezca una copia de Dora |

### Las poses

Se añade al final. Una frase, y la misma redacción para todos.

| Pose | Frase |
|---|---|
| `neutro` | `De pie, de frente, brazos relajados a los lados. Postura de reposo.` |
| `celebra` | `Con los brazos levantados y una sonrisa amplia. Alegría contenida, no eufórica.` |
| `anima` | `Con una mano extendida hacia delante, invitando. Gesto de ánimo, expresión amable. Sin tristeza ni decepción.` |
| `saluda` | `Saludando con una mano en alto, sonriendo.` |
| `busca` | `Inclinado hacia delante, con una mano sobre la oreja, buscando algo con la mirada.` |
| `palmea` | `Dando una palmada con las dos manos juntas delante del pecho.` |
| `calla` | `Con el dedo índice sobre los labios, tranquilo, ojos entornados.` |
| `baila` | `En pleno movimiento, un pie levantado y los brazos abiertos.` |
| `canta` | `Con la boca abierta cantando y las manos abiertas a los lados.` |
| `escucha` | `Quieto, con las dos manos detrás de las orejas, muy atento.` |

### Lo que de verdad hace que se parezcan

Generar los ocho por separado da ocho estilos parecidos, no el mismo. Lo que funciona:

1. **Genera primero una hoja con los ocho juntos**, en una sola imagen, con el bloque de
   estilo y las ocho descripciones. Ahí el modelo los unifica solo.
2. **Con esa hoja como referencia**, saca cada personaje y cada pose.
3. **Vectoriza al final**, no al principio.

---

## 7. El código

Ya está, desde que llegaron los primeros dibujos:

- **`src/ui/personajes.ts`** — el mapa nota → personaje y las rutas. Ahí vive el caso que
  importa: hay dos «do», y **Dora abre y Doby cierra**. Se resuelve por octava, no por letra.
- **`src/ui/Personaje.tsx`** — el componente. Va con `<img>` y no con el SVG incrustado: son
  ilustraciones a todo color que no hay que recolorear, así se cachean como cualquier imagen
  y no se meten veinte kilobytes de trazos en el árbol del documento cada vez.
- **`tools/personajes.mjs`** — el normalizador (`npm run personajes`).
- **`tests/personajes.test.ts`** — el mapa, y los nombres de fichero. Esto último no es
  paranoia: un nombre mal escrito no da ningún error —el componente cae a `neutro` y sigue,
  que es lo que se le pide— pero la pose no aparece nunca y nadie se entera. Pasó con
  `doby-palmeea.svg` el primer día.

### Quién presenta cada actividad lo dice el JSON

**Doby cierra** siempre: al terminar cualquier actividad, que es su papel —integrar lo que
han hecho los otros siete—. Eso no se configura.

**Quién abre sí**, con el campo `personaje` de la actividad. Por defecto **Dora**, la primera
de la progresión, la base y la seguridad, para una pantalla que es exactamente eso: el
momento antes de empezar. Y se cambia por lo que la actividad **trabaja**, no por gusto:

```json
"personaje": "rex"
```

Hoy lo usan las cinco de descubrir e identificar sonidos, que es lo de Rex —«escuchar para
descubrir»—: `inf-05`, `inf-10`, `inf-13`, `c1-08` y `c2-11`.

Está así a propósito: **es un dato, no un `if`**. El día que exista Fara, ponerla en las
actividades de silencio será una línea de contenido. `tests/personajes.test.ts` comprueba
además que no se asigne un personaje **que aún no esté dibujado** — no rompería nada, pero
dejaría la pantalla sin personaje y sin que nadie se entere.
