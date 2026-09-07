# CLAUDE.md — contexto operativo del proyecto

Este fichero lo lee Claude Code al arrancar en este repositorio. Es la fuente de verdad
sobre **cómo se trabaja aquí**. Si algo de lo que te pido contradice este fichero, dímelo
antes de escribir código.

---

## 1. Qué estamos construyendo

**Cascabel**, del proyecto **cocomusic**, es una biblioteca libre de actividades de música
para **Educación Infantil (3–6 años) y Primaria (6–12)** en España, alineada con el
currículo LOMLOE.

- **Gratuita, sin registro, sin publicidad y sin enviar datos a nadie.** Esto no es un
  eslogan: es una restricción de arquitectura que aparece en casi todas las decisiones.
- **Es una biblioteca, no un método cerrado.** El maestro entra, filtra por curso y
  criterio curricular, y usa lo que necesita. No hay itinerario obligatorio ni desbloqueos.
- **PWA única** para ordenador, tablet y móvil. Funciona sin conexión.
- Autor: Jose Alberto (desarrollador full-stack). La validación pedagógica la hace una
  profesora de música. **Asume que el autor NO es experto en música**: cuando una decisión
  requiera criterio musical, dilo explícitamente y propón la opción convencional
  documentada, citando de dónde sale.

**Los nombres son definitivos.** `Cascabel` es esta aplicación; **cocomusic** es el
proyecto pedagógico mayor del que forma parte. Ambos viven en `APP` de `src/config.ts`
(`nombre` y `proyecto`) y no son un nombre en clave: no los cambies ni propongas
alternativas. Ninguno de los dos está cubierto por las licencias del código ni de los
contenidos — ver `TRADEMARK.md`, que cubre las dos marcas.

---

## 2. Las cinco reglas que no se rompen

Si una petición mía choca con una de estas, **párate y avísame**.

1. **Ni una petición fuera de nuestro origen.** Nada de CDN, Google Fonts, YouTube,
   analítica SaaS, iframes de terceros, Sentry, Firebase. Las tipografías se sirven desde
   `public/fuentes/`. La CSP de `infra/nginx.conf` y de `public/_headers` lo hace cumplir
   técnicamente, y es lo que nos permite prometerlo por escrito.
2. **El audio del micrófono nunca sale del dispositivo.** Nunca `MediaRecorder` para
   subir, nunca `fetch` con audio, nunca almacenamiento remoto. Todo el análisis vive en
   un `AudioWorklet`. Esto es lo que hace que jurídicamente no tratemos datos personales
   de un menor.
3. **Cero datos personales.** No hay cuentas, ni nombres, ni correos, ni fechas de
   nacimiento. El progreso vive en IndexedDB del dispositivo y no sale de él. Los códigos de
   verificación se retiraron el 2026-09-08 (ver `docs/adr/0007`): daban por hecho un
   dispositivo por niño, y la norma es una pizarra y ninguno.
4. **El error nunca castiga.** Prohibidos: vidas, corazones, cronómetros por defecto,
   rachas, clasificaciones entre niños, sonidos de fallo desagradables, pantallas rojas.
   El feedback de error es una pista concreta y amable.
5. **Motor + datos.** Las actividades **no se programan una a una**: son ficheros JSON
   validados contra `schemas/actividad.schema.json` que ejecuta un tipo de motor genérico.
   Si te pido "haz la actividad X" y no existe su tipo de motor, lo correcto casi siempre
   es crear el JSON, no un componente nuevo.

---

## 3. Stack y versiones

