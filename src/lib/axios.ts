import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// 1. Obtenemos la URL base del .env
const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL no está definida en .env');
}

// 2. Creamos la instancia de Axios
// Esta instancia se usará para TODAS las llamadas a la API
export const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. El Interceptor de Petición (Request Interceptor)
api.interceptors.request.use(
  (config) => {
    // Obtenemos el token FRESCO en cada petición
    const token = useAuthStore.getState().token;

    if (token) {
      // Añadimos el token Bearer
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. Interceptor de Respuesta (para deslogueo automático)
api.interceptors.response.use(
  (response) => response, // Pasa la respuesta si todo está OK
  (error) => {
    // Si la API nos dice que el token es inválido (401)
    if (error.response?.status === 401) {
      console.warn('Token inválido o expirado. Deslogueando...');
      // Usamos el método de logout de nuestro store
      useAuthStore.getState().logout();
      // Forzamos un refresco a la página de login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
