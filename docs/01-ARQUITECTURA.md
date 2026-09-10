# Arquitectura

## La decisión de la que depende todo

**No se programan actividades: se describen.** Hay ~10 *tipos* de actividad implementados
como componentes genéricos, y cada actividad concreta es un fichero JSON validado.

Consecuencias, que son el motivo de la decisión:

- Añadir una actividad deja de ser programar. Son minutos, no días.
- La IA puede generar contenido válido, porque el formato está acotado y es **validable
  por máquina**.
- Una profesora de música puede revisar un fichero legible sin tocar código.
- El día que exista el «configurador de actividades», ya está casi hecho: es un formulario
  que escribe ese mismo JSON.

Es el modelo de JClic y de LIM, que sobrevivieron veinte años exactamente por esto.

```
content/actividades/*.json          ← la fuente de verdad del contenido
        │  validado por
        ▼
schemas/actividad.schema.json  +  tools/validar.py (music21)
        │  cargado por
        ▼
src/datos/cargar.ts  →  src/motor/registro.ts  →  src/motor/tipos/<Tipo>.tsx
                                                        │
                              ┌─────────────────────────┼──────────────────────┐
                              ▼                         ▼                      ▼
                       src/audio (Tone.js,      src/escucha (worklets    src/ui (botones
                       sampler, metrónomo)      de tono y palmadas)      grandes, feedback)
```

## Los tipos de motor

No se dice cuántos son a propósito: el número ha cambiado siete veces y cada vez dejó una
cifra mentirosa en tres ficheros. `tests/documentacion.test.ts` comprueba que esta tabla
lista exactamente los tipos que hay en `src/motor/registro.ts`, con sus cifras al día, y
`npm run docs:tipos` la rehace conservando la prosa de la columna del medio.

| Tipo | Mecánica | Actividades |
|---|---|---|
| `eleccion` | Suena o se muestra algo; se elige entre 2–4 opciones grandes | 57 |
| `karaoke` | Musicograma que avanza: las notas llegan y se tocan al pasar | 19 |
| `rejilla` | Cuadrícula altura × tiempo | 10 |
| `guia-aula` | Pantalla del maestro: consigna, pulso, coreografía, ficha | 9 |
| `lienzo` | Creación libre sin evaluación | 8 |
| `referencia` | Consulta del lenguaje musical, con sonido. No es un ejercicio | 7 |
| `tocar-a-tiempo` | Golpear en el momento correcto | 7 |
| `ordenar` | Secuencia por altura, duración o forma | 6 |
| `cuerpo` | Percusión corporal: pitos, palmas, muslos y pies en cuatro filas | 5 |
| `seguir` | Reproducción con cursor sincronizado | 5 |
| `emparejar` | Dos conjuntos, toque de dos en dos | 4 |
| `cantar` | Detección de altura con retorno visual | 3 |
| `compases` | Colocar las barras de compás donde el pulso las pide | 3 |
| `memoria` | Cartas boca abajo: un dibujo y su sonido. Se destapan dos y la pareja se queda a la vista | 3 |
| `eco` | Dos niños por turnos: uno propone un ritmo y el otro lo repite | 2 |
| `escala` | Construir una escala contando tonos y semitonos | 2 |
| `pads` | El kit de percusión, para tocarlo: pads por familias y pulso opcional | 2 |
| `pentagrama` | Colocar o leer sobre pauta real | 2 |
| `teclado` | Teclado de piano de una a tres octavas | 2 |
| `acompanamientos` | Bases en bucle para cantar encima, con transporte | 1 |
| `paisaje` | Grabar sonido del entorno y escucharlo (no sale del aparato) | 1 |
| `pistas` | Secuenciador de cuatro voces: voz, percusión, piano y flauta | 1 |

**Antes de crear un tipo nuevo**, comprueba que el caso no cabe en uno existente. Casi
siempre cabe.

## Por qué el formato fuente NO es MusicXML

Una actividad educativa **no es una partitura**. Una partitura no puede expresar el tipo de
ejercicio, la locución del enunciado, la tolerancia de evaluación, los prerrequisitos, las
pistas ni el rango vocal objetivo por edad. Metiendo eso en MusicXML acabas con campos
personalizados y pierdes la ventaja de usar un estándar.

JSON propio + música embebida en **notación ABC**:

- Cuatro compases son ~200 bytes de texto que un modelo escribe casi sin equivocarse,
  frente a 8–30 KB de XML verboso donde falla con `<divisions>` y `<backup>`.
- Se puede **validar semánticamente** con `music21`.
- El diff en git es legible.
- 500 actividades ocupan ~500 KB en vez de ~8 MB → **la biblioteca entera cabe en el
  service worker** y funciona sin conexión.

MusicXML se **genera** cuando hace falta (PDF, intercambio) y se **importa** solo para
traer repertorio de terceros. Nunca es la fuente.

## Reglas de dependencias

- Un componente de actividad **no toca el `AudioContext`**: usa el motor de audio.
- `src/datos/cargar.ts` es el **único** sitio que hace `fetch`, y solo a rutas relativas.
- Los worklets viven en `public/worklets/` porque se cargan por URL, no por import.
- Nada de estado global salvo el imprescindible (audio y preferencias) en Zustand.

## Lo que el marco decide por todas las actividades

Un tipo de motor pinta y programa temporizadores. Todo lo que es igual en las veintiuna
pantallas vive fuera de ellas, en un módulo con su test, y esto es dónde:

| Módulo | Qué decide |
|---|---|
| [`motor/actividadesLibres.ts`](../src/motor/actividadesLibres.ts) | Qué tipos **no tienen final** —no llevan botón de terminar, se sale por «Volver», y no celebran— y **cuándo se da por hecha cada tipo** (`HECHA_CUANDO`): el piano al tocar la primera tecla, el constructor al escuchar el primer ritmo, una pregunta al contestarlas todas. Todo tipo tiene su disparador, y un test lo vigila |
| [`motor/ayudaPorTipo.ts`](../src/motor/ayudaPorTipo.ts) | Qué cuenta la pantalla de explicación sobre **cómo se maneja** ese tipo, y qué nota lleva para el adulto |
| [`escucha/permiso.ts`](../src/escucha/permiso.ts) | Si en esta sesión se usa el micrófono y si ya se preguntó. Vive en memoria y no en disco, a propósito |
| [`ui/Reaccion.tsx`](../src/ui/Reaccion.tsx) | Cómo se le contesta al niño: tarjeta superpuesta, personaje + pista concreta, y se va sola |
| [`motor/maquinaEleccion.ts`](../src/motor/maquinaEleccion.ts) | `pistaPara()` — qué pista toca según cuántas veces se ha fallado. Lo usan **todos** los tipos que evalúan, no solo elección |

La regla para saber si algo va aquí o en el componente: **si cambiarlo tendría que cambiarlo
en más de un tipo, no va en el componente.**

## Decisiones registradas

Ver `docs/adr/`. Las cuatro que más condicionan el código:

1. Motor genérico + contenido declarativo
2. Formato fuente JSON+ABC, no MusicXML
3. Procesamiento de micrófono exclusivamente local
4. PWA primero, nativo solo con razón de negocio
