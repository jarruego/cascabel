# Pendiente de revisión

> **Fichero generado.** Lo escribe `npm run docs:pendientes` leyendo las marcas que hay
> repartidas por el código. No lo edites a mano: edita la marca, que está junto a la decisión
> que la provocó. Generado el 2026-09-09.

Esto es lo que **decidió un desarrollador leyendo la convención documentada** y que hace falta
que confirme alguien que sepa de música o de aula. Ninguna de estas decisiones está mal por
definición: están sin verificar, que es distinto y peor de dejar callado.

En cada una, lo que hace falta es una de tres respuestas: **vale**, **cámbialo por esto**, o
**depende, y depende de esto**.

12 puntos esperando respuesta.

## 1. `src/config.ts` (línea 113)

**Pendiente de revisión pedagógica.** Las cifras son las convencionales que ya estaban documentadas; lo que se decide aquí es el eje por el que se indexan.

## 2. `src/motor/afinacion.ts` (línea 67)

PENDIENTE DE REVISIÓN PEDAGÓGICA: los tres números salen de que la precisión de canto infantil mejora con la edad, que es lo convencional en la literatura coral, pero **dónde poner cada uno lo dice una maestra oyendo a un niño**, no un desarrollador.

## 3. `src/motor/eco.ts` (línea 27)

**PENDIENTE DE REVISIÓN PEDAGÓGICA.** Que un eco a otra velocidad cuente como bueno es un criterio, no un hecho: en un aula de conservatorio no lo sería. Aquí se ha elegido que sí, porque a estas edades reconocer la forma rítmica va antes que sostener el tempo, y porque la alternativa —marcarlo como fallo— desanima justo a quien lo ha entendido. Se informa aparte, así que el maestro ve las dos cosas.

## 4. `src/motor/evaluacion.ts` (línea 104)

PENDIENTE DE REVISIÓN PEDAGÓGICA: el número. Que tenga que haber un punto a partir del cual se felicita es claro —si no, «bien» no significaría nada—; que ese punto sean seis de cada diez es una elección, y quien puede decir si a los siete años eso es exigente o blando es una maestra viendo a la clase, no un desarrollador.

## 5. `src/motor/musicograma.ts` (línea 32)

`vertical` —las figuras caen— no exige ningún sentido de lectura, así que sirve antes de saber leer y es la natural para el ritmo. `horizontal` —las figuras vienen de la derecha— reproduce cómo se recorre una partitura, así que es la que corresponde cuando lo que se está aprendiendo es a leer. **PENDIENTE DE REVISIÓN PEDAGÓGICA**: la correspondencia entre edades y representaciones de la tabla es la convención habitual (Kodály para las sílabas, código Boomwhacker para los colores), pero dónde está el salto de una a otra lo dice una maestra, no un desarrollador.

## 6. `src/motor/rejillaRitmica.ts` (línea 9)

PENDIENTE DE REVISIÓN PEDAGÓGICA: el repertorio de sílabas de abajo es el convencional del método Kodály tal como se enseña en España, pero hay variantes regionales («ti-ri-ti-ri» frente a «ta-fa-te-fe» para semicorcheas, por ejemplo). Lo ha fijado un desarrollador.

## 7. `src/motor/repaso.ts` (línea 18)

**PENDIENTE DE REVISIÓN PEDAGÓGICA.** Los tres intervalos son una convención razonable, no una medida. Con un curso de uso real se sabrá si a un niño de siete años le vale una semana o si hacen falta tres días.

## 8. `tools/auditoria.mjs` (línea 270)

PENDIENTE DE REVISIÓN PEDAGÓGICA. Los saberes se escriben a mano en cada JSON y aquí no hay forma de saber cuál es la redacción buena: el real decreto está en el BOE y este proyecto no lo tiene delante. Lo que sí se ve es cuándo una redacción la usa **una sola actividad** y otra parecida la usan treinta, que casi siempre significa que alguien escribió el mismo saber de dos maneras — pasó con el F de Infantil, que estaba de cuatro formas distintas y partía en cuatro un grupo que es uno.

## 9. `tools/dificultad.mjs` (línea 73)

PENDIENTE DE REVISIÓN PEDAGÓGICA: los topes de esta tabla. Lo que se puede afirmar sin una maestra es que **la de elegir y la de seguir son distintas**; dónde está exactamente el techo de cada edad, no.

## 10. `tools/dificultad.mjs` (línea 218)

PENDIENTE DE REVISIÓN PEDAGÓGICA: los topes. Salen de la duración razonable por etapa dividida entre lo que tarda una pregunta con su escucha, no de ninguna fuente.

## 11. `tools/muestras-provisionales.py` (línea 98)

PENDIENTE DE REVISIÓN PEDAGÓGICA: se usan tres campanas separadas por quintas justas (relación 3:2) porque la diferencia de altura tiene que ser inconfundible para un niño de 3 a 6 años. Es la opción convencional en material Montessori de campanas, donde se empieza por intervalos grandes antes de afinar el oído a los pequeños. Una maestra puede querer terceras o la escala pentatónica.

## 12. `tools/muestras-provisionales.py` (línea 144)

Los tempos son los convencionales de los diccionarios de música: adagio 66, andante 92 y allegro 138 pulsos por minuto. PENDIENTE DE REVISIÓN PEDAGÓGICA: los rangos varían según la fuente y a esta edad lo que importa es que se distingan, no la precisión.
