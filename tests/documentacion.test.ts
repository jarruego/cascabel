import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Que la documentación no mienta sobre lo que hay en el código.
 *
 * Salió de un caso concreto: `docs/01-ARQUITECTURA.md` se titulaba «Los diez tipos» y su
 * tabla listaba diez cuando en `registro.ts` ya había diecisiete. Nadie lo notó porque una
 * cifra desactualizada en un `.md` no rompe nada, y por eso mismo se queda ahí para siempre.
 *
 * Estas comprobaciones no verifican que la documentación esté *bien escrita* —eso no lo
 * puede hacer un test—, solo que las listas que enumeran cosas del código las enumeren
 * enteras. Es lo único que se desincroniza solo, sin que nadie toque el fichero.
 */

const RAIZ = join(__dirname, '..');

function leer(ruta: string): string {
  // Normalizado a saltos Unix: en Windows git deja CRLF en el arbol de trabajo, y
  // entonces el `$` de una expresion regular se queda delante del retorno de carro y
  // la fila de la tabla deja de casar. Falla en un sitio y no en el otro, que es el
  // peor tipo de fallo.
  return readFileSync(join(RAIZ, ruta), 'utf-8').replace(/\r\n/g, '\n');
}

describe('documentación', () => {
  it('la tabla de tipos lista exactamente los tipos registrados', () => {
    const registro = leer('src/motor/registro.ts');
    // El mapa de `registro.ts`, no el enum del esquema: lo que importa es lo que la
    // aplicación sabe ejecutar de verdad.
    const cuerpo = registro.slice(registro.indexOf('= {'), registro.indexOf('};'));
    const registrados = [...cuerpo.matchAll(/^ {2}'?([a-z-]+)'?:/gm)].map((m) => m[1]!);
    expect(registrados.length).toBeGreaterThan(10);

    const doc = leer('docs/01-ARQUITECTURA.md');
    const tabla = doc.slice(doc.indexOf('## Los tipos de motor'), doc.indexOf('**Antes de crear'));
    const documentados = [...tabla.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]!);

    expect([...documentados].sort()).toEqual([...registrados].sort());
  });

  it('la columna de cuántas actividades usa cada tipo dice la verdad', () => {
    // Sin esto la tabla queda medio bien: los tipos correctos con cifras de hace un mes,
    // que es exactamente el tipo de mentira que nadie revisa.
    const reales: Record<string, number> = {};
    const dir = join(RAIZ, 'content', 'actividades');
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const tipo = (JSON.parse(readFileSync(join(dir, f), 'utf-8')) as { tipo: string }).tipo;
      reales[tipo] = (reales[tipo] ?? 0) + 1;
    }

    const doc = leer('docs/01-ARQUITECTURA.md');
    const tabla = doc.slice(doc.indexOf('## Los tipos de motor'), doc.indexOf('**Antes de crear'));
    const escritos: Record<string, number> = {};
    for (const m of tabla.matchAll(/^\| `([a-z-]+)` \|[^|]*\| (\d+) \|/gm)) {
      escritos[m[1]!] = Number(m[2]);
    }
    expect(escritos).toEqual(reales);
  });

  it('no queda ningún «los N tipos» a mano, que es justo lo que se queda obsoleto', () => {
    const numeros =
      /\b(diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|\d+) tipos\b/i;
    const culpables: string[] = [];
    for (const fichero of readdirSync(join(RAIZ, 'docs'))) {
      if (!fichero.endsWith('.md')) continue;
      const texto = leer(join('docs', fichero));
      texto.split('\n').forEach((linea, i) => {
        // El dosier es un documento histórico: cuenta lo que se decidió en su día y ahí una
        // cifra de entonces no es un error, es el registro de una decisión.
        if (fichero.startsWith('09-')) return;
        if (numeros.test(linea)) culpables.push(`docs/${fichero}:${i + 1}  ${linea.trim()}`);
      });
    }
    expect(culpables).toEqual([]);
  });

  it('todo tipo registrado tiene su guía para el maestro en la ficha imprimible', () => {
    const registro = leer('src/motor/registro.ts');
    const cuerpo = registro.slice(registro.indexOf('= {'), registro.indexOf('};'));
    const registrados = [...cuerpo.matchAll(/^ {2}'?([a-z-]+)'?:/gm)].map((m) => m[1]!);

    const textos = JSON.parse(leer('src/i18n/es.json')) as Record<string, string>;
    // Sin esto la ficha del maestro sale con los huecos genéricos, que es peor que no
    // tenerla: parece completa y no dice nada del tipo concreto.
    const sinGuia = registrados.filter((t) => !textos[`ficha.tipo.${t}.comoFunciona`]);
    expect(sinGuia).toEqual([]);
  });
});
