# Cómo arrancar una sesión con Claude Code

## La primera frase

```
Lee CLAUDE.md y docs/07-ROADMAP.md y dime en qué tarea estamos y qué propones hacer primero.
```

No le pidas «haz la app». Pídele **una tarea del roadmap**, con su criterio de aceptación.

## Frases que funcionan bien en este repositorio

| Quieres | Dile |
|---|---|
| Empezar una tarea | `Vamos con T1.2. Enséñame el plan antes de escribir código.` |
| Una actividad nueva | `Genera el JSON de la actividad INF-03 del catálogo siguiendo prompts/generar-actividad.md, y valídalo.` |
| Un tipo de motor nuevo | `Implementa el tipo `ordenar` siguiendo el patrón de src/motor/tipos/Eleccion.tsx. Sin arrastre.` |
| Revisar accesibilidad | `Audita esta pantalla contra docs/04-DISENO-UI.md y dime qué incumple.` |
| Antes de cerrar | `Ejecuta npm run verificar y arregla lo que falle.` |

## Frases que evitan los errores típicos

- «**No añadas dependencias sin decirme licencia y peso gzip.**»
- «**Antes de crear un componente, comprueba si esto cabe en un tipo de actividad existente.**»
- «**Esto necesita criterio musical: dime la opción convencional y de dónde sale, y márcala
  como pendiente de revisión.**»
- «**Recuérdame probar esto en un iPad real antes de darlo por bueno.**»

## Ritmo de trabajo

1. Una tarea del roadmap por sesión.
2. Rama por tarea: `git switch -c t1.2-emparejar-ordenar`.
3. `npm run verificar` antes de cada commit.
4. PR contra `main`, con la checklist de la plantilla de issue.
5. Marca `[x]` en `docs/07-ROADMAP.md` en el mismo PR.
