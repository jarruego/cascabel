---
name: Nueva actividad
about: Añadir una actividad al catálogo
labels: contenido
---

**ID del catálogo** (p. ej. C1-04):

**Tipo de motor** (`eleccion`, `emparejar`, `ordenar`, `rejilla`, `pentagrama`, `seguir`, `tocar-a-tiempo`, `cantar`, `lienzo`, `guia-aula`):

**Anclaje curricular** (competencia · criterio · saber básico):

**Checklist antes de cerrar**

- [ ] El JSON valida contra `schemas/actividad.schema.json`
- [ ] `python tools/validar.py` pasa sin avisos
- [ ] Tiene locución grabada (no sintetizada)
- [ ] Tiene alternativa sin micrófono, si usa micrófono
- [ ] Objetivos táctiles del tamaño correcto para la etapa
- [ ] No hay límite de tiempo, vidas ni castigo por error
- [ ] Revisada pedagógicamente (¿cantable?, ¿se entiende sin leer?, ¿lo haría en clase?)
- [ ] Todo el material usado está en `THIRD-PARTY-NOTICES.md` con su licencia
