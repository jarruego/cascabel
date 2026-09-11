# Dosier: investigación y decisiones de producto

> **Este documento es el porqué, no el cómo.** Para trabajar en el código, la fuente
> operativa es [`CLAUDE.md`](../CLAUDE.md) y el resto de `docs/`; si algo de aquí
> contradice a `CLAUDE.md`, manda `CLAUDE.md`.
>
> Aquí está el material que no cabía en la documentación técnica: el análisis de la
> plataforma de referencia, qué copiar de cada competidor y por qué, el currículo LOMLOE
> completo, el catálogo razonado de las 54 actividades, el marco legal y las fuentes.
> Consúltalo cuando haya que decidir *qué* construir; para decidir *cómo*, usa los docs.
>
> Investigación de septiembre de 2026. Los textos normativos se contrastaron con
> reproducciones oficiales del currículo estatal; antes de citarlos formalmente conviene
> verificarlos contra el PDF del BOE. Análisis técnico y documental, no asesoramiento
> jurídico.

---

# Resumen: el veredicto

## Sí puedes hacerlo sin ser experto en música

Pero no solo. La pregunta correcta no es «¿sé bastante música?», sino «¿tengo separadas las dos competencias que este proyecto necesita?». La respuesta es sí, y es la ventaja concreta de tu situación.

Este producto tiene dos capas independientes. La **capa de motor** —renderizar una partitura, medir una palmada, programar audio sin *jitter*, guardar progreso, empaquetar una PWA— es desarrollo puro y es exactamente lo que ya haces. La **capa de contenido** —qué figura va antes que cuál, cuándo entra la flauta, si un niño de 4 años puede cantar un salto de sexta— es didáctica musical, y ahí tienes a una profesora de música en casa y un currículo público que fija el marco.

La trampa en la que caen los proyectos de este tipo es mezclar ambas capas: codificar cada actividad a mano. Entonces cada decisión pedagógica es también una decisión de código, necesitas saber de las dos cosas a la vez y el proyecto se para. **La arquitectura que este documento defiende separa las capas físicamente**: un motor que sabe ejecutar ocho o diez *tipos* de actividad, y un montón de ficheros JSON que describen actividades concretas. Tú construyes el motor. La IA redacta los JSON. Tu mujer los valida en veinte minutos por tanda. Ninguno de los tres necesita saber lo que sabe el otro.

> **Lo que sí tienes que aprender tú.** Un vocabulario mínimo, no una carrera: pulso ≠ ritmo ≠ acento; las cuatro cualidades del sonido; qué es una escala pentatónica y por qué en ella «no hay notas malas»; y la secuencia Kodály `sol-mi → sol-mi-la → pentatónica → diatónica`. Con eso entiendes el 90 % de las conversaciones. Son dos tardes.

## Las cuatro decisiones que quedaban abiertas, resueltas

Ninguna es irreversible en la fase 1.

**Plataforma — PWA web única, con Capacitor en reserva.** Una base de código para ordenador, tablet y móvil, instalable y con modo sin conexión. Coste cero, cero tiendas, actualizaciones instantáneas. Con una prueba de riesgo obligatoria: el micrófono en una PWA instalada en iPad tiene un historial de fallos en Safari. Si falla, y solo entonces, se empaqueta con Capacitor.

**Idiomas — castellano, con i18n desde la primera línea.** Todo texto e instrucción locutada sale de un fichero de idioma, nunca del código. Traducir después es una tanda de trabajo; refactorizar después son semanas. Las lenguas cooficiales son la palanca real de adopción en centros, pero se abren cuando el producto ya funcione.

**MVP — el motor primero, pero validado con una actividad completa.** Semana 1: una sola actividad de punta a punta, fea pero real, probada con niños. Semanas 2–4: convertirla en un tipo de actividad parametrizable por JSON. A partir de ahí, cada actividad nueva son horas, no días. Es la única vía que hace verosímil «poco tiempo gracias a la IA».

**Licencia — código en Apache-2.0, contenidos en CC BY-SA 4.0.** Apache maximiza que una administración educativa pueda integrarlo sin fricción jurídica; CC BY-SA es la licencia dominante en Procomún y CEDEC, así que encaja con el ecosistema de recursos educativos abiertos español. El nombre y el logo quedan expresamente fuera de ambas.

## El hueco de mercado, en una frase

Los juguetes musicales de navegador son maravillosos y no traen ninguna secuencia didáctica. Las plataformas escolares que sí la traen están cerradas, son de pago y van ligadas a un libro con ISBN. Y lo gratuito en español se financia sirviendo publicidad a menores. **Nadie ofrece juguetes buenos, cosidos al currículo LOMLOE, en español, gratis, sin registro y con licencia libre.** Ese es exactamente tu espacio, y no lo ocupa nadie porque no es un buen negocio — lo cual es precisamente por lo que puedes ocuparlo tú.

# Qué copiar del resto del campo

## Chrome Music Lab, y un atajo que casi nadie usa

Catorce experimentos, sin registro, sin cookies, Web Audio puro. **Ocho de ellos están publicados bajo Apache-2.0** en el repositorio de Google Creative Lab: Arpeggios, Chords, Harmonics, Melody Maker, Piano Roll, Sound Spinner, Sound Waves y Spectrogram. Puedes forkearlos legalmente, traducirlos y adaptarlos al currículo manteniendo el aviso de licencia y el NOTICE. *Song Maker y Shared Piano no están liberados.*

Los que más te sirven: **Kandinsky** (dibujas y suena — es literalmente el saber básico «grafías no convencionales» de Infantil, hecho producto), **Piano Roll** (el rollo de pianola es el puente perfecto entre grafía libre y pentagrama: la altura ya es arriba/abajo y la duración ya es largo/corto) y **Sound Spinner** (la actividad de micrófono más segura y divertida que existe: grabas, aceleras, inviertes, y todo pasa en el dispositivo).

Lo que **no** hay que copiar es lo que falta: no hay secuencia didáctica, no hay panel docente, no hay evidencia de aprendizaje y no hay persistencia. Ese vacío es tu producto.

## Tres patrones que valen más que todo lo demás

**El estado en la URL (de Song Maker).** La canción entera se codifica en la *query string*. Se comparte sin cuenta, sin base de datos y sin backend. Es la solución completa a «quiero que el niño enseñe su trabajo en casa» con coste cero.

**El código de verificación (de musictheory.net).** El profesor configura un ejercicio y obtiene una URL permanente. El alumno lo resuelve y recibe un código al terminar. El profesor lo valida con un comprobador. Evaluación con evidencia, sin cuentas de alumno y sin tratar un solo dato personal. Cópialo literalmente.

**Fallar es imposible (de Incredibox y aQWERTYon).** Todo está en el mismo tempo y la misma escala, así que cualquier combinación suena bien. Y la recompensa premia *explorar*, no acertar. Es el mejor modelo de motivación infantil del sector, y es lo contrario de Duolingo.

## De Duolingo: la mitad buena y la mitad tóxica

Su **arquitectura de sesión** es excelente y encaja con la realidad del aula de música (45–55 minutos semanales, de los cuales 10–15 de pantalla): micro-sesiones de 5 minutos con cierre completo, un ítem por pantalla, el mismo saber presentado en cinco formatos distintos, repetición espaciada de lo fallado y feedback inmediato. Todo eso, cópialo.

Su **capa de retención** es veneno en este contexto. Las *rachas* presuponen tablet y wifi en casa todos los días: es socialmente discriminatorio y, con una clase a la semana, estructuralmente imposible. Las *ligas y clasificaciones* exigen identidad persistente (problema de RGPD) y hunden justo a quien peor va (problema pedagógico). Las *vidas* hacen que el alumno que más falla sea el primero que se queda sin practicar; es monetización disfrazada de reto. Y las *notificaciones culpabilizadoras* son un patrón oscuro sobre menores.

## Los demás referentes, en una tabla

| Referente | La lección | El defecto que no debes heredar |
|---|---|---|
| **Aprendo Música** | Tu referente español directo: 50+ juegos desde 2005, nomenclatura latina (do-re-mi) y **digitaciones de flauta dulce** —el instrumento real de la Primaria española, que ninguna herramienta internacional cubre—, más musicogramas interactivos. | Publicidad de terceros en una web usada por menores, todos los derechos reservados, juegos sin progresión y accesibilidad inexistente. |
| **JClic y LIM** | La arquitectura correcta, demostrada durante veinte años: **un motor genérico más miles de actividades declarativas en ficheros de datos**. Y un inventario probado de tipologías: asociación, puzle, identificación, exploración, respuesta escrita. | Estética de 2004, instalador de escritorio, dependencia de Java. |
| **Groove Pizza** (NYU MusEDLab) | El compás dibujado **en círculo**, no en línea: es superior para entender que el compás es cíclico, y la geometría del patrón conecta con Matemáticas. Publican una versión accesible declarada, con control por teclado. | La estética «pizza» genera rechazo a partir de 5.º; no hay progresión ni retos integrados. |
| **Rhythm Cat** | **Aislar el ritmo de la altura** es la mejor decisión pedagógica posible para 1.º–3.º. Y el niño toca *sobre música real*, no contra un metrónomo seco. Una figura nueva por nivel. | Vidas, reintentos y niveles de pago. |
| **Loopimal / Toca Band** | Diseño para no lectores llevado al extremo: **cero palabras**. La animación *es* la notación. Sin puntuación, sin tiempo, sin final. El modelo exacto para Infantil. | Sin contenido curricular, sin progresión, no evaluable, y de pago. |
| **Piano Maestro** (JoyTunes) | Gratis para profesores como estrategia de distribución: **el profesor es el canal, no el cliente**. | La empresa abandonó la línea educativa en cuanto el producto de consumo dio más dinero, y los centros se quedaron sin herramienta. Tu licencia libre es la respuesta a eso, y es tu mejor argumento ante un claustro. |
| **teoria.com** | Cuerpo teórico serio en español con vocabulario correcto, y dictado melódico con reproducción parcial. | Su licencia es **CC BY-NC-ND**: no puedes traducirlo, adaptarlo ni incorporarlo a nada. Es el ejemplo perfecto de por qué el «-ND» mata un recurso educativo. |

