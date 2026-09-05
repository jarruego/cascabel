# ADR 0004 — PWA primero; nativo solo con razón de negocio

**Estado**: aceptada, con un riesgo abierto SIN VERIFICAR · **Fecha**: 2026-09 · **Revisada**: 2026-09-06

## Decisión

Una PWA instalable con Vite y Workbox. Capacitor queda en reserva.

## Razones

Coste de entrada cero frente a 99 $/año de Apple más 25 $ de Google, un Mac obligatorio para
iOS y 12 testers durante 14 días en Google Play para cuentas personales. Actualizaciones
instantáneas frente a revisiones de días. Y una base de código en vez de tres.

Además, las políticas infantiles de Apple (§1.3 Kids Category) y de Google (Families) hacen
la analítica de terceros esencialmente inviable — algo que ya cumplimos por diseño, pero que
significa que ir a las tiendas no aportaría capacidades, solo requisitos.

## Riesgo abierto: iOS, sin verificar

El bug 185448 de WebKit rompe `getUserMedia` en PWA instalada en la pantalla de inicio de
iOS. Se ha arreglado y ha reaparecido varias veces. Si está roto hoy, la consecuencia es
empaquetar con Capacitor **sólo para iOS**, manteniendo el mismo código web.

**No podemos comprobarlo.** El equipo de desarrollo tiene Windows y Android; no hay ningún
dispositivo iOS a mano, y el simulador de iOS requiere un Mac y además miente sobre el
micrófono. La tarea T0.1 del roadmap decía «pruébalo en un iPad real antes que ninguna otra
cosa»; eso ya no es ejecutable, y fingir que sí lo es sería peor que admitirlo.

Así que este riesgo queda **abierto y no verificado por tiempo indefinido**, y la decisión
de seguir con PWA se toma *sabiendo* que el dato falta. Lo que sí hacemos es acotar el daño
por tres vías:

1. **Degradación obligatoria a toque.** Toda actividad con micrófono tiene alternativa por
   toque, y cualquier fallo al abrir el micrófono cae a ella en silencio, sin bloquear.
   Está escrito como regla en `CLAUDE.md` §8. Con esto, un iOS roto degrada la experiencia
   —el niño toca en vez de cantar— pero **no deja ninguna actividad inaccesible**, que es
   la diferencia entre un defecto y un cambio de arquitectura.
2. **Un instrumento que recoja el dato cuando aparezca.** La ruta `/diagnostico` (T0.1b)
   informa de sistema, navegador, modo *standalone*, `sampleRate`, latencias y estado del
   micrófono, con un botón de copiar. El primer maestro con iPad que abra la app nos puede
   dar en un pegado lo que no podemos medir nosotros.
3. **Nada de lo construido se pierde si hay que empaquetar.** Capacitor envuelve la misma
   base web; el coste de descubrirlo tarde es la cuenta de desarrollador y un Mac prestado,
   no reescribir la aplicación.

**Revisión**: en cuanto llegue el primer informe de `/diagnostico` desde iOS, o en cuanto
haya un iPad disponible para probar. Hasta entonces, esta ADR se considera aceptada con un
hueco conocido, no con un riesgo descartado.
