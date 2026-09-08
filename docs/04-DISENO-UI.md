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

## Los tres botones y los cuatro sitios donde se habla

Añadido el 2026-09-08, después de que el autor lo pidiera dos veces con las mismas palabras:
«los botones de Empezar y otros siguen siendo un simple texto sin apariencia de botón»,
«deberían mantener un diseño común, textos comunes si hacen lo mismo», «siguen saliendo
mensajes repetidos en el interior de la actividad».

Las tres quejas tenían **una sola causa**: cada uno de los veintiún tipos de motor resolvía a
su manera lo que es igual en todos. No faltaba CSS, faltaba un reparto.

### Tres botones, y no hay un cuarto

| Clase | Qué es | Cómo se ve |
|---|---|---|
| `.boton-principal` | La acción que hace **avanzar**: empezar, comprobar, otra vez, siguiente | Relleno. Hay **una sola** en pantalla |
| `.boton-repetir` | Lo secundario: limpiar, grabar, exportar, cambiar de instrumento, «Idea» | Borde y sombra, más pequeño |
| `.boton-actividad` | Lo que se toca porque **es** la actividad: opciones, fichas, bandas, la diana, el pandero | Tarjeta grande, del tamaño del carril |

Y encima de la principal, `.boton-arranque` mientras no se haya pulsado: late por el borde
una vez cada dos segundos y para en cuanto la actividad arranca. **Late uno solo.** Si
latieran dos dejaría de significar «este», que es lo único que hace.

Lo vigila [`tests/botones.test.ts`](../tests/botones.test.ts): ningún botón sin clase,
ninguna clase sin regla, ningún latido fuera de la acción principal.

### Un sitio para los botones, y solo uno

Añadido el 2026-09-09, a partir de una observación del autor que era exacta: «según la altura
de la actividad o la propia actividad salen unos botones u otros, con icono, sin icono,
centrado, a la izquierda, de un color, tamaño de fuente… No existe ningún criterio común».
Había **quince contenedores** haciendo lo mismo con quince márgenes distintos, dos sin
centrar, y tres tipos que ni siquiera metían su botón en un contenedor.

**Todo lo que actúa sobre la actividad va en [`ui/BarraAcciones.tsx`](../src/ui/BarraAcciones.tsx)**,
fija abajo y justo encima de la barra de volver-personaje-ficha.

- **Lo que ES la actividad se queda en el lienzo**: la diana de palmear, el pandero del eco,
  las teclas, los pads, las tarjetas de opción, las casillas. Son grandes a propósito —la
  diana mide entre 180 y 300 px porque se golpea con la mano y a veces sin mirar— y meterlas
  en una barra sería encogerlas hasta que dejaran de servir.
- **Dos barras y no una**, también en apaisado: una es de la aplicación y otra de la
  actividad. Lo que se hace ahí es adelgazar las dos.
- **Si no caben, saltan de línea.** Un menú de «Más» esconde botones que un niño no va a
  buscar; una fila que se arrastra de lado no avisa de que hay algo a la derecha.
- **Vacía se esconde entera**, borde incluido: se queda sin botones justo mientras el niño
  escucha y responde, que es cuando más falta hace el sitio.
- **El hueco de abajo se mide**, no se adivina. La barra publica `--alto-acciones` y de ahí
  cuelgan el relleno final de la actividad y la altura de la tarjeta de reacción.

Los símbolos son un vocabulario cerrado, con su tabla en
[`ui/Simbolos.tsx`](../src/ui/Simbolos.tsx): cada acción tiene uno y siempre el mismo, en las
veintiuna pantallas. Los botones de **valor** —una octava, un tempo— no llevan: no son
acciones, y un icono al lado de un «2» no significa nada.

### Al ampliar, la postura la pide la actividad

Ampliar pedía **apaisado siempre**. Está bien para un piano —en vertical un móvil no da para
dos octavas— y está mal para las cinco actividades donde las notas caen de arriba abajo: se
giraba la pantalla justo al revés y el recorrido de caída, que es toda la actividad, se
quedaba en nada.

La orientación **no es una preferencia de la aplicación: es una propiedad de la actividad**,
y casi siempre está declarada o se deduce. La regla vive en
[`motor/orientacion.ts`](../src/motor/orientacion.ts) con su test, y da tres respuestas:

- **`apaisado`** — hace falta ancho: teclado, pentagrama, tira que avanza de lado, dieciséis
  columnas, la pantalla del maestro.
- **`vertical`** — hace falta alto: lo que cae.
- **`cualquiera`** — da igual, y entonces **no se toca la pantalla**. Es la respuesta que
  faltaba: forzar un giro que no aporta nada sorprende y deja al niño con el aparato en una
  postura que no eligió.

Y tres casos en los que no se gira aunque la actividad lo pida: **en modo pizarra** (una
pizarra no gira, y es una preferencia declarada en ajustes, no una adivinanza sobre el
aparato), **si ya está así**, y **si el navegador no sabe** — Safari de iOS, escritorio. En
el último caso la actividad ya ha ganado la pantalla completa, que era la mitad del objetivo,
y si además la forma es la contraria se ofrece girarlo a mano con una línea que se va sola al
girar. Nunca se bloquea nada: es la misma degradación del micrófono.

