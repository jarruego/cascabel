# Hoja de ruta y tareas

Este fichero es la cola de trabajo. Cuando abras Claude Code, la primera frase útil es
**«lee CLAUDE.md y docs/07-ROADMAP.md y dime en qué tarea estamos»**.

Marca las tareas con `[x]` al cerrarlas. Cada una lleva **criterio de aceptación**: si no
se cumple, la tarea no está hecha, aunque el código compile.

---

## Fase 0 — Reducir incertidumbre (una semana)

> El objetivo de esta fase no es construir: es **descubrir si algo importante no funciona**
> antes de haber invertido meses. Son tres tareas y casi nada de lo que producen se queda
> — la excepción es la ruta `/diagnostico` de T0.1, que sobrevive precisamente porque el
> riesgo que iba a medir no se ha podido cerrar.

### T0.1 — Prueba de riesgo del micrófono `⚠️ HAZLO PRIMERO`

Una ruta `/diagnostico` dentro de la app que abra el micrófono con el worklet de tono,
pinte la frecuencia en grande y, debajo, un informe del entorno. Es código desechable en
cuanto a la parte de prueba, pero la ruta se queda: es la que nos dará el dato de iOS.

**No tenemos iOS.** Sólo Windows y Android. Por eso la tarea se parte en dos: lo que
podemos medir nosotros hoy, y el instrumento que recogerá el dato que no podemos medir.

#### (a) Lo que probamos nosotros

Con el **reenvío de puertos de `chrome://inspect`** (pestaña *Port forwarding*, `5173` →
`localhost:5173`), el Android ve el servidor de desarrollo como `http://localhost:5173`.
Eso cuenta como *secure context*, así que `getUserMedia` funciona sin montar HTTPS ni
certificados ni túneles a terceros.

- [x] Chrome de escritorio en Windows, pestaña normal — 52 ms, 48 kHz
- [x] Edge de escritorio en Windows — idéntico a Chrome hasta el milisegundo
- [x] Firefox de escritorio en Windows — 34 ms, y declara `baseLatency = 0`
- [x] Chrome de Android, pestaña — **micrófono funciona**. 27 ms de latencia, 48 kHz.
      Se probó contra el despliegue real, que además es mejor que el reenvío de puertos
- [x] Chrome de Android, **PWA instalada** — **el micrófono funciona en standalone**.
      28 ms de latencia, sin penalización frente a la pestaña

**(a) CERRADA del todo el 2026-09-06.** Los tres navegadores de escritorio y Android, en
pestaña y en app instalada, conceden el micrófono, cargan el `AudioWorklet` y detectan
tono. Resultados y análisis en `docs/pruebas/microfono.md`. Lo único que queda sin probar
es iOS, y es por no tener dispositivo, no por no haberlo intentado.

El último punto es la excepción honesta: una PWA lanzada desde la pantalla de inicio no
pasa por el túnel de DevTools, así que el modo *standalone* en Android sólo se puede
comprobar contra el despliegue de T1.10. Marca la casilla cuando exista.

De paso, y porque cuesta cero: el diagnóstico mide **cuánto tarda cada análisis del
worklet**. El NSDF es O(N²) con ventana de 1024 y solape del 50 %; el comentario del
worklet estima un 1–4 % de un núcleo, y conviene saber si eso se sostiene en un móvil
real antes de llegar a T2.5.

#### (b) El instrumento para iOS

La ruta `/diagnostico` informa, en texto seleccionable:

- [x] Sistema operativo y versión, navegador y versión (de `userAgent`, sin más)
- [x] Modo de visualización: pestaña o `standalone` (`display-mode` por `matchMedia`,
      con la vía de `navigator.standalone` que Safari necesitó durante años)
- [x] `sampleRate` del `AudioContext`, antes y después de abrir el micrófono
- [x] `baseLatency`, `outputLatency` y la latencia total que usaría `latenciaMs()`
- [x] Estado del micrófono: concedido, denegado, o el error exacto con su `name`
- [x] Botón **«Copiar informe»** al portapapeles; si está bloqueado, el `<pre>` sigue
      siendo seleccionable a mano, que es la vía que nunca falla
- [x] Coste del análisis del worklet en ms, o «no medible» si el navegador no expone
      `performance` dentro del `AudioWorklet`

Hecho el 2026-09-06: ruta `/diagnostico`, router mínimo de dos rutas (`src/app/rutas.tsx`,
que **no** es T1.4) y `public/_redirects` para que la ruta exista al abrirla directa.
`docs/pruebas/microfono.md` tiene la tabla lista y las instrucciones del reenvío de puertos.

**Pendiente y sólo lo puedes hacer tú**: las cinco filas de (a). Y comprobar que la página
se ve bien: se verificó que compila, que el servidor la sirve y que el *fallback* de SPA
funciona, pero no se pudo abrir en un navegador real desde la sesión.

**Por qué**: el bug 185448 de WebKit ha roto `getUserMedia` en modo *standalone* en iOS
varias veces, y si está roto la estrategia de distribución cambia entera (habría que
empaquetar con Capacitor sólo para iOS). No podemos verificarlo, así que la alternativa
es dejar preparado el sitio donde ese dato aterrizará el día que un maestro con iPad abra
la app. Un informe copiado y pegado en una incidencia vale tanto como una prueba nuestra.

Mientras tanto, iOS queda como **riesgo abierto no verificado** en `docs/adr/0004-pwa-primero.md`,
y el código de micrófono degrada a toque ante cualquier fallo (regla 8 de `CLAUDE.md`), de
modo que un iOS roto empeora la experiencia pero no impide usar ninguna actividad.

**Criterio de aceptación**: `docs/pruebas/microfono.md` con una tabla de dispositivo,
sistema, navegador, modo (pestaña / instalada), resultado y coste del análisis, rellena
para todas las filas de (a) que no dependan del despliegue. Y `/diagnostico` desplegada,
copiando un informe legible de una sola pulsación.

### T0.4 — Medir el coste del NSDF `[x]`

Abierta y cerrada el 2026-09-06. Ningún navegador expone `performance` dentro del
`AudioWorkletGlobalScope` —Chrome 152, Edge 152 y Firefox 146 dan los tres «no medible»—,
así que se mide el mismo algoritmo en el hilo principal.

- [x] Banco en `src/escucha/banco.ts`, publicado en `/diagnostico`
- [x] Etiquetado como **estimación**, no como medida del hilo de audio
- [x] `src/escucha/nsdf.ts` extrae el algoritmo, y `tests/nsdf.test.ts` carga el worklet
      **real** y comprueba que las dos copias dan lo mismo, para que no se separen
- [x] De paso, primer test del detector: acierta a menos de 5 cents entre 220 y 600 Hz

**El resultado, y no es el que esperábamos:**

| | |
|---|---|
| Coste por análisis | **1,33 ms** (mediana; p95 1,42) |
| Presupuesto | 10,67 ms (cada 512 muestras a 48 kHz) |
| Fracción de un núcleo | **12,5 %** |

El comentario del worklet decía «1-4 % de un núcleo en una tablet media». Era optimista por
un factor de tres a diez, **y esto es un PC de sobremesa**. Una tablet de aula típica va
tres o cuatro veces más lenta: 40-50 % de un núcleo, en un hilo que además tiene que
reproducir sonido sin cortes. Corregido en el worklet y abierto T2.0.

### T2.0 — Bajar el coste del detector de tono `[x]`

Abierta y cerrada el 2026-09-06, a partir de la medida de T0.4.

- [x] **Diezmar a 12 kHz antes de analizar**, con un FIR sinc-Hann de 25 coeficientes.
      La ventana pasa de 1024 a 256 muestras para el mismo tramo de tiempo
- [x] No hizo falta la FFT: con el diezmado ya sobra
- [x] Vuelto a medir con el banco de T0.4
- [x] `tests/nsdf.test.ts` sigue pasando, y se le añade una batería con ruido

| | Antes | Después |
|---|---|---|
| Coste por análisis | 1,33 ms | **0,19 ms** |
| Fracción de un núcleo | 12,5 % | **1,78 %** |
| Error máximo (señal limpia) | 0,05 cents | 0,49 cents |
| Error máximo (ruido al 30 %) | **3367 cents** | **5,2 cents** |

**Y aquí está lo que no buscábamos.** El objetivo era el coste, pero el filtro paso bajo
arregló de paso **un fallo de corrección**: sin diezmar, con ruido blanco al 30 % el
detector inventaba notas con errores de miles de cents *y declaraba claridad 0,871*, por
encima del umbral de 0,85 que las deja pasar. Es decir, le habría dicho a un niño que ha
cantado una nota que no cantó, en un aula ruidosa, que es justo el escenario real. La
optimización valía siete veces el coste; el arreglo de corrección vale más.

**Criterio de aceptación**: cumplido — 1,78 % frente al 3 % exigido, y el test de precisión
sigue por debajo de 5 cents entre 220 y 660 Hz.

**Pendiente de revisión pedagógica**: el factor 4 deja Nyquist en 6 kHz, dimensionado para
una fundamental que no pasa de 660 Hz (E5, techo de la tesitura de 3.er ciclo en
`tools/validar.py`). Si una maestra dice que hay que cubrir voces más agudas, el factor
cambia — y con él la tabla de arriba.

### T0.2 — Una actividad completa de punta a punta `[x]`

Cerrada el 2026-09-06. `inf-01-semaforo-del-sonido` se juega entera.

- [x] Se puede jugar entera en el navegador
- [x] El audio suena tras el gesto del usuario
- [x] No hay ningún texto escrito en el componente (todo por `t()`)

Faltaban tres cosas distintas y ninguna era el motor: los textos de las opciones, los
iconos y el audio.

- **Iconos**: `src/ui/Icono.tsx`, SVG en línea. Ni fuente de iconos ni imagen externa, que
  la regla 1 lo prohíbe. «Suena» y «silencio» se distinguen por **forma** (altavoz con
  ondas / altavoz tachado) además de por color, que es la regla 4.
- **Audio**: sintetizado por `tools/muestras-provisionales.py`, 39 KB los cuatro. Son
  **provisionales**: T1.7 los sustituye por material CC0 real. Ventaja lateral mientras
  tanto: al ser nuestros, no arrastran licencia de terceros, y los créditos lo dicen.
- **Textos**: `opcion.suena` y `opcion.silencio` en `es.json`.

**Criterio de aceptación pendiente**: «un niño de 4 años la completa sin ayuda verbal de un
adulto». Eso es T0.3 y no lo puede firmar un test.

### T0.3 — Probarla con tres niños de edades distintas

- [ ] Uno de Infantil, uno de 1.º–2.º, uno de 4.º–6.º
- [ ] Anotar dónde dudan, dónde tocan y no pasa nada, y qué preguntan

**Criterio de aceptación**: `docs/pruebas/sesion-01.md` con las observaciones. Veinte
minutos aquí valen más que un mes de planificación.

---

## Fase 1 — Biblioteca mínima usable (4–8 semanas)

### T1.0 — Carriles en `tokens.css` y en `config.ts` `[x]`

Cerrada el 2026-09-06. Consecuencia directa de
[`adr/0005-una-app-tres-carriles.md`](adr/0005-una-app-tres-carriles.md), hecha **antes**
que los tipos de actividad para no tener que refactorizar componentes con tamaños fijos.

- [x] Tipo `Carril = 'infantil' | 'lectores' | 'autonomos'` en `src/config.ts`
- [x] `OBJETIVO_TACTIL`, `MAX_OBJETOS` y `SEPARACION` reindexados **por carril**
- [x] `carrilDe(curso)`, `etapaDe(curso)`, `carrilesDe(etapa)` y `carrilPorDefecto(etapa)`
- [x] Tokens `--objetivo`, `--separacion` y `--t-carril` en `estilos/tokens.css`, tomados
      del `data-carril` del ancestro: un componente pide `var(--objetivo)` y ya está
- [x] `src/app/preferencias.ts` (Zustand): el carril lo elige quien usa la app, no la
      actividad. Una de `primaria-c2` la puede abrir un niño de 3.º o uno de 4.º
- [x] `tools/validar.py` aplica el **carril más estricto** que pueda abrir la actividad:
      si cabe en el de primeros lectores cabe en el de autónomos, nunca al revés
