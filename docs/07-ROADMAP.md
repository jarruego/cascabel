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
- [x] **Personajes**: decidido el 2026-09-08. Existen y son de la metodología cocomusic —
  ocho, uno por nota: DORA, REX, MILO, FARA, SOL, LAIA, SIMÓN y DOBY. El encargo está en
  [`14-PERSONAJES.md`](14-PERSONAJES.md): poses, prompts, nombres de fichero y contrato del
  SVG. **Los ocho ya están dibujados**, diez poses cada uno, y con ellos entró el
  código —`ui/personajes.ts`, `ui/Personaje.tsx`, `tools/personajes.mjs` y su test—. Doby
  cierra siempre; quién abre lo dice el campo `personaje` de cada actividad, con Dora por
  defecto, así que asignar a Fara las de silencio el día que exista será una línea de
  contenido y no un cambio de código.

  **Y hay ochenta dibujos de los que la aplicación usa dos poses.** No es un olvido, son dos
  cosas que faltan y conviene tenerlas escritas: `anima` quiere el sitio de la
  retroalimentación tras un fallo, y eso pide sacar el párrafo `.feedback` a un componente
  común porque hoy lo repiten ocho tipos de motor; y `neutro` —el personaje **haciendo de
  nota**, en las teclas y en los carriles— necesita **los ocho dibujados**, porque con cinco
  el piano enseñaría personaje en cinco teclas y nada en las otras. Ver `14-PERSONAJES.md` §7.

  **La decisión del color se resolvió midiendo, y al revés de lo que parecía**: los ocho
  dibujos coincidían con los Boomwhackers de verdad y la aplicación no. Tres notas estaban
  mal —`fa` en un verde azulado en vez de verde claro, `la` en azul en vez de violeta y `si`
  en morado en vez de fucsia—, y llevaban así porque el color de la nota y la paleta de la
  interfaz eran los mismos tokens: el verde de `fa` era el verde que significa «correcto».
  Separados en `--nota-*` y `--vivo-*`, corregidos y con test (ver `14-PERSONAJES.md` §5).

  Y con los ocho dibujados entró **la pose `neutro`, que era la razón de ser de todo esto**:
  el personaje **haciendo de nota** en las teclas del piano, en `inf-19`. A los cuatro años
  no se busca «la nota fa», se busca a Fara. Solo en Infantil y solo en las blancas: en los
  otros carriles el nombre de la nota **es** lo que hay que aprender, y taparlo con un dibujo
  sería quitarles justo lo que han venido a leer.

  **Cómo se bajan los dibujos**, que era la duda del autor: tres poses por personaje en el
  precache —las que salen en cualquier actividad—, el resto con `prefetchPersonajes()` en los
  ratos muertos y **solo si `navigator.connection` dice que la conexión no es de pago ni
  lenta**, y el juego entero cuando el maestro pulsa «descargar para usar sin conexión».
  Bajarlo todo al instalar sin preguntar sería lo cómodo y es lo que la regla del proyecto no
  permite: alguien puede abrir Cascabel en el patio con datos móviles.

  **Y reaccionan.** El párrafo suelto de retroalimentación que repetían siete tipos de motor
  es ahora un componente, `ui/Reaccion.tsx`, y ahí sale el personaje de la actividad con su
  pose y su frase. Con eso `anima` deja de ser la única pose sin usar. Dos voces y un orden:
  el personaje acompaña —corto, en su registro— y debajo va **la pista concreta**, que es la
  que enseña. Al fallar, ánimo y nunca lástima (§4): pose `anima`, recuadro ámbar y ni una
  cruz.

  **Las 78 actividades declaran su personaje**, elegido por lo que cada una trabaja y no por
  un mapa automático de ejes: dentro de «altura» conviven cantar una nota —crear, Laia— y
  distinguir cuál es más grave —discriminar, Simón—. Con test de que no falte ninguna y de
  que ninguno de los ocho se quede sin salir.
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



- [x] Cloudflare Pages conectado a `main` de `github.com/jarruego/cascabel`
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
- [x] **T2.7 — Códigos de verificación** `[x]` — cerrado el 2026-09-06 y **retirado el
      2026-09-08**: descansaba sobre la suposición de que cada niño tiene un dispositivo,
      y la norma es una pizarra y ninguno. Razonado en
      [`adr/0007`](adr/0007-sin-codigos-de-verificacion.md). Lo de abajo se queda como
      registro de lo que se construyó y por qué. El patrón de
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

- [x] ~~Grabar un «laaa» de dos segundos~~ — sin efecto: las locuciones se descartaron
  (`adr/0006`) y `tools/muestras-voz.py` se ha borrado

El día que se decidió que no habría locuciones (`adr/0006`), `tools/muestras-voz.py` se borró: era la herramienta de un trabajo que ya no se va a hacer.

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

### Estado a 2026-09-09 (final del día)

**El catálogo previsto está entero, y ya se ha pasado de él.** Lo que queda no es terminar,
es depurar y ampliar, y eso lo marca el uso real.

| | |
|---|---|
| Actividades | 78, todas validando esquema, música y auditoría |
| Tipos de motor | 21 (la lista viva, en [`01-ARQUITECTURA.md`](01-ARQUITECTURA.md)) |
| Tests | 579 |
| Precache | 1831 KiB |
| Personajes | 8 × 10 poses, 1530 KB |
| Código | ~20500 líneas en `src`, ~5900 en `tests` |

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
- **Una revisión de los 999 textos de interfaz y las 77 descripciones**, ya de noche. La
  ortografía estaba limpia —ni un acento perdido—, pero salieron tres cosas que ningún test
  puede ver:
  - **Los cuatro sonidos corporales se llamaban de tres maneras.** La pantalla ponía
    «Muslos», el enunciado de `inf-17` decía «rodillas» y la guía `c1-09` decía
    «chasquidos» donde el tipo `cuerpo` dice «pitos». Un niño leía una palabra y tenía que
    seguir otra fila. Todo pasa a pitos, palmas, muslos y pies, e `inf-17` se renombra a
    «Palmas y muslos» aprovechando que es de ese mismo día y no ha salido de aquí.
  - **Una descripción describía otra actividad.** `c1-09` prometía «un trigrama de colores
    que avanza» y es una guía de aula: cuatro pasos y un pulso proyectado, sin nada que
    avance. Lo que avanza es el tipo `cuerpo`, que llegó un año después de escribirse esa
    ficha del catálogo.
  - **La página de créditos citaba Tone.js** como si la aplicación lo cargara, y no lo
    carga. En la página que existe justamente para decir la verdad sobre lo que se usa.

  La lección, para la próxima vez que se añada un tipo: **el vocabulario de dominio se
  desincroniza en silencio.** Un texto que contradice a otro no rompe nada, no lo caza
  ningún test y solo se ve leyéndolo todo seguido. Conviene repetir esta lectura cada vez
  que un tipo nuevo traiga palabras nuevas.

- **Una revisión de los anchos de toda la interfaz**, a partir de una queja del autor: «el
  piano no se estira al 100 % y otras muchas actividades tampoco, se desaprovecha mucho
  espacio». Tenía razón y las causas eran dos:
  - **Todo estaba en 840 px**, que es la medida buena para un texto y la mala para
    cualquier otra cosa. El efecto de segundo orden costó verlo: el teclado *mide su caja*
    para decidir cuántas octavas caben, así que estaba midiendo 840 por mucho monitor que
    hubiera delante. Un componente que se adapta no puede adaptarse a más de lo que le den.
  - **Nueve `min(46vh, 340px)`**, que se lee como «que no pase de 340» y significa «que no
    pase de 340 **nunca**». Todas escritas mirando un móvil.

  Lo demás salió de ahí: el catálogo en columnas, el tope de tecla por carril —a los cuatro
  años no se coloca ninguna mano, se acierta una tecla con un dedo—, la rejilla que se
  dimensionaba como si la pantalla midiera 320 px, el pentagrama escalado con `zoom` y una
  regla para el móvil apaisado. Todo en
  [`04-DISENO-UI.md`](04-DISENO-UI.md), y `tests/layout.test.ts` impide que vuelva.

- **Los filtros del catálogo pasan a la URL**, que era un problema de usabilidad de verdad:
  abrir una actividad y volver los borraba, así que había que filtrar otra vez cada vez. La
  URL lo arregla y además regala dos cosas: el «atrás» del navegador repone el scroll, y un
  filtro se puede mandar por correo. La barra de filtros se queda pegada arriba, porque con
  setenta y siete actividades cambiar de filtro obligaba a subir del todo.

- **`tests/documentacion.test.ts`**, porque la documentación mentía: este fichero llevaba un
  epígrafe con una cifra de tipos de motor que se había quedado seis por debajo de la real.
  Un número obsoleto en un `.md` no rompe nada y por eso se queda ahí para siempre; el test
  lo caza, y `npm run docs:tipos` rehace la tabla sin contar a mano.

### Rediseño de la navegación, 2026-09-08

A partir de una lista del autor. La idea de fondo: **mientras se juega, la pantalla es de la
actividad**, y todo lo demás ocupa lo mínimo.

- **Fuera el código del profesor** — ver [`adr/0007`](adr/0007-sin-codigos-de-verificacion.md).
- **El marco son cuatro cosas en sitios fijos**: ampliar arriba a la derecha, «Volver» abajo
  a la izquierda, el personaje abajo en el centro y la ficha abajo a la derecha. «Volver»
  lleva **al catálogo con sus filtros**, no un paso atrás: retroceder en el historial se
  probó y devolvía a la ficha que acababas de mirar (ver [`04-DISENO-UI.md`](04-DISENO-UI.md)). La
  explicación se lee al entrar y desaparece; el personaje la reabre —es la respuesta a «¿qué
  había que hacer?» y un niño la busca donde está la cara— **sin reiniciar la actividad**.
  En `guia-aula` no sale personaje: esa pantalla es el guion del maestro proyectado.
- **Cierra quien presentó.** Estuvo Doby siempre; Doby cierra el recorrido entero, no cada
  ejercicio.
- **Dos barras de progreso menos.** Se quedan donde el avance no se ve en la actividad
  —series de N preguntas—; se van de emparejar y ordenar, donde el tablero ya lo enseña.
- **Los botones se recortan en aire y texto, nunca en zona tocable.**
- **Las opciones extra se piden desde el JSON.** El piano ya no enseña el selector de octavas
  salvo que sea el instrumento libre, y la caja de sonidos pierde sus botones de colores. Eso
  la dejaba sin vía de teclado, así que **el lienzo responde ahora a flechas y espacio**: sin
  eso, la mejora habría sido una regresión de accesibilidad.
- **Las cuatro roturas de móvil**, con una regla común: lo que no cabe se desplaza en
  horizontal, nunca se parte y nunca se encoge por debajo de lo tocable. Una fila de figuras
  partida en dos renglones deja de ser un compás.

**Lo que queda de este rediseño**, y es lo siguiente que toca:

- [x] **Repasadas las 78, una a una** — `npm run contenido:auditar`, que comprueba textos,
      lenguaje por edad, nivel, currículo, personaje e interfaz. Y encontró un fallo que
      estaba en producción: **cinco actividades apuntaban a claves de texto que no existen**
      —las de `cuerpo` y `eco`, con las claves generadas de un recorte del identificador y
      los textos escritos con otro—, así que donde iba el enunciado se veía la clave en
      crudo. No lo cazaba nada porque el test de textos mira el código y esas claves están en
      el contenido; ahora hay uno que lo mira.

      Lo demás: dos saberes básicos que sí se podían rellenar, tres actividades
      autocorrectivas sin ninguna pista que ofrecer al fallar, un enunciado de Infantil
      demasiado largo, y grabar dejando de venir puesto en teclados y pads.

      **Dos reglas de la propia auditoría estaban mal**: medía el tiempo de una guía de aula
      como tiempo de pantalla, y trataba un `null` de currículo como un olvido cuando §9 dice
      justamente que ante la duda se deje `null`.

- [ ] **Confirmar seis campos de currículo** que están en `null` a propósito, los tres de las
      herramientas (`tr-01`, `tr-02`, `tr-03`). Los saca `npm run contenido:auditar` bajo
      «curriculo-pendiente». **Lo siguiente**: decidir si una herramienta sin consigna ni
      final tiene criterio de evaluación o no lo tiene, que es una pregunta de currículo y no
      de programación.

- [x] **«Terminar» fuera de las actividades libres.** Lo decidió el autor: «quítalo y que se
      salga solo por Volver. Pero solo por visitar ese tipo de actividades deberían marcarse
      como completadas». Hecho en todos los tipos sin final, y esas actividades se
      anotan **al abrirlas**: en una actividad sin solución, haberla visto es haberla hecho,
      y no hay ningún otro instante en el que se pueda decir que se ha completado.

      Qué tipos son libres vive en [`motor/actividadesLibres.ts`](../src/motor/actividadesLibres.ts)
      con su test, que lo comprueba contra el criterio observable —libre es el que no llama a
      `alTerminar`— y no contra una lista escrita a mano que se quedaría vieja al añadir el
      tipo siguiente.

- [ ] **Verlo en pantalla**, que es lo único que ningún script dice, y **es lo que queda de
      todo esto**. Concretamente: el tamaño del personaje de la barra; si «Volver» y «Ficha»
      caben con icono y palabra en un móvil; si la tarjeta de reacción, ahora superpuesta
      abajo a la izquierda, tapa algo que se esté tocando; si el latido del botón de arranque
      cansa a los treinta segundos; si el alto del musicograma horizontal se pasa en una
      pizarra; y si alguna actividad concreta se rompe girando el teléfono.

      **Lo siguiente**: abrir una de cada tipo en el móvil y en la pizarra, girando, con la
      lista de arriba delante. Ninguna de esas seis cosas la puede contestar un test.

### Un patrón común para las veintiuna pantallas, 2026-09-08 (noche)

De tres quejas del autor con las mismas palabras: «los botones de Empezar y otros siguen
siendo un simple texto sin apariencia de botón», «deberían mantener un diseño común, textos
comunes si hacen lo mismo», «siguen saliendo mensajes repetidos en el interior de la
actividad». Las tres tenían **una causa**: cada uno de los veintiún tipos resolvía a su
manera lo que es igual en todos.

- [x] **Tres botones y no hay un cuarto**, con el latido siempre sobre la acción principal.
      El reparto está en [`04-DISENO-UI.md`](04-DISENO-UI.md) y lo vigila
      [`tests/botones.test.ts`](../tests/botones.test.ts), que mira también la ficha, los
      ajustes y la calibración: tenían la misma pregunta —cuál es LA acción de esta
      pantalla— y la respondían con un botón secundario.
- [x] **Cuatro sitios donde la aplicación habla.** Qué hay que hacer → la explicación; dónde
      vas → `.estado-actividad`; lo que ha pasado → la tarjeta del personaje; la nota para el
      adulto → aparte. La tarjeta pasa a ir **superpuesta**: estaba en el flujo y movía el
      tablero dos veces por respuesta, justo mientras el niño apunta con el dedo.
