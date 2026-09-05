# Diseño de interfaz para niños

Objetivo: **WCAG 2.2 AA**. Para niños es un suelo, no una meta.

## Tamaños

| Etapa | Objetivo táctil | Separación | Objetos simultáneos | Cuerpo de texto |
|---|---|---|---|---|
| Infantil (3–6) | 75 × 75 px | ≥ 24 px | 2–4 | 20–24 px |
| 1.º–3.º (6–8) | 60 × 60 px | ≥ 16 px | 4–6 | 18 px |
| 4.º–6.º (9–12) | 48 × 48 px | ≥ 12 px | 6–9 | 17 px |

WCAG 2.5.8 pide 24 × 24 px, pensado para adultos. Los niños de 3 a 5 años no tienen
control motor fino.

**Truco imprescindible en pentagramas**: dibuja la nota pequeña, tipográficamente correcta,
y pon encima un hitbox transparente de 60 px. VexFlow te da control total para hacerlo.

## Las diez reglas

1. **Nada esencial solo en texto.** Toda instrucción existe en audio, con **voz humana
   grabada**. La síntesis de voz suena antinatural a los pequeños y les cuesta procesarla.
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
   nunca arrastrar.
10. **Tipografía grande y legible.** Andika (SIL, OFL) para Infantil; Atkinson Hyperlegible
    y OpenDyslexic como opción conmutable.

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
