---
description: Cierra la sesión de trabajo actualizando docs/07-ROADMAP.md y los ADR, y propone el commit
argument-hint: [nota opcional sobre lo que ha pasado]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Read, Edit, Write
disable-model-invocation: true
---

Cierre de sesión de Cascabel. Nota del autor sobre esta sesión: $ARGUMENTS

## Estado del repositorio

Rama y cambios sin commitear:

```!
git branch --show-current
git status --short
```

Último commit:

```!
git log -1 --stat --format="%h %s"
```

## Qué tienes que hacer

1. **Mira el trabajo real de esta sesión** con `git diff` y `git diff --staged` sobre los
   ficheros que aparecen arriba. No te fíes de tu memoria de la conversación: mira el diff.

2. **Actualiza `docs/07-ROADMAP.md` con contenido real.** Nada de apéndices automáticos ni
   de registros de cambios: eso es ruido y el hook `roadmap-check` existe precisamente para
   que no se cuele. Concretamente:
   - Marca con `[x]` **sólo** las casillas cuyo criterio de aceptación se cumple de verdad.
     Si el código compila pero el criterio dice «lo prueba un niño de 4 años», no está hecha.
   - Si algo quedó a medias, escribe en una línea qué falta y qué es lo siguiente.
   - Si ha aparecido trabajo nuevo que no estaba previsto, añádelo como tarea con su
     criterio de aceptación, en la fase que le corresponda.

3. **Actualiza los ADR** si ha cambiado alguna decisión, o si una que estaba abierta se ha
   cerrado. Si la decisión es nueva, crea `docs/adr/NNNN-titulo.md` siguiendo el formato de
   los que ya hay: Estado, Fecha, Contexto, Decisión, Consecuencias, alternativa descartada.

4. **Comprueba que no queda nada contradictorio** entre `CLAUDE.md`, el roadmap, los ADR y
   `docs/04-DISENO-UI.md`. Si lo hay, dilo en vez de arreglarlo por tu cuenta.

5. **Ejecuta `npm run verificar`.** Si falla, NO propongas commit: enseña el fallo.

6. **Propón el commit**: mensaje en español, imperativo y con ámbito
   (`motor: añade tipo emparejar`, `docs: cierra T0.1`). Documentación y código van **en el
   mismo commit**. Enséñame el mensaje y espera mi visto bueno antes de commitear.

Si esta sesión no ha tocado código y no procede tocar el roadmap, dilo claramente y no
inventes una actualización.