- [x] **Las instrucciones vuelven a la explicación**, que es donde el autor las pidió. Las
      que se habían quitado de encima de las actividades se habían quedado sin sitio; ahora
      las da [`motor/ayudaPorTipo.ts`](../src/motor/ayudaPorTipo.ts), una por tipo.
- [x] **Fuera los milisegundos, los cents y la regularidad** de la pantalla del niño. §7 los
      sigue pidiendo y se siguen calculando: su sitio es la hoja del maestro. Al niño le
      llega su lectura en palabras.
- [x] **Ampliar amplía.** `.lienzo[data-ampliado]` centraba en los dos ejes, y centrar en
      horizontal una rejilla de una columna es encogerla hasta el ancho de su contenido: se
      pedía pantalla completa y el piano se quedaba igual con dos franjas de papel al lado.
- [x] **La pantalla del micrófono que pedía §8** —permiso tardío, tras una explicación
      ilustrada, sin insistir si se dice que no— existe por fin. Sus textos llevaban meses
      escritos y sin usar, que es como se descubrió que faltaba.

Y seis cosas que salieron sin buscarlas, casi todas del mismo tipo: **cosas escritas que no
llegaban a la pantalla**.

- [x] **Dos actividades enseñaban el enunciado de otra.** «El pulso escondido» abría diciendo
      «toca los sonidos en orden, empezando por el más grave» —que es «De grave a agudo»— y
      «Paisaje sonoro» decía el del memory de instrumentos. Dos actividades habían acabado
      con el mismo prefijo de claves. No daba ningún error: la clave existía y devolvía una
      frase bien escrita, de otra.
- [x] **Las pistas concretas no llegaban al niño.** Las leían dos de los veintiún tipos; en
      los otros nueve que evalúan salía la frase genérica. Regla 4 pide «una pista concreta y
      amable», y las concretas estaban escritas desde hacía meses, yendo solo al papel.
- [x] **Treinta y tres textos huérfanos**, catorce de ellos buenos y sin sitio.
- [x] **Dos descuadres de currículo** —una competencia que no concuerda con el número de su
      criterio, y otra sin declarar— y un saber de Infantil escrito de cuatro maneras, que
      partía en cuatro un grupo que es uno.
- [x] **La región `aria-live` nacía con el mensaje.** `Reaccion` montaba y desmontaba un solo
      elemento que llevaba a la vez el atributo y el texto, y varios lectores de pantalla
      solo vigilan las regiones que ya estaban: es la forma más común de escribir un aviso
      que un niño ciego no llega a oír. **Y el test de accesibilidad lo daba por bueno**,
      porque comprobaba que el `aria-live` estuviera —y estaba—. Ahora son dos elementos: la
      caja que no se ve y no se desmonta, y la tarjeta que aparece con cada mensaje. Eso
      arregla de paso que la animación de entrada volviera a correr, que con un solo elemento
      permanente habría corrido una vez y nunca más.
- [x] **Un texto por cosa.** Doce claves distintas decían seis palabras: «Parar» escrita tres
      veces, «Escuchar» tres, y `forma.a` y `forma.A` eran la misma letra en dos claves. El
      test que lo vigila lleva la lista de las parejas que se repiten a propósito, cada una
      con su motivo, y comprueba que esa lista no acumule excepciones muertas.

Y dos de anchos, que son de la misma familia que la revisión de septiembre:

- [x] **El musicograma horizontal medía 160 px de alto pasara lo que pasara** — el mismo
      número en un móvil y en una pizarra—, y además estaba escrito en dos sitios: en el CSS
      y en la constante sobre la que la geometría reparte los carriles. Ahora sale de la caja
      medida, con suelo y techo, y se aplica en línea como el vertical.
- [x] **El botón de ampliar tenía dos reglas** a mil setecientas líneas una de otra, y la
      segunda repetía `top` y `right` para añadir solo el margen y el z-index.

Y uno más, que salió de una pregunta y no de una prueba:

- [x] **Tres musicogramas no se marcaban nunca**, «Ta y ti-ti» entre ellos. El tipo `seguir`
      anota cuando la pieza llega al final, y esa rama estaba **detrás del `return` que
      relanza el bucle**: las tres actividades que van en bucle no la alcanzaban jamás. La
      cuarta sí, que es lo que hace que un fallo así no se note. Invisible probando —la
      actividad funciona, suena y se ve bien— y solo se ve abriéndola, saliendo y
      acordándose de mirar el catálogo.

      Ahora se anota al acabar la **primera vuelta**: el niño ha visto y oído el patrón
      entero, y aquí no hay nada que acertar. Pero **no se celebra**, porque un musicograma
      en bucle no termina, y sacar la modal de «¡Muy bien!» con la música sonando es la misma
      rareza que felicitar a alguien por dejar de tocar el piano. Anotar y celebrar pasan a
      ser dos cosas distintas, con `hayCelebracion` al lado de la regla de las libres.

Los seis primeros llevan test, y cada uno se comprobó **fallando** antes de darlo por bueno.
Los dos de anchos no: uno es geometría que ya tiene su test y el otro es CSS duplicado, y un
test que compruebe que dos reglas no dicen lo mismo sería más frágil que el problema.

Y dos tests nuevos cubren huecos que no tenían nada: las **setenta y ocho actividades se
abren** una por una —no solo la primera de cada tipo, que era lo que había— y el **detector
de palmadas** se prueba contra tres segundos de silencio, que es exactamente lo que el autor
vio fallar. Ese segundo carga el fichero de verdad, el que ejecuta el navegador, con el
entorno del hilo de audio simulado alrededor: una copia en TypeScript probaría la copia.

Ningún ADR cambia con esto. Lo de hoy afina lo que ya estaba decidido —el marco mínimo de
[`adr/0007`](adr/0007-sin-codigos-de-verificacion.md) y la degradación por toque de
[`adr/0004`](adr/0004-pwa-primero.md), a la que la pantalla del micrófono le pone por fin su
puerta de entrada— y no revierte ninguna.

### La botonera y los mensajes, 2026-09-09

De una observación del autor que era exacta —«no existe ningún criterio común»— y de tres
correcciones suyas seguidas, cada una sobre el arreglo anterior.

- [x] **Una sola botonera**, fija encima de la de volver-personaje-ficha. Sustituye a quince
      contenedores que hacían lo mismo con quince márgenes distintos, dos sin centrar, y a
      tres tipos que ni siquiera metían su botón en un contenedor. Entra lo que actúa SOBRE
      la actividad; lo que ES la actividad se queda en el lienzo.
- [x] **Un vocabulario cerrado de símbolos**, con su tabla en `ui/Simbolos.tsx`. De camino se
      vio que «Idea» dibujaba un círculo gris: `bombilla.svg` existía y no estaba declarado.
- [x] **El feedback, a lo que pasa durante.** Fuera el «¡completada!» de dentro —lo repetía
      la modal de enhorabuena— y el texto fijo que ya cuenta la explicación.
- [x] **Las vueltas, contadas en el botón.** «Otra vez» no arrancaba nada: volvía a la
      pantalla de inicio y había que pulsar «Empezar» otra vez. Ahora arranca la siguiente y
      dice cuál es. Y el número sale **solo ahí**: la primera versión lo puso también en una
      línea de estado, y dos números distintos a la vez —dónde estás y adónde vas— se leen
      como un error.
- [x] **La botonera vacía se esconde.** Se queda sin botones justo mientras el niño escucha y
      responde, que es cuando más falta hace el sitio.

Y un test que se dejaba engañar: el de clases CSS huérfanas busca el nombre como cadena, y un
comentario que lo mencione basta para darla por viva. Tres reglas muertas sobrevivieron por
estar documentadas en la barra que venía a sustituirlas. Ahora mira el código sin comentarios.

### Centrar y hacer caber, 2026-09-09

- [x] **La actividad tiene un escenario.** `.actividad` no tenía **ninguna** regla: cada tipo
      colocaba lo suyo en el flujo del documento, pegado arriba, y lo que se veía centrado lo
      estaba porque ese componente se centraba solo. Ahora ocupa una caja de alto conocido y
      centra dentro, con `safe center` para que si no cabe se apoye arriba y se desplace, en
      vez de recortar por arriba, que es donde está lo que hay que mirar.
- [x] **`--alto-escena`, el alto de verdad.** Nueve superficies medían en `vh`, que es la
      ventana ENTERA, y la actividad tiene la ventana menos las dos barras: unos 136 px. Un
      lienzo de `56vh` más las barras más los márgenes no cabe en 800 px de alto. Y las tres
      más grandes llevan tope, porque su suelo de `clamp` mandaba sobre el espacio real y en
      apaisado el suelo solo ya no cabía.
- [x] **Un solo `gap`** en vez de un margen por bloque. Eran unos 150 px de aire que nadie
      pidió, en la pantalla donde menos sobra.
- [x] **`margin-inline: auto` para todo hijo del escenario**, que es lo único que centra un
      bloque acotado. Media docena traían `margin: 24px 0` —un atajo que pone el lateral a
      cero— y con él la diana de «Toca aquí» se quedaba a la izquierda en cualquier pantalla
      de más de 560 px. El autor lo vio: «en muchas actividades el Toca aquí no sale
      centrado».
- [x] **La tarjeta de reacción, centrada y con entrada y salida.** Estaba clavada a la
      izquierda, que era deliberado mientras no había botonera debajo; con una barra centrada
      debajo se lee como un descuadre. Y ahora se va animada: desaparecía de golpe, y un
      parpadeo en el borde de la pantalla no se distingue de un fallo.

- [x] **La postura al ampliar la pide la actividad, no la aplicación.** Se pedía apaisado
      siempre, y eso giraba al revés las cinco actividades donde las notas caen de arriba
      abajo. Ahora hay tres respuestas y la tercera es la que faltaba: cuando da igual, no se
      toca la pantalla. No se gira en modo pizarra, ni si ya está así, ni donde el navegador
      no sabe; y ahí se ofrece girarlo a mano con una línea que se va sola.

- [x] **La rejilla cabe al girar.** Lo vio el autor en «Constructor de ritmos»: en apaisado
      las casillas se agrandan y deja de caber. Mandaba el ancho —columnas de `1fr`— y
      `aspect-ratio: 1` convertía ese ancho en alto, así que girar daba más alto justo cuando
      falta. Con ocho filas y el contenedor a 64 rem la casilla salía a 120 px: 960 px de
      rejilla en una pantalla de 360. Ahora manda el alto, con suelo —el objetivo táctil del
      carril— y techo de 64 px, que es el «alto máximo de cuadrado» que pedía.

- [x] **El bucle mantiene el pulso.** «Las actividades que ponen un sonido en bucle no
      mantienen el ritmo al reiniciar.» Las dos que dan vueltas relanzaban la reproducción al
      acabar cada una, y el relanzamiento salía desde el instante en que ocurría más el
      margen para tener el sonido cargado: medio segundo en el musicograma, 270 ms en la
      rejilla. Eso no es ni un pulso ni medio, es una costura — y en el musicograma el
      metrónomo se paraba y se creaba otro, con lo que el pulso también se reiniciaba.

      Ahora la vuelta N sale exactamente en `inicio + N × duración`: se suma, no se pregunta
      qué hora es. Se conserva el motivo del relanzo, que era bueno —la rejilla es un editor
      y lo que cambie a mitad de vuelta tiene que sonar en la siguiente—, con *lookahead*
      como el del metrónomo. La aritmética vive en [`motor/bucle.ts`](../src/motor/bucle.ts)
      con test, porque es un fallo que **solo se oye**: nada falla y hay que escuchar dos
      vueltas sabiendo qué buscar.

- [x] **La postura de la rejilla mira las dos dimensiones.** La regla de orientación miraba
      solo las columnas y mandaba a apaisado tres rejillas de ocho filas que ahí no caben:
      con el suelo táctil de 44 px son 410 px de alto y un móvil girado da 304. En «Editor de
      melodías» era peor, porque tampoco entraban las dieciséis columnas — se desplazaba en
      los dos ejes a la vez, cuando en vertical se desplaza solo en uno. Salió al comprobar
      con números si el `0,58` del lado de la casilla necesitaba ajuste tras el cambio de
      `--alto-escena`: no lo necesitaba —ahí manda el suelo— pero la postura sí.

- [x] **Fuera el aviso de pantalla completa en la PWA instalada.** «Cascabel — para salir de
      pantalla completa, desliza desde arriba.» Lo pone Chrome y **no se puede silenciar**:
      es lo que impide que una web se haga pasar por el sistema. Lo que sí se puede es no
      pedir pantalla completa cuando no gana nada — en la aplicación instalada no hay barra
      de direcciones que ganar, y el modo lienzo no depende de esa llamada porque se aplica
      por CSS. **En una pestaña del navegador el aviso sigue saliendo y no hay forma de
      evitarlo**; lo que lo quita del todo es instalar la aplicación.

      **Pendiente de comprobar en el aparato**: si al no entrar en pantalla completa nativa
      el navegador sigue dejando girar la pantalla. Si no dejara, sale el aviso de «se ve
      mejor tumbada», que ya está y no bloquea nada.

- [x] **El silencio se dibuja también en «tocar a tiempo».** En «El pulso escondido» —cuyo
      patrón es `ta sh ta sh`— la fila de puntos enseñaba **dos** para cuatro pulsos: se
      construía solo con los golpes esperados, así que los silencios no estaban. Y el
      silencio es lo que esa actividad enseña; su propia pista lo dice, «en el silencio el
      pulso sigue: cuéntalo por dentro». Ahora tiene su círculo, a puntitos y sin encenderse
      nunca — no es un fallo y no se marca como tal.

      Lo interesante es que **`cuerpo` ya lo hacía bien**, con el argumento escrito al lado:
      «un hueco vacío no se distingue de "aquí no toca esta zona"». Era la misma decisión
      tomada en un tipo y no en el otro, que es la clase de incoherencia que solo se ve
      usando la aplicación.

- [x] **Cinco cosas del editor por pistas**, todas de probarlo: las casillas suenan al
      ponerlas —como ya hacía la rejilla, «se aprende oyendo lo que se pone»—; los botones
      caben («Vaciar todo» y «Guardar MIDI» sobraban de palabras); las cuatro pistas se
      deslizan **a la vez** y no cada una por su lado, porque un arreglo solo se lee si las
      columnas cuadran —hizo falta un segundo intento: había dos reglas de desplazamiento a
      mil líneas una de otra y quité solo la primera, así que ahora hay un test que las
      cuenta—; «Suena» y «Vaciar» dejan de irse al extremo contrario del nombre; y
      **el instrumento de cada pista se puede cambiar**, que convierte oír el mismo arreglo
      en flauta y en guitarra en media lección de timbre.

      De camino, dos cosas que no se ven: pasar `0` como instante habría dejado la casilla
      **muda** —una envolvente programada en el pasado salta a su valor final— y «Vaciar»
      quedaba en dos botones que un lector de pantalla no podía distinguir.

