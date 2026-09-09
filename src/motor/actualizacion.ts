/**
 * Qué hacer cuando hay una versión nueva esperando: aplicarla sin preguntar o avisar.
 *
 * **El problema que resuelve.** El aviso con botón —«Hay una versión nueva · Actualizar
 * ahora»— está bien a mitad de sesión: una app que se recarga sola delante de veinticinco
 * niños es peor que una app desactualizada. Pero en una PWA instalada el aviso se cerraba
 * con «ahora no» y la versión nueva se quedaba esperando días, porque Android no cierra la
 * app de verdad y el worker viejo seguía mandando. Lo contó el autor el 2026-09-12: «le
 * cuesta mucho rato actualizar o directamente no actualiza, especialmente instalada».
 *
 * **La regla.** Si la versión nueva se detecta **nada más arrancar** y **fuera de una
 * actividad**, se aplica en el acto: la app acaba de abrirse, no hay nada a medias y es el
 * único momento en que recargar no molesta a nadie. En cualquier otro caso, se avisa y se
 * deja decidir. El umbral es corto a propósito: pasados unos segundos ya puede haber alguien
 * leyendo el catálogo o eligiendo, y entonces recargar es quitarle la pantalla.
 */
export type DecisionActualizacion = 'aplicar' | 'avisar';

/** Milisegundos desde el arranque dentro de los que aún «se acaba de abrir». */
export const UMBRAL_ARRANQUE_MS = 5000;

export function decidirActualizacion(contexto: {
  msDesdeArranque: number;
  /** `location.pathname` en ese momento. */
  ruta: string;
}): DecisionActualizacion {
  const reciente = contexto.msDesdeArranque < UMBRAL_ARRANQUE_MS;
  const enMedioDeAlgo = /^\/(actividad|calibracion|revisar)(\/|$)/.test(contexto.ruta);
  return reciente && !enMedioDeAlgo ? 'aplicar' : 'avisar';
}
