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
| *(pendiente)* | Windows 11 | Edge | pestaña | | | | | |
| *(pendiente)* | Windows 11 | Firefox | pestaña | | | | | |
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
fecha              2026-09-06T06:11:26.794Z

userAgent          Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36
plataforma         Win32
idioma             en-GB
modo               browser
contexto seguro    sí

getUserMedia       sí
AudioWorklet       sí
micrófono          funciona

sampleRate         48000 Hz
estado contexto    running
baseLatency        10 ms
outputLatency      42 ms
latencia total     52 ms
calibración        0 ms
coste del análisis no medible
```

### Qué sale de este primer informe

**1. `coste del análisis: no medible`.** Chrome **no expone `performance` dentro del
`AudioWorkletGlobalScope`**, así que la medición que preveía T0.1 no se puede hacer desde
dentro del worklet. El coste del NSDF sigue sin conocerse, y era el dato que iba a decirnos
si el detector de tono se sostiene en una tablet de aula antes de construir T2.5 encima.
Hay alternativa (ver T0.4 en el roadmap), pero no es la misma medida.

**2. 52 ms de latencia total en un PC de escritorio.** 10 ms de `baseLatency` más 42 de
`outputLatency`. Es mucho más de lo que parece: la ventana de «perfecto» para 9–12 años es
de ±70 ms, así que **sin compensar, la latencia se come el 74 % del margen** y un niño con
pulso excelente saldría como fallo. Confirma que la compensación de `CLAUDE.md` §7 no es un
refinamiento opcional, y que la calibración manual de T1.7 hace falta de verdad. Si en un
PC de escritorio son 52 ms, en una tablet barata con Bluetooth serán bastantes más.

> **Nota de procedimiento**: en el informe de arriba, la línea del micrófono dice
> «funciona»; la aplicación escribe «concedido, escuchando». Pega el texto **sin retocarlo**:
> cuando algo falle, la cadena exacta lleva el `name` del error, que es justo el dato que no
> se puede reconstruir después.
