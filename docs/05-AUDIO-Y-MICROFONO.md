# Audio y micrófono

## Reglas de audio

- **Un solo `AudioContext`** en toda la app, con `latencyHint: 'interactive'`.
- `resume()` **siempre dentro de un gesto del usuario**. Por eso existe el botón grande de
  «¡Empezar!»: no es decoración.
- **Nunca `setInterval` para tiempo musical.** Lookahead scheduling: un `setTimeout` cada
  25 ms programa eventos 100 ms hacia el futuro contra `audioCtx.currentTime`. El hilo
  principal tiene jitter de decenas de ms y se estrangula a 1 Hz en segundo plano.
- **Separa lo visual de lo sonoro**: los eventos van a una cola que consume
  `requestAnimationFrame`. Animar dentro del planificador produce un desfase visible de
  ~100 ms.
- **No fijes 44100**: lee `audioContext.sampleRate`, que cambia al abrir el micrófono.

## Latencia

| Plataforma | Latencia de salida típica |
|---|---|
| iPad / iOS Safari | 20–40 ms |
| Escritorio | 10–30 ms |
| Android gama media/alta | 40–80 ms |
| Android gama baja | 100–200 ms |

Compensa `outputLatency + baseLatency` antes de comparar el golpe del niño con la rejilla, y
ofrece una **calibración manual de 20 segundos** guardada en el dispositivo. Con niños, esa
pantalla es la diferencia entre «la app funciona» y «la app está rota».

## Muestras: la receta de los 300 KB

No uses los soundfonts de MIDI.js: son ficheros JS con MP3 en base64 (+33 % de peso) con las
88 notas de cada instrumento.

1. **Timbres perdonables**: marimba, xilófono, glockenspiel, celesta, campanas. Ataque
   percusivo, decaimiento natural y toleran muy bien el *pitch-shifting*. Además son los
   timbres del instrumentario Orff.
2. **Una muestra por octava**, de C3 a C6. Cinco o siete cubren todo el rango infantil útil.
3. **Opus 48 kbps mono**. Una muestra de 1,5 s ≈ 10 KB. Siete ≈ 70 KB por instrumento.
4. **Envolvente ADSR con un `GainNode`** y decaimiento recortado a 1–2 s.

Cuatro instrumentos en menos de 300 KB, frente a 4–8 MB de un soundfont General MIDI.

## Micrófono: por qué la voz infantil es el caso fácil

Los detectores temporales necesitan varios periodos completos de la onda. A 250–600 Hz —un
niño cantando— una ventana de 1024 muestras contiene entre 5 y 12 periodos. Frente a un bajo
de 60 Hz eso significa menos latencia, entre 4 y 16 veces menos CPU y muchos menos errores
de octava.

**El problema no es el algoritmo, es la señal**: cantan flojo, se mueven, hablan, se ríen, y
el aula es ruidosa. Tres filtros baratos lo arreglan:

1. Gating por energía (RMS mínimo)
2. Umbral de claridad > 0,85
3. Mediana sobre 3–5 lecturas

Y pide el stream desactivando el procesado de voz, que está hecho para llamadas:
`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`.

## Palmadas

Filtro paso-alto a 2 kHz, energía por bloque, media móvil de ~200 ms como umbral adaptativo,
y **periodo refractario de 100–120 ms**. Sin el refractario, una palmada genera tres o cuatro
onsets por las reflexiones de la sala: es el fallo número uno.

El timestamp se calcula **dentro del worklet**, con precisión de muestra. Tomarlo en el hilo
principal al recibir el mensaje pierde 10–30 ms impredecibles, que es justo el orden de
magnitud que estamos midiendo.

## Evaluación rítmica

| Edad | Perfecto | Bien | Casi |
|---|---|---|---|
| 3–5 | ±150 ms | ±250 ms | ±400 ms |
| 6–8 | ±100 ms | ±180 ms | ±300 ms |
| 9–12 | ±70 ms | ±130 ms | ±220 ms |

**Reporta siempre desvío medio con signo y desviación típica**, no solo un porcentaje. Un
niño que va 120 ms tarde con desviación de 20 ms tiene un pulso excelente, solo desfasado;
un porcentaje le diría que ha fallado. `src/motor/evaluacion.ts` lo implementa y hay tests
que lo protegen.

## Las minas de iOS

1. `getUserMedia()` **redirige la salida de audio** y el volumen se desploma. Si una
   actividad reproduce una nota de referencia *y* escucha a la vez, alterna las fases o pide
   auriculares.
2. `echoCancellation` **se ignora** (bug 179411 de WebKit).
3. `AudioWorklet` ha tenido **bugs recurrentes** en varias versiones mayores. Prueba siempre
   en dispositivo real.
4. **Bug 185448**: `getUserMedia` en PWA instalada en pantalla de inicio. Se arregló y ha
   reaparecido. **Es la tarea T0.1 del roadmap.**
5. El permiso se vuelve a pedir en cada sesión en Safari, y la API `Permissions` no soporta
   micrófono ahí: detecta el estado intentando y capturando `NotAllowedError`.