- [x] **La botonera tapaba el final de la actividad**, en todas las que no caben en la
      pantalla. La fila del marco era `1fr`, que es `minmax(auto, 1fr)`, y ese `auto` impide
      que la fila mida menos que su contenido **salvo que el hijo declare `min-height: 0`** —
      y lo declara, porque hace falta para que las superficies encojan. Con las dos cosas a la
      vez la fila no crecía: el contenido se salía por abajo y el relleno que reserva el sitio
      de las dos barras se quedaba por encima del desbordamiento. `minmax(min-content, 1fr)`
      dice las dos cosas a la vez, y hay test porque escribir `1fr` es lo natural.

- [x] **Repaso de los veintiún tipos contra lo nuevo**: botonera donde toca, ningún botón sin
      símbolo salvo los de valor —una octava, un tempo, que no son acciones—, ningún
      «¡completada!» dentro de la actividad, y los textos fijos que quedan son todos
      legítimos (la aguja de afinación, el compás, de quién es el turno).

### El nivel por edad y el itinerario, 2026-09-09 (noche)

- [x] **Auditoría de dificultad por edad**, `npm run contenido:dificultad`. Mide dos cargas
      que no son la misma —cuántas cosas hay que **discriminar a la vez** para acertar una, y
      cuántos pasos tiene una **secuencia en el tiempo**— porque medirlas con la misma vara
      daría falsos positivos en todas las actividades de ritmo. Y una tercera comprobación
      que resultó la más útil: **el bicho raro dentro de su propio ciclo**, que no depende de
      que yo acierte con ningún número.

      **El resultado: la calibración está bien.** La primera versión marcó tres actividades
      por encima de banda y las tres eran el mismo falso positivo —un instrumento no es una
      pregunta: las ocho teclas del piano de la pandilla no compiten entre sí, se tocan de
      una en una—. Corregida la medida, ninguna actividad supera su banda, y los seis casos
      que destacan dentro de su ciclo son deliberados: un «ritmo de ocho» tiene ocho porque
      ése es el tema, la frase de Beethoven tiene treinta notas, y una estrofa tiene
      veinticuatro sílabas. Cada motivo queda escrito en la herramienta.

      **PENDIENTE DE REVISIÓN PEDAGÓGICA**: los topes de secuencia y de número de preguntas
      seguidas. Lo que se puede afirmar sin una maestra es que las dos cargas son distintas;
      dónde está el techo de cada edad, no.

- [x] **Lo que sí estaba mal era el dibujo, no el nivel.** La tira del musicograma llevaba
      `flex-wrap: wrap`, así que los veinticuatro pictogramas de «Canción con pictogramas» se
      partían en ocho renglones en un móvil y el bloque iluminado saltaba de sitio — justo
      cuando lo que se enseña es que la música avanza de izquierda a derecha. Ahora es una
      línea que se desplaza y se mueve sola.

- [x] **El itinerario dice cuánto dura cada cosa y se abre por donde toca.** Se abría siempre
      por Infantil aunque el maestro tuviera elegido el carril de 5.º, y no decía la duración
      de nada: hay pasos de noventa minutos que **no son una sesión, son tres**, y desde la
      pantalla parecían uno más. No es un marcador —§4 prohíbe rachas y porcentajes, y una
      duración no mide lo que has hecho sino lo que vas a necesitar— y hay test para que un
      total no pueda mentir hacia abajo.

      Lo pedagógico **no se ha tocado**: el orden de los pasos está razonado uno a uno en
      `camino.json` y sale del currículo, que es de lo que §10 dice que no decide la máquina.
      Se ha comprobado que cada paso contiene lo que su idea dice, y encaja.

- [x] **Repaso de textos contra la interfaz de ahora.** Buscando enunciados y pistas que
      nombren botones apareció uno real, y era mío: al llevar los acompañamientos a la
      botonera dejé «más grave» y «más agudo» **solo con el signo**, y el enunciado seguía
      nombrándolos por su texto. En esa actividad la barra lleva ese único control, así que
      no había nada que hacer sitio: lo que faltaba era la palabra. Se arregla el código, no
      el texto — el texto tenía razón.

      El test que lo vigila tardó tres intentos y los dos primeros son instructivos: uno se
      escribió con un retroceso literal en la expresión regular (`` mal escapado, lo cazó
      el lint) y el otro no fallaba nunca porque detectaba «tiene texto» buscando un `>`
      seguido de letra — y **la flecha de cualquier `() => algo` cumple eso**. Un test que no
      puede fallar cuando debe es peor que ninguno, porque se cree.

**Lo siguiente**: verlo en un aparato. Todo esto es geometría y ninguna de las decisiones se
puede confirmar sin mirarla — cuánto es «demasiado grande» para un musicograma en una pizarra
o si el escenario centrado deja el teclado a una altura cómoda no lo dice ningún test.

### Licencias: la regla dice hasta dónde llega el copyleft, 2026-09-09

De una pregunta del autor —«¿qué significa MPL-2.0?»— y de lo que quiere, que es que cualquiera
pueda reutilizar esto sin pedir permiso.

- [x] **La regla de `CLAUDE.md` §3 deja de ser una lista de siglas.** Decía «MIT, BSD, ISC,
      Apache-2.0», y una lista no explica nada: deja fuera cosas inofensivas sin decir por qué y
      no sirve el día que aparece una quinta sigla. Ahora se enuncia por el eje que decide
      —hasta dónde llega el copyleft: nada, el fichero, la librería o la obra— y con eso
      **MPL-2.0 entra**: sus ficheros conservan su licencia y los nuestros siguen siendo
      Apache-2.0. GPL y AGPL siguen fuera, y ahora también explícitamente en `tools/`.
- [x] **El razonamiento, en `08-LEGAL.md`**: los tres escalones, por qué la LGPL obliga a la
      frontera técnica de Verovio y la MPL no, y qué arregla la atribución y qué no. Esto último
      es la confusión más común y aquí importa el doble: con GPL, AGPL o NC se puede citar al
      autor todo lo que se quiera y se sigue sin poder usarlo.
- [x] **`THIRD-PARTY-NOTICES.md`, ordenado por lo que llega al navegador**, que es lo que
      dispara la obligación. Ordenarlo así destapó tres cosas: faltaba **React Router**, que sí
      viaja; **abcjs, Tone y pitchy figuraban como distribuidas** y no lo son; y la fila de
      `voz-la.opus` seguía diciendo CC0 y sintetizada cuando el propio documento explicaba dos
      párrafos más abajo que es el programa 53 de FluidR3, **MIT**. Un inventario que atribuye
      CC0 a material MIT es justo el error que impide relicenciar nada después.
- [x] **Dos filas de la tabla de stack describían código que ya no existe** —«abcjs por
      defecto» y «pitchy dentro de un AudioWorklet»—, y con el inventario ya corregido se
      habrían contradicho en el mismo commit. Al día las dos.

**Y la página de créditos volvió a mentir, un día después.** El 2026-09-08 se corrigió porque
citaba Tone.js como si la app lo cargara; ahora decía que «abcjs y VexFlow viajan en el
paquete», y de abcjs no es verdad. Dos veces en dos días, en la pantalla que existe justamente
para decir la verdad sobre lo que se usa, y que además es contenido curricular de 5.º y 6.º
(`TR-04`, saberes del bloque B sobre licencias). **Lo siguiente, y esta vez sí es un test**:
contrastar la lista de software de los créditos contra lo que Rollup mete de verdad en el
bundle. Es el único de los tres textos legales que ningún test vigila.

Sin ADR: no hay ninguno de licencias —los siete son de arquitectura— y la política vive en
`CLAUDE.md` §3 con su porqué en `08-LEGAL.md`, que es donde se busca. Si algún día se quiere
uno, el sitio natural sería el 0008.

### Dos medidas y dos decisiones, 2026-09-09

De una sesión de I+D sobre usabilidad en pantalla pequeña y pizarra. Las dos salieron de
medir, no de opinar, y las dos las decidió el autor.

- [x] **La pista que enseña ya no lleva reloj.** Medidas las 71 pistas con texto del
      catálogo: mediana de 88 caracteres y **18 palabras**, que a los 60 ppm de un niño de
      2.º son **veinte segundos**. La tarjeta duraba 6,2, así que **las 71 se quedaban
      cortas** — y 66 de 71 incluso a la velocidad de 6.º. Y no hay número que sirva, porque
      entre 2.º y 6.º la velocidad lectora se dobla. Ahora el elogio lleva reloj y la
      corrección se va cuando el niño vuelve a responder, que es la única señal fiable de que
      ya no hace falta. La regla vive en `motor/maquinaReaccion.ts` con su test, que es donde
      va una regla de producto.
- [x] **Y debajo había un fallo que no se veía.** La duración decía escalar con el texto y no
      escalaba: `children` es un array en **seis de los once sitios** —dos ramas
      `{condición && …}` seguidas— y el código preguntaba `typeof children === 'string'`, así
      que caía en un 60 de reserva. Medía bien los mensajes cortos y dejaba clavados en 6,2 s
      **justo los seis que llevan la pista larga**.
- [x] **En apaisado, las dos barras comparten renglón.** Ocupaban 110 px de los 360 de alto
      de un móvil girado: el 31 %, en la postura donde menos altura hay. El trío de la
      aplicación se encoge y se pega a la derecha, la botonera ocupa lo que queda, y el ancho
      del trío **se mide** y se publica en `--ancho-barra-actividad` — un número fijo no vale
      porque «Volver» y «Ficha» cambian de ancho en cada idioma. Si los botones no caben,
      bajan de línea como siempre: el peor caso del cambio es la situación anterior.

**El argumento de fondo del tercero, que es el que importa**: ese espacio ya se estaba
pagando por otro lado. La media query de apaisado baja los botones a **44 px** cuando
`--objetivo` vale 75 en Infantil —un 41 % menos— y eso no está decidido en ninguna parte, solo
ocurre. Sacar los píxeles de la maquetación es mejor que sacarlos del tamaño de lo que se
toca.

**Lo siguiente, y lo decide el autor mirándolo**: con los ~54 px devueltos, si en apaisado se
vuelve a `var(--objetivo)` en vez de los 44 px. Eso se come parte de lo ganado y cambia
cuántos botones caben en la fila, así que no se ha tocado: hay que verlo.

**Y el autor se reservó el derecho a deshacer la fila compartida** si no le convence al verla,
así que va en un commit propio y no mezclado: `git revert` del commit «ui: en apaisado las dos
barras comparten renglón» se lleva el CSS, la medición del ancho y su párrafo de
`04-DISENO-UI.md`, y deja intacta la tarjeta, que es la otra decisión del día. Esa es la razón
de que estas dos vayan separadas pese a haberse aprobado juntas.

**Lo que de verdad falta**, y ninguna de las tres es programación:

1. **T0.3, probarlo con niños.** Sigue sin hacerse y es lo único que puede decir si las
   decisiones de dificultad son correctas. Las que esperan respuesta están recogidas en
   [`13-PENDIENTE-DE-REVISION.md`](13-PENDIENTE-DE-REVISION.md), que genera
   `npm run docs:pendientes` leyendo las marcas del código.
2. ~~**Las locuciones.**~~ **Descartadas el 2026-09-08**, por decisión del autor. Llevaban
   desde el principio prometidas y sin llegar; la síntesis está prohibida y con motivo, así
   que se retira la promesa en vez de arrastrarla. Lo que se pierde y por qué es asumible,
   en [`adr/0006`](adr/0006-sin-locuciones-grabadas.md). El campo pasa a llamarse
   `enunciado`, que es lo que era.
3. **La revisión de una maestra.** Las correspondencias edad-dificultad, la secuencia
   didáctica y las coreografías las ha decidido un desarrollador leyendo la convención.

Y dos que sí son de producto y las decide el autor:

- **T3.5**, subir o no los tamaños táctiles según NN/g. Afecta a las 77 actividades.
- **Dos dependencias que nadie importa, y una que sí.** El diagnóstico anterior decía que
  eran tres y estaba mal: **VexFlow sí se usa**, con `import()` dinámico desde el pentagrama
  (`motor/tipos/Pentagrama.tsx`), y es él solo quien pesa los 1,1 MB del *chunk* `partitura`.
  Que sea grande está bien resuelto —carga bajo demanda y queda fuera del precache—, así que
  ahí no hay nada que arreglar.

  Los que de verdad no usa nadie son **`tone` y `abcjs`**. Al medirlo resultó que apenas
  añadían peso al bundle porque Rollup ya los descartaba; lo que sí hacían era **obligar a
  empaquetarlos**, porque estaban nombrados en `manualChunks` y nombrar un paquete ahí lo
  mete aunque no lo importe nadie. Fuera de esa lista, y de paso desaparece un *chunk*
  `audio` de un byte que se repartía en cada despliegue.

  Lo que queda es una decisión de stack, y es del autor: `tone` está en `CLAUDE.md` §3 como
  la elección para el transporte, y el transporte acabó escribiéndose a mano en
  `audio/metronomo.ts` con *lookahead*. Entre los dos ocupan 13 MB de `node_modules` y son
  dos paquetes más que auditar. **Lo siguiente**: decidir si el editor de partitura y el
  transporte de Tone llegan pronto o se desinstalan hasta entonces.

Y lo que quedó a medias en la revisión de anchos se cerró el mismo día:

- [x] **Las bandas del karaoke** ya no miden 352 px pase lo que pase: se mide la caja con
  `ResizeObserver` y el ancho sale de ahí. La regla salió del componente a
  `musicograma.ts` —`anchoDeBandas`, con test—, porque es una regla de producto: cada banda
  es también su botón, así que su ancho es un objetivo táctil. Por abajo no baja del mínimo
  del carril, y si con eso no cabe, la caja desplaza; por arriba hay tope, porque una banda
  de un palmo obliga a recorrerla con el ojo para ver por dónde va a caer la nota.

  De paso arregla un desajuste que ya existía: en un móvil de 320 px, cuatro bandas de 88
  sumaban 352, el recuadro se encogía por CSS y las bandas seguían colocadas en coordenadas
  de 352. **Sigue faltando mirarlo en pantalla**, que es lo que ningún test da.

### El repaso ficha a ficha, 2026-09-09 (noche)

Leídas las setenta y ocho una por una, campo a campo. Lo que apareció no fue contenido malo
—la música y los textos aguantan— sino **cuatro etiquetas que decían algo distinto de lo que
hace la actividad**, y un agujero en el validador que las dejaba pasar.

- [x] **El catálogo había dejado de ser la lista de todo lo que hay.** «Compón por pistas»
      (C3-12) se escribió después de generar el backlog y estuvo sin reserva sin que saltara
      nada: el validador solo comprobaba que una actividad no se sentara encima de un código
      reservado **para otra cosa**, y un código que no está reservado no puede chocar con
      ninguno. Ahora falla también al revés, mirando la familia del código —INF, C1, C2, C3,
      TR— para que una actividad suelta o las de prueba sigan validando. Con su test, y el
      apaño usa `C1-17`, que es el único hueco real de la numeración: queda anotado en el
      propio catálogo que el hueco es intencionado, porque un id puede estar dentro de una
      URL compartida y renumerar sería romperla.

