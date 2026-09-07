# ADR 0007 — Sin códigos de verificación

**Estado**: aceptada · **Fecha**: 2026-09-08 · **Revierte**: T2.7

## Contexto

T2.7 se cerró el 2026-09-06 copiando el patrón de musictheory.net que el dosier recomendaba:
el alumno termina una actividad, recibe un código de siete caracteres y se lo enseña al
maestro, que lo teclea en `/comprobar` y ve qué hizo. **Evaluación con evidencia y sin
cuentas de alumno**, que resolvía de un plumazo la tensión entre «el maestro necesita saber»
y «cero datos personales».

Estaba bien hecho: alfabeto sin `I`, `O`, `0` ni `1` porque los copia a mano un niño de ocho
años; dígito de control ponderado por posición que detecta una letra cambiada y dos
intercambiadas.

Y descansaba sobre una suposición que no se comprobó: **que cada niño tiene un dispositivo
delante**.

## Decisión

**Se retira el código de verificación**, con su pantalla `/comprobar`, su entrada en el menú
y el módulo `datos/compartir.ts`.

La razón la dio el autor el 2026-09-08 y es de aula, no técnica: en la mayoría de las clases
de música de este país **hay una pizarra digital y ningún dispositivo por niño**. El propio
dosier lo dice —«probabilidad muy alta, es la norma»— y es la misma realidad que hizo que
`guia-aula` sea un tipo de primera clase. En ese escenario el maestro **está delante**
mientras el niño interactúa: no hace falta que nadie le enseñe un código de lo que acaba de
ver con sus ojos.

Y en el escenario minoritario donde sí hay tablets, el flujo tampoco funcionaba: veinticinco
niños enseñando siete caracteres uno detrás de otro es más lento que mirar por encima del
hombro.

## Consecuencias

**Se queda el progreso local**, que es otra cosa y sigue siendo útil: qué actividades se han
completado, en este dispositivo, sin nombres ni identificadores. Es lo que alimenta la marca
del catálogo y las sugerencias de repaso. No se toca.

**Desaparece la evaluación con evidencia**, y conviene decirlo claro: un maestro que quiera
un registro de quién hizo qué ya no lo tiene en la aplicación. Lo tiene en la **hoja de
seguimiento** de la ficha imprimible, que es papel suyo y donde la aplicación no interviene
—`ficha.avisoDatos` ya lo dice—. Es menos cómodo y es más honesto con la regla 3.

**Se va `datos/compartir.ts` entero.** Además de los códigos tenía `aParametro` y
`desdeParametro`, para codificar estado en una URL, y no las usaba nadie más que su propio
test. El «estado en la URL» que sí existe —los filtros del catálogo— se hace con
`URLSearchParams` y no necesita este módulo.

**Qué reabriría esto**: que un centro pida evaluación con evidencia dentro de la aplicación.
Entonces la pregunta ya no sería el código, sería T3.4 —cuentas de profesor con alias
seudónimos—, que está en la fase 3 y solo si alguien lo demanda.

## Alternativa descartada

**Dejarlo apagado por si acaso.** Un camino que no se usa se pudre: nadie lo prueba, nadie lo
mantiene y el día que se necesite estará roto. Y mientras tanto cobra su precio en cada
actividad, con un paso más al final que ningún niño pide.
