# Esquema de actividad

La referencia normativa es `schemas/actividad.schema.json`. Esto es la guía para humanos.

## Campos obligatorios

| Campo | Qué es | Trampa |
|---|---|---|
| `id` | Identificador estable en kebab-case | **Nunca se renombra**: puede estar en una URL compartida |
| `version` | Entero, empieza en 1 | Súbelo si cambias la respuesta correcta |
| `tipo` | Uno de los tipos de motor (tabla en `docs/01-ARQUITECTURA.md`) | Si no encaja en ninguno, probablemente estés diseñando mal la actividad |
| `titulo` | Máximo 70 caracteres | Se ve en el catálogo del maestro, no en la pantalla del niño |
| `etapa` | `infantil`, `primaria-c1/c2/c3` | Determina tolerancias, tamaños táctiles y tesitura |
| `eje` | pulso, altura, timbre, notacion, cuerpo, creacion, cultura | Es la taxonomía del catálogo |
| `curriculo` | Capa **normativa** | Solo etiquetas literales del RD. Ante la duda, `null` |
| `entrada` | Cómo interactúa el niño | Si usa micrófono o arrastre, `alternativa` es obligatoria |
| `contenido` | Carga útil del tipo | Lo interpreta el componente del tipo |

## Las dos capas, que no se mezclan

```jsonc
"curriculo": {                    // CAPA NORMATIVA — literal del real decreto
  "competencia": "CE3",           // Primaria: CE1..CE4 (son cuatro, no seis)
  "criterio": "3.1",
  "saber": "D. Práctica instrumental, vocal y corporal"
},
"practica": {                     // CAPA DE PRÁCTICA — convención, NO currículo
  "figuras": ["negra", "corchea"],
  "compas": "2/4",
  "secuencia": "vocal-kodaly"
}
```

**El currículo estatal jamás nombra una figura, una nota ni un compás.** Poner «negra» en
`curriculo` es un error que cualquier revisión pedagógica seria detectaría.

## Reglas que el validador hace cumplir

- Micrófono o arrastre ⇒ `entrada.alternativa` obligatoria
- Etapa `infantil` ⇒ nunca `arrastre`
- Máximo de opciones simultáneas: 4 en Infantil, 6 en c1, 8 en c2, 9 en c3
- Prohibidos los campos `vidas`, `tiempo_limite_s`, `racha`, `clasificacion`
- El ABC tiene que parsear, cuadrar los compases, caber en la tesitura de la edad y no
  tener saltos mayores que el límite de la etapa (4.ª en Infantil, 5.ª en c1, 6.ª en c2)

## El código corto

Cada actividad tiene un código de tres cifras que sale de su `id`, no de un campo aparte:
la etapa da la primera cifra —0 Infantil, 1, 2 y 3 los ciclos de Primaria, 9 el Taller— y
el número del `id` las otras dos: `inf-23-…` es **023**, `c1-07-…` es **107**, `tr-05-…`
es **905**. Sale delante del título en el catálogo, el camino, la explicación, la ficha y
los criterios, y el buscador del catálogo lo entiende. Ver `motor/codigo.ts`.

## La melodía debajo de la percusión corporal

Una actividad de tipo `cuerpo` que es una canción entera puede llevar `melodia`: una nota
por golpe del `patron`, en notación científica, o `null` donde no hay nota. Suena bajita
—un tercio del volumen— debajo de los golpes, con el `instrumento` que declare o la flauta:
es la referencia para cantar, no el protagonista. Solo se escribe desde una fuente
verificada; una melodía de memoria no entra. Y `bucle: false`: una canción entera se toca
una vez y al acabar se ofrece repetirla o terminar; los patrones cortos siguen en bucle.

## Una actividad como serie de ejercicios

Desde el 2026-09-11, `contenido.ejercicios` convierte una actividad en una pequeña serie de
ejercicios de sí misma. Cada ejercicio es el contenido base con sus campos encima, y lleva un
`titulo` (clave de i18n) que sale en el cierre:

