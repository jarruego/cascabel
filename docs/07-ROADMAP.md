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
- [ ] Chrome de Android por reenvío de puertos, pestaña normal
- [ ] Chrome de Android, **PWA instalada** ← requiere HTTPS real, no vale el reenvío

**El escritorio está cerrado** (2026-09-06): los tres navegadores conceden el micrófono,
cargan el `AudioWorklet` y detectan tono. Resultados y análisis en `docs/pruebas/microfono.md`.

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

### T0.4 — Medir el coste del NSDF de otra forma

Abierta el 2026-09-06 por lo que dijo el primer informe de `/diagnostico`.

**Chrome no expone `performance` dentro del `AudioWorkletGlobalScope`**, así que la
medición prevista en T0.1 devuelve «no medible» y seguimos sin saber lo que cuesta el
detector de tono. El NSDF es O(N²) con ventana de 1024 y solape del 50 %: en un PC no se
nota, y en la tablet de aula puede no caber. Es la incógnita que sostiene T2.5.

- [ ] Banco de pruebas en el hilo principal: correr el mismo NSDF sobre un buffer
      sintético con `performance.now()` y publicar el resultado en `/diagnostico`
- [ ] Etiquetarlo como **estimación**, no como medida del hilo de audio: no es lo mismo,
      y decir lo contrario sería mentir en el informe
- [x] ~~Comprobar si Firefox sí expone `performance` en el worklet~~ — **no lo hace**.
      Chrome, Edge y Firefox dan los tres «no medible», así que el banco en el hilo
      principal deja de ser el plan B y pasa a ser el único plan

**Criterio de aceptación**: `/diagnostico` da un número de milisegundos por análisis en
Chrome de escritorio y en Chrome de Android, con su etiqueta de cómo se obtuvo.

### T0.2 — Una actividad completa de punta a punta

Coge `content/actividades/inf-01-semaforo-del-sonido.json` y haz que funcione de verdad:
audio real, botones grandes, feedback. Fea, sin menús, sin diseño, sin router.

- [ ] Se puede jugar entera en el navegador
- [ ] El audio suena tras el gesto de «¡Empezar!»
- [ ] No hay ningún texto escrito en el componente (todo por `t()`)

**Criterio de aceptación**: un niño de 4 años la completa sin ayuda verbal de un adulto.

### T0.3 — Probarla con tres niños de edades distintas

- [ ] Uno de Infantil, uno de 1.º–2.º, uno de 4.º–6.º
- [ ] Anotar dónde dudan, dónde tocan y no pasa nada, y qué preguntan

**Criterio de aceptación**: `docs/pruebas/sesion-01.md` con las observaciones. Veinte
minutos aquí valen más que un mes de planificación.

---

## Fase 1 — Biblioteca mínima usable (4–8 semanas)

### T1.0 — Carriles en `tokens.css` y en `config.ts`

Consecuencia directa de [`adr/0005-una-app-tres-carriles.md`](adr/0005-una-app-tres-carriles.md).
Va **antes** que los tipos de actividad: parametrizar por carril componentes que ya asumen
tamaños fijos es un refactor caro, y el ADR lo dice explícitamente.

- [ ] Tipo `Carril = 'infantil' | 'lectores' | 'autonomos'` en `src/config.ts`
- [ ] `OBJETIVO_TACTIL` y `MAX_OBJETOS` reindexados **por carril**, no por etapa
      (hoy `primaria-c1` y `primaria-c2` comparten 60 px, y eso deja 4.º mal)
- [ ] Función explícita `carrilDe(etapa, curso)`, porque el 2.º ciclo LOMLOE se parte
- [ ] Tokens por carril en `estilos/tokens.css`: tamaño táctil, separación, cuerpo de texto
- [ ] Quitar de `docs/04-DISENO-UI.md` el aviso de que config y la tabla se contradicen

**Criterio de aceptación**: ningún componente lee un tamaño táctil de `Etapa`. Un test que
compruebe que `carrilDe` manda 3.º a `lectores` y 4.º a `autonomos`.

### T1.1 — Motor: tipo `eleccion` terminado

- [ ] Componente genérico que ejecuta cualquier JSON de tipo `eleccion`
- [ ] Estados: estímulo, acierto, «casi» con pista, actividad completada
- [ ] Sin cronómetro, sin vidas, sin puntuación visible durante el juego
- [ ] Objetivo táctil correcto **por carril** (75 / 60 / 48 px), vía T1.0
- [ ] Operable solo con teclado
- [ ] Test de que un fallo **no** termina la actividad

### T1.2 — Motor: tipos `emparejar` y `ordenar`

- [ ] Interacción de **toque sucesivo**, nunca arrastre (WCAG 2.5.7 y motricidad fina)
- [ ] Autocorrección por el oído: al tocar dos elementos, suenan los dos
- [ ] Reordenar es tocar en secuencia, no arrastrar

### T1.3 — Motor: tipo `guia-aula`

El más barato de construir y el más valioso en el aula española real, donde hay **una sola
pantalla y 25 niños**. Es la pantalla del maestro: consigna grande, pulso visible,
coreografía paso a paso, ficha imprimible.

- [ ] Modo proyector: tipografía enorme, alto contraste, legible a 8 metros
- [ ] Pulso visual sincronizado con el metrónomo
- [ ] Botón de imprimir ficha (CSS `@media print`)

### T1.4 — Navegación y catálogo

- [ ] Índice cargado desde `content/indice.json`
- [ ] Filtros por etapa, eje y criterio curricular ← **esta es la vista del maestro**
- [ ] Ruta `/actividad/:id`
- [ ] Un solo botón «atrás», siempre en el mismo sitio

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
- [ ] Test de que el metrónomo no usa `setInterval`

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

### T1.10 — Despliegue

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