# El currículo LOMLOE como esqueleto

## Tres correcciones que cambian el diseño

**1.** En Primaria *no existe* un área de Música. El RD 157/2022 crea *Educación Artística*, que «se podrá desdoblar en Educación Plástica y Visual, por una parte, y Música y Danza, por otra» (art. 8.1), y decide cada comunidad. Los criterios de evaluación son **compartidos con plástica**; no hay criterios exclusivamente musicales en el texto estatal.

**2.** Son **cuatro** competencias específicas, no seis; las seis son de desdobles autonómicos como *Música i Dansa* valenciano. Y cuatro bloques de saberes: A, B, C y D. **El musical es el D.**

**3.** El currículo estatal **jamás nombra una figura, una nota ni un compás**. Dice «compás», «estructuras rítmico-melódicas», «lenguajes musicales», nunca «negra», «2/4» ni «clave de sol». Toda concreción de ese tipo la fija el centro o la editorial.

La consecuencia de diseño es directa y no la aplica casi nadie: **tu taxonomía necesita dos capas separadas.** Una capa normativa, que solo admite las etiquetas literales del real decreto (competencia específica, criterio, saber básico), y una capa de práctica, con «negra», «compás de 4/4» o «flauta», que es convención pedagógica, no ley. Si las mezclas, cualquier revisión pedagógica seria te lo señalará. Si las separas, puedes decir a un maestro exactamente qué criterio cubre cada actividad *y* hablarle en el idioma con el que programa.

## Infantil (RD 95/2022): la música vive en el Área III

Área *Comunicación y Representación de la Realidad*. El bloque de saberes estatal es deliberadamente escueto —cinco viñetas—, así que para tener una taxonomía usable hay que ir a una concreción autonómica. La de Castilla y León desarrolla el bloque curso a curso y contiene el dato más accionable de toda la etapa:

| Eje | 3 años | 4 años | 5 años |
|---|---|---|---|
| Código musical | Representación simbólica de las cualidades del sonido | Grafías **no convencionales** | Grafías convencionales **y** no convencionales |
| Danza | Bailes tradicionales individuales *imitando al adulto* | Individuales o en grupo *con ayuda del adulto* | Tradicionales **y de creación propia**, individuales o en grupo |
| Expresión corporal | Actividades individuales | Individuales y grupales | Individuales y grupales, **creativas** |

Los criterios que amarran una actividad musical de Infantil son pocos y conviene memorizarlos:

- **3.5** — «Interpretar propuestas dramáticas y musicales utilizando y explorando diferentes instrumentos, recursos o técnicas.»
- **3.6** — «Ajustar armónicamente su movimiento al de los demás y al espacio como forma de expresión corporal libre.»
- **2.1 / 2.2** — interpretar manifestaciones artísticas y expresar lo que producen.
- **4.1** — interés por los códigos escritos «convencionales *o no*». Esa coma es la que da cobertura curricular a toda la grafía libre.
- **5.4 / 5.5** — expresar emociones e ideas a través de manifestaciones artísticas y opinar sobre ellas.

## Primaria (RD 157/2022): las cuatro competencias específicas

1. **CE1.** Descubrir propuestas artísticas de diferentes géneros, estilos, épocas y culturas, a través de la recepción activa.
2. **CE2.** Investigar sobre manifestaciones culturales y artísticas y sus contextos.
3. **CE3.** Expresar y comunicar de manera creativa ideas, sentimientos y emociones, experimentando con las posibilidades del sonido, la imagen, el cuerpo y los medios digitales.
4. **CE4.** Participar del diseño, la elaboración y la difusión de producciones culturales y artísticas individuales o colectivas.

CE1 y CE2 son **recepción** (escuchar, analizar); CE3 y CE4 son **producción** (crear, interpretar, difundir). Esa división basta para clasificar cualquier actividad.

### Progresión del bloque D por ciclo: tu escalera de dificultad

| Eje | 1.º–2.º | 3.º–4.º | 5.º–6.º |
|---|---|---|---|
| Parámetros musicales | carácter, tempo | + **compás** | + géneros, textura, armonía, forma |
| Práctica | experimentación, exploración, **interpretación** | + **improvisación** | + **composición** |
| Sonido | cualidades básicas; sonidos y **líneas melódicas** | **estructuras rítmico-melódicas** | + clasificación sistemática |
| Lenguaje musical | conceptos elementales | conceptos básicos; **el silencio** | conceptos fundamentales |
| Tecnología | — | grabación y edición de audio | + **edición de partituras** |
| Instrumentos | construcción **asistida** | construcción **guiada** | construcción autónoma; instrumentos digitales |
| Cuerpo y danza | técnicas elementales | + improvisación guiada, actos performativos | + **nociones de biomecánica**, improvisación creativa |
| Ética (bloque B) | — | — | **licencias, plagio y derechos de autor** |

El vector transversal de todos los criterios, que es la regla de oro para escalar cualquier actividad: **guiado → semi-autónomo → autónomo/planificador**, y **entorno próximo → nacional → internacional**.

> **Regalo curricular.** El bloque B del tercer ciclo incluye literalmente: «Uso responsable de bancos de imágenes y sonidos: respeto a las licencias de uso y distribución de contenidos generados por otros. Plagio y derechos de autor.» Es decir: una app construida enteramente con material CC0 y licencia libre, que enseña sus propios créditos, es en sí misma un recurso curricular de 5.º–6.º. Haz de la página de créditos una actividad.

## Progresión de lenguaje musical por curso

**Aviso: esto no es normativo.** El real decreto secuencia por ciclo y sin nombrar figuras. Lo que sigue es la práctica habitual reconstruida de programaciones didácticas reales de centros españoles; hay variación de hasta un curso entre centros.

| Curso | Figuras | Notas | Compás y conceptos |
|---|---|---|---|
| **Infantil** | Pulso corporal; imitación por eco; ostinatos simples a los 5 años | sol-mi → sol-mi-la (ámbito de 2–3 notas) | Sonido/silencio, largo-corto, fuerte-suave, agudo-grave, timbre. Grafía no convencional |
| **1.º** | Negra, dos corcheas, silencio de negra. Sílabas «ta / ti-ti» | sol-mi, a veces la | Pulso y acento; binario intuitivo. Estrofa, estribillo. Percusión corporal a 4 planos |
| **2.º** | + blanca y su silencio; cuatro semicorcheas | sol-la-si-do' | Binario y cuaternario. Tempo (adagio, andante, allegro). Formas AA, AB |
| **3.º** (curso bisagra) | Redonda, blanca, negra, corcheas, semicorcheas, corchea + 2 semicorcheas | do-re-mi-fa-sol-la-si-do'. **Se inicia la flauta dulce** (si-la-sol) | 2/4 y 3/4 con cifra. Notación convencional consolidada. Matices p/f. Forma ABA |
| **4.º** | Puntillo, ligadura, síncopa | Escala pentatónica; ampliación del registro de flauta | 2/4, 3/4, 4/4. Textura. Tema con variaciones, rondó |
| **5.º** | Tresillo, contratiempo, anacrusa | Escalas diatónicas; tono y semitono; alteraciones | Introducción al 6/8. Nociones de armonía. Suite, sonata |
| **6.º** | Consolidación | Escala diatónica completa con alteraciones | Todos los compases. Edición digital de partituras. Derechos de autor |

> **Detalle que ahorra un rediseño.** La secuencia vocal (sol-mi → sol-mi-la → pentatónica → diatónica, de origen Kodály) y la secuencia de flauta (si-la-sol → do'-re' → fa♯-mi-re-do, de origen instrumental) **no coinciden**. Son dos progresiones paralelas. Modélalas por separado en el JSON desde el principio, o acabarás con actividades imposibles de ordenar.

## Los métodos que un maestro español espera reconocer

**Orff** es el estándar del aula española —el instrumentario Orff es el equipamiento base—: percusión corporal a cuatro planos, ritmo del lenguaje («cho-co-la-te» = cuatro semicorcheas), ostinatos, pentatónica donde nada suena mal, y formas eco, pregunta-respuesta y rondó. **Kodály** aporta el sistema de alfabetización: sílabas rítmicas, fononimia (signos manuales Curwen) y do móvil. Ambos son extraordinariamente digitalizables y forman la columna vertebral.

**Dalcroze** es lo más adecuado para Infantil: andar el pulso, correr las corcheas, reacción rápida al cambio de tempo. Digitalízalo como instrucción de movimiento, no como interacción de pantalla. **BAPNE** (Universidad de Alicante) usa percusión corporal para función ejecutiva y lateralidad, y el currículo de 5.º–6.º menciona literalmente «nociones elementales de biomecánica», que es prácticamente una referencia directa.

