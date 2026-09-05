# ADR 0004 — PWA primero; nativo solo con razón de negocio

**Estado**: aceptada, con un riesgo abierto · **Fecha**: 2026-09

## Decisión

Una PWA instalable con Vite y Workbox. Capacitor queda en reserva.

## Razones

Coste de entrada cero frente a 99 $/año de Apple más 25 $ de Google, un Mac obligatorio para
iOS y 12 testers durante 14 días en Google Play para cuentas personales. Actualizaciones
instantáneas frente a revisiones de días. Y una base de código en vez de tres.

Además, las políticas infantiles de Apple (§1.3 Kids Category) y de Google (Families) hacen
la analítica de terceros esencialmente inviable — algo que ya cumplimos por diseño, pero que
significa que ir a las tiendas no aportaría capacidades, solo requisitos.

## Riesgo abierto

El bug 185448 de WebKit rompe `getUserMedia` en PWA instalada en la pantalla de inicio de
iOS. Se ha arreglado y ha reaparecido varias veces. **Tarea T0.1 del roadmap: probarlo en un
iPad real antes que ninguna otra cosa.** Si falla, se empaqueta con Capacitor solo para iOS,
manteniendo el mismo código web.
