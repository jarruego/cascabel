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
- [ ] T2.9 — Catálogo completo hasta las 54 actividades
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

### Los diez tipos de motor, terminados `[x]`

Cerrado el 2026-09-06. `src/motor/registro.ts` tiene los diez tipos que
`docs/01-ARQUITECTURA.md` planteaba: `eleccion`, `emparejar`, `ordenar`, `guia-aula`,
`tocar-a-tiempo`, `pentagrama`, `rejilla`, `cantar`, `seguir` y `lienzo`.

**A partir de aquí, añadir una actividad no toca código.** Es escribir un JSON y validarlo.
Era la promesa del ADR 0001 y ya se puede cumplir.

Falta el tipo `lienzo` en su versión completa —hoy es un lienzo de altura, y el catálogo
prevé también dibujo libre sobre sonido y cuento sonoro— pero el motor existe y esas son
variantes de contenido, no de código.

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
