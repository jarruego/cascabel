# Legal, privacidad y licencias

> Análisis técnico-documental, no asesoramiento jurídico.

## La estrategia en una frase

**Si no recoges datos, no hay nada que cumplir.** En España el art. 7 de la LOPDGDD fija en
**14 años** la edad de consentimiento digital, y hay un proyecto de ley que la elevaría a
**16**. *Todos* nuestros usuarios están por debajo. Cualquier dato personal exigiría
consentimiento parental verificable: caro, con muchísima fricción y con una trampa deliciosa,
porque para verificar la edad acabas tratando más datos que si no verificaras.

| Escenario | Carga legal | Decisión |
|---|---|---|
| **A.** Anónimo total, todo en el dispositivo | Mínima | ✅ **Estamos aquí. Puede que baste para siempre** |
| **B.** Anónimo + estado en URL + códigos de verificación | Idéntica a A | ✅ **El objetivo**: evaluación para el maestro sin tratar un dato |
| **C.** Cuenta de profesor + alumnos con alias | Media: contrato de encargo con cada centro, DPIA, ENS si es público | ⚠️ Solo si un docente lo pide de verdad |
| **D.** Cuentas nominales de alumno | Alta | ❌ No |
| **E.** Audio o vídeo del alumno en servidor | Muy alta | ❌ Nunca |

Matiz que casi nadie conoce: la edad de 14/16 solo aplica **cuando la base legal es el
consentimiento y el servicio se ofrece directamente al menor**. Dentro de un centro
educativo la base legal es la misión de interés público del centro, y entonces **el
responsable es el centro y nosotros seríamos el encargado**. Ese cambio de figura es lo que
dispara el escenario C: contrato del art. 28 RGPD con cada colegio, registro de actividades,
medidas del art. 32 y probablemente conformidad con el Esquema Nacional de Seguridad. Es la
barrera real de entrada al sector público español.

## El micrófono

**El audio se procesa en el dispositivo y no sale de él. Nunca.** Es lo que hace que
materialmente no tratemos datos personales de un menor: no recibimos, no almacenamos, no
accedemos. Cómo se hace verificable:

- **CSP `connect-src 'self'`** (`public/_headers` e `infra/nginx.conf`). Aunque alguien
  inyectase código, no podría exfiltrar nada. **Publicar la CSP y el código fuente es la
  única forma de demostrar la promesa** en vez de afirmarla.
- `Permissions-Policy: microphone=(self)`: ningún iframe puede pedirlo.
- Nada de `MediaRecorder` salvo que el niño pulse explícitamente «grabar mi versión», y
  entonces a IndexedDB local con borrado a un clic.
- `track.stop()` al salir, para que el indicador del navegador se apague.
- **Siempre alternativa sin micrófono.** Accesibilidad (mutismo, disfemia, vergüenza) y
  realidad del aula (25 micrófonos abiertos son inutilizables).

## Mínimos desde el día uno

- Aviso legal (art. 10 LSSI) y política de privacidad honesta, más **versión para niños con
  pictogramas** (art. 12 RGPD: lenguaje adaptado).
- Logs con **IP anonimizada** (truncar 2 bytes) y retención de 7–30 días. La IP es dato
  personal desde la sentencia *Breyer* (C-582/14).
- **Sin banner de cookies**, y con motivo: guardar el progreso que el usuario ha pedido
  guardar entra en la excepción del art. 22.2 LSSI. Documentado aquí.
- **Analítica propia sin identificadores**: Umami (MIT) autoalojado, o nada.
  **Nunca Google Analytics.**
- **Ni una petición fuera de nuestro origen.** Sin YouTube, sin reCAPTCHA, sin CDN. Las
  tipografías se sirven desde `/fuentes`: enlazar a Google Fonts transmite la IP del niño a
  Google y ya hay condena judicial en Alemania.

## Accesibilidad

El RD 1112/2018 obliga al sector público, no a un proyecto personal; la Ley 11/2023 cubre
una lista cerrada de servicios de consumo donde esto no encaja. **Pero** hay tres puertas de
entrada: pedir una subvención pública, que una administración integre la app en su portal, o
contratar con un centro público. En los tres casos exigen EN 301 549 y declaración de
accesibilidad.

Y el argumento de peso: el **Diseño Universal para el Aprendizaje está en la LOMLOE**. Un
recurso que lo cumple es mucho más defendible ante un claustro. Objetivo WCAG 2.2 AA — ver
`docs/04-DISENO-UI.md`.

## Licencias del proyecto

| Componente | Licencia | Fichero |
|---|---|---|
| Código | **Apache-2.0** | `LICENSE` |
| Contenidos (actividades, textos, arreglos, grabaciones) | **CC BY-SA 4.0** | `LICENSE-CONTENT.md` |
| Datos y esquemas | **CC0** | idem |
| Nombre y logotipo | Excluidos expresamente | `TRADEMARK.md` |

**No usamos CC BY-NC.** Parece protector y es paralizante: nadie sabe si un colegio
concertado es «comercial», así que ante la duda no lo usan. Además no es una licencia libre,
excluye de Wikimedia y de buena parte de Procomún, y es incompatible con CC BY-SA (no
podríamos mezclar material de CPDL ni de Mutopia).

## Repertorio: la trampa de los 80 años