- [x] **«Ostinato a dos planos» no es de creación.** Media clase hace pies en 1 y 3, la otra
      media palmas en 2 y 4, y luego se intercambian: los dos patrones vienen dados y no se
      inventa nada, se ejecuta con el cuerpo. Pasa a eje `cuerpo`, y con eso SOL —energía y
      movimiento— deja de ser una asignación rara. El currículo no cambia: CE4 habla de
      producciones **colectivas**, y esto lo es, dos grupos sosteniendo un pulso que ninguno
      hace solo.

- [x] **«Adivina quién baja» es de MILO, no de REX.** REX es «escuchar para descubrir» y aquí
      no se descubre escuchando: se mira una línea y se toca a tiempo. El eje es `pulso`, que
      es de MILO, y el envoltorio —aparece el animal que llevaba dentro el círculo— es
      exactamente su rasgo. Las dos las encontró `npm run contenido:auditar` comparando el
      personaje con el eje, que es justo para lo que está.

- [x] **Un saber escrito de dos maneras.** `c2-01` decía «D. Lenguajes musicales: aplicación
      de sus conceptos básicos» donde otras diecinueve del mismo criterio dicen «D. Lenguajes
      y práctica musical». Mismo bloque y misma idea: variante evidente, se unifica.

      **La otra no se toca, y el motivo importa.** `c1-08` declara un saber del bloque D
      donde su hermana más cercana —mismo criterio, mismo eje— declara uno del A. Decidir si
      reconocer timbres es escucha del bloque musical o recepción del de análisis no es
      redactar distinto: es **clasificar** distinto, y eso es del decreto, no mío (§9). El
      recuento de saberes ahora **dice qué actividad** lleva cada redacción única, para que
      quien tenga el BOE delante no tenga que buscarla por los setenta y ocho ficheros.

- [x] **Comprobado que no falta nada más**: ninguna actividad se queda sin personaje, ninguna
      sin créditos que deba tenerlos —las siete que no llevan son guías de aula, referencias
      escritas aquí o grabaciones del propio niño— y la única en `revision-pedagogica` es
      «Épocas, compositores y estilos», que es la que más lo necesita: once compositores con
      sus fechas. Verificadas una a una y correctas; **no lleva créditos porque no usa
      material de nadie**, y un año de nacimiento no es de nadie.

- [x] **Centrar y desplazar a la vez recortaba por la izquierda, en cinco superficies.**
      Cuando el contenido es más ancho que su caja, `justify-content: center` reparte el
      desbordamiento a los dos lados: al de la derecha se llega desplazando y al de la
      izquierda **no**, porque el desplazamiento no es negativo. Lo llevaban la rejilla de
      ritmos, los dos teclados, la línea de compases y la tabla de pistas — o sea, en un
      móvil, la primera columna, las teclas graves y el primer compás, cortados y fuera de
      alcance. `safe center` centra mientras quepa y deja de centrar en cuanto no cabe.

      El test agrupa las declaraciones **por selector** y no por bloque, que es lo que hacía
      falta para verlo: `.pistas__tabla` tiene el centrado en un sitio y el `overflow-x`
      ochenta líneas más abajo, y leídos por separado ninguno de los dos parece un problema.

- [x] **El itinerario: el bloque de ética tiene su paso, y ya no falta ninguna actividad.**
      `tr-04 «Créditos: de dónde sale esto»` era la única de las setenta y ocho a la que no
      se llegaba desde el camino, y estaba excluida a propósito con un motivo equivocado —«no
      es una actividad, se lee»— que describe la página de créditos y no esto, que es una
      guía de aula de veinticinco minutos en cuatro pasos.

      Al meterla apareció lo que la excepción tapaba: su pareja `c3-08` colgaba de «Escuchar
      una obra entera», cuya idea habla de seguir cinco minutos de música. Las dos declaran el
      saber del **bloque B —licencias, plagio y derechos de autor—, que el decreto pone solo
      en 5.º y 6.º**: es el único bloque que aparece en un ciclo y en ninguno de los
      anteriores, y estaba escondido dentro de un paso que iba de otra cosa. Ahora es un paso,
      «De quién es la música», antes de componer y no después, porque componer cierra el
      camino.

- [x] **Cada etapa dice de cuánto se está hablando.** «17 actividades · 3 h 39 min» en la
      cabecera, que es donde importa: tres de las cuatro etapas se ven **cerradas**, y un
      maestro que se asoma a otro ciclo no tenía forma de saber si eran dos clases o un
      trimestre sin desplegarlo y sumar a mano. Y la regla de cómo se dice una duración salió
      a `motor/duracion.ts` con su test: por debajo de la hora, minutos; por encima, «2 h 15
      min», porque «135 min» obliga a dividir de cabeza justo cuando se está cuadrando una
      clase de cuarenta y cinco; y la hora justa no arrastra un «0 min».

      De paso se fue el último literal suelto que quedaba en un componente: la ficha
      imprimible escribía `${duracion} min` a mano.

- [x] **El último emoji de la interfaz.** El botón de volver a oír llevaba un altavoz 🔊 y
      era el único que quedaba: todo lo demás se dibuja en `ui/Simbolos.tsx`. Tenía los dos
      problemas del emoji a la vez — la forma la pone la tipografía del aparato, así que el
      mismo botón se ve distinto en cada móvil; y el significado era otro, porque un altavoz
      es el volumen y ese botón no sube nada, vuelve a poner lo que acaba de sonar. Ahora es
      la flecha en círculo, que es la de «otra vez» en la tabla de símbolos. Con test, que
      persigue los pictogramas en color y deja en paz el sostenido de la escala y el tic de
      «ya hecha», que son caracteres de imprenta.

- [x] **«Canta la nota» decía dos cosas contrarias en la misma tarjeta.** El texto lo elige
      `mensajeAfinacion`, que pregunta al veredicto y por tanto a la ventana **del carril**
      —90 cents en Infantil, 70 en 1.º y 2.º, 50 en 3.º, porque una voz de seis años es
      inestable por construcción—. El color de la tarjeta y la pista, en cambio, comparaban a
      mano contra 50. Un niño de 1.º que cantaba 60 cents bajo leía «¡la has cazado!» en una
      tarjeta pintada de corrección, con un consejo debajo para arreglar lo que acababa de
      hacer bien.

      El número estaba escrito dos veces y la copia se quedó atrás cuando la ventana pasó a
      depender de la edad. Ahora las tres cosas salen de la misma función —`tonoDe` y
      `llevaPista`, en `motor/afinacion.ts`— y el test recorre la ventana entera de los tres
      carriles comprobando que texto y color nunca se contradicen. Puesto el fallo a mano,
      salta en «-90 cents en infantil» y «-70 en lectores», que son exactamente los dos casos
      reales.

- [x] **Y la misma enfermedad, en el esquema.** `evaluacion.tolerancia_ms` y
      `tolerancia_cents` se podían declarar por actividad y no los leía nadie: las dos
      ventanas viven en `config.ts` y en `afinacion.ts`, por carril. De las dos actividades
      que los usaban, una repetía el número del código y **la otra ya decía uno distinto**
      —50 cents donde su carril usa 70— sin que saltara nada, porque un dato que no se usa no
      puede fallar. Fuera del esquema, del tipo y de las dos actividades; el validador sigue
      pidiendo el desvío con signo a las tres familias que comparan contra una rejilla, que
      es lo que §7 exige de verdad.

      De paso: `inf-16` declaraba guardar solo «completado» y su motor guarda cuatro cosas
      más, las mismas que sus catorce hermanas. Esa lista es lo que un maestro lee para saber
      qué se guarda de un niño, y decir de menos ahí es tan malo como decir de más.

- [x] **Y el mismo desacuerdo entre dos actividades de ritmo.** `TocarATiempo` lleva escrito
      en su propio comentario «El resultado. **Nunca un porcentaje**», con el argumento de
      §7: un niño 120 ms tarde y clavado tiene un pulso excelente, y un porcentaje le diría
      que ha fallado. `Karaoke`, que se evalúa con la misma función, imprimía «has cogido 12
      de 16 · 75 %». Se queda «12 de 16» —eso no es una nota, es lo que ha pasado— y se va el
      tanto por ciento, que es la misma cifra convertida en calificación y lo que la modal de
      enhorabuena tiene prohibido desde el primer día.

      El 60 % que decide si se felicita sale a `bastanteBien` en `motor/evaluacion.ts`, donde
      hay test: estaba escrito tres veces en la misma pantalla, y esa es exactamente la forma
      en que el color acaba diciendo una cosa y el texto otra. El número queda **pendiente de
      revisión pedagógica** — que haga falta un punto a partir del cual se felicita es claro;
      que sean seis de cada diez es una elección.

- [x] **La vibración del pulso, que llevaba desde el principio en la lista de mínimos y no
      existía.** `docs/04-DISENO-UI.md` la pide por su nombre contra WCAG 1.2 —«toda actividad
      de ritmo debe poder hacerse mirando: pulso visual + `navigator.vibrate()`, un alumno
      sordo tiene que poder participar»— y `navigator.vibrate` no aparecía en ninguna línea
      del proyecto. El pulso visual sí estaba; la mitad que hace que se pueda **sentir**, no.

      Está en cuatro sitios, que son los cuatro donde hay un pulso que seguir: el metrónomo
      de las guías de aula, los pads, el musicograma y —el que más falta hacía— el patrón de
      ejemplo de «tocar a tiempo», donde se está enseñando un ritmo para imitarlo y un niño
      sordo solo veía un cursor moverse, sin duración. Durante la respuesta no vibra: ahí el
      que marca es él.

      Tres decisiones con motivo. **Va donde late lo visual y no donde suena**, porque el
      sonido se programa 100 ms hacia el futuro (§7) y la mano iría por delante del dibujo.
      **El acento dura más que el pulso** —55 ms contra 30— porque un móvil no tiene
      intensidad, solo duración. Y **no se comprueba el navegador**: se intenta y se calla,
      igual que el micrófono; en iOS y en cualquier ordenador no existe y no pasa nada. El
      interruptor está en Ajustes, solo aparece donde el aparato puede vibrar, y viene
      **encendido**: apagado por defecto dependería de que un adulto supiera que la opción
      existe, que es justo lo contrario de lo que esto viene a resolver.

      **Esto hay que probarlo en un móvil**, y es de las pocas cosas de las que ningún test
      puede decir nada: que exista la llamada se prueba; que se note en la mano y no moleste,
      no.

- [x] **El índice del catálogo se había quedado atrás, y nada lo decía.** `indice.json` es lo
      único que se carga al arrancar —el catálogo filtra por curso, eje y criterio sin bajar
      ni una actividad entera— y se genera a mano con `npm run contenido:indice`. Al cambiar
      el eje de «Ostinato a dos planos» no se regeneró, y el síntoma es el peor posible:
      **nada falla**. La actividad se abre bien, porque se lee de su fichero; lo que miente
      es la lista, que la seguía enseñando entre las de crear, que es donde un maestro no la
      iba a buscar.

      Ahora hay test, y compara campo a campo contra los setenta y ocho ficheros en vez de
      contra el fichero entero: la fecha de generación cambia sola y no significa nada.

- [x] **La pantalla de créditos pedía las setenta y ocho actividades en fila india.** Un
      `await` dentro del bucle, así que la última no empezaba a pedirse hasta que había
      llegado la penúltima: setenta y ocho viajes encadenados en la única pantalla que existe
      por una obligación legal. Ahora van a la vez, con el `catch` todavía por actividad —una
      ilegible no puede dejar en blanco los créditos de las demás.

**Dos cosas que quedan anotadas y no se han tocado**, porque las decide el autor:

- `CLAUDE.md` §10 describe una pantalla `/revisar` para revisar contenido en lote, con N
  actividades y su botón de play. **No existe**: no hay ruta ni componente. O se escribe, o
  el punto 3 del ciclo de trabajo describe algo que no se puede hacer.
- Las setenta y ocho actividades están en `estado: "borrador"` menos una, y eso no se ve por
  ninguna parte en la aplicación desplegada. Decirlo —una vez, en el sitio del maestro, no
  una etiqueta en cada tarjeta— es coherente con cómo se cuenta todo lo demás aquí; pero
  cómo se presenta el proyecto a un maestro es una decisión de producto y no la tomo yo.

**Lo que sigue faltando** es lo de siempre: un aparato. Nada de esto necesitaba pantalla,
pero lo de los dos días anteriores sí.

### Cuarenta y cinco actividades de lenguaje, historia y estilos, 2026-09-10 (noche)

El autor lo pidió así: «faltan cosas sencillas de lenguaje musical, historia de la música,
estilos... investiga y sorpréndeme». Lo que faltaba de verdad no era contenido: era **que el
motor pudiera sonar lo que el lenguaje musical necesita sin grabar nada**. Un estímulo de
«elección» solo podía ser un fichero de audio o un caso escrito, y eso deja fuera casi todo:
un intervalo son dos notas, un dictado de figuras son cuatro clics con duraciones, «forte» y
«piano» son la misma frase a dos volúmenes, y un vals se distingue de una marcha por dónde
cae el acento.

- [x] **`motor/estimulo.ts`, con test.** Un estímulo se describe en el JSON con `notas`
      (y `duraciones`, `volumen`, `volumenes` para un crescendo, `articulacion`), con
      `ritmo` en pulsos (negativo es silencio, y `acentos` para el compás) o con `patron` de
      golpes del kit («bombo+charles», celda vacía es silencio). Es puro: convierte la
      descripción en instantes y se prueba sin altavoz. `sonarEstimulo.ts` los programa
      contra el reloj del audio, nunca con `setTimeout` (§7). La referencia y las fichas de
      «ordenar» suenan por el mismo camino, así que una entrada de consulta y una pregunta
      son la misma cosa descrita en JSON — y la referencia admite ahora un timbre por
      entrada, que es lo que hacía falta para una de instrumentos.
- [x] **Las opciones pueden ser notación.** `signo` en vez de `icono`: una corchea, un
      sostenido, un «2/4», dibujados con Bravura. Una corchea no tiene emoji ni tiene por
      qué tenerlo. Y sin dibujo ni signo, el texto es el botón entero y se lee de lejos —
      solo pasa en 5.º y 6.º, con nombres de compositores e intervalos.
- [x] **Dieciocho iconos más de OpenMoji** (flechas, igual, altavoces, castillo, pluma,
      corona, corazón, radio, bailarines, palmas, los números del uno al cuatro, y una
      mariposa: el autor pidió para «flojito» un animal que no haga ruido, porque el gato de
      OpenMoji tiene rayas y parecía un tigre), en el mismo formato que los 48 que había. Anotados en `THIRD-PARTY-NOTICES.md`.
- [x] **La gaita entra en el sampler** con sus dos muestras, para que la referencia de
      instrumentos no la hiciera sonar con la marimba.

**Las treinta y cuatro**, por etapa. Todas son JSON sobre tipos que ya existían.

