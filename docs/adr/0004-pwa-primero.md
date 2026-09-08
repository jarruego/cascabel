# ADR 0004 — PWA primero; nativo solo con razón de negocio

**Estado**: aceptada · riesgo **acotado**, abierto sólo para iOS · **Fecha**: 2026-09 · **Revisada**: 2026-09-06

## Decisión

Una PWA instalable con Vite y Workbox. Capacitor queda en reserva.

## Razones

Coste de entrada cero frente a 99 $/año de Apple más 25 $ de Google, un Mac obligatorio para
iOS y 12 testers durante 14 días en Google Play para cuentas personales. Actualizaciones
instantáneas frente a revisiones de días. Y una base de código en vez de tres.

Además, las políticas infantiles de Apple (§1.3 Kids Category) y de Google (Families) hacen
la analítica de terceros esencialmente inviable — algo que ya cumplimos por diseño, pero que
significa que ir a las tiendas no aportaría capacidades, solo requisitos.

## Lo que sí se ha verificado (2026-09-06)

**El micrófono funciona en una PWA instalada.** Probado sobre el despliegue real, en
Chrome 151 de Android 10, con la app instalada como WebAPK y abierta desde el icono:
`modo standalone`, permiso concedido, `AudioWorklet` cargado, 48 kHz, detección de tono
respondiendo. Y sin penalización de latencia: 28 ms instalada frente a 27 en pestaña.

Esto **no** prueba nada sobre iOS —son motores distintos y el bug es específico de
WebKit—, pero cambia la naturaleza del riesgo. Ya no es «¿funciona nuestra arquitectura en
modo standalone?», que era una duda sobre nosotros. Es «¿tiene WebKit este bug hoy?», que
es una duda sobre Apple. La diferencia importa: la primera se arregla rediseñando, la
segunda esperando o empaquetando.

Los tres obstáculos que hubo que quitar para llegar aquí están documentados en
`docs/pruebas/microfono.md`, y los tres **fallaban en silencio**: un `_redirects` que
rompía el despliegue, dos iconos declarados que no existían, y el manejador de `fetch` del
service worker registrándose demasiado tarde para que Chrome considerara instalable la app.

## Riesgo que sigue abierto: iOS

El bug 185448 de WebKit rompe `getUserMedia` en PWA instalada en la pantalla de inicio de
iOS. Se ha arreglado y ha reaparecido varias veces. Si está roto hoy, la consecuencia es
empaquetar con Capacitor **sólo para iOS**, manteniendo el mismo código web.

**No podemos comprobarlo.** El equipo de desarrollo tiene Windows y Android; no hay ningún
dispositivo iOS a mano, y el simulador de iOS requiere un Mac y además miente sobre el
micrófono. La tarea T0.1 del roadmap decía «pruébalo en un iPad real antes que ninguna otra
cosa»; eso ya no es ejecutable, y fingir que sí lo es sería peor que admitirlo.

Así que este riesgo queda **abierto para iOS por tiempo indefinido**, y la decisión de
seguir con PWA se toma sabiendo que falta ese dato — pero ya no a ciegas: el escenario
equivalente funciona en Android. El daño se acota además por tres vías:

1. **Degradación obligatoria a toque.** Toda actividad con micrófono tiene alternativa por
   toque, y cualquier fallo al abrir el micrófono cae a ella en silencio, sin bloquear.
   Está escrito como regla en `CLAUDE.md` §8. Con esto, un iOS roto degrada la experiencia
   —el niño toca en vez de cantar— pero **no deja ninguna actividad inaccesible**, que es
   la diferencia entre un defecto y un cambio de arquitectura.

   Desde el 2026-09-08 esa vía tiene además **puerta de entrada propia**: antes de pedir el
   permiso sale una pantalla que explica para qué vamos a escuchar y que la voz se queda en
   el aparato, con dos salidas del mismo tamaño —adelante, o «prefiero tocar en la
   pantalla»—. La decisión vale para toda la sesión y no se vuelve a preguntar
   (`escucha/permiso.ts`). No cambia la decisión de esta ADR: la refuerza, porque ahora
   elegir el toque es una opción que se ofrece y no solo el sitio donde se cae cuando algo
   falla — que es exactamente lo que hace falta si el día de mañana resulta que en iOS
   falla siempre.
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
