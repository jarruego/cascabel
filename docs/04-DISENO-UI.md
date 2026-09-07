# Diseño de interfaz para niños

Objetivo: **WCAG 2.2 AA**. Para niños es un suelo, no una meta.

## Los tres carriles

La app es una sola, pero se presenta en **tres carriles visualmente distintos**. La decisión
y su justificación están en [`adr/0005-una-app-tres-carriles.md`](adr/0005-una-app-tres-carriles.md);
aquí está lo que hay que saber para dibujar.

**El carril no es la etapa.** `etapa` es la capa normativa (ciclos LOMLOE, para etiquetar
currículo); `carril` es la capa de presentación. El 2.º ciclo (3.º–4.º) queda partido entre
los dos carriles de Primaria. Regla: **el carril manda en la presentación, la etapa manda en
el currículo.**

### Qué cambia entre carriles

| | **Infantil** (3–6) | **Primeros lectores** (1.º–3.º) | **Autónomos** (4.º–6.º) |
|---|---|---|---|
| **Texto** | Ninguno. Cero palabras en la interfaz | Icono **más** palabra; la lectura apoya, no condiciona | Texto normal, vocabulario musical correcto |
| **Tipografía** | Andika, 20–24 px | Andika o la del sistema, 18 px | 17 px |
| **Objetivo táctil** | 75 × 75 px, separación ≥ 24 | 60 × 60 px, separación ≥ 16 | 48 × 48 px, separación ≥ 12 |
| **Objetos a la vez** | 2–4 | 4–6 | 6–9 |
| **Iconografía** | Objetos y personajes dibujados: un tambor, no una corchea | El mismo icono concreto, con su palabra al lado | Símbolo musical real. Estética **no** infantilizada |
| **Recompensa** | Que suene y se mueva. Sin puntuación, sin final, sin progreso visible | Cierre de sesión corto y completo; el resultado suena entero al terminar | Autoría: crear, compartir por URL, ver que funciona |
| **Entrada** | *Tap*; arrastre siempre con alternativa | *Tap*; arrastre siempre con alternativa | *Tap*; arrastre siempre con alternativa |
| **Navegación** | Un botón atrás, con icono | Un botón atrás, icono y palabra | Un botón atrás, icono y palabra |

Lo que **no** cambia entre carriles: el motor, el esquema de actividad, el audio, la escucha,
la persistencia, y las cinco reglas de `CLAUDE.md` — incluida la 4, que prohíbe vidas,
rachas, cronómetros por defecto y clasificaciones **en los tres carriles**.

El modelo de Infantil es Loopimal / Toca Band: la animación *es* la notación. El de
autónomos es lo contrario del elogio genérico, que a los 11 años ya suena falso.

## Tamaños

| Carril | Objetivo táctil | Separación | Objetos simultáneos | Cuerpo de texto |
|---|---|---|---|---|
| `infantil` (3–6) | 75 × 75 px | ≥ 24 px | 2–4 | 20–24 px |
| `lectores` (1.º–3.º, 6–8) | 60 × 60 px | ≥ 16 px | 4–6 | 18 px |
| `autonomos` (4.º–6.º, 9–12) | 48 × 48 px | ≥ 12 px | 6–9 | 17 px |

WCAG 2.5.8 pide 24 × 24 px, pensado para adultos. Los niños de 3 a 5 años no tienen
control motor fino.

Estos números viven en `src/config.ts` (`OBJETIVO_TACTIL`, `MAX_OBJETOS`, `SEPARACION`)
indexados **por carril**, y en `estilos/tokens.css` como `--objetivo` y `--separacion`, que
toman su valor del `data-carril` del ancestro. Un componente no necesita saber en qué carril
está: pide `var(--objetivo)`.

**Truco imprescindible en pentagramas**: dibuja la nota pequeña, tipográficamente correcta,
y pon encima un hitbox transparente de 60 px. VexFlow te da control total para hacerlo.

## Las diez reglas

