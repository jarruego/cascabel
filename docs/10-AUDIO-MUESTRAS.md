# Muestras de audio

Dónde viven: `public/audio/`.

## `muestras/marimba/` — REALES

Seis notas de marimba de la **Versilian Community Sample Library (CC0)**, de F3 a C6, unos
64 KB en total. El resto de notas se interpolan con `playbackRate`, que funciona porque la
marimba es percusiva: estirarla dos o tres semitonos no delata. Un piano estirado igual
suena mal enseguida.

Las procesa `tools/muestras-instrumento.py`, que normaliza el pico a −3 dBFS. Eso importa:
las crudas van de −29 a −39 dBFS según la nota, y diez decibelios de diferencia entre notas
del mismo instrumento no suenan a matiz, suenan a error.

```bash
python tools/muestras-instrumento.py <carpeta-con-wav> marimba
```

## `muestras/` (raíz) — PROVISIONALES

Estos ficheros están **sintetizados**, no grabados, y los genera
`tools/muestras-provisionales.py`. Existen para desbloquear T0.2 —que una actividad se
pueda jugar entera— sin esperar a tener banco de sonidos.

**No son las muestras definitivas.** T1.7 las sustituye por 5–7 muestras por instrumento
de timbres percusivos reales (marimba, xilófono, glockenspiel, campanas) sacadas de
material CC0: VCSL y VSCO 2 CE. Los timbres percusivos se eligen porque toleran el
*pitch-shifting*, que es lo que permite cubrir una octava con pocas muestras.

Ventaja lateral de que sean sintetizadas: **son nuestras y son CC0**, así que no arrastran
ninguna licencia de terceros mientras tanto. Los créditos de las actividades que las usan
lo dicen así.

Para regenerarlas:

```bash
python tools/muestras-provisionales.py    # necesita ffmpeg en el PATH
```

## `es/` — vacía, y así se queda

Aquí iban a ir las locuciones de los enunciados. **No van a existir**: se descartaron el
2026-09-08 y la carpeta se queda vacía a propósito, con el razonamiento en
[`adr/0006`](adr/0006-sin-locuciones-grabadas.md). El enunciado lo lee un adulto en voz alta,
y por eso se escribe para decirlo y no para leerlo.

## Al día del 2026-09-07

El banco ha crecido mucho y conviene dejar el mapa claro, porque **vienen de tres sitios
distintos y por tres motivos distintos**.

| De dónde | Qué | Licencia | Por qué de ahí |
|---|---|---|---|
| **VCSL** | Marimba (6 notas) y el **kit de percusión** (10 golpes × 2 grabaciones) | CC0 | Grabaciones de instrumento suelto, con varias intensidades y **round robin**. Para percusión no hay nada mejor: aquí el golpe *es* la actividad |
| **FluidR3_GM** vía `midi-js-soundfonts` | Piano, xilófono, flauta, guitarra, violín, **voz** y seis del mundo | MIT | 128 instrumentos afinados y ya renderizados nota a nota. Es donde estaba la voz que se buscó durante días en bancos orquestales |
| **Síntesis propia** | Acordes, tempos, campanas, silencio y **tres de los cuatro sonidos del cuerpo** | CC0 (nuestra) | Material que no existe grabado: un pulso a 92 ppm o un acorde menor de do no son una grabación de nada |

### Lo que ya no está

**La voz sintetizada por formantes murió el 2026-09-06.** Era lo único del banco que no era
una grabación, y se sustituyó por el programa 53 de General MIDI, que es una voz humana
muestreada. Se verificó midiendo el espectro antes de darla por buena: fundamental en
438,7 Hz y un pico secundario hacia 1,2 kHz **después de un valle**, que es la firma de un
formante. Un tono sintetizado decae de forma monótona y no hace eso.

La síntesis se **borró** en vez de dejarla comentada: código muerto que haría dudar de cuál
de los dos era el bueno.

### La percusión corporal es la excepción, y conviene decir por qué

`public/audio/muestras/cuerpo/` tiene ocho ficheros y 36 KB: las **palmas son una grabación
de verdad** (VCSL) y los **pitos, los muslos y los pies están sintetizados**
(`tools/muestras-cuerpo.py`). Eso es justo lo contrario de lo que se decidió para la voz seis
días antes, así que la diferencia no es un descuido.

En las actividades de timbre el niño tiene que **reconocer** el sonido, y ahí una imitación
sigue siendo una imitación: por eso la voz de formantes se tiró. En percusión corporal el
sonido del altavoz **no es lo que hay que reconocer** —el sonido lo hace el niño con su
cuerpo—; el altavoz solo dice cuál toca y cuándo. Es la misma función que el clic de un
metrónomo, y a nadie le importa que ese clic no sea la grabación de nada.

Aun así siguen en la lista de cosas que se grabarán el día de las locuciones: son cuatro
sonidos y treinta segundos. Cada uno imita la física de lo que es —el pito es un transitorio
brillante hacia 3,2 kHz, el muslo una banda amortiguada en 380 Hz porque la carne se come los
agudos, el pie un golpe de 95 Hz con cola porque lo que resuena es el suelo—, y esos números
están en el propio script con su justificación.

### Densidad de muestreo, y por qué no es la misma para todos

- **Percusivos** (marimba): 5–7 en tres octavas. Aguantan el estirado.
- **Sostenidos** (flauta, violín, voz): **una cada tres semitonos**. `playbackRate` cambia la
  altura *y la duración*, así que una flauta estirada tres semitonos suena a flauta
  acelerada. Con esta densidad el estirado máximo es de semitono y medio, que no delata.
- **Percusión sin altura**: dos grabaciones del mismo golpe, alternadas. No hay nada que
  interpolar, y lo que hay que evitar es que dos golpes suenen idénticos.

### Peso y precache

Solo la marimba y las muestras sueltas van al precache. **El resto se cachea al usarse**
(`CacheFirst` en `vite.config.ts`): son casi 2 MB entre todos, y meterlos multiplicaría por
tres la primera descarga de un colegio entero para bajar instrumentos que ese niño no va a
abrir. El primer día que se abre la actividad del piano se bajan sus muestras, y desde
entonces funciona sin conexión igual que el resto.

### Lo que ya no se espera

**Las locuciones se descartaron el 2026-09-08.** Estuvieron pendientes desde el principio:
77 frases que había que grabar con voz humana —la síntesis está prohibida y con motivo— y
que no llegaron. Retirar la promesa era más honesto que dejarla otro año en una lista. El
razonamiento entero, con lo que se pierde, está en
[`adr/0006`](adr/0006-sin-locuciones-grabadas.md).

Con eso, **el banco de sonido está completo**: lo que queda por mejorar son los cuatro
sonidos corporales sintetizados, y son un lujo, no una carencia.
