# Esquema de actividad

La referencia normativa es `schemas/actividad.schema.json`. Esto es la guía para humanos.

## Campos obligatorios

| Campo | Qué es | Trampa |
|---|---|---|
| `id` | Identificador estable en kebab-case | **Nunca se renombra**: puede estar en una URL compartida |
| `version` | Entero, empieza en 1 | Súbelo si cambias la respuesta correcta |
| `tipo` | Uno de los tipos de motor (tabla en `docs/01-ARQUITECTURA.md`) | Si no encaja en ninguno, probablemente estés diseñando mal la actividad |
| `titulo` | Máximo 70 caracteres | Se ve en el catálogo del maestro, no en la pantalla del niño |
| `etapa` | `infantil`, `primaria-c1/c2/c3` | Determina tolerancias, tamaños táctiles y tesitura |
| `eje` | pulso, altura, timbre, notacion, cuerpo, creacion, cultura | Es la taxonomía del catálogo |
| `curriculo` | Capa **normativa** | Solo etiquetas literales del RD. Ante la duda, `null` |
| `entrada` | Cómo interactúa el niño | Si usa micrófono o arrastre, `alternativa` es obligatoria |
| `contenido` | Carga útil del tipo | Lo interpreta el componente del tipo |

## Las dos capas, que no se mezclan

```jsonc
"curriculo": {                    // CAPA NORMATIVA — literal del real decreto
  "competencia": "CE3",           // Primaria: CE1..CE4 (son cuatro, no seis)
  "criterio": "3.1",
  "saber": "D. Práctica instrumental, vocal y corporal"
},
"practica": {                     // CAPA DE PRÁCTICA — convención, NO currículo
  "figuras": ["negra", "corchea"],
  "compas": "2/4",
  "secuencia": "vocal-kodaly"
}
```

**El currículo estatal jamás nombra una figura, una nota ni un compás.** Poner «negra» en
`curriculo` es un error que cualquier revisión pedagógica seria detectaría.

## Reglas que el validador hace cumplir

- Micrófono o arrastre ⇒ `entrada.alternativa` obligatoria
- Etapa `infantil` ⇒ nunca `arrastre`
- Máximo de opciones simultáneas: 4 en Infantil, 6 en c1, 8 en c2, 9 en c3
- Prohibidos los campos `vidas`, `tiempo_limite_s`, `racha`, `clasificacion`
- El ABC tiene que parsear, cuadrar los compases, caber en la tesitura de la edad y no
  tener saltos mayores que el límite de la etapa (4.ª en Infantil, 5.ª en c1, 6.ª en c2)

## Notación ABC en 30 segundos

```
X:1            número de pieza
T:Título
M:2/4          compás
L:1/4          duración por defecto de una letra
Q:1/4=72       tempo
K:C            tonalidad
z2 | c c | c/c/ c |
│    │     └── c/c/ = dos corcheas (mitad de L)
│    └──────── dos negras
└───────────── silencio de dos tiempos
```

Mayúsculas = octava central (C = do3), minúsculas = octava siguiente (c = do4),
`c'` sube otra octava, `C,` baja una. Referencia: <https://abcnotation.com/>

## Ciclo de vida

`borrador` → `revision-pedagogica` → `publicada`

Solo las `publicada` aparecen en el catálogo público. El índice se regenera con
`npm run contenido:indice`.
