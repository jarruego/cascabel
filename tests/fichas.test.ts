import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La ficha del maestro se escribe para cada actividad (2026-09-12: «revisa todas las fichas
 * con calma y hazlo bien»). Esto vigila que ninguna se quede con la guía genérica del tipo
 * y que los pasos cuadren con la duración: una ficha que dice diez minutos y suma catorce
 * no se puede seguir en clase.
 */
interface Ficha {
  aprende?: string;
  vocabulario?: string[];
  pasos?: Array<{ min?: number; titulo: string }>;
  enPantalla?: string;
  sinPantalla?: string;
  masFacil?: string;
  masDificil?: string;
  loTiene?: string[];
  errores?: unknown[];
  indicadores?: string[];
}

const DIR = join(__dirname, '..', 'content', 'actividades');
const actividades = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf-8')) as {
    id: string;
    duracion_min?: number;
    herramienta?: boolean;
    ficha?: Ficha;
  });

describe('la ficha del maestro', () => {
  it('toda actividad tiene la suya, con lo esencial', () => {
    const sin = actividades
      .filter((a) => {
        const f = a.ficha;
        return !f || !f.aprende || !f.vocabulario?.length || !f.pasos?.length || !f.enPantalla || !f.sinPantalla || !f.masFacil || !f.masDificil;
      })
      .map((a) => a.id);
    expect(sin, `sin ficha propia:\n${sin.join('\n')}`).toEqual([]);
  });

  it('los pasos suman la duración de la actividad', () => {
    const malas = actividades
      .filter((a) => a.ficha?.pasos?.every((p) => typeof p.min === 'number'))
      .filter((a) => {
        const suma = a.ficha!.pasos!.reduce((s, p) => s + (p.min ?? 0), 0);
        return suma !== (a.duracion_min ?? 10);
      })
      .map((a) => `${a.id}: suman ${a.ficha!.pasos!.reduce((s, p) => s + (p.min ?? 0), 0)} y dura ${a.duracion_min}`);
    expect(malas).toEqual([]);
  });

  it('las de pregunta llevan qué mirar y tres columnas de seguimiento; las herramientas, no', () => {
    const malas = actividades
      .filter((a) => {
        const f = a.ficha!;
        if (a.herramienta) return Boolean(f.loTiene?.length || f.indicadores?.length);
        return !(f.loTiene?.length && f.errores?.length && f.indicadores?.length === 3);
      })
      .map((a) => a.id);
    expect(malas).toEqual([]);
  });

  it('nunca se castiga el error, tampoco en el papel', () => {
    const malas: string[] = [];
    for (const a of actividades) {
      const texto = JSON.stringify(a.ficha ?? {});
      const m = /\b(castig|penaliz|ranking)\w*/i.exec(texto);
      if (m) malas.push(`${a.id}: «${m[0]}»`);
    }
    expect(malas).toEqual([]);
  });
});
