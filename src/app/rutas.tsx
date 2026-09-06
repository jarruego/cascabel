import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import App from '../App';

/**
 * Router mínimo, deliberadamente.
 *
 * La navegación de verdad —índice, filtros por criterio curricular, /actividad/:id—
 * es T1.4 y no se adelanta aquí. Esto existe sólo porque /diagnostico (T0.1) tiene
 * que ser una ruta real: hay que poder instalarla como PWA y abrirla en modo
 * standalone, y eso no se puede hacer mirando location.pathname a mano.
 */
const Diagnostico = lazy(() => import('./Diagnostico'));

export function Rutas() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/diagnostico" element={<Diagnostico />} />
      </Routes>
    </Suspense>
  );
}
