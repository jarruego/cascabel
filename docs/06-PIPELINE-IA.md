# Fabricar contenido con IA

El plan de «generar con IA y revisar después» funciona **solo si la revisión no depende de
criterio musical humano**. La clave es que la mayor parte sea automática.

## Las cuatro fases

### 1. Generar contra un esquema

La IA no escribe «una actividad»: rellena `schemas/actividad.schema.json`. Un formato
cerrado reduce el espacio de error muchísimo más que un buen prompt. El prompt está en
`prompts/generar-actividad.md`.

### 2. Validar con código, no con oído

```bash
npm run contenido:validar        # o docker compose --profile tools run contenido
```

`tools/validar.py` comprueba, sobre la tanda entera:

- Que el JSON cumple el esquema
- Que los compases del ABC cuadran con la indicación de compás
- Que el ámbito cabe en la tesitura de la edad declarada
- Que no hay saltos mayores que el límite de la etapa (4.ª en Infantil, 5.ª en c1, 6.ª en c2)
- Que las figuras declaradas son coherentes con el curso
- Reglas de producto: alternativa sin micrófono, nada de arrastre en Infantil, máximo de
  objetos en pantalla, y que no aparezcan `vidas`, `tiempo_limite_s`, `racha` ni `clasificacion`

**Lo que no pasa se descarta y se regenera sin intervención humana.** Esto solo ahorra semanas.

### 3. Revisión visual en lote

Una ruta interna `/revisar` que renderice N actividades a la vez con abcjs, cada una con su
botón de reproducir. Se revisa una tanda de cincuenta en veinte minutos, no una actividad en
veinte minutos.

### 4. Revisión pedagógica dirigida

**Tres preguntas cerradas por actividad**, no «¿está bien?»:

1. ¿Es cantable / ejecutable a esta edad?
2. ¿Se entiende el enunciado sin leer?
3. ¿Esto lo haría yo en clase?

Más un campo de «cámbialo por esto». Respuestas rápidas, decisiones claras.

## Lo que la IA NO decide

| Nunca | Por qué |
|---|---|
| La secuencia didáctica | Sale del currículo y de la práctica documentada. Fíjala tú en una tabla y pásala como contexto |
| El repertorio | Un modelo te dará canciones populares con toda la confianza, incluidas las protegidas. Toda canción se verifica contra una fuente de dominio público **antes** de entrar |
| Las locuciones | Voz humana grabada, no TTS. Es la recomendación más consistente de la investigación de UX infantil |
| Los textos normativos | Competencias y criterios se copian del BOE, no se parafrasean |

## Dónde está de verdad el multiplicador

La IA no te ahorra tiempo escribiendo componentes de React: te lo ahorra **generando y
validando quinientas actividades**. Hasta que el esquema, el prompt y el validador funcionen,
tienes una demo. Cuando funcionen, tienes un producto. Por eso el generador es una tarea de
la fase 1, no del mes seis.
