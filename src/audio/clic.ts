import { obtenerContexto, registrarFuente, salidaMaestra } from './AudioEngine';

/**
 * El clic del pulso.
 *
 * **Un oscilador y no una muestra**: pesa cero, no hay que descargarlo, no puede faltar y no
 * añade nada al precache. Para un sonido de 40 ms que solo tiene que marcar un instante, una
 * muestra sería peor por todos lados.
 *
 * Vive aquí y no dentro del metrónomo porque lo usan dos sitios: el metrónomo y la cuenta
 * atrás. Tener dos clics distintos para lo mismo habría sonado a fallo.
 *
 * @param tiempo    instante del `AudioContext`, no del reloj del sistema
 * @param acentuado el primero del compás, o el «¡ya!» de una cuenta atrás
 * @param suave     el pulso de fondo de un dictado de figuras: más grave, de otro timbre y
 *                  a menos de la mitad de volumen, para que se distinga del clic que marca
 *                  el ritmo sin taparlo
 */
export function clic(tiempo: number, acentuado = false, suave = false): void {
  const ctx = obtenerContexto();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = suave ? 'triangle' : 'sine';
  osc.frequency.value = suave ? 440 : acentuado ? 1000 : 800;
  // Rampa exponencial y no lineal: el oído percibe el volumen en logaritmo, y una rampa
  // lineal hacia cero se oye como un chasquido al final en vez de como una caída.
  gain.gain.setValueAtTime(0.001, tiempo);
  gain.gain.exponentialRampToValueAtTime(suave ? 0.09 : acentuado ? 0.35 : 0.2, tiempo + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, tiempo + 0.03);
  osc.connect(gain).connect(salidaMaestra());
  registrarFuente(osc);
  osc.start(tiempo);
  osc.stop(tiempo + 0.04);
}

/** El mismo clic, ahora mismo. Para cuando no hay nada que planificar por delante. */
export function clicYa(acentuado = false): void {
  clic(obtenerContexto().currentTime, acentuado);
}
