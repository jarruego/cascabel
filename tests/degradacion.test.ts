import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');

/**
 * La regla 8 de CLAUDE.md: **el micrófono es un accesorio, nunca un requisito**. Ante
 * cualquier fallo la actividad degrada a toque y continúa.
 *
 * No es solo accesibilidad —alumnado con mutismo, disfemia o vergüenza—: es lo que
 * mantiene el riesgo de iOS acotado a un defecto en vez de a un cambio de arquitectura
 * (ver `docs/adr/0004-pwa-primero.md`). Y es realidad de aula: veinticinco micrófonos
 * abiertos a la vez son inutilizables.
 *
 * Una regla que solo vive en un documento se incumple el día que alguien tiene prisa.
 */
describe('el micrófono nunca bloquea', () => {
  function componentes(): string[] {
    const dir = join(RAIZ, 'src', 'motor', 'tipos');
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `src/motor/tipos/${f}`);
  }

  it('todo componente que arranca el micrófono lo hace dentro de un try', () => {
    for (const f of componentes()) {
      const fuente = leer(f);
      if (!/DetectorDe(Tono|Palmadas)/.test(fuente)) continue;

      // El arranque tiene que estar protegido: si lanza y nadie lo coge, la actividad
      // se queda en blanco delante de un niño.
      expect(fuente, `${f} usa el micrófono sin try/catch`).toMatch(/try\s*\{/);
      expect(fuente, `${f} no maneja el fallo`).toMatch(/catch\s*\(/);
    }
  });

  it('las actividades de micrófono declaran alternativa por toque', () => {
    const dir = join(RAIZ, 'content', 'actividades');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const a = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
        entrada: { modo: string; alternativa?: string };
      };
      if (!a.entrada.modo.startsWith('microfono')) continue;
      expect(a.entrada.alternativa, `${f} no declara alternativa`).toBeTruthy();
      expect(a.entrada.alternativa, `${f} declara alternativa "ninguna"`).not.toBe('ninguna');
    }
  });

  it('ninguna actividad usa arrastre', () => {
    // WCAG 2.5.7, y por debajo de 6 años la motricidad fina no da. El validador de
    // contenido también lo comprueba; esto lo deja fijado también del lado del código.
    const dir = join(RAIZ, 'content', 'actividades');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const a = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { entrada: { modo: string } };
      expect(a.entrada.modo, `${f} usa arrastre`).not.toBe('arrastre');
    }
  });

  it('la capa de micrófono devuelve el tipo de error, no solo un mensaje', () => {
    // El tipo es lo que permite decidir si el aviso habla de permisos o de otra cosa.
    // Sin él, el adulto ve «algo ha fallado» y no sabe qué tocar.
    const fuente = leer('src/escucha/microfono.ts');
    for (const tipo of ['denegado', 'sin-dispositivo', 'no-soportado', 'desconocido']) {
      expect(fuente).toContain(tipo);
    }
  });
});
