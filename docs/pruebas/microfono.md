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
| Android 10 (armv81) | Android 10 | Chrome 151 | pestaña (HTTPS real) | **sí** | 48000 Hz | **27 ms** | *no medible* | 2026-09-06 |
| Android 10 (armv81) | Android 10 | Chrome 151 | **instalada (WebAPK)** | **sí** | 48000 Hz | **28 ms** | *no medible* | 2026-09-06 |
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



Cascabel (cocomusic) · informe de diagnóstico
fecha 2026-09-06T10:52:01.427Z

userAgent Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36
plataforma Linux armv81
idioma en-GB
modo browser
contexto seguro sí

getUserMedia sí
AudioWorklet sí
micrófono concedido, escuchando

sampleRate 48000 Hz
estado contexto running
baseLatency 4 ms
outputLatency 23 ms
latencia total 27 ms
calibración 0 ms
coste del análisis no medible


Cascabel (cocomusic) · informe de diagnóstico
fecha 2026-09-06T11:13:52.999Z

userAgent Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36
plataforma Linux armv81
idioma en-GB
modo standalone
contexto seguro sí

getUserMedia sí
AudioWorklet sí
micrófono concedido, escuchando

sampleRate 48000 Hz
estado contexto running
baseLatency 4 ms
outputLatency 24 ms
latencia total 28 ms
calibración 0 ms
coste del análisis no medible
```

### Qué sale de los tres informes de escritorio

Los tres navegadores de Windows funcionan: permiso concedido, `AudioWorklet` cargado,
detección de tono respondiendo, contexto seguro y 48 kHz en los tres. Eso despeja el
escenario de escritorio por completo. Lo interesante está en lo que no coincide.

**1. Ningún navegador expone `performance` dentro del `AudioWorkletGlobalScope`.**
Chrome, Edge y Firefox dan los tres «no medible», así que el banco de pruebas en el hilo
principal dejó de ser el plan B y pasó a ser el único. Ya está hecho (T0.4), y **el
resultado obliga a rehacer el detector antes de T2.5**: 1,33 ms por análisis sobre un
presupuesto de 10,67, es decir el **12,5 % de un núcleo en un PC de sobremesa**. El
comentario del worklet decía «1-4 % en una tablet media» y era optimista por un factor de
entre tres y diez. Ver T2.0.

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

### Qué sale del informe de Android

Tomado el 2026-09-06 sobre el despliegue real de Cloudflare, en pestaña de Chrome 151.

**El micrófono funciona en Android.** Permiso concedido, `AudioWorklet` cargado, detección
respondiendo, contexto seguro por el HTTPS de Cloudflare. Con esto, los cuatro escenarios
en pestaña —Windows con tres navegadores y Android— quedan cerrados: **el micrófono
funciona en todo lo que hemos podido probar**.

Lo que sigue abierto es el modo *standalone*, y no por falta de intentarlo: el informe dice
`modo browser`, así que la app se abrió desde el navegador y no desde el icono instalado.

Lo que sí quedó medido, y es interesante:

**Android tiene menos latencia que el PC de sobremesa: 27 ms frente a 52.** Es
contraintuitivo —uno espera que un móvil sea peor— pero encaja: el audio de Android va por
una ruta más corta que la pila de sonido de Windows. Importa para la evaluación rítmica,
porque la ventana de «perfecto» de 9-12 años es de ±70 ms: en el móvil la latencia se come
el 39 % del margen, y en el PC el 74 %. **La misma actividad es más justa en tablet que en
ordenador**, que es al revés de lo que se habría supuesto.

`baseLatency` sale a 4 ms (Chromium sí lo implementa), `AudioWorklet` está soportado, la
frecuencia de muestreo es 48 kHz igual que en escritorio, y el contexto es seguro gracias
al HTTPS de Cloudflare.

### Lo que queda por probar

- **iOS**: si algún día hay dispositivo. Es lo único que queda.

Todo lo demás está cerrado.

### El resultado que buscábamos: PWA instalada en Android

**El micrófono funciona en la app instalada.** `modo standalone`, permiso concedido,
`AudioWorklet` cargado, 48 kHz, contexto seguro. Es la prueba que llevábamos toda la
semana persiguiendo y la que más pesa de todas.

**Qué cambia esto.** El riesgo abierto del [ADR 0004](../adr/0004-pwa-primero.md) era que
`getUserMedia` no funcionase en una PWA instalada en la pantalla de inicio (bug 185448 de
WebKit). Ahora sabemos que **en Android sí funciona**. Eso no prueba nada sobre iOS —son
motores distintos y el bug es específico de WebKit— pero convierte una incógnita amplia en
una acotada: si algún día falla en iOS, será un problema de WebKit y no de cómo hemos
montado la aplicación. La arquitectura PWA queda validada en todo lo que podemos probar.

**Y no hay penalización por estar instalada**: 28 ms de latencia frente a los 27 de la
pestaña. Un milisegundo, que es ruido de medida.

Lo que costó llegar aquí, por si le sirve a alguien:

1. `public/_redirects` rompía el despliegue por bucle infinito, porque en el flujo de
   Workers ese trabajo lo hace `not_found_handling` (T1.10).
2. El manifiesto declaraba dos iconos que **no existían**, así que Chrome no ofrecía
   instalar. Y no se veía, porque el *fallback* de SPA devolvía 200 con el `index.html`
   en vez de 404 (T1.9c).
3. Workbox estaba en un fichero aparte, así que el `addEventListener('fetch')` se
   registraba dentro de una promesa. Chrome exige que sea en la evaluación inicial del
   service worker, y sin eso tampoco ofrece instalar.

Ninguno de los tres daba error. Los tres fallaban en silencio.