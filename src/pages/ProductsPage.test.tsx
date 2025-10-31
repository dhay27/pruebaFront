import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ProductsPage } from './ProductsPage';
import { api } from '../lib/axios';
import type { Product } from '../types/product.types';

// --- MOCKS ---
// 1. Simular el cliente 'api' de axios
vi.mock('../lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(), // Añadimos patch para la actualización
  },
}));

// 2. Simular el store 'useAuthStore'
const mockLogout = vi.fn();
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    logout: mockLogout,
  }),
}));

// --- DATOS DE PRUEBA ---
const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'Laptop Pro', price: 1499.99, stock: 15 },
  { id: 2, name: 'Mouse Inalámbrico', price: 79.5, stock: 120 },
];

// --- HELPERS ---
// Hacemos type-safe de los mocks de 'api'
const mockedApiGet = vi.mocked(api.get);
const mockedApiPost = vi.mocked(api.post);
const mockedApiPatch = vi.mocked(api.patch);

// Función helper para renderizar
const renderComponent = () => {
  render(
    <MemoryRouter>
      <Toaster />
      <ProductsPage />
    </MemoryRouter>
  );
};

// --- BLOQUE DE PRUEBAS ---
describe('Página de Productos', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // 1. Reseteamos todos los mocks
    vi.resetAllMocks();
    
    // 2. Configuramos userEvent
    user = userEvent.setup();
    
    // 3. Mockeamos la llamada GET inicial para que siempre funcione
    mockedApiGet.mockResolvedValue({ data: MOCK_PRODUCTS });
  });

  // --- Test 1: Renderizado y Carga ---
  it('debe renderizar "Cargando..." y luego la lista de productos', async () => {
    renderComponent();

    // 1. Verifica el estado de carga
    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    // 2. Espera a que los productos aparezcan
    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Mouse Inalámbrico')).toBeInTheDocument();

    // 3. Verifica que la API fue llamada
    expect(mockedApiGet).toHaveBeenCalledWith('/api/products');
  });

  // --- Test 2: Creación de Producto (Éxito) ---
  it('debe permitir crear un nuevo producto', async () => {
    // Mockeamos la respuesta POST
    mockedApiPost.mockResolvedValue({ data: { id: 3, ... });
    
    // Mockeamos la segunda llamada a GET (el refresco)
    mockedApiGet.mockResolvedValueOnce({ data: MOCK_PRODUCTS }) // Carga inicial
                 .mockResolvedValueOnce({ data: [ ...MOCK_PRODUCTS, { id: 3, name: 'Teclado', price: 99, stock: 50 }] }); // Carga post-creación

    renderComponent();
    await screen.findByText('Laptop Pro'); // Espera a la carga inicial

    // 1. Llenamos el formulario
    await user.type(screen.getByLabelText(/Nombre/i), 'Teclado');
    await user.type(screen.getByLabelText(/Precio/i), '99');
    await user.type(screen.getByLabelText(/Stock/i), '50');

    // 2. Enviamos
    await user.click(screen.getByRole('button', { name: /Crear Producto/i }));

    // 3. Verificamos que la API.POST fue llamada
    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith('/api/products', {
        name: 'Teclado',
        price: 99,
        stock: 50,
      });
    });

    // 4. Verificamos el toast de éxito
    expect(await screen.findByText('Producto creado')).toBeInTheDocument();
    
    // 5. Verificamos que la lista se refrescó (api.get fue llamada 2 veces)
    expect(mockedApiGet).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Teclado')).toBeInTheDocument();
  });

  // --- Test 3: Actualización de Stock (El test clave) ---
  it('debe permitir actualizar el stock de un producto (inline)', async () => {
    mockedApiPatch.mockResolvedValue({ data: { ...MOCK_PRODUCTS[0], stock: 50 } });
    mockedApiGet.mockResolvedValueOnce({ data: MOCK_PRODUCTS }) // Carga inicial
                 .mockResolvedValueOnce({ data: [{ ...MOCK_PRODUCTS[0], stock: 50 }, MOCK_PRODUCTS[1]] }); // Carga post-actualización
    
    renderComponent();
    
    // 1. Esperamos a que la fila "Laptop Pro" exista
    const row = await screen.findByText('Laptop Pro');
    
    // 2. Buscamos el botón "Actualizar Stock" en esa fila
    const updateButton = screen.getByRole('button', { name: /Actualizar Stock/i });
    await user.click(updateButton);

    // 3. Verificamos que el formulario inline aparece
    // Buscamos el input por su valor actual (15)
    const stockInput = await screen.findByLabelText('Stock para Laptop Pro');
    expect(stockInput).toHaveValue(15);

    // 4. Cambiamos el valor
    await user.clear(stockInput);
    await user.type(stockInput, '50');

    // 5. Guardamos
    const confirmButton = screen.getByRole('button', { name: /Confirmar/i });
    await user.click(confirmButton);

    // 6. Verificamos que la API.PATCH fue llamada
    await waitFor(() => {
      expect(mockedApiPatch).toHaveBeenCalledWith('/api/products/1', {
        stock: 50,
      });
    });

    // 7. Verificamos el toast de éxito
    expect(await screen.findByText('Stock actualizado')).toBeInTheDocument();
    
    // 8. Verificamos que la lista se refrescó
    expect(mockedApiGet).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument();
    // Verificamos que el input desapareció
    expect(screen.queryByLabelText('Stock para Laptop Pro')).not.toBeInTheDocument();
  });
  
  // --- Test 4: Botón de Logout ---
  it('debe llamar a la función logout al presionar el botón', async () => {
    renderComponent();
    await screen.findByText('Laptop Pro'); // Espera a la carga

    // 1. Buscamos el botón
    const logoutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });
    
    // 2. Hacemos clic
    await user.click(logoutButton);

    // 3. Verificamos que el mock de zustand fue llamado
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});