| Capa | Elección | Notas |
|---|---|---|
| App | React 19 + Vite 6 + TypeScript estricto | Sin SSR, sin Next, sin Astro |
| Estado | Zustand | Nada de Redux |
| Rutas | react-router (modo declarativo) | |
| Partitura | **abcjs** por defecto; **VexFlow** cuando haga falta controlar hitboxes | |
| Partitura importada | Verovio **solo** con `import()` dinámico | Es LGPL: fichero aparte, jamás en el bundle |
| Audio | Tone.js para transporte + sampler propio con muestras Opus | |
| Escucha | `pitchy` (McLeod) dentro de un `AudioWorklet` | |
| Onsets (palmadas) | detector propio en `src/worklets/onset-processor.js` | No hay librería usable con licencia compatible |
| PWA | `vite-plugin-pwa` (Workbox) | Precache < 10 MB |
| Contenido | JSON + JSON Schema, música embebida en notación **ABC** | |
| Validación de contenido | Python + `music21` en `tools/validar.py` | |
| Despliegue | Cloudflare Pages | **Vercel Hobby prohíbe uso comercial: no lo uses** |

**Licencias permitidas para dependencias nuevas: MIT, BSD, ISC, Apache-2.0.** Prohibidas
GPL y AGPL en el front-end (contagian). LGPL solo como fichero cargado dinámicamente.
Antes de añadir una dependencia, di qué licencia tiene y cuánto pesa en gzip.

Trampas ya verificadas, no las repitas:
- `ml5.js` **ya no** hace detección de tono (se eliminó en 1.x). Cualquier tutorial que lo use está muerto.
- `OSMD` arrastra VexFlow 1.2.93 (2017) y su reproductor de audio no es gratuito.
- `aubio.js` es GPL-3.0 y `essentia.js` es AGPL-3.0: **descartadas**.
- El tag `latest` de npm para `tone` apunta a 15.1.22; hay una 15.5.x bajo el tag `next`. Fija versión.

---

## 4. Estructura del repositorio

```
src/
  config.ts             Constantes globales (nombre, versión del esquema, idioma por defecto)
  main.tsx  App.tsx
  app/                  Rutas, layout, proveedor de audio
    Catalogo.tsx        La vista del MAESTRO: filtros curriculares y buscador
    Camino.tsx          El orden sugerido por etapa. No bloquea nada: §1
    Instrumentos.tsx    Lo marcado con `herramienta` en su JSON, no por el prefijo
  motor/
    tipos.ts            Tipos TypeScript derivados del JSON Schema
    registro.ts         Mapa tipo-de-actividad -> componente. La lista viva está en
                        docs/01-ARQUITECTURA.md, con un test que la vigila
    tipos/              Un componente por tipo: Eleccion.tsx, Karaoke.tsx, Pistas.tsx...
    maquina*.ts         Reglas de producto puras, con test. NO viven en el componente
    escala.ts           Tonos, semitonos y construcción de escalas
    rejillaRitmica.ts   Sílabas Kodály -> instantes. `inicios` (sílabas) != `golpes`
    melodiaEnTiempo.ts  Instantes de una melodía, con el margen de entrada
    musicograma.ts      Qué puede significar el eje transversal según la representación
    alturaEnPauta.ts    Nota -> altura en el pentagrama, con líneas adicionales
    grabacionEventos.ts Grabar QUÉ y CUÁNDO, no audio
  audio/
    AudioEngine.ts      AudioContext único, resume por gesto, latencia
    metronomo.ts        Lookahead scheduling (nunca setInterval)
    clic.ts             El clic del pulso. Un oscilador, compartido
    sampler.ts          Muestras Opus + playbackRate + ADSR, y `sostener()`
    percusion.ts        Golpes sin altura, con round robin. NO es el sampler
    cuerpo.ts           Pitos, palmas, muslos y pies. Es SEÑAL, no timbre: §7
    instrumentos.ts     Qué instrumentos hay y cuáles sostienen
  escucha/
    microfono.ts        getUserMedia con el procesado de voz DESACTIVADO
    tono.ts             Puente al worklet de pitchy
    palmadas.ts         Puente al worklet de onsets
    grabadora.ts        MediaRecorder. Lo ÚNICO que captura voz. Ver §8 y 08-LEGAL
  worklets/             Código que corre en el hilo de audio (JS plano, no TS)
  datos/
    cargar.ts           Único punto que hace fetch. Solo rutas relativas
    progreso.ts         IndexedDB con degradación a memoria
    grabaciones.ts      Audio del niño. Base APARTE de la del progreso, a propósito
    exportar.ts         MIDI y MusicXML escritos a mano, sin dependencias
    compartir.ts        Estado en la URL y códigos de verificación
  ui/                   Botones grandes, iconos, retroalimentación
    Lienzo.tsx          Modo pantalla completa. CSS siempre + API nativa si la hay
    coloresNota.ts      Código Boomwhacker, compartido por piano y musicograma
    tecladoQwerty.ts    Tocar con el teclado del ordenador, por posición física
  i18n/                 es.json y futuros idiomas. NINGÚN texto en el código
  estilos/tokens.css    Colores, tipografías, tamaños táctiles por edad
content/
  actividades/*.json    Una actividad por fichero
  catalogo.json         Backlog y reserva de códigos. El validador la usa
  camino.json           En qué orden hacerlas. Es una opinión, no una condición
schemas/actividad.schema.json
tools/                  validar.py, indice.mjs, presupuesto.mjs, tabla-tipos.mjs
                        y los muestras-*.py que construyen el banco de audio
docs/                   Documentación viva (ver índice en README)
prompts/                Prompts de generación de contenido
```

