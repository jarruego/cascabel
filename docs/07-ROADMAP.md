# Hoja de ruta y tareas

Este fichero es la cola de trabajo. Cuando abras Claude Code, la primera frase útil es
**«lee CLAUDE.md y docs/07-ROADMAP.md y dime en qué tarea estamos»**.

Marca las tareas con `[x]` al cerrarlas. Cada una lleva **criterio de aceptación**: si no
se cumple, la tarea no está hecha, aunque el código compile.

---

## Fase 0 — Reducir incertidumbre (una semana)

> El objetivo de esta fase no es construir: es **descubrir si algo importante no funciona**
> antes de haber invertido meses. Son tres tareas y ninguna produce código que se quede.

### T0.1 — Prueba de riesgo del micrófono en iPad `⚠️ HAZLO PRIMERO`

Una página HTML mínima que abra el micrófono con el worklet de tono y pinte la frecuencia
en pantalla, grande.

- [ ] Funciona en Chrome de escritorio
- [ ] Funciona en Safari de iPad
- [ ] **Funciona en la PWA instalada en la pantalla de inicio del iPad** ← el dato que importa
- [ ] Funciona en Chrome de Android

**Por qué**: el bug 185448 de WebKit ha roto `getUserMedia` en modo *standalone* varias
veces. Si falla, cambia toda la estrategia de distribución (habría que empaquetar con
Capacitor). Es la información más valiosa que puedes conseguir ahora mismo y cuesta un día.

**Criterio de aceptación**: una tabla en `docs/pruebas/microfono.md` con dispositivo,
sistema, navegador, modo (pestaña / instalada) y resultado. Con capturas.

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

### T1.1 — Motor: tipo `eleccion` terminado

- [ ] Componente genérico que ejecuta cualquier JSON de tipo `eleccion`
- [ ] Estados: estímulo, acierto, «casi» con pista, actividad completada
- [ ] Sin cronómetro, sin vidas, sin puntuación visible durante el juego
- [ ] Objetivo táctil correcto por etapa (75 / 60 / 48 px)
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
- [ ] Calibración de latencia («da tres palmadas al ritmo»), guardada en el dispositivo
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
