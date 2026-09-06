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
    'tocar-a-tiempo', 'cantar', 'lienzo', 'guia-aula', 'teclado', 'karaoke',
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
