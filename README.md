# Cascabel

**Biblioteca libre de actividades de música para Educación Infantil y Primaria.**
Gratis, sin registro, sin publicidad y sin enviar datos a ningún sitio.

Cascabel es la aplicación; forma parte del proyecto pedagógico **cocomusic**.

> Estado: **fase 0**. Andamiaje del proyecto listo; el producto está por construir.
> La cola de trabajo está en [`docs/07-ROADMAP.md`](docs/07-ROADMAP.md).

---

## Qué es

Un maestro entra, filtra por curso y por criterio curricular LOMLOE, y usa la actividad que
necesita. No hay itinerario obligatorio, ni desbloqueos, ni cuentas. Se abre y funciona.

Lo que no existe hoy en el mercado español: hay juguetes musicales excelentes sin secuencia
didáctica, plataformas con secuencia didáctica pero cerradas, de pago y atadas a un libro
con ISBN, y recursos gratuitos en español que se financian con publicidad servida a menores.
**Nadie ofrece las tres cosas a la vez: buenas actividades, cosidas al currículo, libres.**

## Las cinco reglas del proyecto

1. **Ni una petición fuera de nuestro origen.** Sin CDN, sin Google Fonts, sin YouTube, sin
   analítica de terceros. La CSP lo hace cumplir técnicamente.
2. **El audio del micrófono nunca sale del dispositivo.** Todo se analiza en un
   `AudioWorklet`. Es lo que hace que no tratemos datos personales de un menor.
3. **Cero datos personales.** No hay cuentas. El progreso vive en IndexedDB del dispositivo.
4. **El error nunca castiga.** Sin vidas, sin cronómetros, sin rachas, sin clasificaciones.
5. **Motor + datos.** Las actividades son ficheros JSON validados, no código.

## Arranque rápido

### Con Docker (no necesitas instalar nada)

```bash
git clone https://github.com/jarruego/cascabel.git
cd cascabel
docker compose up web          # http://localhost:5173
```

### Con Node en local

```bash
nvm use                        # Node 22
npm install
npm run contenido:preparar     # Python 3.11+ para el validador de contenido
npm run dev
```

> El validador necesita **Python 3.11 o superior** (lo exige `music21`). En Windows,
> `python3` es el alias de la Microsoft Store y no sirve: usa `py -3`, o deja que
> `npm run contenido:preparar` lo resuelva. Si no quieres instalar Python,
> `docker compose --profile tools run contenido` hace lo mismo.

### Con VS Code

Abre la carpeta y acepta **«Reopen in Container»**: el devcontainer monta Node, Python y las
extensiones recomendadas. El esquema de actividades queda enganchado al editor, así que
`content/actividades/*.json` se autocompleta y se valida mientras escribes.

## Comandos

```bash
npm run dev                 # servidor de desarrollo (0.0.0.0:5173)
npm run verificar           # typecheck + lint + tests + validación de contenido
npm run contenido:preparar  # crea .venv e instala music21 y jsonschema (una vez)
npm run contenido:validar   # esquema + música (music21) + reglas de producto
npm run contenido:indice    # regenera content/indice.json
npm run build && npm run preview

docker compose --profile tools run contenido   # validador con music21, sin instalar Python
docker compose --profile prod up prod          # build de producción en :8080
```

## Cómo está organizado

```
CLAUDE.md              ← contexto operativo. Léelo antes que este README si vas a programar
docs/                  documentación viva (índice abajo)
schemas/               JSON Schema de una actividad. Es la fuente de verdad del formato
content/
  catalogo.json        backlog de las 54 actividades previstas
  actividades/*.json   las actividades reales, una por fichero
src/
  motor/               un componente por TIPO de actividad, no por actividad
  audio/               AudioContext único, metrónomo con lookahead, sampler
  escucha/             micrófono, detección de tono y de palmadas
  ui/  i18n/  estilos/
public/worklets/       código del hilo de audio (se carga por URL, no por import)
tools/                 validar.py, indice.mjs, presupuesto.mjs
prompts/               prompts de generación de contenido y de sesión con Claude Code
```