**Willems** (educación del oído fino, discriminación de alturas muy próximas) y **Montessori** (emparejamiento auditivo autocorrectivo con campanas) tienen menos peso en la escuela pública pero son los que mejor se traducen a software: emparejar dos sonidos idénticos y ordenar de grave a agudo son interacciones digitales nativas y perfectamente autoevaluables.

# Catálogo de 54 actividades

Cada actividad lleva su etapa, su eje, dónde ocurre, el tipo de motor que la ejecuta, si usa micrófono, el esfuerzo aproximado de construcción (S: uno o dos días; M: una mecánica propia; L: micrófono o evaluación temporal fina) y el anclaje curricular.

Reparto por esfuerzo: **20 actividades S, 30 M y 4 L**. Reparto por lugar: 41 en pantalla, 8 híbridas y 5 fuera de pantalla. Siete de las 54 usan micrófono, y todas ellas tienen alternativa sin él.

## Infantil (3–6 años)

**INF-01 · El semáforo del sonido** — timbre · pantalla · elección · S
Suena o no suena. El niño toca el círculo verde mientras hay sonido y lo suelta en el silencio. Con voz, instrumento y sonidos del entorno. *CE3 · crit. 3.5 · saber F.*

**INF-02 · ¿Largo o corto?** — timbre · pantalla · elección · S
Dos dibujos: una serpiente y una hormiga. Suena un sonido y el niño elige. La duración se ve, se oye y se dibuja. *CE2 · crit. 2.1 · saber F.*

**INF-03 · El ratón y el elefante** — timbre · pantalla · elección · S
Intensidad: fuerte o suave. Mismo sonido a dos volúmenes; el niño señala qué animal lo ha hecho. *CE2 · crit. 2.1 · saber F.*

**INF-04 · El pájaro y el oso** — altura · pantalla · elección · S
Agudo o grave, con el mismo instrumento en dos registros. El error más común es cambiar de timbre a la vez; aquí no se cambia. *CE2 · crit. 2.1 · saber F.*

**INF-05 · Paisaje sonoro: ¿qué suena?** — timbre · pantalla · elección · M
Sonidos reales del entorno y de la naturaleza sobre una ilustración. Tocas donde crees que está el sonido que oyes. *CE2 · crit. 2.1 · saber F.*

**INF-06 · Dibuja el sonido** — creación · pantalla · lienzo · M
Lienzo libre donde cada trazo suena: la altura es arriba/abajo y la duración es la longitud. Grafía no convencional, sin evaluación, sin error posible. *CE3 · crit. 4.1 · saber F (código musical).*

**INF-07 · El caracol: sube y baja** — altura · pantalla · lienzo · S
Un glissando continuo controlado con el dedo, como la flauta de émbolo de Willems. Con opción de imitarlo con la voz. *CE3 · crit. 3.5 · saber F.*

**INF-08 · Camina, corre, para** — cuerpo · híbrida · guía de aula · S
Dalcroze puro: la música cambia de tempo y el grupo responde con el cuerpo. La pantalla es del maestro y marca el cambio; los niños se mueven. *CE3 · crit. 3.6 · saber H.*

**INF-09 · Eco de palmas** — pulso · híbrida · tocar a tiempo · M · **micrófono**
El personaje hace un patrón de dos o tres palmadas y el niño lo repite. Con micrófono si se puede; si no, tocando la pantalla. *CE3 · crit. 3.5 · saber F.*

**INF-10 · Las cajas de los sonidos** — timbre · pantalla · emparejar · M
Emparejamiento auditivo autocorrectivo al modo Montessori: seis cajas, tres parejas de sonido idéntico. Se tocan de dos en dos, nunca se arrastra. *CE2 · crit. 2.1 · saber F.*

**INF-11 · Canción con pictogramas** — altura · híbrida · seguir · M
Una canción tradicional de ámbito sol-mi con la letra en pictogramas que se resaltan al cantar. La forma más antigua y eficaz de que canten juntos. *CE3 · crit. 3.5 · saber F.*

**INF-12 · Danza de corro** — cuerpo · fuera de pantalla · guía de aula · S
Coreografía muy simple proyectada paso a paso, con la música y un contador visual. Progresión: imitar al adulto → en grupo → creación propia. *CE3 · crit. 3.6 · saber H.*

**INF-13 · ¿Quién ha sonado?** — timbre · pantalla · elección · S
Tres instrumentos de pequeña percusión en pantalla; suena uno y hay que señalarlo. Empieza con timbres muy contrastados. *CE1 · crit. 1.1 · saber F.*

**INF-14 · El cuento sonoro** — creación · híbrida · lienzo · M
Un cuento breve locutado con huecos: en cada hueco el grupo elige y ejecuta un sonido. Sonorización colectiva, sin respuesta correcta. *CE3 · crit. 3.5 · saber F.*

**INF-15 · De grave a agudo** — altura · pantalla · ordenar · M
Cinco campanas desordenadas que hay que colocar de más grave a más aguda tocándolas en orden. Autocorrectivo por el oído. *CE2 · crit. 2.1 · saber F.*

## Primer ciclo (1.º–2.º)

**C1-01 · Ta y ti-ti** — notación · pantalla · seguir · S
Lectura rítmica con sílabas Kodály: la figura se ilumina mientras se dice. Negra y dos corcheas, luego silencio de negra. *CE3 · crit. 3.1 · saber D.*

**C1-02 · Palmea el ritmo** — pulso · pantalla · tocar a tiempo · L · **micrófono**
Cuatro compases sobre una base musical real. Mide desvío medio con signo y desviación típica, no solo aciertos: un niño desfasado pero regular tiene buen pulso. *CE3 · crit. 3.1 · saber D.*

**C1-03 · El pulso escondido** — pulso · pantalla · tocar a tiempo · M
Suena una canción y hay que marcar el pulso tocando la pantalla. Distingue pulso de ritmo, que es la confusión número uno de la etapa. *CE3 · crit. 3.1 · saber D.*

**C1-04 · Constructor de melodías** — creación · pantalla · rejilla · M
Cuatro casillas donde colocar negra, dos corcheas o silencio. Suena en bucle sobre una base. No hay respuesta incorrecta: solo composiciones distintas. *CE3 · crit. 3.2 · saber D.*

**C1-05 · Musicograma A-B** — cultura · pantalla · seguir · M
Audición activa con la partitura gráfica avanzando. Metodología Wuytack, la que se enseña en Magisterio en España. Con obra de dominio público. *CE1 · crit. 1.1 · saber A.*

**C1-06 · La escalera de notas** — altura · pantalla · ordenar · M
Sol, mi y la como escalones de distinta altura. Se tocan para construir la melodía que se acaba de oír. Secuencia Kodály. *CE3 · crit. 3.1 · saber D.*

**C1-07 · Canta la nota** — altura · pantalla · cantar · L · **micrófono**
Nota de referencia, y el niño canta. Una barra muestra en tiempo real si está por encima o por debajo. Tolerancia amplia y cero castigo. *CE3 · crit. 3.1 · saber D.*

**C1-08 · Memory de instrumentos** — timbre · pantalla · emparejar · S
Emparejar la imagen del instrumento con su sonido. Por familias, con vídeo real de alguien tocándolo. *CE1 · crit. 1.1 · saber D.*

**C1-09 · Percusión corporal a cuatro planos** — cuerpo · híbrida · guía de aula · M
Pies, rodillas, palmas y chasquidos notados como un trigrama de colores que avanza. Base Orff, con secuencias de dificultad creciente al modo BAPNE. *CE3 · crit. 3.1 · saber D.*
> **Corregido el 2026-09-07.** Se comprobó que BAPNE® es marca registrada con titularidad expresa sobre su notación, su terminología y sus secuencias, así que nada de eso se copia ni se sugiere relación con el método: los cuatro sonidos son de Orff y la notación es propia. Ver `08-LEGAL.md`. Y la actividad quedó como guía de aula; el patrón dibujado en pantalla es el tipo `cuerpo`.

**C1-10 · Construye un cotidiáfono** — timbre · fuera de pantalla · guía de aula · S
Ficha imprimible y vídeo: construir un instrumento con materiales del entorno y clasificarlo por cómo suena. Saber básico literal del primer ciclo. *CE4 · crit. 4.2 · saber D (construcción asistida).*

**C1-11 · El mando del director** — cultura · pantalla · lienzo · S
Dos deslizadores, tempo y dinámica, sobre una pieza real. El niño dirige y oye el efecto. Introduce carácter y tempo, los parámetros del primer ciclo. *CE3 · crit. 3.2 · saber D.*

**C1-12 · La rueda del compás** — pulso · pantalla · rejilla · M
El compás dibujado en círculo, no en línea: se ve que es cíclico y el patrón forma una figura geométrica. Versión simplificada para dos y cuatro pulsos. *CE3 · crit. 3.1 · saber D.*

**C1-13 · Pregunta y respuesta** — creación · híbrida · lienzo · M
La app hace una frase rítmica de dos compases y el niño inventa la respuesta con percusión corporal o pequeña percusión. Forma básica del Orff-Schulwerk. *CE3 · crit. 3.2 · saber D.*

## Segundo ciclo (3.º–4.º)

**C2-01 · Coloca la nota** — notación · pantalla · pentagrama · S
Pentagrama real, clave de sol, y una nota que hay que situar en su línea o espacio. Nota dibujada pequeña, hitbox de 60 px. *CE3 · crit. 3.1 · saber D.*

