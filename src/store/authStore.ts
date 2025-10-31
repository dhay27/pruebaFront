import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => {
        set({ token: null });
        // Limpiamos localStorage al cerrar sesión
        localStorage.removeItem('auth-token-storage');
      },
    }),
    {
      name: 'auth-token-storage', // clave en localStorage
    }
  )
);
