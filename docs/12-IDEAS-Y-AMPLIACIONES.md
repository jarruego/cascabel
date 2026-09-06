# Ideas y ampliaciones

Investigación del 2026-09-07, a partir de una pregunta del autor: qué hay ya hecho y libre
que podamos aprovechar, y qué merece la pena construir.

**Cada entrada lleva un veredicto**, porque una lista de enlaces sin criterio no sirve de
nada: lo caro no es encontrar ideas, es descartar las que no encajan **después** de haberlas
empezado.

Y hay un criterio que atraviesa todo el documento: **este proyecto no compite en cantidad de
funciones**. Compite en que cada cosa que hay esté pensada, se pueda usar en un aula real y
no traicione las cinco reglas. Una función más que no cumpla eso hace la aplicación peor, no
mejor.

---

## 1. Lo que ya se ha aprovechado (verificado hoy)

| Recurso | Licencia | Qué nos ha dado |
|---|---|---|
| **FluidR3_GM** (Frank Wen) vía `gleitz/midi-js-soundfonts` | **MIT** | Los doce instrumentos afinados, la voz muestreada y los seis del mundo |
| **VCSL** (Versilian Studios) | **CC0** | La marimba y, desde hoy, el kit de percusión de aula |
| **OpenMoji** | **CC BY-SA 4.0** | Los 48 iconos |
| **Andika** y **Bravura** | **OFL-1.1** | Tipografía de lectores nóveles y símbolos musicales SMuFL |

Todo se sirve desde nuestro origen. Ninguna petición sale fuera: es la regla 1 y es lo que
permite prometer por escrito lo que se promete.

---

## 2. Herramientas y repositorios revisados

### Lo que sí se puede usar

| Recurso | Licencia | Veredicto |
|---|---|---|
| **Procomún (INTEF)** | **CC BY-SA 4.0** | **El hallazgo más importante de esta ronda.** Es la misma licencia que nuestro contenido, así que sus unidades didácticas de música se pueden **adaptar legalmente** conservando atribución. Material oficial español, alineado con el currículo, y no hay que pedir permiso a nadie |
| **Chrome Music Lab** | **Apache-2.0** | Se puede leer y adaptar el código. Su valor real no es el código sino **el catálogo de metáforas visuales** que ya han probado con millones de niños: el espectrograma, el armónico, el oscilador. Ideas, no dependencias |
| **MuseScore / OpenScore** | CC0 | Partituras curadas de dominio público. Sigue haciendo falta verificar la obra, no solo la transcripción |
| **PDMX** | CC0 | 250 000 MusicXML. Ya estaba en `11-RECURSOS-Y-REFERENTES.md` |

### Lo que se ha mirado y no compensa

| Recurso | Por qué no |
|---|---|
| **OpenSheetMusicDisplay** | BSD-3, pero arrastra VexFlow 1.2.93 (2017) y su reproductor de audio no es gratuito. Ya está descartado en `CLAUDE.md` §3 y sigue estándolo |
| **Tone.js** | MIT y excelente, pero ya tenemos transporte propio con `lookahead` y un `AudioContext` único. Meterlo ahora sería sustituir código que funciona y está probado por una dependencia de 60 KB |
| **html-midi-player** | BSD-2. Reproduce MIDI en el navegador, que es lo que ya hace nuestro sampler. No añade nada |
| **Repositorios de `music-education` en GitHub** | 236 repos, casi todos entrenamiento auditivo para adultos con teclado MIDI. **Ninguno para Infantil ni Primaria española.** Es un hueco real, no una carencia nuestra |

> **La conclusión incómoda de esta búsqueda**: no hay nada que copiar. Lo que existe libre y
> con licencia usable son *librerías* y *material sonoro*, no actividades para niños de tres
> a doce años en castellano. Eso significa que el contenido hay que seguir escribiéndolo, y
> que **la parte reutilizable ya está reutilizada**.

---

## 3. Las ideas del autor, evaluadas

### Kit de batería o percusión — **HECHO** el 2026-09-07

Estaba en VCSL desde el principio. Diez instrumentos de aula —bombo, caja, tom, bongó,
charles, plato, pandereta, claves, caja china y triángulo— con dos grabaciones de cada golpe
que se alternan. Ver `tools/muestras-percusion.py`.

### Editor de pistas — **HECHO** el 2026-09-07

Cuatro voces a la vez: flauta, piano, bajo y percusión (`c3-12`). Lo que aporta sobre la
rejilla de una voz no es tamaño, son tres ideas que no se pueden tener con una sola pista:
**textura**, **función** y **comparación** —silenciar una voz y volver a ponerla—.

### Itinerario de teoría tipo Duolingo — **SÍ, PERO PARTIDO EN DOS**

Aquí hay que separar dos cosas que en Duolingo van juntas y no tienen por qué:

- **La secuenciación y la repetición espaciada: sí.** Que un contenido vuelva justo antes de
  olvidarse es de lo poco con evidencia sólida en aprendizaje, y **no es una recompensa**: es
  un calendario. No choca con la regla 4 en absoluto.
- **Las rachas, las vidas, las ligas y las notificaciones: no.** Es lo que el dosier llama la
  mitad tóxica, y la regla 4 lo prohíbe explícitamente. La investigación que hay dice además
  que la gamificación sostiene la constancia pero **no enseña**; y que la repetición espaciada
  de Duolingo está subordinada a la estructura de lecciones, o sea que ni siquiera aprovechan
  bien la parte buena.

> **Y hay una razón de este proyecto para no copiar el modelo entero**: Duolingo optimiza
> para que vuelvas mañana. Una biblioteca de aula optimiza para que **el maestro encuentre lo
> que necesita hoy**. Son objetivos distintos y el segundo no necesita rachas.

