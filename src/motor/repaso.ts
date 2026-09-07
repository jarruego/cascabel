import type { RegistroProgreso } from '@/datos/progreso';

/**
 * Qué convendría volver a mirar: la mitad buena de la repetición espaciada.
 *
 * **La mitad buena y no la otra.** Que un contenido vuelva justo antes de olvidarse es de lo
 * poco con evidencia sólida en aprendizaje, y **no es una recompensa: es un calendario**. Las
 * rachas, las vidas y las notificaciones son la otra mitad, y `CLAUDE.md` §4 las prohíbe.
 * Aquí no se pierde nada por no volver, no hay contador que se ponga en rojo y no aparece
 * ningún aviso: es una lista de sugerencias que se mira si se quiere.
 *
 * **Intervalos que se ensanchan.** La primera vez que se hace algo se olvida deprisa; a la
 * tercera aguanta meses. Así que el hueco que hace falta para sugerir un repaso crece con el
 * número de veces que se ha hecho: una semana, tres, dos meses. Son los órdenes de magnitud
 * habituales de cualquier sistema de repetición espaciada, redondeados: aquí no hay ninguna
 * medida del recuerdo real que justifique afinar más.
 *
 * > **PENDIENTE DE REVISIÓN PEDAGÓGICA.** Los tres intervalos son una convención razonable,
 * > no una medida. Con un curso de uso real se sabrá si a un niño de siete años le vale una
 * > semana o si hacen falos tres días.
 *
 * **Solo sugiere lo que ya se ha hecho.** Esto no descubre actividades nuevas —para eso está
 * el camino y está el catálogo—; solo recuerda las que ya se abrieron y hace tiempo que no.
 */

/**
 * Cuántos días tienen que pasar para sugerir un repaso, según cuántas veces se ha hecho.
 * Del índice 0 —una vez— en adelante; a partir de la tercera se usa el último.
 */
const HUECO_DIAS = [7, 21, 60];

/** Cuántas se sugieren como mucho. Una lista larga deja de ser una sugerencia. */
const MAXIMO = 3;

export interface Sugerencia {
  actividadId: string;
  /** Días desde la última vez. Es lo que se enseña, redondeado a semanas o meses. */
  diasDesde: number;
}

/** Días entre dos fechas en formato `AAAA-MM-DD`. Negativo si la segunda es anterior. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function queRepasar(
  registros: RegistroProgreso[],
  hoy: string,
  maximo = MAXIMO,
): Sugerencia[] {
  return registros
    .filter((r) => r.completada)
    .map((r) => ({ actividadId: r.actividadId, diasDesde: diasEntre(r.dia, hoy), veces: r.veces }))
    // Un día negativo es un reloj que se ha movido hacia atrás, no un repaso pendiente.
    .filter((r) => r.diasDesde >= 0)
    .filter((r) => r.diasDesde >= (HUECO_DIAS[Math.min(r.veces - 1, HUECO_DIAS.length - 1)] ?? 7))
    // Lo que más tiempo lleve sin tocarse, primero. Con empate, por identificador, para que
    // la lista no baile entre recargas: una lista que cambia de orden sola desorienta.
    .sort((a, b) => b.diasDesde - a.diasDesde || a.actividadId.localeCompare(b.actividadId))
    .slice(0, maximo)
    .map(({ actividadId, diasDesde }) => ({ actividadId, diasDesde }));
}

/**
 * Cómo se dice «hace cuánto», en clave de texto y en unidades que signifiquen algo.
 *
 * «Hace 43 días» no le dice nada a nadie y encima suena a reproche contado. «Hace un mes»
 * es la misma información dicha como la diría una persona.
 */
export function haceCuanto(dias: number): { clave: string; cantidad: number } {
  if (dias >= 60) return { clave: 'repaso.meses', cantidad: Math.round(dias / 30) };
  if (dias >= 30) return { clave: 'repaso.unMes', cantidad: 1 };
  if (dias >= 14) return { clave: 'repaso.semanas', cantidad: Math.round(dias / 7) };
  return { clave: 'repaso.unaSemana', cantidad: 1 };
}
