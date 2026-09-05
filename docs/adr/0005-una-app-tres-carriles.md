# ADR 0005 — Una sola app, tres carriles visuales

**Estado**: aceptada · **Fecha**: 2026-09-06

## Contexto

El dosier deja esta pregunta abierta y la marca como decisión de producto, no técnica:

> **¿Infantil y Primaria en la misma app, o dos apps?** Un niño de 4 años y uno de 11 no
> comparten casi nada: ni interfaz, ni tipografía, ni modelo de recompensa.

El problema es real. Un niño de 4 años no lee, necesita objetivos táctiles de 75 px y se
motiva porque algo suena y se mueve. Uno de 11 lee con soltura, tiene motricidad fina, y
—según el propio dosier— *rechaza* la estética infantil: «la estética "pizza" genera
rechazo a partir de 5.º». Servirles la misma pantalla es fallarles a los dos.

Pero separarlos en dos aplicaciones tiene un coste que se paga todos los días.

## Decisión

**Una sola aplicación, con tres carriles visualmente distintos:**

| Carril | Cursos | Edad | Rasgo que lo define |
|---|---|---|---|
| **Infantil** | 2.º ciclo de Infantil | 3–6 | **Cero texto.** El dibujo y el sonido son toda la interfaz |
| **Primeros lectores** | 1.º–3.º de Primaria | 6–8 | Icono **más** palabra. Lectura como apoyo, nunca como requisito |
| **Autónomos** | 4.º–6.º de Primaria | 9–12 | Notación real, estética no infantilizada, más densidad |

El carril es una **capa de presentación**. El motor, el esquema de actividad, el validador,
el audio y la escucha son comunes y no saben en qué carril se están dibujando.

## El carril no es la etapa: son dos ejes distintos

Esto es lo que más se va a prestar a error, así que queda escrito:

- **`etapa`** (en el JSON y en `src/config.ts`) es la **capa normativa**: `infantil`,
  `primaria-c1`, `primaria-c2`, `primaria-c3`, que son los ciclos LOMLOE — 1.º–2.º,
  3.º–4.º y 5.º–6.º. Sirve para etiquetar currículo y **tiene que coincidir con el BOE**.
- **`carril`** es la **capa de presentación**: `infantil`, `lectores`, `autonomos`.

**No coinciden, y es deliberado.** El 2.º ciclo LOMLOE (3.º–4.º) queda partido entre los
dos carriles de Primaria: 3.º se presenta como «primeros lectores» y 4.º como «autónomos».
Esa frontera está donde está porque la marca la lectura fluida y la motricidad fina, no el
real decreto — y el real decreto no dice nada sobre tamaños de botón.

Es la misma separación de dos capas que ya impone `CLAUDE.md` §9 entre `curriculo` y
`practica`. La regla operativa:

> **El carril manda en la presentación; la etapa manda en el currículo.** Una actividad de
> `primaria-c2` aparece en los dos carriles de Primaria, y en cada uno se dibuja con los
> tamaños, la tipografía y la iconografía de *ese* carril.

## Consecuencias

### Lo que diverge por carril

**Tipografía.** Andika (SIL, OFL) en Infantil a 20–24 px; 18 px en primeros lectores;
17 px en autónomos. Atkinson Hyperlegible y OpenDyslexic conmutables en los tres.

**Tamaños táctiles y densidad.** 75 px con separación de 24 y 2–4 objetos en Infantil;
60 px, 16 y 4–6 en primeros lectores; 48 px, 12 y 6–9 en autónomos. Salen de
`estilos/tokens.css` (`--objetivo-infantil`, `--objetivo-c1`, `--objetivo-c3`), nunca
de valores mágicos.

**Modelo de recompensa.** Diverge de verdad, y es lo más fácil de hacer mal:

- *Infantil*: el modelo Loopimal / Toca Band que recomienda el dosier — sin puntuación,
  sin final, sin progreso visible. **La recompensa es que suene y se mueva.** Explorar vale
  más que acertar (regla de Incredibox: «fallar es imposible»).