**C2-02 · Dictado rítmico** — notación · pantalla · rejilla · M
Dos a cuatro compases: se escucha y se completa colocando figuras. Reproducción total y fraccionada, comprobación por compás. *CE3 · crit. 3.1 · saber D.*

**C2-03 · Dictado melódico en rejilla** — altura · pantalla · rejilla · M
Cuadrícula de altura por tiempo, sin necesidad de saber notación. Es la mejor interfaz que existe para escribir lo que se oye a esta edad. *CE3 · crit. 3.1 · saber D.*

**C2-04 · Flauta dulce: digitaciones** — notación · pantalla · emparejar · M
Diagrama de la flauta soprano y la nota en el pentagrama. Secuencia si-la-sol, después do'-re', fa♯-mi-re-do. El instrumento real del aula española. *CE3 · crit. 3.1 · saber D.*

**C2-05 · Toca con la flauta** — altura · pantalla · cantar · L · **micrófono**
La partitura avanza y el micrófono comprueba la nota tocada. El rango de flauta soprano es mucho más limpio de detectar que la voz. Siempre con alternativa sin micrófono. *CE3 · crit. 3.1 · saber D.*

**C2-06 · Pon las barras de compás** — notación · pantalla · pentagrama · M
Una línea de figuras sin dividir y una cifra de compás. Hay que colocar las divisorias. Aparece el compás, saber básico nuevo del segundo ciclo. *CE3 · crit. 3.1 · saber D.*

**C2-07 · Improvisa en pentatónica** — creación · pantalla · lienzo · M
Cinco láminas —do, re, mi, sol, la— sobre una base con bordón. Al no haber semitonos, todo suena bien: la improvisación es segura desde el primer intento. *CE3 · crit. 3.2 · saber D (improvisación).*

**C2-08 · Ordena el rondó** — cultura · pantalla · ordenar · M
Se escucha una pieza troceada en secciones y hay que reconstruir el orden ABACA. Forma musical mediante escucha, no mediante definición. *CE1 · crit. 1.2 · saber A.*

**C2-09 · Adagio, andante, allegro** — cultura · pantalla · elección · S
Un fragmento y tres tarjetas de tempo. Con la misma melodía a tres velocidades, para que la variable sea solo el tempo. *CE1 · crit. 1.1 · saber A.*

**C2-10 · Ostinato a dos planos** — creación · híbrida · guía de aula · M
Dos patrones simultáneos —uno de percusión corporal, otro de láminas— proyectados como partitura de colores. Instrumentación Orff para el grupo. *CE4 · crit. 4.2 · saber D.*

**C2-11 · Instrumentos del mundo** — cultura · pantalla · elección · M
Escucha un instrumento y sitúalo en el mapa. Interculturalidad con material CC0 de la VCSL y vídeos de intérpretes reales. *CE1 · crit. 1.2 · saber A.*

**C2-12 · Canon a dos voces** — cultura · fuera de pantalla · guía de aula · S
Pantalla del maestro con la letra, la entrada de cada voz señalada y el pulso visible. Textura polifónica cantando, sin necesidad de pantalla por niño. *CE4 · crit. 4.2 · saber D.*

**C2-13 · Graba tu paisaje sonoro** — creación · fuera de pantalla · guía de aula · M
Guion guiado para grabar y montar sonidos del entorno. Cubre el saber básico nuevo de aplicaciones de grabación y edición de audio. *CE3 · crit. 3.2 · saber D (grabación).*

## Tercer ciclo (5.º–6.º)

**C3-01 · Tonos y semitonos** — notación · pantalla · pentagrama · M
Teclado y pentagrama enlazados: se ve dónde están los semitonos naturales y qué hacen las alteraciones. Construcción de la escala diatónica. *CE3 · crit. 3.1 · saber D.*

**C3-02 · Síncopa y contratiempo** — pulso · pantalla · tocar a tiempo · M · **micrófono**
Palmear fuera del pulso, que es exactamente lo difícil. El pulso suena siempre de fondo para que se oiga la tensión. Tolerancia de 9–12 años. *CE3 · crit. 3.1 · saber D.*

**C3-03 · Editor de melodías** — creación · pantalla · rejilla · L
Componer sobre pentagrama con escala restringida y escuchar el resultado. Exporta MusicXML, MIDI y PDF. Cubre el saber de edición de partituras del tercer ciclo. *CE3 · crit. 3.2 · saber D (composición).*

**C3-04 · Mapa de una obra** — cultura · pantalla · seguir · M
Una obra real de dominio público con su estructura formal marcada mientras suena. Después, la misma obra sin marcas para identificarla. *CE1 · crit. 1.2 y 2.3 · saber A.*

**C3-05 · ¿Mayor o menor?** — altura · pantalla · elección · S
La misma melodía en los dos modos. El contraste emocional es inmediatamente audible y no necesita teoría previa. *CE1 · crit. 1.1 · saber D (armonía).*

**C3-06 · El 6/8 con el cuerpo** — pulso · híbrida · guía de aula · M
Subdivisión ternaria vivida antes que leída: dos grupos, uno marca el pulso y otro la subdivisión. Dalcroze aplicado al contenido más difícil de la etapa. *CE3 · crit. 3.1 · saber D.*

**C3-07 · Componed un rondó** — creación · fuera de pantalla · guía de aula · M
Proyecto por grupos: un estribillo común y una copla por equipo, con roles repartidos y presentación final. Cubre la CE4 entera, que es la más difícil de evidenciar. *CE4 · crit. 4.1, 4.2 y 4.3 · saber B.*

**C3-08 · ¿De quién es esta música?** — cultura · pantalla · elección · S
Casos reales de licencias: qué puedes usar en un vídeo, qué no y por qué. Saber básico literal del bloque B: plagio y derechos de autor. *CE2 · crit. 2.2 · saber B.*

**C3-09 · La serie armónica** — timbre · pantalla · lienzo · M
Cuerdas de distinta longitud y las proporciones 1:2, 2:3, 3:4 hechas visibles y audibles. Conexión explícita con fracciones en Matemáticas. *CE2 · crit. 2.2 · saber A.*

## Transversales

**TR-01 · Afinador visual** — altura · pantalla · cantar · M · **micrófono**
Herramienta libre, sin ejercicio: canta o toca y ve la nota. El primer contacto con el micrófono, sin nada que ganar ni perder.

**TR-02 · Metrónomo y calibrador** — pulso · pantalla · guía de aula · S · **micrófono**
Metrónomo de aula con acento visual, más la calibración de latencia de 20 segundos. Poco glamuroso y absolutamente necesario para que todo lo demás funcione.

**TR-03 · Caja de sonidos del aula** — timbre · pantalla · lienzo · S
Rejilla de instrumentos grandes que suenan al tocarlos, para acompañar cualquier canción. La herramienta más usada y la más fácil de construir.

**TR-04 · Créditos: de dónde sale esto** — cultura · pantalla · seguir · S
La propia página de créditos convertida en actividad: cada sonido, imagen y partitura con su autor y su licencia, y por qué se puede usar. *CE2 · crit. 2.2 · saber B.*

# Arquitectura: un motor, y el contenido como datos

No construyas 54 actividades. Construye **diez tipos de actividad** y describe las 54 en ficheros JSON. Es exactamente el modelo de JClic y de LIM, que sobrevivieron dos décadas por esa razón. Las consecuencias son grandes: añadir una actividad deja de ser programar; la IA puede generar contenido válido porque el formato está acotado y es validable; tu mujer puede revisar un fichero legible sin tocar código; y el día que quieras el configurador de actividades, **ya lo tienes casi hecho**, porque es un formulario que escribe ese mismo JSON.

| Tipo | Mecánica | Actividades |
|---|---|---|
| `eleccion` | Suena o se muestra algo; el niño elige entre 2–4 opciones grandes | 10 |
| `guia-aula` | Pantalla del maestro: consigna, pulso, coreografía, ficha imprimible | 10 |
| `lienzo` | Creación libre sin evaluación: dibujar sonido, improvisar, capas | 8 |
| `rejilla` | Cuadrícula altura × tiempo: dictado, composición, secuenciador | 5 |
| `seguir` | Reproducción sincronizada con cursor: musicograma, lección, karaoke | 5 |
| `tocar-a-tiempo` | Golpear en el momento correcto (dedo o palmada por micrófono) | 4 |
| `emparejar` | Dos conjuntos, se tocan de dos en dos (nunca arrastrar en Infantil) | 3 |
| `ordenar` | Secuencia por altura, duración o forma; toque sucesivo | 3 |
| `pentagrama` | Colocar, leer o completar sobre pauta real, con hitbox ampliado | 3 |
| `cantar` | Detección de altura en tiempo real con retorno visual | 3 |

## El formato fuente no debe ser MusicXML

Es la conclusión contraintuitiva de la investigación técnica. **Una actividad educativa no es una partitura.** Una partitura no puede expresar el tipo de ejercicio, la locución del enunciado, la tolerancia de evaluación, los prerrequisitos, las pistas ni el rango vocal objetivo por edad. Si metes todo eso en MusicXML acabas con campos personalizados y pierdes la ventaja de usar un estándar.

