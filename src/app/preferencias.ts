import { create } from 'zustand';
import { carrilPorDefecto, type Carril, type Etapa } from '@/config';

/**
 * Preferencias de presentación. Es de los poquísimos sitios con estado global que
 * `CLAUDE.md` §4 permite, junto con el audio.
 *
 * El carril **no sale de la actividad**: sale de quién la está usando. Una actividad de
 * `primaria-c2` la puede abrir un niño de 3.º o uno de 4.º, y cada uno necesita otros
 * tamaños. Por eso vive aquí y no en el JSON. Ver docs/adr/0005-una-app-tres-carriles.md.
 *
 * Todavía no se persiste: eso es T1.5, y va a IndexedDB, no a localStorage.
 * Cero datos personales: un carril no dice quién eres, dice qué tamaño de botón necesitas.
 */
interface EstadoPreferencias {
  carril: Carril | null;
  ponerCarril: (c: Carril) => void;
  /** Modo pizarra digital: escala toda la interfaz para verse desde el fondo del aula. */
  pizarra: boolean;
  ponerPizarra: (v: boolean) => void;
}

export const usePreferencias = create<EstadoPreferencias>((set) => ({
  carril: null,
  ponerCarril: (carril) => set({ carril }),
  pizarra: false,
  ponerPizarra: (pizarra) => {
    // El atributo va en <html> porque los tokens que escala están en :root. Es la única
    // forma de que TODAS las pantallas crezcan sin rediseñar ninguna.
    document.documentElement.dataset.pizarra = pizarra ? 'true' : 'false';
    set({ pizarra });
  },
}));

/**
 * Carril con el que dibujar. Si nadie ha elegido, se deduce de la etapa de la actividad,
 * que es la suposición menos mala: nunca deja a un niño con botones demasiado pequeños.
 */
export function useCarril(etapa: Etapa): Carril {
  const elegido = usePreferencias((e) => e.carril);
  return elegido ?? carrilPorDefecto(etapa);
}
