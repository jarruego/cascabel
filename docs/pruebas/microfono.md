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
| *(pendiente)* | Windows 11 | Chrome | pestaña | | | | | |
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
(pendiente)
```