| Etapa | Lenguaje musical | Historia y estilos |
|---|---|---|
| Infantil | ¿Rápido o despacio? · ¿Fuerte o flojito? · ¿Cuántos golpes? · ¿Sube o baja? | — |
| 1.º–2.º | ¿Cuántos sonidos? · ¿Paso o salto? · Dictado de ta y ti-ti · ¿Negra o blanca? · De la más corta a la más larga | ¿Vals o marcha? |
| 3.º–4.º | Dictado de figuras · ¿2/4 o 3/4? · ¿Forte o piano? · ¿Ligado o picado? · ¿Sube, baja o se repite? · ¿Termina o se queda a medias? · Pon las barras en 3/4 · Las cinco figuras, en orden | ¿Qué instrumento suena? · Familias de instrumentos · ¿Vals, marcha o tango? |
| 5.º–6.º | ¿Qué intervalo es? · ¿Tono o semitono? · ¿Sostenido o bemol? · ¿Escala mayor o menor? · ¿Qué compás es? · ¿Crescendo o diminuendo? · ¿Empieza en el fuerte o antes? | Ordena las épocas · ¿De qué época es? · ¿Quién compuso esta melodía? · El compás de doce · Bailes de España y sus compases · Los instrumentos, por familias |

El itinerario tiene tres pasos nuevos —«De qué está hecho el sonido» en 3.º–4.º, «Un viaje
por la historia» y «Bailes y estilos» en 5.º–6.º— y los instrumentos del mundo se mudan al
paso de timbre, que es el suyo. Todas están en el catálogo, en el índice y en el camino, con
test para cada una de las tres cosas.

**Lo que espera criterio musical**, marcado en el propio JSON con `PENDIENTE DE REVISIÓN
PEDAGÓGICA` para que `npm run docs:pendientes` lo recoja: los compases elegidos para cada
baile (varios se escriben en más de uno), las fórmulas de bombo y caja del vals, la marcha y
la habanera, la escala menor en su forma natural, el 6/8 con acento en la primera y la
cuarta corchea, la explicación de antecedente y consecuente con la tónica y la dominante, y
**las siete melodías de dominio público, transcritas de memoria** y simplificadas a una voz:
hay que confirmarlas frente a una partitura antes de darlas por buenas. El repertorio se
eligió por el plazo español —Beethoven, Mozart, Bach, Brahms, Grieg y Tárrega, todos muertos
antes de 1910—; Falla se dejó fuera a propósito, porque murió en 1946 y con el plazo de
ochenta años no es de dominio público hasta 2027.

**Y lo que hay que ver en un aparato**: las opciones con signo musical a tamaño táctil, que
los cuatro glifos de un dictado quepan en un botón de móvil, y cómo suenan de verdad el
crescendo y el picado con las muestras de piano y flauta.

**Segunda tanda, la misma noche: once más.** Dos dictados en cuadrícula —«sol y mi» en 1.º,
con las dos primeras notas de la progresión vocal, y uno pentatónico en 3.º–4.º—; las barras
en 2/4 para primero; «¿Cuál es más aguda?»; «Cada figura con su silencio», que empareja
oyendo el hueco que deja cada silencio (las fichas de «emparejar» aceptan ahora `signo` y
`ritmo`, como las de «ordenar»); «¿Alegre o triste?», el modo mayor y menor como carácter
antes que como acorde; «¿Tresillo o dos corcheas?» y «¿En el pulso o a contratiempo?» para
los ritmos que cuestan; «Coloca la nota en clave de fa»; y dos referencias más para 5.º y
6.º: las cuatro voces del coro, sonando con la voz muestreada en su altura, y «Ritmos del
mundo» —la clave de son, el tresillo, la habanera, la campana de 6/8, el swing y el rock—
tocados con el kit. Con esto el catálogo pasa de 78 a **123 actividades**, y lo que espera
criterio musical sigue marcado en cada JSON: son 24 puntos en `docs/13`.

### Parar es parar, y lo que se pone suena ya, 2026-09-10

Dos quejas del autor sobre el constructor de ritmos, y las dos tenían la misma raíz.

- [x] **«Parar», «vaciar» y salir de la actividad no paraban la melodía.** Una fuente de Web
      Audio no se puede cancelar desde fuera una vez programada, y el constructor programaba
      **la vuelta entera** de golpe: parar detenía el reloj que encolaba vueltas nuevas, y la
      que ya estaba en cola seguía hasta el final. Ahora todo lo que suena —samplers, kit,
      clic y percusión corporal— pasa por una salida maestra y deja apuntada su fuente, y
      `pararTodo()` las detiene una a una, **también las que aún no han empezado**, con la
      maestra a cero veinte milisegundos para que nada se corte con un chasquido. Lo llaman
      parar y vaciar en el constructor y en las pistas, parar en el musicograma, repetir en
      una pregunta (para no superponer dos escalas) y **el marco de la actividad al salir**,
      que es lo que cubre a todos los tipos de una vez. Con test sobre un contexto fingido.
- [x] **Una casilla puesta a mitad de vuelta no sonaba hasta la siguiente.** Misma causa: la
      vuelta se programaba entera. Ahora el constructor programa **casilla a casilla**, con
      un *lookahead* de 150 ms que lee la rejilla en el momento de programar cada columna,
      con la misma aritmética que ya tenían las vueltas (`bucle.ts`, con test). Lo que se pone
      suena en cuanto le llega su columna, en esta misma vuelta; lo que se quita deja de sonar
      salvo que estuviera a menos de 150 ms. Las pistas ya funcionaban así.

**Hay que oírlo en el aparato**: que parar corte limpio y que la casilla recién puesta
entre en la vuelta en curso.

### El banco de sonidos reales, 2026-09-10

«Ahora suena todo muy robótico o directamente raro», dijo el autor, y tenía razón por tres
sitios: los tempos, los acordes, las campanas y «sonido largo/corto» estaban **sintetizados**
desde el primer día; piano, xilófono, flauta y violín eran un soundfont de 2008 a 48 kbps; y
no había ni un animal, ni un vehículo, ni un sonido de casa, ni un compás de música con
estilo. Tres cosas, tres arreglos.

- [x] **Un banco de 99 sonidos reales, todos de Wikimedia Commons.** Animales de granja y
      de bosque, vehículos, casa y calle, tiempo, veintitrés instrumentos tocados por músicos,
      diez estilos —rock, jazz, hip hop, reggae, vals, salsa, cumbia, bossa nova, electrónica,
      rap— y catorce fragmentos de obras, de Vivaldi a Saint-Saëns pasando por Tárrega.
      **Commons y solo Commons**, por una razón que no es de gusto: su API devuelve la
      licencia y el autor de cada fichero, así que la verificación que `CLAUDE.md` §3 exige
      la hace `tools/sonidos.py` y no la memoria de nadie. El manifiesto
      `content/sonidos.json` dice qué fichero, desde qué segundo y cuántos, y la herramienta
      escribe al lado lo que comprobó; la pantalla de créditos lo enseña sonido a sonido,
      que es lo que la CC BY pide. Se rechaza todo lo que no sea CC0, dominio público, CC BY
      o CC BY-SA con versión. En Commons están además el catálogo entero de Kevin MacLeod y
      las grabaciones de Musopen, que es de donde salen estilos y obras. Con test: todo
      verificado y en disco, nada desconocido en las actividades, y el banco por debajo de
      seis megas. Va fuera del precache y se baja al usarse, como los instrumentos.
- [x] **Veinte instrumentos de verdad para el sampler**, de VCSL y VSCO 2 CE (CC0, en
      GitHub, fichero a fichero con `tools/muestras-vcsl.py`): el Steinway B y el xilófono de
      VCSL sustituyen al piano y al xilófono del soundfont; la flauta y el violín pasan a
      VSCO; y entran dieciséis que no había — **flauta dulce** (la del colegio: las tres
      actividades de flauta suenan ahora a flauta dulce), carillón, vibráfono, arpa, saxofón,
      armónica, órgano, violonchelo, contrabajo, trompeta, trompa, trombón, tuba, clarinete,
      oboe y fagot. Una muestra cada tres o cuatro semitonos, que es lo que `docs/10` fija
      para que el estirado no se oiga. Los créditos de las 143 actividades se recalcularon
      desde lo que cada una hace sonar de verdad.
- [x] **Los sintetizados se han ido.** Los tempos son ocho bombos de VCSL a esa velocidad,
      los acordes tres notas de piano a la vez, las campanas notas del xilófono, y lo largo y
      lo corto una flauta que dura y unas claves que no: once actividades reescritas y
      quince ficheros borrados. Queda `silencio-2s`, porque el silencio es el silencio.
- [x] **Catorce actividades que solo se podían hacer con el banco**: cuatro de Infantil
      (¿Qué animal es?, la granja, ¿qué suena en casa?, ¿qué tiempo hace?), tres de 1.º–2.º
      (el bosque, vehículos, sonidos de la calle), tres de 3.º–4.º (instrumentos tocados de
      verdad, ¿qué estilo suena?, ¿quién canta?) y cuatro de 5.º–6.º (la orquesta tocada de
      verdad, ocho estilos, ¿de quién es esta obra? con grabaciones, y la referencia de
      catorce obras con su fragmento). Veinticuatro iconos más de OpenMoji para ellas. El
      catálogo pasa a **143**.

- [ ] **La voz sigue siendo el «ooh» del soundfont, y no hay biblioteca que lo arregle.**
      Se buscó de nuevo el 2026-09-10: VCSL y VSCO no tienen voz, Commons tiene canciones
      enteras y no notas sueltas, y Freesound exige clave de API. Lo que sí se ha hecho: en
      «¿quién ha sonado?», «memory de instrumentos» y «el semáforo del sonido» la voz es ya
      **una cantante de verdad** —tres segundos y medio de la soprano del banco—, porque ahí
      lo que se reconoce es un timbre, no una nota. Para el sampler —las voces del coro, la
      pista de voz del editor— la única voz de verdad que va a haber es **la que se grabe**:
      `tools/muestras-voz.py` vuelve a existir para eso, parte una grabación de móvil por
      los silencios, comprueba la altura de cada nota con autocorrelación y avisa si no es la
      que toca. Treinta segundos con un móvil, ocho notas con «aah», y sale CC BY-SA.

**Lo que hay que oír, y no puede decir ningún test**: si un ladrido de cuatro segundos
recortado de una grabación de veinte empieza y acaba donde debe, y si el estirado de los
instrumentos nuevos —que no son percusivos— se nota en alguna nota. Los recortes se cambian
en el manifiesto y se rehacen con `python tools/sonidos.py <id> --forzar`.

### Emparejar que se ve bien, y un memory de verdad, 2026-09-11

«Quedan muy feos: cuadrados de diferentes tamaños, solo tres. Y es más emparejar que
memory», dijo el autor de los de tipo `emparejar`. Las tres cosas eran ciertas.

- [x] **Las fichas miden todas lo mismo.** Cada una medía lo que su contenido —un dibujo con
      etiqueta era más alto que un altavoz sin ella— y el tablero salía a cuadros desiguales.
      Ahora las filas se reparten igual y cada ficha llena su celda.
- [x] **Las parejas hechas quedan unidas por una línea tenue.** Se mide en el DOM después de
      pintar y se vuelve a medir al cambiar de tamaño la ventana. Sin ella, dos fichas
      apagadas en columnas distintas no decían cuál iba con cuál.
- [x] **Cuatro parejas donde había dos o tres**: «Cada instrumento con su sonido» (antes
      «Memory de instrumentos», que no lo era: ya no se llama así), «Las cajas de los
      sonidos» y «Cada figura con su silencio». Para que cupieran hubo que decidir cómo se
      cuenta el tope de objetos de `docs/04` en un tablero de dos columnas: **por columna**,
      no las dos sumadas, porque cada toque elige entre los de un lado y el otro no compite
      con él. Con las dos sumadas, cuatro parejas no cabían ni en primero. Queda «Flauta
      dulce: si, la y sol» con tres, porque tres son las notas que se enseñan.
- [x] **Tipo `memoria`, el memory de verdad.** Cartas boca abajo, y cada pareja es un dibujo y
      su sonido. Se destapan dos: si encajan se quedan; si no, se tapan y ya, sin vidas ni
      reloj. Una carta de sonido solo enseña un altavoz, y suena: para encontrar la pareja
      del perro hay que acordarse de en qué carta sonó un perro. Las reglas en
      `maquinaMemoria.ts`, con test; el tablero se baraja con semilla para no rebarajarse en
      cada repintado. Tres actividades: **animales** (Infantil, 2×4 con grabaciones de
      verdad), **instrumentos** (1.º–2.º, 3×4) e **instrumentos tocados de verdad** (4×4, con
      las grabaciones de músicos del banco). Ésta última se pidió para 3.º–4.º y va en
      5.º–6.º: ocho parejas son ocho cosas que recordar, y el tope de 3.º–4.º son seis.
      Con nueve en el tercer ciclo, cabe.
- [x] **Dos tapas y un turno que obliga a alternar.** Al probarlo, el autor vio que dos sonidos
      seguidos, o dos dibujos, confunden. Ahora las cartas tapadas de sonido son lilas con un
      altavoz y las de dibujo amarillas con una lupa —color y forma, nunca solo color—, y con
      una destapada solo se pueden tocar las de la otra clase: las demás se apagan. Es regla
      de la máquina, con test, no un adorno de la pantalla.

### Las actividades dejan de ser píldoras, 2026-09-11

«Son muy cortas, como píldoras, y muchas veces repiten lo mismo tres o cuatro veces sin
variación», dijo el autor. Y lo que quería no era encadenar píldoras en una sesión —para eso
está el itinerario—, sino que **cada actividad sea, por dentro, una pequeña serie de
ejercicios de sí misma**: negras, luego con silencio, luego con corcheas, y al final un cierre
que diga cómo ha ido cada uno.

- [x] **`contenido.ejercicios`, y un motor común para las series.** `serie.ts` lleva el orden,
      la pausa entre ejercicios, la calidad de cada uno en palabras y las dos formas de
      repetir; `conSerie()` envuelve el componente de un tipo sin tocarlo, montándolo de cero
      por ejercicio y por vuelta. El cierre (`ResumenSerie`) es una fila por ejercicio, sin
      cifras, y sustituye a la modal de celebración: «repetir los que costaron» es el botón
      grande, «entera otra vez» el discreto. Se anota al llegar al cierre, no al pulsar
      terminar. Siete tipos lo usan: tocar-a-tiempo, rejilla, ordenar, emparejar, compases,
      karaoke y seguir. Con test en `serie.ts` y `variaciones.ts`.
- [x] **«Otra vez» nunca repite lo mismo.** La vuelta N es la variación N, determinista y
      dentro de lo que la actividad declara: el ritmo se gira, el dictado mueve las columnas,
      las fichas salen en otro orden, el compás empieza por otro compás, el karaoke va un seis
      por ciento más deprisa con tope en el veinte. La primera vez es siempre lo escrito.
