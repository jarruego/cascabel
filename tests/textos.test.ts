import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import es from '../src/i18n/es.json';

/**
 * Que no falte ni sobre ningún texto.
 *
 * Un texto que falta **no da ningún error**: `t()` devuelve la clave, así que en pantalla
 * aparece «ficha.tipo.karaoke.refuerzo» y todo lo demás sigue funcionando. En una web se
 * vería enseguida; en una hoja que alguien manda a imprimir para el aula, no.
 *
 * Solo se comprueban las claves escritas como literal. Las que se componen —`opcion.${clave}`
 * o `ficha.tipo.${tipo}.${campo}`— llevan su propia comprobación abajo, contra los datos
 * reales, que es donde de verdad se sabe cuáles hacen falta.
 */

const DICCIONARIO = es as Record<string, string>;
const RAIZ = join(__dirname, '..', 'src');

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx?$/.test(n) ? [ruta] : [];
  });
}

const CODIGO = ficheros(RAIZ).map((f) => ({ f, texto: readFileSync(f, 'utf8') }));

describe('textos de la interfaz', () => {
  it('toda clave literal que se pide existe en el diccionario', () => {
    const faltan: string[] = [];
    for (const { f, texto } of CODIGO) {
      // Solo `t('clave.literal')`. Se ignoran las plantillas, que llevan `${`.
      for (const m of texto.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'\s*\)/g)) {
        const clave = m[1]!;
        if (!DICCIONARIO[clave]) faltan.push(`${clave}  (${f.replace(RAIZ, 'src')})`);
      }
    }
    expect(faltan, `claves sin traducción:\n${faltan.join('\n')}`).toEqual([]);
  });

  it('ninguna traducción está vacía', () => {
    const vacias = Object.entries(DICCIONARIO)
      .filter(([, v]) => !v.trim())
      .map(([k]) => k);
    expect(vacias).toEqual([]);
  });
});

describe('la guía por tipo de actividad del dosier imprimible', () => {
  // El dosier cae a `ficha.tipo.<tipo>.<campo>` cuando la actividad no trae texto propio.
  // Si a un tipo le falta un campo, esa sección sale en blanco en el papel.
  const TIPOS = [
    'eleccion', 'emparejar', 'ordenar', 'rejilla', 'pentagrama', 'seguir',
    'tocar-a-tiempo', 'cantar', 'lienzo', 'guia-aula', 'teclado', 'karaoke', 'presentacion',
  ];
  const CAMPOS = [
    'comoFunciona', 'sinPantalla', 'ampliacion', 'refuerzo', 'observar',
    'indicador1', 'indicador2', 'indicador3',
  ];

  it('cubre todos los tipos y todos los campos', () => {
    const faltan: string[] = [];
    for (const tipo of TIPOS) {
      for (const campo of CAMPOS) {
        const clave = `ficha.tipo.${tipo}.${campo}`;
        if (!DICCIONARIO[clave]) faltan.push(clave);
      }
    }
    expect(faltan, `guía incompleta:\n${faltan.join('\n')}`).toEqual([]);
  });

  it('cubre todos los tipos que el motor sabe ejecutar', () => {
    // Si mañana se añade un tipo al registro y no a la guía, el dosier de sus actividades
    // saldría medio vacío sin que nadie lo note hasta imprimirlo.
    const registro = readFileSync(join(RAIZ, 'motor', 'registro.ts'), 'utf8');
    const enRegistro = [...registro.matchAll(/^\s+'?([a-z-]+)'?:\s+[A-Z]/gm)].map((m) => m[1]!);
    expect(enRegistro.length).toBeGreaterThan(0);
    for (const tipo of enRegistro) {
      expect(DICCIONARIO[`ficha.tipo.${tipo}.comoFunciona`], `falta guía para «${tipo}»`).toBeTruthy();
    }
  });
});

describe('los textos del contenido', () => {
  /*
    Las claves que piden las ACTIVIDADES, no las que piden los componentes.

    Salió de un fallo real del 2026-09-08: cinco actividades apuntaban a claves que no
    existían —se habían generado con un recorte del identificador, «c120mano», y los textos
    se habían escrito con otro, «c120»— y la pantalla enseñaba la clave en crudo donde iba
    el enunciado. No lo cazó nada: el test de textos miraba el código y estas claves están
    en el contenido.
  */
  const DIR = join(__dirname, '..', 'content', 'actividades');
  const actividades = readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as Record<string, unknown>);

  /** `actividad.c103pulso.enunciado` -> `c103pulso`. */
  function espacios(a: Record<string, unknown>): Set<string> {
    const nombres = new Set<string>();
    const buscar = (v: unknown) => {
      if (typeof v === 'string') {
        const m = /^actividad\.([a-z0-9]+)\./.exec(v);
        if (m) nombres.add(m[1]!);
      } else if (Array.isArray(v)) v.forEach(buscar);
      else if (v && typeof v === 'object') Object.values(v).forEach(buscar);
    };
    buscar(a);
    return nombres;
  }

  /*
    Cada actividad tiene su espacio de nombres, y no lo comparte.

    Salió de dos casos reales del 2026-09-08, y los dos enseñaban al niño la frase de otra
    actividad: «El pulso escondido» abría diciendo «toca los sonidos en orden, empezando por
    el más grave», que es «De grave a agudo»; y «Paisaje sonoro» decía «toca un dibujo y
    luego el sonido que le va», que es el memory de instrumentos.

    Lo que falló es que las claves se escriben a mano y dos actividades acabaron con el
    mismo prefijo. La que llegó después se inventó un `c103b` para su consigna, pero su
    enunciado se quedó en el prefijo compartido. **No dio ningún error**: la clave existía y
    devolvía una frase bien escrita. Solo que de otra actividad, y eso no lo caza ninguna
    comprobación de «existe la clave».
  */
  it('cada actividad usa un espacio de nombres propio', () => {
    const mal: string[] = [];
    const dueno = new Map<string, string>();
    for (const a of actividades) {
      const id = String(a.id);
      const suyos = [...espacios(a)];
      if (suyos.length > 1) {
        mal.push(`${id} mezcla ${suyos.join(' y ')}: alguno de sus textos es de otra`);
      }
      for (const n of suyos) {
        const otro = dueno.get(n);
        if (otro && otro !== id) mal.push(`«${n}» lo usan ${otro} y ${id}`);
        else dueno.set(n, id);
      }
    }
    expect(mal, mal.join('\n')).toEqual([]);
  });

  it('toda clave que pide una actividad existe', () => {
    const rotas: string[] = [];
    for (const a of actividades) {
      const claves: string[] = [];
      const buscar = (v: unknown) => {
        if (typeof v === 'string' && /^actividad\.[a-z0-9]+\./.test(v)) claves.push(v);
        else if (Array.isArray(v)) v.forEach(buscar);
        else if (v && typeof v === 'object') Object.values(v).forEach(buscar);
      };
      buscar(a);
      for (const c of claves) {
        if (!(c in DICCIONARIO)) rotas.push(`${String(a.id)} → ${c}`);
      }
    }
    expect(rotas).toEqual([]);
  });
});
