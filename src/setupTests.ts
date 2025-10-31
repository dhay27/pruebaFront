import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Importamos jest-dom para Vitest
import '@testing-library/jest-dom/vitest';

// Limpia el DOM después de cada prueba
afterEach(() => {
  cleanup();
});