- [x] **Treinta actividades reescritas como series**, con los ejercicios escritos a mano y
      dentro de sus figuras y notas: las siete de ritmo (ya no repiten el mismo patrón: «solo
      negras, con un ti-ti, con un silencio, dos ti-ti»), los cinco dictados en rejilla (tres
      melodías cada uno con las mismas notas), seis de ordenar (de pocas fichas a todas), dos
      de emparejar (un segundo tablero), las tres de compases (tres líneas) y las siete de
      karaoke (primera parte, segunda parte, entera). Las de un solo ejercicio que tienen
      sentido así —memory, dictado de flauta, musicogramas de una pieza— se quedan como están.
      Las herramientas —validador y dificultad— miran ejercicio a ejercicio, y la carga de una
      serie es la del ejercicio más largo, no la suma: entre uno y otro hay una pausa.

**Pendiente de oír**: si la pausa de un segundo entre ejercicios basta, si el cierre se lee
bien en un móvil con cuatro filas, y si las variaciones giradas de los ritmos siguen siendo
naturales de palmear. Y elección, cantar y pentagrama, que ya eran series por su cuenta,
todavía no pasan por el cierre común.

### Toda actividad se da por hecha por una condición de sentido común, 2026-09-12

El autor preguntó cuándo se completa el constructor de ritmos, y la respuesta era «nunca»:
una rejilla en modo libre no tiene solución, y comprobarla era lo único que la cerraba.
Y las libres —piano, pads, referencia— se marcaban **al abrirlas**, sin tocar nada.

- [x] **Una condición por tipo, en `HECHA_CUANDO`, y el componente la dispara.** Las que
      se evalúan, al hacer todos los pasos salgan como salgan; las que se escuchan, a la
      primera vuelta o al último paso; las que se tocan, al hacer sonar algo; las que se
      construyen, al escuchar lo primero puesto. El marco ya no marca nada al abrir. El test
      comprueba que todo tipo del registro llama a `alTerminar` y tiene su línea en la tabla.
- [x] **El constructor de ritmos reacciona al primer ritmo** —«¡Suena!»— y se anota ahí;
      después se sigue componiendo sin que nada interrumpa, y la modal no sale (`sinFinal`).
- [x] **Sin barras de desplazamiento por lo que crece.** `transform: scale()` no cambia la
      maquetación pero sí el área desplazable: el bloque actual de «Ta y ti-ti» se salía de
      su tira y aparecía una barra con cuatro bloques que cabían. Los contenedores que
      desplazan dejan dentro el sitio de lo escalado: la tira del musicograma, las marcas de
      «toca a tiempo», los puntos de la guía y de los pasos, y las bandas del karaoke. No hay
      test: jsdom no maqueta, y un test que no mide no vigila nada.

- [x] **La pausa entre ejercicios dice cómo ha ido el que acaba.** «La escalera de notas»
      felicitaba al fallar —la pista— y al final —el cierre—, y al acertar a la primera
      pasaba al siguiente sin decir nada: el «¡muy bien!» lo ponía la modal, y en una serie
      la modal no sale. Ahora la pausa lleva al personaje y una frase según la calidad, para
      los siete tipos que son serie de una vez.
- [x] **El modal del micrófono dice lo que va a escuchar.** Con voz, el «no» es «prefiero
      que no me escuche» y se canta sin medir; con palmadas sigue siendo «tocar en la
      pantalla». Y el afinador visual, que sin micrófono no tiene nada que medir, avisa al
      adulto en vez de quedarse mudo.

- [x] **Las actualizaciones llegan.** «Le cuesta mucho rato o directamente no actualiza,
      sobre todo instalada», y tenía dos causas: no se comprobaba al arrancar —solo al
      recuperar el foco, que una PWA abierta con el foco no recibe— y, cuando se comprobaba,
      se miraba antes de que la descarga acabara. Ahora se comprueba al arrancar esperando
      a la respuesta, se escucha `updatefound` en el registro, y cada media hora mientras
      está abierta. Si la versión nueva aparece nada más abrir y fuera de una actividad, se
      aplica en el acto (`motor/actualizacion.ts`, con test); a mitad de sesión sigue el
      aviso con botón. Y Ajustes enseña la versión: número, día y commit.
- [x] **Donde escuchar es la actividad, el micrófono no se ofrece como opcional.** En las
      de voz el segundo botón es «ahora no puedo hacer ruido», y **no entra**: la deja para
      luego y vuelve al catálogo, sin recordar el no, para que quien vuelva más tarde pueda
      decir que sí. §8 sigue en pie para lo que no decide el niño: si el navegador deniega
      el permiso o el worklet no carga, la actividad sigue y se canta sin medir. Con
      palmadas nada cambia: tocar en la pantalla es una forma completa de hacerla.

- [x] **El tablero de emparejar: cuadrados iguales y aire entre columnas.** El lado sale
      de cuántas filas hay, con el objetivo táctil como suelo y 170 px de tope, y lo de
      dentro se acota a su celda. Entre columnas, de 48 a 160 px: es donde se dibujan las
      líneas de las parejas hechas, y con la separación normal no se veían. Y el tambor de
      «Memory de instrumentos» sonaba a pandereta: ahora es el bombo.

- [x] **Un sonido a la vez, y solo al tocar su ficha.** Una muestra nueva corta a la
      anterior y a lo programado en el `AudioContext`, en emparejar, memory y ordenar; y al
      cerrar una pareja ya no vuelven a sonar los dos: el niño los ha oído al tocarlos, en
      el orden que haya querido. El marco corta también la muestra al salir.
- [x] **El musicograma con final ofrece «otra vez» antes que la enhorabuena.** Diez
      segundos de pieza y una modal encima era cerrar antes de empezar. Ahora el personaje
      felicita en la misma pantalla, el botón grande es repetir y «terminar» es el discreto.
      Se anota igual al acabar la primera vuelta.

- [x] **«Canta la nota» comparaba siempre con la primera nota.** El detector se abre una
      vez y vive toda la actividad, pero la función que recibía sus lecturas se escribió en
      el primer arranque y llevaba dentro la primera nota: a partir de la segunda, la aguja
      medía contra la nota equivocada y el centro no se ponía verde nunca. Y seguía leyendo
      entre nota y nota, con lo que la cuenta atrás de la segunda —que reiniciaba su reloj
      con cada repintado— se atrancaba. Ahora la aguja sigue a la nota que toca, solo se
      lee mientras se escucha, y la cuenta atrás lleva su reloj aparte del padre. Y la
      aguja **no se veía**: la caja es un elemento de la cuadrícula del escenario con
      márgenes `auto`, que la encogía a su contenido, y como todo lo de dentro va en
      posición absoluta medía cero —seis píxeles de borde, la «raya en medio»—. Ahora
      declara su ancho. Visto en el navegador contra la versión desplegada.

- [x] **Karaoke en serie.** El botón decía «terminar» entre ejercicios y ahora dice
      «siguiente»; tras la última nota se esperaba su duración entera más dos segundos, y
      ahora pulso y medio; «has cogido» pasa a «has tocado a tiempo»; y al pulsar siguiente
      no sale la pausa con el personaje —ya se ha visto el resultado y ya se ha decidido
      seguir—, sino el «empezar» del siguiente. Lo mismo en «toca a tiempo», que también
      enseña su resultado. La regla, `llevaPausa`, en `serie.ts` con test.
- [x] **El botón verde siempre a la derecha, los sin color a la izquierda.** Lo fijó el
      autor y estaba al revés en el musicograma, el cierre de las series, la rejilla, las
      pistas y la guía de aula. Es orden del documento, no solo visual, para que el teclado
      lo recorra igual.

- [x] **Veinte segundos para cazar la nota.** Eran cuatro, seis y diez según la actividad,
      y no daban para buscarla. Ahora veinte por defecto en las tres, y se acaba antes en
      cuanto se mantiene la nota el tiempo pedido. Si se agota, se evalúa el último tramo
      —los tres últimos segundos—, no la búsqueda entera: lo que cuenta es dónde acabó.
      `ultimoTramo` en `afinacion.ts`, con test.

- [x] **Los botones de las bandas, justo debajo de su banda y con su ancho.** Una regla
      posterior los dejaba al ancho de su texto, y con cinco píxeles de hueco los centros
      se iban desplazando banda a banda.

- [x] **El paso entre ejercicios se sigue pulsando, no esperando.** Era una pausa con reloj
      que se podía saltar tocando y no se veía que se pudiera. Ahora lleva el botón verde de
      «siguiente» a la derecha, y el niño decide cuándo viene el siguiente. Vale para las
      elecciones y para las series que no enseñan resultado propio.
- [x] **Los estímulos de tempo cambian de instrumento.** «¿Rápido o despacio?» y «Adagio,
      andante, allegro» iban con bombo en los seis, que apenas se aprecia: ahora claves,
      caja china, caja, bongó, triángulo y tom, uno por estímulo.

- [x] **Las opciones sin texto.** «¿Largo o corto?» enseñaba `opcion.largo` tal cual, y
      otras cinco actividades tenían lo mismo: la etiqueta se compone y el test de textos no
      la veía. Nueve textos añadidos y un test que mira todas las claves de opción.
- [x] **Elección: botones más grandes con dos opciones, el paso en el sitio de las opciones,
      y sin barra de progreso.** Con dos, los cuadrados crecen un 60 %; con tres, un 30 %.
      Mientras se ve el paso, las opciones se esconden y «siguiente» es lo único que hay que
      pulsar. La barra de seis píxeles del final se va de elección, pentagrama y cantar: los
      puntos del paso ya dicen por dónde se va.

- [x] **Elección: cinco preguntas por vuelta, sacadas del banco.** No había tope y había
      actividades de ocho, diez y doce seguidas. Ahora cada vuelta saca cinco, repartidas
      entre las respuestas para que ninguna opción se quede sin salir, y «otra vez» saca
      otras. El JSON conserva el banco entero. `seleccionEstimulos.ts`, con test.
- [x] **La barra de progreso vuelve, por tramos.** El paso con botón de «siguiente» no
      gustó —«prefiero la barra de antes, más bonita y con secciones»—: un tramo por
      pregunta, hecho en verde, el actual más alto y con el acento. En elección, pentagrama
      y cantar. Las preguntas se encadenan solas tras el feedback, como al principio. En
      elección va debajo de los cuadros: lo primero que se mira es lo que se toca.
- [x] **«¿Sube o baja?» cambia de instrumento en cada pregunta**, como los de tempo: con
      el mismo xilófono seis veces se confundía. Y con él «¿Cuál es más aguda?» y «Sube,
      baja o se repite». Un estímulo puede llevar su `instrumento`.

- [x] **Las figuras de ordenar no se pisan.** Muestras y notas ya cortaban a la anterior;
      los ritmos no, y en «De la más corta a la más larga» tocar dos seguidas las mezclaba.
      Y «escuchar» encadena cada ficha cuando acaba la anterior, no cada 700 ms.

- [x] **«Sube o baja» se oye subir y bajar.** Tres notas por grados conjuntos en una quinta
      casi no se distinguían: ahora cuatro o cinco notas por el arpegio con una octava de
      recorrido, en Infantil y en «sube, baja o se repite». «¿Cuál es más aguda?» nunca
      baja de una cuarta entre las dos. Y la voz de General MIDI sale de los tres: era el
      timbre que «no parecía ni el mismo instrumento».

- [x] **Una sola modal al entrar, y se elige cada vez.** En las que escuchan había dos
      modales seguidas con dos «empezar», y la elección entre palmas y pantalla solo salía
      la primera vez de la sesión. Ahora la explicación lleva las dos salidas —«tocar en la
      pantalla» y «con palmas», que es el verde; con voz, «ahora no puedo hacer ruido» y
      «empezar»— y se vuelve a elegir en cada actividad. Lo único que dura la sesión es el
      «no» del navegador: con él queda solo la pantalla. El paisaje sonoro no elige nada:
      pide el micrófono con su botón de grabar.

- [x] **La cuadrícula sigue a la melodía.** En el constructor de ritmos y en las pistas,
      cuando la columna que suena se sale por la derecha, la caja se desplaza de lado sola
      —solo de lado— con la casilla actual en el centro y las que vienen a la derecha:
      primero se movía solo cuando se salía, y la siguiente se perdía un instante.
      `ui/seguirColumna.ts`, también para la percusión corporal.

- [x] **El paso entre ejercicios de una serie, abajo como todo.** Estaba encima del
      tablero, con el personaje y el botón en medio. Ahora la reacción es la tarjeta de
      siempre y los puntos con «siguiente» van en la botonera; el tablero del ejercicio que
      acaba se queda a la vista con su botonera escondida. Vale para emparejar, ordenar,
      dictados y compases en serie.

- [x] **Las casillas de la rejilla salen de las dos medidas.** El lado se calculaba solo
      con el alto, y al girar el móvil salían más pequeñas en apaisado que en vertical.
      Ahora manda la menor entre lo que cabe por columna a lo ancho y por fila a lo alto,
      descontando lo que rodea a la cuadrícula para que el constructor quepa sin desplazar
      en vertical, con el suelo táctil del carril y un tope de 96 px.

- [x] **Las figuras se dibujan con los glifos SMuFL de Bravura, no con Unicode combinado.**
      Las secuencias «cabeza + plica + corchete» del bloque Unicode se componen glifo a glifo
      y el corchete de la semicorchea caía abajo. Los glifos del Área de Uso Privado son la
      figura entera, de una pieza: es lo que hacen MuseScore y Dorico. Traducidos en todo el
      contenido, silencios, claves, barras, matices y alteraciones incluidos.
- [x] **«Tonos y semitonos» cabe entera, y la regla para las pantallas que no caben.** Lo
      que pasaba: tres bloques con alto fijo —pauta 140, distancias, teclado 140 a 300—
      sumaban más que un móvil apaisado, la página se desplazaba y en apaisado las barras
      se compactan, con lo que parecía que «se redimensionaba todo». La regla que sale del
      estudio, y que ya cumplen la rejilla y ahora la escala: **la sección se lleva el alto
      del escenario y lo reparte**; cada bloque declara si es fijo (lo tocable, que nunca
      baja del objetivo) o flexible (lo que se mira: pauta, tira, cuadrícula, con un alto
      acotado entre un mínimo legible y un máximo útil); y si ni con los mínimos cabe, se
      desplaza **un solo bloque, de lado**, nunca la página. Queda por pasar por esa regla:
      el karaoke por bandas, el musicograma que cae y el teclado libre.

- [x] **«Coloca la nota» colocaba los sitios 56 px por encima de la pauta.** VexFlow deja
      cuatro espacios de aire sobre la quinta línea y el componente no contaba con ellos.
      Además pedía las notas en orden —sol, la, si, do, y otra vez— con el nombre escrito
      debajo de cada sitio: se acertaba leyendo. Ahora baraja sin dos iguales seguidas y el
      nombre solo lo oye el lector de pantalla. Y el recuadro mide según cuántos sitios hay,
      empezando justo tras la clave: con siete en clave de fa se salían por la derecha. Si
      no cabe en vertical, se desplaza con el dedo.