Usa **JSON propio con JSON Schema**, con la música embebida en notación **ABC**: un fragmento de cuatro compases son unos 200 bytes de texto que un modelo de lenguaje escribe casi sin equivocarse, frente a 8–30 KB de XML verboso donde se equivoca con `<divisions>` y `<backup>`. Ventajas medibles: puedes validar automáticamente lo generado, el diff en git es legible, y 500 actividades ocupan unos 500 KB en vez de unos 8 MB — lo que significa que la biblioteca entera cabe en la caché del *service worker* y funciona sin conexión. MusicXML lo generas solo cuando haga falta, con `music21`, y lo importas solo para traer repertorio de terceros.

```json
{
  "id": "c1-ritmo-eco-04",
  "tipo": "tocar-a-tiempo",
  "titulo": "Eco de palmas: negra y dos corcheas",
  "etapa": "primaria-c1",
  "eje": "pulso",
  "curriculo": {
    "area": "Educación Artística",
    "competencia": "CE3",
    "criterio": "3.1",
    "saber": "D. Práctica instrumental, vocal y corporal"
  },
  "practica": { "figuras": ["negra","corchea"], "compas": "2/4", "tempo": 72 },
  "musica": { "abc": "X:1\nM:2/4\nL:1/4\nK:C\nz2 | c c | c/c/ c | z2 |" },
  "entrada": { "modo": "microfono-palmada", "alternativa": "toque" },
  "evaluacion": {
    "tolerancia_ms": { "perfecto": 100, "bien": 180, "casi": 300 },
    "reporta": ["desvio_medio_con_signo", "desviacion_tipica"]
  },
  "locucion": "es/c1-ritmo-eco-04.opus",
  "pistas": ["Escucha primero. Ahora tú.", "Marca el pulso con el pie."]
}
```

> **El detalle que separa una buena app educativa de una mala.** Fíjate en `reporta`. Un niño que da *todas* las palmadas 120 ms tarde pero con una desviación de 20 ms tiene un pulso **excelente**, solo desfasado. Un porcentaje de acierto le dice que ha fallado; el desvío medio con signo le dice la verdad. Mide siempre las dos cosas y premia la regularidad.

## Tolerancias y objetivos táctiles por edad

Un adulto entrenado acierta a ±30 ms. No apliques eso a un niño de cinco años. Y resta siempre la latencia de salida del dispositivo antes de comparar.

| Edad | Perfecto | Bien | Casi | Objetivo táctil mínimo | Objetos en pantalla |
|---|---|---|---|---|---|
| 3–5 años | ±150 ms | ±250 ms | ±400 ms | 75 × 75 px | 2–4 |
| 6–8 años | ±100 ms | ±180 ms | ±300 ms | 60 × 60 px | 4–6 |
| 9–12 años | ±70 ms | ±130 ms | ±220 ms | 48 × 48 px | 6–9 |

El mínimo de WCAG 2.2 AA es 24 × 24 px: para niños es un suelo, no un objetivo. Truco necesario en las actividades de pentagrama: dibuja la nota pequeña, tipográficamente correcta, y pon encima un hitbox transparente de 60 px. VexFlow te da control total para hacerlo.

## Diez reglas de interfaz para no lectores

1. **Nada esencial solo en texto.** Toda instrucción existe en audio, y con voz humana grabada, no sintetizada: la síntesis suena antinatural a los pequeños y les cuesta procesarla.
2. **Botón de repetir siempre visible**, grande y en el mismo sitio. Un niño quiere oír las cosas cinco veces.
3. **Iconos concretos.** Un dibujo de un tambor mejor que un icono de corchea, y este mejor que la palabra «ritmo».
4. **El color codifica, nunca informa solo.** Siempre color más forma más sonido; alrededor del 8 % de los niños tienen daltonismo.
5. **Feedback multimodal en menos de 100 ms.**
6. **Sin cronómetros por defecto.** Un niño de 4 años tarda 8 segundos en decidir dónde tocar.
7. **El error nunca castiga.** Ni vidas, ni sonido desagradable, ni rojo. «Escucha otra vez: la primera nota es más grave.»
8. **Una sola navegación.** Un botón «atrás», siempre igual, siempre en el mismo sitio.
9. **Solo *tap* por debajo de 6 años.** Nada de arrastrar, doble toque ni pulsación larga como única vía; WCAG 2.5.7 lo exige de todos modos.
10. **Tipografía grande**: 20–24 px en Infantil. *Andika* (SIL, OFL) está diseñada para lectores nóveles; *Lexend* y *Atkinson Hyperlegible* son las otras candidatas, todas libres.

# Stack técnico

Todo comprobado contra npm y PyPI en septiembre de 2026, con tamaños medidos. Criterio: todo MIT, BSD o Apache; nada pesado en el camino crítico; ningún tercero en tiempo de ejecución.

| Capa | Elección | Peso | Por qué |
|---|---|---|---|
| App | **React 19 + Vite + vite-plugin-pwa** | — | El motivo real es que vas a apoyarte en IA: los modelos tienen muchísimo más React que Svelte 5 en sus datos. Menos fricción, menos alucinación. Descarta Next y Astro: no hay SEO ni datos de servidor que ganar. |
| Partitura | **abcjs 6.7** (MIT) + **VexFlow 5** (MIT) | 144 KB gz / 89 KB gz | abcjs trae render, síntesis, cursor y clic en un solo paquete, y es lo más fácil de generar con un modelo. VexFlow cuando necesites controlar cada hitbox. |
| Partitura importada | **Verovio 6.3** con `import()` dinámico | 2,3 MB gz | Solo si importas MusicXML/MEI de terceros. Es LGPL: cárgalo como fichero aparte, sin meterlo en el bundle, y nunca en el arranque. |
| Audio | **Tone.js** (MIT) + sampler propio en Opus | 77 KB gz + ~70 KB/instrumento | `Tone.Transport` ya resuelve bien el *lookahead scheduling* del metrónomo. |
| Escucha (voz) | **pitchy 4.1** (MIT) en AudioWorklet | 5 KB gz | Método McLeod. Entre 1 y 4 % de CPU en una tablet media. |
| Escucha (palmadas) | **Detector propio**, ~100 líneas | — | No hay librería JS de onsets en vivo mantenida y con licencia usable. Y detectar una palmada es fácil: filtro paso-alto a 2 kHz, energía, umbral adaptativo y periodo refractario de 100 ms. |
| Contenido | **JSON + JSON Schema**, ABC embebido | ~1 KB/actividad | Conversión offline con `music21` 10.5 (BSD). |
| Despliegue | **Cloudflare Pages** | 0 € | Ancho de banda ilimitado en el plan gratuito, que es lo que importa cuando sirves audio. Fase 2: Workers y D1, unos 5 $/mes. |

> **Tres trampas verificadas.** *Vercel Hobby prohíbe expresamente el uso comercial*, y «comercial» no es un término que quieras discutir: usa Cloudflare. *ml5.js ya no hace detección de tono*: se eliminó en la reescritura 1.x, así que todos los tutoriales de ml5 con CREPE están muertos. *OSMD arrastra VexFlow 1.2.93*, una versión de 2017, y su reproductor de audio no es gratuito: descártalo salvo que ya tengas un corpus MusicXML grande.

## La receta de los 300 KB de audio

El consejo que circula por internet —cargar los soundfonts de MIDI.js— es la peor opción en 2026: son ficheros JS con MP3 en base64, un 33 % más pesados, con las 88 notas de cada instrumento. Haz esto en su lugar:

1. **Elige timbres perdonables.** Marimba, xilófono, glockenspiel, celesta, campanas: ataque percusivo, decaimiento natural y, lo importante, toleran muy bien el *pitch-shifting*. Un piano estirado tres semitonos suena mal; una marimba, no. Y además son los timbres del aula Orff.
2. **Multi-muestrea a una muestra por octava.** De C3 a C6, cinco o siete muestras cubren todo el rango infantil útil. El resto se interpola con `playbackRate = 2 ** (semitonos/12)`.
3. **Codifica en Opus** a 48 kbps mono. Una muestra de 1,5 s ocupa unos 10 KB. Siete muestras son unos 70 KB por instrumento. Soporte universal desde Safari 15.
4. **Envolvente ADSR con un GainNode** y recorta el decaimiento a 1–2 s. Con eso tienes un sampler decente en unas 60 líneas.

Resultado: cuatro instrumentos en menos de 300 KB, frente a los 4–8 MB de un soundfont General MIDI. Todo cabe en el *service worker*. Si quieres atajar, `smplr` (MIT, 35 KB) trae marimbas y percusión listas, pero copia sus muestras a tu propio dominio.

## Latencia y modo sin conexión

La latencia de salida va de 20–40 ms en iPad a 100–200 ms en Android de gama baja. Crea el `AudioContext` con `latencyHint:'interactive'`, lee `outputLatency` y compénsala, y ofrece una **calibración de 20 segundos** («da tres palmadas al ritmo») guardada en el dispositivo. Con niños, esa pantalla es la diferencia entre «la app funciona» y «la app está rota».

Para el modo sin conexión: *precache* del app shell, las muestras y la fuente musical; el JSON de actividades con *stale-while-revalidate*; Verovio bajo demanda. Presupuesto total por debajo de 8–10 MB. Ojo con iOS: Safari purga los datos de un sitio tras siete días sin visitas, y aunque con la PWA instalada la política es más laxa, no te fíes. Pon un botón explícito de «Descargar para usar sin conexión» con barra de progreso, y guarda el progreso en IndexedDB, no en localStorage.

# Que la app escuche al niño