- [x] Retirado el aviso de contradicción de `docs/04-DISENO-UI.md`
- [x] `tests/carriles.test.ts`: 3.º va a `lectores` y 4.º a `autonomos` pese a compartir
      ciclo, más las invariantes de tamaño de WCAG

**Criterio de aceptación**: cumplido. Ningún componente lee un tamaño táctil de `Etapa` —
el compilador lo impide, porque los mapas ya no aceptan una etapa como índice.

**Queda una decisión sin tomar, y a propósito.** `TOLERANCIA_MS` sigue indexada por etapa.
La tabla de `CLAUDE.md` §7 está escrita por edades (3-5, 6-8, 9-12), que es forma de
carril; pero la consume `evaluacion.ts` desde la actividad, que solo declara etapa.
Reindexarla obliga a responder: **¿qué tolerancia rítmica se le aplica a una actividad de
`primaria-c2` abierta desde el carril de autónomos, la de 3.º o la de 4.º?** Es criterio
pedagógico, no técnico, y no se adivina. Pendiente de la revisión de la maestra.

### T1.1 — Motor: tipo `eleccion` terminado `[x]`

Cerrada el 2026-09-06.

- [x] Componente genérico que ejecuta cualquier JSON de tipo `eleccion`
- [x] Estados: estímulo, acierto, «casi» con pista, actividad completada
- [x] Sin cronómetro, sin vidas, sin puntuación visible durante el juego
- [x] Objetivo táctil correcto **por carril** (75 / 60 / 48 px), vía T1.0
- [x] Operable solo con teclado
- [x] Test de que un fallo **no** termina la actividad

**Las reglas se sacaron del componente.** Viven en `src/motor/maquinaEleccion.ts`, que es
una función pura, y `tests/eleccion.test.ts` las vigila. El motivo: «el error nunca
castiga» es una promesa que se le hace a un maestro, y una promesa repartida entre
manejadores de eventos no se puede demostrar. Ahora hay un test que falla si alguien
la rompe.

**Un fallo que tenía y que con niños era seguro**: no había bloqueo mientras se mostraba
el feedback. Un niño de cuatro años da tres toques seguidos por costumbre, y eso contaba
tres intentos y encadenaba tres avances. Ahora una respuesta fuera de la fase de estímulo
no cuenta para nada, y hay test.

**Teclado**: los botones son `<button>` nativos, así que Tab y Enter funcionan solos. Lo
que hubo que cuidar es el bloqueo: se marca con `aria-disabled`, **no** con `disabled`,
porque deshabilitar de verdad le arrebata el foco a quien navega con teclado justo en el
momento en que aparece el feedback.

**Pistas progresivas**: cada fallo en el mismo estímulo trae la siguiente pista del JSON, y
a partir de ahí se repite la última. Nunca se queda sin pista y nunca dice «has fallado».

### T1.2 — Motor: tipos `emparejar` y `ordenar` `[x]`

Cerrada el 2026-09-06.

- [x] Interacción de **toque sucesivo**, nunca arrastre (WCAG 2.5.7 y motricidad fina)
- [x] Autocorrección por el oído: al tocar dos elementos, suenan los dos
- [x] Reordenar es tocar en secuencia, no arrastrar

Reglas en `maquinaEmparejar.ts` y `maquinaOrdenar.ts`, puras y con 15 tests. Y dos
actividades reales del catálogo para ejercitarlos: **C1-08 «Memory de instrumentos»** y
**INF-15 «De grave a agudo»**.

**Una decisión de diseño que salió de escribir el test.** En `ordenar`, al fallar se
conserva el **prefijo correcto**, no los aciertos sueltos. Conservar los sueltos les cambia
el índice —si acertó el segundo y falló el primero, el segundo pasa a ser el primero— y
convierte un acierto en un error sin que el niño toque nada. Una secuencia se construye de
izquierda a derecha: lo que está bien desde el principio se queda, y a partir del primer
fallo se devuelve todo.

**Colocar mal no se impide.** El elemento se coloca igual y comprobar es un paso aparte.
Rechazar el toque convertiría la actividad en un cerrojo que hay que adivinar.

**Discrepancia con el catálogo, pendiente de revisión pedagógica.** `content/catalogo.json`
describe INF-15 como «cinco campanas», pero el máximo de objetos simultáneos en Infantil es
**cuatro** (`docs/04-DISENO-UI.md`). Se ha implementado con **tres**. Hay que decidir si se
corrige el catálogo o si el límite admite excepción cuando los objetos son idénticos salvo
en el sonido — que es discutible, porque lo que satura no es la variedad sino el número.

**El validador tenía un agujero y se ha tapado**: solo contaba objetos en `contenido.opciones`,
así que `emparejar` y `ordenar` pasaban sin que se contara nada. Ahora cuenta según el tipo,
comprueba que las parejas apunten a elementos que existen, que `orden` y `elementos` tengan
las mismas claves, y rechaza `entrada.modo: arrastre` en cualquier actividad.

### T1.3 — Motor: tipo `guia-aula` `[x]`

Cerrada el 2026-09-06. Es la pantalla del maestro, y el dosier la señala como lo más
valioso en el aula española real: **un proyector y veinticinco niños sin dispositivo** es la
norma, no la excepción.

- [x] Modo proyector: tipografía enorme, alto contraste, legible a 8 metros
- [x] Pulso visual sincronizado con el metrónomo
- [x] Botón de imprimir ficha (CSS `@media print`)

**Los tamaños de esta pantalla NO salen del carril**, y es deliberado. En el resto de la
app el carril manda porque el usuario es el niño que tiene el dispositivo delante; aquí el
usuario es un adulto de pie al fondo del aula. Se usa `clamp()` contra el ancho de la
pantalla, no contra la edad.

**El pulso visual existe para que la actividad se pueda hacer mirando.** Es el criterio
1.1.1 de `docs/04-DISENO-UI.md`: un alumno sordo tiene que poder participar. El primer
pulso del compás se distingue por **tamaño de borde** además de por color, y se respeta
`prefers-reduced-motion`.

**La ficha impresa no es la pantalla en papel**: fuera controles, fuera fondos de color, y
**todos** los pasos visibles en vez de solo el actual. En pantalla es una presentación; en
papel es una ficha que el maestro se lleva al aula.

`tests/metronomo.test.ts` protege la parte que es fácil de romper sin darse cuenta: que no
se use `setInterval`, que se programe contra el reloj de audio y no contra `Date.now`, y
que lo visual se consuma desde `requestAnimationFrame` y no dentro del planificador.
Comprobado que el test falla de verdad si alguien mete un `setInterval`.

Actividad de ejemplo: **INF-08 «Camina, corre, para»**, Dalcroze, del catálogo.

### T1.4 — Navegación y catálogo `[x]`

Cerrada el 2026-09-06.

- [x] Índice cargado desde `content/indice.json`
- [x] Filtros por etapa, eje y criterio curricular ← **esta es la vista del maestro**
- [x] Ruta `/actividad/:id`
- [x] Un solo botón «atrás», siempre en el mismo sitio

**Un fallo latente que salió al hacerlo, y que solo se habría visto al desplegar**:
`content/` no está dentro de `public/`, así que `vite build` **no lo copiaba a `dist/`**. En
desarrollo funcionaba de casualidad, porque Vite sirve la raíz del proyecto. La biblioteca
entera habría dado 404 en producción el día de T1.10. Arreglado con un plugin propio de
veinte líneas en `vite.config.ts` —sin dependencias nuevas— que sirve `content/` en
desarrollo de forma explícita y lo copia al construir. Comprobado sobre el `dist` real:
`/`, `/actividad/:id`, `/diagnostico` y los JSON responden 200.

**El catálogo es la raíz.** No hay portada: el maestro llega buscando «qué trabajo el
criterio 3.1 en 2.º», y eso es lo primero que ve. Es el antídoto contra el riesgo que el
dosier llama «cincuenta juguetes sueltos».

**El gesto de audio se movió.** Vivía en la pantalla provisional `App.tsx`, que se ha
borrado por quedar huérfana. El `AudioContext` nace suspendido y solo se reanuda dentro de
un gesto del usuario, así que ahora `despertarAudio()` se llama en el clic sobre la ficha
de la actividad — que es el último gesto real antes de que suene nada.

**Pendiente**: el filtro por criterio se construye con los criterios presentes en el
índice. Con tres actividades es suficiente; con doscientas habrá que agrupar por
competencia y ciclo, y probablemente buscar por texto.

### T1.5 — Persistencia local `[x]`

Cerrada el 2026-09-06.

- [x] Progreso en IndexedDB (no `localStorage`: es síncrono y se llena)
- [x] Funciona si el almacenamiento está bloqueado (modo privado)
- [x] **Cero datos personales.** Ni nombre, ni edad, ni curso nominal

**El caso del almacenamiento bloqueado no es un añadido, es la mitad del trabajo.** En modo
privado, con cookies bloqueadas o en un iOS que decida limpiar el origen, hay navegadores
que **lanzan al solo leer `window.indexedDB`**, no al usarlo — por eso el acceso va dentro
del `try`. Y el modo privado de Firefox deja la petición colgada sin error ni éxito, así
que hay un tiempo límite de 3 s. En todos esos casos se cae a memoria y la actividad se
juega igual: lo único que se pierde es recordar que se jugó, y eso nunca justifica una
pantalla de error.

**El test de «cero datos personales» es una lista blanca explícita**, no una comprobación
de que falten campos concretos. Si alguien añade uno, el test falla y le obliga a pasar por
ahí y preguntarse si sigue siendo verdad que no identificamos a nadie. La fecha se redondea
al día: saber a qué hora exacta jugó un niño no aporta nada pedagógico y sí acerca el dato
a ser identificativo.

**En el catálogo se marca lo ya hecho, y solo eso.** Un tick del tamaño del texto. Sin
puntos, sin racha, sin porcentaje: es orientación para el maestro, no recompensa para el
niño. Regla 4 de `CLAUDE.md`.

`borrarTodo()` existe desde el principio aunque aún no tenga botón: es lo que permitirá
decirle a una familia «puedes borrarlo todo tú, ahora, sin pedírnoslo».

### T1.6 — PWA y modo sin conexión `[x]`

Cerrada el 2026-09-06.

- [x] Precache del *app shell*, muestras de audio y fuentes — 44 entradas, 495 KB
- [x] Botón explícito «Descargar para usar sin conexión» con barra de progreso y aviso de MB
- [x] Comprobador de actualización al recuperar el foco
- [x] Presupuesto: `npm run build && node tools/presupuesto.mjs` pasa (86 KB gzip de 400)

**La descarga es explícita a propósito.** El service worker precachea el armazón, pero el
contenido lo descarga el maestro cuando lo pide y sabiendo cuántos megas son. Bajar decenas
de megas sin avisar, en la tarifa de datos de alguien que abrió la app en el patio, sería
un abuso. La barra de progreso cuenta ficheros reales, no es una animación.

**La actualización no se aplica sola.** `registerType: 'prompt'`: aparece un aviso que se
puede cerrar con «ahora no». Una app que se recarga sola a mitad de actividad, delante de
veinticinco niños, es peor que una app desactualizada. Se comprueba al recuperar el foco y
como mucho cada dos minutos, porque un aula la usa en ráfagas de quince.

**Pantalla `/ajustes`, y es para el adulto**: descarga, espacio ocupado, cuántas actividades
hay registradas, y el botón de borrar el progreso a la vista y no escondido tras tres menús.
Dice además, con todas las letras, qué se guarda: es lo que permite que un maestro se lo
explique a una familia sin tener que creerse nada.

**Un fallo mío que atrapó el linter.** `sinConexion.ts` llamaba a `fetch` directamente y la
regla de ESLint lo rechazó: `src/datos/cargar.ts` es el único sitio que habla con la red.
La respuesta correcta no era eximirlo sino añadir `pedirRespuesta()` allí, porque la regla
no es «no uses fetch», es «que nadie pueda pedir algo a un tercero sin que se vea en ese
fichero». Ahora `tests/sinConexion.test.ts` lo comprueba automáticamente, junto con que no
haya ninguna URL absoluta en `src/` y que la CSP siga prohibiendo otros orígenes.

