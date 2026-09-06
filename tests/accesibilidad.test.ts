import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), 'utf8');

/** Quita comentarios: buscar JSX dentro de un comentario da falsos positivos. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function componentes(): Array<{ ruta: string; fuente: string }> {
  const salida: Array<{ ruta: string; fuente: string }> = [];
  const recorrer = (dir: string) => {
    for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(rel);
      else if (e.name.endsWith('.tsx')) salida.push({ ruta: rel, fuente: sinComentarios(leer(rel)) });
    }
  };
  recorrer('src');
  return salida;
}

/**
 * Auditoría de accesibilidad, **T2.10**.
 *
 * Se hace con tests y no con una revisión manual a propósito: una auditoría es una foto que
 * caduca con el siguiente commit, y aquí el objetivo es WCAG 2.2 AA en una app para niños,
 * donde el estándar es el **suelo** y no la meta (`docs/04-DISENO-UI.md`).
 *
 * Lo que un test no puede comprobar —si un lector de pantalla lo lee con sentido, si un
 * niño con motricidad reducida llega— sigue necesitando a una persona, y está anotado.
 */
describe('accesibilidad', () => {
  const todos = componentes();

  it('nada interactivo se construye sobre un div: se usan elementos nativos', () => {
    // Un <div onClick> no recibe foco, no responde a Enter y un lector de pantalla no lo
    // anuncia. Reimplementar eso a mano es donde se rompe la accesibilidad.
    for (const { ruta, fuente } of todos) {
      const divsClicables = fuente.match(/<div[^>]*\sonClick=/g) ?? [];
      expect(divsClicables, `${ruta} tiene un div con onClick`).toEqual([]);
    }
  });

  it('ningún botón se deshabilita con `disabled` a media actividad', () => {
    // `disabled` le arrebata el foco a quien navega con teclado justo cuando aparece el
    // feedback. Se usa aria-disabled y el manejador ignora la pulsación.
    for (const { ruta, fuente } of todos) {
      const deshabilitados = fuente.match(/<button[^>]*\sdisabled(?![\w-])/g) ?? [];
      expect(deshabilitados, `${ruta} usa disabled en un botón`).toEqual([]);
    }
  });

  it('toda imagen declara alt, aunque sea vacío', () => {
    for (const { ruta, fuente } of todos) {
      for (const img of fuente.match(/<img[^>]*>/g) ?? []) {
        expect(img, `${ruta}: imagen sin alt`).toMatch(/\salt=/);
      }
    }
  });

  it('los avisos que cambian solos se anuncian con aria-live', () => {
    // Un mensaje que aparece sin que el usuario navegue hasta él es invisible para un
    // lector de pantalla si no se anuncia.
    const conFeedback = todos.filter((c) => c.fuente.includes('className="feedback"'));
    expect(conFeedback.length).toBeGreaterThan(0);
    for (const { ruta, fuente } of conFeedback) {
      const bloque = fuente.slice(fuente.indexOf('className="feedback"') - 200);
      expect(bloque.slice(0, 400), `${ruta}: feedback sin aria-live`).toMatch(/aria-live/);
    }
  });

  it('los grupos de opciones se etiquetan', () => {
    for (const { ruta, fuente } of todos) {
      for (const grupo of fuente.match(/role="(group|grid|application)"/g) ?? []) {
        const i = fuente.indexOf(grupo);
        expect(
          fuente.slice(i - 200, i + 200),
          `${ruta}: ${grupo} sin aria-label`,
        ).toMatch(/aria-label/);
      }
    }
  });

  it('el movimiento respeta prefers-reduced-motion', () => {
    // Hay niños con hipersensibilidad vestibular. Toda animación necesita su escape.
    const css = leer('src/estilos/tokens.css');
    const animaciones = (css.match(/animation:\s*[a-z]/gi) ?? []).length;
    const escapes = (css.match(/prefers-reduced-motion/g) ?? []).length;
    expect(animaciones).toBeGreaterThan(0);
    expect(escapes, 'hay animaciones sin ningún bloque de reduced-motion').toBeGreaterThan(2);
  });

  it('nada que se REPITA parpadea más de tres veces por segundo', () => {
    // Criterio 2.3.1. El límite es para el parpadeo repetido: una transición que ocurre
    // una sola vez —un modal que aparece en 180 ms— no parpadea, por rápida que sea.
    const css = leer('src/estilos/tokens.css');
    for (const m of css.matchAll(/animation:\s*([^;]+);/g)) {
      const decl = m[1]!;
      const repeticiones = /infinite/.test(decl)
        ? Infinity
        : Number(/\s(\d+)\s*$/.exec(decl.trim())?.[1] ?? 1);
      if (repeticiones <= 1) continue;

      const dur = /(\d+(?:\.\d+)?)(ms|s)/.exec(decl);
      const ms = dur ? Number(dur[1]) * (dur[2] === 's' ? 1000 : 1) : 1000;
      expect(ms, `«${decl.trim()}» se repite a más de 3 Hz`).toBeGreaterThanOrEqual(333);
    }
  });

  it('el color nunca es lo único que distingue dos estados', () => {
    // Regla 4, y un 8 % de los niños tiene daltonismo. Cada estado se marca además con
    // forma, tamaño, borde o movimiento.
    const css = leer('src/estilos/tokens.css');
    const marcados = ["[data-marca='sobra']", "[data-marca='falta']", "[data-estado='resuelta']"];
    for (const sel of marcados) {
      const i = css.indexOf(sel);
      expect(i, `no encuentro ${sel}`).toBeGreaterThan(-1);
      const regla = css.slice(i, css.indexOf('}', i));
      expect(regla, `${sel} se distingue solo por color`).toMatch(
        /border-style|border-width|animation|opacity|transform|border:/,
      );
    }
  });

  it('las actividades se pueden hacer solo con teclado', () => {
    // Todo lo tocable es <button> nativo, así que Tab y Enter funcionan sin escribir nada.
    // Y donde hay gesto de puntero hay además una alternativa por toque.
    const conPuntero = todos.filter((c) => c.fuente.includes('onPointerDown'));
    for (const { ruta, fuente } of conPuntero) {
      const tieneAlternativa =
        fuente.includes('onClick') || fuente.includes('keydown') || fuente.includes('<button');
      expect(tieneAlternativa, `${ruta}: gesto de puntero sin alternativa`).toBe(true);
    }
  });

  it('el idioma del documento está declarado', () => {
    expect(leer('index.html')).toMatch(/<html[^>]*lang="es"/);
  });

  it('hay un solo h1 por pantalla', () => {
    // Más de uno rompe la navegación por encabezados de un lector de pantalla.
    for (const { ruta, fuente } of todos) {
      const h1 = (fuente.match(/<h1[\s>]/g) ?? []).length;
      expect(h1, `${ruta} tiene ${h1} encabezados h1`).toBeLessThanOrEqual(1);
    }
  });
});
