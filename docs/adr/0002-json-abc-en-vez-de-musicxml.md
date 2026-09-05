# ADR 0002 — El formato fuente es JSON + ABC, no MusicXML

**Estado**: aceptada · **Fecha**: 2026-09

## Contexto

Parecía natural usar MusicXML como formato fuente por ser el estándar de intercambio.

## Decisión

La fuente de verdad es JSON propio con la música embebida en notación **ABC**. MusicXML se
**genera** con `music21` cuando hace falta (PDF, intercambio) y se **importa** solo para
traer repertorio de terceros.

## Razones

Una actividad educativa no es una partitura: no puede expresar el tipo de ejercicio, la
locución, la tolerancia de evaluación, los prerrequisitos ni el rango vocal por edad.

Además, en cifras: cuatro compases son ~200 B en ABC frente a 8–30 KB en MusicXML; un LLM
escribe ABC casi sin fallar y se equivoca sistemáticamente con `<divisions>` y `<backup>`; el
diff en git es legible; y 500 actividades pasan de ~8 MB a ~500 KB, que es la diferencia
entre caber o no caber en el precache.

## Consecuencias

Dependemos de que el parser de ABC de `music21` y de `abcjs` cubran nuestro repertorio. Para
melodías de 1 a 8 compases en Infantil y Primaria, sobra. Si alguna vez hiciera falta
polifonía compleja, se importa MusicXML con Verovio para ese caso concreto.