---

## 5. Convenciones de código

- **Español para el dominio, inglés para lo técnico.** Un componente se llama
  `Pentagrama`, no `Staff`; pero `useEffect`, `props` y `async` son lo que son. Los
  identificadores de dominio (`etapa`, `eje`, `criterio`, `saber`) van siempre en español
  porque son términos del BOE y tienen que coincidir con el JSON.
- **Comentarios en español**, y solo donde expliquen un *porqué* no evidente.
- TypeScript estricto. Nada de `any`. Si un tipo se pone difícil, prefiere un tipo unión
  explícito antes que ensanchar.
- **Ningún literal de texto en componentes.** Todo pasa por `t('clave')`. Es lo que hace
  que traducir después sea una tanda de trabajo y no un refactor.
- Los componentes de actividad **no tocan el `AudioContext` directamente**: usan
  `useAudio()`. Un solo `AudioContext` en toda la app.
- CSS con variables de `estilos/tokens.css`. Nada de valores mágicos: los tamaños táctiles
  salen de `--objetivo`, que vale lo que toque según el carril (`--objetivo-infantil`,
  `--objetivo-lectores`, `--objetivo-autonomos`). Un componente pide `var(--objetivo)` y no
  necesita saber en qué carril está.
- Commits en español, imperativo, con ámbito: `motor: añade tipo emparejar`,
  `contenido: 6 actividades de Infantil`, `audio: compensa outputLatency`.

---

## 6. Accesibilidad: mínimos innegociables

Objetivo **WCAG 2.2 AA**, y para niños es un suelo, no una meta.

| Etapa | Objetivo táctil mínimo | Separación | Objetos simultáneos |
|---|---|---|---|
| Infantil (3–6) | 75 × 75 px | ≥ 24 px | 2–4 |
| 1.º–3.º (6–8) | 60 × 60 px | ≥ 16 px | 4–6 |
| 4.º–6.º (9–12) | 48 × 48 px | ≥ 12 px | 6–9 |

- **Nada esencial solo en texto.** Dentro de la actividad, lo que hay que reconocer, imitar o cantar **suena**: no se lee. El enunciado sí es texto y lo lee un adulto en voz alta; no hay locuciones grabadas y no va a haberlas — ver `docs/adr/0006`. Escríbelos para decirlos, no para leerlos: frases cortas y en segunda persona.
- Botón de repetir audio siempre visible, en el mismo sitio.
- El color nunca informa solo: siempre color + forma + sonido.
- Toda actividad de ritmo debe poder hacerse **mirando** (pulso visual + `navigator.vibrate()`).
- Toda actividad de micrófono tiene alternativa por toque.
- **Nada de arrastrar como ÚNICA vía, a ninguna edad** (WCAG 2.5.7). Arrastrar se
  ofrece en los tres carriles como camino adicional; el toque sucesivo —tocar el
  elemento y después su destino— funciona siempre y es el que se diseña primero.