1. **Nada esencial solo en texto.** Dentro de la actividad, lo que hay que reconocer,
   imitar o cantar **suena**: no se lee nunca.

   El enunciado es la excepción, y es deliberada. Estuvo prometido en audio con voz humana
   grabada —la síntesis se descartó porque a los pequeños les cuesta procesarla— y el
   2026-09-08 se retiró la promesa: no va a haber grabaciones, así que la frase la lee un
   adulto en voz alta. Ver [`adr/0006`](adr/0006-sin-locuciones-grabadas.md), que dice
   también qué se pierde con eso y por qué es asumible. **Escribe los enunciados para
   decirlos, no para leerlos**: frases cortas y en segunda persona.
2. **Botón de repetir siempre visible**, grande, en el mismo sitio. Quieren oír las cosas
   cinco veces.
3. **Iconos concretos.** Un tambor dibujado > un icono de corchea > la palabra «ritmo».
   Nada de metáforas: el disquete de «guardar» no significa nada para alguien nacido en 2020.
4. **El color codifica, nunca informa solo.** Siempre color + forma + sonido. Un 8 % de los
   niños tienen daltonismo.
5. **Feedback multimodal en menos de 100 ms.**
6. **Sin cronómetros por defecto.** Un niño de 4 años tarda 8 segundos en decidir.
7. **El error nunca castiga.** Ni vidas, ni sonido de fallo, ni rojo. «Escucha otra vez: la
   primera nota es más grave.» Un niño que se siente mal cierra la app y no vuelve.
8. **Una sola navegación.** Un botón «atrás», siempre igual, siempre en el mismo sitio. Las
   navegaciones múltiples confunden a los niños mucho más que a los adultos.
9. **Solo *tap* por debajo de 6 años.** Para ordenar: «toca el primero, toca el segundo»,
   nunca arrastrar COMO ÚNICA VÍA.

   Arrastrar se ofrece también en Infantil desde el 2026-09-06, por decisión del autor. El
   hallazgo de NN/g de que los menores de cinco años no manejan arrastrar y soltar sigue en
   pie y sigue siendo la razón de que jamás sea el único camino; pero dice que no *pueden*,
   no que ofrecerlo estorbe. Un niño que lo intenta y no lo consigue toca, que es lo que iba
   a hacer de todas formas.
10. **Tipografía grande y legible.** Andika (SIL, OFL) para Infantil; Atkinson Hyperlegible
    y OpenDyslexic como opción conmutable.

## Los anchos: lo que se lee y lo que se toca

Añadido el 2026-09-07, después de que el autor señalara que «el piano no se estira al 100 %
y otras muchas actividades tampoco: se desaprovecha mucho espacio». Tenía razón, y el
diagnóstico dio dos causas que no son la misma.

**Una regla no basta, porque hay dos clases de pantalla.**

| | Qué hace | Regla |
|---|---|---|
| **Se lee** | Aviso legal, créditos, ficha del maestro, referencia | Medida acotada, unos **70 caracteres**. Pasada esa anchura el ojo pierde el renglón al bajar de línea, así que más ancho es **peor** |
| **Se toca o se mira** | Catálogo, piano, pads, karaoke, lienzo, rejilla | **Todo el ancho disponible**, con un tope alto que solo evita lo absurdo en un monitor de 27 pulgadas |

Estaba todo en 840 px, la regla del texto aplicada a la aplicación entera. El efecto de
segundo orden es el que costó ver: el teclado **mide su caja** para decidir cuántas octavas
caben, así que estaba midiendo 840 px por mucho monitor que hubiera delante. Un componente
que se adapta no puede adaptarse a más de lo que le den.

**`min(46vh, 340px)` no es lo que parece.** Se lee como «que no pase de 340» y significa «que
no pase de 340 nunca»: en cualquier pantalla de más de 740 px de alto gana siempre el número
fijo. Había nueve así, y todas se escribieron mirando un móvil. Lo que se quería decir es
`clamp(mínimo, relativo, máximo)`, que sí tiene suelo **y** techo.
`tests/layout.test.ts` no deja que vuelva a aparecer.

**Los topes de tamaño táctil pueden ir por carril, y a veces deben.** El ancho de una tecla
blanca está topado en 88 px porque es lo que mide una de verdad, y por encima de eso la mano
deja de colocarse como se coloca en un piano: lo que se aprende aquí dejaría de servir allí.
Pero ese argumento **solo vale donde se está aprendiendo a tocar**. A los cuatro años no se
coloca ninguna mano, se acierta una tecla con un dedo, y ahí más grande es mejor. El tope
único dejaba el piano de Infantil en 616 px con media tablet vacía al lado, defendiendo una
postura de manos que a esa edad no existe.