> **Buena noticia contraintuitiva.** La voz infantil es el caso *fácil*, no el difícil. Los detectores de tono en el dominio temporal necesitan varios periodos completos de la onda. A 250–600 Hz, que es el rango de un niño cantando, una ventana de 1024 muestras ya contiene entre 5 y 12 periodos: sobra. Frente a un bajo de 60 Hz, esto significa menos latencia (actualizas cada 20 ms en vez de cada 50), entre 4 y 16 veces menos CPU, y muchos menos errores de octava.

El problema real no es el algoritmo, es la señal: los niños cantan flojo, se acercan y se alejan del micrófono, hablan y se ríen, y un aula es ruidosa. La solución es una cadena de tres filtros baratos: **gating por energía** (RMS mínimo), **umbral de claridad** (pitchy devuelve un valor de 0 a 1; descarta por debajo de 0,85) y **mediana sobre 3–5 lecturas**. Y pide siempre el stream desactivando el procesado de voz del navegador, que está diseñado para llamadas y destroza la música:

```js
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,   // deforma los armónicos
    noiseSuppression: false,   // se come el ataque de la voz
    autoGainControl:  false,   // varía el nivel y rompe el gating por RMS
    channelCount: 1,
  }
});
```

Todo el análisis va en un `AudioWorklet`, nunca en el hilo principal: `ScriptProcessorNode` está deprecado y provoca tirones. Y no fijes 44100 en el código: la `sampleRate` cambia al abrir el micrófono.

## Las minas de iOS, verificadas

1. **`getUserMedia()` redirige la salida de audio.** En cuanto abres el micrófono, el volumen se desploma. Si una actividad reproduce una nota de referencia *y* escucha a la vez, alterna las dos fases o pide auriculares.
2. **`echoCancellation` no se respeta** (bug 179411 de WebKit, abierto desde hace años).
3. **`AudioWorklet` ha tenido bugs recurrentes** en varias versiones de iOS. Prueba en dispositivo real en cada versión mayor y ten un plan B.
4. **Bug 185448: `getUserMedia` en PWA instalada en pantalla de inicio.** Históricamente no funcionaba en modo *standalone*; se arregló y ha reaparecido varias veces.

> **La prueba de riesgo de mayor rentabilidad de todo el proyecto.** Una página HTML mínima que abra el micrófono con `pitchy` y pinte la frecuencia. Ábrela en un iPad real, en Safari y como PWA instalada en la pantalla de inicio. Un día de trabajo. Si el micrófono no funciona en modo standalone, toda tu estrategia de distribución cambia, y es mucho mejor saberlo esta semana que en el mes ocho. Hazla antes que ninguna otra cosa.

## La regla que lo simplifica todo

**El audio se procesa en el dispositivo y no sale de él. Nunca.** No es solo una buena práctica: es lo que hace que jurídicamente tú *no trates* datos personales de un menor, y por tanto no necesites consentimiento parental verificable, ni evaluación de impacto, ni contrato con el centro, ni plan de brechas. Enviar la voz de un niño a un servidor multiplica por diez la carga legal y, en la práctica, hace que muchos centros directamente prohíban la app.

Cómo hacerlo impecable, más allá del código:

- **CSP con `connect-src 'self'`** en las vistas con micrófono. Así, aunque alguien inyectase código, no podría exfiltrar nada. Publica la CSP y el código fuente: es la única forma de *demostrar* la promesa en vez de afirmarla.
- **`Permissions-Policy: microphone=(self)`** para que ningún iframe pueda pedirlo.
- **Permiso tardío y contextual**, dentro de la actividad, tras una pantalla ilustrada: «Vamos a escuchar tu voz para ver si cantas la nota. Tu voz se queda en este ordenador; nadie más la oye ni se guarda.» Y la pantalla de «el permiso está denegado, ve a Ajustes» diséñala para el adulto: un niño de cinco años no puede seguirla.
- **`track.stop()` al salir**, para que el indicador del navegador se apague. Ver el micrófono apagarse tranquiliza.
- **Siempre una alternativa sin micrófono.** Es requisito de accesibilidad —alumnado con mutismo, disfemia o simplemente vergüenza— y de realidad: 25 micrófonos abiertos a la vez en un aula son inutilizables. Diseña las actividades de micrófono como trabajo individual, de rincón o de casa, nunca como actividad de grupo completo.

# Marco legal, privacidad y licencias

En España el art. 7 de la LOPDGDD fija en **14 años** la edad de consentimiento digital, y hay un proyecto de ley orgánica en tramitación que la elevaría a **16**. Todos tus usuarios están por debajo. Cualquier dato personal que recojas de ellos exige consentimiento parental verificable: un mecanismo caro, con muchísima fricción y con una trampa deliciosa, porque para verificar la edad acabas tratando más datos que si no verificaras nada.

| Escenario | Carga legal | Recomendación |
|---|---|---|
| **A.** Anónimo total, todo en el dispositivo | Mínima: aviso legal, política de privacidad y logs anonimizados | **Empieza aquí. Puede que te baste para siempre** |
| **B.** Anónimo + estado en URL + códigos de verificación | Idéntica a A: nada se guarda en servidor | **El objetivo ideal.** Da evaluación al maestro sin tratar un solo dato |
| **C.** Cuenta de profesor + alumnos con alias | Media: contrato de encargo con cada centro, evaluación de impacto y ENS si el centro es público | Solo si un docente lo pide de verdad y aceptas el mantenimiento |
| **D.** Cuentas nominales de alumno | Alta | No lo hagas |
| **E.** Audio o vídeo del alumno en servidor | Muy alta | No lo hagas nunca |

Un matiz jurídico que casi todo el mundo ignora: la edad de 14 o 16 años solo aplica *cuando la base legal es el consentimiento y el servicio se ofrece directamente al menor*. Si tu app se usa dentro de un centro educativo, la base legal es la misión de interés público del propio centro, y entonces **el responsable del tratamiento es el centro y tú serías el encargado**. Ese cambio de figura es lo que dispara todo el escenario C: contrato del art. 28 RGPD firmado con cada colegio, registro de actividades, medidas del art. 32 y muy probablemente conformidad con el Esquema Nacional de Seguridad si el centro es público. Esa es la barrera real de entrada al sector público español, y es la razón para retrasar las cuentas todo lo posible.

> **Si algún día hay cuentas: seudonimización por diseño.** El profesor, que es adulto, crea la cuenta con correo y contraseña. Crea una clase y obtiene un código de seis caracteres. Los alumnos entran con el código y reciben un alias —*Delfín 03*, *Alumno 07*— sin ningún dato personal. La tabla que traduce alias a nombre real la mantiene el profesor en su propio Excel del centro; nunca está en tu sistema. En tu base de datos solo hay «clase A3F9K / alumno 07 / actividad 12 / 8 aciertos». Y ni un solo campo de texto libre donde un maestro pueda escribir «Juan tiene TDAH»: eso sería categoría especial del art. 9 y te lo comerías tú.

## Lo que sí necesitas desde el día uno

- **Aviso legal** (art. 10 LSSI) y **política de privacidad** breve y honesta, más una versión para niños con pictogramas.
- **Logs con IP anonimizada** (truncar 2 bytes) y retención de 7 a 30 días. La IP es dato personal desde la sentencia *Breyer*.
- **Sin banner de cookies**, y con motivo: guardar el progreso que el usuario ha pedido guardar entra en la excepción del art. 22.2 LSSI. Documenta el razonamiento y no metas nada más en el navegador.
- **Analítica propia y sin identificadores**: Umami (MIT) o Plausible autoalojado, con IP anonimizada. Nada de Google Analytics: exige consentimiento previo, vive en una base jurídica de transferencias en litigio, y «esta app de música para niños envía datos a Google» es un titular que no quieres ante un claustro.
- **Ni una petición fuera de tu dominio.** Sin YouTube, sin reCAPTCHA, sin CDN de terceros, y sirve las tipografías desde tu servidor: enlazar a Google Fonts transmite la IP del niño a Google, y ya hay condena judicial en Alemania por eso. Esa frase, escrita en la portada, es tu mayor ventaja frente a toda la competencia.

## Accesibilidad: no es obligatoria, y aun así hazla

El RD 1112/2018 solo obliga al sector público, y la Ley 11/2023 (Acta Europea de Accesibilidad) cubre una lista cerrada de servicios de consumo en la que una app educativa gratuita no encaja. Pero hay tres puertas de entrada: si pides una subvención pública, si una administración educativa integra tu app en su portal, o si contratas con un centro público. En los tres casos te exigirán EN 301 549 y una declaración de accesibilidad.

El argumento de peso es otro: el **Diseño Universal para el Aprendizaje está incorporado explícitamente en la LOMLOE**. Un recurso que lo cumple es infinitamente más defendible ante un claustro. Y el aula ordinaria tiene alumnado con dislexia, TDAH, TEA, hipoacusia y daltonismo. Objetivo: **WCAG 2.2 AA**, con dos criterios de traducción musical que nadie aplica: toda actividad de ritmo debe poder hacerse *mirando* (pulso visual y vibración con `navigator.vibrate()`), y ningún saber debe depender de una sola modalidad.

## Licencias

| Componente | Recomendación | Razón |
|---|---|---|
| Código | **Apache-2.0** (alternativa: AGPL-3.0) | Máxima difusión y cero fricción para que una administración lo integre; añade concesión de patentes frente a MIT. Elige AGPL solo si te preocupa más que alguien lo aloje tras un muro de pago sin devolver nada. |
| Contenidos | **CC BY-SA 4.0** | Es la licencia dominante en Procomún y CEDEC: compatibilidad natural con el ecosistema de recursos educativos abiertos español. CC BY 4.0 si prefieres que cualquiera, editorial incluida, pueda reutilizarlo sin condiciones. |
| Datos y esquemas | **CC0** | Para que otros construyan encima sin fricción. |
| Nombre y logo | **Excluidos expresamente** | Ni las licencias CC ni Apache ceden derechos de marca. Ponlo por escrito y evitas forks que se hagan pasar por el tuyo. |

