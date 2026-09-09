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
    /*
      Un mensaje que aparece sin que el usuario navegue hasta él es invisible para un lector
      de pantalla si no se anuncia.

      Miraba la clase `.feedback`, que era el párrafo que repetían siete tipos de motor.
      Desde el 2026-09-08 eso es un componente —`ui/Reaccion.tsx`—, así que lo que hay que
      comprobar es que ESE lo anuncie: si se le cayera el `aria-live`, se quedarían mudas las
      veintiuna pantallas de golpe en vez de una.
    */
    const reaccion = readFileSync(join(RAIZ, 'src', 'ui', 'Reaccion.tsx'), 'utf-8');
    expect(reaccion, 'Reaccion.tsx sin aria-live').toMatch(/aria-live/);

    /*
      Y que la región **exista antes que el mensaje**, que es la mitad que no se ve leyendo.

      Una región `aria-live` creada en el mismo momento que su contenido no se anuncia de
      forma fiable: varios lectores de pantalla solo vigilan las que ya estaban. El
      componente lo hacía así hasta el 2026-09-08 —montaba y desmontaba un solo elemento con
      el `aria-live` y el texto dentro— y este mismo test lo daba por bueno, porque el
      atributo estaba puesto.

      Se comprueba por lo que se puede comprobar: que el componente no se salga antes de
      dibujar. Si vuelve a aparecer un `return null` aquí, la región vuelve a nacer con el
      mensaje.
    */
    expect(
      reaccion,
      'Reaccion.tsx vuelve a salirse con return null: la región aria-live nacería con el ' +
        'mensaje y no se anunciaría',
    ).not.toMatch(/return null/);

    // Y lo que siga anunciándose a mano, que también lo haga bien.
    for (const { ruta, fuente } of todos) {
      for (const m of fuente.matchAll(/className="(feedback|tocar__resultado)"/g)) {
        const bloque = fuente.slice(Math.max(0, m.index - 200), m.index + 200);
        expect(bloque, `${ruta}: aviso sin aria-live`).toMatch(/aria-live|<Reaccion/);
      }
    }
  });

  it('ningún botón se queda solo con un dibujo y sin nombre', () => {
    /*
      Un botón que solo lleva un símbolo no tiene texto que leer: para un lector de pantalla
      es «botón» a secas, y para quien no reconoce el dibujo tampoco dice nada. Puede estar
      bien —las flechas de la guía de aula van entre un contador y se leen solas— pero
      entonces tiene que llevar `aria-label`.

      Salió de un caso propio: al llevar los acompañamientos a la botonera dejé «más grave» y
      «más agudo» solo con el signo, y el enunciado de la actividad seguía nombrándolos por
      su texto. Ahí sobraba sitio y lo que faltaba era la palabra, así que se devolvió; pero
      el fallo general —icono sin nombre— no lo cazaba nada.
    */
    const mudos: string[] = [];
    for (const { ruta, fuente } of todos) {
      for (const m of fuente.matchAll(/<button\b([\s\S]*?)<\/button>/g)) {
        const cuerpo = m[1]!;
        const tieneIcono = /<Icono/.test(cuerpo);
        /*
          Un nombre puede venir de dos sitios: el texto visible o un `aria-label`. Los dos
          valen y por eso se miran juntos — lo que no vale es ninguno de los dos.

          Se busca `t(` y no un texto suelto porque en este proyecto **no hay literales en
          los componentes**: todo pasa por el diccionario. La primera versión de esta
          comprobación intentaba detectar texto con «un `>` seguido de una letra» y no
          cazaba nada, porque la flecha de cualquier `() => algo` cumple eso.
        */
        const tieneNombre = /\bt\(/.test(cuerpo) || /aria-label/.test(cuerpo);
        if (tieneIcono && !tieneNombre) {
          mudos.push(`${ruta}: ${cuerpo.slice(0, 80).replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(mudos, `botones con dibujo y sin nombre:\n${mudos.join('\n')}`).toEqual([]);
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
