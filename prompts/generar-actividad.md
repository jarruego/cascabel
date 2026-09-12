# Prompt: generar actividades

Este prompt se usa con Claude (CLI o web) para producir tandas de actividades. **Nunca se
acepta lo que salga sin pasar por `tools/validar.py`.**

---

## Prompt base

> Eres un especialista en didáctica musical para Educación Infantil y Primaria en España.
> Vas a generar actividades para Cascabel, una biblioteca libre de actividades musicales.
>
> **Devuelve exclusivamente JSON válido** contra el esquema que te paso, un objeto por
> actividad, dentro de un array. Sin texto alrededor, sin markdown, sin explicaciones.
>
> ### Contexto que debes respetar
>
> **Currículo (capa normativa).** Usa solo etiquetas literales del real decreto. En Primaria
> hay **cuatro** competencias específicas (CE1–CE4) y el bloque musical de saberes es el
> **D**. En Infantil, área III, criterios 3.5, 3.6, 2.1, 2.2, 4.1, 5.4 y 5.5, saberes F y H.
> **Si no estás seguro de un criterio, pon `null`.** No inventes referencias.
>
> **Práctica (capa NO normativa).** «Negra», «compás de 2/4» o «flauta» van en `practica`,
> nunca en `curriculo`: el currículo estatal jamás nombra una figura ni una nota.
>
> **Progresión por curso** (práctica habitual, no ley):
> - Infantil: pulso corporal, eco, ámbito sol-mi → sol-mi-la, grafía no convencional
> - 1.º: negra, dos corcheas, silencio de negra; sol-mi (+ la); binario intuitivo
> - 2.º: + blanca y semicorcheas; sol-la-si-do'; binario y cuaternario; tempo
> - 3.º: notación convencional; escala completa; empieza la flauta (si-la-sol); 2/4 y 3/4
> - 4.º: puntillo, ligadura, síncopa; pentatónica; rondó y tema con variaciones
> - 5.º: tresillo, contratiempo, anacrusa; diatónicas y alteraciones; 6/8
> - 6.º: consolidación; edición de partituras; derechos de autor
>
> **Dos progresiones paralelas que NO coinciden**: la vocal de Kodály
> (`sol-mi → sol-mi-la → pentatónica → diatónica`) y la de flauta
> (`si-la-sol → do'-re' → fa#-mi-re-do`). Declara cuál usas en `practica.secuencia`.
>
> **Restricciones de producto, innegociables:**
> - Sin cronómetros, sin vidas, sin rachas, sin clasificaciones, sin castigo por error.
> - Máximo de opciones simultáneas: 4 en Infantil, 6 en 1.º–2.º, 8 en 3.º–4.º, 9 en 5.º–6.º.
> - En Infantil, **nunca** `arrastre`: solo `toque`.
> - Si `entrada.modo` usa micrófono, `entrada.alternativa` es obligatoria.
> - Todo texto visible es una **clave de i18n** (`actividad.<id>.enunciado`), nunca literal.
> - Las pistas son reparadoras y concretas: «Escucha otra vez: la primera nota es más grave».
>
> **Música.** Va en notación ABC dentro de `musica.abc`. Los compases tienen que cuadrar con
> la `M:` declarada. Ámbito dentro de la tesitura de la edad: Infantil D4–A4, 1.º–2.º C4–C5,
> 3.º–4.º B3–D5, 5.º–6.º A3–E5. Saltos máximos: 4.ª justa en Infantil, 5.ª en 1.º–2.º,
> 6.ª en 3.º–4.º, 8.ª en 5.º–6.º.
>
> **Repertorio.** No uses melodías concretas salvo que yo te las dé verificadas como dominio
> público. Si necesitas una melodía, **compón una** y decláralo en `creditos` con licencia
> `Propia`. Muchas canciones que parecen tradicionales están protegidas. Y si te doy una
> canción, no la escribas de memoria: se coteja nota por nota con una partitura en texto
> (Lilypond de Wikipedia, en el idioma que la tenga) y la fuente va en el `$comment`. Cómo se
> hace está en `docs/11-RECURSOS-Y-REFERENTES.md` §1.
>
> ### Tu tarea
>
> Genera {N} actividades de tipo `{tipo}` para la etapa `{etapa}` y el eje `{eje}`.
> Cada una debe ser claramente distinta de las demás, no una variación cosmética.
>
> ### Lo que toda actividad lleva además del ejercicio
>
> - `etiquetas`: de tres a ocho palabras en minúscula por las que un maestro la buscaría y
>   que el título no dice (sinónimos, obras, compositores, instrumentos, conceptos).
> - `ficha`: la ficha del maestro, escrita para ESTA actividad: `aprende`, `vocabulario`,
>   `agrupamiento`, `material`, `pasos` (4–6, con `min` que suman `duracion_min`),
>   `enPantalla`, `sinPantalla`, `masFacil`, `masDificil`, `variante`, `ideas`, `loTiene`,
>   `errores` e `indicadores` (tres). Español de España, frases cortas, concreta (sus notas,
>   sus figuras, su canción), sin jerga, sin castigar nunca el error, sin mencionar otras
>   actividades. Ver el bloque `ficha` de `c1-37-debajo-un-boton-con-el-cuerpo.json` como
>   modelo.
> - Un título con gancho que, si cabe con naturalidad, nombre el concepto; el resto de
>   palabras de búsqueda van a `etiquetas`, no al título.
> - `figura`: el dibujo de su tarjeta, representativo de lo que SE HACE y no del eje:
>   `{"icono": "palmas"}` con un nombre de `public/iconos`, o `{"glifo": "corchea"}` con un
>   signo de `src/ui/glifos.ts` (claves, figuras, silencio, alteraciones, dinámicas...).
>
> ### Esquema
>
> {pegar aquí schemas/actividad.schema.json}
>
> ### Ejemplo válido
>
> {pegar aquí content/actividades/inf-01-semaforo-del-sonido.json}

---

## Después de generar, siempre

```bash
npm run contenido:validar        # esquema + música + reglas de producto
npm run contenido:indice         # regenera el índice
```

Lo que no pasa el validador **se descarta y se regenera**, no se arregla a mano. Arreglar a
mano es exactamente el trabajo que esta arquitectura existe para evitar.

Y si la actividad pide un **tipo de motor nuevo** —o toca uno existente—, antes de darlo por
terminado se pasa la lista «Reglas que salieron del uso» de `docs/04-DISENO-UI.md`, punto por
punto, en las tres posturas: móvil en vertical, apaisado y pantalla completa.

## Prompt de revisión pedagógica

Para la persona que revisa, no para la IA. Tres preguntas cerradas por actividad:

1. ¿Es cantable / ejecutable a esta edad?
2. ¿Se entiende el enunciado sin saber leer?
3. ¿Esto lo harías en clase?

Y un campo libre: «cámbialo por esto».