- [x] **«Pon las barras» centrada cuando cabe.** Un `flex-start` posterior la pegaba a la
      izquierda también en apaisado; `safe center` ya centra si cabe y empieza por la
      izquierda si no. Revisadas las demás filas de actividad: los puntos del pulso de la
      guía de aula tenían lo mismo y se centran; el resto ya centraba o llena el ancho.

- [x] **«Coloca la nota» a lo grande.** La pauta medía 200 px con líneas a 14 en cualquier
      pantalla. Ahora la sección se lleva el alto del escenario, el nombre y la barra van
      apretados arriba y abajo, y la pauta ocupa lo que queda: la separación entre líneas
      sale del alto, de 14 a 34 px, y con ella la clave, las cabezas y los huecos. Solo el
      marco de la pauta se desplaza, de lado; la barra queda fija debajo. Mismo patrón que
      la escala. Y la causa de que aun así la página se ensanchara: un hijo de la cuadrícula
      del escenario tiene `min-width: auto` y no mide menos que su contenido, aunque tenga
      `overflow-x: auto`. Ahora todo bloque de actividad lleva `min-width: 0`, y lo que no
      cabe se desplaza dentro de su marco. La clave era diminuta con líneas anchas porque
      VexFlow no la agranda con la separación: ahora la pauta se dibuja a la separación
      normal y se escala entera. Y en vertical el nombre queda pegado a la pauta, con los
      tres bloques centrados, no arriba del todo.

- [x] **«Canta la nota» en apaisado, sin cuenta atrás, con la nota sostenida y una aguja
      con recorrido.** La sección se lleva el alto del escenario y lo reparte; la barra va
      abajo; la cuenta atrás se fue —la nota de tres segundos ya es el aviso—; la referencia
      es una flauta real, sostenida tres segundos, en vez de 1,6 s de marimba que se
      apagaba; y la aguja abarca ±300 cents en una franja ancha y baja, con la ventana de
      «casi» tenue y la de «afinado» en verde del ancho que marque el carril. Y la flauta
      tiene treinta segundos en vez de veinte: colocar los dedos, coger aire y soplar lleva
      más que cantar.

- [x] **El rótulo del pulgar en las digitaciones de flauta salía cortado.** El agujero del
      pulgar va fuera del cuerpo, a la izquierda, y el recuadro del dibujo empezaba en el
      borde del cuerpo. Arreglado en el generador y regenerados los tres diagramas.

- [x] **Lluvia y olas que suenan a lo que son.** «La lluvia no es sonido de lluvia y se
      confunde con la tormenta; las olas parecen un tren», dijo el autor de «¿Qué tiempo
      hace?». Se midieron catorce grabaciones de Commons —brillo, retumbo grave, vaivén
      lento y goteo— y se eligieron un siseo limpio de lluvia sin graves (CC BY-SA 3.0) y
      un oleaje con el vaivén de cada ola claro y sin retumbo (CC BY 2.5). Las anteriores
      tenían la mitad de la energía por debajo de 250 Hz, que es lo que sonaba a tren y a
      tormenta. La medida está en el cuaderno de la sesión, no en el repositorio. Después,
      en «¿Qué vehículo es?», el avión —un reactor lejano sin forma— pasa a ser un avión que
      cruza de un lado a otro, y el tren de 3,4 s a siete segundos de locomotora de vapor
      resoplando, elegidos midiendo dónde está lo reconocible de cada grabación. Y en
      «Sonidos de la calle» el autobús —un motor que se confundía con las obras— deja paso
      al timbre de una bicicleta, con su icono nuevo de OpenMoji. Y a la siguiente vuelta,
      las obras —que sonaban a otra cosa— se van y entra el tren, y el timbre deja paso a un
      perro ladrando: coche, tren, patio, campana, perro y ambulancia.

- [x] **La pista de un fallo se queda hasta la siguiente respuesta.** Salía 1,2 s y se iba
      con el cambio de fase: «ni da tiempo de leer». En elección y pentagrama la tarjeta de
      «casi» dura lo que tarda en leerse —tres segundos y medio más la frase— y cualquier
      respuesta nueva la quita; sin reloj se quedaba flotando.
- [x] **La pauta de la escala es un rótulo que avanza.** Cuando no cabe una nota más, la de
      la izquierda desaparece y las demás corren un sitio, con movimiento; las etiquetas de
      tono y semitono van en una sola línea y avanzan igual. Se evalúan las últimas ocho
      notas, así que el «empezar otra vez» sobra: una escala mal empezada se arregla
      siguiendo. Y el teclado se desplaza de lado si no cabe, sin ensanchar la página. Las
      etiquetas son cuadradas e iguales, una entre cada dos notas; se pisaban. En vertical
      el conjunto va centrado: la fila del teclado a `1fr` lo dejaba arriba con medio
      escenario vacío debajo. Y la pista de «no es una escala mayor» sale una sola vez, a
      las ocho notas, dura seis segundos y se va entera: tono y texto miraban condiciones
      distintas y el texto se quedaba flotando.

### El repaso general, 2026-09-10

Después de dos días de corregir actividad a actividad, el autor pidió repasarlo todo:
textos, niveles, camino, y la sección de instrumentos.

- [x] **La sección «Instrumentos» se llama «Taller».** Tiene instrumentos, pero también el
      afinador, el metrónomo, los acompañamientos y las referencias del lenguaje musical,
      de los estilos y de las obras: «Instrumentos» no lo decía.
- [x] **La guía de créditos se va.** Era una guía de aula que enseñaba a leer la página de
      créditos, y sobraba: la página de créditos sigue, enlazada desde el catálogo y desde
      privacidad, y «¿De quién es esta música?» cubre lo que enseñaba.
- [x] **Criterios en la barra, provisionalmente, y Ajustes tras la rueda dentada.** Una
      pantalla que enumera, por etapa, las competencias y los criterios con las actividades
      que trabaja cada uno, y los que se quedan sin ninguna. Los textos de las competencias
      son los del real decreto; los resúmenes de los criterios de Primaria no son todavía el
      literal del BOE y la pantalla lo marca: PENDIENTE en `content/criterios.json`. A
      Ajustes se llega por la rueda junto al título del catálogo.
- [x] **Los ritmos y los estilos de las referencias suenan en bucle** hasta que se para o
      se toca otro: «Bailes y compases» y «Ritmos del mundo» se cortaban a la vuelta. Las
      notas y los fragmentos grabados siguen sonando una vez.
- [x] **Textos.** Siete enunciados que no decían lo que se hace: «¿Largo o corto?» hablaba
      de un triángulo y un tambor que no están; «¿Sube o baja?» de tres notas; los dos de
      emparejar prometían que sonarían los dos; los tres memory repetían la ayuda del tipo y
      dos se pasaban de largo. Y las referencias a «Instrumentos» dicen «el Taller». Después,
      «¿Paso o salto?»: un instrumento sostenido distinto por pregunta, dos pulsos por nota y
      una octava entre los saltos, con el enunciado del escalón y el brinco.
- [x] **Niveles y camino.** La herramienta de dificultad no señala nada sin revisar, y el
      camino cubre todas las actividades con una por etapa; la auditoría solo deja los tres
      criterios en `null` de las herramientas, que es lo correcto.

- [x] **La pandilla sale repartida.** Doby estaba en cinco actividades y Dora en una de
      Infantil: «la unión» y «la base» no se habían mirado como lo que la actividad trabaja.
      Lo que se hace juntos es de Doby y la primera de cada eje de Dora; diecisiete cambian
      de presentador. Un test pide que nadie baje de la mitad de su parte ni suba del doble,
      con umbrales que crecen con el catálogo. La tabla de `docs/14` vuelve a estar al día.

- [x] **El tiempo de un mensaje de fallo sale de la frase, y el del acierto es corto.**
      Había cinco tipos con cinco números fijos —900, 1400, 2200, 2600 ms— y en «pon las
      barras» no daba tiempo a leer. Una sola regla, `esperaTrasRespuesta`, con test: tras
      un acierto 900 ms; tras un fallo 3,5 s más 45 ms por letra, la misma cuenta que la
      tarjeta de elogio. Aplicada a compases, ordenar y emparejar; elección, pentagrama y
      escala ya la seguían; los dictados en rejilla esperan a que se pulse; y el memory se
      queda en 1,4 s porque ahí no hay frase, hay dos cartas que mirar.

- [x] **Cada actividad tiene un código de tres cifras.** Sale del `id`: la etapa da la
      primera cifra y el número del `id` las otras dos (`c1-07` → 107, `inf-23` → 023,
      `tr-05` → 905). Delante del título en el catálogo, el camino, la explicación, la ficha
      y los criterios; el buscador lo entiende; y un test vigila que no se repita ninguno.

- [x] **«Tonos y semitonos» construye la escala de do mayor**, no la de sol: empieza en do,
      todas las teclas son blancas y los semitonos caen entre mi-fa y si-do. Las últimas
      ocho notas tienen que formar la escala Y empezar en do. Un salto avisa en el acto:
      «vuelve a empezar en do», y tocar la tónica empieza de nuevo de verdad: vacía la
      pauta y deja solo esa nota. Y una hermana, **342 «La escala de sol mayor»**: la misma
      construcción con la tónica que obliga a un sostenido, detrás de la de do en el camino.

- [x] **Aporrear ya no acierta, y felicitar pide ocho de diez.** En «toca a tiempo» los
      golpes se repartían por cercanía —cada hueco cogía el más próximo— y golpeando sin
      parar siempre había uno dentro de cada ventana. Ahora se reparten en orden: dentro de
      la ventana puntúa; antes de tiempo **quema** el hueco, que se queda gris y no se
      recupera; lo demás sobra, y los sobrantes cuentan en contra en el cierre. Y felicitar
      se cuenta en fallos permitidos, un golpe de cada cinco con la parte entera hacia abajo
      —con cuatro pulsos no se perdona ninguno, con ocho uno, con doce dos—, y «regular pero
      desfasado» exige haber dado todos los golpes. Sigue marcado como pendiente de revisión
      pedagógica, y vale para karaoke y canta la nota, que usan la misma regla. Y el mensaje
      del personaje al acabar la vuelta sale de esa misma regla (`mensajeRitmico`): con un
      pulso perdido decía «¡muy bien!» mientras el cierre decía «casi», porque miraba solo la
      desviación típica, que con un golpe menos sale hasta mejor. Ahora hay mensaje para
      «faltan golpes» y «sobran golpes», y la calidad de la serie se deriva del mensaje.

- [x] **Percusión corporal: «chasquidos» en vez de «pitos», y un dibujo sobre cada fila.**
      Chasquear los dedos, palmas, la pierna y el pie, de OpenMoji, encima del nombre de
      cada zona; el nombre interno de la zona no cambia, solo lo que se lee. Y cabe en
      apaisado: la sección se lleva el alto del escenario y las filas se reparten lo que
      hay, menos altas y, como llenan el ancho, más anchas; también a pantalla completa,
      donde un alto fijo de 5 rem por fila pisaba el cálculo. Y cada dibujo va del color
      de su fila, con el SVG de máscara.

- [x] **«Ocultar hechas», a la derecha de la cuenta de actividades.** Un conmutador que
      aparta las actividades ya hechas para ver lo que queda; va en la URL como los demás
      filtros, pero «quitar filtros» lo respeta: no es qué se busca, es cómo se mira. Estuvo junto al buscador; es a la cuenta
      a lo que afecta, y ahí está.

- [x] **136 «Estrellita con el cuerpo»**: la primera canción entera con percusión corporal.
      Cuarenta y ocho pulsos con la letra sílaba a sílaba debajo; la tira se sale de la
      pantalla y se desplaza sola siguiendo al golpe que toca. Melodía en dominio público;
      la letra en español es la adaptación tradicional y su origen queda por confirmar:
      PENDIENTE en el JSON. Candidatas para más: tradicionales anónimas —«Debajo de un
      botón», «Cucú, cantaba la rana», «Al corro de la patata», «Tengo una muñeca vestida
      de azul», «Antón Pirulero», «Que llueva»— y «Los pollitos dicen», de Ismael Parraguez
      (†1917). Cada una se verifica antes de entrar. Y la segunda, **137 «Debajo un botón con
      el cuerpo»**: corcheas con las manos y el eco con los pies o los chasquidos. Se hizo en
      lugar de «La vaca lechera», que el autor pidió y que no es tradicional: tiene autor y
      está protegida hasta la década de 2070, como avisa `CLAUDE.md` §10. El 2026-09-10 se
      corrigió con dos transcripciones escolares que coinciden nota por nota (COAEM y
      Partyflauta): cada frase es corchea con puntillo, semicorchea, corchea, corchea y el
      eco corchea, corchea, negra —antes eran cuatro corcheas iguales, que no es la canción—,
      y lleva la melodía tocada con la flauta como la 136. El tempo (72) y la pareja
      «De-ba» a dos palmadas quedan PENDIENTES en el JSON. Y las canciones
      enteras llevan la melodía bajita debajo de los golpes —`melodia`, una nota por golpe,
      con la flauta a un tercio del volumen—: «Estrellita» la tiene; «Debajo un botón» no,
      hasta que haya una transcripción verificada. Las canciones enteras no van en bucle:
      se tocan una vez y al final el personaje felicita y se ofrece repetir o terminar; y
      la columna de las zonas se queda fija a la izquierda mientras la tira avanza.

- [x] **El tic de hecha, en la línea del título y pulsable.** Iba en su propia línea; ahora
      es una franja verde plana en el borde derecho de la tarjeta, de arriba a abajo, con el
      tic en blanco centrado; al tocarla una modal pregunta si quitar la marca. Quitarla no
      borra nada más: las veces y el mejor intento se quedan. En el camino, la misma franja
      al final de cada ficha, sin pulsar: la marca se quita desde el catálogo.

- [x] **Compartir una actividad es copiar su enlace.** Un icono pequeño al lado del título
      de la modal de explicación —actividades y herramientas, que es la misma— copia el enlace
      al portapapeles y avisa arriba, centrado, «enlace copiado, ya puedes compartirlo». No
      hay redes ni cuentas: el enlace es público y no lleva nada dentro. Si el portapapeles
      falla, se enseña el enlace escrito para copiarlo a mano.

- [x] **«Pon las barras» sobre un pentagrama de verdad.** Clave de sol, cifra de compás,
      cinco líneas, las figuras en la tercera línea con la plica hacia abajo y la doble barra
      final; las divisorias que pone el niño son barras como las de una partitura. Dibujado
      en SVG con los glifos de Bravura, sin VexFlow: la disposición está en
      `motor/pautaRitmica.ts` con test, y los huecos son botones transparentes en porcentaje
      del ancho. La pauta se lleva el alto que quede, con tope, y se desplaza de lado si no
      cabe. Las tres actividades (128, 206, 225) cambian a la vez porque es el motor. La
      tercera línea para figuras sin altura queda PENDIENTE de la profesora.