- Respeta `prefers-reduced-motion`. Nada parpadea más de 3 veces por segundo.
- Tipografías: Andika para Infantil, Atkinson Hyperlegible y OpenDyslexic conmutables.

---

## 7. Audio: reglas técnicas que ya están decididas

- **Un solo `AudioContext`**, creado con `latencyHint: 'interactive'`, y `resume()`
  **siempre dentro de un gesto del usuario** (el botón grande de "¡Empezar!").
- **Nunca `setInterval` para tiempo musical.** Lookahead scheduling: `setTimeout` cada
  25 ms programa eventos 100 ms hacia el futuro con `audioCtx.currentTime`.
- **Separa lo visual de lo sonoro**: los eventos van a una cola que consume un
  `requestAnimationFrame`. Animar dentro del planificador produce desfase visible.
- **Compensa `outputLatency` + `baseLatency`** antes de comparar el golpe del niño con la
  rejilla esperada. Hay una calibración manual guardada en el dispositivo.
- No fijes 44100 en el código: lee `audioContext.sampleRate` (cambia al abrir el micrófono).
- Muestras: **una cada tres semitonos** en los instrumentos sostenidos y 5–7 por octava en
  los percusivos, Opus 48 kbps mono. La marimba aguanta el estirado porque es percusiva;
  `playbackRate` cambia la altura **y la duración**, así que una flauta estirada tres
  semitonos suena a flauta acelerada.
- **Los instrumentos que no son el de por defecto NO van al precache.** Son casi 2 MB entre
  todos, y meterlos multiplicaría por tres la primera descarga de un colegio entero para
  bajar instrumentos que ese niño no va a abrir. `vite.config.ts` los excluye y los cachea
  al usarlos con `CacheFirst`.
- **La percusión no pasa por el sampler.** Un bombo no tiene altura que interpolar, y
  estirarlo lo convierte en otro instrumento. Ver `audio/percusion.ts`.
- **Anclar al primer golpe hace innecesaria la compensación de latencia**, porque el retardo
  desplaza por igual al origen y a los demás. Sigue haciendo falta donde se compara contra
  un reloj externo, como en el musicograma.

Tolerancias de evaluación rítmica, por edad:

| Edad | Perfecto | Bien | Casi |
|---|---|---|---|
| 3–5 | ±150 ms | ±250 ms | ±400 ms |
| 6–8 | ±100 ms | ±180 ms | ±300 ms |
| 9–12 | ±70 ms | ±130 ms | ±220 ms |

**Reporta siempre desvío medio con signo y desviación típica, no solo un porcentaje.** Un
niño que va 120 ms tarde con desviación de 20 ms tiene un pulso excelente, solo desfasado;
un porcentaje le diría que ha fallado.

---

## 8. Micrófono: la lista de minas

**Regla previa a todas las demás: el micrófono es un accesorio, nunca un requisito.**
Ante *cualquier* fallo —permiso denegado, `NotAllowedError`, `NotFoundError`, el
`AudioWorklet` que no carga, un navegador sin `getUserMedia`, o el bug de iOS en PWA
instalada— la actividad **degrada a la vía de toque y continúa**. Nunca una pantalla de
error, nunca un callejón sin salida, nunca una actividad que no se puede terminar.
Concretamente:

- Todo código de micrófono va envuelto en `try/catch` y devuelve un resultado, no una
  excepción que suba hasta el componente.
- El cambio a toque es **silencioso para el niño**: como mucho, un aviso discreto pensado
  para el adulto («no hemos podido usar el micrófono; puedes tocar en la pantalla»).
  Al niño no se le explica un fallo técnico: se le ofrece el botón.