- *Primeros lectores*: cierre de sesión corto y completo, feedback inmediato y concreto, y
  el resultado sonando entero al terminar. Una dificultad nueva por actividad, no cinco.
- *Autónomos*: la recompensa es **autonomía y autoría** — crear algo, compartirlo por URL
  (T2.6) y verlo funcionar. Es la edad en la que un elogio genérico ya suena falso.

En los tres sigue vigente la regla 4 de `CLAUDE.md`, que no es negociable por carril: sin
vidas, sin rachas, sin cronómetros por defecto y sin clasificaciones entre niños.

**Iconografía.** Infantil: objetos y personajes dibujados, reconocibles sin nombrarlos
(un tambor, no una corchea). Primeros lectores: el mismo icono concreto acompañado de la
palabra. Autónomos: símbolo musical real, y una estética que no les trate de pequeños.

### Lo que NO diverge

El motor y sus tipos, `schemas/actividad.schema.json`, el validador de `tools/`, el
`AudioContext` y el sampler, los worklets de escucha, la capa `i18n`, el modelo de
persistencia y toda la promesa de privacidad. **Un tipo de actividad se escribe una vez y
funciona en los tres carriles**; lo que cambia son los tokens de estilo y el envoltorio.

### El coste que aceptamos

Cada componente de UI tiene que estar parametrizado por carril desde el primer día. Añadir
un carril a posteriori sobre componentes que asumían tamaños fijos sería un refactor caro,
así que el carril entra en `tokens.css` y en los componentes **antes** de que haya veinte
actividades encima. A cambio, no pagamos el coste diario de la alternativa.

### Consecuencia pendiente en el código

`OBJETIVO_TACTIL` y `MAX_OBJETOS` de `src/config.ts` están indexados hoy por `Etapa`, con
`primaria-c1` y `primaria-c2` compartiendo 60 px. Eso contradice esta decisión para 4.º,
que pertenece a `primaria-c2` pero al carril *autónomos* (48 px). **Hay que reindexar esos
mapas por carril**, no por etapa. No se hace en este commit: es cambio de código y le
corresponde su propia tarea, anotada en `docs/07-ROADMAP.md`.

## Alternativa descartada: dos aplicaciones separadas

Una app «Cascabel Infantil» y otra «Cascabel Primaria». Se descarta porque:

- **Duplica el mantenimiento del motor** — el mismo tipo `eleccion` en dos repos que se
  desincronizan. Con un solo autor, es la vía más rápida a que una de las dos se pudra.
- **Rompe la vista del maestro**, que es el eje del producto. Un maestro de música de un
  colegio de Infantil y Primaria da clase a los dos: obligarle a dos apps, dos instalaciones
  y dos búsquedas es exactamente la fricción que el proyecto existe para eliminar.
- **Parte el catálogo curricular en dos.** Las progresiones vocal y de flauta cruzan la
  frontera Infantil–Primaria; separarlas en dos productos las hace invisibles.
- **Duplica el coste legal y de marca**: dos avisos de privacidad, dos fichas, dos
  despliegues, dos auditorías de CSP.
- **No aporta nada técnico.** La divergencia real entre un niño de 4 y uno de 11 es de
  presentación, y eso se resuelve con tokens y un envoltorio, no con dos bases de código.

La única razón de peso para dos apps sería publicar en tiendas con clasificaciones de edad
distintas. Como el ADR 0004 mantiene la vía PWA, esa razón hoy no existe.

## Pendiente de revisión pedagógica

La frontera entre carriles en **3.º / 4.º de Primaria** es la opción convencional —la que
usan las tres tablas del dosier y de `CLAUDE.md` §6, y la que marca el paso a lectura
fluida— pero la ha fijado un desarrollador, no una maestra de música. Es el punto a
confirmar con la validación pedagógica antes de que haya contenido de 3.º y 4.º.