### T1.7 — Sampler y metrónomo reales `[x]`

Cerrada el 2026-09-06.

- [x] 6 muestras CC0 de marimba (F3, C4, G4, B4, F5, C6) de la Versilian Community
      Sample Library
- [x] Opus 48 kbps mono, **63,6 KB el instrumento entero** — el objetivo eran ~70 KB
- [x] Calibración de latencia («da tres palmadas al ritmo»), guardada en el dispositivo
- [x] Test de que el metrónomo no usa `setInterval` — hecho en T1.3

**El hallazgo que explica parte de «los sonidos son raros»**: las muestras crudas de VCSL
van de **−29 a −39 dBFS** según la nota. Diez decibelios de diferencia entre notas del
mismo instrumento no suenan a matiz, suenan a error: el niño oye que unas notas «funcionan»
y otras no. `tools/muestras-instrumento.py` normaliza el pico a −3 dBFS antes de codificar.

**Y un error que costó dos intentos**: el recorte de silencio con umbral absoluto se comía
enteras las notas agudas, que son más flojas — C6 pasaba de 1,7 s a 0,12 s. El umbral tiene
que ser **relativo al pico de cada muestra**. La herramienta ahora falla si una muestra sale
de menos de un cuarto de segundo, para que no vuelva a colarse.

**La calibración mide el bucle completo**: salida de audio, altavoz, aire, oído, mano y
pantalla. Ninguna API del navegador conoce eso entero, y las que hay no bastan — Chromium
declara 52 ms en un PC de sobremesa y **Firefox declara `baseLatency = 0`**, que no es una
latencia buena sino un dato ausente. Se descartan los dos primeros pulsos, porque nadie
acierta el ritmo antes de haberlo oído, y se rechaza la medida si la desviación típica pasa
de 60 ms: eso no es latencia, es que la persona no estaba marcando el pulso.

`tests/sampler.test.ts` protege lo que desafinaría todo el proyecto sin que nadie lo note:
que el `playbackRate` sea la razón correcta, que se elija siempre la muestra más cercana y
que dentro de la tesitura infantil (C4–E5) nunca se estire más de tres semitonos.

### T1.8 — Actividades de esfuerzo S `[~] 14 de 20`

Trabajada el 2026-09-06. **No están las veinte, y no por falta de tiempo.**

- [x] JSON generado y validado: **15 actividades** en `content/actividades/`
- [x] `npm run contenido:validar` pasa 15/15
- [ ] Revisión visual en lote — pendiente, ver T1.12
- [ ] Revisión pedagógica (las tres preguntas de `docs/06-PIPELINE-IA.md`)

**De las 20 de esfuerzo S, 14 tienen un motor que exista.** Las otras 6 son de tipos que
son de la Fase 2: tres `lienzo`, dos `seguir` y una `pentagrama`. No se pueden escribir
todavía porque el motor que las ejecutaría no está.

De esas 14, están hechas 12. Las **dos que faltan se dejan a propósito**:

| | Por qué no |
|---|---|
| **C3-08 «¿De quién es esta música?»** | Necesita repertorio real y atribuible. Toda canción se verifica contra una fuente de dominio público **antes** de entrar (`CLAUDE.md` §10), y el plazo español son 70 años, **u 80 si el autor murió antes del 7-12-1987**. No es contenido que se pueda improvisar |
| **C2-12 «Canon a dos voces»** | Lo mismo: hace falta un canon de dominio público verificado, con su fuente documentada |

**El sonido y el aspecto son andamiaje**, y así consta en T1.12. Las actividades de timbre
usan la marimba CC0 real; las de tempo y de acorde usan síntesis propia. Suenan a lo que
son: a placeholder.

**Pendiente de revisión pedagógica, y son decisiones que ha tomado un desarrollador:**

- Los tempos de C2-09 (adagio 66, andante 92, allegro 138) son los convencionales de
  diccionario, pero los rangos varían según la fuente. A esta edad lo que importa es que
  se distingan, no la precisión.
- La dificultad de C3-05 «¿Mayor o menor?». Musicalmente no hay nada que inventar —mayor
  es [0,4,7] y menor [0,3,7], y lo único que cambia es la tercera— pero **si eso es
  discriminable en 5.º y 6.º lo dice una maestra, no yo**.
- Las coreografías de INF-12 y los pasos de C1-10 son secuencias didácticas convencionales.

**Un fallo de etiquetado que cazó el propio validador.** El esquema limitaba `duracion_min`
a 20 y dos guías de aula duran 35 y 45 minutos. El límite era correcto pero estaba en el
sitio equivocado: **20 minutos es el tope de PANTALLA para un niño, no el tope de una
sesión de clase**. Se sube el máximo del esquema a 60 y la regla real pasa a
`tools/validar.py`, que la aplica solo cuando `lugar: pantalla`. Al hacerlo, el validador
destapó que TR-02 estaba mal etiquetada: es un metrónomo proyectado, así que el aula lo
mira pero ningún niño está delante de una pantalla 45 minutos. Corregida a `hibrida`.

### T1.9 — Legal y créditos `[x]`

Cerrada el 2026-09-06.

- [x] Aviso legal y política de privacidad, **más versión para niños con pictogramas**
- [x] Pantalla de créditos generada desde el campo `creditos` de cada actividad
- [x] Hoja de trazabilidad de assets al día (`THIRD-PARTY-NOTICES.md`)
- [x] CSP verificada **en producción**, no en local

**La versión para niños no es un extra amable: es el art. 12 del RGPD**, que exige que la
información dirigida a menores esté en lenguaje que puedan entender. Cumplir eso con un
texto de abogado en cuerpo 10 no lo cumple. Son cuatro frases, cada una con su pictograma,
y **es la que se ve primero**. El dibujo acompaña al texto y nunca lo sustituye: un
pictograma solo se interpreta mal, y un texto solo no lo lee un niño de cinco años.

**Los créditos se generan, no se escriben.** Salen del campo `creditos` de cada actividad y
se agrupan por obra. Una lista mantenida aparte se desincroniza el día que alguien añade
una actividad con prisa, y entonces estaríamos atribuyendo mal material ajeno, que es
exactamente lo que su licencia prohíbe.

**Cada promesa dice dónde comprobarla.** La política no dice «respetamos tu privacidad»,
dice que la CSP incluye `connect-src 'self'`, que eso impide técnicamente enviar nada a
otro servidor, y que se puede ver en las cabeceras de la respuesta con las herramientas del
navegador. Es la diferencia entre afirmar y demostrar.

**`npm run comprobar:produccion`** hace esa comprobación automática contra el despliegue
real: las cinco directivas de CSP que no se negocian, las cabeceras de seguridad, que los
ficheros declarados existan **mirando el `Content-Type` y no el código de estado** —con
`not_found_handling: single-page-application` un fichero que falta devuelve 200 con el
`index.html`, y así se colaron los iconos y las tipografías durante meses— y que las rutas
del router respondan. Ejecutado el 2026-09-06 contra producción: **todo correcto**.

### T1.9c — Iconos de la PWA `[x]`

Cerrado el 2026-09-06, en el primer despliegue real.

`manifest.webmanifest` declaraba `/icono-192.png` y `/icono-512.png`, y **ninguno de los
dos existía**. Chrome de Android exige ambos para ofrecer «Instalar aplicación», así que la
fila de «PWA instalada» de `docs/pruebas/microfono.md` era imposible de rellenar.

- [x] `tools/iconos.py` los genera con la misma geometría que `public/favicon.svg`, para
      que la marca no se desincronice: si cambia el favicon, se cambian las mismas cinco
      formas y se vuelve a ejecutar
- [x] El `maskable` es un fichero **distinto**, con 20 % de margen por lado. Android
      recorta en círculo, gota o cuadrado según el fabricante, y reutilizar ahí el icono
      normal le cortaba la anilla del cascabel
- [x] `tools/comprobar-dist.mjs` rompe el build si vuelve a faltar

**Por qué no se vio antes, y es lo importante**: `not_found_handling:
"single-page-application"` hace que **cualquier fichero que falte devuelva 200 con el
`index.html`**. Un `curl -w '%{http_code}'` decía «200» y mentía; solo el `Content-Type`
delataba que llegaba `text/html` donde debía llegar un PNG. Esta clase de fallo es
invisible por diseño, y por eso ahora la comprueba el build y no el ojo.

### T1.9b — Las tipografías `[x]`

Detectada el 2026-09-06 en el primer despliegue y cerrada el mismo día. `tokens.css`
declaraba dos `@font-face` cuyos ficheros **no existían desde el andamiaje**: daban 404 y
el navegador caía en silencio a la tipografía del sistema.

- [x] Andika 7.000 (SIL, OFL 1.1) y Bravura (Steinberg, OFL 1.1), de sus repositorios
      oficiales
- [x] Anotadas en `THIRD-PARTY-NOTICES.md` con fichero, obra, autor, URL, licencia, fecha
      y cómo se comprobó
- [x] Andika entra en el precache; Bravura **no** (ver abajo)
- [x] El build falla si faltan: `tools/comprobar-dist.mjs`, ya sin excepciones pendientes

**Andika va recortada de 289 KB a 40 KB**, un 86 % menos, con `tools/fuentes.py`. El
paquete completo cubre cirílico, griego y AFI; nosotros necesitamos latino con sus
suplementos, que llega para castellano y para las lenguas cooficiales de T3.2. Verificado
que conserva `áéíóúüñ¿¡çàèòŀ€`, las comillas tipográficas y el kerning.

**Bravura no se recorta y no se precachea.** No se recorta porque sus glifos viven en el
Área de Uso Privado según SMuFL y recortar por rangos la rompe. No se precachea porque son
316 KB que no usa nada hasta T2.2: se descargarán el día que aparezca un pentagrama, no en
la primera visita de todos los niños. El precache sube de 446 a 486 KB, solo lo de Andika.

**Sobre la OFL, que es fácil de incumplir sin querer**: permite modificar y redistribuir, y
exige conservar el aviso de licencia —está por partida doble, en `Andika-OFL.txt` y dentro
de la tabla `name` de la propia fuente—. Prohíbe vender las fuentes por separado y usar los
Nombres Reservados en una versión modificada. El recorte no cambia el nombre porque no
altera ningún trazo, solo elimina glifos; si algún día se retocan, hay que renombrar.

### T1.12 — Aspecto y sonido `[x]`

Abierta y cerrada el 2026-09-06, a partir de la primera prueba real del autor:

> «Las actividades son funcionales pero son muy feas, poco usables, con sonidos raros.»

- [x] **Sonido**: todo el audio del proyecto son ya muestras **reales CC0** de la Versilian
      Community Sample Library. Solo queda sintética `voz-la.opus`
- [x] **Iconos**: **OpenMoji** (CC BY-SA 4.0), 27 iconos en 68 KB
- [x] **Color**: paleta viva, con contraste comprobado
- [x] **Modales** de explicación previa y de celebración, e indicador entre ejercicios
- [x] **Arrastrar y soltar** como vía adicional
- [ ] **Personajes**: sigue siendo decisión de producto, no técnica
- [ ] Revisión con las tres preguntas de `docs/06-PIPELINE-IA.md` — es T0.3

**OpenMoji es CC BY-SA 4.0, la misma licencia que ya tienen nuestros contenidos**, así que
no añade ninguna obligación nueva: atribuir, que se hace en la pantalla de créditos, y
compartir igual, que ya hacíamos. Y son iconos **concretos**, que es la regla 3: un niño de
cuatro años reconoce un elefante dibujado, no reconoce una silueta gris. Donde antes había
abstracciones ahora hay lo que la actividad significa — tortuga, persona andando y conejo
para adagio/andante/allegro; ratón y elefante para agudo/grave; caracol y conejo para
largo/corto.

**Los sonidos sintetizados se han ido casi todos.** Pandero real (*frame drum*), claves,
campanilla nepalí y glockenspiel. Los tempos son una claves de verdad repetida al pulso, y
los acordes de mayor/menor son tres glockenspiel transpuestos y mezclados: un seno con
envolvente no suena a percusión, suena a pitido de microondas, y el niño lo nota aunque no
sepa decir por qué.

