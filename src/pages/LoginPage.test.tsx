import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 1. Importa los componentes y módulos que vamos a probar y mockear
import { LoginPage } from './LoginPage';
import { api } from '../lib/axios';
//import { useAuthStore } from '../store/authStore';

// --- MOCKS ---
// 2. Mockear el cliente 'api' de axios
// Le decimos a Vitest que 'api.post' es una función mockeada
vi.mock('../lib/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// 3. Mockear el store 'useAuthStore' de Zustand
// Simulamos el estado inicial y la función setToken
const mockSetToken = vi.fn();
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    setToken: mockSetToken,
  }),
}));

// 4. Mockear 'react-router-dom' para espiar 'useNavigate'
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  // Importamos el módulo original para no romper todo
  const original = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...original, // Mantenemos todo lo original (como MemoryRouter)
    useNavigate: () => mockNavigate, // PERO sobreescribimos 'useNavigate'
  };
});
// --- FIN MOCKS ---


// --- BLOQUE DE PRUEBAS ---
describe('Página de Login', () => {
  let user: ReturnType<typeof userEvent.setup>;

  // 'beforeEach' se ejecuta antes de CADA 'it' (test)
  beforeEach(() => {
    // 1. Reseteamos los contadores de los mocks
    vi.resetAllMocks();
    
    // 2. Configuramos el simulador de eventos de usuario
    user = userEvent.setup();

    // 3. Renderizamos el componente para cada prueba
    render(
      // MemoryRouter es necesario porque LoginPage usa 'useNavigate'
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/products" element={<div>Página de Productos</div>} />
        </Routes>
        {/* Incluimos Toaster para que los 'toast' se rendericen */}
        <Toaster />
      </MemoryRouter>
    );
  });

  // --- Caso de Prueba 1: Errores de validación ---
  it('debe mostrar errores de validación si los campos están vacíos', async () => {
    // 1. Buscamos el botón de submit
    const loginButton = screen.getByRole('button', { name: /ingresar/i });

    // 2. Hacemos clic sin llenar los campos
    await user.click(loginButton);

    // 3. Esperamos y verificamos que los mensajes de error aparezcan
    expect(await screen.findByText('Email es requerido')).toBeInTheDocument();
    expect(screen.getByText('Contraseña es requerida')).toBeInTheDocument();
    
    // 4. Verificamos que NINGUNA dependencia fue llamada
    expect(api.post).not.toHaveBeenCalled();
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // --- Caso de Prueba 2: Login Exitoso ---
  it('debe llamar a la API, guardar el token y redirigir en un login exitoso', async () => {
    // 1. Hacemos type-safe del mock de api.post
    const mockedApiPost = vi.mocked(api.post);
    
    // 2. Simulamos una RESPUESTA EXITOSA de la API
    const fakeToken = 'eyFakeToken12345';
    mockedApiPost.mockResolvedValue({
      data: { accessToken: fakeToken },
    });

    // 3. Llenamos el formulario
    await user.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');

    // 4. Enviamos el formulario
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    // 5. Verificamos que se mostró el toast de carga y luego de éxito
    expect(await screen.findByText('¡Login exitoso!')).toBeInTheDocument();
    
    // 6. Verificamos que la API fue llamada CON LOS DATOS CORRECTOS
    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith('/login', {
        email: 'user@test.com',
        password: 'password123',
      });
    });

    // 7. Verificamos que el token se guardó en el store
    expect(mockSetToken).toHaveBeenCalledWith(fakeToken);

    // 8. Verificamos que el usuario fue redirigido
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  // --- Caso de Prueba 3: Login Fallido (400) ---
  it('debe mostrar un toast de error si las credenciales son incorrectas', async () => {
    // 1. Hacemos type-safe del mock
    const mockedApiPost = vi.mocked(api.post);

    // 2. Simulamos una RESPUESTA FALLIDA (400 Bad Request)
    mockedApiPost.mockRejectedValue({
      response: { status: 400, data: { message: 'Invalid credentials' } },
    });

    // 3. Llenamos el formulario
    await user.type(screen.getByPlaceholderText('Email'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');

    // 4. Enviamos
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    // 5. Verificamos que se mostró el toast de ERROR
    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument();

    // 6. Verificamos que NO se guardó el token
    expect(mockSetToken).not.toHaveBeenCalled();

    // 7. Verificamos que NO se redirigió
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});