**Cuando el dibujo y las zonas de toque comparten coordenadas, se escala con `zoom`.** Es el
caso del pentagrama: la pauta se dibuja en una geometría de 460 × 200 y los botones
invisibles van encima en coordenadas absolutas sobre esa misma geometría. Hacer las dos cosas
fluidas a la vez es donde se rompen estas pantallas. `zoom` agranda la caja **y** su
contenido, así que los botones siguen donde se ven y solo se hacen más grandes. No sirve
`transform: scale()`: pinta más grande pero el elemento sigue ocupando lo de antes y se
solapa con lo de abajo.

**El móvil apaisado es una postura, no un accidente.** Es la del piano y la de todo lo que
avanza de lado, y es donde menos altura hay. Ahí se recorta lo que **no** es la actividad
—márgenes, titular, barra de navegación— en vez de encoger la actividad, que es lo único que
hay que ver.

## La pantalla del maestro tiene sus propias reglas

El catálogo no lo usa un niño: lo usa un adulto con prisa, entre clase y clase, buscando algo
concreto. Dos decisiones del 2026-09-07 salen de ahí:

- **Los filtros viven en la URL.** Estaban en el estado del componente, así que abrir una
  actividad y volver los borraba y había que filtrar otra vez. En la URL se resuelven tres
  cosas de golpe y ninguna hay que programarla: el botón «atrás» funciona y repone el scroll,
  un filtro se puede guardar en favoritos o mandar por correo —«todo lo del criterio 3.1 de
  segundo» pasa a ser un enlace—, y no queda estado que sincronizar.
- **La barra de filtros se queda pegada arriba.** Con setenta y siete actividades, cambiar de
  filtro obligaba a subir hasta el principio. Es el patrón habitual de cualquier catálogo
  largo y aquí resuelve el caso real: el maestro que va probando filtros seguidos.

Salir de una actividad **vuelve al catálogo, y siempre al catálogo**. Se probó retrocediendo
en el historial —parecía gratis: la URL anterior ya llevaba los filtros y el navegador
repone el scroll solo— y estaba mal, porque `history.back()` no lleva al catálogo: lleva a la
pantalla anterior. Si acababas de mirar la ficha, «Volver» te devolvía a la ficha; si habías
entrado desde otra actividad, a esa. El autor lo vio a los dos minutos de probarlo.

Lo que sí funciona: **el catálogo apunta su propia URL al salir** y el botón va a esa. Los
filtros siguen intactos y el destino es uno solo. La lección, que vale para lo que venga:
*volver* es un destino, no un paso atrás.

## Criterios WCAG con traducción musical

| Criterio | Qué significa aquí |
|---|---|
| 1.1.1 / 1.2 | **Toda actividad de ritmo debe poder hacerse mirando**: pulso visual + `navigator.vibrate()`. Un alumno sordo tiene que poder participar |
| 1.4.1 | No codifiques la altura solo por color (el error clásico de Song Maker): añade forma, posición y nombre de nota |
| 1.4.3 | 4,5:1 en texto. Las paletas pastel infantiles suelen fallar: verifícalo |
| 2.2.1 | Sin límites de tiempo, o ajustables |
| 2.3.1 | Nada parpadea más de 3 veces por segundo. Las celebraciones animadas se pasan con facilidad |
| 2.5.7 | Todo lo arrastrable necesita alternativa por toque |
| 3.3 | Nunca «ERROR». Mensaje reparador y concreto |
| `prefers-reduced-motion` | Respétalo: hay niños con hipersensibilidad vestibular |

## Lo que WCAG no cubre y aquí importa

**El ruido del aula.** Tu app suena, y 25 tablets sonando a la vez son un caos. Diseña
pensando en auriculares (mejora además la detección de tono) y ofrece un modo silencioso
con feedback puramente visual y háptico.

**La pantalla única.** El aula española típica de música tiene un proyector y ningún
dispositivo por niño. Por eso el tipo `guia-aula` es de primera clase.
