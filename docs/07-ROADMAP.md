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

### T1.5 — Persistencia local

- [ ] Progreso en IndexedDB (no `localStorage`: es síncrono y se llena)
- [ ] Funciona si el almacenamiento está bloqueado (modo privado)
- [ ] **Cero datos personales.** Ni nombre, ni edad, ni curso nominal

### T1.6 — PWA y modo sin conexión

- [ ] Precache del *app shell*, muestras de audio y fuentes
- [ ] Botón explícito «Descargar para usar sin conexión» con barra de progreso y aviso de MB
- [ ] Comprobador de actualización al recuperar el foco
- [ ] Presupuesto: `npm run build && node tools/presupuesto.mjs` pasa

### T1.7 — Sampler y metrónomo reales

- [ ] Grabar o localizar 5–7 muestras CC0 por instrumento (marimba, xilófono, campanas)
- [ ] Convertir a Opus 48 kbps mono, ~70 KB por instrumento
- [ ] Calibración de latencia («da tres palmadas al ritmo»), guardada en el dispositivo.
      **No es opcional**: Chromium mide 52 ms en un PC de sobremesa, el 74 % de la ventana
      de «perfecto» de 9–12 años, y Firefox declara `baseLatency = 0` —que es un dato
      ausente, no una latencia buena—, así que `latenciaMs()` compensa de menos ahí.
      Las cifras del navegador son el punto de partida; la calibración es la verdad
- [x] Test de que el metrónomo no usa `setInterval` — hecho en T1.3,
      `tests/metronomo.test.ts`

### T1.8 — Veinte actividades de esfuerzo S

Las marcadas con `"esfuerzo": "S"` en `content/catalogo.json`.

- [ ] JSON generado con el prompt de `prompts/`
- [ ] `npm run contenido:validar --estricto` pasa
- [ ] Revisión visual en lote
- [ ] Revisión pedagógica (las tres preguntas de `docs/06-PIPELINE-IA.md`)

### T1.9 — Legal y créditos

- [ ] Aviso legal y política de privacidad, más versión para niños con pictogramas
- [ ] Pantalla de créditos generada desde el campo `creditos` de cada actividad
- [ ] Hoja de trazabilidad de assets al día
- [ ] CSP verificada en producción (DevTools: cero peticiones fuera del origen)

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

### T1.9b — Las tipografías no están en el repositorio `⚠️`

Detectado el 2026-09-06 en el primer despliegue, por un aviso del build.

`src/estilos/tokens.css` declara `@font-face` para `/fuentes/Andika-Regular.woff2` y
`/fuentes/Bravura.woff2`, pero **`public/fuentes/` está vacío**. Los dos ficheros dan 404 y
el navegador cae en silencio a la tipografía del sistema. Consecuencias reales:

- **Andika no se está usando.** Es la que `docs/04-DISENO-UI.md` exige para Infantil, por
  estar diseñada para lectores nóveles: la «a» y la «g» de un solo piso, que es como se
  enseñan a escribir. Ahora mismo un niño de 4 años ve la fuente del sistema.
- **Bravura tampoco.** Es la de símbolos musicales (SMuFL). Cuando llegue T2.2 no habrá con
  qué dibujar un pentagrama.
- El fallo es **silencioso**: no rompe nada, solo empeora sin avisar.

- [ ] Descargar Andika (SIL, OFL) y Bravura (Steinberg, OFL) en `.woff2`
- [ ] Anotarlas en `THIRD-PARTY-NOTICES.md` con su licencia — la OFL obliga a conservar
      el aviso y prohíbe vender las fuentes por separado
- [ ] Comprobar que entran en el precache de la PWA (hoy `includeAssets` ya las contempla)
- [x] Que el build **falle** si faltan, en vez de avisar: hecho en `tools/comprobar-dist.mjs`.
      Ahora mismo las dos fuentes están en su lista de `PENDIENTES`, con esta tarea como
      motivo; en cuanto se añadan los ficheros hay que quitarlas de ahí

**Criterio de aceptación**: la respuesta de `/fuentes/Andika-Regular.woff2` es 200 con
`font/woff2`, y `docs/04-DISENO-UI.md` deja de prometer algo que no ocurre.

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

- [ ] T2.1 — Tipo `rejilla` (dictado rítmico, dictado melódico, constructor de ritmos)
- [ ] T2.2 — Tipo `pentagrama` con VexFlow y hitbox de 60 px sobre nota pequeña
- [ ] T2.3 — Tipo `seguir` (musicograma y karaoke) con cursor sincronizado con abcjs
- [ ] T2.4 — Tipo `tocar-a-tiempo` con el detector de palmadas y `evaluarRitmo`
- [ ] T2.5 — Tipo `cantar` con el detector de tono y retorno visual de afinación
      (desbloqueada: T2.0 dejó el detector en el 1,78 % de un núcleo)
- [ ] T2.6 — **Estado en la URL**: compartir una creación sin cuenta ni servidor
- [ ] T2.7 — **Códigos de verificación**: el maestro evalúa sin cuentas de alumno
- [ ] T2.8 — Fichas imprimibles en PDF generadas desde el mismo JSON
- [ ] T2.9 — Catálogo completo hasta las 54 actividades
- [ ] T2.10 — Auditoría de accesibilidad con teclado y lector de pantalla

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
