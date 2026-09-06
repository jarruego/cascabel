import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Quita comentarios antes de mirar. Sin esto, el propio comentario que explica POR QUÉ no
 * se usa setInterval hacía fallar el test — que es una forma tonta de castigar la
 * documentación.
 */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * El metrónomo es la pieza de la que depende toda la evaluación rítmica, y tiene una
 * forma correcta de escribirse y muchas incorrectas. Este test protege la correcta.
 */
describe('metrónomo', () => {
  const fuente = soloCodigo(readFileSync(join(RAIZ, 'src', 'audio', 'metronomo.ts'), 'utf8'));

  it('NO usa setInterval', () => {
    // setInterval nunca sirve para tiempo musical: el hilo principal sufre jitter de
    // decenas de milisegundos y el navegador lo estrangula a 1 Hz en segundo plano.
    // El patrón correcto es lookahead: un temporizador barato PROGRAMA y el reloj de
    // audio EJECUTA. Ver «A Tale of Two Clocks» y docs/05-AUDIO-Y-MICROFONO.md.
    expect(fuente).not.toMatch(/setInterval/);
    expect(fuente).toMatch(/setTimeout/);
  });

  it('programa contra el reloj de audio, no contra Date.now', () => {
    expect(fuente).toMatch(/currentTime/);
    expect(fuente).not.toMatch(/Date\.now|performance\.now/);
  });

  it('separa lo visual de lo sonoro con una cola', () => {
    // Animar dentro del planificador hace que el destello se vea hasta 100 ms antes de
    // oírse el clic. Los eventos van a una cola que consume requestAnimationFrame.
    expect(fuente).toMatch(/pulsosParaPintar/);
  });

  it('la guía de aula consume esa cola desde requestAnimationFrame', () => {
    const guia = soloCodigo(
      readFileSync(join(RAIZ, 'src', 'motor', 'tipos', 'GuiaAula.tsx'), 'utf8'),
    );
    expect(guia).toMatch(/requestAnimationFrame/);
    expect(guia).toMatch(/pulsosParaPintar/);
  });

  it('acota el tempo a un rango razonable para un aula', () => {
    expect(fuente).toMatch(/Math\.max\(40,\s*Math\.min\(180/);
  });
});