**Y un fallo que solo se ve escuchando**: las muestras crudas de percusión afinada duran
**siete segundos** porque la lámina sigue vibrando. En una actividad de discriminación eso
es una eternidad — el niño espera siete segundos por estímulo y abandona. Recortadas a 2,5 s
con desvanecido. El audio entero del proyecto son 333 KB.

**El arrastre, y por qué se puede.** `CLAUDE.md` §6 dice «nada de arrastrar **como única
vía**», y WCAG 2.5.7 exige alternativa, no prohíbe arrastrar. Así que:

- En el carril **`infantil` no existe**, y no es configurable: a los cuatro años la
  motricidad fina no da para soltar con precisión.
- En los otros dos es **adicional**: el toque sucesivo sigue funcionando exactamente igual,
  y quien va con teclado o con el dedo no pierde nada.
- Hay un umbral de 8 px antes de considerar que es un arrastre. Sin él, un niño que toca
  con el dedo apoyado dispara arrastres sin querer.
- Se usan eventos de puntero y no la API de arrastre de HTML5, que no funciona con dedo en
  móvil sin *polyfill*.

**Los modales van sobre `<dialog>` nativo**, no sobre un `<div>` con `role="dialog"`: el
navegador ya atrapa el foco, lo devuelve al cerrar, cierra con Escape y oculta el resto a
los lectores de pantalla. Reimplementar eso a mano es donde se hacen inaccesibles casi
todos los modales. Y **el de éxito no lleva puntuación, ni porcentaje, ni racha, ni
estrellas**: la regla 4 lo prohíbe, y el dosier lo llama la mitad tóxica de Duolingo.

### T1.13 — Estética de tablero, y tres fallos que salieron probando `[x]`

Cerrada el 2026-09-06, a partir de la segunda prueba real del autor. Los tres fallos que
encontró **eran defectos míos** y ninguno lo había cazado un test.

**1. El modal de éxito era ilegible en modo oscuro.** Añadí los tokens `--suave-*` como
fondos claros **solo en `:root`**, sin su pareja en el bloque de modo oscuro. Ahí `--tinta`
pasa a ser clara: texto claro sobre fondo claro. Arreglada la paleta entera y añadido
`tests/tokens.test.ts`, que exige que **todo token de fondo tenga versión en los dos
esquemas** y que **toda superficie de color declare su color de texto**. Ese test encontró
de paso una segunda superficie con el mismo problema que se me había escapado.

**2. La aguja del afinador se disparaba a la izquierda.** Sin plegar por octavas, un adulto
que canta la nota correcta **una octava por debajo** —lo natural en una voz masculina— daba
**−1200 cents** y saturaba la aguja. Musicalmente estaba cantando la nota; el código decía
que no. Ahora se pliega a la octava más cercana: **cantar la nota en tu octava es cantarla**.
Y la aguja muestra la mediana de las últimas cinco lecturas, porque hablar produce alturas
que van y vienen y sin suavizar parece rota.

**3. El botón «Escuchar» del modal no hacía nada.** Aparecía siempre, deshabilitado, porque
no hay locuciones grabadas todavía. Un botón que no hace nada es peor que no tenerlo: el
niño lo toca y concluye que la app está rota. Ahora solo existe si hay algo que escuchar.

**Estética.** 47 ilustraciones de OpenMoji en 128 KB, con personajes, animales e
instrumentos y no solo iconos pequeños. Las tarjetas de opción llevan **fondo de color** y
la ilustración ocupa el 62 % del botón: lo que se toca es el dibujo, y para un niño que no
lee el texto sencillamente no está.

**Cuenta atrás** antes de las actividades de ritmo y canto. No es un cronómetro —la regla 6
los prohíbe— y no mide lo que tardas: solo dice cuándo se empieza. Sin ella, la mitad de las
palmadas se perdían mientras el niño todavía miraba la pantalla, y en clase entera hacen
falta veinticinco arranques a la vez. Se puede saltar tocando.

**Modo pizarra digital**, en Ajustes. Escala los tokens desde `<html>`, así que **agranda
todas las pantallas sin rediseñar ninguna** y sube el contraste, porque un proyector con luz
ambiente se come los grises. Se activa a mano: una tablet no debe agrandarse sola.

**Pendiente**: las ilustraciones son emoji, que resuelven «concreto y reconocible» pero no
dan identidad propia. Los personajes del proyecto siguen siendo decisión de producto.

### T1.10 — Despliegue

> **Ojo con el flujo elegido.** Se ha usado el de **Workers** (`npx wrangler deploy`), no
> el de Pages. Consecuencias que ya han mordido: el fallback de SPA se configura en
> `wrangler.jsonc` y **no** con `public/_redirects` —tener los dos hace que Cloudflare
> rechace el despliegue por bucle infinito, código 100324— y wrangler intenta reconfigurar
> el proyecto solo si no encuentra `wrangler.jsonc` en el repositorio. Por eso está ahí.



- [ ] Cloudflare Pages conectado a `main` de `github.com/jarruego/cascabel`
- [ ] Dominio propio con HTTPS
- [ ] `public/_headers` aplicándose de verdad (compruébalo en la respuesta real)
- [ ] Analítica: Umami autoalojado o nada. **Nunca Google Analytics**

---

### T1.11 — `npm run verificar` tiene que pasar en Windows `[x]`

Detectado y cerrado el 2026-09-06. La puerta de commit no comprobaba nada:

- [x] `contenido:validar` invocaba `python3`, que en Windows es el alias de la Microsoft
      Store. Ahora pasa por `tools/validar.mjs`, que resuelve el intérprete de verdad
- [x] Faltaban `jsonschema` y `music21`: el validador se saltaba **toda** la comprobación,
      avisaba, y aun así terminaba con «3/3 correctas». Ahora eso es un error, no un aviso
      (`--permisivo` lo degrada a aviso a propósito, y nunca debe usarse en CI)
- [x] Vía elegida: intérprete detectado por `tools/interprete.mjs`, con `.venv` primero.
      `npm run contenido:preparar` lo monta. Docker sigue siendo la alternativa
- [x] La consola de Windows (cp1252) reventaba al imprimir `✓` después de validar bien
- [x] **La comprobación de compases no funcionaba**: el parser de ABC de music21 parte un
      compás desbordado en dos trozos que miden bien por separado, así que cinco negras en
      un 4/4 pasaban. Se sustituye por tres reglas: total múltiplo del compás, anacrusa que
      complementa al último compás, e interiores completos
- [x] `tests/validador.test.ts` con seis actividades de referencia

**Nota**: `requirements.txt` fija `music21==10.5.0`, que exige **Python ≥ 3.11**. En esta
máquina `python` es 3.10 y `py -3` es 3.11; por eso el resolver prueba varios candidatos en
vez de fiarse del primero.

**Limitación conocida**: un error que se compensa a sí mismo (un compás de 3 seguido de uno
de 5 en un 4/4) es indistinguible de una anacrusa de 3 con final de 1, y pasa. Para
detectarlo habría que medir las barras del ABC en crudo, y no compensa hoy.

---

## Fase 2 — El producto real (2–3 meses)

- [x] **T2.1 — Tipo `rejilla`** `[x]` — cerrado el 2026-09-06. Cuadrícula altura × tiempo,
      con dos modos que cambian el diseño entero.

      **En modo `libre` no existe el error**: no hay solución, no hay botón de comprobar y
      no se puede fallar. Es un lienzo, y es la regla de Incredibox que el dosier señala
      como el mejor modelo de motivación infantil del sector. En `dictado` sí hay solución,
      y **lo que sobra y lo que falta se señalan distinto**, porque poner de más y poner de
      menos no son el mismo error y al niño hay que decírselo de otra manera.

      Lo que sobra parpadea y lo que falta lleva borde discontinuo: **forma, no color**. Con
      `prefers-reduced-motion` el parpadeo se sustituye por un borde doble.

      Dos actividades del catálogo: **C1-04 «Constructor de ritmos»** (libre) y
      **C2-02 «Dictado rítmico»**.
- [x] **T2.2 — Tipo `pentagrama`** `[x]` — cerrado el 2026-09-06. VexFlow dibuja la pauta
      y la clave; encima van hitboxes transparentes del tamaño táctil del carril.
      `c2-01-coloca-la-nota` ya funciona.

      **El truco es el de `docs/04-DISENO-UI.md`**: la nota se dibuja pequeña y
      tipográficamente correcta, y el hitbox mide 75, 60 o 48 px según el carril. Un dedo de
      siete años no acierta un espacio de doce píxeles, y agrandar la pauta la haría dejar
      de parecer una partitura. El hitbox se hace visible al enfocar con teclado: invisible
      para quien no lo necesita, evidente para quien navega con Tab.

      **Reutiliza la máquina de `eleccion`.** Las reglas son las mismas —un fallo repite y
      da pista, nunca termina— y duplicarlas habría duplicado la posibilidad de romperlas.

      `tests/pentagrama.test.ts` fija lo que es fácil implementar con un signo cambiado:
      que la segunda línea sea SOL en clave de sol, que los espacios deletreen FA-LA-DO-MI,
      y que la coordenada Y se invierta bien —la música cuenta hacia arriba y el DOM crece
      hacia abajo—. Con el signo al revés todo aparece reflejado sin que falle nada.

      **Una regresión que casi se cuela**: al añadir VexFlow, el precache pasó de 785 KB a
      **1891 KB**, porque el patrón lo pillaba. Eso son 1,9 MB que se bajaría todo niño en
      su primera visita, sobre el wifi de un colegio, para una librería que usa UNA
      actividad de quince. Excluido del precache, como Bravura: se carga cuando se abre un
      pentagrama. `tests/presupuesto.test.ts` vigila que no vuelva a entrar.
- [x] **T2.3 — Tipo `seguir`** `[x]` — cerrado el 2026-09-06. Musicograma con cursor.
      El niño no responde nada: mira y sigue. Es la actividad más pasiva del catálogo y a
      la vez de las más útiles, porque es donde se aprende que la música avanza en el
      tiempo y que lo que suena se puede dibujar.

      **El cursor va por `requestAnimationFrame`, no por el planificador de audio.** Animar
      dentro del planificador adelanta el destello hasta cien milisegundos respecto al
      sonido, y a esta edad esa es la diferencia entre entender el pulso y no entenderlo.

      El bloque activo crece **además de** cambiar de color, y con `prefers-reduced-motion`
      engorda el borde en vez de escalar. Actividad: **C1-01 «Ta y ti-ti»**.
- [x] **T2.4 — Tipo `tocar-a-tiempo`** `[x]` — cerrado el 2026-09-06. Escucha el patrón,
      lo repites con palmadas o tocando, y se evalúa con compensación de latencia.
      `c1-02-palmea-el-ritmo` ya funciona.

      **El resultado nunca es un porcentaje.** Se muestran desvío medio **con signo** y
      desviación típica por separado, porque un niño que da todas las palmadas 120 ms tarde
      con 20 ms de desviación tiene un pulso excelente y solo desfasado — y un porcentaje le
      diría que ha fallado. El mensaje sale de esos dos números, no de los aciertos.

      **El micrófono degrada a toque en silencio** (regla 8). El botón grande está siempre,
      también cuando el micrófono funciona: un niño que prefiere tocar no tiene por qué
      explicárselo a nadie. Y en clase entera el toque no es el plan B: veinticinco
      micrófonos abiertos son inutilizables.

      **El patrón se ve además de oírse**, con las sílabas de Kodály iluminándose al pulso.
      Criterio 1.1.1: un alumno sordo tiene que poder hacer la actividad mirando. El
      silencio (`sh`) se distingue por forma —borde discontinuo—, no solo por color.

      `tests/rejillaRitmica.test.ts` fija el signo de la compensación de latencia, que es
      donde este tipo de código se rompe sin que se note: si se resta en vez de sumarse, el
      error se duplica en lugar de anularse. Hay un caso con los 52 ms reales medidos en
      Chromium que comprueba que un niño puntual sale puntual.

      `tests/degradacion.test.ts` vigila la regla 8 en todo el repositorio: que ningún
      componente arranque el micrófono fuera de un `try`, que toda actividad de micrófono
      declare alternativa, y que ninguna use arrastre.