```jsonc
"contenido": {
  "consigna": "actividad.c102.consigna",
  "tempo": 84,                                  // común a todos
  "ejercicios": [
    { "titulo": "actividad.c102.ej1", "silabas": ["ta", "ta", "ta", "ta"] },
    { "titulo": "actividad.c102.ej2", "silabas": ["ta", "ta", "ti-ti", "ta"] },
    { "titulo": "actividad.c102.ej3", "silabas": ["ta", "sh", "ti-ti", "ta"] }
  ]
}
```

Lo que hace el motor (`serie.ts`, con test): los ejercicios van en orden con una pausa
entre ellos; al final, un cierre con una fila por ejercicio en palabras —bien, casi, hecho—
y dos botones: «repetir los que costaron» y, discreto, «entera otra vez». Cada vuelta varía
(`variaciones.ts`): el ritmo se gira, el dictado mueve las columnas, el karaoke va un poco
más deprisa. Nunca se repite lo mismo. Sin `ejercicios`, la actividad es un solo ejercicio y
todo sigue como antes. Los ejercicios se escriben a mano, porque la progresión es pedagógica.

**Los karaokes van en tres partes**: media canción, la otra media y entera, desde el
2026-09-11 en todos los que tienen canción (214, 216, y los nueve de obras y de la
pandilla). Es la progresión que al autor le gustó de la 214, y se escribe con tres
`ejercicios` cuyas `notas` son la primera mitad, la segunda y la suma.

**El pentagrama dibuja líneas adicionales y puede preguntar por rondas.** Los sitios van de
la línea −1 (segunda adicional por debajo: do2 en clave de fa) a la 7 (segunda por arriba:
do6 en clave de sol) y del espacio −1 al 6; `motor/pentagramaPosiciones.ts` dice qué adicionales lleva cada uno. Con dos
octavas una nota tiene dos o tres sitios, así que cada opción lleva `clave` única («do5») y
`nombre` («do»), y `contenido.porRonda` hace que cada ronda dibuje solo ese número de sitios
**sin dos del mismo nombre** y pregunte uno de ellos: la pedida tiene un solo sitio posible.
Cada sitio se pregunta una vez (`motor/rondasPentagrama.ts`, con test). Sin `porRonda` se
dibujan todos siempre. Con `modo: "libre"` no hay pregunta: es la ficha del Taller (tr-15,
tr-16), que dibuja el pentagrama entero y al tocar un sitio suena y enseña arriba el nombre
de la nota con su personaje. `instrumento` cambia el timbre (piano para la clave de fa).

**Los estímulos con `ritmo` admiten `pulso`** (`antes`, `fondo` o `ambos`; en el estímulo o en
`contenido.pulso` para toda la elección): el pulso de negra, más flojo y de otro timbre, un
compás antes del ritmo y/o debajo de él. Es lo que hace que «¿negra o blanca?» (125) tenga
con qué compararse. Los dictados de figuras lo llevan; los de compás y de acento, no.

**Tocar a tiempo admite una melodía debajo** (`contenido.melodia`, una nota por golpe del
patrón, e `instrumento`): suena en la escucha y, anclada al primer golpe del niño, mientras
palmea. Es lo que hace que el ritmo de la Gruta (345) se reconozca como la Gruta.
`tests/obras.test.ts` comprueba la cuenta.

**Un bloque de un mapa puede ser un personaje** (`bloques[].personaje`) en vez de un dibujo:
el de la nota que suena en él. Se queda quieto hasta que le toca, canta mientras suena y da
un botecito. Es la canción con pictogramas (011) con la pandilla entera: la 141.

