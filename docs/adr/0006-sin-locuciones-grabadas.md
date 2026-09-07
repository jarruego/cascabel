# ADR 0006 — Sin locuciones grabadas

**Estado**: aceptada · **Fecha**: 2026-09-08

## Contexto

La regla 1 de `docs/04-DISENO-UI.md` decía, desde el principio:

> **Nada esencial solo en texto.** Toda instrucción existe en audio, con **voz humana
> grabada**. La síntesis de voz suena antinatural a los pequeños y les cuesta procesarla.

Es una regla bien fundada. Un niño de cuatro años no lee, y uno de siete lee despacio: si la
consigna vive solo escrita, la actividad depende de que haya un adulto al lado leyéndola.

Y llevaba dos días siendo mentira. Las 77 actividades declaraban su `locucion.enunciado`, el
esquema admitía un `locucion.audio`, `tools/muestras-voz.py` esperaba grabaciones y
`public/audio/es/` estaba vacío. El botón de escuchar existía en el código y no llegaba a
dibujarse nunca, porque ninguna actividad tenía audio que ofrecer.

La salida obvia —síntesis de voz— está prohibida por la propia regla, y con razón: a estas
edades una voz sintética se procesa peor, que es justo lo contrario de lo que se busca.

## Decisión

**No va a haber locuciones grabadas.** Se retira la promesa y todo lo que la sostenía:

- El campo `locucion` pasa a llamarse **`enunciado`**, un `string` con la clave de i18n. Es
  lo que de verdad es: la frase que un adulto lee en voz alta y que sale en la ficha del
  maestro. Un campo llamado «locución» para algo que nunca va a sonar es la clase de mentira
  que se queda para siempre.
- Desaparecen el subcampo `audio`, el botón de escuchar de la modal de explicación y
  `tools/muestras-voz.py`.
- La regla 1 de `04-DISENO-UI.md` y el §6 de `CLAUDE.md` se reescriben para decir lo que la
  aplicación hace de verdad.

## Consecuencias

**Lo que se pierde, y no conviene disimularlo.** Un niño que no lee **no puede usar Cascabel
solo**: necesita que alguien le diga qué hay que hacer. Para el carril de Infantil eso no es
un detalle, es una condición de uso.

**Lo que lo hace asumible** es que coincide con el escenario real. El dosier da como
«probabilidad muy alta, es la norma» el aula con **un proyector y ningún dispositivo por
niño**: ahí siempre hay un adulto delante, y el tipo `guia-aula` está construido justamente
para eso. La frase sigue estando —grande, en la pantalla previa— para que ese adulto la lea.

**Lo que sí se mantiene** de la idea original:

- El sonido sigue siendo la vía principal *dentro* de la actividad: lo que hay que
  reconocer, imitar o cantar suena, no se lee.
- El texto de cada enunciado se sigue escribiendo pensando en que se dice en voz alta, no en
  que se lee. Frases cortas y en segunda persona.
- Los iconos y los personajes de la metodología cocomusic cargan con el significado donde el
  texto no llega.

**Lo que reabriría esta decisión**: que alguien se ofrezca a grabar. Son 77 frases cortas y
el trabajo es de estudio, no de programación: si aparecen las grabaciones, volver a añadir
un campo de audio y un botón es media tarde. Lo que no se va a hacer es dejar el hueco
abierto años prometiendo algo que no llega.

## Alternativas descartadas

**Síntesis de voz.** La prohíbe la regla que originó esto, y por un motivo que sigue
vigente: a los tres y cuatro años una voz sintética se procesa peor que una humana. Poner
TTS habría sido cumplir la letra de la promesa rompiendo su motivo.

**Dejarlo pendiente.** Es lo que se hizo dos días y lo que llevó aquí. Una promesa sin fecha
en un documento de diseño no es un plan: es una deuda que nadie apunta.