- [x] **T2.5 — Tipo `cantar`** `[x]` — cerrado el 2026-09-06, sobre el detector que T2.0
      dejó en el 1,78 % de un núcleo.

      **La aguja de afinación se mueve mientras se canta**, no al final: el niño ve hacia
      dónde moverse cuando todavía puede hacer algo. La franja central de «afinado» se ve,
      así que el objetivo es un sitio al que llegar y no un número abstracto.

      `src/motor/afinacion.ts` separa **promedio y estabilidad**, igual que la evaluación
      rítmica separa desvío y desviación típica. Un niño que canta 70 cents bajo pero
      clavado sabe sostener la nota y solo está transportando; uno que oscila 80 arriba y
      abajo acierta la media y no sostiene. Decirles lo mismo a los dos es mentirles a los
      dos. Se usa **mediana y no media**, porque un error de octava son 1200 cents y con
      media se llevaría el resultado por delante.

      **La ventana de «afinado» es de ±50 cents**, no de ±10. Un adulto entrenado afina a
      diez; exigírselo a un niño de siete años sería decirle que desafina siempre.
      *Pendiente de revisión pedagógica*: la cifra sale de práctica coral infantil
      documentada, pero la ha fijado un desarrollador.

      **Sin micrófono no se cierra la actividad**: cae a un modo de escucha en el que suena
      la nota y el niño canta sin que nadie le mida. Cantar sin que te evalúen sigue siendo
      cantar, y una pantalla de error delante de un niño con mutismo selectivo sería lo
      contrario de lo que este proyecto promete.

      **Detalle de iOS**: la nota suena ANTES de abrir el micrófono, nunca a la vez.
      `getUserMedia` redirige la salida de audio y baja el volumen, así que hacerlo a la
      vez dejaría al niño sin oír la referencia que tiene que imitar.
- [x] **T2.6 — Estado en la URL** `[x]` — cerrado el 2026-09-06. `aParametro` y
      `desdeParametro` en `src/datos/compartir.ts`, con base64 **url-safe**: sin convertir
      `+` y `/` en `-` y `_` y quitar el relleno, la mitad de los enlaces se rompen al
      pegarlos en WhatsApp o en un correo. Una URL manipulada devuelve `null` y la
      actividad se abre vacía, en vez de romper la app.
- [x] **T2.7 — Códigos de verificación** `[x]` — cerrado el 2026-09-06. El patrón de
      musictheory.net que el dosier manda copiar literalmente: el alumno termina, recibe un
      código de siete caracteres y se lo enseña; el maestro lo teclea en `/comprobar`.
      **Evaluación con evidencia, sin cuentas de alumno.**

      **El alfabeto no tiene `I`, `O`, `0` ni `1`.** Los códigos los copia a mano un niño de
      ocho años, y confundir cero con o es el error más frecuente que existe. Lleva además
      un dígito de control ponderado por posición, que detecta tanto una letra cambiada como
      dos intercambiadas.

      **No identifica a nadie**, y el test lo fija con una lista blanca: el código dice que
      *alguien* completó *esa* actividad con *esos* aciertos *ese* día. Quién se lo enseña
      lo sabe el maestro porque lo tiene delante — es como un sello en una libreta, y por
      eso no hay nada que declarar.
- [x] **T2.8 — Fichas imprimibles** `[x]` — cerrado el 2026-09-06. Ruta `/ficha/:id`,
      generada **desde el mismo JSON** que ejecuta la actividad.

      **Sin librería de PDF.** El navegador ya sabe imprimir a PDF; meter jsPDF serían
      trescientos kilobytes en el bundle para hacer peor lo que el sistema hace bien. Lo
      que faltaba no era un generador, era una vista pensada para papel.

      **Una ficha no es la pantalla en papel**: en pantalla hay un ejercicio interactivo, y
      en papel hacen falta el enunciado, **todo** el contenido desplegado —en papel no hay
      interacción que revele las opciones— y sitio para escribir. Las líneas para escribir
      se imprimen en negro, porque el gris de pantalla desaparece en una impresora de
      colegio. La atribución CC BY-SA va impresa: la licencia obliga también en papel.
- [~] **T2.9 — Catálogo** `43 de 54` — segundo lote el 2026-09-06. De 20 a **43
      actividades**, todas validando. Reparto: 16 de Infantil, 14 de 1.er ciclo, 8 de 2.º y
      5 de 3.º; ocho de `eleccion`, ocho de `lienzo`, ocho de `guia-aula`, cuatro de
      `rejilla`, cuatro de `tocar-a-tiempo`, tres de `seguir`, tres de `ordenar`, dos de
      `emparejar`, dos de `cantar` y una de `pentagrama`.

      **Las once que faltan no se hacen por una razón concreta**, no por falta de tiempo:

      | Motivo | Cuáles |
      |---|---|
      | **Repertorio verificado** | C3-08 «¿De quién es esta música?», C2-12 «Canon a dos voces», C3-04 «Mapa de una obra». **La investigación del 2026-09-06 encontró PDMX: 250 000 partituras MusicXML, todas CC0** (ver `11-RECURSOS-Y-REFERENTES.md`). Eso desbloquea la vía, pero **no elimina la verificación**: CC0 se refiere a la transcripción, y la obra subyacente sigue sujeta a los 70 años españoles, **u 80 si el autor murió antes del 7-12-1987** |
      | **Material que no tenemos** | C2-04 y C2-05, digitaciones de flauta dulce: hacen falta diagramas de posiciones. C2-11 «Instrumentos del mundo», que necesita timbres que no están en VCSL |
      | **Mecánica distinta** | C2-06 «Pon las barras de compás» y C3-01 «Tonos y semitonos» piden un pentagrama que se edita, no uno donde se coloca una nota |
      | **Grabación** | C2-13 «Graba tu paisaje sonoro» usa `MediaRecorder`, que `docs/08-LEGAL.md` restringe a un botón explícito y almacenamiento local con borrado a un clic. Es una tarea con implicaciones, no una actividad más |

      **Pendiente de revisión pedagógica**, y son decisiones de un desarrollador: las
      sílabas de síncopa y contratiempo (`ti-ta-ti`, `sh-ti`), la selección pentatónica de
      C2-07, las coreografías de las ocho `guia-aula` y las duraciones de sus pasos.
- [x] **T2.9b — El catálogo y las actividades se habían desincronizado** `[x]` — cerrado el
      2026-09-06. **Tres actividades escritas el mismo día se sentaron encima de códigos que
      el catálogo tenía reservados para otra cosa**: C2-11 era «Instrumentos del mundo»,
      C3-03 «Editor de melodías» y C3-04 «Mapa de una obra». Cada JSON era válido por
      separado y el validador pasaba en verde: **el fallo no daba ningún síntoma**, y el
      catálogo pasó a decir una cosa distinta de la que había en disco.

      Renombradas a C2-14, C3-10 y C3-11. El esquema dice que un id **no se renombra nunca**
      porque puede estar en una URL compartida, y esa regla sigue en pie: se pudo hacer aquí
      solo porque tenían un día de vida y nadie las ha usado todavía. Con un mes más, la
      salida habría sido dejar el catálogo mintiendo.

      **Lo que arregla el fallo no es el renombrado, es la puerta**: `tools/validar.py`
      comprueba ahora que ninguna actividad ocupe un código reservado ni que dos compartan
      código, y **falla con salida 1**. Se probó introduciendo la colisión a propósito antes
      de darla por buena — y esa prueba pilló que el parche había escrito la función pero no
      la llamaba desde `main()`. Una comprobación que no se ha visto fallar no está hecha.

      Y el catálogo pasa a listar también lo entregado fuera de plan (C1-14, C1-15, C1-16 y
      TR-05): un backlog que no dice lo que ya existe no puede detectar este fallo.
- [x] **T2.10 — Auditoría de accesibilidad** `[x]` — cerrado el 2026-09-06, y hecha con
      **tests y no con una revisión manual**: una auditoría es una foto que caduca con el
      siguiente commit.

      `tests/accesibilidad.test.ts` vigila once invariantes en todo el repositorio: que nada
      interactivo se construya sobre un `div`, que ningún botón use `disabled` a media
      actividad —le arrebata el foco a quien navega con teclado—, que toda imagen declare
      `alt`, que los avisos cambiantes lleven `aria-live`, que el movimiento respete
      `prefers-reduced-motion`, que nada que se repita pase de 3 Hz, que **el color nunca
      sea lo único** que distingue dos estados, y que haya un solo `h1` por pantalla.

      **Encontró dos fallos reales**: `Privacidad.tsx` tenía dos `h1` —uno por versión, y
      aunque solo se pinte uno es frágil— y en `Lienzo.tsx` había una pista fija marcada
      como `feedback`, que es un nombre equivocado y no una falta de accesibilidad.

      Y **dos de mis propios tests estaban mal planteados**: uno buscaba `<img>` dentro de
      comentarios, y el otro aplicaba el límite de 3 Hz a transiciones que ocurren **una
      sola vez**. El criterio 2.3.1 habla de parpadeo repetido; un modal que aparece en
      180 ms no parpadea por rápido que sea.

      **Lo que ningún test puede comprobar** —si un lector de pantalla lo lee con sentido,
      si un niño con motricidad reducida llega a los botones— sigue necesitando a una
      persona con el dispositivo delante. Va con T0.3.

### El motor base, terminado `[x]`

Cerrado el 2026-09-06 con los tipos que `docs/01-ARQUITECTURA.md` planteaba al principio:
`eleccion`, `emparejar`, `ordenar`, `guia-aula`, `tocar-a-tiempo`, `pentagrama`, `rejilla`,
`cantar`, `seguir` y `lienzo`. Después se añadieron más; la lista viva está en
`docs/01-ARQUITECTURA.md` y `tests/documentacion.test.ts` la mantiene sincronizada.

**A partir de aquí, añadir una actividad no toca código.** Es escribir un JSON y validarlo.
Era la promesa del ADR 0001 y ya se puede cumplir.

Falta el tipo `lienzo` en su versión completa —hoy es un lienzo de altura, y el catálogo
prevé también dibujo libre sobre sonido y cuento sonoro— pero el motor existe y esas son
variantes de contenido, no de código.

### T2.11 — Navegación, piano y musicograma que cae `[x]`

Cerrada el 2026-09-06.

**Barra de navegación permanente**, abajo como una app de móvil. Va abajo y no arriba por
una razón física: **el pulgar de un niño no llega a la parte superior de una tablet** que
sostiene con las dos manos. Tres destinos y ni uno más —actividades, códigos, ajustes—
porque la regla 8 pide una sola navegación. **Se esconde dentro de una actividad**: un niño
a mitad de un ejercicio no necesita ver botones que le saquen de él.

**Piano en pantalla** (`tipo: teclado`). Sin librería: se miraron `x-piano`,
`Open-Web-Piano` y `virtual-keyboard-display`, y todas traen su propia gestión de audio, lo
que chocaría con la regla del `AudioContext` único. Sobre el `Sampler` que ya existe son cien
líneas. Las **teclas negras se pueden quitar** —en Infantil estorban: el niño busca el do y
se encuentra un bosque— y **se puede tocar deslizando el dedo**, que es lo primero que hace
un niño con un piano.

**Musicograma que cae** (`seguir` en `modo: 'cae'`). La parte difícil ya estaba hecha: el
cursor sincronizado por `requestAnimationFrame` y separado del planificador de audio.

> **Y una decisión que importa**: la mecánica de Guitar Hero entra **sin marcador, sin combo
> y sin poder fallar**. Lo que aporta es hacer visible que la música avanza en el tiempo; el
> marcador es exactamente lo que el dosier llama la mitad tóxica de Duolingo y lo que
> prohíbe la regla 4. Es un musicograma que se mueve, no un juego de puntos.

### T2.12 — Ritmos largos, piano con colores y musicograma sobre pentagrama `[x]`

Cerrada el 2026-09-06, a partir de las pruebas del autor.

**La cuenta atrás se movió de sitio.** Estaba antes de escuchar el ritmo, que es justo cuando
no hace falta: escuchar no requiere prepararse. Ahora va **antes de responder**, que es lo que
pide un músico y lo que pedía el autor.