- La vía de toque no es un modo degradado de segunda: es una forma legítima de hacer la
  actividad y tiene que estar completa antes de que se escriba el detector.
- No se pide el permiso al entrar. Se pide cuando hace falta, tras la pantalla ilustrada,
  y si se deniega no se vuelve a insistir en esa sesión.
- Nada de detección de navegador para decidir si se ofrece el micrófono. Se intenta y se
  cae con elegancia: los *user agents* mienten y las versiones cambian.

Esto no es sólo accesibilidad (§6, «toda actividad de micrófono tiene alternativa por
toque»): es lo que mantiene el riesgo de iOS acotado a un defecto en vez de a un cambio de
arquitectura. Ver `docs/adr/0004-pwa-primero.md`.

Y ahora las minas propiamente dichas:

- `getUserMedia` con `echoCancellation: false`, `noiseSuppression: false`,
  `autoGainControl: false`, `channelCount: 1`. El procesado de voz del navegador está hecho
  para llamadas y destroza la música.
- Análisis **siempre en `AudioWorklet`**, nunca en el hilo principal.
- Filtrado de señal infantil: gating por RMS + umbral de claridad > 0,85 + mediana de 3–5 lecturas.
- Periodo refractario de 100–120 ms en el detector de palmadas, o una palmada genera 3–4
  onsets por las reflexiones de la sala.
- **iOS**: `getUserMedia` redirige la salida de audio (baja el volumen); `echoCancellation`
  se ignora; hay bugs recurrentes de `AudioWorklet`; y el bug WebKit 185448 hace que
  `getUserMedia` falle en PWA instalada en pantalla de inicio. **No tenemos ningún
  dispositivo iOS**, así que nada de esto está verificado: es riesgo abierto, y por eso la
  degradación a toque de arriba no es opcional. Si algún día hay un iPad a mano, pruébalo
  en el aparato real — el simulador miente. Ver `docs/adr/0004-pwa-primero.md` y T0.1.
- Permiso tardío y contextual, tras una pantalla explicativa ilustrada. La pantalla de
  "permiso denegado, ve a Ajustes" se diseña **para el adulto**.
- `track.stop()` al salir de la actividad, para que el indicador del navegador se apague.

---

## 9. Currículo: cómo se etiqueta el contenido

**Dos capas separadas, y no se mezclan.**

- **Capa normativa** (`curriculo` en el JSON): solo etiquetas literales del real decreto.
  Primaria: área *Educación Artística*, competencias **CE1–CE4** (son cuatro, no seis),
  criterios por ciclo, saberes básicos del **bloque D** (el musical; A, B y C son otros).
  Infantil: área III, criterios 3.5, 3.6, 2.1, 2.2, 4.1, 5.4, 5.5, saberes F y H.
- **Capa de práctica** (`practica` en el JSON): "negra", "compás de 4/4", "flauta". Esto es
  convención pedagógica, **no** currículo — el RD nunca nombra una figura ni una nota.

Progresiones paralelas que **no coinciden** y se modelan por separado:
- Vocal (Kodály): `sol-mi → sol-mi-la → pentatónica → diatónica`
- Flauta: `si-la-sol → do'-re' → fa#-mi-re-do`

Detalle completo en `docs/03-CURRICULO.md`. **No inventes referencias curriculares**: si no
estás seguro de un criterio, deja `"criterio": null` y márcalo en un comentario del PR.

---

## 10. Contenido: el ciclo de trabajo

1. Se genera el JSON contra `schemas/actividad.schema.json` (prompt en `prompts/`).
2. `npm run contenido:validar` — comprueba esquema + música con `music21`: que los compases
   cuadran, que el ámbito está en la tesitura de la edad, que no hay saltos mayores de sexta
   para principiantes, que las figuras pertenecen al curso declarado.
3. Revisión visual en lote en `/revisar` (renderiza N actividades con su botón de play).
4. Revisión pedagógica: ¿es cantable a esta edad?, ¿se entiende sin leer?, ¿lo haría en clase?

