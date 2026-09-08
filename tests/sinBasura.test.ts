import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Que no se acumule basura.
 *
 * Salió de una auditoría del 2026-09-07 que encontró seis clases CSS de reglas ya
 * reescritas, tres exportaciones que no llamaba nadie y —lo peor— **un componente entero
 * construido y sin enchufar**: `PasoEntreEjercicios`, con sus estilos y sus textos, hecho
 * desde que el autor pidió las pausas entre ejercicios y sin usar en ninguna actividad.
 *
 * Eso último es peor que código muerto, porque **parece que la funcionalidad está**. Un
 * componente sin conectar no da error, no rompe ningún test y pasa cualquier revisión.
 *
 * Estas comprobaciones son baratas y ninguna es infalible —una clase compuesta con plantilla
 * escapa a la primera—, pero cogen justo lo que se acumula solo: lo que se queda atrás al
 * reescribir algo.
 */

const RAIZ = join(__dirname, '..');

function ficheros(dir: string, extension: RegExp): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return ficheros(ruta, extension);
    return extension.test(n) ? [ruta] : [];
  });
}

const FUENTES = ficheros(join(RAIZ, 'src'), /\.tsx?$/);
/**
 * El código SIN comentarios.
 *
 * Se le quitan a propósito. La comprobación de abajo busca el nombre de la clase como
 * cadena, y un comentario que la mencione basta para darla por viva: pasó el 2026-09-09, al
 * documentar en `BarraAcciones.tsx` los quince contenedores que venía a sustituir. Tres de
 * ellos siguieron con su regla en el CSS y el test los dio por buenos porque estaban
 * escritos en esa lista.
 *
 * Es el peor tipo de falso negativo: cuanto mejor se documenta un borrado, menos lo caza.
 */
const CODIGO = FUENTES.map((f) => readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const CSS = readFileSync(join(RAIZ, 'src', 'estilos', 'tokens.css'), 'utf8');

describe('componentes conectados', () => {
  it('todo componente exportado lo nombra alguien', () => {
    /*
      Un componente que nadie nombra es una promesa incumplida: el código dice que la
      funcionalidad existe y en la pantalla no está. Es exactamente lo que pasó con
      `PasoEntreEjercicios`, exportado y jamás importado.

      Se busca el NOMBRE en otro fichero, no la etiqueta JSX: los tipos de actividad no se
      montan escribiendo `<Karaoke/>`, se importan en `registro.ts` y se resuelven por el
      tipo del JSON. Ésa es la arquitectura entera del proyecto —un componente por tipo, no
      por actividad— y una comprobación que la ignorara marcaría los quince como huérfanos.
    */
    const huerfanos: string[] = [];
    for (const f of FUENTES) {
      const src = readFileSync(f, 'utf8');
      const fuera = FUENTES.filter((x) => x !== f)
        .map((x) => readFileSync(x, 'utf8'))
        .join('\n');
      for (const m of src.matchAll(/^export (?:default )?function ([A-Z]\w+)/gm)) {
        const nombre = m[1]!;
        if (!new RegExp(`\\b${nombre}\\b`).test(fuera)) {
          huerfanos.push(`${nombre} (${f.replace(RAIZ, '')})`);
        }
      }
    }
    expect(huerfanos, `componentes que nadie nombra:\n${huerfanos.join('\n')}`).toEqual([]);
  });
});

describe('estilos vivos', () => {
  it('ninguna clase CSS quedó huérfana al reescribir su componente', () => {
    // Solo se miran las clases con `__`, que son las de un componente concreto: las
    // genéricas y las modificadoras `--` se componen con plantilla y darían falso positivo.
    const clases = new Set(
      [...CSS.matchAll(/\.([a-z][a-z0-9]*__[a-z0-9-]+)\b/g)].map((m) => m[1]!),
    );
    const huerfanas = [...clases].filter((c) => !CODIGO.includes(c));
    expect(huerfanas, `clases sin componente:\n${huerfanas.join('\n')}`).toEqual([]);
  });
});

describe('recursos usados', () => {
  it('todo icono descargado se usa en alguna parte', () => {
    // Cada icono es un fichero que se precachea y que todo niño se descarga. Uno que no
    // usa nadie es peso en la primera visita de un colegio entero a cambio de nada.
    const contenido = ficheros(join(RAIZ, 'content'), /\.json$/)
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const iconos = readdirSync(join(RAIZ, 'public', 'iconos'))
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace('.svg', ''));

    const sinUsar = iconos.filter(
      (i) => !CODIGO.includes(`"${i}"`) && !CODIGO.includes(`'${i}'`) && !contenido.includes(`"${i}"`),
    );
    expect(sinUsar, `iconos que no usa nadie:\n${sinUsar.join(', ')}`).toEqual([]);
  });
});

describe('deuda declarada', () => {
  it('no hay TODO ni FIXME sueltos en el código', () => {
    /*
      Un TODO en el código es una nota que nadie va a leer. Lo que hay que hacer va al
      roadmap, donde se revisa; lo que no va a hacerse se borra. Este proyecto lleva la
      deuda en `docs/07-ROADMAP.md` con su motivo, y eso funciona porque el código no
      compite con él.
    */
    const marcas: string[] = [];
    for (const f of FUENTES) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((l, i) => {
          if (/\b(TODO|FIXME|XXX|HACK)\b/.test(l)) marcas.push(`${f.replace(RAIZ, '')}:${i + 1}`);
        });
    }
    expect(marcas, `deuda suelta en el código:\n${marcas.join('\n')}`).toEqual([]);
  });
});