Lo único que se «detecta» es el tamaño de la pantalla, para no pedirle a nadie que gire un
monitor. `CLAUDE.md` §8 prohíbe mirar el *user agent* y con razón: los agentes mienten y las
versiones cambian; el tamaño de la pantalla, no.

### Las vueltas se cuentan en el botón, y en ningún sitio más

En las actividades de varias vueltas, **el botón anuncia la que va a empezar**: «Empezar · 1
de 3», y al acabar ésa, «Otra vez · 2 de 3». En la última no hay número, hay «Terminar».

Sale de dos cosas que el autor encontró seguidas. La primera: «si das otra vez sería como dar
empezar, ¿no?» — y lo era, porque «Otra vez» devolvía a la pantalla de inicio y había que
pulsar «Empezar» otra vez; dos toques para una intención, y con «Empezar» reapareciendo
parecía que se reiniciaba todo cuando ibas por la vuelta dos de tres. La segunda, al ver el
primer arreglo: «sale Vuelta 1 de 3 y luego en el botón 2 de 3». Los dos números eran
correctos y decían cosas distintas —dónde estás y adónde vas—, y por eso juntos se leen como
un error. El número vive donde se decide.

### Cuatro sitios donde la aplicación habla, y cada cosa en el suyo

1. **Qué hay que hacer** → la pantalla de explicación. Se lee al entrar y se vuelve a leer
   **pulsando al personaje**, que está siempre abajo en el centro. Dentro de la actividad no
   se repite: mientras se juega, la pantalla es de la actividad.

   Son dos frases: el `enunciado` de esa actividad y la ayuda de su tipo
   ([`motor/ayudaPorTipo.ts`](../src/motor/ayudaPorTipo.ts)), que es igual en todas las de
   ese tipo. El enunciado no debe repetir la ayuda — la auditoría avisa si lo hace.
2. **Dónde vas** → `.estado-actividad`. «Ahora tú», «esta vuelta va de palmas», «ya están
   todas puestas». Cambia solo, cabe en tres palabras, y por eso se puede quedar fijo.
3. **Lo que ha pasado** → `Reaccion`, la tarjeta del personaje. **Solo durante**: al empezar
   y al terminar ya hay dos modales, y el «¡completada!» que salía aquí lo repetía la de
   enhorabuena medio segundo después. Lo que se queda es lo que solo ella puede decir: el
   «bien/casi» entre rondas y la pista concreta al fallar. Va **superpuesta** abajo a la
   izquierda, entra deslizando. No recibe toques.

   **Y hay dos clases de mensaje, con dos tiempos distintos.** El elogio se va solo, a los
   tres segundos y medio más un poco por carácter. **La pista que enseña no lleva reloj**: se
   queda mientras el niño está atascado y se va cuando vuelve a responder.

   Sale de medirlo el 2026-09-09. Las 71 pistas del catálogo tienen 88 caracteres y 18
   palabras de mediana, y un niño de 2.º lee a 60 palabras por minuto: **veinte segundos**.
   La tarjeta duraba 6,2, así que **las 71 se quedaban cortas**. Y no hay número que arregle
   eso, porque entre 2.º y 6.º la velocidad lectora se dobla: cualquier duración buena para
   uno sobra o falta para el otro. La respuesta del niño sí es una señal fiable, y es gratis.
   El razonamiento y el test están en
   [`motor/maquinaReaccion.ts`](../src/motor/maquinaReaccion.ts).

   Debajo había un fallo que no se veía: la duración decía escalar con el texto y no
   escalaba. `children` es un array en seis de los once sitios —dos ramas `{cond && …}`
   seguidas— y el código preguntaba `typeof children === 'string'`, así que usaba un 60 de
   reserva **justo en los seis que llevan la pista larga**. Medía bien lo corto y mal lo
   único que había que medir.

   Estuvo dentro del flujo hasta el 2026-09-08 y era peor de lo que parece: al aparecer
   empujaba el tablero hacia abajo y al irse lo subía, así que cada respuesta movía la
   pantalla dos veces, justo mientras el niño apunta con el dedo.

   Dentro lleva dos voces y el orden importa: primero el personaje con una frase suya y
   corta, y debajo **la pista concreta de esa actividad**, que es la que enseña algo. La
   segunda la trae el JSON, porque «los dos “ti” entran en el mismo pulso» no lo puede decir
   un personaje genérico.
4. **La nota para el adulto** → `.pista-fija`, y en la explicación `.modal__adulto`. Que el
   piano también se toca con el teclado del ordenador, que el eco es para dos, que la
   tonalidad se sube hasta que la clase cante cómoda. Nada de esto es para quien va a jugar.

### Lo que no aparece nunca en la pantalla del niño

Milisegundos, cents, porcentaje de regularidad, desviación típica. `CLAUDE.md` §7 pide esos
números y se siguen calculando, pero su sitio es la hoja de seguimiento del maestro. Lo que
llega al niño es su **lectura en palabras**, que es exactamente lo que distingue «has
fallado» de «tu pulso es muy regular, solo vas un poquito por detrás».

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
