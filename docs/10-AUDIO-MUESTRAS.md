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

## `es/` — locuciones

Vacío todavía. Van aquí las locuciones de los enunciados, y son **voz humana grabada,
nunca síntesis**: la voz sintética suena antinatural a los pequeños y les cuesta
procesarla (regla 1 de `docs/04-DISENO-UI.md`).
