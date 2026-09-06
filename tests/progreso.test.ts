import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anotar,
  borrarTodo,
  leer,
  leerTodo,
  reiniciarParaTests,
} from '../src/datos/progreso';

/**
 * Lo que se protege aquí son las dos promesas que el proyecto le hace a una familia:
 *
 *  1. **Cero datos personales.** Se comprueba mirando lo que se guarda de verdad, no
 *     confiando en que nadie añada un campo por descuido.
 *  2. **Funciona sin almacenamiento.** En modo privado, con las cookies bloqueadas o en un
 *     iOS que borre el origen, la actividad tiene que jugarse igual. Nunca un error.
 */

describe('progreso local', () => {
  beforeEach(() => reiniciarParaTests());
  afterEach(() => vi.unstubAllGlobals());

  describe('sin IndexedDB disponible (modo privado, cookies bloqueadas)', () => {
    beforeEach(() => {
      // Algunos navegadores lanzan al SOLO LEER la propiedad. Se simula así a propósito.
      vi.stubGlobal('window', {
        get indexedDB(): never {
          throw new DOMException('bloqueado');
        },
        setTimeout: globalThis.setTimeout.bind(globalThis),
      });
    });

    it('no lanza: anota en memoria y sigue', async () => {
      await expect(
        anotar({ actividadId: 'inf-01', completada: true, intentos: 4 }),
      ).resolves.toBeUndefined();
      const r = await leer('inf-01');
      expect(r?.completada).toBe(true);
    });

    it('leer una actividad que no existe devuelve null, no revienta', async () => {
      await expect(leer('no-existe')).resolves.toBeNull();
    });

    it('borrarTodo funciona igual', async () => {
      await anotar({ actividadId: 'inf-01', completada: true });
      await borrarTodo();
      expect(await leer('inf-01')).toBeNull();
    });
  });

  describe('lo que se guarda', () => {
    beforeEach(() => {
      vi.stubGlobal('window', { indexedDB: undefined, setTimeout: globalThis.setTimeout.bind(globalThis) });
    });

    it('NO guarda ningún dato personal', async () => {
      await anotar({ actividadId: 'inf-01', completada: true, intentos: 3, aciertos: 3 });
      const r = await leer('inf-01');
      const campos = Object.keys(r ?? {}).sort();

      // Lista blanca explícita. Si alguien añade un campo, este test le obliga a pasar
      // por aquí y a preguntarse si sigue siendo verdad que no identificamos a nadie.
      expect(campos).toEqual(['actividadId', 'completada', 'dia', 'mejorIntentos', 'veces']);

      const serializado = JSON.stringify(r);
      for (const prohibido of ['nombre', 'edad', 'curso', 'email', 'uuid', 'id_dispositivo']) {
        expect(serializado.toLowerCase()).not.toContain(prohibido);
      }
    });

    it('la fecha se redondea al día, sin hora', async () => {
      // Saber a qué hora exacta jugó un niño no aporta nada pedagógico y sí acerca el
      // dato a ser identificativo.
      await anotar({ actividadId: 'inf-01', completada: true });
      const r = await leer('inf-01');
      expect(r?.dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('cuenta las veces y se queda con el mejor intento', async () => {
      await anotar({ actividadId: 'inf-01', completada: true, intentos: 7 });
      await anotar({ actividadId: 'inf-01', completada: true, intentos: 3 });
      await anotar({ actividadId: 'inf-01', completada: true, intentos: 9 });
      const r = await leer('inf-01');
      expect(r?.veces).toBe(3);
      expect(r?.mejorIntentos).toBe(3);
    });

    it('una actividad sin completar no borra que ya se había completado', async () => {
      // Volver a jugar algo y dejarlo a medias no debe quitarle lo conseguido.
      await anotar({ actividadId: 'inf-01', completada: true });
      await anotar({ actividadId: 'inf-01', completada: false });
      expect((await leer('inf-01'))?.completada).toBe(true);
    });

    it('leerTodo devuelve lo anotado', async () => {
      await anotar({ actividadId: 'a', completada: true });
      await anotar({ actividadId: 'b', completada: false });
      expect((await leerTodo()).map((r) => r.actividadId).sort()).toEqual(['a', 'b']);
    });
  });
});