**Lo que sí encaja**: un itinerario **visible y opcional** —«esto va después de esto»—, sin
desbloqueos. El catálogo ya tiene el dato que hace falta (etapa, eje, criterio); lo que falta
es dibujar el orden. **Nunca bloquear una actividad**: la regla es que el maestro entra y usa
lo que necesita, no que el programa decida qué puede ver.

### Teoría de lenguaje musical básico — **SÍ, Y YA HAY MEDIA**

Figuras, intervalos y ritmo ya están repartidos en actividades (`compases`, `escala`,
`pentagrama`, las de ritmo). Lo que falta no es contenido nuevo, es **un sitio donde
consultarlo**: una pantalla de referencia por edad, sin ejercicio, para mirar cuando hace
falta. Es barato y no compite con nada.

### Compositores y estilos — **SÍ, CON LA CAUTELA DE SIEMPRE**

Ya hay dos obras verificadas (Beethoven y el canon anónimo del XVIII) y el mecanismo para
transcribir y comprobar con `music21`. Lo que limita no es la técnica: es que **cada obra hay
que verificarla**, y eso son horas de una en una. Es trabajo de contenido, no de programación.

---

## 4. Ideas propias, ordenadas por lo que aportan

### 4.1. Percusión corporal — **la que más recomiendo**

Es lo que más se usa en el aula de música española y no está en la aplicación. No necesita
instrumentos, funciona con treinta niños a la vez y es la vía natural al pulso antes de que
haya coordinación para un instrumento.

Técnicamente es casi gratis: ya tenemos el detector de palmadas, la rejilla rítmica y el
anclaje al primer golpe. Lo que falta es el **contenido** —secuencias de palmas, rodillas,
pitos y pies— y el dibujo. **PENDIENTE DE CRITERIO MUSICAL**: hay método establecido en
España (BAPNE) y conviene mirar si su notación está libre antes de inventar una.

### 4.2. Improvisación pentatónica sobre acompañamiento

Una escala pentatónica tiene una propiedad que ninguna otra: **no se puede sonar mal**.
Cualquier nota encaja sobre el acompañamiento, y eso convierte «improvisa» en algo que un
niño con vergüenza puede hacer. Es el mecanismo que usa todo el método Orff.

Con lo que ya hay —sampler, pistas, teclado— es una actividad, no un desarrollo. La única
pieza nueva es un acompañamiento en bucle, y eso lo da el editor por pistas.

### 4.3. Eco a dos: uno propone, otro repite

Dos niños en la misma tablet, por turnos. El primero toca un ritmo o una melodía corta, el
segundo lo repite, y la aplicación compara **las dos ejecuciones entre sí**, no contra un
modelo. Es lo que ya hace `anclarEn()`, aplicado a dos personas en vez de a una.

Aporta algo que ninguna actividad individual da: **escucharse entre ellos**. Y no necesita
red, ni cuentas, ni nada que roce la regla 3.

### 4.4. Pantalla de referencia («¿cómo era esto?»)

Figuras y sus duraciones, la escala, los nombres de las notas, el compás. Sin ejercicio y sin
evaluación: para mirar. Un niño que ha olvidado cuánto dura una blanca ahora mismo no tiene
dónde comprobarlo sin salir de la actividad.

### 4.5. Banco de acompañamientos para cantar encima

Ocho compases en bucle, en varias tonalidades, para que la clase cante encima. Es lo que un
maestro sin piano no tiene, y lo tenemos todo hecho: el editor por pistas ya los genera.

### 4.6. Modo dos columnas para pizarra digital

Ya existe `[data-pizarra]` en los tokens y el modo lienzo. Lo que falta es una vista pensada
para proyectar: lo interactivo grande a un lado y el guion del maestro al otro.

---

## 5. Lo que NO conviene hacer

Escrito aquí para no volver a discutirlo, igual que la lista del roadmap:

- **Un DAW.** Volumen, paneo, efectos y automatización. Es una pantalla llena de botones que
  no enseñan música, y el editor por pistas ya cubre lo que se puede enseñar de textura.
- **Reconocimiento de partitura por cámara.** Suena espectacular, funciona mal con luz de
  aula y no enseña nada que no enseñe escribirla.
- **Generación de melodías con IA.** El proyecto ya usa IA para escribir contenido, con
  revisión humana. Que la use **el niño** para componer le quita justamente lo que la
  actividad le da: decidir.
- **Cuentas, rachas, ligas y notificaciones.** Reglas 3 y 4.
- **Cualquier cosa que necesite red en el aula.** El escenario más probable del dosier es un
  colegio con wifi malo.

---

## Fuentes

- [Procomún, recursos de música (INTEF)](https://procomun.intef.es/search-odes?f%5B0%5D=knowledgearea_keyword:M%C3%BAsica)
- [Chrome Music Lab (Apache-2.0)](https://github.com/googlecreativelab/chrome-music-lab)
- [FluidR3_GM renderizado nota a nota (MIT)](https://github.com/gleitz/midi-js-soundfonts)
- [VCSL, muestras CC0](https://github.com/sgossner/VCSL)
- [Duolingo, modelo de repetición espaciada (paper propio)](https://research.duolingo.com/papers/settles.acl16.pdf)
- [Revisión sistemática sobre gamificación en Duolingo (2012-2020)](https://www.tandfonline.com/doi/full/10.1080/09588221.2021.1933540)
- [Análisis del módulo de música de Duolingo con criterios DUA](https://dergipark.org.tr/en/pub/sead/article/1525496)
- [Tema `music-education` en GitHub](https://github.com/topics/music-education)