**Los mapas (`seguir`) con `notas`** las escriben de dos maneras, y se distingue por la
cuenta: **tantas notas como casillas** (una por bloque o por sílaba: la canción con
pictogramas) o **tantas como pulsos** (la forma de una obra: `null` donde no empieza nota).
`tests/obras.test.ts` comprueba que sea una de las dos y `motor/notasDelMapa.ts` es la regla.

**La letra** (`letra: { idioma, texto, fuente }`) es opcional y sale solo en la ficha del
maestro: en la pantalla del niño lo que hay que cantar suena. Entra únicamente una letra
cotejada y de dominio público; una traducción moderna tiene autor aunque circule como
tradicional (la de «Estrellita» en español, por ejemplo, no entra).

**Las representaciones del karaoke** (`contenido.representacion`): `pentagrama` (la nota en su
altura, con `clave`), `color` (una franja por grado), `silaba`, `figura`, `icono` y, desde el
2026-09-10, `personaje`: cada nota baja con su personaje de la pandilla (Dora es do, Milo es
mi) y, con `botonesPorCarril`, el pulsador de cada banda es el personaje cantando con el
nombre de su nota. Solo tiene sentido en do mayor sin alteraciones: un fa sostenido no es
Fara. Con sostenidos, `pentagrama`.

Lo admiten hoy: tocar-a-tiempo, rejilla, ordenar, emparejar, compases, karaoke y seguir.
El validador y `dificultad` miran cada ejercicio por separado.

## Lo que puede sonar sin un fichero de audio

Desde el 2026-09-10, un estímulo de `eleccion`, una entrada de `referencia` y una ficha de
`ordenar` pueden describir lo que suena en el propio JSON, y el motor lo toca con el sampler,
el clic y el kit de percusión que ya existen. Es lo que permite escribir un intervalo, un
dictado de figuras o un «forte o piano» sin grabar nada. La regla vive en
`src/motor/estimulo.ts` y tiene test.

```jsonc
{ "notas": ["C4", "G4"], "respuesta": "quinta" }                 // dos notas seguidas
{ "notas": ["C4", "D4", "E4"], "duraciones": [0.5, 0.5, 1] }     // pulsos por nota
{ "notas": ["C4", "E4", "G4"], "volumen": 0.2 }                   // dinámica, de 0 a 1
{ "notas": ["G4", "G4", "G4"], "volumenes": [0.2, 0.6, 1] }       // crescendo
{ "notas": ["C4", "D4", "E4"], "articulacion": "staccato" }       // o "legato"
{ "ritmo": [1, -1, 0.5, 0.5, 2] }                                 // clics; negativo = silencio
{ "ritmo": [1, 1, 1, 1, 1, 1], "acentos": [0, 3] }                // un 3/4: acento en el 1 y el 4
{ "patron": ["bombo", "caja", "caja"], "tempo": 138 }             // golpes del kit, uno por pulso
{ "patron": ["bombo+charles", "", "caja"], "celda": 0.5 }         // varios a la vez, y silencios
```

Las opciones de `eleccion` y las fichas de `ordenar` admiten además `signo` —un glifo
musical en Unicode, dibujado con Bravura— en vez de `icono`, para cuando la respuesta **es**
notación: una corchea no tiene emoji ni tiene por qué tenerlo.

## Notación ABC en 30 segundos

```
X:1            número de pieza
T:Título
M:2/4          compás
L:1/4          duración por defecto de una letra
Q:1/4=72       tempo
K:C            tonalidad
z2 | c c | c/c/ c |
│    │     └── c/c/ = dos corcheas (mitad de L)
│    └──────── dos negras
└───────────── silencio de dos tiempos
```

Mayúsculas = octava central (C = do3), minúsculas = octava siguiente (c = do4),
`c'` sube otra octava, `C,` baja una. Referencia: <https://abcnotation.com/>

## Ciclo de vida

`borrador` → `revision-pedagogica` → `publicada`

Solo las `publicada` aparecen en el catálogo público. El índice se regenera con
`npm run contenido:indice`.