- [x] **Los pads se reparten por la pantalla.** «Cuatro instrumentos» salía en una fila;
      ahora son dos y dos, cinco son tres y dos, seis son tres y tres (dos columnas en
      vertical, tres en apaisado), con la última fila centrada y el hueco repartido. La regla
      es `ui/repartir.ts`, pura y con test, y es la convención para cualquier rejilla de
      elementos iguales: el componente mide el escenario y pone `--columnas` y `--lado`.
      Queda por aplicarla a otras rejillas donde se vea la misma falta.

- [x] **El bombo del kit se oía «muy tenue».** El prefijo de la herramienta no casaba con
      ningún fichero de VCSL y se cogía el golpe más flojo, v2. Ahora es v7, cortado a 2,2 s:
      13 dB más entre 150 y 300 Hz y 16 dB más entre 300 y 1000 Hz, lo que un altavoz de
      móvil sí reproduce. `muestras-percusion.py` acepta nombres para rehacer solo algunos
      golpes. Si en el aparato sigue corto, el siguiente paso es ecualizar presencia.

- [x] **Lo que se desplaza de lado lo insinúa al entrar.** La caja se mueve sola un trecho
      hacia la derecha y vuelve, con aceleración y frenada, en 1,6 s: pauta de compases y
      de colocar notas, teclado, escala y karaoke por bandas. No en las que se desplazan
      solas al reproducir (constructor, pistas, percusión corporal, seguir): ahí la
      reproducción ya lo enseña, y el autor pidió quitarlo. Solo si de verdad sobra, se respeta `prefers-reduced-motion`, y
      cualquier gesto lo corta. `ui/insinuarDesplazamiento.ts`, con test de la curva.

- [x] **«Volver» lleva a la pantalla de la que se salió.** Iba siempre al catálogo; ahora
      va al catálogo con sus filtros, al Taller o al Camino, a la misma altura de scroll y,
      en el Camino, con la misma etapa desplegada. `app/vuelta.ts`, compartido por las tres
      listas, con test.

- [x] **cocomusic, visible.** «Un proyecto de cocomusic» con el logotipo y el enlace en el
      pie del catálogo, en «acerca de» de Ajustes y arriba de los Créditos; en la ficha del
      maestro, «más recursos en cocomusic.es», impreso. Y una tarjeta de bienvenida arriba
      del catálogo la primera vez, con «Entendido»: no una pantalla que haya que cerrar. El
      logotipo se sirve desde `public/marca/` (PNG de la web, con el fondo quitado; el SVG
      vendrá) y es marca, fuera de las licencias: `TRADEMARK.md`. Nunca en la pantalla de
      actividad. **Cómo se dice**: Cascabel es «una herramienta más de cocomusic», no «su
      parte interactiva», y el creador visible es cocomusic: no se nombra al autor. Queda para más adelante un campo en el JSON que enlace cada actividad con
      su ficha imprimible de cocomusic.es.

- [x] **Las canciones y temas, cotejados con partitura.** Con las de Wikipedia en Lilypond
      (dominio público, en texto): Estrellita, Frère Jacques, Himno de la alegría, la 5.ª de
      Beethoven, Para Elisa, la Pequeña serenata, la Canción de cuna de Brahms y el Preludio
      de Bach coinciden. Arreglos: a la primera parte de la 016 le faltaba el último re; el
      mapa de la 304 tenía 30 notas para 32 pulsos y no era la forma del Himno, ahora son
      cuatro frases de 16 negras. Grieg y Tárrega (324) siguen sin fuente escrita: PENDIENTE
      en el JSON. La melodía de la percusión corporal sube de 0,35 a 0,5 de volumen.

- [x] **El teléfono de la 026 no sonaba a teléfono, y destapó un fallo de la herramienta.**
      `sonidos.py` guardaba la descarga en caché solo por el id, así que cambiar el fichero
      de Commons de un sonido reutilizaba la descarga vieja: **los cambios de lluvia, olas,
      avión y tren del 9 y el 10 no habían llegado nunca al .opus**, y el teléfono tampoco.
      Ahora la caché va por el fichero de Commons y la extensión sale de la ruta de la URL.
      Regenerado todo el banco: esos cinco cambian de verdad y los otros 97 son idénticos.
      El teléfono es un Iskra ATA 2 grabado por Work With Sounds (Commons, CC BY 3.0): el
      timbre de campanilla de siempre, dos timbrazos. **Hay que volver a oír lluvia, olas,
      avión y tren en el aparato**: es la primera vez que suenan los elegidos.

- [x] **El tambor de la 013 sonaba a pandereta**: era la muestra de pandereta con respuesta
      «tambor». Ahora caja, como en la 005. Revisadas todas las que dicen «tambor»: las
      demás ya usaban bombo (108, 135, 341, 010, 224) o caja (005), y en la 022 los golpes
      son del kit. No queda ninguna pandereta respondiendo como tambor.

- [x] **Las casillas de la rejilla se encienden con el color de su nota**, el código
      Boomwhacker que ya usan el piano y el musicograma, en las diez actividades de rejilla.
      Y con doce casillas o menos —dictado de sol y mi, sol-mi-la, la rueda del compás—
      dentro va el personaje de la nota: Milo en el mi, Sol en el sol. Lo pidió el autor
      para la 130.

- [x] **La barra de abajo la presentan los personajes.** Dora saluda en Actividades, Sol
      baila en el Camino, Milo palmea en el Taller y Rex busca en Criterios, cada uno sobre
      un disco de su color; la sección actual llena el disco. Los iconos grises se han ido.
      Con esto y el karaoke, de las diez poses se usan ocho; `escucha` y `calla` siguen sin
      salir. **Pendiente, por orden de lo que aporta**: `escucha` mientras suena el estímulo
      en elección y dictados; `calla` en los silencios (percusión corporal, rejilla, «ahora
      no puedo hacer ruido»); `canta` en canta la nota y el afinador y `palmea` al grabar
      palmadas; `baila` durante la reproducción de musicogramas y seguir; las notas con
      personaje en escala, coloca la nota y canta la nota; Rex buscando cuando el catálogo
      no encuentra nada y la cabecera de cada etapa del Camino con su personaje.

- [x] **Karaoke con la pandilla: cuatro canciones a una, dos, tres y cuatro bandas.** La
      representación nueva `personaje` hace que cada nota baje con su personaje y que el
      pulsador de cada banda sea el personaje cantando con el nombre de su nota. Las
      canciones: 029 «Cucú: Sol y Milo» (dos bandas, sol-mi, melodía propia porque no hay
      ninguna tradicional de dos notas con partitura cotejable: PENDIENTE), 140 «Debajo un
      botón con la pandilla» (una banda, el ritmo cotejado), 138 «Au clair de la lune» (tres
      bandas, do-re-mi, cotejada con fr.wikipedia) y 139 «El pastel de Sol, Laia, Milo y
      Dora» («Backe, backe Kuchen», cuatro bandas sol-la-mi-do, cotejada con de.wikipedia y
      transportada a do). Las cuatro con ABC para el validador. Con personajes, el
      recuadro ocupa todo el ancho en vertical y no baja de 56 px por carril en horizontal
      aunque haya un solo pulsador, y la 140 va a 60 en vez de 72: iban apelotonados. Al
      acertar, el personaje salta con dos latidos y cambia a «celebra» o «baila», alternando;
      el pulsador da un botecito al tocarlo. Con `prefers-reduced-motion`, solo el cambio de
      dibujo.

- [x] **Los karaokes van en tres partes**, como la 214: media canción, la otra media y
      entera. Aplicado a los cuatro de la pandilla (029, 138, 139, 140) y a cinco obras
      nuevas, todas cotejadas con partitura en texto: **238** «La mañana de Grieg con la
      pandilla» (cinco bandas: Dora, Rex, Milo, Sol y Laia; no.wikipedia), **239** «La nana
      de Brahms con la pandilla» (un pulsador; en.wikipedia, de mi bemol a do), **240** «La
      Pequeña serenata nocturna» (pentagrama, en sol mayor para no bajar de si3), **343** «El
      preludio de Bach» (pentagrama, los cuatro primeros compases como arpegio) y **344»
      «Para Elisa» (pentagrama, con sostenidos). Grieg queda cotejado también en la 324;
      Tárrega sigue de memoria: el único arreglo libre es el de guitarra con trémolo y no se
      ha podido leer la melodía con seguridad. Cómo se cotejan las melodías está en
      `11-RECURSOS-Y-REFERENTES.md`.

- [x] **En «Lee las figuras» (215) las notas iban muy pegadas.** Dos cosas a la vez: la caja
      de las figuras pasa de 62 a 40 px de ancho (el glifo de Bravura es estrecho) y el tempo
      de 88 a 66. A esa velocidad una negra son 80 px de recorrido y dos corcheas se tocan sin
      pisarse. Los patrones no cambian: son ritmos, no una canción.

- [x] **Dos obras más, las que tenían partitura en texto**: **345** «En la gruta del rey de la
      montaña» (Grieg, en.wikipedia; a re menor una octava abajo) y **346** «Marcha Radetzky»
      (Strauss padre, en.wikipedia). Y **347** «El Danubio azul»: no está en Wikipedia,
      pero Mutopia tiene un arreglo simplificado para piano (CC BY-SA 4.0, en do) y la
      melodía es su voz superior, leída del `.ly` y cotejada con la partitura renderizada.
      Las dos que faltan —El cascanueces y El carnaval de los animales— **no tienen
      partitura en texto** en ninguna Wikipedia ni en Mutopia: quedan para cuando haya una
      fuente cotejable (PDMX o un PDF de dominio público leído compás a compás). Sus grabaciones sí están en el banco y en las
      actividades de escucha 339 y 340. Y el estudio de bancos de música que pidió el autor
      está en `11-RECURSOS-Y-REFERENTES.md` §3: Musopen y FMA (solo CC BY/BY-SA/CC0) sí;
      Pixabay y FiftySounds no, porque prohíben redistribuir y el banco viaja en el
      repositorio.

- [x] **Los karaokes en pentagrama van en horizontal**, como el Himno: en vertical el
      recuadro salía ancho y las notas a la derecha (la anchura a toda la caja era solo para
      los personajes). Y más despacio: Para Elisa a 84, el Preludio a 100, la Serenata a 96,
      la Gruta a 120. Y Para Elisa se completa hasta el final de la frase con la edición de
      Mutopia, de dominio público: el bloque de Wikipedia acababa a falta de dos compases. La
      Serenata no se alarga: el bloque tiene el tema entero, y lo que sigue es otra frase.
      **La 308 «¿De quién es esta música?» se retira** a petición del autor:
      no tenía sentido como actividad de niños; su paso del camino desaparece con ella.

- [x] **Cada obra con el tipo de actividad que le pega**, en vez de nueve karaokes iguales.
      El autor lo pidió el 2026-09-11: «variedad, por favor». El reparto, por lo que cada
      obra tiene de especial:
      - **346 Marcha Radetzky → percusión corporal**, entera y sin bucle: es la de las palmas
        del concierto de Año Nuevo. Palmas, muslos, pies y chasquidos con la flauta debajo.
      - **347 El Danubio azul → percusión corporal de vals**: pie en el uno, palmas en el dos
        y el tres, dos frases enteras. Es el 3/4 en el cuerpo.
      - **343 Preludio de Bach → mapa (seguir)**: cuatro bloques, cuatro acordes, el mismo
        arpegio. Lo que se ve es que cambia el color y no el dibujo.
      - **345 La gruta → palmear el ritmo (tocar a tiempo)** tres veces: a 72, 96 y 120, como
        la pieza, que empieza despacio y acaba corriendo.
      - **240 La Serenata → ¿pregunta o respuesta? (elección)**, con violín y en tres tonos,
        para oír el gesto y no la altura.
      - **238 La mañana** se queda como karaoke de cinco bandas con personajes; **239 la nana
        de Brahms**, un pulsador con personajes; **344 Para Elisa**, pentagrama horizontal
        con sostenidos; **214 el Himno**, pentagrama; **216 la 5.ª**, bandas de color.
      - Nuevas: **348 «Cada obra con su nombre»** (emparejar con las grabaciones de verdad del
        banco, ocho obras en dos tableros) y **349 «La primavera de Vivaldi con figuras»**
        (karaoke horizontal leído por figuras: corcheas, semicorcheas y negra con puntillo;
        cotejada con fr.wikipedia).
      Y **241 «El cisne»** (Saint-Saëns) entero como mapa de cuatro frases: la melodía sale
      de una partitura CC0 de Commons (`Cygne saint saens fa majeur.svg`), leída compás a
      compás. Del resto del Carnaval, Commons tiene siete temas en imagen (dominio público):
      el León, las Gallinas, los Canguros, el Acuario, los de orejas largas, el Cuco y el
      Final; el Cuco es do y la bemol, la misma tercera que sol-mi, y queda anotado en la 029.
      **El cascanueces sigue sin fuente**: ninguna Wikipedia (en, de, fr, ru, ja, zh) tiene
      partitura en texto de ningún número, Commons no tiene imagen del tema y la descarga de
      IMSLP no se puede hacer desde un guion. Queda para un PDF de dominio público bajado a
      mano y leído compás a compás.
      Con eso hay obras en nueve tipos distintos: karaoke en cuatro representaciones, cuerpo,
      seguir, tocar a tiempo, elección y emparejar. Faltan letras: solo tienen letra cotejada
      «Debajo un botón» (sale en la 137) y «Backe, backe Kuchen» (en alemán); la de
      «Estrellita» en español sigue por confirmar.

- [x] **La 341 «Memory de instrumentos tocados» se retira**: dieciséis casillas, la música
      tardaba en arrancar y confundía, dijo el autor. La 135 (ocho cartas) se queda. **La 346
      Radetzky** con la melodía al 100 % (`volumenMelodia`, nuevo campo de `cuerpo`) y el
      pasaje dos veces, como repite la marcha; el trío queda para cuando haya fuente. **La 343**
      pasa de 100 a 176 por semicorchea (el tope del esquema es 180): iba «extremadamente lenta».
      **La 347 Danubio** llega hasta el final del primer vals (33 compases), con la melodía al
      100 % y las cuatro zonas: el pie siempre en el uno y, por frases, palmas, muslos, palmas
      y chasquidos en el dos y el tres. Y la columna de zonas se quedaba sin fijar en las tiras
      largas: la fila medía el ancho visible y la etiqueta pegada solo aguanta dentro de su
      fila; ahora la fila mide lo que mide la tira.

- [x] **La 340 «Diez obras para empezar» pasa al Taller** (`herramienta: true`): es un
      reproductor de obras para poner en clase, no un ejercicio, dijo el autor el 2026-09-11.
      Sigue en el catálogo, porque tiene criterio curricular.

**Pendiente de ver en el aparato**: que la reacción del constructor no tape la cuadrícula
en un móvil en vertical, que ninguna otra pantalla enseñe barra al crecer algo, que la
app instalada en Android se ponga al día sola al abrirla tras un despliegue, y que el
tablero de emparejar quepa sin desplazar en un móvil en vertical con cuatro filas.

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