**Marcas de golpe en vivo**, verdes al entrar y **grises al pasar de largo**. El autor pidió
rojo para el fallo; la regla 4 lo prohíbe literalmente, y «apagado» transmite que ese golpe se
fue sin decirle al niño que ha fallado. Se distinguen además por tamaño y por borde, no solo
por color.

**Ritmos de 8 y de 12 pulsos en bucle**, y **composición con la octava completa**, con opción
de escucha en bucle que **relanza cada pasada** para que lo que se edita se oiga en la vuelta
siguiente.

**Piano con el código de color Boomwhacker** —do rojo, re naranja, mi amarillo, fa verde, sol
turquesa, la azul, si morado— que es el estándar de facto en aulas de Primaria y el que una
maestra reconoce sin explicación. El color nunca va solo: cada tecla lleva su nombre debajo, y
la nota que suena aparece en grande.

**Musicograma horizontal sobre pentagrama** (`tipo: karaoke`), que es lo que pidió el autor:
las notas vienen **de derecha a izquierda sobre una pauta real** y se tocan al cruzar la línea
del presente.

> **Por qué es un tipo nuevo y no un modo de `seguir`.** En `seguir` el niño no responde:
> mira. Esa regla es la que permite que aquel componente no tenga evaluación ni solución, y
> meterle una mecánica interactiva la habría roto.

> **Por qué sobre pentagrama y no sobre carriles de colores.** Un juego de notas que caen
> enseña ritmo; sobre una pauta real enseña además que ese ritmo se escribe y que lo que sube
> en el dibujo sube al oído. Sale gratis: la nota tiene que estar a alguna altura.

**El repertorio, verificado.** El tema del cuarto movimiento de la Novena de Beethoven, que
el autor propuso. **Beethoven murió en 1827**: incluso aplicando los 80 años de la disposición
transitoria española, el plazo venció en 1907. Dominio público sin discusión posible. La
melodía se transcribió a ABC y se pasó por `music21` antes de escribir el JSON: **8 compases,
30 notas, ámbito do4–sol4, salto máximo de 2 semitonos**. El JSON se generó desde esa fuente
verificada, no a mano.

**Y se cambió de ciclo por lo que dijo el validador.** Se escribió para primer ciclo y
`npm run contenido:validar` avisó de que el puntillo de los compases 4 y 8 es poco habitual a
esa edad. Es cierto y es del propio Beethoven: no se puede simplificar sin falsear una melodía
conocida. Se movió a **segundo ciclo**, que es donde la convención sitúa el ritmo con puntillo.

**Un módulo con test para colocar notas fuera del pentagrama.** `alturaEnPauta.ts`, aparte de
`pentagramaPosiciones.ts` porque hace el camino contrario y sí necesita salirse de las cinco
líneas: la melodía baja a **do4**, que en clave de sol va en línea adicional. Una nota dibujada
a la altura equivocada **no da ningún síntoma** —se ve bien, suena bien y es mentira—, así que
lleva 13 tests, incluido uno que comprueba que los dos módulos no divergen.

**Lo que hay que probar en el aula**: si la ventana de acierto (la tolerancia `casi` del
carril) es la adecuada para tocar una melodía entera, y no solo un ritmo de cuatro golpes.
Eso no se decide midiendo, se decide viendo a un niño hacerlo.

### T2.13 — Ética del bloque B, el canon, y dos arreglos del musicograma `[x]`

Cerrada el 2026-09-06.

**Tres actividades que estaban mal clasificadas como bloqueadas.** El roadmap decía que
C3-08 «¿De quién es esta música?» esperaba repertorio verificado. **No era verdad**: el
catálogo dice que va de *licencias*, no de compositores, y su material —casos reales de
CC0, CC BY-SA, CC BY-NC y dominio público— **ya estaba escrito en nuestro propio
`THIRD-PARTY-NOTICES.md`**. Estuvo bloqueada por un motivo copiado, no comprobado.

- **C3-08**, ocho casos reales de licencias, todos sacados de los créditos de esta misma
  aplicación. Incluye la distinción que casi nadie hace: la **obra** y la **grabación** son
  dos permisos distintos, y por eso puedes usar la melodía de Beethoven pero no el disco de
  una orquesta actual.
- **TR-04**, la página de créditos convertida en clase, para el maestro. El catálogo la
  preveía de tipo `seguir`; `seguir` es un musicograma y aquí no hay nada que seguir, así
  que va de `guia-aula`. El catálogo se ha corregido con el tipo real.
- **C2-12, canon a dos voces.** La melodía es la de «Frère Jacques», cuya fuente conocida
  más antigua es un manuscrito de la BnF de hacia 1780 donde aparece como «Frère Blaise»;
  la única autoría que se le ha propuesto es la de Rameau, muerto en **1764**. Por
  cualquiera de las dos vías, dominio público con siglos de margen. **La letra en español
  es nuestra**: las traducciones escolares que circulan no tienen fuente comprobable, y no
  merece la pena arriesgar una letra pudiendo escribirla.

> **Y el validador volvió a hacer su trabajo**: el canon se escribió en do mayor y avisó de
> que el sol3 del «din, don, dan» queda por debajo de la tesitura de segundo ciclo. Se
> transportó a fa mayor —ámbito do4–re5, justo dentro— en vez de discutir con la máquina.

**El tipo `eleccion` acepta ahora estímulos escritos.** Era de solo audio, y las actividades
de ética no tienen nada que sonar: el estímulo *es* un caso escrito, y leerlo es justamente
lo que se practica. Se extendió el tipo existente en vez de crear uno nuevo, que es lo que
pide `CLAUDE.md` §11. De paso, el botón de repetir **desaparece cuando no hay audio**: un
botón muerto es peor que ningún botón, y ya nos pasó una vez.

**Dos arreglos del musicograma que salieron probando**, los dos del autor:

- **Color Boomwhacker por nota**, y el nombre de la nota **subiendo y desvaneciéndose** al
  acertar. El color y el nombre se extrajeron a `ui/coloresNota.ts`, que ahora comparten el
  piano y el musicograma. Con `prefers-reduced-motion` el nombre **sigue apareciendo**, solo
  que sin moverse: la información está en el nombre, no en el movimiento.
- **El piano se toca con el teclado del ordenador.** No hay estándar formal, pero sí una
  convención de facto que comparten Ableton Live, FL Studio, GarageBand y casi todos los
  pianos web: dos octavas apiladas, `ZXCVBNM` como blancas graves y `SDGHJ` como sus negras,
  `QWERTYU` y `2356 7` para la octava de arriba. El dibujo del teclado del ordenador
  **reproduce el del piano**, huecos de mi-fa y si-do incluidos. Se indexa por
  `KeyboardEvent.code` y no por `key`: `code` es la **posición física**, así que funciona
  igual en un teclado español, en uno inglés y en un AZERTY. Hay un test que lo vigila,
  porque cambiarlo a letras rompería los AZERTY sin que nadie se entere aquí.
- **Al pulsar, la tecla se tiñe de su color** y el nombre de la nota aparece en ese mismo
  color: el color y el sonido llegan juntos, que es lo que hace que uno se ate al otro.
- **Dos segundos de margen antes de la primera nota.** Sin ellos la melodía arrancaba en el
  instante cero y la primera nota **nacía justo encima de la línea**: no se podía anticipar,
  solo reaccionar, y se fallaba siempre. La cuenta atrás no lo arreglaba, porque termina
  justo cuando la nota ya está ahí. Ahora vive en `melodiaEnTiempo.ts`, con test: lo
  encontró el autor probando y no un test, así que ahora hay test.

### T2.14 — La ficha imprimible se rehace como dosier del maestro `[x]`

Cerrada el 2026-09-06, a petición del autor, y **corrige un error de enfoque de T2.8**.

La ficha imprimía la actividad en papel. **Eso era imprimir lo que sobra**: lo que hace
valiosa a una actividad de pantalla es justo lo que no se puede fotocopiar —que suena, que
responde y que se autocorrige—. Lo que sí se traslada al papel, y lo que un maestro necesita
de verdad, es el **criterio**: cómo llevarla al aula, qué proponer después, qué mirar
mientras la hacen y qué parte del currículo cubre para poder justificarla.

Tres hojas, cada una con un lector y un momento distintos:

1. **Cómo llevarla al aula.** Se lee de pie y con prisa antes de clase, así que va primero
   la ficha técnica —duración, si hace falta micrófono, si se puede sin dispositivos,
   agrupamiento— y después las propuestas: **sin dispositivos, para ampliar, para reforzar y
   qué observar**.
2. **Currículo**, con las **dos capas separadas** de `CLAUDE.md` §9 y dicho por escrito en la
   propia hoja: lo normativo literal arriba, la práctica («negra», «4/4») abajo y marcada
   como convención. Un campo sin confirmar se imprime en blanco, nunca inventado.
3. **Hoja de seguimiento**, con fecha y grupo pero **sin casilla de nombre del niño en la
   ficha**, tres indicadores y espacio para notas.

> **Dos decisiones de la hoja de seguimiento.** **Tres indicadores y no cinco**: una rejilla
> que no se puede rellenar dando clase no se rellena nunca. Y **no hay casilla de «no
> conseguido»**, solo conseguido, en proceso y en blanco: lo no observado y lo no logrado no
> son lo mismo, y una casilla que los confunde produce evaluaciones falsas.

> **Sobre los datos.** La hoja tiene columna de nombres y eso **no contradice la regla 3**:
> ese papel es del maestro, se escribe a mano y no entra en la aplicación jamás. La regla
> prohíbe que *nosotros* tratemos datos de un menor, no que un maestro tome notas. Va
> impreso en la propia hoja, para que se sepa quién custodia ese papel.

**La guía viene del TIPO de actividad, no de cada actividad.** Es la misma idea que el motor
aplica a los componentes: escribir 53 dosieres a mano habría envejecido igual de mal que
escribir 53 componentes. Cada tipo de motor trae su «cómo funciona», su versión sin
dispositivos, su ampliación, su refuerzo, qué observar y tres indicadores; y una actividad
concreta puede sobreescribir cualquiera de ellos desde el bloque `ficha` de su JSON.

**Y hay un test nuevo que vigila los textos**, `tests/textos.test.ts`. Un texto que falta no
da ningún error: `t()` devuelve la clave y todo lo demás sigue funcionando. En pantalla se
vería enseguida; **en una hoja que alguien manda a imprimir para el aula, no**. Comprueba
que toda clave literal exista, que ninguna traducción esté vacía y que **ningún tipo del
registro se quede sin guía**. Se probó rompiéndolo a propósito antes de darlo por bueno.

### T2.15 — El piano se toca en horizontal `[x]`

Cerrada el 2026-09-06. La primera versión usaba la disposición **apilada** de Ableton, FL
Studio y GarageBand: dos octavas partidas en dos mitades, `ZXCVBNM` abajo y `QWERTYU` arriba.
Es la convención más extendida y **el autor la encontró antinatural**, con razón: tener la
segunda octava encima de la primera en vez de a su derecha tiene sentido para quien piensa en
un secuenciador, no en un piano.

Ahora por defecto es **horizontal**: las blancas seguidas por la fila de la `A` y las negras
justo encima, en la fila de la `Q`. Y encajan exactamente — la `W` cae físicamente entre la
`A` y la `S`, igual que el do sostenido cae entre el do y el re, y **la `R` y la `I` no suenan
porque ahí el piano tampoco tiene negra**. El teclado del ordenador dibuja el piano.

> **Llega a do–fa′, una octava y media, y no a dos octavas.** No es una decisión: catorce
> blancas seguidas necesitarían catorce letras contiguas en una fila y la fila central tiene
> once. Es el límite físico del teclado. Quien quiera las dos octavas completas puede pedir
> `disposicionTeclado: 'apilada'` desde el JSON, y se sigue soportando.

Las letras se pintan **solo en las blancas y debajo del nombre de la nota**: encima de una
tecla negra no caben sin taparla, y las negras se explican en el texto de ayuda.

### T2.16 — La voz sintética, y la ficha más compacta `[~]`

Trabajada el 2026-09-06. **Queda abierta a propósito**: el cierre depende de una grabación.

