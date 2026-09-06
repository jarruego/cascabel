# Pruebas de micrófono por dispositivo

Tabla de resultados de **T0.1**. Se rellena a mano, con un dispositivo real delante:
el emulador de DevTools no abre un micrófono de verdad, no da `outputLatency` real y
no reproduce el comportamiento de permisos.

**Cómo se rellena cada fila**: abre `/diagnostico`, pulsa «Empezar a escuchar», canta o
silba, y pulsa «Copiar informe». Pega el informe en la sección de abajo y resume el
resultado en la tabla.

---

## Resultados

| Dispositivo | Sistema | Navegador | Modo | Micrófono | sampleRate | Latencia total | Coste análisis | Fecha |
|---|---|---|---|---|---|---|---|---|
| PC del autor | Windows 11 | Chrome 152 | pestaña | **sí** | 48000 Hz | 52 ms | *no medible* | 2026-09-06 |
| PC del autor | Windows 11 | Edge 152 | pestaña | **sí** | 48000 Hz | 52 ms | *no medible* | 2026-09-06 |
| PC del autor | Windows 11 | Firefox 146 | pestaña | **sí** | 48000 Hz | **34 ms** | *no medible* | 2026-09-06 |
| *(pendiente)* | Android | Chrome | pestaña (reenvío) | | | | | |
| *(pendiente)* | Android | Chrome | **instalada** | | | | | |
| *(sin dispositivo)* | iOS / iPadOS | Safari | pestaña | — | — | — | — | — |
| *(sin dispositivo)* | iOS / iPadOS | Safari | **instalada** | — | — | — | — | — |

Las dos filas de iOS están vacías **a propósito**: no hay ningún dispositivo iOS en el
proyecto. Es riesgo abierto sin verificar, y así consta en
[`../adr/0004-pwa-primero.md`](../adr/0004-pwa-primero.md).

## Cómo probar en Android sin montar HTTPS

`getUserMedia` exige contexto seguro, y `http://192.168.x.x:5173` no lo es. El atajo es el
**reenvío de puertos de Chrome**, que hace que el móvil vea el servidor como `localhost`:

1. En el Android: Ajustes → Opciones de desarrollador → **Depuración por USB**.
2. Conecta el cable y acepta la huella en el teléfono.
3. En el Chrome del PC: `chrome://inspect/#devices` → **Port forwarding** → añade
   `5173` → `localhost:5173`, y marca *Enable port forwarding*.
4. `npm run dev` en el PC.
5. En el Chrome del móvil, abre `http://localhost:5173/diagnostico`.

Comprueba que en el informe **`contexto seguro` diga «sí»**. Si dice «NO», el reenvío no
está funcionando y estarías midiendo el error equivocado.

## La fila que el reenvío NO puede cerrar

**Android con la PWA instalada.** Una app lanzada desde la pantalla de inicio no pasa por
el túnel de DevTools, así que esa fila necesita el despliegue de T1.10. Cuando exista,
instálala desde la URL real y repite.

## Informes completos

Pega aquí el texto del botón «Copiar informe», uno por bloque, sin editarlo.

```
Cascabel (cocomusic) · informe de diagnóstico
fecha              2026-09-06T06:33:38.156Z

userAgent          Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36
plataforma         Win32
idioma             en-GB
modo               browser
contexto seguro    sí

getUserMedia       sí
AudioWorklet       sí
micrófono          concedido, escuchando

sampleRate         48000 Hz
estado contexto    running
baseLatency        10 ms
outputLatency      42 ms
latencia total     52 ms
calibración        0 ms
coste del análisis no medible



Cascabel (cocomusic) · informe de diagnóstico
fecha              2026-09-06T06:35:53.229Z

userAgent          Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0
plataforma         Win32
idioma             es
modo               browser
contexto seguro    sí

getUserMedia       sí
AudioWorklet       sí
micrófono          concedido, escuchando

sampleRate         48000 Hz
estado contexto    running
baseLatency        10 ms
outputLatency      42 ms
latencia total     52 ms
calibración        0 ms
coste del análisis no medible


Cascabel (cocomusic) · informe de diagnóstico
fecha              2026-09-06T06:36:55.098Z

userAgent          Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0
plataforma         Win32
idioma             es-ES
modo               browser
contexto seguro    sí

getUserMedia       sí
AudioWorklet       sí
micrófono          concedido, escuchando

sampleRate         48000 Hz
estado contexto    running
baseLatency        0 ms
outputLatency      34 ms
latencia total     34 ms
calibración        0 ms
coste del análisis no medible
```

### Qué sale de los tres informes de escritorio

Los tres navegadores de Windows funcionan: permiso concedido, `AudioWorklet` cargado,
detección de tono respondiendo, contexto seguro y 48 kHz en los tres. Eso despeja el
escenario de escritorio por completo. Lo interesante está en lo que no coincide.

**1. Ningún navegador expone `performance` dentro del `AudioWorkletGlobalScope`.**
Chrome, Edge y Firefox dan los tres «no medible». Esto **cierra una de las preguntas
abiertas de T0.4**: no había que comprobar si Firefox lo hacía mejor, no lo hace. El banco
de pruebas en el hilo principal deja de ser el plan B y pasa a ser el único plan.

**2. Firefox declara `baseLatency = 0`, y eso casi con seguridad es que no lo implementa.**
Chromium reporta 10 ms de `baseLatency` en la misma máquina, con la misma tarjeta y la misma
frecuencia de muestreo. Un cero exacto no es una latencia buena, es un dato ausente. Importa
porque `latenciaMs()` de `AudioEngine.ts` suma `baseLatency + outputLatency`: en Firefox
estaríamos **compensando de menos**, y el sesgo iría a parar entero a la evaluación rítmica
del niño. Es un argumento más para que la calibración manual de T1.7 sea la fuente de
verdad y las cifras del navegador solo el punto de partida.

**3. Firefox tiene 34 ms de latencia total frente a los 52 de Chromium**, un 35 % menos en
el mismo equipo. Con la reserva del punto anterior: parte de esa diferencia puede ser
simplemente el `baseLatency` que Firefox no cuenta.

**4. Chromium: 52 ms de latencia en un PC de escritorio.** La ventana de «perfecto» para
9–12 años es de ±70 ms, así que **sin compensar, la latencia se come el 74 % del margen** y
un niño con pulso excelente saldría como fallo. Confirma con números que la compensación de
`CLAUDE.md` §7 es estructural. Y si un PC de sobremesa da 52 ms, una tablet de aula con
altavoz Bluetooth dará bastantes más.

**5. Edge y Chrome son idénticos hasta el milisegundo**, como era de esperar del mismo
motor. Para las pruebas que vengan, con probar uno de los dos basta.

### Lo que queda por probar

Android (pestaña por reenvío de puertos, e instalada tras el despliegue de T1.10), y iOS
si algún día hay dispositivo. El escritorio está cerrado.