El plazo español es de 70 años **salvo que el autor falleciera antes del 7 de diciembre de
1987, en cuyo caso son 80** (disposición transitoria 4.ª del TRLPI). Y el **fonograma** tiene
su propio plazo de 70 años desde la publicación, independiente del autor: una grabación de
1990 de una obra del XIX está protegida.

| Obra | ¿Libre en 2026? |
|---|---|
| Pedrell, *Cancionero Musical Popular Español* (†1922) | ✅ desde 2003 |
| Olmeda, *Cancionero popular de Burgos* (†1909) | ✅ desde 1990 |
| García Lorca, *Canciones españolas antiguas* (†1936) | ✅ desde 2017 |
| Falla, *Siete canciones populares* (†1946) | ❌ hasta enero de 2027 |
| «La vaca lechera» (1948) | ❌ protegida |
| Repertorio de Cri-Cri (†1990) | ❌ hasta 2061 |

**Regla de oro**: melodía tradicional documentada en fuente de dominio público + **nuestra**
armonización + **nuestra** grabación con samples CC0 = limpio y relicenciable. Nunca audio
extraído de YouTube ni de otra plataforma educativa.

Fuentes limpias: **OpenScore** (CC0), **Biblioteca Digital Hispánica** (BNE), Mutopia, CPDL.
Audio: **VSCO 2 CE** y **VCSL** (CC0), Freesound filtrando CC0, Kenney.nl (CC0). Tipografías:
Bravura y Andika (OFL). Evita Pixabay, Pexels y Freepik: sus licencias no son libres y no se
pueden sublicenciar.

## Frontera con las plataformas educativas comerciales

Existen plataformas de música escolar de pago, cerradas y ligadas a libros de texto. Coincidir
con ellas en un currículo público es inevitable y perfectamente lícito; lo que sigue marca
dónde está la raya, y este apartado se escribe **antes** de diseñar, no después.

**Sí se puede.** Replicar *funcionalidades*, porque ninguna es apropiable: dictado rítmico y
melódico, lectura de notas, identificación de intervalos, seguimiento del progreso, panel del
profesor, ejercicios autocorregidos. Adoptar la secuencia pedagógica general, que es didáctica
estándar de cualquier manual. Y seguir el mismo currículo oficial: los reales decretos son
disposiciones legales y el **art. 13 TRLPI** las excluye expresamente de la protección, así
que competencias, criterios y saberes básicos se pueden copiar literalmente — de hecho hay que
hacerlo, porque parafrasear el BOE introduce errores.

**No se puede.** Copiar textos, enunciados o consignas ajenas, ni siquiera parafraseando de
cerca (obra literaria protegida). Ilustraciones, personajes, iconos o animaciones. Audio,
grabaciones y locuciones (fonograma **más** derechos de intérprete, que son derechos
distintos). Partituras y arreglos concretos: aunque la melodía sea de dominio público, la
armonización ajena es obra derivada protegida. Fichas y PDF con ISBN. Extraer una parte
sustancial de un banco de ejercicios ajeno, protegido por el **derecho *sui generis* sobre
bases de datos** (arts. 133-137 TRLPI) aunque ningún ítem suelto fuese original. Y reproducir
una identidad visual característica: la **Ley 3/1991 de Competencia Desleal** sanciona los
actos de confusión y el aprovechamiento de la reputación ajena.

**Protocolo limpio, y es el que seguimos.** No se descarga nada de sitios ajenos. El análisis
de mercado se toma con palabras propias y fecha, y ese documento se guarda como prueba de que
se trabajó desde ideas y no desde material ajeno. Se deja pasar tiempo entre analizar y
diseñar. Y se diseña partiendo del currículo y de los métodos (Orff, Kodály, Dalcroze), nunca
de la pantalla de otro. La diferenciación visual es deliberada: otra paleta, otros personajes,
otro nombre y otra voz.

> Este apartado es la razón por la que conviene conservarlo aunque no se nombre a nadie: es el
> registro fechado de que la frontera se estudió antes de escribir la primera actividad.

## Los métodos pedagógicos: cuáles son libres y cuál no

Se comprobó el 2026-09-07, al hacer el tipo `cuerpo`, y el resultado no es homogéneo.

**Orff-Schulwerk, Kodály y Dalcroze son de uso libre.** Son enfoques pedagógicos publicados
hace entre setenta y cien años, y **una idea o un método no se protegen**: lo protegido es el
texto concreto en que se explicaron. Sus cuatro sonidos corporales —pitos, palmas, muslos y
pies—, las sílabas rítmicas *ta* y *ti-ti* o la fononimia están en cualquier manual de
magisterio desde hace décadas y en cualquier patio de colegio desde antes. Se usan.

**BAPNE® no.** Es una marca registrada y un método con autor vivo y titularidad expresa:
su **notación, su terminología y sus secuencias concretas** están protegidas como obra, y
además hay una estructura de formación oficial y de certificación detrás. Coincidir en los
cuatro sonidos es inevitable —son los que tiene un cuerpo humano—, pero **no se copia su
forma de escribirlos, ni su vocabulario, ni sus secuencias**, ni se sugiere ninguna relación
con el método.

Por eso la notación del tipo `cuerpo` es propia y se documenta como tal en
`src/motor/tipos/Cuerpo.tsx`: cuatro filas de colores ordenadas de arriba abajo, que es a la
vez el orden de altura del sonido y el de altura en el cuerpo. Es una decisión de diseño
tomada desde esa restricción, no a pesar de ella.