El autor avisó de que la muestra de voz «no es una voz, es un sonido muy raro». Tenía razón
y estaba documentado como deuda: era lo único del banco sintetizado, y se usa en **tres
actividades de reconocimiento de timbre** donde lo que hay que identificar es *una voz*.

**Se buscó una alternativa libre y no existe la que hace falta.** VCSL no tiene voz —su
catálogo va por Hornbostel-Sachs y no hay categoría vocal—; la colección de la Universidad de
Iowa tampoco, y además no declara licencia; el coro de VSCO 2 está en la versión de pago y un
«aah» coral no es lo que se necesita; Commons tiene obras enteras, no notas sueltas. Queda
Freesound con filtro CC0, donde **sí** hay material, pero elegir una muestra vocal es un
juicio de oído y ese no se delega. Todo anotado en `11-RECURSOS-Y-REFERENTES.md` para no
repetir la búsqueda.

**Mientras tanto, síntesis de formantes.** Es lo que separa una voz de un tono: un formante
es una resonancia **fija** del tracto vocal, así que la envolvente del espectro se queda donde
está aunque cambie la nota. Lo que había eran cuatro armónicos de amplitud fija, cuya
envolvente sube y baja con la altura: eso es un órgano suave. Se le añaden además las tres
cosas que el oído usa para detectar a una máquina: **vibrato de entrada retardada** —una
persona ataca recta y el vibrato aparece después—, **jitter y shimmer** —ninguna voz sostiene
una nota perfectamente estable— y **aire** filtrado por los propios formantes.

> **Sigue siendo una imitación.** `CLAUDE.md` §6 pide voz humana grabada, y esto no lo es.
> Por eso la tarea queda abierta.

- [ ] Grabar un «laaa» de dos segundos y pasarlo por `tools/muestras-voz.py`

`tools/muestras-voz.py` convierte una grabación de móvil en muestra del banco: acepta lo que
acepte ffmpeg, recorta los silencios por energía en ventanas de 10 ms —no muestra a muestra,
que cortaría en cualquier cruce por cero—, **mide la altura por autocorrelación y avisa si no
coincide con la nota declarada** —el sampler transporta desde esa nota, así que una muestra
mal etiquetada desafina todo lo que se construya encima—, normaliza el pico a −3 dBFS como el
resto del banco y codifica a Opus. Probado con dos ficheros de altura conocida antes de darlo
por bueno: mide 440,4 Hz donde hay un la4 y 262,3 Hz donde hay un do4, y avisa del desajuste.

**Y la ficha, más compacta**, también a petición del autor: fuera el marco decorativo —no
decía nada que no dijera ya el blanco—, la ficha técnica en una sola línea con `flex-grow`
para que **el dato que salta ocupe todo el ancho él solo** en vez de partirse en dos
renglones estrechos, y cuerpo y espaciado reducidos para que no se corten las páginas. Al
imprimir el cuerpo va en **puntos y no en píxeles**, que es la unidad del papel.

### T2.17 — El borde de la ficha impresa: una colisión de nombres `[x]`

Cerrada el 2026-09-06. El autor avisó de que al imprimir seguía saliendo un borde gris
alrededor de toda la hoja.

**No venía de la hoja: `.ficha` nombraba dos cosas distintas.** Era a la vez la **tarjeta del
catálogo** —con `border: 2px`, `border-radius` y fondo— y la **hoja imprimible**. En
castellano las dos son «una ficha», así que el nombre parecía correcto en los dos sitios. La
hoja redefinía `padding` y `max-width`, con lo que *parecía* que mandaba, y el borde de la
tarjeta se colaba por debajo sin que nada avisara.

Se arregla **por el nombre y no tapándolo**: la tarjeta pasa a `.tarjeta`. Poner
`border: none` en la hoja habría hecho desaparecer el síntoma dejando las dos reglas peleando
para siempre.

**Y había un segundo ladrón de espacio en la misma zona**: `.catalogo, .ajustes, .legal,
.ficha { padding-bottom: 96px }`, el hueco para la barra de navegación. Al imprimir, la barra
se oculta pero **ese hueco seguía**, y como esa regla va después del bloque `@media print` y
tiene la misma especificidad, ganaba: casi tres centímetros de blanco al pie de cada hoja.

**Test que lo caza**, en `tests/tokens.test.ts`: ninguna clase puede declarar caja —`border`
o `background`— en dos reglas de primer nivel distintas. Se probó reintroduciendo la colisión
a propósito, y **la primera versión del test pasó en verde con el fallo puesto**: el
comentario que precede a cada regla quedaba pegado al selector, así que `'.ficha'` nunca
coincidía. Corregido quitando los comentarios antes de analizar, y vuelto a probar.

**Cabecera y pie pasan a ser marcas de agua** en el margen de la página, también a petición
del autor. Repetir tres veces el título y la atribución costaba casi cuatro centímetros de
alto en un documento donde el alto es justo lo que escasea. Ahora se colocan con
`position: fixed` y desplazamiento negativo, así que **caen dentro del margen de `@page`**:
se ven en todas las páginas y no gastan ni una línea. `position: fixed` es lo que hace que un
elemento se repita en cada página impresa, y por eso las marcas viven en el `<main>` y no
dentro de cada hoja — si estuvieran dentro de los tres `<article>` se apilarían las tres.

> La atribución sigue impresa: la CC BY-SA obliga también en papel. Que no ocupe sitio no
> significa que pueda faltar.

Y de paso se corrige algo que no se había visto: **la cabecera repetía un `<h1>` en cada
hoja**. Son tres páginas de un documento, no tres documentos, y tres `h1` le dicen lo
contrario a un lector de pantalla. Ahora la hoja 1 lleva el `h1` y las otras dos un `h2` con
el nombre de la hoja, que además es más útil que repetir el título de la actividad.

### T2.18 — El musicograma, en dos orientaciones y cinco representaciones `[x]`

Cerrada el 2026-09-06, a petición del autor: quería variedad y pidió que se valorara
pedagógicamente. **La valoración es la parte que importa**, y sale de una pregunta: ¿qué
puede significar el eje que no es el del tiempo?

| Representación | Qué enseña | Eje transversal | Edad orientativa |
|---|---|---|---|
| `icono` | que un sonido tiene un referente concreto | **ninguno** | Infantil |
| `color` | altura relativa, sin leer nada | **altura**, en carriles de color | Infantil y 1.º–2.º |
| `silaba` | duración (ta, ti-ti) | **ninguno** | 1.º–3.º |
| `figura` | duración escrita (♩ ♫) | **ninguno** | 3.º–4.º |
| `pentagrama` | altura y duración escritas | **la pauta** | 4.º–6.º |

> **Las representaciones de duración van en un solo carril, y eso no es negociable.** Una
> sílaba rítmica o una negra no dicen nada de la altura: colocarlas a alturas distintas le
> enseñaría al niño una relación que no existe, y de la forma más difícil de desaprender,
> que es sin decirlo. Está en `src/motor/musicograma.ts` con test.

**Y la orientación.** `vertical` —caen— no exige ningún sentido de lectura, así que sirve
antes de saber leer y es la natural para el ritmo. `horizontal` —vienen de la derecha—
reproduce cómo se recorre una partitura, así que corresponde cuando lo que se aprende es
justamente a leerla. El valor por defecto lo decide la representación, no hay que declararlo.

**PENDIENTE DE REVISIÓN PEDAGÓGICA**: la correspondencia entre edades y representaciones es
la convención habitual —Kodály para las sílabas, código Boomwhacker para los colores— pero
**dónde está el salto de una a otra lo dice una maestra**, no un desarrollador.

**«Sigue las notas que caen» pasa de `seguir` a `karaoke`.** Era un musicograma que solo se
miraba; el autor pidió que fuera como el del Himno de la alegría pero en vertical, o sea que
se toque. Con eso `seguir` se queda como lo que dice ser —mirar sin responder, sin evaluación
y sin poder fallar— y `karaoke` como lo que se toca. El id no cambia: puede estar compartido.

Tres actividades nuevas para que la variedad se vea, una por tramo:

- **INF-16 «Los animales que bajan»**: iconos, un solo carril, ocho pulsos a 60. Sin figuras,
  sin alturas y sin nada que leer.
- **C1-18 «La escalera que cae»**: cinco carriles de color, uno por nota. Aquí la altura **sí**
  significa algo, y la escalera sube y baja para que se vea moverse.
- **C2-15 «Lee las figuras»**: negras, blancas y corcheas en horizontal, y **cada figura ocupa
  lo que dura**, que es exactamente lo que dice la notación.

La pauta girada de la orientación vertical no es convencional —no existe en papel— pero
mantiene lo que importa: una nota más aguda queda más lejos en el mismo sentido en el que se
cuenta, y va a la derecha, como en un piano.

### T2.19 — Lenguaje visual, filtros y musicograma con bandas `[x]`

Cerrada el 2026-09-06. El autor preguntó si hacía falta una librería de componentes para que
dejara de parecer amateur. **La respuesta fue que no**, y conviene dejar escrito por qué,
porque es la clase de decisión que se vuelve a plantear cada seis meses.

Lo que hace que algo parezca amateur casi nunca es la falta de librería: es la escala
tipográfica, el ritmo del espaciado, la coherencia de radios y sombras y los estados de
pulsación. **Una librería no arregla nada de eso, sustituye nuestro diseño por el suyo.** Y
el suyo, en MUI, Chakra, Mantine o Ant, es un panel de administración para adultos con
objetivos táctiles de 36–40 px, contra los **75 px de Infantil** que aquí son contrato y
tienen tests. Habría que sobreescribirlo todo y quedarían dos sistemas de temas peleando.
Radix o React Aria sí encajarían filosóficamente, pero ya usamos `<dialog>`, `<select>` y
`<button>` nativos, que son más accesibles que casi cualquier reimplementación y pesan cero.

Así que se hizo el trabajo de diseño, no la instalación:

- **Escala de espaciado** de base 4. Había 10, 12, 14, 16, 18, 20, 22, 24, 26 y 28 px sueltos
  por el fichero, casi indistinguibles entre sí. **Esa es la diferencia que se nota sin saber
  nombrarla**: no es que un hueco esté mal, es que ninguno rima con los demás. Normalizados
  **216 valores**.
- **Escala tipográfica** de razón 1,25, y **jerarquía de titulares**, que no existía: los
  encabezados usaban los tamaños y márgenes por defecto del navegador, que son de 1996 y se
  notan. Con interlineado apretado, *tracking* ligeramente negativo —una tipografía de texto
  se separa demasiado al agrandarla— y **margen superior mayor que el inferior**, porque un
  titular pertenece a lo que va debajo y el espacio es lo que lo dice.
- **Tres niveles de elevación**, cada uno con dos sombras superpuestas —una corta y dura,
  otra larga y difusa—, porque una sola sombra difusa da ese gris sucio de plantilla. Y más
  marcadas en modo oscuro, donde una sombra suave sencillamente no se ve.
- **31 radios y 10 anillos de foco** unificados en tokens.

**Filtros del catálogo sin etiqueta**, como pidió el autor: la opción «todos» se llama como la
categoría, así que el propio control dice de qué es. **Pero el `aria-label` se mantiene**: sin
él un lector de pantalla anuncia «cuadro combinado, 3.º y 4.º» sin decir de qué, y es la parte
del patrón que casi todo el mundo se salta. Con buscador que filtra al escribir, sin retardo
—son decenas de actividades— y **quitando los acentos por los dos lados**, porque quien
escribe «ritmico» con prisa espera encontrar «rítmico».

**La cuenta atrás suena, y suena en tempo.** Con `bpm` los números caen al pulso de la
actividad, así que deja de ser un aviso y pasa a ser lo que un músico llama una entrada: no
solo dice cuándo se empieza, **sino a qué velocidad**. Una cuenta a un tempo cualquiera
seguida de una melodía a otro es peor que no contar. El «¡ya!» va acentuado, como el primer
tiempo de un compás. El clic se extrajo a `audio/clic.ts` y lo comparten metrónomo y cuenta.

**Musicograma, cuatro cosas más:**

- **El margen de entrada pasa a ser la ventana entera.** Eran dos constantes distintas —2 s
  de margen contra 3,2 de ventana— y eso hacía que **la primera nota naciera a un tercio del
  recorrido y tuviera menos aviso que todas las demás**. El autor lo notó. Ahora es una sola
  constante usada dos veces, que es lo que impide que alguien las vuelva a separar.
