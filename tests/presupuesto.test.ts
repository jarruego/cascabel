import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = readFileSync(join(RAIZ, 'vite.config.ts'), 'utf8');

/**
 * Lo que se precachea lo baja **todo niño en su primera visita**, sobre el wifi de un
 * colegio. Es fácil triplicar esa descarga sin darse cuenta: basta con añadir una librería
 * pesada y que el patrón de precache la pille.
 *
 * Pasó de verdad el 2026-09-06: al añadir el tipo `pentagrama`, VexFlow entró en el
 * precache y este subió de 785 KB a 1891 KB. Lo usa UNA actividad de quince.
 */
describe('presupuesto de descarga', () => {
  it('las librerías de partitura NO entran en el precache', () => {
    // VexFlow y abcjs pesan 691 KB gzip juntos y los usa una actividad. Se cargan cuando
    // se abre un pentagrama, y entonces se quedan cacheadas.
    expect(config).toMatch(/globIgnores/);
    expect(config).toMatch(/partitura-\*\.js/);
  });

  it('Bravura tampoco: son 316 KB para dibujar símbolos musicales', () => {
    expect(config).toMatch(/fuentes\/Bravura\.woff2/);
  });

  it('van en su propio chunk, para poder excluirlas', () => {
    // Si dejaran de estar en manualChunks acabarían dentro del bundle principal, y
    // entonces excluirlas del precache sería imposible.
    expect(config).toMatch(/partitura:\s*\['abcjs',\s*'vexflow'\]/);
  });

  it('el service worker sí precachea lo que sirve para todo: contenido y audio', () => {
    // Lo contrario también sería un fallo: sin esto no habría modo sin conexión, que es
    // la mitad de para qué existe una PWA en un aula sin wifi.
    expect(config).toMatch(/globPatterns/);
    expect(config).toMatch(/opus/);
    expect(config).toMatch(/json/);
  });
});