## Documentación

| Documento | Para qué |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Empieza aquí si vas a escribir código.** Reglas, stack, convenciones |
| [docs/01-ARQUITECTURA.md](docs/01-ARQUITECTURA.md) | Motor + contenido declarativo, y por qué |
| [docs/02-ESQUEMA-ACTIVIDAD.md](docs/02-ESQUEMA-ACTIVIDAD.md) | Cómo se escribe una actividad |
| [docs/03-CURRICULO.md](docs/03-CURRICULO.md) | LOMLOE, las dos capas de etiquetas, progresión por curso |
| [docs/04-DISENO-UI.md](docs/04-DISENO-UI.md) | Diseño para niños que aún no leen. WCAG 2.2 AA |
| [docs/05-AUDIO-Y-MICROFONO.md](docs/05-AUDIO-Y-MICROFONO.md) | Scheduling, latencia, detección de tono, minas de iOS |
| [docs/06-PIPELINE-IA.md](docs/06-PIPELINE-IA.md) | Generar contenido con IA y validarlo con código |
| [docs/07-ROADMAP.md](docs/07-ROADMAP.md) | **La cola de trabajo.** Tareas con criterio de aceptación |
| [docs/08-LEGAL.md](docs/08-LEGAL.md) | RGPD y menores, micrófono, accesibilidad, licencias, repertorio |
| [docs/09-DOSIER.md](docs/09-DOSIER.md) | Investigación de producto y mercado (foto de 09/2026) |
| [docs/10-AUDIO-MUESTRAS.md](docs/10-AUDIO-MUESTRAS.md) | De dónde sale el audio, y qué es provisional |
| [docs/11-RECURSOS-Y-REFERENTES.md](docs/11-RECURSOS-Y-REFERENTES.md) | Recursos libres con licencia y veredicto, e investigación de interfaz infantil |
| [docs/12-IDEAS-Y-AMPLIACIONES.md](docs/12-IDEAS-Y-AMPLIACIONES.md) | Qué hay libre que se pueda aprovechar, qué construir y **qué no hacer** |
| [docs/13-PENDIENTE-DE-REVISION.md](docs/13-PENDIENTE-DE-REVISION.md) | **Generado.** Todo lo que espera criterio musical o de aula, en un sitio |
| [docs/14-PERSONAJES.md](docs/14-PERSONAJES.md) | Los ocho personajes de cocomusic: poses, prompts y cómo entran en la app |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura, con sus consecuencias |

## Trabajar con Claude Code

```
Lee CLAUDE.md y docs/07-ROADMAP.md y dime en qué tarea estamos.
```

Más frases útiles en [`prompts/sesion-claude-code.md`](prompts/sesion-claude-code.md).

## Contribuir contenido

Una actividad es un fichero JSON. No hace falta programar:

1. Copia `content/actividades/inf-01-semaforo-del-sonido.json` como plantilla.
2. Escríbela (o genérala con `prompts/generar-actividad.md`).
3. `npm run contenido:validar` — comprueba el esquema, que los compases cuadran, que el
   ámbito cabe en la tesitura de la edad y que no hay saltos imposibles.
4. Abre un PR con la plantilla de *Nueva actividad*.

## Licencias

- **Código**: [Apache-2.0](LICENSE)
- **Contenidos**: [CC BY-SA 4.0](LICENSE-CONTENT.md)
- **Esquemas y datos**: CC0
- **Nombres y logotipos** (*Cascabel* y *cocomusic*): excluidos de las anteriores
  ([TRADEMARK.md](TRADEMARK.md))

Material de terceros inventariado en [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Privacidad

No hay cuentas, no hay cookies de seguimiento, no se envía nada a terceros y el audio del
micrófono nunca sale del dispositivo. No es una promesa: es la
[CSP](public/_headers) del sitio, y el código está aquí para comprobarlo.