- **Un botón por banda.** Cambia lo que se practica: con un botón basta acertar *cuándo*; con
  uno por banda hay que acertar además *cuál*. Y es lo que abre la puerta a los acordes que
  pidió el autor: dos notas simultáneas en bandas distintas se resuelven con dos dedos sin
  que el motor necesite nada. En ordenador, teclas 1 a 4.
- **El aviso al acertar sigue a la representación.** Enseñar «sol» en una actividad de
  animales no aporta nada y mete un dato que sobra: ahora aparece el animal, o la sílaba, o
  nada, según lo que se esté trabajando.
- **Mecánica de revelar**: bajan círculos vacíos y el dibujo aparece **solo si aciertas**.
  Sube la dificultad sin tocar el tempo ni el número de figuras.

**`audio/instrumentos.ts`**, para que cambiar de timbre sea cambiar de muestras y nada más.
**Hoy solo hay marimba**, y conviene no disimularlo: el banco tiene pandero, claves y
campanilla, pero son percusión sin altura. Añadir un instrumento afinado es trabajo de
muestras —VCSL y `tools/muestras-instrumento.py`—, no de programación. Y solo valen timbres
percusivos: el `Sampler` estira con `playbackRate`, y un piano estirado delata a la primera.

**Y las actividades que lo enseñan.** «Los animales que bajan» era corta y de espaciado
constante; ahora son 17 figuras con forma A-B-A y cierre, y **la duración de cada animal dice
qué animal es**: el elefante dura tres pulsos y suena en re4, el pájaro dura uno y suena en
la4. Eso no se inventa aquí — la biblioteca ya enseña esa asociación en INF-03, INF-04 e
INF-15, así que el niño reconoce lo que ya sabe mientras trabaja el pulso. **PENDIENTE DE
REVISIÓN PEDAGÓGICA**: que convenga ser tan literal a los 3 años lo dice una maestra.

Nuevas: **C1-19 «Adivina quién baja»** (círculos que se abren) y **C2-16 «Cuatro bandas»**.

### T2.20 a T3.4 — El catálogo entero, y cuatro tipos nuevos `[x]`

Cerrado el 2026-09-07. **66 de 66 actividades del catálogo.**

Lo que quedaba estaba bloqueado por cinco motivos distintos, y cuatro se resolvieron
haciendo el trabajo que los desbloqueaba en vez de esperar a que alguien lo hiciera.

**C2-04 y C2-05, la flauta.** El bloqueo decía «material que no tenemos» y el bloqueo real
era otro: la flauta soprano tiene **dos sistemas de digitación**, barroco y alemán, y elegir
uno no me corresponde. Pero **si, la y sol se digitan igual en los dos** —lo que los separa
es la familia del fa—, así que son exactamente las tres notas que se pueden enseñar sin
preguntar qué flauta hay en el aula. Por eso son la secuencia con la que empiezan todos los
métodos. Los diagramas los genera `tools/digitaciones.py`: no hay banco CC0 de esto y lo que
circula son escaneos de métodos con derechos.

**C2-11, instrumentos del mundo.** La desbloqueó FluidR3: sitar, koto, kalimba, gaita, banjo
y tambor metálico. Dos notas por instrumento, no una — reconocer un timbre es reconocerlo
suene la nota que suene, y con una sola se puede acertar memorizando la altura.

**C3-03, editor de melodías.** El editor ya existía como `rejilla`; lo que faltaba era
**exportar**, y eso es lo que separa componer de jugar a componer. MIDI y MusicXML escritos a
mano, sin dependencias, y verificados abriéndolos con `music21` — que destapó un fallo que
nuestros tests no podían ver: el `<direction>` del tempo sin `<direction-type>` dentro es XML
válido y MusicXML inválido, así que el fichero se abría sin protestar **y el tempo se
perdía**.

**C3-04, mapa de una obra.** La obra se eligió por su FORMA, no por bonita: el tema de la
Novena es A-A-B-A, y las dos A comparten color, así que la estructura **se ve antes de
oírse**.

**C2-06, poner las barras de compás** → tipo nuevo `compases`. Es de las poquísimas cosas
del lenguaje musical que **se comprueban solas**: una divisoria está bien puesta o no lo
está, y no depende del criterio de nadie. Sin VexFlow: aquí no hay pauta ni alturas, solo
figuras en fila, y traer un renderizador de partituras habría sido traer una imprenta para
escribir una postal.

**C3-01, tonos y semitonos** → tipo nuevo `escala`. Enlaza teclado y pauta porque **ninguno
de los dos lo explica solo**: en el pentagrama do-re-mi-fa se ven igual de separados y no lo
están, y eso se ve en el piano porque entre mi y fa no hay tecla negra; pero en el piano no
se ve que mi y fa son grados contiguos, y en la pauta sí. Empieza en **sol y no en do** a
propósito: en do el patrón se acierta andando por las blancas sin entenderlo.

**C2-13, paisaje sonoro** → tipo nuevo `paisaje`, y **es la única actividad que guarda
audio**. Cumple las cuatro condiciones de `docs/08-LEGAL.md` una por una: nunca graba sola,
va a IndexedDB local y a ningún otro sitio, se borra a un clic y sin confirmación disuasoria,
y suelta el micrófono al salir con `track.stop()` en **todas** las pistas. La promesa se dice
**en la pantalla**, no solo en la política: quien tiene que entenderla es el niño y el maestro
que está a su lado, no un abogado.

> **Y una regla que hubo que afinar.** El test de degradación marcó la actividad por declarar
> `alternativa: 'ninguna'`, y tenía razón en marcarla. Pero aquí la alternativa no puede ser
> el toque: el **producto** es una grabación, y sin micrófono no hay botón que la sustituya.
> Lo que sí hay es hacerla sin grabar —salir, callarse un minuto y anotar lo que se oye—, que
> además es la parte que enseña a escuchar. Se añadió `sin-grabar` al esquema. La regla de
> fondo no cambia: **el micrófono nunca puede dejar una actividad sin hacer**.

**Y una grabadora que no graba audio**, en `motor/grabacionEventos.ts`: el piano guarda QUÉ
nota y CUÁNDO, y reproducir es volver a tocarlas. Gana al `MediaRecorder` en todo lo que
importa aquí —sin permiso, sin riesgo, sin peso, y transformable— y por eso el audio de
verdad se ha quedado solo donde no hay otra forma.

### T3.5 — Revisar los tamaños contra la investigación de NN/g `⚠️`

Abierta el 2026-09-06 con la investigación de
[`11-RECURSOS-Y-REFERENTES.md`](11-RECURSOS-Y-REFERENTES.md).

Nielsen Norman Group, con tres rondas de estudios de laboratorio y más de 80 sitios probados
por niños, **confirma dos decisiones nuestras y contradice cuatro cifras**:

Confirma que hay que separar tramos de edad (es el ADR 0005) y que **los menores de 5 años
no manejan arrastrar y soltar**, siendo *tap-and-tap* lo que funciona — que es literalmente
lo que hace `maquinaOrdenar.ts`.

Contradice esto:

| NN/g | Nosotros |
|---|---|
| Objetivo táctil de **2 × 2 cm** (~76 px) | 75 px en Infantil ✓, pero **60 y 48** en Primaria |
| Separación de **64 px** | **24, 16 y 12 px** |
| Iconos de **60–80 px** | ~46 px en Infantil |
| Texto de **24 pt** (~32 px) | 24, 20 y 18 px |

- [ ] Decidir si se suben los tokens

**Es decisión de producto, no técnica, y por eso no se ha ejecutado.** WCAG es el mínimo
legal; NN/g mide lo que funciona con niños de verdad. Pero subir los tamaños afecta a las 45
actividades y a cuántos objetos caben en pantalla, así que lo decide el autor.

### Estado a 2026-09-07 (final del día)

**El catálogo previsto está entero, y ya se ha pasado de él.** Lo que queda no es terminar,
es depurar y ampliar, y eso lo marca el uso real.

| | |
|---|---|
| Actividades | 77, todas validando esquema y música |
| Tipos de motor | 21 (la lista viva, en [`01-ARQUITECTURA.md`](01-ARQUITECTURA.md)) |
| Tests | 408 |
| Precache | 1341 KiB (el resto del audio se cachea al usarse) |
| Código | ~17200 líneas en `src`, ~4000 en `tests` |

**Lo que entró ese día, después de cerrar el catálogo previsto:**

- **`cuerpo`**, percusión corporal. Es lo que más se usa en el aula española y no necesita
  instrumentos. La notación es propia porque la de BAPNE® está registrada — ver
  [`08-LEGAL.md`](08-LEGAL.md), que ahora dice qué métodos son libres y cuál no.
- **`pads`**, el kit de percusión para tocarlo. El kit existía desde el día anterior pero
  solo se llegaba a él programando una secuencia, que es componer y no tocar.
- **`referencia`**, el «¿cómo era esto?»: la consulta del lenguaje musical, con botón de
  escuchar en todo lo que puede sonar. No es un ejercicio y no pretende serlo.
- **El camino** (`/camino`), un orden sugerido por etapa que **no bloquea nada**. Setenta
  actividades con filtros curriculares sirven a quien sabe qué busca y son un muro para
  quien no. Sin racha, sin porcentaje y sin candados: §1 y §4.
- **`herramienta`** pasa a ser un campo del JSON en vez del prefijo del identificador, con
  lo que el editor de melodías y el de pistas dejan de estar enterrados en el catálogo.
- **`acompanamientos` y el motor de bases en bucle**, con el transporte en caliente. Y con
  ellos, `c2-07` gana por fin el bordón que su descripción llevaba prometiendo.
- **`eco`**, dos niños por turnos en la misma tablet: uno propone un ritmo y el otro lo
  repite, y se comparan **entre sí**, no contra una rejilla nuestra.
- **`tests/documentacion.test.ts`**, porque la documentación mentía: este fichero llevaba un
  epígrafe con una cifra de tipos de motor que se había quedado seis por debajo de la real.
  Un número obsoleto en un `.md` no rompe nada y por eso se queda ahí para siempre; el test
  lo caza, y `npm run docs:tipos` rehace la tabla sin contar a mano.

**Lo que de verdad falta**, y ninguna de las tres es programación:

1. **T0.3, probarlo con niños.** Sigue sin hacerse y es lo único que puede decir si las
   decisiones de dificultad son correctas. Las que esperan respuesta están recogidas en
   [`13-PENDIENTE-DE-REVISION.md`](13-PENDIENTE-DE-REVISION.md), que genera
   `npm run docs:pendientes` leyendo las marcas del código.
2. **Las locuciones.** `CLAUDE.md` §6 pide voz humana grabada y no la hay. `tools/muestras-voz.py`
   deja el trabajo en grabar, no en programar.
3. **La revisión de una maestra.** Las correspondencias edad-dificultad, la secuencia
   didáctica y las coreografías las ha decidido un desarrollador leyendo la convención.

Y una cuarta que sí es de producto: **T3.5**, subir o no los tamaños táctiles según NN/g.
Sigue sin decidirse porque afecta a las 67 actividades y la decide el autor.

Las ideas de ampliación, con veredicto y con lo que NO conviene hacer, están en
[`docs/12-IDEAS-Y-AMPLIACIONES.md`](12-IDEAS-Y-AMPLIACIONES.md).

## Fase 3 — Crecer sin traicionarse (cuando alguien lo pida)

- [ ] T3.1 — Configurador de actividades: un formulario que escribe el JSON
- [ ] T3.2 — Valenciano, catalán, gallego, euskera e inglés
- [ ] T3.3 — Publicación en Procomún (INTEF)
- [ ] T3.4 — Solo si un centro lo demanda: cuentas de profesor con alias seudónimos

---

## Cosas que NO vamos a hacer

Escrito aquí para no volver a discutirlo:

- Cuentas nominales de alumno
- Subir audio o vídeo de un niño a ningún servidor
- Publicidad, rachas, ligas, vidas o notificaciones push
- Analítica de terceros
- Un DAW multipista (eso es Secundaria, no Primaria)
- Chat entre usuarios
