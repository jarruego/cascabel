# ADR 0003 — El audio del micrófono nunca sale del dispositivo

**Estado**: aceptada · **Fecha**: 2026-09

## Decisión

Todo el análisis de audio ocurre en un `AudioWorklet` del navegador. No hay `MediaRecorder`
para subir, ni endpoint de audio, ni almacenamiento remoto. La CSP con `connect-src 'self'`
lo hace técnicamente imposible.

## Razones

Con procesamiento local no recibimos, no almacenamos y no accedemos al audio: **no hay
tratamiento de datos personales de un menor por nuestra parte**. Eso elimina de golpe el
consentimiento parental verificable, la evaluación de impacto, el contrato de encargo con el
centro, el plan de brechas y la ubicación de datos.

Con envío a servidor, todo eso aparece a la vez, y además muchos centros prohíben
directamente el uso del micrófono con alumnado.

## Consecuencias

No podemos ofrecer «escucha tu grabación de la semana pasada» ni análisis en servidor. Se
acepta: no era el producto. La contrapartida es una frase que se puede escribir en la
portada y **demostrar** con el código y las cabeceras.
