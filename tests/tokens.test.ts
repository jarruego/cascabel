import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(RAIZ, 'src', 'estilos', 'tokens.css'), 'utf8');

/**
 * Este fichero existe por un fallo real y vergonzoso: se añadieron los tokens `--suave-*`
 * como fondos claros **solo en `:root`**, sin su pareja en el bloque de modo oscuro. En
 * modo oscuro `--tinta` pasa a ser clara, así que el modal de éxito quedaba con texto claro
 * sobre fondo claro: ilegible. Lo detectó el autor probándolo, no ningún test.
 *
 * La lección es general: **un token de fondo sin pareja en los dos esquemas es un fallo de
 * contraste esperando a ocurrir**, y no se ve escribiendo el código porque quien lo escribe
 * suele tener un solo esquema activo.
 */
describe('tokens de color', () => {
  const bloqueOscuro = css.slice(
    css.indexOf('@media (prefers-color-scheme: dark)'),
    css.indexOf('@media (prefers-color-scheme: dark)') + 2000,
  );

  function tokensDe(texto: string, prefijo: string): string[] {
    return [...texto.matchAll(new RegExp(`--(${prefijo}-[\\w-]+):`, 'g'))].map((m) => m[1]!);
  }

  it('todo token --suave-* tiene pareja en modo oscuro', () => {
    const claros = new Set(tokensDe(css, 'suave'));
    const oscuros = new Set(tokensDe(bloqueOscuro, 'suave'));
    const huerfanos = [...claros].filter((t) => !oscuros.has(t));
    expect(huerfanos, 'fondos sin versión oscura: texto claro sobre fondo claro').toEqual([]);
  });

  it('todo token --vivo-* tiene pareja en modo oscuro', () => {
    const claros = new Set(tokensDe(css, 'vivo'));
    const oscuros = new Set(tokensDe(bloqueOscuro, 'vivo'));
    expect([...claros].filter((t) => !oscuros.has(t))).toEqual([]);
  });

  it('los colores base también se redefinen', () => {
    for (const t of ['--papel', '--superficie', '--tinta', '--tinta-2', '--linea']) {
      expect(bloqueOscuro, `${t} no cambia en modo oscuro`).toContain(t);
    }
  });

  it('toda superficie con fondo de color declara su color de texto', () => {
    // Heredar el color del texto es exactamente lo que rompió el modal de éxito.
    const reglas = [...css.matchAll(/\{[^}]*background:\s*var\(--suave-[^)]+\)[^}]*\}/g)];
    expect(reglas.length).toBeGreaterThan(0);
    for (const r of reglas) {
      expect(r[0], `esta regla pone fondo de color sin fijar el texto:\n${r[0]}`).toMatch(
        /color:\s*var\(--/,
      );
    }
  });

  it('los objetivos táctiles siguen cumpliendo WCAG 2.5.8', () => {
    // 24 px es el mínimo de la norma; con niños es el suelo, no la meta.
    for (const m of css.matchAll(/--objetivo-[\w-]+:\s*(\d+)px/g)) {
      expect(Number(m[1]), `objetivo táctil de ${m[1]}px`).toBeGreaterThanOrEqual(24);
    }
  });

  it('el modo pizarra agranda en vez de rediseñar', () => {
    // El aula española típica tiene un proyector y ningún dispositivo por niño. Escalar
    // los tokens evita mantener una segunda versión de cada pantalla.
    expect(css).toMatch(/\[data-pizarra='true'\]/);
    expect(css).toMatch(/font-size:\s*15\d%/);
  });
});