**No uses CC BY-NC.** Parece protector y es paralizante: nadie sabe si un colegio concertado es «comercial», ni si lo es un docente que cobra por una formación sobre tu recurso, así que ante la duda no lo usan. Además no es una licencia libre, te excluye de Wikimedia y de buena parte de Procomún, y es incompatible con CC BY-SA, así que no podrías mezclar material de CPDL ni de Mutopia. Si lo que temes es que alguien se lucre con tu nombre, el instrumento correcto es la marca, no la cláusula NC.

# Materiales libres: de dónde sale todo

> **El error de cálculo más común en España.** El plazo de dominio público **no siempre es 70 años**. Para autores fallecidos *antes* del 7 de diciembre de 1987, la disposición transitoria 4.ª del TRLPI mantiene el plazo de la ley de 1879: **80 años**. Y los **fonogramas** tienen su propio plazo de 70 años desde la publicación, independiente del autor: una grabación de 1990 de una obra del siglo XIX está protegida.

| Obra | Fallecimiento | Plazo | ¿Libre en 2026? |
|---|---|---|---|
| Pedrell — *Cancionero Musical Popular Español* | 1922 | 80 años → 2003 | **Sí** |
| Olmeda — *Cancionero popular de Burgos* | 1909 | 80 años → 1990 | **Sí** |
| García Lorca — *Canciones españolas antiguas* | 1936 | 80 años → 2017 | **Sí** |
| Manuel de Falla — *Siete canciones populares* | 1946 | 80 años → 2027 | **Todavía no** (enero de 2027) |
| «La vaca lechera» (Perelló / Halpern, 1948) | — | — | **No.** Protegida |
| Repertorio de Cri-Cri | 1990 | 70 años → 2061 | **No** |

Muchas canciones que todo el mundo cree tradicionales están protegidas. Antes de meter una, comprueba autor y fecha; ante la duda, no la uses. Y nunca extraigas audio de YouTube ni de otra plataforma educativa aunque la melodía sea de dominio público: el fonograma es un derecho independiente.

> **Regla de oro operativa.** Melodía tradicional documentada en una fuente de dominio público **más tu propia armonización más tu propia grabación o síntesis con samples CC0** es 100 % limpio y 100 % tuyo para relicenciar. Si la obra está en dominio público no debes nada a SGAE ni a AGEDI/AIE.

**Partituras.** *OpenScore* (CC0 puro, sin condiciones: unos 1.500 *Lieder* y 700 movimientos de cuarteto, en .mxl y en GitHub) es la fuente más limpia que existe. La *Biblioteca Digital Hispánica* de la BNE es la mina del repertorio popular español: Pedrell, Olmeda, Inzenga, Ledesma digitalizados. *Mutopia* aporta código LilyPond editable (verifica la licencia pieza a pieza) y *CPDL* unas 50.000 obras corales, mayoría CC BY-SA. Cuidado con *IMSLP*: sus servidores están en Canadá y que algo esté ahí no garantiza dominio público en España. Y no uses *MuseScore.com* como fuente: la mayoría son arreglos protegidos subidos sin permiso.

**Audio y muestras.** *VSCO 2 Community Edition* (CC0) es la mejor opción gratuita para timbres orquestales reales. *VCSL* (CC0) trae más de cien instrumentos del mundo, perfecta para el bloque de instrumentos. En *Freesound*, filtra siempre por CC0 y evita CC BY-NC, que te bloquearía a ti y a quien reutilice tu app. *Kenney.nl* (CC0) resuelve los sonidos de interfaz y los mejores assets gráficos para la parte de juego. Si necesitas General MIDI ligero, *MuseScore_General.sf3* es MIT; el mejor piano libre es *Salamander Grand Piano* (CC BY 3.0), en versión reducida para web.

**Tipografía e iconos.** *Bravura* (Steinberg, OFL) es la fuente de notación de referencia de SMuFL; *Petaluma* si quieres estética manuscrita, más amable para niños. Usa el estándar SMuFL y podrás cambiar de fuente sin reescribir nada. Para texto, *Andika* (SIL, OFL) está diseñada para alfabetización inicial, con «a» y «g» de un solo piso; ofrece *Atkinson Hyperlegible*, *Lexend* y *OpenDyslexic* como opción conmutable. Iconos: *Openclipart* (CC0), *Twemoji* (CC BY), *Lucide* (ISC), *Material Symbols* (Apache). Evita Pixabay, Pexels y Freepik: licencias propias y cambiantes que no puedes sublicenciar.

> **Hazlo desde el primer día.** Una hoja de cálculo de assets: fichero, origen, autor, licencia, URL, fecha de descarga, comprobación de dominio público. Reconstruir esa trazabilidad a los dos años es un infierno, y sin ella no puedes relicenciar nada ni defenderte de una reclamación. En el repositorio: `LICENSE`, `LICENSE-CONTENT.md`, `THIRD-PARTY-NOTICES.md`, `CREDITS.md`, `TRADEMARK.md`. Y dentro de la app, una pantalla de créditos, que además es contenido curricular de 5.º–6.º.

# Fabricar el contenido con IA sin que se note

El plan de generar con IA y revisar después funciona, pero solo si la revisión no depende de tu criterio musical. La clave es que la mayor parte de la revisión sea automática, y que la humana sea corta y esté bien dirigida.

1. **Generar contra un esquema.** La IA no escribe «una actividad»: rellena un JSON Schema con campos obligatorios y valores acotados. Un formato cerrado reduce el espacio de error muchísimo más que un buen prompt.
2. **Validar con código, no con oído.** Un script de veinte líneas con `music21` parsea el ABC generado y comprueba que los compases cuadran (`makeMeasures()` no lanza), que el ámbito está dentro de la tesitura de la edad, que no hay saltos mayores de una sexta para principiantes y que las figuras usadas pertenecen al curso declarado. Lo que no pasa el validador se descarta y se regenera sin intervención humana. Esto solo te ahorra semanas.
3. **Revisión visual en lote.** Una página interna que renderice cincuenta actividades a la vez con abcjs, cada una con su botón de reproducir. Se revisa una tanda en veinte minutos, no una actividad en veinte minutos.
4. **Revisión pedagógica dirigida.** Tu mujer no revisa «si está bien»: responde tres preguntas por actividad — ¿es cantable a esta edad?, ¿el enunciado se entiende sin leer?, ¿esto lo haría yo en clase? Preguntas cerradas, respuestas rápidas, y un campo de «cámbialo por esto».

> **Dónde está de verdad el multiplicador.** La IA no te ahorra tiempo escribiendo componentes de React: te lo ahorra generando y validando quinientas actividades. Hasta que tengas el esquema, el prompt y el validador funcionando, tienes una demo. Cuando los tengas, tienes un producto. Por eso el generador de contenido es la tarea de la semana 3, no del mes 6.

**Lo que la IA no debe decidir.** *La secuencia*: qué va antes que qué sale del currículo y de la práctica documentada, no de un modelo; fíjala tú, en una tabla, y pásala como contexto. *El repertorio*: un modelo te dará canciones populares con toda la confianza del mundo, incluidas las protegidas; toda canción se verifica contra una fuente de dominio público antes de entrar. *Las locuciones*: voz humana grabada, no sintetizada. *Los datos normativos*: los enunciados de competencias y criterios se copian del BOE, no se parafrasean.

# Hoja de ruta

**Fase 0 · una semana · reducir incertidumbre.** Prueba del micrófono en iPad real, en Safari y como PWA instalada; esto primero. Una actividad completa de punta a punta —JSON, abcjs, audio, feedback—, fea, sin menús ni diseño. Probarla con tres niños de edades distintas: veinte minutos que valen más que un mes de planificación.

**Fase 1 · cuatro a ocho semanas · biblioteca mínima usable.** Motor con cuatro tipos: `eleccion`, `emparejar`, `ordenar` y `guia-aula`. JSON Schema, validador con music21 y página de revisión en lote. Unas veinte actividades: las de esfuerzo S más una de micrófono. PWA sin conexión, i18n, sin registro, progreso en IndexedDB. Cloudflare Pages, dominio, política de privacidad y créditos.

**Fase 2 · dos a tres meses · el producto real.** Tipos `rejilla`, `pentagrama`, `seguir` y `tocar-a-tiempo`. Catálogo completo hasta las 54 actividades. Filtro por curso, eje y criterio curricular, que es la vista del maestro. Estado en URL y códigos de verificación: evaluación sin cuentas. Fichas imprimibles en PDF generadas desde el mismo JSON.

**Fase 3 · cuando alguien lo pida · crecer sin traicionarse.** Configurador de actividades: un formulario que escribe el JSON. Lenguas cooficiales e inglés. Publicación en Procomún, que es distribución gratuita a decenas de miles de docentes. Y solo si un centro lo demanda, cuentas de profesor con alias, escenario C.

## Lo que cuesta al mes