**Lo que la IA no decide**: la secuencia didáctica (sale del currículo), el repertorio
(toda canción se verifica contra una fuente de dominio público antes de entrar), las
y los textos normativos (se copian del BOE, no se parafrasean).

**Y cuidado también con los métodos.** Orff-Schulwerk, Kodály y Dalcroze son de uso libre:
un método no se protege, se protege el texto en que se explicó, y sus sílabas rítmicas o sus
cuatro sonidos corporales están en cualquier manual de magisterio desde hace décadas.
**BAPNE® no**: es marca registrada, con autor vivo y titularidad expresa sobre su notación,
su terminología y sus secuencias. Coincidir en los cuatro sonidos es inevitable —son los que
tiene un cuerpo— pero no se copia su forma de escribirlos ni se sugiere relación alguna con
el método. Ver `docs/08-LEGAL.md`.

**Cuidado con el repertorio**: muchas canciones que parecen tradicionales están protegidas
("La vaca lechera", Cri-Cri). El plazo español es 70 años, **pero 80 si el autor murió antes
del 7-12-1987**. Y el fonograma es un derecho aparte: nunca se usa audio ajeno.

---

## 11. Cómo quiero que trabajes

- **Empieza por leer** `docs/07-ROADMAP.md` y dime en qué tarea estamos.
- **Un cambio, un propósito.** Nada de refactorizar de paso.
- **No instales dependencias sin decírmelo**, con licencia y peso gzip.
- **Antes de crear un componente nuevo**, comprueba si el caso se resuelve con un JSON de
  un tipo existente. Casi siempre sí.
- **Escribe el test cuando el comportamiento sea temporal o musical** (tolerancias,
  scheduling, validación de contenido). No hace falta test para maquetación.
- **Las reglas de producto no viven en el componente.** Van en un módulo puro —`maquina*.ts`,
  `escala.ts`, `musicograma.ts`— con su test. Un componente pinta y programa temporizadores;
  si hay que cambiar cuándo se avanza o qué cuenta como acierto, se cambia allí, donde hay
  un test que lo vigila. Es lo que ha permitido reescribir tres veces la interfaz de
  «ordenar» sin tocar ni una regla.
- **Un fallo que se ha visto una vez se convierte en test.** No siempre es posible —jsdom no
  implementa `dialog.show()`, por ejemplo—, y entonces **no se escribe un test falso**: se
  documenta en el código por qué no lo hay.
- **Verifica antes de decir que has terminado**: `npm run verificar`.
- Si una tarea requiere criterio musical que no tengo, **no lo adivines en silencio**:
  propón la opción convencional, di de dónde sale, y márcala escribiendo literalmente
  `PENDIENTE DE REVISIÓN PEDAGÓGICA` en un comentario **junto a la decisión**, no en un
  documento aparte. `npm run docs:pendientes` las recoge todas con su contexto en
  `docs/13-PENDIENTE-DE-REVISION.md`, que es lo que se le pasa a la profesora.
- Cuando toques audio o micrófono, recuérdame probarlo en dispositivo real: el emulador miente.

## 12. Comandos

```bash
npm run dev                 # servidor de desarrollo en 0.0.0.0:5173
npm run verificar           # typecheck + lint + tests + validación de contenido
npm run contenido:preparar  # crea .venv con music21 y jsonschema (Python 3.11+)
npm run contenido:validar   # solo el validador de actividades
npm run contenido:indice    # regenera content/indice.json desde las actividades
npm run contenido:auditar   # revisa las actividades: textos, nivel, currículo, personaje
npm run docs:tipos          # rehace la tabla de tipos de docs/01-ARQUITECTURA.md
npm run docs:pendientes     # reúne lo que espera criterio musical en docs/13
npm run build && npm run preview

docker compose up web                       # todo el entorno, sin instalar node
docker compose --profile tools run contenido  # validador con music21
docker compose --profile prod up prod       # build de producción en :8080
```
