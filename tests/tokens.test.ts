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

/**
 * Dos componentes distintos no pueden compartir nombre de clase.
 *
 * Salió de un fallo real: `.ficha` era a la vez la **tarjeta del catálogo** y la **hoja
 * imprimible**. En castellano las dos son «una ficha», así que el nombre parecía correcto
 * en los dos sitios. El resultado fue que el borde gris de la tarjeta se dibujaba alrededor
 * del dosier del maestro y salía impreso, robando ancho en cada hoja.
 *
 * No dio ningún error: la hoja redefinía `padding` y `max-width`, así que **parecía** que
 * mandaba, y el `border` de la otra regla se colaba por debajo sin que nada avisara.
 */
describe('colisiones de nombres de clase', () => {
  /**
   * Bloques de primer nivel: se descartan los que están dentro de una arroba.
   *
   * Se quitan antes los comentarios. Sin eso, el comentario que precede a una regla queda
   * pegado al selector y `'.ficha'` nunca coincide — que es exactamente lo que pasó la
   * primera vez que se escribió esta comprobación: pasaba en verde con la colisión puesta
   * a propósito.
   */
  function bloquesDePrimerNivel(bruto: string): Array<{ selector: string; cuerpo: string }> {
    const texto = bruto.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const bloques: Array<{ selector: string; cuerpo: string }> = [];
    let profundidad = 0;
    let inicio = 0;
    let selector = '';
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] === '{') {
        if (profundidad === 0) {
          selector = texto.slice(inicio, i).trim();
          inicio = i + 1;
        }
        profundidad++;
      } else if (texto[i] === '}') {
        profundidad--;
        if (profundidad === 0) {
          // Una arroba (@media, @supports) contiene otras reglas: se ignora su envoltorio,
          // y sus reglas interiores no cuentan como definición de primer nivel.
          if (!selector.startsWith('@')) {
            bloques.push({ selector, cuerpo: texto.slice(inicio, i) });
          }
          inicio = i + 1;
        }
      }
    }
    return bloques;
  }

  it('ninguna clase define caja en dos reglas distintas', () => {
    const CAJA = /(^|[;{\s])(border|background)\s*:/;
    const porClase = new Map<string, string[]>();

    for (const { selector, cuerpo } of bloquesDePrimerNivel(css)) {
      if (!CAJA.test(cuerpo)) continue;
      for (const parte of selector.split(',')) {
        // Solo el selector de una única clase, sin descendientes ni pseudoclases: `.foo`.
        const m = parte.trim().match(/^\.([a-z0-9_-]+)$/i);
        if (m) porClase.set(m[1]!, [...(porClase.get(m[1]!) ?? []), selector]);
      }
    }

    const chocan = [...porClase.entries()]
      .filter(([, donde]) => donde.length > 1)
      .map(([clase, donde]) => `.${clase} se define con caja ${donde.length} veces`);

    expect(chocan, `dos componentes comparten nombre:\n${chocan.join('\n')}`).toEqual([]);
  });

  it('la hoja imprimible no hereda caja de nadie', () => {
    // La comprobación concreta del fallo: `.ficha` es la hoja y nada más.
    const conCaja = bloquesDePrimerNivel(css).filter(
      (b) => b.selector.split(',').some((p) => p.trim() === '.ficha') &&
        /(^|[;{\s])border\s*:/.test(b.cuerpo),
    );
    expect(conCaja.map((b) => b.selector)).toEqual([]);
  });
});