| Escenario | Usuarios | Infraestructura | Coste |
|---|---|---|---|
| Prototipo | < 100 | Cloudflare Pages | **0 €** |
| Público sin cuentas | 1.000–10.000 | Cloudflare Pages (banda ilimitada) | **0 €** + ~10 €/año de dominio |
| Cuentas de profesor | 50 profes / 1.500 alumnos | + Workers + D1 | ~5 $ |
| Escala de colegio | 500 profes / 15.000 alumnos | + R2 | ~10–15 $ |
| Generación de 500 actividades | — | API de modelo | ~5–30 $ una sola vez |
| Publicar en las dos tiendas | — | Apple 99 $/año + Google 25 $ | +8,25 $/mes |

Puedes llegar a decenas de miles de usuarios por menos de 15 $ al mes. **El coste dominante de este proyecto es tu tiempo, no la infraestructura**, así que optimiza en consecuencia: elige siempre lo que te ahorre horas, no lo que ahorre céntimos.

> **Si algún día vas a las tiendas.** Las políticas infantiles de Apple (§1.3, Kids Category) y de Google (Families) convergen en un punto que es una decisión de arquitectura del primer día: la analítica de terceros es esencialmente inviable. Apple prohíbe publicidad y analítica de terceros salvo excepciones tan estrechas que excluyen Google Analytics, Firebase, Mixpanel, PostHog cloud y Sentry con IP. Google prohíbe transmitir el identificador de publicidad y los identificadores de dispositivo. Quitar Firebase de una app en el mes ocho es doloroso; no meterlo nunca es gratis. Además, Google exige 12 testers durante 14 días consecutivos antes de publicar en producción con cuenta personal: suma de dos a cuatro semanas al calendario.

# Riesgos y decisiones que siguen abiertas

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **El micrófono no funciona en PWA instalada en iPad** | Media | Probarlo en la semana 0. Si falla: Capacitor solo para iOS, o degradar a «toca en pantalla» y dejar el micrófono para escritorio y Android. |
| **El contenido generado es correcto pero soso** | Alta | Es el riesgo más subestimado. El validador comprueba corrección, no gracia. Contrapesos: repertorio popular real, personajes con identidad propia, y la regla de Incredibox — que explorar sea más divertido que acertar. |
| **Se convierte en cincuenta juguetes sueltos** | Alta | Es el defecto de Chrome Music Lab y de Aprendo Música. Antídoto: cada actividad nace con su criterio curricular asignado, y la vista principal del maestro es el currículo, no una cuadrícula de iconos. |
| **El aula tiene una sola pantalla** | Muy alta: es la norma | Por eso el tipo `guia-aula` es de primera clase y no un extra. Diseña asumiendo un proyector y 25 niños sin dispositivo. |
| **Se te va el tiempo en el motor perfecto** | Media | La fase 0 impone una actividad real antes que ninguna abstracción. Si en tres semanas no hay algo que un niño pueda usar, algo va mal. |
| **Mantenerlo diez años** | — | Aprendo Música lleva veinte. Es posible, pero solo con cero dependencias de terceros en ejecución y un stack aburrido. Es otra razón para React y Cloudflare frente a lo que esté de moda. |

## Preguntas que solo puedes responder tú

- **¿Infantil y Primaria en la misma app, o dos apps?** Un niño de 4 años y uno de 11 no comparten casi nada: ni interfaz, ni tipografía, ni modelo de recompensa. La recomendación es una app con tres carriles visualmente distintos —Infantil sin texto, 1.º–3.º, 4.º–6.º—, pero es una decisión de producto con consecuencias grandes.
- **¿Cuál es tu unidad de uso?** ¿La sesión de cinco minutos del niño, o los quince minutos de pantalla que el maestro tiene en una clase de cincuenta? Cambia todo el diseño de navegación. Diseña para el maestro y deja que el niño herede.
- **¿Qué haces si funciona?** Formación y materiales físicos son compatibles con la licencia libre; el hosting de datos de alumnos te mete de lleno en el escenario C y en el ENS. Decide pronto cuál de las dos puertas quieres abierta.
- **¿Y el nombre?** Condiciona el dominio, la marca y la identidad visual. Que no se parezca al de ninguna plataforma existente: la diferenciación visual y nominal es deliberada (ver `08-LEGAL.md`).

> **Lo siguiente, en orden.** 1. La prueba del micrófono en iPad. 2. Una actividad completa, fea, probada con tres niños. 3. El JSON Schema y el validador con music21. Nada más hasta que esas tres estén hechas.

# Fuentes

## Normativa y currículo

- RD 157/2022, Educación Primaria — https://www.boe.es/buscar/act.php?id=BOE-A-2022-3296
- RD 95/2022, Educación Infantil — https://www.boe.es/buscar/doc.php?id=BOE-A-2022-1654
- Saberes básicos, Educación Artística (Berrigasteiz) — https://www.berrigasteiz.com/monografikoak/lomloe/desarrollo/primaria/EA_saberes.pdf
- Criterios de evaluación, Educación Artística (Berrigasteiz) — https://www.berrigasteiz.com/monografikoak/lomloe/desarrollo/primaria/EA_criterios.pdf
- Concreción de Infantil, Castilla y León — https://www.educa.jcyl.es/es/informacion/sistema-educativo/educacion-infantil/educacion-infantil-curriculo-ordenacion/anexo-iii-areas-educacion-infantil.ficheros/1644876-Comunicaci%C3%B3n%20y%20representaci%C3%B3n%20de%20la%20realidad.pdf
- Programación de Música LOMLOE, CEIP Peñalta de Buitrago — https://site.educa.madrid.org/cp.penalta.buitrago/wp-content/uploads/cp.penalta.buitrago/2023/11/Prog.-Musica-LOMLOE.-PRIMARIA-Curso-23-24.pdf
- Programación LOMLOE de Música, CEIP Doce de Octubre — https://blogsaverroes.juntadeandalucia.es/ceipdocedeoctubre/files/2024/02/Programacion-LOMLOE-MUSICA.pdf

## Referentes

- Chrome Music Lab — https://musiclab.chromeexperiments.com/ · código Apache-2.0: https://github.com/googlecreativelab/chrome-music-lab
- musictheory.net, ejercicios y customizer — https://www.musictheory.net/exercises
- Groove Pizza (NYU MusEDLab) — https://www.musedlab.org/groovepizza/
- Aprendo Música — https://aprendomusica.com/
- JClic — https://clic.xtec.cat/legacy/es/ · EdiLIM — https://www.educalim.com/
- Procomún (INTEF) — https://procomun.intef.es/

## Técnico

- abcjs — https://paulrosen.github.io/abcjs/ · VexFlow — https://www.vexflow.com/ · Verovio — https://www.verovio.org/
- pitchy — https://github.com/ianprime0509/pitchy · Tone.js — https://github.com/Tonejs/Tone.js · smplr — https://github.com/danigb/smplr
- «A Tale of Two Clocks», scheduling de audio — https://web.dev/articles/audio-scheduling
- WebKit 185448, getUserMedia en PWA standalone — https://bugs.webkit.org/show_bug.cgi?id=185448
- music21 — https://music21.org/
- Límites de Cloudflare Pages — https://developers.cloudflare.com/pages/platform/limits/
- Vercel Hobby, uso no comercial — https://vercel.com/docs/plans/hobby
- WCAG 2.2, tamaño de destino — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Nielsen Norman Group, UX infantil — https://www.nngroup.com/articles/childrens-websites-usability-issues/

## Legal

- AEPD, Menores y educación — https://www.aepd.es/preguntas-frecuentes/10-menores-y-educacion
- AEPD, Dispositivos digitales en centros docentes — https://www.aepd.es/guias/responsabilidades-uso-dispositivos-moviles-centros-docentes.pdf
- AEPD, Cookies y analítica web — https://www.aepd.es/guias/orientaciones-analitica-web-aapp.pdf
- Proyecto de LO de protección de menores en entornos digitales — https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-52-1.PDF
- Apple App Store Review Guidelines — https://developer.apple.com/app-store/review/guidelines/
- Google Play Families — https://support.google.com/googleplay/android-developer/answer/9893335
- BNE, dominio público — https://www.bne.es/es/preguntas-frecuentes/obras-considera-encuentran-dominio-publico
- RD 1112/2018 — https://www.boe.es/buscar/act.php?id=BOE-A-2018-12699

## Materiales libres

- OpenScore (CC0) — https://fourscoreandmore.org/openscore/
- Biblioteca Digital Hispánica — https://bdh.bne.es/
- Mutopia — https://www.mutopiaproject.org/ · CPDL — https://www.cpdl.org/
- Freesound CC0 — https://freesound.org/browse/tags/cc0/ · Kenney.nl — https://kenney.nl/assets
- Salamander Grand Piano — https://github.com/sfzinstruments/SalamanderGrandPiano
- SMuFL — https://www.smufl.org/fonts/ · Bravura — https://github.com/steinbergmedia/bravura
- Andika — https://software.sil.org/andika/ · Atkinson Hyperlegible — https://www.brailleinstitute.org/freefont/
- Creative Commons — https://creativecommons.org/choose/ · REUSE.software — https://reuse.software/

---

*Documento de trabajo elaborado a partir de investigación web en septiembre de 2026. Los textos normativos se han contrastado con reproducciones oficiales del currículo estatal; antes de citarlos formalmente conviene verificarlos una última vez contra el PDF del BOE. Las versiones y licencias de software están comprobadas contra npm y PyPI a 5 de septiembre de 2026. Esto es un análisis técnico y documental, no asesoramiento jurídico.*
