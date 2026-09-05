# ADR 0001 — Motor genérico + contenido declarativo

**Estado**: aceptada · **Fecha**: 2026-09

## Contexto

Una persona sola, sin formación musical formal, quiere mantener una biblioteca de decenas o
centenares de actividades y generarlas con ayuda de IA.

## Decisión

No se programa una actividad: se describe en JSON validado contra un esquema. Hay ~10
componentes genéricos, uno por *tipo* de actividad.

## Consecuencias

**A favor**: añadir contenido no requiere programar; la IA genera contra un formato acotado
y validable; una profesora revisa un fichero legible; el futuro configurador de actividades
es un formulario sobre el mismo esquema; y 500 actividades caben en el service worker.

**En contra**: el esquema hay que diseñarlo bien desde el principio y los tipos son más
rígidos que un componente a medida. Alguna actividad muy singular quedará forzada — se
acepta.

**Precedente**: JClic y LIM llevan veinte años funcionando con esta arquitectura.
