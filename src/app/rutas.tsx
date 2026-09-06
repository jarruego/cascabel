import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Catalogo from './Catalogo';

/**
 * Router mínimo, deliberadamente.
 *
 * El índice es la raíz porque **la vista del maestro es el catálogo**, no una portada.
 * /diagnostico y las actividades van en carga diferida: la primera pantalla no debe
 * arrastrar el motor de actividades ni el banco de medida.
 */
const Diagnostico = lazy(() => import('./Diagnostico'));
const Actividad = lazy(() => import('./Actividad'));

export function Rutas() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/actividad/:id" element={<Actividad />} />
        <Route path="/diagnostico" element={<Diagnostico />} />
      </Routes>
    </Suspense>
  );
}
